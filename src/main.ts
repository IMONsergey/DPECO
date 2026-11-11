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
import { homeDestination, type RequestKind } from './routes';
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
const dialogContent = app.querySelector<HTMLElement>('#dialog-content')!;
const toast = app.querySelector<HTMLElement>('#toast')!;
let previousFocus: HTMLElement | null = null;
let closeTimeout = 0;
let toastTimeout = 0;
let navigationFrame = 0;
let formatAnimation: Animation | null = null;
let restoreHistory = false;
let focusSequence = 0;
const previousScrollRestoration = history.scrollRestoration;
history.scrollRestoration = 'manual';

function rememberView(): void {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (active && app.contains(active)) active.dataset.homeFocus ||= String(++focusSequence);
  const form = app.querySelector<HTMLFormElement>('[data-request-form]');
  history.replaceState({ ...history.state, dpecoHome: {
    y: window.scrollY, focus: active?.dataset.homeFocus,
    kind: form?.dataset.kind, interest: form?.querySelector<HTMLInputElement>('[name="interest"]')?.value,
  } }, '');
}

function closeForNavigation(): void {
  previousFocus = null;
  if (dialog.open) dialog.close();
  const formats = app.querySelector<HTMLDialogElement>('#p10-format-dialog');
  if (formats?.open) { formats.dataset.navigationClose = 'true'; formats.close(); }
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
  form.dataset.kind = selected;
  const context = form.querySelector<HTMLElement>('[data-request-context]');
  const text = context?.querySelector('[data-request-context-label]');
  const interest = form.querySelector<HTMLInputElement>('input[name="interest"]');
  const label = interestLabel || labels[selected];
  if (context) context.hidden = !label;
  if (text) text.textContent = label;
  if (interest) interest.value = label;
  form.dispatchEvent(new Event('input', { bubbles: true }));
}

function scrollToId(id: string, updateUrl = true, animate = true): void {
  const element = document.getElementById(id);
  if (!element) return;
  if (updateUrl && location.hash !== `#${id}`) rememberView();
  nav.close();
  closeForNavigation();
  const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
  const top = id === 'top' || id === 'main' ? 0 : Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);
  if (updateUrl && location.hash !== `#${id}`) {
    const form = app.querySelector<HTMLFormElement>('[data-request-form]');
    history.pushState({ dpecoHome: { y: top, kind: form?.dataset.kind, interest: form?.querySelector<HTMLInputElement>('[name="interest"]')?.value } }, '', `#${id}`);
  }
  const heading = element.matches('main') ? element : element.querySelector<HTMLElement>('h1, h2');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  window.scrollTo({ top, behavior: motion.matches || !animate ? 'instant' : 'smooth' });
}

function showDialog(content: string, view: string): void {
  window.clearTimeout(closeTimeout);
  dialog.classList.remove('is-closing');
  const formats = app.querySelector<HTMLDialogElement>('#p10-format-dialog');
  if (formats?.open) { formats.dataset.navigationClose = 'true'; formats.close(); }
  if (!dialog.open) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFocus = active?.closest('.nav-dropdown')?.querySelector<HTMLElement>('[data-nav-toggle]')
      ?? (active?.closest('#mobile-menu') ? app.querySelector<HTMLElement>('[data-mobile-toggle]') : active);
  }
  nav.close();
  dialogContent.innerHTML = content;
  dialog.dataset.view = view;
  document.body.classList.add('has-dialog');
  if (!dialog.open) dialog.showModal();
  const focus = view === 'search' ? dialog.querySelector<HTMLInputElement>('#dialog-search') : dialog.querySelector<HTMLButtonElement>('.dialog__close');
  focus?.focus({ preventScroll: true });
}

function closeDialog(): void {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  if (motion.matches) { dialog.close(); return; }
  dialog.classList.add('is-closing');
  closeTimeout = window.setTimeout(() => dialog.close(), 200);
}

function openLot(id: string): void {
  const lot = [...lots, ...archivedLots].find(item => item.id === id);
  if (!lot) return;
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
const formatLayout = matchMedia('(max-width: 1199px)');
const updateFormatOrientation = () => app.querySelector('.formats__tabs')?.setAttribute('aria-orientation', formatLayout.matches ? 'horizontal' : 'vertical');
formatLayout.addEventListener('change', updateFormatOrientation, { signal });
updateFormatOrientation();

app.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const anchor = target.closest<HTMLAnchorElement>('a');
  if (anchor && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
  if (target.closest('[data-request-reset]')) { selectRequest('general'); return; }
  const request = target.closest<HTMLElement>('[data-request-kind]');
  if (request) selectRequest(request.dataset.requestKind, request.dataset.requestInterest);
  if (target.closest('[data-open-documents]')) { event.preventDefault(); showDialog(renderDocumentsDialog(), 'documents'); return; }
  const lot = target.closest<HTMLElement>('[data-open-lot]');
  if (lot) { event.preventDefault(); openLot(lot.dataset.openLot!); return; }
  if (target.closest('.dialog__close')) { closeDialog(); return; }
  const format = target.closest<HTMLButtonElement>('[data-format]');
  if (format) { selectFormat(format.dataset.format!); return; }
  const localLink = target.closest<HTMLElement>('[data-scroll]');
  if (localLink) { event.preventDefault(); scrollToId(localLink.dataset.scroll ?? ''); return; }
  const href = anchor?.getAttribute('href') ?? '';
  if (href.startsWith('#')) {
    event.preventDefault();
    const destination = homeDestination(href);
    if (destination.kind) selectRequest(destination.kind);
    else if (destination.section === 'request' && !request) selectRequest('general');
    if (destination.documents) showDialog(renderDocumentsDialog(), 'documents');
    else if (destination.lot) openLot(destination.lot);
    else if (destination.search !== undefined) showDialog(renderSearchDialog(destination.search), 'search');
    else if (destination.section) scrollToId(destination.section);
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
  showDialog(renderSearchDialog(query), 'search');
}, { signal });

dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
}, { signal });
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }, { signal });
dialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); }
}, { signal });
dialog.addEventListener('close', () => {
  window.clearTimeout(closeTimeout);
  dialog.classList.remove('is-closing');
  document.body.classList.remove('has-dialog');
  if (previousFocus?.isConnected && !previousFocus.closest('[inert]') && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
  previousFocus = null;
}, { signal });

for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
  try { cleanups.push(initDotField(host)); } catch { /* Decorative effects cannot block content. */ }
}
const globe = app.querySelector<HTMLElement>('#hero-globe');
if (globe) { try { cleanups.push(initGlobe(globe)); } catch { /* Atmospheric CSS remains visible. */ } }
cleanups.push(mountPageMotion(app, false));

function applyHash(): void {
  const destination = homeDestination(location.hash);
  const addressedDialog = destination.documents || destination.lot || destination.search !== undefined;
  if (restoreHistory && history.state?.dpecoHome && typeof history.state.dpecoHome.y === 'number') {
    const saved = history.state.dpecoHome;
    nav.close();
    closeForNavigation();
    if (saved.kind) selectRequest(saved.kind, saved.interest);
    window.scrollTo({ top: saved.y, behavior: 'instant' });
    if (saved.focus) app.querySelector<HTMLElement>(`[data-home-focus="${CSS.escape(saved.focus)}"]`)?.focus({ preventScroll: true });
    restoreHistory = false;
    if (!addressedDialog) return;
  }
  restoreHistory = false;
  if (destination.kind) selectRequest(destination.kind);
  if (destination.documents) showDialog(renderDocumentsDialog(), 'documents');
  else if (destination.lot) openLot(destination.lot);
  else if (destination.search !== undefined) showDialog(renderSearchDialog(destination.search), 'search');
  else if (destination.section) {
    const id = document.getElementById(destination.section) ? destination.section : 'top';
    if (location.hash.startsWith('#/')) history.replaceState(history.state, '', `#${id}`);
    scrollToId(id, false, false);
  }
}
function scheduleHash(restore = false): void {
  restoreHistory ||= restore;
  cancelAnimationFrame(navigationFrame);
  navigationFrame = requestAnimationFrame(applyHash);
}
window.addEventListener('hashchange', () => scheduleHash(), { signal });
window.addEventListener('popstate', () => scheduleHash(true), { signal });
window.addEventListener('beforeunload', rememberView, { signal });
if (location.hash || history.state?.dpecoHome) scheduleHash(true);

if (import.meta.hot) import.meta.hot.dispose(() => {
  abort.abort();
  cleanups.forEach(cleanup => cleanup());
  formatAnimation?.cancel();
  cancelAnimationFrame(navigationFrame);
  window.clearTimeout(toastTimeout);
  window.clearTimeout(closeTimeout);
  if (dialog.open) dialog.close();
  document.body.classList.remove('has-dialog', 'has-menu');
  history.scrollRestoration = previousScrollRestoration;
});
