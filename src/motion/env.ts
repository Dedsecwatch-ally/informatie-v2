const mq = (q: string) => window.matchMedia(q);

export const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
export const reducedMotion = () => mq(REDUCED_QUERY).matches;
export const finePointer = () => mq('(hover: hover) and (pointer: fine)').matches;
export const smallScreen = () => mq('(max-width: 720px)').matches;
