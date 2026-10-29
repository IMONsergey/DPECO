import { accountUrl, asset, escapeHtml, icon, registerUrl, telegramUrl, type IconName } from './ui';
import { renderJournalPreview } from './journal';
import './sections.css';
export { renderJournalPreview };

export type RequestKind = 'general' | 'portfolio' | 'receivables' | 'buyer';

export const ecosystem = [
  { name: 'DEBTPRICE', label: 'Торговая площадка', text: 'Продажа и покупка долговых активов на открытых торгах.', href: accountUrl, icon: 'coins' as IconName },
  { name: 'Рынок Взыскания', label: 'Медиа', text: 'Новости, аналитика, судебная практика и интервью с участниками рынка.', href: 'https://rvzrus.ru/', icon: 'document' as IconName },
  { name: 'DEBT TECH', label: 'Технологии и встречи', text: 'Конференция о технологиях, которые меняют работу с долгом.', href: 'https://debt-tech.ru/', icon: 'grid' as IconName },
  { name: 'DOLG TALK', label: 'Профессиональное сообщество', text: 'Форум для банков, МФО, взыскателей, инвесторов и торговых площадок.', href: 'https://dolgtalk.ru/', icon: 'users' as IconName },
  { name: 'Навигатор решений', label: 'Каталог технологий', text: 'Сервисы для работы с долгом: от скоринга до банкротства.', href: 'https://navigator.debt-tech.ru/', icon: 'globe' as IconName },
  { name: 'ПКО-300', label: 'Рейтинг', text: 'Рейтинг коллекторских агентств по данным ФНС.', href: 'https://pko300.ru/', icon: 'chart' as IconName },
] as const;

export function renderTrustBadges(): string {
  return `<div class="trust-badges" aria-label="Профессиональные статусы"><span>${icon('shield')}Участник «Сколково»</span><span>${icon('check')}Член НСФР</span><span>${icon('check')}Член ТПП РФ</span></div>`;
}

const partners = [['fasp', 'ФАСП'], ['pkb', 'ПКБ'], ['inkas-collect', 'Инкас Коллект'], ['legal-collection', 'Legal Collection'], ['express-collection', 'Express Collection'], ['sit', 'СИТ Коллектор'], ['skm', 'СКМ'], ['trust', 'ТРАСТ']] as const;
export function renderPartners(light = false): string {
  const group = (copy: boolean) => `<div class="partners__group" ${copy ? 'aria-hidden="true"' : ''}>${partners.map(([file, name]) => `<div class="partner"><img src="${asset(`partners/${file}.webp`)}" alt="" width="148" height="52" loading="lazy" decoding="async"><span>${name}</span></div>`).join('')}</div>`;
  return `<section class="partners${light ? ' partners--light' : ''}" aria-label="Наши партнёры"><div class="container partners__heading"><h2>Наши партнёры</h2><p>во всех регионах России и ещё более <span>500 компаний</span></p></div><div class="partners__marquee" role="region" aria-label="Партнёры DEBTPRICE"><div class="partners__track">${group(false)}${group(true)}</div></div></section>`;
}

export function renderLotsSection(): string {
  return `<section class="lots section" id="lots" aria-labelledby="lots-title">
    <div class="lots__dots" data-dots data-dots-color="#0ba69e" data-dots-opacity="0.18" data-dots-end-opacity="0" data-dots-spacing="19"></div>
    <div class="container section__content">
      <div class="section-heading"><div><h2 class="section-title" id="lots-title" data-text-reveal><span>Лоты</span> и расписание</h2></div><a class="text-link" href="${telegramUrl}" target="_blank" rel="noopener noreferrer">Лоты в Telegram ${icon('arrow-up-right')}</a></div>
      <div class="lots__toolbar"><div class="segmented lot-filters" role="tablist" aria-label="Виды лотов">
        <button type="button" role="tab" id="filter-all" aria-selected="true" aria-controls="lots-grid" data-filter="all">Все лоты</button>
        <button type="button" role="tab" id="filter-receivables" aria-selected="false" aria-controls="lots-grid" tabindex="-1" data-filter="receivables">Дебиторская задолженность</button>
        <button type="button" role="tab" id="filter-individuals" aria-selected="false" aria-controls="lots-grid" tabindex="-1" data-filter="individuals">Портфели физлиц</button>
      </div><a class="button button--primary lots__account" href="${accountUrl}"><span>Перейти к торгам</span>${icon('login')}</a></div>
      <p class="sr-only" id="lots-announcement" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="lots__stage"><div class="lots__grid" id="lots-grid" role="tabpanel" aria-labelledby="filter-all" tabindex="0"></div></div>
      <p class="lots__source">Данные площадки на 29 октября 2026. Текущий статус и условия — <a href="${accountUrl}">в личном кабинете ${icon('arrow-up-right')}</a>.</p>
    </div></section>`;
}

const auctionFormats = [
  { id: 'english', number: '01', title: 'Английский аукцион', short: 'Цена растёт', text: 'Покупатели повышают ставки. Лот получает участник, который предложил наибольшую цену.', detail: 'Продавец определяет условия и стартовую цену. Открытая конкуренция помогает найти рыночную стоимость актива.', foot: 'Побеждает максимальная ставка' },
  { id: 'dutch', number: '02', title: 'Голландский аукцион', short: 'Цена снижается', text: 'Цена снижается по заданному графику. Лот получает первый покупатель, который согласится с текущей ценой.', detail: 'Параметры снижения и минимальная цена определяются до начала торгов. Участник сам выбирает момент покупки.', foot: 'Побеждает первый согласившийся' },
  { id: 'offers', number: '03', title: 'Сбор предложений', short: 'Условия обсуждаются', text: 'Покупатели направляют предложения, которые не видят другие участники. Продавец сравнивает условия.', detail: 'Подходит, когда важны не только цена, но и другие параметры сделки. Финальные условия согласовываются индивидуально.', foot: 'Предложения закрыты для других участников' },
  { id: 'listing', number: '04', title: 'Объявления', short: 'Открытый диалог', text: 'Разместите нестандартный актив, для которого классические торги не подходят, и получите обратную связь рынка.', detail: 'Опишите актив и желаемые условия. Заинтересованные покупатели смогут обсудить предложение с продавцом.', foot: 'Формат для нестандартных активов' },
] as const;

function formatVisual(id: string): string {
  if (id === 'english' || id === 'dutch') {
    const rise = id === 'english';
    const path = rise ? 'M35 215H100V175H165V137H230V94H295V48H355' : 'M35 48H100V90H165V132H230V172H295V215H355';
    return `<div class="format-chart"><span>${rise ? 'Повышение ставки' : 'Снижение цены'}</span><svg viewBox="0 0 390 260" fill="none" aria-hidden="true"><path d="M35 30V235H365" stroke="currentColor" opacity=".18"/><path d="M35 75H365M35 125H365M35 175H365" stroke="currentColor" stroke-dasharray="2 7" opacity=".12"/><path class="format-chart__path" pathLength="1" d="${path}" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle class="format-chart__point" cx="355" cy="${rise ? 48 : 215}" r="10" fill="currentColor"/><circle class="format-chart__point" cx="355" cy="${rise ? 48 : 215}" r="19" stroke="currentColor" opacity=".2"/></svg><div><span>Начало торгов</span><span>Сделка</span></div></div>`;
  }
  if (id === 'offers') return `<div class="format-offers" aria-hidden="true"><div>${icon('mail')}<span>Предложение 01</span><i></i></div><div>${icon('mail')}<span>Предложение 02</span><i></i></div><div>${icon('mail')}<span>Предложение 03</span><i></i></div><p>${icon('shield')}Условия видит только продавец</p></div>`;
  return `<div class="format-listing" aria-hidden="true"><span>${icon('briefcase')}</span><strong>Ваш актив</strong><p>Описание и условия</p><i></i><i></i><div>Обсудить предложение ${icon('arrow-right')}</div></div>`;
}

export function renderFormats(): string {
  return `<section class="formats section" id="formats" aria-labelledby="formats-title"><div class="container"><div class="section-heading"><div><h2 class="section-title" id="formats-title" data-text-reveal>Как проходят <span>торги</span></h2></div><p class="section-intro">Четыре формата для разных активов и условий сделки.</p></div><div class="formats__layout" data-reveal><div class="formats__tabs" role="tablist" aria-label="Формат торгов" aria-orientation="vertical">${auctionFormats.map((item, i) => `<button id="format-tab-${item.id}" class="format-tab" type="button" role="tab" data-format="${item.id}" aria-selected="${i === 0}" aria-controls="format-pane-${item.id}" tabindex="${i === 0 ? 0 : -1}"><span>${item.number}</span><div><strong>${item.title}</strong><small>${item.short}</small></div>${icon('arrow-right')}</button>`).join('')}</div><div class="formats__panels">${auctionFormats.map((item, i) => `<div id="format-pane-${item.id}" class="format-pane${i === 0 ? ' is-active' : ''}" role="tabpanel" aria-labelledby="format-tab-${item.id}" ${i ? 'inert aria-hidden="true"' : ''}><div class="format-pane__copy"><h3>${item.title}</h3><p>${item.text}</p><p class="format-pane__detail">${item.detail}</p><span class="format-pane__foot">${icon('check')}${item.foot}</span></div><div class="format-pane__visual">${formatVisual(item.id)}</div></div>`).join('')}</div></div></div></section>`;
}

const processSteps = {
  home: [['Регистрация', 'Создайте личный кабинет и укажите сведения об организации.', '5 минут'], ['Размещение портфеля', 'Добавьте сведения об активе и документы.', '8 минут'], ['Проведение торгов', 'Получите предложения от покупателей площадки.', 'По условиям лота'], ['Завершение сделки', 'Согласуйте документы и подпишите договор уступки.', 'С сопровождением']],
  seller: [['Оценка актива', 'Определяем рыночный ориентир и помогаем структурировать данные.'], ['Подготовка и размещение', 'Готовим предложение и представляем портфель участникам.'], ['Привлечение покупателей', 'Рассылаем предложение и связываемся с профильными покупателями.'], ['Торги и сделка', 'Проводим торги и сопровождаем заключение договора уступки.']],
  receivables: [['Оценка', 'Изучаем долг, документы и сведения о должнике.'], ['Подготовка', 'Составляем предложение и размещаем его на площадке.'], ['Сбор заявок', 'Представляем актив профильным покупателям и собираем предложения.'], ['Договор и расчёты', 'Согласовываете условия, подписываете договор и получаете оплату в установленном им порядке.']],
  buyer: [['Регистрация и проверка', 'Создаёте кабинет и проходите проверку участника.'], ['Выбор лота', 'Находите подходящий портфель или отдельное требование.'], ['Изучение данных', 'Сравниваете реестр, документы и аналитику площадки.'], ['Участие в торгах', 'Делаете ставку или направляете своё предложение.'], ['Договор уступки', 'Согласовываете документы и принимаете актив в работу.']],
};

export function renderProcess(mode: keyof typeof processSteps): string {
  const steps = processSteps[mode];
  return `<section class="process section" id="process" aria-labelledby="process-title"><div class="container"><div class="section-heading"><div><h2 class="section-title" id="process-title" data-text-reveal>Как проходит <span>сделка</span></h2></div><p class="section-intro">Менеджер помогает подготовить данные, провести торги и согласовать документы.</p></div><ol class="process__steps${steps.length === 5 ? ' process__steps--five' : ''}" data-stagger>${steps.map((step, i) => `<li><span class="process__number">0${i + 1}</span><h3>${step[0]}</h3><p>${step[1]}</p>${step[2] ? `<small>${icon('clock')}${step[2]}</small>` : ''}</li>`).join('')}</ol><div class="process__bottom"><p>Все этапы торгов доступны в личном кабинете.</p><a class="text-link" href="${registerUrl}">Создать личный кабинет ${icon('arrow-up-right')}</a></div></div></section>`;
}

export function renderRequestForm(kind: RequestKind = 'general', id = 'request', standalone = false): string {
  const receivables = kind === 'receivables';
  const title = receivables ? 'Оценка задолженности' : kind === 'portfolio' ? 'Оценка портфеля' : kind === 'buyer' ? 'Подбор долговых активов' : 'Оставить заявку';
  const heading = standalone ? 'h1' : 'h2';
  const text = receivables ? 'Изучим долг и документы, оценим возможность продажи и предложим условия торгов.' : kind === 'portfolio' ? 'Укажите состав портфеля и контакты. Менеджер подскажет, какие данные нужны для оценки.' : kind === 'buyer' ? 'Расскажите, какие активы вы ищете. Обсудим доступные предложения и порядок участия в торгах.' : 'Расскажите, что хотите продать или купить. Менеджер подскажет условия размещения или участия в торгах.';
  const email = receivables ? 'debt@debtprice.market' : kind === 'portfolio' ? 'sales@debtprice.market' : 'v@debtprice.market';
  const field = (name: string, label: string, type = 'text', extra = '', wide = false) => `<label class="request-field${wide ? ' request-field--wide' : ''}"><span>${label}</span><input name="${name}" type="${type}" ${extra} required aria-describedby="${id}-status"></label>`;
  const fields = receivables
    ? `${field('debtorInn', 'ИНН должника', 'text', 'inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" minlength="10" maxlength="12" placeholder="10 или 12 цифр"')}${field('amount', 'Сумма задолженности, ₽', 'text', 'inputmode="numeric" maxlength="24" placeholder="От 500 000 ₽"')}${field('phone', 'Телефон для ответа', 'tel', 'autocomplete="tel" maxlength="30" placeholder="+7 999 000-00-00"', true)}`
    : `${field('name', 'Ваше имя и фамилия', 'text', 'autocomplete="name" maxlength="120" placeholder="Как к вам обращаться"')}${field('company', 'Организация', 'text', 'autocomplete="organization" maxlength="180" placeholder="Название компании"')}${field('email', 'Электронная почта', 'email', 'autocomplete="email" maxlength="160" placeholder="name@company.ru"')}${field('phone', 'Телефон', 'tel', 'autocomplete="tel" maxlength="30" placeholder="+7 999 000-00-00"')}${kind === 'portfolio' ? `<label class="request-field"><span>ИНН организации</span><input name="inn" inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" maxlength="12" placeholder="10 или 12 цифр"></label><label class="request-field"><span>КПП <small>необязательно</small></span><input name="kpp" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" placeholder="9 цифр"></label>` : ''}`;
  return `<section class="request section" id="${escapeHtml(id)}" aria-labelledby="${id}-title"><div class="container"><div class="request__layout"><div class="request__intro"><${heading} class="section-title" id="${id}-title" data-text-reveal>${title}</${heading}><p>${text}</p><div class="request__contacts"><span>Можно связаться напрямую</span><a href="tel:+79159724101">+7 915 972 41 01 ${icon('arrow-up-right')}</a><a href="mailto:${email}">${email} ${icon('arrow-up-right')}</a></div>${kind !== 'buyer' ? `<p class="request__signature">Оценка бесплатна. Решение о продаже остаётся за вами.</p>` : ''}</div><form class="request__form" data-reveal data-request-form data-kind="${kind}"><div class="request__fields">${fields}<label class="request-field request-field--wide"><span>Ваша задача <small>необязательно</small></span><textarea name="message" rows="3" maxlength="2000" placeholder="Расскажите об активе или предложении, которое ищете"></textarea></label></div><label class="request-consent"><input type="checkbox" name="consent" required><span>Соглашаюсь на обработку персональных данных в соответствии с <a href="https://my.debtprice.market/Privacy_policy.pdf" target="_blank" rel="noopener noreferrer">политикой</a> и <a href="https://my.debtprice.market/Personal_data_consent.pdf" target="_blank" rel="noopener noreferrer">согласием</a>.</span></label><button class="button button--primary" type="submit"><span>Подготовить заявку</span>${icon('arrow-right')}</button><p class="request__hint">Подготовим письмо с вашими данными. Вы сможете проверить и отправить его из своей почты.</p><div class="request__status" id="${id}-status" role="status" aria-live="polite" hidden></div></form></div></div></section>`;
}

export function renderEcosystem(): string {
  return `<section class="ecosystem section" id="ecosystem" aria-labelledby="ecosystem-title"><div class="container ecosystem__layout"><div class="ecosystem__intro"><div><h2 class="section-title" id="ecosystem-title" data-text-reveal>Экосистема <span>DEBTPRICE</span></h2><p>Торговая площадка, отраслевые медиа и встречи для участников долгового рынка.</p><a class="text-link" href="#/about">О проекте ${icon('arrow-right')}</a></div><div class="ecosystem__art" aria-hidden="true" data-reveal><img src="${asset('images/ecosystem-glass.webp')}" alt="" width="1374" height="1145" loading="lazy" decoding="async"></div></div><div class="ecosystem__grid" data-stagger>${ecosystem.map((item) => `<a class="ecosystem-card" href="${item.href}" target="_blank" rel="noopener noreferrer"><div><h3>${item.name}</h3><p>${item.text}</p></div><span class="ecosystem-card__arrow">${icon('arrow-up-right')}</span></a>`).join('')}</div></div></section>`;
}
