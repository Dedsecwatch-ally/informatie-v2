import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Raycaster, Shape, Vector2, Vector3, type Material, type Object3D } from 'three';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { C, createStage, damp, edgeLines, matteMaterial, segments } from './core';
import { createTags, type Tag } from './labels';
import { explorerLayer, type Layer } from '../state';

/* Object C — the Structure Explorer.
   Four sheets, each resting on the one below: source → understand → option → agency.
   Selecting a layer lifts it, keeps its direct relationships in ink and quiets the rest,
   so every selection shows a relationship rather than just a highlight. */

const ORDER: Layer[] = ['source', 'understand', 'option', 'agency'];
const GAP = 1.85;
const RELATED: Record<Layer, Layer[]> = {
  source: ['understand'],
  understand: ['source', 'option'],
  option: ['understand', 'agency'],
  agency: ['option'],
};
const TAGS: Record<Layer, string> = {
  source: '[S1] Source',
  understand: '[01] Understand',
  option: '[OPT-B] Option',
  agency: '[04] Agency',
};

interface LayerView {
  key: Layer;
  group: Group;
  mats: Array<Material & { opacity: number }>;
  baseY: number;
  y: number;
  o: number;
  tag: Tag;
}

export function mount(el: HTMLElement) {
  const stage = createStage(el, {
    fit: { width: 10.5, height: 11.2 },
    view: new Vector3(1, 0.78, 1.25),
    target: new Vector3(0, 2.8, 0),
  });
  const { scene, reduced } = stage;
  const model = new Group();
  scene.add(model);

  const pickables: Mesh[] = [];
  const views: LayerView[] = [];
  const tagApi = createTags(stage);

  function makeLayer(key: Layer, i: number) {
    const group = new Group();
    group.userData.layer = key;
    const mats: LayerView['mats'] = [];
    const ink = stage.lineMaterial(C.ink, 1.2);
    const quiet = stage.lineMaterial(C.stone, 1);
    const slate = stage.lineMaterial(C.slate, 1);
    const paper = matteMaterial(C.paper);
    const bone = matteMaterial(C.bone);
    mats.push(ink, quiet, slate, paper, bone);

    const solid = (w: number, h: number, d: number, at: Vector3, mat: Material = paper, line: LineMaterial = ink) => {
      const g = new BoxGeometry(w, h, d);
      const m = new Mesh(g, mat);
      m.position.copy(at);
      m.add(edgeLines(g, line));
      m.userData.layer = key;
      pickables.push(m);
      group.add(m);
      return m;
    };

    solid(6, 0.08, 4.2, new Vector3(0, 0, 0));
    const top = 0.04;

    if (key === 'source') {
      [-1.9, 0, 1.9].forEach((x) => {
        solid(1.3, 0.06, 1.7, new Vector3(x, top + 0.03, 0.1));
        const lines: number[] = [];
        for (let r = 0; r < 4; r++) {
          const z = -0.45 + r * 0.3, len = r === 3 ? 0.5 : 0.9;
          lines.push(x - 0.45, top + 0.065, z, x - 0.45 + len, top + 0.065, z);
        }
        group.add(segments(lines, slate));
      });
    }

    if (key === 'understand') {
      const g: number[] = [];
      for (let c = 0; c <= 6; c++) g.push(-3 + c, top + 0.002, -2, -3 + c, top + 0.002, 2);
      for (let r = 0; r <= 4; r++) g.push(-3, top + 0.002, -2 + r, 3, top + 0.002, -2 + r);
      group.add(segments(g, quiet));
      [[-2.5, -0.5], [-0.5, 0.5], [0.5, -1.5]].forEach(([x, z]) => solid(1, 0.05, 1, new Vector3(x, top + 0.025, z), bone, ink));
    }

    if (key === 'option') {
      [-1.9, 0, 1.9].forEach((x, j) => {
        const m = solid(1.3, 0.5, 1.3, new Vector3(x, top + 0.25, 0));
        if (j === 1) m.add(edgeLines(new BoxGeometry(1.42, 0.62, 1.42), ink));
      });
    }

    if (key === 'agency') {
      // The open frame on the sheet: two corners only — and the person, set apart.
      const L = (pts: Array<[number, number]>) => {
        const s = new Shape();
        pts.forEach(([x, z], k) => (k ? s.lineTo(x, z) : s.moveTo(x, z)));
        const geo = new ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
        geo.rotateX(Math.PI / 2);
        geo.translate(0, top + 0.06, 0);
        const ink2 = matteMaterial(C.ink);
        mats.push(ink2);
        const m = new Mesh(geo, ink2);
        m.userData.layer = key;
        pickables.push(m);
        group.add(m);
      };
      L([[-2.6, -1.8], [-1.2, -1.8], [-1.2, -1.45], [-2.25, -1.45], [-2.25, -0.4], [-2.6, -0.4]]);
      L([[2.6, 1.8], [1.2, 1.8], [1.2, 1.45], [2.25, 1.45], [2.25, 0.4], [2.6, 0.4]]);
      const stem = matteMaterial(C.ink);
      const sq = matteMaterial(C.signal);
      mats.push(stem, sq);
      solid(0.4, 1.0, 0.4, new Vector3(0, top + 0.5, 0), stem, slate);
      // 0.15 gap ≈ 0.6u at this scale: never touching.
      solid(0.4, 0.4, 0.4, new Vector3(0, top + 1.0 + 0.15 + 0.2, 0), sq, stage.lineMaterial(C.signalDeep, 1));
    }

    const baseY = i * GAP;
    group.position.y = baseY;
    model.add(group);
    const tag = tagApi.add(TAGS[key], (() => { const a = new Group(); a.position.set(-3, 0.05, 2.1); group.add(a); return a; })(), {
      side: 'left',
      variant: key === 'agency' ? 'signal' : 'ink',
    });
    tag.setVisible(true);
    views.push({ key, group, mats, baseY, y: baseY, o: 1, tag });
  }
  ORDER.forEach(makeLayer);

  // Corner posts (quiet) and the three relationships between neighbouring layers.
  const post = stage.lineMaterial(C.slate, 1, { dashed: true, dash: 0.08, gap: 0.1, opacity: 0.6 });
  const posts: number[] = [];
  [[-3, -2.1], [3, -2.1], [3, 2.1], [-3, 2.1]].forEach(([x, z]) => posts.push(x, 0, z, x, GAP * 3, z));
  const postLines = segments(posts, post);
  model.add(postLines);

  interface Link { a: Layer; b: Layer; from: Vector3; to: Vector3; mat: LineMaterial; line: ReturnType<typeof segments>; o: number }
  const links: Link[] = [
    { a: 'source', b: 'understand', from: new Vector3(-1.9, 0.08, 0.1), to: new Vector3(-0.5, 0.06, 0.5) },
    { a: 'understand', b: 'option', from: new Vector3(-0.5, 0.06, 0.5), to: new Vector3(0, 0.55, 0) },
    { a: 'option', b: 'agency', from: new Vector3(0, 0.55, 0), to: new Vector3(0, 0.1, 0) },
  ].map((l) => {
    const mat = stage.lineMaterial(C.ink, 1.4);
    const line = segments([0, 0, 0, 0, 1, 0], mat);
    model.add(line);
    return { ...l, a: l.a as Layer, b: l.b as Layer, mat, line, o: 1 };
  });

  const view = (k: Layer) => views.find((v) => v.key === k)!;
  const tmpA = new Vector3(), tmpB = new Vector3();
  function placeLinks() {
    for (const l of links) {
      tmpA.copy(l.from); tmpA.y += view(l.a).y;
      tmpB.copy(l.to); tmpB.y += view(l.b).y;
      l.line.geometry.setPositions([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z]);
    }
  }

  // Rotation (drag) with damping and limits; gentle by design.
  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0;
  const resetBtn = el.querySelector<HTMLButtonElement>('.stage3d__reset');

  stage.onFrame((dt) => {
    const rate = reduced ? Infinity : 7;
    const sel = explorerLayer.get();
    let moving = false;

    yaw = damp(yaw, tYaw, rate, dt);
    pitch = damp(pitch, tPitch, rate, dt);
    model.rotation.set(pitch, yaw, 0);
    if (Math.abs(yaw - tYaw) > 1e-4 || Math.abs(pitch - tPitch) > 1e-4) moving = true;

    for (const v of views) {
      const isSel = sel === v.key;
      const related = sel ? RELATED[sel].includes(v.key) : false;
      const ty = v.baseY + (isSel ? 0.45 : 0) + (sel && ORDER.indexOf(v.key) > ORDER.indexOf(sel) ? 0.45 : 0);
      const to = !sel || isSel ? 1 : related ? 0.55 : 0.18;
      v.y = damp(v.y, ty, rate, dt);
      v.o = damp(v.o, to, rate, dt);
      if (Math.abs(v.y - ty) > 1e-4 || Math.abs(v.o - to) > 1e-3) moving = true;
      v.group.position.y = v.y;
      v.mats.forEach((m) => { m.opacity = v.o; });
      v.tag.setDim(!!sel && !isSel && !related);
    }
    for (const l of links) {
      const to = !sel ? 0.9 : sel === l.a || sel === l.b ? 1 : 0.12;
      l.o = damp(l.o, to, rate, dt);
      l.mat.opacity = l.o;
      l.mat.linewidth = sel && (sel === l.a || sel === l.b) ? 2 : 1.2;
    }
    placeLinks();
    return moving;
  });

  const unsub = explorerLayer.subscribe(() => stage.invalidate());

  // Pointer: drag rotates (horizontal mainly, vertical page scroll stays native); a tap selects.
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let down: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null;
  let dragged = false;

  function pick(e: PointerEvent): Layer | null {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, stage.camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    let o: Object3D | null = hit?.object ?? null;
    while (o && !o.userData.layer) o = o.parent;
    return (o?.userData.layer as Layer) ?? null;
  }

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    down = { x: e.clientX, y: e.clientY, yaw: tYaw, pitch: tPitch, id: e.pointerId };
    dragged = false;
  };
  const onMove = (e: PointerEvent) => {
    if (!down) {
      if (e.pointerType === 'mouse') el.style.cursor = pick(e) ? 'pointer' : '';
      return;
    }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragged && Math.hypot(dx, dy) > 5) {
      dragged = true;
      el.setPointerCapture(down.id);
      el.classList.add('is-dragging');
    }
    if (!dragged) return;
    tYaw = Math.max(-0.75, Math.min(0.75, down.yaw + dx * 0.006));
    tPitch = Math.max(-0.12, Math.min(0.22, down.pitch + dy * 0.003));
    if (resetBtn) resetBtn.hidden = false;
    stage.invalidate();
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    if (!dragged) {
      const hit = pick(e);
      explorerLayer.set(hit && hit !== explorerLayer.get() ? hit : hit ? null : explorerLayer.get());
    }
    if (el.hasPointerCapture(down.id)) el.releasePointerCapture(down.id);
    el.classList.remove('is-dragging');
    down = null;
  };
  const onReset = () => {
    tYaw = 0; tPitch = 0;
    if (resetBtn) resetBtn.hidden = true;
    stage.invalidate();
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  resetBtn?.addEventListener('click', onReset);

  return () => {
    unsub();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    resetBtn?.removeEventListener('click', onReset);
    stage.dispose();
  };
}
