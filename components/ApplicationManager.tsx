import React, { useEffect, useState } from 'react';
import { JobApplication, ResumeData, TonePreference, UserProfile } from '../types';
// lightweight id generator to avoid extra dependency
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
import { tailorResumeForJob, generateCoverLetter } from '../services/geminiService';

interface Props {
  resumeData: ResumeData | null;
  userProfile: UserProfile | null;
}

const TONE_OPTIONS: TonePreference[] = ['professional', 'enthusiastic', 'conversational', 'confident', 'creative', 'team-oriented'];

const STORAGE_KEY = 'jobApplications';

const ApplicationManager: React.FC<Props> = ({ resumeData, userProfile }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | false>(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setApplications(JSON.parse(raw));
      } catch (e) {
        console.warn('Failed to parse saved applications', e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to persist applications', e);
    }
  }, [applications]);

  const createApplication = () => {
    const newApp: JobApplication = {
      id: makeId(),
      applicationName: `Application ${applications.length + 1}`,
      company: '',
      jobTitle: '',
      jobDescription: '',
      tonePreference: 'professional',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedResume: null,
      generatedCoverLetter: null,
      conversationHistory: []
    };
    setApplications(prev => [newApp, ...prev]);
    setSelectedId(newApp.id);
  };

  const updateSelected = (patch: Partial<JobApplication>) => {
    if (!selectedId) return;
    setApplications(prev => prev.map(a => a.id === selectedId ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a));
  };

  const selected = applications.find(a => a.id === selectedId) || null;

  const removeApplication = (id: string) => {
    setApplications(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleTailor = async () => {
    if (!selected || !resumeData || !selected.jobDescription.trim()) return;
    setIsProcessing('tailor');
    try {
      const tailored = await tailorResumeForJob(resumeData, selected.jobDescription);
      if (tailored) {
        setApplications(prev => prev.map(a => a.id === selected.id ? { ...a, generatedResume: tailored, updatedAt: new Date().toISOString() } : a));
      } else {
        alert('Failed to create tailored resume. Try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!selected) return;
    // Need tailored resume first
    if (!selected.generatedResume) {
      alert('Please generate a tailored resume first.');
      return;
    }
    setIsProcessing('cover');
    try {
      const tailoredResumeStr = JSON.stringify(selected.generatedResume, null, 2);
      const cover = await generateCoverLetter(tailoredResumeStr, selected.jobDescription, selected.company, selected.jobTitle, selected.tonePreference);
      if (cover) {
        setApplications(prev => prev.map(a => a.id === selected.id ? { ...a, generatedCoverLetter: cover, updatedAt: new Date().toISOString() } : a));
      } else {
        alert('Failed to generate cover letter. Try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      alert('Failed to copy');
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1 bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Job Applications</h3>
          <div className="flex items-center gap-2">
            <button onClick={createApplication} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-md text-sm">New</button>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-sm text-gray-300">Quick open (jobs saved from Resume Mentor)</label>
          <div className="flex gap-2 mt-2">
            <select className="flex-1 bg-gray-700 p-2 rounded-md text-white" value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">-- Select a saved job --</option>
              {applications.map(a => (
                <option key={a.id} value={a.id}>{a.applicationName || (a.jobTitle || a.company || a.createdAt)}</option>
              ))}
            </select>
            <button onClick={() => { if (selectedId) setSelectedId(selectedId); }} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm">Open</button>
          </div>
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {applications.map(app => (
            <div key={app.id} className={`p-3 rounded-md cursor-pointer ${selectedId === app.id ? 'bg-gradient-to-r from-red-500 to-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`} onClick={() => setSelectedId(app.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold truncate" title={app.applicationName}>{app.applicationName}</div>
                  <div className="text-xs text-gray-300 truncate" title={`${app.company} — ${app.jobTitle}`}>{app.company} — {app.jobTitle}</div>
                </div>
                <div className="text-xs text-gray-300">{new Date(app.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
          {applications.length === 0 && <p className="text-sm text-gray-400">No applications yet. Click New to start.</p>}
        </div>
      </div>

      <div className="col-span-2 bg-gray-800 rounded-xl p-4 border border-gray-700">
        {!selected ? (
          <div className="text-gray-400">Select or create an application to begin.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <input value={selected.applicationName} onChange={(e) => updateSelected({ applicationName: e.target.value })} className="bg-gray-700 p-2 rounded-md text-white w-full text-lg font-semibold" />
                <div className="mt-1 text-sm text-gray-300">Created: {new Date(selected.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => removeApplication(selected.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md text-sm">Delete</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Company" value={selected.company} onChange={(e) => updateSelected({ company: e.target.value })} className="bg-gray-700 p-2 rounded-md text-white" />
              <input placeholder="Job Title" value={selected.jobTitle} onChange={(e) => updateSelected({ jobTitle: e.target.value })} className="bg-gray-700 p-2 rounded-md text-white" />
            </div>

            <div>
              <label className="text-sm text-gray-300">Tone Preference</label>
              <select value={selected.tonePreference} onChange={(e) => updateSelected({ tonePreference: e.target.value as TonePreference })} className="w-full bg-gray-700 p-2 rounded-md text-white mt-1">
                {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-300">Full Job Description</label>
              <textarea value={selected.jobDescription} onChange={(e) => updateSelected({ jobDescription: e.target.value })} rows={8} className="w-full bg-gray-700 p-3 rounded-md text-white mt-1" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleTailor} disabled={isProcessing === 'tailor'} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md">{isProcessing === 'tailor' ? 'Tailoring...' : (selected.generatedResume ? 'Regenerate Tailored Resume' : 'Generate Tailored Resume')}</button>
              <button onClick={handleGenerateCover} disabled={isProcessing === 'cover'} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md">{isProcessing === 'cover' ? 'Generating...' : (selected.generatedCoverLetter ? 'Regenerate Cover Letter' : 'Generate Cover Letter')}</button>
              <button onClick={() => copyToClipboard(selected.generatedCoverLetter)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md">Copy Cover</button>
            </div>

            {selected.generatedResume && (
              <div className="bg-gray-900 p-3 rounded-md">
                <h4 className="font-semibold">Tailored Resume (Preview)</h4>
                <pre className="text-xs max-h-48 overflow-y-auto whitespace-pre-wrap mt-2">{JSON.stringify(selected.generatedResume, null, 2)}</pre>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => copyToClipboard(JSON.stringify(selected.generatedResume, null, 2))} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm">Copy JSON</button>
                </div>
              </div>
            )}

            {selected.generatedCoverLetter && (
              <div className="bg-gray-900 p-3 rounded-md">
                <h4 className="font-semibold">Generated Cover Letter</h4>
                <div className="prose max-w-none text-sm mt-2 whitespace-pre-wrap">{selected.generatedCoverLetter}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => copyToClipboard(selected.generatedCoverLetter)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm">Copy</button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationManager;
