import { renderPage10Home } from './page10';
import { renderFooter, renderHeader } from './shell';
import { staticHomepageMarkup } from './homepage-lock';
import { renderInfoPage } from './pages/info';

export type ClientPage = 'about' | 'contacts' | 'privacy';

/** Publish only the homepage and the information pages requested by the client. */
export function renderPage(route?: ClientPage): string {
  return staticHomepageMarkup(`<button class="skip-link" type="button" data-skip-content>Перейти к содержимому</button>
    ${renderHeader(Boolean(route))}
    <main id="main" tabindex="-1">${route ? renderInfoPage(route) : renderPage10Home()}</main>
    ${renderFooter()}
    <div class="toast" role="status" aria-live="polite" id="toast"></div>`);
}
