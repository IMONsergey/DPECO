import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(project,'qa/homepage/results/client-links-20261112');
await fs.mkdir(out,{recursive:true});
const sha = b => createHash('sha256').update(b).digest('hex');
async function scan(dir,prefix='') {
 const result={};
 for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
  const name=prefix+entry.name, file=path.join(dir,entry.name);
  if(entry.isDirectory()) Object.assign(result,await scan(file,name+'/'));
  else if(entry.isFile()) result[name]=sha(await fs.readFile(file));
  else throw Error('Unexpected file '+file);
 }
 return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
async function identity() {
 const source=await scan(path.join(project,'src'),'src/');
 for(const name of ['index.html','vite.config.ts','package.json','package-lock.json']) source[name]=sha(await fs.readFile(path.join(project,name)));
 return {source,public:await scan(path.join(project,'public')),build:await scan(path.join(project,'dist'))};
}
const before=await identity();
const report={startedAt:new Date().toISOString(),sourceDocument:'https://docs.google.com/document/d/1hH3xng6E4rAf-Cfeqz9VMI788a7nFbq_0TAJrdfv444/edit?tab=t.0',contract:'Only navigation requested in the 12 November client edits; prior blanket no-navigation contract superseded by the user.',scriptSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),identity:before,checks:[],errors:[],screenshots:[],safety:'Disposable browser. Off-origin requests and all writes blocked. No submitted requests or messages.'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try {
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(project,'dist',rel);
  if(!file.startsWith(path.join(project,'dist')+path.sep)) {res.writeHead(403).end();return;}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
async function check(name,fn) {
 try {await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}
 catch(error){report.checks.push({name,passed:false,error:String(error)});throw error;}
}
try {
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const [width,theme] of [[1440,'light'],[390,'dark']]) {
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce',locale:'ru-RU',timezoneId:'Europe/Moscow'});
  await context.route('**/*',route=>{
   const request=route.request();
   return request.method()==='GET'&&request.url().startsWith(base+'/') ? route.continue():route.abort();
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(String(error)));
  await page.goto(base+'/?theme='+theme,{waitUntil:'domcontentloaded'});
  await page.locator('.header__brand').waitFor();
  const prefix=width+' '+theme;
  await check(prefix+' requested destinations remain enabled',async()=>{
   const expected=[
    ['.header__account','https://my.debtprice.market/site/login'],
    ['.header__register','https://my.debtprice.market/site/register'],
    ['.header__phone','tel:+79159724101'],
    ['.header__email','mailto:v@debtprice.market'],
    ['.header__telegram','https://t.me/+0NVxCNB9xCozYmFi'],
    ['.p10-source-note a','https://my.debtprice.market/site/login'],
    ['.p10-offer a','https://my.debtprice.market/site/register'],
    ['.p10-request-consent a','https://my.debtprice.market/Privacy_policy.pdf'],
    ['.p10-footer__bottom a','#/privacy'],
    ['.p10-footer__socials a','https://t.me/+0NVxCNB9xCozYmFi']
   ];
   for(const [selector,href] of expected) {
    const link=page.locator(selector).first();assert.equal(await link.getAttribute('href'),href,selector);
    assert.notEqual(await link.getAttribute('aria-disabled'),'true',selector);
   }
   const services=['https://my.debtprice.market/site/register','https://rvzrus.ru/','https://www.debt-tech.ru/','https://dolgtalk.ru/','https://navigator.debt-tech.ru/','https://pko300.ru/'].sort();
   for(const selector of ['.nav-panel--ecosystem a','.header__mobile-products a','.p10-ecosystem-card__button','nav[aria-labelledby="footer-ecosystem-title"] a']) {
    assert.deepEqual((await page.locator(selector).evaluateAll(links=>links.map(a=>a.getAttribute('href')))).sort(),services,selector);
   }
  });
  await check(prefix+' unavailable controls remain unavailable',async()=>{
   assert.equal(await page.locator('.p10-hero .hero__actions a[href], .p10-choice__actions a[href], .p10-materials a[href], nav[aria-labelledby="footer-platform-title"] a[href]').count(),0);
   assert.equal(await page.locator('.p10-footer__socials a').count(),1);
   assert.equal(await page.locator('a[href="#/buyers"], a[href="#/docs"], a[href^="#/sellers"]').count(),0);
  });
  await check(prefix+' actual click and Enter are not cancelled by app',async()=>{
   await page.evaluate(()=>{
    window.__approvedClicks=[];
    document.body.addEventListener('click',event=>{
     const a=event.target.closest?.('a[data-probe]');
     if(a){window.__approvedClicks.push({type:'click',prevented:event.defaultPrevented});event.preventDefault();}
    });
    document.body.addEventListener('auxclick',event=>{
     const a=event.target.closest?.('a[data-probe]');
     if(a){window.__approvedClicks.push({type:'auxclick',prevented:event.defaultPrevented});event.preventDefault();}
    });
   });
   if(width<1200) await page.locator('[data-mobile-toggle]').click();
   const link=page.locator(width<1200?'.header__mobile-register':'.header__register');
   await link.evaluate(a=>a.dataset.probe='true');
   await link.click(); 
   if(width<1200) await page.locator('[data-mobile-toggle]').click();
   await link.focus();await page.keyboard.press('Enter');
   if(width<1200) await page.locator('[data-mobile-toggle]').click();
   await link.click({button:'middle'});
   assert.deepEqual(await page.evaluate(()=>window.__approvedClicks),[{type:'click',prevented:false},{type:'click',prevented:false},{type:'auxclick',prevented:false}]);
   if(width<1200 && await page.locator('[data-mobile-toggle]').getAttribute('aria-expanded')==='true') await page.locator('[data-mobile-toggle]').click();
  });
  await check(prefix+' capabilities navigate to consultation',async()=>{
   const link=page.locator('.capability-new__card.is-active .capability-new__cta');
   assert.equal(await link.getAttribute('href'),'#request');
   await link.click();
   await page.waitForFunction(()=>location.hash === '#request');
   await page.waitForFunction(()=>Math.abs(document.querySelector('#request').getBoundingClientRect().top)<350);
  });
  await check(prefix+' live search returns results while typing',async()=>{
   await page.evaluate(()=>window.scrollTo(0,0));
   if(width<1200) await page.locator('[data-mobile-toggle]').click();
   else await page.locator('[data-nav-toggle="search"]').click();
   const input=page.locator(width<1200?'#mobile-search':'#header-search');
   await input.fill('контак');
   await page.locator('[data-live-search-result][href="#/contacts"]:visible').waitFor();
   await page.locator('[data-live-search-result][href="#/contacts"]:visible').click();
   await page.locator('.info-page--contacts h1').waitFor();
   assert.match(await page.locator('h1').textContent(),/Контакты/);
  });
  for(const [route,title] of [['about','О проекте'],['contacts','Контакты'],['privacy','Политика']]) {
   await check(prefix+' own page '+route,async()=>{
    await page.goto(base+'/?theme='+theme+'#/'+route,{waitUntil:'domcontentloaded'});
    await page.locator('.info-page h1').waitFor();
    assert.ok((await page.locator('h1').textContent()).trim());
    assert.equal(await page.locator('.info-breadcrumb a').first().getAttribute('href'),'#/');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
    if(route==='contacts') for(const mail of ['invest','debt','sales','pr','info']) assert.equal(await page.locator('a[href="mailto:'+mail+'@debtprice.market"]').count()>0,true);
    if(route==='privacy') assert.equal(await page.locator('a[href="https://my.debtprice.market/Privacy_policy.pdf"]').count()>0,true);
   });
  }
  await page.locator('.header__brand').click();
  await page.locator('.p10-hero').waitFor();
  await page.screenshot({path:path.join(out,'home-'+width+'-'+theme+'.png')});
  report.screenshots.push('home-'+width+'-'+theme+'.png');
  await context.close();
 }
 await check('source and built bytes unchanged during acceptance',async()=>assert.deepEqual(await identity(),before));
 await check('no uncaught JavaScript errors',async()=>assert.deepEqual(report.errors,[]));
 report.status='pass';
} catch(error){report.status='fail';report.error=String(error);}
finally {
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 report.finishedAt=new Date().toISOString();
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed),errors:report.errors,output:out},null,2));
}
process.exitCode=report.status==='pass'?0:1;
