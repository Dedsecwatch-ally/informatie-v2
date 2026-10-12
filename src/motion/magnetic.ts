import { gsap } from 'gsap';
import { brandEase } from './ease';

/** Primary CTAs lean ≤ 4 px toward the pointer — a quiet "this is interactive" cue.
 *  Desktop fine pointers only; never on dense UI. */
export function initMagnetic(): () => void {
  const offs: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const toX = gsap.quickTo(el, 'x', { duration: 0.4, ease: brandEase });
    const toY = gsap.quickTo(el, 'y', { duration: 0.4, ease: brandEase });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      toX(gsap.utils.clamp(-1, 1, dx) * 4);
      toY(gsap.utils.clamp(-1, 1, dy) * 3);
    };
    const leave = () => { toX(0); toY(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { clearProps: 'transform' });
    });
  });
  return () => offs.forEach((f) => f());
}
