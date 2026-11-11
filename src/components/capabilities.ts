import { asset, escapeHtml, icon } from '../ui';
import './capabilities.css';

type Audience = 'seller' | 'buyer';
type Cleanup = () => void;

interface Capability {
  id: string;
  title: readonly [string, string];
  image: string;
  imageWidth: number;
  imageHeight: number;
  icon: string;
  description: Record<Audience, string>;
  requestKind: 'portfolio' | 'receivables' | 'general';
  buyerCategory: 'all' | 'individuals' | 'receivables';
}

const items: readonly Capability[] = [
  {
    id: 'credit',
    title: ['Кредитные', 'портфели'],
    image: 'aaf44.webp',
    imageWidth: 570,
    imageHeight: 488,
    icon: '993bf.svg',
    description: {
      seller: 'Залоговые и беззалоговые: авто, ипотека, потребительские',
      buyer: 'От банков, МФО и страховых компаний — с полным пакетом документов',
    },
    requestKind: 'portfolio',
    buyerCategory: 'individuals',
  },
  {
    id: 'factoring',
    title: ['Факторинговые', 'портфели'],
    image: '1bd63.webp',
    imageWidth: 858,
    imageHeight: 734,
    icon: 'c8634.svg',
    description: {
      seller: 'Уступленная дебиторка по договорам факторинга',
      buyer: 'Права требования, уступленные факторинговыми компаниями',
    },
    requestKind: 'general',
    buyerCategory: 'receivables',
  },
  {
    id: 'receivables',
    title: ['Дебиторская', 'задолженность'],
    image: 'd598a.webp',
    imageWidth: 570,
    imageHeight: 488,
    icon: 'fe610.svg',
    description: {
      seller: 'Долги юридических лиц — досудебные и просуженные',
      buyer: 'Корпоративных клиентов — с заключением площадки по каждому лоту',
    },
    requestKind: 'receivables',
    buyerCategory: 'receivables',
  },
  {
    id: 'claims',
    title: ['Права', 'требования'],
    image: '41153.webp',
    imageWidth: 570,
    imageHeight: 488,
    icon: '0a8ef.svg',
    description: {
      seller: 'По гражданско-правовым договорам и возмещение имущественного вреда',
      buyer: 'По гражданско-правовым договорам и возмещению вреда',
    },
    requestKind: 'general',
    buyerCategory: 'all',
  },
  {
    id: 'other',
    title: ['Прочие права', 'требования'],
    image: 'acf5f.webp',
    imageWidth: 1254,
    imageHeight: 1254,
    icon: '0b785.svg',
    description: {
      seller: 'Другие виды прав требования. Обсудим актив и подберем подходящий формат сделки.',
      buyer: 'Права требования по другим видам обязательств. Изучите состав и условия актива.',
    },
    requestKind: 'general',
    buyerCategory: 'all',
  },
];

const additional: Record<Audience, { title: string; description: string }> = {
  seller: {
    title: 'Портфели любого объёма',
    description: 'От одного договора',
  },
  buyer: {
    title: 'Долги перед сервисами',
    description: 'Каршеринг и операторы услуг',
  },
};

const actionLabels: Record<Audience, string> = {
  seller: 'Обсудить продажу',
  buyer: 'Посмотреть лоты',
};

const mounts = new WeakMap<HTMLElement, Cleanup>();

/** Hidden measuring lines reserve the larger of both texts without truncating either. */
function measuringLines(values: readonly string[]): string {
  return values.map((text) => `<span class="capability-new__measure" aria-hidden="true">${escapeHtml(text)}</span>`).join('');
}

function card(item: Capability, index: number): string {
  const titleId = `capability-new-title-${item.id}`;
  const descriptionId = `capability-new-description-${item.id}`;
  const bodyId = `capability-new-body-${item.id}`;
  const expanded = index === 1;
  return `
    <article class="capability-new__card${expanded ? ' is-active' : ''}" data-capability-new-card="${item.id}">
        <div class="capability-new__media">
          <img class="capability-new__image" src="${asset(`page10/391-1045/${item.image}`)}" alt="" width="${item.imageWidth}" height="${item.imageHeight}" loading="lazy" decoding="async">
          <span class="capability-new__number" aria-hidden="true">0${index + 1}</span>
          <span class="capability-new__symbol" aria-hidden="true"><img src="${asset(`page10/391-1045/${item.icon}`)}" alt="" loading="lazy"></span>
        </div>
        <div class="capability-new__content">
          <h3 class="capability-new__title" id="${titleId}"><button type="button" class="capability-new__expand" data-capability-new-expand="${item.id}" aria-expanded="${expanded}" aria-controls="${bodyId}">${item.title.map((line) => `<span>${escapeHtml(line)}</span>`).join(' ')}</button></h3>
          <div class="capability-new__body" id="${bodyId}">
            <div class="capability-new__body-inner">
              <div class="capability-new__description-frame">
                ${measuringLines([item.description.seller, item.description.buyer])}
                <p class="capability-new__description" id="${descriptionId}" data-capability-new-description="${item.id}">${escapeHtml(item.description.seller)}</p>
              </div>
              <a class="button button--primary capability-new__cta" role="link" aria-disabled="true" tabindex="-1" data-capability-new-link="${item.id}" aria-label="${escapeHtml(`${actionLabels.seller}: ${item.title.join(' ')}`)}" aria-describedby="${descriptionId}"><span>${actionLabels.seller}</span>${icon('arrow-right')}</a>
            </div>
          </div>
        </div>
    </article>`;
}

export function renderCapabilities(): string {
  return `
    <section class="capabilities section capability-new p10-capabilities" id="capabilities" aria-labelledby="capabilities-title" data-capability-new-role="seller" data-node-id="391:1045">
      <div class="capability-new__dots" data-dots data-dots-color="#0ba69e" data-dots-opacity="0.015" data-dots-end-opacity="0.17" data-dots-spacing="20"></div>
      <div class="container capability-new__inner">
        <h2 class="section-title capability-new__heading" id="capabilities-title" data-text-reveal><span>Возможности</span> платформы</h2>
        <div class="capability-new__toolbar">
          <p>Какие долговые активы можно продать и купить на ЭТП</p>
          <div class="capability-new__tabs" role="tablist" aria-label="Для кого подобрать возможности">
            <button type="button" class="capability-new__tab" id="capability-new-seller" role="tab" aria-selected="true" aria-controls="capability-new-panel" data-capability-new-audience="seller">Продавцу</button>
            <button type="button" class="capability-new__tab" id="capability-new-buyer" role="tab" aria-selected="false" aria-controls="capability-new-panel" tabindex="-1" data-capability-new-audience="buyer">Покупателю</button>
          </div>
        </div>
        <div id="capability-new-panel" class="capability-new__panel" role="tabpanel" aria-labelledby="capability-new-seller">
          <div class="capability-new__grid" data-capability-new-active="factoring">${items.map(card).join('')}</div>
        </div>
        <p class="sr-only" aria-live="polite" aria-atomic="true" data-capability-new-announcement></p>
      </div>
    </section>`;
}

export function mountCapabilities(host: HTMLElement): Cleanup {
  const matched = host.matches('.capability-new') ? host : host.querySelector<HTMLElement>('.capability-new');
  if (!matched) return () => {};
  const section: HTMLElement = matched;
  mounts.get(section)?.();

  const abort = new AbortController();
  const { signal } = abort;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 1279px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const animations = new Map<HTMLElement, Animation>();
  const tabs = [...section.querySelectorAll<HTMLButtonElement>('[data-capability-new-audience]')];
  const cards = [...section.querySelectorAll<HTMLElement>('[data-capability-new-card]')];
  const grid = section.querySelector<HTMLElement>('.capability-new__grid');
  const panel = section.querySelector<HTMLElement>('#capability-new-panel');
  const extra = section.querySelector<HTMLAnchorElement>('[data-capability-new-extra]');
  const announcement = section.querySelector<HTMLElement>('[data-capability-new-announcement]');
  let audience: Audience = section.dataset.capabilityNewRole === 'buyer' ? 'buyer' : 'seller';
  let activeCard = grid?.dataset.capabilityNewActive ?? 'factoring';
  let pendingCard = '';
  let intentTimer = 0;
  let lastPointerX = -1;
  let lastPointerY = -1;
  let lastGridWidth = 0;
  let measureFrame = 0;
  let disposed = false;

  function cancelIntent(): void {
    window.clearTimeout(intentTimer);
    intentTimer = 0;
    pendingCard = '';
  }

  // Keep the expanded copy at its final width while the outside of the card
  // opens. Otherwise every interpolated grid width creates a new line break.
  // The taller of both audiences reserves enough room for the whole CTA.
  function measureExpandedContent(force = false): void {
    if (!grid || disposed) return;
    if (compactLayout.matches) {
      lastGridWidth = 0;
      section.style.removeProperty('--capability-detail-width');
      section.style.removeProperty('--capability-expanded-height');
      return;
    }
    const width = grid.clientWidth;
    if (!width || (!force && Math.abs(width - lastGridWidth) < 1)) return;
    lastGridWidth = width;
    const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
    const padding = Number.parseFloat(getComputedStyle(section).getPropertyValue('--capability-expanded-padding')) || 28;
    const expandedWidth = (width - gap * (cards.length - 1)) * 1.517241 / (cards.length - 1 + 1.517241);
    section.style.setProperty('--capability-detail-width', `${Math.max(0, expandedWidth - padding * 2 - 2)}px`);
    const descriptionHeight = Math.max(0, ...cards.map((card) =>
      card.querySelector<HTMLElement>('.capability-new__description-frame')?.offsetHeight ?? 0,
    ));
    // Media 252, heading 72, top inset 8, description gap 32,
    // CTA gap 18, CTA 52, bottom inset 28 and two 1px borders.
    section.style.setProperty('--capability-expanded-height', `${Math.max(536, 464 + descriptionHeight)}px`);
  }

  function scheduleMeasure(): void {
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      measureExpandedContent();
    });
  }

  function syncCardAccess(): void {
    cards.forEach((card) => {
      const expanded = compactLayout.matches || card.dataset.capabilityNewCard === activeCard;
      const trigger = card.querySelector<HTMLButtonElement>('[data-capability-new-expand]');
      const body = card.querySelector<HTMLElement>('.capability-new__body');
      if (body) {
        body.inert = !expanded;
        body.setAttribute('aria-hidden', String(!expanded));
      }
      if (trigger) {
        trigger.setAttribute('aria-expanded', String(expanded));
        trigger.tabIndex = compactLayout.matches ? -1 : 0;
        // Small screens show the complete card without requiring expansion.
        if (compactLayout.matches) trigger.setAttribute('aria-disabled', 'true');
        else trigger.removeAttribute('aria-disabled');
      }
    });
  }

  function activateCard(id: string): void {
    cancelIntent();
    if (compactLayout.matches || id === activeCard || !items.some((item) => item.id === id)) return;
    activeCard = id;
    if (grid) grid.dataset.capabilityNewActive = id;
    cards.forEach((card) => card.classList.toggle('is-active', card.dataset.capabilityNewCard === id));
    syncCardAccess();
  }

  // The decision follows actual pointer movement. Moving card boundaries cannot
  // repeatedly activate a neighbour under a stationary cursor.
  grid?.addEventListener('pointermove', (event) => {
    if (compactLayout.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    if (event.clientX === lastPointerX && event.clientY === lastPointerY) return;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    const card = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-capability-new-card]')
      : null;
    const id = card?.dataset.capabilityNewCard;
    // Keyboard focus owns the open card, including the path from its heading
    // to its CTA. A scroll or a moving neighbour must not close that path.
    // Pointer-origin focus still lets normal mouse hover select another card.
    const focused = document.activeElement;
    if (focused?.closest('[data-capability-new-card]') && focused.matches(':focus-visible')) return;
    if (!id || id === activeCard) { cancelIntent(); return; }
    if (id === pendingCard) return;
    cancelIntent();
    pendingCard = id;
    intentTimer = window.setTimeout(() => {
      // Recheck the actual hit target after the intent delay. Rapid pointer
      // movement or an unfinished card transition can invalidate the old hit.
      const hit = document.elementFromPoint(lastPointerX, lastPointerY)?.closest<HTMLElement>('[data-capability-new-card]');
      if (hit?.dataset.capabilityNewCard === id) activateCard(id);
      else cancelIntent();
    }, 120);
  }, { passive: true, signal });

  grid?.addEventListener('pointerleave', () => {
    cancelIntent();
    lastPointerX = -1;
    lastPointerY = -1;
  }, { signal });

  grid?.addEventListener('focusin', (event) => {
    const card = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-capability-new-card]')
      : null;
    if (card?.dataset.capabilityNewCard) activateCard(card.dataset.capabilityNewCard);
  }, { signal });

  grid?.addEventListener('pointerdown', cancelIntent, { passive: true, signal });
  window.addEventListener('scroll', cancelIntent, { passive: true, capture: true, signal });

  grid?.addEventListener('keydown', (event) => {
    if (compactLayout.matches || !(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLButtonElement>('[data-capability-new-expand]');
    if (!trigger) return;
    const index = cards.findIndex((card) => card.dataset.capabilityNewCard === trigger.dataset.capabilityNewExpand);
    if (index < 0) return;
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % cards.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + cards.length) % cards.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = cards.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    cards[nextIndex]?.querySelector<HTMLButtonElement>('[data-capability-new-expand]')?.focus({ preventScroll: true });
  }, { signal });

  grid?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('a')) return;
    const card = event.target.closest<HTMLElement>('[data-capability-new-card]');
    if (card?.dataset.capabilityNewCard) activateCard(card.dataset.capabilityNewCard);
  }, { signal });

  compactLayout.addEventListener('change', () => {
    cancelIntent();
    syncCardAccess();
    measureExpandedContent(true);
  }, { signal });
  syncCardAccess();
  measureExpandedContent(true);
  const resizeObserver = new ResizeObserver(scheduleMeasure);
  if (grid) resizeObserver.observe(grid);
  document.fonts.ready.then(() => measureExpandedContent(true));

  function replaceText(element: HTMLElement | null, text: string): void {
    if (!element) return;
    animations.get(element)?.cancel();
    animations.delete(element);
    element.textContent = text;
    if (reducedMotion.matches || typeof element.animate !== 'function') return;
    const animation = element.animate([{ opacity: 0.45 }, { opacity: 1 }], {
      duration: 240,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
    });
    animations.set(element, animation);
    animation.onfinish = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
  }

  function selectAudience(next: Audience): void {
    if (next === audience) return;
    audience = next;
    section.dataset.capabilityNewRole = next;
    tabs.forEach((tab) => {
      const selected = tab.dataset.capabilityNewAudience === next;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel?.setAttribute('aria-labelledby', `capability-new-${next}`);

    items.forEach((item) => {
      const link = section.querySelector<HTMLAnchorElement>(`[data-capability-new-link="${item.id}"]`);
      if (link) {
        link.setAttribute('aria-label', `${actionLabels[next]}: ${item.title.join(' ')}`);
        replaceText(link.querySelector<HTMLElement>('span'), actionLabels[next]);
      }
      replaceText(section.querySelector<HTMLElement>(`[data-capability-new-description="${item.id}"]`), item.description[next]);
    });

    if (extra) {
      extra.setAttribute('aria-label', `${actionLabels[next]}: ${additional[next].title}`);
    }
    replaceText(section.querySelector<HTMLElement>('[data-capability-new-extra-title]'), additional[next].title);
    replaceText(section.querySelector<HTMLElement>('[data-capability-new-extra-description]'), additional[next].description);
    if (announcement) announcement.textContent = next === 'buyer' ? 'Возможности для покупателя' : 'Возможности для продавца';
  }

  section.addEventListener('click', (event) => {
    const tab = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-capability-new-audience]')
      : null;
    const next = tab?.dataset.capabilityNewAudience;
    if (next === 'seller' || next === 'buyer') selectAudience(next);
  }, { signal });

  section.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (current + 1) % tabs.length; break;
      case 'ArrowLeft': nextIndex = (current - 1 + tabs.length) % tabs.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = tabs.length - 1; break;
      default: return;
    }
    const nextTab = tabs[nextIndex];
    const next = nextTab?.dataset.capabilityNewAudience;
    if (!nextTab || (next !== 'seller' && next !== 'buyer')) return;
    event.preventDefault();
    event.stopPropagation();
    selectAudience(next);
    nextTab.focus({ preventScroll: true });
  }, { signal, capture: true });

  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }, { signal });

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelIntent();
    cancelAnimationFrame(measureFrame);
    resizeObserver.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    mounts.delete(section);
  };
  mounts.set(section, cleanup);
  return cleanup;
}
