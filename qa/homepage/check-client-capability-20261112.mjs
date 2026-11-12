import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'), out=path.join(project,'qa/homepage/results/client-capability-20261112');
await fs.mkdir(out,{recursive:true});
try{await fs.access(path.join(out,'report.json'));throw Error('Report already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const sha=b=>createHash('sha256').update(b).digest('hex');
async function scan(dir,prefix=''){const r={};for(const e of await fs.readdir(dir,{withFileTypes:true})){const n=prefix+e.name,f=path.join(dir,e.name);if(e.isDirectory())Object.assign(r,await scan(f,n+'/'));else if(e.isFile())r[n]=sha(await fs.readFile(f));else throw Error('Unexpected file '+f);}return Object.fromEntries(Object.entries(r).sort(([a],[b])=>a.localeCompare(b)));}
async function identity(){const source=await scan(path.join(project,'src'),'src/');for(const n of ['index.html','vite.config.ts','package.json','package-lock.json'])source[n]=sha(await fs.readFile(path.join(project,n)));return {source,public:await scan(path.join(project,'public')),build:await scan(path.join(project,'dist'))};}
const before=await identity(),report={startedAt:new Date().toISOString(),contract:'Two capability tabs: CTA only for Дебиторская задолженность in seller and buyer views',scriptSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),identity:before,checks:[],errors:[],writes:[],screenshots:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^[/]+/, '')||'index.html';const f=path.resolve(project,'dist',rel);if(!f.startsWith(path.join(project,'dist')+path.sep)){res.writeHead(403).end();return;}const b=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const ids=['credit','factoring','receivables','claims','other'],card=id=>'[data-capability-new-card="'+id+'"]';
async function check(name,fn){try{await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:String(e)});throw e;}}
let browser;
try{browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
for(const [width,theme] of [[1440,'light'],[768,'light'],[390,'dark'],[320,'light']]){
const mobile=width<=699,compact=width<1280,context=await browser.newContext({viewport:{width,height:1000},isMobile:mobile,hasTouch:mobile,colorScheme:theme,reducedMotion:'reduce',locale:'ru-RU'});
await context.route('**/*',route=>{const req=route.request(),method=req.method(),url=req.url();if(!['GET','HEAD'].includes(method))report.writes.push({method,url});return ['GET','HEAD'].includes(method)&&url.startsWith(base+'/')?route.continue():route.abort();});
const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(String(e)));await page.goto(base+'/?theme='+theme,{waitUntil:'domcontentloaded'});await page.locator('[data-capability-new-card]').first().waitFor();const label=width+' '+theme;
await check(label+' seller CTA only in receivables',async()=>{assert.equal(await page.locator('.capability-new__cta').count(),1);for(const id of ids)assert.equal(await page.locator(card(id)+' .capability-new__cta').count(),id==='receivables'?1:0,id);assert.equal(await page.locator(card('receivables')+' .capability-new__cta span').textContent(),'Обсудить продажу');assert.equal(await page.locator(card('receivables')+' .capability-new__cta').getAttribute('href'),'#request');});
await check(label+' card content and expansion preserved',async()=>{assert.equal(await page.locator('[data-capability-new-card]').count(),5);for(const id of ids)assert.ok((await page.locator(card(id)+' .capability-new__description').textContent()).trim().length>12);if(!compact){await page.locator('[data-capability-new-expand="receivables"]').focus();assert.equal(await page.locator('[data-capability-new-expand="receivables"]').getAttribute('aria-expanded'),'true');}assert.equal(await page.locator(card('receivables')+' .capability-new__cta').isVisible(),true);});
await check(label+' buyer CTA only in receivables',async()=>{await page.locator('#capability-new-buyer').click();assert.equal(await page.locator('#capability-new-buyer').getAttribute('aria-selected'),'true');assert.equal(await page.locator('.capability-new__cta').count(),1);for(const id of ids)assert.equal(await page.locator(card(id)+' .capability-new__cta').count(),id==='receivables'?1:0,id);assert.equal(await page.locator(card('receivables')+' .capability-new__cta span').textContent(),'Посмотреть лоты');assert.ok((await page.locator(card('receivables')+' .capability-new__description').textContent()).includes('Корпоративных клиентов'));});
await check(label+' audience switch reversible',async()=>{await page.locator('#capability-new-seller').click();assert.equal(await page.locator(card('receivables')+' .capability-new__cta span').textContent(),'Обсудить продажу');await page.locator('#capability-new-buyer').click();assert.equal(await page.locator(card('receivables')+' .capability-new__cta span').textContent(),'Посмотреть лоты');assert.equal(await page.locator('[data-capability-new-card]').count(),5);});
if(width===1440||width===390){const name='capabilities-'+width+'-'+theme+'.png';await page.locator('#capabilities').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name)});report.screenshots.push(name);}await context.close();}
await check('source public build unchanged during QA',async()=>assert.deepEqual(await identity(),before));
await check('no JavaScript errors or writes',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);});report.status='pass';}
catch(e){report.status='fail';report.error=String(e);}
finally{await browser?.close();await new Promise(r=>server.close(r));report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed),errors:report.errors,output:out}));}
process.exitCode=report.status==='pass'?0:1;
