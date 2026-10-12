import { initAccordions } from './accordions';
import { initHeader } from './header';
import { initExplorer, initFrameParts } from './explain';
import { initPreferences } from './preferences';
import { initStages } from './stages';
import { initSubscribe } from './subscribe';

export function initUI() {
  initHeader();
  initStages();
  initAccordions();
  initPreferences();
  initSubscribe();
  initFrameParts();
  initExplorer();
}
