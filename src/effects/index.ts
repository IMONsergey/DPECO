import { createDotCascade, type DotDirection } from './dot-field-engine';
import { createSignalGlobe } from './globe-engine';
import './effects.css';

type Cleanup = () => void;
const dots = new WeakMap<HTMLElement, Cleanup>();
const globes = new WeakMap<HTMLElement, Cleanup>();

function numeric(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && value.trim() !== '' && Number.isFinite(parsed) ? parsed : fallback;
}

/** Mount the pointer-responsive APCOSYS dot field in a decorative layer. */
export function initDotField(host: HTMLElement): Cleanup {
  dots.get(host)?.();
  host.classList.add('dot-field');
  host.setAttribute('aria-hidden', 'true');

  const color = host.dataset.dotsColor ?? '#10aaa2';
  const opacity = numeric(host.dataset.dotsOpacity, 0.2);
  const endOpacity = numeric(host.dataset.dotsEndOpacity, 0.015);
  const spacing = numeric(host.dataset.dotsSpacing, 22.5);
  const radius = numeric(host.dataset.dotsRadius, 0.9);
  const direction = host.dataset.dotsDirection ?? 'top-to-bottom';
  const directions: DotDirection[] = ['top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left'];
  const selectedDirection = directions.includes(direction as DotDirection)
    ? (direction as DotDirection)
    : 'top-to-bottom';
  const cssDirection = {
    'top-to-bottom': 'to bottom',
    'bottom-to-top': 'to top',
    'left-to-right': 'to right',
    'right-to-left': 'to left',
  }[selectedDirection];

  host.style.setProperty('--dot-color', color);
  host.style.setProperty('--dot-start-opacity', String(opacity));
  host.style.setProperty('--dot-end-opacity', String(endOpacity));
  host.style.setProperty('--dot-spacing', `${spacing}px`);
  host.style.setProperty('--dot-radius', `${radius}px`);
  host.style.setProperty('--dot-direction', cssDirection);

  const fallback = document.createElement('div');
  fallback.className = 'dot-field__fallback';
  const canvas = document.createElement('canvas');
  canvas.className = 'dot-field__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(fallback, canvas);

  const surface = host.closest<HTMLElement>('section, article, header, main') ?? host.parentElement ?? host;
  const controller = createDotCascade(canvas, {
    color,
    spacing,
    dotRadius: radius,
    startOpacity: opacity,
    endOpacity,
    direction: selectedDirection,
    hoverRadius: 165,
    displacement: 4,
    fps: 30,
    interactive: true,
  }, surface);

  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    controller.destroy();
    fallback.remove();
    canvas.remove();
    dots.delete(host);
  };
  dots.set(host, cleanup);
  return cleanup;
}

/** Native WebGL globe with the original geographic point map and Canvas2D fallback. */
export function initGlobe(host: HTMLElement): Cleanup {
  globes.get(host)?.();
  host.classList.add('globe-effect');
  host.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.className = 'globe-effect__canvas';
  canvas.width = 2048;
  canvas.height = 1739;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);

  let controller: ReturnType<typeof createSignalGlobe>;
  try {
    controller = createSignalGlobe(canvas, {
      speed: 0.65,
      fps: 30,
      interactive: true,
      pixelRatio: 1.5,
      landColor: '#c0fff4',
      shellColor: '#73e7d9',
      signalColor: '#ecfff9',
    });
    host.dataset.globeReady = 'true';
  } catch {
    // The atmospheric CSS layer stays visible if graphics contexts are unavailable.
    host.querySelectorAll('canvas').forEach((node) => node.remove());
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      globes.delete(host);
    };
    globes.set(host, cleanup);
    return cleanup;
  }

  const surface = host.closest<HTMLElement>('section') ?? host.parentElement ?? host;
  const forward = (event: PointerEvent) => {
    const activeCanvas = [...host.querySelectorAll('canvas')].find((node) => node.style.display !== 'none');
    activeCanvas?.dispatchEvent(new PointerEvent(event.type, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
    }));
  };
  surface.addEventListener('pointermove', forward, { passive: true });
  surface.addEventListener('pointerleave', forward, { passive: true });
  surface.addEventListener('pointercancel', forward, { passive: true });

  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    surface.removeEventListener('pointermove', forward);
    surface.removeEventListener('pointerleave', forward);
    surface.removeEventListener('pointercancel', forward);
    controller.destroy();
    canvas.remove();
    delete host.dataset.globeReady;
    globes.delete(host);
  };
  globes.set(host, cleanup);
  return cleanup;
}
