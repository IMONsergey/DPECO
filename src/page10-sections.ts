import { renderCapabilities } from './components/capabilities';
import { renderFormats } from './sections';
import { accountUrl, asset, icon } from './ui';
import './page10-sections.css';

const image = (section: string, file: string) => asset(`page10/${section}/${file}`);
const localIcon = (section: string, file: string, className = '') => `<img class="p10-static-icon ${className}" src="${image(section, file)}" alt="" loading="lazy" decoding="async">`;

const formats = [
  { id: 'english', title: 'Английский<br> аукцион', image: 'a0398.webp', text: 'Классический аукцион: покупатели повышают ставки, лот уходит тому, кто предложил больше. Лотами можно управлять гибко и выбирать стратегию торгов.' },
  { id: 'dutch', title: 'Голландский<br> аукцион', image: '45c30.webp', text: 'Цена снижается по графику, пока лот не заберет первый покупатель. Формат удобен при высокой конкуренции и покупателям, и продавцам.' },
  { id: 'offers', title: 'Сбор<br> предложений', image: '8498a.webp', text: 'Покупатели присылают предложения, которые не видят другие участники. Условия сделки обсуждаются индивидуально.' },
  { id: 'listing', title: 'Объявления', image: 'a4c25.webp', text: 'Формат для нестандартных активов, когда классические торги не подходят: вы собираете обратную связь рынка в удобной форме.' },
] as const;

function renderPage10Formats(): string {
  // The existing format tabs, chart paths and motion hooks are preserved in the
  // explainer. The primary view follows the four illustrated cards in Page 10.
  const explainer = renderFormats()
    .replace('id="formats"', 'id="p10-format-explainer"')
    .replaceAll('formats-title', 'p10-format-explainer-title');
  return `<section class="p10-section p10-formats" id="formats" aria-labelledby="p10-formats-title" data-node-id="391:1102">
    <div class="container">
      <h2 class="p10-section__title" id="p10-formats-title" data-text-reveal><span>Форматы</span> торгов</h2>
      <p class="p10-section__intro">Четыре формата под разные задачи: от классических торгов до объявления о нестандартном активе.</p>
      <div class="p10-formats__grid" data-stagger>${formats.map((item, index) => `
        <button class="p10-format p10-format--${item.id}" type="button" data-p10-format-open="${item.id}" aria-haspopup="dialog" aria-controls="p10-format-dialog" aria-label="${item.title.replace('<br>', ' ')}: посмотреть механику торгов">
          <span class="p10-format__visual" aria-hidden="true"><img src="${image('391-1102', item.image)}" alt="" loading="lazy" decoding="async"></span>
          <span class="p10-format__number" aria-hidden="true">0${index + 1}</span>
          <span class="p10-format__copy"><span class="p10-format__title">${item.title}</span><span class="p10-format__text">${item.text}</span></span>
        </button>`).join('')}</div>
    </div>
    <dialog class="p10-format-dialog" id="p10-format-dialog" aria-labelledby="p10-format-explainer-title">
      <button type="button" class="p10-format-dialog__close icon-button" data-p10-format-close aria-label="Закрыть описание форматов">${icon('close')}</button>
      ${explainer}
    </dialog>
  </section>`;
}

const process = [
  { title: 'Регистрация<br> на ЭТП', text: 'Продавцы и покупатели проходят регистрацию.', image: '9afe9.webp' },
  { title: 'Лот<br> на торгах', text: 'Продавец размещает портфель. Покупатель изучает состав долга и условия.', image: 'c9766.webp' },
  { title: 'Торги', text: 'Покупатели делают ставки. Цену определяет рынок.', image: 'ebdf1.webp' },
  { title: 'Договор<br> уступки', text: 'Продавец получает оплату, покупатель получает права требования.', image: '9d996.webp' },
] as const;

function renderConsultation(): string {
  const field = (name: string, label: string, type: string, placeholder: string, autocomplete: string) => `<label class="p10-request-field"><span>${label}</span><input name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" maxlength="${name === 'phone' ? 30 : 180}" required aria-describedby="request-status"></label>`;
  // Inline mask properties resolve relative assets against the document. A URL
  // passed through var() in the bundled stylesheet would resolve under /assets/.
  const masks = `url('${image('391-1130', '82855.svg')}'), url('${image('391-1130', 'cf828.svg')}')`;
  return `<section class="p10-consultation" id="request" aria-labelledby="p10-request-title">
    <div class="p10-consultation__art" aria-hidden="true" data-parallax><div style="-webkit-mask-image: ${masks}; mask-image: ${masks}; background-image: url('${image('391-1130', '518d7.webp')}')"></div></div>
    <div class="p10-consultation__copy">
      <div class="p10-consultation__heading"><p>Индивидуальные условия</p><h2 id="p10-request-title" data-text-reveal>Оставьте заявку<br> на консультацию</h2></div>
      <div class="p10-consultation__benefits">
        <div><h3><span class="p10-consultation__benefit-icon">${localIcon('391-1130', 'cf83e.svg')}</span>Продавцу</h3><p>Бесплатно оценим портфель, поможем с лотированием и подскажем, какие данные добавить, чтобы цена выросла.</p></div>
        <div><h3><span class="p10-consultation__benefit-icon p10-consultation__benefit-icon--buyer">${localIcon('391-1130', '0a1f1.svg')}</span>Покупателю</h3><p>Откроем доступ к эксклюзивным лотам, структурированным данным и аналитике по каждому портфелю.</p></div>
      </div>
      <div class="p10-consultation__contact">
        <h3>Не хотите ждать звонка?</h3><p>Обсудим портфель и условия напрямую.</p>
        <div><a href="tel:+79159724101">${localIcon('391-1130', 'e5bb7.svg')}<span>+7 915 972-41-01</span></a><a href="mailto:v@debtprice.market">${localIcon('391-1130', 'd857b.svg')}<span>v@debtprice.market</span></a></div>
      </div>
    </div>
    <form class="p10-consultation__form" data-request-form data-kind="general" data-reveal>
      <div class="p10-consultation__fields">
        <input type="hidden" name="interest" value="">
        <div class="p10-request-context" data-request-context hidden><span data-request-context-label></span><button type="button" data-request-reset>Сбросить</button></div>
        ${field('name', 'Фамилия Имя Отчество', 'text', 'Как к вам обращаться', 'name')}
        <div class="p10-consultation__field-row">${field('email', 'Электронная почта', 'email', 'name@company.ru', 'email')}${field('phone', 'Телефон', 'tel', '+7 (___) ___-__-__', 'tel')}</div>
        <div>${field('company', 'Ваша организация', 'text', 'Название организации', 'organization')}<p class="p10-consultation__company-hint">Укажите полное название организации</p></div>
      </div>
      <button class="button p10-consultation__submit" type="submit"><span>Подготовить заявку</span>${localIcon('391-1130', 'ed8c1.svg')}</button>
      <div class="p10-consultation__consents">
        <label class="p10-request-consent"><input type="checkbox" name="consent" required><span>Согласен на обработку персональных данных в соответствии с <a href="https://my.debtprice.market/Privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a> и <a href="https://my.debtprice.market/Personal_data_consent.pdf" target="_blank" rel="noopener noreferrer">согласием</a></span></label>
        <label class="p10-request-consent"><input type="checkbox" name="Рекламные предложения" value="Согласие дано"><span>Соглашаюсь на рекламные предложения от DEBTPRICE по электронной почте, номеру телефона и в мессенджерах</span></label>
      </div>
      <div class="request__status p10-consultation__status" id="request-status" role="status" aria-live="polite" hidden></div>
    </form>
  </section>`;
}

function renderPage10Process(): string {
  return `<section class="p10-section p10-process" id="process" aria-labelledby="p10-process-title" data-node-id="391:1130">
    <div class="container">
      <h2 class="p10-section__title" id="p10-process-title" data-text-reveal>Как это <span>работает</span></h2>
      <ol class="p10-process__grid" data-stagger>${process.map((item, index) => `<li class="p10-process-step p10-process-step--${index + 1}">
        <span class="p10-process-step__number">0${index + 1}</span>${index < 3 ? localIcon('391-1130', '5dc4b.svg', 'p10-process-step__arrow') : ''}
        <div class="p10-process-step__copy"><h3>${item.title}</h3><p>${item.text}</p></div><img class="p10-process-step__image" src="${image('391-1130', item.image)}" alt="" loading="lazy" decoding="async">
      </li>`).join('')}</ol>
      ${renderConsultation()}
    </div>
  </section>`;
}

function ecosystemButton(text: string, href: string): string {
  return `<a class="p10-ecosystem-card__button" href="${href}" target="_blank" rel="noopener noreferrer"><span>${text}</span>${localIcon('391-1222', 'ed8c1.svg')}</a>`;
}

function renderPage10Ecosystem(): string {
  return `<section class="p10-section p10-ecosystem" id="ecosystem" aria-labelledby="p10-ecosystem-title" data-node-id="391:1222">
    <div class="p10-ecosystem__pattern" aria-hidden="true" style="-webkit-mask-image: url('${image('391-1222', '6edb2.svg')}'); mask-image: url('${image('391-1222', '6edb2.svg')}')"><img src="${image('391-1222', 'c4bec.svg')}" alt="" loading="eager" fetchpriority="low"></div>
    <div class="p10-ecosystem__dots" data-dots data-dots-color="#9fffe3" data-dots-opacity="0.015" data-dots-end-opacity="0.06" data-dots-spacing="17"></div>
    <div class="container">
      <h2 class="p10-section__title" id="p10-ecosystem-title" data-text-reveal>Экосистема DEBTPRICE</h2>
      <p class="p10-section__intro">Инструменты для рынка долговых активов</p>
      <div class="p10-ecosystem__grid" data-stagger>
        <article class="p10-ecosystem-card p10-ecosystem-card--media p10-ecosystem-card--wide">
          <div class="p10-ecosystem-card__background" aria-hidden="true"><img src="${image('391-1222', 'dfffd.webp')}" alt="" loading="eager" fetchpriority="low" decoding="async"></div>
          <div class="p10-ecosystem-card__inner">
            <div class="p10-ecosystem-card__brand" data-p10-brand-fit><img src="${image('391-1222', '5901e.svg')}" alt="Рынок Взыскания" loading="lazy" decoding="async"></div>
            <h3>Медиа<br> «Рынок Взыскания»</h3><p>Будьте в курсе всех новостей и событий рынка. Аналитика, судебная практика и интервью с ключевыми игроками долгового рынка.</p>
            <div class="p10-ecosystem-card__actions">${ecosystemButton('Читать Медиа', 'https://rvzrus.ru/')}</div>
          </div>
        </article>
        <article class="p10-ecosystem-card p10-ecosystem-card--forums p10-ecosystem-card--wide">
          <div class="p10-ecosystem-card__background" aria-hidden="true"><img src="${image('391-1222', 'eec1a.webp')}" alt="" loading="eager" fetchpriority="low" decoding="async"></div>
          <div class="p10-ecosystem-card__inner">
            <div class="p10-ecosystem-card__brand"><span class="p10-ecosystem-card__forums-logo" data-p10-brand-fit><img src="${asset('page10/logos/debttech-dolgtalk.svg')}" alt="DEBT TECH / DOLG TALK" loading="lazy" decoding="async"></span></div>
            <h3>Форумы DEBT TECH<br> и DOLG TALK</h3><p>Находите партнеров и клиентов на наших офлайн-мероприятиях. Здесь встречаются лидеры рынка: банки, МФО, ПКО, вендоры, инвесторы и электронные торговые площадки.</p>
            <div class="p10-ecosystem-card__actions">${ecosystemButton('DEBT TECH', 'https://debt-tech.ru/')}${ecosystemButton('DOLG TALK', 'https://dolgtalk.ru/')}</div>
          </div>
        </article>
        <article class="p10-ecosystem-card p10-ecosystem-card--auction">
          <div class="p10-ecosystem-card__background" aria-hidden="true"><img src="${image('391-1222', '574b7.webp')}" alt="" loading="eager" fetchpriority="low" decoding="async"></div>
          <div class="p10-ecosystem-card__inner">
            <div class="p10-ecosystem-card__brand"><img src="${asset('page10/logos/debtprice.svg')}" alt="DEBTPRICE Аукцион" loading="lazy" decoding="async"></div>
            <h3>Аукцион<br> долговых активов</h3><p>Инструменты для рынка<br> долговых активов</p>
            <div class="p10-ecosystem-card__actions">${ecosystemButton('Войти на площадку', accountUrl)}</div>
          </div>
        </article>
        <article class="p10-ecosystem-card p10-ecosystem-card--navigator">
          <div class="p10-ecosystem-card__background" aria-hidden="true"><img src="${image('391-1222', '38615.webp')}" alt="" loading="eager" fetchpriority="low" decoding="async"></div>
          <div class="p10-ecosystem-card__inner">
            <div class="p10-ecosystem-card__brand"><img class="p10-ecosystem-card__navigator-logo" src="${asset('page10/logos/navigator.svg')}" alt="DEBT TECH Навигатор" loading="lazy" decoding="async"></div>
            <h3>Навигатор<br> решений</h3><p>Подберите инструменты для работы с портфелем. Каталог продуктовых решений для работы с долгом по категориям.</p>
            <div class="p10-ecosystem-card__actions">${ecosystemButton('Перейти к Навигатору', 'https://navigator.debt-tech.ru/')}</div>
          </div>
        </article>
        <article class="p10-ecosystem-card p10-ecosystem-card--rating">
          <div class="p10-ecosystem-card__background" aria-hidden="true"><img src="${image('391-1222', 'eb4ac.webp')}" alt="" loading="eager" fetchpriority="low" decoding="async"></div>
          <div class="p10-ecosystem-card__inner">
            <div class="p10-ecosystem-card__brand"><img src="${image('391-1222', '07f83.svg')}" alt="ПКО-300" loading="lazy" decoding="async"></div>
            <h3>Рейтинг<br> коллекторских<br> агентств</h3><p>Выбирайте надежных партнеров на рынке. Рейтинг коллекторских агентств по отчетности ФНС помогает сравнить агентства и выбрать контрагента для продажи портфеля или агента для взыскания.</p>
            <div class="p10-ecosystem-card__actions">${ecosystemButton('Смотреть подробнее', 'https://pko300.ru/')}</div>
          </div>
        </article>
      </div>
    </div>
  </section>`;
}

function articleFooter(date: string, dateTime: string): string {
  return `<div class="p10-article__footer"><time datetime="${dateTime}">${date}</time>${localIcon('391-1352', '39fd7.svg')}</div>`;
}

function renderPage10Materials(): string {
  return `<section class="p10-section p10-materials" id="materials" aria-labelledby="p10-materials-title" data-node-id="391:1352">
    <div class="container">
      <div class="p10-materials__heading"><h2 class="p10-section__title" id="p10-materials-title" data-text-reveal>Полезные материалы</h2><a class="button p10-materials__all" href="https://rvzrus.ru/blog" target="_blank" rel="noopener noreferrer"><span>Все материалы</span>${localIcon('391-1352', '40e71.svg')}</a></div>
      <div class="p10-materials__grid" data-stagger>
        <a class="p10-article p10-article--featured" href="https://rvzrus.ru/blog/3238" target="_blank" rel="noopener noreferrer">
          <div class="p10-article__image"><img src="${image('391-1352', 'f35d5.webp')}" alt="Команда аналитиков работает с данными долгового рынка" loading="lazy" decoding="async"></div>
          <div class="p10-article__body"><span class="p10-article__category">Аналитика</span><h3>Масштабирование ПКО:<br class="p10-line-break"> от покупки портфелей<br class="p10-line-break"> к инвестиционной аналитике</h3><p>Как качество данных и инвестиционная аналитика помогают оценивать активы и сохранять экономику сделки.</p>${articleFooter('22 июля 2026', '2026-07-22')}</div>
        </a>
        <div class="p10-materials__secondary">
          <a class="p10-article p10-article--compact" href="https://rvzrus.ru/blog/3015" target="_blank" rel="noopener noreferrer"><div class="p10-article__image"><img src="${image('391-1352', '7ffd1.webp')}" alt="Цифровые финансовые активы" loading="lazy" decoding="async"></div><div class="p10-article__body"><span class="p10-article__category">Инструменты</span><h3>Почему взыскатели<br class="p10-line-break"> заинтересовались ЦФА</h3>${articleFooter('10 июня 2025', '2025-06-10')}</div></a>
          <a class="p10-article p10-article--compact" href="https://rvzrus.ru/blog/3190" target="_blank" rel="noopener noreferrer"><div class="p10-article__image"><img src="${image('391-1352', '01c0c.webp')}" alt="Обсуждение рынка взыскания на отраслевом форуме" loading="lazy" decoding="async"></div><div class="p10-article__body"><span class="p10-article__category">Данные</span><h3>Что изменилось<br class="p10-line-break"> в рейтинге ПКО-300</h3>${articleFooter('4 мая 2026', '2026-05-04')}</div></a>
        </div>
      </div>
    </div>
  </section>`;
}

export function renderPage10Sections(offer = ''): string {
  return `${renderCapabilities()}${offer}${renderPage10Formats()}${renderPage10Process()}${renderPage10Ecosystem()}${renderPage10Materials()}`;
}

/** Page 10 reuses the established form, capability, tab and reveal mounts. */
export function mountPage10Sections(host: HTMLElement): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const fitBrand = (wrapper: HTMLElement) => {
    const logo = wrapper.querySelector('img');
    if (!logo?.naturalWidth) return;
    // Scale the wrapper's drawing without replacing intrinsic SVG dimensions.
    logo.style.setProperty('--p10-brand-scale', String(Math.min(1, wrapper.clientWidth / logo.naturalWidth)));
  };
  const brandObserver = new ResizeObserver((entries) => entries.forEach((entry) => fitBrand(entry.target as HTMLElement)));
  host.querySelectorAll<HTMLElement>('[data-p10-brand-fit]').forEach((wrapper) => {
    brandObserver.observe(wrapper);
    wrapper.querySelector('img')?.addEventListener('load', () => fitBrand(wrapper), { signal });
    fitBrand(wrapper);
  });
  return () => { abort.abort(); brandObserver.disconnect(); };
}
