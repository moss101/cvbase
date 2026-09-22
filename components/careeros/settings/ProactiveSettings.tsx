import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BellRing, Play, Save } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as preferencesRepo from '../../../services/careerOs/preferencesRepo';
import { ConflictError, type CareerPreferences } from '../../../services/careerOs/types';
import { Button, Pill, Skeleton, StatePanel, StatusChip } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import { FailureNotice } from '../application/FailureNotice';
import { runProactiveNow, type ProactiveRunSummary, type SkipReason } from './proactiveRun';

/**
 * Proactive assistance preferences (COS-037, REQ-10): an explicit opt-in
 * with consent copy, time zone, quiet hours, a daily cap and per-trigger
 * switches, all persisted with the preferences revision. "Run reminders
 * now" runs the client-side planner and shows exactly what it created and
 * why the rest was skipped. It is honest about delivery: reminders are
 * generated when CVBase is open, not in the background.
 */
const FALLBACK_ZONES = ['UTC', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];

export function listTimeZones(): string[] {
    try {
        const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
        const zones = intl.supportedValuesOf?.('timeZone');
        if (zones && zones.length > 0) return zones;
    } catch { /* older engines */ }
    return FALLBACK_ZONES;
}

const browserZone = (): string => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

interface Draft {
    proactiveEnabled: boolean;
    timeZone: string;
    quietEnabled: boolean;
    quietStart: string;
    quietEnd: string;
    dailyActionCap: number;
    triggers: { interview: boolean; followUp: boolean; staleImport: boolean; evidenceGap: boolean };
}

const toDraft = (p: CareerPreferences): Draft => ({
    proactiveEnabled: p.proactiveEnabled,
    timeZone: p.timeZone || browserZone(),
    quietEnabled: Boolean(p.quietHours),
    quietStart: p.quietHours?.start ?? '21:00',
    quietEnd: p.quietHours?.end ?? '08:00',
    dailyActionCap: Math.max(0, Math.min(20, p.dailyActionCap)),
    triggers: { interview: p.triggers.interview ?? true, followUp: p.triggers.followUp ?? true, staleImport: p.triggers.staleImport ?? true, evidenceGap: p.triggers.evidenceGap ?? false },
});

const TRIGGER_KEYS: Array<keyof Draft['triggers']> = ['interview', 'followUp', 'staleImport', 'evidenceGap'];

export const ProactiveSettings: React.FC = () => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const ids = useId();
    const [prefs, setPrefs] = useState<CareerPreferences | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [saveError, setSaveError] = useState<unknown>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [running, setRunning] = useState(false);
    const [runError, setRunError] = useState<unknown>(null);
    const [summary, setSummary] = useState<ProactiveRunSummary | null>(null);
    const [attempt, setAttempt] = useState(0);
    const zones = useMemo(listTimeZones, []);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoadError(null);
        try {
            const row = await preferencesRepo.ensure(userId);
            setPrefs(row);
            setDraft(toDraft(row));
        } catch (err) {
            setLoadError(err);
        }
    }, [userId]);
    useEffect(() => { void load(); }, [load, attempt]);

    const dirty = useMemo(() => (prefs && draft ? JSON.stringify(toDraft(prefs)) !== JSON.stringify(draft) : false), [prefs, draft]);

    const save = useCallback(async () => {
        if (!userId || !prefs || !draft) return;
        setSaving(true);
        setSaveError(null);
        setSaved(false);
        try {
            const updated = await preferencesRepo.update(userId, {
                proactiveEnabled: draft.proactiveEnabled,
                ...(draft.proactiveEnabled && !prefs.consentAt ? { consentAt: new Date().toISOString() } : {}),
                timeZone: draft.timeZone,
                quietHours: draft.quietEnabled ? { start: draft.quietStart, end: draft.quietEnd } : null,
                dailyActionCap: Math.max(0, Math.min(20, Math.round(draft.dailyActionCap))),
                triggers: draft.triggers,
            }, prefs.revision);
            setPrefs(updated);
            setDraft(toDraft(updated));
            setSaved(true);
        } catch (err) {
            setSaveError(err);
            if (err instanceof ConflictError) await load();
        } finally {
            setSaving(false);
        }
    }, [userId, prefs, draft, load]);

    const run = useCallback(async () => {
        if (!userId || !prefs) return;
        setRunning(true);
        setRunError(null);
        try {
            const result = await runProactiveNow(userId, prefs);
            setPrefs(result.preferences);
            setDraft(toDraft(result.preferences));
            setSummary(result.summary);
        } catch (err) {
            setRunError(err);
            if (err instanceof ConflictError) await load();
        } finally {
            setRunning(false);
        }
    }, [userId, prefs, load]);

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

    const skipLabel: Record<SkipReason, string> = {
        disabled: t('careeros.proactive.skip.disabled', 'proactive assistance off'),
        quiet_hours: t('careeros.proactive.skip.quietHours', 'quiet hours'),
        cap: t('careeros.proactive.skip.cap', 'daily cap reached'),
        dismissed: t('careeros.proactive.skip.dismissed', 'already dismissed or done'),
        duplicate: t('careeros.proactive.skip.duplicate', 'already reminded'),
        trigger_off: t('careeros.proactive.skip.triggerOff', 'trigger switched off'),
        not_actionable: t('careeros.proactive.skip.notActionable', 'not a reminder type'),
    };
    const triggerLabel: Record<keyof Draft['triggers'], [string, string]> = {
        interview: ['careeros.proactive.trigger.interview', 'Upcoming interview'],
        followUp: ['careeros.proactive.trigger.followUp', 'Follow-up date reached'],
        staleImport: ['careeros.proactive.trigger.staleImport', 'Imported facts waiting for review'],
        evidenceGap: ['careeros.proactive.trigger.evidenceGap', 'Evidence gap on an active application'],
    };

    if (loadError !== null) return <StatePanel kind={online ? 'error' : 'offline'} compact onRetry={() => setAttempt((n) => n + 1)} />;
    if (!prefs || !draft) {
        return (
            <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                <span className="sr-only">{t('label.loading', 'Loading')}</span>
                <Skeleton variant="title" width="40%" />
                <Skeleton variant="text" lines={3} />
            </div>
        );
    }

    const off = !draft.proactiveEnabled;
    const field = 'tap-target w-full rounded-xl border border-border-strong bg-surface-panel px-3 py-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60';

    return (
        <section aria-labelledby={`${ids}-title`} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <div className="flex flex-wrap items-center gap-2">
                <BellRing size={16} strokeWidth={2} className="text-content-muted" aria-hidden="true" />
                <h2 id={`${ids}-title`} className="text-base font-semibold text-content-primary">{t('careeros.proactive.title', 'Proactive assistance')}</h2>
                <StatusChip label={prefs.proactiveEnabled ? t('careeros.proactive.on', 'On') : t('careeros.proactive.off', 'Off')} tone={prefs.proactiveEnabled ? 'success' : 'neutral'} announce />
            </div>
            <p className="mt-1 text-sm text-content-secondary">
                {t('careeros.proactive.consent', 'When on, CVBase turns meaningful changes in your own records — an interview coming up, a follow-up date, imported facts waiting for review — into at most a few reminders a day in your inbox. It only reads what is already in your account; nothing is sent anywhere outside CVBase.')}
            </p>
            <p className="mt-1 text-[13px] text-content-muted">
                {t('careeros.proactive.honest', 'Reminders are generated when you open CVBase or run this; background delivery is not enabled.')}
            </p>

            <label className="mt-4 flex items-center gap-3">
                <input type="checkbox" className="tap-target h-5 w-5 accent-action-primary" checked={draft.proactiveEnabled} onChange={(e) => set('proactiveEnabled', e.target.checked)} />
                <span className="text-sm font-semibold text-content-primary">{t('careeros.proactive.enable', 'Turn on proactive reminders')}</span>
            </label>
            {prefs.consentAt && <p className="mt-1 text-xs text-content-muted">{t('careeros.proactive.consentedAt', 'Consent recorded {date}').replace('{date}', new Date(prefs.consentAt).toLocaleString())}</p>}

            <fieldset disabled={off} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-describedby={off ? `${ids}-off` : undefined}>
                <legend className="sr-only">{t('careeros.proactive.settings', 'Reminder settings')}</legend>
                {off && <p id={`${ids}-off`} className="text-[13px] text-content-muted sm:col-span-2">{t('careeros.proactive.disabledHint', 'Turn reminders on to edit these settings. Today stays fully usable without them.')}</p>}
                <div>
                    <label htmlFor={`${ids}-tz`} className="block text-[13px] font-semibold text-content-primary">{t('careeros.proactive.timeZone', 'Time zone')}</label>
                    <select id={`${ids}-tz`} className={`${field} mt-1`} value={draft.timeZone} onChange={(e) => set('timeZone', e.target.value)}>
                        {!zones.includes(draft.timeZone) && <option value={draft.timeZone}>{draft.timeZone}</option>}
                        {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${ids}-cap`} className="block text-[13px] font-semibold text-content-primary">{t('careeros.proactive.cap', 'Daily cap (0–20)')}</label>
                    <input id={`${ids}-cap`} type="number" min={0} max={20} step={1} className={`${field} mt-1`} value={draft.dailyActionCap} onChange={(e) => set('dailyActionCap', Math.max(0, Math.min(20, Number(e.target.value) || 0)))} />
                </div>
                <div className="sm:col-span-2">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" className="tap-target h-5 w-5 accent-action-primary" checked={draft.quietEnabled} onChange={(e) => set('quietEnabled', e.target.checked)} />
                        <span className="text-[13px] font-semibold text-content-primary">{t('careeros.proactive.quietHours', 'Quiet hours')}</span>
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor={`${ids}-qs`} className="block text-xs text-content-secondary">{t('careeros.proactive.quietStart', 'From')}</label>
                            <input id={`${ids}-qs`} type="time" className={`${field} mt-1`} value={draft.quietStart} disabled={off || !draft.quietEnabled} onChange={(e) => set('quietStart', e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor={`${ids}-qe`} className="block text-xs text-content-secondary">{t('careeros.proactive.quietEnd', 'Until')}</label>
                            <input id={`${ids}-qe`} type="time" className={`${field} mt-1`} value={draft.quietEnd} disabled={off || !draft.quietEnabled} onChange={(e) => set('quietEnd', e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <p className="text-[13px] font-semibold text-content-primary">{t('careeros.proactive.triggers', 'Remind me about')}</p>
                    <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {TRIGGER_KEYS.map((key) => (
                            <li key={key}>
                                <label className="flex items-center gap-3">
                                    <input type="checkbox" className="tap-target h-5 w-5 accent-action-primary" checked={draft.triggers[key]} onChange={(e) => set('triggers', { ...draft.triggers, [key]: e.target.checked })} />
                                    <span className="text-sm text-content-primary">{t(triggerLabel[key][0], triggerLabel[key][1])}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            </fieldset>

            {saveError !== null && <FailureNotice error={saveError} className="mt-4" onReload={() => { void load(); }} onRetry={() => { void save(); }} onDismiss={() => setSaveError(null)} />}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="primary" icon={<Save size={14} strokeWidth={2} />} loading={saving} disabled={!dirty || !online} onClick={() => { void save(); }}>{t('btn.save', 'Save')}</Button>
                <Button variant="secondary" icon={<Play size={14} strokeWidth={2} />} loading={running} disabled={!prefs.proactiveEnabled || dirty || !online} onClick={() => { void run(); }}>{t('careeros.proactive.runNow', 'Run reminders now')}</Button>
                {saved && <span role="status" className="text-[13px] text-status-success">{t('careeros.proactive.saved', 'Saved')}</span>}
                {dirty && <span className="text-xs text-content-muted">{t('careeros.proactive.saveFirst', 'Save your changes before running.')}</span>}
            </div>
            {prefs.lastProactiveRunAt && <p className="mt-2 text-xs text-content-muted">{t('careeros.proactive.lastRun', 'Last run {date}').replace('{date}', new Date(prefs.lastProactiveRunAt).toLocaleString())}</p>}

            {runError !== null && <FailureNotice error={runError} className="mt-4" title={t('careeros.proactive.runFailed', 'The run could not complete')} onReload={() => { void load(); }} onRetry={() => { void run(); }} onDismiss={() => setRunError(null)} />}
            {summary && (
                <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-border-default bg-surface-canvas p-4">
                    <p className="text-sm font-semibold text-content-primary">
                        {summary.quietHours
                            ? t('careeros.proactive.summaryQuiet', 'Quiet hours — nothing was created.')
                            : t('careeros.proactive.summary', '{created} reminder(s) created from {candidates} candidate(s).').replace('{created}', String(summary.created)).replace('{candidates}', String(summary.candidates))}
                    </p>
                    {summary.quietHours && summary.nextEligibleAt && (
                        <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.proactive.nextEligible', 'Next eligible time: {date}').replace('{date}', new Date(summary.nextEligibleAt).toLocaleString(undefined, { timeZone: draft.timeZone }))}</p>
                    )}
                    {summary.duplicates > 0 && <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.proactive.duplicates', '{count} already existed and were left alone.').replace('{count}', String(summary.duplicates))}</p>}
                    {Object.keys(summary.skipped).length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('careeros.proactive.skippedLabel', 'Skipped')}>
                            {(Object.entries(summary.skipped) as Array<[SkipReason, number]>).map(([reason, count]) => (
                                <li key={reason}><Pill>{count} · {skipLabel[reason]}</Pill></li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-2 text-xs text-content-muted">{t('careeros.proactive.policy', 'Policy {version}').replace('{version}', summary.policyVersion)}</p>
                </div>
            )}
        </section>
    );
};

export default ProactiveSettings;
