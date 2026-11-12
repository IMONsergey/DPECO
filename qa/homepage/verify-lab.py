#!/usr/bin/env python3
"""Read-only acceptance of the exact published https://debtprice-lab.imon.world/.

Checks the latest successful local rollout, its mandatory QA gate, every served
file's SHA256, preserved gallery, and absence of old/secondary pages. Uses only
credential-free HTTPS GET, never follows redirects, and prints JSON to stdout.
No deployment, browser, build, local report writes or permission changes.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parents[2]
BASE = 'https://debtprice-lab.imon.world/'
ROLLOUT = re.compile(r'\d{8}T\d{6}Z-[0-9a-f]{12}\Z')
MAX_BODY = 64 * 1024 * 1024
spec = importlib.util.spec_from_file_location('lab_publisher', Path(__file__).with_name('publish-lab.py'))
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)
publisher = lab.publisher
require = publisher.require


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def check_url(item):
    relative, expected_status, expected_sha = item
    if relative:
        publisher.parts(relative.rstrip('/'))
    url = BASE + quote(relative, safe='/')
    entry = {'path': '/' + relative, 'method': 'GET', 'expectedStatus': expected_status}
    try:
        request = Request(url, method='GET', headers={'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity'})
        # No cookies, auth handlers or environment proxy credentials; no redirect to any host.
        opener = build_opener(ProxyHandler({}), NoRedirect())
        try:
            response = opener.open(request, timeout=20)
        except HTTPError as error:
            response = error
        with response:
            entry.update(status=response.status, finalUrl=response.url,
                         contentType=response.headers.get('Content-Type', ''),
                         cacheControl=response.headers.get('Cache-Control', ''),
                         robots=', '.join(response.headers.get_all('X-Robots-Tag', [])))
            digest = hashlib.sha256()
            total = 0
            limit = MAX_BODY if expected_sha is not None else 512 * 1024
            while True:
                chunk = response.read(min(1024 * 1024, limit + 1 - total))
                if not chunk:
                    break
                digest.update(chunk)
                total += len(chunk)
                require(total <= limit, f'Response exceeds safe read limit: {relative}')
        entry['bytes'] = total
        if expected_sha is not None:
            entry.update(expectedSha256=expected_sha, sha256=digest.hexdigest())
        entry['passed'] = (entry['status'] == expected_status and entry['finalUrl'] == url
                           and (expected_sha is None or entry['sha256'] == expected_sha))
        if expected_status == 200:
            entry['passed'] = entry['passed'] and 'noindex' in entry['robots'].lower()
            if relative in ('', 'index.html'):
                entry['passed'] = entry['passed'] and entry['contentType'].lower().startswith('text/html') \
                    and ('no-store' in entry['cacheControl'].lower() or 'no-cache' in entry['cacheControl'].lower())
            elif relative.endswith('.css'):
                entry['passed'] = entry['passed'] and entry['contentType'].lower().startswith('text/css')
            elif relative.endswith('.js'):
                entry['passed'] = entry['passed'] and any(mime in entry['contentType'].lower()
                                                        for mime in ('javascript', 'ecmascript'))
    except Exception as error:
        entry.update(passed=False, error=f'{type(error).__name__}: {error}')
    return entry


def forbidden_paths(before, allowed, backup_name):
    paths = {'buyers', 'sellers', 'documents', 'search', 'lot', 'request', 'lots', 'creditors', '404.html',
             'v/01', 'v/02', 'clearstreet', 'review-20261111-fast', 'page10-review.html',
             'manifest.json', 'styles.css', 'gallery.js', '_releases', '.git/config',
             backup_name + '/index.html'}
    # All previous HTML documents and their directory-index routes, not just a chosen sample.
    for name, info in before.items():
        path = PurePosixPath(name)
        if info['type'] == 'file' and path.suffix.lower() in ('.html', '.htm') and name not in allowed:
            paths.add(name)
            if path.name.lower() in ('index.html', 'index.htm') and path.parent.as_posix() != '.':
                paths.add(path.parent.as_posix())
        if info['type'] == 'symlink':
            paths.add(name)
    expanded = set(paths)
    for name in paths:
        if not PurePosixPath(name).suffix:
            expanded.add(name.rstrip('/') + '/')
    return sorted(path for path in expanded if path and path not in allowed)


def run():
    require(lab.PROJECT == publisher.PROJECT == PROJECT, 'Project path mismatch')
    root = os.open('/', publisher.DIR_FLAGS)
    started = datetime.now(timezone.utc).isoformat()
    try:
        with publisher.directory(root, str(PROJECT)[1:]) as project, publisher.directory(project, 'dist') as dist, \
                publisher.directory(root, str(lab.LAB)[1:]) as lab_root, publisher.directory(lab_root, lab.LIVE) as live, \
                publisher.directory(project, lab.STATE) as state:
            names = [name for name in os.listdir(state) if ROLLOUT.fullmatch(name)]
            require(names, 'No lab rollout receipt exists')
            run_id = max(names)
            receipt_path = lab.STATE + '/' + run_id + '/receipt.json'
            receipt, receipt_sha = publisher.read_json(project, receipt_path)
            require(receipt.get('status') == 'published-local-verified' and receipt.get('preservedGalleryVerified') is True,
                    'Latest lab rollout is not locally verified; do not select an older success')
            require(receipt.get('url') == BASE and receipt.get('live') == str(lab.LAB / lab.LIVE),
                    'Receipt targets a different public host or live directory')
            backup_name = '.gallery-before-' + run_id
            require(receipt.get('backup') == str(lab.LAB / backup_name), 'Unexpected backup path')
            verified = publisher.candidate(project, dist)
            require(receipt.get('verification') == verified, 'Current candidate differs from published receipt')
            files = verified['files']
            require(receipt.get('liveFilesSha256') == publisher.map_sha(files), 'Receipt file-map hash mismatch')
            lab.guard(lab_root, live)
            require(publisher.scan(live) == files, 'Live tree differs from the accepted candidate or has extra files')
            before, before_sha = publisher.read_json(project, lab.STATE + '/' + run_id + '/gallery.before.json')
            require(publisher.map_sha(before) == receipt['previousManifestSha256'], 'Saved old-gallery manifest mismatch')
            with publisher.directory(lab_root, backup_name) as backup:
                require(lab.manifest(backup) == before, 'Original gallery backup changed or is incomplete')
            html = sorted(path for path in files if PurePosixPath(path).suffix.lower() in ('.html', '.htm'))
            require(html == ['index.html'], 'Live tree must contain exactly the homepage HTML')
            requests = [('', 200, files['index.html'])] + [(name, 200, digest) for name, digest in sorted(files.items())]
            blocked = forbidden_paths(before, files, backup_name)
            requests += [(name, 404, None) for name in blocked]
            with ThreadPoolExecutor(max_workers=6) as pool:
                checks = list(pool.map(check_url, requests))
            # Re-read root and local identity after network reads so a concurrent release cannot pass.
            checks.append(check_url(('', 200, files['index.html'])))
            lab.guard(lab_root, live)
            require(publisher.scan(live) == files and publisher.candidate(project, dist) == verified,
                    'Live tree or QA/source changed during public verification')
            _, final_receipt_sha = publisher.read_json(project, receipt_path)
            require(final_receipt_sha == receipt_sha, 'Publication receipt changed during verification')
            _, final_before_sha = publisher.read_json(project, lab.STATE + '/' + run_id + '/gallery.before.json')
            require(final_before_sha == before_sha, 'Preserved-gallery manifest changed during verification')
            with publisher.directory(lab_root, backup_name) as backup:
                require(lab.manifest(backup) == before, 'Original gallery changed during public verification')
            return {'status': 'pass' if all(item['passed'] for item in checks) else 'fail',
                    'observedAt': started, 'finishedAt': datetime.now(timezone.utc).isoformat(),
                    'url': BASE, 'project': str(PROJECT), 'receipt': str(PROJECT / receipt_path),
                    'receiptSha256': receipt_sha, 'suite': verified['suite'],
                    'sourceSha256': verified['sourceSha256'], 'fullDistSha256': verified['fullDistSha256'],
                    'liveFilesSha256': publisher.map_sha(files), 'htmlFiles': html, 'onlyHomepageHtml': True,
                    'preservedGalleryVerified': True, 'previousManifestFileSha256': before_sha,
                    'publishedFilesChecked': len(files), 'forbiddenPathsChecked': len(blocked),
                    'networkWritesPerformed': False, 'filesystemWritesPerformed': False,
                    'checks': checks, 'passed': sum(item['passed'] for item in checks),
                    'failed': sum(not item['passed'] for item in checks)}
    finally:
        os.close(root)


def main():
    try:
        result = run()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['status'] == 'pass' else 1
    except (Exception, KeyboardInterrupt) as error:
        print(json.dumps({'status': 'refused-or-interrupted', 'url': BASE,
                          'error': f'{type(error).__name__}: {error}'}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
