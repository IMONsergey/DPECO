import './styles.css';
import { mountCapabilities } from './components/capabilities';
import { initDotField, initGlobe } from './effects';
import { mountRequestForms } from './forms';
import { mountHomepageLock } from './homepage-lock';
import { mountTabs } from './interactions';
import { mountNavigation } from './navigation';
import { renderPage } from './page';
import { mountPageMotion } from './page-motion';
import { mountHomeAuctions } from './page10';
import { mountPage10Sections } from './page10-sections';
import { mountTheme } from './theme';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Page root is missing.');
const app: HTMLElement = root;
app.innerHTML = renderPage();
document.title = 'DEBTPRICE — платформа долговых активов';

// The page is mounted once. No router, addressable dialogs, link navigation,
// history interception or secondary-page renderer is loaded in this release.
const cleanups = [mountHomepageLock(app)];
const navigation = mountNavigation(app, '');
cleanups.push(navigation.destroy, mountTheme(app), mountHomeAuctions(app), mountPage10Sections(app), mountCapabilities(app), mountTabs(app));

const toast = app.querySelector<HTMLElement>('#toast');
let toastTimeout = 0;
function notify(text: string): void {
  if (!toast) return;
  window.clearTimeout(toastTimeout);
  toast.textContent = text;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
}
cleanups.push(mountRequestForms(app, notify));

for (const host of app.querySelectorAll<HTMLElement>('[data-dots]')) {
  try { cleanups.push(initDotField(host)); } catch { /* Content remains readable without decorative effects. */ }
}
const globe = app.querySelector<HTMLElement>('#hero-globe');
if (globe) {
  try { cleanups.push(initGlobe(globe)); } catch { /* The CSS illustration remains visible. */ }
}
cleanups.push(mountPageMotion(app, false));

if (import.meta.hot) import.meta.hot.dispose(() => {
  cleanups.forEach((cleanup) => cleanup());
  window.clearTimeout(toastTimeout);
  document.body.classList.remove('has-dialog', 'has-menu');
  document.documentElement.classList.remove('p10-modal-open');
});
