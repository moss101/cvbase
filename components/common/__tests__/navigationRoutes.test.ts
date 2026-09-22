import { describe, expect, it } from 'vitest';
import {
    LEGACY_TO_CAREER,
    careerPath,
    isCareerRoute,
    legacyTabForSpace,
    pathToRoute,
    routeToPath,
    type CareerRoute,
    type Route,
} from '../../NavigationProvider';
import { APPLICATION_SECTIONS } from '../../../services/careerOs/types';

describe('pathToRoute', () => {
    it('maps every top-level path to its screen', () => {
        expect(pathToRoute('/')).toEqual({ view: 'landing' });
        expect(pathToRoute('')).toEqual({ view: 'landing' });
        expect(pathToRoute('/app')).toEqual({ view: 'dashboard', dashboardTab: 'dashboard' });
        expect(pathToRoute('/app/')).toEqual({ view: 'dashboard', dashboardTab: 'dashboard' });
        expect(pathToRoute('/app/templates')).toEqual({ view: 'dashboard', dashboardTab: 'templates' });
        expect(pathToRoute('/app/smart-studio')).toEqual({ view: 'dashboard', dashboardTab: 'smart-studio' });
        expect(pathToRoute('/builder')).toEqual({ view: 'builder', resumeId: null });
        expect(pathToRoute('/builder/abc')).toEqual({ view: 'builder', resumeId: 'abc' });
        expect(pathToRoute('/resources')).toEqual({ view: 'resources' });
        expect(pathToRoute('/pricing')).toEqual({ view: 'pricing' });
        expect(pathToRoute('/legal')).toEqual({ view: 'legal', legalTab: 'privacy' });
        expect(pathToRoute('/legal/terms')).toEqual({ view: 'legal', legalTab: 'terms' });
        expect(pathToRoute('/sign-in')).toEqual({ view: 'auth' });
    });

    it('decodes the resume id', () => {
        expect(pathToRoute('/builder/a%20b')).toEqual({ view: 'builder', resumeId: 'a b' });
    });

    it('reads ?next= on the sign-in path and ignores unsafe values', () => {
        expect(pathToRoute('/sign-in', '?next=%2Fapp%2Fresumes')).toEqual({
            view: 'auth',
            next: { view: 'dashboard', dashboardTab: 'resumes' },
        });
        expect(pathToRoute('/sign-in', '?next=%2Fbuilder%2Fxyz')).toEqual({
            view: 'auth',
            next: { view: 'builder', resumeId: 'xyz' },
        });
        // External or relative targets never become a redirect.
        expect(pathToRoute('/sign-in', '?next=https%3A%2F%2Fevil.example')).toEqual({ view: 'auth' });
        expect(pathToRoute('/sign-in', '?next=app')).toEqual({ view: 'auth' });
        // Pointless targets collapse to a plain sign-in.
        expect(pathToRoute('/sign-in', '?next=%2F')).toEqual({ view: 'auth' });
        expect(pathToRoute('/sign-in', '?next=%2Fsign-in')).toEqual({ view: 'auth' });
    });

    it('sends unknown paths to the landing page', () => {
        expect(pathToRoute('/nope')).toEqual({ view: 'landing' });
        expect(pathToRoute('/legal/cookies')).toEqual({ view: 'landing' });
        expect(pathToRoute('/pricing/extra')).toEqual({ view: 'landing' });
        expect(pathToRoute('/builder/abc/def')).toEqual({ view: 'landing' });
        expect(pathToRoute('/sign-in/extra')).toEqual({ view: 'landing' });
    });

    it('does not throw on malformed escapes', () => {
        expect(pathToRoute('/builder/%E0%A4%A')).toEqual({ view: 'builder', resumeId: '%E0%A4%A' });
    });
});

describe('routeToPath', () => {
    it('serialises each route', () => {
        expect(routeToPath({ view: 'landing' })).toBe('/');
        expect(routeToPath({ view: 'dashboard' })).toBe('/app');
        expect(routeToPath({ view: 'dashboard', dashboardTab: 'dashboard' })).toBe('/app');
        expect(routeToPath({ view: 'dashboard', dashboardTab: 'ats' })).toBe('/app/ats');
        expect(routeToPath({ view: 'builder' })).toBe('/builder');
        expect(routeToPath({ view: 'builder', resumeId: 'a b' })).toBe('/builder/a%20b');
        expect(routeToPath({ view: 'resources' })).toBe('/resources');
        expect(routeToPath({ view: 'pricing' })).toBe('/pricing');
        expect(routeToPath({ view: 'legal' })).toBe('/legal/privacy');
        expect(routeToPath({ view: 'legal', legalTab: 'terms' })).toBe('/legal/terms');
        expect(routeToPath({ view: 'auth' })).toBe('/sign-in');
        expect(routeToPath({ view: 'auth', next: { view: 'dashboard', dashboardTab: 'billing' } })).toBe(
            '/sign-in?next=%2Fapp%2Fbilling',
        );
        expect(routeToPath({ view: 'auth', next: { view: 'landing' } })).toBe('/sign-in');
    });

    it('round-trips through pathToRoute', () => {
        const routes: Route[] = [
            { view: 'landing' },
            { view: 'dashboard', dashboardTab: 'dashboard' },
            { view: 'dashboard', dashboardTab: 'settings' },
            { view: 'builder', resumeId: null },
            { view: 'builder', resumeId: 'r-1' },
            { view: 'resources' },
            { view: 'pricing' },
            { view: 'legal', legalTab: 'terms' },
            { view: 'auth' },
            { view: 'auth', next: { view: 'builder', resumeId: 'r-2' } },
        ];
        for (const route of routes) {
            const [pathname, search = ''] = routeToPath(route).split('?', 2);
            expect(pathToRoute(pathname, search ? `?${search}` : '')).toEqual(route);
        }
    });
});

/* ----------------------------------------------------------------------------
 * Career OS route families (docs/career-os/CAREER_OS_INFORMATION_ARCHITECTURE.md)
 * ------------------------------------------------------------------------- */

const roundTrip = (route: Route): Route => {
    const [pathname, search = ''] = routeToPath(route).split('?', 2);
    return pathToRoute(pathname, search ? `?${search}` : '');
};

const NOT_FOUND: CareerRoute = { view: 'career', space: 'not-found' };

describe('career routes', () => {
    it('keeps every legacy dashboard tab on its exact path', () => {
        for (const tab of Object.keys(LEGACY_TO_CAREER) as Array<keyof typeof LEGACY_TO_CAREER>) {
            expect(pathToRoute(`/app/${tab}`)).toEqual({ view: 'dashboard', dashboardTab: tab });
        }
    });

    it('parses Today and the Career subviews', () => {
        expect(pathToRoute('/app/today')).toEqual({ view: 'career', space: 'today' });
        expect(pathToRoute('/app/today/')).toEqual({ view: 'career', space: 'today' });
        expect(pathToRoute('/app/career')).toEqual({ view: 'career', space: 'career', sub: 'overview' });
        for (const sub of ['overview', 'experience', 'achievements', 'skills', 'education', 'evidence', 'goals', 'profile']) {
            expect(pathToRoute(`/app/career/${sub}`)).toEqual({ view: 'career', space: 'career', sub });
        }
        expect(pathToRoute('/app/career/goals/g-1')).toEqual({ view: 'career', space: 'career', sub: 'goals', id: 'g-1' });
        // Only goals carry an id beneath Career.
        expect(pathToRoute('/app/career/skills/s-1')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/career/nope')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/career/goals/g-1/extra')).toEqual(NOT_FOUND);
    });

    it('parses opportunities, campaigns and coach with their ids and view filters', () => {
        expect(pathToRoute('/app/opportunities')).toEqual({ view: 'career', space: 'opportunities' });
        expect(pathToRoute('/app/opportunities/o-1')).toEqual({ view: 'career', space: 'opportunities', id: 'o-1' });
        expect(pathToRoute('/app/opportunities', '?view=saved')).toEqual({
            view: 'career',
            space: 'opportunities',
            query: { view: 'saved' },
        });
        for (const view of ['for-you', 'saved', 'applied', 'watching', 'archived']) {
            expect(pathToRoute('/app/opportunities', `?view=${view}`)).toMatchObject({ query: { view } });
        }
        // Unknown filter values are dropped, not passed through.
        expect(pathToRoute('/app/opportunities', '?view=everything')).toEqual({ view: 'career', space: 'opportunities' });
        // A filter belongs to its list, not to a detail page.
        expect(pathToRoute('/app/opportunities/o-1', '?view=saved')).toEqual({ view: 'career', space: 'opportunities', id: 'o-1' });

        expect(pathToRoute('/app/campaigns')).toEqual({ view: 'career', space: 'campaigns' });
        expect(pathToRoute('/app/campaigns/c-1')).toEqual({ view: 'career', space: 'campaigns', id: 'c-1' });
        expect(pathToRoute('/app/campaigns', '?view=board')).toMatchObject({ query: { view: 'board' } });
        expect(pathToRoute('/app/campaigns', '?view=list')).toMatchObject({ query: { view: 'list' } });
        expect(pathToRoute('/app/campaigns', '?view=saved')).toEqual({ view: 'career', space: 'campaigns' });

        expect(pathToRoute('/app/coach')).toEqual({ view: 'career', space: 'coach' });
        expect(pathToRoute('/app/coach/conv-1')).toEqual({ view: 'career', space: 'coach', id: 'conv-1' });
        expect(pathToRoute('/app/coach/conv-1/more')).toEqual(NOT_FOUND);
    });

    it('parses the application workspace with a validated section', () => {
        expect(pathToRoute('/app/applications')).toEqual({ view: 'career', space: 'applications' });
        // A bare id opens Role Analysis.
        expect(pathToRoute('/app/applications/a-1')).toEqual({
            view: 'career',
            space: 'applications',
            id: 'a-1',
            section: 'analysis',
        });
        for (const section of APPLICATION_SECTIONS) {
            expect(pathToRoute(`/app/applications/a-1/${section}`)).toEqual({
                view: 'career',
                space: 'applications',
                id: 'a-1',
                section,
            });
        }
        expect(pathToRoute('/app/applications/a-1/settings')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/applications/a-1/cv/extra')).toEqual(NOT_FOUND);
    });

    it('parses the library and its tools, editors and documents', () => {
        expect(pathToRoute('/app/library')).toEqual({ view: 'career', space: 'library' });
        for (const type of ['cv', 'report', 'headshot', 'cover-letter', 'story', 'evidence']) {
            expect(pathToRoute('/app/library', `?type=${type}`)).toEqual({ view: 'career', space: 'library', query: { type } });
        }
        expect(pathToRoute('/app/library', '?type=everything')).toEqual({ view: 'career', space: 'library' });
        for (const tool of ['templates', 'tailor', 'ats']) {
            expect(pathToRoute(`/app/library/${tool}`)).toEqual({ view: 'career', space: 'library', sub: tool });
        }
        expect(pathToRoute('/app/library/cvs/new')).toEqual({ view: 'career', space: 'library', sub: 'cvs', section: 'new' });
        expect(pathToRoute('/app/library/cvs/r-1/edit')).toEqual({
            view: 'career',
            space: 'library',
            sub: 'cvs',
            id: 'r-1',
            section: 'edit',
        });
        expect(pathToRoute('/app/library/documents/d-1')).toEqual({ view: 'career', space: 'library', sub: 'documents', id: 'd-1' });
        // A missing id never opens another resume: the shape has to be exact.
        expect(pathToRoute('/app/library/cvs')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/cvs/r-1')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/cvs/r-1/view')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/documents')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/templates/x')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/nope')).toEqual(NOT_FOUND);
    });

    it('parses the utilities, keeping the KEEP routes on the legacy dashboard', () => {
        expect(pathToRoute('/app/search')).toEqual({ view: 'career', space: 'search' });
        expect(pathToRoute('/app/notifications')).toEqual({ view: 'career', space: 'notifications' });
        expect(pathToRoute('/app/settings/integrations')).toEqual({ view: 'career', space: 'settings', sub: 'integrations' });
        expect(pathToRoute('/app/settings/nope')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/search/extra')).toEqual(NOT_FOUND);
        // Same URL, served by the dashboard until cutover (IA ledger: KEEP).
        expect(pathToRoute('/app/settings')).toEqual({ view: 'dashboard', dashboardTab: 'settings' });
        expect(pathToRoute('/app/billing')).toEqual({ view: 'dashboard', dashboardTab: 'billing' });
        expect(pathToRoute('/app/admin')).toEqual({ view: 'dashboard', dashboardTab: 'admin' });
        expect(routeToPath({ view: 'career', space: 'settings' })).toBe('/app/settings');
        expect(routeToPath({ view: 'career', space: 'billing' })).toBe('/app/billing');
        expect(routeToPath({ view: 'career', space: 'admin' })).toBe('/app/admin');
    });

    it('keeps context hints only when they look like ids', () => {
        expect(pathToRoute('/app/applications/a-1/cv', '?goal=g-1&campaign=c_2&opportunity=o.3&application=a-1')).toEqual({
            view: 'career',
            space: 'applications',
            id: 'a-1',
            section: 'cv',
            context: { goal: 'g-1', campaign: 'c_2', opportunity: 'o.3', application: 'a-1' },
        });
        // Text, spaces, slashes and over-long values are dropped one by one.
        expect(pathToRoute('/app/opportunities/o-1', '?goal=g%201&campaign=c-1')).toEqual({
            view: 'career',
            space: 'opportunities',
            id: 'o-1',
            context: { campaign: 'c-1' },
        });
        expect(pathToRoute('/app/coach', `?goal=${'x'.repeat(65)}`)).toEqual({ view: 'career', space: 'coach' });
        expect(pathToRoute('/app/coach', '?goal=a%2Fb')).toEqual({ view: 'career', space: 'coach' });
        expect(pathToRoute('/app/coach', '?goal=')).toEqual({ view: 'career', space: 'coach' });
        // Unknown keys never reach the route.
        expect(pathToRoute('/app/today', '?utm_source=mail&token=abc&jd=text')).toEqual({ view: 'career', space: 'today' });
        expect(pathToRoute('/app/today', '?view=saved&type=cv')).toEqual({ view: 'career', space: 'today' });
    });

    it('rejects ids that do not look like ids', () => {
        expect(pathToRoute('/app/applications/a%20b')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/opportunities/%E0%A4%A')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/career/goals/<script>')).toEqual(NOT_FOUND);
        expect(pathToRoute(`/app/campaigns/${'x'.repeat(65)}`)).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/library/cvs/a%2Fb/edit')).toEqual(NOT_FOUND);
    });

    it('sends unknown or malformed /app paths to the owned-context-safe not-found', () => {
        expect(pathToRoute('/app/not-a-tab')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/today/extra')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/billing/extra')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/a/b/c/d/e/f')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/not-found')).toEqual(NOT_FOUND);
        expect(pathToRoute('/app/not-found/x')).toEqual(NOT_FOUND);
        expect(routeToPath(NOT_FOUND)).toBe('/app/not-found');
        // Top-level junk still lands on the landing page.
        expect(pathToRoute('/today')).toEqual({ view: 'landing' });
        expect(pathToRoute('/applications/a-1')).toEqual({ view: 'landing' });
    });

    it('serialises every family with encoded ids and stable query order', () => {
        expect(routeToPath({ view: 'career', space: 'today' })).toBe('/app/today');
        expect(routeToPath({ view: 'career', space: 'career' })).toBe('/app/career');
        expect(routeToPath({ view: 'career', space: 'career', sub: 'overview' })).toBe('/app/career');
        expect(routeToPath({ view: 'career', space: 'career', sub: 'skills' })).toBe('/app/career/skills');
        expect(routeToPath({ view: 'career', space: 'career', sub: 'goals', id: 'g-1' })).toBe('/app/career/goals/g-1');
        expect(routeToPath({ view: 'career', space: 'opportunities', query: { view: 'saved' } })).toBe('/app/opportunities?view=saved');
        expect(routeToPath({ view: 'career', space: 'campaigns', id: 'c-1' })).toBe('/app/campaigns/c-1');
        expect(routeToPath({ view: 'career', space: 'applications', id: 'a-1' })).toBe('/app/applications/a-1');
        expect(routeToPath({ view: 'career', space: 'applications', id: 'a-1', section: 'analysis' })).toBe('/app/applications/a-1');
        expect(routeToPath({ view: 'career', space: 'applications', id: 'a-1', section: 'cover-letter' })).toBe(
            '/app/applications/a-1/cover-letter',
        );
        expect(
            routeToPath({
                view: 'career',
                space: 'applications',
                id: 'a-1',
                section: 'cv',
                context: { application: 'a-1', opportunity: 'o-1', goal: 'g-1' },
            }),
        ).toBe('/app/applications/a-1/cv?goal=g-1&opportunity=o-1&application=a-1');
        expect(routeToPath({ view: 'career', space: 'coach', id: 'conv-1' })).toBe('/app/coach/conv-1');
        expect(routeToPath({ view: 'career', space: 'library', query: { type: 'cv' } })).toBe('/app/library?type=cv');
        expect(routeToPath({ view: 'career', space: 'library', sub: 'tailor' })).toBe('/app/library/tailor');
        expect(routeToPath({ view: 'career', space: 'library', sub: 'cvs', section: 'new' })).toBe('/app/library/cvs/new');
        expect(routeToPath({ view: 'career', space: 'library', sub: 'cvs', id: 'r-1', section: 'edit' })).toBe('/app/library/cvs/r-1/edit');
        expect(routeToPath({ view: 'career', space: 'library', sub: 'documents', id: 'd-1' })).toBe('/app/library/documents/d-1');
        expect(routeToPath({ view: 'career', space: 'settings', sub: 'integrations' })).toBe('/app/settings/integrations');
        expect(routeToPath({ view: 'career', space: 'search' })).toBe('/app/search');
        expect(routeToPath({ view: 'career', space: 'notifications' })).toBe('/app/notifications');
        // Invalid hints and filters are not written either.
        expect(routeToPath({ view: 'career', space: 'today', context: { goal: 'not an id' }, query: { view: 'saved' } })).toBe(
            '/app/today',
        );
    });

    it('round-trips every career family', () => {
        const routes: CareerRoute[] = [
            { view: 'career', space: 'today' },
            { view: 'career', space: 'career', sub: 'overview' },
            { view: 'career', space: 'career', sub: 'evidence' },
            { view: 'career', space: 'career', sub: 'goals', id: 'g-1' },
            { view: 'career', space: 'opportunities' },
            { view: 'career', space: 'opportunities', query: { view: 'watching' } },
            { view: 'career', space: 'opportunities', id: 'o-1', context: { goal: 'g-1', campaign: 'c-1' } },
            { view: 'career', space: 'campaigns', query: { view: 'list' } },
            { view: 'career', space: 'campaigns', id: 'c-1' },
            { view: 'career', space: 'applications' },
            { view: 'career', space: 'applications', id: 'a-1', section: 'analysis' },
            { view: 'career', space: 'applications', id: 'a-1', section: 'interview', context: { opportunity: 'o-1' } },
            { view: 'career', space: 'coach' },
            { view: 'career', space: 'coach', id: 'conv-1', context: { application: 'a-1' } },
            { view: 'career', space: 'library' },
            { view: 'career', space: 'library', query: { type: 'cover-letter' } },
            { view: 'career', space: 'library', sub: 'templates' },
            { view: 'career', space: 'library', sub: 'tailor' },
            { view: 'career', space: 'library', sub: 'ats' },
            { view: 'career', space: 'library', sub: 'cvs', section: 'new' },
            { view: 'career', space: 'library', sub: 'cvs', id: 'r-1', section: 'edit', context: { application: 'a-1' } },
            { view: 'career', space: 'library', sub: 'documents', id: 'd-1' },
            { view: 'career', space: 'search' },
            { view: 'career', space: 'notifications' },
            { view: 'career', space: 'settings', sub: 'integrations' },
            { view: 'career', space: 'not-found' },
        ];
        for (const route of routes) {
            expect(roundTrip(route)).toEqual(route);
        }
    });

    it('continues to a nested career route after sign-in', () => {
        const next: CareerRoute = {
            view: 'career',
            space: 'applications',
            id: 'a-1',
            section: 'cv',
            context: { goal: 'g-1' },
        };
        const path = routeToPath({ view: 'auth', next });
        expect(path).toBe('/sign-in?next=%2Fapp%2Fapplications%2Fa-1%2Fcv%3Fgoal%3Dg-1');
        expect(roundTrip({ view: 'auth', next })).toEqual({ view: 'auth', next });
        expect(pathToRoute('/sign-in', '?next=%2Fapp%2Ftoday')).toEqual({ view: 'auth', next: { view: 'career', space: 'today' } });
        // A broken destination still continues somewhere owned, never to a guessed record.
        expect(pathToRoute('/sign-in', '?next=%2Fapp%2Fapplications%2Fa%2520b')).toEqual({ view: 'auth', next: NOT_FOUND });
    });

    it('exposes typed builders that produce the same routes', () => {
        expect(careerPath.toSpace('today')).toEqual({ view: 'career', space: 'today' });
        expect(careerPath.toSpace('opportunities', { view: 'saved' })).toEqual({ view: 'career', space: 'opportunities', query: { view: 'saved' } });
        expect(careerPath.toCareer()).toEqual({ view: 'career', space: 'career', sub: 'overview' });
        expect(careerPath.toGoal('g-1')).toEqual({ view: 'career', space: 'career', sub: 'goals', id: 'g-1' });
        expect(careerPath.toOpportunity('o-1')).toEqual({ view: 'career', space: 'opportunities', id: 'o-1' });
        expect(careerPath.toCampaign('c-1')).toEqual({ view: 'career', space: 'campaigns', id: 'c-1' });
        expect(careerPath.toApplication('a-1')).toEqual({ view: 'career', space: 'applications', id: 'a-1', section: 'analysis' });
        expect(careerPath.toApplication('a-1', 'notes', { opportunity: 'o-1' })).toEqual({
            view: 'career',
            space: 'applications',
            id: 'a-1',
            section: 'notes',
            context: { opportunity: 'o-1' },
        });
        expect(careerPath.toCoach()).toEqual({ view: 'career', space: 'coach' });
        expect(careerPath.toCoach('conv-1')).toEqual({ view: 'career', space: 'coach', id: 'conv-1' });
        expect(careerPath.toLibrary('cv')).toEqual({ view: 'career', space: 'library', query: { type: 'cv' } });
        expect(careerPath.toLibraryTool('ats')).toEqual({ view: 'career', space: 'library', sub: 'ats' });
        expect(careerPath.toNewCv()).toEqual({ view: 'career', space: 'library', sub: 'cvs', section: 'new' });
        expect(careerPath.toCvEdit('r-1')).toEqual({ view: 'career', space: 'library', sub: 'cvs', id: 'r-1', section: 'edit' });
        expect(careerPath.toDocument('d-1')).toEqual({ view: 'career', space: 'library', sub: 'documents', id: 'd-1' });
        expect(careerPath.toIntegrations()).toEqual({ view: 'career', space: 'settings', sub: 'integrations' });
        expect(careerPath.notFound()).toEqual(NOT_FOUND);
        for (const route of [careerPath.toApplication('a-1', 'cv'), careerPath.toCvEdit('r-1'), careerPath.toGoal('g-1')]) {
            expect(roundTrip(route)).toEqual(route);
        }
    });

    it('documents the IA ledger for each legacy tab and the fallback for each space', () => {
        expect(isCareerRoute({ view: 'career', space: 'today' })).toBe(true);
        expect(isCareerRoute({ view: 'dashboard' })).toBe(false);
        expect(routeToPath(LEGACY_TO_CAREER.dashboard)).toBe('/app/today');
        expect(routeToPath(LEGACY_TO_CAREER.resumes)).toBe('/app/library?type=cv');
        expect(routeToPath(LEGACY_TO_CAREER.templates)).toBe('/app/library/templates');
        expect(routeToPath(LEGACY_TO_CAREER.profile)).toBe('/app/career/profile');
        expect(routeToPath(LEGACY_TO_CAREER['smart-studio'])).toBe('/app/library/studio');
        expect(routeToPath(LEGACY_TO_CAREER.ats)).toBe('/app/library/ats');
        expect(routeToPath(LEGACY_TO_CAREER.prism)).toBe('/app/library/tailor');
        expect(routeToPath(LEGACY_TO_CAREER.billing)).toBe('/app/billing');
        expect(routeToPath(LEGACY_TO_CAREER.settings)).toBe('/app/settings');
        expect(routeToPath(LEGACY_TO_CAREER.admin)).toBe('/app/admin');
        // Every ledger destination is itself a valid, parseable route.
        for (const route of Object.values(LEGACY_TO_CAREER)) {
            expect(roundTrip(route)).not.toEqual(NOT_FOUND);
        }
        expect(legacyTabForSpace('today')).toBe('dashboard');
        // Smart Studio keeps its active tool in the URL; unknown tools are dropped.
        expect(routeToPath(careerPath.toStudio('cover'))).toBe('/app/library/studio?tool=cover');
        expect(pathToRoute('/app/library/studio', '?tool=trajectory')).toEqual({ view: 'career', space: 'library', sub: 'studio', query: { tool: 'trajectory' } });
        expect(pathToRoute('/app/library/studio', '?tool=hack')).toEqual({ view: 'career', space: 'library', sub: 'studio' });
        expect(pathToRoute('/app/library/ats', '?tool=cover')).toEqual({ view: 'career', space: 'library', sub: 'ats' });
        expect(legacyTabForSpace('library')).toBe('resumes');
        expect(legacyTabForSpace('career')).toBe('profile');
        expect(legacyTabForSpace('settings')).toBe('settings');
        expect(legacyTabForSpace('applications')).toBe('dashboard');
        expect(legacyTabForSpace('not-found')).toBe('dashboard');
    });
});

describe('campaign detail view filter', () => {
    it('keeps ?view= on a campaign detail route and round-trips it', () => {
        const route = pathToRoute('/app/campaigns/c-1', '?view=list');
        expect(route).toEqual({ view: 'career', space: 'campaigns', id: 'c-1', query: { view: 'list' } });
        expect(routeToPath(route)).toBe('/app/campaigns/c-1?view=list');
        // Other detail routes still drop list filters.
        expect(pathToRoute('/app/opportunities/o-1', '?view=saved')).toEqual({ view: 'career', space: 'opportunities', id: 'o-1' });
    });
});
