#!/usr/bin/env python3
"""Small helper to update task records in docs/career-os/plan.json from the
command line, then regenerate the views. Usage:
  python3 scripts/career_os_plan_update.py COS-003 --status VERIFIED \
      --evidence docs/career-os/evidence/COS-003-schema-adr.md --note "..."
"""
from __future__ import annotations
import argparse, json, subprocess, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/career-os/plan.json'

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('task')
    p.add_argument('--status')
    p.add_argument('--evidence', action='append', default=[])
    p.add_argument('--note', action='append', default=[])
    p.add_argument('--blocker')
    p.add_argument('--add-dep', action='append', default=[])
    p.add_argument('--file', action='append', default=[], help='add to files (must exist)')
    p.add_argument('--no-write', action='store_true')
    a = p.parse_args()
    plan = json.loads(MANIFEST.read_text())
    task = next((t for t in plan['tasks'] if t['id'] == a.task), None)
    if not task:
        print(f'unknown task {a.task}', file=sys.stderr); return 1
    if a.status: task['status'] = a.status
    for e in a.evidence:
        if e not in task['evidence']: task['evidence'].append(e)
    for f in a.file:
        if f not in task['files']: task['files'].append(f)
    for d in a.add_dep:
        if d not in task['dependencies']: task['dependencies'].append(d)
    if a.blocker is not None: task['blocker'] = a.blocker or None
    notes = task.setdefault('work_notes', [])
    for n in a.note: notes.append(f'{date.today().isoformat()}: {n}')
    plan['updated'] = date.today().isoformat()
    MANIFEST.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + '\n')
    if not a.no_write:
        return subprocess.call([sys.executable, str(ROOT / 'scripts/career_os_plan.py'), '--write'])
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
