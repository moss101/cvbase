# Repository verification baseline

20 September 2026 · commit `9d629cfe64d4ad4bec895f82dae1b100c55d8f32` · macOS arm64 · Node v26.5.1 · Deno 2.9.6

Initial working tree was clean. The project directory is `/Users/mohsin/projects/cvbase ` with a trailing space; quote it in shell commands. Commands below run from that directory. These checks audit existing code; they do not qualify proposed Career OS functionality.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Exit 0; TypeScript no-emit check passed |
| `npm test` | Exit 0; 27 test files, 254 tests passed; 1.79s reported duration |
| `npm run build` | Exit 0; Vite build completed in 4.81s; large-chunk warning remains |
| Deterministic Edge command below | Exit 0; 212 passed, 0 failed; 877ms reported test duration |

```bash
deno test --allow-env --node-modules-dir=none \
  supabase/functions/_shared/ \
  supabase/functions/admin/ \
  supabase/functions/health/ \
  supabase/functions/stripe-webhook/ \
  supabase/functions/stripe-checkout/ \
  supabase/functions/ai-suggest/ \
  supabase/functions/prism-tailor/
```

Logs: [build](build.log), [deterministic Edge tests](edge-tests.log), [plan consistency](plan-check.log). Frontend/typecheck results are transcribed from the captured command output in this task. Node reported experimental localStorage warnings and jsdom reported unimplemented `window.focus`; tests still passed. The build reported an html2pdf chunk of about 984.60 kB minified / 282.80 kB gzip. It is a lazy export chunk, not proof of initial-load latency.

Not run: live Supabase smoke scripts, live paid model evaluation, customer data migration, mobile builds/device tests, browser E2E, screen-reader/visual regression or performance tracing. CI also contains separate admin/health typecheck commands; those were not independently repeated in this audit. Deployed schema, flags, providers and production user experience remain UNKNOWN.

Planning validation additionally checks requirement/source coverage, acyclic task dependencies, source/evidence paths, generated view drift and local document links. Mermaid source is syntax-validated through actual rendering; rendered files are not runtime product screenshots.
