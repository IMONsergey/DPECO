import { type Lot } from './data/lots';
import { escapeHtml, icon, rubles } from './ui';

export function lotCards(items: readonly Lot[]): string {
  if (!items.length) {
    return `<div class="lots__empty">${icon('search')}<h3>Лотов не найдено</h3><p>Попробуйте другое название или выберите все лоты.</p><button class="button button--dark" type="button" data-reset-filters>Показать все лоты ${icon('arrow-right')}</button></div>`;
  }
  return items.map((lot) => `<article class="lot-card lot-card--${lot.category}${lot.kind === 'sold' ? ' lot-card--sold' : ''}">
    <div class="lot-card__top"><span class="lot-card__mark" style="--mark-color:${lot.markColor}">${escapeHtml(lot.mark)}</span><div class="lot-card__tools"><button class="icon-button" type="button" data-share-lot="${lot.id}" aria-label="Поделиться лотом ${escapeHtml(lot.name)}">${icon('share')}</button><button class="icon-button" type="button" data-open-lot="${lot.id}" aria-label="Подробнее о лоте ${escapeHtml(lot.name)}">${icon('arrow-up-right')}</button></div></div>
    <h3 class="lot-card__title"><button type="button" data-open-lot="${lot.id}">${escapeHtml(lot.name)}</button></h3>
    <span class="lot-card__badge">${icon(lot.category === 'receivables' ? 'coins' : 'users')}<span>${lot.category === 'receivables' ? 'Дебиторка' : 'Физ. лица'}</span></span>
    <dl class="lot-card__details"><div><dt>Кейсов</dt><dd>${new Intl.NumberFormat('ru-RU').format(lot.cases)}</dd></div><div><dt>${lot.statusLabel}</dt><dd>${lot.status}</dd></div><div><dt>${lot.dateLabel}</dt><dd>${lot.date}</dd></div></dl>
    <div class="lot-card__amount"><span>Общая сумма задолженности</span>${lot.startingPrice ? `<small>Начальная цена ${rubles(lot.startingPrice)} · ${String(lot.startingPercent).replace('.', ',')}%</small>` : '<small aria-hidden="true">&nbsp;</small>'}<strong${lot.debt >= 1000000000 ? ' class="lot-card__amount--large"' : ''}>${rubles(lot.debt)}</strong></div>
  </article>`).join('');
}
