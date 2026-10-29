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
};

// Content transcribed from the supplied DEBTPRICE design. This is not a live auction feed.
export const lots: readonly Lot[] = [
  {
    id: 'tsk-logistika-15',
    name: 'ООО ТСК «ЛОГИСТИКА»',
    mark: 'ТСК',
    markColor: '#353c3f',
    category: 'receivables',
    cases: 15,
    statusLabel: 'Просужен',
    status: '39%',
    dateLabel: 'Сбор предложений',
    date: '23.07 – 24.08.26',
    debt: 138140855,
  },
  {
    id: 'tsk-logistika-5933666',
    name: 'ООО ТСК «ЛОГИСТИКА»',
    mark: 'ТСК',
    markColor: '#353c3f',
    category: 'receivables',
    cases: 1,
    statusLabel: 'Просужен',
    status: 'да',
    dateLabel: 'Сбор предложений',
    date: '03.08 – 21.08.26',
    debt: 5933666,
  },
  {
    id: 'tsk-logistika-14887296',
    name: 'ООО ТСК «ЛОГИСТИКА»',
    mark: 'ТСК',
    markColor: '#353c3f',
    category: 'receivables',
    cases: 1,
    statusLabel: 'Просужен',
    status: 'да',
    dateLabel: 'Сбор предложений',
    date: '03.08 – 21.08.26',
    debt: 14887296,
  },
  {
    id: 'profekt-4',
    name: 'ООО «ПРОФЕКТ 4»',
    mark: 'П4',
    markColor: '#00775f',
    category: 'receivables',
    cases: 1,
    statusLabel: 'Просужен',
    status: 'да',
    dateLabel: 'Сбор предложений',
    date: '07.08 – 21.08.26',
    debt: 5497734,
  },
  {
    id: 'kerting-rus',
    name: 'ООО «КЁРТИНГ РУС»',
    mark: 'КР',
    markColor: '#257898',
    category: 'receivables',
    cases: 1,
    statusLabel: 'Статус',
    status: 'досудебный',
    dateLabel: 'Сбор предложений',
    date: '07.08 – 21.08.26',
    debt: 11692750,
  },
  {
    id: 'lender-invest',
    name: 'АО ФК «Лэндэр-Инвест»',
    mark: 'ЛИ',
    markColor: '#7550d9',
    category: 'receivables',
    cases: 6,
    statusLabel: 'Просужен',
    status: 'да',
    dateLabel: 'Сбор предложений',
    date: '11.08 – 26.08.26',
    debt: 10909649,
  },
  {
    id: 'brokton',
    name: 'МКК «Броктон»',
    mark: 'b',
    markColor: '#ffb800',
    category: 'individuals',
    cases: 1531,
    statusLabel: 'Статус',
    status: 'досудебный',
    dateLabel: 'Торги',
    date: '26.08.26, 11:00',
    debt: 36561495,
    startingPrice: 7312299,
    startingPercent: 20,
  },
  {
    id: 'ztch',
    name: 'МКК «ЗТЧ»',
    mark: 'ЗТЧ',
    markColor: '#ffab50',
    category: 'individuals',
    cases: 1569,
    statusLabel: 'Статус',
    status: 'досудебный',
    dateLabel: 'Торги',
    date: '25.08.26, 11:00',
    debt: 38794460,
    startingPrice: 7758892,
    startingPercent: 20,
  },
  {
    id: 'barvil-hd',
    name: 'МКК «БАРВИЛ ХД»',
    mark: 'БА',
    markColor: '#122929',
    category: 'individuals',
    cases: 238,
    statusLabel: 'Статус',
    status: 'досудебный',
    dateLabel: 'Торги',
    date: '27.08.26, 11:00',
    debt: 3146917,
    startingPrice: 369763,
    startingPercent: 11.75,
  },
  {
    id: 'samoylichenko',
    name: 'Самойличенко С. А.',
    mark: 'СА',
    markColor: '#69afbf',
    category: 'individuals',
    cases: 1,
    statusLabel: 'Статус',
    status: 'досудебный',
    dateLabel: 'Сбор предложений',
    date: '20.08 – 11.09.26',
    debt: 2599517,
  },
];

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
