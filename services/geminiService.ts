import { UserProfile, ChatMessage, SkillGapReport, ResumeData } from '../types';

// Small local Type shim used only for client-side schema descriptions
const Type = {
  OBJECT: 'object',
  STRING: 'string',
  ARRAY: 'array'
};

const parseJsonResponse = <T,>(text: string): T | null => {
  try {
    const cleanText = text.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error, "Raw text:", text);
    return null;
  }
};

const resumeSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        linkedinUrl: { type: Type.STRING },
        githubUrl: { type: Type.STRING },
        portfolioUrl: { type: Type.STRING },
        summary: { type: Type.STRING, description: "A 2-3 sentence professional summary." },
        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    date: { type: Type.STRING },
                },
                required: ['institution', 'degree', 'date']
            }
        },
        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING },
                    company: { type: Type.STRING },
                    date: { type: Type.STRING },
                    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['role', 'company', 'date', 'bullets']
            }
        },
        projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['name', 'bullets']
            }
        },
        skills: {
            type: Type.ARRAY,
            description: "An array of skill categories.",
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: "e.g., 'Languages', 'Frameworks', 'Tools'" },
                    skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['category', 'skills']
            }
        }
    },
    required: ['name', 'email', 'education', 'experience', 'projects', 'skills']
};


export const extractResumeDetails = async (resumeText: string): Promise<ResumeData | null> => {
  // Call the server-side endpoint so the API key stays on the server
  try {
    // Determine server base URL in development; in production the server is expected
    // to be mounted at the same origin so we use a relative path.
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/extract-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText })
    });

    if (!resp.ok) {
      console.error('Server returned error for extract-resume:', await resp.text());
      return null;
    }

    const payload = await resp.json();
    const jsonStr: string = (payload && payload.text) ? payload.text.trim() : '';
    if (!jsonStr) return null;
    return parseJsonResponse<ResumeData>(jsonStr);
  } catch (error) {
    console.error('Error extracting resume details (client):', error);
    return null;
  }
};

export const tailorResumeForJob = async (resumeData: ResumeData, jobDescription: string): Promise<ResumeData | null> => {
  try {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/tailor-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeData, jobDescription })
    });
    if (!resp.ok) {
      console.error('Server returned error for tailor-resume:', await resp.text());
      return null;
    }
    const payload = await resp.json();
    const jsonStr: string = (payload && payload.text) ? payload.text.trim() : '';
    if (!jsonStr) return null;
    return parseJsonResponse<ResumeData>(jsonStr);
  } catch (error) {
    console.error('Error tailoring resume (client):', error);
    return null;
  }
};

const skillGapReportSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A brief, encouraging summary of the analysis for the user."
    },
    matchingSkills: {
      type: Type.ARRAY,
      description: "List of skills from the resume that match the job requirements.",
      items: { type: Type.STRING }
    },
    missingSkills: {
      type: Type.ARRAY,
      description: "List of skills that are missing or underdeveloped for the role.",
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING, description: "The name of the missing skill." },
          reason: { type: Type.STRING, description: "A brief explanation of why this skill is important for the role." },
          resources: {
            type: Type.ARRAY,
            description: "An array of 1-2 free online resources to learn this skill.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The name of the resource (e.g., 'freeCodeCamp')." },
                url: { type: Type.STRING, description: "The full URL to the resource." }
              },
              required: ['name', 'url'],
            }
          }
        },
        required: ['skill', 'reason', 'resources']
      }
    }
  },
  required: ['summary', 'matchingSkills', 'missingSkills']
};

export const performSkillGapAnalysis = async (userProfile: UserProfile, resumeData: ResumeData | null, jobDescription: string): Promise<SkillGapReport | null> => {
  try {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/skill-gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, resumeData, jobDescription })
    });
    if (!resp.ok) {
      console.error('Server returned error for skill-gap:', await resp.text());
      return null;
    }
    const payload = await resp.json();
    const jsonStr: string = (payload && payload.text) ? payload.text.trim() : '';
    if (!jsonStr) return null;
    return parseJsonResponse<SkillGapReport>(jsonStr);
  } catch (error) {
    console.error('Error performing skill gap analysis (client):', error);
    return null;
  }
};

export const getChatResponse = async (history: ChatMessage[], userProfile: UserProfile, resumeData: ResumeData | null, newMessage: string): Promise<string> => {
  let resumeContext = "The user has not provided a resume yet for this session.";
  if (resumeData) {
    resumeContext = `The user has uploaded their resume, and you have it in JSON format. Here it is: ${JSON.stringify(resumeData)}. Use this as the primary source of truth when they ask for feedback or judgement on their experience.`;
  }

  const systemInstruction = `You are LifePath Coach, an AI career mentor for low-income, first-generation, and underrepresented students. Your tone is encouraging, empathetic, but direct and actionable. Your goal is to provide specific, practical advice. You have the following context about the user: Name: ${userProfile.name}, Goal: ${userProfile.goals}, Constraints: ${userProfile.constraints}. ${resumeContext} Use this full context to personalize your responses. Never break character. Keep responses concise and helpful.`;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  contents.push({ role: 'user', parts: [{ text: newMessage }] });

  try {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, userProfile, resumeData, newMessage })
    });
    if (!resp.ok) {
      console.error('Server returned error for chat:', await resp.text());
      return "I'm sorry, I'm having trouble responding right now. Please try again later.";
    }
    const payload = await resp.json();
    return (payload && payload.text) ? String(payload.text) : "I'm sorry, I'm having trouble responding right now. Please try again later.";
  } catch (error) {
    console.error('Error getting chat response (client):', error);
    return "I'm sorry, I'm having trouble responding right now. Please try again later.";
  }
};

// Tone guidance helper used when constructing cover letter prompts
export const getToneGuidance = (tone: string) => {
  const toneGuides: Record<string, string> = {
    'professional': `PROFESSIONAL & FORMAL TONE: - Use traditional business language - Formal salutations and closings - Conservative, respectful phrasing - No contractions (use "I am" not "I'm") - Structured, polished sentences Example: "I am writing to express my strong interest in..."`,
    'enthusiastic': `ENTHUSIASTIC & PASSIONATE TONE: - Show genuine excitement for the role - Use energetic language - Express authentic interest - Can use exclamation points (sparingly) - Let personality shine through Example: "I'm thrilled to apply for this opportunity because..."`,
    'conversational': `CONVERSATIONAL & WARM TONE: - Friendly but still professional - Natural, approachable language - Can use contractions - Warm, engaging phrasing - Sound like a real person Example: "I'm reaching out because I'd love to..."`,
    'confident': `CONFIDENT & DIRECT TONE: - Assertive, results-focused language - No hedging or softening - Direct statements of capability - Lead with achievements - Unapologetic confidence Example: "My experience leading X makes me an ideal candidate..."`,
    'creative': `CREATIVE & UNIQUE TONE: - Inject personality and creativity - Unique opening (not standard "I am writing to apply") - Show individual voice - Appropriate for creative/startup roles - Stand out from generic letters Example: "When I saw this role, I immediately thought of..."`,
    'team-oriented': `HUMBLE & TEAM-ORIENTED TONE: - Emphasize collaboration - Use "we" alongside "I" - Highlight team contributions - Show humility and eagerness to learn - Focus on growth mindset Example: "As part of a team that..., I contributed by..."`
  };
  return toneGuides[tone] || toneGuides['professional'];
};

// Build a cover letter prompt and call the AI to generate the cover letter text
export const generateCoverLetterPrompt = (tailoredResume: string, jobDescription: string, companyName: string, jobTitle: string, tonePreference: string) => {
  return `You are LifePath Coach, an expert at writing compelling, personalized cover letters.\nTARGET JOB:\nCompany: ${companyName}\nPosition: ${jobTitle}\nTONE PREFERENCE: ${tonePreference}\n${getToneGuidance(tonePreference)}\nJOB DESCRIPTION: ${jobDescription}\nTAILORED RESUME (use these as proof points): ${tailoredResume}\nYOUR TASK - WRITE COVER LETTER: STRUCTURE (3-4 paragraphs, under 400 words): PARAGRAPH 1 - HOOK (2-3 sentences): - State the exact role you're applying for - Brief compelling reason why you're a great fit - Show you understand what the company does/values PARAGRAPH 2 - RELEVANT EXPERIENCE (3-4 sentences): - Reference 2-3 specific achievements from tailored resume - Use concrete examples with metrics - Connect directly to job requirements - Incorporate keywords from job description naturally PARAGRAPH 3 - WHY THIS COMPANY (3-4 sentences): - Show genuine interest in company mission/products/culture - Demonstrate you've done research (mention recent projects, values, etc.) - Connect your goals/values to company - Be SPECIFIC (not generic "I admire your company") PARAGRAPH 4 - CLOSING (2 sentences): - Express enthusiasm for next steps - Professional call to action - Confident but humble TONE GUIDANCE: ${getToneGuidance(tonePreference)}\nEQUITY LENS: - Frame non-traditional backgrounds as strengths - Transform challenges into resilience narratives - Remove apologetic language ("I'm just a student", "I know I lack experience") - Use confident, factual statements\nCRITICAL RULES: 1. Under 400 words total 2. No clichés without context: "team player", "hard worker", "passionate" need examples 3. Every claim backed by specific example from resume 4. Personalized to THIS company (not template) 5. Use natural language (not robotic or overly formal unless tone requires) 6. Include ATS keywords naturally\nOUTPUT FORMAT: [Your Name] [Your Email] [Your Phone] [Date] [Hiring Manager Name or "Hiring Manager"] [Company Name] [Company Address if known] Dear [Hiring Manager/Team], [Paragraph 1: Hook] [Paragraph 2: Relevant Experience] [Paragraph 3: Why This Company] [Paragraph 4: Closing] Sincerely, [Your Name]\nReturn ONLY the complete cover letter, no other commentary.`;
};

export const generateCoverLetter = async (tailoredResumeStr: string, jobDescription: string, companyName: string, jobTitle: string, tonePreference: string): Promise<string | null> => {
  try {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/generate-cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tailoredResumeStr, jobDescription, companyName, jobTitle, tonePreference })
    });
    if (!resp.ok) {
      console.error('Server returned error for generate-cover-letter:', await resp.text());
      return null;
    }
    const payload = await resp.json();
    return (payload && payload.text) ? String(payload.text).trim() : null;
  } catch (error) {
    console.error('Error generating cover letter (client):', error);
    return null;
  }
};

// Generate a ONE-PAGE A4 LaTeX resume using the strict master prompt/template provided by the user.
export const generateA4LatexResume = async (
  masterResumeText: string,
  jobDescription: string,
  companyName: string,
  jobTitle: string,
  qAndA: string = ''
): Promise<string | null> => {
  // Use the user's exact MASTER PROMPT and LaTeX template. The function fills in variables.
  const prompt = String.raw`INSTRUCTION FOR THE AI:
You are an expert in ATS-optimized resume writing and LaTeX typesetting.
Your task is to generate a fully formatted A4 LaTeX resume, based on:

The user’s master resume

The target job description

The company name

The job title

The Q&A clarifications the user provided to improve weak bullets

Your output must:

Follow A4 paper size formatting

Use the geometry package

Fit on one page

Contain no filler text, no general advice, no explanation

Only output pure LaTeX code, ready to compile

Include ATS keywords from the job description naturally

Rewrite all bullets into Action → Context → Impact using metrics

Reorder sections so the most relevant experience appears first

Never fabricate facts—use only user-provided information

Remove weak/irrelevant content unless necessary for cohesion

Use clear section headers (Education, Skills, Experience, Projects, etc.)

Use professional typography

REWRITE REQUIREMENTS:
• Reorder experience so the most relevant items for this job appear at the top.
• Strengthen weak bullets using metrics from Q&A.
• Insert ATS keywords from the job description naturally.
• Remove filler phrases ("helped", "responsible for", "assisted with").
• Every bullet must include a concrete action and measurable impact.
• Do NOT fabricate information.

OUTPUT REQUIREMENTS:
• Output ONLY the final A4 LaTeX code.
• Use the exact LaTeX template below.
• No commentary, no explanation, no markdown.
• The output must compile without errors.

--- USE THIS EXACT LATEX TEMPLATE ---
\documentclass[a4paper]{article}
\usepackage[a4paper, total={6in, 9.2in}, margin=0.7in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}

\pagenumbering{gobble}

\setlist[itemize]{left=0pt .. 12pt}

\begin{document}

\begin{center}
    {\LARGE \textbf{[FULL NAME]}}\\
    \vspace{4pt}
    [EMAIL] \ | \ [PHONE] \ | \ \href{[LINKEDIN]}{LinkedIn} \ | \ \href{[GITHUB]}{GitHub}
\end{center}

\vspace{8pt}

\section*{Education}
	extbf{[University Name]} \hfill [Grad Date] \\
B.S. in [Major] \\
Relevant Coursework: [List]

\vspace{6pt}

\section*{Technical Skills}
	extbf{Languages:} [List] \\
	extbf{Frameworks:} [List] \\
	extbf{Tools:} [List]

\vspace{6pt}

\section*{Experience}
	extbf{[Job Title]} --- [Company] \hfill [Dates] \\
\begin{itemize}
    \item [Bullet 1 rewritten with metric, ATS keyword, and impact]
    \item [Bullet 2 rewritten with metric, ATS keyword, and impact]
    \item [Bullet 3 rewritten with metric, ATS keyword, and impact]
\end{itemize}

% Repeat pattern for other jobs

\vspace{6pt}

\section*{Projects}
	extbf{[Project Name]} --- [Technologies] \hfill [Date] \\
\begin{itemize}
    \item [Impact-focused bullet rewritten using context + scale + result]
    \item [Impact-focused bullet rewritten using metrics]
\end{itemize}

% Add more projects as relevant

\end{document}

You MUST fill the template exactly, substituting the bracketed placeholders with user-provided content or strengthened bullets derived only from the MASTER RESUME, JOB DESCRIPTION, COMPANY NAME, JOB TITLE, and Q&A.

MASTER RESUME:
${masterResumeText}

JOB DESCRIPTION:
${jobDescription}

COMPANY NAME: ${companyName}

JOB TITLE: ${jobTitle}

Q&A CLARIFICATIONS:
${qAndA}

Return ONLY the final LaTeX code and nothing else.`;

  try {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const serverBase = isLocalhost ? 'http://localhost:4000' : '';

    const resp = await fetch(`${serverBase}/api/generate-latex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterResumeText, jobDescription, companyName, jobTitle, qAndA })
    });
    if (!resp.ok) {
      console.error('Server returned error for generate-latex:', await resp.text());
      return null;
    }
    const payload = await resp.json();
    return (payload && payload.text) ? String(payload.text).trim() : null;
  } catch (error) {
    console.error('Error generating A4 LaTeX resume (client):', error);
    return null;
  }
};