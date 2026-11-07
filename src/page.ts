import { renderCinematicHome } from './alternative-cinematic';
import './alternative-cinematic.css';
import { filterLots, lots } from './data/lots';
import { articles, renderJournalPage, renderSearchResults, searchSitePages } from './journal';
import { renderInfoPage } from './pages/info';
import { renderMarketPage } from './pages/market';
import { isDarkRoute, routeNames, type Route } from './routes';
import { renderEcosystem, renderFormats, renderJournalPreview, renderLotsSection, renderPartners, renderProcess, renderRequestForm } from './sections';
import { renderFooter, renderHeader } from './shell';
import { accountUrl, icon, rubles } from './ui';
import './home-redesign.css';

function homePage(): string {
  return renderCinematicHome();
}

function bodyForRoute(route: Route): string {
  if (!route.path) return homePage();
  if (route.path === 'sellers/portfeli' || route.path === 'sellers/debitorka' || route.path === 'buyers') return renderMarketPage(route.path);
  if (route.path === 'about' || route.path === 'docs' || route.path === 'contacts') return renderInfoPage(route.path);
  if (route.path === 'journal') return renderJournalPage();
  if (route.path.startsWith('journal/')) return renderJournalPage(route.path.slice(8));
  if (route.path === 'request') return `<div class="request-page">${renderRequestForm('general', 'request', true)}</div>`;
  if (route.path === 'search') {
    const query = (route.query.get('q') ?? '').trim().slice(0, 120);
    const result = searchSitePages(query);
    if (query) result.push(...filterLots(lots, 'all', query).map((lot) => ({ title: lot.name, description: `${lot.cases.toLocaleString('ru-RU')} кейсов · Общая сумма ${rubles(lot.debt)} · ${lot.dateLabel}: ${lot.date}`, href: `#/?lot=${lot.id}`, label: lot.category === 'receivables' ? 'Лот · Дебиторская задолженность' : 'Лот · Портфель физических лиц' })));
    return renderSearchResults(query, result);
  }
  return `<section class="simple-page container"><h1>Страница не найдена</h1><p>Выберите нужный раздел в меню или вернитесь на главную.</p><a class="button button--primary" href="#/">На главную ${icon('arrow-left')}</a></section>`;
}

export function pageTitle(route: Route): string {
  const article = articles.find((item) => route.path === `journal/${item.slug}`);
  return `${article?.title ?? routeNames[route.path] ?? 'Страница не найдена'} — DEBTPRICE`;
}

export function renderPage(route: Route): string {
  return `<a class="skip-link" href="#main" data-scroll="main">Перейти к содержимому</a>
    ${renderHeader(!isDarkRoute(route))}
    <main id="main" tabindex="-1">${bodyForRoute(route)}</main>
    ${renderFooter()}
    <dialog class="dialog" id="detail-dialog" aria-labelledby="dialog-title"><button class="icon-button dialog__close" type="button" aria-label="Закрыть окно">${icon('close')}</button><div id="dialog-content"></div></dialog>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>`;
}
