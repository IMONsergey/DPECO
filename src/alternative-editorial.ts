import { renderCapabilities } from './components/capabilities';
import { renderJournalPreview } from './journal';
import { renderEcosystem, renderFormats, renderLotsSection, renderProcess, renderRequestForm } from './sections';
import { accountUrl, asset, icon, registerUrl } from './ui';
import './alternative-editorial.css';

const partners = [
  { file: 'fasp', name: 'ФАСП' },
  { file: 'pkb', name: 'ПКБ' },
  { file: 'inkas-collect', name: 'Инкас Коллект' },
  { file: 'legal-collection', name: 'Legal Collection' },
  { file: 'express-collection', name: 'Express Collection' },
  { file: 'sit', name: 'СИТ Коллектор' },
] as const;

function renderEditorialHero(): string {
  return `<section class="editorial-hero" id="top" aria-labelledby="hero-title">
    <div class="container editorial-hero__grid">
      <div class="editorial-hero__copy">
        <div class="editorial-eyebrow"><span class="editorial-eyebrow__dot"></span><span>DEBTPRICE / ТОРГОВАЯ ПЛОЩАДКА</span><span class="editorial-eyebrow__line"></span><span>01 — 04</span></div>
        <h1 id="hero-title">Долговые<br>активы.<br><span>Четкая логика<br>сделки.</span></h1>
        <p class="editorial-hero__lead">Профессиональная площадка для продажи портфелей физических лиц, дебиторской задолженности и покупки долговых активов.</p>
        <div class="editorial-hero__actions" data-reveal>
          <a class="editorial-button editorial-button--dark" href="#/sellers/portfeli"><span>Продать актив</span>${icon('arrow-up-right')}</a>
          <a class="editorial-button editorial-button--light" href="#/buyers"><span>Подобрать актив</span>${icon('arrow-up-right')}</a>
        </div>
        <div class="editorial-hero__note"><span class="editorial-hero__note-mark">D/P</span><span>Продажа. Покупка. Сопровождение.<br>В одной профессиональной среде.</span></div>
      </div>
      <div class="editorial-hero__visual" aria-label="Визуальная схема взаимодействия продавца, площадки и покупателя">
        <div class="editorial-visual__head"><span>Структура сделки</span><span>DEBTPRICE / 01</span></div>
        <div class="editorial-visual__stage">
          <div class="editorial-visual__halo editorial-visual__halo--one"></div>
          <div class="editorial-visual__halo editorial-visual__halo--two"></div>
          <svg viewBox="0 0 560 560" class="editorial-visual__svg" fill="none" aria-hidden="true">
            <circle cx="280" cy="280" r="218" stroke="currentColor" stroke-width="1" stroke-opacity=".34" stroke-dasharray="2 8"/>
            <circle cx="280" cy="280" r="160" stroke="currentColor" stroke-width="1" stroke-opacity=".16"/>
            <circle cx="280" cy="280" r="102" stroke="currentColor" stroke-width="1" stroke-opacity=".2"/>
            <path d="M70 280H490M280 70V490" stroke="currentColor" stroke-width="1" stroke-opacity=".18"/>
            <path d="M72 280C190 76 390 78 487 280C390 488 176 488 72 280Z" stroke="currentColor" stroke-width="1.2" stroke-opacity=".55"/>
            <path d="M138 280C220 143 341 145 422 280C345 413 213 419 138 280Z" stroke="currentColor" stroke-width="2" stroke-opacity=".5"/>
            <path d="M280 62V498" stroke="#B9F7E8" stroke-width="1.5" stroke-opacity=".6" stroke-dasharray="3 7"/>
            <circle cx="280" cy="62" r="5" fill="#B9F7E8"/><circle cx="280" cy="498" r="5" fill="#B9F7E8"/>
            <circle cx="70" cy="280" r="5" fill="#B9F7E8"/><circle cx="490" cy="280" r="5" fill="#B9F7E8"/>
          </svg>
          <div class="editorial-visual__core"><span class="editorial-visual__core-kicker">ЕДИНАЯ СРЕДА</span><strong>DEBT<br>PRICE</strong><span class="editorial-visual__core-index">01 / 02</span></div>
          <div class="editorial-visual__node editorial-visual__node--seller"><small>01 / УЧАСТНИК</small><strong>Продавец</strong><span>Размещение актива</span></div>
          <div class="editorial-visual__node editorial-visual__node--buyer"><small>02 / УЧАСТНИК</small><strong>Покупатель</strong><span>Выбор и торги</span></div>
        </div>
        <div class="editorial-visual__foot"><span>ДВА НАПРАВЛЕНИЯ РЫНКА</span><span>ОДНА ПЛОЩАДКА</span></div>
      </div>
    </div>
    <div class="container editorial-hero__bottom"><a href="#lots" data-scroll="lots"><span>Листайте вниз</span>${icon('arrow-down')}</a><span>Финансовая инфраструктура / Россия</span></div>
  </section>`;
}

function renderEditorialPartners(): string {
  return `<section class="editorial-partners" aria-labelledby="editorial-partners-title"><div class="container editorial-partners__inner"><div class="editorial-partners__caption"><span class="editorial-index-label">02 / СРЕДА</span><h2 id="editorial-partners-title">Участники профессионального рынка</h2></div><div class="editorial-partners__logos">${partners.map((partner) => `<div class="editorial-partners__logo"><img src="${asset(`partners/${partner.file}.webp`)}" alt="${partner.name}" loading="lazy" width="148" height="52"></div>`).join('')}</div></div></section>`;
}

function renderEditorialRoutes(): string {
  return `<section class="editorial-routes section" id="solutions" aria-labelledby="editorial-routes-title">
    <div class="container">
      <div class="editorial-routes__intro"><span class="editorial-index-label">03 / НАПРАВЛЕНИЯ</span><div><h2 id="editorial-routes-title">Одна площадка.<br><span>Разные сценарии работы.</span></h2><p>Выберите свою задачу. Мы поможем выстроить процесс: от подготовки данных до согласования условий сделки.</p></div></div>
      <div class="editorial-routes__cards">
        <article class="editorial-route-card editorial-route-card--seller">
          <div class="editorial-route-card__top"><span>01 — ПРОДАВЦАМ</span>${icon('arrow-up-right')}</div>
          <div class="editorial-route-card__graphic" aria-hidden="true"><div class="editorial-route-card__rings"><i></i><i></i><i></i><i></i></div><span>01 / SALE</span></div>
          <h3>Продать долговой<br>актив</h3>
          <p>Портфели физических лиц и дебиторская задолженность. Подготовка, размещение, предложения от участников.</p>
          <div class="editorial-route-card__links"><a href="#/sellers/portfeli">Портфели физлиц ${icon('arrow-up-right')}</a><a href="#/sellers/debitorka">Дебиторская задолженность ${icon('arrow-up-right')}</a></div>
        </article>
        <article class="editorial-route-card editorial-route-card--buyer">
          <div class="editorial-route-card__top"><span>02 — ПОКУПАТЕЛЯМ</span>${icon('arrow-up-right')}</div>
          <div class="editorial-route-card__graphic" aria-hidden="true"><div class="editorial-route-card__grid"></div><span>02 / BUY</span></div>
          <h3>Приобрести<br>долговой актив</h3>
          <p>Доступ к предложениям и форматам торгов. Документы и условия конкретного лота доступны в личном кабинете.</p>
          <div class="editorial-route-card__links"><a href="#/buyers">Перейти к предложениям ${icon('arrow-up-right')}</a><a href="${registerUrl}">Зарегистрироваться ${icon('arrow-up-right')}</a></div>
        </article>
      </div>
    </div>
  </section>`;
}

function renderEditorialPrinciple(): string {
  return `<section class="editorial-principle" aria-label="Принципы площадки">
    <div class="container editorial-principle__inner">
      <div class="editorial-principle__caption"><span class="editorial-index-label">04 / ПРИНЦИПЫ</span><span>Для профессиональных участников</span></div>
      <p>Долговой актив требует <em>контекста.</em><br>Рыночная сделка требует <em>структуры.</em></p>
      <div class="editorial-principle__bottom"><span>DEBTPRICE</span><a href="${accountUrl}" target="_blank" rel="noopener noreferrer">Личный кабинет ${icon('arrow-up-right')}</a></div>
    </div>
  </section>`;
}

export function renderEditorialHome(): string {
  return `<div class="editorial-site">
    ${renderEditorialHero()}
    ${renderEditorialPartners()}
    ${renderEditorialRoutes()}
    ${renderLotsSection()}
    ${renderCapabilities()}
    ${renderFormats()}
    ${renderEditorialPrinciple()}
    ${renderProcess('home')}
    ${renderEcosystem()}
    ${renderJournalPreview()}
    ${renderRequestForm()}
  </div>`;
}
