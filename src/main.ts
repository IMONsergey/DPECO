import './styles.css';
import { mountCapabilities } from './components/capabilities';
import { initDotField, initGlobe } from './effects';
import { mountRequestForms } from './forms';
import { mountHomepageLock, approvedNavigation } from './homepage-lock';
import { mountTabs } from './interactions';
import { mountNavigation } from './navigation';
import { renderPage, type ClientPage } from './page';
import { mountPageMotion } from './page-motion';
import { mountHomeAuctions } from './page10';
import { mountPage10Sections } from './page10-sections';
import { mountTheme } from './theme';
import { mountLiveSearch } from './live-search';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Page root is missing.');
const app: HTMLElement = root;
let cleanups: (() => void)[] = [];
let currentPage: ClientPage | undefined;
let mounted = false;
let toastTimeout = 0;
const routes = new Set<ClientPage>(['about', 'contacts', 'privacy']);
const homeSections = new Set(['top', 'lots', 'sell-buy', 'capabilities', 'formats', 'process', 'request', 'ecosystem', 'materials']);

function selectedPage(): ClientPage | undefined {
  const path = location.hash.replace(/^#\//u, '').replace(/\/$/u, '') as ClientPage;
  return location.hash.startsWith('#/') && routes.has(path) ? path : undefined;
}
function notify(text: string): void {
  const toast = app.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  window.clearTimeout(toastTimeout);
  toast.textContent = text;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
}
function scrollToDestination(): void {
  const section = location.hash.slice(1) || 'top';
  if (currentPage || !homeSections.has(section)) return;
  const target = section === 'top' ? app.querySelector<HTMLElement>('#main') : app.querySelector<HTMLElement>(`#${section}`);
  if (!target) return;
  if (section === 'top') window.scrollTo({ top: 0, behavior: 'instant' });
  else {
    const headerHeight = app.querySelector<HTMLElement>('#site-header')?.offsetHeight ?? 0;
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerHeight - 20);
    window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  if (section === 'request') {
    const heading = target.querySelector<HTMLElement>('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }
}
function mount(): void {
  const next = selectedPage();
  if (mounted && next === currentPage) { scrollToDestination(); return; }
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  window.clearTimeout(toastTimeout);
  document.body.classList.remove('has-dialog', 'has-menu');
  currentPage = next;
  mounted = true;
  app.innerHTML = renderPage(currentPage);
  const titles = { about: 'О проекте', contacts: 'Контакты', privacy: 'Политика конфиденциальности' };
  document.title = currentPage ? `${titles[currentPage]} | DEBTPRICE` : 'DEBTPRICE — платформа долговых активов';
  const navigation = mountNavigation(app, currentPage ?? '');
  cleanups.push(mountHomepageLock(app), navigation.destroy, mountTheme(app), mountRequestForms(app, notify), mountLiveSearch(app));
  if (!currentPage) {
    cleanups.push(mountHomeAuctions(app), mountPage10Sections(app), mountCapabilities(app), mountTabs(app));
    for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
      try { cleanups.push(initDotField(host)); } catch { /* Decoration must not block content. */ }
    }
    const globe = app.querySelector<HTMLElement>('#hero-globe');
    if (globe) {
      try { cleanups.push(initGlobe(globe)); } catch { /* The CSS illustration remains visible. */ }
    }
  }
  cleanups.push(mountPageMotion(app, false));
  window.scrollTo({ top: 0, behavior: 'instant' });
  requestAnimationFrame(() => {
    if (currentPage) app.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    else scrollToDestination();
  });
}
const routeAbort = new AbortController();
app.addEventListener('click', (event) => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a') : null;
  const href = link?.getAttribute('href');
  if (!link || !href?.startsWith('#') || !approvedNavigation(link)) return;
  event.preventDefault();
  if (location.hash === href) mount();
  else location.hash = href;
}, { signal: routeAbort.signal });
window.addEventListener('hashchange', mount, { signal: routeAbort.signal });
mount();

if (import.meta.hot) import.meta.hot.dispose(() => {
  cleanups.forEach((cleanup) => cleanup());
  routeAbort.abort();
  window.clearTimeout(toastTimeout);
  document.body.classList.remove('has-dialog', 'has-menu');
  document.documentElement.classList.remove('p10-modal-open');
});
