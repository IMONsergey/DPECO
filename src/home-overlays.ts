import { archivedLots, filterLots, lots } from './data/lots';
import { escapeHtml, icon, rubles } from './ui';
import './home-overlays.css';

const documents = [
  ['Реквизиты ООО «ДЕБТПРАЙС»', 'PDF', 'DEBTPRICE_details.pdf'],
  ['Договор использования портала DEBTPRICE', 'PDF', 'oferta_register_since-2025-01-01.pdf'],
  ['Политика обработки персональных данных', 'PDF', 'Privacy_policy.pdf'],
  ['Согласие на обработку персональных данных', 'PDF', 'Personal_data_consent.pdf'],
  ['Типовой реестр задолженности', 'XLSX', 'DEBTPRICE_debt_list_BLANK.xlsx'],
  ['Выписка из реестра участников «Сколково»', 'PDF', 'SKOLKOVO-register_DEBTRPICE-2024-11-27.pdf'],
] as const;

export function renderDocumentsDialog(): string {
  return `<h2 id="dialog-title">Документы</h2><p class="dialog__text">Документы оператора электронной торговой площадки DEBTPRICE.</p><div class="home-results">${documents.map(([title, type, file]) => `<a class="home-result" href="https://my.debtprice.market/${file}" target="_blank" rel="noopener noreferrer"><span class="home-result__copy"><small>${type}</small><strong>${title}</strong><span class="sr-only">Открыть в новой вкладке</span></span>${icon('arrow-up-right')}</a>`).join('')}</div>`;
}

const sections = [
  { id: 'lots', title: 'Расписание торгов', text: 'Предстоящие и прошедшие торги, лоты, цены, портфели физических и юридических лиц' },
  { id: 'sell-buy', title: 'Продать или купить долг', text: 'Дебиторская и розничная задолженность, продажа портфелей и покупка долговых активов' },
  { id: 'capabilities', title: 'Возможности платформы', text: 'Кредитные и факторинговые портфели, дебиторская задолженность, права требования' },
  { id: 'formats', title: 'Форматы торгов', text: 'Английский аукцион, голландский аукцион, сбор предложений, объявления' },
  { id: 'process', title: 'Как работает площадка', text: 'Регистрация, размещение лота, участие в торгах, договор уступки' },
  { id: 'request', title: 'Консультация и контакты', text: 'Оценка портфеля, заявка, телефон +7 915 972 41 01, v@debtprice.market' },
  { id: 'ecosystem', title: 'Экосистема DEBTPRICE', text: 'Рынок Взыскания, DEBT TECH, DOLG TALK, Навигатор решений, ПКО-300' },
  { id: 'materials', title: 'Полезные материалы', text: 'Журнал, аналитика, ЦФА, инвестиции, рейтинг коллекторских агентств' },
  { id: 'documents', title: 'Документы и реквизиты', text: 'Договор, политика конфиденциальности, согласие, реестр задолженности, Сколково' },
] as const;

const normalized = (text: string) => text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function renderSearchDialog(query: string): string {
  const terms = normalized(query).split(/\s+/u).filter(Boolean);
  const matches = (text: string) => terms.every(term => normalized(text).includes(term));
  const sectionResults = terms.length ? sections.filter(item => matches(`${item.title} ${item.text}`)) : sections;
  const lotResults = terms.length ? filterLots([...lots, ...archivedLots], 'all', query) : [];
  const results = sectionResults.map(item => `<a class="home-result" href="#${item.id}"${item.id === 'documents' ? ' data-open-documents' : ''}><span class="home-result__copy"><small>Раздел главной</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></span>${icon('arrow-right')}</a>`).join('')
    + lotResults.map(lot => `<button type="button" class="home-result" data-open-lot="${lot.id}"><span class="home-result__copy"><small>Лот · ${lots.includes(lot) ? '10 ноября' : '29 октября'} 2026</small><strong>${escapeHtml(lot.name)}</strong><span>${lot.cases.toLocaleString('ru-RU')} кейсов · ${rubles(lot.debt)}</span></span>${icon('arrow-right')}</button>`).join('');
  return `<h2 id="dialog-title">Поиск по сайту</h2><form class="home-search" role="search" data-site-search><label class="sr-only" for="dialog-search">Поисковый запрос</label><input id="dialog-search" type="search" name="q" value="${escapeHtml(query)}" maxlength="120" placeholder="Лот, раздел или формат торгов" autocomplete="off"><button class="button button--primary" type="submit">Найти ${icon('search')}</button></form><p class="home-search__count" role="status">${results ? `Найдено: ${sectionResults.length + lotResults.length}` : 'Ничего не найдено. Попробуйте другое слово или название компании.'}</p><div class="home-results">${results}</div>`;
}
