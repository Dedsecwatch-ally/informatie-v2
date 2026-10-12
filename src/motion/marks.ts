/* Marked words ink in as their headline comes into view (the hero's is marked by the arrival
   timeline instead). The state is a class on the headline, not the word, because SplitText
   re-creates the inner spans whenever it (re)splits lines. Without motion or JS the CSS default
   is simply "marked". */
export function initMarks(): () => void {
  const html = document.documentElement;
  html.classList.add('mark-pending');
  const heads = Array.from(document.querySelectorAll<HTMLElement>('.mark'))
    .map((m) => m.closest<HTMLElement>('h1, h2, h3'))
    .filter((h, i, all): h is HTMLElement => !!h && all.indexOf(h) === i && h.id !== 'hero-title');
  const timers: number[] = [];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      // A beat after the headline's own line reveal, so the two read as one gesture.
      timers.push(window.setTimeout(() => el.classList.add('marks-on'), 350));
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -22% 0px' });
  heads.forEach((h) => io.observe(h));
  return () => {
    io.disconnect();
    timers.forEach(clearTimeout);
    html.classList.remove('mark-pending');
    heads.forEach((h) => h.classList.remove('marks-on'));
  };
}
