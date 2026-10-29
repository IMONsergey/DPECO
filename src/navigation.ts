export function mountNavigation(app: HTMLElement, currentPath: string): { close: () => void; destroy: () => void } {
  const header = app.querySelector<HTMLElement>('#site-header');
  const menu = app.querySelector<HTMLElement>('#mobile-menu');
  const menuButton = app.querySelector<HTMLButtonElement>('[data-mobile-toggle]');
  if (!header || !menu || !menuButton) return { close: () => {}, destroy: () => {} };
  const abort = new AbortController();
  const { signal } = abort;
  const dropdowns = [...header.querySelectorAll<HTMLElement>('.nav-dropdown')];
  let scrollFrame = 0;

  function setDropdown(dropdown: HTMLElement, open: boolean): void {
    const trigger = dropdown.querySelector<HTMLButtonElement>('[data-nav-toggle]');
    const panel = dropdown.querySelector<HTMLElement>('.nav-panel');
    if (!trigger || !panel) return;
    dropdown.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
  }
  function closeDropdowns(except?: HTMLElement): void {
    dropdowns.forEach((item) => { if (item !== except) setDropdown(item, false); });
  }
  function setMenu(open: boolean): void {
    header!.classList.toggle('menu-open', open);
    menu!.inert = !open;
    menu!.setAttribute('aria-hidden', String(!open));
    menuButton!.setAttribute('aria-expanded', String(open));
    menuButton!.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('has-menu', open);
    if (open) closeDropdowns();
  }
  const close = () => { closeDropdowns(); setMenu(false); };

  for (const link of header.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
    const path = link.getAttribute('href')?.slice(2).split('?')[0];
    if (path === currentPath && !link.classList.contains('header__brand')) {
      link.setAttribute('aria-current', 'page');
      link.closest('.nav-dropdown')?.classList.add('is-current');
    }
  }

  header.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-mobile-toggle]')) {
      setMenu(!header.classList.contains('menu-open'));
      return;
    }
    const trigger = target.closest<HTMLButtonElement>('[data-nav-toggle]');
    const dropdown = trigger?.closest<HTMLElement>('.nav-dropdown');
    if (dropdown) {
      const open = !dropdown.classList.contains('is-open');
      closeDropdowns(dropdown);
      setDropdown(dropdown, open);
    }
    if (target.closest('a')) close();
  }, { signal });

  header.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const dropdown = target?.closest<HTMLElement>('.nav-dropdown');
    if (!dropdown) return;
    const trigger = dropdown.querySelector<HTMLButtonElement>('[data-nav-toggle]');
    const links = [...dropdown.querySelectorAll<HTMLElement>('.nav-panel a, .nav-panel button')];
    const index = links.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDropdown(dropdown, false);
      trigger?.focus({ preventScroll: true });
      return;
    }
    let next = -1;
    if (target === trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      closeDropdowns(dropdown);
      setDropdown(dropdown, true);
      next = event.key === 'ArrowDown' ? 0 : links.length - 1;
    } else if (index >= 0) {
      if (event.key === 'ArrowDown') next = (index + 1) % links.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + links.length) % links.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = links.length - 1;
    }
    if (next >= 0) { event.preventDefault(); links[next]?.focus({ preventScroll: true }); }
  }, { signal });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (!header.contains(event.target)) close();
    else dropdowns.forEach((dropdown) => { if (!dropdown.contains(event.target as Node)) setDropdown(dropdown, false); });
  }, { signal });
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Node)) return;
    dropdowns.forEach((dropdown) => { if (!dropdown.contains(event.target as Node)) setDropdown(dropdown, false); });
    if (header.classList.contains('menu-open') && !header.contains(event.target)) setMenu(false);
  }, { signal });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      setMenu(false);
      menuButton.focus({ preventScroll: true });
    }
  }, { signal });

  const darkSection = app.querySelector<HTMLElement>('.intro, .market-hero');
  function updateHeader(): void {
    scrollFrame = 0;
    const light = !darkSection || darkSection.getBoundingClientRect().bottom < header!.offsetHeight + (darkSection.classList.contains('intro') ? 160 : 40);
    header!.classList.toggle('is-light', light);
  }
  const schedule = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader); };
  window.addEventListener('scroll', schedule, { signal, passive: true });
  window.addEventListener('resize', () => {
    if (innerWidth > 1199) setMenu(false);
    schedule();
  }, { signal, passive: true });
  updateHeader();

  return { close, destroy: () => { abort.abort(); cancelAnimationFrame(scrollFrame); document.body.classList.remove('has-menu'); } };
}
