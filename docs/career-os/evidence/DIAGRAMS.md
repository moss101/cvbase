# Diagram validation evidence

20 September 2026. Seven Mermaid source files were rendered successfully to nonempty SVG outputs. The diagram-generator skill's `render_diagram.py` was run for initial syntax validation; the repository's `scripts/render_career_os_graphs.py` adds consistent styling and source/config/output hashes for maintenance.

Mermaid CLI was installed in an isolated temporary directory outside the repository; the application's package manifest and lockfile were not changed. Rendering used the installed Google Chrome executable through `PUPPETEER_EXECUTABLE_PATH`. The initial attempt using Puppeteer's reported cache path failed because that browser executable was absent; using the installed browser resolved it. No runtime feature or live AI was exercised by rendering.

See [render log](diagram-render.log) and [hash manifest](../graphs/render-manifest.json) for exact renderer version and outputs. Reproduce with `mmdc` available on PATH, optionally set `PUPPETEER_EXECUTABLE_PATH`, then run:

```bash
python3 scripts/render_career_os_graphs.py
python3 scripts/career_os_plan.py --check
```

The static graph viewer was opened in the Codex browser. Diagram selection, SVG display, zoom/fit and document link destinations were checked. The narrow layout displayed the navigation in two columns and stacked the graph below it. This is inspection of the planning artifact, not accessibility or mobile qualification of CVBase itself.
