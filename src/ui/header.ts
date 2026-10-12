import { scrollToTop } from '../motion/smooth';

/** Header lockup: the word "informatie" retracts once the reader leaves the top of the page,
 *  leaving the symbol alone; it returns when they scroll back up. A small hysteresis band
 *  stops it flickering at the threshold. */
export function initHeader(): () => void {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return () => {};
  const HIDE = 80, SHOW = 24;
  const NAV_FROM = 160;   // jump links stay put near the top of the page
  const NAV_DELTA = 6;    // ignore tiny jitters in scroll direction
  let compact = false;
  let menuOpen = false;   // declared up front: the scroll handler reads it on first run
  let navHidden = false;
  let lastY = window.scrollY;
  let raf = 0;
  const setNav = (hidden: boolean) => {
    if (hidden === navHidden) return;
    navHidden = hidden;
    header.classList.toggle('is-nav-hidden', hidden);
  };
  const update = () => {
    raf = 0;
    const y = window.scrollY;
    const next = compact ? y > SHOW : y > HIDE;
    if (next !== compact) {
      compact = next;
      header.classList.toggle('is-compact', compact);
    }
    // Jump links: away while reading down, back the moment the reader scrolls up.
    const dy = y - lastY;
    if (y < NAV_FROM) setNav(false);
    else if (dy > NAV_DELTA && !menuOpen && !header.contains(document.activeElement)) setNav(true);
    else if (dy < -NAV_DELTA) setNav(false);
    if (Math.abs(dy) > NAV_DELTA || y < NAV_FROM) lastY = y;
  };
  const onFocusIn = () => setNav(false);
  header.addEventListener('focusin', onFocusIn);

  // Mobile menu: the section links as a drop-down panel below 900px.
  const toggle = header.querySelector<HTMLButtonElement>('.nav-toggle');
  const nav = header.querySelector<HTMLElement>('.nav');
  const toggleLabel = toggle?.querySelector<HTMLElement>('.nav-toggle__label');
  const setMenu = (open: boolean, opts: { focus?: boolean } = {}) => {
    if (!toggle || open === menuOpen) return;
    menuOpen = open;
    header.classList.toggle('is-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (toggleLabel) toggleLabel.textContent = open ? 'Close' : 'Menu';
    if (open) { setNav(false); nav?.querySelector<HTMLElement>('a')?.focus(); }
    else if (opts.focus) toggle.focus();
  };
  const onToggle = () => setMenu(!menuOpen);
  const onNavClick = (e: Event) => { if ((e.target as Element).closest('a')) setMenu(false); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && menuOpen) setMenu(false, { focus: true }); };
  const onOutside = (e: PointerEvent) => { if (menuOpen && !header.contains(e.target as Node)) setMenu(false); };
  const onWide = () => { if (window.innerWidth > 900) setMenu(false); };
  toggle?.addEventListener('click', onToggle);
  nav?.addEventListener('click', onNavClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onOutside);
  window.addEventListener('resize', onWide);
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  // Logo: we're already on the homepage, so return to the top instead of reloading.
  // Modified clicks (new tab/window) keep the normal link behaviour.
  const brand = header.querySelector<HTMLAnchorElement>('.brand');
  const onBrand = (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    e.preventDefault();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollToTop();
    document.getElementById('top')?.focus({ preventScroll: true });
  };
  brand?.addEventListener('click', onBrand);

  return () => {
    window.removeEventListener('scroll', onScroll);
    header.removeEventListener('focusin', onFocusIn);
    toggle?.removeEventListener('click', onToggle);
    nav?.removeEventListener('click', onNavClick);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside);
    window.removeEventListener('resize', onWide);
    brand?.removeEventListener('click', onBrand);
    if (raf) cancelAnimationFrame(raf);
  };
}
