/** Tiny observable value used to connect scroll choreography, DOM controls and 3D scenes
 *  without either side knowing about the other (scenes load lazily, after the UI). */
export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(fn: (value: T) => void): () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subs = new Set<(value: T) => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      subs.forEach((fn) => fn(value));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export type FramePart = 'brackets' | 'corners' | 'stem' | 'signal';
export type Layer = 'source' | 'understand' | 'option' | 'agency';

/** 0 → scattered fragments, 1 → structure, relationships and labels in place. */
export const storyProgress = signal(0);
/** 0 → exploded model, 1 → assembled Open Frame. */
export const frameProgress = signal(0);
export const framePart = signal<FramePart | null>(null);
export const explorerLayer = signal<Layer | null>(null);
