/**
 * Qualification and career-direction fit (COS-020), pure and versioned.
 *
 * Qualification fit decomposes a listing's requirements into supported /
 * partial / missing / unknown against the user's facts, citing the evidence.
 * Direction fit compares the opportunity with the goal's explicit fields,
 * priorities and constraints. Unknown stays unknown: missing pay is never
 * guessed, and nothing here is a probability of being hired.
 */
import { extractSkills, normalizeSkillTerm } from '../skillTaxonomy';
import { factLabel, factsRevision } from './careerFacts';
import type { AnalysisInput } from './mappers';
import { fingerprint, fnv1a64Hex, normaliseText, stripHtml, tokenise } from './util';
import type {
  CareerFact, CareerGoal, ConfirmationState, DirectionFactor, DirectionFit, FitRequirement, GoalConstraint, Opportunity,
  OpportunityAnalysis, OpportunityRequirement, QualificationFit,
} from './types';

export const FIT_ENGINE_VERSION = 'fit-1.0.0';
export const MAX_REQUIREMENTS = 40;

// ---------------------------------------------------------------------------
// Requirement extraction (deterministic line heuristics)
// ---------------------------------------------------------------------------

const REQUIRED_BLOCK_RE = /^(requirements?|qualifications?|must[- ]haves?|what (you('ll)?|we) (need|require|expect)|minimum qualifications?|basic qualifications?|who you are|about you|skills? (required|needed)|essential)\b/i;
const PREFERRED_BLOCK_RE = /^(preferred( qualifications?)?|nice[- ]to[- ]haves?|bonus( points)?|plus(es)?|good to have|desirable|we'?d love)/i;
const OTHER_BLOCK_RE = /^(responsibilities|what you('ll)? (do|be doing)|your (role|mission)|duties|day[- ]to[- ]day|in this role|about (us|the (company|team|role))|benefits|perks|compensation|salary|how to apply|equal opportunit)/i;
const MUST_RE = /\b(must|required|essential|mandatory|minimum|at least|need to have)\b/i;
const NICE_RE = /\b(preferred|bonus|nice[- ]to[- ]have|a plus|plus:|desirable|ideally|advantage)\b/i;
const REQUIREMENT_HINT_RE = /\b(experience|proficien|knowledge|ability|able to|degree|certif|licen|years?|familiar|skills?|understanding|track record|background|fluent|expertise|qualified)\b/i;
const BULLET_RE = /^[\s•▪◦●\-–—*·>]+/;

/** Deterministic, capped list of requirement-like lines with a stable id per text. */
export function extractRequirements(capturedContent: string): OpportunityRequirement[] {
  const lines = (capturedContent || '').replace(/\r\n?/g, '\n').split('\n');
  const out: OpportunityRequirement[] = [];
  const seen = new Set<string>();
  let block: 'required' | 'preferred' | 'other' | 'none' = 'none';
  for (const raw of lines) {
    const bulleted = BULLET_RE.test(raw) && raw.trim().length > 1;
    const clean = raw.replace(BULLET_RE, '').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    // A section header is short, unbulleted and either ends with ':' or has few words.
    const headerLike = !bulleted && clean.length <= 60 && (clean.endsWith(':') || clean.split(' ').length <= 4);
    if (headerLike && REQUIRED_BLOCK_RE.test(clean)) { block = 'required'; continue; }
    if (headerLike && PREFERRED_BLOCK_RE.test(clean)) { block = 'preferred'; continue; }
    if (headerLike && OTHER_BLOCK_RE.test(clean)) { block = 'other'; continue; }
    if (clean.length < 8 || clean.length > 300) continue;
    const inReqBlock = block === 'required' || block === 'preferred';
    const looksLikeRequirement = (bulleted && inReqBlock) || (bulleted && REQUIREMENT_HINT_RE.test(clean) && block !== 'other')
      || (inReqBlock && REQUIREMENT_HINT_RE.test(clean)) || (block === 'none' && MUST_RE.test(clean) && REQUIREMENT_HINT_RE.test(clean));
    if (!looksLikeRequirement) continue;
    const norm = normaliseText(clean);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const kind: OpportunityRequirement['kind'] = MUST_RE.test(clean) || block === 'required'
      ? (NICE_RE.test(clean) && block !== 'required' ? 'nice' : 'must')
      : NICE_RE.test(clean) || block === 'preferred' ? 'nice' : 'unknown';
    out.push({ id: `req_${fnv1a64Hex(norm).slice(0, 12)}`, text: clean, kind });
    if (out.length >= MAX_REQUIREMENTS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Term extraction and matching
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'will', 'are', 'this', 'that', 'have', 'has', 'from', 'they', 'their',
  'who', 'what', 'when', 'where', 'how', 'all', 'can', 'job', 'role', 'work', 'working', 'team', 'teams', 'company',
  'experience', 'years', 'year', 'skills', 'skill', 'ability', 'able', 'strong', 'excellent', 'good', 'great', 'plus',
  'must', 'preferred', 'required', 'requirements', 'qualifications', 'including', 'etc', 'such', 'well', 'within',
  'across', 'into', 'about', 'other', 'more', 'most', 'new', 'use', 'using', 'used', 'help', 'per', 'via', 'each', 'than',
  'them', 'while', 'also', 'both', 'between', 'through', 'over', 'under', 'related', 'relevant', 'candidates', 'candidate',
  'position', 'opportunity', 'knowledge', 'understanding', 'familiarity', 'proficiency', 'demonstrated', 'least', 'minimum',
  'essential', 'mandatory', 'ideally', 'bonus', 'desirable', 'nice', 'have', 'need', 'needed', 'track', 'record', 'proven',
  'background', 'degree', 'equivalent', 'similar', 'environment', 'preferably', 'senior', 'junior', 'level', 'high',
  'would', 'should', 'could', 'been', 'being', 'some', 'any', 'very', 'many', 'much', 'ideal', 'like', 'want',
  'may', 'not', 'but', 'one', 'two', 'own', 'out', 'off', 'get', 'set', 'see', 'let', 'its', 'has', 'had', 'was', 'were',
  'his', 'her', 'she', 'him', 'yes', 'top', 'end', 'day', 'now', 'way', 'big', 'key',
]);

/** Light suffix stripping so "nurses"/"nurse" and "registered"/"register" compare equal. Applied to both sides. */
export function stem(token: string): string {
  let t = token;
  if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 5 && t.endsWith('ed')) t = t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  return t;
}

export interface Terms { skills: string[]; tokens: string[] }

/** Taxonomy skills plus meaningful free tokens (lowercase, deduplicated). */
export function extractTerms(textValue: string): Terms {
  const plain = stripHtml(textValue);
  const skills = Array.from(new Set(extractSkills(plain).map((s) => s.def.name.toLowerCase())));
  const tokens = Array.from(new Set(tokenise(plain).filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t)).map(stem)));
  return { skills, tokens };
}

const CONFIRMATION_RANK: Record<ConfirmationState, number> = { verified: 3, user_confirmed: 2, inferred: 1, incomplete: 0 };

function factTerms(fact: CareerFact): Terms {
  const payloadText = Object.values(fact.payload ?? {}).map((v) => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : '')).join(' ');
  const combined = [fact.title, fact.organization, stripHtml(fact.narrative), payloadText].join(' ');
  const terms = extractTerms(combined);
  if (fact.kind === 'skill') {
    const def = normalizeSkillTerm(fact.title);
    const own = def ? def.name.toLowerCase() : normaliseText(fact.title);
    if (own && !terms.skills.includes(own)) terms.skills.push(own);
  }
  return terms;
}

interface Coverage { fact: CareerFact; ratio: number; matched: string[] }

function coverage(req: Terms, fact: CareerFact, factT: Terms): Coverage | null {
  const key = req.skills.length > 0 ? req.skills : req.tokens;
  if (key.length === 0) return null;
  const haystackSkills = new Set(factT.skills);
  const haystackTokens = new Set(factT.tokens);
  const factSkillTitle = fact.kind === 'skill' ? normaliseText(fact.title) : '';
  const matched = key.filter((term) => haystackSkills.has(term) || haystackTokens.has(term) || (factSkillTitle !== '' && (factSkillTitle === term || factSkillTitle.includes(term))));
  if (matched.length === 0) return null;
  return { fact, ratio: matched.length / key.length, matched };
}

const FULL_THRESHOLD = 0.6;

/**
 * Supported: a verified/user_confirmed fact covers the requirement's key
 * terms. Partial: only inferred/incomplete facts cover it, or facts cover only
 * some terms. Missing: nothing matches any term. Unknown: no extractable terms.
 */
export function qualificationFit(requirements: OpportunityRequirement[], facts: CareerFact[]): QualificationFit {
  const fit: QualificationFit = { supported: [], partial: [], missing: [], unknown: [] };
  const active = facts.filter((f) => f.status === 'active');
  const factTermCache = active.map((f) => ({ fact: f, terms: factTerms(f) }));
  for (const req of requirements) {
    const terms = extractTerms(req.text);
    const entry: FitRequirement = { requirementId: req.id, text: req.text, state: 'unknown', evidence: [] };
    if (terms.skills.length === 0 && terms.tokens.length === 0) {
      entry.note = 'No checkable terms in this requirement.';
      fit.unknown.push(entry);
      continue;
    }
    const covers = factTermCache
      .map(({ fact, terms: ft }) => coverage(terms, fact, ft))
      .filter((c): c is Coverage => c !== null)
      .sort((a, b) => b.ratio - a.ratio || CONFIRMATION_RANK[b.fact.confirmationState] - CONFIRMATION_RANK[a.fact.confirmationState] || (a.fact.id < b.fact.id ? -1 : 1));
    if (covers.length === 0) {
      entry.state = 'missing';
      entry.note = `No fact mentions ${(terms.skills.length > 0 ? terms.skills : terms.tokens).slice(0, 3).join(', ')}.`;
      fit.missing.push(entry);
      continue;
    }
    const full = covers.filter((c) => c.ratio >= FULL_THRESHOLD);
    const confirmedFull = full.filter((c) => CONFIRMATION_RANK[c.fact.confirmationState] >= 2);
    entry.evidence = covers.slice(0, 5).map((c) => ({ factId: c.fact.id, label: factLabel(c.fact), confirmationState: c.fact.confirmationState }));
    if (confirmedFull.length > 0) {
      entry.state = 'supported';
      fit.supported.push(entry);
    } else {
      entry.state = 'partial';
      entry.note = full.length > 0 ? 'Covered only by unconfirmed facts; confirm them to count as supported.' : `Only ${covers[0].matched.join(', ')} matched.`;
      fit.partial.push(entry);
    }
  }
  return fit;
}

// ---------------------------------------------------------------------------
// Direction fit
// ---------------------------------------------------------------------------

const SENIORITY_RE = /\b(intern|internship|graduate|entry[- ]level|junior|jr\.?|associate|mid[- ]level|senior|sr\.?|lead|principal|staff|head of|director|vp|vice president|chief|executive)\b/i;

const overlapRatio = (a: string, b: string): number | null => {
  const at = new Set(tokenise(a).filter((t) => !STOPWORDS.has(t)).map(stem));
  const bt = new Set(tokenise(b).filter((t) => !STOPWORDS.has(t)).map(stem));
  if (at.size === 0 || bt.size === 0) return null;
  let hit = 0;
  for (const t of at) if (bt.has(t)) hit += 1;
  return hit / at.size;
};

const mentions = (haystack: string, needle: string): boolean => {
  const n = normaliseText(needle);
  return n !== '' && normaliseText(haystack).includes(n);
};

const weightFor = (goal: CareerGoal, key: DirectionFactor['key']): number | undefined =>
  goal.priorities.find((p) => p.key === key)?.weight;

function factor(goal: CareerGoal, key: DirectionFactor['key'], label: string, verdict: DirectionFactor['verdict'], detail: string): DirectionFactor {
  const weight = weightFor(goal, key);
  return { key, label, verdict, detail, ...(weight !== undefined ? { weight } : {}) };
}

function evaluateConstraint(c: GoalConstraint, opp: Opportunity): DirectionFit['constraints'][number] {
  const base = { constraintId: c.id, text: c.text, kind: c.kind };
  const value = c.value === undefined || c.value === null ? '' : String(c.value);
  switch (c.field) {
    case 'location': {
      if (!opp.location) return { ...base, verdict: 'unknown', detail: 'Listing location not stated.' };
      if (opp.remoteType === 'remote') return { ...base, verdict: 'met', detail: 'Remote role; location constraint does not bind.' };
      return mentions(opp.location, value) || mentions(value, opp.location)
        ? { ...base, verdict: 'met', detail: `Listing location "${opp.location}" matches.` }
        : { ...base, verdict: 'broken', detail: `Listing location "${opp.location}" is not "${value}".` };
    }
    case 'remote': {
      if (!opp.remoteType) return { ...base, verdict: 'unknown', detail: 'Remote arrangement not stated.' };
      const want = normaliseText(value);
      if (want === 'any' || want === '') return { ...base, verdict: 'met', detail: 'Any arrangement accepted.' };
      return opp.remoteType === want
        ? { ...base, verdict: 'met', detail: `Listing is ${opp.remoteType}.` }
        : { ...base, verdict: 'broken', detail: `Listing is ${opp.remoteType}, constraint asks for ${want}.` };
    }
    case 'compMin': {
      const min = typeof c.value === 'number' ? c.value : Number(value);
      if (!Number.isFinite(min)) return { ...base, verdict: 'unknown', detail: 'Constraint has no numeric minimum.' };
      const top = opp.compMax ?? opp.compMin;
      if (top === null) return { ...base, verdict: 'unknown', detail: 'Pay not stated.' };
      return top >= min
        ? { ...base, verdict: 'met', detail: `Stated pay up to ${top} meets ${min}.` }
        : { ...base, verdict: 'broken', detail: `Stated pay up to ${top} is below ${min}.` };
    }
    case 'employer': {
      if (!opp.company) return { ...base, verdict: 'unknown', detail: 'Employer not stated.' };
      return mentions(opp.company, value) || mentions(value, opp.company)
        ? { ...base, verdict: 'met', detail: `Employer "${opp.company}" matches.` }
        : { ...base, verdict: 'broken', detail: `Employer "${opp.company}" is not "${value}".` };
    }
    case 'level': {
      const found = opp.title.match(SENIORITY_RE)?.[0];
      if (!found) return { ...base, verdict: 'unknown', detail: 'Level not stated in the title.' };
      return normaliseText(found) === normaliseText(value) || mentions(opp.title, value)
        ? { ...base, verdict: 'met', detail: `Title indicates ${found}.` }
        : { ...base, verdict: 'broken', detail: `Title indicates ${found}, constraint asks for ${value}.` };
    }
    case 'industry': {
      if (!opp.capturedContent) return { ...base, verdict: 'unknown', detail: 'No listing text to check the industry against.' };
      return mentions(opp.capturedContent, value)
        ? { ...base, verdict: 'met', detail: `Listing mentions ${value}.` }
        : { ...base, verdict: 'unknown', detail: `Listing does not mention ${value}.` };
    }
    default:
      return { ...base, verdict: 'unknown', detail: 'Not machine-checkable; review manually.' };
  }
}

/** Direction fit against the goal's explicit fields. Without a goal it is unavailable, not guessed. */
export function directionFit(opportunity: Opportunity, goal: CareerGoal | null): DirectionFit {
  if (!goal) return { factors: [], constraints: [], missing: ['goal'], unavailableReason: 'No goal is set, so direction fit cannot be evaluated.' };
  const factors: DirectionFactor[] = [];
  const missing: string[] = [];

  // Role / title
  if (!goal.role || !opportunity.title) {
    factors.push(factor(goal, 'role', 'Role', 'unknown', !goal.role ? 'Goal has no target role.' : 'Listing has no title.'));
    if (!opportunity.title) missing.push('title');
  } else {
    const ratio = overlapRatio(goal.role, opportunity.title);
    if (ratio === null) factors.push(factor(goal, 'role', 'Role', 'unknown', 'Not enough words to compare.'));
    else if (ratio >= 0.5 || mentions(opportunity.title, goal.role)) factors.push(factor(goal, 'role', 'Role', 'aligned', `"${opportunity.title}" matches your target role "${goal.role}".`));
    else factors.push(factor(goal, 'role', 'Role', 'tension', `"${opportunity.title}" differs from your target role "${goal.role}".`));
  }

  // Level
  if (goal.level) {
    const found = opportunity.title.match(SENIORITY_RE)?.[0];
    if (!found) factors.push(factor(goal, 'level', 'Level', 'unknown', 'Level not stated in the title.'));
    else if (mentions(found, goal.level) || mentions(goal.level, found)) factors.push(factor(goal, 'level', 'Level', 'aligned', `Title indicates ${found}.`));
    else factors.push(factor(goal, 'level', 'Level', 'tension', `Title indicates ${found}; your goal is ${goal.level}.`));
  }

  // Industry: absence of a mention is not evidence against.
  if (goal.industry) {
    if (!opportunity.capturedContent) { factors.push(factor(goal, 'industry', 'Industry', 'unknown', 'No listing text to check the industry against.')); missing.push('industry'); }
    else if (mentions(`${opportunity.capturedContent} ${opportunity.company}`, goal.industry)) factors.push(factor(goal, 'industry', 'Industry', 'aligned', `Listing mentions ${goal.industry}.`));
    else factors.push(factor(goal, 'industry', 'Industry', 'unknown', `Listing does not mention ${goal.industry}.`));
  }

  // Location
  if (!goal.location || !opportunity.location) {
    factors.push(factor(goal, 'location', 'Location', 'unknown', !goal.location ? 'Goal has no location.' : 'Listing location not stated.'));
    if (!opportunity.location) missing.push('location');
  } else if (opportunity.remoteType === 'remote') {
    factors.push(factor(goal, 'location', 'Location', 'aligned', 'Remote role; location is not a constraint.'));
  } else if (mentions(opportunity.location, goal.location) || mentions(goal.location, opportunity.location)) {
    factors.push(factor(goal, 'location', 'Location', 'aligned', `${opportunity.location} matches ${goal.location}.`));
  } else {
    factors.push(factor(goal, 'location', 'Location', 'tension', `${opportunity.location} is not ${goal.location}.`));
  }

  // Remote preference (flexibility)
  if (!goal.remotePreference || !opportunity.remoteType) {
    factors.push(factor(goal, 'flexibility', 'Remote preference', 'unknown', !goal.remotePreference ? 'Goal has no remote preference.' : 'Remote arrangement not stated.'));
    if (!opportunity.remoteType) missing.push('remoteType');
  } else if (goal.remotePreference === 'any' || goal.remotePreference === opportunity.remoteType) {
    factors.push(factor(goal, 'flexibility', 'Remote preference', 'aligned', `Listing is ${opportunity.remoteType}.`));
  } else {
    factors.push(factor(goal, 'flexibility', 'Remote preference', 'tension', `Listing is ${opportunity.remoteType}; you prefer ${goal.remotePreference}.`));
  }

  // Compensation: never guessed.
  if (opportunity.compMin === null && opportunity.compMax === null) {
    factors.push(factor(goal, 'compensation', 'Compensation', 'unknown', 'Pay not stated.'));
    missing.push('compensation');
  } else if (goal.compMin === null && goal.compMax === null) {
    factors.push(factor(goal, 'compensation', 'Compensation', 'unknown', 'Goal has no pay range.'));
  } else if (goal.compCurrency && opportunity.compCurrency && goal.compCurrency !== opportunity.compCurrency) {
    factors.push(factor(goal, 'compensation', 'Compensation', 'unknown', `Listing pays in ${opportunity.compCurrency}; goal is in ${goal.compCurrency}.`));
  } else if (goal.compPeriod && opportunity.compPeriod && goal.compPeriod !== opportunity.compPeriod) {
    factors.push(factor(goal, 'compensation', 'Compensation', 'unknown', `Listing pay is per ${opportunity.compPeriod}; goal is per ${goal.compPeriod}.`));
  } else if (!opportunity.compCurrency || !opportunity.compPeriod) {
    factors.push(factor(goal, 'compensation', 'Compensation', 'unknown', 'Listing pay has no currency or period.'));
  } else {
    const top = opportunity.compMax ?? opportunity.compMin!;
    const floor = goal.compMin ?? goal.compMax!;
    factors.push(top >= floor
      ? factor(goal, 'compensation', 'Compensation', 'aligned', `Stated pay up to ${top} ${opportunity.compCurrency}/${opportunity.compPeriod} meets your ${floor}.`)
      : factor(goal, 'compensation', 'Compensation', 'tension', `Stated pay up to ${top} ${opportunity.compCurrency}/${opportunity.compPeriod} is below your ${floor}.`));
  }

  // Target employers
  if (goal.targetEmployers.length > 0) {
    const hit = goal.targetEmployers.find((e) => mentions(opportunity.company, e) || mentions(e, opportunity.company));
    factors.push(hit
      ? factor(goal, 'employer', 'Target employer', 'aligned', `${opportunity.company} is on your target list.`)
      : factor(goal, 'employer', 'Target employer', 'tension', `${opportunity.company || 'This employer'} is not on your target list.`));
  }

  const constraints = goal.constraints.map((c) => evaluateConstraint(c, opportunity));
  return { factors, constraints, missing: Array.from(new Set(missing)) };
}

/** The first broken HARD constraint, with its text as the inspectable reason. */
export function hiddenByConstraint(direction: DirectionFit): OpportunityAnalysis['hiddenByConstraint'] {
  const broken = direction.constraints.find((c) => c.kind === 'hard' && c.verdict === 'broken');
  return broken ? { constraintId: broken.constraintId, text: `${broken.text} — ${broken.detail}` } : null;
}

// ---------------------------------------------------------------------------
// Analysis assembly and staleness
// ---------------------------------------------------------------------------

export interface BuildAnalysisInput {
  opportunity: Opportunity;
  goal: CareerGoal | null;
  facts: CareerFact[];
  atsScore?: number | null;
  applicationId?: string | null;
  now?: Date;
}

/** A persistable analysis recording every input revision it was computed from. */
/** The listing inputs a fit depends on: text, requirement ids and the direction-relevant fields. */
export function analysisInputFingerprint(o: Pick<Opportunity, 'capturedContent' | 'requirements' | 'title' | 'company' | 'location' | 'remoteType' | 'compMin' | 'compMax' | 'compCurrency' | 'compPeriod'>): string {
  const reqs = o.requirements.length > 0 ? o.requirements.map((r) => r.id).join(',') : extractRequirements(o.capturedContent).map((r) => r.id).join(',');
  return fingerprint([o.capturedContent, reqs, o.title, o.company, o.location, o.remoteType ?? '', o.compMin ?? '', o.compMax ?? '', o.compCurrency ?? '', o.compPeriod ?? ''].join('\u0001'));
}

export function buildAnalysis(input: BuildAnalysisInput): AnalysisInput {
  const requirements = input.opportunity.requirements.length > 0 ? input.opportunity.requirements : extractRequirements(input.opportunity.capturedContent);
  const direction = directionFit(input.opportunity, input.goal);
  return {
    opportunityId: input.opportunity.id,
    goalId: input.goal?.id ?? null,
    applicationId: input.applicationId ?? null,
    opportunityRevision: input.opportunity.revision,
    goalRevision: input.goal?.revision ?? null,
    factsRevision: factsRevision(input.facts),
    inputFingerprint: analysisInputFingerprint(input.opportunity),
    engineVersion: FIT_ENGINE_VERSION,
    qualification: qualificationFit(requirements, input.facts),
    direction,
    atsScore: typeof input.atsScore === 'number' && Number.isFinite(input.atsScore) ? input.atsScore : null,
    hiddenByConstraint: hiddenByConstraint(direction),
    stale: false,
    computedAt: (input.now ?? new Date()).toISOString(),
  };
}

export interface StaleCheck { opportunity: Pick<Opportunity, 'id' | 'revision'> & Partial<Parameters<typeof analysisInputFingerprint>[0]>; goal: Pick<CareerGoal, 'id' | 'revision'> | null; factsRevision: string }

/**
 * Stale when any recorded input (or the engine version) differs from the
 * current one. For the opportunity, the listing-input fingerprint decides
 * when it was recorded; a bare revision bump (status, bookkeeping) is not a
 * material change. Rows without a fingerprint fall back to the revision.
 */
export function isAnalysisStale(analysis: OpportunityAnalysis | AnalysisInput, current: StaleCheck): boolean {
  if (analysis.stale) return true;
  if (analysis.engineVersion !== FIT_ENGINE_VERSION) return true;
  if (analysis.opportunityId !== current.opportunity.id) return true;
  const canFingerprint = typeof current.opportunity.capturedContent === 'string' && Array.isArray(current.opportunity.requirements);
  if (analysis.inputFingerprint && canFingerprint) {
    if (analysis.inputFingerprint !== analysisInputFingerprint(current.opportunity as Parameters<typeof analysisInputFingerprint>[0])) return true;
  } else if (analysis.opportunityRevision !== current.opportunity.revision) return true;
  if (current.goal) {
    if (analysis.goalId !== current.goal.id || analysis.goalRevision !== current.goal.revision) return true;
  } else if (analysis.goalId !== null) return true;
  return analysis.factsRevision !== current.factsRevision;
}
