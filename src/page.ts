import { renderCapabilities } from './components/capabilities';
import { filterLots, lots } from './data/lots';
import { articles, renderJournalPage, renderSearchResults, searchSitePages } from './journal';
import { renderInfoPage } from './pages/info';
import { renderMarketPage } from './pages/market';
import { isDarkRoute, routeNames, type Route } from './routes';
import { renderEcosystem, renderFormats, renderJournalPreview, renderLotsSection, renderPartners, renderProcess, renderRequestForm, renderTrustBadges } from './sections';
import { renderFooter, renderHeader } from './shell';
import { asset, icon, rubles } from './ui';

function homePage(): string {
  return `
    <div class="intro">
      <section class="hero" id="top" aria-labelledby="hero-title">
        <div class="hero__dots" data-dots data-dots-color="#9de6dc" data-dots-opacity="0.15" data-dots-end-opacity="0.005" data-dots-spacing="19"></div>
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__globe" id="hero-globe" aria-hidden="true"></div>
        <div class="container hero__inner">
          <h1 id="hero-title">DEBTPRICE —<br>Крупнейшая платформа<br class="hero__line-break"> для продажи и покупки<br class="hero__line-break"> долговых активов</h1>
          <div class="hero__stats">
            <a class="stat stat--trading" href="#lots" data-scroll="lots">
              <span class="stat__value" data-auction-countdown>Расписание</span>
              <span class="stat__bottom"><span data-auction-label>Торги</span><span class="stat__arrow">${icon('arrow-up-right')}</span></span>
              <span class="stat__hint" data-auction-hint>Даты и условия торгов</span>
            </a>
            <div class="stat stat--members"><span class="stat__value">2100<span class="stat__plus">+</span></span><span class="stat__bottom">участников<br>рынка</span></div>
          </div>
          <div class="hero__actions">
            <a class="button button--primary" href="#request" data-scroll="request"><span>Продать долг</span>${icon('arrow-up-right')}</a>
            <a class="button button--white" href="#/buyers"><span>Купить долговые активы</span>${icon('arrow-right')}</a>
          </div>
          ${renderTrustBadges()}
          <a class="hero__scroll icon-button" href="#lots" data-scroll="lots" aria-label="Перейти к лотам">${icon('arrow-down')}</a>
        </div>
      </section>
      ${renderPartners()}
    </div>
    ${renderLotsSection()}
    <section class="offer-section" aria-labelledby="offer-title"><div class="container"><div class="offer">
      <div class="offer__dots" data-dots data-dots-color="#baffec" data-dots-opacity="0.22" data-dots-end-opacity="0.025" data-dots-spacing="17" data-dots-direction="right-to-left"></div>
      <img class="offer__image" src="${asset('images/offer-panels.webp')}" alt="Стеклянные портфели DEBTPRICE" width="1023" height="597" loading="lazy" decoding="async">
      <div class="offer__content"><h2 id="offer-title">Выберите подходящее <br>предложение</h2><p>Изучите биржу, чтобы посмотреть доступные лоты<br class="desktop-break"> и условия покупки.</p><a class="button button--white" href="#/buyers"><span>Выбрать предложение</span>${icon('arrow-right')}</a></div>
    </div></div></section>
    ${renderCapabilities()}
    ${renderFormats()}
    ${renderProcess('home')}
    ${renderRequestForm()}
    ${renderEcosystem()}
    ${renderJournalPreview()}
  `;
}

function bodyForRoute(route: Route): string {
  if (!route.path) return homePage();
  if (route.path === 'sellers/portfeli' || route.path === 'sellers/debitorka' || route.path === 'buyers') return renderMarketPage(route.path);
  if (route.path === 'about' || route.path === 'docs' || route.path === 'contacts') return renderInfoPage(route.path);
  if (route.path === 'journal') return renderJournalPage();
  if (route.path.startsWith('journal/')) return renderJournalPage(route.path.slice(8));
  if (route.path === 'request') return `<div class="request-page"><header class="container request-page__heading"><a class="breadcrumb" href="#/">Главная ${icon('arrow-right')}</a><h1>Следующий шаг —<br><span>ваша заявка</span></h1><p>Расскажите, что хотите продать или купить. Поможем определить дальнейшие действия.</p></header>${renderRequestForm()}</div>`;
  if (route.path === 'search') {
    const query = (route.query.get('q') ?? '').trim().slice(0, 120);
    const result = searchSitePages(query);
    if (query) result.push(...filterLots(lots, 'all', query).map((lot) => ({ title: lot.name, description: `${lot.cases.toLocaleString('ru-RU')} кейсов · Общая сумма ${rubles(lot.debt)} · ${lot.dateLabel}: ${lot.date}`, href: `#/?lot=${lot.id}`, label: lot.category === 'receivables' ? 'Лот · Дебиторская задолженность' : 'Лот · Портфель физических лиц' })));
    return renderSearchResults(query, result);
  }
  return `<section class="simple-page container"><span class="eyebrow">404</span><h1>Страница не найдена</h1><p>Выберите нужный раздел в меню или вернитесь на главную.</p><a class="button button--primary" href="#/">На главную ${icon('arrow-left')}</a></section>`;
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
