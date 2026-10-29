/** Enhance native details without losing keyboard semantics or the no-JS fallback. */
export function mountAccordions(app: HTMLElement): () => void {
  const abort = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map<HTMLDetailsElement, Animation>();
  const wanted = new WeakMap<HTMLDetailsElement, boolean>();
  const settle = (details: HTMLDetailsElement) => {
    running.get(details)?.cancel();
    running.delete(details);
    details.open = wanted.get(details) ?? details.open;
    details.style.height = '';
    details.style.overflow = '';
  };
  for (const details of app.querySelectorAll<HTMLDetailsElement>('.market-model-details')) {
    const summary = details.querySelector('summary');
    if (!summary) continue;
    summary.addEventListener('click', (event) => {
      if (motion.matches || typeof details.animate !== 'function') { wanted.delete(details); return; }
      event.preventDefault();
      const targetOpen = !(wanted.get(details) ?? details.open);
      const start = details.getBoundingClientRect().height;
      wanted.set(details, targetOpen);
      running.get(details)?.cancel();
      running.delete(details);
      details.style.height = '';
      details.open = targetOpen;
      const end = details.getBoundingClientRect().height;
      details.open = true;
      details.style.height = `${start}px`;
      details.style.overflow = 'hidden';
      const animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
      running.set(details, animation);
      animation.addEventListener('finish', () => { if (running.get(details) === animation) settle(details); }, { once: true });
    }, { signal: abort.signal });
  }
  const settleAll = () => [...running.keys()].forEach(settle);
  window.addEventListener('resize', settleAll, { passive: true, signal: abort.signal });
  motion.addEventListener('change', settleAll, { signal: abort.signal });
  return () => { abort.abort(); settleAll(); };
}

export function mountTabs(app: HTMLElement): () => void {
  const abort = new AbortController();
  app.querySelectorAll<HTMLElement>('[role="tablist"]:not(.capability-new__tabs)').forEach((tablist) => {
    tablist.addEventListener('keydown', (event) => {
      const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;
      const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
      let next = index;
      if (event.key === 'ArrowRight' || (vertical && event.key === 'ArrowDown')) next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || (vertical && event.key === 'ArrowUp')) next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next]?.focus({ preventScroll: true });
      tabs[next]?.click();
      if (tablist.scrollWidth > tablist.clientWidth) tabs[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, { signal: abort.signal });
  });
  return () => abort.abort();
}
