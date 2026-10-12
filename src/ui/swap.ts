import { reducedMotion } from '../motion/env';

/** Cross-fade a group of text fields (200 ms out, then in) — progressive detail, summary stays put. */
export function swapText(fields: Iterable<HTMLElement>, apply: () => void) {
  const els = Array.from(fields);
  if (reducedMotion()) { apply(); return; }
  els.forEach((el) => el.classList.add('is-fading'));
  window.setTimeout(() => {
    apply();
    els.forEach((el) => el.classList.remove('is-fading'));
  }, 200);
}
