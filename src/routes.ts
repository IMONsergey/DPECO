export type RequestKind = 'general' | 'portfolio' | 'receivables' | 'buyer';
export interface HomeDestination {
  section?: string;
  lot?: string;
  search?: string;
  documents?: boolean;
  format?: string;
  kind?: RequestKind;
  interest?: string;
  category?: 'all' | 'individuals' | 'receivables';
  period?: 'upcoming' | 'previous';
}

/** Preserve incoming bookmarks without rendering the retired secondary pages. */
export function homeDestination(hash: string): HomeDestination {
  if (hash.startsWith('#lot-')) return { lot: hash.slice(5) };
  if (hash === '#documents') return { documents: true };
  if (hash.startsWith('#format-')) {
    const format = hash.slice(8);
    return ['english', 'dutch', 'offers', 'listing'].includes(format) ? { format } : { section: 'formats' };
  }
  if (!hash.startsWith('#/')) {
    const [section = 'top', query = ''] = hash.slice(1).split('?', 2);
    const params = new URLSearchParams(query);
    if (section === 'search') return { search: (params.get('q') ?? '').slice(0, 120) };
    const destination: HomeDestination = { section: section || 'top' };
    const kind = params.get('kind');
    if (kind === 'portfolio' || kind === 'receivables' || kind === 'buyer' || kind === 'general') destination.kind = kind;
    if (params.has('interest')) destination.interest = params.get('interest')!.slice(0, 180);
    const category = params.get('category');
    if (category === 'all' || category === 'individuals' || category === 'receivables') destination.category = category;
    const period = params.get('period');
    if (period === 'upcoming' || period === 'previous') destination.period = period;
    return destination;
  }
  const [path = '', query = ''] = hash.slice(2).split('?', 2);
  const params = new URLSearchParams(query);
  if (params.has('lot')) return { lot: params.get('lot')! };
  if (params.has('section')) return { section: params.get('section')! };
  const legacy: Record<string, HomeDestination> = {
    '': { section: 'top' },
    'sellers/portfeli': { section: 'request', kind: 'portfolio' },
    'sellers/debitorka': { section: 'request', kind: 'receivables' },
    buyers: { section: 'lots' },
    about: { section: 'process' },
    contacts: { section: 'request' },
    request: { section: 'request' },
    docs: { documents: true },
    search: { search: (params.get('q') ?? '').slice(0, 120) },
    journal: { section: 'materials' },
  };
  return legacy[path.replace(/\/+$/u, '')] ?? { section: path.startsWith('journal/') ? 'materials' : 'top' };
}

/** Every in-page state has a usable address, including modifier-clicks and reload. */
export function homeHash(destination: HomeDestination): string {
  if (destination.documents) return '#documents';
  if (destination.lot) return `#lot-${destination.lot}`;
  if (destination.format) return `#format-${destination.format}`;
  if (destination.search !== undefined) return `#search${destination.search ? `?q=${encodeURIComponent(destination.search)}` : ''}`;
  const params = new URLSearchParams();
  if (destination.kind && destination.kind !== 'general') params.set('kind', destination.kind);
  if (destination.interest) params.set('interest', destination.interest);
  if (destination.category) params.set('category', destination.category);
  if (destination.period) params.set('period', destination.period);
  return `#${destination.section || 'top'}${params.size ? `?${params}` : ''}`;
}
