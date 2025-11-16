import React from 'react';
import { AppView } from '../App';
import { UserProfile } from '../types';
import { LogoIcon, HomeIcon, SparklesIcon, CheckIcon, LightBulbIcon, BotIcon, UserIcon } from './Icons';

interface SidebarProps {
  userProfile: UserProfile;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userProfile, activeView, setActiveView, onLogout }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'resume', label: 'Resume Mentor', icon: SparklesIcon },
    { id: 'applications', label: 'Applications', icon: CheckIcon },
    { id: 'track', label: 'Career Track', icon: CheckIcon },
    { id: 'analysis', label: 'Skill Analysis', icon: LightBulbIcon },
    { id: 'chat', label: 'Mentor Chat', icon: BotIcon },
  ];

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4">
      <div className="flex items-center gap-3 mb-10 px-2">
        <LogoIcon className="h-8 w-8 text-purple-400" />
        <h1 className="text-xl font-bold text-white tracking-tight">LifePath</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            data-guidance={`sidebar-${item.id}`}
            onClick={() => setActiveView(item.id as AppView)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              activeView === item.id
                ? 'bg-gradient-to-r from-red-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="mt-auto">
        <div className="px-3 py-2.5 border-t border-gray-700">
             <div className="flex items-center gap-3 mb-4 mt-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white truncate">{userProfile.name}</p>
                    <p className="text-xs text-gray-400 truncate">{userProfile.email}</p>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition"
            >
                Logout
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;