# COS-035 / COS-036 / COS-037 — Frontier logic (outcome learning, scenarios, proactive assistance)

21 September 2026 · Pure modules under `services/careerOs/frontier/` with unit tests and a held-out evaluation harness. No model calls; no scheduler introduced. UI entry points live in Today (insights), Career → Goals (scenario comparison) and Settings (proactive preferences + run) — see the space evidence.

## Outcome learning — `outcomeInsights.ts` (REQ-09)

* `computeInsights({ now, applications, outcomes, analyses, opportunities, observationDays = 21 })` returns descriptive statements only: response rate over applications whose observation window has elapsed, interviews by qualification-fit coverage, and unknown outcomes worth recording. Every insight carries `sampleSize`, `denominator`, `missingOutcomes`, `observationWindow`, `sourceRefs` (the exact application ids) and `policyVersion`.
* Unknown outcomes are counted as unknown, never as rejections; samples below five are labelled "Too few … to generalise"; every fit statement ends with "This is an observation, not a cause".
* Corrections: `effectiveOutcomes` drops any observation superseded by a `correction`/later row, so recomputing after a correction or a revoked source is a pure re-run.
* `derivePolicy` promotes a tie-breaking preference (supported ratio ≥ 0.6) only when ≥ 5 interviews are observed; otherwise the deterministic baseline ordering is kept and the basis says why. `compareOrderings` provides the offline baseline-vs-policy diff. `skillAdjustmentForOutcome` always returns `null` — a rejection never lowers a skill.

## Scenario comparison — `scenarios.ts` (REQ-11)

* `compareScenario(scenario, { goals, opportunities, applications }, goal, now)` resolves each option's inputs from owned records first (`recorded`), then user assumptions (`assumed`), else `unknown`. Unknown inputs are excluded from the weighted score and listed per option; different currencies drop compensation from the score with a caveat; annualisation only when the period is known.
* Output: ranking with recorded/assumed/unknown input lists, per-dimension tradeoffs (better/worse/unknown), sensitivity (does doubling or removing a priority change the top option), and caveats ("Scores compare only the inputs you provided or recorded; they are not predictions of outcomes." / "No market or salary data was used.").

## Proactive assistance — `proactive.ts` (REQ-10)

* `planProactiveRun({ now, preferences, candidates, existingActions, existingNotifications, createdTodayCount })` returns the reminders to create and every skip with its reason (`disabled`, `quiet_hours`, `cap`, `dismissed`, `duplicate`, `trigger_off`, `not_actionable`).
* Consent gate (`proactiveEnabled && consentAt`), quiet hours evaluated in the user's IANA zone (DST-safe via `Intl`), daily cap, per-trigger toggles, dismissed/completed actions never resurface, dedupe key `proactive:<action dedupe key>` makes a repeated run a no-op, and a reminder whose recorded deadline has passed says "This reminder is late: it was due …" instead of pretending timely delivery. Deadlines come only from recorded interview/follow-up dates (`ranking.deadlineAt`), never inferred.
* No background scheduler: reminders are generated when the user opens CVBase or runs them from Settings; this is stated in the UI. A durable server scheduler remains future work justified only for disconnected delivery.

## Tests and evaluation

* `services/careerOs/frontier/__tests__/frontier.test.ts` — 13 tests (sparse/confounded/corrected outcomes, small-sample labelling, no causal wording, no skill adjustment, scenario unknowns/assumptions/currency mismatch/sensitivity, quiet hours wrapping midnight and DST, consent, triggers, cap, dedupe, lateness, idempotent repeated run).
* `services/careerOs/frontier/__tests__/evaluation.test.ts` — 16 tests over the held-out rubric cases in `evaluation.ts`; report written by `npx tsx scripts/career-os-eval.ts` to [heldout-eval-report.json](heldout-eval-report.json) (rubric `heldout-rubric-1.0.0`, test set `heldout-cases-2026-09-21`, deterministic engines only, 15/15 pass across goal fit ×4, qualification truth ×2, prioritisation ×3, scenario tradeoff ×2, uncertainty ×2, adversarial ×2).
* Live-model human review (G8 usefulness) is not claimed by these results; see COS-040 evidence for the gate verdict.
