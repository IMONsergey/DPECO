import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(project,'qa/homepage/results/client-availability-20261112');
await fs.mkdir(out,{recursive:true});
try{await fs.access(path.join(out,'report.json'));throw Error('Existing report must be preserved before a deliberate rerun');}catch(e){if(e.code!=='ENOENT')throw e;}
const sha=b=>createHash('sha256').update(b).digest('hex');
async function scan(dir,prefix=''){const result={};for(const e of await fs.readdir(dir,{withFileTypes:true})){const n=prefix+e.name,f=path.join(dir,e.name);if(e.isDirectory())Object.assign(result,await scan(f,n+'/'));else if(e.isFile())result[n]=sha(await fs.readFile(f));else throw Error('Unexpected file '+f);}return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));}
async function identity(){const source=await scan(path.join(project,'src'),'src/');for(const n of ['index.html','vite.config.ts','package.json','package-lock.json'])source[n]=sha(await fs.readFile(path.join(project,n)));return {source,public:await scan(path.join(project,'public')),build:await scan(path.join(project,'dist'))};}
const before=await identity();
const report={startedAt:new Date().toISOString(),contract:'User 12 Nov 20:25 MSK: close About/Contacts and mark all nine links in the three shown footer columns as in development; keep other released navigation.',scriptSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),identity:before,checks:[],errors:[],screenshots:[],writes:[],safety:'Disposable browser; only local GET/HEAD requests allowed, no external submissions.'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';const f=path.resolve(project,'dist',rel);if(!f.startsWith(path.join(project,'dist')+path.sep)){res.writeHead(403).end();return;}const b=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
const footer='.p10-footer nav:is([aria-labelledby="footer-platform-title"],[aria-labelledby="footer-information-title"],[aria-labelledby="footer-contact-title"]) a';
async function check(name,fn){try{await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:String(e)});throw e;}}
async function tip(page){await page.locator('#homepage-availability-development.is-visible').waitFor({state:'visible'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('#homepage-availability-development')).opacity==='1');assert.equal(await page.locator('#homepage-availability-development').textContent(),'В разработке');const b=await page.locator('#homepage-availability-development').boundingBox();const v=page.viewportSize();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,'Tooltip inside viewport');}
async function inert(page,link,mobile){await link.scrollIntoViewIfNeeded();const b=await link.boundingBox();assert.ok(b);const u=page.url();if(mobile)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);assert.equal(page.url(),u);await link.focus();await page.keyboard.press('Enter');assert.equal(page.url(),u);await tip(page);await page.keyboard.press('Escape');assert.equal(await page.locator('#homepage-availability-development').evaluate(e=>e.classList.contains('is-visible')),false);}
try{
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const [width,theme] of [[1440,'light'],[390,'dark']]){
  const mobile=width<1200;
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:mobile,hasTouch:mobile,colorScheme:theme,reducedMotion:'reduce',locale:'ru-RU',timezoneId:'Europe/Moscow'});
  await context.route('**/*',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method()))report.writes.push({method:r.method(),url:r.url()});return ['GET','HEAD'].includes(r.method())&&r.url().startsWith(base+'/')?route.continue():route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(String(e)));let popups=0;page.on('popup',async p=>{popups++;await p.close();});
  await page.goto(base+'/?theme='+theme,{waitUntil:'domcontentloaded'});await page.locator('.p10-hero').waitFor();const label=width+' '+theme;
  await check(label+' other approved destinations remain enabled',async()=>{
   for(const [s,h] of [['.header__account','https://my.debtprice.market/site/login'],['.header__register','https://my.debtprice.market/site/register'],['.header__phone','tel:+79159724101'],['.header__email','mailto:v@debtprice.market'],['.header__telegram','https://t.me/+0NVxCNB9xCozYmFi'],['.p10-offer a','https://my.debtprice.market/site/register'],['.p10-footer__bottom a','#/privacy']]){const a=page.locator(s).first();assert.equal(await a.getAttribute('href'),h,s);assert.notEqual(await a.getAttribute('aria-disabled'),'true',s);}
   assert.equal(await page.locator('nav[aria-labelledby="footer-ecosystem-title"] a[href]').count(),6);
  });
  await check(label+' 13 requested links have development status and no destination',async()=>{
   const links=page.locator(footer+', .header__nav-link[data-availability="development"], .header__mobile-link[data-availability="development"]');
   const selected=(await links.evaluateAll(els=>els.map(e=>({text:e.textContent.trim(),footer:!!e.closest('.p10-footer'),kind:e.dataset.availability,href:e.getAttribute('href'),disabled:e.getAttribute('aria-disabled'),tab:e.tabIndex,description:e.getAttribute('aria-describedby')})))).filter(e=>e.footer||e.text!=='Покупателям');
   assert.equal(selected.length,13);for(const e of selected){assert.equal(e.kind,'development');assert.equal(e.href,null);assert.equal(e.disabled,'true');assert.equal(e.tab,0);assert.ok(e.description.includes('homepage-availability-development'));}
   assert.equal(await page.locator(footer).count(),9);
  });
  await check(label+' header or mobile About/Contacts are inert with tooltips',async()=>{
   if(mobile)await page.locator('[data-mobile-toggle]').click();
   for(const name of ['О проекте','Контакты']){if(mobile&&await page.locator('[data-mobile-toggle]').getAttribute('aria-expanded')!=='true')await page.locator('[data-mobile-toggle]').click();const a=page.locator(mobile?'.header__mobile-link':'.header__nav-link').filter({hasText:name});if(!mobile){await a.hover();await tip(page);}await inert(page,a,mobile);}
   if(mobile&&await page.locator('[data-mobile-toggle]').getAttribute('aria-expanded')==='true')await page.locator('[data-mobile-toggle]').click();
  });
  await check(label+' all nine footer links respond to hover or touch and keyboard without navigation',async()=>{
   const links=page.locator(footer);
   for(let i=0;i<9;i++){const a=links.nth(i);await a.scrollIntoViewIfNeeded();if(!mobile){await a.hover();await tip(page);}await inert(page,a,mobile);}
   assert.equal(popups,0);
   const a=links.nth(3);await a.scrollIntoViewIfNeeded();if(mobile){await a.focus();}else await a.hover();await tip(page);
   const file='footer-'+width+'-'+theme+'.png';await page.screenshot({path:path.join(out,file)});report.screenshots.push(file);
  });
  await check(label+' direct About/Contacts addresses resolve to homepage',async()=>{
   for(const route of ['about','about/','contacts','contacts/']){await page.goto(base+'/?theme='+theme+'#/'+route,{waitUntil:'domcontentloaded'});await page.locator('.p10-hero').waitFor();assert.equal(await page.locator('.info-page--about,.info-page--contacts').count(),0);assert.equal(new URL(page.url()).hash,'');}
  });
  await check(label+' Privacy still opens',async()=>{
   await page.goto(base+'/?theme='+theme+'#/privacy',{waitUntil:'domcontentloaded'});await page.locator('.info-page h1').waitFor();assert.ok(await page.locator('a[href="https://my.debtprice.market/Privacy_policy.pdf"]').count()>0);await page.locator('.header__brand').click();await page.locator('.p10-hero').waitFor();
  });
  await check(label+' live search excludes closed pages and keeps real results',async()=>{
   if(mobile)await page.locator('[data-mobile-toggle]').click();else await page.locator('[data-nav-toggle="search"]').click();
   const input=page.locator(mobile?'#mobile-search':'#header-search');for(const q of ['контакты','о проекте']){await input.fill(q);assert.equal(await page.locator('[data-live-search-result][href="#/about"],[data-live-search-result][href="#/contacts"]').count(),0);}
   await input.fill('экосистема');await page.locator('[data-live-search-result]:visible').first().waitFor();assert.ok(await page.locator('[data-live-search-result][href]:visible').count()>0);
  });
  await context.close();
 }
 await check('source public and build bytes unchanged',async()=>assert.deepEqual(await identity(),before));
 await check('no runtime errors or attempted network writes',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);});
 report.status='pass';
}catch(e){report.status='fail';report.error=String(e);}
finally{await browser?.close();await new Promise(r=>server.close(r));report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed),errors:report.errors,output:out}));}
process.exitCode=report.status==='pass'?0:1;
