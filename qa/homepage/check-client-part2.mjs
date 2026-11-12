import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Additional 11 November corrections. This is an isolated acceptance browser,
// never the owner's profile. A pass still requires visual review of the PNGs.
const require = createRequire(import.meta.url);
const pw = require('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(project, 'dist');
const phase = (process.env.QA_PHASE || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '-');
const requestedOut = process.env.QA_OUT_DIR || process.env.OUT_DIR;
const out = requestedOut ? path.resolve(requestedOut) : path.join(project, 'qa/homepage/results', `client-part2-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const engines = (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',').filter(Boolean);
const widths = (process.env.QA_WIDTHS || '320,390,768,1280,1440').split(',').map(Number);
assert.ok(widths.length && widths.every(width => Number.isInteger(width) && width >= 280), 'Invalid QA_WIDTHS');
const themes = (process.env.QA_THEMES || 'light,dark').split(',');
assert.ok(themes.every(theme => ['light', 'dark'].includes(theme)), 'Invalid QA_THEMES');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function within(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: exceeded ${ms}ms`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}
const normalize = text => text.replace(/\s+/gu, ' ').trim();
await fs.mkdir(out, { recursive: true });
async function manifest(directory, accept, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await manifest(path.join(directory, entry.name), accept, relative));
    else if (accept(relative)) result[relative] = digest(await fs.readFile(path.join(directory, entry.name)));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
const sources = () => manifest(path.join(project, 'src'), name => /\.(ts|css)$/.test(name));
const build = () => manifest(dist, name => name === 'index.html' || /\.(js|css)$/.test(name));
const report = {
  sourceDocument: 'https://docs.google.com/document/d/1hH3xng6E4rAf-Cfeqz9VMI788a7nFbq_0TAJrdfv444/edit?tab=t.0',
  sourceSection: 'Комментарии от 11.11 часть 2, paragraph indexes 1–2199',
  project, output: out, phase, startedAt: new Date().toISOString(),
  scriptSha256: digest(await fs.readFile(fileURLToPath(import.meta.url))),
  source: await sources(), build: await build(), checks: [], screenshots: [], browsers: [],
  runtimeErrors: [], networkWrites: [], assetErrors: [], navigationAttempts: [], popups: [],
  safety: 'Disposable browser contexts; all writes and off-origin requests blocked; no CRM, mail or external handoff.',
  scopeChange: 'Part2 replaces the former search outline, mobile theme placement and fit-content form CTA requirements. The explicit user no-navigation instruction prevails over the client note asking for a live marketplace link.',
  visualReview: 'Review PNGs for typography, imagery, readability and perceived animation quality. Playback on native Safari remains separate from Playwright WebKit.',
};
const save = () => fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
let server;
let base = process.env.QA_BASE_URL || process.env.BASE_URL;
if (!base) {
  server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(dist, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
      if (!(await fs.stat(file)).isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
}
base = new URL(base).href;
report.baseURL = base;
const origin = new URL(base).origin;
const authorizedNavigations = new WeakSet();
const firefoxPrefs = touch => ({ 'ui.primaryPointerCapabilities': touch ? 1 : 6, 'ui.allPointerCapabilities': touch ? 1 : 6 });
async function until(read, accept, message, timeout = 7000) {
  const deadline = Date.now() + timeout;
  let value;
  do { value = await read(); if (accept(value)) return value; await wait(40); } while (Date.now() < deadline);
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}
async function open(page, theme) {
  authorizedNavigations.add(page);
  try {
    const url = new URL(base); url.searchParams.set('theme', theme);
    await page.goto(url.href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await until(() => page.locator('html').getAttribute('data-theme'), x => x === theme, 'Wrong theme');
    await wait(250);
  } finally { authorizedNavigations.delete(page); }
}
async function snapshot(page, name, selector) {
  const file = `${name}.png`;
  await (selector ? page.locator(selector) : page).screenshot({ path: path.join(out, file), animations: 'disabled' });
  const bytes = await fs.readFile(path.join(out, file));
  report.screenshots.push({ file, selector: selector || null, bytes: bytes.length, sha256: digest(bytes) });
  return file;
}
const bounds = locator => locator.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const style = locator => locator.evaluate(el => {
  const s = getComputedStyle(el), child = el.querySelector('svg, img');
  return { background: s.backgroundColor, color: s.color, border: s.borderColor, borderWidth: s.borderWidth, shadow: s.boxShadow, outline: s.outlineStyle, outlineWidth: s.outlineWidth, transform: s.transform, filter: child ? getComputedStyle(child).filter : null, iconColor: child ? getComputedStyle(child).color : null };
});
async function colors(locator) {
  return locator.evaluate(el => {
    const s = getComputedStyle(el), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const rgba = value => { context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    return { background: rgba(s.backgroundColor), color: rgba(s.color) };
  });
}
function luminance(rgb) { return rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); }
function contrast(value) { const a = luminance(value.background), b = luminance(value.color); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
async function hover(page, locator) {
  await locator.scrollIntoViewIfNeeded(); await page.mouse.move(1, 1); await wait(320);
  // Sample the *final* CSS state. On the shared server headless WebKit and
  // Firefox can run with no compositor frames for >400ms under CPU pressure,
  // although :hover is active and the CSS transition has already started.
  // Actual timeline smoothness is separately checked by desktopMotion().
  await locator.evaluate(el => {
    for (const animation of el.getAnimations({ subtree: true })) {
      if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) {
        try { animation.finish(); } catch { /* unfinishable transition */ }
      }
    }
  });
  const before = await style(locator), beforeColors = await colors(locator);
  // Re-target real pointer movement after any layout change. Capture the
  // hover precondition, style and RGBA together after the existing waits.
  let snapshot;
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.mouse.move(1, 1);
    await locator.scrollIntoViewIfNeeded();
    await locator.hover(); await wait(250);
    await wait(180);
    await locator.evaluate(el => {
      for (const animation of el.getAnimations({ subtree: true })) {
        if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) {
          try { animation.finish(); } catch { /* unfinishable transition */ }
        }
      }
    });
    snapshot = await locator.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const s = getComputedStyle(el), child = el.querySelector('svg, img');
      const childStyle = child ? getComputedStyle(child) : null;
      const after = { background: s.backgroundColor, color: s.color, border: s.borderColor, borderWidth: s.borderWidth,
        shadow: s.boxShadow, outline: s.outlineStyle, outlineWidth: s.outlineWidth, transform: s.transform,
        filter: childStyle ? childStyle.filter : null, iconColor: childStyle ? childStyle.color : null };
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      const rgba = value => { context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
      return { after, afterColors: { background: rgba(after.background), color: rgba(after.color) },
        diagnostics: { selfHovered: el.matches(':hover'), hitSelfOrChild: hit === el || (hit !== null && el.contains(hit)),
          parentHovered: el.closest('.p10-ecosystem-card')?.matches(':hover') ?? null,
          fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
          hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).replace(/\s+/g, '.')}` : null,
          location: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } } };
    });
    if (snapshot.diagnostics.selfHovered && snapshot.diagnostics.hitSelfOrChild) {
      return { before, after: snapshot.after, beforeColors, afterColors: snapshot.afterColors, diagnostics: snapshot.diagnostics };
    }
  }
  assert.fail(`Hover did not reach the intended element after 3 attempts: ${JSON.stringify({ before, beforeColors, ...snapshot })}`);
}

async function settleControlTransitions(controls) {
  await controls.evaluateAll(items => items.forEach(el => {
    for (const animation of el.getAnimations({ subtree: true })) {
      if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) {
        try { animation.finish(); } catch { /* Original final-state diagnostics still apply. */ }
      }
    }
  }));
}
async function ecosystemGeometry(page) {
  const buttons = await page.locator('.p10-ecosystem-card__button').evaluateAll(items => items.map(el => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), width: r.width, height: r.height, client: el.clientWidth, content: el.scrollWidth };
  }));
  assert.equal(buttons.length, 6, 'The ecosystem must retain all six CTA controls');
  const media = buttons[0];
  for (const button of buttons) {
    assert.ok(button.width >= 120 && button.height >= 44, `Ecosystem CTA has unusable geometry: ${JSON.stringify(button)}`);
    assert.ok(Math.abs(button.width - media.width) <= 2 && Math.abs(button.height - media.height) <= 2,
      `Ecosystem CTA differs from the Media reference at this viewport: ${JSON.stringify({ media, button })}`);
    assert.ok(button.content <= button.client + 2, `Ecosystem CTA content overflows: ${JSON.stringify(button)}`);
  }
  return buttons;
}
async function ecosystemInteractions(page) {
  const previousScroll = await page.evaluate(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto'; return previous;
  });
  try {
    const cardBodies = [], buttons = page.locator('.p10-ecosystem-card__button');
    for (const card of await page.locator('.p10-ecosystem-card').all()) {
      const controls = card.locator('.p10-ecosystem-card__button');
      await card.locator('h3').scrollIntoViewIfNeeded(); await page.mouse.move(1, 1); await wait(80);
      await settleControlTransitions(controls);
      const before = await Promise.all((await controls.all()).map(style));
      await card.locator('h3').hover(); await wait(80); await settleControlTransitions(controls);
      assert.equal(await controls.evaluateAll(items => items.some(el => el.matches(':hover'))), false, 'Card-body target accidentally hovered a button');
      const after = await Promise.all((await controls.all()).map(style));
      assert.deepEqual(after, before, 'Hovering an ecosystem card changes a button outside the pointer');
      cardBodies.push({ title: normalize(await card.locator('h3').innerText()), before, after });
    }
    const controls = [];
    for (let index = 0; index < await buttons.count(); index++) {
      const control = buttons.nth(index), card = control.locator('..');
      await control.scrollIntoViewIfNeeded(); await page.mouse.move(1, 1); await wait(80); await settleControlTransitions(buttons);
      const siblings = card.locator('.p10-ecosystem-card__button');
      const siblingsBefore = await Promise.all((await siblings.all()).map(style));
      const evidence = await hover(page, control);
      assert.equal(evidence.diagnostics.selfHovered, true, 'Ecosystem hover did not reach the intended button');
      assert.ok(evidence.afterColors.background.slice(0, 3).every(v => v >= 250) && evidence.afterColors.background[3] === 255,
        `Outlined CTA did not become fully white: ${JSON.stringify(evidence)}`);
      assert.ok(luminance(evidence.afterColors.color) < .1 && contrast(evidence.afterColors) >= 7, 'Outlined CTA hover lacks dark, high-contrast text');
      const peers = await siblings.all();
      for (let peer = 0; peer < peers.length; peer++) {
        if (!(await peers[peer].evaluate(el => el.matches(':hover')))) {
          assert.deepEqual(await style(peers[peer]), siblingsBefore[peer], 'Hovering one forum CTA also changes its neighbor');
        }
      }
      await page.mouse.move(1, 1); await page.keyboard.press('Tab'); await control.focus(); await wait(80); await settleControlTransitions(buttons);
      const focus = await style(control), focusColors = await colors(control);
      assert.equal(await control.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true, 'Ecosystem CTA has no keyboard focus state');
      assert.ok(focus.outline !== 'none' && parseFloat(focus.outlineWidth) >= 2, 'Ecosystem keyboard focus has no visible outline');
      assert.ok(contrast(focusColors) >= 7 && luminance(focusColors.color) < .1, 'Ecosystem keyboard focus text lacks contrast');
      const imageIcon = control.locator('img').first();
      if (await imageIcon.count()) {
        assert.match(evidence.after.filter || '', /brightness\(0\)/, 'Hover arrow stays white on white');
        assert.match(focus.filter || '', /brightness\(0\)/, 'Focus arrow stays white on white');
      }
      await control.evaluate(el => el.blur()); await settleControlTransitions(buttons);
      controls.push({ text: normalize(await control.innerText()), hover: evidence, focus, focusColors });
    }
    return { cardBodies, controls };
  } finally { await page.evaluate(previous => { document.documentElement.style.scrollBehavior = previous; }, previousScroll); }
}

function alignArtworkForReview(el) {
  const rail = el.closest('.capability-new__grid'); if (rail) rail.scrollTo({ left: 0, behavior: 'instant' });
  const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
  window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - header - 20, behavior: 'instant' });
}

async function settledArtworkEvidence(target, selector) {
  const read = () => target.evaluate(async root => {
    // Include rendered boxes before viewport filtering, even if an unloaded
    // lazy image currently has zero height. Decode can change its geometry.
    const rendered = [...root.querySelectorAll('img')].map((img, index) => ({ img, index }))
      .filter(({ img }) => img.getClientRects().length > 0);
    const images = await Promise.all(rendered.map(async ({ img, index }) => {
      let decoded = false;
      if (img.complete && img.naturalWidth > 0) { try { await img.decode(); decoded = true; } catch {} }
      return { index, source: img.currentSrc || img.src, loaded: img.complete && img.naturalWidth > 0, decoded };
    }));
    const ancestors = [];
    for (let element = root; element; element = element.parentElement) ancestors.push(element);
    const label = element => element.id || element.className || element.tagName;
    const animations = ancestors.flatMap(element => element.getAnimations()
      .filter(animation => (animation.pending || animation.playState === 'running') &&
        Number.isFinite(animation.effect?.getComputedTiming().endTime))
      .map(animation => ({ target: label(element), playState: animation.playState, pending: animation.pending })));
    const rect = element => { const r = element.getBoundingClientRect(); return { top: r.top, height: r.height, width: r.width }; };
    return {
      pendingReveal: ancestors.filter(element => element.classList.contains('motion-pending')).map(label),
      animations, images,
      geometry: { scrollY, root: rect(root), images: rendered.map(({ img, index }) => ({ index, ...rect(img) })) },
    };
  });
  const ready = value => value.pendingReveal.length === 0 && value.animations.length === 0 &&
    value.images.every(image => image.loaded && image.decoded);
  let readinessPolls = 0;
  const beforeAlignment = await until(async () => { readinessPolls++; return read(); }, ready,
    `Artwork reveal or rendered images did not settle: ${selector}`);
  // The initial scroll used the translated reveal rect. Align again only
  // after natural completion and image decoding, without altering motion.
  await target.evaluate(alignArtworkForReview);
  let previous, stablePolls = 0, geometryPolls = 0;
  const vertical = value => [value.geometry.scrollY, value.geometry.root.top, value.geometry.root.height,
    ...value.geometry.images.flatMap(image => [image.top, image.height])];
  const identity = value => JSON.stringify(value.images.map(image => [image.index, image.source]));
  const settled = await until(async () => { geometryPolls++; return read(); }, value => {
    const positions = vertical(value), previousPositions = previous && vertical(previous);
    const same = previous && identity(previous) === identity(value) && positions.length === previousPositions.length &&
      positions.every((position, index) => Math.abs(position - previousPositions[index]) < .25);
    stablePolls = ready(value) ? (same ? stablePolls + 1 : 1) : 0;
    previous = value;
    return stablePolls >= 2;
  }, `Artwork vertical geometry did not settle: ${selector}`);
  return { readinessPolls, geometryPolls, stablePolls, ready: ready(settled), beforeAlignment, settled };
}

// Inspect only artwork intersecting the viewport after real scrolling. Hidden
// carousel neighbors are deliberately outside this assertion, while an image
// that disappears in the alternate theme must still be present in the result.
async function visibleArtwork(page) {
  const groups = ['.p10-choice--sell', '.p10-choice--buy', '.p10-capabilities .capability-new__card',
    '.p10-format--english', '.p10-offer .offer', '.p10-ecosystem-card--media'];
  const evidence = [];
  for (const selector of groups) {
    const target = page.locator(selector).first();
    await target.evaluate(alignArtworkForReview);
    const settlement = await settledArtworkEvidence(target, selector);
    const images = await until(() => target.evaluate(async root => {
      const visible = [...root.querySelectorAll('img')].map((img, index) => {
        const rect = img.getBoundingClientRect();
        let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
        let top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom), opacity = 1, painted = true;
        for (let ancestor = img; ancestor; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
          painted = painted && s.display !== 'none' && s.visibility !== 'hidden'; opacity *= Number(s.opacity);
          if (/(hidden|clip|scroll|auto)/.test(s.overflowX)) { left = Math.max(left, r.left); right = Math.min(right, r.right); }
          if (/(hidden|clip|scroll|auto)/.test(s.overflowY)) { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
        }
        return { img, index, intersects: right - left > 2 && bottom - top > 2, painted, opacity };
      }).filter(item => item.intersects);
      return Promise.all(visible.map(async ({ img, index, painted, opacity }) => {
        let decoded = false;
        if (img.complete && img.naturalWidth > 0) { try { await img.decode(); decoded = true; } catch {} }
        return { index, source: img.currentSrc || img.src, loaded: img.complete && img.naturalWidth > 0, decoded,
          visible: painted && opacity > .02, opacity, width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height };
      }));
    }), items => items.length > 0 && items.every(item => item.loaded && item.decoded && item.visible),
    `Visible artwork is missing, unloaded or hidden: ${selector}`);
    evidence.push({ selector, images, settlement });
  }
  return evidence;
}

async function isolation(page) {
  const evidence = await page.evaluate(() => ({
    destinations: [...document.querySelectorAll('#app a[href], #app [target], #app [download], #app [formaction], #app [formtarget], #app form[action]')].map(el => el.outerHTML.slice(0, 300)),
    dialogs: document.querySelectorAll('#app dialog').length,
    rootCount: document.querySelectorAll('#hero-title').length,
  }));
  assert.deepEqual(evidence.destinations, [], 'Navigation destinations restored');
  assert.equal(evidence.dialogs, 0, 'Secondary screens/dialogs restored');
  assert.equal(evidence.rootCount, 1, 'Homepage is missing or duplicated');
  const note = page.locator('.p10-source-note');
  assert.match(normalize(await note.innerText()), /^\*\s*Данные на/u, 'Missing footnote asterisk');
  const link = note.locator('a');
  assert.equal(normalize(await link.innerText()), 'на площадке');
  assert.equal(await link.getAttribute('href'), null, 'Footnote re-enabled navigation');
  assert.equal(await link.getAttribute('aria-disabled'), 'true');
  await link.scrollIntoViewIfNeeded();
  const url = page.url();
  await link.click({ force: true }); await wait(100);
  assert.equal(page.url(), url, 'Footnote navigated');
  return evidence;
}
async function formGeometry(page, width) {
  const section = page.locator('.p10-consultation');
  await section.scrollIntoViewIfNeeded(); await wait(150);
  const button = await bounds(section.locator('.p10-consultation__submit'));
  const email = await bounds(section.locator('input[name="email"]'));
  const company = await bounds(section.locator('input[name="company"]'));
  const columns = await section.locator('.p10-consultation__field-row').evaluate(el => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
  const intended = columns === 2 ? email : company;
  assert.ok(Math.abs(button.width - intended.width) <= 2, `Submit width ${button.width} differs from field ${intended.width}`);
  assert.ok(Math.abs(button.x - intended.x) <= 2, 'Submit is not aligned with field');
  const links = await section.locator('.p10-consultation__contact a').evaluateAll(items => items.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
  const contactGap = links[1].y - links[0].bottom;
  if (width <= 699) assert.ok(contactGap <= 12 && contactGap >= -1, `Mobile contact gap is still ${contactGap}px`);
  return { button, email, company, contactGap, columns };
}
async function mobileMenu(page, theme) {
  const outside = await page.locator('.header__top [data-theme-toggle]').evaluateAll(items => items.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
  assert.equal(outside, 0, 'Theme control remains beside mobile menu button');
  const artworkBefore = await visibleArtwork(page);
  await page.locator('[data-mobile-toggle]').click();
  const menu = page.locator('#mobile-menu');
  await until(() => menu.getAttribute('aria-hidden'), x => x === 'false', 'Mobile menu did not open');
  const toggle = menu.locator('[data-theme-toggle]'); assert.equal(await toggle.count(), 1, 'Mobile theme control missing/duplicated');
  await toggle.scrollIntoViewIfNeeded();
  const b = await bounds(toggle); assert.ok(b.width >= 40 && b.height >= 40, 'Theme touch target is too small');
  const url = page.url(); await toggle.click();
  await until(() => page.locator('html').getAttribute('data-theme'), x => x !== theme, 'Mobile theme did not change');
  await page.locator('[data-mobile-toggle]').click();
  await until(() => menu.getAttribute('aria-hidden'), x => x === 'true', 'Mobile menu did not close for artwork review');
  const artworkAfter = await visibleArtwork(page);
  for (let index = 0; index < artworkBefore.length; index++) {
    assert.deepEqual(artworkAfter[index].images.map(item => item.index), artworkBefore[index].images.map(item => item.index),
      `Switching the mobile theme hides previously visible artwork: ${artworkBefore[index].selector}`);
  }
  await page.locator('[data-mobile-toggle]').click();
  await until(() => menu.getAttribute('aria-hidden'), x => x === 'false', 'Mobile menu did not reopen');
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await until(() => page.locator('html').getAttribute('data-theme'), x => x === theme, 'Mobile theme did not restore');
  assert.equal(page.url(), url, 'Theme changed page address');
  await page.locator('[data-mobile-toggle]').click();
  return { outsideHeaderThemeControls: outside, themeTarget: b, artworkBefore, artworkAfter };
}
async function mobileLayout(page) {
  await page.locator('.p10-hero').scrollIntoViewIfNeeded();
  const actions = await bounds(page.locator('.p10-hero .hero__actions'));
  const buttons = await page.locator('.p10-hero .hero__actions .button').evaluateAll(items => items.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, text: el.textContent.trim() }; }));
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.ok(button.width <= actions.width * .86 + 2 && button.height >= 44, `Mobile hero CTA not reduced: ${JSON.stringify({ button, actions })}`);
  const offer = await bounds(page.locator('.p10-offer .offer'));
  const content = await bounds(page.locator('.p10-offer .offer__content'));
  assert.ok(offer.height <= 480, `Mobile offer remains ${offer.height}px tall`);
  assert.ok(offer.bottom - content.bottom <= 100, 'Mobile offer retains excessive bottom whitespace');
  const arrows = await page.locator('.p10-process-step__arrow').evaluateAll(items => items.map(el => ({ transform: getComputedStyle(el).transform, src: el.getAttribute('src'), width: el.getBoundingClientRect().width })));
  assert.equal(arrows.length, 3);
  for (const arrow of arrows) {
    const values = arrow.transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number);
    assert.ok(values && Math.abs(values[0]) < .02 && values[1] > .98, `Process arrow is not rotated down: ${JSON.stringify(arrow)}`);
  }
  return { actions, buttons, offer, content, arrows };
}
async function desktopHeader(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('[data-nav-toggle="ecosystem"]').click();
  const dolg = page.locator('#nav-panel-ecosystem .nav-panel__link').filter({ has: page.locator('strong', { hasText: /^DOLG TALK$/ }) });
  assert.equal(normalize(await dolg.locator('small').innerText()), 'Технологии и встречи');
  await page.keyboard.press('Escape');
  await page.locator('[data-nav-toggle="search"]').click();
  const input = page.locator('#header-search');
  const form = input.locator('..');
  await input.click();
  const mouseStyle = await style(form);
  assert.equal(parseFloat(mouseStyle.borderWidth), 0, 'Search retains a gray exterior border');
  assert.ok(mouseStyle.outline === 'none' || parseFloat(mouseStyle.outlineWidth) === 0, 'Search has an external outline');
  assert.ok(mouseStyle.shadow === 'none' || mouseStyle.shadow.includes('inset'), 'Search retains an external shadow/ring');
  await page.keyboard.press('Escape');
  const trigger = page.locator('[data-nav-toggle="search"]');
  await trigger.focus(); await page.keyboard.press('Enter');
  // Use real keyboard focus. It may be moved into the field by the menu mount.
  for (let i = 0; i < 4 && !(await input.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  assert.equal(await input.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true, 'Search cannot be focused visibly by keyboard');
  const keyboardStyle = await style(form);
  const inputStyle = await style(input);
  assert.ok(keyboardStyle.outline === 'none' || parseFloat(keyboardStyle.outlineWidth) === 0, 'Keyboard focus restores the removed exterior ring');
  assert.ok(keyboardStyle.border !== mouseStyle.border || keyboardStyle.background !== mouseStyle.background || keyboardStyle.shadow.includes('inset') || (inputStyle.outline !== 'none' && parseFloat(inputStyle.outlineWidth) > 0) || inputStyle.shadow !== 'none', 'Search has no visible replacement keyboard focus treatment');
  await page.keyboard.press('Escape');
  return { dolgLabel: 'Технологии и встречи', mouseStyle, keyboardStyle, inputStyle };
}
async function desktopVisualStates(page) {
  // Synthetic scrollIntoViewIfNeeded + the site's smooth document scrolling
  // can leave the pointer over the old coordinates. Disable smooth scrolling
  // only inside the hover-state acceptance check, then restore the real page.
  const priorScroll = await page.evaluate(() => {
    const html = document.documentElement, previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    return previous;
  });
  try {
  const th = page.locator('.p10-auctions-table thead th').filter({ hasText: /^Статус$/ });
  assert.equal(await th.evaluate(el => getComputedStyle(el).textAlign), 'center', 'Status heading is not centered');
  const status = await hover(page, page.locator('.p10-status').first());
  assert.notEqual(status.after.background, status.before.background, `Status badge itself has no hover fill; ${JSON.stringify(status)}`);
  assert.ok(contrast(status.afterColors) >= 4.5, 'Status hover text lacks contrast');
  const whites = [];
  for (const selector of ['.p10-ecosystem-card--media .p10-ecosystem-card__button', '.p10-ecosystem-card--forums .p10-ecosystem-card__button']) {
    const control = page.locator(selector).first();
    const evidence = await hover(page, control);
    assert.ok(evidence.afterColors.background.slice(0, 3).every(value => value >= 250) && evidence.afterColors.background[3] === 255, `Outlined button did not fill white: ${selector}; ${JSON.stringify(evidence)}`);
    assert.ok(luminance(evidence.afterColors.color) < .1, `Outlined hover text is not dark: ${selector}`);
    assert.ok(contrast(evidence.afterColors) >= 7, `Outlined hover lacks strong contrast: ${selector}`);
    const icon = control.locator('svg, img').first();
    const iconType = await icon.evaluate(el => el.tagName.toLowerCase());
    if (iconType === 'img') assert.match(evidence.after.filter || '', /brightness\(0\)/, 'White arrow image did not switch to dark');
    whites.push({ selector, ...evidence });
  }
  const colorButton = await hover(page, page.locator('.p10-consultation__submit'));
  assert.notEqual(colorButton.after.background, colorButton.before.background, 'Colored CTA has no hover fill');
  assert.ok(contrast(colorButton.afterColors) >= Math.max(4.5, contrast(colorButton.beforeColors)), 'Colored CTA becomes lower contrast on hover');
  const footer = [];
  for (const control of await page.locator('.p10-footer__contacts > a, .p10-footer__social-icon').all()) {
    const evidence = await hover(page, control), rgb = evidence.afterColors.color;
    assert.notEqual(evidence.after.color, evidence.before.color, `Footer contact/icon lacks hover color; ${JSON.stringify(evidence)}`);
    assert.ok(rgb[1] > rgb[0] + 15 && rgb[1] >= rgb[2] - 20, `Footer hover is not green/teal: ${rgb}`);
    footer.push({ text: normalize(await control.innerText()) || await control.getAttribute('aria-label'), ...evidence });
  }
  return { status, whites, colorButton, footer };
  } finally {
    await page.evaluate(previous => { document.documentElement.style.scrollBehavior = previous; }, priorScroll);
  }
}
async function desktopMotion(page) {
  const grid = page.locator('.capability-new__grid'); await grid.scrollIntoViewIfNeeded(); await wait(100);
  await page.mouse.move(1, 1);
  const initialColumns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
  const current = await grid.getAttribute('data-capability-new-active');
  const targets = page.locator('[data-capability-new-card]');
  let target;
  for (const candidate of await targets.all()) if (await candidate.getAttribute('data-capability-new-card') !== current) { target = candidate; break; }
  assert.ok(target, 'No alternate capability card');
  const id = await target.getAttribute('data-capability-new-card'), rect = await bounds(target);
  await page.evaluate(id => {
    const grid = document.querySelector('.capability-new__grid');
    window.__part2Hover = { start: null, changed: null, frames: [] };
    grid.addEventListener('pointermove', () => { window.__part2Hover.start ??= performance.now(); }, { capture: true, once: true });
    const observer = new MutationObserver(() => {
      if (grid.dataset.capabilityNewActive === id && window.__part2Hover.changed === null) window.__part2Hover.changed = performance.now();
    });
    observer.observe(grid, { attributes: true, attributeFilter: ['data-capability-new-active'] });
    const started = performance.now();
    const collect = () => {
      const computed = getComputedStyle(grid);
      window.__part2Hover.frames.push({ t: performance.now(), columns: computed.gridTemplateColumns,
        transition: computed.transition, animations: grid.getAnimations().map(animation => ({
          kind: animation.constructor?.name, property: animation.transitionProperty ?? null,
          state: animation.playState, currentTime: animation.currentTime,
          duration: animation.effect?.getTiming()?.duration ?? null,
        })) });
      if (performance.now() - started < 700) requestAnimationFrame(collect); else observer.disconnect();
    };
    requestAnimationFrame(collect);
  }, id);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + Math.min(90, rect.height / 2));
  await wait(750);
  const evidence = await page.evaluate(() => window.__part2Hover);
  assert.ok(evidence.changed !== null && evidence.start !== null && evidence.changed - evidence.start < 50, `Card has delayed hover activation: ${JSON.stringify(evidence)}`);
  const unique = new Set(evidence.frames.map(frame => frame.columns));
  const finalColumns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
  // A heavily loaded headless WebKit process may deliver only one rAF in
  // 700ms, and even a later computed style may remain frozen at that frame.
  // A changed grid with an actively running mid-timeline CSSTransition proves
  // interpolation; its frame rate must be visually reviewed on an idle device.
  const midFrame = evidence.frames.some(frame => frame.columns !== initialColumns &&
    frame.animations.some(animation => animation.property === 'grid-template-columns' && animation.state === 'running' &&
      animation.currentTime > 0 && animation.currentTime < animation.duration));
  assert.ok(unique.size >= 3 || midFrame, `Card expansion has no intermediate animation frames: ${JSON.stringify({ initialColumns, finalColumns, ...evidence })}`);
  assert.equal(await grid.getAttribute('data-capability-new-active'), id, 'Stationary pointer triggers neighbor/card thrashing');
  await wait(700);
  assert.equal(await grid.getAttribute('data-capability-new-active'), id, 'Expanded card unstable with stationary pointer');
  return { id, activationMs: evidence.changed - evidence.start, intermediateLayouts: unique.size,
    midFrame, visibleFrameCount: evidence.frames.length, frames: evidence.frames };
}
async function mobileMotion(page) {
  const grid = page.locator('.capability-new__grid'); await grid.scrollIntoViewIfNeeded();
  await wait(1800);
  const start = await grid.evaluate(el => el.scrollLeft); await wait(1200);
  const moved = await grid.evaluate(el => el.scrollLeft);
  assert.ok(moved > start + 2 && moved - start < 140, `No gentle right-to-left card drift: ${start} -> ${moved}`);
  // Change the preference while motion is actually running, before another
  // interaction could pause it and give a false reduced-motion pass.
  await page.emulateMedia({ reducedMotion: 'reduce' }); await wait(200);
  const reducedStart = await grid.evaluate(el => el.scrollLeft); await wait(700);
  const reducedEnd = await grid.evaluate(el => el.scrollLeft);
  assert.ok(Math.abs(reducedEnd - reducedStart) <= 1, 'Reduced-motion preference does not stop autoplay');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await until(() => grid.getAttribute('data-capability-autoscroll'), value => value === 'running', 'Autoplay did not resume after reduced-motion preference was removed');
  // Test a genuine touch on mobile. Firefox's touch pointer capabilities
  // discard page.mouse events, which cannot prove whether touch pauses motion.
  const rect = await bounds(grid);
  await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + 80);
  const pausedStart = await grid.evaluate(el => el.scrollLeft); await wait(600);
  const pausedEnd = await grid.evaluate(el => el.scrollLeft);
  assert.ok(Math.abs(pausedEnd - pausedStart) <= 1, 'Card drift fights active pointer interaction');
  await grid.focus();
  const manualStart = await grid.evaluate(el => el.scrollLeft);
  await page.keyboard.press('ArrowRight');
  const manualEnd = await until(() => grid.evaluate(el => el.scrollLeft), value => value > manualStart + 2, 'Native manual keyboard scrolling does not move the carousel');
  return { start, moved, distance: moved - start, pausedStart, pausedEnd, reducedStart, reducedEnd, manualStart, manualEnd };
}

try {
  for (const engine of engines) {
    assert.ok(pw[engine], `Unknown browser ${engine}`);
    const browsers = new Map();
    try {
      for (const width of widths) for (const theme of themes) {
        const touch = width < 1200, inputKey = engine === 'firefox' && touch ? 'touch' : 'mouse';
        if (!browsers.has(inputKey)) {
          const browser = await pw[engine].launch({ headless: true, ...(engine === 'firefox' ? { firefoxUserPrefs: firefoxPrefs(touch) } : {}) });
          browsers.set(inputKey, browser); report.browsers.push({ name: engine, input: inputKey, version: browser.version() });
        }
        const name = `${engine}-${width}-${theme}`;
        const item = { name, browser: engine, width, theme, status: 'pass', startedAt: new Date().toISOString(), details: {} };
        let context;
        const recordBrowserFailure = async (error) => {
          item.status = 'fail';
          item.error = `Browser lifecycle failed: ${String(error.stack || error)}`;
          item.finishedAt = new Date().toISOString(); report.checks.push(item); await save();
          console.log(JSON.stringify({ name, status: item.status, error: item.error.split('\n')[0] }));
          // A dead browser must not poison the next variant of this input profile.
          const broken = browsers.get(inputKey);
          browsers.delete(inputKey);
          if (context) await Promise.race([context.close().catch(() => {}), wait(2000)]);
          if (broken) await Promise.race([broken.close().catch(() => {}), wait(2000)]);
        };
        try {
          context = await within(browsers.get(inputKey).newContext({ viewport: { width, height: width >= 1200 ? 1000 : 844 }, colorScheme: theme, locale: 'ru-RU', timezoneId: 'Europe/Moscow', reducedMotion: 'no-preference', hasTouch: touch, ...(engine !== 'firefox' ? { isMobile: touch } : {}) }), 30000, `${name}: newContext`);
        } catch (error) { await recordBrowserFailure(error); continue; }
        let primary;
        await context.route('**/*', route => {
          const req = route.request();
          if (!['GET', 'HEAD'].includes(req.method())) { report.networkWrites.push({ name, method: req.method(), url: req.url() }); return route.abort(); }
          if (new URL(req.url()).origin !== origin && !req.url().startsWith('data:')) {
            if (req.isNavigationRequest()) report.navigationAttempts.push({ name, url: req.url() });
            return route.abort();
          }
          return route.continue();
        });
        context.on('page', page => {
          if (primary) report.popups.push({ name, url: page.url() }); else primary = page;
          page.setDefaultTimeout(7000);
          page.on('pageerror', error => report.runtimeErrors.push({ name, error: String(error) }));
          page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(origin) && !response.url().endsWith('/favicon.ico')) report.assetErrors.push({ name, url: response.url(), status: response.status() }); });
          page.on('framenavigated', frame => { if (frame === page.mainFrame() && frame.url() !== 'about:blank' && !authorizedNavigations.has(page)) report.navigationAttempts.push({ name, type: 'main-frame', url: frame.url() }); });
          page.on('download', download => report.navigationAttempts.push({ name, type: 'download', url: download.url() }));
          page.on('dialog', dialog => { report.runtimeErrors.push({ name, error: `Unexpected dialog: ${dialog.message()}` }); void dialog.dismiss(); });
        });
        // Leave native timers/rAF intact for true animation and auto-scroll verification.
        // Playwright setFixedTime also patches timers, contrary to its apparent name.
        let page;
        try { page = await within(context.newPage(), 30000, `${name}: newPage`); }
        catch (error) { await recordBrowserFailure(error); continue; }
        try {
          await open(page, theme);
          const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
          assert.ok(Math.max(overflow.document, overflow.body) <= width + 1, `Horizontal overflow: ${JSON.stringify(overflow)}`);
          item.details.overflow = overflow;
          item.details.isolation = await isolation(page);
          item.details.form = await formGeometry(page, width);
          item.details.ecosystemGeometry = await ecosystemGeometry(page);
          if (touch) item.details.mobileMenu = await mobileMenu(page, theme);
          if (width <= 699) item.details.mobileLayout = await mobileLayout(page);
          if (width === 390) item.details.mobileMotion = await mobileMotion(page);
          if (width >= 1280) {
            item.details.ecosystemInteractions = await ecosystemInteractions(page);
            item.details.header = await desktopHeader(page);
            if (width === 1440) {
              item.details.visualStates = await desktopVisualStates(page);
              item.details.motion = await desktopMotion(page);
            }
          }
          if (engine === 'chromium') {
            await page.locator('.p10-consultation').scrollIntoViewIfNeeded();
            item.screenshot = await snapshot(page, name + '-consultation', '.p10-consultation');
            if (width === 390 || width === 1440) {
              await page.locator('.capability-new__grid').scrollIntoViewIfNeeded();
              await snapshot(page, name + '-capabilities', '.p10-capabilities');
            }
          }
          await isolation(page);
        } catch (error) {
          item.status = 'fail'; item.error = String(error.stack || error);
          try { item.screenshot = await snapshot(page, name + '-FAIL'); } catch { /* Original error remains authoritative. */ }
        } finally { await context.close(); }
        item.finishedAt = new Date().toISOString(); report.checks.push(item); await save();
        console.log(JSON.stringify({ name, status: item.status, error: item.error?.split('\n')[0] }));
      }
    } finally { for (const browser of browsers.values()) await browser.close(); }
  }
} finally { if (server) await new Promise(resolve => server.close(resolve)); }
report.sourceUnchanged = JSON.stringify(report.source) === JSON.stringify(await sources());
report.buildUnchanged = JSON.stringify(report.build) === JSON.stringify(await build());
report.passed = report.checks.filter(check => check.status === 'pass').length;
report.failed = report.checks.filter(check => check.status === 'fail').length;
report.finishedAt = new Date().toISOString();
report.status = report.checks.length && !report.failed && !report.runtimeErrors.length && !report.networkWrites.length && !report.assetErrors.length && !report.navigationAttempts.length && !report.popups.length && report.sourceUnchanged && report.buildUnchanged ? 'pass' : 'fail';
await save();
console.log(JSON.stringify({ status: report.status, passed: report.passed, failed: report.failed, output: out, sourceUnchanged: report.sourceUnchanged, buildUnchanged: report.buildUnchanged, runtimeErrors: report.runtimeErrors, networkWrites: report.networkWrites, assetErrors: report.assetErrors, navigationAttempts: report.navigationAttempts, popups: report.popups }));
process.exitCode = report.status === 'pass' ? 0 : 1;
