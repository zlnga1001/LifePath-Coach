import React, { useState } from 'react';

interface AuthProps {
    onAuthSuccess: (email: string, name: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isLogin) {
            // Simulated login
            if (email && password) {
                // In a real app, you'd verify credentials against a backend.
                // For this demo, we'll assume any login is for a user named "Jane"
                // to show how the app would pick up an existing profile.
                onAuthSuccess(email, 'Jane Doe');
            } else {
                setError('Please enter both email and password.');
            }
        } else {
            // Simulated sign-up
            if (email && password && name) {
                // In a real app, you'd create a new user.
                onAuthSuccess(email, name);
            } else {
                setError('Please fill in all fields.');
            }
        }
    };

    return (
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 shadow-2xl animate-fade-in">
            <h2 className="text-3xl font-bold text-center text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
            <p className="text-center text-gray-400 mb-8">{isLogin ? 'Sign in to access your career path.' : 'Get started with your personalized AI mentor.'}</p>
            
            {error && <p className="text-red-400 text-center mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            placeholder="e.g., Alex Chen"
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                        placeholder="you@example.com"
                    />
                </div>
                
                <div>
                    <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-purple-400 hover:underline">
                    {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
};

export default Auth;