# CVBase Career OS implementation entry point

For Career OS work, start at [tasks.md](tasks.md), then the task's requirements in [PRD.md](PRD.md). Read its source files and inherited contract before editing. The supplied authority is preserved in [SOURCE_PRD.md](docs/career-os/SOURCE_PRD.md); current repository evidence is in [CURRENT_PRODUCT_MAP.md](docs/career-os/CURRENT_PRODUCT_MAP.md).

Search → map → reuse → recompose → extend only for a verified gap. Preserve the existing React/Vite/Supabase/Capacitor stack, CV/export engine, ATS, PRISM, authentication, billing and historical data. New application work extends `job_applications`. Do not infer that every capability described by the source PRD already exists.

Edit task state and dependencies in `docs/career-os/plan.json`; regenerate with `python3 scripts/career_os_plan.py --write` and validate with `--check`. When graph source/style changes, rerender with `python3 scripts/render_career_os_graphs.py` using an external Mermaid CLI installation. The checker detects stale renders. `--next` lists dependency-eligible work, not automatic implementation readiness. Do not mark tasks VERIFIED/QUALIFIED without actual results. Record discovered scope or dependency changes at the parent requirement before proceeding.

Runtime changes need relevant checks and evidence. This planning package does not deploy features, alter production data, change subscriptions or authorize external communications. Legacy retirement follows the release gate. Keep user instructions and task scope authoritative.
