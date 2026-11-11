import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Own loopback-only static server and fresh headless browser contexts. This
// script never connects to the owner's browser, clicks mailto, or sends forms.
const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_MODULE || '/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(project, 'dist');
const runName = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(project, 'qa/homepage/results', runName);
await fs.mkdir(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(), scope: 'DEBTPRICE homepage only',
  project, output, checks: [], screenshots: [], browsers: [],
  safety: 'Fresh headless contexts; non-GET/HEAD requests are blocked; no mailto click or message transmission.',
  scheduleFixture: 'Schedule interactions use fixed Date 2026-11-11T06:30:00Z; visual screenshots use the real current time.',
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function digest(filename) {
  const content = await fs.readFile(filename);
  return { file: path.relative(project, filename), bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
}
async function filesIn(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(filename));
    else if (entry.isFile()) result.push(filename);
  }
  return result.sort();
}
report.source = await Promise.all((await filesIn(path.join(project, 'src'))).map(digest));
report.build = await Promise.all((await filesIn(dist)).filter(file => /\.(html|js|css)$/.test(file)).map(digest));
report.script = await digest(fileURLToPath(import.meta.url));
try {
  report.gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8' }).trim();
  report.changedFiles = execFileSync('git', ['status', '--short'], { cwd: project, encoding: 'utf8' }).trim().split('\n');
} catch { report.gitHead = null; }

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    let filename = path.resolve(dist, '.' + pathname);
    if (!filename.startsWith(dist + path.sep) && filename !== dist) { response.writeHead(403).end(); return; }
    if (pathname.endsWith('/')) filename = path.join(filename, 'index.html');
    let stat;
    try { stat = await fs.stat(filename); } catch { response.writeHead(404).end('Not found'); return; }
    if (!stat.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') response.end(); else createReadStream(filename).pipe(response);
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseURL = `http://127.0.0.1:${server.address().port}`;
report.baseURL = baseURL;
const requested = (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',');
const selectedChecks = new Set((process.env.QA_CHECKS || '').split(',').filter(Boolean));
report.selectedChecks = selectedChecks.size ? [...selectedChecks] : 'all';
let browserName = '';
let page;
let failures = 0;
let navigationSequence = 0;
const assetChecks = new Map();

async function waitFor(condition, message, timeout = 8000) {
  const until = Date.now() + timeout;
  let lastError;
  while (Date.now() < until) {
    try { if (await condition()) return; } catch (error) { lastError = error; }
    await delay(70);
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ''}`);
}
async function saveReport() {
  report.updatedAt = new Date().toISOString();
  report.passed = report.checks.filter(check => check.status === 'pass').length;
  report.failed = report.checks.filter(check => check.status === 'fail').length;
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
async function shot(name, fullPage = false, locator = null) {
  const filename = `${browserName}-${name}.png`;
  const target = path.join(output, filename);
  if (locator) await locator.screenshot({ path: target, animations: 'disabled' });
  else await page.screenshot({ path: target, fullPage, animations: 'disabled' });
  report.screenshots.push({ browser: browserName, name, file: target, fullPage });
}
async function check(name, action) {
  if (selectedChecks.size && !selectedChecks.has(name) && name !== 'browser-launch' && name !== 'runtime-integrity-no-errors-or-network-writes') return;
  const started = Date.now();
  try {
    const evidence = await action();
    report.checks.push({ browser: browserName, name, status: 'pass', durationMs: Date.now() - started, evidence });
    console.log(`PASS ${browserName} ${name}`);
  } catch (error) {
    failures++;
    report.checks.push({ browser: browserName, name, status: 'fail', durationMs: Date.now() - started, error: error.stack || String(error), evidence: error.evidence });
    console.log(`FAIL ${browserName} ${name}: ${error.message}`);
    if (page && !page.isClosed()) {
      try { await shot(`failure-${report.checks.length}`); } catch { /* Preserve the original failure. */ }
    }
  }
  await saveReport();
}
async function openHome(hash = '') {
  // A fragment-only goto is same-document navigation. Vary this benign query
  // to give each independent scenario a fresh document and mounted state.
  await page.goto(baseURL + '/?qa=' + (++navigationSequence) + hash, { waitUntil: 'networkidle' });
  await page.locator('#hero-title').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await waitFor(async () => (await page.locator('#hero-title').innerText()).includes('DEBTPRICE'), 'Homepage heading did not render');
}
async function waitSelected(selector, selected = true) {
  await waitFor(async () => await page.locator(selector).getAttribute('aria-selected') === String(selected), `${selector} selected=${selected}`);
}
async function waitHash(hash) {
  await waitFor(async () => new URL(page.url()).hash === hash, `Expected location ${hash}`);
}
function destinationOf(hash) {
  const at = hash.indexOf('?');
  return {
    section: at < 0 ? hash : hash.slice(0, at),
    // Compare every decoded parameter, including duplicates, independently of
    // serialization order. Extra/missing intent parameters still fail.
    query: [...new URLSearchParams(at < 0 ? '' : hash.slice(at + 1))].sort(([a], [b]) => a.localeCompare(b)),
  };
}
function expectedDestination(section, query = {}) {
  return { section, query: Object.entries(query).sort(([a], [b]) => a.localeCompare(b)) };
}
async function waitDestination(section, query = {}) {
  const expected = expectedDestination(section, query);
  await waitFor(async () => JSON.stringify(destinationOf(new URL(page.url()).hash)) === JSON.stringify(expected), `Expected destination ${JSON.stringify(expected)}`);
  assert.deepEqual(destinationOf(new URL(page.url()).hash), expected);
}
async function waitScrollStable() {
  let previous = await page.evaluate(() => scrollY), stable = 0;
  await waitFor(async () => {
    const next = await page.evaluate(() => scrollY);
    stable = Math.abs(next - previous) < 0.5 ? stable + 1 : 0;
    previous = next;
    return stable >= 4;
  }, 'Scrolling did not settle');
}
async function closeDetail() {
  if (await page.locator('#detail-dialog').evaluate(element => element.open)) {
    await page.keyboard.press('Escape');
    await waitFor(async () => !(await page.locator('#detail-dialog').evaluate(element => element.open)), 'Detail dialog did not close');
  }
  await waitFor(async () => await page.evaluate(() => !document.querySelector('#detail-dialog').open && !document.querySelector('#p10-format-dialog').open && !document.body.classList.contains('has-dialog') && !document.documentElement.classList.contains('p10-modal-open')), 'Escape did not close the full overlay stack and release scrolling');
}
async function sweepAndInspect() {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 650) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
    // Wait at each actual viewport, so WebKit/Firefox get a paint and their
    // native lazy-loader can react. Racing through the document can leave
    // perfectly valid images deferred without ever giving them a paint.
    await delay(120);
    await waitFor(async () => await page.evaluate(() => [...document.images].filter(image => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight;
    }).every(image => image.complete && image.naturalWidth > 0)), `Visible image did not load at scroll ${y}`, 5000);
  }
  await page.evaluate(async () => {
    await Promise.race([
      Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))),
      new Promise(resolve => setTimeout(resolve, 3500)),
    ]);
  });
  await delay(450);
  const state = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    brokenImages: [...document.images].filter(image => image.getClientRects().length && image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src')),
    deferredMarqueeImages: [...document.images].filter(image => !image.complete && image.closest('.partners__group')).map(image => image.src),
    imageSourceURLs: [...new Set([...document.images].map(image => image.src).filter(url => url.startsWith(location.origin + '/')))],
    oldLinks: [...document.querySelectorAll('a[href]')].filter(anchor => anchor.getAttribute('href').startsWith('#/')).map(anchor => anchor.getAttribute('href')),
    headings: [...document.querySelectorAll('main h1, main h2')].filter(heading => heading.getClientRects().length).map(heading => heading.textContent.trim()),
    fonts: ['500 52px "TikTok Sans"', '400 18px Manrope'].map(font => ({ font, loaded: document.fonts.check(font) })),
  }));
  assert.ok(state.scrollWidth <= state.viewport + 1, `Document overflow: ${state.scrollWidth} > ${state.viewport}`);
  assert.ok(state.bodyWidth <= state.viewport + 1, `Body overflow: ${state.bodyWidth} > ${state.viewport}`);
  assert.deepEqual(state.brokenImages, [], 'Broken visible images');
  assert.deepEqual(state.oldLinks, [], 'Retired #/ links remain in DOM');
  assert.ok(state.fonts.every(font => font.loaded), 'Required local fonts did not load');
  assert.ok(state.headings.some(text => text.includes('Экосистема DEBTPRICE')));
  // A clipped, offscreen loading=lazy copy is not a broken visible image. Its
  // distinct source must still be a real, nonempty asset; never waive a 404.
  const deferred = [...new Set(state.deferredMarqueeImages)];
  for (const url of state.imageSourceURLs) {
    if (assetChecks.has(url)) continue;
    const response = await fetch(url);
    assert.equal(response.status, 200, `Image source unavailable: ${url}`);
    const bytes = (await response.arrayBuffer()).byteLength;
    assert.ok(bytes > 0, `Empty image source: ${url}`);
    assetChecks.set(url, { url, status: response.status, bytes });
  }
  await page.locator('.partners__marquee').scrollIntoViewIfNeeded();
  await waitFor(async () => await page.evaluate(() => [...document.querySelectorAll('.partners__group img')].filter(image => {
    const box = image.getBoundingClientRect();
    return box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight;
  }).every(image => image.complete && image.naturalWidth > 0)), 'Visible marquee logo did not load');
  state.deferredMarqueeAssetsHttp200 = deferred.length;
  state.allImageSourceAssetsHttp200 = state.imageSourceURLs.length;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  return state;
}
async function submitSearch(query) {
  await page.locator('[data-nav-toggle="search"]').click();
  await page.locator('#header-search').fill(query);
  await page.locator('#header-search').press('Enter');
  await waitFor(async () => await page.locator('#detail-dialog').getAttribute('data-view') === 'search', 'Search dialog missing');
  await waitDestination('#search', { q: query });
}

try {
  for (const engine of requested) {
    browserName = engine;
    const errors = [], httpErrors = [], writes = [], crashes = [];
    let browser;
    try {
      browser = await playwright[engine].launch({ headless: true, ...(engine === 'chromium' ? { args: ['--disable-dev-shm-usage'] } : {}) });
    } catch (error) {
      await check('browser-launch', async () => { throw error; });
      continue;
    }
    report.browsers.push({ engine, version: browser.version(), nativeSafari: false });
    async function contextFor(options = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', locale: 'ru-RU', timezoneId: 'Europe/Moscow', reducedMotion: 'no-preference', ...options });
      await context.route('**/*', async route => {
        const request = route.request();
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes.push({ method: request.method(), url: request.url() });
          await route.abort('blockedbyclient');
        } else await route.continue();
      });
      context.on('page', opened => {
        opened.on('pageerror', error => errors.push(error.message));
        opened.on('crash', () => crashes.push(opened.url()));
        opened.on('response', response => { if (response.url().startsWith(baseURL) && response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() }); });
      });
      return context;
    }
    let context = await contextFor();
    page = await context.newPage();
    page.setDefaultTimeout(9000);
    page.setDefaultNavigationTimeout(15000);

    await check('desktop-1440-light-structure-assets', async () => {
      await openHome();
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      const state = await sweepAndInspect();
      if (engine === 'chromium') await shot('desktop-1440-light', true);
      return state;
    });
    await check('theme-toggle-reload-and-dark-layout', async () => {
      await openHome();
      await page.locator('.header__bottom [data-theme-toggle]').click();
      await waitFor(async () => await page.locator('html').getAttribute('data-theme') === 'dark', 'Dark theme missing');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.evaluate(() => localStorage.getItem('dpeco-theme')), 'dark');
      const state = await sweepAndInspect();
      if (engine === 'chromium') await shot('desktop-1440-dark', true);
      await page.locator('.header__bottom [data-theme-toggle]').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      return state;
    });
    await check('seller-navigation-keyboard-request-context-logo-top', async () => {
      await openHome();
      const trigger = page.locator('[data-nav-toggle="sellers"]');
      await trigger.focus();
      await trigger.press('ArrowDown');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#nav-panel-sellers a').first().evaluate(element => element === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
      await trigger.click();
      await page.locator('#nav-panel-sellers [data-request-kind="receivables"]').click();
      await waitDestination('#request', { kind: 'receivables' });
      assert.equal(await page.locator('[data-request-form]').getAttribute('data-kind'), 'receivables');
      assert.equal(await page.locator('[data-request-context]').isVisible(), true);
      assert.match(await page.locator('[data-request-context]').innerText(), /дебиторской/i);
      assert.equal(await page.locator('[name="interest"]').inputValue(), 'Продажа дебиторской задолженности');
      await page.locator('.header__brand').click();
      await waitHash('#top');
      await waitFor(async () => await page.evaluate(() => scrollY < 3), 'Logo did not scroll to page top');
      return { requestKind: 'receivables', hashAfterLogo: '#top' };
    });
    await check('schedule-periods-types-keyboard-and-lot-dialog', async () => {
      await page.clock.setFixedTime(new Date('2026-11-11T06:30:00Z'));
      await openHome('#lots');
      await waitFor(async () => await page.locator('.p10-auction').count() === 6, 'Expected six scheduled snapshot lots');
      await page.locator('#filter-all').focus();
      await page.keyboard.press('ArrowRight');
      await waitSelected('#filter-individuals');
      await waitFor(async () => await page.locator('.p10-auction').count() === 6, 'Individuals count mismatch');
      await page.keyboard.press('End');
      await waitSelected('#filter-receivables');
      await page.locator('.p10-schedule__empty').waitFor({ state: 'visible' });
      await page.locator('#filter-receivables').press('Home');
      await waitSelected('#filter-all');
      await waitFor(async () => await page.locator('.p10-auction').count() === 6, 'All filter did not restore schedule');
      await page.locator('button#period-upcoming').focus();
      await page.keyboard.press('ArrowRight');
      await waitSelected('button#period-previous');
      await waitFor(async () => await page.locator('.p10-auction').count() === 8, 'Previous-month snapshot count mismatch');
      await page.locator('#filter-receivables').click();
      await waitFor(async () => await page.locator('.p10-auction').count() === 2, 'Receivables filter mismatch');
      await page.locator('#filter-all').click();
      await page.locator('button#period-upcoming').click();
      await waitFor(async () => await page.locator('.p10-auction').count() === 6, 'Upcoming did not restore');
      const lotButton = page.locator('[data-open-lot="zaimer-20261111"]').first();
      await lotButton.click();
      await waitDestination('#lot-zaimer-20261111');
      assert.equal(await page.locator('#detail-dialog').getAttribute('data-view'), 'lot');
      assert.match(await page.locator('#dialog-title').innerText(), /Займер/);
      assert.match(await page.locator('#dialog-content').innerText(), /10 ноября 2026/);
      await closeDetail();
      await waitDestination('#lots');
      assert.equal(await lotButton.evaluate(element => element === document.activeElement), true);
      return { fixedDate: '2026-11-11T06:30:00Z', upcoming: 6, previousMonth: 8, previousReceivables: 2, dialog: 'Займер' };
    });
    await check('four-format-dialogs-and-keyboard', async () => {
      await openHome('#formats');
      for (const format of ['english', 'dutch', 'offers', 'listing']) {
        const trigger = page.locator(`[data-p10-format-open="${format}"]`);
        await trigger.click();
        await waitDestination(`#format-${format}`);
        assert.equal(await page.locator('#p10-format-dialog').evaluate(element => element.open), true);
        await waitSelected(`[data-format="${format}"]`);
        assert.notEqual(await page.locator(`#format-pane-${format}`).getAttribute('aria-hidden'), 'true');
        assert.equal(await page.locator(`#format-pane-${format}`).evaluate(element => element.inert), false);
        assert.equal(await page.locator(`#format-pane-${format}`).isVisible(), true);
        await page.keyboard.press('Escape');
        await waitFor(async () => !(await page.locator('#p10-format-dialog').evaluate(element => element.open)), 'Format dialog remained open');
        await waitDestination('#formats');
        assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
      }
      await page.locator('[data-p10-format-open="english"]').click();
      await page.locator('[data-format="english"]').focus();
      await page.keyboard.press('ArrowDown');
      await waitSelected('[data-format="dutch"]');
      await waitDestination('#format-dutch');
      await page.keyboard.press('End');
      await waitSelected('[data-format="listing"]');
      await waitDestination('#format-listing');
      await page.keyboard.press('Escape');
      await waitDestination('#formats');
      await waitFor(async () => !(await page.locator('#p10-format-dialog').evaluate(element => element.open)), 'Escape did not close format dialog after keyboard selection');
      return { formats: 4, keyboard: ['ArrowDown', 'End', 'Escape'] };
    });
    await check('capabilities-audience-cta-updates-and-context', async () => {
      await openHome('#capabilities');
      const buyer = page.locator('[data-capability-new-audience="buyer"]');
      const seller = page.locator('[data-capability-new-audience="seller"]');
      await seller.focus();
      await page.keyboard.press('ArrowRight');
      await waitSelected('[data-capability-new-audience="buyer"]');
      const buyerLinks = await page.locator('[data-capability-new-link]').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-capability-new-link'), href: element.getAttribute('href'), requestKind: element.getAttribute('data-request-kind'), category: element.getAttribute('data-lots-category'), period: element.getAttribute('data-lots-period'), label: element.textContent.trim() })));
      assert.equal(buyerLinks.length, 5);
      const capabilityIntents = {
        credit: { category: 'individuals', kind: 'portfolio', interest: 'Кредитные портфели' },
        factoring: { category: 'receivables', kind: 'general', interest: 'Факторинговые портфели' },
        receivables: { category: 'receivables', kind: 'receivables', interest: 'Дебиторская задолженность' },
        claims: { category: 'all', kind: 'general', interest: 'Права требования' },
        other: { category: 'all', kind: 'general', interest: 'Прочие права требования' },
      };
      assert.deepEqual(buyerLinks.map(link => link.id), Object.keys(capabilityIntents));
      for (const link of buyerLinks) {
        const intent = capabilityIntents[link.id];
        assert.deepEqual(destinationOf(link.href), expectedDestination('#lots', { category: intent.category, period: 'upcoming' }));
        assert.equal(link.requestKind, null);
        assert.equal(link.category, intent.category);
        assert.equal(link.period, 'upcoming');
        assert.equal(link.label, 'Посмотреть лоты');
      }
      await buyer.press('ArrowLeft');
      await waitSelected('[data-capability-new-audience="seller"]');
      const sellerLinks = await page.locator('[data-capability-new-link]').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-capability-new-link'), href: element.getAttribute('href'), requestKind: element.getAttribute('data-request-kind'), requestInterest: element.getAttribute('data-request-interest'), label: element.textContent.trim() })));
      assert.equal(sellerLinks.length, 5);
      for (const link of sellerLinks) {
        const intent = capabilityIntents[link.id];
        assert.deepEqual(destinationOf(link.href), expectedDestination('#request', { kind: intent.kind, interest: intent.interest }));
        assert.equal(link.requestKind, intent.kind);
        assert.equal(link.requestInterest, intent.interest);
        assert.equal(link.label, 'Обсудить продажу');
      }
      await page.locator('[data-capability-new-expand="factoring"]').focus();
      await page.locator('[data-capability-new-link="factoring"]').click();
      await waitDestination('#request', { interest: 'Факторинговые портфели' });
      assert.equal(await page.locator('[data-request-form]').getAttribute('data-kind'), 'general');
      assert.equal(await page.locator('[name="interest"]').inputValue(), 'Факторинговые портфели');
      assert.match(await page.locator('[data-request-context]').innerText(), /Факторинговые портфели/);
      return { buyerLinks, sellerLinks };
    });
    await check('back-restores-manual-scroll-and-closes-format-dialog', async () => {
      await openHome();
      const captureNavigation = () => page.evaluate(() => {
        const source = document.querySelector('[data-capability-new-link="factoring"]');
        const active = document.activeElement;
        const savedFocus = history.state?.dpecoHome?.focus;
        const savedTarget = savedFocus ? document.querySelector(`[data-home-focus="${CSS.escape(savedFocus)}"]`) : null;
        const describe = element => element ? { tag: element.tagName, id: element.id, text: element.textContent?.trim().slice(0, 120), homeFocus: element.getAttribute('data-home-focus') } : null;
        const rect = source?.getBoundingClientRect();
        return {
          url: location.href, scrollY, historyState: history.state,
          activeElement: describe(active), savedTarget: describe(savedTarget),
          sourceFocused: source === active, sourceHomeFocus: source?.getAttribute('data-home-focus'),
          sourceInert: Boolean(source?.closest('[inert]')),
          activeCard: document.querySelector('.capability-new__grid')?.getAttribute('data-capability-new-active'),
          sourceBox: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        };
      });
      await page.locator('#capabilities').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.locator('[data-capability-new-expand="factoring"]').focus();
      await delay(450);
      await waitScrollStable();
      const beforeNavigation = await captureNavigation();
      const before = beforeNavigation.scrollY;
      const sourceBefore = beforeNavigation.sourceBox;
      await page.locator('[data-capability-new-link="factoring"]').click();
      await waitDestination('#request', { interest: 'Факторинговые портфели' });
      await delay(600);
      await page.goBack();
      await waitHash('');
      await waitScrollStable();
      const afterInitialScrollStable = await captureNavigation();
      const animationFrameObservation = await page.evaluate(async () => {
        let frames = 0;
        await Promise.race([
          new Promise(resolve => requestAnimationFrame(() => { frames++; requestAnimationFrame(() => { frames++; resolve(); }); })),
          new Promise(resolve => setTimeout(resolve, 1000)),
        ]);
        return { frames };
      });
      await delay(300);
      const afterTwoFramesAnd300ms = await captureNavigation();
      try {
        await waitFor(async () => await page.locator('[data-capability-new-link="factoring"]').evaluate(element => element === document.activeElement), 'Back did not restore source CTA focus after the navigation settled');
      } catch (error) {
        error.evidence = { beforeNavigation, afterInitialScrollStable, animationFrameObservation, afterTwoFramesAnd300ms, afterTimeout: await captureNavigation() };
        throw error;
      }
      await waitScrollStable();
      const settledNavigation = await captureNavigation();
      const restored = settledNavigation.scrollY;
      const sourceAfter = settledNavigation.sourceBox;
      assert.equal(settledNavigation.sourceFocused, true, `Back lost source CTA focus: ${JSON.stringify(settledNavigation)}`);
      assert.ok(sourceAfter && sourceAfter.y >= 0 && sourceAfter.y + sourceAfter.height <= 1000, 'Back did not restore the original card in the viewport');
      assert.ok(restored > 1000, 'Back incorrectly jumped to page top');
      assert.ok(Math.abs((await page.evaluate(() => history.state.dpecoHome.y)) - before) < 1, 'Saved scroll coordinate changed');
      await page.locator('.header__brand').click();
      await waitHash('#top');
      await page.locator('[data-p10-format-open="english"]').click();
      await waitDestination('#format-english');
      assert.equal(await page.locator('#p10-format-dialog').evaluate(element => element.open), true);
      await page.goBack();
      // Opening a modal now creates its own history entry. One Back closes the
      // modal and restores its immediate homepage source, which is #top here.
      await waitDestination('#top');
      await waitFor(async () => !(await page.locator('#p10-format-dialog').evaluate(element => element.open)), 'Back left the format dialog open');
      // HTMLDialogElement.close() queues its close event. Its open property
      // changes before the listener has removed the document's scroll lock.
      const immediatelyAfterClose = await page.evaluate(() => ({ open: document.querySelector('#p10-format-dialog').open, scrollLocked: document.documentElement.classList.contains('p10-modal-open') }));
      await waitFor(async () => await page.evaluate(() => !document.querySelector('#p10-format-dialog').open && !document.documentElement.classList.contains('p10-modal-open')), 'Back did not settle both dialog closure and document scroll unlock');
      const settledAfterClose = await page.evaluate(() => ({ open: document.querySelector('#p10-format-dialog').open, scrollLocked: document.documentElement.classList.contains('p10-modal-open'), overflow: getComputedStyle(document.documentElement).overflow }));
      assert.equal(await page.locator('[data-p10-format-open="english"]').evaluate(element => element === document.activeElement), true, 'Back did not restore the format trigger');
      return { manualScrollBefore: before, restoredScroll: restored, exactScrollDrift: restored - before, sourceBefore, sourceAfter, sourceFocusRestored: true, formatClosedOnBack: true, immediatelyAfterClose, settledAfterClose, navigationEvidence: { beforeNavigation, afterInitialScrollStable, animationFrameObservation, afterTwoFramesAnd300ms, settledNavigation } };
    });
    await check('search-section-lot-empty-and-dialog-navigation', async () => {
      await openHome();
      await submitSearch('форматы');
      await page.locator('#detail-dialog a[href="#formats"]').click();
      await waitHash('#formats');
      assert.equal(await page.locator('#detail-dialog').evaluate(element => element.open), false);
      await submitSearch('Займер');
      await page.locator('#detail-dialog [data-open-lot="zaimer-20261111"]').click();
      await waitDestination('#lot-zaimer-20261111');
      assert.equal(await page.locator('#detail-dialog').getAttribute('data-view'), 'lot');
      assert.match(await page.locator('#dialog-title').innerText(), /Займер/);
      await closeDetail();
      await waitDestination('#formats');
      await submitSearch('zzzz-no-such-debt-2941');
      assert.match(await page.locator('.home-search__count').innerText(), /Ничего не найдено/);
      assert.equal(await page.locator('#detail-dialog .home-result').count(), 0);
      await closeDetail();
      await waitDestination('#formats');
      return { section: '#formats', lot: 'zaimer-20261111', emptyState: true, escapeClosedEntireSearchLotStack: true };
    });
    await check('documents-six-official-links', async () => {
      await openHome();
      await page.locator('.p10-footer [data-open-documents]').click();
      await waitDestination('#documents');
      assert.equal(await page.locator('#detail-dialog').getAttribute('data-view'), 'documents');
      const links = await page.locator('#detail-dialog .home-result').evaluateAll(elements => elements.map(element => ({ title: element.textContent.trim(), href: element.href, target: element.target, rel: element.rel })));
      assert.equal(links.length, 6);
      assert.ok(links.every(link => link.href.startsWith('https://my.debtprice.market/') && link.target === '_blank' && link.rel.includes('noopener')));
      assert.ok(links.some(link => link.href.endsWith('DEBTPRICE_details.pdf')));
      assert.ok(links.some(link => link.href.endsWith('DEBTPRICE_debt_list_BLANK.xlsx')));
      await closeDetail();
      await waitHash('');
      return { links, networkCheck: 'Link targets inspected; no files submitted or external pages opened.' };
    });
    await check('form-validation-and-reviewed-draft-no-transmission', async () => {
      await openHome('#request');
      const form = page.locator('[data-request-form]');
      await form.locator('button[type="submit"]').click();
      assert.equal(await form.locator('.request__status').isVisible(), false);
      assert.equal(await form.evaluate(element => element.checkValidity()), false);
      await form.locator('[name="name"]').fill('Проверка интерфейса');
      await form.locator('[name="email"]').fill('qa@example.invalid');
      await form.locator('[name="phone"]').fill('123');
      await form.locator('[name="company"]').fill('Тест интерфейса, без отправки');
      await form.locator('[name="consent"]').check();
      await form.locator('button[type="submit"]').click();
      assert.equal(await form.locator('.request__status').isVisible(), false);
      assert.match(await form.locator('[name="phone"]').evaluate(element => element.validationMessage), /от 10 до 15 цифр/);
      for (const invalid of ['abc1234567890', '1234567890123456']) {
        await form.locator('[name="phone"]').fill(invalid);
        await form.locator('button[type="submit"]').click();
        assert.equal(await form.locator('.request__status').isVisible(), false);
        assert.equal(await form.locator('[name="phone"]').evaluate(element => element.validity.valid), false);
        assert.match(await form.locator('[name="phone"]').evaluate(element => element.validationMessage), /от 10 до 15 цифр/);
      }
      await form.locator('[name="phone"]').fill('+7 000 000-00-00');
      assert.equal(await form.locator('input[type="checkbox"]').nth(1).isChecked(), false);
      await form.locator('button[type="submit"]').click();
      await form.locator('.request__status').waitFor({ state: 'visible' });
      assert.match(await form.locator('.request__draft').innerText(), /qa@example\.invalid/);
      const mailto = await form.locator('.request__status a[href^="mailto:"]').getAttribute('href');
      assert.ok(mailto.startsWith('mailto:v@debtprice.market?'));
      assert.ok(decodeURIComponent(mailto).includes('Тест интерфейса, без отправки'));
      assert.ok(!(await form.locator('.request__draft').innerText()).includes('Рекламные предложения'));
      await form.locator('[name="company"]').fill('Проверка сброса черновика');
      assert.equal(await form.locator('.request__status').isVisible(), false);
      assert.equal(writes.length, 0, 'Unexpected network write request');
      return { invalidEmpty: true, invalidPhone: ['too-short', 'letters', 'too-long'], draftPrepared: true, optionalMarketingUnchecked: true, draftInvalidatedAfterEdit: true, mailtoClicked: false, writes: 0 };
    });
    await check('legacy-links-keep-homepage', async () => {
      await openHome('#/buyers');
      await waitHash('#lots');
      assert.equal(await page.locator('#hero-title').count(), 1);
      assert.equal(await page.locator('#ecosystem').count(), 1);
      await page.goto(baseURL + '/#/sellers/debitorka', { waitUntil: 'networkidle' });
      await waitDestination('#request', { kind: 'receivables' });
      assert.equal(await page.locator('[data-request-form]').getAttribute('data-kind'), 'receivables');
      assert.equal(await page.locator('[name="interest"]').inputValue(), 'Продажа дебиторской задолженности');
      return { buyers: '#lots', sellers: '#request?kind=receivables', homepagePreserved: true };
    });
    await check('addressed-dialogs-survive-reload-with-history-state', async () => {
      const results = [];
      for (const [hash, view, heading] of [
        ['#documents', 'documents', 'Документы'],
        ['#/search?q=%D0%97%D0%B0%D0%B9%D0%BC%D0%B5%D1%80', 'search', 'Поиск по сайту'],
        ['#lot-zaimer-20261111', 'lot', 'Займер'],
      ]) {
        await openHome(hash);
        await waitFor(async () => await page.locator('#detail-dialog').evaluate(element => element.open) && await page.locator('#detail-dialog').getAttribute('data-view') === view, `Addressed ${view} dialog did not open`);
        await page.reload({ waitUntil: 'networkidle' });
        await waitFor(async () => await page.locator('#detail-dialog').evaluate(element => element.open) && await page.locator('#detail-dialog').getAttribute('data-view') === view, `Addressed ${view} dialog did not reopen after reload`);
        assert.ok((await page.locator('#dialog-title').innerText()).includes(heading));
        assert.equal(await page.locator('#hero-title').count(), 1);
        if (view === 'search') {
          assert.equal(await page.locator('#dialog-search').inputValue(), 'Займер');
          assert.equal(await page.locator('#detail-dialog [data-open-lot="zaimer-20261111"]').count(), 1);
        }
        results.push({ hash, view, reopened: true, historyStatePresent: await page.evaluate(() => Boolean(history.state?.dpecoHome)) });
        await closeDetail();
        await waitDestination('#top');
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.locator('#detail-dialog').evaluate(element => element.open), false, 'A closed direct-link dialog reopened on reload');
      }
      return results;
    });
    await check('expired-snapshot-does-not-present-upcoming-lots', async () => {
      await page.clock.setFixedTime(new Date('2026-11-14T06:30:00Z'));
      await openHome('#lots');
      assert.equal(await page.locator('.p10-auction').count(), 0);
      assert.equal(await page.locator('.p10-schedule__empty').isVisible(), true);
      assert.match(await page.locator('[data-next-name]').innerText(), /Расписание на площадке/);
      return { fixedDate: '2026-11-14T06:30:00Z', upcoming: 0 };
    });
    await context.close();

    for (const width of [390, 320]) {
      context = await contextFor({ viewport: { width, height: 844 }, hasTouch: true, ...(engine !== 'firefox' ? { isMobile: true } : {}) });
      page = await context.newPage();
      page.setDefaultTimeout(9000);
      await check(`mobile-${width}-layout-menu-theme`, async () => {
        await openHome();
        const state = await sweepAndInspect();
        if (engine === 'chromium') await shot(`mobile-${width}-hero`);
        const toggle = page.locator('[data-mobile-toggle]');
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#mobile-menu').evaluate(element => element.inert), false);
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await toggle.click();
        await page.locator('#mobile-menu a[href="#formats"]').click();
        await waitHash('#formats');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await page.locator('.p10-mobile-theme').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        const dark = await sweepAndInspect();
        await page.locator('.p10-mobile-theme').click();
        if (engine === 'chromium') {
          await page.locator(width === 390 ? '#ecosystem' : '#request').scrollIntoViewIfNeeded();
          await delay(500);
          await shot(width === 390 ? 'mobile-390-ecosystem' : 'mobile-320-request');
        }
        return { light: state, dark, menuCloseOnNavigation: true };
      });
      await context.close();
    }

    context = await contextFor({ reducedMotion: 'reduce' });
    page = await context.newPage();
    await check('reduced-motion-keeps-content-and-controls', async () => {
      await openHome();
      const state = await sweepAndInspect();
      const motionState = await page.evaluate(() => ({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, marquee: getComputedStyle(document.querySelector('.partners__track')).animationName, hiddenHero: getComputedStyle(document.querySelector('#hero-title')).opacity }));
      assert.equal(motionState.reduced, true);
      assert.equal(motionState.marquee, 'none');
      assert.equal(motionState.hiddenHero, '1');
      await page.locator('[data-p10-format-open="dutch"]').click();
      await waitSelected('[data-format="dutch"]');
      await page.keyboard.press('Escape');
      await waitFor(async () => !(await page.locator('#p10-format-dialog').evaluate(element => element.open)), 'Reduced-motion format dialog did not close');
      await waitHash('');
      return { state, motionState };
    });
    await context.close();
    await check('runtime-integrity-no-errors-or-network-writes', async () => {
      assert.deepEqual(errors, [], 'Browser pageerror events');
      assert.deepEqual(httpErrors, [], 'HTTP failures for local build assets');
      assert.deepEqual(crashes, [], 'Browser page crashes');
      assert.deepEqual(writes, [], 'Unexpected non-GET/HEAD requests');
      return { pageerrors: errors, httpErrors, crashes, writes };
    });
    await browser.close();
    page = null;
  }
} catch (error) {
  failures++;
  report.fatalError = error.stack || String(error);
  console.error(report.fatalError);
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  report.status = failures ? 'fail' : 'pass';
  await saveReport();
  console.log(JSON.stringify({ status: report.status, passed: report.passed, failed: report.failed, output, report: path.join(output, 'report.json') }));
  process.exitCode = failures ? 1 : 0;
}
