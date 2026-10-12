import { swapText } from './swap';

const STAGES: Record<string, { word: string; title: string; body: string; example: string }> = {
  understand: {
    word: 'Understand',
    title: 'Start with what it means.',
    body: 'We lead with the plain-language meaning, then show the detail behind it. You always know the point before the fine print.',
    example: '“This plan’s fees rise after the first year” appears before the full fee table.',
  },
  explore: {
    word: 'Explore',
    title: 'See the full range.',
    body: 'Every reasonable option is shown — including keeping what you have. Nothing is hidden to make one choice look better.',
    example: 'Three plans, plus “stay with your current one”, side by side.',
  },
  compare: {
    word: 'Compare',
    title: 'Compare on the same terms.',
    body: 'Options sit side by side on identical criteria, with uncertainty stated plainly where the evidence is thin.',
    example: 'Cost, risk and flexibility for every option — in the same order, every time.',
  },
  decide: {
    word: 'Decide',
    title: 'Choose — or come back later.',
    body: 'Nothing is pre-selected and there is no countdown. Save your comparison and return whenever you are ready.',
    example: '“Save comparison” sits right next to “Choose this option”.',
  },
};

export function initStages() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.stage');
  const fields = document.querySelectorAll<HTMLElement>('[data-m]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.stage!;
    const data = STAGES[key];
    if (!data || b.getAttribute('aria-pressed') === 'true') return;
    buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    swapText(fields, () => fields.forEach((el) => {
      const v = data[el.dataset.m as keyof typeof data];
      if (v != null) el.textContent = v;
    }));
  }));
}
