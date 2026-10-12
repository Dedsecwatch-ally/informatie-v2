import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* Lazy (inertial) scrolling. Native scroll stays underneath — sticky header, pinned story,
   anchors and the scrollbar keep working — Lenis only eases the position toward the target.
   Desktop fine pointers with motion allowed only; touch keeps native momentum. */

let lenis: Lenis | null = null;
const headerOffset = () => -((document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 64) + 8);

/** Scroll to an element, smoothly when lazy scroll is active. */
export function scrollToTarget(el: Element) {
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: headerOffset() });
  else el.scrollIntoView({ block: 'start' });
}

/** Back to the top of the page — eased when lazy scroll is active. */
export function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (lenis) lenis.scrollTo(0, { duration: 1.2 });
  else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}

export function initSmoothScroll(): () => void {
  lenis = new Lenis({
    lerp: 0.085,            // lower = lazier; ~0.08–0.1 trails without feeling slow
    wheelMultiplier: 0.9,
    anchors: { offset: headerOffset() },
  });
  lenis.on('scroll', ScrollTrigger.update);
  // Hold the page still while the arrival plays.
  const onIntroDone = () => lenis?.start();
  if (document.documentElement.classList.contains('intro')) {
    lenis.stop();
    window.addEventListener('informatie:intro-done', onIntroDone, { once: true });
  }
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    window.removeEventListener('informatie:intro-done', onIntroDone);
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    lenis?.destroy();
    lenis = null;
  };
}
