export interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  industry: string;
  experienceYears: string;
  bio: string;
  careSpecialties: string[];
  certifications: string[];
  availability: string;
  licensedState: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  updatedAt?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    userId: str(row.id),
    email: str(row.email),
    firstName: str(row.first_name),
    lastName: str(row.last_name),
    phone: str(row.phone),
    jobTitle: str(row.job_title),
    industry: str(row.industry),
    experienceYears: str(row.experience_years),
    bio: str(row.bio),
    careSpecialties: arr(row.care_specialties),
    certifications: arr(row.certifications),
    availability: str(row.availability),
    licensedState: str(row.licensed_state),
    linkedin: str(row.linkedin),
    github: str(row.github),
    portfolio: str(row.portfolio),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

const CAMEL_TO_SNAKE: Record<string, string> = {
  email: 'email', firstName: 'first_name', lastName: 'last_name', phone: 'phone',
  jobTitle: 'job_title', industry: 'industry', experienceYears: 'experience_years',
  bio: 'bio', careSpecialties: 'care_specialties', certifications: 'certifications',
  availability: 'availability', licensedState: 'licensed_state', linkedin: 'linkedin',
  github: 'github', portfolio: 'portfolio',
};

/** Build a snake_case row for upsert. Always sets id; omits undefined fields. */
export function profileToRow(p: Partial<UserProfile>, uid: string): Record<string, unknown> {
  const row: Record<string, unknown> = { id: uid };
  for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
    const value = (p as Record<string, unknown>)[camel];
    if (value !== undefined) row[snake] = value;
  }
  return row;
}
