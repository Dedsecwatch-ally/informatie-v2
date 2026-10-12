/* Lazy 3D: three.js is only downloaded when a scene approaches the viewport,
   and only on devices that can render it comfortably. Everywhere else the static
   SVG fallback inside each figure stays in place — the content never depends on 3D. */

type Mount = (el: HTMLElement) => () => void;

const loaders: Record<string, () => Promise<{ mount: Mount }>> = {
  frame: () => import('./frame'),
  field: () => import('./field'),
  explorer: () => import('./explorer'),
};

interface NavigatorHints { connection?: { saveData?: boolean }; deviceMemory?: number }

function canRender3D() {
  const nav = navigator as Navigator & NavigatorHints;
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

export function initScenes(): () => void {
  const disposers: Array<() => void> = [];
  const els = document.querySelectorAll<HTMLElement>('[data-scene]');
  if (!els.length || !canRender3D()) return () => {};
  let started = false;
  let io: IntersectionObserver | null = null;

  const onEnter: IntersectionObserverCallback = (entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      observer.unobserve(el);
      const load = loaders[el.dataset.scene ?? ''];
      if (!load) continue;
      load()
        .then(({ mount }) => {
          disposers.push(mount(el));
          el.classList.add('is-3d');
        })
        .catch((err) => {
          // Keep the SVG fallback; the page is complete without the scene.
          console.warn(`[informatie] 3D scene "${el.dataset.scene}" unavailable`, err);
        });
    }
  };
  const start = () => {
    if (started) return;
    started = true;
    io = new IntersectionObserver(onEnter, { rootMargin: '600px 0px' });
    els.forEach((el) => io!.observe(el));
  };

  // Loading three.js and compiling shaders is the heaviest work on the page: never let it land
  // on the arrival animation. Begin after the arrival, in idle time; immediately otherwise.
  const idle = (cb: () => void) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(cb, { timeout: 1200 }); else setTimeout(cb, 300);
  };
  if (document.documentElement.classList.contains('intro')) {
    window.addEventListener('informatie:intro-done', () => idle(start), { once: true });
    setTimeout(() => idle(start), 6000);   // failsafe if the arrival never reports done
  } else {
    start();
  }

  return () => {
    io?.disconnect();
    disposers.forEach((d) => d());
  };
}
