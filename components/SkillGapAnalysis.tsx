import React, { useState } from 'react';
import { UserProfile, SkillGapReport, ResumeData } from '../types';
import { performSkillGapAnalysis } from '../services/geminiService';
import { LightBulbIcon, LinkIcon } from './Icons';

const SkillGapAnalysis: React.FC<{ userProfile: UserProfile; resumeData: ResumeData | null }> = ({ userProfile, resumeData }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!resumeData && !userProfile.goals) {
        setError('Please add your resume or set a career goal first.');
        return;
    }
    if (!jobDescription.trim() && !userProfile.goals) {
        setError('Please paste a job description or set a career goal in your profile.');
        return;
    }

    setIsLoading(true);
    setError('');
    setReport(null);
    try {
        const result = await performSkillGapAnalysis(userProfile, resumeData, jobDescription);
        if (result) {
            setReport(result);
        } else {
            setError('Could not generate a skill gap analysis. The AI might be busy. Please try again.');
        }
    } catch (err) {
        setError('An unexpected error occurred. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <LightBulbIcon className="h-8 w-8 text-purple-400" />
        <h2 className="text-3xl font-bold text-white">Skill Gap Analysis</h2>
      </div>
      <p className="text-gray-400 mb-8">See how your skills match up against a job description or your career goal, and get a prioritized list of resources to fill the gaps.</p>
      
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Paste a job description below (or leave blank to analyze against your profile's career goal).</p>
          <textarea
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., 'Software Engineer Intern at Google...'"
          />
          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Analyzing...' : 'Analyze My Skills'}
          </button>
        </div>
        
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        {report && (() => {
          // Normalize fields to safe defaults in case the AI/service returns undefined fields
          const summary = report.summary ?? 'No summary provided.';
          const matchingSkills = report.matchingSkills ?? [];
          const missingSkills = report.missingSkills ?? [];

          return (
            <div className="mt-6 space-y-6 animate-fade-in">
              <div>
                <h4 className="font-bold text-lg text-white">Analysis Summary</h4>
                <p className="mt-2 text-gray-300 bg-gray-700/50 p-3 rounded-md">{summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-purple-400">Matching Skills</h4>
                  {matchingSkills.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {matchingSkills.map((skill, i) => (
                        <li key={i} className="p-2 bg-purple-900/20 text-purple-300 border border-purple-700 rounded-md text-sm">{skill}</li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 text-sm mt-2">No direct skill matches found yet. Let's build them!</p>}
                </div>

                <div>
                  <h4 className="font-semibold text-purple-400">Skills to Develop</h4>
                  {missingSkills.length > 0 ? (
                    <div className="mt-2 space-y-4">
                      {missingSkills.map((item, i) => {
                        const resources = item.resources ?? [];
                        return (
                          <div key={i} className="p-3 bg-purple-900/20 border border-purple-700 rounded-md">
                            <h5 className="font-bold text-purple-300">{item.skill}</h5>
                            <p className="text-sm text-gray-300 mt-1">{item.reason}</p>
                            <div className="mt-3 space-y-2">
                              {resources.length > 0 ? resources.map((res, j) => (
                                <a href={res.url} target="_blank" rel="noopener noreferrer" key={j} className="flex items-center gap-2 text-sm text-red-400 hover:underline">
                                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{res.name}</span>
                                </a>
                              )) : <p className="text-gray-400 text-sm">No resources suggested.</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-gray-400 text-sm mt-2">No specific gaps identified based on the info. Provide more details for a deeper analysis!</p>}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SkillGapAnalysis;