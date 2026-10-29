import { filterLots, lots, type LotCategory } from './data/lots';
import { initDotField, initGlobe } from './effects';
import { lotCards } from './lot-cards';
import { capabilities, renderPage, type Audience } from './page';
import { accountUrl, asset, escapeHtml, icon, registerUrl, rubles } from './ui';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Page root is missing.');
const app: HTMLElement = root;
app.innerHTML = renderPage();

const abort = new AbortController();
const { signal } = abort;
const cleanups: (() => void)[] = [];
const select = <T extends HTMLElement>(selector: string): T => {
  const element = app.querySelector<T>(selector);
  if (!element) throw new Error(`Required element is missing: ${selector}`);
  return element;
};

const state: { category: 'all' | LotCategory; query: string; audience: Audience } = {
  category: 'all', query: '', audience: 'seller',
};
const grid = select<HTMLDivElement>('#lots-grid');
const header = select<HTMLElement>('#site-header');
const mobileMenu = select<HTMLElement>('#mobile-menu');
const mobileMenuButton = select<HTMLButtonElement>('.header__menu');
const dialog = select<HTMLDialogElement>('#detail-dialog');
const dialogContent = select<HTMLDivElement>('#dialog-content');
const searchResult = select<HTMLDivElement>('#search-result');
let previousFocus: HTMLElement | null = null;
let toastTimeout = 0;
let clockTimeout = 0;
let scrollFrame = 0;

function setMobileMenu(open: boolean): void {
  header.classList.toggle('menu-open', open);
  mobileMenu.inert = !open;
  mobileMenuButton.setAttribute('aria-expanded', String(open));
  mobileMenuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenuButton.innerHTML = icon(open ? 'close' : 'menu');
}

function renderLots(announce = true): void {
  const visible = filterLots(lots, state.category, state.query);
  grid.innerHTML = lotCards(visible);
  grid.setAttribute('aria-labelledby', `filter-${state.category}`);
  app.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === state.category;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  searchResult.hidden = !state.query;
  const resultText = searchResult.querySelector('p');
  if (resultText) resultText.textContent = `По запросу «${state.query}» найдено: ${visible.length}`;
  if (announce) select('#lots-announcement').textContent = `Найдено лотов: ${visible.length}`;
}

function resetFilters(): void {
  const restoreFocus = grid.contains(document.activeElement);
  state.category = 'all';
  state.query = '';
  app.querySelectorAll<HTMLInputElement>('input[name="q"]').forEach((input) => { input.value = ''; input.setCustomValidity(''); });
  renderLots();
  if (restoreFocus) select<HTMLButtonElement>('#filter-all').focus({ preventScroll: true });
}

function scrollToLots(): void {
  setMobileMenu(false);
  select('#lots').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

function showDialog(content: string): void {
  if (!dialog.open) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFocus = active?.closest('.mobile-menu')
      ? mobileMenuButton
      : active?.closest('details')?.querySelector<HTMLElement>('summary') ?? active;
  }
  setMobileMenu(false);
  app.querySelectorAll<HTMLDetailsElement>('.dropdown[open]').forEach((item) => { item.open = false; });
  dialogContent.innerHTML = content;
  document.body.classList.add('has-dialog');
  if (!dialog.open) dialog.showModal();
  select<HTMLButtonElement>('.dialog__close').focus({ preventScroll: true });
}

function openLot(id: string): void {
  const lot = lots.find((item) => item.id === id);
  if (!lot) return;
  showDialog(`
    <span class="dialog__eyebrow">${lot.category === 'receivables' ? 'Дебиторская задолженность' : 'Портфель физических лиц'}</span>
    <h2 id="dialog-title">${escapeHtml(lot.name)}</h2>
    <dl class="dialog__details"><div><dt>Количество кейсов</dt><dd>${lot.cases.toLocaleString('ru-RU')}</dd></div><div><dt>${lot.statusLabel}</dt><dd>${lot.status}</dd></div><div><dt>${lot.dateLabel}</dt><dd>${lot.date}</dd></div>${lot.startingPrice ? `<div><dt>Начальная цена</dt><dd>${rubles(lot.startingPrice)}</dd></div>` : ''}</dl>
    <p class="dialog__amount"><small>Общая сумма задолженности</small>${rubles(lot.debt)}</p>
    <p class="dialog__text">Актуальные условия и документы по лотам доступны в личном кабинете DEBTPRICE.</p>
    <div class="dialog__actions"><a class="button button--primary" href="${accountUrl}">Войти в кабинет ${icon('login')}</a><a class="button button--dark" href="${registerUrl}">Регистрация ${icon('arrow-right')}</a></div>
  `);
}

function openContact(subject: string): void {
  const title = subject === 'Контакты' ? 'Давайте обсудим<br>вашу задачу' : subject === 'Продать долг' ? 'Продать долговой актив' : 'Свяжитесь с DEBTPRICE';
  showDialog(`
    <span class="dialog__eyebrow">${escapeHtml(subject)}</span>
    <h2 id="dialog-title">${title}</h2>
    <p class="dialog__text">Напишите или позвоните команде площадки. Поможем с выбором предложения, размещением портфеля и условиями участия.</p>
    <div class="dialog__contact"><a href="mailto:v@debtprice.market?subject=${encodeURIComponent(subject)}">${icon('mail')}v@debtprice.market ${icon('arrow-up-right')}</a><a href="tel:+79159724101">${icon('phone')}+7 915 972 41 01 ${icon('arrow-up-right')}</a></div>
    <div class="dialog__actions"><a class="button button--primary" href="${registerUrl}">Зарегистрироваться на площадке ${icon('arrow-right')}</a></div>
  `);
}

function openCapability(id: string): void {
  const item = capabilities.find((entry) => entry.id === id);
  if (!item) return;
  showDialog(`
    <span class="dialog__eyebrow">Возможности платформы · ${state.audience === 'seller' ? 'Продавцу' : 'Покупателю'}</span>
    <h2 id="dialog-title">${item.title}</h2>
    <img class="dialog__image" src="${asset(`images/${item.image}`)}" alt="" width="570" height="488">
    <p class="dialog__text">${item.detail[state.audience]}</p>
    <div class="dialog__actions"><a class="button button--primary" href="${accountUrl}">Перейти в кабинет ${icon('arrow-right')}</a><button class="button button--dark" type="button" data-contact="${state.audience === 'seller' ? 'Продать долг' : 'Подбор предложения'}">Связаться с нами ${icon('mail')}</button></div>
  `);
}

function setAudience(audience: Audience): void {
  state.audience = audience;
  app.querySelectorAll<HTMLButtonElement>('[data-audience]').forEach((button) => {
    const active = button.dataset.audience === audience;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  select('#capability-grid').setAttribute('aria-labelledby', `audience-${audience}`);
  app.querySelectorAll<HTMLElement>('[data-capability-description]').forEach((element) => {
    const item = capabilities.find((entry) => entry.id === element.dataset.capabilityDescription);
    if (item) element.textContent = item.description[audience];
  });
}

const compactCapabilities = matchMedia('(max-width: 800px)');
function syncCapabilityAccess(): void {
  app.querySelectorAll<HTMLElement>('[data-capability]').forEach((card) => {
    const expanded = compactCapabilities.matches || card.classList.contains('is-active');
    const body = card.querySelector<HTMLElement>('.capability__body');
    if (body) body.inert = !expanded;
    card.querySelector('button[data-expand-capability]')?.setAttribute('aria-expanded', String(expanded));
  });
}
function activateCapability(id: string): void {
  if (compactCapabilities.matches) return;
  app.querySelectorAll<HTMLElement>('[data-capability]').forEach((card) => {
    card.classList.toggle('is-active', card.dataset.capability === id);
  });
  syncCapabilityAccess();
}

function toast(message: string): void {
  const element = select('#toast');
  element.textContent = message;
  element.classList.add('is-visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => element.classList.remove('is-visible'), 3500);
}

async function copyLot(id: string): Promise<void> {
  if (!lots.some((lot) => lot.id === id)) return;
  const url = new URL(location.href);
  url.hash = `lot-${id}`;
  try {
    await navigator.clipboard.writeText(url.href);
    toast('Ссылка на лот скопирована');
  } catch {
    showDialog(`<span class="dialog__eyebrow">Поделиться лотом</span><h2 id="dialog-title">Ссылка на предложение</h2><p class="dialog__text">Скопируйте ссылку ниже.</p><label class="sr-only" for="share-link">Ссылка на лот</label><input class="share-input" id="share-link" value="${escapeHtml(url.href)}" readonly>`);
    select<HTMLInputElement>('#share-link').select();
  }
}

function checkHash(): void {
  if (location.hash.startsWith('#lot-')) openLot(location.hash.slice(5));
}

// One delegated listener keeps dynamically filtered cards and dialogs consistent.
app.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a, summary') : null;
  if (!target) return;
  if (target.dataset.openLot) openLot(target.dataset.openLot);
  else if (target.dataset.shareLot) void copyLot(target.dataset.shareLot);
  else if (target.dataset.contact) openContact(target.dataset.contact);
  else if (target.dataset.detail) openCapability(target.dataset.detail);
  else if (target.hasAttribute('data-about')) {
    showDialog(`<span class="dialog__eyebrow">О проекте</span><h2 id="dialog-title">Долговые активы.<br>На одной платформе.</h2><p class="dialog__text">DEBTPRICE объединяет продавцов и покупателей долговых активов. На площадке представлены кредитные и факторинговые портфели, дебиторская задолженность и права требования.</p><div class="dialog__actions"><a class="button button--primary" href="${registerUrl}">Присоединиться ${icon('arrow-right')}</a><button class="button button--dark" type="button" data-contact="Контакты">Связаться с нами ${icon('mail')}</button></div>`);
  } else if (target.dataset.filter || target.dataset.filterLink) {
    const category = target.dataset.filter ?? target.dataset.filterLink;
    if (category === 'all' || category === 'receivables' || category === 'individuals') {
      state.category = category;
      renderLots();
    }
  } else if (target.hasAttribute('data-reset-filters') || target.id === 'clear-search') resetFilters();
  else if (target.dataset.audience || target.dataset.audienceLink) {
    const audience = target.dataset.audience ?? target.dataset.audienceLink;
    if (audience === 'seller' || audience === 'buyer') setAudience(audience);
  } else if (target.dataset.expandCapability) activateCapability(target.dataset.expandCapability);
  else if (target === mobileMenuButton) setMobileMenu(!header.classList.contains('menu-open'));
  else if (target.classList.contains('dialog__close')) dialog.close();
  else if (target.classList.contains('partners__pause')) {
    const paused = !target.closest('.partners')?.classList.contains('is-paused');
    target.closest('.partners')?.classList.toggle('is-paused', paused);
    target.setAttribute('aria-pressed', String(paused));
    target.setAttribute('aria-label', paused ? 'Продолжить бегущую строку' : 'Приостановить бегущую строку');
    target.innerHTML = icon(paused ? 'play' : 'pause');
  }

  if (target.matches('a[href^="#"]')) {
    setMobileMenu(false);
    app.querySelectorAll<HTMLDetailsElement>('.dropdown[open]').forEach((item) => { item.open = false; });
  }
}, { signal });

for (const selector of ['#search-form', '#mobile-search-form']) {
  const form = select<HTMLFormElement>(selector);
  const input = form.querySelector<HTMLInputElement>('input')!;
  input.addEventListener('input', () => input.setCustomValidity(''), { signal });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.replace(/[\s\u200B-\u200D\uFEFF]+/gu, ' ').trim();
    if (!query) {
      input.setCustomValidity('Введите название компании или лота');
      input.reportValidity();
      input.focus();
      return;
    }
    state.query = query;
    state.category = 'all';
    app.querySelectorAll<HTMLInputElement>('input[name="q"]').forEach((field) => { field.value = query; field.setCustomValidity(''); });
    renderLots();
    scrollToLots();
    grid.focus({ preventScroll: true });
  }, { signal });
}

// Accessible arrow-key navigation in both segmented controls.
app.querySelectorAll<HTMLElement>('[role="tablist"]').forEach((tablist) => {
  tablist.addEventListener('keydown', (event) => {
    const buttons = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next]?.focus();
    buttons[next]?.click();
  }, { signal });
});

app.querySelectorAll<HTMLElement>('[data-capability]').forEach((card) => {
  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') activateCapability(card.dataset.capability!);
  }, { signal });
  card.addEventListener('focusin', () => activateCapability(card.dataset.capability!), { signal });
});
compactCapabilities.addEventListener('change', () => { syncCapabilityAccess(); setMobileMenu(false); }, { signal });

app.querySelectorAll<HTMLDetailsElement>('.dropdown').forEach((details) => {
  details.addEventListener('toggle', () => {
    if (details.open) app.querySelectorAll<HTMLDetailsElement>('.dropdown').forEach((other) => { if (other !== details) other.open = false; });
  }, { signal });
});
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('.dropdown')) app.querySelectorAll<HTMLDetailsElement>('.dropdown[open]').forEach((item) => { item.open = false; });
  if (!event.target.closest('.site-header')) setMobileMenu(false);
}, { signal });
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  app.querySelectorAll<HTMLDetailsElement>('.dropdown[open]').forEach((item) => { item.open = false; item.querySelector('summary')?.focus(); });
  if (header.classList.contains('menu-open')) { setMobileMenu(false); mobileMenuButton.focus(); }
}, { signal });
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}, { signal });
dialog.addEventListener('close', () => {
  document.body.classList.remove('has-dialog');
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  previousFocus = null;
}, { signal });
window.addEventListener('hashchange', checkHash, { signal });

const moscowClock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Moscow' });
const clockElements = [...app.querySelectorAll<HTMLTimeElement>('[data-moscow-clock]')];
function updateClock(): void {
  window.clearTimeout(clockTimeout);
  if (document.hidden) return;
  const now = new Date();
  const text = moscowClock.format(now);
  clockElements.forEach((clock) => { clock.textContent = text; clock.dateTime = now.toISOString(); });
  clockTimeout = window.setTimeout(updateClock, 1000 - now.getMilliseconds());
}
document.addEventListener('visibilitychange', updateClock, { signal });
function updateHeader(): void {
  scrollFrame = 0;
  header.classList.toggle('is-scrolled', window.scrollY > 70);
}
window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
}, { passive: true, signal });

renderLots(false);
syncCapabilityAccess();
updateClock();
updateHeader();
checkHash();

// Visual layers are independent: a graphics failure never blocks navigation or content.
for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
  try { cleanups.push(initDotField(host)); } catch { /* CSS dot field remains available. */ }
}
try { cleanups.push(initGlobe(select('#hero-globe'))); } catch { /* The atmospheric layer remains visible. */ }

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    abort.abort();
    cleanups.forEach((cleanup) => cleanup());
    window.clearTimeout(clockTimeout);
    window.clearTimeout(toastTimeout);
    cancelAnimationFrame(scrollFrame);
    document.body.classList.remove('has-dialog');
  });
}
