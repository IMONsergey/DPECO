import { renderPage10Home } from './page10';
import { renderFooter, renderHeader } from './shell';
import { staticHomepageMarkup } from './homepage-lock';

/** The published review is a single homepage without outgoing destinations. */
export function renderPage(): string {
  return staticHomepageMarkup(`<button class="skip-link" type="button" data-skip-content>Перейти к содержимому</button>
    ${renderHeader(false)}
    <main id="main" tabindex="-1">${renderPage10Home()}</main>
    ${renderFooter()}
    <div class="toast" role="status" aria-live="polite" id="toast"></div>`);
}
