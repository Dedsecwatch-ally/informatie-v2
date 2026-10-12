import { gsap } from 'gsap';

/* Cursor as the brand mark: the signal square is the person (tracks the pointer exactly);
   an open frame — two corners, never four — follows it closely and, on hover, frames whatever
   can be chosen. Desktop fine pointers with motion allowed only; native cursor stays where it's
   more useful (text fields, selects, the draggable 3D explorer).

   The frame uses a per-frame critically-damped follow (not restarted tweens), so it never
   builds up lag on fast movement and settles in ~0.1 s regardless of frame rate. */

const TARGETS = 'a, button, label[for], summary, [role="button"]';
const NATIVE = 'input, textarea, select, .stage3d--explorer';
const REST = 22;     // idle frame size (px)
const PAD = 6;       // space between a framed element and the brackets
const FOLLOW = 30;   // 1/s — idle tracking: ~33 ms time constant, a few px of trail
const MORPH = 20;    // 1/s — snapping to / releasing an element: a touch softer

export function initCursor(): () => void {
  const html = document.documentElement;
  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<div class="cursor__frame"></div><div class="cursor__dot"></div>';
  document.body.appendChild(root);
  const frameEl = root.firstElementChild as HTMLElement;
  const dot = root.lastElementChild as HTMLElement;

  // Current (rendered) and target frame box.
  const cur = { x: -100, y: -100, w: REST, h: REST };
  const tgt = { x: -100, y: -100, w: REST, h: REST };
  let px = -100, py = -100;
  let hovered: Element | null = null;
  let pressed = false;
  let shown = false;
  let running = false;
  let placed = false;

  function computeTarget() {
    const tighten = pressed ? 3 : 0;
    if (hovered) {
      const r = hovered.getBoundingClientRect();
      const left = Math.max(2, r.left - PAD + tighten);
      const top = Math.max(2, r.top - PAD + tighten);
      const right = Math.min(window.innerWidth - 2, r.right + PAD - tighten);
      const bottom = Math.min(window.innerHeight - 2, r.bottom + PAD - tighten);
      tgt.x = left; tgt.y = top; tgt.w = right - left; tgt.h = bottom - top;
    } else {
      const s = REST - tighten * 2;
      tgt.x = px - s / 2; tgt.y = py - s / 2; tgt.w = s; tgt.h = s;
    }
  }

  function render() {
    frameEl.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`;
    frameEl.style.width = `${cur.w.toFixed(2)}px`;
    frameEl.style.height = `${cur.h.toFixed(2)}px`;
  }

  let morphing = false;   // true while the frame is changing between idle and framing an element
  function tick(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    // Hovered elements can move under the pointer (smooth scroll, layout) — keep tracking them.
    if (hovered) computeTarget();
    const a = 1 - Math.exp(-(morphing ? MORPH : FOLLOW) * dt);
    cur.x += (tgt.x - cur.x) * a;
    cur.y += (tgt.y - cur.y) * a;
    cur.w += (tgt.w - cur.w) * a;
    cur.h += (tgt.h - cur.h) * a;
    render();
    const settled = Math.abs(tgt.x - cur.x) < 0.1 && Math.abs(tgt.y - cur.y) < 0.1 &&
      Math.abs(tgt.w - cur.w) < 0.1 && Math.abs(tgt.h - cur.h) < 0.1;
    if (settled) {
      Object.assign(cur, tgt);
      render();
      morphing = false;
      if (!hovered) stop();   // a hovered element may still move (scroll), so keep watching it
    }
  }
  const start = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };

  const show = (v: boolean) => {
    if (v === shown) return;
    shown = v;
    root.classList.toggle('is-visible', v);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    const t = e.target as Element;
    const native = t.closest?.(NATIVE);
    show(!native);
    const next = native ? null : t.closest?.(TARGETS) ?? null;
    if (next !== hovered) {
      hovered = next;
      morphing = true;
      root.classList.toggle('is-hovering', !!hovered);
    }
    if (!shown) return;
    computeTarget();
    // First appearance, or a teleport (trackpad jump, pointer re-entering): snap, don't glide.
    const jumped = !hovered && Math.hypot(tgt.x - cur.x, tgt.y - cur.y) > 160;
    if (!placed || jumped) {
      Object.assign(cur, tgt);
      render();
      placed = true;
    }
    start();
  };
  const onDown = () => { pressed = true; root.classList.add('is-pressed'); computeTarget(); start(); };
  const onUp = () => { pressed = false; root.classList.remove('is-pressed'); computeTarget(); start(); };
  const onLeave = () => { show(false); placed = false; hovered = null; root.classList.remove('is-hovering'); stop(); };

  html.classList.add('has-cursor');
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  return () => {
    stop();
    html.classList.remove('has-cursor');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    root.remove();
  };
}
