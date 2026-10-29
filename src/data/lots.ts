export type LotCategory = 'receivables' | 'individuals';
export type Lot = {
  id: string;
  name: string;
  mark: string;
  markColor: string;
  category: LotCategory;
  cases: number;
  statusLabel: string;
  status: string;
  dateLabel: string;
  date: string;
  debt: number;
  startingPrice?: number;
  startingPercent?: number;
  startsAt?: string;
  kind?: 'auction' | 'offers' | 'sold';
};

/** Public listing snapshot, verified 29 October 2026 at debtprice.market.
 * The commercial portal remains authoritative for availability and terms.
 */
export const lotsUpdatedAt = '2026-10-29';
export const lotsSourceUrl = 'https://debtprice.market/';
export const lots: readonly Lot[] = [
  { id: 'triumvirat-20261029', name: 'МКК «Триумвират»', mark: 'ТВ', markColor: '#047f73', category: 'individuals', cases: 6952, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Торги', date: '29.10.26, 11:00', debt: 197347802, startingPrice: 39469561, startingPercent: 20, startsAt: '2026-10-29T11:00:00+03:00', kind: 'auction' },
  { id: 'arttransstroy-20261106', name: 'ООО «Арттрансстрой»', mark: 'АТ', markColor: '#326a70', category: 'receivables', cases: 1, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Сбор предложений', date: '23.10 – 06.11.26', debt: 5597640, kind: 'offers' },
  { id: 'vvs-leasing-20261102', name: 'ООО «ВВС Лизинг»', mark: 'ВЛ', markColor: '#378d95', category: 'receivables', cases: 1, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Сбор предложений', date: '19.10 – 02.11.26', debt: 78240172, kind: 'offers' },
  { id: 'denezhnaya-krepost-20261028', name: 'МКК «Денежная крепость»', mark: 'ДК', markColor: '#50766d', category: 'individuals', cases: 8666, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Дата торгов', date: '28.10.26, 13:00', debt: 275717932, startingPrice: 49629228, startingPercent: 18, startsAt: '2026-10-28T13:00:00+03:00', kind: 'auction' },
  { id: 'dolg-consulting-20261028', name: 'ПКО «Долг Консалтинг»', mark: 'ДК', markColor: '#227b67', category: 'individuals', cases: 584, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Дата торгов', date: '28.10.26, 11:00', debt: 8540467, startingPrice: 649076, startingPercent: 7.6, startsAt: '2026-10-28T11:00:00+03:00', kind: 'auction' },
  { id: 'svoy-bank-sold', name: 'АО «Свой Банк»', mark: 'СБ', markColor: '#456f76', category: 'individuals', cases: 106, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Результат', date: 'Продано', debt: 4534428, startingPrice: 816197, startingPercent: 18, kind: 'sold' },
  { id: 'tbank-sold', name: 'АО «ТБанк»', mark: 'Т', markColor: '#8c7e36', category: 'individuals', cases: 17750, statusLabel: 'Просужен', status: '19%', dateLabel: 'Результат', date: 'Продано', debt: 1856371393, startingPrice: 109729258, startingPercent: 5.91, kind: 'sold' },
  { id: 'denga-sold', name: 'ГК «ДЕНЬГА»', mark: 'Д', markColor: '#157f62', category: 'individuals', cases: 847, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Результат', date: 'Продано', debt: 20312106, startingPrice: 4062421, startingPercent: 20, kind: 'sold' },
];

export function nextAuctionAt(now = Date.now()): number | null {
  const times = lots.flatMap((lot) => lot.startsAt ? [Date.parse(lot.startsAt)] : []).filter((time) => time > now);
  return times.length ? Math.min(...times) : null;
}

const numberFormat = new Intl.NumberFormat('ru-RU');

function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[\s\u200B\uFEFF]+/gu, ' ')
    .trim();
}

/** Match all query words without interpreting user input as a regular expression. */
export function filterLots(
  source: readonly Lot[],
  category: 'all' | LotCategory,
  query: string,
): Lot[] {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);

  return source.filter((lot) => {
    if (category !== 'all' && lot.category !== category) return false;
    if (terms.length === 0) return true;

    const categoryLabel =
      lot.category === 'receivables'
        ? 'дебиторка дебиторская задолженность'
        : 'физ лица физические лица портфели физических лиц';

    const searchText = normalizeSearch(
      [
        lot.name,
        lot.mark,
        categoryLabel,
        lot.statusLabel,
        lot.status,
        lot.dateLabel,
        lot.date,
        String(lot.cases),
        numberFormat.format(lot.cases),
        String(lot.debt),
        numberFormat.format(lot.debt),
      ].join(' '),
    );

    return terms.every((term) => searchText.includes(term));
  });
}
