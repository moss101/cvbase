import { describe, expect, it } from 'vitest';
import { analysis, application, campaign, fact, goal, interview, opportunity } from '../../../services/careerOs/__tests__/fixtures';
import { activeApplications, currentCv, nextDeadline, priorityOpportunity, progressCounts, upcomingInterviews } from '../today/commandCenter';
import type { TodayData } from '../today/useTodayData';

const NOW = new Date('2026-09-23T09:00:00.000Z');
const base = (o: Partial<TodayData> = {}): TodayData => ({
    goal: null, facts: [], opportunities: [], applications: [], interviews: [], analyses: [], outcomes: [], campaigns: [], events: [],
    resumes: [], prismRuns: [], actions: [], insights: [], failed: [], isEmptyAccount: false, loadedAt: NOW.toISOString(), ...o,
});
const req = (id: string) => ({ requirementId: id, text: id, factIds: [] }) as never;

describe('Today command center derivations', () => {
    it('counts each stage from records and names the blockers', () => {
        const data = base({
            goal: goal({ id: 'g1' }),
            facts: [fact({ id: 'f1' }), fact({ id: 'f2', reviewState: 'candidate', confirmationState: 'inferred' })],
            opportunities: [opportunity({ id: 'o1', status: 'saved', createdAt: '2026-09-20T00:00:00.000Z' }), opportunity({ id: 'o2', status: 'watching', createdAt: '2026-08-01T00:00:00.000Z' }), opportunity({ id: 'o3', status: 'archived' })],
            applications: [
                application({ id: 'a1', stage: 'preparing', currentResumeId: null }),
                application({ id: 'a2', stage: 'submitted' }),
                application({ id: 'a3', stage: 'interview' }),
                application({ id: 'a4', stage: 'saved' }),
                application({ id: 'a5', stage: 'closed', closedReason: 'accepted' }),
            ],
            interviews: [interview({ id: 'i1', applicationId: 'a3', status: 'planned', scheduledAt: '2026-09-25T08:30:00.000Z', themes: [{ id: 't', theme: 'x', covered: false }] as never })],
        });
        const c = progressCounts(data, NOW);
        expect(c).toMatchObject({ goalSet: true, factsConfirmed: 1, factsTotal: 2, factsToReview: 1, opportunities: 2, opportunitiesNewThisWeek: 1 });
        expect(c).toMatchObject({ applicationsActive: 3, applicationsPreparing: 1, applicationsSubmitted: 1, applicationsNeedingCv: 1 });
        expect(c).toMatchObject({ interviewsUpcoming: 1, interviewsUnprepared: 1, offers: 1, accepted: 1 });
    });

    it('orders upcoming interviews soonest first, drops past and cancelled ones, keeps undated last', () => {
        const data = base({
            applications: [application({ id: 'a1' })],
            interviews: [
                interview({ id: 'late', applicationId: 'a1', status: 'planned', scheduledAt: '2026-10-01T09:00:00.000Z' }),
                interview({ id: 'undated', applicationId: 'a1', status: 'planned', scheduledAt: null }),
                interview({ id: 'soon', applicationId: 'a1', status: 'prepared', scheduledAt: '2026-09-24T09:00:00.000Z' }),
                interview({ id: 'past', applicationId: 'a1', status: 'planned', scheduledAt: '2026-09-01T09:00:00.000Z' }),
                interview({ id: 'cancelled', applicationId: 'a1', status: 'cancelled', scheduledAt: '2026-09-24T10:00:00.000Z' }),
            ],
        });
        expect(upcomingInterviews(data, NOW).map((u) => u.session.id)).toEqual(['soon', 'late', 'undated']);
        expect(upcomingInterviews(data, NOW)[0].application?.id).toBe('a1');
    });

    it('picks the saved opportunity with the best confirmed-evidence fit that has no application yet', () => {
        const data = base({
            opportunities: [
                opportunity({ id: 'weak', status: 'saved', createdAt: '2026-09-22T00:00:00.000Z' }),
                opportunity({ id: 'strong', status: 'saved', createdAt: '2026-09-01T00:00:00.000Z' }),
                opportunity({ id: 'applied', status: 'saved' }),
                opportunity({ id: 'watching', status: 'watching' }),
            ],
            applications: [application({ id: 'a1', opportunityId: 'applied', stage: 'preparing' })],
            analyses: [
                analysis({ opportunityId: 'weak', stale: false, qualification: { supported: [req('a')], partial: [], missing: [req('b'), req('c')], unknown: [] } }),
                analysis({ opportunityId: 'strong', stale: false, qualification: { supported: [req('a'), req('b')], partial: [], missing: [req('c')], unknown: [] } }),
            ],
        });
        expect(priorityOpportunity(data)?.id).toBe('strong');
        expect(priorityOpportunity(base({ opportunities: [opportunity({ id: 'w', status: 'watching' })] }))).toBeNull();
    });

    it('finds the next dated commitment across interviews, follow-ups and milestones', () => {
        const data = base({
            applications: [application({ id: 'a1', stage: 'submitted', followUpAt: '2026-09-26', jobTitle: 'PM', company: 'Acme' })],
            interviews: [interview({ id: 'i1', applicationId: 'a1', status: 'planned', scheduledAt: '2026-09-28T09:00:00.000Z', timeZone: 'Europe/Berlin' })],
            campaigns: [{ campaign: campaign({ id: 'c1', name: 'Autumn', milestones: [{ id: 'm1', title: 'Shortlist', state: 'todo', dueDate: '2026-09-24' }, { id: 'm2', title: 'Done one', state: 'done', dueDate: '2026-09-23' }] }), funnel: {} as never, goalLabel: null }],
        });
        expect(nextDeadline(data, NOW)).toMatchObject({ kind: 'milestone', label: 'Shortlist · Autumn', campaignId: 'c1' });
        expect(nextDeadline(base(), NOW)).toBeNull();
    });

    it('lists active applications most recent first and prefers the primary CV', () => {
        const data = base({ applications: [
            application({ id: 'old', stage: 'submitted', updatedAt: '2026-09-01T00:00:00.000Z' }),
            application({ id: 'new', stage: 'preparing', updatedAt: '2026-09-20T00:00:00.000Z' }),
            application({ id: 'closed', stage: 'closed', updatedAt: '2026-09-22T00:00:00.000Z' }),
        ] });
        expect(activeApplications(data).map((a) => a.id)).toEqual(['new', 'old']);
        const cvs = [{ id: 'r1', title: 'Newer', isPrimary: false, updatedAt: '2026-09-20' }, { id: 'r2', title: 'Primary', isPrimary: true, updatedAt: '2026-09-01' }] as never;
        expect(currentCv(cvs)?.id).toBe('r2');
        expect(currentCv([cvs[0]])?.id).toBe('r1');
        expect(currentCv([])).toBeNull();
    });
});
