#!/usr/bin/env python3
"""Read back the public homepage and save evidence after authorized publication.

No deployment, browser, build, configuration or permission changes. Only writes
the verification report inside this project. HTTP requests use no credentials.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

project = Path(__file__).resolve().parents[2]
base = 'https://debtprice.imon.world/'
preview = json.loads((project / 'qa/homepage/results/preview.json').read_text())
manifest = preview['build']
output = project / 'qa/client-review/delivery.json'
result = {
    'observedAt': datetime.now(timezone.utc).isoformat(),
    'url': base,
    'project': str(project),
    'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=project, text=True).strip(),
    'preview': preview['url'],
    'checks': [],
}


def request(relative, expected_status, expected_sha=None, method='GET'):
    entry = {'url': base + relative, 'method': method, 'expectedStatus': expected_status}
    try:
        req = Request(entry['url'], method=method, headers={'Cache-Control': 'no-cache'})
        try:
            response = urlopen(req, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            body = response.read() if method == 'GET' else b''
            entry.update(status=response.status, finalUrl=response.url,
                         contentType=response.headers.get('Content-Type'),
                         cacheControl=response.headers.get('Cache-Control'),
                         robots=response.headers.get('X-Robots-Tag'))
        if expected_sha is not None:
            entry.update(expectedSha256=expected_sha, sha256=hashlib.sha256(body).hexdigest())
        entry['passed'] = (entry['status'] == expected_status
                           and entry['finalUrl'] == entry['url']
                           and (expected_sha is None or entry['sha256'] == expected_sha))
    except Exception as error:
        entry.update(passed=False, error=f'{type(error).__name__}: {error}')
    result['checks'].append(entry)


files = ['index.html'] + sorted(name for name in manifest if name.endswith(('.js', '.css')))
files += [
    'assets/page10/logos/debtprice.svg',
    'assets/page10/logos/navigator.svg',
    'assets/page10/391-1222/07f83.svg',
    'assets/page10/391-1222/ed8c1.svg',
]
for name in dict.fromkeys(files):
    request('' if name == 'index.html' else name, 200, manifest[name])

for route in ['buyers', 'sellers', 'documents', 'search', 'lot', 'request', 'lots', 'creditors', '404.html']:
    request(route, 404)

release = Path('/srv/debtprice/current').resolve(strict=True)
html = sorted(str(file.relative_to(release)) for file in release.rglob('*') if file.is_file() and file.suffix.lower() in ('.html', '.htm'))
result['release'] = str(release)
result['htmlFiles'] = html
result['onlyHomepageHtml'] = html == ['index.html']
result['status'] = 'pass' if result['onlyHomepageHtml'] and all(check['passed'] for check in result['checks']) else 'fail'
result['finishedAt'] = datetime.now(timezone.utc).isoformat()
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'url': base, 'checks': len(result['checks']), 'onlyHomepageHtml': result['onlyHomepageHtml'], 'report': str(output)}, ensure_ascii=False))
sys.exit(0 if result['status'] == 'pass' else 1)
