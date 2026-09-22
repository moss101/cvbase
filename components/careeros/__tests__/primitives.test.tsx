// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TranslationProvider } from '../../../services/translationService';
import {
    ActionCard,
    ActivityTimeline,
    ApplicationCard,
    CampaignCard,
    ContextSwitcher,
    EvidenceBadge,
    FitBreakdown,
    ReadinessChecklist,
    StatePanel,
} from '../primitives';

/** Renders under the providers the primitives need; returns static markup. */
const render = (node: React.ReactNode): string => renderToStaticMarkup(<TranslationProvider>{node}</TranslationProvider>);

/** Turns markup into a document so assertions can use real DOM queries. */
const dom = (markup: string): HTMLElement => {
    const root = document.createElement('div');
    root.innerHTML = markup;
    return root;
};

describe('EvidenceBadge', () => {
    it('renders a human-readable label for every state, never colour alone', () => {
        const expected: Array<[React.ComponentProps<typeof EvidenceBadge>['state'], string]> = [
            ['verified', 'Verified'],
            ['user_confirmed', 'Confirmed by you'],
            ['inferred', 'Inferred'],
            ['incomplete', 'Incomplete'],
        ];
        for (const [state, label] of expected) {
            const root = dom(render(<EvidenceBadge state={state} />));
            expect(root.textContent).toContain(label);
            // An icon accompanies the text and is hidden from assistive tech.
            expect(root.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
            expect(root.firstElementChild?.className).toContain(`evidence-${state === 'user_confirmed' ? 'confirmed' : state}`);
        }
    });

    it('shows the optional detail beside the label', () => {
        const root = dom(render(<EvidenceBadge state="verified" detail="LinkedIn import" />));
        expect(root.textContent).toContain('LinkedIn import');
    });
});

describe('StatePanel', () => {
    it('error variant is an alert with a retry button', () => {
        const root = dom(render(<StatePanel kind="error" onRetry={() => undefined} />));
        const panel = root.querySelector('[role="alert"]');
        expect(panel).not.toBeNull();
        expect(panel?.getAttribute('aria-live')).toBe('assertive');
        const buttons = Array.from(root.querySelectorAll('button'));
        expect(buttons.map((button) => button.textContent)).toContain('Retry');
        expect(root.textContent).toContain('This could not be loaded');
    });

    it('loading and empty variants are polite status regions', () => {
        const loading = dom(render(<StatePanel kind="loading" />));
        expect(loading.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
        const empty = dom(render(<StatePanel kind="empty" title="No campaigns yet" action={{ label: 'Start one', onClick: () => undefined }} />));
        expect(empty.querySelector('[role="status"]')).not.toBeNull();
        expect(empty.textContent).toContain('No campaigns yet');
        expect(empty.querySelector('button')?.textContent).toBe('Start one');
    });

    it('denied, offline and AI-unavailable are alerts with their own copy', () => {
        expect(dom(render(<StatePanel kind="denied" />)).querySelector('[role="alert"]')?.textContent).toContain('Not available on your plan');
        expect(dom(render(<StatePanel kind="offline" />)).querySelector('[role="alert"]')?.textContent).toContain('offline');
        expect(dom(render(<StatePanel kind="ai-unavailable" />)).querySelector('[role="alert"]')?.textContent).toContain('AI assistance is unavailable');
    });

    it('partial keeps the loaded content beneath the notice', () => {
        const root = dom(
            render(
                <StatePanel kind="partial" onRetry={() => undefined}>
                    <p>Loaded rows</p>
                </StatePanel>,
            ),
        );
        expect(root.querySelector('[role="status"]')?.textContent).toContain('Some of this could not be loaded');
        expect(root.textContent).toContain('Loaded rows');
        expect(Array.from(root.querySelectorAll('button')).map((button) => button.textContent)).toContain('Retry');
    });
});

describe('ActionCard', () => {
    const base = {
        title: 'Tailor your CV for Acme',
        reason: 'The role asks for Kubernetes and your CV does not mention it.',
        source: 'From your goal',
        status: 'READY' as const,
        actionLabel: 'Open application',
        onAction: vi.fn(),
    };

    it('renders the reason, the source and the one dominant action', () => {
        const root = dom(render(<ActionCard {...base} priority="now" evidence={['Platform migration, 2023']} />));
        expect(root.textContent).toContain(base.title);
        expect(root.textContent).toContain(base.reason);
        expect(root.textContent).toContain('From your goal');
        expect(root.textContent).toContain('Platform migration, 2023');
        const primary = Array.from(root.querySelectorAll('button')).filter((button) => button.className.includes('bg-action-primary'));
        expect(primary).toHaveLength(1);
        expect(primary[0].textContent).toContain('Open application');
        // Status is announced, not just coloured.
        expect(root.querySelector('[role="status"]')?.textContent).toBe('Ready');
    });

    it('keeps dismiss and snooze as plain buttons behind a disclosure', () => {
        const root = dom(render(<ActionCard {...base} onDismiss={() => undefined} onSnooze={() => undefined} />));
        const toggle = root.querySelector('button[aria-expanded]');
        expect(toggle?.getAttribute('aria-expanded')).toBe('false');
        const controls = toggle?.getAttribute('aria-controls') ?? '';
        const region = Array.from(root.querySelectorAll('[id]')).find((element) => element.id === controls);
        expect(region?.hasAttribute('hidden')).toBe(true);
        const labels = Array.from(region?.querySelectorAll('button') ?? []).map((button) => button.textContent);
        expect(labels).toContain('Dismiss');
        expect(labels).toContain('Snooze');
        expect(root.querySelector('[role="menu"]')).toBeNull();
    });

    it('hides the dominant action once the action is terminal and shows the disabled reason', () => {
        const done = dom(render(<ActionCard {...base} status="COMPLETED" />));
        expect(done.querySelector('button.bg-action-primary')).toBeNull();
        expect(done.querySelector('[role="status"]')?.textContent).toBe('Done');
        const blocked = dom(render(<ActionCard {...base} disabledReason="Sign in to continue" />));
        expect(blocked.querySelector('button[disabled]')).not.toBeNull();
        expect(blocked.textContent).toContain('Sign in to continue');
    });

    it('renders a skeleton in its own layout while loading', () => {
        const root = dom(render(<ActionCard {...base} loading />));
        expect(root.firstElementChild?.getAttribute('aria-busy')).toBe('true');
        expect(root.textContent).not.toContain(base.title);
    });
});

describe('FitBreakdown', () => {
    it('shows insufficient data in both regions when nothing has been evaluated', () => {
        const root = dom(render(<FitBreakdown qualification={null} direction={null} />));
        const regions = Array.from(root.querySelectorAll('section'));
        expect(regions).toHaveLength(2);
        expect(regions[0].querySelector('h3')?.textContent).toBe('Qualification fit');
        expect(regions[1].querySelector('h3')?.textContent).toBe('Career direction fit');
        for (const region of regions) expect(region.textContent).toContain('Insufficient data');
        expect(root.textContent).not.toMatch(/%/);
    });

    it('lists counts per bucket and the evidence behind each requirement', () => {
        const root = dom(
            render(
                <FitBreakdown
                    qualification={{
                        supported: [
                            {
                                requirementId: 'r1',
                                text: '5 years of TypeScript',
                                state: 'supported',
                                evidence: [{ factId: 'f1', label: 'Senior engineer, Acme', confirmationState: 'user_confirmed' }],
                            },
                        ],
                        partial: [],
                        missing: [{ requirementId: 'r2', text: 'Kubernetes in production', state: 'missing', evidence: [] }],
                        unknown: [],
                    }}
                    direction={{
                        factors: [{ key: 'growth', label: 'Growth', verdict: 'aligned', detail: 'Staff track available' }],
                        constraints: [{ constraintId: 'c1', text: 'Remote only', kind: 'hard', verdict: 'broken', detail: 'Listing is on site' }],
                        missing: [],
                    }}
                />,
            ),
        );
        expect(root.textContent).toContain('2 requirements');
        expect(root.textContent).toContain('1 supported');
        expect(root.textContent).toContain('1 missing');
        expect(root.textContent).toContain('Kubernetes in production');
        expect(root.textContent).toContain('Confirmed by you');
        expect(root.textContent).toContain('Not met');
        expect(root.textContent).not.toContain('Insufficient data');
    });

    it('explains when direction fit cannot be evaluated because there is no goal', () => {
        const root = dom(render(<FitBreakdown qualification={null} direction={{ factors: [], constraints: [], missing: [], unavailableReason: 'No goal set' }} />));
        expect(root.textContent).toContain('No goal set');
    });
});

describe('ReadinessChecklist', () => {
    it('shows necessary done over total, blocked items and no percentage', () => {
        const onOpen = vi.fn();
        const root = dom(
            render(
                <ReadinessChecklist
                    onOpen={onOpen}
                    items={[
                        { id: '1', label: 'Tailored CV attached', kind: 'necessary', state: 'complete' },
                        { id: '2', label: 'Cover letter reviewed', kind: 'necessary', state: 'incomplete', destination: 'cover-letter' },
                        { id: '3', label: 'Employer questions answered', kind: 'necessary', state: 'blocked', detail: 'Listing closed' },
                        { id: '4', label: 'LinkedIn note', kind: 'optional', state: 'incomplete', destination: 'linkedin' },
                    ]}
                />,
            ),
        );
        expect(root.textContent).toContain('1 of 3 necessary');
        expect(root.textContent).toContain('1 blocked');
        expect(root.textContent).not.toMatch(/\d+%/);
        // Items with a destination become buttons; complete and blocked-without-destination ones do not.
        expect(root.querySelectorAll('button')).toHaveLength(2);
        expect(root.textContent).toContain('Optional');
    });
});

describe('ContextSwitcher', () => {
    it('renders each reference with a change button and surfaces conflicts', () => {
        const root = dom(
            render(
                <ContextSwitcher
                    refs={[
                        { kind: 'goal', label: 'Staff engineer', onChange: () => undefined },
                        { kind: 'application', label: 'Acme — Platform lead', locked: true },
                        { kind: 'campaign', label: null, onChange: () => undefined },
                    ]}
                    conflicts={[{ field: 'goal', requestedId: 'g-2', authoritativeId: 'g-1', reason: 'persisted' }]}
                />,
            ),
        );
        const buttons = Array.from(root.querySelectorAll('button'));
        expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Change goal: Staff engineer', 'Choose campaign']);
        expect(root.querySelector('[role="listbox"]')).toBeNull();
        expect(root.textContent).toContain('None selected');
        expect(root.querySelector('[role="status"]')?.textContent).toContain('different goal');
    });
});

describe('entity cards and timeline', () => {
    it('ApplicationCard names the closed reason instead of hiding it', () => {
        const rejected = dom(render(<ApplicationCard jobTitle="Platform lead" company="Acme" stage="closed" closedReason="rejected" />));
        expect(rejected.querySelector('[role="status"]')?.textContent).toBe('Not selected');
        const preparing = dom(
            render(
                <ApplicationCard
                    jobTitle="Platform lead"
                    company="Acme"
                    stage="preparing"
                    readiness={[{ id: '1', label: 'CV', kind: 'necessary', state: 'complete' }, { id: '2', label: 'Letter', kind: 'necessary', state: 'incomplete' }]}
                    action={{ label: 'Open', onClick: () => undefined }}
                />,
            ),
        );
        expect(preparing.textContent).toContain('1 of 2 necessary');
        expect(preparing.querySelectorAll('button.bg-action-primary')).toHaveLength(1);
    });

    it('CampaignCard exposes the funnel counts rather than a percentage', () => {
        const root = dom(
            render(
                <CampaignCard
                    name="Spring search"
                    goalLabel="Staff engineer"
                    status="active"
                    funnel={{ opportunities: 8, preparing: 2, submitted: 3, response: 1, interview: 1, final: 0, closed: 1, offers: 0, rejected: 1, unknownOutcome: 0 }}
                />,
            ),
        );
        expect(root.querySelectorAll('dd')).toHaveLength(4);
        expect(root.textContent).toContain('Toward Staff engineer');
        expect(root.textContent).not.toMatch(/%/);
    });

    it('ActivityTimeline renders an ordered list with machine-readable dates and a source per entry', () => {
        const root = dom(
            render(
                <ActivityTimeline
                    locale="en-GB"
                    entries={[
                        { id: 'e1', at: '2026-05-03T10:00:00Z', title: 'Submitted application', source: 'You' },
                        { id: 'e2', at: '2026-05-01T09:00:00Z', title: 'CV tailored', source: 'PRISM', detail: 'Run r-1' },
                    ]}
                    hasMore
                    onLoadMore={() => undefined}
                />,
            ),
        );
        expect(root.querySelectorAll('ol > li')).toHaveLength(2);
        expect(root.querySelector('time')?.getAttribute('dateTime')).toBe('2026-05-03T10:00:00.000Z');
        expect(root.textContent).toContain('PRISM');
        expect(root.querySelector('button')?.textContent).toContain('Show earlier activity');
        const empty = dom(render(<ActivityTimeline entries={[]} />));
        expect(empty.querySelector('[role="status"]')?.textContent).toContain('No activity yet');
    });
});
