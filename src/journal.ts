import { asset, escapeHtml, icon } from './ui';
import './journal.css';

export const articles = [
  { slug: 'sell-company-debt', category: 'Продавцам', title: 'Как продать долг юридического лица', excerpt: 'От первой оценки и подготовки документов до торгов и договора уступки.', image: 'receivables.webp', blocks: [
    ['Начните с оценки', 'Сообщите ИНН должника, сумму задолженности и оставьте контакт для ответа. Команда площадки изучит сведения об активе и подскажет, какие документы нужны для подготовки предложения.'],
    ['Подготовьте документы', 'Для подтверждения задолженности могут потребоваться договор, акты, накладные и судебные документы. Состав пакета зависит от конкретного долга. Полнота и согласованность данных помогают покупателю оценить предложение.'],
    ['Согласуйте условия продажи', 'Вместе с менеджером определите формат торгов и условия размещения. Предложения покупателей формируют цену, а порядок расчётов и передачи документов закрепляется в договоре.'],
    ['Завершите сделку', 'После выбора покупателя стороны согласуют договор уступки. Команда площадки сопровождает процесс; сроки оплаты и состав передаваемых документов определяются условиями сделки.'],
  ] },
  { slug: 'buyer-registration', category: 'Покупателям', title: 'Как стать участником торгов DEBTPRICE', excerpt: 'Регистрация, проверка участника и доступ к предложениям площадки.', image: 'claims.webp', blocks: [
    ['Создайте личный кабинет', 'Регистрация проходит на торговой площадке. Укажите сведения о вашей организации и контакты представителя. Менеджер поможет разобраться с порядком работы и необходимыми документами.'],
    ['Пройдите проверку', 'Доступ к торгам предоставляется после проверки участника. Требования зависят от категории клиента и приобретаемого актива. Уточните свой сценарий у команды площадки до подачи предложения.'],
    ['Изучите лот', 'Сравните состав портфеля, количество кейсов, статус задолженности, начальную цену и документы. Для корпоративной дебиторской задолженности площадка готовит аналитическое заключение.'],
    ['Выберите формат участия', 'В зависимости от лота можно сделать ставку на аукционе или направить закрытое предложение. Конкретные условия, сроки и дальнейшие действия указаны в личном кабинете.'],
  ] },
  { slug: 'portfolio-assessment', category: 'Продавцам', title: 'Какие данные нужны для оценки портфеля', excerpt: 'Структура задолженности, документы и сведения, которые помогут подготовить актив.', image: 'factoring-portfolios.webp', blocks: [
    ['Состав и структура', 'Подготовьте реестр требований с суммами, количеством договоров и основными параметрами задолженности. Для первичной работы можно использовать типовой реестр, опубликованный в разделе документов.'],
    ['Стадия работы с задолженностью', 'Отметьте, какие требования уже просужены, на какой стадии находятся дела и какие документы доступны. Важны согласованность сведений и возможность подтвердить их источниками.'],
    ['История и качество данных', 'Покупатель рассматривает возраст долга, географию и историю работы с требованиями вместе с составом документов. Аналитики помогут определить, каких сведений не хватает для представления актива.'],
    ['Оценка и цена сделки', 'Предварительная оценка даёт ориентир для обсуждения условий. Итоговая цена зависит от предложений участников и выбранного способа продажи.'],
  ] },
  { slug: 'debt-price', category: 'Аналитика', title: 'От чего зависит цена долгового актива', excerpt: 'Почему одинаковая номинальная сумма может приводить к разным предложениям покупателей.', image: 'credit-portfolios.webp', blocks: [
    ['Сумма долга и цена покупки', 'Номинальная задолженность и цена её приобретения — разные показатели. Участник оценивает состав требований, документы, предполагаемый порядок работы и условия сделки.'],
    ['Понятные данные', 'Структурированный реестр и подтверждающие документы позволяют покупателям лучше понять актив. Разрозненные или неполные сведения требуют дополнительного анализа.'],
    ['Условия и формат торгов', 'На предложения влияют параметры лота, стартовая цена, сроки и выбранный формат. Команда площадки помогает подготовить актив и представить его профильным участникам.'],
    ['Рыночные предложения', 'Для обсуждения конкретного портфеля оставьте заявку на оценку. Универсальной цены для всех долгов нет: каждый актив рассматривается отдельно.'],
  ] },
  { slug: 'auction-formats', category: 'Покупателям', title: 'Как выбрать формат торгов', excerpt: 'Повышение ставки, снижение цены, сбор предложений или объявление.', image: 'offer-panels.webp', blocks: [
    ['Английский аукцион', 'Покупатели повышают ставки. По итогам торгов лот получает участник, предложивший наибольшую цену в соответствии с установленными условиями.'],
    ['Голландский аукцион', 'Цена снижается по заранее заданному графику. Покупатель сам выбирает момент, когда готов согласиться с текущей ценой.'],
    ['Сбор предложений', 'Условия, которые направляет покупатель, не видны другим участникам. Продавец сравнивает предложения и обсуждает параметры сделки индивидуально.'],
    ['Объявление', 'Этот формат подходит для нестандартных активов. Он позволяет описать предложение и получить обратную связь заинтересованных участников рынка.'],
  ] },
  { slug: 'transaction-documents', category: 'Документы', title: 'Какие документы сопровождают сделку', excerpt: 'Реестр, подтверждение требований и условия передачи актива.', image: 'claims.webp', blocks: [
    ['Реестр задолженности', 'Реестр описывает состав передаваемых требований. Типовой файл можно открыть в разделе документов площадки и обсудить с менеджером состав данных для вашего портфеля.'],
    ['Подтверждающие материалы', 'Набор материалов зависит от вида актива. Это могут быть договоры, первичные документы и сведения о судебных или исполнительных производствах. Состав доступного пакета уточняется по конкретному лоту.'],
    ['Условия торгов и договора', 'Перед участием ознакомьтесь с условиями лота, порядком расчётов и передачи документов. Обязательства сторон определяются документами сделки; вопросы по ним можно обсудить с менеджером и вашим юристом.'],
    ['Документы площадки', 'В разделе «Документы» размещены ссылки на официальный договор использования портала, политику обработки данных, согласие и реквизиты DEBTPRICE.'],
  ] },
] as const;

function articleCard(item: (typeof articles)[number]): string {
  return `<a class="journal-card" href="#/journal/${item.slug}"><div class="journal-card__media"><img src="${asset(`images/${item.image}`)}" alt="" width="570" height="488" loading="lazy" decoding="async"><span>${icon('arrow-up-right')}</span></div><div class="journal-card__body"><span>${item.category}</span><h3>${item.title}</h3><p>${item.excerpt}</p><small>Памятка по работе с площадкой</small></div></a>`;
}
export function renderJournalPreview(): string {
  return `<section class="journal-preview section" aria-labelledby="journal-preview-title"><div class="container"><div class="section-heading"><div><span class="eyebrow">Разобраться до сделки</span><h2 class="section-title" id="journal-preview-title">Частые <span>вопросы</span></h2></div><a class="text-link" href="#/journal">Все материалы ${icon('arrow-right')}</a></div><div class="journal-grid">${[articles[0], articles[1], articles[4]].map(articleCard).join('')}</div></div></section>`;
}
export function renderJournalPage(slug?: string): string {
  const item = articles.find((article) => article.slug === slug);
  if (!slug) return `<div class="journal-page"><header class="container journal-page__header"><a class="breadcrumb" href="#/">Главная ${icon('arrow-right')}</a><span class="eyebrow">Продажа, покупка и документы</span><h1>Частые вопросы</h1><p>Памятки о работе с площадкой. Узнайте, как подготовить актив, изучить предложение и пройти путь до сделки.</p></header><section class="container journal-page__list"><div class="segmented journal-filters" role="tablist" aria-label="Темы материалов"><button id="journal-tab-all" role="tab" type="button" aria-selected="true" aria-controls="journal-grid" data-journal-filter="all">Все материалы</button><button id="journal-tab-seller" role="tab" type="button" aria-selected="false" aria-controls="journal-grid" tabindex="-1" data-journal-filter="Продавцам">Продавцам</button><button id="journal-tab-buyer" role="tab" type="button" aria-selected="false" aria-controls="journal-grid" tabindex="-1" data-journal-filter="Покупателям">Покупателям</button><button id="journal-tab-docs" role="tab" type="button" aria-selected="false" aria-controls="journal-grid" tabindex="-1" data-journal-filter="Документы">Документы</button></div><div class="journal-list-stage"><div class="journal-grid" id="journal-grid" role="tabpanel" aria-labelledby="journal-tab-all">${articles.map(articleCard).join('')}</div></div></section><aside class="container journal-media"><span>${icon('document')}</span><div><h2>Больше о рынке — в «Рынке Взыскания»</h2><p>Новости, аналитика и интервью с профессиональным сообществом.</p></div><a class="button button--primary" href="https://rvzrus.ru/" target="_blank" rel="noopener noreferrer">Открыть медиа ${icon('arrow-up-right')}</a></aside></div>`;
  if (!item) return `<section class="container journal-page__header"><a class="breadcrumb" href="#/journal">Все материалы ${icon('arrow-right')}</a><h1>Материал не найден</h1><p>Выберите другую памятку в разделе частых вопросов.</p></section>`;
  return `<article class="journal-article"><header class="container journal-article__header"><a class="breadcrumb" href="#/journal">Частые вопросы ${icon('arrow-right')}</a><span class="eyebrow">${item.category} · Памятка DEBTPRICE</span><h1>${item.title}</h1><p>${item.excerpt}</p></header><div class="container journal-article__layout"><div class="journal-article__content">${item.blocks.map((block, i) => `<section><span>0${i + 1}</span><div><h2>${block[0]}</h2><p>${block[1]}</p></div></section>`).join('')}<div class="journal-article__actions"><a class="button button--primary" href="#/request">Обсудить вашу задачу ${icon('arrow-right')}</a><a class="text-link" href="#/docs">Документы площадки ${icon('arrow-up-right')}</a></div></div><aside class="journal-article__aside"><img src="${asset(`images/${item.image}`)}" alt="" width="570" height="488"><h2>Ваша задача —<br>наш следующий шаг</h2><p>Команда DEBTPRICE поможет разобраться с активом и условиями работы.</p><a class="text-link" href="mailto:v@debtprice.market">Связаться с нами ${icon('arrow-right')}</a></aside></div><section class="container journal-related"><div class="section-heading"><h2 class="section-title">Другие материалы</h2><a class="text-link" href="#/journal">Все вопросы ${icon('arrow-right')}</a></div><div class="journal-grid">${articles.filter((entry) => entry.slug !== item.slug).slice(0, 3).map(articleCard).join('')}</div></section></article>`;
}

export function journalCardsFor(category: string): string {
  return articles.filter((item) => category === 'all' || item.category === category).map(articleCard).join('');
}

export const sitePages = [
  { route: 'sellers/portfeli', title: 'Продажа портфелей физических лиц', description: 'Оценка, подготовка и продажа портфеля — от одного договора.' },
  { route: 'sellers/debitorka', title: 'Продажа дебиторской задолженности', description: 'Оценка и продажа долгов юридических лиц от 500 000 ₽.' },
  { route: 'buyers', title: 'Покупателям', description: 'Лоты, форматы торгов, аналитика и условия участия.' },
  { route: 'about', title: 'О проекте DEBTPRICE', description: 'Команда, история, профессиональные статусы и экосистема.' },
  { route: 'docs', title: 'Документы и реквизиты', description: 'Договор, политика обработки данных и типовой реестр задолженности.' },
  { route: 'contacts', title: 'Контакты команды', description: 'Телефон и адреса по направлениям: инвестиции, портфели, дебиторка, PR.' },
] as const;

export function searchSitePages(query: string): { title: string; description: string; href: string; label: string }[] {
  const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const terms = normalize(query).split(/\s+/u).filter(Boolean);
  const matches = (text: string) => terms.length > 0 && terms.every((term) => normalize(text).includes(term));
  return [...sitePages.filter((item) => matches(`${item.title} ${item.description}`)).map((item) => ({ title: item.title, description: item.description, href: `#/${item.route}`, label: 'Раздел сайта' })), ...articles.filter((item) => matches(`${item.title} ${item.excerpt} ${item.category}`)).map((item) => ({ title: item.title, description: item.excerpt, href: `#/journal/${item.slug}`, label: item.category }))];
}
export const renderSearchResults = (query: string, results: ReturnType<typeof searchSitePages>) => `<div class="search-page container"><a class="breadcrumb" href="#/">Главная ${icon('arrow-right')}</a><span class="eyebrow">Поиск по сайту</span><h1>${query ? `Результаты по запросу «${escapeHtml(query)}»` : 'Что вы ищете?'}</h1>${results.length ? `<div class="search-page__list">${results.map((item) => `<a href="${item.href}"><small>${item.label}</small><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p>${icon('arrow-up-right')}</a>`).join('')}</div>` : `<p class="search-page__empty">По этому запросу ничего не найдено. Попробуйте другое название, вид актива или раздел сайта.</p><a class="button button--primary" href="#/">Вернуться на главную ${icon('arrow-left')}</a>`}</div>`;
