import { renderCapabilities } from './components/capabilities';
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
  return `
    <div class="intro intro--home">
      <section class="hero hero--home" id="top" aria-labelledby="hero-title">
        <div class="hero__dots" data-dots data-dots-color="#9de6dc" data-dots-opacity="0.15" data-dots-end-opacity="0.005" data-dots-spacing="19"></div>
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__globe" id="hero-globe" aria-hidden="true"></div>
        <div class="container hero__inner hero-home__inner">
          <div class="hero-home__lead">
            <div class="hero-home__eyebrow" data-reveal><span class="hero-home__eyebrow-mark"></span>DEBTPRICE / ЭЛЕКТРОННАЯ ТОРГОВАЯ ПЛОЩАДКА</div>
            <h1 id="hero-title" data-text-reveal>Продажа и покупка<br> <span>долговых активов.</span></h1>
            <p class="hero-home__description" data-reveal>Размещайте права требования, выбирайте долговые портфели и&nbsp;проводите сделки на&nbsp;специализированной торговой площадке.</p>
          </div>
          <div class="hero-home__roles" data-stagger aria-label="Основные сценарии площадки">
            <article class="hero-role hero-role--seller">
              <div class="hero-role__top"><span>01 / ПРОДАВЦУ</span>${icon('arrow-up-right')}</div>
              <div><h2>Продать долг</h2><p>Подберите формат размещения под тип актива.</p></div>
              <div class="hero-role__links">
                <a href="#/sellers/portfeli"><span>Долговые портфели</span>${icon('arrow-up-right')}</a>
                <a href="#/sellers/debitorka"><span>Дебиторская задолженность</span>${icon('arrow-up-right')}</a>
              </div>
            </article>
            <article class="hero-role hero-role--buyer">
              <div class="hero-role__top"><span>02 / ПОКУПАТЕЛЮ</span>${icon('arrow-up-right')}</div>
              <div><h2>Купить актив</h2><p>Выбирайте лоты и участвуйте в торгах на ЭТП.</p></div>
              <a href="${accountUrl}" class="hero-role__primary-link"><span>Участвовать в торгах</span>${icon('arrow-up-right')}</a>
            </article>
          </div>
          <div class="hero-home__foot" data-reveal>
            <span>АУКЦИОНЫ · ПОРТФЕЛИ · ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ</span>
            <a href="#lots" data-scroll="lots"><span>Расписание торгов</span>${icon('arrow-down')}</a>
          </div>
        </div>
      </section>
    </div>
    ${renderLotsSection()}
    ${renderPartners(true)}
    ${renderCapabilities()}
    ${renderFormats()}
    ${renderProcess('home')}
    ${renderRequestForm('portfolio')}
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
