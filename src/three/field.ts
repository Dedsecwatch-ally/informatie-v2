import { BoxGeometry, Euler, Group, Mesh, Quaternion, Vector3 } from 'three';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { C, createStage, damp, edgeLines, matteMaterial, segments } from './core';
import { createTags, type Tag } from './labels';
import { storyProgress } from '../state';
import { segment } from '../motion/ease';
import { smallScreen } from '../motion/env';

/* Object A — the Information Field.
   Scroll progress (0 → 1) drives three explanatory phases:
   0.06–0.50  fragments settle into three option columns on shared criteria
   0.45–0.75  relationships draw in: sources → options, option ↔ option, options → decision
   0.66–0.90  annotations appear; the decision space stays open, marked by the signal square */

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Fragment {
  obj: Group;
  from: Vector3;
  to: Vector3;
  qFrom: Quaternion;
  delay: number;
}

interface Relation {
  line: LineSegments2;
  mat: LineMaterial;
  length: number;
  range: [number, number];
}

const COLS = [-6, 0, 6];

export function mount(el: HTMLElement) {
  const stage = createStage(el, {
    fit: (aspect) => (aspect < 1 ? { width: 17, height: 12 } : { width: 27, height: 14 }),
    view: new Vector3(1, 0.9, 1.15),
    target: new Vector3(0, 0.4, 1.2),
  });
  const { scene, reduced, camera } = stage;
  const root = new Group();
  scene.add(root);

  const ink = stage.lineMaterial(C.ink, 1.2);
  const stoneLine = stage.lineMaterial(C.stone, 1);
  const paperMat = matteMaterial(C.paper);
  const geoCache = new Map<string, BoxGeometry>();
  const box = (w: number, h: number, d: number) => {
    const k = `${w}|${h}|${d}`;
    let g = geoCache.get(k);
    if (!g) { g = new BoxGeometry(w, h, d); geoCache.set(k, g); }
    return g;
  };
  const solid = (w: number, h: number, d: number, mat = paperMat, line = ink) => {
    const g = box(w, h, d);
    const grp = new Group();
    grp.add(new Mesh(g, mat));
    grp.add(edgeLines(g, line));
    return grp;
  };

  // Base plate + measured grid.
  const plate = solid(22, 0.2, 12);
  plate.position.set(0, -0.1, 1);
  root.add(plate);
  const grid: number[] = [];
  for (let x = -11; x <= 11; x++) grid.push(x, 0.002, -5, x, 0.002, 7);
  for (let z = -5; z <= 7; z++) grid.push(-11, 0.002, z, 11, 0.002, z);
  root.add(segments(grid, stoneLine));

  // Fragments and where each one belongs.
  const rand = rng(7);
  const fragments: Fragment[] = [];
  const addFragment = (obj: Group, to: Vector3, lag = 0) => {
    const from = new Vector3((rand() - 0.5) * 22, 1 + rand() * 3.5, (rand() - 0.5) * 10 + 1);
    const qFrom = new Quaternion().setFromEuler(new Euler((rand() - 0.5) * Math.PI, (rand() - 0.5) * Math.PI * 2, (rand() - 0.5) * Math.PI));
    fragments.push({ obj, from, to, qFrom, delay: 0.06 + lag + rand() * 0.2 });
    root.add(obj);
  };

  COLS.forEach((cx) => {
    for (let i = 0; i < 4; i++) addFragment(solid(3.2, 0.1, 2.2), new Vector3(cx, 0.05 + i * 0.22, -1.2));
    for (let j = 0; j < 3; j++) addFragment(solid(0.5, 0.5, 0.5), new Vector3(cx - 1 + j, 0.25, 1.6));
    addFragment(solid(1.4, 0.5, 0.5), new Vector3(cx - 0.8, 0.25, 0.6));
    addFragment(solid(1.4, 0.5, 0.5), new Vector3(cx + 0.8, 0.25, 0.6));
    // Criteria rods: one segment per option; they align end-to-end into continuous lines.
    for (let k = 0; k < 3; k++) addFragment(solid(4.6, 0.05, 0.05), new Vector3(cx, 0.025, 2.5 + k * 0.4), 0.04);
  });
  const sources: Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const p = new Vector3(-7.5 + i * 3, 0.2, -3.6);
    sources.push(p);
    addFragment(solid(0.4, 0.4, 0.4), p, 0.02);
  }

  // Relationships, grown along their length with a dash the size of the drawn portion.
  const relations: Relation[] = [];
  const relate = (pts: number[][], color: string, range: [number, number], width = 1.2) => {
    const flat: number[] = [];
    let length = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      flat.push(...pts[i], ...pts[i + 1]);
      length += new Vector3(...pts[i]).distanceTo(new Vector3(...pts[i + 1]));
    }
    const mat = stage.lineMaterial(color, width, { dashed: true, dash: 0, gap: length + 1 });
    const line = segments(flat, mat);
    root.add(line);
    relations.push({ line, mat, length, range });
  };
  const topY = 0.05 + 3 * 0.22 + 0.05;
  sources.forEach((s, i) => {
    const cx = COLS[Math.floor(i / 2)];
    relate([[s.x, 0.4, s.z], [cx + (i % 2 ? 0.7 : -0.7), topY, -2.3]], C.ink, [0.45 + i * 0.015, 0.6 + i * 0.015]);
  });
  for (let i = 0; i < 2; i++) {
    const a = COLS[i], b = COLS[i + 1];
    relate([[a, topY, -1.2], [a, 1.9, -1.2], [b, 1.9, -1.2], [b, topY, -1.2]], C.ink, [0.52 + i * 0.04, 0.68 + i * 0.04]);
  }
  const foot = new Vector3(0, 0.01, 5.4);
  COLS.forEach((cx, i) => relate([[cx, 0.01, 3.45], [cx * 0.25, 0.01, foot.z - 0.9]], C.slate, [0.6 + i * 0.02, 0.74 + i * 0.02], 1));

  // The decision space: a dashed footprint left open, and the signal square set apart above it.
  const s = 0.9;
  const footMat = stage.lineMaterial(C.signalDeep, 1.4, { dashed: true, dash: 0.16, gap: 0.12, opacity: 0 });
  root.add(segments([
    -s, 0.01, foot.z - s, s, 0.01, foot.z - s, s, 0.01, foot.z - s, s, 0.01, foot.z + s,
    s, 0.01, foot.z + s, -s, 0.01, foot.z + s, -s, 0.01, foot.z + s, -s, 0.01, foot.z - s,
  ], footMat));
  const signalMat = matteMaterial(C.signal);
  const signalCube = new Mesh(box(0.5, 0.5, 0.5), signalMat);
  root.add(signalCube);

  // Annotations.
  const tags = createTags(stage);
  const tagPlan: Array<[Tag, number, boolean?]> = [
    [tags.add('[OPT-A] Lower cost', new Vector3(-7.6, 0.8, -1.2), { side: 'left' }), 0.78, true],
    [tags.add('[OPT-B] More flexibility', new Vector3(0, 1.9, -1.2)), 0.8],
    [tags.add('[OPT-C] Less risk', new Vector3(7.6, 0.8, -1.2)), 0.82, true],
    [tags.add('[S1–S6] Sources', new Vector3(-7.7, 0.4, -3.6), { side: 'left', variant: 'quiet' }), 0.8, true],
    [tags.add('Same criteria', new Vector3(8.3, 0.05, 3.3), { variant: 'quiet' }), 0.84, true],
    [tags.add('Your decision · left open', new Vector3(s, 0.01, foot.z), { variant: 'signal' }), 0.88],
  ];

  let shown = reduced ? 1 : storyProgress.get();
  const q = new Quaternion();
  const ident = new Quaternion();

  function apply(p: number) {
    for (const f of fragments) {
      const t = segment(p, f.delay, f.delay + 0.2);
      f.obj.position.lerpVectors(f.from, f.to, t);
      f.obj.quaternion.copy(q.copy(f.qFrom).slerp(ident, t));
    }
    for (const r of relations) {
      const t = segment(p, r.range[0], r.range[1]);
      r.mat.dashSize = t * r.length + (t > 0.999 ? 1 : 0);
      r.line.visible = t > 0;
    }
    footMat.opacity = segment(p, 0.66, 0.74);
    const sq = segment(p, 0.74, 0.86);
    signalMat.opacity = sq;
    signalCube.visible = sq > 0;
    signalCube.position.set(0, 0.95 + (1 - sq) * 0.8, foot.z);
    const narrow = smallScreen();
    for (const [tag, at, secondary] of tagPlan) tag.setVisible(p >= at && !(narrow && secondary));
    camera.zoom = 1 + segment(p, 0.5, 0.95) * 0.06;
    camera.updateProjectionMatrix();
  }

  stage.onFrame((dt) => {
    const target = reduced ? 1 : storyProgress.get();
    shown = damp(shown, target, reduced ? Infinity : 4.5, dt);
    apply(shown);
    return Math.abs(shown - target) > 1e-4;
  });

  const unsub = storyProgress.subscribe(() => stage.invalidate());
  return () => { unsub(); stage.dispose(); };
}
