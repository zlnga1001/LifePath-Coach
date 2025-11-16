import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, ChatMessage, ResumeData } from '../types';
import { getChatResponse } from '../services/geminiService';
import { SendIcon, UserIcon, BotIcon, MicrophoneIcon } from './Icons';

// Fix: Add type definitions for Web Speech API to resolve TypeScript errors.
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}

interface MentorChatProps {
    userProfile: UserProfile;
    resumeData: ResumeData | null;
}

// Check for SpeechRecognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = SpeechRecognition != null;

const MentorChat: React.FC<MentorChatProps> = ({ userProfile, resumeData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: `Hi ${userProfile.name}! I'm your LifePath mentor. How can I help you today? You can ask me for feedback on your resume, help with cover letters, or anything else career-related.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Fix: Correctly type the recognitionRef.
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (!isSpeechRecognitionSupported) {
            console.warn("Speech recognition is not supported in this browser.");
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setInput(finalTranscript + interimTranscript);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        return () => {
            if (recognitionRef.current) {
               recognitionRef.current.stop();
            }
        };
    }, []);

    const handleToggleRecording = () => {
        // Fix: Add null check for recognitionRef.current to prevent runtime errors.
        if (!isSpeechRecognitionSupported || !recognitionRef.current) return;
        
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
        setIsRecording(!isRecording);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const response = await getChatResponse(newMessages, userProfile, resumeData, input);
        
        setMessages(prev => [...prev, { role: 'model', content: response }]);
        setIsLoading(false);
    }, [input, messages, userProfile, resumeData]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isLoading) {
        handleSend();
      }
    };

    return (
        <div className="h-[calc(100vh-5rem)] bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <BotIcon className="h-8 w-8 text-red-400" />
                    <h2 className="text-3xl font-bold text-white">Mentor Chat</h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center"><BotIcon className="h-5 w-5 text-white" /></div>}
                        <div className={`max-w-xl p-3 rounded-xl ${msg.role === 'user' ? 'bg-gradient-to-r from-red-500 to-purple-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                         {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center"><UserIcon className="h-5 w-5 text-white" /></div>}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center"><BotIcon className="h-5 w-5 text-white" /></div>
                        <div className="max-w-md p-3 rounded-lg bg-gray-700 text-gray-200 flex items-center space-x-2">
                           <span className="sr-only">Loading...</span>
                           <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                           <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                           <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center bg-gray-700 rounded-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isRecording ? "Listening..." : "Ask your mentor anything..."}
                        className="flex-1 bg-transparent p-3 text-white placeholder-gray-400 focus:outline-none"
                        disabled={isLoading}
                    />
                     {isSpeechRecognitionSupported && (
                        <button onClick={handleToggleRecording} className={`p-3 transition-colors ${isRecording ? 'text-red-500' : 'text-gray-400 hover:text-purple-400'}`}>
                            <MicrophoneIcon className="h-6 w-6"/>
                        </button>
                    )}
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 text-gray-400 hover:text-purple-400 disabled:text-gray-600 disabled:cursor-not-allowed">
                        <SendIcon className="h-6 w-6"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MentorChat;