import './shell.css';
import { accountUrl, asset, escapeHtml, icon, registerUrl, telegramUrl, type IconName } from './ui';
import { ecosystem } from './sections';
const phone = '+7 915 972 41 01';
const email = 'v@debtprice.market';

type NavigationEntry = { href: string; title: string; description: string; icon: IconName; requestKind?: 'portfolio' | 'receivables' };

const sellerLinks: readonly NavigationEntry[] = [
  { href: '#request', title: 'Портфели физических лиц', description: 'Оценка, подготовка и продажа портфеля', icon: 'folders', requestKind: 'portfolio' },
  { href: '#request', title: 'Дебиторская задолженность', description: 'Продажа долгов юридических лиц', icon: 'briefcase', requestKind: 'receivables' },
];

const investorLinks: readonly NavigationEntry[] = [
  { href: '#lots', title: 'Покупка долговых активов', description: 'Расписание и условия торгов', icon: 'chart' },
  { href: '#request', title: 'Инвестиционное направление', description: 'Обсудить задачу с командой', icon: 'users' },
];

function externalAttributes(href: string): string {
  return href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function navigationPanel(entries: readonly NavigationEntry[]): string {
  return entries.map((entry) => `<a class="nav-panel__link" href="${entry.href}"${entry.requestKind ? ` data-request-kind="${entry.requestKind}"` : ''}><span class="nav-panel__icon">${icon(entry.icon)}</span><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.description)}</small></span>${icon('arrow-up-right', 'nav-panel__arrow')}</a>`).join('');
}

function dropdown(id: string, label: string, content: string, extraClass = '', prefixIcon?: IconName): string {
  return `<div class="nav-dropdown ${extraClass}" data-nav-id="${id}"><button class="header__nav-control header__nav-toggle" type="button" data-nav-toggle="${id}" aria-expanded="false" aria-controls="nav-panel-${id}">${prefixIcon ? icon(prefixIcon) : ''}<span>${label}</span>${icon(id === 'ecosystem' ? 'arrow-right' : 'chevron-down', 'header__nav-chevron')}</button><div class="nav-panel${id === 'ecosystem' ? ' nav-panel--ecosystem' : ''}" id="nav-panel-${id}" inert aria-hidden="true">${content}</div></div>`;
}

function ecosystemPanel(): string {
  return `<div class="nav-panel__ecosystem-grid">${ecosystem.map((item) => `<a class="nav-panel__link" href="${item.href}"${externalAttributes(item.href)}><span class="nav-panel__icon">${icon(item.icon)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.label)}</small></span>${icon('arrow-up-right', 'nav-panel__arrow')}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div>`;
}

function siteSearch(id: string, mobile = false): string {
  return `<form class="header__search${mobile ? ' header__search--mobile' : ''}" role="search" data-site-search><label class="sr-only" for="${id}">Поиск по сайту DEBTPRICE</label><input id="${id}" name="q" type="search" maxlength="120" placeholder="Найти на сайте" autocomplete="off" enterkeyhint="search"><button type="submit" aria-label="Найти на сайте">${icon('search')}</button></form>`;
}

function themeToggle(mobile = false): string {
  return `<button type="button" class="theme-toggle${mobile ? ' p10-mobile-theme' : ''}" data-theme-toggle aria-label="Включить темную тему"><svg class="theme-toggle__sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg><svg class="theme-toggle__moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg></button>`;
}

function renderMobileMenu(): string {
  return `<div class="header__mobile-menu" id="mobile-menu" inert aria-hidden="true"><div class="container header__mobile-inner">
    ${siteSearch('mobile-search', true)}
    <nav class="header__mobile-nav" aria-label="Мобильная навигация">
      <div class="header__mobile-group"><h2>Продавцам</h2>${sellerLinks.map((entry) => `<a class="header__mobile-link" href="${entry.href}"${entry.requestKind ? ` data-request-kind="${entry.requestKind}"` : ''}><span>${entry.title}</span>${icon('arrow-up-right')}</a>`).join('')}</div>
      <div class="header__mobile-group"><h2>Площадка</h2><a class="header__mobile-link" href="#lots"><span>Покупателям</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#process"><span>О проекте</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#request"><span>Контакты</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#formats"><span>Форматы торгов</span>${icon('arrow-up-right')}</a><a class="header__mobile-link" href="#documents" data-open-documents><span>Документы</span>${icon('arrow-up-right')}</a></div>
      <div class="header__mobile-group header__mobile-group--ecosystem"><h2>Экосистема</h2><div class="header__mobile-products">${ecosystem.map((item) => `<a class="header__mobile-product" href="${item.href}"${externalAttributes(item.href)}>${icon(item.icon)}<span>${escapeHtml(item.name)}</span>${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a>`).join('')}</div></div>
    </nav>
    <div class="header__mobile-actions"><a class="button button--primary" href="#request">Оставить заявку ${icon('arrow-right')}</a><a class="button button--dark" href="${accountUrl}">Личный кабинет ${icon('login')}</a><a class="header__mobile-register" href="${registerUrl}">Зарегистрироваться ${icon('arrow-up-right')}</a></div>
    <div class="header__mobile-contacts"><a href="tel:+79159724101">${icon('phone')}${phone}</a><a href="mailto:${email}">${icon('mail')}${email}</a><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}Лоты в Telegram<span class="sr-only"> — в новой вкладке</span></a></div>
  </div></div>`;
}

export function renderHeader(light: boolean): string {
  return `<header class="site-header p10-header${light ? ' is-light' : ''}" id="site-header">
    <div class="container header__content">
      <div class="header__top">
        <a class="header__brand" href="#top" data-scroll="top" aria-label="DEBTPRICE: в начало страницы"><span class="p10-brand-mark"><img src="${asset('page10/391-828/7d89e.svg')}" alt="DEBTPRICE"></span><span class="header__brand-description">Аукцион<br>долговых активов</span></a>
        <div class="header__contacts"><a class="header__phone" href="tel:+79159724101">${icon('phone')}<span>${phone}</span></a><a class="header__email" href="mailto:${email}">${icon('mail')}<span>${email}</span></a><a class="header__telegram" href="${telegramUrl}" target="_blank" rel="noopener noreferrer">${icon('telegram')}<span>Telegram</span><span class="sr-only">, в новой вкладке</span></a></div>
        <div class="header__actions"><a class="header__nav-control header__account" href="${accountUrl}">Войти на площадку</a><a class="button button--white header__register" href="${registerUrl}">Регистрация на ЭТП ${icon('login')}</a></div>
        ${themeToggle(true)}
        <button class="header__menu" type="button" data-mobile-toggle aria-controls="mobile-menu" aria-expanded="false" aria-label="Открыть меню">${icon('menu', 'header__menu-open-icon')}${icon('close', 'header__menu-close-icon')}</button>
      </div>
      <div class="header__bottom">
        <nav class="header__nav" aria-label="Главная навигация">
          ${dropdown('sellers', 'Продавцам', navigationPanel(sellerLinks))}
          <a class="header__nav-control header__nav-link" href="#lots">Покупателям</a>
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
  return `<footer class="p10-footer" data-node-id="391:1384"><div class="container">
    <div class="p10-footer__main">
      <div class="p10-footer__brand"><a class="p10-footer__brand-link" href="#top" data-scroll="top" aria-label="DEBTPRICE: в начало страницы"><img src="${asset('brand/debtprice.svg')}" alt="DEBTPRICE" width="158" height="37"></a><h2>Аукцион долговых активов</h2><p>продавайте и покупайте<br>по цене рынка</p><small>ООО «ДЕБТПРАЙС»<br>Оператор электронной торговой площадки DEBTPRICE</small></div>
      <div><div class="p10-footer__navigation">
        <nav aria-labelledby="footer-platform-title"><h2 id="footer-platform-title">Платформа</h2><a href="#request" data-request-kind="portfolio">Продавцам</a><a href="#lots">Покупателям</a><a href="#request">Инвестору</a></nav>
        <nav aria-labelledby="footer-information-title"><h2 id="footer-information-title">Информация</h2><a href="#documents" data-open-documents>Документы</a><a href="https://rvzrus.ru/blog" target="_blank" rel="noopener noreferrer">Журнал</a><a href="https://my.debtprice.market/DEBTPRICE_details.pdf" target="_blank" rel="noopener noreferrer">Реквизиты компании</a></nav>
        <nav aria-labelledby="footer-contact-title"><h2 id="footer-contact-title">Связь</h2><a href="#request">Контакты</a><a href="${registerUrl}">Регистрация на ЭТП</a><a href="${accountUrl}">Личный кабинет</a></nav>
      </div><div class="p10-footer__contacts"><a href="tel:+79159724101">${icon('phone')}+7 915 972-41-01</a><a href="mailto:${email}">${icon('mail')}${email}</a></div></div>
    </div>
    <p class="p10-footer__legal">Информация на сайте носит справочный характер, не является публичной офертой (ст. 437 ГК РФ) и индивидуальной инвестиционной рекомендацией. Условия сделки определяются документацией торгов и договором уступки права требования. Персональные данные обрабатываются в соответствии с Политикой обработки персональных данных.</p>
    <div class="p10-footer__bottom"><span>© ${new Date().getFullYear()} DEBTPRICE</span><span>Все права защищены</span><a href="https://my.debtprice.market/Privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a></div>
  </div></footer>`;
}
