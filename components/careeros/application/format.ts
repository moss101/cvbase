/**
 * Small formatting helpers shared by the execution screens. Dates are shown
 * in the viewer's locale; an unparsable value is returned untouched rather
 * than replaced with a guess.
 */
export function formatDate(iso: string | null | undefined, locale?: string, withTime = false): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    try {
        return new Intl.DateTimeFormat(locale, withTime
            ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
            : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    } catch {
        return date.toDateString();
    }
}

/** A scheduled time rendered in the zone it was recorded in (never silently converted). */
export function formatInZone(iso: string | null | undefined, timeZone: string | null | undefined, locale?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    try {
        return new Intl.DateTimeFormat(locale, {
            day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
            ...(timeZone ? { timeZone } : {}),
        }).format(date);
    } catch {
        return `${formatDate(iso, locale, true)}${timeZone ? ` (${timeZone})` : ''}`;
    }
}

/** YYYY-MM-DD for a date input, in local time. */
export function todayIsoDate(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Interpolate `{name}` placeholders in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((out, [key, value]) => out.split(`{${key}}`).join(String(value)), template);
}

export const clip = (value: string, max = 160): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
