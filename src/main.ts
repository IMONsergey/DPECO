import './styles.css';
import { mountCapabilities } from './components/capabilities';
import { filterLots, lots, nextAuctionAt, type LotCategory } from './data/lots';
import { initDotField, initGlobe } from './effects';
import { mountRequestForms } from './forms';
import { mountAccordions, mountTabs } from './interactions';
import { journalCardsFor } from './journal';
import { lotCards } from './lot-cards';
import { createContentTransition } from './motion';
import { mountNavigation } from './navigation';
import { pageTitle, renderPage } from './page';
import { cancelRouteTransition, mountPageMotion, transitionRoute } from './page-motion';
import { parseRoute, type Route } from './routes';
import { accountUrl, escapeHtml, icon, registerUrl, rubles } from './ui';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Page root is missing.');
const app: HTMLElement = root;
let destroyRoute: (() => void) | undefined;
let currentRoute: Route = parseRoute(location.hash);
let navigationFrame = 0;
type ViewState = { y: number; category: 'all' | LotCategory; journalCategory: string; focusHref?: string };
const viewStates = new Map<number, ViewState>();
let nextEntry = Date.now();
let currentEntry = ++nextEntry;
const previousScrollRestoration = history.scrollRestoration;
history.scrollRestoration = 'manual';
history.replaceState({ ...history.state, dpecoEntry: currentEntry }, '');

function mountRoute(route: Route, saved?: ViewState): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const cleanups: (() => void)[] = [];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = mountNavigation(app, route.path);
  cleanups.push(nav.destroy, mountCapabilities(app), mountTabs(app), mountAccordions(app));
  const dialog = app.querySelector<HTMLDialogElement>('#detail-dialog')!;
  const dialogContent = app.querySelector<HTMLElement>('#dialog-content')!;
  const toast = app.querySelector<HTMLElement>('#toast')!;
  let previousFocus: HTMLElement | null = null;
  let toastTimeout = 0;
  let closeTimeout = 0;
  let countdownTimeout = 0;
  let initialFrame = 0;
  let category: 'all' | LotCategory = saved?.category ?? 'all';

  function notify(text: string): void {
    window.clearTimeout(toastTimeout);
    toast.textContent = text;
    toast.classList.add('is-visible');
    toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }
  cleanups.push(mountRequestForms(app, notify));

  const grid = app.querySelector<HTMLElement>('#lots-grid');
  const lotsStage = app.querySelector<HTMLElement>('.lots__stage');
  if (grid) app.querySelectorAll<HTMLAnchorElement>('[data-auction-link]').forEach((link) => { link.href = '#lots'; link.dataset.scroll = 'lots'; });
  const lotsTransition = grid && lotsStage ? createContentTransition(lotsStage, grid) : null;
  if (lotsTransition) cleanups.push(() => lotsTransition.destroy());

  function renderLots(animate = true): void {
    if (!grid) return;
    const visible = filterLots(lots, category, '');
    const update = () => { grid.innerHTML = lotCards(visible); grid.scrollLeft = 0; };
    if (animate && lotsTransition) lotsTransition.run(update);
    else update();
    grid.setAttribute('aria-labelledby', `filter-${category}`);
    app.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === category;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    const announcement = app.querySelector('#lots-announcement');
    if (animate && announcement) announcement.textContent = `Найдено лотов: ${visible.length}`;
  }
  renderLots(false);

  function scrollToId(id: string): void {
    const element = document.getElementById(id);
    if (!element) return;
    nav.close();
    const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
    const top = id === 'top' || id === 'main' ? 0 : Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top, behavior: motion.matches ? 'instant' : 'smooth' });
    if (id === 'main') element.focus({ preventScroll: true });
  }

  function showDialog(content: string): void {
    window.clearTimeout(closeTimeout);
    dialog.classList.remove('is-closing');
    if (!dialog.open) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nav.close();
    dialogContent.innerHTML = content;
    document.body.classList.add('has-dialog');
    if (!dialog.open) dialog.showModal();
    app.querySelector<HTMLButtonElement>('.dialog__close')?.focus({ preventScroll: true });
  }
  function closeDialog(): void {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (motion.matches) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    closeTimeout = window.setTimeout(() => dialog.close(), 200);
  }
  function openLot(id: string): void {
    const lot = lots.find((item) => item.id === id);
    if (!lot) return;
    showDialog(`<h2 id="dialog-title">${escapeHtml(lot.name)}</h2>
      <dl class="dialog__details"><div><dt>Вид актива</dt><dd>${lot.category === 'receivables' ? 'Дебиторская задолженность' : 'Портфель физических лиц'}</dd></div><div><dt>Количество кейсов</dt><dd>${lot.cases.toLocaleString('ru-RU')}</dd></div><div><dt>${lot.statusLabel}</dt><dd>${lot.status}</dd></div><div><dt>${lot.dateLabel}</dt><dd>${lot.date}${lot.startsAt ? ' МСК' : ''}</dd></div>${lot.startingPrice ? `<div><dt>Начальная цена</dt><dd>${rubles(lot.startingPrice)}</dd></div>` : ''}</dl>
      <p class="dialog__amount"><small>Общая сумма задолженности</small>${rubles(lot.debt)}</p>
      <p class="dialog__text">Данные площадки на 29 октября 2026. Текущий статус, документы и условия участия доступны в личном кабинете DEBTPRICE.</p>
      <div class="dialog__actions"><a class="button button--primary" href="${accountUrl}">Перейти к торгам ${icon('login')}</a><a class="button button--dark" href="${registerUrl}">Регистрация ${icon('arrow-right')}</a></div>`);
  }
  function shareLot(id: string): void {
    const lot = lots.find((item) => item.id === id);
    if (!lot) return;
    const url = new URL(location.href);
    url.hash = `/?lot=${id}`;
    const text = `${lot.name}\nОбщая сумма: ${rubles(lot.debt)}${lot.startingPrice ? `\nНачальная цена: ${rubles(lot.startingPrice)}` : ''}\n${lot.dateLabel}: ${lot.date}`;
    const telegram = `https://t.me/share/url?url=${encodeURIComponent(url.href)}&text=${encodeURIComponent(text)}`;
    const email = `mailto:?subject=${encodeURIComponent(lot.name)}&body=${encodeURIComponent(`${text}\n\n${url.href}`)}`;
    showDialog(`<h2 id="dialog-title">Поделиться лотом</h2><p class="dialog__text">${escapeHtml(lot.name)}</p><p class="dialog__amount"><small>Общая сумма задолженности</small>${rubles(lot.debt)}</p><p class="dialog__text">${lot.dateLabel}: ${lot.date}. Данные на 29 октября 2026.</p><label class="sr-only" for="share-link">Ссылка на лот</label><input id="share-link" class="share-input" readonly value="${escapeHtml(url.href)}"><div class="dialog__actions"><button class="button button--primary" type="button" data-copy-lot-link>Скопировать ссылку ${icon('document')}</button><a class="button button--dark" href="${escapeHtml(telegram)}" target="_blank" rel="noopener noreferrer">Telegram ${icon('telegram')}</a><a class="text-link" href="${escapeHtml(email)}">Отправить по почте ${icon('mail')}</a></div>`);
  }

  const formatLayout = matchMedia('(max-width: 1199px)');
  const updateFormatOrientation = () => app.querySelector('.formats__tabs')?.setAttribute('aria-orientation', formatLayout.matches ? 'horizontal' : 'vertical');
  formatLayout.addEventListener('change', updateFormatOrientation, { signal });
  updateFormatOrientation();

  let formatAnimation: Animation | null = null;
  function selectFormat(id: string): void {
    const nextPanel = app.querySelector<HTMLElement>(`#format-pane-${CSS.escape(id)}`);
    if (!nextPanel || nextPanel.classList.contains('is-active')) return;
    formatAnimation?.cancel();
    app.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((tab) => {
      const active = tab.dataset.format === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    app.querySelectorAll<HTMLElement>('.format-pane').forEach((panel) => {
      const active = panel.id === `format-pane-${id}`;
      panel.classList.toggle('is-active', active);
      panel.inert = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (!motion.matches) formatAnimation = nextPanel.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  }
  const journalGrid = app.querySelector<HTMLElement>('#journal-grid');
  const journalStage = journalGrid?.parentElement;
  const journalTransition = journalGrid && journalStage ? createContentTransition(journalStage, journalGrid) : null;
  if (journalTransition) cleanups.push(() => journalTransition.destroy());
  function selectJournal(categoryName: string, animate = true): void {
    if (!journalGrid) return;
    const update = () => { journalGrid.innerHTML = journalCardsFor(categoryName); };
    if (animate && journalTransition) journalTransition.run(update);
    else update();
    app.querySelectorAll<HTMLButtonElement>('[data-journal-filter]').forEach((tab) => {
      const active = tab.dataset.journalFilter === categoryName;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) journalGrid.setAttribute('aria-labelledby', tab.id);
    });
  }
  if (saved?.journalCategory && journalGrid) selectJournal(saved.journalCategory, false);

  app.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const localLink = target.closest<HTMLElement>('[data-scroll]');
    if (localLink) { event.preventDefault(); scrollToId(localLink.dataset.scroll ?? ''); return; }
    const lot = target.closest<HTMLElement>('[data-open-lot]');
    if (lot) { openLot(lot.dataset.openLot!); return; }
    const share = target.closest<HTMLElement>('[data-share-lot]');
    if (share) { shareLot(share.dataset.shareLot!); return; }
    if (target.closest('[data-copy-lot-link]')) {
      const input = app.querySelector<HTMLInputElement>('#share-link');
      if (input) navigator.clipboard.writeText(input.value).then(() => { if (!signal.aborted) notify('Ссылка на лот скопирована'); }).catch(() => { if (signal.aborted) return; input.focus(); input.select(); notify('Выделите и скопируйте ссылку'); });
      return;
    }
    if (target.closest('.dialog__close')) { closeDialog(); return; }
    const filter = target.closest<HTMLButtonElement>('[data-filter]');
    if (filter && ['all', 'receivables', 'individuals'].includes(filter.dataset.filter ?? '')) {
      const next = filter.dataset.filter as typeof category;
      if (next !== category) { category = next; renderLots(); }
      return;
    }
    if (target.closest('[data-reset-filters]')) { category = 'all'; renderLots(); app.querySelector<HTMLElement>('#filter-all')?.focus({ preventScroll: true }); return; }
    const format = target.closest<HTMLButtonElement>('[data-format]');
    if (format) { selectFormat(format.dataset.format!); return; }
    const journalTab = target.closest<HTMLButtonElement>('[data-journal-filter]');
    if (journalTab) { selectJournal(journalTab.dataset.journalFilter!); return; }
    // Native local anchors stay on the current route instead of becoming page routes.
    const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
    const hash = anchor?.getAttribute('href') ?? '';
    if (hash && !hash.startsWith('#/') && !hash.startsWith('#lot-')) {
      const id = hash.slice(1);
      if (document.getElementById(id)) { event.preventDefault(); scrollToId(id); }
    }
    if (anchor && hash.startsWith('#/') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      nav.close();
      if (hash === location.hash) { cancelRouteTransition(); window.scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' }); }
      else navigate(hash);
    }
  }, { signal });

  app.querySelectorAll<HTMLFormElement>('[data-site-search]').forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
    input.value = route.path === 'search' ? route.query.get('q') ?? '' : '';
    input.addEventListener('input', () => input.setCustomValidity(''), { signal });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim().replace(/\s+/gu, ' ').slice(0, 120);
      if (!query) { input.setCustomValidity('Введите название лота, тему или раздел.'); input.reportValidity(); return; }
      nav.close();
      navigate(`#/search?q=${encodeURIComponent(query)}`);
    }, { signal });
  });

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  }, { signal });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); }, { signal });
  dialog.addEventListener('close', () => {
    window.clearTimeout(closeTimeout);
    dialog.classList.remove('is-closing');
    document.body.classList.remove('has-dialog');
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]') && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }, { signal });

  function updateCountdown(): void {
    window.clearTimeout(countdownTimeout);
    if (document.hidden) return;
    const now = Date.now();
    const next = nextAuctionAt(now);
    let value = 'Расписание';
    let hint = 'Даты и условия торгов';
    if (next) {
      const total = Math.max(0, Math.floor((next - now) / 1000));
      const hours = Math.floor(total / 3600);
      value = [hours, Math.floor(total % 3600 / 60), total % 60].map((part) => String(part).padStart(2, '0')).join(':');
      hint = `До торгов ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(next)} МСК`;
    }
    app.querySelectorAll<HTMLElement>('[data-auction-countdown]').forEach((node) => {
      node.textContent = value;
      node.classList.toggle('is-schedule', next === null);
      node.setAttribute('aria-label', next ? `До ближайших торгов ${value}` : 'Расписание торгов');
    });
    app.querySelectorAll<HTMLElement>('[data-auction-label]').forEach((node) => { node.textContent = next ? 'До торгов' : 'Торги'; });
    app.querySelectorAll<HTMLElement>('[data-auction-hint]').forEach((node) => { node.textContent = hint; });
    if (next) countdownTimeout = window.setTimeout(updateCountdown, 1000 - (now % 1000));
  }
  document.addEventListener('visibilitychange', updateCountdown, { signal });
  updateCountdown();

  for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
    try { cleanups.push(initDotField(host)); } catch { /* Decorative effects cannot block content. */ }
  }
  const globe = app.querySelector<HTMLElement>('#hero-globe');
  if (globe) { try { cleanups.push(initGlobe(globe)); } catch { /* Atmospheric CSS remains visible. */ } }

  cleanups.push(mountPageMotion(app, Boolean(saved)));

  const lotId = route.query.get('lot');
  if (lotId) openLot(lotId);
  const section = route.query.get('section');
  if (section) initialFrame = requestAnimationFrame(() => scrollToId(section));

  return () => {
    abort.abort();
    cleanups.forEach((cleanup) => cleanup());
    formatAnimation?.cancel();
    cancelAnimationFrame(initialFrame);
    window.clearTimeout(toastTimeout);
    window.clearTimeout(closeTimeout);
    window.clearTimeout(countdownTimeout);
    if (dialog.open) dialog.close();
    document.body.classList.remove('has-dialog', 'has-menu');
  };
}

function render(route: Route, first = false, saved?: ViewState): void {
  destroyRoute?.();
  currentRoute = route;
  app.innerHTML = renderPage(route);
  document.title = pageTitle(route);
  window.scrollTo({ top: 0, behavior: 'instant' });
  destroyRoute = mountRoute(route, saved);
  if (saved) window.scrollTo({ top: saved.y, behavior: 'instant' });
  cancelAnimationFrame(navigationFrame);
  if (saved?.focusHref) {
    navigationFrame = requestAnimationFrame(() => {
      [...app.querySelectorAll<HTMLAnchorElement>('main a')].find((link) => link.getAttribute('href') === saved.focusHref)?.focus({ preventScroll: true });
    });
  } else if (!first && !saved && !route.query.has('lot')) {
    navigationFrame = requestAnimationFrame(() => {
      const heading = app.querySelector<HTMLElement>('main h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
  }
}

function saveCurrentView(): void {
  const selectedCategory = app.querySelector<HTMLButtonElement>('[data-filter][aria-selected="true"]')?.dataset.filter;
  const focus = document.activeElement instanceof HTMLAnchorElement && document.activeElement.closest('main') ? document.activeElement.getAttribute('href') ?? undefined : undefined;
  viewStates.set(currentEntry, {
    y: window.scrollY,
    category: selectedCategory === 'receivables' || selectedCategory === 'individuals' ? selectedCategory : 'all',
    journalCategory: app.querySelector<HTMLButtonElement>('[data-journal-filter][aria-selected="true"]')?.dataset.journalFilter ?? 'all',
    focusHref: focus,
  });
}

function navigate(hash: string): void {
  const route = parseRoute(hash);
  if (route.path === currentRoute.path && route.query.toString() === currentRoute.query.toString()) { cancelRouteTransition(); return; }
  transitionRoute(() => {
    saveCurrentView();
    currentEntry = ++nextEntry;
    history.pushState({ dpecoEntry: currentEntry }, '', hash);
    render(route);
  });
}

function onHistoryChange(): void {
  const next = parseRoute(location.hash);
  if (next.path === currentRoute.path && next.query.toString() === currentRoute.query.toString() && history.state?.dpecoEntry === currentEntry) return;
  cancelRouteTransition();
  saveCurrentView();
  const entry = history.state?.dpecoEntry;
  if (typeof entry === 'number' && entry !== currentEntry) currentEntry = entry;
  else {
    currentEntry = ++nextEntry;
    history.replaceState({ ...history.state, dpecoEntry: currentEntry }, '');
  }
  render(next, false, viewStates.get(currentEntry));
}
window.addEventListener('hashchange', onHistoryChange);
window.addEventListener('popstate', onHistoryChange);
render(currentRoute, true);
if (import.meta.hot) import.meta.hot.dispose(() => { cancelRouteTransition(); destroyRoute?.(); cancelAnimationFrame(navigationFrame); window.removeEventListener('hashchange', onHistoryChange); window.removeEventListener('popstate', onHistoryChange); history.scrollRestoration = previousScrollRestoration; });
