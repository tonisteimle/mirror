/**
 * Tutorial-Recording: Property-Panel
 *
 * Selektiere ein Element im Preview, dann setze drei Properties über
 * das rechts liegende Property-Panel: padding, background-color, radius.
 * Jede Änderung erscheint sofort in der Code-Zeile.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-05-property-panel.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-05-property-panel.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' + '\n' + 'Frame w 240, h 160, bg #27272a'

export const demoScript: DemoScript = {
  name: 'Tutorial · Property-Panel',
  description: 'Padding, Background und Radius über das Property-Panel ändern',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    // Property-Panel sichtbar lassen, andere Panels weg
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
          if (!dt || typeof dt.hidePanel !== 'function') return;
          for (const name of ['prompt', 'files', 'components', 'design-system']) {
            try { dt.hidePanel(name); } catch (e) { /* ignore */ }
          }
          // explizit Property-Panel zeigen
          if (typeof dt.showPanel === 'function') {
            try { dt.showPanel('property'); } catch (e) { /* ignore */ }
          }
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'Nur Property-Panel + Code + Preview sichtbar',
    },
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Frame 240×160' }),
    { action: 'wait', duration: 800 },

    // Frame selektieren → Property-Panel zeigt Properties
    {
      action: 'selectInPreview',
      selector: { byPath: 'Frame' },
      comment: 'Frame anklicken',
    },
    { action: 'wait', duration: 1000 },

    // Property 1: Padding
    {
      action: 'setProperty',
      selector: { byPath: 'Frame' },
      prop: 'padding',
      value: '24',
      comment: 'padding 24',
    },
    {
      action: 'expectCode',
      comment: 'after padding',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 240, h 160, bg #27272a, padding 24',
    },
    { action: 'wait', duration: 800 },

    // Property 2: Background per Color-Picker
    {
      action: 'pickColor',
      selector: { byPath: 'Frame' },
      prop: 'bg',
      color: '#2271C1',
      comment: 'bg → Mirror-Blau',
    },
    {
      action: 'expectCode',
      comment: 'after bg',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 240, h 160, bg #2271C1, padding 24',
    },
    { action: 'wait', duration: 800 },

    // Property 3: Radius
    {
      action: 'setProperty',
      selector: { byPath: 'Frame' },
      prop: 'radius',
      value: '12',
      comment: 'radius 12',
    },
    {
      action: 'expectCode',
      comment: 'after radius',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 240, h 160, bg #2271C1, padding 24, radius 12',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
