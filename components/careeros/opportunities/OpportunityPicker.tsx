import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import type { Opportunity } from '../../../services/careerOs/types';
import { Dialog } from '../../common/Dialog';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, SkeletonCard, StatePanel } from '../primitives';
import { TextInput } from '../application/fields';

/**
 * Choose one of the person's own opportunities (merge target, campaign
 * target). A plain filtered list of buttons — every row is a real record,
 * searched client-side by title/company.
 */
export interface OpportunityPickerProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    /** Ids to leave out (the current record, existing members). */
    excludeIds?: string[];
    onClose: () => void;
    onPick: (opportunity: Opportunity) => void;
    pending?: boolean;
}

export const OpportunityPicker: React.FC<OpportunityPickerProps> = ({ open, title, description, confirmLabel, excludeIds = [], onClose, onPick, pending = false }) => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const [filter, setFilter] = useState('');
    const query = useOwnedQuery(userId, open ? 'opportunities:list:all' : null, () => opportunityRepo.list(userId as string, 'all'));

    const rows = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        return (query.data ?? [])
            .filter((o) => !excludeIds.includes(o.id) && o.status !== 'not_interested')
            .filter((o) => !needle || `${o.title} ${o.company}`.toLowerCase().includes(needle));
    }, [query.data, excludeIds, filter]);

    return (
        <Dialog open={open} onClose={onClose} title={title} panelClassName="max-w-lg max-h-[85vh]" bodyClassName="overflow-y-auto">
            {description && <p className="mb-3 text-[13px] text-content-secondary">{description}</p>}
            <TextInput label={t('careeros.picker.search', 'Search')} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t('careeros.picker.searchPlaceholder', 'Title or company')} />
            <div className="mt-3">
                {query.error ? (
                    <StatePanel kind="error" compact onRetry={() => { void query.refresh(); }} />
                ) : query.loading && !query.data ? (
                    <div className="space-y-2"><SkeletonCard compact action={false} /><SkeletonCard compact action={false} /></div>
                ) : rows.length === 0 ? (
                    <StatePanel kind="empty" compact title={t('careeros.picker.none', 'No other opportunities to choose from')} />
                ) : (
                    <ul className="divide-y divide-border-default rounded-xl border border-border-default">
                        {rows.map((o) => (
                            <li key={o.id} className="flex items-center justify-between gap-3 p-3">
                                <span className="min-w-0 text-sm text-content-primary">
                                    <span className="block truncate font-semibold">{o.title}</span>
                                    <span className="block truncate text-xs text-content-secondary">{o.company}</span>
                                </span>
                                <Button size="sm" variant="secondary" onClick={() => onPick(o)} disabled={pending}>{confirmLabel}</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Dialog>
    );
};

export default OpportunityPicker;
