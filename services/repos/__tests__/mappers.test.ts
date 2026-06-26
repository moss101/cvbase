import { describe, it, expect } from 'vitest';
import { rowToResume, resumeToRow, rowToJob, jobToRow, rowToSubscription, rowToVersion, versionToRow } from '../mappers';
import type { ResumeData, ResumeSettings } from '../../../types';

describe('repo mappers', () => {
  it('rowToResume parses jsonb columns into typed shapes', () => {
    const r = rowToResume({
      id: 'r1', title: 'Dev CV', data: { skills: ['ts'] }, settings: { fontSize: 'medium' },
      template_id: 'harvard', visible_sections: ['contact', 'summary'], is_primary: true,
    });
    expect(r.id).toBe('r1');
    expect(r.templateId).toBe('harvard');
    expect(r.visibleSections).toEqual(['contact', 'summary']);
    expect(r.isPrimary).toBe(true);
    expect((r.data as { skills: string[] }).skills).toEqual(['ts']);
  });
  it('resumeToRow keys by user_id and serializes camelCase fields to columns', () => {
    const row = resumeToRow({
      title: 'X', templateId: 'teal', visibleSections: ['skills'],
      data: {} as ResumeData, settings: {} as ResumeSettings, isPrimary: true,
    }, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.template_id).toBe('teal');
    expect(row.visible_sections).toEqual(['skills']);
    expect(row.is_primary).toBe(true);
  });
  it('rowToJob maps role/url/match_score to JobApplication', () => {
    const j = rowToJob({ id: 'j1', company: 'Acme', role: 'RN', status: 'applied', url: 'http://x', match_score: 80, date_applied: '2026-06-01' });
    expect(j.jobTitle).toBe('RN');
    expect(j.jobUrl).toBe('http://x');
    expect(j.matchScore).toBe(80);
    expect(j.dateApplied).toBe('2026-06-01');
  });
  it('jobToRow maps JobApplication back to columns keyed by user_id', () => {
    const row = jobToRow({ id: 'j1', jobTitle: 'RN', company: 'Acme', status: 'offer', jobUrl: 'u', matchScore: 5 }, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.role).toBe('RN');
    expect(row.url).toBe('u');
    expect(row.match_score).toBe(5);
  });
  it('rowToSubscription returns null for no row', () => {
    expect(rowToSubscription(null)).toBeNull();
  });
  it('rowToVersion parses a version row and its jsonb data', () => {
    const v = rowToVersion({ id: 'v1', resume_id: 'r1', label: 'Before tailoring', data: { skills: ['go'] }, created_at: '2026-06-26T00:00:00Z' });
    expect(v.id).toBe('v1');
    expect(v.resumeId).toBe('r1');
    expect(v.label).toBe('Before tailoring');
    expect(v.createdAt).toBe('2026-06-26T00:00:00Z');
    expect((v.data as { skills: string[] }).skills).toEqual(['go']);
  });
  it('versionToRow serializes resumeId->resume_id keyed by user_id', () => {
    const row = versionToRow({ resumeId: 'r1', label: 'v1', data: {} as ResumeData }, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.resume_id).toBe('r1');
    expect(row.label).toBe('v1');
    expect('id' in row).toBe(false);
  });
});
