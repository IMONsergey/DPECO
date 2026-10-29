import { renderEcosystem, renderRequestForm, renderTrustBadges } from '../sections';
import { accountUrl, asset, icon, registerUrl } from '../ui';
import './info.css';

export type InfoRoute = 'about' | 'docs' | 'contacts';

const team = [
  ['Владимир Вербицкий', 'Сооснователь DEBTPRICE. Учредитель, председатель правления АНО «Центр поддержки цивилизованного рынка взыскания»'],
  ['Елизета Козусь', 'Советник правления'],
  ['Любовь Залевская', 'Президент СМИ «Рынок Взыскания»'],
  ['Юрий Волохонский', 'Вице-президент СМИ «Рынок Взыскания»'],
  ['Антон Юдаев', 'Главный редактор СМИ «Рынок Взыскания», программный директор'],
  ['Никита Преснов', 'Руководитель корпоративного направления'],
  ['Ксения Тарасова', 'Руководитель инвестиционного направления'],
  ['Полина Юдакова', 'Head of Event'],
  ['Валерия Пиняева', 'Руководитель цифровых продуктов'],
] as const;

const history = [
  ['2017', 'Начало торгов', 'Запуск электронной площадки для продажи и покупки долговых портфелей физических лиц на открытых торгах.'],
  ['2022', 'Встреча рынка', 'Запуск DOLG TALK — ежегодной конференции рынка взыскания, которую мы соорганизуем.'],
  ['2025', 'Корпоративные долги', 'Новое направление: дебиторская задолженность юридических лиц с аналитическими заключениями по лотам.'],
  ['2026', 'Инвестиции', 'Развитие финансирования взыскателей под залог долговых портфелей.'],
] as const;

const documents = [
  { title: 'Реквизиты ООО «ДЕБТПРАЙС»', description: 'Данные оператора электронной торговой площадки', type: 'PDF', url: 'https://my.debtprice.market/DEBTPRICE_details.pdf' },
  { title: 'Договор использования портала DEBTPRICE', description: 'Действует с 1 января 2025 года', type: 'PDF', url: 'https://my.debtprice.market/oferta_register_since-2025-01-01.pdf' },
  { title: 'Предыдущая редакция договора', description: 'Действовала с 5 февраля 2021 по 31 декабря 2024 года', type: 'PDF', url: 'https://my.debtprice.market/oferta_register_since-2021-02-05.pdf' },
  { title: 'Политика обработки персональных данных', description: 'Политика ООО «ДЕБТПРАЙС»', type: 'PDF', url: 'https://my.debtprice.market/Privacy_policy.pdf' },
  { title: 'Типовой реестр задолженности', description: 'Шаблон для подготовки данных о портфеле', type: 'XLSX', url: 'https://my.debtprice.market/DEBTPRICE_debt_list_BLANK.xlsx' },
  { title: 'Выписка из реестра участников «Сколково»', description: 'Статус участника присвоен 27 ноября 2024 года', type: 'PDF', url: 'https://my.debtprice.market/SKOLKOVO-register_DEBTRPICE-2024-11-27.pdf' },
  { title: 'Согласие на обработку персональных данных', description: 'Условия обработки данных пользователя', type: 'PDF', url: 'https://my.debtprice.market/Personal_data_consent.pdf' },
] as const;

const directions = [
  { name: 'Инвестиции', text: 'Инвесторам и компаниям, которым нужно финансирование. По вопросам поиска, привлечения и размещения инвестиций.', email: 'invest@debtprice.market' },
  { name: 'Дебиторская задолженность', text: 'Компаниям, которые продают долги юридических лиц, и покупателям таких лотов.', email: 'debt@debtprice.market' },
  { name: 'Портфели физических лиц', text: 'Банкам, МФО, КПК и другим кредиторам, коллекторским агентствам и юридическим фирмам.', email: 'sales@debtprice.market' },
  { name: 'PR и СМИ', text: 'Журналистам и редакциям: комментарии экспертов, интервью и данные о рынке долгов.', email: 'pr@debtprice.market' },
  { name: 'Общие вопросы', text: 'Поможем сориентироваться в сервисах DEBTPRICE и найти специалиста по вашей задаче.', email: 'info@debtprice.market' },
] as const;

const publications = [
  { source: 'Коммерсантъ', label: 'Деловая газета · 22 августа 2022', title: 'Плохие долги дешевеют', url: 'https://www.kommersant.ru/doc/5524152' },
  { source: 'Ведомости', label: 'Пресс-релиз · 2 декабря 2025', title: 'От цифровых продуктов до «долговых чудес»: в МТПП наградили мастеров разрешения долговых споров', url: 'https://www.vedomosti.ru/press_releases/2025/12/02/ot-tsifrovih-produktov-do-dolgovih-chudes-v-mtpp-nagradili-masterov-razresheniya-dolgovih-sporov' },
  { source: 'РБК Новосибирск', label: 'Региональное издание', title: 'Как индустрия взыскания долгов адаптируется к новой реальности', url: 'https://nsk.plus.rbc.ru/news/69a137a97a8aa967d3143e68' },
  { source: 'Рынок Взыскания', label: 'Медиа экосистемы', title: 'Привлечение инвестиций: почему коллекторский рынок становится новой точкой роста для капитала', url: 'https://rvzrus.ru/blog/3193' },
] as const;

function breadcrumb(current: string): string {
  return `<nav class="info-breadcrumb" aria-label="Хлебные крошки"><a href="#/">Главная</a><span aria-hidden="true">/</span><span aria-current="page">${current}</span></nav>`;
}

function nextStep(): string {
  return `<section class="info-next" aria-labelledby="info-next-title"><div class="container info-next__inner"><div><p class="info-eyebrow">Ваш следующий шаг</p><h2 id="info-next-title">Начните работу<br>с DEBTPRICE</h2><p>Продайте или купите долг на открытых торгах — среди 2 100+ проверенных участников рынка.</p></div><div class="info-next__actions"><a class="button button--primary" href="#/request">Оставить заявку ${icon('arrow-right')}</a><a class="info-text-link" href="${registerUrl}">Зарегистрироваться ${icon('arrow-up-right')}</a></div></div></section>`;
}

function aboutPage(): string {
  return `<div class="info-page info-page--about">
    <section class="info-hero info-hero--about" aria-labelledby="info-about-title">
      <div class="container">
        ${breadcrumb('О проекте')}
        <div class="info-hero__layout">
          <div class="info-hero__content"><p class="info-eyebrow">О проекте</p><h1 id="info-about-title">Долговые активы.<br><span>Одна экосистема.</span></h1><p class="info-hero__description">DEBTPRICE объединяет кредиторов, бизнес, взыскателей и технологические компании. Здесь банки, МФО и компании продают долги, а коллекторы и инвесторы — покупают.</p><div class="info-hero__actions"><a class="button button--primary" href="#/request">Обсудить задачу ${icon('arrow-right')}</a><a class="info-text-link" href="${accountUrl}">Перейти к торгам ${icon('arrow-up-right')}</a></div></div>
          <div class="info-hero__art" aria-hidden="true"><span class="info-hero__art-label">С 2017 года</span><img src="${asset('images/offer-panels.webp')}" alt="" width="1023" height="597" decoding="async"></div>
        </div>
        <div class="info-trust">${renderTrustBadges()}</div>
      </div>
    </section>

    <section class="info-section" aria-labelledby="info-sides-title"><div class="container"><div class="info-section-heading"><h2 class="section-title" id="info-sides-title">Обе стороны<br><span>одной сделки</span></h2><p>На DEBTPRICE размещают лоты, проводят торги и заключают договоры уступки. Цену формируют предложения участников; условия сделки закрепляются в документах.</p></div><div class="info-sides"><article class="info-side"><span class="info-side__label">Продавцу</span><h3>Представить актив.<br>Получить предложения.</h3><p>Покажите портфель участникам рынка, выберите формат торгов и условия продажи. Для корпоративной задолженности готовим аналитические заключения.</p><a class="info-text-link" href="#/sellers/portfeli">Возможности для продавца ${icon('arrow-right')}</a></article><article class="info-side"><span class="info-side__label">Покупателю</span><h3>Разобраться в долге.<br>Предложить свою цену.</h3><p>Изучите состав портфеля и документы до торгов. Сравните предложения и выберите актив с подходящими условиями приобретения.</p><a class="info-text-link" href="#/buyers">Возможности для покупателя ${icon('arrow-right')}</a></article></div></div></section>

    <section class="info-practice" aria-labelledby="info-practice-title"><div class="container"><div class="info-practice__inner"><div class="info-practice__heading"><p class="info-eyebrow">2024–2025</p><h2 id="info-practice-title">Судебная<br>практика</h2><p>В десяти рассмотренных спорах сделки, заключённые на DEBTPRICE, не были признаны недействительными.</p></div><div class="info-practice__numbers"><div><strong>10<span>из 10</span></strong><p>оспоренных сделок<br>сохранили силу</p></div><div><strong>2,5<span>млрд ₽+</span></strong><p>сумма этих сделок</p></div></div><div class="info-practice__details"><article><h3>Участвуем в спорах</h3><p>Как третье лицо предоставляем суду сведения о ходе торгов и цене сделки.</p></article><article><h3>Сохраняем историю торгов</h3><p>Протоколы позволяют восстановить ход торгов и условия продажи для ФНС, прокуратуры и МВД.</p></article></div></div></div></section>

    <section class="info-section" aria-labelledby="info-team-title"><div class="container"><div class="info-section-heading"><h2 class="section-title" id="info-team-title">Команда<br><span>DEBTPRICE</span></h2><p>Люди, которые развивают площадку, медиа, события и цифровые продукты экосистемы.</p></div><article class="info-founder"><div class="info-founder__photo"><img src="${asset('team/konstantin-vinogradov.webp')}" alt="Константин Виноградов" width="485" height="560" loading="lazy" decoding="async"></div><div class="info-founder__content"><span class="info-eyebrow">Сооснователь</span><h3>Константин<br>Виноградов</h3><p>Управляющий партнёр электронной торговой площадки DEBTPRICE</p><a class="info-text-link" href="mailto:v@debtprice.market">v@debtprice.market ${icon('arrow-up-right')}</a></div></article><div class="info-team-grid">${team.map(([name, role]) => `<article class="info-person"><h3>${name}</h3><p>${role}</p></article>`).join('')}</div></div></section>

    <section class="info-section info-history" aria-labelledby="info-history-title"><div class="container"><div class="info-section-heading"><h2 class="section-title" id="info-history-title">Наш путь</h2><p>От торговой площадки долговых портфелей к экосистеме сервисов для рынка.</p></div><div class="info-metrics"><div><strong>9<span>лет</span></strong><p>на рынке</p></div><div><strong>400<span>+</span></strong><p>компаний ежегодно<br>на наших мероприятиях</p></div><div><strong>2 100<span>+</span></strong><p>участников торгов</p></div><div><strong>94<span>%</span></strong><p>лотов продаются</p></div></div><ol class="info-timeline">${history.map(([year, title, text]) => `<li><time datetime="${year}">${year}</time><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol></div></section>

    ${renderEcosystem()}

    <section class="info-section" aria-labelledby="info-press-title"><div class="container"><div class="info-section-heading"><h2 class="section-title" id="info-press-title">О площадке<br><span>и рынке</span></h2><p>Публикации деловых и отраслевых изданий о долговых активах, технологиях и участниках рынка.</p></div><div class="info-press-grid">${publications.map((item) => `<a class="info-publication" href="${item.url}" target="_blank" rel="noopener noreferrer"><div class="info-publication__top"><span>${item.source}</span>${icon('arrow-up-right')}</div><h3>${item.title}</h3><p>${item.label}</p></a>`).join('')}</div></div></section>
    ${nextStep()}
  </div>`;
}

function docsPage(): string {
  return `<div class="info-page info-page--docs"><section class="info-hero info-hero--compact" aria-labelledby="info-docs-title"><div class="container">${breadcrumb('Документы')}<p class="info-eyebrow">Открытая информация</p><h1 id="info-docs-title">Документы<br><span>площадки</span></h1><p class="info-hero__description">Договоры, политики и реквизиты DEBTPRICE. Всё, что нужно для знакомства с условиями работы и подготовки портфеля.</p></div></section>
    <section class="info-documents" aria-label="Правовые документы DEBTPRICE"><div class="container"><div class="info-document-list">${documents.map((document, index) => `<a class="info-document" href="${document.url}" target="_blank" rel="noopener noreferrer" aria-label="${document.title}. ${document.type}, откроется в новой вкладке"><span class="info-document__index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="info-document__text"><strong>${document.title}</strong><span>${document.description}</span></span><span class="info-document__type${document.type === 'XLSX' ? ' info-document__type--sheet' : ''}">${document.type}</span><span class="info-document__arrow">${icon('arrow-up-right')}</span></a>`).join('')}</div></div></section>
    <section class="info-section info-company" aria-labelledby="info-company-title"><div class="container info-company__inner"><div><p class="info-eyebrow">Оператор площадки</p><h2 id="info-company-title">ООО «ДЕБТПРАЙС»</h2><p>Электронная торговая площадка долговых активов</p><a class="info-text-link" href="https://my.debtprice.market/DEBTPRICE_details.pdf" target="_blank" rel="noopener noreferrer">Полные реквизиты ${icon('arrow-up-right')}</a></div><dl><div><dt>ИНН</dt><dd>7608021127</dd></div><div><dt>КПП</dt><dd>760801001</dd></div><div><dt>ОГРН</dt><dd>1147608001221</dd></div><div class="info-company__address"><dt>Юридический адрес</dt><dd>152020, Ярославская область, г. Переславль-Залесский, ул. Кузнецова, д. 1, офис 11</dd></div></dl></div></section>
    <section class="info-help" aria-labelledby="info-docs-help"><div class="container info-help__inner"><div><h2 id="info-docs-help">Остались вопросы?</h2><p>Поможем с документами и условиями работы площадки.</p></div><div class="info-help__links"><a href="mailto:info@debtprice.market">${icon('mail')}info@debtprice.market</a><a href="tel:+79159724101">${icon('phone')}+7 915 972-41-01</a></div></div></section>
  </div>`;
}

function contactsPage(): string {
  return `<div class="info-page info-page--contacts"><section class="info-hero info-hero--compact" aria-labelledby="info-contacts-title"><div class="container">${breadcrumb('Контакты')}<div class="info-contact-hero"><div><p class="info-eyebrow">Будем на связи</p><h1 id="info-contacts-title">Обсудим<br><span>вашу задачу</span></h1><p class="info-hero__description">Продажа портфеля, покупка долгового актива или сотрудничество. Выберите направление — и напишите команде напрямую.</p></div><div class="info-direct-contact"><span>Общий телефон</span><a href="tel:+79159724101">+7 915 972-41-01</a><a class="info-text-link" href="#request" data-scroll="request">Оставить контакты ${icon('arrow-down')}</a></div></div></div></section>
    <section class="info-contact-section" aria-label="Контакты по направлениям"><div class="container"><div class="info-contact-grid">${directions.map((direction, index) => `<article class="info-contact-card"><span class="info-contact-card__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h2>${direction.name}</h2><p>${direction.text}</p><a class="info-contact-card__email" href="mailto:${direction.email}"><span>${direction.email}</span>${icon('arrow-up-right')}</a></article>`).join('')}<a class="info-contact-card info-contact-card--telegram" href="https://t.me/+H7LCyetXYRozYjA6" target="_blank" rel="noopener noreferrer"><span class="info-contact-card__number">Telegram</span><h2>Рядом с рынком</h2><p>Присоединяйтесь к Telegram-каналу DEBTPRICE.</p><span class="info-contact-card__email">Открыть канал ${icon('arrow-up-right')}</span></a></div></div></section>
    ${renderRequestForm('general', 'request')}
    <section class="info-contact-legal" aria-label="Сведения об операторе"><div class="container"><p>ООО «ДЕБТПРАЙС» — оператор электронной торговой площадки</p><div><span>ИНН 7608021127</span><span>ОГРН 1147608001221</span><a class="info-text-link" href="#/docs">Реквизиты и документы ${icon('arrow-right')}</a></div></div></section>
  </div>`;
}

export function renderInfoPage(route: InfoRoute): string {
  if (route === 'docs') return docsPage();
  if (route === 'contacts') return contactsPage();
  return aboutPage();
}
