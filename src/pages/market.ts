import './market.css';
import { accountUrl, asset, escapeHtml, icon, registerUrl } from '../ui';
import {
  renderEcosystem,
  renderFormats,
  renderJournalPreview,
  renderLotsSection,
  renderPartners,
  renderProcess,
  renderRequestForm,
  renderTrustBadges,
} from '../sections';

type MarketRoute = 'sellers/portfeli' | 'sellers/debitorka' | 'buyers';
type Benefit = { title: string; text: string; metric?: string; link?: string };
type AssetType = { title: string; text: string };

const heroContent = {
  'sellers/portfeli': {
    kind: 'portfolio',
    title: 'Продажа портфелей физических лиц',
    description: 'Оценим портфель, подготовим его к торгам и найдём покупателей. Поможем заключить сделку. Комиссии для продавца нет.',
    cta: 'Бесплатная оценка портфеля',
    image: 'factoring-portfolios.webp',
    imageWidth: 858,
    imageHeight: 734,
  },
  'sellers/debitorka': {
    kind: 'receivables',
    title: 'Продажа дебиторской задолженности',
    description: 'Предложите долг контрагента профессиональным покупателям. Оценим актив, подготовим документы и поможем выбрать условия продажи.',
    cta: 'Бесплатно оценить долг',
    image: 'receivables.webp',
    imageWidth: 570,
    imageHeight: 488,
  },
  buyers: {
    kind: 'buyer',
    title: 'Покупка проверенных портфелей',
    description: 'Портфели банков и МФО, дебиторская задолженность компаний. Реестры в едином формате, документы для оценки и сопровождение сделки.',
    cta: 'Стать участником торгов',
    image: 'offer-panels.webp',
    imageWidth: 1023,
    imageHeight: 597,
  },
} as const;

function requestLink(label: string, variant = 'primary'): string {
  return `<a class="button button--${variant} market-action" href="#request" data-scroll="request"><span>${escapeHtml(label)}</span>${icon('arrow-right')}</a>`;
}

function registrationLink(label = 'Стать участником торгов', variant = 'primary'): string {
  return `<a class="button button--${variant} market-action" href="${registerUrl}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(label)}</span>${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a>`;
}

function renderHero(route: MarketRoute): string {
  const page = heroContent[route];
  const buyer = route === 'buyers';
  return `<section class="market-hero market-hero--${page.kind}" aria-labelledby="market-title">
    <div class="container market-hero-inner">
      <div class="market-hero-copy">
        <h1 id="market-title" data-text-reveal>${page.title}</h1>
        <p class="market-hero-lead">${page.description}</p>
        <div class="market-hero-actions" data-reveal>
          ${buyer ? registrationLink(page.cta, 'white') : requestLink(page.cta, 'white')}
          ${buyer
            ? `<a class="market-text-link market-text-link--light" href="#lots" data-scroll="lots">Выбрать лот ${icon('arrow-down')}</a>`
            : `<a class="market-text-link market-text-link--light" href="${accountUrl}" target="_blank" rel="noopener noreferrer">Торговая площадка ${icon('arrow-up-right')}<span class="sr-only"> — в новой вкладке</span></a>`}
        </div>
        <div class="market-hero-facts" data-stagger>
          <div class="market-hero-fact"><strong>2 100<span>+</span></strong><span>участников рынка</span></div>
          <div class="market-hero-fact">${buyer
            ? `<strong>${icon('folders')}</strong><span>проверка активов<br>до выхода на торги</span>`
            : '<strong>0 <span>₽</span></strong><span>комиссия<br>для продавца</span>'}</div>
        </div>
      </div>
      <div class="market-hero-visual" aria-hidden="true" data-reveal>
        <img class="market-hero-image" src="${asset(`images/${page.image}`)}" alt="" width="${page.imageWidth}" height="${page.imageHeight}" decoding="async" fetchpriority="high">
      </div>
      <div class="market-hero-trust">${renderTrustBadges()}</div>
    </div>
  </section>`;
}

function renderBenefits(title: string, lead: string, benefits: readonly Benefit[]): string {
  return `<section class="market-section" aria-labelledby="market-benefits-title">
    <div class="container">
      <div class="market-section-heading"><div><h2 class="section-title" id="market-benefits-title" data-text-reveal>${title}</h2></div><p class="market-section-lead">${lead}</p></div>
      <div class="market-benefit-grid${benefits.length === 5 ? ' market-benefit-grid--five' : ''}" data-stagger>
        ${benefits.map((item) => `<article class="market-benefit">
          <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>
          ${item.metric ? `<strong class="market-benefit-metric">${escapeHtml(item.metric)}</strong>` : ''}
          ${item.link ? `<a class="market-text-link" href="${item.link}">О площадке ${icon('arrow-up-right')}</a>` : ''}
        </article>`).join('')}
      </div>
    </div>
  </section>`;
}

const portfolioBenefits: readonly Benefit[] = [
  { title: 'Персональная стратегия', text: 'Изучаем состав портфеля и выбираем подходящий формат торгов.' },
  { metric: '0 ₽', title: 'Бесплатно для продавца', text: 'Комиссии для продавца нет. Расходы по сделке несёт покупатель.' },
  { title: 'Проверенные покупатели', text: 'К торгам по портфелям физлиц допускаются ПКО из государственного реестра ФССП, прошедшие проверку на площадке.' },
  // Figures and period are supplied in the client brief; this describes past cases, not a guarantee.
  { metric: '10 из 10', title: 'Судебная практика', text: 'В 2024–2025 годах 10 из 10 оспоренных сделок на площадке устояли в судах. Общая сумма этих сделок — более 2,5 млрд ₽.', link: '#/about' },
];

const buyerBenefits: readonly Benefit[] = [
  { title: 'Эксклюзивные лоты', text: 'Портфели, которые выставлены только на аукционе DEBTPRICE. От банков и МФО до корпоративных кредиторов.' },
  { title: 'Без фиксированных издержек', text: 'Участие в торгах бесплатно. Оплата — по результату сделки; её условия закрепляются в документах площадки.' },
  { title: 'Личный менеджер', text: 'Поможет с регистрацией, изучением условий лота и оформлением договора уступки.' },
  { metric: '10 из 10', title: 'Опыт сопровождения споров', text: 'В 2024–2025 годах 10 из 10 оспоренных сделок на площадке не были признаны недействительными. Сведения о торгах и цене помогают восстановить условия продажи.', link: '#/about' },
];

const portfolioAssets: readonly AssetType[] = [
  { title: 'Кредитные портфели', text: 'Залоговые и беззалоговые: автокредиты, ипотека, потребительские кредиты.' },
  { title: 'Факторинговые портфели', text: 'Права требования, уступленные по договорам факторинга.' },
  { title: 'Страховые портфели', text: 'Права требования страховых компаний.' },
  { title: 'Долги перед сервисами', text: 'Задолженность перед каршерингом и операторами услуг.' },
];

const buyerAssets: readonly AssetType[] = [
  { title: 'Кредитные портфели', text: 'Залоговые и беззалоговые: авто, ипотека, потребительские кредиты. Портфели банков и МФО.' },
  { title: 'Долги перед сервисами', text: 'Задолженность клиентов каршеринга и операторов услуг.' },
  { title: 'Дебиторская задолженность', text: 'Долги корпоративных клиентов — с аналитическим заключением по каждому лоту.' },
  { title: 'Факторинговые портфели', text: 'Права требования, уступленные факторинговыми компаниями.' },
  { title: 'Права требования', text: 'По гражданско-правовым договорам и возмещению имущественного вреда.' },
];

function renderAssets(buyer = false): string {
  const entries = buyer ? buyerAssets : portfolioAssets;
  return `<section class="market-section market-section--tinted" aria-labelledby="market-assets-title">
    <div class="container">
      <div class="market-section-heading"><div><h2 class="section-title" id="market-assets-title" data-text-reveal>${buyer ? 'Что можно <span>купить</span>' : 'Какие портфели<br>можно <span>продать</span>'}</h2></div><p class="market-section-lead">${buyer ? 'Выбирайте актив под вашу специализацию и стратегию работы с задолженностью.' : 'Долги физических лиц в любом объёме — от одного договора до большого портфеля.'}</p></div>
      <div class="market-asset-grid${buyer ? ' market-asset-grid--buyer' : ''}" data-stagger>
        ${entries.map((entry) => `<article class="market-asset-card"><h3>${entry.title}</h3><p>${entry.text}</p></article>`).join('')}
      </div>
      <div class="market-section-action">${buyer ? registrationLink() : requestLink('Оставить заявку на оценку')}</div>
    </div>
  </section>`;
}

function renderPortfolioAssessment(): string {
  return `<section class="market-section" aria-labelledby="market-assessment-title"><div class="container market-assessment">
    <div class="market-assessment-copy"><h2 class="section-title" id="market-assessment-title" data-text-reveal>Бесплатная<br><span>оценка портфеля</span></h2><p class="market-copy">Изучим состав задолженности и документы. Оценим портфель и подскажем, какие данные понадобятся покупателям.</p>
      <ul class="market-check-list"><li>${icon('check')}Структура и состав задолженности</li><li>${icon('check')}Качество и полнота документов</li><li>${icon('check')}Подходящий формат продажи</li></ul>${requestLink('Получить оценку')}
    </div><div class="market-assessment-visual" aria-hidden="true" data-reveal><img src="${asset('images/credit-portfolios.webp')}" alt="" width="570" height="488" loading="lazy" decoding="async"></div>
  </div></section>`;
}

function renderComparison(): string {
  const own = [
    ['Когда получите деньги', 'По мере взыскания. Срок зависит от спора, исполнительного производства и наличия средств у должника.'],
    ['Сколько получите', 'Зависит от фактического исполнения требований и расходов на взыскание.'],
    ['Ваши расходы', 'Госпошлина, работа юристов и время вашей команды.'],
    ['Кто занимается долгом', 'Вы организуете взыскание и несёте риск неплатежа.'],
  ];
  const sale = [
    ['Когда получите деньги', 'В сроки и на условиях, согласованных в договоре уступки.'],
    ['Сколько получите', 'Цену определяют предложения покупателей. Минимальную цену продажи устанавливаете вы.'],
    ['Ваши расходы', 'Комиссии для продавца нет. Расходы по сделке несёт покупатель.'],
    ['Кто занимается долгом', 'Взысканием занимается покупатель. При инкассоцессии итоговая выплата зависит от результата взыскания.'],
  ];
  const rows = (entries: string[][]) => entries.map(([label, value]) => `<div class="market-comparison-row"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  return `<section class="market-section" aria-labelledby="market-comparison-title"><div class="container">
    <div class="market-section-heading"><div><h2 class="section-title" id="market-comparison-title" data-text-reveal>Взыскивать долг<br><span>или продать?</span></h2></div><p class="market-section-lead">Сравните сроки, расходы и участие вашей команды в каждом варианте.</p></div>
    <div class="market-comparison-grid" data-stagger><article class="market-comparison-card"><h3>Взыскивать самому</h3><dl>${rows(own)}</dl></article><article class="market-comparison-card market-comparison-card--sale"><h3>Продать на DEBTPRICE</h3><dl>${rows(sale)}</dl></article></div>
    <div class="market-section-action">${requestLink('Обсудить продажу долга')}</div>
  </div></section>`;
}

function renderEligibility(): string {
  return `<section class="market-section market-section--tinted" aria-labelledby="market-eligibility-title"><div class="container market-eligibility">
    <div><h2 class="section-title" id="market-eligibility-title" data-text-reveal>Сколько можно<br><span>получить за ваш долг?</span></h2><p class="market-copy">Бесплатно изучим задолженность и подскажем, какие документы помогут представить её покупателям. Решение о продаже остаётся за вами.</p>${requestLink('Оценить долг')}</div>
    <div class="market-eligibility-card"><h3>Какой долг можно продать</h3><ul class="market-eligibility-list" data-stagger><li><span class="market-icon-tile">${icon('briefcase')}</span><div><strong>Должник — юридическое лицо</strong><p>Не находится в процедуре банкротства.</p></div></li><li><span class="market-icon-tile">${icon('coins')}</span><div><strong>От 500 000 ₽</strong><p>Сумма задолженности для оценки на площадке.</p></div></li><li><span class="market-icon-tile">${icon('folders')}</span><div><strong>Есть подтверждающие документы</strong><p>Договор, акты, накладные или решение суда.</p></div></li></ul></div>
  </div></section>`;
}

function renderModels(): string {
  return `<section class="market-section" id="market-models" aria-labelledby="market-models-title"><div class="container">
    <div class="market-section-heading"><div><h2 class="section-title" id="market-models-title" data-text-reveal>Две модели<br><span>продажи долга</span></h2></div><p class="market-section-lead">Обсудим условия под ваш актив и задачу. Минимальную цену и порядок расчётов закрепляем до сделки.</p></div>
    <div class="market-model-grid" data-stagger>
      <article class="market-model"><h3>Цессия</h3><p class="market-model-intro">Продаёте право требования по цене, согласованной по итогам торгов. Дальше долгом занимается покупатель.</p><div class="market-model-payment">${icon('coins')}<div><strong>Оплата по договору</strong><span>Согласованная сумма сделки</span></div></div>
        <details class="market-model-details"><summary>Как работает цессия ${icon('chevron-down')}</summary><dl><div><dt>Что передаёте</dt><dd>Право требования к должнику и предусмотренные договором документы.</dd></div><div><dt>Когда получаете деньги</dt><dd>После подписания договора, в согласованные сторонами сроки.</dd></div><div><dt>Что дальше</dt><dd>Взыскание ведёт покупатель. Дальнейшие отношения сторон определяет договор уступки.</dd></div><div><dt>Когда подходит</dt><dd>Хотите получить согласованную цену и передать работу с долгом покупателю.</dd></div></dl></details>
      </article>
      <article class="market-model market-model--shared"><h3>Инкассоцессия</h3><p class="market-model-intro">Часть денег получаете после сделки. Последующие поступления от взыскания делите с покупателем на согласованных условиях.</p><div class="market-model-payment">${icon('coins')}<div><strong>Первоначальная выплата + поступления</strong><span>Итог зависит от взысканного</span></div></div>
        <details class="market-model-details"><summary>Как работает инкассоцессия ${icon('chevron-down')}</summary><dl><div><dt>Что передаёте</dt><dd>Право требования с условием о разделе поступлений от взыскания.</dd></div><div><dt>Когда получаете деньги</dt><dd>Часть — после подписания договора. Остальное — по мере взыскания и в порядке, указанном в договоре.</dd></div><div><dt>Что дальше</dt><dd>Покупатель ведёт взыскание. Поступления сверх первоначальной выплаты делятся в согласованной пропорции.</dd></div><div><dt>Когда подходит</dt><dd>Готовы ждать последующих поступлений и учитывать зависимость итоговой суммы от результата взыскания.</dd></div></dl></details>
      </article>
    </div><div class="market-section-action">${requestLink('Выбрать условия продажи')}</div>
  </div></section>`;
}

function renderSecurity(): string {
  return `<section class="market-section" aria-labelledby="market-security-title"><div class="container market-security">
    <div class="market-security-intro"><h2 class="section-title" id="market-security-title" data-text-reveal>Проверка<br>до допуска к торгам</h2><p>До сделки проверяем участников и документы. На площадке работают ПКО, юридические фирмы, арбитражные управляющие и компании.</p><div class="market-security-number">2 100<span>+</span></div><p class="market-security-caption">верифицированных участников</p></div>
    <div class="market-security-items" data-stagger><article><h3>Проверка продавца и покупателя</h3><p>Проверяем компанию, её представителей и документы. Порядок допуска зависит от типа участника и актива.</p></article><article><h3>Зафиксированные условия</h3><p>Документы лота, порядок продажи и договор уступки помогают сторонам согласовать, какой актив передаётся и как проходят расчёты.</p><a class="market-text-link" href="#/docs">Документы площадки ${icon('arrow-up-right')}</a></article></div>
  </div></section>`;
}

const media = [
  { outlet: 'Рынок Взыскания', title: 'Привлечение инвестиций: почему коллекторский рынок становится новой точкой роста для капитала', url: 'https://rvzrus.ru/blog/3193', note: 'Медиа экосистемы' },
  { outlet: 'Коммерсантъ', title: 'Плохие долги дешевеют', url: 'https://www.kommersant.ru/doc/5524152', note: '22 августа 2022' },
  { outlet: 'Ведомости', title: 'В МТПП наградили мастеров разрешения долговых споров', url: 'https://www.vedomosti.ru/press_releases/2025/12/02/ot-tsifrovih-produktov-do-dolgovih-chudes-v-mtpp-nagradili-masterov-razresheniya-dolgovih-sporov', note: 'Пресс-релиз · 2 декабря 2025' },
  { outlet: 'РБК Новосибирск', title: 'Как индустрия взыскания долгов адаптируется к новой реальности', url: 'https://nsk.plus.rbc.ru/news/69a137a97a8aa967d3143e68', note: 'Рынок взыскания' },
  { outlet: 'Национальный банковский журнал', title: 'DOLG TALK 2025: тренды, финансы и технологии на рынке взыскания', url: 'https://nbj.ru/events/18-aprelya-2025-goda-sostoitsya-konferentsiya/68777/', note: '25 марта 2025' },
  { outlet: 'РБК Компании', title: '«Право онлайн» — на шестом месте в рейтинге лучших ПКО России', url: 'https://companies.rbc.ru/amp/news/be973753-6c15-40a1-a8ed-f661e53b7948/', note: 'Рейтинг ПКО' },
  { outlet: 'Московская ТПП', title: 'Эксперты обсудили новации в долговой сфере', url: 'https://moscow.tpprf.ru/ru/news/589282/', note: 'Деловое сообщество' },
  { outlet: 'ID Collect', title: 'Объём закрытых сделок цессии МФО достиг исторического максимума', url: 'https://idcollect.ru/about/news/obem-zakrytyh-sdelok-tsessii-mfo-dostig-istoricheskogo-maksimuma/', note: 'Рынок цессии' },
] as const;

function renderMedia(): string {
  return `<section class="market-section" aria-labelledby="market-media-title"><div class="container"><div class="market-section-heading"><div><h2 class="section-title" id="market-media-title" data-text-reveal>О площадке<br><span>и долговом рынке</span></h2></div><p class="market-section-lead">Публикации о торгах, участниках рынка и развитии отрасли.</p></div><div class="market-media-grid" data-stagger>${media.map((item) => `<a class="market-media-card" href="${item.url}" target="_blank" rel="noopener noreferrer"><div class="market-media-top"><span>${item.outlet}</span>${icon('arrow-up-right')}</div><h3>${item.title}</h3><p>${item.note}<span class="sr-only">. Открыть публикацию в новой вкладке</span></p></a>`).join('')}</div></div></section>`;
}

function renderBuyerAnalytics(): string {
  const individual = ['Реестр задолженности', 'Разбивка по стадиям и сегментам', 'Аналитика портфеля', 'Юридические документы'];
  const company = ['Финансовый анализ должника', 'Правовой анализ', 'Исполнительные производства', 'Банкротный мониторинг', 'Юридический анализ долга', 'Итоговая оценка'];
  const list = (items: readonly string[]) => `<ul class="market-analysis-list">${items.map((item) => `<li>${icon('check')}<span>${item}</span></li>`).join('')}</ul>`;
  return `<section class="market-section" aria-labelledby="market-analysis-title"><div class="container">
    <div class="market-section-heading"><div><h2 class="section-title" id="market-analysis-title" data-text-reveal>Что известно<br><span>об активе до торгов</span></h2></div><p class="market-section-lead">Данные в едином формате помогают сравнить портфели и оценить условия до участия в торгах.</p></div>
    <div class="market-analysis-grid" data-stagger><article class="market-analysis-card"><h3>Портфели физлиц</h3><p>Состав задолженности и документы для вашей собственной оценки.</p>${list(individual)}</article><article class="market-analysis-card market-analysis-card--corporate"><h3>Дебиторка юрлиц</h3><p>Аналитическое заключение площадки по каждому корпоративному лоту.</p>${list(company)}</article></div>
  </div></section>`;
}

function renderPortfolioPage(): string {
  return `${renderHero('sellers/portfeli')}${renderPartners(true)}
    ${renderBenefits('Что берём<br><span>на себя</span>', 'Готовим актив к продаже и сопровождаем сделку до передачи документов.', portfolioBenefits)}
    ${renderAssets()}${renderPortfolioAssessment()}${renderFormats()}${renderProcess('seller')}${renderRequestForm('portfolio', 'request')}${renderEcosystem()}${renderJournalPreview()}`;
}

function renderReceivablesPage(): string {
  return `${renderHero('sellers/debitorka')}${renderPartners(true)}${renderComparison()}${renderEligibility()}
    ${renderModels()}${renderFormats()}${renderSecurity()}${renderProcess('receivables')}${renderRequestForm('receivables', 'request')}${renderMedia()}${renderEcosystem()}`;
}

function renderBuyerPage(): string {
  return `${renderHero('buyers')}${renderPartners(true)}${renderLotsSection()}
    ${renderBenefits('Условия<br><span>для покупателя</span>', 'Доступ к торгам, сопровождение и документы — от регистрации до договора уступки.', buyerBenefits)}
    ${renderBuyerAnalytics()}${renderAssets(true)}${renderFormats()}${renderProcess('buyer')}${renderRequestForm('buyer', 'request')}${renderEcosystem()}${renderJournalPreview()}`;
}

export function renderMarketPage(route: MarketRoute): string {
  const content = route === 'sellers/portfeli' ? renderPortfolioPage() : route === 'sellers/debitorka' ? renderReceivablesPage() : renderBuyerPage();
  return `<div class="market-page market-page--${heroContent[route].kind}">${content}</div>`;
}
