import { explorerLayer, framePart, type FramePart, type Layer } from '../state';
import { swapText } from './swap';

/** Frame parts (Object B) — toggles that highlight a component of the model. */
export function initFrameParts() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.part');
  buttons.forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.part as FramePart;
    framePart.set(framePart.get() === key ? null : key);
  }));
  framePart.subscribe((key) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === key))));
}

const LAYERS: Record<Layer, { label: string; title: string; body: string; rel: string }> = {
  source: {
    label: '[S1] Source',
    title: 'Where it comes from.',
    body: 'Every claim traces back to a dated, named source. Sources sit at the base — everything above rests on them, and you can always step down to check.',
    rel: 'Supports → [01] Understand',
  },
  understand: {
    label: '[01] Understand',
    title: 'What it means.',
    body: 'Facts from the sources, arranged on one shared grid so the plain meaning comes before the detail. Highlighted cells are the points that matter for you.',
    rel: 'Built on [S1] Source · Structures → [OPT-B] Option',
  },
  option: {
    label: '[OPT-B] Option',
    title: 'What you could do.',
    body: 'Options measured on identical criteria, side by side — including keeping what you have. Option B is outlined only because it is the one in focus here.',
    rel: 'Compared on [01] Understand · Serves → [04] Agency',
  },
  agency: {
    label: '[04] Agency',
    title: 'What you decide.',
    body: 'The structure stops short of a verdict. Two corners stay open and the square sits apart: the decision is yours, now or later.',
    rel: 'Everything below serves this layer',
  },
};
const OVERVIEW = {
  label: 'Overview',
  title: 'Four layers, one direction.',
  body: 'Sources support meaning, meaning structures the options, and the options serve one thing: your decision.',
  rel: '[S1] → [01] → [OPT-B] → [04]',
};

/** Structure explorer (Object C) — the list is the accessible source of truth; the 3D view mirrors it. */
export function initExplorer() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.layer-btn');
  const fields = document.querySelectorAll<HTMLElement>('[data-x]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.layer as Layer;
    explorerLayer.set(explorerLayer.get() === key ? null : key);
  }));
  explorerLayer.subscribe((key) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === key)));
    const data = key ? LAYERS[key] : OVERVIEW;
    swapText(fields, () => fields.forEach((el) => { el.textContent = data[el.dataset.x as keyof typeof data]; }));
  });
}
