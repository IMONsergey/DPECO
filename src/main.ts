import './styles.css';
import { mountCapabilities } from './components/capabilities';
import { archivedLots, lots } from './data/lots';
import { initDotField, initGlobe } from './effects';
import { mountRequestForms } from './forms';
import { renderDocumentsDialog, renderSearchDialog } from './home-overlays';
import { mountTabs } from './interactions';
import { mountNavigation } from './navigation';
import { renderPage } from './page';
import { mountPageMotion } from './page-motion';
import { mountHomeAuctions } from './page10';
import { mountPage10Sections } from './page10-sections';
import { homeDestination, homeHash, type HomeDestination, type RequestKind } from './routes';
import { mountTheme } from './theme';
import { accountUrl, escapeHtml, icon, registerUrl, rubles } from './ui';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Page root is missing.');
const app: HTMLElement = root;
app.innerHTML = renderPage();
document.title = 'DEBTPRICE — платформа долговых активов';

const abort = new AbortController();
const { signal } = abort;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const nav = mountNavigation(app, '');
const cleanups = [nav.destroy, mountTheme(app), mountHomeAuctions(app), mountPage10Sections(app), mountCapabilities(app), mountTabs(app)];
const dialog = app.querySelector<HTMLDialogElement>('#detail-dialog')!;
const formatDialog = app.querySelector<HTMLDialogElement>('#p10-format-dialog')!;
const dialogContent = app.querySelector<HTMLElement>('#dialog-content')!;
const toast = app.querySelector<HTMLElement>('#toast')!;
let closeTimeout = 0;
let toastTimeout = 0;
let navigationFrame = 0;
let pageScrollFrame = 0;
let renderedPageHash = location.hash;
let overlayFrame = 0;
let renderingOverlay = false;
let renderedOverlayHash = '';
let positionFlushTimeout = 0;
let formatAnimation: Animation | null = null;
let restoreHistory = false;
let focusSequence = 0;
let closingOverlayStack: { baseHash: string; focus?: string } | null = null;
let appliedHistoryEntry: { url: string; key?: string } | null = null;
const previousScrollRestoration = history.scrollRestoration;
history.scrollRestoration = 'manual';

interface HomeView {
  entryKey?: string;
  y: number;
  focus?: string;
  kind?: RequestKind;
  interest?: string;
  category?: HomeDestination['category'];
  period?: HomeDestination['period'];
  overlay?: { destination: HomeDestination; depth: number; baseHash: string; scroll: number; focusIndex?: number };
}

interface ViewPosition {
  y: number;
  overlay?: { hash: string; scroll: number; focusIndex?: number };
}
const positions = new Map<string, ViewPosition>();

function savedView(): HomeView | undefined {
  const view = history.state?.dpecoHome as HomeView | undefined;
  const position = view?.entryKey ? positions.get(view.entryKey) : undefined;
  if (!view || !position) return view;
  return { ...view, y: position.y, ...(view.overlay && position.overlay?.hash === homeHash(view.overlay.destination)
    ? { overlay: { ...view.overlay, scroll: position.overlay.scroll, focusIndex: position.overlay.focusIndex } } : {}) };
}

function cachePosition(view: HomeView): void {
  if (!view.entryKey) return;
  positions.set(view.entryKey, { y: view.y, ...(view.overlay ? { overlay: {
    hash: homeHash(view.overlay.destination), scroll: view.overlay.scroll, focusIndex: view.overlay.focusIndex,
  } } : {}) });
}

function writeView(view: HomeView, hash?: string, push = false): void {
  window.clearTimeout(positionFlushTimeout);
  positionFlushTimeout = 0;
  const next = { ...view, entryKey: push ? crypto.randomUUID() : view.entryKey ?? crypto.randomUUID() };
  cachePosition(next);
  if (push) history.pushState({ dpecoHome: next }, '', hash);
  else history.replaceState({ ...history.state, dpecoHome: next }, '', hash);
}

function schedulePositionFlush(): void {
  window.clearTimeout(positionFlushTimeout);
  const entryKey = savedView()?.entryKey;
  positionFlushTimeout = window.setTimeout(() => {
    positionFlushTimeout = 0;
    const view = savedView();
    if (view && view.entryKey === entryKey && !navigationFrame) writeView(view);
  }, 150);
}

const isOverlay = (destination: HomeDestination) => Boolean(destination.documents || destination.lot || destination.format || destination.search !== undefined);

function focusKey(source?: Element | null): string | undefined {
  let active = source?.closest<HTMLElement>('a, button, input, textarea, select, [tabindex]')
    ?? (source instanceof HTMLElement ? source : document.activeElement instanceof HTMLElement ? document.activeElement : null);
  if (active?.closest('dialog')) return savedView()?.focus;
  active = active?.closest('.nav-dropdown')?.querySelector<HTMLElement>('[data-nav-toggle]')
    ?? (active?.closest('#mobile-menu') ? app.querySelector<HTMLElement>('[data-mobile-toggle]') : active);
  if (!active || !app.contains(active)) return undefined;
  active.dataset.homeFocus ||= String(++focusSequence);
  return active.dataset.homeFocus;
}

function captureView(source?: Element | null): HomeView {
  const form = app.querySelector<HTMLFormElement>('[data-request-form]');
  const schedule = app.querySelector<HTMLElement>('#p10-schedule-results');
  const overlay = savedView()?.overlay;
  const modal = formatDialog.open ? formatDialog : dialog;
  const active = source?.closest('a, button, input, textarea, select, [tabindex]') ?? document.activeElement;
  const focusIndex = [...modal.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].indexOf(active as Element);
  return {
    entryKey: savedView()?.entryKey,
    y: window.scrollY, focus: focusKey(source),
    kind: form?.dataset.kind as RequestKind, interest: form?.querySelector<HTMLInputElement>('[name="interest"]')?.value,
    category: schedule?.dataset.scheduleCategory as HomeDestination['category'],
    period: schedule?.dataset.schedulePeriod as HomeDestination['period'],
    ...(overlay && isOverlay(homeDestination(location.hash)) ? { overlay: { ...overlay, scroll: modal.scrollTop, focusIndex: focusIndex >= 0 ? focusIndex : undefined } } : {}),
  };
}

function rememberView(source?: Element | null): void {
  writeView(captureView(source));
}

function rememberPagePosition(): void {
  if (pageScrollFrame) return;
  pageScrollFrame = requestAnimationFrame(() => {
    pageScrollFrame = 0;
    const view = savedView();
    // A popstate changes history.state before its deferred render. Never write
    // the outgoing scroll coordinate into the incoming entry during that gap.
    if (!view || navigationFrame || dialog.open || formatDialog.open || view.overlay || location.hash !== renderedPageHash) return;
    cachePosition({ ...view, y: window.scrollY });
    schedulePositionFlush();
  });
}

function syncScrollLock(): void {
  document.body.classList.toggle('has-dialog', dialog.open || formatDialog.open);
  document.documentElement.classList.toggle('p10-modal-open', formatDialog.open);
}

function closeForNavigation(): void {
  window.clearTimeout(closeTimeout);
  dialog.classList.remove('is-closing');
  cancelAnimationFrame(overlayFrame);
  overlayFrame = 0;
  renderedOverlayHash = '';
  if (dialog.open) dialog.close();
  if (formatDialog.open) formatDialog.close();
  syncScrollLock();
}

function notify(text: string): void {
  window.clearTimeout(toastTimeout);
  toast.textContent = text;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
}
cleanups.push(mountRequestForms(app, notify));

function selectRequest(kind: string | undefined, interestLabel?: string): void {
  const labels: Record<RequestKind, string> = {
    general: '', portfolio: 'Продажа розничного портфеля',
    receivables: 'Продажа дебиторской задолженности', buyer: 'Подбор долгового актива',
  };
  const selected: RequestKind = kind === 'portfolio' || kind === 'receivables' || kind === 'buyer' ? kind : 'general';
  const form = app.querySelector<HTMLFormElement>('[data-request-form]');
  if (!form) return;
  const context = form.querySelector<HTMLElement>('[data-request-context]');
  const text = context?.querySelector('[data-request-context-label]');
  const interest = form.querySelector<HTMLInputElement>('input[name="interest"]');
  const label = interestLabel || labels[selected];
  const changed = form.dataset.kind !== selected || interest?.value !== label;
  form.dataset.kind = selected;
  if (context) context.hidden = !label;
  if (text) text.textContent = label;
  if (interest) interest.value = label;
  if (changed) form.dispatchEvent(new Event('input', { bubbles: true }));
}

function selectSchedule(destination: Pick<HomeDestination, 'category' | 'period'>): void {
  if (!destination.category && !destination.period) return;
  const current = app.querySelector<HTMLElement>('#p10-schedule-results');
  const detail = {
    category: destination.category ?? current?.dataset.scheduleCategory ?? 'all',
    period: destination.period ?? current?.dataset.schedulePeriod ?? 'upcoming',
  };
  // Keep existing lot controls (and their focus identity) when no filter changed.
  if (detail.category === current?.dataset.scheduleCategory && detail.period === current?.dataset.schedulePeriod) return;
  app.dispatchEvent(new CustomEvent('debtprice:schedule-select', { detail }));
}

function applyIntent(destination: HomeDestination): void {
  if (destination.section === 'request' || destination.kind) selectRequest(destination.kind ?? 'general', destination.interest);
  selectSchedule(destination);
}

function scrollToId(id: string, updateUrl = true, animate = true, destination: HomeDestination = { section: id }, source?: Element | null): void {
  const element = document.getElementById(id);
  if (!element) return;
  // Save the old form/filter state before applying the clicked destination.
  if (updateUrl) rememberView(source);
  nav.close();
  closeForNavigation();
  if (updateUrl) applyIntent(destination);
  const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
  const top = id === 'top' || id === 'main' ? 0 : Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);
  if (updateUrl) {
    const view = captureView();
    view.y = top;
    delete view.focus;
    delete view.overlay;
    const hash = homeHash({ ...destination, section: id });
    writeView(view, hash, location.hash !== hash);
  }
  renderedPageHash = location.hash;
  const heading = element.matches('main') ? element : element.querySelector<HTMLElement>('h1, h2');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  window.scrollTo({ top, behavior: motion.matches || !animate ? 'instant' : 'smooth' });
}

function showDialog(content: string, view: string): void {
  window.clearTimeout(closeTimeout);
  dialog.classList.remove('is-closing');
  if (formatDialog.open) formatDialog.close();
  nav.close();
  dialogContent.innerHTML = content;
  dialog.dataset.view = view;
  if (!dialog.open) dialog.showModal();
  syncScrollLock();
  const focus = view === 'search' ? dialog.querySelector<HTMLInputElement>('#dialog-search') : dialog.querySelector<HTMLButtonElement>('.dialog__close');
  focus?.focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

function closeDialog(): void {
  if ((!dialog.open && !formatDialog.open) || dialog.classList.contains('is-closing') || closingOverlayStack) return;
  const finish = () => {
    const saved = savedView();
    if (saved?.overlay?.depth) {
      closingOverlayStack = { baseHash: saved.overlay.baseHash, focus: saved.focus };
      history.go(-saved.overlay.depth);
    } else {
      const hash = saved?.overlay?.baseHash || '#top';
      const view = { ...captureView(), focus: saved?.focus };
      delete view.overlay;
      writeView(view, hash);
      scheduleHash(true);
    }
  };
  if (motion.matches || !dialog.open) { finish(); return; }
  dialog.classList.add('is-closing');
  closeTimeout = window.setTimeout(finish, 200);
}

function openLot(id: string): void {
  const lot = [...lots, ...archivedLots].find(item => item.id === id);
  if (!lot) {
    showDialog(`<h2 id="dialog-title">Лот не найден</h2><p class="dialog__text">В сохраненном расписании нет этого лота. Проверьте ссылку или посмотрите предложения на площадке.</p><div class="dialog__actions"><a class="button button--primary" href="${accountUrl}">Перейти к торгам ${icon('arrow-right')}</a></div>`, 'lot');
    return;
  }
  showDialog(`<h2 id="dialog-title">${escapeHtml(lot.name)}</h2>
    <dl class="dialog__details"><div><dt>Вид актива</dt><dd>${lot.category === 'receivables' ? 'Дебиторская задолженность' : 'Портфель физических лиц'}</dd></div><div><dt>Количество кейсов</dt><dd>${lot.cases.toLocaleString('ru-RU')}</dd></div><div><dt>${escapeHtml(lot.statusLabel)}</dt><dd>${escapeHtml(lot.status)}</dd></div><div><dt>${escapeHtml(lot.dateLabel)}</dt><dd>${escapeHtml(lot.date)}${lot.startsAt ? ' МСК' : ''}</dd></div>${lot.startingPrice ? `<div><dt>Начальная цена</dt><dd>${rubles(lot.startingPrice)}</dd></div>` : ''}</dl>
    <p class="dialog__amount"><small>Общая сумма задолженности</small>${rubles(lot.debt)}</p>
    <p class="dialog__text">Данные на ${lots.includes(lot) ? '10 ноября' : '29 октября'} 2026. Текущий статус, документы и условия участия доступны в личном кабинете DEBTPRICE.</p>
    <div class="dialog__actions"><a class="button button--primary" href="${accountUrl}">Перейти к торгам ${icon('login')}</a><a class="button button--dark" href="${registerUrl}">Регистрация ${icon('arrow-right')}</a></div>`, 'lot');
}

function selectFormat(id: string): void {
  const nextPanel = app.querySelector<HTMLElement>(`#format-pane-${CSS.escape(id)}`);
  if (!nextPanel || nextPanel.classList.contains('is-active')) return;
  formatAnimation?.cancel();
  app.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(tab => {
    const active = tab.dataset.format === id;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  app.querySelectorAll<HTMLElement>('.format-pane').forEach(panel => {
    const active = panel === nextPanel;
    panel.classList.toggle('is-active', active);
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
  if (!motion.matches) formatAnimation = nextPanel.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
}

function renderOverlay(destination: HomeDestination, scroll = 0, focusIndex?: number): void {
  cancelAnimationFrame(overlayFrame);
  overlayFrame = 0;
  renderingOverlay = true;
  window.clearTimeout(closeTimeout);
  dialog.classList.remove('is-closing');
  nav.close();
  if (destination.documents) showDialog(renderDocumentsDialog(), 'documents');
  else if (destination.lot) openLot(destination.lot);
  else if (destination.search !== undefined) showDialog(renderSearchDialog(destination.search), 'search');
  else if (destination.format) {
    if (dialog.open) dialog.close();
    if (!formatDialog.open) formatDialog.showModal();
    selectFormat(destination.format);
    formatDialog.querySelector('.formats__layout')?.classList.add('is-revealed');
    formatDialog.querySelector<HTMLButtonElement>('[data-p10-format-close]')?.focus({ preventScroll: true });
    syncScrollLock();
  }
  const modal = formatDialog.open ? formatDialog : dialog;
  if (focusIndex !== undefined) {
    const control = modal.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]')[focusIndex];
    if (control && !control.closest('[inert]')) control.focus({ preventScroll: true });
  }
  modal.scrollTop = scroll;
  renderedOverlayHash = location.hash;
  renderingOverlay = false;
  const view = savedView();
  if (view?.overlay) {
    const index = [...modal.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].indexOf(document.activeElement!);
    cachePosition({ ...view, overlay: { ...view.overlay, scroll: modal.scrollTop, focusIndex: index >= 0 ? index : undefined } });
    schedulePositionFlush();
  }
}

function rememberOverlayPosition(): void {
  const currentView = () => !renderingOverlay && (dialog.open || formatDialog.open)
    && location.hash === renderedOverlayHash && savedView()?.overlay;
  if (!currentView() || overlayFrame) return;
  overlayFrame = requestAnimationFrame(() => {
    overlayFrame = 0;
    if (!currentView()) return;
    const view = savedView()!;
    const modal = formatDialog.open ? formatDialog : dialog;
    const index = [...modal.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].indexOf(document.activeElement!);
    cachePosition({ ...view, overlay: {
      ...view.overlay!, scroll: modal.scrollTop,
      focusIndex: index >= 0 ? index : view.overlay?.focusIndex,
    } });
    schedulePositionFlush();
  });
}

function openOverlay(destination: HomeDestination, source?: Element | null): void {
  rememberView(source);
  const previous = savedView();
  const hash = homeHash(destination);
  const sameAddress = hash === location.hash;
  const view = captureView(source);
  view.overlay = {
    destination, scroll: 0,
    depth: sameAddress ? previous?.overlay?.depth ?? 0 : (previous?.overlay?.depth ?? 0) + 1,
    baseHash: previous?.overlay?.baseHash ?? (isOverlay(homeDestination(location.hash)) ? '#top' : location.hash || '#top'),
  };
  writeView(view, hash, !sameAddress);
  renderOverlay(destination);
}

function restoreFocus(key?: string): void {
  if (!key) return;
  const target = app.querySelector<HTMLElement>(`[data-home-focus="${CSS.escape(key)}"]`);
  if (!target) return;
  if (target.closest('[inert]')) {
    // A capability may have collapsed after the source click. Expanding it via
    // its normal control keeps a restored CTA visible and keyboard-accessible.
    target.closest('[data-capability-new-card]')?.querySelector<HTMLButtonElement>('[data-capability-new-expand]')?.focus({ preventScroll: true });
  }
  if (!target.closest('[inert]') && target.getClientRects().length) target.focus({ preventScroll: true });
}
const formatLayout = matchMedia('(max-width: 1199px)');
const updateFormatOrientation = () => app.querySelector('.formats__tabs')?.setAttribute('aria-orientation', formatLayout.matches ? 'horizontal' : 'vertical');
formatLayout.addEventListener('change', updateFormatOrientation, { signal });
updateFormatOrientation();

app.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const anchor = target.closest<HTMLAnchorElement>('a');
  if (anchor && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
  if (target.closest('[data-request-reset]')) {
    selectRequest('general');
    const hash = homeDestination(location.hash).section === 'request' ? '#request' : location.hash;
    writeView(captureView(target), hash);
    return;
  }
  if (target.closest('[data-open-documents]')) { event.preventDefault(); openOverlay({ documents: true }, target); return; }
  const lot = target.closest<HTMLElement>('[data-open-lot]');
  if (lot) { event.preventDefault(); openOverlay({ lot: lot.dataset.openLot! }, lot); return; }
  if (target.closest('.dialog__close, [data-p10-format-close]')) { closeDialog(); return; }
  const formatTrigger = target.closest<HTMLElement>('[data-p10-format-open]');
  if (formatTrigger) { openOverlay({ format: formatTrigger.dataset.p10FormatOpen! }, formatTrigger); return; }
  const format = target.closest<HTMLButtonElement>('[data-format]');
  if (format) {
    selectFormat(format.dataset.format!);
    if (formatDialog.open) {
      const view = captureView();
      const destination = { format: format.dataset.format! };
      if (view.overlay) view.overlay.destination = destination;
      writeView(view, homeHash(destination));
      renderedOverlayHash = location.hash;
    }
    return;
  }
  const localLink = target.closest<HTMLElement>('[data-scroll]');
  const href = anchor?.getAttribute('href') ?? '';
  if (localLink || href.startsWith('#')) {
    event.preventDefault();
    const destination = homeDestination(href);
    if (localLink) destination.section = localLink.dataset.scroll;
    const request = target.closest<HTMLElement>('[data-request-kind]');
    if (request) { destination.kind = request.dataset.requestKind as RequestKind; destination.interest = request.dataset.requestInterest ?? destination.interest; }
    const schedule = target.closest<HTMLElement>('[data-lots-category], [data-lots-period]');
    if (schedule) {
      destination.category = schedule.dataset.lotsCategory as HomeDestination['category'];
      destination.period = schedule.dataset.lotsPeriod as HomeDestination['period'];
    }
    if (isOverlay(destination)) openOverlay(destination, anchor ?? target);
    else if (destination.section) scrollToId(destination.section, true, true, destination, anchor ?? target);
  }
}, { signal });

app.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement && event.target.closest('[data-site-search]')) event.target.setCustomValidity('');
}, { signal });
app.addEventListener('submit', event => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form?.matches('[data-site-search]')) return;
  event.preventDefault();
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const query = input.value.trim().replace(/\s+/gu, ' ').slice(0, 120);
  if (!query) { input.setCustomValidity('Введите название лота, тему или раздел.'); input.reportValidity(); return; }
  openOverlay({ search: query }, form);
}, { signal });

for (const modal of [dialog, formatDialog]) {
  modal.addEventListener('scroll', rememberOverlayPosition, { passive: true, signal });
  modal.addEventListener('focusin', rememberOverlayPosition, { signal });
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const box = modal.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  }, { signal });
  modal.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }, { signal });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); }
  }, { signal });
  // A queued close event from an earlier view must not unlock a newly opened
  // dialog or steal its focus. Derive the lock from the current native state.
  modal.addEventListener('close', syncScrollLock, { signal });
}

for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
  try { cleanups.push(initDotField(host)); } catch { /* Decorative effects cannot block content. */ }
}
const globe = app.querySelector<HTMLElement>('#hero-globe');
if (globe) { try { cleanups.push(initGlobe(globe)); } catch { /* Atmospheric CSS remains visible. */ } }
cleanups.push(mountPageMotion(app, false));

function applyHash(): void {
  navigationFrame = 0;
  if (closingOverlayStack) {
    // A dialog opened from a direct URL has no earlier background entry. After
    // leaving its nested views, turn that original entry into its homepage.
    if (isOverlay(homeDestination(location.hash))) {
      const view = { ...(savedView() ?? captureView()), focus: closingOverlayStack.focus };
      delete view.overlay;
      writeView(view, closingOverlayStack.baseHash);
    }
    closingOverlayStack = null;
  }
  const destination = homeDestination(location.hash);
  const existing = savedView();
  if (existing && !existing.entryKey) writeView(existing);
  const saved = savedView();
  const restoring = restoreHistory && saved && typeof saved.y === 'number';
  window.clearTimeout(closeTimeout);
  nav.close();
  if (restoring) {
    selectRequest(saved.kind ?? 'general', saved.interest);
    selectSchedule(saved);
  } else applyIntent(destination);
  restoreHistory = false;
  if (isOverlay(destination)) {
    if (!saved?.overlay) {
      const view = captureView();
      view.overlay = { destination, depth: 0, baseHash: '#top', scroll: 0 };
      writeView(view, homeHash(destination));
    }
    renderOverlay(destination, restoring ? saved.overlay?.scroll ?? 0 : 0, restoring ? saved.overlay?.focusIndex : undefined);
    if (restoring) window.scrollTo({ top: saved.y, behavior: 'instant' });
    appliedHistoryEntry = { url: location.href, key: savedView()?.entryKey };
    return;
  }
  closeForNavigation();
  if (restoring) {
    window.scrollTo({ top: saved.y, behavior: 'instant' });
    restoreFocus(saved.focus);
  } else {
    const id = destination.section && document.getElementById(destination.section) ? destination.section : 'top';
    scrollToId(id, false, false);
  }
  if (location.hash.startsWith('#/')) {
    writeView(savedView() ?? captureView(), homeHash(destination));
  }
  renderedPageHash = location.hash;
  if (!savedView()) rememberView();
  appliedHistoryEntry = { url: location.href, key: savedView()?.entryKey };
}
function scheduleHash(restore = false): void {
  restoreHistory ||= restore;
  cancelAnimationFrame(navigationFrame);
  cancelAnimationFrame(overlayFrame);
  overlayFrame = 0;
  cancelAnimationFrame(pageScrollFrame);
  pageScrollFrame = 0;
  navigationFrame = requestAnimationFrame(applyHash);
}
window.addEventListener('hashchange', event => {
  // History traversal emits popstate and then hashchange. Some engines deliver
  // a rendering frame between them, so rAF coalescing alone can apply the same
  // entry twice: the second pass would discard the restored reading position
  // and focus by navigating to the fragment's heading. Ignore only an entry we
  // have already applied; a fresh fragment navigation has its own entry/state.
  // A queued event for an address we have already left must not render either.
  if (event.newURL !== location.href) return;
  if (appliedHistoryEntry?.url === event.newURL && appliedHistoryEntry.key === savedView()?.entryKey) return;
  scheduleHash();
}, { signal });
window.addEventListener('popstate', () => scheduleHash(true), { signal });
window.addEventListener('beforeunload', () => rememberView(), { signal });
window.addEventListener('scroll', rememberPagePosition, { passive: true, signal });
if (location.hash || history.state?.dpecoHome) scheduleHash(true);
else rememberView();

if (import.meta.hot) import.meta.hot.dispose(() => {
  abort.abort();
  cleanups.forEach(cleanup => cleanup());
  formatAnimation?.cancel();
  cancelAnimationFrame(navigationFrame);
  cancelAnimationFrame(overlayFrame);
  cancelAnimationFrame(pageScrollFrame);
  window.clearTimeout(toastTimeout);
  window.clearTimeout(closeTimeout);
  window.clearTimeout(positionFlushTimeout);
  if (dialog.open) dialog.close();
  if (formatDialog.open) formatDialog.close();
  document.body.classList.remove('has-dialog', 'has-menu');
  document.documentElement.classList.remove('p10-modal-open');
  history.scrollRestoration = previousScrollRestoration;
});
