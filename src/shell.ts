import './shell.css';
import { accountUrl, asset, escapeHtml, icon, registerUrl, telegramUrl, type IconName } from './ui';
import { ecosystem } from './sections';
const phone = '+7 915 972 41 01';
const email = 'v@debtprice.market';

type NavigationEntry = { href: string; title: string; description: string; requestKind?: 'portfolio' | 'receivables' | 'buyer'; lotsCategory?: 'all' | 'individuals' | 'receivables' };

const sellerLinks: readonly NavigationEntry[] = [
  { href: '#request?kind=portfolio', title: 'Портфели физических лиц', description: 'Оценка, подготовка и продажа портфеля', requestKind: 'portfolio' },
  { href: '#request?kind=receivables', title: 'Дебиторская задолженность', description: 'Продажа долгов юридических лиц', requestKind: 'receivables' },
];

const investorLinks: readonly NavigationEntry[] = [
  { href: '#lots?category=all&period=upcoming', title: 'Покупка долговых активов', description: 'Расписание и условия торгов', lotsCategory: 'all' },
  { href: '#request?kind=buyer', title: 'Инвестиционное направление', description: 'Обсудить задачу с командой', requestKind: 'buyer' },
];

const ecosystemDescriptions: Record<string, string> = {
  DEBTPRICE: 'Торговая площадка долговых активов. Продавайте и покупайте по цене рынка.',
  'Рынок Взыскания': 'Новости и тренды долгового рынка, аналитика, судебная практика и интервью с ключевыми игроками.',
  'Навигатор решений': 'Каталог технологий для работы с долгом: от скоринга до банкротства.',
  'DEBT TECH': 'Соорганизуем встречи банков, МФО, ПКО, инвесторов и электронных торговых площадок на одной площадке.',
  'DOLG TALK': 'Соорганизуем встречи банков, МФО, ПКО, инвесторов и электронных торговых площадок на одной площадке.',
  'ПКО-300': 'Рейтинг коллекторских агентств по данным Федеральной налоговой службы.',
};
const footerEcosystemOrder = ['DEBTPRICE', 'Рынок Взыскания', 'ПКО-300', 'Навигатор решений', 'DEBT TECH', 'DOLG TALK'];

function chevronRight(className = ''): string {
  return `<svg class="icon icon--chevron-right ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
}

function externalAttributes(href: string): string {
  return href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function navigationPanel(entries: readonly NavigationEntry[]): string {
  return entries.map((entry) => `<a class="nav-panel__link nav-panel__link--plain" href="${escapeHtml(entry.href)}"${entry.requestKind ? ` data-request-kind="${entry.requestKind}"` : ''}${entry.lotsCategory ? ` data-lots-category="${entry.lotsCategory}" data-lots-period="upcoming"` : ''}><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.description)}</small></span>${chevronRight('nav-panel__arrow')}</a>`).join('');
}

function dropdown(id: string, label: string, content: string, extraClass = '', prefixIcon?: IconName): string {
  return `<div class="nav-dropdown ${extraClass}" data-nav-id="${id}"><button class="header__nav-control header__nav-toggle" type="button"${id === 'sellers' || id === 'invest' ? ' data-availability="development"' : ''} data-nav-toggle="${id}" aria-expanded="false" aria-controls="nav-panel-${id}">${prefixIcon ? icon(prefixIcon) : ''}<span>${label}</span>${icon('chevron-down', 'header__nav-chevron')}</button><div class="nav-panel${id === 'ecosystem' ? ' nav-panel--ecosystem' : ''}" id="nav-panel-${id}" inert aria-hidden="true">${content}</div></div>`;
}

function ecosystemPanel(): string {
  return `<div class="nav-panel__ecosystem-grid">${ecosystem.map((item, index) => `<div class="nav-panel__ecosystem-item" data-ecosystem-item><a class="nav-panel__link" href="${item.href}"${externalAttributes(item.href)} aria-describedby="ecosystem-tip-${index}"><span class="nav-panel__icon">${icon(item.icon)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.label)}</small></span>${chevronRight('nav-panel__arrow')}<span class="sr-only"> — в новой вкладке</span></a><span class="nav-panel__tooltip" id="ecosystem-tip-${index}" role="tooltip">${escapeHtml(ecosystemDescriptions[item.name] ?? item.text)}</span></div>`).join('')}</div>`;
}

function siteSearch(id: string, mobile = false): string {
  return `<form class="header__search${mobile ? ' header__search--mobile' : ''}" role="search" data-site-search><label class="sr-only" for="${id}">Поиск по сайту DEBTPRICE</label><input id="${id}" name="q" type="search" maxlength="120" placeholder="Найти на сайте" autocomplete="off" enterkeyhint="search"><button type="submit" aria-label="Найти на сайте">${icon('search')}</button></form>`;
}

function themeToggle(mobile = false): string {
  return `<button type="button" class="theme-toggle${mobile ? ' p10-mobile-theme' : ''}" data-theme-toggle aria-label="Включить темную тему"><svg class="theme-toggle__sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg><svg class="theme-toggle__moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg></button>`;
}

function footerMessengers(): string {
  // Telegram and WhatsApp: Bootstrap Icons (MIT), github.com/twbs/icons/tree/main/icons.
  // MAX symbol: the official brandbook, https://go.max.ru/brandbook.
  const marks = [
    { name: 'Telegram', viewBox: '0 0 16 16', path: 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09' },
    { name: 'MAX', viewBox: '0 0 100 100', path: 'M50.76 0c27.53 0 49.12 22.34 49.12 49.89S77.61 99.23 51.02 99.23c-9.43 0-14.01-1.33-21.37-6.54-.5-.36-1.2-.26-1.63.19-5.66 6.04-20.17 10.28-20.83 2.03C7.19 80.53 0 71.18 0 49.61 0 21.3 23.22 0 50.76 0m.77 24.55c-13.07-.68-23.26 8.39-25.51 22.58-1.86 11.75 1.44 26.07 4.26 26.8 1.2.3 4.08-1.9 6.18-3.88.4-.37.99-.44 1.45-.15 3.27 2 6.97 3.5 11.05 3.71 13.42.7 25.3-9.8 26-23.21.71-13.42-10.01-25.14-23.43-25.85', evenodd: true },
    { name: 'WhatsApp', viewBox: '0 0 16 16', path: 'M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232' },
  ];
  return `<div class="p10-footer__socials" role="group" aria-label="Мессенджеры">${marks.map((mark) => `<span class="p10-footer__social-icon" role="img" aria-label="${mark.name}" title="${mark.name}"><svg width="24" height="24" viewBox="${mark.viewBox}" fill="currentColor" aria-hidden="true"><path${mark.evenodd ? ' fill-rule="evenodd" clip-rule="evenodd"' : ''} d="${mark.path}"/></svg></span>`).join('')}</div>`;
}

function renderMobileMenu(): string {
  return `<div class="header__mobile-menu" id="mobile-menu" inert aria-hidden="true"><div class="container header__mobile-inner">
    <div class="header__mobile-appearance"><span>Оформление сайта</span>${themeToggle(true)}</div>
    ${siteSearch('mobile-search', true)}
    <nav class="header__mobile-nav" aria-label="Мобильная навигация">
      <div class="header__mobile-group"><h2>Продавцам</h2>${sellerLinks.map((entry) => `<a class="header__mobile-link" href="${entry.href}"${entry.requestKind ? ` data-request-kind="${entry.requestKind}"` : ''}><span>${entry.title}</span>${chevronRight()}</a>`).join('')}</div>
      <div class="header__mobile-group"><h2>Площадка</h2><a class="header__mobile-link" href="#lots?category=all&amp;period=upcoming" data-lots-category="all" data-lots-period="upcoming"><span>Покупателям</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#request?kind=buyer" data-request-kind="buyer"><span>Инвестору</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#process"><span>О проекте</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#request"><span>Контакты</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#formats"><span>Форматы торгов</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#documents" data-open-documents><span>Документы</span>${icon('arrow-up-right')}</a></div>
      <div class="header__mobile-group header__mobile-group--ecosystem"><h2>Экосистема</h2><div class="header__mobile-products">${ecosystem.map((item, index) => `<a class="header__mobile-product" href="${item.href}"${externalAttributes(item.href)} aria-describedby="mobile-ecosystem-description-${index}">${icon(item.icon)}<span class="header__mobile-product-copy"><strong>${escapeHtml(item.name)}</strong><small id="mobile-ecosystem-description-${index}">${escapeHtml(ecosystemDescriptions[item.name] ?? item.text)}</small></span>${chevronRight()}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div></div>
    </nav>
    <div class="header__mobile-actions"><a class="button button--primary" href="#request">Оставить заявку ${icon('arrow-right')}</a><a class="button button--dark" href="${accountUrl}">Личный кабинет ${icon('login')}</a><a class="header__mobile-register" href="${registerUrl}">Зарегистрироваться ${icon('arrow-up-right')}</a></div>
    <div class="header__mobile-contacts"><a href="tel:+79159724101">${icon('phone')}${phone}</a><a href="mailto:${email}">${icon('mail')}${email}</a><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}Лоты в Telegram<span class="sr-only"> — в новой вкладке</span></a></div>
  </div></div>`;
}

export function renderHeader(light: boolean): string {
  return `<header class="site-header p10-header${light ? ' is-light' : ''}" id="site-header">
    <div class="container header__content">
      <div class="header__top">
        <a class="header__brand" href="#top" data-scroll="top" aria-label="DEBTPRICE: в начало страницы"><span class="p10-brand-mark"><img class="p10-brand-logo" src="${asset('brand/debtprice-logo-20261112.svg')}" alt="DEBTPRICE" width="560" height="129"></span><span class="header__brand-description">Аукцион<br>долговых активов</span></a>
        <div class="header__contacts"><a class="header__phone" href="tel:+79159724101">${icon('phone')}<span>${phone}</span></a><a class="header__email" href="mailto:${email}">${icon('mail')}<span>${email}</span></a><a class="header__telegram" href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}<span>Telegram</span><span class="sr-only">, в новой вкладке</span></a></div>
        <div class="header__actions"><a class="header__nav-control header__account" href="${accountUrl}">Войти на площадку</a><a class="button button--white header__register" href="${registerUrl}">Регистрация на ЭТП ${icon('login')}</a></div>
        <button class="header__menu" type="button" data-mobile-toggle aria-controls="mobile-menu" aria-expanded="false" aria-label="Открыть меню">${icon('menu', 'header__menu-open-icon')}${icon('close', 'header__menu-close-icon')}</button>
      </div>
      <div class="header__bottom">
        <nav class="header__nav" aria-label="Главная навигация">
          ${dropdown('sellers', 'Продавцам', navigationPanel(sellerLinks))}
          <a class="header__nav-control header__nav-link" data-availability="development" href="#lots?category=all&amp;period=upcoming" data-lots-category="all" data-lots-period="upcoming">Покупателям</a>
          ${dropdown('invest', 'Инвестору', navigationPanel(investorLinks))}
          <a class="header__nav-control header__nav-link" href="#process">О проекте</a>
          <a class="header__nav-control header__nav-link" href="#request">Контакты</a>
        </nav>
        ${dropdown('ecosystem', 'Экосистема DEBTPRICE', ecosystemPanel(), 'header__ecosystem')}
        <div class="nav-dropdown p10-search" data-nav-id="search"><button class="header__nav-control" type="button" data-nav-toggle="search" aria-expanded="false" aria-controls="nav-panel-search">Поиск ${icon('search')}</button><div class="nav-panel" id="nav-panel-search" inert aria-hidden="true">${siteSearch('header-search')}</div></div>
        ${themeToggle()}
      </div>
    </div>
    ${renderMobileMenu()}
  </header>`;
}

export function renderFooter(): string {
  const ecosystemLinks = footerEcosystemOrder.map((name) => {
    const item = ecosystem.find((entry) => entry.name === name);
    return item ? `<a href="${item.href}"${externalAttributes(item.href)}>${escapeHtml(name === 'Рынок Взыскания' ? 'СМИ «Рынок взыскания»' : name)}<span class="sr-only"> — в новой вкладке</span></a>` : '';
  }).join('');
  return `<footer class="p10-footer" data-node-id="391:1384"><div class="container">
    <div class="p10-footer__main">
      <div class="p10-footer__brand"><a class="p10-footer__brand-link" href="#top" data-scroll="top" aria-label="DEBTPRICE: в начало страницы"><img class="p10-brand-logo" src="${asset('brand/debtprice-logo-20261112.svg')}" alt="DEBTPRICE" width="560" height="129"></a><h2>Аукцион долговых активов</h2><p>продавайте и покупайте<br>по цене рынка</p><small>ООО «ДЕБТПРАЙС»<br>Оператор электронной торговой площадки DEBTPRICE</small></div>
      <div><div class="p10-footer__navigation">
        <nav aria-labelledby="footer-ecosystem-title"><h2 id="footer-ecosystem-title">Экосистема</h2>${ecosystemLinks}</nav>
        <nav aria-labelledby="footer-platform-title"><h2 id="footer-platform-title">Платформа</h2><a href="#request?kind=portfolio" data-request-kind="portfolio">Продавцам</a><a href="#lots?category=all&amp;period=upcoming" data-lots-category="all" data-lots-period="upcoming">Покупателям</a><a href="#request?kind=buyer" data-request-kind="buyer">Инвестору</a></nav>
        <nav aria-labelledby="footer-information-title"><h2 id="footer-information-title">Информация</h2><a href="#documents" data-open-documents>Документы</a><a href="https://rvzrus.ru/blog" target="_blank" rel="noopener noreferrer">Журнал</a><a href="https://my.debtprice.market/DEBTPRICE_details.pdf" target="_blank" rel="noopener noreferrer">Реквизиты компании</a></nav>
        <nav aria-labelledby="footer-contact-title"><h2 id="footer-contact-title">Связь</h2><a href="#request">Контакты</a><a href="${registerUrl}">Регистрация на ЭТП</a><a href="${accountUrl}">Личный кабинет</a></nav>
      </div><div class="p10-footer__contacts"><a href="tel:+79159724101">${icon('phone')}+7 915 972-41-01</a><a href="mailto:${email}">${icon('mail')}${email}</a>${footerMessengers()}</div></div>
    </div>
    <p class="p10-footer__legal">Информация на сайте носит справочный характер, не является публичной офертой (ст. 437 ГК РФ) и индивидуальной инвестиционной рекомендацией. Условия сделки определяются документацией торгов и договором уступки права требования. Персональные данные обрабатываются в соответствии с Политикой обработки персональных данных.</p>
    <div class="p10-footer__bottom"><span>© ${new Date().getFullYear()} DEBTPRICE</span><span>Все права защищены</span><a href="https://my.debtprice.market/Privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a></div>
  </div></footer>`;
}
