import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { reducedMotion, smallScreen } from '../motion/env';

/** Brand palette (sRGB hex). Signal is reserved for the person/decision. */
export const C = {
  paper: '#F2F1EC',
  ink: '#141414',
  signal: '#F04A23',
  signalDeep: '#D4361A',
  graphite: '#1C1C1C',
  slate: '#555555',
  stone: '#D4D1C9',
  bone: '#E4E1D8',
} as const;

export interface FitBox { width: number; height: number }
/** A fixed box, or one chosen per aspect ratio (portrait screens can frame tighter). */
export type Fit = FitBox | ((aspect: number) => FitBox);

export interface Stage {
  readonly el: HTMLElement;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  readonly reduced: boolean;
  width: number;
  height: number;
  /** Request a single render on the next frame (no-op while off-screen). */
  invalidate(): void;
  /** Per-frame updater; return true while still animating to keep the loop alive. */
  onFrame(fn: (dt: number) => boolean): void;
  /** Called after every render — used to position HTML labels. */
  afterRender(fn: () => void): void;
  onResize(fn: () => void): void;
  setFit(fit: Fit): void;
  lineMaterial(color: string, width?: number, opts?: { opacity?: number; dashed?: boolean; dash?: number; gap?: number }): LineMaterial;
  dispose(): void;
}

export interface StageOptions {
  fit: Fit;
  /** Camera direction from target (normalised internally). */
  view: Vector3;
  target?: Vector3;
}

export function createStage(el: HTMLElement, opts: StageOptions): Stage {
  const reduced = reducedMotion();
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen() ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  el.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const target = opts.target ?? new Vector3();
  camera.position.copy(opts.view.clone().normalize().multiplyScalar(80).add(target));
  camera.lookAt(target);

  // Matte, print-like light: top faces read as paper, sides fall to bone and stone.
  // Values are in linear space (three ≥ r155: intensity π reproduces the base colour).
  scene.add(new AmbientLight(0xffffff, 0.6 * Math.PI));
  const sun = new DirectionalLight(0xffffff, 0.5 * Math.PI);
  sun.position.set(0.24, 0.8, 0.54).multiplyScalar(10);
  scene.add(sun);

  const lineMats = new Set<LineMaterial>();
  const updaters: Array<(dt: number) => boolean> = [];
  const post: Array<() => void> = [];
  const resizers: Array<() => void> = [];
  let fit = opts.fit;
  let visible = false;
  let raf = 0;
  let last = 0;

  const stage: Stage = {
    el, renderer, scene, camera, reduced,
    width: 1, height: 1,
    invalidate: request,
    onFrame: (fn) => { updaters.push(fn); request(); },
    afterRender: (fn) => { post.push(fn); },
    onResize: (fn) => { resizers.push(fn); },
    setFit(next) { fit = next; resize(); },
    lineMaterial(color, width = 1.2, o = {}) {
      const m = new LineMaterial({
        color: new Color(color).getHex(),
        linewidth: width,
        worldUnits: false,
        transparent: true,
        opacity: o.opacity ?? 1,
        dashed: !!o.dashed,
        dashSize: o.dash ?? 0.12,
        gapSize: o.gap ?? 0.12,
      });
      m.resolution.set(stage.width, stage.height);
      lineMats.add(m);
      return m;
    },
    dispose,
  };

  function request() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    let again = false;
    for (const fn of updaters) again = fn(dt) || again;
    renderer.render(scene, camera);
    for (const fn of post) fn();
    if (again) request();
    else last = 0;
  }

  function resize() {
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    stage.width = w;
    stage.height = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const box = typeof fit === 'function' ? fit(aspect) : fit;
    const halfH = Math.max(box.height / 2, box.width / 2 / aspect);
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    lineMats.forEach((m) => m.resolution.set(w, h));
    resizers.forEach((fn) => fn());
    request();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(el);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
  });
  io.observe(el);
  const onVis = () => { if (!document.hidden) request(); };
  document.addEventListener('visibilitychange', onVis);
  resize();

  function dispose() {
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    if (raf) cancelAnimationFrame(raf);
    scene.traverse((o) => {
      const any = o as Partial<Mesh>;
      any.geometry?.dispose();
      const mat = any.material as Material | Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose()); else mat?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return stage;
}

/** 1.2 px ink outline of a geometry's hard edges (the brand's isometric line art). */
export function edgeLines(geometry: BufferGeometry, mat: LineMaterial): LineSegments2 {
  const eg = new EdgesGeometry(geometry, 20);
  const g = new LineSegmentsGeometry().setPositions(eg.attributes.position.array as Float32Array);
  eg.dispose();
  return new LineSegments2(g, mat);
}

/** Line segments from a flat list of [x,y,z, x,y,z, …] pairs. */
export function segments(points: number[], mat: LineMaterial): LineSegments2 {
  const g = new LineSegmentsGeometry().setPositions(points);
  const l = new LineSegments2(g, mat);
  l.computeLineDistances();
  return l;
}

/** Faces pushed back slightly so outlines always sit on top without z-fighting. */
export function matteMaterial(color: string, opts: { basic?: boolean } = {}) {
  const params = {
    color: new Color(color),
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  };
  return opts.basic ? new MeshBasicMaterial(params) : new MeshLambertMaterial(params);
}

/** Critically-damped approach toward a target; `rate` ≈ 1/time-constant. */
export function damp(current: number, target: number, rate: number, dt: number) {
  if (!isFinite(rate)) return target;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function worldToScreen(o: Object3D | Vector3, stage: Stage, out = new Vector3()) {
  if (o instanceof Vector3) out.copy(o); else o.getWorldPosition(out);
  out.project(stage.camera);
  out.x = (out.x * 0.5 + 0.5) * stage.width;
  out.y = (-out.y * 0.5 + 0.5) * stage.height;
  return out;
}
