/**
 * Tutorial-Mode-Setup
 *
 * Versteckt alle Panels ausser Code und Preview, damit Tutorial-
 * Aufnahmen aufgeräumt wirken. Geht durch das `__dragTest.hidePanel`
 * Test-API-Surface — also dieselbe Logic wie der View-Menu-Toggle,
 * nur skript-getrieben.
 */

import type { DemoAction } from '../types'

const PANELS_TO_HIDE = ['prompt', 'files', 'components', 'design-system', 'property']

export function tutorialMode(): DemoAction[] {
  return [
    {
      action: 'execute',
      code: `
        (async () => {
          const deadline = Date.now() + 3000;
          while (Date.now() < deadline) {
            if (window.__dragTest && typeof window.__dragTest.hidePanel === 'function') break;
            await new Promise(r => setTimeout(r, 50));
          }
          const dt = window.__dragTest;
          if (!dt || typeof dt.hidePanel !== 'function') {
            console.warn('[tutorial-mode] __dragTest.hidePanel unavailable — panels stay default');
            return;
          }
          for (const name of ${JSON.stringify(PANELS_TO_HIDE)}) {
            try { dt.hidePanel(name); } catch (e) { console.warn('hidePanel failed for', name, e); }
          }
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'Tutorial-Mode: nur Code + Preview sichtbar',
    },
  ]
}
