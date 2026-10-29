import { accountUrl, asset, icon, registerUrl, type IconName } from './ui';

export type Audience = 'seller' | 'buyer';

export const capabilities: readonly {
  id: string;
  title: string;
  image: string;
  icon: IconName;
  description: Record<Audience, string>;
  detail: Record<Audience, string>;
}[] = [
  {
    id: 'credit', title: 'Кредитные портфели', image: 'credit-portfolios.webp', icon: 'briefcase',
    description: { seller: 'Портфели кредитов физических и юридических лиц', buyer: 'Кредитные портфели с подходящими параметрами' },
    detail: { seller: 'Представьте кредитный портфель участникам площадки. Состав, документы и условия продажи размещаются в личном кабинете.', buyer: 'Изучите состав портфеля, количество кейсов и условия торгов в личном кабинете площадки.' },
  },
  {
    id: 'factoring', title: 'Факторинговые портфели', image: 'factoring-portfolios.webp', icon: 'folders',
    description: { seller: 'Уступленная дебиторка по договорам факторинга', buyer: 'Портфели по договорам факторинга' },
    detail: { seller: 'Разместите портфель уступленной дебиторской задолженности по договорам факторинга и определите условия продажи.', buyer: 'Ознакомьтесь с документами, составом и условиями приобретения факторингового портфеля в личном кабинете.' },
  },
  {
    id: 'receivables', title: 'Дебиторская задолженность', image: 'receivables.webp', icon: 'coins',
    description: { seller: 'Задолженность компаний по вашим договорам', buyer: 'Долговые обязательства юридических лиц' },
    detail: { seller: 'Выберите состав задолженности для продажи. В карточке лота можно указать сумму, статус и период сбора предложений.', buyer: 'Сравните предложения по общей сумме задолженности, статусу и количеству кейсов. Уточните документы и условия в личном кабинете.' },
  },
  {
    id: 'claims', title: 'Права требования', image: 'claims.webp', icon: 'users',
    description: { seller: 'Права требования к физическим и юридическим лицам', buyer: 'Отдельные требования и готовые портфели' },
    detail: { seller: 'Представьте права требования участникам площадки. Условия уступки и необходимые документы определяются для каждого лота.', buyer: 'Изучите предложение и документы, подтверждающие право требования. Дальнейшие действия доступны в личном кабинете.' },
  },
];

const partners = [
  ['fasp', 'ФАСП'], ['pkb', 'ПКБ'], ['inkas-collect', 'Инкас Коллект'],
  ['legal-collection', 'Legal Collection'], ['express-collection', 'Express Collection'],
  ['sit', 'СИТ Коллектор'], ['skm', 'СКМ'], ['trust', 'ТРАСТ'],
] as const;

function partnerGroup(duplicate = false): string {
  return `<div class="partners__group" ${duplicate ? 'aria-hidden="true"' : ''}>${partners.map(([file, name]) => `
    <div class="partner"><img src="${asset(`partners/${file}.webp`)}" alt="" width="130" height="46" loading="eager" decoding="async"><span>${name}</span></div>
  `).join('')}</div>`;
}

function dropdown(label: string, content: string): string {
  return `<details class="dropdown"><summary>${label}${icon('chevron-down')}</summary><div class="dropdown__panel">${content}</div></details>`;
}

export function capabilityCards(audience: Audience): string {
  return capabilities.map((item, index) => `
    <article class="capability${index === 1 ? ' is-active' : ''}" data-capability="${item.id}">
      <img class="capability__image" src="${asset(`images/${item.image}`)}" alt="" width="${index === 1 ? '858' : '570'}" height="${index === 1 ? '734' : '488'}" loading="lazy" decoding="async">
      <span class="capability__number" aria-hidden="true">0${index + 1}</span>
      <div class="capability__content">
        <span class="capability__icon">${icon(item.icon)}</span>
        <h3><button type="button" class="capability__title" data-expand-capability="${item.id}" aria-expanded="${index === 1}" aria-controls="capability-body-${item.id}">${item.title}</button></h3>
        <div class="capability__body" id="capability-body-${item.id}" ${index !== 1 ? 'inert' : ''}>
          <div class="capability__body-inner"><p data-capability-description="${item.id}">${item.description[audience]}</p>
          <button class="button button--primary capability__button" type="button" data-detail="${item.id}"><span>Смотреть подробнее</span>${icon('arrow-right')}</button></div>
        </div>
      </div>
    </article>
  `).join('');
}

export function renderPage(): string {
  return `
    <a class="skip-link" href="#main">Перейти к содержимому</a>
    <header class="site-header" id="site-header">
      <div class="container header__top">
        <a class="brand" href="#top" aria-label="DEBTPRICE — на главную">
          <img src="${asset('brand/debtprice.svg')}" alt="DEBTPRICE" width="120" height="28">
          <span class="brand__description">Аукцион<br>долговых активов</span>
        </a>
        <div class="header__contacts">
          <a href="tel:+79159724101">${icon('phone')}<span>+7 915 972 41 01</span></a>
          <a href="mailto:v@debtprice.market">${icon('mail')}<span>v@debtprice.market</span></a>
        </div>
        <a class="header__trading" href="#lots" aria-label="Перейти к лотам. На часах московское время">${icon('clock')}<span>Торги</span><span class="header__trading-divider">·</span><time data-moscow-clock aria-label="Московское время">--:--:--</time></a>
        <div class="header__actions">
          <button class="button button--primary button--small" type="button" data-contact="Заявка на участие" aria-label="Оставить заявку"><span class="header__request-full">Оставить заявку</span><span class="header__request-short" aria-hidden="true">Заявка</span>${icon('arrow-right')}</button>
          <a class="button button--dark button--small header__login" href="${accountUrl}">Войти</a>
          <a class="button button--white button--small header__register" href="${registerUrl}"><span>Регистрация</span>${icon('login')}</a>
        </div>
        <button class="icon-button header__menu" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-menu" type="button">${icon('menu')}</button>
      </div>
      <div class="container header__bottom">
        ${dropdown(`${icon('grid')}<span>Экосистема</span>`, `<a href="#capabilities">${icon('grid')}<span>Возможности платформы<small>Все виды долговых активов</small></span></a><a href="#lots">${icon('briefcase')}<span>Биржа долговых активов<small>Предложения и портфели</small></span></a><button type="button" data-contact="Партнёрство">${icon('users')}<span>Партнёрам<small>Развивайте бизнес вместе с нами</small></span></button>`)}
        <form class="search" role="search" id="search-form">
          <label class="sr-only" for="site-search">Найти лот</label>
          <input id="site-search" name="q" type="search" placeholder="Найдите всё, что искали" autocomplete="off" maxlength="120" required>
          <button type="submit" aria-label="Найти лот">${icon('search')}</button>
        </form>
        <nav class="header__nav" aria-label="Основная навигация">
          ${dropdown('<span>Продавцам</span>', '<a href="#capabilities" data-audience-link="seller">Возможности платформы</a><button type="button" data-contact="Продать долг">Разместить портфель</button>')}
          ${dropdown('<span>Покупателям</span>', '<a href="#lots">Активные лоты</a><a href="#capabilities" data-audience-link="buyer">Виды долговых активов</a>')}
          ${dropdown('<span>Инвестору</span>', '<a href="#lots">Выбрать предложение</a><button type="button" data-contact="Сотрудничество">Обсудить сотрудничество</button>')}
          <a href="#lots" data-filter-link="receivables">Дебиторская задолженность</a>
          <button type="button" data-about>О проекте</button>
          <button type="button" data-contact="Контакты">Контакты</button>
        </nav>
      </div>
      <nav class="mobile-menu" id="mobile-menu" aria-label="Мобильная навигация" inert>
        <form class="search mobile-search" role="search" id="mobile-search-form"><label class="sr-only" for="mobile-site-search">Найти лот</label><input id="mobile-site-search" name="q" type="search" placeholder="Найдите всё, что искали" autocomplete="off" maxlength="120" required><button type="submit" aria-label="Найти лот">${icon('search')}</button></form>
        <a href="#lots">Активные лоты ${icon('arrow-up-right')}</a>
        <a href="#capabilities" data-audience-link="seller">Продавцам ${icon('arrow-up-right')}</a>
        <a href="#capabilities" data-audience-link="buyer">Покупателям ${icon('arrow-up-right')}</a>
        <button type="button" data-about>О проекте ${icon('arrow-up-right')}</button>
        <button type="button" data-contact="Контакты">Контакты ${icon('arrow-up-right')}</button>
        <div class="mobile-menu__actions"><a class="button button--white" href="${accountUrl}">Войти в кабинет ${icon('login')}</a><a class="button button--primary" href="${registerUrl}">Регистрация ${icon('arrow-right')}</a></div>
      </nav>
    </header>
    <main id="main">
      <div class="intro">
      <section class="hero" id="top" aria-labelledby="hero-title">
        <div class="hero__dots" data-dots data-dots-color="#9de6dc" data-dots-opacity="0.15" data-dots-end-opacity="0.005" data-dots-spacing="17"></div>
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__globe" id="hero-globe"></div>
        <div class="container hero__inner">
          <h1 id="hero-title">DEBTPRICE —<br>Крупнейшая платформа<br class="hero__line-break"> для продажи и покупки<br class="hero__line-break"> долговых активов</h1>
          <div class="hero__stats">
            <a class="stat stat--trading" href="#lots" aria-label="Посмотреть торги. Часы показывают московское время">
              <time class="stat__value" data-moscow-clock aria-label="Московское время">--:--:--</time>
              <span class="stat__bottom"><span>Торги</span><span class="stat__arrow">${icon('arrow-up-right')}</span></span>
              <span class="stat__hint">Московское время</span>
            </a>
            <div class="stat stat--members"><span class="stat__value">2100<span class="stat__plus">+</span></span><span class="stat__bottom">участников<br>рынка</span></div>
          </div>
          <div class="hero__actions">
            <button class="button button--primary" type="button" data-contact="Продать долг"><span>Продать долг</span>${icon('arrow-up')}</button>
            <a class="button button--white" href="#lots"><span>Купить долговые активы</span>${icon('arrow-down')}</a>
          </div>
          <a class="hero__scroll icon-button" href="#lots" aria-label="Перейти к активным лотам">${icon('arrow-down')}</a>
        </div>
      </section>
      <section class="partners" aria-labelledby="partners-title">
        <div class="container partners__heading"><h2 id="partners-title">Наши партнёры</h2><p>во всех регионах России и ещё более <span>500 компаний</span></p></div>
        <div class="partners__marquee" role="region" aria-label="Партнёры DEBTPRICE"><div class="partners__track">${partnerGroup()}${partnerGroup(true)}</div></div>
      </section>
      </div>
      <section class="lots section" id="lots" aria-labelledby="lots-title">
        <div class="lots__dots" data-dots data-dots-color="#17aca6" data-dots-opacity="0.25" data-dots-end-opacity="0" data-dots-spacing="17"></div>
        <div class="container section__content">
          <h2 class="section-title" id="lots-title"><span>Активные</span> лоты</h2>
          <div class="lots__toolbar">
            <div class="segmented lot-filters" role="tablist" aria-label="Виды лотов">
              <button type="button" role="tab" id="filter-all" aria-selected="true" aria-controls="lots-grid" data-filter="all">Все лоты</button>
              <button type="button" role="tab" id="filter-receivables" aria-selected="false" aria-controls="lots-grid" tabindex="-1" data-filter="receivables">Дебиторская задолженность</button>
              <button type="button" role="tab" id="filter-individuals" aria-selected="false" aria-controls="lots-grid" tabindex="-1" data-filter="individuals">Портфели физ. лиц</button>
            </div>
            <a class="button button--primary lots__account" href="${accountUrl}"><span>Войти в кабинет</span>${icon('login')}</a>
          </div>
          <div class="search-result" id="search-result" hidden><p></p><button type="button" id="clear-search">Сбросить поиск ${icon('close')}</button></div>
          <p class="sr-only" id="lots-announcement" role="status" aria-live="polite" aria-atomic="true"></p>
          <div class="lots__stage"><div class="lots__grid" id="lots-grid" role="tabpanel" aria-labelledby="filter-all" tabindex="0"></div></div>
        </div>
      </section>
      <section class="offer-section" aria-labelledby="offer-title">
        <div class="container">
          <div class="offer">
            <div class="offer__dots" data-dots data-dots-color="#baffec" data-dots-opacity="0.22" data-dots-end-opacity="0.025" data-dots-spacing="15" data-dots-direction="right-to-left"></div>
            <img class="offer__image" src="${asset('images/offer-panels.webp')}" alt="Стеклянные портфели DEBTPRICE" width="1023" height="597" loading="lazy" decoding="async">
            <div class="offer__content"><h2 id="offer-title">Выберите подходящее <br>предложение</h2><p>Изучите биржу, чтобы посмотреть доступные лоты<br class="desktop-break"> и условия покупки.</p><a class="button button--white" href="#lots"><span>Смотреть подробнее</span>${icon('arrow-right')}</a></div>
          </div>
        </div>
      </section>
      <section class="capabilities section" id="capabilities" aria-labelledby="capabilities-title">
        <div class="capabilities__dots" data-dots data-dots-color="#0eaaa4" data-dots-opacity="0.01" data-dots-end-opacity="0.25" data-dots-spacing="17"></div>
        <div class="container section__content">
          <h2 class="section-title" id="capabilities-title"><span>Возможности</span> платформы</h2>
          <div class="capabilities__heading"><p>Какие долговые активы можно<br>продать и купить на бирже</p><div class="segmented audience" role="tablist" aria-label="Ваша роль"><button id="audience-seller" type="button" role="tab" aria-selected="true" aria-controls="capability-grid" data-audience="seller">Продавцу</button><button id="audience-buyer" type="button" role="tab" aria-selected="false" aria-controls="capability-grid" tabindex="-1" data-audience="buyer">Покупателю</button></div></div>
          <div class="capabilities__grid" id="capability-grid" role="tabpanel" aria-labelledby="audience-seller">${capabilityCards('seller')}</div>
        </div>
      </section>
    </main>
    <footer class="site-footer"><div class="container footer__inner"><a class="footer__brand" href="#top" aria-label="DEBTPRICE — на главную"><img src="${asset('brand/debtprice.svg')}" alt="DEBTPRICE" width="120" height="28"></a><span>Аукцион долговых активов</span><div><a href="mailto:v@debtprice.market">v@debtprice.market</a><a href="tel:+79159724101">+7 915 972 41 01</a></div><a class="footer__top" href="#top" aria-label="Вернуться наверх">${icon('arrow-up')}</a></div></footer>
    <dialog class="dialog" id="detail-dialog" aria-labelledby="dialog-title"><button class="icon-button dialog__close" type="button" aria-label="Закрыть окно">${icon('close')}</button><div id="dialog-content"></div></dialog>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>
  `;
}
