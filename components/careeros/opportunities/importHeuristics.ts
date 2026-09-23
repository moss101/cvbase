/**
 * Best-effort title/company/location guesses from the first lines of a
 * pasted listing. Every guess lands in an editable field; nothing here is
 * persisted without the person seeing it first.
 */
export interface ImportGuess {
    title: string;
    company: string;
    location: string;
    remoteType: 'remote' | 'hybrid' | 'onsite' | null;
}

const LABELLED = /^(job title|title|role|position)\s*[:\-–]\s*(.+)$/i;
const COMPANY_LABEL = /^(company|employer|organisation|organization|hiring company)\s*[:\-–]\s*(.+)$/i;
const LOCATION_LABEL = /^(location|based in|office)\s*[:\-–]\s*(.+)$/i;
const TITLE_AT_COMPANY = /^(.{3,80}?)\s+(?:at|@)\s+([A-Z][^,|–\-]{1,60})$/;
const TITLE_SEP_COMPANY = /^(.{3,80}?)\s+[|–\-]\s+([^|–\-]{2,60})$/;
const HIRING = /^(.{2,60}?)\s+is\s+(?:hiring|looking for)\s+(?:an?\s+)?(.{3,80})$/i;
const TITLE_WORDS = /\b(engineer|developer|manager|designer|analyst|nurse|director|lead|specialist|consultant|scientist|architect|coordinator|assistant|officer|head|associate|intern|teacher|accountant|administrator|technician|therapist|writer|editor|marketer|recruiter|representative|executive|vp|president)\b/i;

const clean = (value: string): string => value.replace(/\s+/g, ' ').replace(/[\s:;,.\-–|]+$/g, '').trim();

export function guessFromListing(text: string): ImportGuess {
    const lines = (text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);
    const guess: ImportGuess = { title: '', company: '', location: '', remoteType: null };
    const lower = (text || '').toLowerCase();
    if (/\bfully remote\b|\bremote[- ]first\b|\b100% remote\b|\bwork from anywhere\b/.test(lower)) guess.remoteType = 'remote';
    else if (/\bhybrid\b/.test(lower)) guess.remoteType = 'hybrid';
    else if (/\bon[- ]site\b|\bin[- ]office\b/.test(lower)) guess.remoteType = 'onsite';
    else if (/\bremote\b/.test(lower)) guess.remoteType = 'remote';

    for (const line of lines) {
        const labelled = line.match(LABELLED);
        if (labelled && !guess.title) { guess.title = clean(labelled[2]); continue; }
        const company = line.match(COMPANY_LABEL);
        if (company && !guess.company) { guess.company = clean(company[2]); continue; }
        const location = line.match(LOCATION_LABEL);
        if (location && !guess.location) { guess.location = clean(location[2]); continue; }
    }

    if (!guess.title) {
        for (const line of lines) {
            if (line.length > 120) continue;
            const hiring = line.match(HIRING);
            if (hiring) { guess.company = guess.company || clean(hiring[1]); guess.title = clean(hiring[2]); break; }
            const atCompany = line.match(TITLE_AT_COMPANY);
            if (atCompany) { guess.title = clean(atCompany[1]); guess.company = guess.company || clean(atCompany[2]); break; }
            const sep = line.match(TITLE_SEP_COMPANY);
            if (sep && TITLE_WORDS.test(sep[1])) { guess.title = clean(sep[1]); guess.company = guess.company || clean(sep[2]); break; }
            if (TITLE_WORDS.test(line) && line.length <= 80) { guess.title = clean(line); break; }
        }
    }
    if (!guess.title && lines[0] && lines[0].length <= 100) guess.title = clean(lines[0]);
    if (!guess.company && lines[1] && lines[1].length <= 60 && !TITLE_WORDS.test(lines[1]) && !/[.!?]$/.test(lines[1])) {
        guess.company = clean(lines[1].replace(/^(at|@)\s+/i, ''));
    }
    return guess;
}
