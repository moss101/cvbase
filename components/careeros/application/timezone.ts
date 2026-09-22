/**
 * Interview times are recorded as an instant plus the IANA zone the person
 * chose (REQ-20). These helpers convert between the wall-clock value of a
 * `datetime-local` input in that zone and the stored ISO instant, using only
 * Intl — no guessing when a zone is unknown to the runtime.
 */
const FALLBACK_ZONES = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo',
    'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Africa/Johannesburg',
];

export function supportedTimeZones(): string[] {
    try {
        const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
        const zones = intl.supportedValuesOf?.('timeZone');
        if (Array.isArray(zones) && zones.length > 0) return zones;
    } catch { /* fall through */ }
    return FALLBACK_ZONES;
}

export function localTimeZone(): string {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

function partsIn(date: Date, timeZone: string): Record<string, number> {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const out: Record<string, number> = {};
    for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value);
    if (out.hour === 24) out.hour = 0;
    return out;
}

/** Offset (ms) of `timeZone` from UTC at `date`. */
export function zoneOffsetMs(timeZone: string, date: Date): number {
    const p = partsIn(date, timeZone);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** `YYYY-MM-DDTHH:mm` wall time in `timeZone` → ISO instant, or null when unparsable. */
export function wallTimeToIso(wall: string, timeZone: string): string | null {
    const m = wall.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    const [, y, mo, d, h, mi] = m.map(Number);
    const naive = Date.UTC(y, mo - 1, d, h, mi);
    try {
        let guess = naive - zoneOffsetMs(timeZone, new Date(naive));
        const again = zoneOffsetMs(timeZone, new Date(guess));
        if (naive - again !== guess) guess = naive - again;
        return new Date(guess).toISOString();
    } catch {
        return null;
    }
}

/** ISO instant → `YYYY-MM-DDTHH:mm` wall time in `timeZone` (for a datetime-local input). */
export function isoToWallTime(iso: string, timeZone: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    try {
        const p = partsIn(date, timeZone);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
    } catch {
        return date.toISOString().slice(0, 16);
    }
}
