#!/usr/bin/env python3
"""Publish the client-requested navigation after focused acceptance; original baseline gates stay unchanged."""
import sys
sys.dont_write_bytecode = True
import argparse, fcntl, hashlib, importlib.util, json, os, stat, uuid
from pathlib import Path
PROJECT = Path('/home/sergey/Projects/DPECO-hover-final-20261112')
STATE = 'qa/homepage/results/client-links-rollouts'
BASELINE = '9b116cd8cef772863dbf2dab46185266622006ce3eded5b08c7ebe7045267b51'
CI = 'https://github.com/IMONsergey/DPECO/actions/runs/43258595947'
EXPECTED = {
 'run-client-review-suite.py':'e0a2902dd0c6bf57c843957084ab54efb757485b4612405f74a0dd796db1aec8',
 'check-client-part2.mjs':'a67c85930521ce32ca980b20937a767e63d18e5f808ab80736cc2f068f7b9c80',
 'check-client-review.mjs':'cef36e2bc3b703358cddaea421a6b2b438b9b0308d24d81eb2023d75f2ce160b',
 'publish-server.py':'7dff5609eca4ef58fa2bdc5d430c261d79cf39f6f1dd54addf26ed6464d17c67',
 'publish-lab.py':'f96ac5f6f6f500e56233780489e4c1df4bb193563deef6d977fa941dd3680fe2',
 'verify-lab.py':'644a0bab0583bfa7067b138c50fe140a393ab24cd28f8654967e55da6c05581c'}
for name, digest in EXPECTED.items():
 assert hashlib.sha256((PROJECT/'qa/homepage'/name).read_bytes()).hexdigest() == digest, name
def module(name, file):
 spec=importlib.util.spec_from_file_location(name, PROJECT/'qa/homepage'/file)
 result=importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result
lab=module('unchanged_lab', 'publish-lab.py')
http=module('unchanged_http', 'verify-lab.py')
p=lab.publisher
require=p.require
ACCEPTANCE_SHA = 'f3f13785c446a8db8861b1a35a228f13d664c3b90ae446dd606123ba353b6b69'
TEST_SCRIPT_SHA = '318f5ab32c4c1990f8ed23b9d9657e5ba69f1396d025fbb8fb336a478cac1137'
def identity(project, dist):
 report, report_sha = p.read_json(project,'qa/homepage/results/client-links-20261112/report.json')
 require(report_sha == ACCEPTANCE_SHA,'Focused acceptance report changed')
 require(report.get('status')=='pass' and not report.get('errors'),'Focused acceptance is not passing')
 require(len(report['checks']) >= 18 and all(c['passed'] for c in report['checks']),'Incomplete focused acceptance')
 require(p.sha(p.read(project,'qa/homepage/check-client-links-20261112.mjs'))==TEST_SCRIPT_SHA==report['scriptSha256'],'Focused test changed')
 with p.directory(project,'src') as fd: source=p.scan(fd,'src')
 source.update({name:p.sha(p.read(project,name)) for name in ('index.html','vite.config.ts','package.json','package-lock.json')})
 with p.directory(project,'public') as fd: public=p.scan(fd)
 build=p.scan(dist)
 require(source==report['identity']['source'],'Source differs from tested candidate')
 require(public==report['identity']['public'],'Public source differs from tested candidate')
 require(build==report['identity']['build'],'Build differs from tested candidate')
 require(all(build.get(name)==sha for name,sha in public.items()),'Public assets differ')
 for name,digest in EXPECTED.items(): require(p.sha(p.read(project,'qa/homepage/'+name))==digest,'Original QA/gate changed: '+name)
 files={name:digest for name,digest in build.items() if p.publishable(name)}
 require(sorted(name for name in files if Path(name).suffix.lower() in ('.html','.htm'))==['index.html'],'Single SPA entry required')
 return {'sourceSha256':p.map_sha(source),'publicSourceSha256':p.map_sha(public),'fullDistSha256':p.map_sha(build),'acceptanceSha256':report_sha,'targetedChecks':len(report['checks']),'allowedPages':['/','#/about','#/contacts','#/privacy'],'fullRegressionStatus':'not-run-for-new-navigation-contract','qaScriptSha256':EXPECTED,'files':files,'excludedDistFiles':sorted(set(build)-set(files))}
def run(publish):
 require(os.geteuid()!=0,'Ordinary server user required')
 root=os.open('/',p.DIR_FLAGS)
 try:
  with p.directory(root,str(PROJECT)[1:]) as project, p.directory(project,'dist') as dist, p.directory(root,str(lab.LAB)[1:]) as labfd, p.directory(labfd,lab.LIVE) as live:
   lab.guard(labfd,live)
   require(p.sha(p.read(live,'index.html'))==BASELINE,'Live root differs from verified baseline')
   verified=identity(project,dist)
   before=lab.manifest(live)
   lab.guard(labfd,live,before)
   baseline_http=http.check_url(('',200,BASELINE))
   require(baseline_http['passed'],'Public baseline mismatch: '+json.dumps(baseline_http))
   if not publish:
    return {'status':'user-directed-dry-run-ready','writesPerformed':False,'qaStatus':'targeted-pass','previousBaselineCiRun':CI,'files':len(verified['files']),'indexSha256':verified['files']['index.html'],'previousManifestSha256':p.map_sha(before)}
   lock=os.open('.lab-publish.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW|os.O_CLOEXEC,0o600,dir_fd=labfd)
   try:
    info=os.fstat(lock)
    require(stat.S_ISREG(info.st_mode) and info.st_uid==os.geteuid() and info.st_nlink==1 and not info.st_mode&0o077,'Unsafe publication lock')
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    require(identity(project,dist)==verified,'Candidate changed before lock')
    lab.guard(labfd,live,before)
    with p.directory(project,STATE,create=True,mode=0o700) as state:
     info=os.fstat(state); require(info.st_uid==os.geteuid() and not info.st_mode&0o077,'Unsafe state directory')
     run_id=p.datetime.now(p.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:12]
     backup_name='.gallery-before-user-directed-'+run_id
     os.mkdir(backup_name,0o755,dir_fd=labfd); os.fsync(labfd)
     os.mkdir(run_id,0o700,dir_fd=state); os.fsync(state)
     old_id=lab.identity(os.fstat(live))
     receipt={'status':'staging-user-directed','startedAt':p.now(),'authorization':{'instruction':'Публикуй. Открой доступ к переходам, только к тем что были в правках. Это нужно максимально быстро.','scope':'Open only links and informational pages explicitly requested in the 12 November client edits; publish urgently after focused acceptance'},'qaStatus':'targeted-pass','previousBaselineCiRun':CI,'url':http.BASE,'live':str(lab.LAB/lab.LIVE),'backup':str(lab.LAB/backup_name),'receipt':str(PROJECT/STATE/run_id/'receipt.json'),'previousManifestSha256':p.map_sha(before),'identity':verified,'publicHttpCheck':'not-run'}
     with p.directory(state,run_id) as rollout, p.directory(labfd,backup_name) as staged:
      new_id=lab.identity(os.fstat(staged))
      def save(): p.store_private(rollout,'receipt.json',(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n').encode())
      p.store_private(rollout,'gallery.before.json',(json.dumps(before,ensure_ascii=False,indent=2)+'\n').encode())
      save()
      try:
       require(os.fstat(staged).st_dev==os.fstat(live).st_dev,'Cross-filesystem exchange forbidden')
       lab.stage_files(dist,staged,verified['files'])
       require(identity(project,dist)==verified,'Source/build changed during staging')
       lab.guard(labfd,live,before)
       receipt.update(status='prepared-user-directed',preparedAt=p.now()); save()
       lab.guard(labfd,live,before); lab.stage_guard(labfd,backup_name,staged)
       require(p.scan(staged)==verified['files'],'Staged content changed')
       lab.exchange(labfd,lab.LIVE,backup_name)
       receipt['promotedAt']=p.now(); os.fsync(labfd)
       require(lab.identity(os.stat(lab.LIVE,dir_fd=labfd,follow_symlinks=False))==new_id,'New live inode mismatch')
       require(lab.identity(os.stat(backup_name,dir_fd=labfd,follow_symlinks=False))==old_id,'Backup inode mismatch')
       require(lab.manifest(live)==before,'Full previous gallery backup mismatch')
       require(p.scan(staged)==verified['files'],'Published files mismatch')
       require(identity(project,dist)==verified,'Source/build changed after exchange')
       receipt.update(status='published-user-directed-targeted-pass',preservedGalleryVerified=True,liveFilesSha256=p.map_sha(verified['files']),finishedAt=p.now())
       save()
       return {key:receipt[key] for key in ('status','receipt','backup','qaStatus','previousBaselineCiRun','liveFilesSha256','promotedAt')}
      except BaseException as error:
       phase=lab.namespace_phase(labfd,backup_name,old_id,new_id)
       receipt.update(status='user-directed-publication-failed',namespacePhase=phase,error=repr(error),finishedAt=p.now())
       if phase=='exchanged':
        try:
         require(p.scan(staged)==verified['files'] and lab.manifest(live)==before,'Concurrent change; rollback refused')
         lab.stage_guard(labfd,lab.LIVE,staged); lab.stage_guard(labfd,backup_name,live)
         lab.exchange(labfd,lab.LIVE,backup_name); os.fsync(labfd)
         receipt['rollback']={'status':'restored'}
        except BaseException as restore_error: receipt['rollback']={'status':'not-restored','error':repr(restore_error)}
       save(); raise
   finally: os.close(lock)
 finally: os.close(root)
if __name__=='__main__':
 parser=argparse.ArgumentParser(); parser.add_argument('--publish',action='store_true')
 result=run(parser.parse_args().publish)
 print(json.dumps(result,ensure_ascii=False,indent=2))
