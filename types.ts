export interface UserProfile {
  name: string;
  email: string;
  goals: string;
  constraints: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface CareerTask {
  id: number;
  text: string;
  completed: boolean;
}

export interface SkillGapResource {
  name: string;
  url: string;
}

export interface MissingSkill {
  skill: string;
  reason: string;
  resources: SkillGapResource[];
}

export interface SkillGapReport {
  matchingSkills: string[];
  missingSkills: MissingSkill[];
  summary: string;
}

// New interfaces for structured resume data
export interface Education {
  institution: string;
  degree: string;
  date: string;
}

export interface Experience {
  role: string;
  company: string;
  date: string;
  bullets: string[];
}

export interface Project {
  name: string;
  description: string;
  bullets: string[];
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  summary: string;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: SkillCategory[];
}

export type TonePreference = 'professional' | 'enthusiastic' | 'conversational' | 'confident' | 'creative' | 'team-oriented';

export interface JobApplication {
  id: string;
  applicationName: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  tonePreference: TonePreference;
  createdAt: string;
  updatedAt: string;
  generatedResume?: ResumeData | null;
  generatedCoverLetter?: string | null;
  conversationHistory: ChatMessage[];
}