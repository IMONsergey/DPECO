#!/usr/bin/env python3
"""Read-only public acceptance of the user-directed release; full QA is reported separately."""
import sys
sys.dont_write_bytecode=True
import importlib.util,json,os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
PROJECT=Path('/home/sergey/Projects/DPECO-hover-final-20261112')
spec=importlib.util.spec_from_file_location('user_directed_release',PROJECT/'qa/homepage/publish-client-mobile-20261112.py')
driver=importlib.util.module_from_spec(spec);spec.loader.exec_module(driver)
p=driver.p;lab=driver.lab;http=driver.http;require=p.require
REL='qa/homepage/results/client-mobile-rollouts/20261112T171109Z-8ffa053954d0'
root=os.open('/',p.DIR_FLAGS)
try:
 with p.directory(root,str(PROJECT)[1:]) as project,p.directory(project,'dist') as dist,p.directory(root,str(lab.LAB)[1:]) as labfd,p.directory(labfd,lab.LIVE) as live:
  receipt,receipt_sha=p.read_json(project,REL+'/receipt.json')
  require(receipt['status']=='published-user-directed-targeted-pass' and receipt['qaStatus']=='targeted-pass','Unexpected release status')
  require(receipt['live']==str(lab.LAB/lab.LIVE) and receipt['url']==http.BASE,'Unexpected target')
  verified=driver.identity(project,dist)
  require(receipt['identity']==verified,'Published identity differs from current source')
  files=verified['files'];require(receipt['liveFilesSha256']==p.map_sha(files),'File-map hash mismatch')
  lab.guard(labfd,live);require(p.scan(live)==files,'Live files differ')
  before,before_sha=p.read_json(project,REL+'/gallery.before.json')
  require(p.map_sha(before)==receipt['previousManifestSha256'],'Before manifest changed')
  backup_name=Path(receipt['backup']).name
  require(receipt['backup']==str(lab.LAB/backup_name) and backup_name.startswith('.gallery-before-user-directed-'),'Unexpected backup')
  with p.directory(labfd,backup_name) as backup:require(lab.manifest(backup)==before,'Backup changed')
  html=sorted(name for name in files if Path(name).suffix.lower() in ('.html','.htm'))
  require(html==['index.html'],'Extra HTML page')
  blocked=http.forbidden_paths(before,files,backup_name)
  requests=[('',200,files['index.html'])]+[(name,200,digest) for name,digest in sorted(files.items())]+[(name,404,None) for name in blocked]
  with ThreadPoolExecutor(max_workers=6) as pool:checks=list(pool.map(http.check_url,requests))
  checks.append(http.check_url(('',200,files['index.html'])))
  lab.guard(labfd,live);require(p.scan(live)==files and driver.identity(project,dist)==verified,'Release changed during HTTP reads')
  require(p.read_json(project,REL+'/receipt.json')[1]==receipt_sha,'Receipt changed')
  require(p.read_json(project,REL+'/gallery.before.json')[1]==before_sha,'Before manifest changed')
  with p.directory(labfd,backup_name) as backup:require(lab.manifest(backup)==before,'Backup changed during verification')
  result={'status':'pass' if all(c['passed'] for c in checks) else 'fail','finishedAt':p.now(),'url':http.BASE,'receipt':str(PROJECT/REL/'receipt.json'),'receiptSha256':receipt_sha,'qaStatus':'targeted-pass','previousBaselineCiRun':driver.CI,'publishedFilesChecked':len(files),'forbiddenPathsChecked':len(blocked),'singleSpaEntryHtml':True,'htmlFiles':html,'preservedGalleryVerified':True,'sourceSha256':verified['sourceSha256'],'fullDistSha256':verified['fullDistSha256'],'liveFilesSha256':p.map_sha(files),'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks)}
finally:os.close(root)
out=PROJECT/REL/'public-http-verification.json'
with out.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps({key:result[key] for key in ('status','url','finishedAt','qaStatus','publishedFilesChecked','forbiddenPathsChecked','preservedGalleryVerified','passed','failed')},ensure_ascii=False,indent=2))
print(str(out))
sys.exit(0 if result['status']=='pass' else 1)
