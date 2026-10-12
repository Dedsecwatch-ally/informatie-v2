/* A gentle ease-out: the spread stays visible throughout instead of front-loading. */
const spreadEase = (t: number) => 1 - (1 - t) * (1 - t);
import { reducedMotion } from './env';

/* Jump links: black ink fills the link in pixel blocks, spreading from where the pointer
   enters (with a ragged, ink-like front) and draining toward where it leaves. Reversals
   mid-transition continue from the current pixels instead of restarting.
   Desktop fine pointers; keyboard focus gets the same fill from the centre. */

const SELECTOR = '.nav__link, .nav__cta, .footer__nav a[href^="#"]';
const BLOCK = 6;          // pixel size (CSS px)
const IN_MS = 520;        // slow enough to watch the ink spread pixel by pixel
const OUT_MS = 440;
const JITTER = 0.35;      // how ragged the ink front is (0 = clean radial wipe)
const INK = '#141414';
// The header's primary action fills in signal red-orange (Signal Deep: light text stays ≥ 4.5:1).
const SIGNAL = '#D4361A';
const colourFor = (el: HTMLElement) => (el.classList.contains('nav__cta') ? SIGNAL : INK);

interface Ink {
  el: HTMLElement;
  colour: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number; h: number; cols: number; rows: number;
  filled: Uint8Array;
  count: number;
  queue: number[];
  mode: 'fill' | 'clear';
  done: number;
  start: number;
  duration: number;
  raf: number;
}

export function initPixelInk(): () => void {
  const reduced = reducedMotion();
  const inks: Ink[] = [];
  const offs: Array<() => void> = [];
  document.documentElement.classList.add('ink-links');

  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'pixel-ink';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const ink: Ink = {
      el, colour: colourFor(el), canvas, ctx: canvas.getContext('2d')!,
      w: 0, h: 0, cols: 0, rows: 0,
      filled: new Uint8Array(0), count: 0,
      queue: [], mode: 'fill', done: 0, start: 0, duration: IN_MS, raf: 0,
    };
    inks.push(ink);

    const local = (e: PointerEvent | null) => {
      const r = canvas.getBoundingClientRect();
      return e ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: r.width / 2, y: r.height / 2 };
    };
    const enter = (e: PointerEvent | null) => { measure(ink); run(ink, 'fill', local(e)); };
    const leave = (e: PointerEvent | null) => { if (ink.cols) run(ink, 'clear', local(e)); };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse') enter(e); };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === 'mouse' && document.activeElement !== el) leave(e); };
    const onFocus = () => { if (el.matches(':focus-visible')) enter(null); };
    const onBlur = () => { if (!el.matches(':hover')) leave(null); };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    offs.push(() => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
      cancelAnimationFrame(ink.raf);
      el.classList.remove('is-inked');
      canvas.remove();
    });
  });

  function measure(ink: Ink) {
    const r = ink.canvas.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w === ink.w && h === ink.h && ink.cols) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ink.w = w; ink.h = h;
    ink.canvas.width = Math.round(w * dpr);
    ink.canvas.height = Math.round(h * dpr);
    ink.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ink.ctx.fillStyle = ink.colour;
    ink.cols = Math.ceil(w / BLOCK);
    ink.rows = Math.ceil(h / BLOCK);
    ink.filled = new Uint8Array(ink.cols * ink.rows);
    ink.count = 0;
    ink.ctx.clearRect(0, 0, w, h);
  }

  function run(ink: Ink, mode: 'fill' | 'clear', from: { x: number; y: number }) {
    cancelAnimationFrame(ink.raf);
    const diag = Math.hypot(ink.w, ink.h) || 1;
    const keyed: Array<[number, number]> = [];
    for (let i = 0; i < ink.filled.length; i++) {
      if ((mode === 'fill') === !!ink.filled[i]) continue;   // only blocks that need to change
      const cx = (i % ink.cols) * BLOCK + BLOCK / 2;
      const cy = Math.floor(i / ink.cols) * BLOCK + BLOCK / 2;
      const d = Math.hypot(cx - from.x, cy - from.y) / diag + Math.random() * JITTER;
      keyed.push([i, mode === 'fill' ? d : -d]);   // fill spreads out; clear drains toward the exit
    }
    keyed.sort((a, b) => a[1] - b[1]);
    ink.queue = keyed.map((k) => k[0]);
    ink.mode = mode;
    ink.done = 0;
    const total = ink.filled.length || 1;
    ink.duration = (mode === 'fill' ? IN_MS : OUT_MS) * (ink.queue.length / total);
    ink.start = performance.now();
    if (reduced || ink.duration < 16) { step(ink, 1); return; }
    const tick = (now: number) => {
      const t = Math.min(1, (now - ink.start) / ink.duration);
      step(ink, spreadEase(t));
      if (t < 1) ink.raf = requestAnimationFrame(tick);
    };
    ink.raf = requestAnimationFrame(tick);
  }

  function step(ink: Ink, progress: number) {
    const target = Math.ceil(ink.queue.length * progress);
    const { ctx } = ink;
    for (; ink.done < target; ink.done++) {
      const i = ink.queue[ink.done];
      const x = (i % ink.cols) * BLOCK, y = Math.floor(i / ink.cols) * BLOCK;
      if (ink.mode === 'fill') { ctx.fillRect(x, y, BLOCK, BLOCK); ink.filled[i] = 1; ink.count++; }
      else { ctx.clearRect(x, y, BLOCK, BLOCK); ink.filled[i] = 0; ink.count--; }
    }
    // Text flips to paper once the ink covers most of it.
    ink.el.classList.toggle('is-inked', ink.count / (ink.filled.length || 1) >= 0.5);
  }

  return () => {
    offs.forEach((f) => f());
    document.documentElement.classList.remove('ink-links');
  };
}
