import './page-motion.css';

const easing = 'cubic-bezier(.22, 1, .36, 1)';

/** One motion vocabulary for the page. Layout and text remain ordinary DOM. */
export function mountPageMotion(app: HTMLElement, restoring = false): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const main = app.querySelector('main');
  if (!main) return () => {};
  const pending = new Set<HTMLElement>();
  const registered = new WeakSet<HTMLElement>();
  const active = new Map<Animation, HTMLElement>();
  const cleanup: (() => void)[] = [];
  const canAnimate = !preference.matches && !restoring && typeof IntersectionObserver !== 'undefined';
  let observer: IntersectionObserver | undefined;

  function animate(element: HTMLElement, frames: Keyframe[], duration: number, delay = 0): void {
    try {
      const animation = element.animate(frames, { duration, delay, easing, fill: 'both' });
      active.set(animation, element);
      const release = () => { active.delete(animation); };
      animation.addEventListener('finish', () => { release(); animation.cancel(); }, { once: true });
      animation.addEventListener('cancel', release, { once: true });
    } catch { /* The final CSS state is already visible. */ }
  }

  function splitHeading(heading: HTMLElement): void {
    const label = heading.innerText.replace(/\s+/gu, ' ').trim();
    if (!label) return;
    const texts: Text[] = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.parentElement?.closest('svg, .sr-only, [aria-hidden="true"]')) continue;
      if (node.textContent?.trim()) texts.push(node);
    }
    heading.setAttribute('aria-label', label);
    heading.classList.add('motion-heading');
    for (const node of texts) {
      const fragment = document.createDocumentFragment();
      for (const token of node.data.split(/(\s+)/u)) {
        if (!token) continue;
        if (/^\s+$/u.test(token)) { fragment.append(document.createTextNode(token)); continue; }
        // The i tag avoids broad h2 > span accent selectors. Its style is inherited.
        const mask = document.createElement('i');
        mask.className = 'motion-word';
        mask.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('i');
        inner.className = 'motion-word__inner';
        inner.textContent = token;
        mask.append(inner);
        fragment.append(mask);
      }
      node.replaceWith(fragment);
    }
  }

  function reveal(element: HTMLElement, immediate = false): void {
    if (!pending.delete(element)) return;
    observer?.unobserve(element);
    element.classList.remove('motion-pending');
    element.classList.add('is-revealed');
    if (immediate || preference.matches || !element.isConnected) return;
    const delay = Math.min(Number(element.dataset.motionDelay) || 0, 210);
    if (element.classList.contains('motion-heading')) {
      const words = [...element.querySelectorAll<HTMLElement>('.motion-word')];
      const positions = words.map((word) => Math.round(word.getBoundingClientRect().top));
      const lines = [...new Set(positions)].sort((a, b) => a - b);
      words.forEach((word, index) => {
        const inner = word.firstElementChild as HTMLElement | null;
        if (inner) animate(inner, [{ transform: 'translateY(112%)', opacity: .25 }, { transform: 'translateY(0)', opacity: 1 }], 760, delay + Math.min(lines.indexOf(positions[index]!) * 85, 255));
      });
    } else {
      animate(element, [{ opacity: 0, translate: '0 20px' }, { opacity: 1, translate: '0 0' }], 720, delay);
    }
  }

  function register(element: HTMLElement, delay = 0): void {
    if (!canAnimate || registered.has(element) || element.closest('[inert], [hidden]')) return;
    // Do not stack a section reveal with its own animated children.
    if (element.parentElement?.closest('[data-reveal]')) return;
    registered.add(element);
    if (element.hasAttribute('data-text-reveal')) splitHeading(element);
    element.dataset.motionDelay = String(delay);
    element.classList.add('motion-pending');
    pending.add(element);
    observer?.observe(element);
  }

  function registerWithin(context: Element): void {
    if (!canAnimate) return;
    const marked = '[data-text-reveal], [data-reveal]';
    if (context instanceof HTMLElement && context.matches(marked)) register(context);
    context.querySelectorAll<HTMLElement>(marked).forEach((element) => register(element));
    const groups = [...context.querySelectorAll<HTMLElement>('[data-stagger], #lots-grid')];
    if (context instanceof HTMLElement && context.matches('[data-stagger], #lots-grid')) groups.unshift(context);
    groups.forEach((group) => [...group.children].forEach((child, index) => {
      if (child instanceof HTMLElement && !child.matches('script, style, .sr-only')) register(child, index % 4 * 70);
    }));
    if (context instanceof HTMLElement && context.parentElement?.matches('[data-stagger], #lots-grid')) {
      register(context, [...context.parentElement.children].indexOf(context) % 4 * 70);
    }
  }

  if (canAnimate) {
    observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) reveal(entry.target as HTMLElement);
    }), { rootMargin: '0px 0px -3% 0px', threshold: .06 });
    registerWithin(main);
    const mutations = new MutationObserver((records) => {
      for (const element of pending) if (!element.isConnected) { observer?.unobserve(element); pending.delete(element); }
      for (const [animation, element] of active) if (!element.isConnected) { animation.cancel(); active.delete(animation); }
      records.forEach((record) => record.addedNodes.forEach((node) => { if (node instanceof HTMLElement) registerWithin(node); }));
    });
    mutations.observe(main, { childList: true, subtree: true });
    cleanup.push(() => mutations.disconnect());
    main.addEventListener('focusin', (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const hidden = event.target.closest<HTMLElement>('.motion-pending');
      if (hidden) reveal(hidden, !hidden.classList.contains('motion-heading'));
    }, { signal });
  }

  if (!canAnimate) main.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => element.classList.add('is-revealed'));

  // One moving plate, rather than separate buttons abruptly changing fill.
  app.querySelectorAll<HTMLElement>('.segmented, .capability-new__tabs').forEach((group) => {
    const buttons = [...group.querySelectorAll<HTMLElement>('[role="tab"]')];
    if (buttons.length < 2) return;
    const plate = document.createElement('span');
    plate.className = 'tab-indicator';
    plate.setAttribute('aria-hidden', 'true');
    group.prepend(plate);
    group.classList.add('has-tab-indicator');
    let frame = 0;
    let readyFrame = 0;
    let initialized = false;
    const measure = () => {
      frame = 0;
      const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
      if (!selected) return;
      plate.style.width = `${selected.offsetWidth}px`;
      plate.style.height = `${selected.offsetHeight}px`;
      plate.style.transform = `translate(${selected.offsetLeft}px, ${selected.offsetTop}px)`;
      if (!initialized) {
        initialized = true;
        readyFrame = requestAnimationFrame(() => { readyFrame = 0; group.classList.add('tab-indicator-ready'); });
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const resize = new ResizeObserver(schedule);
    resize.observe(group);
    buttons.forEach((button) => resize.observe(button));
    const selection = new MutationObserver(schedule);
    selection.observe(group, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    cleanup.push(() => { cancelAnimationFrame(frame); cancelAnimationFrame(readyFrame); resize.disconnect(); selection.disconnect(); plate.remove(); group.classList.remove('has-tab-indicator', 'tab-indicator-ready'); });
  });

  // A few product illustrations move by only 16px over the whole viewport.
  // Event-driven updates stop entirely when the user stops scrolling.
  const illustrations = [...main.querySelectorAll<HTMLElement>('.offer__image, .ecosystem__art img, .market-hero-visual > img, .info-hero__art > img')];
  let scrollFrame = 0;
  const updateIllustrations = () => {
    scrollFrame = 0;
    illustrations.forEach((image) => {
      if (preference.matches || innerWidth < 900) { image.style.removeProperty('--image-travel'); return; }
      const box = image.getBoundingClientRect();
      if (box.bottom < -100 || box.top > innerHeight + 100) return;
      const progress = Math.max(-1, Math.min(1, (box.top + box.height / 2 - innerHeight / 2) / innerHeight));
      image.style.setProperty('--image-travel', `${(progress * -16).toFixed(2)}px`);
    });
  };
  illustrations.forEach((image) => image.classList.add('scene-image'));
  const scheduleScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateIllustrations); };
  if (illustrations.length) {
    window.addEventListener('scroll', scheduleScroll, { passive: true, signal });
    window.addEventListener('resize', scheduleScroll, { passive: true, signal });
    updateIllustrations();
  }
  preference.addEventListener('change', () => {
    if (preference.matches) { [...pending].forEach((element) => reveal(element, true)); active.forEach((_, animation) => animation.cancel()); }
    updateIllustrations();
  }, { signal });

  return () => {
    abort.abort();
    observer?.disconnect();
    cleanup.forEach((fn) => fn());
    active.forEach((_, animation) => animation.cancel());
    pending.forEach((element) => element.classList.remove('motion-pending'));
    cancelAnimationFrame(scrollFrame);
  };
}

let routeTransition: ViewTransition | undefined;
let revision = 0;

export function cancelRouteTransition(): void {
  revision += 1;
  routeTransition?.skipTransition();
  routeTransition = undefined;
}

/** The old page leaves before the new one enters; rapid requests cancel cleanly. */
export function transitionRoute(update: () => void): void {
  cancelRouteTransition();
  const version = revision;
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) { update(); return; }
  const transition = document.startViewTransition(() => { if (version === revision) update(); });
  routeTransition = transition;
  void transition.ready.catch(() => {});
  void transition.finished.catch(() => {}).finally(() => { if (routeTransition === transition) routeTransition = undefined; });
}
