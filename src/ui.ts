export type IconName = 'arrow-right' | 'arrow-down' | 'arrow-up' | 'arrow-up-right' | 'chevron-down' | 'search' | 'grid' | 'phone' | 'mail' | 'login' | 'share' | 'briefcase' | 'folders' | 'coins' | 'users' | 'close' | 'menu' | 'clock' | 'check';

const paths: Record<IconName, string> = {
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-down': '<path d="M12 4v15M6 13l6 6 6-6"/>',
  'arrow-up': '<path d="M12 20V5M6 11l6-6 6 6"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'chevron-down': '<path d="m7 10 5 5 5-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  phone: '<path d="m8 3 3 5-3 3c1 3 2 4 5 5l3-3 5 3-1 4c-8 3-19-8-16-16z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  login: '<path d="M13 4h6v16h-6M3 12h12M10 7l5 5-5 5"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.7 7.5-4.4M8.2 13.3l7.5 4.4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13c6 3 12 3 18 0M10 14h4"/>',
  folders: '<path d="M4 17V4h7l3 3h6v10M7 20V10h7l3 3h4v7z"/>',
  coins: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v5c0 4 16 4 16 0V7M4 12v5c0 4 16 4 16 0v-5M9 10v3M15 10v3M9 15v3M15 15v3"/>',
  users: '<circle cx="12" cy="8" r="3"/><path d="M7 19v-2a5 5 0 0 1 10 0v2M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name: IconName, className = ''): string {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export const rubles = (amount: number): string => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ₽';
export const asset = (path: string): string => `${import.meta.env.BASE_URL}assets/${path}`;
export const accountUrl = 'https://my.debtprice.market/site/login';
export const registerUrl = 'https://my.debtprice.market/site/register';
