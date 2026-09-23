#!/usr/bin/env python3
"""Render Career OS Mermaid sources and record hashes for stale-output checks.

Requires mmdc on PATH. PUPPETEER_EXECUTABLE_PATH can select an installed browser.
No application dependencies are installed or modified by this script.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRAPH_DIR = ROOT / 'docs/career-os/graphs'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    renderer = shutil.which('mmdc')
    if not renderer:
        print('mmdc is required; use an external Mermaid CLI installation, not an application dependency.', file=sys.stderr)
        return 1
    config = GRAPH_DIR / 'mermaid-config.json'
    version = subprocess.check_output([renderer, '--version'], text=True).strip()
    sources = sorted(GRAPH_DIR.glob('*.mmd'))
    manifest = {'renderer': 'Mermaid CLI', 'version': version, 'config_sha256': digest(config), 'graphs': {}}
    logs = []
    for source in sources:
        output = source.with_suffix('.svg')
        result = subprocess.run([renderer, '-i', str(source), '-o', str(output), '-c', str(config), '-b', 'white'], capture_output=True, text=True)
        logs.append(f'{source.name}: exit {result.returncode}\n{result.stdout}{result.stderr}')
        if result.returncode != 0 or not output.exists() or output.stat().st_size == 0:
            print(logs[-1], file=sys.stderr)
            return 1
        manifest['graphs'][source.name] = {'source_sha256': digest(source), 'svg_sha256': digest(output)}
        print(f'PASS {source.name} → {output.name}')
    (GRAPH_DIR / 'render-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (ROOT / 'docs/career-os/evidence/diagram-render.log').write_text('\n'.join(logs))
    print(f'Rendered {len(sources)} graphs using Mermaid CLI {version}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
