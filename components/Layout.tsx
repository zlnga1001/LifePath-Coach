import React from 'react';
import { UserProfile, ResumeData } from '../types';
import { AppView } from '../App';
import Sidebar from './Sidebar';
import Home from './Home';
import ResumeMentor from './ResumeMentor';
import CareerTrack from './CareerTrack';
import SkillGapAnalysis from './SkillGapAnalysis';
import MentorChat from './MentorChat';
import Guidance from './Guidance';
import ApplicationManager from './ApplicationManager';

interface LayoutProps {
  userProfile: UserProfile;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  resumeData: ResumeData | null;
  setResumeData: (data: ResumeData | null) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  userProfile, 
  activeView, 
  setActiveView,
  resumeData,
  setResumeData,
  onLogout 
}) => {

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <Home userProfile={userProfile} setActiveView={setActiveView} />;
      case 'resume':
        return <ResumeMentor resumeData={resumeData} setResumeData={setResumeData} />;
      case 'track':
        return <CareerTrack />;
      case 'analysis':
        return <SkillGapAnalysis userProfile={userProfile} resumeData={resumeData} />;
      case 'chat':
        return <MentorChat userProfile={userProfile} resumeData={resumeData} />;
      case 'applications':
        return <ApplicationManager resumeData={resumeData} userProfile={userProfile} />;
      default:
        return <Home userProfile={userProfile} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        userProfile={userProfile} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={onLogout} 
      />
      {/* Guidance overlay — shows walkthrough on first use and a minimized banner after completion */}
      <Guidance userName={userProfile.name} />
      <div className="flex-1 p-4 sm:p-6 lg:p-10 bg-gray-900 text-gray-100 overflow-y-auto">
        <div className="animate-fade-in">
          <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-out forwards;
            }
          `}</style>
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
};

export default Layout;