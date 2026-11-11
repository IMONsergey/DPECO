import './theme.css';

export type Theme = 'light' | 'dark';

const storageKey = 'dpeco-theme';
const mounts = new WeakMap<HTMLElement, () => void>();
let sessionPreference: Theme | null = null;

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Rebind after rendering a route; the preference belongs to the whole site. */
export function mountTheme(root: HTMLElement): () => void {
  mounts.get(root)?.();
  const abort = new AbortController();
  const { signal } = abort;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = storedTheme() ?? sessionPreference;
  let disposed = false;

  function apply(): void {
    const theme: Theme = preference ?? (system.matches ? 'dark' : 'light');
    const dark = theme === 'dark';
    const html = document.documentElement;
    const changed = html.dataset.theme !== theme;
    html.dataset.theme = theme;
    html.style.colorScheme = theme;
    const label = dark ? 'Включить светлую тему' : 'Включить темную тему';
    root.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('title', label);
      button.dataset.themeCurrent = theme;
      const text = button.querySelector<HTMLElement>('[data-theme-label]');
      if (text) text.textContent = label;
    });
    if (changed) document.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }));
  }

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-theme-toggle]');
    if (!button || !root.contains(button) || button.disabled) return;
    event.preventDefault();
    preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    sessionPreference = preference;
    try { localStorage.setItem(storageKey, preference); } catch { /* The selected theme still works for this visit. */ }
    apply();
  }, { signal });

  system.addEventListener('change', () => { if (preference === null) apply(); }, { signal });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    // A removed/invalid preference returns this tab to the current system theme.
    preference = event.key === storageKey
      ? event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : null
      : storedTheme();
    sessionPreference = preference;
    apply();
  }, { signal });

  apply();
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    abort.abort();
    if (mounts.get(root) === destroy) mounts.delete(root);
  };
  mounts.set(root, destroy);
  return destroy;
}
