import React, { useState, useMemo } from 'react';
import { CareerTask } from '../types';
import { CheckIcon } from './Icons';


const CareerTrack: React.FC = () => {
    const initialTasks: CareerTask[] = [
        { id: 1, text: 'Finalize resume with Mentor', completed: true },
        { id: 2, text: 'Create/Update LinkedIn Profile', completed: false },
        { id: 3, text: 'Build one portfolio project', completed: false },
        { id: 4, text: 'Apply to 3 roles with tailored bullets', completed: false },
        { id: 5, text: 'Practice mock interview questions', completed: false },
    ];
    const [tasks, setTasks] = useState(initialTasks);

    const toggleTask = (id: number) => {
        setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };

    const completedTasks = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
    const progressPercentage = (completedTasks / tasks.length) * 100;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
                <CheckIcon className="h-8 w-8 text-purple-400" />
                <h2 className="text-3xl font-bold text-white">Your Career Track</h2>
            </div>
            <p className="text-gray-400 mb-8">This is your personalized roadmap. Complete these tasks to move closer to your career goals.</p>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-2">First Internship Progress</h3>
                <p className="text-sm text-gray-400 mb-4">{completedTasks} of {tasks.length} tasks completed.</p>
                
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-8">
                    <div className="bg-gradient-to-r from-red-500 to-purple-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
                </div>
                
                <div className="relative pl-4">
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-600" style={{ transform: 'translateX(11.5px)' }}></div>
                    <ul className="space-y-6">
                        {tasks.map((task) => (
                            <li key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center cursor-pointer group relative">
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-all ${task.completed ? 'bg-gradient-to-r from-red-500 to-purple-600' : 'bg-gray-600 group-hover:bg-gray-400'}`}>
                                    {task.completed && <CheckIcon className="h-4 w-4 text-white" />}
                                </div>
                                <span className={`ml-8 transition-colors text-lg ${task.completed ? 'text-gray-400 line-through' : 'text-gray-200 group-hover:text-white'}`}>{task.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                                <div className="mt-8 border-t border-gray-700 pt-6">
                                    <h3 className="text-xl font-bold text-white mb-3">Recommended Roadmaps & Resources</h3>
                                    <p className="text-sm text-gray-400 mb-4">Curated links from roadmap.sh and complementary resources to help you choose and follow a career track. Open any link in a new tab.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-700 p-4 rounded-md">
                                            <h4 className="text-sm font-semibold text-white">Software Engineer</h4>
                                            <p className="text-xs text-gray-300 mb-2">Comprehensive front/backend paths.</p>
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://roadmap.sh/frontend" target="_blank" rel="noreferrer">Frontend Roadmap — roadmap.sh</a>
                                            <br />
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://roadmap.sh/backend" target="_blank" rel="noreferrer">Backend Roadmap — roadmap.sh</a>
                                        </div>

                                        <div className="bg-gray-700 p-4 rounded-md">
                                            <h4 className="text-sm font-semibold text-white">Data Science</h4>
                                            <p className="text-xs text-gray-300 mb-2">Path to machine learning and analytics.</p>
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://roadmap.sh/data-science" target="_blank" rel="noreferrer">Data Science Roadmap — roadmap.sh</a>
                                            <br />
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://www.kaggle.com/learn/overview" target="_blank" rel="noreferrer">Kaggle Learn — practical DS projects</a>
                                        </div>

                                        <div className="bg-gray-700 p-4 rounded-md">
                                            <h4 className="text-sm font-semibold text-white">Trading & Quant</h4>
                                            <p className="text-xs text-gray-300 mb-2">Algorithmic trading & quantitative paths.</p>
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://roadmap.sh/quant" target="_blank" rel="noreferrer">Quant/Trading Roadmap — roadmap.sh</a>
                                            <br />
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://www.quantstart.com/" target="_blank" rel="noreferrer">QuantStart — quant tutorials & guides</a>
                                        </div>

                                        <div className="bg-gray-700 p-4 rounded-md">
                                            <h4 className="text-sm font-semibold text-white">Financial Knowledge & Excel</h4>
                                            <p className="text-xs text-gray-300 mb-2">Finance fundamentals and Excel skills.</p>
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://roadmap.sh/finance" target="_blank" rel="noreferrer">Finance Roadmap — roadmap.sh</a>
                                            <br />
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://support.microsoft.com/excel" target="_blank" rel="noreferrer">Microsoft Excel Docs</a>
                                            <br />
                                            <a className="text-sm text-indigo-300 hover:underline" href="https://exceljet.net/" target="_blank" rel="noreferrer">ExcelJet — formulas & tips</a>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-xs text-gray-400">
                                        <div>More roadmaps: <a className="text-indigo-300 hover:underline" href="https://roadmap.sh/roadmaps" target="_blank" rel="noreferrer">All Roadmaps — roadmap.sh</a></div>
                                    </div>
                                </div>
            </div>
        </div>
    );
};

export default CareerTrack;