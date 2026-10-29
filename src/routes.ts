export interface Route {
  path: string;
  query: URLSearchParams;
}

/** Hash routes work on GitHub Pages without a server rewrite or a 404 fallback. */
export function parseRoute(hash: string): Route {
  if (hash.startsWith('#lot-')) return { path: '', query: new URLSearchParams({ lot: hash.slice(5) }) };
  const value = hash.startsWith('#/') ? hash.slice(2) : '';
  const separator = value.indexOf('?');
  const path = (separator < 0 ? value : value.slice(0, separator)).replace(/\/+$/u, '');
  return { path, query: new URLSearchParams(separator < 0 ? '' : value.slice(separator + 1)) };
}

export const routeNames: Record<string, string> = {
  '': 'Платформа долговых активов',
  'sellers/portfeli': 'Продажа портфелей физических лиц',
  'sellers/debitorka': 'Продажа дебиторской задолженности',
  buyers: 'Покупателям долговых активов',
  about: 'О проекте',
  docs: 'Документы и реквизиты',
  contacts: 'Контакты',
  journal: 'Частые вопросы',
  request: 'Оставить заявку',
  search: 'Поиск по сайту',
};

export function isDarkRoute(route: Route): boolean {
  return ['', 'sellers/portfeli', 'sellers/debitorka', 'buyers'].includes(route.path);
}
