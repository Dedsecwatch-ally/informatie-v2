import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { brandEase } from './ease';
import { frameProgress, storyProgress } from '../state';


/** Reading progress — informational, so it runs in every motion mode. */
export function initProgress() {
  gsap.to('.progress__bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: true },
  });
}

/** Scroll-linked reveals: the reader sets the pace (Brand Book §10, "Scroll reveal"). */
export function initReveals(): () => void {
  const splits: SplitText[] = [];

  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    splits.push(SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105,
        stagger: 0.12,
        ease: brandEase,
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 62%', scrub: 0.5 },
      }),
    }));
  });

  document.querySelectorAll<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
    gsap.from(el.children, {
      opacity: 0,
      y: 32,
      duration: 0.8,
      stagger: 0.08,
      ease: brandEase,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  document.querySelectorAll<HTMLElement>('[data-reveal="wipe"]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, {
      clipPath: 'inset(0 0 0% 0)',
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: 0.5 },
    });
  });

  // Line drawings draw themselves in as they enter; dashed "uncertain" strokes simply fade.
  document.querySelectorAll<SVGSVGElement>('svg[data-draw]').forEach((svg) => {
    const strokes = svg.querySelectorAll('path:not(.keep), circle, polygon, rect');
    const dashed = svg.querySelectorAll('.keep');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: svg, start: 'top 90%', end: 'top 50%', scrub: 0.5 },
    });
    tl.from(strokes, { drawSVG: 0, stagger: 0.05, ease: 'none' });
    if (dashed.length) tl.from(dashed, { opacity: 0, ease: 'none' }, '>-0.2');
  });

  return () => splits.forEach((s) => s.revert());
}

/** Restrained parallax: the hero drawing drifts slightly slower than the page (≤ 24 px). */
export function initParallax() {
  gsap.to('.hero-tree', {
    y: 24,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/** Object B assembles as its section passes; the scene damps toward this value. */
export function initFrameAssembly() {
  const stage = document.querySelector('.stage3d--frame');
  if (!stage) return;
  ScrollTrigger.create({
    trigger: stage,
    start: 'top 85%',
    end: 'center 65%',
    onUpdate: (self) => frameProgress.set(self.progress),
    onLeave: () => frameProgress.set(1),
  });
}

/** Object A's section is the one place we pin: the explanation needs the reader's scroll. */
export function initStory(): () => void {
  const story = document.querySelector<HTMLElement>('.story');
  const pin = story?.querySelector<HTMLElement>('.story__pin');
  if (!story || !pin) return () => {};
  const steps = story.querySelectorAll<HTMLElement>('.story__step');
  const caps = story.querySelectorAll<HTMLElement>('.story__cap');
  const hint = story.querySelector<HTMLElement>('.story__hint');
  const bar = story.querySelector<HTMLElement>('.story__progress span');

  let current = 0;
  const setStep = (n: number) => {
    if (n === current) return;
    current = n;
    steps.forEach((s) => (Number(s.dataset.step) === n ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current')));
    caps.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.step) === n));
  };

  story.classList.add('is-pinned');
  setStep(1);
  const st = ScrollTrigger.create({
    trigger: story,
    pin,
    start: 'top top',   // the header retracts while reading down, so pin flush to the top
    end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 720 ? 1.6 : 2.2))}`,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;
      storyProgress.set(p);
      setStep(p < 0.34 ? 1 : p < 0.67 ? 2 : 3);
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (hint) hint.style.opacity = p > 0.9 ? '0' : '1';
    },
  });

  return () => {
    st.kill();
    story.classList.remove('is-pinned');
  };
}

/** Reduced motion: completed states, nothing pinned, nothing to watch. */
export function initStoryStatic() {
  storyProgress.set(1);
  frameProgress.set(1);
  const story = document.querySelector<HTMLElement>('.story');
  story?.querySelectorAll<HTMLElement>('.story__step').forEach((s) => s.removeAttribute('aria-current'));
}
