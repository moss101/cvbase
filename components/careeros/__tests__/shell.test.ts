import { describe, expect, it } from 'vitest';
import { careerPath } from '../../NavigationProvider';
import { contextRouteFor } from '../shell/contextRoute';
import { ALL_SPACES, MOBILE_TABS, PRIMARY_SPACES, activeSpaceKey } from '../shell/spaces';

describe('shell descriptors', () => {
    it('exposes six primary spaces and five mobile entries (four tabs + More)', () => {
        expect(PRIMARY_SPACES.map((s) => s.key)).toEqual(['today', 'career', 'opportunities', 'campaigns', 'coach', 'library']);
        // Phone tabs: Today, Opportunities, Campaigns, CVs (+ More); Coach is one tap away through Ask.
        expect(MOBILE_TABS.map((s) => s.key)).toEqual(['today', 'opportunities', 'campaigns', 'cvs']);
    });

    it('keeps utilities, tools and account entries reachable without making them career pillars', () => {
        const keys = ALL_SPACES.map((s) => s.key);
        for (const k of ['search', 'notifications', 'cvs', 'templates', 'tailor', 'ats', 'studio', 'profile', 'settings', 'billing', 'resources', 'admin']) expect(keys).toContain(k);
        // The CV Builder is a first-class workspace: its home and the editor both light it up.
        expect(ALL_SPACES.find((s) => s.key === 'cvs')?.route).toEqual(careerPath.toCvWorkspace());
        expect(activeSpaceKey(careerPath.toCvWorkspace())).toBe('cvs');
        expect(activeSpaceKey(careerPath.toCvEdit('r1'))).toBe('cvs');
        expect(ALL_SPACES.find((s) => s.key === 'admin')?.adminOnly).toBe(true);
        // Pre-existing modules keep their own destinations: Smart Studio inside the Library,
        // the public resources page outside the shell.
        expect(ALL_SPACES.find((s) => s.key === 'studio')?.route).toEqual(careerPath.toStudio());
        expect(ALL_SPACES.find((s) => s.key === 'resources')?.route).toEqual({ view: 'resources' });
    });

    it('maps routes to the navigation entry that owns them', () => {
        expect(activeSpaceKey(careerPath.toApplication('a1', 'cv'))).toBe('campaigns');
        expect(activeSpaceKey(careerPath.toCareer('profile'))).toBe('profile');
        expect(activeSpaceKey(careerPath.toCareer('goals'))).toBe('career');
        expect(activeSpaceKey(careerPath.toLibraryTool('tailor'))).toBe('tailor');
        expect(activeSpaceKey(careerPath.toStudio('cover'))).toBe('studio');
        expect(activeSpaceKey(careerPath.toLibrary('cv'))).toBe('library');
        expect(activeSpaceKey(careerPath.toSpace('today'))).toBe('today');
    });
});

describe('contextRouteFor', () => {
    it('names only the owned subject the route identifies', () => {
        expect(contextRouteFor(careerPath.toApplication('a1', 'cv', { opportunity: 'o9' }))).toEqual({ application: 'a1' });
        expect(contextRouteFor(careerPath.toOpportunity('o1'))).toEqual({ opportunity: 'o1' });
        expect(contextRouteFor(careerPath.toCampaign('c1'))).toEqual({ campaign: 'c1' });
        expect(contextRouteFor(careerPath.toGoal('g1'))).toEqual({ goal: 'g1' });
        expect(contextRouteFor(careerPath.toCvEdit('r1'))).toEqual({ document: 'r1' });
        expect(contextRouteFor(careerPath.toCoach('conv1'))).toEqual({ conversation: 'conv1' });
        expect(contextRouteFor(careerPath.toSpace('today'))).toEqual({});
    });
});
