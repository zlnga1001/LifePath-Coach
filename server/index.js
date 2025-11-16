import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initDb, saveResume, saveTailoredResume, saveChatMessage, saveEmbedding } from './db.js';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Multer (memory storage) for small PDF uploads. Configure file size via env UPLOAD_MAX_BYTES.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024) } });

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const getS3Key = (resumeId, originalName) => `resumes/${resumeId}/${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY (or API_KEY) environment variable not set. Exiting.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Initialize DB (if DATABASE_URL set)
await initDb();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Upload resume PDF, store in S3 and create DB record with S3 metadata
app.post('/api/upload-resume', upload.single('file'), async (req, res) => {
  try {
    // Require a configured DATABASE_URL for uploads — fail fast with clear message if missing.
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL not configured — configure DATABASE_URL to enable resume uploads and metadata persistence.' });
    }

    if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });
    const file = req.file;
    if (file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'only PDF uploads are allowed' });

    const resumeId = crypto.randomUUID();
    const key = getS3Key(resumeId, file.originalname || 'resume.pdf');
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) return res.status(500).json({ error: 'S3_BUCKET_NAME not configured' });

    // Upload to S3
    const put = new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype });
    await s3Client.send(put);

    const s3Url = `s3://${bucket}/${key}`;

    // Persist resume metadata in DB
    try {
      await saveResume({ userId: null, rawText: null, modelText: null, parsedJson: null, uploadSource: 'web', s3Url, filename: file.originalname, size: file.size, contentType: file.mimetype });
    } catch (dbErr) {
      console.warn('Failed to save resume metadata to DB:', dbErr);
    }

    // Generate presigned URL for download (short-lived)
    let presignedUrl = null;
    try {
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      presignedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 * 60 });
    } catch (e) {
      console.warn('Failed to generate presigned URL:', e);
    }

    return res.status(201).json({ resumeId, s3Url, presignedUrl, filename: file.originalname, size: file.size });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'upload failed' });
  }
});

app.post('/api/extract-resume', async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string') {
    return res.status(400).json({ error: 'resumeText (string) is required in the request body' });
  }

  // Minimal prompt — this is intentionally similar to the client-side prompt but executed server-side so the API key isn't exposed.
  const prompt = `You are an expert resume parser. Extract the user's information from the following resume text and structure it as a JSON object.

Resume:
${resumeText}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    // Persist a resume record (no user at the moment — add user id when auth is added)
    try {
      await saveResume({ userId: null, rawText: resumeText, modelText: response.text });
    } catch (dbErr) {
      console.warn('Failed to save resume to DB:', dbErr);
    }

    // Return the raw text from the model; client will parse it as JSON.
    return res.json({ text: response.text });
  } catch (err) {
    console.error('Error calling Gemini API:', err);
    return res.status(500).json({ error: 'failed to generate content' });
  }
});

app.post('/api/tailor-resume', async (req, res) => {
  const { resumeData, jobDescription } = req.body;
  if (!resumeData || !jobDescription) {
    return res.status(400).json({ error: 'resumeData and jobDescription are required' });
  }

  const prompt = `You are an expert career coach for underrepresented students. Your task is to tailor the provided resume (in JSON format) for a specific job description.
1. Analyze the job description to identify key skills and requirements.
2. Rewrite the 'bullets' in the 'experience' and 'projects' sections to align with these requirements.
3. Use the 'Action -> Context -> Impact' framework. Quantify achievements where possible. Use strong action verbs.
4. Do NOT change any other part of the resume structure. Return the complete, updated resume as a JSON object conforming to the schema.

Job Description:
---
${jobDescription}
---

Original Resume:
---
${JSON.stringify(resumeData, null, 2)}
---
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      // Persist tailored resume
      try {
        await saveTailoredResume({ userId: null, resumeId: null, tailoredJson: null, jobDescription, modelText: response.text });
      } catch (dbErr) {
        console.warn('Failed to save tailored resume to DB:', dbErr);
      }

      return res.json({ text: response.text });
    } catch (err) {
      console.error('Error calling Gemini API (tailor):', err);
      return res.status(500).json({ error: 'failed to generate content' });
    }
});

app.post('/api/skill-gap', async (req, res) => {
  const { userProfile, resumeData, jobDescription } = req.body;
  if (!userProfile) return res.status(400).json({ error: 'userProfile is required' });

  const goal = jobDescription ? `this job description: "${jobDescription}"` : `their stated goal of: "${userProfile.goals}"`;
  const resumeText = resumeData ? JSON.stringify(resumeData.experience) + JSON.stringify(resumeData.skills) + JSON.stringify(resumeData.projects) : 'No resume data provided.';

  const prompt = `You are an expert career coach for underrepresented students. Your task is to perform a skill gap analysis.
Compare the user's experience (gleaned from their resume data below) with the requirements for ${goal}.

User's Experience: "${resumeText}"

Your analysis should identify:
1. Skills the user has that are relevant.
2. Key skills they are missing.
3. For each missing skill, explain its importance and provide 1-2 links to high-quality, FREE online resources (like tutorials, docs, or courses).

Provide a brief, encouraging summary at the end. Structure your response as a JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    // Optionally persist skill-gap analysis as a tailored resume artifact
    try {
      await saveTailoredResume({ userId: null, resumeId: null, tailoredJson: null, jobDescription, modelText: response.text });
    } catch (dbErr) {
      console.warn('Failed to save skill-gap result to DB:', dbErr);
    }

    return res.json({ text: response.text });
  } catch (err) {
    console.error('Error calling Gemini API (skill-gap):', err);
    return res.status(500).json({ error: 'failed to generate content' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { history, userProfile, resumeData, newMessage } = req.body;
  if (!newMessage) return res.status(400).json({ error: 'newMessage is required' });

  let resumeContext = 'The user has not provided a resume yet for this session.';
  if (resumeData) resumeContext = `The user has uploaded their resume, and you have it in JSON format. Here it is: ${JSON.stringify(resumeData)}.`;

  const systemInstruction = `You are LifePath Coach, an AI career mentor for low-income, first-generation, and underrepresented students. Your tone is encouraging, empathetic, but direct and actionable. Your goal is to provide specific, practical advice. You have the following context about the user: Name: ${userProfile?.name || 'Unknown'}, Goal: ${userProfile?.goals || ''}, Constraints: ${userProfile?.constraints || ''}. ${resumeContext} Use this full context to personalize your responses. Never break character. Keep responses concise and helpful.`;

  const contents = (history || []).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));
  contents.push({ role: 'user', parts: [{ text: newMessage }] });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { systemInstruction }
    });

    // Persist chat message (simple single-message insert; conversation handling minimal)
    try {
      await saveChatMessage({ conversationId: null, role: 'user', content: newMessage });
      await saveChatMessage({ conversationId: null, role: 'assistant', content: response.text });
    } catch (dbErr) {
      console.warn('Failed to save chat messages to DB:', dbErr);
    }

    return res.json({ text: response.text });
  } catch (err) {
    console.error('Error calling Gemini API (chat):', err);
    return res.status(500).json({ error: 'failed to generate content' });
  }
});

app.post('/api/generate-cover-letter', async (req, res) => {
  const { tailoredResumeStr, jobDescription, companyName, jobTitle, tonePreference } = req.body;
  if (!tailoredResumeStr || !jobDescription) return res.status(400).json({ error: 'tailoredResumeStr and jobDescription are required' });

  const prompt = `You are LifePath Coach, an expert at writing compelling, personalized cover letters.\\nTARGET JOB:\\nCompany: ${companyName}\\nPosition: ${jobTitle}\\nTONE PREFERENCE: ${tonePreference}\\nJOB DESCRIPTION: ${jobDescription}\\nTAILORED RESUME (use these as proof points): ${tailoredResumeStr}\\nWrite a 3-4 paragraph cover letter under 400 words.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain' }
    });

    // Save cover letter as tailored_resumes artifact for now
    try {
      await saveTailoredResume({ userId: null, resumeId: null, tailoredJson: null, jobDescription, modelText: response.text });
    } catch (dbErr) {
      console.warn('Failed to save cover letter to DB:', dbErr);
    }

    return res.json({ text: response.text });
  } catch (err) {
    console.error('Error calling Gemini API (cover-letter):', err);
    return res.status(500).json({ error: 'failed to generate content' });
  }
});

app.post('/api/generate-latex', async (req, res) => {
  const { masterResumeText, jobDescription, companyName, jobTitle, qAndA } = req.body;
  if (!masterResumeText) return res.status(400).json({ error: 'masterResumeText is required' });

  const prompt = `Generate A4 LaTeX resume based on provided master resume and job description.\\nMASTER RESUME:\\n${masterResumeText}\\nJOB DESCRIPTION:\\n${jobDescription}\\nCOMPANY:${companyName}\\nJOB TITLE:${jobTitle}\\nQ&A:${qAndA}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain' }
    });
    return res.json({ text: response.text });
  } catch (err) {
    console.error('Error calling Gemini API (latex):', err);
    return res.status(500).json({ error: 'failed to generate content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
