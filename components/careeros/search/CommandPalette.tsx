import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type Route } from '../../NavigationProvider';
import Dialog from '../../common/Dialog';
import { Button, Skeleton, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import {
    GROUP_CAP, MAX_QUERY, MIN_QUERY, normaliseQuery, rememberSearchQuery, useCommandSearch, type SearchGroup, type SearchResult,
} from './useCommandPalette';

/**
 * The command palette (REQ-23): one input, grouped results, full keyboard
 * operation — arrows move, Enter opens, Escape closes and focus returns to
 * the trigger (Dialog restores it). `inline` renders the same body as a
 * page (used by /app/search) so search works without the shortcut.
 */
export interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
    /** Render as page content instead of a modal. */
    inline?: boolean;
    initialQuery?: string;
}

const GROUP_LABEL: Record<SearchGroup, [string, string]> = {
    navigate: ['careeros.search.group.navigate', 'Navigate'],
    actions: ['careeros.search.group.actions', 'Actions'],
    opportunities: ['careeros.search.group.opportunities', 'Opportunities'],
    applications: ['careeros.search.group.applications', 'Applications'],
    goals: ['careeros.search.group.goals', 'Goals'],
    campaigns: ['careeros.search.group.campaigns', 'Campaigns'],
    facts: ['careeros.search.group.facts', 'Facts'],
    documents: ['careeros.search.group.documents', 'Documents'],
    conversations: ['careeros.search.group.conversations', 'Coach conversations'],
};

/** Cmd/Ctrl-K opens the palette; the shell wires this once at the top level. */
export function useCommandPaletteShortcut(onOpen: () => void): void {
    const ref = useRef(onOpen);
    ref.current = onOpen;
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                ref.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, inline = false, initialQuery = '' }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, isAdmin } = useCareerOs();
    const online = useOnline();
    const [query, setQuery] = useState(initialQuery);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const search = useCommandSearch(userId, query, { enabled: open && online, t, isAdmin });

    useEffect(() => { if (open) setQuery(initialQuery); }, [open, initialQuery]);
    useEffect(() => { setActive(0); }, [search.answered]);

    const flat = useMemo(() => search.groups.flatMap((g) => g.items), [search.groups]);
    const q = normaliseQuery(query);

    const openResult = useCallback((route: Route) => {
        onClose();
        navigate(route);
    }, [onClose, navigate]);

    const showMore = useCallback(() => {
        rememberSearchQuery(q);
        onClose();
        navigate(careerPath.toSpace('search'));
    }, [q, onClose, navigate]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length)); }
        else if (e.key === 'Enter') { e.preventDefault(); const hit = flat[active]; if (hit) openResult(hit.route); }
        else if (e.key === 'Escape' && inline) { setQuery(''); }
        else if (e.key === 'Home' && flat.length > 0) { e.preventDefault(); setActive(0); }
        else if (e.key === 'End' && flat.length > 0) { e.preventDefault(); setActive(flat.length - 1); }
    };

    const activeId = flat[active] ? `${listId}-${flat[active].id}` : undefined;
    const tooShort = q.length > 0 && q.length < MIN_QUERY;

    const body = (
        <div className="flex min-h-0 flex-col">
            <div className="relative">
                <label htmlFor={`${listId}-input`} className="sr-only">{t('careeros.search.label', 'Search or jump to')}</label>
                <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" aria-hidden="true" />
                <input
                    id={`${listId}-input`}
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={flat.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    autoFocus={!inline}
                    value={query}
                    maxLength={MAX_QUERY}
                    onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY))}
                    onKeyDown={onKeyDown}
                    placeholder={t('careeros.search.placeholder', 'Search your career, or type a space name…')}
                    className="tap-target w-full rounded-xl border border-border-strong bg-surface-panel py-2.5 pl-9 pr-3 text-[15px] text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
            </div>
            <p className="mt-1 text-[11px] text-content-muted">{t('careeros.search.hint', '↑↓ to move · Enter to open · Esc to close · at least {min} characters').replace('{min}', String(MIN_QUERY))}</p>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={search.loading || undefined}>
                {!online ? (
                    <StatePanel kind="offline" compact description={t('careeros.search.offline', 'Search reads your account and needs a connection. Navigation still works from the sidebar.')} />
                ) : search.error !== null ? (
                    <StatePanel kind="error" compact onRetry={search.retry} />
                ) : tooShort ? (
                    <p className="px-1 text-[13px] text-content-secondary">{t('careeros.search.tooShort', 'Type at least {min} characters.').replace('{min}', String(MIN_QUERY))}</p>
                ) : q.length === 0 ? (
                    <p className="px-1 text-[13px] text-content-secondary">{t('careeros.search.empty', 'Jump to a space, an opportunity, an application, a goal, a fact or a document in your account.')}</p>
                ) : search.loading && search.answered !== q ? (
                    <div className="space-y-2" role="status">
                        <span className="sr-only">{t('careeros.search.searching', 'Searching')}</span>
                        <Skeleton variant="text" width="30%" />
                        <Skeleton variant="block" className="h-10" />
                        <Skeleton variant="block" className="h-10" />
                    </div>
                ) : flat.length === 0 ? (
                    <StatePanel kind="empty" compact title={t('careeros.search.noResults', 'No matches in your account')} description={t('careeros.search.noResultsDescription', 'Try a company, a role, a space name or a fact title.')} />
                ) : (
                    <ul id={listId} role="listbox" aria-label={t('careeros.search.results', 'Search results')} className="space-y-3">
                        {search.groups.map((group) => (
                            <li key={group.group} role="presentation">
                                <p className="mb-1 px-1 font-label text-[10px] uppercase tracking-[0.14em] text-content-muted">
                                    {t(GROUP_LABEL[group.group][0], GROUP_LABEL[group.group][1])}
                                    {group.failed && <span className="ml-2 normal-case tracking-normal text-status-warning">{t('careeros.search.groupFailed', '(could not be searched)')}</span>}
                                </p>
                                <ul role="group" aria-label={t(GROUP_LABEL[group.group][0], GROUP_LABEL[group.group][1])} className="space-y-0.5">
                                    {group.items.map((item: SearchResult) => {
                                        const index = flat.indexOf(item);
                                        const selected = index === active;
                                        return (
                                            <li
                                                key={item.id}
                                                id={`${listId}-${item.id}`}
                                                role="option"
                                                aria-selected={selected}
                                                onMouseEnter={() => setActive(index)}
                                            >
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => openResult(item.route)}
                                                    className={`tap-target flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${selected ? 'bg-action-primary/10 text-content-primary ring-1 ring-action-primary/40' : 'text-content-primary hover:bg-surface-canvas'}`}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                                                        {item.subtitle && <span className="block truncate text-xs text-content-secondary">{item.subtitle}</span>}
                                                    </span>
                                                    <ArrowRight size={14} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {group.total > GROUP_CAP && !inline && (
                                    <div className="mt-1 px-1">
                                        <Button variant="quiet" size="sm" onClick={showMore}>{t('careeros.search.showMore', 'Show all {count}').replace('{count}', String(group.total))}</Button>
                                    </div>
                                )}
                                {group.total > GROUP_CAP && inline && (
                                    <p className="mt-1 px-1 text-xs text-content-muted">{t('careeros.search.capped', 'Showing the first {cap} of {count}. Refine the search to narrow it.').replace('{cap}', String(GROUP_CAP)).replace('{count}', String(group.total))}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    if (inline) return body;
    return (
        <Dialog open={open} onClose={onClose} title={t('careeros.search.title', 'Search')} panelClassName="max-w-xl max-h-[85vh]" bodyClassName="flex min-h-0 flex-col" initialFocusRef={inputRef}>
            {body}
        </Dialog>
    );
};

export default CommandPalette;
