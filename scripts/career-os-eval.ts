/**
 * Runs the held-out frontier evaluation (services/careerOs/frontier/evaluation.ts)
 * and writes the versioned report used as COS-040 evidence.
 *   npx tsx scripts/career-os-eval.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEvaluation } from '../services/careerOs/frontier/evaluation';

const report = runEvaluation();
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/career-os/evidence/heldout-eval-report.json');
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed} passed, ${report.failed} failed · rubric ${report.rubricVersion} · set ${report.testSetVersion}`);
for (const f of report.failures) console.log(`FAIL ${f.id}: ${f.detail}`);
process.exit(report.failed ? 1 : 0);
