import { BoxGeometry, Color, ExtrudeGeometry, Group, Mesh, MeshLambertMaterial, Shape, Vector3 } from 'three';
import { C, createStage, damp, edgeLines, matteMaterial, segments } from './core';
import { createTags } from './labels';
import { frameProgress, framePart, type FramePart } from '../state';
import { finePointer } from '../motion/env';
import { segment } from '../motion/ease';

/* Object B — the Open Frame as an architectural model.
   Geometry is the logo-pack symbol (120-unit box, u = 10) mapped to world units (u = 1):
   brackets 1u stroke / 4u arms, square 1.6u, stem 1.6u × 4u, gap 0.6u. The frame never
   closes and the square never touches the stem — in every state of the assembly. */

const DEPTH = 0.5;
const toWorld = (sx: number, sy: number): [number, number] => [(sx - 60) / 10, (60 - sy) / 10];

function lShape(points: Array<[number, number]>) {
  const s = new Shape();
  points.forEach(([sx, sy], i) => {
    const [x, y] = toWorld(sx, sy);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  });
  s.closePath();
  return s;
}

interface Part {
  key: Exclude<FramePart, 'corners'>;
  group: Group;
  caps: MeshLambertMaterial;
  sides: MeshLambertMaterial;
  capBase: Color;
  sideBase: Color;
  from: Vector3;      // exploded offset
  range: [number, number];
  emphasis: number;
}

export function mount(el: HTMLElement) {
  const stage = createStage(el, {
    fit: { width: 19, height: 19 },
    view: new Vector3(-0.4, 0.2, 0.9),
    target: new Vector3(0, -0.4, 0),
  });
  const { scene, reduced } = stage;
  const model = new Group();
  scene.add(model);

  const ink = stage.lineMaterial(C.ink, 1.2);
  const stoneLine = stage.lineMaterial(C.stone, 1);
  const slateLine = stage.lineMaterial(C.slate, 1);

  // Construction sheet: the 12 × 12u grid the mark is built on.
  const sheetGeo = new BoxGeometry(14, 14, 0.08);
  const sheet = new Mesh(sheetGeo, matteMaterial(C.paper));
  sheet.position.z = -0.04;
  sheet.add(edgeLines(sheetGeo, ink));
  model.add(sheet);

  const grid: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const v = -6 + i;
    grid.push(v, -6, 0.002, v, 6, 0.002, -6, v, 0.002, 6, v, 0.002);
  }
  model.add(segments(grid, stoneLine));
  // Dimension line under the grid: 12u.
  model.add(segments([-6, -6.5, 0.002, 6, -6.5, 0.002, -6, -6.7, 0.002, -6, -6.3, 0.002, 6, -6.7, 0.002, 6, -6.3, 0.002], slateLine));

  // Plinth the sheet stands in.
  const plinthGeo = new BoxGeometry(16, 0.5, 3);
  const plinth = new Mesh(plinthGeo, matteMaterial(C.paper));
  plinth.position.set(0, -7.25, -0.3);
  plinth.add(edgeLines(plinthGeo, ink));
  model.add(plinth);

  // Components.
  const parts: Part[] = [];
  function addPart(key: Part['key'], geo: ExtrudeGeometry | BoxGeometry, cap: string, side: string, from: Vector3, range: [number, number], at?: Vector3) {
    const caps = matteMaterial(cap, {}) as MeshLambertMaterial;
    const sides = matteMaterial(side, {}) as MeshLambertMaterial;
    // Caps unlit-looking: emissive carries the exact brand colour so the front reads as the printed mark.
    caps.color.set(0x000000);
    caps.emissive.set(cap);
    const mesh = new Mesh(geo, geo instanceof ExtrudeGeometry ? [caps, sides] : [sides, sides, sides, sides, caps, caps]);
    const group = new Group();
    group.add(mesh);
    if (at) mesh.position.copy(at);
    model.add(group);
    parts.push({ key, group, caps, sides, capBase: new Color(cap), sideBase: new Color(side), from, range, emphasis: 1 });
  }

  const extrude = (s: Shape) => new ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false });
  addPart('brackets', extrude(lShape([[10, 10], [50, 10], [50, 20], [20, 20], [20, 50], [10, 50]])), C.ink, C.slate, new Vector3(-2.4, 2.4, 5), [0, 0.55]);
  addPart('brackets', extrude(lShape([[110, 110], [70, 110], [70, 100], [100, 100], [100, 70], [110, 70]])), C.ink, C.slate, new Vector3(2.4, -2.4, 5), [0.08, 0.6]);
  const [sx, sy] = toWorld(60, 70);
  addPart('stem', new BoxGeometry(1.6, 4, DEPTH), C.ink, C.slate, new Vector3(0, -3, 7), [0.3, 0.78], new Vector3(sx, sy, DEPTH / 2));
  const [qx, qy] = toWorld(60, 36);
  // The square arrives last, from above — it approaches the stem but can never reach it.
  addPart('signal', new BoxGeometry(1.6, 1.6, DEPTH), C.signal, C.signalDeep, new Vector3(0, 2.2, 6), [0.68, 1], new Vector3(qx, qy, DEPTH / 2));

  // Removed corners, drawn dashed when "open corners" is highlighted.
  const ghost = stage.lineMaterial(C.slate, 1.2, { dashed: true, dash: 0.18, gap: 0.14, opacity: 0 });
  const ghostPts: number[] = [];
  const outline = (pts: Array<[number, number]>) => pts.forEach(([ax, ay], i) => {
    const [bx, by] = pts[(i + 1) % pts.length];
    const a = toWorld(ax, ay), b = toWorld(bx, by);
    ghostPts.push(a[0], a[1], DEPTH / 2, b[0], b[1], DEPTH / 2);
  });
  outline([[70, 10], [110, 10], [110, 50], [100, 50], [100, 20], [70, 20]]);
  outline([[10, 70], [20, 70], [20, 100], [50, 100], [50, 110], [10, 110]]);
  model.add(segments(ghostPts, ghost));

  const tags = createTags(stage);
  const gapTag = tags.add('Gap 0.6u — never touches', new Vector3(0.8, 1.3, DEPTH), { variant: 'quiet' });
  const gridTag = tags.add('12u grid', new Vector3(-6, -6.5, 0), { side: 'left', variant: 'quiet' });

  // State.
  let shown = reduced ? 1 : frameProgress.get();
  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0;
  let ghostO = 0;
  const stoneC = new Color(C.stone), boneC = new Color(C.bone);

  function emphasisTarget(p: Part, sel: FramePart | null) {
    if (!sel) return 1;
    if (sel === 'corners') return p.key === 'brackets' ? 1 : 0;
    return p.key === sel ? 1 : 0;
  }

  stage.onFrame((dt) => {
    const rate = reduced ? Infinity : 5;
    const target = reduced ? 1 : frameProgress.get();
    shown = damp(shown, target, rate, dt);
    yaw = damp(yaw, tYaw, rate, dt);
    pitch = damp(pitch, tPitch, rate, dt);
    model.rotation.set(pitch, yaw, 0);

    const sel = framePart.get();
    let moving = Math.abs(shown - target) > 1e-4 || Math.abs(yaw - tYaw) > 1e-4 || Math.abs(pitch - tPitch) > 1e-4;

    for (const p of parts) {
      const t = segment(shown, p.range[0], p.range[1]);
      p.group.position.copy(p.from).multiplyScalar(1 - t);
      const o = Math.min(1, t * 2.5);
      p.caps.opacity = p.sides.opacity = o;
      p.group.visible = o > 0.001;
      const e = emphasisTarget(p, sel);
      p.emphasis = damp(p.emphasis, e, reduced ? Infinity : 9, dt);
      if (Math.abs(p.emphasis - e) > 1e-3) moving = true;
      p.caps.emissive.copy(p.capBase).lerp(stoneC, (1 - p.emphasis) * 0.8);
      p.sides.color.copy(p.sideBase).lerp(boneC, (1 - p.emphasis) * 0.8);
    }

    const gTarget = sel === 'corners' ? 1 : 0;
    ghostO = damp(ghostO, gTarget, reduced ? Infinity : 9, dt);
    ghost.opacity = ghostO;
    if (Math.abs(ghostO - gTarget) > 1e-3) moving = true;

    const done = shown > 0.97;
    gapTag.setVisible(done && (!sel || sel === 'signal' || sel === 'stem'));
    gridTag.setVisible(done && !sel);
    return moving;
  });

  const unsubs = [
    frameProgress.subscribe(() => stage.invalidate()),
    framePart.subscribe(() => stage.invalidate()),
  ];

  // Subtle pointer response on desktop only: the model turns a few degrees toward the pointer.
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    tYaw = ((e.clientX - r.left) / r.width - 0.5) * 0.3;
    tPitch = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
    stage.invalidate();
  };
  const onLeave = () => { tYaw = 0; tPitch = 0; stage.invalidate(); };
  const pointer = finePointer() && !reduced;
  if (pointer) {
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
  }

  return () => {
    unsubs.forEach((u) => u());
    if (pointer) {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    }
    stage.dispose();
  };
}

