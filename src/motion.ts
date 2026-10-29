type ContentTransition = {
  run(update: () => void): void;
  destroy(): void;
};

/** Update immediately, then ease the wrapper to the content's new natural height. */
export function createContentTransition(
  stage: HTMLElement,
  content: HTMLElement,
): ContentTransition {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof stage.animate === 'function' && typeof content.animate === 'function';
  const originalStyles = ['height', 'clip-path'].map((property) => ({
    property,
    value: stage.style.getPropertyValue(property),
    priority: stage.style.getPropertyPriority(property),
  }));

  let heightAnimation: Animation | null = null;
  let contentAnimation: Animation | null = null;
  let destroyed = false;

  function restoreStage(): void {
    for (const { property, value, priority } of originalStyles) {
      if (value) stage.style.setProperty(property, value, priority);
      else stage.style.removeProperty(property);
    }
  }

  function cancelAnimations(): void {
    const previousHeight = heightAnimation;
    const previousContent = contentAnimation;
    heightAnimation = null;
    contentAnimation = null;
    previousHeight?.cancel();
    previousContent?.cancel();
  }

  function settle(): void {
    cancelAnimations();
    restoreStage();
  }

  function run(update: () => void): void {
    if (destroyed || !canAnimate || motionPreference.matches) {
      settle();
      update();
      return;
    }

    // Sample the displayed frame before canceling an interrupted transition.
    const currentHeight = stage.getBoundingClientRect().height;
    const currentOpacity = contentAnimation
      ? Number.parseFloat(getComputedStyle(content).opacity)
      : null;

    cancelAnimations();
    restoreStage();
    update();

    // All measurements happen in the same task: no blank frame or delayed update.
    const contentHeight = content.getBoundingClientRect().height;
    const nextHeight = Math.max(contentHeight, stage.getBoundingClientRect().height);
    const stageStyle = getComputedStyle(stage);
    const boxAdjustment = stageStyle.boxSizing === 'border-box'
      ? 0
      : ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width']
        .reduce((total, property) => total + (Number.parseFloat(stageStyle.getPropertyValue(property)) || 0), 0);
    const start = Math.max(0, currentHeight - boxAdjustment);
    const end = Math.max(0, nextHeight - boxAdjustment);
    const computedOpacity = Number.parseFloat(getComputedStyle(content).opacity);
    const opacity = Number.isFinite(computedOpacity) ? computedOpacity : 1;

    try {
      if (Math.abs(start - end) > 0.5) {
        stage.style.height = `${start}px`;
        // Preserve full-bleed horizontal carousels while clipping the changing height.
        stage.style.clipPath = 'inset(-12px -100vmax)';
        const animation = stage.animate(
          [{ height: `${start}px` }, { height: `${end}px` }],
          { duration: 420, easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'both' },
        );
        heightAnimation = animation;
        animation.addEventListener('finish', () => {
          if (heightAnimation !== animation) return;
          heightAnimation = null;
          restoreStage();
          animation.cancel();
        }, { once: true });
      }

      const animation = content.animate(
        [{ opacity: currentOpacity ?? opacity * 0.82 }, { opacity }],
        { duration: 240, easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'both' },
      );
      contentAnimation = animation;
      animation.addEventListener('finish', () => {
        if (contentAnimation !== animation) return;
        contentAnimation = null;
        animation.cancel();
      }, { once: true });
    } catch {
      // Content stays updated if the browser cannot start an animation.
      settle();
    }
  }

  // A viewport change invalidates the measured height; let natural layout take over.
  window.addEventListener('resize', settle, { passive: true });
  motionPreference.addEventListener('change', settle);

  return {
    run,
    destroy(): void {
      destroyed = true;
      settle();
      window.removeEventListener('resize', settle);
      motionPreference.removeEventListener('change', settle);
    },
  };
}
