/** Choice response (240 ms): the comparison re-weights; every option stays visible. */
const PREFS: Record<string, { label: string; match: string }> = {
  cost: { label: 'Lower cost', match: 'A' },
  risk: { label: 'Less risk', match: 'C' },
  flex: { label: 'More flexibility', match: 'B' },
};

export function initPreferences() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.pref[data-pref]');
  const note = document.getElementById('pref-note');
  let current: string | null = null;

  const set = (key: string | null) => {
    current = key;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pref === key)));
    const match = key ? PREFS[key].match : null;
    document.querySelectorAll<HTMLElement>('.opt').forEach((card) => {
      const isMatch = card.dataset.opt === match;
      card.classList.toggle('is-match', isMatch);
      const flag = card.querySelector('.opt__flag');
      // Status is stated in words and a shape, never by colour alone.
      if (flag) flag.textContent = isMatch ? 'Matches your priority ■' : '';
      card.querySelectorAll<HTMLElement>('[data-crit]').forEach((row) => row.classList.toggle('is-focus', row.dataset.crit === key));
    });
    if (note) {
      note.textContent = key
        ? `Highlighted because you chose “${PREFS[key].label}”. Every option stays visible.`
        : 'No priority set — all options shown equally.';
    }
  };

  buttons.forEach((b) => b.addEventListener('click', () => set(current === b.dataset.pref ? null : b.dataset.pref!)));
  document.getElementById('pref-skip')?.addEventListener('click', () => set(null));
}
