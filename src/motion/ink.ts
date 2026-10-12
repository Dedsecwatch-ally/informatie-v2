/* Footer wordmark: drawn as construction lines; a pixel lens follows the pointer. Inside its
   circumference the lettering is solid ink, with a ring of stone-grey just outside (the halo).
   Pixels flip in and out with a small random stagger, so the lens edge dissolves in blocks as
   it moves; on leaving, the remaining pixels dissolve away. The i-dot squares stay solid signal.
   Desktop fine pointers with motion allowed only; elsewhere the wordmark stays solid. */

const BLOCK = 8;            // pixel size (CSS px)
const R_FRAC = 0.052;       // ink radius as a share of the wordmark's width (~72 px at 1400 px)
const HALO = 1.32;          // halo ring outer radius, × ink radius
const EDGE = 0.22;          // raggedness of the circumference (per-pixel radius variation)
const IN_DELAY = 70;        // max stagger (ms) for a pixel to ink in
const OUT_DELAY = 130;      // max stagger (ms) for a pixel to clear
const INK = '#141414';
const STONE = '#D4D1C9';

export function initInk(): () => void {
  const host = document.querySelector<HTMLElement>('[data-ink]');
  const svg = host?.querySelector<SVGSVGElement>('svg.wordmark');
  const glyphs = svg?.querySelector<SVGPathElement>('#wm-glyphs');
  const groupT = svg?.querySelector<SVGGElement>('.wm-fill > g');
  if (!host || !svg || !glyphs || !groupT) return () => {};

  host.classList.add('is-ink');
  const canvas = document.createElement('canvas');
  canvas.className = 'wm-pixels';
  canvas.setAttribute('aria-hidden', 'true');
  svg.insertAdjacentElement('afterend', canvas);
  const ctx = canvas.getContext('2d')!;
  const glyphPath = new Path2D(glyphs.getAttribute('d') ?? '');
  const gm = groupT.transform.baseVal.consolidate()?.matrix;   // translate(4 64) scale(…)

  let W = 0, H = 0, DPR = 1, cols = 0, rows = 0, R = 60;
  let level = new Uint8Array(0);      // 0 none · 1 halo · 2 ink (what is painted)
  let want = new Uint8Array(0);       // target level for the current pointer position
  let due = new Float64Array(0);      // when a pending change applies (0 = none)
  let noise = new Float32Array(0);    // per-pixel radius variation → ragged circumference
  let px = -1e4, py = -1e4, inside = false, raf = 0, dirty = true;

  function layout() {
    const sr = svg!.getBoundingClientRect(), hr = host!.getBoundingClientRect();
    Object.assign(canvas.style, { left: `${sr.left - hr.left}px`, top: `${sr.top - hr.top}px`, width: `${sr.width}px`, height: `${sr.height}px` });
    const w = Math.round(sr.width), h = Math.round(sr.height);
    if (w === W && h === H && cols) return;
    W = w; H = h; R = Math.max(36, W * R_FRAC);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    cols = Math.ceil(W / BLOCK); rows = Math.ceil(H / BLOCK);
    const n = cols * rows;
    level = new Uint8Array(n); want = new Uint8Array(n); due = new Float64Array(n);
    noise = new Float32Array(n).map(() => 1 + (Math.random() - 0.5) * 2 * EDGE);
    dirty = true;
  }

  /** Paint the glyphs twice: stone clipped to halo pixels, ink clipped to ink pixels. */
  function paint() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gm) return;
    const halo = new Path2D(), ink = new Path2D();
    let any = false;
    for (let i = 0; i < level.length; i++) {
      if (!level[i]) continue;
      any = true;
      (level[i] === 2 ? ink : halo).rect((i % cols) * BLOCK, Math.floor(i / cols) * BLOCK, BLOCK, BLOCK);
    }
    if (!any) return;
    const s = W / 367;   // viewBox 0 0 367 70 → element px
    for (const [clip, colour] of [[halo, STONE], [ink, INK]] as const) {
      ctx.save();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clip(clip);
      ctx.setTransform(DPR * s, 0, 0, DPR * s, 0, 0);
      ctx.transform(gm.a, gm.b, gm.c, gm.d, gm.e, gm.f);
      ctx.fillStyle = colour;
      ctx.fill(glyphPath);
      ctx.restore();
    }
  }

  function frame(now: number) {
    raf = 0;
    // Target levels: only pixels near the lens (or already painted) need looking at.
    const reach = R * HALO * (1 + EDGE) + BLOCK;
    const c0 = Math.max(0, Math.floor((px - reach) / BLOCK)), c1 = Math.min(cols - 1, Math.ceil((px + reach) / BLOCK));
    const r0 = Math.max(0, Math.floor((py - reach) / BLOCK)), r1 = Math.min(rows - 1, Math.ceil((py + reach) / BLOCK));
    want.fill(0);
    if (inside) {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        const d = Math.hypot(c * BLOCK + BLOCK / 2 - px, r * BLOCK + BLOCK / 2 - py) / (R * noise[i]);
        want[i] = d <= 1 ? 2 : d <= HALO ? 1 : 0;
      }
    }
    let busy = false;
    for (let i = 0; i < level.length; i++) {
      if (level[i] === want[i]) { due[i] = 0; continue; }
      if (!due[i]) due[i] = now + Math.random() * (want[i] > level[i] ? IN_DELAY : OUT_DELAY);
      if (now >= due[i]) { level[i] = want[i]; due[i] = 0; dirty = true; }
      else busy = true;
    }
    if (dirty) { paint(); dirty = false; }
    if (busy || inside) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    px = e.clientX - r.left; py = e.clientY - r.top;
    inside = true;
    kick();
  };
  const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse') { layout(); onMove(e); } };
  const onLeave = () => { inside = false; kick(); };
  const ro = new ResizeObserver(() => { layout(); paint(); });
  ro.observe(svg);
  host.addEventListener('pointerenter', onEnter);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);
  layout();

  return () => {
    ro.disconnect();
    host.removeEventListener('pointerenter', onEnter);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
    if (raf) cancelAnimationFrame(raf);
    canvas.remove();
    host.classList.remove('is-ink');
  };
}
