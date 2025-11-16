import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  existingProfile: UserProfile;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, existingProfile }) => {
  const [name, setName] = useState(existingProfile.name || '');
  const [goals, setGoals] = useState('');
  const [constraints, setConstraints] = useState('');

  useEffect(() => {
    setName(existingProfile.name || '');
  }, [existingProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && goals && constraints) {
      onComplete({ ...existingProfile, name, goals, constraints });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 shadow-2xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-white mb-2">Welcome, {name}!</h2>
      <p className="text-center text-gray-400 mb-8">Let's finish setting up your profile. This helps your AI mentor give you the best advice.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Your name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            placeholder="e.g., Alex Chen"
            required
          />
        </div>
        
        <div>
          <label htmlFor="goals" className="block text-sm font-medium text-gray-300 mb-2">What's your primary career goal right now?</label>
          <input
            type="text"
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            placeholder="e.g., Get my first software engineering internship"
            required
          />
        </div>

        <div>
          <label htmlFor="constraints" className="block text-sm font-medium text-gray-300 mb-2">What are your current constraints or challenges?</label>
          <input
            type="text"
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            placeholder="e.g., First-gen, low-income, working 20 hrs/week"
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!name || !goals || !constraints}
        >
          Meet Your Mentor
        </button>
      </form>
    </div>
  );
};

export default Onboarding;