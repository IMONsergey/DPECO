import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Isolated test contexts. Read-only requests only; no mail client or CRM sends.
const require = createRequire(import.meta.url);
const pw = require('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const phase = process.env.QA_PHASE || 'candidate';
const out = path.join(project, 'qa/homepage/results', `state-regressions-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(out, { recursive: true });
const dist = path.join(project, 'dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(dist + '/')) { res.writeHead(403).end(); return; }
    if (!(await fs.stat(file)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const report = { phase, createdAt:new Date().toISOString(), output:out, checks:[], runtimeErrors:[], networkWrites:[], build:[], browsers:[] };
for (const name of (await fs.readdir(path.join(dist, 'assets'))).filter(x => /\.(js|css)$/.test(x))) {
  const bytes = await fs.readFile(path.join(dist, 'assets', name));
  report.build.push({ name, sha256:createHash('sha256').update(bytes).digest('hex') });
}
const only = process.env.QA_ONLY?.split(',');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(read, accept, message, timeout = 6000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await read();
    if (accept(value)) return value;
    await sleep(40);
  } while (Date.now() < deadline);
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function open(page, hash = '') {
  await page.goto(base + hash, { waitUntil:'load' });
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
}
async function selected(page, id) {
  await until(() => page.locator(`#${id}`).getAttribute('aria-selected'), x => x === 'true', `${id} was not selected`);
}
async function visibleContext(page) {
  return page.locator('[data-request-context]').evaluate(el => ({ hidden:el.hidden, text:el.querySelector('[data-request-context-label]').textContent.trim() }));
}
async function pagePosition(page, selector) {
  return page.evaluate(selector => {
    const element = document.querySelector(selector);
    return { y:scrollY, focused:document.activeElement === element, hash:location.hash };
  }, selector);
}
async function draft(page) {
  await page.locator('.p10-consultation__submit').click();
  await page.locator('#request-status').waitFor({ state:'visible' });
  const href = await page.locator('#request-status a[href^="mailto:"]').getAttribute('href');
  const url = new URL(href);
  return { recipient:url.pathname, subject:url.searchParams.get('subject'), body:url.searchParams.get('body') };
}
async function fillRequest(page) {
  await page.locator('[name="name"]').fill('Тест проверки');
  await page.locator('[name="company"]').fill('Тестовая организация');
  await page.locator('[name="email"]').fill('test@example.com');
  await page.locator('[name="phone"]').fill('+7 (999) 123-45-67');
  await page.locator('[name="consent"]').check();
}

const cases = [
  {
    name:'continuous-scroll-preserves-history-without-rate-error',
    async run(page) {
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await open(page, '#top');
      await page.locator('.header__nav a[href="#request"]').click();
      await settled(page);
      const initial = await page.evaluate(() => scrollY);
      // Drive real layout/scroll events on rendering frames. Per-wheel driver
      // roundtrips capped the old WebKit run at 69 events, so it never reached
      // the required exposure. Keep the same 120-event / 10-second criterion.
      const { changes, iterations, durationMs } = await page.evaluate(async () => {
        let previous = scrollY;
        let changes = 0;
        let iterations = 0;
        const started = performance.now();
        while (changes < 125 && iterations < 230 && performance.now() - started < 9000) {
          const delta = Math.floor(iterations / 12) % 2 === 0 ? 20 : -20;
          window.scrollBy({ top: delta, behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (scrollY !== previous) changes++;
          previous = scrollY;
          iterations++;
        }
        return { changes, iterations, durationMs: performance.now() - started };
      });
      assert.ok(changes >= 120 && durationMs < 10000, `Insufficient continuous-scroll exposure: ${JSON.stringify({ changes, iterations, durationMs })}`);
      await page.mouse.wheel(0, 137);
      let lastY = NaN;
      let stableSamples = 0;
      const manualY = await until(() => page.evaluate(() => scrollY), y => {
        stableSamples = y === lastY ? stableSamples+1 : 0;
        lastY = y;
        return stableSamples >= 3;
      }, 'Wheel scrolling did not settle');
      await settled(page);
      assert.equal(errors.length, 0, 'Continuous scrolling caused a runtime error: ' + JSON.stringify(errors));
      await page.goBack();
      await until(() => page.url(), url => new URL(url).hash === '#top', 'Back failed after continuous scroll');
      await settled(page);
      await page.goForward();
      const restored = await until(() => page.evaluate(() => ({ y:scrollY, hash:location.hash })), x => x.hash === '#request' && Math.abs(x.y-manualY) <= 1, 'Forward lost the latest position after continuous scroll');
      assert.equal(errors.length, 0, 'History navigation caused a runtime error: ' + JSON.stringify(errors));
      return { initial, changes, iterations, durationMs, manualY, restored, runtimeErrors:errors };
    },
  },
  {
    name:'page-forward-retains-latest-manual-scroll',
    async run(page) {
      await open(page, '#top');
      await page.locator('.header__nav a[href="#request"]').click();
      await until(() => page.url(), url => new URL(url).hash === '#request', 'Contact navigation did not finish');
      await settled(page);
      const before = await page.evaluate(() => ({ y:scrollY, focusId:document.activeElement.id }));
      const requestBefore = await visibleContext(page);
      // Scroll the reading position without clicking any page destination.
      await page.locator('#ecosystem').scrollIntoViewIfNeeded();
      await settled(page);
      const manual = await page.evaluate(() => ({ y:scrollY, focusId:document.activeElement.id, hash:location.hash }));
      assert.ok(Math.abs(manual.y-before.y) > 200, 'The test requires a separate manual reading position');
      assert.equal(manual.hash, '#request', 'Manual scrolling unexpectedly navigated');
      assert.equal(manual.focusId, before.focusId, 'Manual scrolling changed the keyboard focus');
      await page.goBack();
      await until(() => page.url(), url => new URL(url).hash === '#top', 'Back did not reach the preceding page address');
      await settled(page);
      await page.goForward();
      const restored = await until(() => page.evaluate(() => ({ y:scrollY, focusId:document.activeElement.id, hash:location.hash })), x => x.hash === '#request' && Math.abs(x.y-manual.y) <= 1, 'Forward lost the latest manual page position');
      assert.deepEqual(await visibleContext(page), requestBefore, 'Scroll persistence changed the request topic');
      await selected(page, 'period-upcoming');
      await selected(page, 'filter-all');
      return { before, manual, restored, requestContextPreserved:true, filtersPreserved:true };
    },
  },
  {
    name:'request-back-restores-context-before-mutation',
    async run(page) {
      await open(page, '#request?kind=portfolio&interest=' + encodeURIComponent('Кредитные портфели'));
      assert.deepEqual(await visibleContext(page), { hidden:false, text:'Кредитные портфели' });
      const selector = '.p10-footer [aria-labelledby="footer-contact-title"] a[href="#request"]';
      const contact = page.locator(selector);
      await contact.scrollIntoViewIfNeeded();
      const before = await pagePosition(page, selector);
      await contact.click();
      await until(() => visibleContext(page), x => x.hidden, 'Generic contact CTA retained a previous topic');
      await page.goBack();
      await until(() => visibleContext(page), x => !x.hidden && x.text === 'Кредитные портфели', 'Back restored the new topic instead of the preceding topic');
      const restored = await until(() => pagePosition(page, selector), x => x.focused && Math.abs(x.y-before.y) <= 2, 'Back failed to restore the source link and position');
      await page.goForward();
      await until(() => visibleContext(page), x => x.hidden, 'Forward did not restore the generic contact state');
      return { before, restored, forward:await visibleContext(page) };
    },
  },
  {
    name:'buyer-back-forward-restores-previous-filters',
    async run(page) {
      await open(page, '#lots');
      await page.locator('#period-previous').click();
      await page.locator('#filter-receivables').click();
      await selected(page, 'period-previous');
      await selected(page, 'filter-receivables');
      const archiveRows = await page.locator('.p10-auction').count();
      assert.ok(archiveRows > 0);
      await page.locator('[data-capability-new-audience="buyer"]').click();
      const expand = page.locator('[data-capability-new-expand="credit"]');
      await expand.focus();
      await expand.press('Enter');
      const selector = '[data-capability-new-link="credit"]';
      const link = page.locator(selector);
      await link.scrollIntoViewIfNeeded();
      const before = await pagePosition(page, selector);
      await link.click();
      await selected(page, 'period-upcoming');
      await selected(page, 'filter-individuals');
      await page.goBack();
      await selected(page, 'period-previous');
      await selected(page, 'filter-receivables');
      assert.equal(await page.locator('.p10-auction').count(), archiveRows);
      const restored = await until(() => pagePosition(page, selector), x => x.focused && Math.abs(x.y-before.y) <= 2, 'Back did not return to the buying CTA');
      await page.goForward();
      await selected(page, 'period-upcoming');
      await selected(page, 'filter-individuals');
      return { archiveRows, before, restored, forwardHash:new URL(page.url()).hash };
    },
  },
  {
    name:'december-empty-november-retains-source-date',
    time:'2026-12-11T06:30:00Z',
    async run(page) {
      await open(page, '#lots');
      await page.locator('#period-previous').click();
      await selected(page, 'period-previous');
      assert.equal(await page.locator('.p10-auction').count(), 6);
      const dateBefore = await page.locator('[data-schedule-source-date]').textContent();
      await page.locator('#filter-receivables').click();
      await selected(page, 'filter-receivables');
      assert.equal(await page.locator('.p10-auction').count(), 0);
      const dateAfter = await page.locator('[data-schedule-source-date]').textContent();
      const empty = await page.locator('.p10-schedule__empty').textContent();
      assert.equal(dateBefore, '10 ноября 2026');
      assert.equal(dateAfter, dateBefore, 'An empty category changed the source snapshot date');
      assert.match(empty, /срезе нет подходящих лотов/);
      await page.locator('#filter-all').click();
      assert.equal(await page.locator('.p10-auction').count(), 6);
      return { fixedTime:'2026-12-11T06:30:00Z', dateBefore, dateAfter, empty:empty.trim() };
    },
  },
  {
    name:'draft-invalidates-after-consent-phone-and-topic-edits',
    viewport:{ width:390, height:844 },
    async run(page) {
      await open(page, '#request?kind=portfolio&interest=' + encodeURIComponent('Кредитные портфели'));
      await fillRequest(page);
      const first = await draft(page);
      assert.equal(first.recipient, 'sales@debtprice.market');
      assert.match(first.body, /Направление: Кредитные портфели/);
      assert.doesNotMatch(first.body, /Рекламные предложения/);

      await page.locator('[name="Рекламные предложения"]').check();
      assert.equal(await page.locator('#request-status').isVisible(), false, 'Optional consent left an obsolete draft available');
      const withMarketing = await draft(page);
      assert.match(withMarketing.body, /Рекламные предложения: Согласие дано/);
      await page.locator('[name="consent"]').uncheck();
      assert.equal(await page.locator('#request-status').isVisible(), false, 'Withdrawal of required consent left the draft available');
      await page.locator('.p10-consultation__submit').click();
      assert.equal(await page.locator('#request-status').isVisible(), false);
      assert.equal(await page.locator('[name="consent"]').evaluate(el => el.validity.valid), false);
      await page.locator('[name="consent"]').check();

      await page.locator('[name="phone"]').fill('abc1234567890');
      await page.locator('.p10-consultation__submit').click();
      assert.equal(await page.locator('[name="phone"]').evaluate(el => el.validity.valid), false);
      assert.equal(await page.locator('#request-status').isVisible(), false);
      await page.locator('[name="phone"]').fill('+7 (999) 123-45-67');
      const corrected = await draft(page);
      assert.match(corrected.body, /Телефон: \+7 \(999\) 123-45-67/);

      await page.locator('[data-request-reset]').click();
      assert.equal(await page.locator('#request-status').isVisible(), false, 'Reset topic left the previous recipient or subject active');
      assert.equal((await visibleContext(page)).hidden, true);
      const reset = await draft(page);
      assert.equal(reset.recipient, 'v@debtprice.market');
      assert.doesNotMatch(reset.body, /Кредитные портфели/);
      return { firstRecipient:first.recipient, marketingIncluded:true, requiredConsentBlocks:true, malformedPhoneBlocks:true, correctedPhoneAccepted:true, resetRecipient:reset.recipient };
    },
  },
  {
    name:'contextual-hrefs-work-in-new-tabs',
    viewport:{ width:1024, height:900 },
    async run(page, context) {
      await open(page, '#capabilities');
      const sellerHref = await page.locator('[data-capability-new-link="factoring"]').getAttribute('href');
      assert.ok(sellerHref.startsWith('#request?'));
      const sellerPage = await context.newPage();
      await open(sellerPage, sellerHref);
      assert.deepEqual(await visibleContext(sellerPage), { hidden:false, text:'Факторинговые портфели' });
      await sellerPage.close();

      await page.locator('[data-capability-new-audience="buyer"]').click();
      const buyerHref = await page.locator('[data-capability-new-link="receivables"]').getAttribute('href');
      const buyerPage = await context.newPage();
      await open(buyerPage, buyerHref);
      await selected(buyerPage, 'period-upcoming');
      await selected(buyerPage, 'filter-receivables');
      const empty = await buyerPage.locator('.p10-schedule__empty').isVisible();
      assert.equal(empty, true);
      await buyerPage.close();
      return { sellerHref, buyerHref, topic:'Факторинговые портфели', emptyReceivables:true };
    },
  },
  {
    name:'dialog-back-escape-restores-scroll-and-focus',
    async run(page) {
      await open(page, '#materials');
      const selector = '.p10-footer [data-open-documents]';
      const trigger = page.locator(selector);
      await trigger.scrollIntoViewIfNeeded();
      const before = await pagePosition(page, selector);
      await trigger.click();
      await page.locator('#detail-dialog[open]').waitFor();
      await page.goBack();
      await page.locator('#detail-dialog[open]').waitFor({ state:'hidden' });
      const back = await until(() => pagePosition(page, selector), x => x.focused && Math.abs(x.y-before.y) <= 2, 'Dialog Back failed to restore its opener');
      await page.goForward();
      await page.locator('#detail-dialog[open]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('#detail-dialog[open]').waitFor({ state:'hidden' });
      const escape = await until(() => pagePosition(page, selector), x => x.focused && Math.abs(x.y-before.y) <= 2, 'Escape failed to restore its opener');
      assert.ok(!new URL(page.url()).hash.startsWith('#documents'));
      return { before, back, escape };
    },
  },
  {
    name:'nested-search-history-restores-visible-result-focus',
    viewport:{ width:390, height:500 },
    async run(page) {
      await open(page, '#search');
      await page.locator('#detail-dialog[open]').waitFor();
      const result = page.locator('#detail-dialog [data-open-documents]');
      await result.scrollIntoViewIfNeeded();
      await result.focus();
      await settled(page);
      const before = await page.locator('#detail-dialog').evaluate(el => ({ scroll:el.scrollTop, height:el.clientHeight }));
      assert.ok(before.scroll > 20, 'The test requires a scrolled search result list');
      await result.press('Enter');
      await until(() => page.locator('#dialog-title').textContent(), x => x === 'Документы', 'Document result did not open');
      assert.equal(await page.locator('#detail-dialog').evaluate(el => el.scrollTop), 0);
      await page.goBack();
      await until(() => page.locator('#dialog-title').textContent(), x => x === 'Поиск по сайту', 'Back did not return to search');
      const restored = await until(() => page.locator('#detail-dialog').evaluate(el => {
        const focused = document.activeElement;
        const box = focused.getBoundingClientRect();
        const dialogBox = el.getBoundingClientRect();
        return { scroll:el.scrollTop, resultFocused:focused.matches('[data-open-documents]'), focusVisible:box.top >= dialogBox.top && box.bottom <= dialogBox.bottom };
      }), x => Math.abs(x.scroll-before.scroll) <= 2 && x.resultFocused && x.focusVisible, 'Nested Back restored an invisible or different focus target');
      await page.locator('#detail-dialog [data-open-documents]').click();
      await until(() => page.locator('#dialog-title').textContent(), x => x === 'Документы', 'Document result did not reopen');
      await page.locator('.dialog__close').click();
      await page.locator('#detail-dialog[open]').waitFor({ state:'hidden' });
      await page.reload({ waitUntil:'load' });
      await settled(page);
      assert.equal(await page.locator('dialog[open]').count(), 0, 'Closing a direct search chain left a modal address that reopens on reload');
      return { before, restored, closedChainHash:new URL(page.url()).hash, reloadClosed:true };
    },
  },
  {
    name:'modal-forward-retains-user-scroll',
    viewport:{ width:390, height:500 },
    async run(page) {
      await open(page, '#materials');
      await page.locator('.p10-footer [data-open-documents]').click();
      await page.locator('#detail-dialog[open]').waitFor();
      await page.locator('#detail-dialog .home-result').last().scrollIntoViewIfNeeded();
      await settled(page);
      const before = await page.locator('#detail-dialog').evaluate(el => el.scrollTop);
      assert.ok(before > 20, 'The test requires a scrolled document list');
      await page.goBack();
      await page.locator('#detail-dialog[open]').waitFor({ state:'hidden' });
      await page.goForward();
      await page.locator('#detail-dialog[open]').waitFor();
      const restored = await until(() => page.locator('#detail-dialog').evaluate(el => el.scrollTop), x => Math.abs(x-before) <= 2, 'Forward lost the user scroll position inside documents');
      return { before, restored };
    },
  },
  {
    name:'close-search-chain-returns-to-original-page',
    async run(page) {
      await open(page, '#lots');
      const selector = '[data-nav-toggle="search"]';
      const before = await pagePosition(page, selector);
      await page.locator(selector).click();
      await page.locator('#header-search').fill('форматы');
      await page.locator('#header-search').press('Enter');
      await page.locator('#detail-dialog[open]').waitFor();
      await page.locator('#dialog-search').fill('документы');
      await page.locator('#dialog-search').press('Enter');
      await page.locator('#detail-dialog [data-open-documents]').click();
      await until(() => page.locator('#dialog-title').textContent(), x => x === 'Документы', 'Search chain did not reach documents');
      await page.locator('.dialog__close').click();
      await page.locator('#detail-dialog[open]').waitFor({ state:'hidden' });
      const restored = await until(() => pagePosition(page, selector), x => x.focused && Math.abs(x.y-before.y) <= 2 && x.hash === '#lots', 'Closing the chain did not restore its original page, position and opener');
      await page.reload({ waitUntil:'load' });
      await settled(page);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      return { before, restored, reloadClosed:true };
    },
  },
  {
    name:'desktop-search-preserves-native-caret-selection',
    async run(page) {
      await open(page);
      await page.locator('[data-nav-toggle="search"]').click();
      const input = page.locator('#header-search');
      const value = 'долг рынок';
      await input.fill(value);
      await input.press('Home');
      await input.press('Shift+End');
      const selection = await input.evaluate(el => ({ start:el.selectionStart, end:el.selectionEnd, focused:document.activeElement === el, value:el.value }));
      assert.deepEqual(selection, { start:0, end:value.length, focused:true, value });
      await input.press('ArrowLeft');
      const caret = await input.evaluate(el => ({ start:el.selectionStart, end:el.selectionEnd, focused:document.activeElement === el }));
      assert.deepEqual(caret, { start:0, end:0, focused:true });
      assert.equal(await page.locator('[data-nav-toggle="search"]').getAttribute('aria-expanded'), 'true');
      return { selection, caret };
    },
  },
  {
    name:'buy-navigation-settles-interrupted-table-height',
    reducedMotion:'no-preference',
    async run(page) {
      await open(page, '#lots');
      await page.locator('#period-previous').click();
      await page.locator('.header__nav-link[data-lots-category="all"]').click();
      await selected(page, 'period-upcoming');
      await selected(page, 'filter-all');
      const geometry = await page.locator('.p10-schedule__stage').evaluate(el => {
        const stage = el.getBoundingClientRect();
        const content = el.querySelector('#p10-schedule-results').getBoundingClientRect();
        return { stage:stage.height, content:content.height, delta:Math.abs(stage.height-content.height) };
      });
      assert.ok(geometry.delta <= 1, 'Navigation retained the previous animated height: ' + JSON.stringify(geometry));
      return geometry;
    },
  },
];

try {
  for (const browserName of (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',')) {
    const browser = await pw[browserName].launch({ headless:true });
    report.browsers.push({ name:browserName, version:browser.version() });
    try {
      for (const test of cases) {
        if (only && !only.includes(test.name)) continue;
        const item = { browser:browserName, name:test.name, status:'pass' };
        const context = await browser.newContext({ viewport:test.viewport || { width:1440, height:900 }, colorScheme:'light', locale:'ru-RU', timezoneId:'Europe/Moscow', reducedMotion:test.reducedMotion || 'reduce' });
        await context.route('**/*', route => {
          const request = route.request();
          if (!['GET','HEAD'].includes(request.method())) {
            report.networkWrites.push({ browser:browserName, test:test.name, method:request.method(), url:request.url() });
            return route.abort();
          }
          return route.continue();
        });
        context.on('page', opened => {
          opened.setDefaultTimeout(6000);
          opened.on('pageerror', error => report.runtimeErrors.push({ browser:browserName, test:test.name, error:String(error) }));
        });
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date(test.time || '2026-11-11T06:30:00Z'));
        try { item.details = await test.run(page, context); }
        catch (error) {
          item.status = 'fail';
          item.error = String(error.stack || error);
          const name = `${browserName}-FAIL-${test.name}.png`;
          try { await page.screenshot({ path:path.join(out, name), animations:'disabled' }); item.screenshot = name; } catch {}
        } finally { await context.close(); }
        report.checks.push(item);
        await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ browser:browserName, name:test.name, status:item.status, error:item.error?.split('\n')[0] }));
      }
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
report.finishedAt = new Date().toISOString();
report.passed = report.checks.filter(x => x.status === 'pass').length;
report.failed = report.checks.filter(x => x.status === 'fail').length;
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output:out, passed:report.passed, failed:report.failed, runtimeErrors:report.runtimeErrors, networkWrites:report.networkWrites }));
process.exitCode = report.failed || report.runtimeErrors.length || report.networkWrites.length ? 1 : 0;
