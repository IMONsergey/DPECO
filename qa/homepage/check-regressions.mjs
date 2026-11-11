import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Dedicated test browsers, never the owner's browser. No external writes.
const require = createRequire(import.meta.url);
const pw = require('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const phase = process.env.QA_PHASE || 'candidate';
const out = path.join(project, 'qa/homepage/results', `regressions-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(out, { recursive: true });
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2' };
const dist = path.join(project, 'dist');
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(dist + '/')) { res.writeHead(403).end(); return; }
    const stat = await fs.stat(file);
    if (!stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const report = { phase, createdAt:new Date().toISOString(), output:out, checks:[], screenshots:[], runtimeErrors:[], networkWrites:[], build:[] };
for (const name of (await fs.readdir(path.join(dist, 'assets'))).filter(x => /\.(js|css)$/.test(x))) {
  const bytes = await fs.readFile(path.join(dist, 'assets', name));
  report.build.push({ name, sha256:createHash('sha256').update(bytes).digest('hex') });
}
let page, browserName;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function settled() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function open(hash = '', viewport = {width:1280,height:900}) {
  await page.setViewportSize(viewport);
  await page.goto(base + hash, {waitUntil:'load'});
  await page.evaluate(() => document.fonts.ready);
  await settled();
}
async function shot(name, selector) {
  const file = `${browserName}-${name}.png`;
  if (selector) await page.locator(selector).screenshot({path:path.join(out,file), animations:'disabled'});
  else await page.screenshot({path:path.join(out,file), animations:'disabled'});
  report.screenshots.push({name,file});
}
async function check(name, action) {
  const item = {browser:browserName,name,status:'pass'};
  try { item.details = await action(); }
  catch(error) { item.status='fail'; item.error=String(error.stack || error); try { await shot(`FAIL-${name.replace(/[^a-z0-9-]/gi,'-')}`); } catch {} }
  report.checks.push(item);
  console.log(JSON.stringify({browser:browserName,name,status:item.status,error:item.error?.split('\n')[0]}));
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
const boxRead = selector => page.locator(selector).evaluateAll(elements => elements.map(el => {
  const r = el.getBoundingClientRect();
  const clipped = [];
  let p = el.parentElement;
  while (p && p !== document.body) {
    const s = getComputedStyle(p), b = p.getBoundingClientRect();
    if (/(hidden|clip)/.test(s.overflowY) && (r.bottom > b.bottom + 1 || r.top < b.top - 1)) clipped.push({class:p.className,delta:Math.round(r.bottom-b.bottom)});
    p = p.parentElement;
  }
  return {text:el.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,clipped};
}));

for (browserName of (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',')) {
  const browser = await pw[browserName].launch({headless:true});
  const context = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await context.route('**/*', route => {
    const req=route.request();
    if (!['GET','HEAD'].includes(req.method())) {report.networkWrites.push(req.method()+' '+req.url()); return route.abort();}
    return route.continue();
  });
  page=await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror',error=>report.runtimeErrors.push({browser:browserName,error:String(error)}));
  await check('responsive-visible-content', async () => {
    const observations=[];
    for (const width of [320,390,600,768,900,1024,1199,1200,1280,1440,1920]) {
      await open('',{width,height:900});
      const geometry=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
      const ecosystem=await boxRead('.p10-ecosystem-card__button');
      observations.push({width,geometry,ecosystem});
      if (browserName==='chromium' && [390,900,1024,1280,1920].includes(width)) {
        await shot(`ecosystem-${width}`, '#ecosystem');
      }
    }
    report.responsive ||= {};report.responsive[browserName]=observations;
    assert.equal(observations.filter(x=>x.geometry.document>x.width+1).length,0,'Page has horizontal overflow');
    const clipped=observations.flatMap(x=>x.ecosystem.filter(b=>b.clipped.length).map(b=>({width:x.width,...b})));
    assert.equal(clipped.length,0,JSON.stringify(clipped));
    return observations.map(x=>({width:x.width,overflow:x.geometry.document-x.width}));
  });
  await check('capability-cta-unclipped', async () => {
    const observations=[];
    for(const width of [1200,1280,1440]) {
      await open('#capabilities',{width,height:900});
      for(const audience of ['seller','buyer']) {
        await page.locator(`[data-capability-new-audience="${audience}"]`).click();
        for(const card of ['credit','factoring','receivables','claims','other']) {
          const button=page.locator(`[data-capability-new-expand="${card}"]`);
          await button.focus();await button.press('Enter');await settled();
          const boxes=await boxRead(`[data-capability-new-card="${card}"] .capability-new__cta`);
          observations.push({viewportWidth:width,audience,card,...boxes[0]});
          if(browserName==='chromium' && width===1280 && audience==='buyer' && card==='other') await shot('capabilities-1280-buyer-other','#capabilities');
        }
      }
    }
    report.capabilities ||= {};report.capabilities[browserName]=observations;
    const clipped=observations.filter(x=>x.clipped.length);
    assert.equal(clipped.length,0,JSON.stringify(clipped));
    return {states:observations.length};
  });
  await check('document-close-deeplink-reload',async()=>{
    await open('#documents',{width:390,height:844});
    await page.locator('#detail-dialog[open]').waitFor();
    await page.locator('.dialog__close').click();
    await page.locator('#detail-dialog[open]').waitFor({state:'hidden'});
    await page.reload({waitUntil:'load'});await settled();
    assert.equal(await page.locator('#detail-dialog[open]').count(),0,'Closed deep-link dialog reopens on reload');
    return {url:page.url()};
  });
  await check('dialog-back-forward-and-scroll',async()=>{
    await open('#top');
    await page.locator('.p10-footer [data-open-documents]').click();
    assert.match(page.url(),/#documents$/,'Opening documents does not create an addressed history entry');
    await page.goBack();await settled();
    assert.equal(await page.locator('#detail-dialog[open]').count(),0);
    assert.equal(await page.locator('main').count(),1);
    await page.goForward();await settled();
    assert.equal(await page.locator('#detail-dialog[open]').count(),1);
    return {url:page.url()};
  });
  await check('search-documents-reset-and-visible-close',async()=>{
    await open('#/search',{width:390,height:844});
    await page.locator('#detail-dialog[open]').waitFor();
    await page.locator('#detail-dialog [data-open-documents]').click();await settled();
    const result=await page.locator('#detail-dialog').evaluate(el=>{const close=el.querySelector('.dialog__close').getBoundingClientRect(),box=el.getBoundingClientRect();return {scroll:el.scrollTop,closeY:close.y,boxY:box.y,boxBottom:box.bottom};});
    await shot('documents-after-search');
    assert.ok(result.scroll<=1,JSON.stringify(result));
    await page.locator('#detail-dialog').evaluate(el=>el.scrollTop=el.scrollHeight);await settled();
    const close=await page.locator('.dialog__close').boundingBox();
    assert.ok(close.y>=0 && close.y+close.height<=844,'Close control scrolled out of viewport');
    return result;
  });
  await check('buyer-intent-resets-archive-filter',async()=>{
    await open('#lots');
    await page.locator('button[data-schedule-period="previous"]').click();
    await page.locator('[data-schedule-filter="receivables"]').click();
    await page.locator('[data-capability-new-audience="buyer"]').click();
    await page.locator('[data-capability-new-expand="credit"]').focus();
    await page.locator('[data-capability-new-expand="credit"]').press('Enter');await settled();
    await page.locator('[data-capability-new-link="credit"]').click();await settled();
    assert.equal(await page.locator('#period-upcoming').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#filter-individuals').getAttribute('aria-selected'),'true');
    return {url:page.url(),rows:await page.locator('.p10-auction').count()};
  });
  await check('form-rejects-malformed-phone',async()=>{
    await open('#request',{width:390,height:844});
    await page.locator('[name="name"]').fill('Тест проверки');
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('[name="company"]').fill('Тестовая организация');
    await page.locator('[name="consent"]').check();
    const observations=[];
    for(const value of ['abc1234567890','123456789012345678901234567890']) {
      await page.locator('[name="phone"]').fill(value);
      await page.locator('.p10-consultation__submit').click();await settled();
      observations.push(await page.locator('[name="phone"]').evaluate(el=>({value:el.value,valid:el.validity.valid,message:el.validationMessage})));
    }
    assert.ok(observations.every(x=>!x.valid),JSON.stringify(observations));
    return observations;
  });
  await check('formats-short-viewport-close-and-back',async()=>{
    await open('#formats',{width:667,height:375});
    await page.locator('[data-p10-format-open="dutch"]').click();await settled();
    await page.locator('#p10-format-dialog').evaluate(el=>el.scrollTop=el.scrollHeight);await settled();
    await shot('formats-short-viewport');
    const close=await page.locator('[data-p10-format-close]').boundingBox();
    assert.ok(close.y>=0 && close.y+close.height<=375,'Format close control inaccessible');
    assert.match(page.url(),/#format-dutch$/,'Format open did not update history');
    await page.goBack();await settled();
    assert.equal(await page.locator('#p10-format-dialog[open]').count(),0);
    return {close};
  });
  await context.close();await browser.close();
}
await new Promise(resolve=>server.close(resolve));
report.finishedAt=new Date().toISOString();
report.passed=report.checks.filter(x=>x.status==='pass').length;
report.failed=report.checks.filter(x=>x.status==='fail').length;
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({output:out,passed:report.passed,failed:report.failed,runtimeErrors:report.runtimeErrors,networkWrites:report.networkWrites}));
process.exitCode=report.failed||report.runtimeErrors.length||report.networkWrites.length?1:0;
