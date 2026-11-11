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
  logo?: string;
};

/** Dated Page 10 schedule; the commercial portal remains authoritative. */
export const lotsUpdatedAt = '2026-11-10';
export const lotsSourceUrl = 'https://debtprice.market/';
/** Earlier public listing snapshot retained for the previous-month view. */
export const archivedLots: readonly Lot[] = [
  { id: 'triumvirat-20261029', name: 'МКК «Триумвират»', mark: 'ТВ', markColor: '#047f73', category: 'individuals', cases: 6952, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Торги', date: '29.10.26, 11:00', debt: 197347802, startingPrice: 39469561, startingPercent: 20, startsAt: '2026-10-29T11:00:00+03:00', kind: 'auction' },
  { id: 'arttransstroy-20261106', name: 'ООО «Арттрансстрой»', mark: 'АТ', markColor: '#326a70', category: 'receivables', cases: 1, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Сбор предложений', date: '23.10 – 06.11.26', debt: 5597640, kind: 'offers' },
  { id: 'vvs-leasing-20261102', name: 'ООО «ВВС Лизинг»', mark: 'ВЛ', markColor: '#378d95', category: 'receivables', cases: 1, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Сбор предложений', date: '19.10 – 02.11.26', debt: 78240172, kind: 'offers' },
  { id: 'denezhnaya-krepost-20261028', name: 'МКК «Денежная крепость»', mark: 'ДК', markColor: '#50766d', category: 'individuals', cases: 8666, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Дата торгов', date: '28.10.26, 13:00', debt: 275717932, startingPrice: 49629228, startingPercent: 18, startsAt: '2026-10-28T13:00:00+03:00', kind: 'auction' },
  { id: 'dolg-consulting-20261028', name: 'ПКО «Долг Консалтинг»', mark: 'ДК', markColor: '#227b67', category: 'individuals', cases: 584, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Дата торгов', date: '28.10.26, 11:00', debt: 8540467, startingPrice: 649076, startingPercent: 7.6, startsAt: '2026-10-28T11:00:00+03:00', kind: 'auction' },
  { id: 'svoy-bank-sold', name: 'АО «Свой Банк»', mark: 'СБ', markColor: '#456f76', category: 'individuals', cases: 106, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Результат', date: 'Продано', debt: 4534428, startingPrice: 816197, startingPercent: 18, kind: 'sold' },
  { id: 'tbank-sold', name: 'АО «ТБанк»', mark: 'Т', markColor: '#8c7e36', category: 'individuals', cases: 17750, statusLabel: 'Просужен', status: '19%', dateLabel: 'Результат', date: 'Продано', debt: 1856371393, startingPrice: 109729258, startingPercent: 5.91, kind: 'sold' },
  { id: 'denga-sold', name: 'ГК «ДЕНЬГА»', mark: 'Д', markColor: '#157f62', category: 'individuals', cases: 847, statusLabel: 'Статус', status: 'досудебный', dateLabel: 'Результат', date: 'Продано', debt: 20312106, startingPrice: 4062421, startingPercent: 20, kind: 'sold' },
];

/** The dated schedule supplied in the approved Page 10 design. This is a
 * snapshot, not a live trading API. The portal remains the source of status. */
export const lots: readonly Lot[] = [
  { id: 'zaimer-20261111', name: 'МКК «Займер»', mark: 'З', markColor: '#6c9e18', logo: 'be0e7.png', category: 'individuals', cases: 7989, statusLabel: 'Статус', status: 'Досудебный', dateLabel: 'Начало торгов', date: '11.11.26, 11:00', debt: 137714759, startingPrice: 23411509, startingPercent: 17, startsAt: '2026-11-11T11:00:00+03:00', kind: 'auction' },
  { id: 'amsterdam-20261111', name: 'МКК «АМСТЕРДАМ»', mark: 'А', markColor: '#be6c13', logo: 'c5234.png', category: 'individuals', cases: 331, statusLabel: 'Статус', status: 'Досудебный', dateLabel: 'Начало торгов', date: '11.11.26, 13:00', debt: 16117786, startingPrice: 2981790, startingPercent: 18.5, startsAt: '2026-11-11T13:00:00+03:00', kind: 'auction' },
  { id: 'ozon-credit-20261112', name: 'МКК «Озон Кредит»', mark: 'О', markColor: '#005bff', logo: '8c5f4.png', category: 'individuals', cases: 9205, statusLabel: 'Статус', status: 'Досудебный', dateLabel: 'Начало торгов', date: '12.11.26, 11:00', debt: 104523791, startingPrice: 7316665, startingPercent: 7, startsAt: '2026-11-12T11:00:00+03:00', kind: 'auction' },
  { id: 'norvik-20261112', name: 'ПАО «Норвик Банк»', mark: 'Н', markColor: '#142238', logo: '7769d.png', category: 'individuals', cases: 54, statusLabel: 'Просужен', status: '10%', dateLabel: 'Начало торгов', date: '12.11.26, 13:00', debt: 123072011, startingPrice: 79996806, startingPercent: 65, startsAt: '2026-11-12T13:00:00+03:00', kind: 'auction' },
  { id: 'srochnodengi-20261112', name: 'МКК «Срочноденьги»', mark: 'С', markColor: '#729e00', logo: 'd14ca.png', category: 'individuals', cases: 14286, statusLabel: 'Статус', status: 'Досудебный', dateLabel: 'Начало торгов', date: '12.11.26, 14:00', debt: 259287980, startingPrice: 54450475, startingPercent: 21, startsAt: '2026-11-12T14:00:00+03:00', kind: 'auction' },
  { id: 'expobank-20261113', name: 'АО «Экспобанк»', mark: 'Э', markColor: '#ed721b', logo: '17ff6.png', category: 'individuals', cases: 101, statusLabel: 'Просужен', status: '68%', dateLabel: 'Начало торгов', date: '13.11.26, 11:00', debt: 30561474, startingPrice: 1680881, startingPercent: 5.5, startsAt: '2026-11-13T11:00:00+03:00', kind: 'auction' },
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
