/* Site-wide drifting petals: the hero tree's blossom keeps falling past the hero, sparse and
   slow, carrying the evening theme down the page. Off for reduced motion; pauses when hidden. */

const COLORS = ['#E3411F', '#F04A23', '#F25E36', '#F4774F', '#F6936F', '#F8B096'];
const COUNT = 14;

interface Petal { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; c: number; sway: number; ph: number }

export function initPetals(): () => void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const canvas = document.createElement('canvas');
  canvas.className = 'petal-drift';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, DPR = 1, raf = 0, on = false, last = 0;

  const spawn = (p: Partial<Petal> = {}, anywhere = false): Petal => Object.assign(p, {
    x: anywhere ? Math.random() * W : W + 20 + Math.random() * 120,
    y: anywhere ? Math.random() * H : Math.random() * H * 0.7 - 40,
    vx: -(14 + Math.random() * 18), vy: 10 + Math.random() * 14,
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 1.2,
    s: 3 + Math.random() * 3.5, c: Math.floor(Math.random() * COLORS.length),
    sway: 10 + Math.random() * 16, ph: Math.random() * Math.PI * 2,
  }) as Petal;

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  };
  resize();
  const petals: Petal[] = Array.from({ length: COUNT }, () => spawn({}, true));

  const frame = (now: number) => {
    raf = 0;
    const t = now / 1000, dt = last ? Math.min(0.05, t - last) : 0;
    last = t;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of petals) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.x < -30 || p.y > H + 30) spawn(p);
      ctx.save();
      ctx.translate(p.x + Math.sin(t * 0.9 + p.ph) * p.sway, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = COLORS[p.c];
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.5, p.s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (on && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const update = () => {
    const past = hero ? window.scrollY > hero.offsetHeight * 0.6 : true;
    if (past === on) return;
    on = past;
    canvas.classList.toggle('is-on', on);
    if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  };
  const onVis = () => { if (on && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); } };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVis);
  update();

  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    if (raf) cancelAnimationFrame(raf);
    canvas.remove();
  };
}
