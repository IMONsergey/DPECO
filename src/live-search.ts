import './live-search.css';
import { ecosystem } from './sections';

type SearchEntry = { href: string; title: string; text: string; label: string; section?: string };

const sections: readonly SearchEntry[] = [
  { section: 'lots', href: '#lots', title: 'Расписание торгов', text: 'Предстоящие и прошедшие торги, лоты, цены, портфели физических и юридических лиц', label: 'Раздел главной' },
  { section: 'sell-buy', href: '#sell-buy', title: 'Продать или купить долг', text: 'Дебиторская и розничная задолженность, продажа портфелей и покупка долговых активов', label: 'Раздел главной' },
  { section: 'capabilities', href: '#capabilities', title: 'Возможности платформы', text: 'Кредитные и факторинговые портфели, дебиторская задолженность, права требования', label: 'Раздел главной' },
  { section: 'formats', href: '#formats', title: 'Форматы торгов', text: 'Английский и голландский аукцион, сбор предложений, объявления', label: 'Раздел главной' },
  { section: 'process', href: '#process', title: 'Как работает площадка', text: 'Регистрация, размещение лота, участие в торгах, договор уступки', label: 'Раздел главной' },
  { section: 'request', href: '#request', title: 'Консультация', text: 'Оценка портфеля, заявка, телефон, электронная почта, связь с командой', label: 'Раздел главной' },
  { section: 'ecosystem', href: '#ecosystem', title: 'Экосистема DEBTPRICE', text: 'Рынок Взыскания, DEBT TECH, DOLG TALK, Навигатор решений, ПКО-300', label: 'Раздел главной' },
  { section: 'materials', href: '#materials', title: 'Полезные материалы', text: 'Журнал, аналитика, ЦФА, инвестиции, рейтинг коллекторских агентств', label: 'Раздел главной' },
];
const pages: readonly SearchEntry[] = [
  { href: '#/privacy', title: 'Политика конфиденциальности', text: 'Обработка и защита персональных данных', label: 'Страница' },
];
const serviceNames = new Set(['DEBTPRICE', 'Рынок Взыскания', 'DEBT TECH', 'DOLG TALK', 'Навигатор решений', 'ПКО-300']);
const services: readonly SearchEntry[] = ecosystem.filter(item => serviceNames.has(item.name)).map(item => ({
  href: item.href, title: item.name, text: item.text, label: 'Сервис экосистемы',
}));
const normalize = (text: string): string => text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Search only the released destinations; no legacy page or lot-dialog index. */
export function mountLiveSearch(app: HTMLElement): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const cleanups: (() => void)[] = [];

  app.querySelectorAll<HTMLFormElement>('form[data-site-search]').forEach((form, formIndex) => {
    const input = form.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input || form.hasAttribute('data-live-search')) return;
    const inputAttributes = ['role', 'aria-autocomplete', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-activedescendant'];
    const originalAttributes = new Map(inputAttributes.map(name => [name, input.getAttribute(name)]));
    const panel = document.createElement('div');
    panel.className = 'live-search';
    panel.hidden = true;
    const status = document.createElement('p');
    status.className = 'live-search__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const list = document.createElement('div');
    list.id = 'live-search-results-' + (input.id || formIndex);
    list.className = 'live-search__list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Результаты поиска');
    panel.append(status, list);
    form.append(panel);
    form.setAttribute('data-live-search', '');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    let links: HTMLAnchorElement[] = [];
    let active = -1;
    let lastQuery = '';
    let composing = false;

    const select = (index: number): void => {
      active = index;
      links.forEach((link, linkIndex) => link.setAttribute('aria-selected', String(linkIndex === active)));
      const selected = links[active];
      if (selected) {
        input.setAttribute('aria-activedescendant', selected.id);
        selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };
    const close = (): void => {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      select(-1);
    };
    const render = (): void => {
      lastQuery = input.value;
      const query = normalize(lastQuery);
      const terms = query.split(/\s+/u).filter(Boolean);
      list.replaceChildren();
      links = [];
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!terms.length) { status.textContent = ''; close(); return; }
      const available = [...sections.filter(item => app.querySelector('[id="' + item.section + '"]')), ...pages, ...services];
      const matches = available.filter(item => {
        const text = normalize(item.title + ' ' + item.text);
        return terms.every(term => text.includes(term));
      }).sort((a, b) => {
        const score = (item: SearchEntry) => Number(normalize(item.title).startsWith(query)) * 2 + Number(terms.every(term => normalize(item.title).includes(term)));
        return score(b) - score(a);
      });
      for (const [index, entry] of matches.slice(0, 8).entries()) {
        const link = document.createElement('a');
        link.className = 'live-search__result';
        link.id = list.id + '-' + index;
        link.setAttribute('data-live-search-result', '');
        link.href = entry.href;
        link.setAttribute('role', 'option');
        link.setAttribute('aria-selected', 'false');
        link.tabIndex = -1;
        if (entry.href.startsWith('https://')) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        const label = document.createElement('small');
        label.textContent = entry.label;
        const title = document.createElement('strong');
        title.textContent = entry.title;
        const description = document.createElement('span');
        description.textContent = entry.text;
        link.append(label, title, description);
        list.append(link);
        links.push(link);
      }
      status.textContent = matches.length
        ? 'Найдено: ' + matches.length + (matches.length > links.length ? '. Показаны первые ' + links.length : '')
        : 'Ничего не найдено. Попробуйте другое слово.';
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const activate = (): void => {
      if (input.value !== lastQuery || panel.hidden) render();
      const link = links[active < 0 ? 0 : active];
      // The navigation profile remains authoritative; never restore stripped hrefs.
      if (link?.hasAttribute('href') && link.getAttribute('aria-disabled') !== 'true') {
        link.click();
        close();
      }
    };
    input.addEventListener('input', () => { if (!composing) render(); }, { signal });
    input.addEventListener('compositionstart', () => { composing = true; }, { signal });
    input.addEventListener('compositionend', () => { composing = false; render(); }, { signal });
    input.addEventListener('focus', () => { if (normalize(input.value)) render(); }, { signal });
    input.addEventListener('keydown', event => {
      if (composing || event.isComposing) return;
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        if (panel.hidden) render();
        if (links.length) select(event.key === 'ArrowDown' ? (active + 1) % links.length : active <= 0 ? links.length - 1 : active - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        activate();
      }
    }, { signal });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!composing) activate();
    }, { signal });
    list.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('[data-live-search-result]')) close();
    }, { signal });
    form.addEventListener('focusout', event => {
      if (!(event.relatedTarget instanceof Node) || !form.contains(event.relatedTarget)) close();
    }, { signal });
    document.addEventListener('pointerdown', event => {
      if (!(event.target instanceof Node) || !form.contains(event.target)) close();
    }, { signal });
    cleanups.push(() => {
      panel.remove();
      form.removeAttribute('data-live-search');
      originalAttributes.forEach((value, name) => {
        if (value === null) input.removeAttribute(name);
        else input.setAttribute(name, value);
      });
    });
  });

  return () => { abort.abort(); cleanups.forEach(cleanup => cleanup()); };
}
