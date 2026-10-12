import { scrollToTarget } from '../motion/smooth';

/** Progressive reveal (200–280 ms): panels open by height, the summary above never moves. */
function setOpen(btn: HTMLButtonElement, open: boolean) {
  const panel = document.getElementById(btn.getAttribute('aria-controls') ?? '');
  btn.setAttribute('aria-expanded', String(open));
  if (panel) {
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
  }
  const sign = btn.querySelector('.sign');
  if (sign) sign.textContent = open ? '−' : '+';
  // Keep the audience figure in step with the open item.
  if (btn.dataset.group === 'aud') {
    const id = btn.getAttribute('aria-controls')?.replace('aud-', '');
    document.querySelectorAll<SVGElement>(`[data-aud="${id}"]`).forEach((n) => n.classList.toggle('is-active', open));
  }
}

export function openAccordion(id: string) {
  const btn = document.querySelector<HTMLButtonElement>(`.acc[aria-controls="${id}"]`);
  if (btn) setOpen(btn, true);
  return btn;
}

export function initAccordions() {
  const all = document.querySelectorAll<HTMLButtonElement>('.acc');
  all.forEach((btn) => {
    setOpen(btn, btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      const group = btn.dataset.group;
      if (group && open) {
        all.forEach((other) => { if (other !== btn && other.dataset.group === group) setOpen(other, false); });
      }
      setOpen(btn, open);
    });
  });

  const show = document.getElementById('show-evidence');
  show?.addEventListener('click', () => {
    const btn = openAccordion('p-ev');
    btn?.focus({ preventScroll: true });
    const rec = btn?.closest('.rec');
    if (rec) scrollToTarget(rec);
  });
}
