import { renderPage10Home } from './page10';
import { renderFooter, renderHeader } from './shell';
import { icon } from './ui';

/** The public website has one page. Supporting actions open inside this page. */
export function renderPage(): string {
  return `<a class="skip-link" href="#main" data-scroll="main">Перейти к содержимому</a>
    ${renderHeader(false)}
    <main id="main" tabindex="-1">${renderPage10Home()}</main>
    ${renderFooter()}
    <dialog class="dialog" id="detail-dialog" aria-labelledby="dialog-title"><button class="icon-button dialog__close" type="button" aria-label="Закрыть окно">${icon('close')}</button><div id="dialog-content"></div></dialog>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>`;
}
