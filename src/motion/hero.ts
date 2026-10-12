import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { brandEase } from './ease';
import { kickTree, treeState } from '../art/heroTree';

/* Arrival, one timeline:
   1. Clarity formation, full-screen (1.75 s, once, Brand Book §10)
      [01] fragments appear on the 12u grid → [02] they align into structure →
      [03] the open-corner brackets close in; the stem settles → [04] the signal square lands last.
   2. The finished mark glides up into the header logo while the paper veil dissolves.
   3. The hero arrives: the tree grows up from its roots and blossoms outward; the headline,
      copy and CTA follow. */

type XY = [number, number];
// Offsets in symbol units (u = 10) from each piece's final position.
const SCATTER: Record<string, XY> = {
  tlh: [-40, -30], tlv: [-50, 20], brh: [40, 40], brv: [60, -30],
  s1: [-80, -50], s2: [70, -60], s3: [-70, 40], s4: [60, 30],
  n1: [0, 0], n2: [0, 0], n3: [0, 0], n4: [0, 0],
};
const ALIGNED: Record<string, XY> = {
  tlh: [-10, -10], tlv: [-10, -10], brh: [10, 10], brv: [10, 10],
  s1: [0, -12], s2: [0, -4], s3: [0, 4], s4: [0, 12],
};
const FLY_AT = 1.95;   // mark starts travelling to the header
const FLY = 1.0;

export function initHero(): void {
  const root = document.querySelector<HTMLElement>('.hero');
  if (!root) return;
  const html = document.documentElement;
  html.dataset.js = '1';

  const title = root.querySelector<HTMLElement>('[data-hero="title"]');
  const kicker = root.querySelector<HTMLElement>('[data-hero="kicker"]');
  const cta = root.querySelector<HTMLAnchorElement>('[data-hero="cta"]');
  if (!title || !cta) return;

  const stage = document.querySelector<HTMLElement>('.intro-stage');
  const formation = stage?.querySelector<SVGSVGElement>('.formation') ?? null;
  const veil = document.querySelector<HTMLElement>('.intro-veil');
  const headerMark = document.querySelector<SVGSVGElement>('.brand__symbol');
  // Full-screen arrival: fresh visit at the top of the page (the head script sets `intro`).
  const intro = html.classList.contains('intro') && window.scrollY < 4 && !!formation && !!veil && !!headerMark;
  if (!intro) html.classList.remove('intro');

  // Hero pre-state, taken over from the CSS gate without a flash.
  gsap.set(kicker, { opacity: 0 });
  gsap.set(title, { opacity: 1 });
  gsap.set(cta, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
  treeState.grow = 0;
  kickTree();
  html.classList.remove('motion');

  // Built paused: it starts only once the page has finished booting (see `begin` below).
  const tl = gsap.timeline({ paused: true, defaults: { ease: brandEase } });
  const T = intro
    ? { tree: FLY_AT + 0.15, title: FLY_AT + 0.5, cta: FLY_AT + 0.9 }
    : { tree: 0, title: 0.2, cta: 0.65 };

  let introOver = !intro;
  function introDone() {
    if (introOver) return;
    introOver = true;
    html.classList.remove('intro');
    if (veil) gsap.set(veil, { clearProps: 'opacity' });
    if (formation) gsap.set(formation, { clearProps: 'transform' });
    window.dispatchEvent(new CustomEvent('informatie:intro-done'));
  }

  if (intro && formation && veil && headerMark) {
    const piece = (id: string) => formation.querySelector<SVGRectElement>(`[data-piece="${id}"]`)!;
    const finalMark = formation.querySelector<SVGGElement>('.formation__final')!;
    const piecesGroup = formation.querySelector<SVGGElement>('.formation__pieces')!;
    const noise = ['n1', 'n2', 'n3', 'n4'].map(piece);
    const brackets = ['tlh', 'tlv', 'brh', 'brv'].map(piece);
    const stem = ['s1', 's2', 's3', 's4'].map(piece);
    const square = piece('sq');
    const fragments = [...noise, ...brackets, ...stem];

    gsap.set(finalMark, { opacity: 0 });
    gsap.set(piecesGroup, { visibility: 'visible' });
    fragments.forEach((el) => {
      const [x, y] = SCATTER[el.dataset.piece!];
      gsap.set(el, { x, y, opacity: 0 });
    });
    gsap.set(square, { y: -10, opacity: 0 });

    tl.to(fragments, { opacity: 1, duration: 0.28, stagger: { each: 0.035, from: 'random' } }, 0)
      .to([...brackets, ...stem], {
        x: (_i: number, el: Element) => ALIGNED[(el as HTMLElement).dataset.piece!][0],
        y: (_i: number, el: Element) => ALIGNED[(el as HTMLElement).dataset.piece!][1],
        duration: 0.6,
        stagger: 0.03,
      }, 0.3)
      .to(noise, { opacity: 0, duration: 0.35, ease: 'none' }, 0.5)
      .to(brackets, { x: 0, y: 0, duration: 0.5 }, 0.85)
      .to(stem, { y: 0, duration: 0.35 }, 1.05)
      .to(square, { y: 0, opacity: 1, duration: 0.4 }, 1.35)
      // Swap the assembled pieces for the canonical mark: geometrically exact, no seams.
      .set(finalMark, { opacity: 1 }, 1.75)
      .set(piecesGroup, { visibility: 'hidden' }, 1.75);

    // Glide into the header logo: the symbol occupies the middle 240/480 of the formation.
    const flight = () => {
      const r = formation.getBoundingClientRect();
      const h = headerMark.getBoundingClientRect();
      return {
        x: h.left + h.width / 2 - (r.left + r.width / 2),
        y: h.top + h.height / 2 - (r.top + r.height / 2),
        scale: h.width / (r.width * 240 / 480),
      };
    };
    let f: ReturnType<typeof flight> | null = null;
    tl.call(() => { f = flight(); }, [], FLY_AT - 0.01)
      .to(formation, {
        x: () => f?.x ?? 0, y: () => f?.y ?? 0, scale: () => f?.scale ?? 1,
        duration: FLY, ease: 'power3.inOut', force3D: false, transformOrigin: '50% 50%',
      }, FLY_AT)
      .to(veil, { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, FLY_AT + 0.15)
      .call(introDone, [], FLY_AT + FLY);

    // Any intent to move on fast-forwards the arrival rather than cutting it.
    const hurry = () => { if (!introOver) tl.timeScale(4); };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, hurry, { once: true, passive: true }));
  }

  // The tree grows up from its roots; blossom opens outward along the branches.
  tl.to(treeState, { grow: 1, duration: 2.4, ease: 'power2.out', onUpdate: kickTree, onComplete: kickTree }, T.tree);
  // The key word is inked just after the headline lands.
  tl.call(() => title.classList.add('marks-on'), [], T.title + 0.85);
  tl.to(kicker, { opacity: 1, duration: 0.4 }, T.title - 0.2)
    .to(cta, { clipPath: 'inset(0 0% 0 0)', duration: 0.5 }, T.cta);

  // Headline: restrained line masks. Split once the brand fonts are in (inside the boot gate
  // below), so the split's layout work never lands on an animating frame.
  let split: SplitText | null = null;
  gsap.set(title, { visibility: 'hidden' });
  const splitHeadline = () => {
    if (split) return;
    split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(title, { visibility: 'visible' });
    tl.from(split.lines, { yPercent: 105, duration: 0.7, stagger: 0.1, ease: brandEase }, T.title);
    if (tl.progress() === 1) finish();
  };

  function finish() {
    tl.progress(1);
    introDone();
    if (split && tl.progress() === 1) { split.revert(); split = null; }
    gsap.set([title, cta, kicker], { clearProps: 'all' });
    title?.classList.add('marks-on');
    treeState.grow = 1;
    kickTree();
  }
  tl.eventCallback('onComplete', () => { if (split) finish(); });

  // Never make anyone wait: keyboard focus or arriving mid-page completes it instantly.
  const skip = () => { if (tl.progress() < 1) finish(); };
  root.addEventListener('focusin', skip, { once: true });
  if (window.scrollY > root.offsetHeight * 0.5) skip();

  /* Smoothness: start the arrival on a quiet main thread. The rest of the site initialises
     synchronously after this function (scroll reveals, line splits, pinning, smooth scroll),
     and web fonts re-split headings when they land. The paper veil already covers the screen,
     so wait for both — fonts capped at 1.5 s — then two frames, then play. */
  // `document.fonts.ready` can resolve before the webfonts are even requested, so ask for the
  // three brand faces explicitly and wait for those (capped, so a slow font never holds anyone).
  const brandFonts = document.fonts
    ? Promise.all(['600 1em "Inter Tight"', '400 1em Inter', '400 1em "IBM Plex Mono"'].map((f) => document.fonts.load(f).catch(() => [])))
    : Promise.resolve();
  const fontsReady = Promise.race([brandFonts, new Promise((r) => setTimeout(r, 1500))]);
  fontsReady
    .then(splitHeadline)
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    .then(() => { if (tl.progress() === 0) { performance.mark('informatie:arrival'); tl.play(); } });
}
