import React, { useState, useRef, useEffect } from 'react';
import { extractResumeDetails, tailorResumeForJob, generateA4LatexResume } from '../services/geminiService';
import { ResumeData, Experience, Project, JobApplication, TonePreference } from '../types';
import { SparklesIcon, ClipboardCopyIcon, UploadIcon } from './Icons';
// @ts-ignore - pdfjs types aren't bundled; import the legacy build for browser PDF text extraction
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResumeMentorProps {
  resumeData: ResumeData | null;
  setResumeData: (data: ResumeData | null) => void;
}

const ResumeMentor: React.FC<ResumeMentorProps> = ({ resumeData, setResumeData }) => {
  const [pastedText, setPastedText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tailoredData, setTailoredData] = useState<ResumeData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [qAndA, setQAndA] = useState('');
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
  const [isGeneratingLatex, setIsGeneratingLatex] = useState(false);

  const [isLoading, setIsLoading] = useState<'parsing' | 'tailoring' | false>(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParseResume = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsLoading('parsing');
    setError('');
    setResumeData(null);
    setTailoredData(null);
    try {
      const data = await extractResumeDetails(textToParse);
      if (data) {
        setResumeData(data);
        setPastedText(''); // Clear text area after successful parse
      } else {
        setError('Failed to parse resume. The structure may be unclear or the file format unsupported. For best results, please use a plain text (.txt) file or paste the content directly.');
      }
    } catch (err) {
      setError('An error occurred while parsing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // On mount, if there's a saved master resume in localStorage, load it as the source of truth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('masterResume');
      if (raw && !resumeData) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.text) {
          // Parse the extracted text to populate structured resume data
          handleParseResume(parsed.text);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const resetInput = () => { try { event.target.value = ''; } catch {} };

    // Helper: convert ArrayBuffer to base64 for storage
    // Convert a Blob to base64-safe data URL string
    const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
          const result = fr.result as string | ArrayBuffer | null;
          if (!result || typeof result !== 'string') return resolve('');
          // result is like 'data:application/pdf;base64,JVBERi0x...'
          const comma = result.indexOf(',');
          const base64 = comma >= 0 ? result.slice(comma + 1) : result;
          resolve(base64);
        };
        fr.onerror = (e) => reject(e);
        fr.readAsDataURL(blob);
      });
    };

    // Helper: extract text from PDF using pdfjs
    const extractTextFromPdf = async (arrayBuffer: ArrayBuffer) => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const strings = content.items.map((it: any) => (it.str || '')).join(' ');
          fullText += strings + '\n\n';
        }
        return fullText.trim();
      } catch (err) {
        console.error('PDF text extraction error', err);
        return '';
      }
    };

    // Only allow PDFs now
    if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setError('Only PDF files are supported. Please upload a searchable PDF resume.');
      resetInput();
      return;
    }

    // Ensure pdfjs worker is configured (use CDN fallback)
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    } catch (e) {
      // ignore
    }

    // If PDF, read as ArrayBuffer and extract text
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arr = e.target?.result as ArrayBuffer;
        if (!arr) {
          setError('Failed to read PDF file.');
          resetInput();
          return;
        }
        setIsLoading('parsing');
        try {
          const extractedText = await extractTextFromPdf(arr);
          if (!extractedText) {
            setError('Failed to extract text from PDF. Try saving your resume as a searchable PDF or paste the text instead.');
            return;
          }
          // Store master resume in localStorage as source of truth
          try {
            // Create a blob from the array buffer and convert to base64 safely
            try {
              const blob = new Blob([arr], { type: file.type || 'application/pdf' });
              const pdfBase64 = await blobToBase64(blob);
              const master = { pdfBase64, text: extractedText, uploadedAt: new Date().toISOString() };
              localStorage.setItem('masterResume', JSON.stringify(master));
            } catch (innerErr) {
              console.warn('Could not convert PDF to base64 for localStorage', innerErr);
            }
          } catch (e) {
            console.warn('Could not persist master resume to localStorage', e);
          }
          await handleParseResume(extractedText);
        } finally {
          setIsLoading(false);
          resetInput();
        }
      };
      reader.onerror = () => {
        setError('Failed to read the PDF file.');
        resetInput();
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Fallback: treat as text for .txt/.md/.docx etc. Read as text and store as master text
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError('Failed to read the file.');
        resetInput();
        return;
      }
      // Persist master resume text only
      try {
        const master = { pdfBase64: null, text, uploadedAt: new Date().toISOString() };
        localStorage.setItem('masterResume', JSON.stringify(master));
      } catch (e) {
        console.warn('Could not persist master resume to localStorage', e);
      }
      await handleParseResume(text);
      resetInput();
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
      resetInput();
    };
    reader.readAsText(file);
  };

  const handleTailorResume = async () => {
    if (!resumeData || !jobDescription.trim()) return;
    setIsLoading('tailoring');
    setError('');
    setTailoredData(null);
    try {
      const data = await tailorResumeForJob(resumeData, jobDescription);
      if (data) {
        setTailoredData(data);
      } else {
        setError('Failed to tailor resume. The AI might be busy. Please try again.');
      }
    } catch (err) {
       setError('An error occurred while tailoring. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  // Small id generator for local entries
  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  const saveJobPosting = () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description before saving.');
      return;
    }
    try {
      const raw = localStorage.getItem('jobApplications');
      const existing: JobApplication[] = raw ? JSON.parse(raw) : [];
      const appName = jobDescription.split('\n')[0].slice(0, 60) || `Job ${new Date().toLocaleString()}`;
      const newApp: JobApplication = {
        id: makeId(),
        applicationName: appName,
        company: '',
        jobTitle: '',
        jobDescription: jobDescription,
        tonePreference: 'professional' as TonePreference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generatedResume: null,
        generatedCoverLetter: null,
        conversationHistory: []
      };
      const next = [newApp, ...existing];
      localStorage.setItem('jobApplications', JSON.stringify(next));
      setCopySuccess('Saved job posting to Applications tab');
      setTimeout(() => setCopySuccess(''), 2500);
    } catch (e) {
      console.error('Failed to save job posting', e);
      setError('Failed to save job posting.');
    }
  };

  const handleCopyLatex = () => {
    const dataToExport = tailoredData || resumeData;
    if (!dataToExport) return;

    const escapeLatex = (str: string) => str ? str.replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$').replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/\\/g, '\\textbackslash{}') : '';

    let latexString = `
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule\\vspace{-5pt}]

\\begin{document}

\\begin{center}
    {\\Huge \\scshape ${escapeLatex(dataToExport.name)}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(dataToExport.phone)} $|$ \\href{mailto:${dataToExport.email}}{\\underline{${escapeLatex(dataToExport.email)}}} $|$ 
    \\href{${dataToExport.linkedinUrl}}{\\underline{${escapeLatex(dataToExport.linkedinUrl)}}} $|$ 
    \\href{${dataToExport.githubUrl}}{\\underline{${escapeLatex(dataToExport.githubUrl)}}}
\\end{center}

\\section{Summary}
  ${escapeLatex(dataToExport.summary)}

\\section{Education}
  \\resumeSubHeadingListStart
    ${dataToExport.education.map(edu => `\\resumeSubheading
      {${escapeLatex(edu.institution)}}{${escapeLatex(edu.date)}}
      {${escapeLatex(edu.degree)}}{}`).join('\n    ')}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    ${dataToExport.experience.map(exp => `\\resumeSubheading
      {${escapeLatex(exp.role)}}{${escapeLatex(exp.date)}}
      {${escapeLatex(exp.company)}}{}
      \\resumeItemListStart
        ${exp.bullets.map(bullet => `\\resumeItem{${escapeLatex(bullet)}}`).join('\n        ')}
      \\resumeItemListEnd`).join('\n    ')}
  \\resumeSubHeadingListEnd

\\section{Projects}
    \\resumeSubHeadingListStart
    ${dataToExport.projects.map(proj => `\\resumeSubheading
      {${escapeLatex(proj.name)}
    }{${escapeLatex(proj.description)}}
    \\resumeItemListStart
        ${proj.bullets.map(bullet => `\\resumeItem{${escapeLatex(bullet)}}`).join('\n        ')}
    \\resumeItemListEnd`).join('\n    ')}
  \\resumeSubHeadingListEnd
  
\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    ${dataToExport.skills.map(skillCategory => `\\small{\\item{
     \\textbf{${escapeLatex(skillCategory.category)}:}{ ${escapeLatex(skillCategory.skills.join(', '))}}
    }}`).join('\n    ')}
 \\end{itemize}

\\end{document}
`;
    // Clean up helper definitions for the final output
    const latexHelpers = `
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.2in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`;
    
    navigator.clipboard.writeText(latexHelpers + latexString);
    setCopySuccess('LaTeX code copied to clipboard!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const buildLatexBundle = (dataToExport: ResumeData) => {
    const escapeLatex = (str: string) => str ? str.replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$').replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/\\/g, '\\textbackslash{}') : '';

    const latexString = `
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule\\vspace{-5pt}]

\\begin{document}

\\begin{center}
    {\\Huge \\scshape ${escapeLatex(dataToExport.name)}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(dataToExport.phone)} $|$ \\href{mailto:${dataToExport.email}}{\\underline{${escapeLatex(dataToExport.email)}}} $|$ 
    \\href{${dataToExport.linkedinUrl}}{\\underline{${escapeLatex(dataToExport.linkedinUrl)}}} $|$ 
    \\href{${dataToExport.githubUrl}}{\\underline{${escapeLatex(dataToExport.githubUrl)}}}
\\end{center}

\\section{Summary}
  ${escapeLatex(dataToExport.summary)}

\\section{Education}
  \\resumeSubHeadingListStart
    ${dataToExport.education.map(edu => `\\resumeSubheading
      {${escapeLatex(edu.institution)}}{${escapeLatex(edu.date)}}
      {${escapeLatex(edu.degree)}}{}`).join('\n    ')}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    ${dataToExport.experience.map(exp => `\\resumeSubheading
      {${escapeLatex(exp.role)}}{${escapeLatex(exp.date)}}
      {${escapeLatex(exp.company)}}{}
      \\resumeItemListStart
        ${exp.bullets.map(bullet => `\\resumeItem{${escapeLatex(bullet)}}`).join('\n        ')}
      \\resumeItemListEnd`).join('\n    ')}
  \\resumeSubHeadingListEnd

\\section{Projects}
    \\resumeSubHeadingListStart
    ${dataToExport.projects.map(proj => `\\resumeSubheading
      {${escapeLatex(proj.name)}
    }{${escapeLatex(proj.description)}}
    \\resumeItemListStart
        ${proj.bullets.map(bullet => `\\resumeItem{${escapeLatex(bullet)}}`).join('\n        ')}
    \\resumeItemListEnd`).join('\n    ')}
  \\resumeSubHeadingListEnd
  
\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    ${dataToExport.skills.map(skillCategory => `\\small{\\item{
     \\textbf{${escapeLatex(skillCategory.category)}:}{ ${escapeLatex(skillCategory.skills.join(', '))}}
    }}`).join('\n    ')}
 \\end{itemize}

\\end{document}
`;

    const latexHelpers = `
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]} 
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.2in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`;

    return { helpers: latexHelpers, body: latexString, full: latexHelpers + latexString };
  };

  const previewRef = useRef<HTMLDivElement | null>(null);

  const downloadLatexFile = (latex: string) => {
    const blob = new Blob([latex], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(resumeData?.name || 'resume').replace(/\s+/g, '_')}.tex`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPreviewAsPdf = async () => {
    if (!previewRef.current) {
      setError('Nothing to export.');
      return;
    }
    try {
      setIsLoading('parsing');
      const canvas = await html2canvas(previewRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const imgProps = (pdf as any).getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${(resumeData?.name || 'resume').replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      setError('Export to PDF failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const ResumePreview: React.FC<{ original: ResumeData, tailored: ResumeData | null }> = ({ original, tailored }) => {
    
  const renderBullets = (originalExp: Experience | Project, tailoredExp: Experience | Project | undefined) => {
    const bullets = originalExp?.bullets || [];
    return bullets.map((bullet, index) => {
      const tailoredBullet = tailoredExp?.bullets?.[index];
      const isChanged = Boolean(tailoredBullet && bullet !== tailoredBullet);
      return (
        <li key={index} className={`text-sm mb-1 ${isChanged ? 'bg-purple-900/50 p-2 rounded-md border-l-2 border-purple-500' : ''}`}>
          {isChanged ? tailoredBullet : bullet}
        </li>
      );
    });
  }

  const safeSkills = Array.isArray(original.skills) ? original.skills : [];

  return (
        <div className="p-6 bg-white text-gray-800 rounded-md font-serif text-sm">
            <div className="text-center mb-4">
                <h2 className="text-3xl font-bold tracking-wider">{original.name}</h2>
                <p className="text-xs">{original.phone} | {original.email} | {original.linkedinUrl} | {original.githubUrl}</p>
            </div>

            <div className="mb-2">
                <h3 className="text-lg font-bold border-b border-gray-400">Summary</h3>
                <p className="mt-1 text-sm">{tailored?.summary || original.summary}</p>
            </div>
            
            <div className="mb-2">
                <h3 className="text-lg font-bold border-b border-gray-400">Education</h3>
                {original.education.map((edu, i) => (
                    <div key={i} className="mt-2">
                        <div className="flex justify-between">
                            <h4 className="font-bold">{edu.institution}</h4>
                            <p className="text-sm">{edu.date}</p>
                        </div>
                        <p className="italic text-sm">{edu.degree}</p>
                    </div>
                ))}
            </div>

            <div className="mb-2">
                <h3 className="text-lg font-bold border-b border-gray-400">Experience</h3>
                {original.experience.map((exp, i) => {
                    const tailoredExp = tailored?.experience.find(t => t.role === exp.role && t.company === exp.company);
                    return (
                        <div key={i} className="mt-2">
                            <div className="flex justify-between">
                                <h4 className="font-bold">{exp.role}</h4>
                                <p className="text-sm">{exp.date}</p>
                            </div>
                            <p className="italic text-sm">{exp.company}</p>
                            <ul className="list-disc pl-5 mt-1">
                                {renderBullets(exp, tailoredExp)}
                            </ul>
                        </div>
                    )
                })}
            </div>

             <div className="mb-2">
                <h3 className="text-lg font-bold border-b border-gray-400">Projects</h3>
                {original.projects.map((proj, i) => {
                    const tailoredProj = tailored?.projects.find(t => t.name === proj.name);
                    return (
                        <div key={i} className="mt-2">
                            <div className="flex justify-between">
                                <h4 className="font-bold">{proj.name}</h4>
                            </div>
                            <p className="italic text-sm">{proj.description}</p>
                            <ul className="list-disc pl-5 mt-1">
                                {renderBullets(proj, tailoredProj)}
                            </ul>
                        </div>
                    )
                })}
            </div>
            
      <div className="mb-2">
                <h3 className="text-lg font-bold border-b border-gray-400">Skills</h3>
        {safeSkills.map((skillCategory) => (
          <p key={skillCategory.category} className="text-sm mt-1">
            <span className="font-bold">{skillCategory.category}:</span> {(Array.isArray(skillCategory.skills) ? skillCategory.skills.join(', ') : String(skillCategory.skills || ''))}
          </p>
        ))}
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="h-8 w-8 text-red-400" />
        <h2 className="text-3xl font-bold text-white">Resume Tailoring Studio</h2>
      </div>
      <p className="text-gray-400 mb-8">Upload or paste your resume to start, then add a job description to get AI-powered suggestions tailored for the role.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Controls */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".txt,.md,.pdf,.doc,.docx,.tex" className="hidden" />
            {!resumeData ? ( // Conditional rendering for initial state (no resume data)
                <>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading === 'parsing'}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition disabled:opacity-50"
                    >
                        <UploadIcon className="h-5 w-5" />
                        Upload Resume File
                    </button>
                    <div className="my-4 flex items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>
                    <textarea 
                        rows={12}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500"
                        placeholder="Paste your entire resume content..."
                    />
                    <button onClick={() => handleParseResume(pastedText)} disabled={isLoading === 'parsing' || !pastedText} className="mt-4 w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition disabled:opacity-50">
                        {isLoading === 'parsing' ? 'Parsing...' : 'Parse Pasted Text'}
                    </button>
                </>
            ) : (
                 <div>
                    <h3 className="text-lg font-bold text-white">2. Paste the Job Description</h3>
                     <p className="text-sm text-gray-400 mb-4">Add the job description you are targeting to get tailored feedback.</p>
                     
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name (optional)" className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2" />
                      <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title (optional)" className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2" />
                    </div>
                    <textarea 
                        id="job-desc"
                        rows={8}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500"
                        placeholder="Paste the full job description you're applying for..."
                    />
                    <textarea rows={3} value={qAndA} onChange={(e) => setQAndA(e.target.value)} placeholder="Optional Q&A clarifications (e.g., metrics to include)" className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2 mt-2 text-sm" />
                     <button onClick={handleTailorResume} disabled={isLoading === 'tailoring' || !jobDescription} className="mt-4 w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition disabled:opacity-50">
                        {isLoading === 'tailoring' ? 'Tailoring...' : 'Tailor My Resume'}
                    </button>
          <div className="flex gap-2 mt-3">
            <button onClick={saveJobPosting} disabled={!jobDescription} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md transition text-sm">
              Save Job Posting → Applications
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition text-sm"
            >
                Upload New Resume
            </button>
          </div>
          <button onClick={async () => {
            // Generate A4 LaTeX via AI
            const masterRaw = localStorage.getItem('masterResume');
            const masterText = masterRaw ? JSON.parse(masterRaw).text || '' : '';
            if (!masterText) {
              setError('No master resume text available to generate from. Upload or paste your resume first.');
              return;
            }
            try {
              setIsGeneratingLatex(true);
              setError('');
              const latex = await generateA4LatexResume(masterText, jobDescription, companyName, jobTitle, qAndA);
              if (latex) {
                setGeneratedLatex(latex);
                setCopySuccess('Generated A4 LaTeX resume (ready to download)');
                setTimeout(() => setCopySuccess(''), 2500);
              } else {
                setError('AI failed to generate LaTeX. Try again or shorten the inputs.');
              }
            } catch (e) {
              console.error(e);
              setError('Generation failed.');
            } finally {
              setIsGeneratingLatex(false);
            }
          }} disabled={isGeneratingLatex || isLoading === 'parsing'} className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-md transition text-sm">
            {isGeneratingLatex ? 'Generating LaTeX...' : 'Generate A4 LaTeX Resume (AI)'}
          </button>
                 </div>
            )}
             {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-gray-800 rounded-xl p-2 border border-gray-700">
            {resumeData ? (
                <>
                <div className="p-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Live Preview (A4 Format)</h3>
                    <button 
                        onClick={handleCopyLatex}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md transition text-sm"
                    >
                       <ClipboardCopyIcon className="h-4 w-4" />
                       Copy LaTeX Code
                    </button>
                </div>
                {copySuccess && <p className="text-purple-400 text-center text-sm pb-2">{copySuccess}</p>}
        <div className="max-h-[80vh] overflow-y-auto" ref={previewRef}>
          <ResumePreview original={resumeData} tailored={tailoredData} />
        </div>
        <div className="flex gap-2 justify-end p-2">
          <button onClick={() => { const dataToExport = tailoredData || resumeData; if (!dataToExport) return; const { full } = buildLatexBundle(dataToExport); downloadLatexFile(full); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md text-sm">Download .tex</button>
          <button onClick={exportPreviewAsPdf} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md text-sm">Export as PDF</button>
        </div>
        {generatedLatex && (
          <div className="p-4 bg-gray-900 border-t border-gray-700">
            <h4 className="text-white font-bold mb-2">Generated A4 LaTeX (AI)</h4>
            <div className="mb-2">
              <button onClick={() => { downloadLatexFile(generatedLatex); }} className="mr-2 bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-2 rounded text-sm">Download generated .tex</button>
              <button onClick={() => { navigator.clipboard.writeText(generatedLatex); setCopySuccess('Generated LaTeX copied to clipboard'); setTimeout(() => setCopySuccess(''), 2000); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded text-sm">Copy LaTeX</button>
            </div>
            <textarea readOnly rows={10} value={generatedLatex} className="w-full bg-gray-800 text-xs text-white p-2 rounded-md font-mono" />
          </div>
        )}
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Your resume preview will appear here.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResumeMentor;