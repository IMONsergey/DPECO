import './homepage-lock.css';

const routeAttributes = ['data-scroll', 'data-open-documents', 'data-open-lot', 'data-p10-format-open', 'data-request-kind', 'data-request-interest', 'data-lots-category', 'data-lots-period'];
const routeButtons = '[data-open-documents], [data-open-lot], [data-p10-format-open]';

function disableNavigation(element: HTMLElement): void {
  element.setAttribute('data-navigation-disabled', '');
  element.setAttribute('aria-disabled', 'true');
  element.removeAttribute('aria-haspopup');
  element.removeAttribute('aria-controls');
  for (const attribute of routeAttributes) element.removeAttribute(attribute);
  if (element instanceof HTMLAnchorElement) {
    for (const attribute of ['href', 'target', 'rel', 'download', 'ping']) element.removeAttribute(attribute);
    element.setAttribute('role', 'link');
    // Service descriptions remain available by keyboard, without a destination.
    element.tabIndex = element.closest('[data-ecosystem-item]') ? 0 : -1;
    element.querySelectorAll<HTMLElement>('.sr-only').forEach((label) => {
      if (/новой\s+вкладке/iu.test(label.textContent ?? '')) label.remove();
    });
  } else element.tabIndex = -1;
}

function lockForm(form: HTMLFormElement): void {
  form.removeAttribute('action');
  form.removeAttribute('target');
  if (form.matches('[data-site-search]')) form.querySelectorAll<HTMLElement>('button[type="submit"]').forEach(disableNavigation);
}

function lockWithin(context: ParentNode): void {
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

/** Remove destinations before initial or refreshed HTML reaches the document. */
export function staticHomepageMarkup(markup: string): string {
  const template = document.createElement('template');
  template.innerHTML = markup;
  lockWithin(template.content);
  return template.innerHTML;
}

/** This published review contains one screen, with only local UI interactions. */
export function mountHomepageLock(app: HTMLElement): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  app.classList.add('homepage-static');
  lockWithin(app);

  const preventNavigation = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('a, [data-navigation-disabled]') : null;
    if (!target || !app.contains(target)) return;
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
    if (!(event.target instanceof HTMLFormElement) || !event.target.matches('[data-request-form]')) event.stopImmediatePropagation();
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
        if (record.target instanceof HTMLElement) lockWithin(record.target);
      } else record.addedNodes.forEach((node) => { if (node instanceof HTMLElement) lockWithin(node); });
    }
  });
  mutations.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'target', 'download', 'action', 'formaction', 'formtarget'] });
  return () => { abort.abort(); mutations.disconnect(); app.classList.remove('homepage-static'); };
}
