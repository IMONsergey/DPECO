#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/imon-runtime/node/bin:$PATH"
npm run build
python3 - <<'PY'
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, shutil
project = Path.cwd()
dist = project / 'dist'
manifest = {str(p.relative_to(dist)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dist.rglob('*')) if p.is_file()}
identity = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()[:12]
name = 'review-20261111-' + identity
preview = Path('/home/sergey/Projects/DPECO-Design-Gallery/site') / name
if not preview.exists():
    shutil.copytree(dist, preview)
actual = {str(p.relative_to(preview)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(preview.rglob('*')) if p.is_file()}
assert actual == manifest, 'Preview does not match the build'
evidence = {'createdAt': datetime.now(timezone.utc).isoformat(), 'url': 'https://debtprice-lab.imon.world/' + name + '/', 'directory': str(preview), 'build': manifest}
results = project / 'qa/homepage/results'
results.mkdir(parents=True, exist_ok=True)
(results / 'preview.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'previewReady': evidence['url'], 'files': len(manifest)}), flush=True)
PY
python3 qa/homepage/run-client-review-suite.py
