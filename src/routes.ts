export type RequestKind = 'general' | 'portfolio' | 'receivables' | 'buyer';
export interface HomeDestination {
  section?: string;
  lot?: string;
  search?: string;
  documents?: boolean;
  kind?: RequestKind;
}

/** Preserve incoming bookmarks without rendering the retired secondary pages. */
export function homeDestination(hash: string): HomeDestination {
  if (hash.startsWith('#lot-')) return { lot: hash.slice(5) };
  if (hash === '#documents') return { documents: true };
  if (!hash.startsWith('#/')) return { section: hash.slice(1) || 'top' };
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
    search: { search: params.get('q') ?? '' },
    journal: { section: 'materials' },
  };
  return legacy[path.replace(/\/+$/u, '')] ?? { section: path.startsWith('journal/') ? 'materials' : 'top' };
}
