import { describe, it, expect } from 'vitest';
import { rowToProfile, profileToRow } from '../profileMapping';

describe('profileMapping', () => {
  it('rowToProfile maps snake_case DB row to camelCase profile', () => {
    const p = rowToProfile({
      id: 'uid-1', email: 'a@b.com', first_name: 'Ann', last_name: 'Lee',
      phone: '', job_title: 'Nurse', industry: 'Health', experience_years: '5',
      bio: '', care_specialties: ['ICU'], certifications: [], availability: '',
      licensed_state: 'CA', linkedin: 'l', github: '', portfolio: '',
      updated_at: '2026-06-22T00:00:00Z',
    });
    expect(p.userId).toBe('uid-1');
    expect(p.firstName).toBe('Ann');
    expect(p.jobTitle).toBe('Nurse');
    expect(p.careSpecialties).toEqual(['ICU']);
    expect(p.licensedState).toBe('CA');
    expect(p.updatedAt).toBe('2026-06-22T00:00:00Z');
  });

  it('profileToRow maps camelCase updates to snake_case row keyed by uid', () => {
    const row = profileToRow({ firstName: 'Bob', careSpecialties: ['ER'] }, 'uid-2');
    expect(row.id).toBe('uid-2');
    expect(row.first_name).toBe('Bob');
    expect(row.care_specialties).toEqual(['ER']);
    expect('firstName' in row).toBe(false);
  });

  it('profileToRow omits undefined fields (no accidental nulling)', () => {
    const row = profileToRow({ bio: 'hi' }, 'uid-3');
    expect(row.bio).toBe('hi');
    expect('first_name' in row).toBe(false);
  });
});
