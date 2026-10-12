import './styles/tokens.css';
import './styles/site.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { initUI } from './ui';
import { initHero } from './motion/hero';
import { initMagnetic } from './motion/magnetic';
import { initCursor } from './motion/cursor';
import { initInk } from './motion/ink';
import { initSmoothScroll } from './motion/smooth';
import { initPixelInk } from './motion/pixelink';
import {
  initFrameAssembly, initParallax, initProgress, initReveals, initStory, initStoryStatic,
} from './motion/scroll';
import { initScenes } from './three/mount';
import { initHeroTree } from './art/heroTree';
import { initPetals } from './art/petals';
import { initMarks } from './motion/marks';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

initUI();
initProgress();
const disposeTree = initHeroTree();

// Motion is opt-out by preference; gsap.matchMedia reverts everything if the preference changes.
const mm = gsap.matchMedia();
mm.add({ motion: '(prefers-reduced-motion: no-preference)', fine: '(hover: hover) and (pointer: fine)' }, (ctx) => {
  const { motion, fine } = ctx.conditions as { motion: boolean; fine: boolean };
  if (!motion) {
    document.documentElement.classList.remove('motion');
    document.querySelectorAll('.formation__legend li').forEach((li) => li.classList.add('is-done'));
    initStoryStatic();
    return;
  }
  const undoMarks = initMarks();
  initHero();
  const undoReveals = initReveals();
  initParallax();
  initFrameAssembly();
  const undoStory = initStory();
  const undoMagnetic = fine ? initMagnetic() : () => {};
  const undoCursor = fine ? initCursor() : () => {};
  const undoInk = fine ? initInk() : () => {};
  const undoSmooth = fine ? initSmoothScroll() : () => {};
  const undoPixel = fine ? initPixelInk() : () => {};
  const undoPetals = initPetals();
  return () => { undoReveals(); undoStory(); undoMagnetic(); undoCursor(); undoInk(); undoSmooth(); undoPixel(); undoPetals(); undoMarks(); };
});

const disposeScenes = initScenes();

// Late layout shifts (webfonts) move trigger positions; re-measure once they settle.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
// Re-measure after the arrival, in idle time, so it never lands on an animating frame.
window.addEventListener('informatie:intro-done', () => {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(() => ScrollTrigger.refresh(), { timeout: 1500 }); else setTimeout(() => ScrollTrigger.refresh(), 800);
}, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => { mm.revert(); disposeScenes(); disposeTree(); });
}
