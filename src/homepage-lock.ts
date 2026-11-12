import './homepage-lock.css';

const routeAttributes = ['data-scroll', 'data-open-documents', 'data-open-lot', 'data-p10-format-open', 'data-request-kind', 'data-request-interest', 'data-lots-category', 'data-lots-period'];
const routeButtons = '[data-open-documents], [data-open-lot], [data-p10-format-open]';
const availabilitySelector = '[data-availability]';
const soonSelector = '.p10-hero .hero__actions .button, .p10-choice__actions .button, .p10-materials__all';
const developmentSelector = 'a[href="#/about"], a[href="#/contacts"], .p10-footer nav:is([aria-labelledby="footer-platform-title"], [aria-labelledby="footer-information-title"], [aria-labelledby="footer-contact-title"]) a';
const approvedDestinations = new Set([
  'https://my.debtprice.market/site/login',
  'https://my.debtprice.market/site/register',
  'https://my.debtprice.market/Privacy_policy.pdf',
  'https://t.me/+0NVxCNB9xCozYmFi',
  'https://rvzrus.ru/', 'https://www.debt-tech.ru/',
  'https://dolgtalk.ru/', 'https://navigator.debt-tech.ru/', 'https://pko300.ru/',
  'tel:+79159724101', 'mailto:v@debtprice.market',
  'mailto:invest@debtprice.market', 'mailto:debt@debtprice.market',
  'mailto:sales@debtprice.market', 'mailto:pr@debtprice.market', 'mailto:info@debtprice.market',
  '#/', '#/privacy', '#top', '#request',
]);
const searchSections = new Set(['#lots', '#sell-buy', '#capabilities', '#formats', '#process', '#request', '#ecosystem', '#materials']);
export function approvedNavigation(element: Element): boolean {
  if (!(element instanceof HTMLAnchorElement) || element.matches(availabilitySelector) || element.matches(developmentSelector) || element.matches(soonSelector)) return false;
  const href = element.getAttribute('href') ?? '';
  return approvedDestinations.has(href) || (element.matches('[data-live-search-result]') && searchSections.has(href));
}

const availabilityText = { development: 'В разработке', soon: 'Скоро доступно' } as const;
type Availability = keyof typeof availabilityText;

function annotateAvailability(element: HTMLElement): void {
  if (element.matches(developmentSelector)) element.dataset.availability = 'development';
  else if (element.matches(soonSelector)) element.dataset.availability = 'soon';
  const kind = element.dataset.availability;
  if (kind !== 'development' && kind !== 'soon') return;
  const description = `homepage-availability-${kind}`;
  const descriptions = new Set((element.getAttribute('aria-describedby') ?? '').split(/\s+/u).filter(Boolean));
  descriptions.add(description);
  element.setAttribute('aria-describedby', [...descriptions].join(' '));
  element.removeAttribute('title');
}

function disableNavigation(element: HTMLElement): void {
  if (approvedNavigation(element)) {
    element.removeAttribute('data-navigation-disabled');
    element.removeAttribute('aria-disabled');
    element.removeAttribute('tabindex');
    element.removeAttribute('role');
    return;
  }
  element.setAttribute('data-navigation-disabled', '');
  element.setAttribute('aria-disabled', 'true');
  element.removeAttribute('aria-haspopup');
  element.removeAttribute('aria-controls');
  for (const attribute of routeAttributes) element.removeAttribute(attribute);
  if (element instanceof HTMLAnchorElement) {
    for (const attribute of ['href', 'target', 'rel', 'download', 'ping']) element.removeAttribute(attribute);
    element.setAttribute('role', 'link');
    // Service descriptions remain available by keyboard, without a destination.
    element.tabIndex = element.closest('[data-ecosystem-item]') || element.matches(availabilitySelector) ? 0 : -1;
    element.querySelectorAll<HTMLElement>('.sr-only').forEach((label) => {
      if (/новой\s+вкладке/iu.test(label.textContent ?? '')) label.remove();
    });
  } else element.tabIndex = element.matches(availabilitySelector) ? 0 : -1;
}

function lockForm(form: HTMLFormElement): void {
  form.removeAttribute('action');
  form.removeAttribute('target');

}

function lockWithin(context: ParentNode): void {
  const availabilityTargets = `${availabilitySelector}, ${developmentSelector}, ${soonSelector}`;
  if (context instanceof HTMLElement && context.matches(availabilityTargets)) annotateAvailability(context);
  context.querySelectorAll<HTMLElement>(availabilityTargets).forEach(annotateAvailability);
  if (context instanceof HTMLElement && context.matches(`a, ${routeButtons}`)) disableNavigation(context);
  context.querySelectorAll<HTMLElement>(`a, ${routeButtons}`).forEach(disableNavigation);
  if (context instanceof HTMLFormElement) lockForm(context);
  context.querySelectorAll<HTMLFormElement>('form').forEach(lockForm);
  const controls = [...context.querySelectorAll<HTMLElement>('[formaction], [formtarget]')];
  if (context instanceof HTMLElement && context.matches('[formaction], [formtarget]')) controls.unshift(context);
  controls.forEach((control) => {
    control.removeAttribute('formaction');
    control.removeAttribute('formtarget');
  });
}

/** Keep only the destinations explicitly requested in the current client edits. */
export function staticHomepageMarkup(markup: string): string {
  const template = document.createElement('template');
  template.innerHTML = markup;
  lockWithin(template.content);
  return template.innerHTML;
}

/** Preserve unavailable controls while allowing the reviewed destinations. */
export function mountHomepageLock(app: HTMLElement): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  app.classList.add('homepage-static');
  lockWithin(app);

  // Portals avoid clipping inside animated cards, the fixed header and menus.
  const tooltips = new Map<Availability, HTMLSpanElement>();
  for (const kind of Object.keys(availabilityText) as Availability[]) {
    const tooltip = document.createElement('span');
    tooltip.id = `homepage-availability-${kind}`;
    tooltip.className = 'homepage-availability-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = availabilityText[kind];
    document.body.append(tooltip);
    tooltips.set(kind, tooltip);
  }
  let activeTrigger: HTMLElement | null = null;
  let activeTooltip: HTMLSpanElement | null = null;
  let hoveredTrigger: HTMLElement | null = null;
  let tooltipHovered = false;
  let hideTimeout = 0;

  const availabilityTarget = (target: EventTarget | null): HTMLElement | null => {
    const element = target instanceof Element ? target.closest<HTMLElement>(availabilitySelector) : null;
    return element && app.contains(element) ? element : null;
  };
  const hideTooltip = (): void => {
    window.clearTimeout(hideTimeout);
    activeTooltip?.classList.remove('is-visible');
    activeTooltip = null;
    activeTrigger = null;
    tooltipHovered = false;
  };
  const positionTooltip = (): void => {
    if (!activeTrigger || !activeTooltip) return;
    const rect = activeTrigger.getBoundingClientRect();
    if (!activeTrigger.isConnected || rect.bottom < 0 || rect.top > innerHeight || !rect.width || !rect.height) {
      hideTooltip();
      return;
    }
    const width = activeTooltip.offsetWidth;
    const height = activeTooltip.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left + (rect.width - width) / 2));
    const below = rect.bottom + height + 10 <= innerHeight - 12;
    const top = below ? rect.bottom + 10 : Math.max(12, rect.top - height - 10);
    activeTooltip.style.left = `${Math.round(left)}px`;
    activeTooltip.style.top = `${Math.round(top)}px`;
  };
  const showTooltip = (trigger: HTMLElement | null): void => {
    window.clearTimeout(hideTimeout);
    if (!trigger || trigger.getAttribute('aria-expanded') === 'true') { hideTooltip(); return; }
    const tooltip = tooltips.get(trigger.dataset.availability as Availability);
    if (!tooltip) return;
    if (activeTooltip !== tooltip) activeTooltip?.classList.remove('is-visible');
    activeTrigger = trigger;
    activeTooltip = tooltip;
    positionTooltip();
    if (activeTooltip) activeTooltip.classList.add('is-visible');
  };
  const settleTooltip = (): void => {
    window.clearTimeout(hideTimeout);
    hideTimeout = window.setTimeout(() => {
      if (tooltipHovered) return;
      showTooltip(availabilityTarget(document.activeElement) ?? hoveredTrigger);
    }, 90);
  };
  app.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    hoveredTrigger = availabilityTarget(event.target);
    if (hoveredTrigger) showTooltip(hoveredTrigger);
  }, { signal });
  app.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    hoveredTrigger = availabilityTarget(event.relatedTarget);
    if (hoveredTrigger) showTooltip(hoveredTrigger);
    else settleTooltip();
  }, { signal });
  app.addEventListener('focusin', (event) => showTooltip(availabilityTarget(event.target)), { signal });
  app.addEventListener('focusout', settleTooltip, { signal });
  document.addEventListener('pointerdown', (event) => {
    const target = availabilityTarget(event.target);
    if (target) showTooltip(target);
    else if (!(event.target instanceof Node) || !activeTooltip?.contains(event.target)) hideTooltip();
  }, { capture: true, signal });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideTooltip();
  }, { capture: true, signal });
  for (const tooltip of tooltips.values()) {
    tooltip.addEventListener('pointerenter', () => { tooltipHovered = true; window.clearTimeout(hideTimeout); }, { signal });
    tooltip.addEventListener('pointerleave', () => { tooltipHovered = false; settleTooltip(); }, { signal });
  }
  window.addEventListener('scroll', positionTooltip, { capture: true, passive: true, signal });
  window.addEventListener('resize', positionTooltip, { passive: true, signal });

  const preventNavigation = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('a, [data-navigation-disabled]') : null;
    if (!target || !app.contains(target) || approvedNavigation(target)) return;
    if (event instanceof KeyboardEvent && !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  app.addEventListener('click', preventNavigation, { capture: true, signal });
  app.addEventListener('auxclick', preventNavigation, { capture: true, signal });
  app.addEventListener('keydown', preventNavigation, { capture: true, signal });
  app.addEventListener('submit', (event) => {
    // Even Enter in the search field cannot perform a native GET navigation.
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement) || !event.target.matches('[data-request-form], [data-site-search]')) event.stopImmediatePropagation();
  }, { capture: true, signal });
  app.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-skip-content]')) return;
    app.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
  }, { signal });

  // Defensive coverage for future components; current producers also lock
  // their markup before insertion and never restore navigation attributes.
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.attributeName === 'aria-expanded') {
          if (record.target === activeTrigger && activeTrigger?.getAttribute('aria-expanded') === 'true') hideTooltip();
          continue;
        }
        if (record.target instanceof HTMLElement) lockWithin(record.target);
      } else record.addedNodes.forEach((node) => { if (node instanceof HTMLElement) lockWithin(node); });
    }
  });
  mutations.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'target', 'download', 'action', 'formaction', 'formtarget', 'aria-expanded'] });
  return () => {
    hideTooltip();
    abort.abort();
    mutations.disconnect();
    tooltips.forEach((tooltip) => tooltip.remove());
    app.classList.remove('homepage-static');
  };
}
