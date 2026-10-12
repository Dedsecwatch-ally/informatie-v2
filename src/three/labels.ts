import { Object3D, Vector3 } from 'three';
import { worldToScreen, type Stage } from './core';

export type TagVariant = 'ink' | 'signal' | 'quiet';

export interface Tag {
  el: HTMLElement;
  visible: boolean;
  dim: boolean;
  setVisible(v: boolean): void;
  setDim(v: boolean): void;
}

interface Entry extends Tag {
  anchor: Object3D | Vector3;
  side: 'left' | 'right';
  w: number;
  h: number;
}

/** HTML callouts (leader line + mono label) pinned to points in a 3D scene. */
export function createTags(stage: Stage) {
  const layer = stage.el.querySelector<HTMLElement>('.stage3d__labels');
  const entries: Entry[] = [];
  const tmp = new Vector3();

  function add(text: string, anchor: Object3D | Vector3, opts: { side?: 'left' | 'right'; variant?: TagVariant } = {}): Tag {
    const el = document.createElement('div');
    const side = opts.side ?? 'right';
    el.className = `tag3d tag3d--${opts.variant ?? 'ink'}${side === 'left' ? ' tag3d--left' : ''} is-hidden`;
    el.innerHTML = '<span class="tag3d__line"></span><span class="tag3d__text"></span>';
    (el.lastElementChild as HTMLElement).textContent = text;
    layer?.appendChild(el);
    const entry: Entry = {
      el, anchor, side, w: 0, h: 0, visible: false, dim: false,
      setVisible(v) { if (v !== this.visible) { this.visible = v; el.classList.toggle('is-hidden', !v); } },
      setDim(v) { if (v !== this.dim) { this.dim = v; el.classList.toggle('is-dim', v); } },
    };
    entries.push(entry);
    measure(entry);
    return entry;
  }

  function measure(e: Entry) {
    e.w = e.el.offsetWidth;
    e.h = e.el.offsetHeight;
  }

  function update() {
    for (const e of entries) {
      worldToScreen(e.anchor, stage, tmp);
      // Keep callouts inside the stage on narrow screens (the leader may shorten).
      const raw = e.side === 'left' ? tmp.x - e.w : tmp.x;
      const x = Math.max(4, Math.min(stage.width - e.w - 4, raw));
      e.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(tmp.y - e.h / 2)}px, 0)`;
    }
  }

  stage.afterRender(update);
  stage.onResize(() => entries.forEach(measure));
  // Fonts may arrive after the scene mounts; widths change once they do.
  document.fonts?.ready.then(() => { entries.forEach(measure); stage.invalidate(); });

  return { add };
}
