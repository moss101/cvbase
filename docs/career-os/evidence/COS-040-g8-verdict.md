# COS-040 — Frontier intelligence held-out qualification (G8) — verdict

21 September 2026 · `npx tsx scripts/career-os-eval.ts` → [heldout-eval-report.json](heldout-eval-report.json); unit suites in `services/careerOs/frontier/__tests__/` (frontier 13, evaluation 16); gateway/coach/interview Deno suites. No model calls were made (no provider keys locally; live calls are opt-in and paid).

## Verdict: G8 PARTIAL — deterministic layer qualified, model-dependent usefulness not yet reviewed

| G8 dimension | Verdict | Basis |
| --- | --- | --- |
| Truth (evidence use) | PASS (deterministic) | QF-01/02, AD-01/02: only confirmed facts support a requirement; inferred is partial; withdrawn/deleted never count; injected JD instructions cannot mark anything supported. PRISM grounding/anti-echo suites retained. |
| Action integrity | PASS | Gateway live script: typed tools only, confirmation token invalidated by content change, receipts server-written, idempotent starts, wrong-owner 404, unknown tool 400. |
| Uncertainty | PASS | UN-01/02 and frontier tests: sample sizes, windows, unknowns never counted as rejections, small samples labelled, corrections supersede, no skill lowered by a rejection, policy promoted only at ≥ 5 interviews with a baseline comparison (`compareOrderings`). |
| Usefulness (human rubric) | NOT REVIEWED | Rubric `heldout-rubric-1.0.0` exists with 15 cases across 6 dimensions, but the human review of live model output (Coach answers, PRISM drafts, interview questions) has not been run — it needs an authorised, cost-capped live session and a reviewer. |
| Latency and cost by cohort | NOT MEASURED | No live model runs; cost caps and charge/release semantics verified structurally (COS-013/026) and on the failure path live (charged then released). |
| Consent | PASS | Proactive assistance requires `proactiveEnabled && consentAt`; quiet hours in the user's zone; daily cap; dismissed never resurfaces; no scheduler/no sending. |
| Optional connector claims | N/A | COS-038 no-go; no connector claims are made. |

## Policy promotion and rollback

Every promoted policy (`outcome-policy-1.0.0`) is a tie-break preference with a recorded basis, compared to the deterministic baseline ordering in the report, and reverts to baseline by clearing the derived insight (no schema change). No employment-probability or guaranteed-outcome field exists in any output (QF-02 asserts the analysis key set).

## To close G8

Run the held-out set against live models under a cost cap with a human reviewer scoring usefulness/truth per case and cohort; record p50/p95 latency and cost per action; keep the deterministic report as the regression baseline.
