#!/usr/bin/env python3
"""Promote the QA-accepted homepage to the existing lab, dry-run by default.

The existing user-owned site directory is exchanged atomically with a sibling
staged directory. The complete old gallery (including symlinks) is retained
outside the webroot. No sudo, service/configuration change, network or build.
Public HTTPS/browser acceptance remains a separate required step.
"""
from __future__ import annotations

import argparse
import ctypes
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import stat
import sys
import uuid

sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parents[2]
LAB = Path('/home/sergey/Projects/DPECO-Design-Gallery')
LIVE = 'site'
STATE = 'qa/homepage/results/lab-rollouts'
SERVER_SHA = 'f4ff6959d67d9d278e6cf946e287da834edaeb526a665d80bc46cb7c08fcad7f'
spec = importlib.util.spec_from_file_location('homepage_publisher', Path(__file__).with_name('publish-server.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
require = publisher.require


def identity(info):
    return info.st_dev, info.st_ino


def manifest(root, prefix=''):
    """Fingerprint all regular files, directories and link texts without following links."""
    result = {}
    for name in sorted(os.listdir(root)):
        publisher.parts(name)
        relative = f'{prefix}/{name}' if prefix else name
        before = os.stat(name, dir_fd=root, follow_symlinks=False)
        item = {'mode': stat.S_IMODE(before.st_mode), 'uid': before.st_uid, 'gid': before.st_gid}
        if stat.S_ISDIR(before.st_mode):
            item['type'] = 'directory'
            result[relative] = item
            with publisher.directory(root, name) as child:
                require(identity(os.fstat(child)) == identity(before), f'Directory changed: {relative}')
                result.update(manifest(child, relative))
        elif stat.S_ISREG(before.st_mode):
            item.update(type='file', size=before.st_size, sha256=publisher.sha(publisher.read(root, name)))
            result[relative] = item
        elif stat.S_ISLNK(before.st_mode):
            item.update(type='symlink', target=os.readlink(name, dir_fd=root))
            result[relative] = item
        else:
            raise RuntimeError(f'Special file in live gallery: {relative}')
        after = os.stat(name, dir_fd=root, follow_symlinks=False)
        require(identity(before) == identity(after)
                and before.st_mtime_ns == after.st_mtime_ns
                and before.st_ctime_ns == after.st_ctime_ns,
                f'Entry changed during inventory: {relative}')
    return result


def guard(lab, live, expected=None):
    parent_info = os.fstat(lab)
    require(parent_info.st_uid == os.geteuid() and not parent_info.st_mode & 0o002,
            'Lab parent must be owned by this user and not world-writable')
    current = os.stat(LIVE, dir_fd=lab, follow_symlinks=False)
    require(stat.S_ISDIR(current.st_mode) and current.st_uid == os.geteuid()
            and identity(current) == identity(os.fstat(live)),
            'Live directory was replaced, is a symlink or is not owned by this user')
    require(publisher.sha(publisher.read(lab, 'server.mjs')) == SERVER_SHA,
            'Audited static backend changed; recheck its root resolution before promotion')
    if expected is not None:
        require(manifest(live) == expected, 'Live gallery changed concurrently')


def exchange(parent_fd, first, second):
    """Only Linux RENAME_EXCHANGE; caller records the phase before fsync."""
    publisher.parts(first)
    publisher.parts(second)
    require('/' not in first and '/' not in second, 'Exchange names must be direct siblings')
    libc = ctypes.CDLL(None, use_errno=True)
    rename = getattr(libc, 'renameat2', None)
    require(rename is not None, 'Atomic renameat2 is unavailable; no fallback performed')
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(parent_fd, os.fsencode(first), parent_fd, os.fsencode(second), 2) != 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))


def stage_guard(lab, name, staged):
    current = os.stat(name, dir_fd=lab, follow_symlinks=False)
    require(stat.S_ISDIR(current.st_mode) and current.st_uid == os.geteuid()
            and identity(current) == identity(os.fstat(staged)),
            'Staged pathname was replaced or is no longer the verified directory')


def namespace_phase(lab, backup_name, old_identity, new_identity):
    """Recover actual namespace state even if interrupted just after the syscall."""
    try:
        current = identity(os.stat(LIVE, dir_fd=lab, follow_symlinks=False))
        backup = identity(os.stat(backup_name, dir_fd=lab, follow_symlinks=False))
    except OSError:
        return 'unknown'
    if (current, backup) == (old_identity, new_identity):
        return 'before-exchange-or-restored'
    if (current, backup) == (new_identity, old_identity):
        return 'exchanged'
    return 'unknown'


def stage_files(dist, staged, files):
    for relative, expected in sorted(files.items()):
        data = publisher.read(dist, relative)
        require(publisher.sha(data) == expected, f'Dist changed during staging: {relative}')
        with publisher.parent(staged, relative, create=True) as (parent, name):
            descriptor = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC,
                                 0o644, dir_fd=parent)
            with os.fdopen(descriptor, 'wb') as output:
                output.write(data)
                output.flush()
                os.fchmod(output.fileno(), 0o644)
                os.fsync(output.fileno())
            os.fsync(parent)
    os.fsync(staged)
    require(publisher.scan(staged) == files, 'Staged release differs from verified build')


def promote(project, dist, lab, live, state, verified, before):
    run_id = publisher.datetime.now(publisher.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:12]
    backup_name = '.gallery-before-' + run_id
    os.mkdir(backup_name, 0o755, dir_fd=lab)
    os.fsync(lab)
    os.mkdir(run_id, 0o700, dir_fd=state)
    os.fsync(state)
    old_identity = identity(os.fstat(live))
    receipt_path = PROJECT / STATE / run_id / 'receipt.json'
    receipt = {'status': 'staging', 'startedAt': publisher.now(), 'url': 'https://debtprice-lab.imon.world/',
               'live': str(LAB / LIVE), 'backup': str(LAB / backup_name), 'receipt': str(receipt_path),
               'previousManifestSha256': publisher.map_sha(before), 'verification': verified,
               'publicHttpCheck': 'not-run'}
    exchanged = False
    with publisher.directory(state, run_id) as rollout, publisher.directory(lab, backup_name) as staged:
        new_identity = identity(os.fstat(staged))
        def save():
            publisher.store_private(rollout, 'receipt.json', (json.dumps(receipt, ensure_ascii=False, indent=2) + '\n').encode())
        try:
            require(os.fstat(staged).st_dev == os.fstat(live).st_dev, 'Stage and live are on different filesystems')
            publisher.store_private(rollout, 'gallery.before.json', (json.dumps(before, ensure_ascii=False, indent=2) + '\n').encode())
            save()
            stage_files(dist, staged, verified['files'])
            require(publisher.candidate(project, dist) == verified, 'QA/source/build changed while staging')
            guard(lab, live, before)
            require(publisher.scan(staged) == verified['files'], 'Staged release changed concurrently')
            receipt.update(status='prepared', preparedAt=publisher.now())
            save()
            guard(lab, live, before)
            stage_guard(lab, backup_name, staged)
            exchange(lab, LIVE, backup_name)
            exchanged = True
            receipt['promotedAt'] = publisher.now()
            try:
                os.fsync(lab)
                require(identity(os.stat(LIVE, dir_fd=lab, follow_symlinks=False)) == new_identity,
                        'New live directory changed after exchange')
                require(identity(os.stat(backup_name, dir_fd=lab, follow_symlinks=False)) == old_identity,
                        'Backup directory changed after exchange')
                require(manifest(live) == before, 'Preserved gallery differs from its full inventory')
                require(publisher.scan(staged) == verified['files'], 'Live release postcheck mismatch')
            except Exception as error:
                receipt.update(status='local-postcheck-failed', error=str(error))
                restored = False
                try:
                    require(identity(os.stat(LIVE, dir_fd=lab, follow_symlinks=False)) == new_identity
                            and identity(os.stat(backup_name, dir_fd=lab, follow_symlinks=False)) == old_identity
                            and publisher.scan(staged) == verified['files'] and manifest(live) == before,
                            'Concurrent change detected; automatic rollback refused to preserve it')
                    exchange(lab, LIVE, backup_name)
                    restored = True
                    os.fsync(lab)
                    receipt['rollback'] = {'status': 'restored'}
                except Exception as rollback_error:
                    restored = restored or namespace_phase(lab, backup_name, old_identity, new_identity) == 'before-exchange-or-restored'
                    receipt['rollback'] = {'status': 'restored-not-durable' if restored else 'not-restored',
                                           'reason': str(rollback_error)}
            else:
                receipt.update(status='published-local-verified', preservedGalleryVerified=True,
                               liveFilesSha256=publisher.map_sha(verified['files']))
            receipt['finishedAt'] = publisher.now()
            save()
            return receipt
        except BaseException as error:
            phase = namespace_phase(lab, backup_name, old_identity, new_identity)
            receipt['namespacePhase'] = phase
            if receipt['status'] not in ('published-local-verified', 'local-postcheck-failed'):
                receipt['status'] = ('interrupted-after-exchange' if phase == 'exchanged'
                                     else 'aborted-before-exchange' if phase == 'before-exchange-or-restored' and not exchanged
                                     else 'interrupted-state-unknown')
            receipt.update(error=f'{type(error).__name__}: {error}', finishedAt=publisher.now())
            try:
                save()
            except Exception as receipt_error:
                print(json.dumps({'receiptWriteError': str(receipt_error), 'recovery': receipt}), file=sys.stderr)
            raise


def run(publish):
    require(publisher.PROJECT == PROJECT, 'QA publisher project path differs')
    require(not publish or os.geteuid() != 0, 'Publish as the ordinary server user, never root')
    root = os.open('/', publisher.DIR_FLAGS)
    try:
        with publisher.directory(root, str(PROJECT)[1:]) as project, publisher.directory(project, 'dist') as dist, \
                publisher.directory(root, str(LAB)[1:]) as lab, publisher.directory(lab, LIVE) as live:
            def prepare():
                guard(lab, live)
                verified = publisher.candidate(project, dist)
                before = manifest(live)
                guard(lab, live, before)
                return verified, before
            if not publish:
                verified, before = prepare()
                return {'status': 'dry-run-ready', 'writesPerformed': False, 'live': str(LAB / LIVE),
                        'previousManifestSha256': publisher.map_sha(before), 'previousEntries': len(before),
                        'previousSymlinks': [name for name, info in before.items() if info['type'] == 'symlink'],
                        'indexSha256': verified['files']['index.html'], 'fullDistSha256': verified['fullDistSha256'],
                        'suite': verified['suite'], 'excludedDistFiles': verified['excludedDistFiles'],
                        'promotion': 'renameat2 RENAME_EXCHANGE, full old gallery retained outside webroot'}
            lock = os.open('.lab-publish.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=lab)
            try:
                info = os.fstat(lock)
                require(stat.S_ISREG(info.st_mode) and info.st_uid == os.geteuid() and info.st_nlink == 1
                        and not info.st_mode & 0o077, 'Unsafe publication lock')
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                with publisher.directory(project, STATE, create=True, mode=0o700) as state:
                    info = os.fstat(state)
                    require(info.st_uid == os.geteuid() and not info.st_mode & 0o077, 'Rollout state must be private')
                    verified, before = prepare()
                    return promote(project, dist, lab, live, state, verified, before)
            finally:
                os.close(lock)
    finally:
        os.close(root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true', help='Perform authorized exchange; default is read-only dry-run')
    args = parser.parse_args()
    try:
        result = run(args.publish)
        print(json.dumps(result if not args.publish else {key: result.get(key) for key in
                         ('status', 'receipt', 'backup', 'previousManifestSha256', 'liveFilesSha256')}, indent=2))
        return 0 if result['status'] in ('dry-run-ready', 'published-local-verified') else 1
    except (Exception, KeyboardInterrupt) as error:
        print(json.dumps({'status': 'refused-or-interrupted', 'error': f'{type(error).__name__}: {error}'}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
