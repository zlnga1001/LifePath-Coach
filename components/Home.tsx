import React from 'react';
import { UserProfile } from '../types';
import { AppView } from '../App';
import { SparklesIcon, CheckIcon, LightBulbIcon, BotIcon } from './Icons';

interface HomeProps {
  userProfile: UserProfile;
  setActiveView: (view: AppView) => void;
}

const Home: React.FC<HomeProps> = ({ userProfile, setActiveView }) => {
  const quickAccessItems = [
    {
      id: 'resume-card',
      view: 'resume' as AppView,
      icon: SparklesIcon,
      title: 'Strengthen Your Resume',
      description: 'Use the AI mentor to find and fix weak points in your experience.',
      color: 'text-red-400',
    },
    {
      id: 'track-card',
      view: 'track' as AppView,
      icon: CheckIcon,
      title: 'View Your Career Track',
      description: 'Check your weekly tasks and stay on track towards your goals.',
      color: 'text-purple-400',
    },
    {
      id: 'analysis-card',
      view: 'analysis' as AppView,
      icon: LightBulbIcon,
      title: 'Analyze a Job Role',
      description: 'Compare your skills against a job description to find gaps.',
      color: 'text-purple-400',
    },
    {
      id: 'chat-card',
      view: 'chat' as AppView,
      icon: BotIcon,
      title: 'Chat with Your Mentor',
      description: 'Ask questions, get advice, and practice your responses.',
      color: 'text-red-400',
    },
  ];

  return (
    <div>
      <h2 className="text-4xl font-bold text-white">Welcome back, {userProfile.name.split(' ')[0]}!</h2>
      <p className="mt-2 text-lg text-gray-400">Ready to take the next step in your career? Here's what you can do:</p>
      
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickAccessItems.map((item) => (
          <div
            key={item.view}
            data-guidance={item.id}
            onClick={() => setActiveView(item.view)}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 cursor-pointer hover:border-purple-500 hover:bg-gray-700/50 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 p-3 rounded-full bg-gray-900`}>
                  <item.icon className={`h-7 w-7 ${item.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-gray-400 text-sm">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;