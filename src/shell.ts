import './shell.css';
import { accountUrl, asset, escapeHtml, icon, registerUrl, telegramUrl, type IconName } from './ui';
import { ecosystem } from './sections';
import { nextAuctionAt } from './data/lots';

const eventEndsAt = Date.parse('2026-11-14T00:00:00+03:00');
const phone = '+7 915 972 41 01';
const email = 'v@debtprice.market';

type NavigationEntry = { href: string; title: string; description: string; icon: IconName };

const sellerLinks: readonly NavigationEntry[] = [
  { href: '#/sellers/portfeli', title: 'Портфели физических лиц', description: 'Оценка, подготовка и продажа портфеля', icon: 'folders' },
  { href: '#/sellers/debitorka', title: 'Дебиторская задолженность', description: 'Продажа долгов юридических лиц', icon: 'briefcase' },
];

const investorLinks: readonly NavigationEntry[] = [
  { href: '#/buyers', title: 'Покупка долговых активов', description: 'Лоты, аналитика и условия участия', icon: 'chart' },
  { href: '#/contacts', title: 'Инвестиционное направление', description: 'Обсудить задачу с командой', icon: 'users' },
];

function externalAttributes(href: string): string {
  return href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function navigationPanel(entries: readonly NavigationEntry[]): string {
  return entries.map((entry) => `<a class="nav-panel__link" href="${entry.href}"><span class="nav-panel__icon">${icon(entry.icon)}</span><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.description)}</small></span>${icon('arrow-up-right', 'nav-panel__arrow')}</a>`).join('');
}

function dropdown(id: string, label: string, content: string, extraClass = '', prefixIcon?: IconName): string {
  return `<div class="nav-dropdown ${extraClass}" data-nav-id="${id}"><button class="header__nav-control header__nav-toggle" type="button" data-nav-toggle="${id}" aria-expanded="false" aria-controls="nav-panel-${id}">${prefixIcon ? icon(prefixIcon) : ''}<span>${label}</span>${icon('chevron-down', 'header__nav-chevron')}</button><div class="nav-panel${id === 'ecosystem' ? ' nav-panel--ecosystem' : ''}" id="nav-panel-${id}" inert aria-hidden="true">${content}</div></div>`;
}

function ecosystemPanel(): string {
  return `<div class="nav-panel__ecosystem-grid">${ecosystem.map((item) => `<a class="nav-panel__link" href="${item.href}"${externalAttributes(item.href)}><span class="nav-panel__icon">${icon(item.icon)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.label)}</small></span>${icon('arrow-up-right', 'nav-panel__arrow')}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div>`;
}

function siteSearch(id: string, mobile = false): string {
  return `<form class="header__search${mobile ? ' header__search--mobile' : ''}" role="search" data-site-search><label class="sr-only" for="${id}">Поиск по сайту DEBTPRICE</label><input id="${id}" name="q" type="search" maxlength="120" placeholder="Найти на сайте" autocomplete="off" enterkeyhint="search"><button type="submit" aria-label="Найти на сайте">${icon('search')}</button></form>`;
}

function initialCountdown(): string {
  const now = Date.now();
  const next = nextAuctionAt(now);
  if (!next) return 'На площадке';
  const remaining = Math.max(0, Math.floor((next - now) / 1000));
  const days = Math.floor(remaining / 86400);
  const hours = String(Math.floor(remaining / 3600) % 24).padStart(2, '0');
  const minutes = String(Math.floor(remaining / 60) % 60).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  return `${days ? `${days} д ` : ''}${hours}:${minutes}:${seconds}`;
}

function renderMobileMenu(): string {
  return `<div class="header__mobile-menu" id="mobile-menu" inert aria-hidden="true"><div class="container header__mobile-inner">
    ${siteSearch('mobile-search', true)}
    <nav class="header__mobile-nav" aria-label="Мобильная навигация">
      <div class="header__mobile-group"><h2>Продавцам</h2>${sellerLinks.map((entry) => `<a class="header__mobile-link" href="${entry.href}"><span>${entry.title}</span>${icon('arrow-up-right')}</a>`).join('')}</div>
      <div class="header__mobile-group"><h2>Площадка</h2><a class="header__mobile-link" href="#/buyers"><span>Покупателям</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#/about"><span>О проекте</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#/contacts"><span>Контакты</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#/journal"><span>Частые вопросы</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#/docs"><span>Документы</span>${icon('arrow-up-right')}</a></div>
      <div class="header__mobile-group header__mobile-group--ecosystem"><h2>Экосистема</h2><div class="header__mobile-products">${ecosystem.map((item) => `<a class="header__mobile-product" href="${item.href}"${externalAttributes(item.href)}>${icon(item.icon)}<span>${escapeHtml(item.name)}</span>${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div></div>
    </nav>
    <div class="header__mobile-actions"><a class="button button--primary" href="#/request">Оставить заявку ${icon('arrow-right')}</a><a class="button button--dark" href="${accountUrl}">Личный кабинет ${icon('login')}</a><a class="header__mobile-register" href="${registerUrl}">Зарегистрироваться ${icon('arrow-up-right')}</a></div>
    <div class="header__mobile-contacts"><a href="tel:+79159724101">${icon('phone')}${phone}</a><a href="mailto:${email}">${icon('mail')}${email}</a><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}Лоты в Telegram<span class="sr-only"> — в новой вкладке</span></a></div>
  </div></div>`;
}

export function renderHeader(light: boolean): string {
  const showEvent = Date.now() < eventEndsAt;
  return `<header class="site-header${light ? ' is-light' : ''}${showEvent ? ' has-event' : ''}" id="site-header">
    ${showEvent ? `<div class="header__event"><a class="header__event-link" href="https://debt-tech.ru/" target="_blank" rel="noopener noreferrer"><strong>DEBT TECH 2026</strong><span>13 ноября <span class="header__event-divider">·</span> Москва</span><span class="header__event-cta"><span>Участвовать</span>${icon('arrow-up-right')}</span><span class="sr-only"> — сайт конференции, новая вкладка</span></a></div>` : ''}
    <div class="container header__content">
      <div class="header__top">
        <a class="header__brand" href="#/" aria-label="DEBTPRICE — на главную"><img src="${asset('brand/debtprice.svg')}" alt="DEBTPRICE" width="160" height="37"><span class="header__brand-description">Аукцион<br>долговых активов</span></a>
        <div class="header__contacts"><a class="header__phone" href="tel:+79159724101">${icon('phone')}<span>${phone}</span></a><a class="header__email" href="mailto:${email}">${icon('mail')}<span>${email}</span></a><a class="header__telegram" href="${telegramUrl}" target="_blank" rel="noopener noreferrer" aria-label="Лоты DEBTPRICE в Telegram, новая вкладка">${icon('telegram')}</a></div>
        <a class="header__auction" href="${accountUrl}" data-auction-link>${icon('clock')}<span class="header__auction-label">Торги</span><span data-auction-countdown>${initialCountdown()}</span></a>
        <div class="header__actions"><a class="button button--primary header__request" href="#/request"><span class="header__request-full">Оставить заявку</span><span class="header__request-short">Заявка</span>${icon('arrow-right')}</a><a class="header__nav-control header__account" href="${accountUrl}"><span>Войти</span>${icon('login')}</a><a class="button button--white header__register" href="${registerUrl}"><span>Регистрация</span>${icon('arrow-up-right')}</a></div>
        <button class="header__menu" type="button" data-mobile-toggle aria-controls="mobile-menu" aria-expanded="false" aria-label="Открыть меню">${icon('menu', 'header__menu-open-icon')}${icon('close', 'header__menu-close-icon')}</button>
      </div>
      <div class="header__bottom">
        ${dropdown('ecosystem', 'Экосистема', ecosystemPanel(), 'header__ecosystem', 'grid')}
        ${siteSearch('header-search')}
        <nav class="header__nav" aria-label="Главная навигация">
          ${dropdown('sellers', 'Продавцам', navigationPanel(sellerLinks))}
          <a class="header__nav-control header__nav-link" href="#/buyers">Покупателям</a>
          ${dropdown('invest', 'Инвестору', navigationPanel(investorLinks))}
          <a class="header__nav-control header__nav-link header__receivables" href="#/sellers/debitorka">Дебиторская задолженность</a>
          <a class="header__nav-control header__nav-link" href="#/about">О проекте</a>
          <a class="header__nav-control header__nav-link" href="#/contacts">Контакты</a>
        </nav>
      </div>
    </div>
    ${renderMobileMenu()}
  </header>`;
}

export function renderFooter(): string {
  const year = new Date().getFullYear();
  return `<footer class="site-footer"><div class="container">
    <div class="footer__top"><a class="footer__brand" href="#/" aria-label="DEBTPRICE — на главную"><img src="${asset('brand/debtprice.svg')}" alt="DEBTPRICE" width="196" height="46"><span>Платформа и экосистема<br>долговых активов</span></a><a class="button button--white footer__request" href="#/request">Оставить заявку ${icon('arrow-right')}</a></div>
    <div class="footer__columns">
      <nav class="footer__column" aria-labelledby="footer-platform-title"><h2 id="footer-platform-title">Площадка</h2><a href="#/sellers/portfeli">Портфели физических лиц</a><a href="#/sellers/debitorka">Дебиторская задолженность</a><a href="#/buyers">Покупателям</a><a href="${accountUrl}">Личный кабинет ${icon('arrow-up-right')}</a><a href="${registerUrl}">Регистрация ${icon('arrow-up-right')}</a></nav>
      <nav class="footer__column" aria-labelledby="footer-information-title"><h2 id="footer-information-title">Информация</h2><a href="#/about">О проекте</a><a href="#/journal">Частые вопросы</a><a href="#/docs">Документы и реквизиты</a><a href="#/contacts">Контакты</a><a href="#/request">Оставить заявку</a></nav>
      <nav class="footer__column footer__column--ecosystem" aria-labelledby="footer-ecosystem-title"><h2 id="footer-ecosystem-title">Экосистема</h2><div class="footer__ecosystem-links">${ecosystem.map((item) => `<a href="${item.href}"${externalAttributes(item.href)}>${escapeHtml(item.name)}${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div></nav>
      <div class="footer__column footer__column--contacts"><h2>Контакты</h2><a class="footer__phone" href="tel:+79159724101">${phone}</a><a class="footer__email" href="mailto:${email}">${email}</a><a class="footer__telegram" href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}Лоты в Telegram ${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a><p class="footer__contacts-note">Обсудим ваш актив и условия работы с площадкой.</p></div>
    </div>
    <div class="footer__legal"><div class="footer__company"><span>© ${year} ООО «ДЕБТПРАЙС»</span><div class="footer__company-details"><span>ИНН 7608021127</span><span>ОГРН 1147608001221</span></div></div><a class="footer__privacy" href="#/docs">Политика обработки персональных данных ${icon('arrow-up-right')}</a></div>
  </div></footer>`;
}
