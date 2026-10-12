import { mountTree, type TreeState } from './tree';
import { reducedMotion } from '../motion/env';

/** Shared with the arrival timeline, which grows the tree from 0 → 1. */
export const treeState: TreeState = { grow: 1 };
let api: ReturnType<typeof mountTree> | null = null;

export function initHeroTree(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('.hero-tree');
  if (!canvas) return () => {};
  const sky = document.querySelector<HTMLCanvasElement>('.hero-sky');
  api = mountTree(canvas, treeState, { reduced: reducedMotion(), sky });
  return () => { api?.dispose(); api = null; };
}

/** Redraw after the timeline changes `treeState.grow`. */
export const kickTree = () => api?.kick();
