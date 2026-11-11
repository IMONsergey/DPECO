import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Acceptance of the 11 November client document and the later instruction:
// one homepage, with no navigation, separate screens or external handoffs.
// These are disposable test browsers, never the owner's session.
const require = createRequire(import.meta.url);
const pw = require('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(project, 'dist');
const phase = (process.env.QA_PHASE || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '-');
const out = path.join(project, 'qa/homepage/results', `client-review-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const only = process.env.QA_ONLY?.split(',').filter(Boolean);
const engines = (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',').filter(Boolean);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => value.replace(/\s+/gu, ' ').trim();
await fs.mkdir(out, { recursive:true });

async function manifest(directory, accept, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(directory, { withFileTypes:true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await manifest(path.join(directory, entry.name), accept, relative));
    else if (accept(relative)) result[relative] = digest(await fs.readFile(path.join(directory, entry.name)));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
const sourceBefore = await manifest(path.join(project, 'src'), name => /\.(ts|css)$/.test(name));
const sourceHtmlBefore = digest(await fs.readFile(path.join(project,'index.html')));
const buildBefore = await manifest(dist, name => name === 'index.html' || /\.(js|css)$/.test(name));
const report = {
  phase, startedAt:new Date().toISOString(), sourceDocument:'https://docs.google.com/document/d/1hH3xng6E4rAf-Cfeqz9VMI788a7nFbq_0TAJrdfv444',
  output:out, project, scriptSha256:digest(await fs.readFile(fileURLToPath(import.meta.url))),
  source:sourceBefore, sourceHtml:sourceHtmlBefore, build:buildBefore, checks:[], screenshots:[], browsers:[], runtimeErrors:[], networkWrites:[], assetErrors:[], popups:[], navigationAttempts:[],
  scopeChange:'The later user instruction supersedes former outgoing-link, router, modal and history-navigation expectations. Their earlier raw reports remain historical evidence, not current acceptance gates.',
  safety:'Fresh isolated contexts; loopback dist; non-GET/HEAD requests blocked; no outgoing form, mail or CRM submission.',
  visualReview:'Screenshots require human/root review for typography, composition, logo appearance, hover quality and animation smoothness. A numeric pass is not full visual acceptance.',
};
const save = () => fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
    if (!(await fs.stat(file)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
report.baseURL = base;
const authorizedNavigations = new WeakSet();

async function until(read, accept, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await read();
    if (accept(value)) return value;
    await delay(50);
  } while (Date.now() < deadline);
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}
async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function open(page, { theme='light', hash='' } = {}) {
  authorizedNavigations.add(page);
  try {
    await page.goto(`${base}?theme=${theme}${hash}`, { waitUntil:'load' });
    await page.evaluate(() => document.fonts.ready);
    await until(() => page.locator('html').getAttribute('data-theme'), value => value === theme, 'Theme did not apply');
    await frames(page);
    assert.equal(page.url(),new URL(`${base}?theme=${theme}${hash}`).href,'Loading the homepage rewrote its address');
  } finally { authorizedNavigations.delete(page); }
}
async function revealPage(page) {
  // Trigger the actual scroll observers, including the bottom sections. Do not
  // add reveal classes or change application styles to manufacture screenshots.
  const geometry = await page.evaluate(() => ({ height:document.documentElement.scrollHeight, step:Math.max(200, Math.floor(innerHeight * .7)) }));
  for (let y=0; y<geometry.height; y+=geometry.step) {
    await page.evaluate(top => window.scrollTo({ top, behavior:'instant' }), y);
    await frames(page);
    await delay(35);
  }
  await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
  await page.evaluate(async () => { await Promise.all([...document.images].filter(img => img.complete).map(img => img.decode().catch(() => {}))); });
  await delay(1100);
  await frames(page);
}
async function screenshot(page, engine, name, selector, fullPage = false) {
  const file = `${engine}-${name}.png`;
  const target = selector ? page.locator(selector) : page;
  await target.screenshot({ path:path.join(out, file), animations:'disabled', ...(selector ? {} : { fullPage }) });
  const bytes = await fs.readFile(path.join(out, file));
  report.screenshots.push({ file, selector:selector || null, fullPage, bytes:bytes.length, sha256:digest(bytes) });
  return file;
}
async function inViewport(locator) {
  return locator.evaluate(el => {
    const r=el.getBoundingClientRect();
    return { x:r.x, y:r.y, width:r.width, height:r.height, viewportWidth:innerWidth, viewportHeight:innerHeight,
      contained:r.x>=-1 && r.right<=innerWidth+1 && r.y>=-1 && r.bottom<=innerHeight+1 };
  });
}
async function styleSnapshot(locator) {
  return locator.evaluate(el => {
    const s=getComputedStyle(el), child=el.querySelector('svg, img');
    return { background:s.backgroundColor, color:s.color, border:s.borderColor, shadow:s.boxShadow, transform:s.transform,
      iconTransform:child ? getComputedStyle(child).transform : null };
  });
}
async function hoverChanges(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await delay(350);
  const before=await styleSnapshot(locator);
  await locator.hover();
  await delay(350);
  const after=await styleSnapshot(locator);
  assert.notDeepEqual(after, before, 'The control has no observable hover feedback');
  return { text:normalize(await locator.innerText()), before, after };
}
async function tabEvidence(page, selector) {
  return page.locator(selector).evaluate(el => {
    const active=el.querySelector('[role="tab"][aria-selected="true"]');
    const indicator=el.querySelector('.tab-indicator');
    const rect=node => { const r=node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
    return { selected:active?.textContent.trim(), activeBackground:active ? getComputedStyle(active).backgroundColor : null,
      active:active ? rect(active) : null, indicator:indicator ? { ...rect(indicator), background:getComputedStyle(indicator).backgroundColor, opacity:getComputedStyle(indicator).opacity,animating:indicator.getAnimations().some(animation=>animation.playState==='running' || animation.pending) } : null,
      inactive:[...el.querySelectorAll('[role="tab"][aria-selected="false"]')].map(tab => ({ text:tab.textContent.trim(), background:getComputedStyle(tab).backgroundColor })) };
  });
}
async function settledTabEvidence(page,selector) {
  let previous=null, stable=0;
  return until(()=>tabEvidence(page,selector),value=>{
    const aligned=value.active && (!value.indicator || (Math.abs(value.indicator.x-value.active.x)<=2 && Math.abs(value.indicator.width-value.active.width)<=2 && !value.indicator.animating));
    const still=previous?.selected===value.selected && (!value.indicator || (previous.indicator && ['x','y','width','height'].every(key=>Math.abs(value.indicator[key]-previous.indicator[key])<.25)));
    stable=aligned && still ? stable+1 : 0; previous=value;
    return stable>=2;
  },`Tab indicator did not settle against its selected tab: ${selector}`);
}
const transparent = value => !value || value === 'transparent' || /rgba\([^)]*,\s*0(?:\.0*)?\)$/.test(value);
function colorAlpha(value) {
  if (transparent(value)) return 0;
  const body=value.slice(value.indexOf('(')+1,-1);
  const alpha=body.includes('/') ? body.split('/').at(-1).trim() : /^(rgba|hsla)\(/.test(value) ? body.split(',').at(-1).trim() : '1';
  return parseFloat(alpha)/(alpha.endsWith('%') ? 100 : 1);
}
function rotationDegrees(transform) {
  if (transform==='none') return 0;
  const values=transform.match(/^matrix(?:3d)?\(([^)]+)\)$/)?.[1].split(',').map(Number);
  assert.ok(values?.length>=6,`Unrecognized transform: ${transform}`);
  return (Math.atan2(values[1],values[0])*180/Math.PI+360)%360;
}
async function openDesktopMenu(page,id) {
  const trigger=page.locator(`[data-nav-toggle="${id}"]`), panel=page.locator(`#nav-panel-${id}`);
  const read=()=>trigger.locator('.header__nav-chevron').evaluate(el=>getComputedStyle(el).transform);
  const closed=await read(), angle=rotationDegrees(closed);
  assert.ok(Math.min(angle,360-angle)<.25,`${id}: closed chevron is not pointing down`);
  await trigger.click();
  await until(()=>trigger.getAttribute('aria-expanded'),x=>x==='true',`${id} menu did not open`);
  const opened=await until(read,x=>Math.abs(rotationDegrees(x)-180)<.25,`${id}: open chevron is not rotated 180 degrees`);
  assert.notEqual(opened,closed,'Open-state chevron did not change');
  const panelStyle=await until(()=>panel.evaluate(el=>({background:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity})),x=>Number(x.opacity)===1,`${id}: dropdown did not become visible`);
  assert.ok(!transparent(panelStyle.background) && Number(panelStyle.opacity)===1,'Dropdown has no opaque readable surface');
  assert.equal(colorAlpha(panelStyle.background),1,`${id}: dropdown background is translucent`);
  const bounds=await inViewport(panel); assert.equal(bounds.contained,true,`${id}: dropdown escapes viewport`);
  return {closed,opened,rotation:rotationDegrees(opened),panelStyle,bounds};
}
async function checkHeaderSearch(page) {
  await page.locator('[data-nav-toggle="search"]').click();
  const input=page.locator('#header-search');
  await input.fill('торги');
  const search=await input.evaluate(el=>{
    const form=el.closest('form'), panel=form.parentElement, f=form.getBoundingClientRect(), p=panel.getBoundingClientRect(), fs=getComputedStyle(form), ps=getComputedStyle(panel), is=getComputedStyle(el);
    return {form:{height:f.height,width:f.width,border:fs.borderColor,outline:fs.outlineColor,outlineWidth:fs.outlineWidth,shadow:fs.boxShadow},panel:{height:p.height,width:p.width,padding:ps.padding,border:ps.borderWidth,background:ps.backgroundColor,shadow:ps.boxShadow},inputOutline:is.outlineWidth,inputShadow:is.boxShadow};
  });
  assert.ok(search.form.height>=36 && search.form.height<=48,`Search height is not compact: ${search.form.height}px`);
  assert.ok(Math.abs(search.panel.height-search.form.height)<=2,'Search still has an extra surrounding block');
  assert.equal(parseFloat(search.panel.border),0,'Search wrapper still has a border');
  assert.equal(parseFloat(search.inputOutline),0,'Search input retains its own outline');
  assert.equal(search.inputShadow,'none','Search input retains its own shadow/ring');
  assert.equal(search.panel.shadow,'none','Search wrapper retains an extra shadow/ring');
  const focusedColor=search.form.outline.match(/[\d.]+/g)?.map(Number) || [];
  if(focusedColor.length>=3) assert.ok(Math.max(...focusedColor.slice(0,3))-Math.min(...focusedColor.slice(0,3))<60,'Search focus is strongly colored rather than neutral');
  for(const color of search.form.shadow.match(/rgba?\([^)]+\)/g) || []) {
    const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number);
    if(colorAlpha(color)>0) assert.ok(Math.max(...rgb)-Math.min(...rgb)<60,`Search has a colored shadow/ring: ${color}`);
  }
  assert.ok(parseFloat(search.form.outlineWidth)>0,'Keyboard focus has no replacement indicator');
  const bounds=await inViewport(page.locator('#nav-panel-search')); assert.equal(bounds.contained,true);
  return {search,bounds};
}
async function visibleTooltips(page) {
  return page.locator('#nav-panel-ecosystem [role="tooltip"]').evaluateAll(items=>items.filter(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity)>.01 && r.width>0 && r.height>0;
  }).map(el=>el.id));
}
async function checkEcosystemDescriptions(page) {
  const trigger=page.locator('[data-nav-toggle="ecosystem"]'), items=page.locator('#nav-panel-ecosystem [data-ecosystem-item]');
  assert.equal(await items.count(),6);
  const observations=[];
  for(const item of await items.all()) {
    const link=item.locator('a'), name=normalize(await link.locator('strong').innerText()), tipId=await link.getAttribute('aria-describedby');
    assert.ok(tipId,'Ecosystem link has no accessible description');
    const tip=page.locator(`[id="${tipId}"]`);
    await trigger.focus(); await page.mouse.move(1,1);
    await until(()=>visibleTooltips(page),x=>x.length===0,'Tooltip remains visible after focus and pointer leave');
    await link.hover();
    assert.equal(await link.evaluate(el=>el===document.activeElement),false,'Hover check accidentally focused its link');
    await tip.waitFor({state:'visible'});
    await until(()=>visibleTooltips(page),x=>x.length===1 && x[0]===tipId,`Hover tooltip missing or overlapping for ${name}`);
    assert.equal(await tip.isVisible(),true,'Tooltip is unavailable on hover');
    assert.equal(normalize(await tip.innerText()),tooltipText[name],`Incorrect hover description for ${name}`);
    await page.mouse.move(1,1);
    await until(()=>visibleTooltips(page),x=>x.length===0,'Hover tooltip did not dismiss');
    await link.focus();
    await tip.waitFor({state:'visible'});
    await until(()=>visibleTooltips(page),x=>x.length===1 && x[0]===tipId,`Focus tooltip missing or overlapping for ${name}`);
    assert.equal(normalize(await tip.innerText()),tooltipText[name],`Incorrect description for ${name}`);
    const bounds=await inViewport(tip); assert.equal(bounds.contained,true,`Tooltip overflows for ${name}`);
    assert.equal(await page.locator('#nav-panel-ecosystem .is-tooltip-visible').count(),1,'Several tooltips overlap');
    observations.push({name,bounds,hoverWithoutFocus:true});
  }
  return observations;
}
function assertFilledTabs(evidence) {
  assert.ok(evidence.active, 'No selected tab');
  for (const tab of evidence.inactive) assert.ok(!transparent(tab.background), `Inactive tab has no fill: ${tab.text}`);
  assert.ok(!transparent(evidence.activeBackground) || (evidence.indicator && !transparent(evidence.indicator.background) && Number(evidence.indicator.opacity)>0), 'Selected tab has no visible fill/indicator');
  if (evidence.indicator) {
    assert.ok(Math.abs(evidence.indicator.x-evidence.active.x)<=2 && Math.abs(evidence.indicator.width-evidence.active.width)<=2, 'Active indicator is not aligned with its tab');
  }
}
async function clippedContent(page) {
  await until(()=>page.locator('.motion-word__inner').evaluateAll(items=>items.every(el=>el.getAnimations().every(animation=>animation.playState!=='running' && !animation.pending))),Boolean,'Heading reveal animations did not finish');
  return page.evaluate(() => {
    const problems=[];
    const excluded=element=>{
      for(let p=element;p && p!==document.body;p=p.parentElement) {
        if(p.matches('.sr-only, [hidden], [inert], .capability-new__measure')) return true;
        if(p.getAttribute('aria-hidden')==='true' && !p.classList.contains('motion-word')) return true;
        const s=getComputedStyle(p);
        if(s.display==='none' || s.visibility==='hidden' || Number(s.opacity)===0) return true;
      }
      return false;
    };
    const selectors='.p10-home h1, .p10-home h2, .p10-home h3, .p10-home p, .p10-home .button, .p10-home .motion-word, .p10-ecosystem-card__button, .p10-footer h2, .p10-footer nav a, .site-header .header__nav-control, .header__mobile-link, .header__mobile-product, .header__mobile-register, .header__mobile-contacts a';
    for (const el of document.querySelectorAll(selectors)) {
      if (excluded(el)) continue;
      const s=getComputedStyle(el), r=el.getBoundingClientRect();
      if (!r.width || !r.height || s.visibility==='hidden' || s.display==='none' || Number(s.opacity)===0) continue;
      const name=(el.textContent || '').replace(/\s+/gu,' ').trim().slice(0,100);
      if (el.matches('button, a.button, .p10-ecosystem-card__button') && el.scrollWidth>el.clientWidth+2) problems.push({ type:'control-content-overflow', text:name, excess:el.scrollWidth-el.clientWidth });
      const rects=[];
      const walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node=walker.currentNode;
        if (!node.textContent.trim() || excluded(node.parentElement)) continue;
        const range=document.createRange(); range.selectNodeContents(node);
        rects.push(...range.getClientRects());
      }
      for (let p=el; p && p!==document.body; p=p.parentElement) {
        const ps=getComputedStyle(p), pr=p.getBoundingClientRect();
        const clipsX=/(hidden|clip)/.test(ps.overflowX), clipsY=/(hidden|clip)/.test(ps.overflowY);
        if (!clipsX && !clipsY) continue;
        const bad=rects.some(t => t.width>0 && t.height>0 && ((clipsX && (t.left<pr.left-2 || t.right>pr.right+2)) || (clipsY && (t.top<pr.top-2 || t.bottom>pr.bottom+2))));
        if (bad) { problems.push({ type:'text-clipped-by-ancestor', text:name, ancestor:p.className }); break; }
      }
    }
    return problems.slice(0,50);
  });
}

async function navigationState(page) {
  const state=await page.evaluate(()=>({url:location.href,historyLength:history.length,scrollY,dialogs:document.querySelectorAll('dialog, [role="dialog"]').length,homepages:document.querySelectorAll('main .p10-home').length}));
  return {...state,pages:page.context().pages().length};
}
function assertSamePage(before,after,{scroll=false}={}) {
  assert.equal(after.url,before.url,'A control changed the URL');
  assert.equal(after.historyLength,before.historyLength,'A control added a history entry');
  assert.equal(after.pages,before.pages,'A control opened another tab/window');
  assert.equal(after.dialogs,0,'A separate dialog screen appeared');
  assert.equal(after.homepages,1,'The homepage was replaced');
  if(scroll) assert.ok(Math.abs(after.scrollY-before.scrollY)<=2,`An inert control scrolled the document: ${before.scrollY} -> ${after.scrollY}`);
}
async function assertHomepageIsolated(page) {
  const evidence=await page.evaluate(()=>{
    const describe=el=>({tag:el.tagName,text:(el.textContent || '').replace(/\s+/gu,' ').trim().slice(0,90),href:el.getAttribute('href'),target:el.getAttribute('target'),download:el.getAttribute('download')});
    const links=[...document.querySelectorAll('#app a')];
    const routeButtons=[...document.querySelectorAll('.p10-format, .p10-auction__seller, .p10-auction__action button')];
    const policies=[...document.querySelectorAll('meta[http-equiv]')].filter(el=>el.httpEquiv.toLowerCase()==='content-security-policy').map(el=>el.content);
    return {
      forbidden:[...document.querySelectorAll('#app a[href], #app area[href], #app [target], #app [download], #app form[action], #app [formaction], #app [formtarget]')].map(describe),
      links:links.length,
      incorrectLinks:links.filter(el=>el.getAttribute('aria-disabled')!=='true' || el.getAttribute('role')!=='link' || el.tabIndex!==(el.closest('[data-ecosystem-item]') ? 0 : -1)).map(describe),
      routeButtons:routeButtons.length,
      activeRouteButtons:routeButtons.filter(el=>el.getAttribute('aria-disabled')!=='true' || el.tabIndex!==-1).map(describe),
      oldRouteTriggers:document.querySelectorAll('[data-open-documents], [data-open-lot], [data-p10-format-open]').length,
      dialogs:document.querySelectorAll('dialog, [role="dialog"]').length,
      homepages:document.querySelectorAll('main .p10-home').length,
      refreshMeta:[...document.querySelectorAll('meta[http-equiv]')].some(el=>el.httpEquiv.toLowerCase()==='refresh'),
      policies,
    };
  });
  assert.equal(evidence.homepages,1,'Expected one rendered homepage');
  assert.ok(evidence.links>=30,'Navigation audit did not find the expected visible and mobile content');
  assert.deepEqual(evidence.forbidden,[],'A browser-followable destination remains in the page');
  assert.deepEqual(evidence.incorrectLinks,[],'An inert link has incorrect disabled/focus semantics');
  assert.ok(evidence.routeButtons>=4,'Expected the four format cards to remain in the page');
  assert.deepEqual(evidence.activeRouteButtons,[],'A route button remains active');
  assert.equal(evidence.oldRouteTriggers,0,'A former route trigger remains attached');
  assert.equal(evidence.dialogs,0,'Secondary dialog screens remain in the DOM');
  assert.equal(evidence.refreshMeta,false,'A meta refresh can navigate the page');
  assert.ok(evidence.policies.some(policy=>policy.split(';').some(rule=>/^\s*form-action\s+'none'\s*$/i.test(rule))),'Native form navigation is not blocked by CSP');
  assert.equal(page.context().pages().length,1,'An unexpected tab/window exists');
  return evidence;
}
async function inertActivation(page,locator,modes=['click','ctrl-click','middle-click','Enter']) {
  assert.equal(await locator.getAttribute('aria-disabled'),'true','Former navigation control is not marked disabled');
  if(await locator.evaluate(el=>el.tagName==='A')) assert.equal(await locator.getAttribute('href'),null,'Former link still has href');
  const observations=[];
  for(const mode of modes) {
    await locator.scrollIntoViewIfNeeded();
    await locator.hover();
    await delay(600);
    await frames(page);
    if(mode==='Enter') {
      await locator.focus();
      assert.equal(await locator.evaluate(el=>document.activeElement===el),true,'Cannot test Enter on the intended control');
      await frames(page);
    }
    const point=await locator.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
      return {x,y,hit:top===el || el.contains(top),interceptor:top?.className};
    });
    assert.equal(point.hit,true,`Inert-control test would click an obstruction: ${JSON.stringify(point)}`);
    const before=await navigationState(page);
    if(mode==='Enter') await page.keyboard.press('Enter');
    else if(mode==='ctrl-click') {
      await page.keyboard.down('Control');
      try { await page.mouse.click(point.x,point.y); }
      finally { await page.keyboard.up('Control'); }
    } else await page.mouse.click(point.x,point.y,{button:mode==='middle-click'?'middle':'left'});
    await delay(220);
    await frames(page);
    const after=await navigationState(page);
    assertSamePage(before,after,{scroll:true});
    observations.push({mode,url:after.url,historyLength:after.historyLength,scrollDrift:after.scrollY-before.scrollY,pages:after.pages});
  }
  return observations;
}

const tooltipText = {
  DEBTPRICE:'Торговая площадка долговых активов. Продавайте и покупайте по цене рынка.',
  'Рынок Взыскания':'Новости и тренды долгового рынка, аналитика, судебная практика и интервью с ключевыми игроками.',
  'Навигатор решений':'Каталог технологий для работы с долгом: от скоринга до банкротства.',
  'DEBT TECH':'Соорганизуем встречи банков, МФО, ПКО, инвесторов и электронных торговых площадок на одной площадке.',
  'DOLG TALK':'Соорганизуем встречи банков, МФО, ПКО, инвесторов и электронных торговых площадок на одной площадке.',
  'ПКО-300':'Рейтинг коллекторских агентств по данным Федеральной налоговой службы.',
};
const cases = [
  {
    name:'live-moscow-clock-and-auction-countdown',
    async run(page) {
      await open(page);
      const read=() => page.evaluate(() => ({ clock:document.querySelector('[data-moscow-clock]').textContent.trim(), count:document.querySelector('[data-next-countdown]').textContent.trim(), now:Date.now() }));
      const before=await read();
      assert.match(before.clock, /^\d{2}:\d{2}:\d{2}$/);
      assert.match(before.count, /^\d+:\d{2}:\d{2}$/);
      assert.match(await page.locator('.p10-metric--trading').innerText(), /\(МСК\)/);
      assert.match(await page.locator('.p10-metric--members').innerText(), /2100\+/);
      await delay(1250);
      const after=await read();
      const seconds=text => text.split(':').reduce((total,n)=>total*60+Number(n),0);
      const expected=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(after.now);
      const clockLag=(seconds(expected)-seconds(after.clock)+86400)%86400;
      assert.ok(clockLag<=1, `Clock does not show Moscow time: expected ${expected}, actual ${after.clock}`);
      assert.notEqual(before.clock,after.clock,'Visible seconds did not advance');
      assert.ok(seconds(before.count)>seconds(after.count),'Countdown did not decrease with elapsed time');
      assert.ok(Math.abs((seconds(before.count)-seconds(after.count))-(after.now-before.now)/1000)<=1.5,'Countdown is not driven by elapsed time');
      return { before,after,expected,clockLag };
    },
  },
  {
    name:'section-order-and-filled-filter-tabs',
    async run(page) {
      await open(page);
      const order=await page.evaluate(() => {
        const cap=document.querySelector('#capabilities'), offer=document.querySelector('.p10-offer');
        return { after:Boolean(cap.compareDocumentPosition(offer)&Node.DOCUMENT_POSITION_FOLLOWING), nextSection:cap.nextElementSibling?.className };
      });
      assert.equal(order.after,true,'Offer is before capabilities');
      assert.match(order.nextSection,/p10-offer/,'Offer is not immediately after capabilities');
      const observations=[];
      for (const theme of ['light','dark']) {
        await open(page,{theme});
        for (const selector of ['.p10-schedule__type [role="tablist"]','.capability-new__tabs']) {
          const tabs=page.locator(selector);
          await tabs.scrollIntoViewIfNeeded();
          const before=await settledTabEvidence(page,selector); assertFilledTabs(before);
          await tabs.getByRole('tab').last().click();
          const after=await settledTabEvidence(page,selector); assertFilledTabs(after);
          assert.notEqual(after.selected,before.selected,'Selection did not change');
          observations.push({theme,selector,before,after});
        }
      }
      return { order,observations };
    },
  },
  {
    name:'header-layout-dropdowns-and-auth-feedback',
    async run(page,engine) {
      await open(page);
      await delay(400);
      const geometry=await page.locator('.site-header').evaluate(el => {
        const button=el.querySelector('.header__bottom [data-theme-toggle]'), b=button.getBoundingClientRect();
        const icon=[...button.querySelectorAll('svg')].find(svg=>getComputedStyle(svg).display!=='none' && Number(getComputedStyle(svg).opacity)>0);
        const i=icon.getBoundingClientRect(), c=el.querySelector('.header__contacts').getBoundingClientRect(), a=el.querySelector('.header__actions').getBoundingClientRect(), brand=el.querySelector('.header__brand').getBoundingClientRect();
        return { iconCenterDrift:{x:Math.abs(i.x+i.width/2-b.x-b.width/2),y:Math.abs(i.y+i.height/2-b.y-b.height/2)}, contactsToActions:a.x-c.right, brandToContacts:c.x-brand.right };
      });
      assert.ok(geometry.iconCenterDrift.x<=2 && geometry.iconCenterDrift.y<=2,'Theme icon is not centered');
      assert.ok(geometry.contactsToActions>=0 && geometry.contactsToActions<=geometry.brandToContacts+2,'Contacts are not grouped nearer the actions');
      const hover=[];
      for (const selector of ['.header__actions .header__account','.header__actions .header__register']) hover.push(await hoverChanges(page,page.locator(selector)));
      const trigger=page.locator('[data-nav-toggle="sellers"]');
      const menu=await openDesktopMenu(page,'sellers');
      const panel=page.locator('#nav-panel-sellers');
      assert.equal(await panel.locator('.nav-panel__icon').count(),0,'Seller list still has leading icons');
      const links=panel.locator('.nav-panel__link');
      assert.equal(await links.count(),2);
      for (const link of await links.all()) {
        assert.equal(await link.locator('svg').count(),1,'Seller item must have one trailing vector chevron');
        const position=await link.evaluate(el=>({textRight:el.querySelector('strong').getBoundingClientRect().right,arrowLeft:el.querySelector('svg').getBoundingClientRect().left}));
        assert.ok(position.arrowLeft>=position.textRight-1,'Chevron is not trailing the text');
      }
      if(engine==='chromium') await screenshot(page,engine,'header-seller-dropdown');
      await trigger.press('Escape');
      return {geometry,hover,...menu};
    },
  },
  {
    name:'ecosystem-descriptions-and-compact-search',
    async run(page,engine) {
      await open(page);
      const menu=await openDesktopMenu(page,'ecosystem');
      const observations=await checkEcosystemDescriptions(page);
      if(engine==='chromium') await screenshot(page,engine,'header-ecosystem-tooltip');
      await page.locator('[data-nav-toggle="ecosystem"]').press('Escape');
      const search=await checkHeaderSearch(page);
      if(engine==='chromium') await screenshot(page,engine,'header-search');
      return {descriptions:observations,menu,...search};
    },
  },
  {
    name:'desktop-menus-dark-and-scrolled-header',
    async run(page,engine) {
      const observations=[];
      for(const state of [{theme:'dark',scrolled:false},{theme:'light',scrolled:true},{theme:'dark',scrolled:true}]) {
        await open(page,{theme:state.theme});
        if(state.scrolled) await page.evaluate(()=>{
          const hero=document.querySelector('.intro, .market-hero');
          if(!hero) throw new Error('Header background section is missing');
          window.scrollTo({top:Math.ceil(scrollY+hero.getBoundingClientRect().bottom+20),behavior:'instant'});
        });
        await until(()=>page.locator('.site-header').evaluate(el=>el.classList.contains('is-light')),x=>x===state.scrolled,'Scrolled header state did not apply');
        await delay(400);
        const hover=[];
        for(const selector of ['.header__actions .header__account','.header__actions .header__register']) hover.push(await hoverChanges(page,page.locator(selector)));
        const seller=await openDesktopMenu(page,'sellers');
        if(engine==='chromium') await screenshot(page,engine,`header-seller-${state.theme}-${state.scrolled?'scrolled':'top'}`);
        await page.locator('[data-nav-toggle="sellers"]').press('Escape');
        const ecosystem=await openDesktopMenu(page,'ecosystem');
        const descriptions=await checkEcosystemDescriptions(page);
        if(engine==='chromium') await screenshot(page,engine,`header-ecosystem-${state.theme}-${state.scrolled?'scrolled':'top'}`);
        await page.locator('[data-nav-toggle="ecosystem"]').press('Escape');
        const search=await checkHeaderSearch(page);
        if(engine==='chromium') await screenshot(page,engine,`header-search-${state.theme}-${state.scrolled?'scrolled':'top'}`);
        await page.locator('#header-search').press('Escape');
        observations.push({...state,hover,seller,ecosystem,descriptions,...search});
      }
      return {observations};
    },
  },
  {
    name:'capability-transition-and-unobstructed-cta',
    async run(page) {
      await open(page,{hash:'#capabilities'});
      await page.mouse.move(1,1);
      await page.locator('#capabilities').scrollIntoViewIfNeeded();
      await delay(900);
      const targetId=await page.locator('[data-capability-new-expand][aria-expanded="false"]').first().getAttribute('data-capability-new-expand');
      assert.ok(targetId,'No collapsed desktop card is available to test hover expansion');
      const samplesPromise=page.evaluate(async id=>{
        const card=document.querySelector(`[data-capability-new-card="${CSS.escape(id)}"]`), values=[];
        const start=performance.now();
        while(performance.now()-start<1200){values.push({t:performance.now()-start,width:card.getBoundingClientRect().width});await new Promise(requestAnimationFrame);}
        return values;
      },targetId);
      await page.locator(`[data-capability-new-expand="${targetId}"]`).hover();
      const samples=await samplesPromise;
      const start=samples[0].width,end=samples.at(-1).width;
      const intermediate=samples.filter(x=>x.width>Math.min(start,end)+2 && x.width<Math.max(start,end)-2);
      assert.ok(end>start+2,'Hover did not expand the targeted card');
      assert.ok(intermediate.length>0,'Card jumped between widths without an intermediate transition');
      await page.locator('[data-capability-new-audience="buyer"]').click();
      const expand=page.locator('[data-capability-new-expand="credit"]');
      await expand.focus(); await expand.press('Enter');
      await delay(750);
      const link=page.locator('[data-capability-new-link="credit"]');
      await link.scrollIntoViewIfNeeded();
      await delay(150);
      const hit=await link.evaluate(el=>{const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {hit:top===el||el.contains(top),interceptor:top?.className,text:el.textContent.trim()};});
      assert.equal(hit.hit,true,`CTA is covered by another element: ${JSON.stringify(hit)}`);
      const activations=await inertActivation(page,link);
      const isolation=await assertHomepageIsolated(page);
      return {widthTransition:{targetId,start,end,intermediateFrames:intermediate.length,sampledFrames:samples.length},hit,activations,isolation};
    },
  },
  {
    name:'compact-consultation-media-and-button-feedback',
    async run(page,engine) {
      await open(page);
      await revealPage(page);
      const layout=await page.evaluate(()=>{
        const width=el=>el.getBoundingClientRect().width;
        const form=document.querySelector('.p10-consultation__form'), fs=getComputedStyle(form), benefits=document.querySelector('.p10-consultation__benefits'), media=document.querySelector('.p10-ecosystem-card--media');
        return {benefitsWidth:width(benefits),paragraphWidths:[...benefits.querySelectorAll('p')].map(width),submitWidth:width(form.querySelector('button[type="submit"]')),formInnerWidth:width(form)-parseFloat(fs.paddingLeft)-parseFloat(fs.paddingRight),mediaButtonWidth:width(media.querySelector('.p10-ecosystem-card__button')),mediaActionsWidth:width(media.querySelector('.p10-ecosystem-card__actions'))};
      });
      for(const width of layout.paragraphWidths) assert.ok(Math.abs(width-layout.benefitsWidth)<=2,'Consultation copy retains a narrow artificial column');
      assert.ok(layout.submitWidth<layout.formInnerWidth-2,'Submit is still stretched across the form');
      assert.ok(layout.mediaButtonWidth<layout.mediaActionsWidth-2,'Media CTA is still stretched across the card');
      assert.ok(!(await page.locator('body').innerText()).includes('Подготовим письмо с вашими данными.'),'Removed mail preparation sentence is still present');
      const reactions=[];
      for(const selector of ['.p10-schedule__bottom .button','.p10-choice--sell .button--primary','.p10-choice--sell .button--white','.p10-choice--buy .button','.p10-offer .button','.p10-consultation__submit','.p10-ecosystem-card--media .p10-ecosystem-card__button','.p10-article--featured']) reactions.push({selector,...await hoverChanges(page,page.locator(selector))});
      if(engine==='chromium') {
        await screenshot(page,engine,'consultation','#request');
        await screenshot(page,engine,'ecosystem','#ecosystem');
      }
      return {layout,reactions};
    },
  },
  {
    name:'homepage-inert-links-and-controls',
    async run(page) {
      await open(page);
      await revealPage(page);
      const isolation=await assertHomepageIsolated(page), controls=[];
      // Cover old hashes, account/registration, protocols, external media,
      // document downloads and the former format/lot dialog triggers.
      for(const selector of ['.header__brand','.header__actions .header__account','.header__actions .header__register','.header__phone','.header__email','.header__telegram','.hero__actions a','.p10-auction__seller','.p10-auction__action button','.p10-format','.p10-ecosystem-card--media .p10-ecosystem-card__button','.p10-article--featured','.p10-footer__bottom a']) {
        if(selector==='.header__brand') await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));
        controls.push({selector,activations:await inertActivation(page,page.locator(selector).first())});
      }
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      for(const id of ['sellers','ecosystem']) {
        await openDesktopMenu(page,id);
        controls.push({selector:`#nav-panel-${id} a`,activations:await inertActivation(page,page.locator(`#nav-panel-${id} a`).first())});
        await page.locator(`[data-nav-toggle="${id}"]`).press('Escape');
      }
      const skip=page.locator('[data-skip-content]');
      await skip.focus();
      const before=await navigationState(page);
      await page.keyboard.press('Enter'); await frames(page);
      assertSamePage(before,await navigationState(page),{scroll:true});
      assert.equal(await page.locator('#main').evaluate(el=>document.activeElement===el),true,'Skip control did not focus the main content');
      await assertHomepageIsolated(page);
      return {isolation,controls,skip:'Focuses main without changing the address or scrolling'};
    },
  },
  {
    name:'dynamic-controls-search-and-local-draft-stay-on-homepage',
    async run(page) {
      await open(page);
      const before=await navigationState(page), observations=[];
      for(const theme of ['dark','light']) {
        await page.locator('.header__bottom [data-theme-toggle]').click();
        await until(()=>page.locator('html').getAttribute('data-theme'),value=>value===theme,'Theme toggle did not apply');
        assertSamePage(before,await navigationState(page));
        observations.push({theme,isolation:await assertHomepageIsolated(page)});
      }
      for(const [selector,attribute,value] of [['#filter-individuals','data-schedule-category','individuals'],['#filter-receivables','data-schedule-category','receivables'],['#period-previous','data-schedule-period','previous'],['#filter-all','data-schedule-category','all'],['#period-upcoming','data-schedule-period','upcoming']]) {
        await page.locator(selector).click();
        await until(()=>page.locator('#p10-schedule-results').getAttribute(attribute),actual=>actual===value,`Schedule did not apply ${selector}`);
        await frames(page);
        assertSamePage(before,await navigationState(page));
        observations.push({selector,isolation:await assertHomepageIsolated(page)});
      }
      for(const audience of ['buyer','seller']) {
        const tab=page.locator(`[data-capability-new-audience="${audience}"]`);
        await tab.click();
        await until(()=>tab.getAttribute('aria-selected'),value=>value==='true','Audience did not change');
        await settledTabEvidence(page,'.capability-new__tabs');
        await delay(750);
        assertSamePage(before,await navigationState(page));
        observations.push({audience,isolation:await assertHomepageIsolated(page)});
      }
      await checkHeaderSearch(page);
      await page.locator('#header-search').press('Enter');
      await delay(220); await frames(page);
      assertSamePage(before,await navigationState(page));
      const searchActivations=await inertActivation(page,page.locator('#nav-panel-search button[type="submit"]'));
      await page.locator('#header-search').press('Escape');
      const form=page.locator('[data-request-form]');
      const fields={name:'Проверка интерфейса',email:'qa@example.test',phone:'+7 (900) 000-00-00',company:'Тестовая организация'};
      for(const [name,value] of Object.entries(fields)) await form.locator(`[name="${name}"]`).fill(value);
      await form.locator('[name="consent"]').check();
      await form.locator('button[type="submit"]').click();
      const status=form.locator('.request__status');
      await until(()=>status.isVisible(),Boolean,'Local request draft did not appear');
      const draft=await status.innerText();
      assert.match(draft,/Черновик заявки/);
      assert.match(draft,/Заявка не отправлена/);
      for(const value of Object.values(fields)) assert.ok(draft.includes(value),`Local draft lost field: ${value}`);
      assert.equal(await status.locator('[data-copy-request]').getAttribute('type'),'button','Copy action could submit the form');
      assert.equal(await form.locator('a[href], [href^="mailto:"]').count(),0,'The local draft has an outgoing handoff');
      assertSamePage(before,await navigationState(page));
      const draftIsolation=await assertHomepageIsolated(page);
      await form.locator('[name="name"]').fill('Обновлённый черновик');
      assert.equal(await status.isVisible(),false,'Editing the form did not invalidate its stale draft');
      assert.equal(await status.innerText(),'','Stale draft content remains after editing');
      assertSamePage(before,await navigationState(page));
      await assertHomepageIsolated(page);
      return {observations,searchActivations,draft,draftIsolation,submission:'Local draft only; any network write fails the whole report'};
    },
  },
  {
    name:'legacy-addresses-render-only-homepage',
    async run(page) {
      const observations=[];
      for(const hash of ['#/buyers','#/sellers/retail','#documents','#search?q=auction','#lot?id=credit','#request?kind=portfolio','#lots?category=individuals&period=previous']) {
        await open(page,{hash});
        const state=await navigationState(page),isolation=await assertHomepageIsolated(page);
        assert.equal(new URL(state.url).hash,hash,'An entered legacy address was rewritten');
        assert.equal(await page.locator('h1#hero-title').count(),1,'Legacy address opened another screen');
        observations.push({hash,url:state.url,isolation});
      }
      const html=await fs.readFile(path.join(dist,'index.html'),'utf8');
      const fallback=[...html.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi)].map(match=>match[1]);
      assert.ok(fallback.length>0,'The script-free homepage fallback is missing');
      assert.ok(fallback.every(markup=>!/<(?:a|area)\b[^>]*\bhref\s*=|<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(markup)),'The script-free fallback exposes navigation');
      return {observations,noscriptHasDestinations:false};
    },
  },
  {
    name:'footer-ecosystem-logo-and-nonlink-social-icons',
    async run(page,engine) {
      await open(page);
      await page.locator('.p10-footer').scrollIntoViewIfNeeded();
      const nav=page.locator('.p10-footer__navigation > nav').first();
      assert.equal(await nav.getAttribute('aria-labelledby'),'footer-ecosystem-title');
      const names=await nav.locator('a').evaluateAll(links=>links.map(link=>[...link.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim()));
      assert.deepEqual(names,['DEBTPRICE','СМИ «Рынок взыскания»','ПКО-300','Навигатор решений','DEBT TECH','DOLG TALK']);
      const links=await nav.locator('a').evaluateAll(items=>items.map(link=>({href:link.getAttribute('href'),disabled:link.getAttribute('aria-disabled'),tabIndex:link.tabIndex})));
      assert.deepEqual(links,Array.from({length:6},()=>({href:null,disabled:'true',tabIndex:-1})),'Footer ecosystem destinations are not inert');
      const social=page.locator('.p10-footer__socials');
      assert.equal(await social.locator('a, button, [tabindex]').count(),0,'Social placeholders are unexpectedly interactive');
      assert.deepEqual(await social.locator('[role="img"]').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label'))),['Telegram','MAX','WhatsApp']);
      assert.equal(await social.locator('svg').count(),3,'Missing social vector icon');
      const logo=page.locator('.p10-footer__brand-link');
      const appearance=await logo.evaluate(el=>{const s=getComputedStyle(el),img=el.querySelector('img');return {background:s.backgroundColor,border:s.borderWidth,shadow:s.boxShadow,filter:getComputedStyle(img).filter,source:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0};});
      assert.equal(appearance.loaded,true,'Footer logo did not load');
      assert.equal(parseFloat(appearance.border),0,'Footer logo has a CSS border');
      assert.ok(!transparent(appearance.background),'Footer logo lacks its solid plaque');
      const logoPath=path.resolve(dist,'.'+new URL(appearance.source,base).pathname);
      assert.ok(logoPath.startsWith(dist+path.sep),'Unexpected logo source');
      const svg=await fs.readFile(logoPath,'utf8');
      assert.ok(!/<rect\b/i.test(svg) && !/\bstroke\s*=\s*['"](?!none)/i.test(svg),'Footer SVG includes a rectangular frame or stroke needing visual review');
      const fills=[...svg.matchAll(/\bfill\s*=\s*['"]([^'"]+)['"]/gi)].map(match=>match[1]).filter(fill=>fill!=='none');
      const whiteSource=fills.length>0 && fills.every(fill=>/^(#fff(?:fff)?|white)$/i.test(fill));
      const whiteFilter=/brightness\(0\).*invert\(1\)/.test(appearance.filter);
      assert.ok(whiteSource || whiteFilter,'The logo still renders colored letters on its dark plaque');
      if(engine==='chromium') await screenshot(page,engine,'footer','.p10-footer');
      return {names,links,socialIcons:['Telegram','MAX','WhatsApp'],appearance,svgSha256:digest(svg),visualReview:'Review the saved footer screenshot for final logo appearance.'};
    },
  },
  ...[1920,1440,1280,390,320].flatMap(width=>['light','dark'].map(theme=>({
    name:`responsive-${width}-${theme}`,viewport:{width,height:width>=1200?1000:844},theme,
    async run(page,engine) {
      await open(page,{theme});
      await revealPage(page);
      if(engine==='chromium') await screenshot(page,engine,`full-${width}-${theme}`,null,true);
      const geometry=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,height:document.documentElement.scrollHeight}));
      assert.ok(geometry.document<=geometry.viewport+1 && geometry.body<=geometry.viewport+1,`Horizontal overflow: ${JSON.stringify(geometry)}`);
      const clipping=await clippedContent(page);
      assert.deepEqual(clipping,[],`Text or controls are clipped: ${JSON.stringify(clipping)}`);
      const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>img.getBoundingClientRect().width>0 && img.complete && !img.naturalWidth).map(img=>img.getAttribute('src')));
      assert.deepEqual(broken,[],'Broken images');
      let mobileEvidence=null;
      if(width<1200) {
        const themeGeometry=await page.locator('.p10-mobile-theme').evaluate(button=>{
          const b=button.getBoundingClientRect(), icon=[...button.querySelectorAll('svg')].find(svg=>getComputedStyle(svg).display!=='none' && Number(getComputedStyle(svg).opacity)>.99);
          if(!icon) throw new Error('Mobile theme button has no visible icon');
          const i=icon.getBoundingClientRect();
          return {width:b.width,height:b.height,x:Math.abs(i.x+i.width/2-b.x-b.width/2),y:Math.abs(i.y+i.height/2-b.y-b.height/2)};
        });
        assert.ok(themeGeometry.width>0 && themeGeometry.height>0 && themeGeometry.x<=2 && themeGeometry.y<=2,'Mobile theme icon is not centered');
        await page.locator('[data-mobile-toggle]').click();
        const mobile=page.locator('#mobile-menu');
        await until(()=>mobile.getAttribute('aria-hidden'),x=>x==='false','Mobile menu did not open');
        await until(()=>mobile.evaluate(el=>getComputedStyle(el).opacity),x=>Number(x)===1,'Mobile menu did not become visible');
        if(engine==='chromium') await screenshot(page,engine,`mobile-menu-${width}-${theme}-top`);
        const descriptions=await mobile.locator('.header__mobile-product').evaluateAll(items=>items.map(item=>({name:item.querySelector('strong')?.textContent.trim(),text:item.querySelector('small')?.textContent.trim(),descriptionId:item.getAttribute('aria-describedby')})));
        assert.equal(descriptions.length,6,'Mobile ecosystem lost a service');
        for(const description of descriptions) assert.equal(normalize(description.text),tooltipText[description.name]);
        const menuOverflow=await mobile.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
        assert.ok(menuOverflow.scroll<=menuOverflow.client+1,'Mobile menu has horizontal overflow');
        const menuClipping=await clippedContent(page);
        assert.deepEqual(menuClipping,[],`Open mobile menu has clipped text: ${JSON.stringify(menuClipping)}`);
        const reachable=[];
        for(const selector of ['.header__mobile-product:last-child','.header__mobile-actions .button--dark','.header__mobile-register','.header__mobile-contacts a:last-child']) {
          const link=mobile.locator(selector);
          await link.scrollIntoViewIfNeeded(); await frames(page);
          const evidence=await link.evaluate(el=>{
            const menu=el.closest('#mobile-menu'),r=el.getBoundingClientRect(),m=menu.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return {text:el.textContent.trim(),href:el.getAttribute('href'),disabled:el.getAttribute('aria-disabled'),tabIndex:el.tabIndex,scrollTop:menu.scrollTop,contained:r.x>=0 && r.right<=innerWidth && r.y>=m.top-1 && r.bottom<=Math.min(innerHeight,m.bottom)+1,hit:top===el || el.contains(top),interceptor:top?.className,x:r.x+r.width/2,y:r.y+r.height/2};
          });
          assert.equal(evidence.href,null,`Lower mobile link still has a destination: ${selector}`);
          assert.equal(evidence.disabled,'true',`Lower mobile link is not disabled: ${selector}`);
          assert.equal(evidence.tabIndex,-1,`Inert mobile text remains in the tab order: ${selector}`);
          assert.ok(evidence.contained && evidence.hit,`Lower mobile link is unreachable or covered: ${JSON.stringify(evidence)}`);
          assert.ok(evidence.text.length>0,`Lower mobile link has no readable text: ${selector}`);
          const before=await navigationState(page);
          await page.touchscreen.tap(evidence.x,evidence.y);
          await delay(220); await frames(page);
          assertSamePage(before,await navigationState(page),{scroll:true});
          reachable.push({selector,...evidence});
        }
        assert.ok(reachable.at(-1).scrollTop>0,'Mobile menu did not scroll to its lower contacts');
        if(engine==='chromium') await screenshot(page,engine,`mobile-menu-${width}-${theme}-bottom`);
        mobileEvidence={themeGeometry,descriptions,menuOverflow,menuClipping,reachable};
        await page.locator('[data-mobile-toggle]').click();
      }
      const isolation=await assertHomepageIsolated(page);
      return {geometry,clipping,brokenImages:broken,mobileEvidence,isolation,visualReview:'Screenshot inspection still required.'};
    },
  }))),
];

try {
  for(const engine of engines) {
    assert.ok(pw[engine],`Unknown browser: ${engine}`);
    const browser=await pw[engine].launch({headless:true});
    report.browsers.push({name:engine,version:browser.version()});
    try {
      for(const test of cases) {
        if(only && !only.includes(test.name)) continue;
        const item={browser:engine,name:test.name,status:'pass',startedAt:new Date().toISOString()};
        const touch=Boolean(test.viewport && test.viewport.width<1200);
        const context=await browser.newContext({viewport:test.viewport || {width:1440,height:1000},colorScheme:test.theme || 'light',locale:'ru-RU',timezoneId:'Europe/Moscow',reducedMotion:'no-preference',hasTouch:touch,...(engine!=='firefox'?{isMobile:touch}:{})});
        let primaryPage=null;
        await context.route('**/*',route=>{
          const request=route.request();
          if(!['GET','HEAD'].includes(request.method())) { report.networkWrites.push({browser:engine,test:test.name,method:request.method(),url:request.url()}); return route.abort(); }
          if(request.isNavigationRequest() && !request.url().startsWith(base)) { report.navigationAttempts.push({browser:engine,test:test.name,type:'external-request',url:request.url()}); return route.abort(); }
          return route.continue();
        });
        context.on('page',page=>{
          if(primaryPage) report.popups.push({browser:engine,test:test.name,url:page.url()});
          else primaryPage=page;
          page.setDefaultTimeout(8000);
          page.on('pageerror',error=>report.runtimeErrors.push({browser:engine,test:test.name,error:String(error)}));
          page.on('response',response=>{if(response.status()>=400 && response.url().startsWith(base) && !response.url().endsWith('/favicon.ico')) report.assetErrors.push({browser:engine,test:test.name,status:response.status(),url:response.url()});});
          page.on('framenavigated',frame=>{
            if(frame===page.mainFrame() && frame.url()!=='about:blank' && !authorizedNavigations.has(page)) report.navigationAttempts.push({browser:engine,test:test.name,type:'main-frame',url:frame.url()});
          });
          page.on('download',download=>report.navigationAttempts.push({browser:engine,test:test.name,type:'download',url:download.url()}));
          page.on('dialog',dialog=>{
            report.runtimeErrors.push({browser:engine,test:test.name,error:`Unexpected browser dialog (${dialog.type()}): ${dialog.message()}`});
            void dialog.dismiss().catch(()=>{});
          });
        });
        const page=await context.newPage();
        // Start before the next real snapshot auction, with time advancing.
        // setFixedTime would incorrectly freeze the clocks this suite checks.
        await page.clock.install({time:new Date('2026-11-11T06:30:00Z')});
        try { item.details=await test.run(page,engine); }
        catch(error) {
          item.status='fail'; item.error=String(error.stack || error);
          try { item.screenshot=await screenshot(page,engine,`FAIL-${test.name}`); } catch {}
        } finally { await context.close(); }
        item.finishedAt=new Date().toISOString();
        report.checks.push(item); await save();
        console.log(JSON.stringify({browser:engine,name:test.name,status:item.status,error:item.error?.split('\n')[0]}));
      }
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve=>server.close(resolve)); }
report.sourceUnchanged=JSON.stringify(sourceBefore)===JSON.stringify(await manifest(path.join(project,'src'),name=>/\.(ts|css)$/.test(name))) && sourceHtmlBefore===digest(await fs.readFile(path.join(project,'index.html')));
report.buildUnchanged=JSON.stringify(buildBefore)===JSON.stringify(await manifest(dist,name=>name==='index.html'||/\.(js|css)$/.test(name)));
report.passed=report.checks.filter(item=>item.status==='pass').length;
report.failed=report.checks.filter(item=>item.status==='fail').length;
report.finishedAt=new Date().toISOString();
report.status=report.failed || report.runtimeErrors.length || report.networkWrites.length || report.assetErrors.length || report.popups.length || report.navigationAttempts.length || !report.sourceUnchanged || !report.buildUnchanged ? 'fail' : 'pass';
await save();
console.log(JSON.stringify({status:report.status,passed:report.passed,failed:report.failed,output:out,runtimeErrors:report.runtimeErrors,networkWrites:report.networkWrites,assetErrors:report.assetErrors,popups:report.popups,navigationAttempts:report.navigationAttempts,sourceUnchanged:report.sourceUnchanged,buildUnchanged:report.buildUnchanged}));
process.exitCode=report.status==='pass' ? 0 : 1;
