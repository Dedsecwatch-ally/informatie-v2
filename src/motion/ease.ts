/** Brand easing — cubic-bezier(.2, 0, 0, 1): quick start, soft landing.
 *  Solved numerically so GSAP and the 3D scenes share the exact CSS curve. */
export const EASE_CSS = 'cubic-bezier(.2, 0, 0, 1)';

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-6) break;
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Fallback bisection keeps the solve stable near the flat end of the curve.
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 24; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

export const brandEase = cubicBezier(0.2, 0, 0, 1);

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Local progress of `p` inside [start, end], eased. */
export const segment = (p: number, start: number, end: number, ease = brandEase) =>
  ease(clamp01((p - start) / (end - start)));
