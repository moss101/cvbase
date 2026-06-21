
export type SectionId = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'languages' | 'awards' | 'trainings' | 'publications' | 'volunteer' | 'custom' | 'customize' | 'finalize';
export type TemplateId = 'gsb-executive' | 'ivy-elite' | 'vanguard-classic' | 'eecs-mit' | 'cal-berkeley' | 'lambda-tech' | 'stanford-dschool' | 'synergy-startup' | 'minimalist-edge' | 'default' | 'teal' | 'professional' | 'creative' | 'executive' | 'corporate' | 'modern' | 'professional-v2' | 'creative-v2' | 'executive-v2' | 'corporate-v2' | 'tech' | 'tech-v2' | 'harvard' | 'midnight' | 'swiss' | 'erasmus' | 'minimalist' | 'impact' | 'glitch' | 'vogue' | 'onyx' | 'bloom' | 'timeline' | 'amsterdam' | 'melbourne' | 'oak' | 'leafy' | 'redwood' | 'designer' | 'golden' | 'cobalt' | 'berlin' | 'berlin-ii' | 'urban' | 'classic' | 'clean' | 'compact' | 'simple' | 'functional' | 'direct' | 'global' | 'tech-blue' | 'tec-ats' | 'escobar' | 'modern-ii' | 'kyoto' | 'neomemphis' | 'nordic' | 'metropolitan' | 'cybergrid' | 'tokyo' | 'barcelona' | 'subway' | 'monaco' | 'austin' | 'oxford' | 'vancouver' | 'chicago' | 'reykjavik' | 'berlin-v3' | 'milan' | 'silicon' | 'geneva' | 'sao-paulo' | 'casablanca';

export interface Contact {
    firstName: string;
    lastName: string;
    jobTitle: string;
    phone: string;
    phoneCountryCode: string;
    email: string;
    address: string;
    country: string;
    city: string;
    customCity: string;
    linkedin: string;
    website: string;
    photo: string;
}

export interface Summary {
    professionalSummary: string;
}

export interface Experience {
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface Project {
    id: string;
    name: string;
    technologies: string;
    link: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface Education {
    id:string;
    school: string;
    degree: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface Certification {
    id: string;
    name: string;
    number: string;
    expiryDate: string;
    description: string;
}

export interface Language {
    id: string;
    language: string;
    proficiency: string;
}

export interface Award {
    id: string;
    title: string;
    issuer: string;
    date: string;
    description: string;
}

export interface Training {
    id: string;
    course: string;
    institution: string;
    date: string;
    description: string;
}

export interface Publication {
    id: string;
    title: string;
    publisher: string;
    date: string;
    link: string;
    description: string;
}

export interface Volunteer {
    id: string;
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string;
}

export interface CustomSection {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    description: string;
}

export interface ResumeData {
    contact: Contact;
    summary: Summary;
    experience: Experience[];
    projects: Project[];
    education: Education[];
    skills: string[];
    certifications: Certification[];
    languages: Language[];
    awards: Award[];
    trainings: Training[];
    publications: Publication[];
    volunteer: Volunteer[];
    custom: CustomSection[];
    sectionOrder?: string[];
}

export interface ResumeSettings {
    themeColor: string;
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: string;
}

export interface ResumePreviewProps {
    formData: ResumeData;
    isCardPreview: boolean;
    visibleSections: SectionId[];
    settings: ResumeSettings;
}

// AI Analysis Types
export interface AIExperienceSuggestion {
    id: string;
    jobTitle: string;
    company: string;
    atsAnalysis: string;
    improvedDescription: string;
}

export interface AIAnalysisResult {
    summarySuggestion?: string;
    experienceSuggestions?: AIExperienceSuggestion[];
    missingKeywords?: string[];
}

export interface AISuggestion {
    original: string;
    suggestion: string;
}

export interface AtsCheck {
    pass: boolean;
    feedback: string;
}

export interface AtsAnalysisResult {
    overallScore: number;
    checks: {
        contactInfo: AtsCheck;
        keywords: AtsCheck;
        sectionHeaders: AtsCheck;
        bulletPoints: AtsCheck;
        fileFormat: AtsCheck;
    };
}
// =========================================================================
// Subscription & Billing
// =========================================================================

export type PlanId = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';

export interface PlanLimits {
    resumes: number;            // -1 = unlimited
    atsScansPerMonth: number;   // -1 = unlimited
    aiActionsPerMonth: number;  // -1 = unlimited
    templates: 'basic' | 'all';
    liveAtsRescore: boolean;
    smartStudio: boolean;
    aiHeadshot: boolean;
    prioritySupport: boolean;
    watermarkFree: boolean;
}

export interface Plan {
    id: PlanId;
    name: string;
    tagline: string;
    monthlyPrice: number;   // USD per month
    yearlyPrice: number;    // USD per month, billed yearly
    badge?: string;
    highlight?: boolean;
    features: string[];
    limits: PlanLimits;
}

export interface PaymentMethod {
    id: string;
    brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'card';
    last4: string;
    expMonth: number;
    expYear: number;
    holder: string;
    isDefault: boolean;
    addedAt: string;
}

export type InvoiceStatus = 'paid' | 'refunded' | 'failed';

export interface Invoice {
    id: string;
    number: string;
    date: string;           // ISO
    description: string;
    planId: PlanId;
    cycle: BillingCycle;
    subtotal: number;
    discount: number;
    creditApplied: number;
    total: number;
    currency: 'USD';
    status: InvoiceStatus;
    cardBrand?: string;
    cardLast4?: string;
    promoCode?: string;
}

export interface Subscription {
    planId: PlanId;
    cycle: BillingCycle;
    status: SubscriptionStatus;
    currentPeriodStart: string;     // ISO
    currentPeriodEnd: string;       // ISO
    cancelAtPeriodEnd: boolean;
    /** When a downgrade is scheduled, it takes effect at period end. */
    pendingPlanId?: PlanId;
    pendingCycle?: BillingCycle;
    defaultPaymentMethodId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UsageCounters {
    /** Calendar month key, e.g. "2026-06" — counters reset when it changes. */
    month: string;
    atsScans: number;
    aiActions: number;
}

export interface BillingState {
    subscription: Subscription;
    paymentMethods: PaymentMethod[];
    invoices: Invoice[];
    usage: UsageCounters;
    /** Unused balance (USD) from proration credits applied to future charges. */
    creditBalance: number;
}

// Job Application Tracking
export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface JobApplication {
    id: string;
    jobTitle: string;
    company: string;
    jobUrl?: string;
    status: JobStatus;
    dateApplied?: string;
    notes?: string;
    matchScore?: number;
}

// Match Report
export interface MatchReport {
    score: number;
    missingKeywords: string[];
    matchingKeywords: string[];
    hardSkillsMatch: string[];
    softSkillsMatch: string[];
    feedback: string[];
    jobDescription: string;
    dateScanned: string;
}