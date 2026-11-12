#!/usr/bin/env python3
"""Dry-run by default; --publish promotes the verified homepage as an ordinary user.

No sudo, configuration/symlink changes, network, browser or build commands.
Only index.html is replaced. Assets are added without overwriting existing files.
Backups/receipts stay outside the webroot. Public HTTP acceptance is a separate step.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import uuid

PROJECT = Path(__file__).resolve().parents[2]
CURRENT = Path('/srv/debtprice/current')
RELEASE = Path('/srv/debtprice/releases/20261111-K_Fm4vOk')
RESULTS = 'qa/homepage/results'
STATE = RESULTS + '/rollouts'  # Already gitignored and outside /srv/debtprice.
QA_SCRIPT = 'qa/homepage/check-client-review.mjs'
DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
FILE_FLAGS = os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK
SUITE_NAME = re.compile(r'client-review-suite-\d{8}T\d{6}Z\.json\Z')
ASSET_SUFFIXES = {'.js', '.css', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.avif',
                  '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm'}
LICENSE_FILES = {'licenses/bootstrap-icons.txt', 'assets/fonts/OFL.txt', 'assets/fonts/Manrope-OFL.txt'}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def now():
    return datetime.now(timezone.utc).isoformat()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def map_sha(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())


def parts(relative):
    require(isinstance(relative, str) and relative, 'Missing relative path')
    path = PurePosixPath(relative)
    require(path.parts and not path.is_absolute() and path.as_posix() == relative
            and '..' not in path.parts and '\\' not in relative
            and all(ord(char) >= 32 and ord(char) != 127 for char in relative),
            f'Unsafe relative path: {relative!r}')
    return path.parts


@contextmanager
def directory(root, relative, create=False, mode=0o755):
    descriptor = os.dup(root)
    try:
        for part in parts(relative):
            created = False
            if create:
                try:
                    os.mkdir(part, mode, dir_fd=descriptor)
                    os.fsync(descriptor)
                    created = True
                except FileExistsError:
                    pass
            child = os.open(part, DIR_FLAGS, dir_fd=descriptor)
            if created:
                os.fchmod(child, mode)
                os.fsync(child)
            os.close(descriptor)
            descriptor = child
        yield descriptor
    finally:
        os.close(descriptor)


@contextmanager
def parent(root, relative, create=False):
    names = parts(relative)
    if len(names) == 1:
        yield root, names[0]
    else:
        with directory(root, '/'.join(names[:-1]), create) as descriptor:
            yield descriptor, names[-1]


def read(root, relative):
    with parent(root, relative) as (descriptor, name):
        handle = os.open(name, FILE_FLAGS, dir_fd=descriptor)
    with os.fdopen(handle, 'rb') as source:
        before = os.fstat(source.fileno())
        require(stat.S_ISREG(before.st_mode) and before.st_size <= 64 * 1024 * 1024,
                f'Not a regular file or too large: {relative}')
        data = source.read(64 * 1024 * 1024 + 1)
        after = os.fstat(source.fileno())
        stable = lambda info: (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        require(len(data) == before.st_size and stable(before) == stable(after), f'File changed while reading: {relative}')
        return data


def scan(root, prefix=''):
    result = {}
    for name in sorted(os.listdir(root)):
        parts(name)
        relative = f'{prefix}/{name}' if prefix else name
        info = os.stat(name, dir_fd=root, follow_symlinks=False)
        if stat.S_ISDIR(info.st_mode):
            with directory(root, name) as child:
                result.update(scan(child, relative))
        else:
            require(stat.S_ISREG(info.st_mode), f'Symlink or special file rejected: {relative}')
            result[relative] = sha(read(root, name))
    return result


def json_pairs(values):
    result = {}
    for key, value in values:
        require(key not in result, f'Duplicate JSON key: {key}')
        result[key] = value
    return result


def read_json(root, relative):
    raw = read(root, relative)
    value = json.loads(raw.decode('utf-8'), object_pairs_hook=json_pairs)
    require(isinstance(value, dict), f'Expected JSON object: {relative}')
    return value, sha(raw)


def moment(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(result.tzinfo is not None, 'Timestamp has no timezone')
    return result


def publishable(path):
    names = parts(path)
    return not any(name.startswith('.') for name in names) and (
        path == 'index.html' or path in LICENSE_FILES
        or names[0] == 'assets' and PurePosixPath(path).suffix.lower() in ASSET_SUFFIXES)


def candidate(project, dist):
    with directory(project, 'dist') as actual_dist:
        current, opened = os.fstat(actual_dist), os.fstat(dist)
        require((current.st_dev, current.st_ino) == (opened.st_dev, opened.st_ino), 'Dist directory was replaced during publication')
    with directory(project, RESULTS) as results:
        names = [name for name in os.listdir(results) if SUITE_NAME.fullmatch(name)]
    require(names, 'No client-review-suite receipt exists')
    suite_path = f'{RESULTS}/{max(names)}'  # Newer failed/running/partial receipt blocks promotion.
    suite, suite_sha = read_json(project, suite_path)
    require(suite.get('status') == 'pass' and suite.get('sourceUnchanged') is True
            and suite.get('buildUnchanged') is True, f'Latest suite has not passed: {suite_path}')
    started, finished = moment(suite['startedAt']), moment(suite['finishedAt'])
    require(started <= finished <= datetime.now(timezone.utc), 'Invalid suite time interval')
    with directory(project, 'src') as source:
        sources = scan(source, 'src')
    sources.update({name: sha(read(project, name)) for name in
                    ('index.html', 'vite.config.ts', 'package.json', 'package-lock.json')})
    files = scan(dist)
    require('index.html' in files and [p for p in files if p.lower().endswith('.html')] == ['index.html'],
            'Build must contain exactly one HTML page: index.html')
    build = {f'dist/{p}': digest for p, digest in files.items() if PurePosixPath(p).suffix in ('.html', '.js', '.css')}
    require(suite.get('source') == sources and suite.get('build') == build,
            'Current source/build SHA maps do not match the latest passing suite')
    checks = suite.get('checks')
    require(isinstance(checks, list) and len(checks) == 2
            and {item.get('script') for item in checks} == {'check-client-review.mjs', 'check-client-part2.mjs'},
            'Both original client-review and additional Part 2 matrices are required')
    check = next(item for item in checks if item.get('script') == 'check-client-review.mjs')
    script_sha = sha(read(project, QA_SCRIPT))
    require(check.get('script') == 'check-client-review.mjs' and check.get('exitCode') == 0
            and check.get('scriptSha256') == script_sha, 'QA script failed or changed after verification')
    reports = check.get('reports')
    require(isinstance(reports, list) and len(reports) == 1, 'Expected one browser report')
    report_ref = reports[0]
    report_path = report_ref['path']
    require(parts(report_path)[:3] == ('qa', 'homepage', 'results') and parts(report_path)[-1] == 'report.json',
            'Browser report is outside QA results')
    report, report_sha = read_json(project, report_path)
    require(report_ref.get('sha256') == report_sha and report.get('status') == 'pass'
            and report.get('scriptSha256') == script_sha and report.get('sourceUnchanged') is True
            and report.get('buildUnchanged') is True, 'Browser report SHA/status mismatch')
    require(report.get('project') == str(PROJECT) and report.get('phase') == 'client-review'
            and started <= moment(report['startedAt']) <= moment(report['finishedAt']) <= finished,
            'Browser report does not belong to this project/suite interval')
    cases = report.get('checks', [])
    pairs = {(item.get('browser'), item.get('name')) for item in cases}
    require(len(cases) == len(pairs) == 63 and all(item.get('status') == 'pass' for item in cases)
            and {browser for browser, _ in pairs} == {'chromium', 'firefox', 'webkit'}
            and all(sum(browser == engine for browser, _ in pairs) == 21 for engine in ('chromium', 'firefox', 'webkit')),
            'Full 21-case matrix in three browsers is required; restricted QA_ONLY is rejected')
    require(report.get('passed') == report_ref.get('passed') == 63 and report.get('failed') == report_ref.get('failed') == 0,
            'Browser report counters disagree')
    require(all(report.get(key) == [] for key in ('runtimeErrors', 'networkWrites', 'assetErrors', 'popups', 'navigationAttempts')),
            'Browser report has errors or lacks required gates')
    part2_check = next(item for item in checks if item.get('script') == 'check-client-part2.mjs')
    part2_script_sha = sha(read(project, 'qa/homepage/check-client-part2.mjs'))
    require(part2_check.get('exitCode') == 0 and part2_check.get('scriptSha256') == part2_script_sha,
            'Part 2 QA failed or its script changed after verification')
    part2_refs = part2_check.get('reports')
    require(isinstance(part2_refs, list) and len(part2_refs) == 1, 'Expected one Part 2 browser report')
    part2_ref = part2_refs[0]
    part2_path = part2_ref['path']
    require(parts(part2_path)[:3] == ('qa', 'homepage', 'results') and parts(part2_path)[-1] == 'report.json',
            'Part 2 report is outside QA results')
    part2, part2_sha = read_json(project, part2_path)
    require(part2_ref.get('sha256') == part2_sha and part2.get('scriptSha256') == part2_script_sha
            and part2.get('status') == 'pass' and part2.get('sourceUnchanged') is True
            and part2.get('buildUnchanged') is True and part2.get('project') == str(PROJECT)
            and part2.get('phase') == 'client-review'
            and started <= moment(part2['startedAt']) <= moment(part2['finishedAt']) <= finished,
            'Part 2 report SHA, source, project, status or interval mismatch')
    part2_cases = part2.get('checks', [])
    part2_variants = {(item.get('browser'), item.get('width'), item.get('theme')) for item in part2_cases}
    required_variants = {(browser, width, theme) for browser in ('chromium', 'firefox', 'webkit')
                         for width in (320, 390, 768, 1280, 1440) for theme in ('light', 'dark')}
    require(len(part2_cases) == 30 and part2_variants == required_variants
            and all(item.get('status') == 'pass' for item in part2_cases)
            and part2.get('passed') == part2_ref.get('passed') == 30
            and part2.get('failed') == part2_ref.get('failed') == 0,
            'Complete 30-variant Part 2 matrix is required; restricted runs are rejected')
    require(all(part2.get(key) == [] for key in ('runtimeErrors', 'networkWrites', 'assetErrors', 'popups', 'navigationAttempts')),
            'Part 2 browser report has errors or lacks required gates')
    preview_path = RESULTS + '/preview.json'
    preview, preview_sha = read_json(project, preview_path)
    require(moment(preview['createdAt']) <= started and preview.get('build') == files,
            'Full dist does not match the pre-QA preview snapshot')
    with directory(project, 'public') as public_dir:
        public = scan(public_dir)
    require(all(files.get(path) == digest for path, digest in public.items()), 'Public source assets differ from the verified build')
    selected = {p: digest for p, digest in files.items() if publishable(p)}
    require(any(p.endswith('.js') for p in selected) and any(p.endswith('.css') for p in selected), 'Built JS/CSS missing')
    return {'suite': str(PROJECT / suite_path), 'suiteSha256': suite_sha, 'qaFinishedAt': suite['finishedAt'],
            'browserReport': str(PROJECT / report_path), 'browserReportSha256': report_sha,
            'part2Report': str(PROJECT / part2_path), 'part2ReportSha256': part2_sha,
            'qaScriptSha256': script_sha, 'previewSha256': preview_sha,
            'sourceSha256': map_sha(sources), 'publicSourceSha256': map_sha(public),
            'buildSha256': map_sha(build), 'fullDistSha256': map_sha(files),
            'files': selected, 'excludedDistFiles': sorted(set(files) - set(selected))}


def guard(release, expected_sha=None):
    require(stat.S_ISLNK(CURRENT.lstat().st_mode) and CURRENT.resolve(strict=True) == RELEASE,
            'current changed or no longer points to the approved release')
    info, opened = RELEASE.stat(follow_symlinks=False), os.fstat(release)
    require(stat.S_ISDIR(info.st_mode) and (info.st_dev, info.st_ino) == (opened.st_dev, opened.st_ino),
            'Release directory changed')
    if expected_sha is not None:
        require(sha(read(release, 'index.html')) == expected_sha, 'Live index changed concurrently')


def asset_plan(release, files):
    new, same = [], []
    for path, expected in sorted(files.items()):
        if path == 'index.html':
            continue
        try:
            existing = sha(read(release, path))
        except FileNotFoundError:
            new.append(path)
        else:
            require(existing == expected, f'Existing asset differs; refusing overwrite: {path}')
            same.append(path)
    return {'new': new, 'identical': same}


def stage(directory_fd, content, mode):
    name = '.homepage-' + uuid.uuid4().hex + '.tmp'
    handle = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, mode, dir_fd=directory_fd)
    try:
        with os.fdopen(handle, 'wb') as output:
            output.write(content)
            output.flush()
            os.fchmod(output.fileno(), mode)  # In particular, public index/assets must be 0644, not mkstemp's 0600.
            os.fsync(output.fileno())
    except BaseException:
        os.unlink(name, dir_fd=directory_fd)
        raise
    return name


def store_private(rollout, name, data):
    temporary = stage(rollout, data, 0o600)
    try:
        os.replace(temporary, name, src_dir_fd=rollout, dst_dir_fd=rollout)
        os.fsync(rollout)
    finally:
        try:
            os.unlink(temporary, dir_fd=rollout)
        except FileNotFoundError:
            pass


def add_asset(dist, release, path, expected):
    with parent(release, path, create=True) as (destination, name):
        data = read(dist, path)
        require(sha(data) == expected, f'Dist asset changed: {path}')
        temporary = stage(destination, data, 0o644)
        try:
            try:
                os.link(temporary, name, src_dir_fd=destination, dst_dir_fd=destination, follow_symlinks=False)
            except FileExistsError:
                require(sha(read(destination, name)) == expected, f'Concurrent conflicting asset: {path}')
            os.fsync(destination)
        finally:
            os.unlink(temporary, dir_fd=destination)


def postcheck(release, files):
    guard(release, files['index.html'])
    require(all(sha(read(release, path)) == expected for path, expected in files.items()), 'Local asset postcheck failed')
    guard(release, files['index.html'])
    os.fsync(release)


def rollback(release, rollout, old_sha, new_sha):
    temporary = None
    try:
        guard(release, new_sha)
        data = read(rollout, 'index.before.html')
        require(sha(data) == old_sha, 'Backup SHA mismatch')
        temporary = stage(release, data, 0o644)
        guard(release, new_sha)  # Never overwrite a concurrent publisher.
        os.replace(temporary, 'index.html', src_dir_fd=release, dst_dir_fd=release)
        temporary = None
        os.fsync(release)
        guard(release, old_sha)
        return {'status': 'restored', 'indexSha256': old_sha}
    except Exception as error:
        return {'status': 'not-restored', 'reason': str(error)}
    finally:
        if temporary is not None:
            os.unlink(temporary, dir_fd=release)


def promote(project, dist, release, state, verified, before, plan):
    rollout_name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:12]
    os.mkdir(rollout_name, 0o700, dir_fd=state)
    os.fsync(state)
    rollout_path = PROJECT / STATE / rollout_name
    receipt = {'status': 'preparing', 'startedAt': now(), 'current': str(CURRENT), 'release': str(RELEASE),
               'backup': str(rollout_path / 'index.before.html'), 'receipt': str(rollout_path / 'receipt.json'),
               'previousIndexSha256': sha(before), 'indexSha256': verified['files']['index.html'],
               'verification': verified, 'assetPlan': plan, 'publicHttpCheck': 'not-run'}
    temporary, replaced = None, False
    with directory(state, rollout_name) as rollout:
        def save():
            store_private(rollout, 'receipt.json', (json.dumps(receipt, ensure_ascii=False, indent=2) + '\n').encode())
        try:
            store_private(rollout, 'index.before.html', before)
            require(sha(read(rollout, 'index.before.html')) == receipt['previousIndexSha256'], 'Backup verification failed')
            save()
            guard(release, receipt['previousIndexSha256'])
            for path in plan['new']:
                add_asset(dist, release, path, verified['files'][path])
            require(candidate(project, dist) == verified, 'Source/build/QA receipts changed during staging')
            require(not asset_plan(release, verified['files'])['new'], 'Assets are incomplete')
            new_index = read(dist, 'index.html')
            require(sha(new_index) == receipt['indexSha256'], 'Dist index changed')
            temporary = stage(release, new_index, 0o644)
            receipt.update(status='prepared', preparedAt=now())
            save()
            guard(release, receipt['previousIndexSha256'])
            os.replace(temporary, 'index.html', src_dir_fd=release, dst_dir_fd=release)
            temporary, replaced = None, True
            receipt['promotedAt'] = now()
            try:
                postcheck(release, verified['files'])
            except Exception as error:
                receipt.update(status='local-postcheck-failed', error=str(error),
                               rollback=rollback(release, rollout, receipt['previousIndexSha256'], receipt['indexSha256']))
            else:
                receipt['status'] = 'published-local-verified'
            receipt['finishedAt'] = now()
            save()
            return receipt
        except BaseException as error:
            # Receipt errors/interruption alone must not roll back a successful index.
            if receipt['status'] not in ('published-local-verified', 'local-postcheck-failed'):
                receipt['status'] = 'interrupted-after-promotion' if replaced else 'aborted-before-promotion'
            receipt.update(error=f'{type(error).__name__}: {error}', finishedAt=now())
            try:
                save()
            except Exception as receipt_error:
                print(json.dumps({'receiptWriteError': str(receipt_error), 'recovery': receipt}), file=sys.stderr)
            raise
        finally:
            if temporary is not None:
                os.unlink(temporary, dir_fd=release)


def run(publish):
    require(not publish or os.geteuid() != 0, 'Run --publish as the ordinary server user, never root')
    root = os.open('/', DIR_FLAGS)
    try:
        with directory(root, str(PROJECT)[1:]) as project, directory(root, str(RELEASE)[1:]) as release, directory(project, 'dist') as dist:
            def prepare():
                guard(release)
                verified = candidate(project, dist)
                before = read(release, 'index.html')
                plan = asset_plan(release, verified['files'])
                guard(release, sha(before))
                return verified, before, plan
            if not publish:
                verified, before, plan = prepare()
                return {'status': 'dry-run-ready', 'writesPerformed': False, 'release': str(RELEASE),
                        'previousIndexSha256': sha(before), 'indexSha256': verified['files']['index.html'],
                        'suite': verified['suite'], 'sourceSha256': verified['sourceSha256'], 'fullDistSha256': verified['fullDistSha256'],
                        'assetPlan': plan, 'excludedDistFiles': verified['excludedDistFiles']}
            with directory(project, STATE, create=True, mode=0o700) as state:
                info = os.fstat(state)
                require(info.st_uid == os.geteuid() and not info.st_mode & 0o077, 'Rollout directory must be private and owned by the publisher')
                lock = os.open('publish.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=state)
                try:
                    info = os.fstat(lock)
                    require(stat.S_ISREG(info.st_mode) and info.st_uid == os.geteuid() and info.st_nlink == 1, 'Unsafe publication lock')
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    verified, before, plan = prepare()
                    return promote(project, dist, release, state, verified, before, plan)
                finally:
                    os.close(lock)
    finally:
        os.close(root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true', help='Perform authorized promotion; otherwise read-only dry-run')
    args = parser.parse_args()
    try:
        result = run(args.publish)
        if args.publish:
            print(json.dumps({key: result[key] for key in ('status', 'receipt', 'backup', 'previousIndexSha256', 'indexSha256')}, indent=2))
        else:
            print(json.dumps(result, indent=2))
        return 0 if result['status'] in ('dry-run-ready', 'published-local-verified') else 1
    except (Exception, KeyboardInterrupt) as error:
        print(json.dumps({'status': 'refused-or-interrupted', 'error': f'{type(error).__name__}: {error}'}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
