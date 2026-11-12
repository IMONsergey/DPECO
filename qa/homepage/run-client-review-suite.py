"""Verify the November 11 client corrections against one unchanged build."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import sys

project = Path(__file__).resolve().parents[2]
os.chdir(project)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
source_files = lambda: sorted([p for p in (project / 'src').rglob('*') if p.is_file()] + [project / name for name in ('index.html', 'vite.config.ts', 'package.json', 'package-lock.json')])
sources = lambda: {str(p.relative_to(project)): digest(p) for p in source_files()}
build = lambda: {str(p.relative_to(project)): digest(p) for p in sorted((project / 'dist').rglob('*')) if p.is_file() and p.suffix in ('.html', '.js', '.css')}
assert (project / 'dist/index.html').stat().st_mtime_ns >= max(p.stat().st_mtime_ns for p in source_files()), 'Build predates source'
started = datetime.now(timezone.utc)
results = project / 'qa/homepage/results'
results.mkdir(parents=True, exist_ok=True)
receipt = results / ('client-review-suite-' + started.strftime('%Y%m%dT%H%M%SZ') + '.json')
report = {'startedAt': started.isoformat(), 'source': sources(), 'build': build(), 'checks': [], 'status': 'running', 'sourceDocument': 'https://docs.google.com/document/d/1hH3xng6E4rAf-Cfeqz9VMI788a7nFbq_0TAJrdfv444', 'scopeChange': 'User instruction 2026-11-11: publish one homepage on the server, with no navigation, external destinations or separate screens.', 'supersededChecks': {'check-state-regressions.mjs': 'The user removed addressable overlays, routes and browser-history navigation. Prior raw results remain historical evidence, not a pass for this build.', 'check-homepage.mjs': 'Old navigation, external-link and modal expectations were replaced by the explicit no-navigation contract. Responsive visual checks remain in check-client-review.mjs.'}}

def save():
    receipt.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

save()
scripts = ['check-client-part2.mjs', 'check-client-review.mjs']
for script in scripts:
    before = set(results.glob('*/report.json'))
    task = {'script': script, 'scriptSha256': digest(project / 'qa/homepage' / script), 'startedAt': datetime.now(timezone.utc).isoformat()}
    print(json.dumps({'suite': 'start', **task}), flush=True)
    try:
        run = subprocess.run(['/opt/imon-runtime/node/bin/node', str(project / 'qa/homepage' / script)], env={**os.environ, 'QA_PHASE': 'client-review', 'QA_BROWSERS': 'chromium,firefox,webkit'}, timeout=1800)
        task['exitCode'] = run.returncode
    except subprocess.TimeoutExpired:
        task['exitCode'] = 124
        task['error'] = 'Timed out after 1800 seconds'
    task['finishedAt'] = datetime.now(timezone.utc).isoformat()
    task['reports'] = []
    for p in sorted(set(results.glob('*/report.json')) - before):
        details = json.loads(p.read_text())
        task['reports'].append({'path': str(p.relative_to(project)), 'sha256': digest(p), 'passed': details.get('passed'), 'failed': details.get('failed')})
    report['checks'].append(task)
    save()
    print(json.dumps({'suite': 'finish', **task}), flush=True)
report['sourceUnchanged'] = report['source'] == sources()
report['buildUnchanged'] = report['build'] == build()
report['finishedAt'] = datetime.now(timezone.utc).isoformat()
report['status'] = 'pass' if all(x['exitCode'] == 0 and len(x['reports']) == 1 for x in report['checks']) and report['sourceUnchanged'] and report['buildUnchanged'] else 'fail'
save()
print(json.dumps({'suite': report['status'], 'receipt': str(receipt), 'sourceUnchanged': report['sourceUnchanged'], 'buildUnchanged': report['buildUnchanged']}), flush=True)
sys.exit(0 if report['status'] == 'pass' else 1)
