import './page10.css';
import { archivedLots, filterLots, lots, type Lot, type LotCategory } from './data/lots';
import { createContentTransition } from './motion';
import { renderPage10Sections } from './page10-sections';
import { accountUrl, asset, escapeHtml, icon, registerUrl, rubles } from './ui';

const sourceDate = '10 ноября 2026';
const number = new Intl.NumberFormat('ru-RU');
const shortTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
const longDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });
const dayDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'Europe/Moscow' });

const p10Asset = (section: string, file: string) => asset(`page10/391-${section}/${file}`);

function sellerMark(lot: Lot, extraClass = ''): string {
  return lot.logo
    ? `<span class="p10-seller-logo ${extraClass}"><img src="${p10Asset('884', lot.logo)}" alt="" width="56" height="56" decoding="async"></span>`
    : `<span class="p10-seller-logo p10-seller-logo--initials ${extraClass}" style="--seller-color:${lot.markColor}">${escapeHtml(lot.mark)}</span>`;
}

function renderNextAuction(): string {
  const next = lots.find(lot => lot.startsAt && Date.parse(lot.startsAt) > Date.now());
  return `<aside class="p10-next" aria-label="Ближайшие торги" data-reveal>
    <div class="p10-next__seller" data-next-seller>${next ? sellerMark(next) : `<span class="p10-next__empty-icon">${icon('clock')}</span>`}<div><small data-next-label>${next ? 'Ближайшие торги' : 'Расписание торгов'}</small><strong data-next-name>${next ? escapeHtml(next.name) : 'Новые лоты на площадке'}</strong></div></div>
    <div class="p10-next__date"><small data-next-date>${next?.startsAt ? longDate.format(Date.parse(next.startsAt)).replace(' г.', '') : 'Актуальные даты и условия'}</small><strong data-next-time>${next?.startsAt ? shortTime.format(Date.parse(next.startsAt)) + ' МСК' : 'В личном кабинете'}</strong></div>
    <div class="p10-next__count"><small data-next-count-label>${next ? 'До начала' : 'Торги'}</small><strong data-next-countdown>${next ? 'Расчет времени' : 'На площадке'}</strong></div>
    <a class="button button--primary" href="${accountUrl}">Перейти на площадку ${icon('arrow-right')}</a>
  </aside>`;
}

function renderBadges(): string {
  return `<div class="p10-trust" aria-label="Профессиональные статусы" data-reveal>
    <span><img src="${asset('page10/logos/skolkovo.svg')}" alt="" width="22" height="18">Резидент Сколково</span>
    <span><img src="${asset('page10/logos/nsfr.svg')}" alt="" class="p10-trust__nsfr">Член НСФР</span>
    <span><img src="${p10Asset('828', '5e347.svg')}" alt="">Член ТПП РФ</span>
    <span><span class="p10-trust__napca" aria-hidden="true"><img class="napca-1" src="${p10Asset('828','369a0.svg')}" alt=""><img class="napca-2" src="${p10Asset('828','74142.svg')}" alt=""><img class="napca-3" src="${p10Asset('828','80561.svg')}" alt=""><img class="napca-4" src="${p10Asset('828','1cd11.svg')}" alt=""><img class="napca-5" src="${p10Asset('828','353c2.svg')}" alt=""></span>Ассоциированный партнер НАПКА</span>
  </div>`;
}

function renderHero(): string {
  return `<div class="intro p10-intro"><section class="hero p10-hero" id="top" aria-labelledby="hero-title" data-node-id="391:828">
    <div class="hero__dots" data-dots data-dots-color="#9de6dc" data-dots-opacity="0.12" data-dots-end-opacity="0.005" data-dots-spacing="19"></div>
    <div class="hero__glow" aria-hidden="true"></div><div class="hero__globe" id="hero-globe" aria-hidden="true"></div>
    <div class="p10-hero__shade" aria-hidden="true"></div>
    <div class="container hero__inner"><div class="p10-hero__copy">
      <h1 id="hero-title" data-text-reveal>Продайте и&nbsp;купите<br class="p10-hero__break"> долговые обязательства<br class="p10-hero__break"> на&nbsp;DEBTPRICE</h1>
      <p class="p10-hero__description" data-reveal>Электронная торговая площадка по&nbsp;уступке прав требования</p>
      <div class="hero__actions" data-reveal><a class="button button--white" href="#sell-buy" data-scroll="sell-buy">Продать долг ${icon('arrow-right')}</a><a class="button button--primary" href="#/buyers">Купить долг ${icon('arrow-right')}</a></div>
      ${renderBadges()}
    </div>${renderNextAuction()}</div>
  </section></div>`;
}

function row(lot: Lot): string {
  const time = lot.startsAt ? shortTime.format(Date.parse(lot.startsAt)) : lot.kind === 'sold' ? 'Продано' : 'По условиям';
  const status = lot.statusLabel === 'Просужен' ? `Просужен ${lot.status}` : lot.status;
  return `<tr class="p10-auction" data-lot-id="${lot.id}">
    <th scope="row"><button class="p10-auction__seller" type="button" data-open-lot="${lot.id}">${sellerMark(lot)}<span>${escapeHtml(lot.name)}</span></button></th>
    <td data-label="Время"><time${lot.startsAt ? ` datetime="${lot.startsAt}"` : ''}>${time}</time>${lot.startsAt ? '<small>МСК</small>' : ''}</td>
    <td data-label="Статус"><span class="p10-status">${escapeHtml(status)}</span></td>
    <td class="p10-auction__cases" data-label="Кейсов">${number.format(lot.cases)}</td>
    <td class="p10-auction__debt" data-label="Сумма долга">${rubles(lot.debt)}</td>
    <td class="p10-auction__price" data-label="Начальная цена">${lot.startingPrice ? `<strong>${rubles(lot.startingPrice)}</strong><small>${lot.startingPercent?.toLocaleString('ru-RU', {minimumFractionDigits:2,maximumFractionDigits:2})} % ОСЗ</small>` : '<strong>По предложению</strong>'}</td>
    <td class="p10-auction__action"><button class="icon-button" type="button" data-open-lot="${lot.id}" aria-label="Подробнее: ${escapeHtml(lot.name)}">${icon('arrow-right')}</button></td>
  </tr>`;
}

function scheduleTable(visible: readonly Lot[], archive: boolean): string {
  if (!visible.length) return `<div class="p10-schedule__empty"><span>${icon('search')}</span><h3>В этом разделе пока нет лотов</h3><p>Выберите другой тип портфеля или&nbsp;посмотрите актуальные предложения на&nbsp;площадке.</p><a class="button button--primary" href="${accountUrl}">Перейти к торгам ${icon('arrow-right')}</a></div>`;
  const groups = new Map<string, Lot[]>();
  for (const lot of visible) {
    const key = lot.startsAt?.slice(0, 10) ?? (archive ? 'Другие предложения · данные на 29 октября 2026' : 'Другие предложения');
    groups.set(key, [...(groups.get(key) || []), lot]);
  }
  const body = [...groups].map(([key, group]) => {
    let heading = key;
    if (/^\d{4}-/.test(key)) {
      const parts = dayDate.formatToParts(Date.parse(`${key}T12:00:00+03:00`));
      const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
      heading = `${get('day')} ${get('month')} · ${get('weekday')}`;
    }
    const count = group.length;
    return `<tbody><tr class="p10-auction-day"><th colspan="7" scope="colgroup"><span>${heading}</span><small>${count} ${count === 1 ? 'лот' : count < 5 ? 'лота' : 'лотов'}</small></th></tr>${group.map(row).join('')}</tbody>`;
  }).join('');
  return `<table class="p10-auctions-table"><caption class="sr-only">${archive ? 'Лоты за прошлый месяц' : 'Расписание торгов'}. Данные на ${archive && visible.every(item=>archivedLots.includes(item)) ? '29 октября 2026' : sourceDate}, время московское.</caption><colgroup><col class="p10-col-seller"><col class="p10-col-time"><col class="p10-col-status"><col class="p10-col-cases"><col class="p10-col-debt"><col class="p10-col-price"><col class="p10-col-action"></colgroup><thead><tr><th scope="col">Продавец</th><th scope="col">Время</th><th scope="col">Статус</th><th scope="col">Кейсов</th><th scope="col">Сумма долга</th><th scope="col">Начальная цена</th><th scope="col"><span class="sr-only">Подробнее</span></th></tr></thead>${body}</table>`;
}

function renderSchedule(): string {
  return `<section class="p10-schedule section" id="lots" aria-labelledby="lots-title" data-node-id="391:884"><div class="container">
    <h2 class="section-title" id="lots-title" data-text-reveal><span>Расписание</span> торгов</h2>
    <div class="p10-schedule__toolbar" data-reveal>
      <div class="segmented p10-period" role="tablist" aria-label="Период торгов"><button type="button" role="tab" id="period-upcoming" data-schedule-period="upcoming" aria-selected="true" aria-controls="p10-schedule-results">Предстоящие</button><button type="button" role="tab" id="period-previous" data-schedule-period="previous" aria-selected="false" tabindex="-1" aria-controls="p10-schedule-results">За прошлый месяц</button></div>
      <div class="p10-schedule__type"><span>Тип портфеля</span><div class="segmented" role="tablist" aria-label="Тип портфеля">${[['all','Все'],['individuals','Физлица'],['receivables','Юрлица']].map(([value,label]) => `<button type="button" role="tab" id="filter-${value}" data-filter="${value}" data-schedule-filter="${value}" aria-selected="${value === 'all'}" tabindex="${value === 'all' ? 0 : -1}" aria-controls="p10-schedule-results">${label}</button>`).join('')}</div></div>
    </div>
    <div class="p10-schedule__stage"><div id="p10-schedule-results" role="tabpanel" aria-labelledby="period-upcoming">${scheduleTable(lots, false)}</div></div>
    <p class="sr-only" id="p10-schedule-announcement" role="status" aria-live="polite"></p>
    <div class="p10-schedule__bottom"><a class="button button--primary" href="${accountUrl}">Перейти ко всем торгам ${icon('arrow-right')}</a><p class="p10-source-note">Данные на <span data-schedule-source-date>${sourceDate}</span>. Актуальные статусы и&nbsp;условия <a href="${accountUrl}">на&nbsp;площадке</a>.</p></div>
  </div></section>`;
}

function renderTradeChoices(): string {
  return `<section class="p10-choices" id="sell-buy" aria-label="Продать или купить долг" data-node-id="391:935"><div class="container p10-choices__grid" data-stagger>
    <article class="p10-choice p10-choice--sell"><img class="p10-choice__art" src="${p10Asset('935','af699.webp')}" alt="" width="324" height="324" loading="lazy"><h2>Продать долг</h2><p>Выберите тип задолженности</p><div class="p10-choice__actions"><a class="button button--primary" href="#/sellers/debitorka">Дебиторская задолженность ${icon('arrow-right')}</a><a class="button button--white" href="#/sellers/portfeli">Розничная задолженность ${icon('arrow-right')}</a></div></article>
    <article class="p10-choice p10-choice--buy"><img class="p10-choice__art" src="${p10Asset('935','7c7e9.webp')}" alt="" width="344" height="344" loading="lazy"><h2>Купить портфель на торгах</h2><p>Долговые активы на&nbsp;электронной<br>торговой площадке</p><div class="p10-choice__actions"><a class="button button--primary" href="#/buyers">Купить долг ${icon('arrow-right')}</a></div></article>
  </div></section>`;
}

const partners = [
  ['ФАСП','b6f7c.webp','fasp.webp'], ['ПКБ','4d80f.webp','pkb.webp'], ['Инкас Коллект','d7d49.webp','inkas-collect.webp'],
  ['Legal Collection','25cfa.webp','legal-collection.webp'], ['Express Collection','','express-collection.webp'],
  ['СИТ Коллектор','9cc9c.webp','sit.webp'], ['СКМ','4e813.svg','skm.webp'], ['ТРАСТ','trust.svg','trust.webp'],
];

function renderPage10Partners(): string {
  const partnerCards = partners.map(([name,source,fallback]) => `<div class="partner"><img src="${source ? p10Asset('948',source) : asset(`partners/${fallback}`)}" alt="${name}" width="148" height="52" loading="lazy" decoding="async"><span>${name}</span></div>`).join('');
  return `<section class="partners p10-partners" aria-labelledby="partners-title" data-node-id="391:948"><div class="container partners__heading"><h2 id="partners-title">Наши партнеры</h2><p><span>Более 500 компаний</span> из всех регионов России</p></div><div class="partners__marquee" aria-label="Партнеры DEBTPRICE" tabindex="0"><div class="partners__track"><div class="partners__group">${partnerCards}</div><div class="partners__group" aria-hidden="true">${partnerCards}</div></div></div><div class="p10-partners__dots" data-dots data-dots-color="#0ba69e" data-dots-opacity="0.18" data-dots-end-opacity="0.01" data-dots-spacing="18" data-dots-direction="bottom-to-top"></div></section>`;
}

function renderOffer(): string {
  return `<section class="offer-section p10-offer" aria-labelledby="offer-title" data-node-id="391:1023"><div class="container"><div class="offer">
    <div class="offer__dots" data-dots data-dots-color="#baffec" data-dots-opacity="0.25" data-dots-end-opacity="0.025" data-dots-spacing="17" data-dots-direction="right-to-left"></div>
    <div class="p10-offer__art" aria-hidden="true"><img class="offer__image" src="${p10Asset('1023','fb0b6.webp')}" alt="" width="682" height="710" loading="lazy" decoding="async"><img class="p10-offer__logo" src="${p10Asset('1023','34072.svg')}" alt=""></div>
    <div class="offer__content"><h2 id="offer-title" data-text-reveal>Выберите подходящее<br>предложение</h2><p>Зарегистрируйтесь, чтобы продавать<br class="desktop-break"> и&nbsp;покупать долговые активы на&nbsp;площадке.</p><a class="button button--white" href="${registerUrl}">Зарегистрироваться ${icon('arrow-right')}</a></div>
  </div></div></section>`;
}

export function renderPage10Home(): string {
  return `<div class="p10-home">${renderHero()}${renderSchedule()}${renderTradeChoices()}${renderPage10Partners()}${renderOffer()}${renderPage10Sections()}</div>`;
}

export function mountHomeAuctions(app: HTMLElement, savedCategory: 'all' | LotCategory = 'all', savedPeriod = 'upcoming'): () => void {
  const result = app.querySelector<HTMLElement>('#p10-schedule-results');
  const stage = app.querySelector<HTMLElement>('.p10-schedule__stage');
  if (!result || !stage) return () => {};
  const abort = new AbortController();
  const {signal} = abort;
  const transition = createContentTransition(stage, result);
  let category = savedCategory;
  let period = savedPeriod === 'previous' ? 'previous' : 'upcoming';
  let timer = 0;
  let nextId = '';

  function render(animate = true): void {
    const nowParts = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).format(new Date());
    const previousMonth = new Date(`${nowParts.slice(0,7)}-01T12:00:00+03:00`); previousMonth.setUTCMonth(previousMonth.getUTCMonth()-1);
    const previousKey = previousMonth.toISOString().slice(0,7);
    const previous = [...lots,...archivedLots].filter(lot => lot.startsAt ? lot.startsAt.startsWith(previousKey) : previousKey === '2026-10');
    const source = period === 'previous' ? previous : lots.filter(lot => !lot.startsAt || Date.parse(lot.startsAt) > Date.now());
    const visible = filterLots(source, category, '');
    const update = () => { result!.innerHTML = scheduleTable(visible, period === 'previous'); };
    if (animate) transition.run(update); else update();
    app.querySelectorAll<HTMLButtonElement>('[data-schedule-filter]').forEach(button => { const active = button.dataset.scheduleFilter === category; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    app.querySelectorAll<HTMLButtonElement>('[data-schedule-period]').forEach(button => { const active = button.dataset.schedulePeriod === period; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    result!.setAttribute('aria-labelledby', `period-${period}`);
    const sourceLabel=app.querySelector('[data-schedule-source-date]'); if(sourceLabel)sourceLabel.textContent=period==='previous' && visible.every(item=>archivedLots.includes(item)) ? '29 октября 2026' : sourceDate;
    if (animate) app.querySelector('#p10-schedule-announcement')!.textContent = `Найдено лотов: ${visible.length}`;
  }
  app.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const type = target?.closest<HTMLButtonElement>('[data-schedule-filter]');
    if (type) { category = type.dataset.scheduleFilter as typeof category; render(); }
    const date = target?.closest<HTMLButtonElement>('[data-schedule-period]');
    if (date) { period = date.dataset.schedulePeriod!; render(); }
  }, {signal});

  function updateNext(): void {
    window.clearTimeout(timer);
    if (document.hidden) return;
    const now = Date.now();
    const next = lots.find(lot => lot.startsAt && Date.parse(lot.startsAt) > now);
    const write = (selector: string, text: string) => { const node=app.querySelector(selector); if(node)node.textContent=text; };
    if (next?.startsAt) {
      if (next.id !== nextId) {
        if (nextId) render(false);
        const seller=app.querySelector('[data-next-seller]');
        if(seller)seller.innerHTML=`${sellerMark(next)}<div><small data-next-label>Ближайшие торги</small><strong data-next-name>${escapeHtml(next.name)}</strong></div>`;
        write('[data-next-date]',longDate.format(Date.parse(next.startsAt)).replace(' г.',''));
        write('[data-next-time]',shortTime.format(Date.parse(next.startsAt))+' МСК');
        write('[data-next-count-label]','До начала');
        nextId=next.id;
      }
      const seconds=Math.max(0,Math.ceil((Date.parse(next.startsAt)-now)/1000));
      const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
      write('[data-next-countdown]',hours>0?`${hours} ч ${minutes} мин`:`${minutes} мин ${seconds%60} с`);
      timer=window.setTimeout(updateNext,1000-now%1000);
    } else {
      if (nextId) { nextId = ''; render(false); }
      const seller=app.querySelector('[data-next-seller]');
      if(seller)seller.innerHTML=`<span class="p10-next__empty-icon">${icon('clock')}</span><div><small data-next-label>Расписание торгов</small><strong data-next-name>Новые лоты на площадке</strong></div>`;
      write('[data-next-label]','Расписание торгов'); write('[data-next-name]','Новые лоты на площадке');
      write('[data-next-date]','Актуальные даты и условия'); write('[data-next-time]','В личном кабинете');
      write('[data-next-count-label]','Торги'); write('[data-next-countdown]','На площадке');
    }
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render(false);updateNext();}},{signal});
  render(false); updateNext();
  return () => {abort.abort();transition.destroy();window.clearTimeout(timer);};
}
