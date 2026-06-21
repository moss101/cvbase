
import type { ResumeData, SectionId } from './types';

// Default visible sections. Optional sections are managed via 'customize'
export const NAV_SECTIONS: { id: SectionId; name: string; optional?: boolean }[] = [
    { id: 'contact', name: 'Contact Details' },
    { id: 'summary', name: 'Professional Summary' },
    { id: 'experience', name: 'Experience' },
    { id: 'education', name: 'Education' },
    { id: 'skills', name: 'Skills' },
    // Optional Sections
    { id: 'projects', name: 'Projects', optional: true },
    { id: 'certifications', name: 'Certifications', optional: true },
    { id: 'languages', name: 'Languages', optional: true },
    { id: 'awards', name: 'Awards', optional: true },
    { id: 'trainings', name: 'Trainings', optional: true },
    { id: 'publications', name: 'Publications', optional: true },
    { id: 'volunteer', name: 'Volunteering', optional: true },
    { id: 'custom', name: 'Custom Section', optional: true },
    
    { id: 'customize', name: 'Customize' },
    { id: 'finalize', name: 'Finalize & Download' },
];

export const INITIAL_STATE: ResumeData = {
    contact: {
        firstName: '',
        lastName: '',
        jobTitle: '',
        phone: '',
        phoneCountryCode: '+1',
        email: '',
        address: '',
        country: '',
        city: '',
        customCity: '',
        linkedin: '',
        website: '',
        photo: ''
    },
    summary: {
        professionalSummary: ''
    },
    experience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    awards: [],
    trainings: [],
    publications: [],
    volunteer: [],
    custom: [],
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'],
};

export const NEW_EXPERIENCE_ITEM = {
    id: '',
    jobTitle: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    description: ''
};

export const NEW_PROJECT_ITEM = {
    id: '',
    name: '',
    technologies: '',
    link: '',
    startDate: '',
    endDate: '',
    description: ''
};

export const NEW_EDUCATION_ITEM = {
    id: '',
    school: '',
    degree: '',
    location: '',
    startDate: '',
    endDate: '',
    description: ''
};

export const NEW_CERTIFICATION_ITEM = {
    id: '',
    name: '',
    number: '',
    expiryDate: '',
    description: ''
};

export const NEW_LANGUAGE_ITEM = {
    id: '',
    language: '',
    proficiency: 'Conversational'
};

export const NEW_AWARD_ITEM = {
    id: '',
    title: '',
    issuer: '',
    date: '',
    description: ''
};

export const NEW_TRAINING_ITEM = {
    id: '',
    course: '',
    institution: '',
    date: '',
    description: ''
};

export const NEW_PUBLICATION_ITEM = {
    id: '',
    title: '',
    publisher: '',
    date: '',
    link: '',
    description: ''
};

export const NEW_VOLUNTEER_ITEM = {
    id: '',
    organization: '',
    role: '',
    startDate: '',
    endDate: '',
    location: '',
    description: ''
};

export const NEW_CUSTOM_ITEM = {
    id: '',
    title: '',
    subtitle: '',
    date: '',
    description: ''
};

export const AVAILABLE_TEMPLATES = [
    { id: 'gsb-executive', name: 'GSB Executive', category: 'Executive' },
    { id: 'ivy-elite', name: 'Ivy Elite', category: 'Executive' },
    { id: 'vanguard-classic', name: 'Vanguard Classic', category: 'Executive' },
    { id: 'eecs-mit', name: 'MIT EECS', category: 'Technical' },
    { id: 'cal-berkeley', name: 'Berkeley Golden Gate', category: 'Technical' },
    { id: 'lambda-tech', name: 'Lambda Technical', category: 'Technical' },
    { id: 'stanford-dschool', name: 'Stanford D-School', category: 'Innovative' },
    { id: 'synergy-startup', name: 'Synergy Startup', category: 'Innovative' },
    { id: 'minimalist-edge', name: 'Minimalist Edge', category: 'Innovative' },
    { id: 'classic', name: 'Classic', category: 'ATS' },
    { id: 'clean', name: 'Clean', category: 'ATS' },
    { id: 'compact', name: 'Compact', category: 'ATS' },
    { id: 'simple', name: 'Simple', category: 'ATS' },
    { id: 'functional', name: 'Functional', category: 'ATS' },
    { id: 'direct', name: 'Direct', category: 'ATS' },
    { id: 'global', name: 'Global', category: 'ATS' },
    { id: 'berlin', name: 'Berlin', category: 'Professional' },
    { id: 'berlin-ii', name: 'Berlin II', category: 'Professional' },
    { id: 'urban', name: 'Urban', category: 'Modern' },
    { id: 'cobalt', name: 'Cobalt', category: 'Professional' },
    { id: 'designer', name: 'Designer', category: 'Modern' },
    { id: 'golden', name: 'Golden', category: 'Professional' },
    { id: 'oak', name: 'Oak', category: 'Creative' },
    { id: 'leafy', name: 'Leafy', category: 'Creative' },
    { id: 'redwood', name: 'Redwood', category: 'Professional' },
    { id: 'amsterdam', name: 'Amsterdam', category: 'Professional' },
    { id: 'melbourne', name: 'Melbourne', category: 'Modern' },
    { id: 'minimalist', name: 'Minimalist', category: 'ATS' },
    { id: 'impact', name: 'Impact', category: 'ATS' },
    { id: 'glitch', name: 'Glitch', category: 'Creative' },
    { id: 'vogue', name: 'Vogue', category: 'Creative' },
    { id: 'onyx', name: 'Onyx', category: 'Modern' },
    { id: 'bloom', name: 'Bloom', category: 'Creative' },
    { id: 'timeline', name: 'Timeline', category: 'Modern' },
    { id: 'default', name: 'Standard', category: 'ATS' },
    { id: 'teal', name: 'Teal', category: 'Modern' },
    { id: 'professional', name: 'Professional', category: 'Professional' },
    { id: 'creative', name: 'Creative', category: 'Creative' },
    { id: 'executive', name: 'Executive', category: 'Professional' },
    { id: 'corporate', name: 'Corporate', category: 'Professional' },
    { id: 'modern', name: 'Modern', category: 'Modern' },
    { id: 'professional-v2', name: 'Professional II', category: 'Professional' },
    { id: 'creative-v2', name: 'Creative II', category: 'Creative' },
    { id: 'executive-v2', name: 'Executive II', category: 'Professional' },
    { id: 'corporate-v2', name: 'Corporate II', category: 'Professional' },
    { id: 'tech', name: 'Tech', category: 'Modern' },
    { id: 'tech-v2', name: 'Tech II', category: 'Modern' },
    { id: 'tech-blue', name: 'Tech Blue', category: 'Professional' },
    { id: 'tec-ats', name: 'TecATS', category: 'Professional' },
    { id: 'escobar', name: 'Escobar', category: 'Professional' },
    { id: 'modern-ii', name: 'Modern II', category: 'Modern' },
    { id: 'harvard', name: 'Harvard', category: 'Academic' },
    { id: 'midnight', name: 'Midnight', category: 'Modern' },
    { id: 'swiss', name: 'Swiss', category: 'Modern' },
    { id: 'erasmus', name: 'Erasmus', category: 'Academic' },
    { id: 'kyoto', name: 'Kyoto Zen', category: 'Creative' },
    { id: 'neomemphis', name: 'Neo-Memphis', category: 'Creative' },
    { id: 'nordic', name: 'Nordic Forest', category: 'Professional' },
    { id: 'metropolitan', name: 'Metropolitan Luxe', category: 'Professional' },
    { id: 'cybergrid', name: 'Cyber Grid', category: 'Modern' },
    { id: 'tokyo', name: 'Tokyo Clean', category: 'ATS' },
    { id: 'barcelona', name: 'Barcelona Warm', category: 'Creative' },
    { id: 'subway', name: 'Transit Grid', category: 'Modern' },
    { id: 'monaco', name: 'Monaco Grand', category: 'Professional' },
    { id: 'austin', name: 'Austin Tech', category: 'Modern' },
    { id: 'oxford', name: 'Oxford Academic', category: 'Academic' },
    { id: 'vancouver', name: 'Vancouver Forest', category: 'Modern' },
    { id: 'chicago', name: 'Chicago Bold', category: 'Professional' },
    { id: 'reykjavik', name: 'Reykjavik Ice', category: 'Modern' },
    { id: 'berlin-v3', name: 'Berlin Mono', category: 'ATS' },
    { id: 'milan', name: 'Milan Editorial', category: 'Professional' },
    { id: 'silicon', name: 'Silicon Valley', category: 'ATS' },
    { id: 'geneva', name: 'Geneva Corporate', category: 'ATS' },
    { id: 'sao-paulo', name: 'Sao Paulo Solar', category: 'Creative' },
    { id: 'casablanca', name: 'Casablanca Sand', category: 'Professional' },
];