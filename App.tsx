import React, { useState, useEffect } from 'react';
import { UserProfile, ResumeData } from './types';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import Layout from './components/Layout';
import { LogoIcon } from './components/Icons';

export type AppView = 'home' | 'resume' | 'track' | 'analysis' | 'chat' | 'applications';

const App: React.FC = () => {
  // Check localStorage for persisted user data
  const getInitialState = () => {
    const storedUser = localStorage.getItem('lifePathUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return { 
          isAuthenticated: parsed.isAuthenticated || false, 
          profile: parsed.profile || null,
          resumeData: parsed.resumeData || null
        };
      } catch (e) {
        return { isAuthenticated: false, profile: null, resumeData: null };
      }
    }
    return { isAuthenticated: false, profile: null, resumeData: null };
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialState().isAuthenticated);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialState().profile);
  const [resumeData, setResumeData] = useState<ResumeData | null>(getInitialState().resumeData);
  const [activeView, setActiveView] = useState<AppView>('home');

  useEffect(() => {
    // Persist user state to localStorage whenever it changes
    const userState = JSON.stringify({ isAuthenticated, profile: userProfile, resumeData });
    localStorage.setItem('lifePathUser', userState);
  }, [isAuthenticated, userProfile, resumeData]);

  const handleAuthSuccess = (email: string, name: string) => {
    setIsAuthenticated(true);
    // If there's no profile, set a temporary one to trigger onboarding
    if (!userProfile) {
        setUserProfile({ name, email, goals: '', constraints: '' });
    }
    setActiveView('home');
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveView('home');
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setResumeData(null); // Clear resume data on logout
    localStorage.removeItem('lifePathUser');
  };
  
  const hasCompletedOnboarding = userProfile && userProfile.goals && userProfile.constraints;

  const renderContent = () => {
    if (!isAuthenticated) {
      return <Auth onAuthSuccess={handleAuthSuccess} />;
    }
    if (!hasCompletedOnboarding) {
      return <Onboarding onComplete={handleOnboardingComplete} existingProfile={userProfile!} />;
    }
    return (
      <Layout
        userProfile={userProfile!}
        activeView={activeView}
        setActiveView={setActiveView}
        resumeData={resumeData}
        setResumeData={setResumeData}
        onLogout={handleLogout}
      />
    );
  };
  
  return (
    <div className={`min-h-screen ${isAuthenticated && hasCompletedOnboarding ? 'bg-gray-800' : 'bg-gray-900'}`}>
       {!isAuthenticated && (
         <header className="flex items-center gap-3 p-4 sm:p-6 lg:p-8">
            <LogoIcon className="h-8 w-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">LifePath Coach</h1>
        </header>
       )}
      <main className={`${!isAuthenticated ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;