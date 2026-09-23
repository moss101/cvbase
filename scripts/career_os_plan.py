#!/usr/bin/env python3
"""Validate and generate the Career OS planning views. Standard library only."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs/career-os'
MANIFEST = DOCS / 'plan.json'
STATES = ('NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'IMPLEMENTED', 'VERIFIED', 'QUALIFIED')
DONE = {'VERIFIED', 'QUALIFIED'}


def fail(message: str) -> None:
    raise ValueError(message)


def validate(plan: dict) -> None:
    if plan.get('schema_version') != 1:
        fail('Unsupported plan schema_version')
    tasks = plan['tasks']
    by_id = {t['id']: t for t in tasks}
    if len(by_id) != len(tasks):
        fail('Duplicate task ID')
    reqs = {r['id']: r for r in plan['requirements']}
    if len(reqs) != len(plan['requirements']):
        fail('Duplicate requirement ID')
    required = ('title', 'owner', 'release', 'priority', 'kind', 'purpose',
                'existing_implementation', 'files', 'data_ownership', 'api_dependencies',
                'acceptance_criteria', 'tests', 'legacy_impact', 'events', 'requirements', 'workstreams')
    for t in tasks:
        if not re.fullmatch(r'COS-\d{3}', t['id']):
            fail(f"Invalid task ID: {t['id']}")
        for key in required:
            if not t.get(key):
                fail(f"{t['id']}: missing {key}")
        if t['status'] not in STATES:
            fail(f"{t['id']}: invalid status")
        if t['contract_profile'] not in plan['contract_profiles']:
            fail(f"{t['id']}: unknown contract profile")
        for key in ('ui_states', 'responsive', 'accessibility', 'analytics', 'evidence_required'):
            if not plan['contract_profiles'][t['contract_profile']].get(key):
                fail(f"{t['id']}: contract missing {key}")
        if len(set(t['dependencies'])) != len(t['dependencies']):
            fail(f"{t['id']}: duplicate dependency")
        for dep in t['dependencies']:
            if dep not in by_id or dep == t['id']:
                fail(f"{t['id']}: invalid dependency {dep}")
        for req in t['requirements']:
            if req not in reqs:
                fail(f"{t['id']}: unknown requirement {req}")
        for ws in t['workstreams']:
            if not re.fullmatch(r'WS-(0[0-9]|1[0-7])', ws):
                fail(f"{t['id']}: invalid source workstream {ws}")
        for filename in t['files'] + t['evidence']:
            path = ROOT / filename
            if not path.exists():
                fail(f"{t['id']}: path missing: {filename}; use proposed_paths for planned code")
            if filename in t['evidence'] and (not path.is_file() or path.stat().st_size == 0):
                fail(f"{t['id']}: evidence is empty/non-file: {filename}")
        for filename in t['proposed_paths']:
            if filename.startswith('/') or '..' in Path(filename).parts:
                fail(f"{t['id']}: invalid proposed path {filename}")
        if t['status'] == 'BLOCKED' and not t.get('blocker'):
            fail(f"{t['id']}: BLOCKED needs a specific blocker")
        if t['status'] in DONE:
            if not t['evidence']:
                fail(f"{t['id']}: {t['status']} needs evidence")
            for dep in t['dependencies']:
                if by_id[dep]['status'] not in DONE:
                    fail(f"{t['id']}: completed ahead of dependency {dep}")
    visiting, visited = set(), set()

    def visit(task_id: str) -> None:
        if task_id in visiting:
            fail(f'Dependency cycle at {task_id}')
        if task_id in visited:
            return
        visiting.add(task_id)
        for dep in by_id[task_id]['dependencies']:
            visit(dep)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in by_id:
        visit(task_id)
    covered = {r for t in tasks for r in t['requirements']}
    if set(reqs) != covered:
        fail(f'Unmapped requirements: {set(reqs) - covered}')
    source = (DOCS / 'SOURCE_PRD.md').read_text()
    sections = {int(s) for s in re.findall(r'^# (\d+)\.', source, re.M)}
    mapped = {s for r in reqs.values() for s in r['source_sections']}
    if sections != mapped:
        fail(f'Source section mapping mismatch: missing {sections - mapped}, extra {mapped - sections}')
    prd = (ROOT / 'PRD.md').read_text()
    if set(re.findall(r'REQ-\d{2}', prd)) != set(reqs):
        fail('PRD and manifest requirement IDs differ')
    if {ws for t in tasks for ws in t['workstreams']} != {f'WS-{n:02d}' for n in range(18)}:
        fail('Source workstream coverage is incomplete')


def eligible(plan: dict) -> list[dict]:
    by_id = {t['id']: t for t in plan['tasks']}
    return [t for t in plan['tasks'] if t['status'] in {'PLANNED', 'NOT_STARTED'}
            and all(by_id[d]['status'] in DONE for d in t['dependencies'])]


def task_link(task_id: str, prefix: str = '') -> str:
    return f'[{task_id}]({prefix}tasks.md#{task_id.lower()})'


def task_view(plan: dict) -> str:
    rows = ['# CVBase Career OS — implementation orchestrator', '',
            f"Generated from [plan.json](docs/career-os/plan.json) · {plan['updated']}", '',
            'Start here to select and execute the next bounded task. [PRD](PRD.md) defines the product; '
            '[graphs](docs/career-os/GRAPHS.md) explain the system and dependencies; '
            '[acceptance ledger](docs/career-os/CAREER_OS_ACCEPTANCE_LEDGER.md) tracks requirement evidence. '
            'The repository audit is verified. Career OS runtime work has not begun.', '',
            '## Operating loop', '',
            '1. Read the task, parent requirements, source files and inherited contract. Search again before extending code.',
            '2. Select an eligible task; record the actual implementer and intended write scope in its work notes. Functional owners below are roles, not assigned people.',
            '3. Close any task-local schema/API/UX unknowns. Split oversized work into child tasks in the manifest before coding; preserve dependency and requirement edges.',
            '4. Mark IN_PROGRESS; implement the smallest complete slice using existing capabilities. Do not combine unrelated rewrites.',
            '5. Verify the task-specific acceptance criteria, inherited quality contract and affected legacy paths. Record real evidence, including failures and unresolved limits.',
            '6. Mark IMPLEMENTED when code exists, VERIFIED when relevant checks pass, QUALIFIED only after its acceptance gate. Update the manifest and regenerate views.',
            '7. If a parent assumption fails, stop dependent work, revise the parent contract, update edges/acceptance and resume from the corrected plan.', '',
            'Dependencies require VERIFIED or QUALIFIED. A task with missing runtime/schema evidence must first resolve that discovery; dependency eligibility alone is not implementation readiness. '
            'BLOCKED requires a specific blocker. No date or completion is inferred from code presence. External release, payment, submission or messaging authority is not granted by task status.', '',
            '```bash', 'python3 scripts/career_os_plan.py --next', 'python3 scripts/career_os_plan.py --check',
            '# After editing plan.json intentionally:', 'python3 scripts/career_os_plan.py --write',
            '# If diagram sources or styles changed (requires mmdc on PATH):',
            'python3 scripts/render_career_os_graphs.py', 'python3 scripts/career_os_plan.py --check', '```', '',
            'Edit task records in `docs/career-os/plan.json`; this file, the acceptance ledger, source crosswalk and task DAG are generated together. '
            'Architecture/domain/sequence graphs are authored contracts and must be reconciled manually when those contracts change.', '',
            '## Eligible next tasks', '']
    for t in eligible(plan):
        rows.append(f"- {task_link(t['id'])} — {t['title']} ({t['owner']}; {t['kind']}).")
    if not eligible(plan):
        rows.append('No eligible planned tasks; inspect in-progress work or explicit blockers.')
    rows += ['', '## Release boundaries', '',
             '| Release | Outcome | Gate |', '| --- | --- | --- |',
             '| R0 | Reliable existing data, canonical contracts/context, migration framework and shell | Foundation evidence in COS-018 |',
             '| R1 | Goal → imported opportunity → application → reviewed PRISM CV → return from Today | COS-018 |',
             '| R2 | Full six-space Career OS through Coach, interview, outcome, Library and onboarding | COS-034 |',
             '| R3 | Outcome learning, scenarios and opted-in proactive work | COS-040 |',
             '| Optional integration | One permitted read-only source | COS-038 decision then COS-039 evidence |',
             '| Retirement | Remove superseded presentation after observation/rollback evidence | COS-041 |', '',
             'The DAG encodes prerequisite order, not elapsed-time estimates. It permits independent work when dependencies and write scopes allow; it does not auto-delegate. '
             'Do not wait for optional connectors to qualify R1/R2. Full Career OS completion is not claimed at the R1 slice.', '',
             '## Task board', '', '| Task | Work | Release | Priority | Status | Dependencies |', '| --- | --- | --- | --- | --- | --- |']
    for t in plan['tasks']:
        rows.append(f"| {task_link(t['id'])} | {t['title']} | {t['release']} | {t['priority']} | {t['status']} | {', '.join(t['dependencies']) or 'None'} |")
    rows += ['', '## Inherited task contracts', '', 'Every task inherits all five fields below from its named profile; its specific acceptance criteria and tests add to them. '
             'This avoids repeating identical requirements while preserving the source PRD task contract. Data ownership, API, legacy impact and source evidence are specified per task.', '']
    for name, profile in plan['contract_profiles'].items():
        rows += [f'<a id="{name}-contract"></a>', f'### {name.capitalize()} contract', '']
        for key, value in profile.items():
            rows.append(f"- **{key.replace('_', ' ').capitalize()}:** {value}")
        rows.append('')
    rows += ['## Task specifications', '']
    for t in plan['tasks']:
        rows += [f'<a id="{t["id"].lower()}"></a>', f"### {t['id']} — {t['title']}", '',
                 f"**{t['status']} · {t['release']} · {t['priority']} · {t['owner']} · {t['kind']}**", '',
                 f"**Parent requirements:** {', '.join(t['requirements'])}; source workstreams {', '.join(t['workstreams'])}. "
                 f"**Dependencies:** {', '.join(t['dependencies']) or 'None'}. "
                 f"**Inherited contract:** [{t['contract_profile']}](#{t['contract_profile']}-contract).", '',
                 f"**Purpose:** {t['purpose']}", '', f"**Existing implementation discovered:** {t['existing_implementation']}", '',
                 '**Files/modules:** ' + ', '.join(f'[{p}]({p})' for p in t['files']) + '.', '']
        if t['proposed_paths']:
            rows += ['**Proposed modules (not yet implemented):** ' + ', '.join(f'`{p}`' for p in t['proposed_paths']) + '.', '']
        rows += [f"**Data ownership:** {t['data_ownership']}", '', f"**API dependencies:** {t['api_dependencies']}", '', '**Acceptance criteria:**', '']
        rows += [f'- {a}' for a in t['acceptance_criteria']]
        rows += ['', f"**Tests:** {t['tests']}", '', f"**Analytics:** {t['events']}", '', f"**Legacy impact:** {t['legacy_impact']}", '',
                 '**Recorded evidence:** ' + (', '.join(f'[{p}]({p})' for p in t['evidence']) or 'None yet; required evidence follows the inherited contract.') , '']
        if t.get('blocker'):
            rows += [f"**Blocker:** {t['blocker']}", '']
    return '\n'.join(rows).rstrip() + '\n'


def ledger_view(plan: dict) -> str:
    rows = ['# Career OS acceptance ledger', '', 'Generated from [plan.json](plan.json). '
            'Status describes the least-complete required task, not the presence of an existing reusable feature. '
            'Optional connector task COS-039 has its own gate and does not block core qualification.', '',
            '| Requirement | Source sections | Tasks | Implementation / tests | Evidence | Status |',
            '| --- | --- | --- | --- | --- | --- |']
    for req in plan['requirements']:
        tasks = [t for t in plan['tasks'] if req['id'] in t['requirements']]
        core = [t for t in tasks if t['release'] != 'R3 optional']
        statuses = {t['status'] for t in core}
        status = 'BLOCKED' if 'BLOCKED' in statuses else min(statuses, key=STATES.index)
        evidence = sorted({p for t in tasks for p in t['evidence']})
        rows.append(f"| {req['id']} — {req['title']} | {', '.join(map(str,req['source_sections']))} | "
                    f"{', '.join(task_link(t['id'], '../../') for t in tasks)} | Source paths and specific tests are recorded in each linked task; runtime implementation pending unless its evidence says otherwise | "
                    f"{', '.join(f'[{Path(p).name}](../../{p})' for p in evidence) or 'Not yet recorded'} | {status} |")
    rows += ['', '## Evidence discipline', '', 'VERIFIED requires actual results and satisfied dependencies. QUALIFIED requires the applicable release/acceptance verdict. '
             'The validator checks references and declared state consistency; it cannot establish that evidence substantively proves a requirement. Review that evidence before promotion. '
             'Planning/audit evidence is not runtime evidence. See [release plan](RELEASE_PLAN.md) for G1–G9 and J01–J12.', '']
    return '\n'.join(rows)


def source_view(plan: dict) -> str:
    titles = re.findall(r'^# (\d+)\. (.+)$', (DOCS / 'SOURCE_PRD.md').read_text(), re.M)
    rows = ['# Source authority traceability', '', 'All 88 numbered sections of the supplied PRD are preserved in '
            '[SOURCE_PRD.md](SOURCE_PRD.md). This crosswalk maps each to the enhanced requirements and their implementation tasks. '
            'Many sections express program rules rather than separately shippable features.', '',
            '| Source section | Enhanced requirements | Task coverage |', '| --- | --- | --- |']
    for number, title in titles:
        reqs = [r['id'] for r in plan['requirements'] if int(number) in r['source_sections']]
        tasks = [t for t in plan['tasks'] if set(reqs) & set(t['requirements'])]
        rows.append(f"| {number}. {title} | {', '.join(reqs)} | {', '.join(task_link(t['id'], '../../') for t in tasks)} |")
    return '\n'.join(rows) + '\n'


def graph_view(plan: dict) -> str:
    rows = ['flowchart TD', '  %% Generated from plan.json. Edges are prerequisites, not dates.']
    releases = list(dict.fromkeys(t['release'] for t in plan['tasks']))
    for i, release in enumerate(releases):
        rows.append(f'  subgraph R{i}["{release}"]')
        for t in plan['tasks']:
            if t['release'] == release:
                label = t['title'].replace('"', "'")
                rows.append(f'    {t["id"].replace("-", "_")}["{t["id"]}: {label}"]')
        rows.append('  end')
    for t in plan['tasks']:
        for dep in t['dependencies']:
            rows.append(f'  {dep.replace("-", "_")} --> {t["id"].replace("-", "_")}')
    rows += ['  classDef done fill:#dcfce7,stroke:#15803d,color:#14532d',
             '  classDef gate fill:#e0e7ff,stroke:#4338ca,color:#312e81',
             '  classDef optional fill:#f1f5f9,stroke:#64748b,color:#334155,stroke-dasharray:5 5']
    for t in plan['tasks']:
        style = 'done' if t['status'] in DONE else ('optional' if t['release'] == 'R3 optional' else ('gate' if t['kind'] == 'gate' else None))
        if style:
            rows.append(f'  class {t["id"].replace("-", "_")} {style}')
    return '\n'.join(rows) + '\n'


def check_links(paths: list[Path]) -> None:
    for path in paths:
        content = path.read_text()
        for target in re.findall(r'\]\(([^)]+)\)', content):
            target = target.strip('<>')
            if '://' in target or target.startswith(('mailto:', '#')):
                continue
            parsed = urlsplit(target)
            if not parsed.path:
                continue
            dest = (path.parent / unquote(parsed.path)).resolve()
            if not dest.exists():
                fail(f'{path.relative_to(ROOT)}: broken link {target}')
            if parsed.fragment and dest.suffix == '.md':
                text = dest.read_text()
                anchors = set(re.findall(r'<a id="([^"]+)"', text))
                for heading in re.findall(r'^#{1,6}\s+(.+)$', text, re.M):
                    anchors.add(re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-'))
                if parsed.fragment not in anchors:
                    fail(f'{path.relative_to(ROOT)}: missing anchor {target}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--write', action='store_true', help='Regenerate views from validated manifest')
    modes.add_argument('--check', action='store_true', help='Validate graph, evidence references and generated view freshness')
    modes.add_argument('--next', action='store_true', help='Show eligible planned tasks')
    args = parser.parse_args()
    try:
        plan = json.loads(MANIFEST.read_text())
        validate(plan)
        outputs = {ROOT / 'tasks.md': task_view(plan), DOCS / 'CAREER_OS_ACCEPTANCE_LEDGER.md': ledger_view(plan),
                   DOCS / 'SOURCE_TRACEABILITY.md': source_view(plan), DOCS / 'graphs/task-dependencies.mmd': graph_view(plan)}
        if args.next:
            for t in eligible(plan):
                print(f"{t['id']} [{t['kind']}] {t['title']} — {t['owner']}")
            return 0
        if args.write:
            for path, text in outputs.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text)
        else:
            for path, expected in outputs.items():
                if not path.exists() or path.read_text() != expected:
                    fail(f'Generated view drift: {path.relative_to(ROOT)}; run --write')
        if not args.write:
            check_links([ROOT / 'PRD.md', ROOT / 'tasks.md'] + [p for p in DOCS.glob('*.md') if p.name != 'SOURCE_PRD.md'])
            renders = json.loads((DOCS / 'graphs/render-manifest.json').read_text())
            digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
            if renders['config_sha256'] != digest(DOCS / 'graphs/mermaid-config.json'):
                fail('Diagram configuration changed; run scripts/render_career_os_graphs.py')
            sources = {p.name for p in (DOCS / 'graphs').glob('*.mmd')}
            if sources != set(renders['graphs']):
                fail('Rendered graph inventory differs from source inventory')
            for source, hashes in renders['graphs'].items():
                path = DOCS / 'graphs' / source
                if hashes['source_sha256'] != digest(path) or hashes['svg_sha256'] != digest(path.with_suffix('.svg')):
                    fail(f'Stale or altered rendered graph: {source}; run scripts/render_career_os_graphs.py')
        edges = sum(len(t['dependencies']) for t in plan['tasks'])
        print(f"PASS: {len(plan['tasks'])} tasks; {edges} dependency edges; acyclic DAG; {len(plan['requirements'])} requirements; 88 source sections; 18 source workstreams; valid paths/evidence references; generated views synchronized.")
        print('Runtime qualification remains separate; no completion is inferred from this validation.')
        return 0
    except (ValueError, KeyError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
