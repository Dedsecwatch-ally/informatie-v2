/* Hero tree at sunset: a gnarled ink trunk (soft-blurred, like ink bleeding into paper) rising
   from rocks and sweeping its limbs to the left in front of a low sun. Light scatters out of
   the sun in slow shafts, backlights the blossom nearest it and lifts as drifting motes.
   Red-orange → orange blossom is mixed from the signal palette; mist and paper keep it calm.

   Two canvases share one loop: the SKY (glow, sun, light shafts) spreads across the whole hero;
   the TREE (rocks, limbs, twigs, blossom, petals, motes) sits in front and can be masked to
   fade before the headline. Heavy parts are pre-rendered; only moving parts redraw.
   Renders only while visible; reduced motion draws a single still frame. */

const VW = 600, VH = 800;                       // virtual drawing space (anchored bottom-right)
const INK = '#141414';
// Deep → light: signal reds and oranges, then paper-mixed tints toward the outside of clusters.
const BLOSSOM = ['#B82D17', '#C2311A', '#D4361A', '#E3411F', '#F04A23', '#F25E36', '#F4774F', '#F6936F', '#F8B096', '#FACDBB'];
const MAX_BLOSSOMS = 6000;
const SUN: [number, number] = [330, 735];       // setting at the foot of the tree, left of the roots
const SUN_R = 104;
const RAY_SCALE = 0.33;                         // light shafts render at a third of CSS size
const HORIZON = 742;                            // the sun sinks below this line into the mist

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type P = [number, number];

/** Smooth curve through control points (Catmull-Rom), sampled evenly. */
function spline(ctrl: P[], samples: number): P[] {
  const out: P[] = [];
  for (let s = 0; s <= samples; s++) {
    const u = (s / samples) * (ctrl.length - 1);
    const i = Math.min(ctrl.length - 2, Math.floor(u));
    const t = u - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

interface Limb { pts: P[]; w0: number; w1: number; gnarl: number }
interface Blossom { lx: number; ly: number; r: number; c: number; t: number }
interface Twig {
  bx: number; by: number;
  pts: P[];
  w: number;
  blossoms: Blossom[];
  amp: number; phase: number; freq: number;
  t: number;
}
interface Petal { x: number; y: number; vx: number; vy: number; rot: number; vr: number; c: number; s: number; life: number }
interface Mote { x: number; y: number; vx: number; vy: number; r: number; tw: number; ph: number }

export interface TreeState { grow: number }

export function mountTree(canvas: HTMLCanvasElement, state: TreeState, opts: { reduced: boolean; sky?: HTMLCanvasElement | null }) {
  const ctx = canvas.getContext('2d')!;
  const skyCanvas = opts.sky ?? null;
  const sky = skyCanvas?.getContext('2d') ?? null;
  const rand = rng(31);
  const BASE: P = [520, 790];
  const limbs: Limb[] = [];
  const twigs: Twig[] = [];

  // ---- Skeleton: trunk + main limbs ------------------------------------------------------------
  const addLimb = (ctrl: P[], w0: number, w1: number, gnarl = 0.12) => {
    const pts = spline(ctrl, Math.max(24, ctrl.length * 10));
    limbs.push({ pts, w0, w1, gnarl });
    return pts;
  };
  addLimb([[520, 800], [545, 730], [505, 660], [540, 600], [495, 540], [440, 480]], 74, 30, 0.08);
  const sweep = addLimb([[455, 488], [380, 450], [300, 432], [215, 440], [140, 420], [70, 395], [20, 388]], 30, 5);
  const rise = addLimb([[468, 500], [488, 420], [458, 340], [478, 262], [452, 190], [470, 130]], 24, 5);
  const upLeft = addLimb([[430, 470], [370, 392], [330, 318], [270, 262], [215, 236]], 17, 4);
  const right = addLimb([[505, 560], [548, 520], [580, 470], [612, 440]], 13, 4);
  const low = addLimb([[470, 620], [420, 600], [372, 610], [330, 590]], 11, 3.5);
  const crown = addLimb([[462, 300], [410, 240], [360, 200], [300, 175]], 10, 3);

  // ---- Secondary branches → twigs with blossom ---------------------------------------------------
  const dist = (x: number, y: number) => Math.hypot(x - BASE[0], y - BASE[1]) / 720;
  let blossomBudget = MAX_BLOSSOMS;

  function twig(bx: number, by: number, ang: number, len: number, w: number, clusterScale: number) {
    const ctrl: P[] = [[0, 0]];
    let x = 0, y = 0, a = ang;
    for (let i = 0; i < 4; i++) {
      a += (rand() - 0.5) * 0.5 - 0.05;
      x += Math.cos(a) * len / 4; y += Math.sin(a) * len / 4;
      ctrl.push([x, y]);
    }
    const pts = spline(ctrl, 10);
    const blossoms: Blossom[] = [];
    const n = Math.min(blossomBudget, Math.round((30 + rand() * 24) * clusterScale));
    blossomBudget -= n;
    const tipT = Math.min(0.92, 0.32 + dist(bx, by) * 0.6);
    for (let k = 0; k < n; k++) {
      // Clusters gather toward the tip; tones lighten toward the outside of each cluster.
      const along = pts[Math.min(pts.length - 1, Math.floor((0.25 + 0.75 * Math.sqrt(rand())) * pts.length))];
      const spread = 12 + len * 0.34;
      const ox = (rand() - 0.5) * spread * 2, oy = (rand() - 0.5) * spread * 1.6 - 3;
      const edge = Math.min(1, Math.hypot(ox, oy) / spread);
      const c = Math.max(0, Math.min(BLOSSOM.length - 1, Math.round(edge * 6 + rand() * 4 - 1)));
      blossoms.push({ lx: along[0] + ox, ly: along[1] + oy, r: 1.5 + rand() * 2.2, c, t: Math.min(0.98, tipT + rand() * 0.14) });
    }
    twigs.push({ bx, by, pts, w, blossoms, amp: 0.03 + rand() * 0.04, phase: rand() * Math.PI * 2, freq: 0.5 + rand() * 0.45, t: tipT });
  }

  function branchesFrom(pts: P[], count: number, len: number, w: number, from = 0.25) {
    for (let k = 0; k < count; k++) {
      const i = Math.floor(pts.length * (from + (1 - from) * (k + rand() * 0.8) / count));
      const p = pts[Math.min(pts.length - 2, i)], q = pts[Math.min(pts.length - 1, i + 1)];
      const dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const side = k % 2 ? 1 : -1;
      let ang = dir + side * (0.5 + rand() * 0.5);
      ang = ang * 0.6 + (-Math.PI / 2 + (rand() - 0.5) * 1.3) * 0.4;
      const L = len * (0.7 + rand() * 0.5);
      const bctrl: P[] = [p];
      let x = p[0], y = p[1], a = ang;
      for (let s = 0; s < 3; s++) { a += (rand() - 0.5) * 0.35; x += Math.cos(a) * L / 3; y += Math.sin(a) * L / 3; bctrl.push([x, y]); }
      const bpts = addLimb(bctrl, w, w * 0.35, 0.08);
      const tip = bpts[bpts.length - 1];
      const mid = bpts[Math.floor(bpts.length * 0.55)];
      twig(tip[0], tip[1], a + (rand() - 0.5) * 0.6, 28 + rand() * 26, w * 0.3, 1.2);
      twig(mid[0], mid[1], a + (rand() < 0.5 ? -0.8 : 0.8), 22 + rand() * 20, w * 0.25, 1);
      twig(tip[0], tip[1], a + (rand() < 0.5 ? -1.1 : 1.1), 20 + rand() * 18, w * 0.22, 0.9);
    }
  }
  branchesFrom(sweep, 13, 64, 7, 0.12);
  branchesFrom(rise, 11, 58, 6, 0.15);
  branchesFrom(upLeft, 8, 52, 5, 0.15);
  branchesFrom(crown, 6, 46, 4, 0.1);
  branchesFrom(right, 4, 40, 4, 0.25);
  branchesFrom(low, 4, 40, 3.5, 0.25);
  for (const L of [sweep, rise, upLeft, right, low, crown]) {
    const e = L[L.length - 1], d = L[L.length - 3];
    const a = Math.atan2(e[1] - d[1], e[0] - d[0]);
    twig(e[0], e[1], a - 0.2, 36, 1.6, 1.5);
    twig(e[0], e[1], a + 0.5, 28, 1.4, 1.2);
  }

  // ---- Layout & pre-rendered layers ---------------------------------------------------------------
  let W = 0, H = 0, S = 1, OX = 0, OY = 0, DPR = 1;
  let SW = 0, SH = 0, SOX = 0, SOY = 0;              // sky canvas (may be larger than the tree's)
  const treeLayer = document.createElement('canvas');
  const skyLayer = document.createElement('canvas');
  const rays = document.createElement('canvas');
  let glowSprite: HTMLCanvasElement | null = null;
  const sprites = new Map<string, HTMLCanvasElement>();
  const X = (x: number) => OX + x * S;
  const Y = (y: number) => OY + y * S;

  function sprite(ci: number, r: number) {
    const rr = Math.max(0.8, Math.round(r * S * DPR * 2) / 2);
    const key = `${ci}|${rr}`;
    let c = sprites.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    const size = Math.ceil(rr * 3.4) + 2;
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const cx = size / 2;
    g.fillStyle = BLOSSOM[ci];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * rr * 0.6, cx + Math.sin(a) * rr * 0.6, rr * 0.62, rr * 0.5, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(184, 45, 23, 0.55)';
    g.beginPath(); g.arc(cx, cx, rr * 0.24, 0, Math.PI * 2); g.fill();
    sprites.set(key, c);
    return c;
  }

  function limbPath(g: CanvasRenderingContext2D, L: Limb, seed: number) {
    const n = L.pts.length;
    const left: P[] = [], right: P[] = [];
    for (let i = 0; i < n; i++) {
      const p = L.pts[i], q = L.pts[Math.min(n - 1, i + 1)], o = L.pts[Math.max(0, i - 1)];
      const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const t = i / (n - 1);
      const w = (L.w0 + (L.w1 - L.w0) * Math.pow(t, 0.8)) / 2;
      const knot = 1 + L.gnarl * Math.sin(i * 0.9 + seed) * Math.sin(i * 0.37 + seed * 2);
      left.push([X(p[0] + nx * w * knot), Y(p[1] + ny * w * knot)]);
      right.push([X(p[0] - nx * w * (2 - knot)), Y(p[1] - ny * w * (2 - knot))]);
    }
    g.beginPath();
    left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
  }

  /** Sunset sky: a wide warm bloom fading into paper, and the sun's disc. */
  function drawSky() {
    if (!sky || !skyCanvas) return;
    // Soft gradients only: 1× density is indistinguishable and a quarter of the GPU memory.
    skyLayer.width = Math.round(SW);
    skyLayer.height = Math.round(SH);
    const g = skyLayer.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sx = SOX + X(SUN[0]), sy = SOY + Y(SUN[1]);
    const R = Math.max(SW, SH) * 1.05;
    const glow = g.createRadialGradient(sx, sy, SUN_R * S * 0.6, sx, sy, R);
    glow.addColorStop(0, 'rgba(255, 236, 214, 0.95)');
    glow.addColorStop(0.08, 'rgba(252, 206, 176, 0.85)');
    glow.addColorStop(0.2, 'rgba(247, 160, 120, 0.55)');
    glow.addColorStop(0.38, 'rgba(242, 120, 80, 0.22)');
    glow.addColorStop(0.62, 'rgba(242, 160, 120, 0.08)');
    glow.addColorStop(1, 'rgba(242, 241, 236, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, SW, SH);
    // Tonal depth (not a flat peach field):
    // · a faint, diffused glow behind the heart of the canopy;
    const cx = SOX + X(370), cy = SOY + Y(330);
    const canopy = g.createRadialGradient(cx, cy, 0, cx, cy, 300 * S);
    canopy.addColorStop(0, 'rgba(255, 228, 204, 0.38)');
    canopy.addColorStop(0.6, 'rgba(252, 214, 188, 0.14)');
    canopy.addColorStop(1, 'rgba(252, 214, 188, 0)');
    g.fillStyle = canopy;
    g.fillRect(0, 0, SW, SH);
    // · warm ivory across the headline side, holding almost flat until the middle of the hero,
    //   so the peach stays around the tree and the text sits on near-ivory.
    const ivory = g.createLinearGradient(0, 0, SW, 0);
    ivory.addColorStop(0, 'rgba(246, 242, 233, 0.94)');
    ivory.addColorStop(0.32, 'rgba(246, 242, 233, 0.88)');
    ivory.addColorStop(0.5, 'rgba(246, 240, 230, 0.5)');
    ivory.addColorStop(0.66, 'rgba(246, 238, 226, 0)');
    g.fillStyle = ivory;
    g.fillRect(0, 0, SW, SH);

    // A warm horizon band where the sun sets.
    const hz = g.createLinearGradient(0, sy - 140 * S, 0, sy + 200 * S);
    hz.addColorStop(0, 'rgba(250, 190, 150, 0)');
    hz.addColorStop(0.55, 'rgba(250, 190, 150, 0.22)');
    hz.addColorStop(1, 'rgba(250, 190, 150, 0)');
    g.fillStyle = hz;
    g.fillRect(0, sy - 140 * S, SW, 340 * S);
    // The sun: bright core, soft warm rim.
    const r = SUN_R * S;
    const disc = g.createRadialGradient(sx, sy - r * 0.2, r * 0.1, sx, sy, r * 1.15);
    disc.addColorStop(0, 'rgba(255, 252, 244, 1)');
    disc.addColorStop(0.6, 'rgba(255, 233, 210, 1)');
    disc.addColorStop(0.86, 'rgba(250, 196, 160, 0.95)');
    disc.addColorStop(1, 'rgba(248, 176, 140, 0)');
    g.fillStyle = disc;
    // Half-set: only the part above the horizon shows.
    g.save();
    g.beginPath(); g.rect(0, 0, SW, SOY + Y(HORIZON)); g.clip();
    g.beginPath(); g.arc(sx, sy, r * 1.15, 0, Math.PI * 2); g.fill();
    g.restore();

    // Light shafts: soft wedges fanning out of the sun, blurred; rotated slowly each frame.
    // The shafts are heavily blurred, so a third of CSS size is plenty. (At CSS × DPR this was a
    // ~6600 px square texture on retina screens and stalled the GPU during the arrival.)
    const RR = Math.ceil(R * 1.1);
    rays.width = rays.height = Math.round(RR * 2 * RAY_SCALE);
    const rg = rays.getContext('2d')!;
    rg.setTransform(RAY_SCALE, 0, 0, RAY_SCALE, 0, 0);
    rg.filter = `blur(${Math.max(2, 10 * S * RAY_SCALE)}px)`;
    const rr = rng(5);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rr() * 0.2;
      const wdt = 0.025 + rr() * 0.06;
      const len = RR * (0.55 + rr() * 0.45);
      const grad = rg.createRadialGradient(RR, RR, r * 0.8, RR, RR, len);
      grad.addColorStop(0, `rgba(255, 244, 228, ${0.55 + rr() * 0.3})`);
      grad.addColorStop(0.5, 'rgba(255, 226, 198, 0.18)');
      grad.addColorStop(1, 'rgba(255, 226, 198, 0)');
      rg.fillStyle = grad;
      rg.beginPath();
      rg.moveTo(RR, RR);
      rg.arc(RR, RR, len, a - wdt, a + wdt);
      rg.closePath();
      rg.fill();
    }
    rg.filter = 'none';
  }

  function drawTreeLayer() {
    treeLayer.width = Math.round(W * DPR);
    treeLayer.height = Math.round(H * DPR);
    const g = treeLayer.getContext('2d')!;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);

    // Rocks the roots grip.
    g.fillStyle = INK;
    g.filter = `blur(${Math.max(1.5, 2.5 * S)}px)`;
    const rocks: Array<[number, number, number, number, number]> = [
      [530, 800, 110, 52, -0.1], [440, 812, 80, 30, 0.1], [600, 790, 70, 60, 0], [380, 818, 70, 18, 0], [560, 760, 50, 26, -0.3],
    ];
    rocks.forEach(([x, y, rx, ry, r]) => { g.beginPath(); g.ellipse(X(x), Y(y), rx * S, ry * S, r, 0, Math.PI * 2); g.fill(); });

    // Limbs: a wide blurred ink bleed underneath, then the body with a slight softness.
    limbs.forEach((L, i) => {
      g.filter = `blur(${Math.max(3, 8 * S)}px)`;
      g.globalAlpha = 0.6;
      limbPath(g, L, i * 1.7);
      g.fill();
    });
    g.globalAlpha = 1;
    g.filter = `blur(${Math.max(0.6, 1.1 * S)}px)`;
    limbs.forEach((L, i) => { limbPath(g, L, i * 1.7); g.fill(); });
    g.filter = 'none';

    // Rim light: the sun catches the edges of the limbs facing it.
    g.globalCompositeOperation = 'source-atop';
    const rim = g.createRadialGradient(X(SUN[0]), Y(SUN[1]), SUN_R * S * 0.8, X(SUN[0]), Y(SUN[1]), 190 * S);
    rim.addColorStop(0, 'rgba(255, 196, 150, 0.22)');
    rim.addColorStop(1, 'rgba(255, 196, 150, 0)');
    g.fillStyle = rim;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';

    // Bark: faint lighter fibres along the trunk and heavy limbs.
    g.strokeStyle = 'rgba(120, 118, 112, 0.35)';
    g.lineWidth = Math.max(0.5, 0.9 * S);
    limbs.filter((L) => L.w0 >= 20).forEach((L) => {
      for (let k = -2; k <= 2; k++) {
        if (!k) continue;
        g.beginPath();
        L.pts.forEach(([x, y], i) => {
          const t = i / (L.pts.length - 1);
          const w = (L.w0 + (L.w1 - L.w0) * t) * 0.18 * k * (1 + 0.4 * Math.sin(i * 0.6 + k));
          i ? g.lineTo(X(x + w), Y(y + w * 0.3)) : g.moveTo(X(x + w), Y(y + w * 0.3));
        });
        g.stroke();
      }
    });

    // Mist over the roots and rocks.
    const mist = g.createLinearGradient(0, Y(690), 0, H);
    mist.addColorStop(0, 'rgba(242, 241, 236, 0)');
    mist.addColorStop(0.7, 'rgba(242, 241, 236, 0.55)');
    mist.addColorStop(1, 'rgba(242, 241, 236, 0.9)');
    g.fillStyle = mist;
    g.fillRect(0, Y(690), W, H - Y(690));
  }

  function makeGlowSprite() {
    const c = document.createElement('canvas');
    const s = 32;
    c.width = c.height = s;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255, 250, 240, 1)');
    gr.addColorStop(0.35, 'rgba(255, 226, 196, 0.6)');
    gr.addColorStop(1, 'rgba(255, 210, 170, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    return c;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    // Anchored bottom-right so the trunk stays rooted in the corner. A wide canvas (the hero
    // background) fits by height so the whole tree shows; a narrow one (mobile) covers.
    S = W > H ? Math.min((H / VH) * 1.06, W / VW) : Math.max(W / VW, H / VH);
    OX = W - VW * S;
    OY = H - VH * S;
    if (skyCanvas) {
      const sr = skyCanvas.getBoundingClientRect();
      SW = Math.max(1, Math.round(sr.width));
      SH = Math.max(1, Math.round(sr.height));
      SOX = r.left - sr.left;
      SOY = r.top - sr.top;
      skyCanvas.width = Math.round(SW * DPR);
      skyCanvas.height = Math.round(SH * DPR);
    }
    sprites.clear();
    glowSprite = glowSprite ?? makeGlowSprite();
    drawSky();
    drawTreeLayer();
    draw(performance.now());
  }

  // ---- Petals & motes ----------------------------------------------------------------------------
  const petals: Petal[] = [];
  const spawnPetal = (p?: Petal): Petal => {
    const tw = twigs[Math.floor(Math.random() * twigs.length)];
    const b = tw.blossoms[Math.floor(Math.random() * tw.blossoms.length)] ?? { lx: 0, ly: 0 };
    const q = p ?? ({} as Petal);
    q.x = tw.bx + b.lx; q.y = tw.by + b.ly;
    q.vx = -5 - Math.random() * 9; q.vy = 7 + Math.random() * 9;
    q.rot = Math.random() * Math.PI; q.vr = (Math.random() - 0.5) * 1.4;
    q.c = 3 + Math.floor(Math.random() * 6); q.s = 1.6 + Math.random() * 1.6;
    q.life = 0;
    return q;
  };
  for (let i = 0; i < 12; i++) { const p = spawnPetal(); p.life = Math.random() * 8; petals.push(p); }

  // Light motes: concentrated around the sun, a few drifting further out.
  const motes: Mote[] = [];
  for (let i = 0; i < 70; i++) {
    const a = Math.PI + Math.random() * Math.PI, d = Math.pow(Math.random(), 0.7) * 420;
    motes.push({
      x: SUN[0] + Math.cos(a) * d, y: SUN[1] + Math.sin(a) * d * 0.8,
      vx: -3 - Math.random() * 5, vy: -2 - Math.random() * 4,
      r: 1.5 + Math.random() * 3.5, tw: 0.6 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2,
    });
  }

  // ---- Frame ------------------------------------------------------------------------------------
  let last = 0;
  function draw(now: number) {
    const t = now / 1000;
    const dt = last ? Math.min(0.05, t - last) : 0;
    last = t;
    const grow = Math.max(0, Math.min(1, state.grow));
    const still = opts.reduced;

    // SKY: glow + sun, then slow light shafts scattering out of it.
    if (sky && skyCanvas) {
      sky.setTransform(DPR, 0, 0, DPR, 0, 0);
      sky.clearRect(0, 0, SW, SH);
      const dawn = Math.min(1, grow * 1.4);
      if (dawn > 0) {
        sky.globalAlpha = dawn;
        sky.drawImage(skyLayer, 0, 0, SW, SH);
        const sx = SOX + X(SUN[0]), sy = SOY + Y(SUN[1]);
        const rs = rays.width / RAY_SCALE;
        // Shafts fan up into the sky only — nothing shines down into the ground.
        sky.save();
        sky.beginPath(); sky.rect(0, 0, SW, SOY + Y(HORIZON)); sky.clip();
        sky.globalCompositeOperation = 'lighter';
        for (const [speed, alpha, phase] of [[0.012, 0.42, 0], [-0.008, 0.3, 1.7]] as const) {
          sky.save();
          sky.translate(sx, sy);
          sky.rotate(still ? phase : t * speed + phase);
          sky.globalAlpha = dawn * alpha * (still ? 1 : 0.85 + 0.15 * Math.sin(t * 0.5 + phase));
          sky.drawImage(rays, -rs / 2, -rs / 2, rs, rs);
          sky.restore();
        }
        sky.globalCompositeOperation = 'source-over';
        sky.restore();
        sky.globalAlpha = 1;
      }
    }

    // TREE
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (grow > 0) {
      ctx.save();
      if (grow < 1) {
        ctx.beginPath();
        ctx.arc(X(BASE[0]), Y(BASE[1]), Math.max(W, H) * 1.4 * Math.min(1, grow * 1.3), 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(treeLayer, 0, 0, W, H);
      ctx.restore();
    }

    const gust = still ? 0 : 0.55 + 0.45 * Math.sin(t * 0.23) * Math.sin(t * 0.11 + 1.3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.85)';
    for (const tw of twigs) {
      const k = grow <= tw.t ? 0 : Math.min(1, (grow - tw.t) / 0.15);
      if (k <= 0) continue;
      const a = still ? 0 : tw.amp * gust * Math.sin(t * tw.freq * Math.PI + tw.phase + tw.bx * 0.012);
      const c = Math.cos(a), s = Math.sin(a);
      const bx = X(tw.bx), by = Y(tw.by);
      ctx.lineWidth = Math.max(0.5, tw.w * S);
      ctx.beginPath();
      const n = Math.max(1, Math.round((tw.pts.length - 1) * k));
      for (let i = 0; i <= n; i++) {
        const [px, py] = tw.pts[i];
        const x = bx + (px * c - py * s) * S, y = by + (px * s + py * c) * S;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      for (const b of tw.blossoms) {
        const bk = grow <= b.t ? 0 : Math.min(1, (grow - b.t) / 0.12);
        if (bk <= 0) continue;
        const flutter = still ? 0 : Math.sin(t * 2 + b.lx * 0.3) * 0.5 * gust;
        const x = bx + (b.lx * c - b.ly * s) * S + flutter;
        const y = by + (b.lx * s + b.ly * c) * S;
        const img = sprite(b.c, b.r * bk);
        const w = img.width / DPR;
        ctx.drawImage(img, x - w / 2, y - w / 2, w, w);
      }
    }

    // Backlight: the blossom nearest the sun glows as light passes through it.
    if (grow > 0.5) {
      ctx.globalCompositeOperation = 'screen';
      const bl = ctx.createRadialGradient(X(SUN[0]), Y(SUN[1]), SUN_R * S * 0.6, X(SUN[0]), Y(SUN[1]), 210 * S);
      bl.addColorStop(0, `rgba(255, 214, 180, ${0.22 * Math.min(1, (grow - 0.5) * 2)})`);
      bl.addColorStop(1, 'rgba(255, 214, 180, 0)');
      ctx.fillStyle = bl;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (grow >= 1) {
      // Drifting petals.
      for (const p of petals) {
        if (!still && dt > 0) {
          p.life += dt;
          p.x += (p.vx - 8 * gust) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y > VH + 20 || p.x < -40 || p.life > 16) spawnPetal(p);
        }
        ctx.save();
        ctx.translate(X(p.x + Math.sin(p.life * 1.6) * 6), Y(p.y));
        ctx.rotate(p.rot);
        ctx.fillStyle = BLOSSOM[p.c];
        ctx.globalAlpha = Math.min(1, p.life * 1.2) * 0.85;
        ctx.beginPath(); ctx.ellipse(0, 0, p.s * S * 1.5, p.s * S * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Light motes: warm specks of scattered light, twinkling as they drift up and left.
      if (glowSprite) {
        for (const m of motes) {
          if (!still && dt > 0) {
            m.x += (m.vx - 4 * gust) * dt; m.y += m.vy * dt;
            if (m.x < -20 || m.y < -20) {
              const a = Math.PI + Math.random() * Math.PI, d = Math.pow(Math.random(), 0.7) * 420;
              m.x = SUN[0] + Math.cos(a) * d + 60; m.y = SUN[1] + Math.sin(a) * d * 0.8 + 40;
            }
          }
          const tw = still ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * m.tw + m.ph));
          const size = m.r * S * 4;
          ctx.globalAlpha = tw * 0.9;
          ctx.drawImage(glowSprite, X(m.x) - size / 2, Y(m.y) - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- Loop: only while visible -------------------------------------------------------------------
  let raf = 0, visible = false;
  const loop = (now: number) => {
    raf = 0;
    draw(now);
    if (visible && !document.hidden && (!opts.reduced || state.grow < 1)) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(canvas);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  if (skyCanvas) ro.observe(skyCanvas);
  const onVis = () => kick();
  document.addEventListener('visibilitychange', onVis);
  resize();

  return {
    /** Redraw now (e.g. while the arrival timeline drives `state.grow`). */
    kick,
    dispose() {
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
