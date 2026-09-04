import { describe, expect, it } from 'vitest';
import { pathToRoute, routeToPath, type Route } from '../../NavigationProvider';

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
        expect(pathToRoute('/app/not-a-tab')).toEqual({ view: 'landing' });
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
