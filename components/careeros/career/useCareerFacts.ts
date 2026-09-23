import { useCallback, useMemo } from 'react';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import { factsRevision, impactOfChange, type ChangeImpact } from '../../../services/careerOs/careerFacts';
import type { FactPatch } from '../../../services/careerOs/mappers';
import { ConflictError, type CareerFact, type FactKind, type FactReference, type FactVerification } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';

/**
 * Every Career screen reads the same fact list (all statuses, so reconciling
 * an import can honour deleted tombstones) and writes through the same
 * mutations, which emit the product events after the durable write and
 * invalidate the shared cache so Today, Evidence and the timeline agree.
 */

export const FACTS_KEY = 'facts';

export interface CareerFactsQuery extends OwnedQuery<CareerFact[]> {
    /** Active facts only (what the user sees as their career). */
    active: CareerFact[];
}

export const useCareerFacts = (): CareerFactsQuery => {
    const { userId } = useCareerOs();
    const query = useOwnedQuery<CareerFact[]>(userId, userId ? FACTS_KEY : null, () => factRepo.list(userId as string, { status: 'any' }));
    const active = useMemo(() => (query.data ?? []).filter((f) => f.status === 'active'), [query.data]);
    return { ...query, active };
};

/** The result of editing a fact that other artifacts depend on (COS-023). */
export interface EditImpact {
    fact: CareerFact;
    before: CareerFact;
    impact: ChangeImpact;
    references: FactReference[];
    /** Application artifacts flagged stale (never snapshots). */
    staleArtifacts: number;
    staleAnalyses: number;
}

/** Fields a person types in for a new fact; provenance is filled in here. */
export interface NewFactInput {
    kind: FactKind;
    title: string;
    organization?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    narrative?: string;
    payload?: CareerFact['payload'];
    parentFactId?: string | null;
    sortOrder?: number;
}

export interface FactMutations {
    /** A fact the user types in: confirmed by them, never verified, no fingerprint. */
    create: (input: NewFactInput) => Promise<CareerFact>;
    confirm: (fact: CareerFact) => Promise<CareerFact>;
    verify: (fact: CareerFact, verification: FactVerification) => Promise<CareerFact>;
    withdraw: (fact: CareerFact) => Promise<CareerFact>;
    remove: (fact: CareerFact) => Promise<CareerFact>;
    /** Update fields; when the fact is referenced, marks dependants stale and reports the impact. */
    edit: (fact: CareerFact, patch: FactPatch) => Promise<EditImpact>;
    resolveConflict: (groupId: string, winnerId: string) => Promise<void>;
    confirmAll: (facts: CareerFact[], resumeId?: string) => Promise<number>;
}

export const useFactMutations = (allFacts: CareerFact[] | null): FactMutations => {
    const { userId, profile, invalidate, refreshProfile } = useCareerOs();

    const requireUser = useCallback((): string => {
        if (!userId) throw new Error('signed_out');
        return userId;
    }, [userId]);

    const create = useCallback(async (input: NewFactInput) => {
        const uid = requireUser();
        const saved = await factRepo.create(uid, {
            kind: input.kind,
            title: input.title.trim(),
            organization: input.organization?.trim() ?? '',
            location: input.location?.trim() ?? '',
            startDate: input.startDate?.trim() ?? '',
            endDate: input.endDate?.trim() ?? '',
            narrative: input.narrative ?? '',
            payload: input.payload ?? {},
            parentFactId: input.parentFactId ?? null,
            confirmationState: input.title.trim() ? 'user_confirmed' : 'incomplete',
            verification: null,
            extractionConfidence: null,
            sourceKind: 'manual',
            sourceRef: {},
            sourceFingerprint: null,
            legacyId: null,
            conflictGroup: null,
            reviewState: 'reviewed',
            status: 'active',
            sortOrder: input.sortOrder ?? 0,
        });
        const eventName = saved.kind === 'achievement' ? 'career_achievement_updated' : 'career_evidence_confirmed';
        void emit(uid, buildEvent(eventName, { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, revision: saved.revision, change: 'created' } }));
        invalidate(FACTS_KEY);
        invalidate('today');
        return saved;
    }, [requireUser, invalidate]);

    const confirm = useCallback(async (fact: CareerFact) => {
        const uid = requireUser();
        const saved = await factRepo.confirm(uid, fact.id, fact.revision);
        void emit(uid, buildEvent('career_evidence_confirmed', { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, revision: saved.revision } }));
        invalidate(FACTS_KEY);
        invalidate('today');
        return saved;
    }, [requireUser, invalidate]);

    const verify = useCallback(async (fact: CareerFact, verification: FactVerification) => {
        const uid = requireUser();
        const saved = await factRepo.verify(uid, fact.id, fact.revision, verification);
        void emit(uid, buildEvent('career_evidence_confirmed', { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, revision: saved.revision, verified: true } }));
        invalidate(FACTS_KEY);
        invalidate('today');
        return saved;
    }, [requireUser, invalidate]);

    const withdraw = useCallback(async (fact: CareerFact) => {
        const uid = requireUser();
        const saved = await factRepo.withdraw(uid, fact.id, fact.revision);
        void emit(uid, buildEvent('career_claim_corrected', { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, change: 'withdrawn' } }));
        invalidate(FACTS_KEY);
        invalidate('today');
        return saved;
    }, [requireUser, invalidate]);

    const remove = useCallback(async (fact: CareerFact) => {
        const uid = requireUser();
        const saved = await factRepo.softDelete(uid, fact.id, fact.revision);
        void emit(uid, buildEvent('career_claim_corrected', { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, change: 'deleted' } }));
        invalidate(FACTS_KEY);
        invalidate('today');
        return saved;
    }, [requireUser, invalidate]);

    const edit = useCallback(async (fact: CareerFact, patch: FactPatch): Promise<EditImpact> => {
        const uid = requireUser();
        const references = await factRepo.listForFact(uid, fact.id);
        const saved = await factRepo.update(uid, fact.id, patch, fact.revision);
        const impact = impactOfChange(saved, references);
        let staleArtifacts = 0;
        let staleAnalyses = 0;
        if (impact.total > 0) {
            const artifactIds = impact.byKind.application_artifact ?? [];
            if (artifactIds.length > 0) {
                try { staleArtifacts = await artifactRepo.markStale(uid, artifactIds); } catch (err) { captureException(err, { context: 'career-impact-artifacts' }); }
            }
            const next = (allFacts ?? []).map((f) => (f.id === saved.id ? saved : f));
            const revision = factsRevision(next.length > 0 ? next : [saved]);
            try { staleAnalyses = await analysisRepo.markStaleForFacts(uid, revision); } catch (err) { captureException(err, { context: 'career-impact-analyses' }); }
            if (profile) {
                try {
                    await careerProfileRepo.setFactsRevision(uid, revision, profile.revision);
                    void refreshProfile();
                } catch (err) {
                    if (!(err instanceof ConflictError)) captureException(err, { context: 'career-facts-revision' });
                    else void refreshProfile();
                }
            }
        }
        const eventName = saved.kind === 'achievement' ? 'career_achievement_updated' : 'career_claim_corrected';
        void emit(uid, buildEvent(eventName, {
            subjectRefs: { fact: saved.id },
            payload: { kind: saved.kind, revision: saved.revision, affected: impact.total, change: 'edited' },
        }));
        invalidate(FACTS_KEY);
        invalidate('today');
        invalidate('references');
        return { fact: saved, before: fact, impact, references, staleArtifacts, staleAnalyses };
    }, [requireUser, allFacts, profile, refreshProfile, invalidate]);

    const resolveConflict = useCallback(async (groupId: string, winnerId: string) => {
        const uid = requireUser();
        const { winner } = await factRepo.resolveConflict(uid, groupId, winnerId);
        void emit(uid, buildEvent('career_claim_corrected', { subjectRefs: { fact: winner.id }, payload: { kind: winner.kind, change: 'conflict_resolved' } }));
        invalidate(FACTS_KEY);
        invalidate('today');
    }, [requireUser, invalidate]);

    const confirmAll = useCallback(async (facts: CareerFact[], resumeId?: string) => {
        const uid = requireUser();
        let count = 0;
        for (const fact of facts) {
            if (fact.reviewState !== 'candidate') continue;
            try {
                const saved = await factRepo.confirm(uid, fact.id, fact.revision);
                count += 1;
                void emit(uid, buildEvent('career_evidence_confirmed', { subjectRefs: { fact: saved.id }, payload: { kind: saved.kind, revision: saved.revision } }));
            } catch (err) {
                if (!(err instanceof ConflictError)) throw err;
            }
        }
        if (count > 0) {
            void emit(uid, buildEvent('career_import_reviewed', {
                subjectRefs: resumeId ? { resume: resumeId } : {},
                payload: { confirmed: count },
                dedupeKey: resumeId ? `career_import_reviewed:resume=${resumeId}:${count}` : null,
            }));
        }
        invalidate(FACTS_KEY);
        invalidate('today');
        return count;
    }, [requireUser, invalidate]);

    return useMemo(() => ({ create, confirm, verify, withdraw, remove, edit, resolveConflict, confirmAll }), [create, confirm, verify, withdraw, remove, edit, resolveConflict, confirmAll]);
};
