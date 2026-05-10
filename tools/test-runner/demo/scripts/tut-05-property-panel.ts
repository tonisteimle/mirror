/**
 * Tutorial-Recording: Property-Panel
 *
 * Selektiere ein Element im Preview, dann ändere drei Properties über
 * sichtbare Eingabefelder im Property-Panel rechts. Wir nutzen
 * width/gap/radius — diese haben echte data-prop-Inputs, der Cursor
 * landet im jeweiligen Feld und der Tippvorgang ist im Video sichtbar.
 *
 * Wichtig: NICHT `padding` oder `margin` über setProperty fahren —
 * die Padding-Section nutzt `data-pad-dir` statt `data-prop="padding"`,
 * der Runner fällt dann auf `panel.changeProperty()` zurück und der
 * Viewer sieht nur einen vagen Cursor-Hover über dem Panel + magisch
 * geänderten Code. Padding/Margin werden im tut-04 per Handle gezeigt.
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
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame w 220, h 100, bg #27272a, hor, pad 12\n' +
  '  Frame w 60, h 60, bg #2271C1\n' +
  '  Frame w 60, h 60, bg #2271C1'

export const demoScript: DemoScript = {
  name: 'Tutorial · Property-Panel',
  description: 'Width, Gap, Background und Radius über Property-Panel-Inputs',
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
          const dt = window.__dragTest;
          if (!dt || typeof dt.hidePanel !== 'function') return;
          for (const name of ['prompt', 'files', 'components', 'design-system']) {
            try { dt.hidePanel(name); } catch (e) { /* ignore */ }
          }
          if (typeof dt.showPanel === 'function') {
            try { dt.showPanel('property'); } catch (e) { /* ignore */ }
          }
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'Nur Property-Panel + Code + Preview sichtbar',
    },
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Frame mit zwei Children' }),
    { action: 'wait', duration: 800 },

    // Outer Frame selektieren → Property-Panel zeigt seine Properties
    {
      action: 'selectInPreview',
      selector: { byPath: 'Frame', nth: 0 },
      comment: 'Äußeren Frame anklicken',
    },
    { action: 'wait', duration: 1000 },

    // Property 1: width per data-prop="width"-Input
    {
      action: 'setProperty',
      selector: { byPath: 'Frame', nth: 0 },
      prop: 'width',
      value: '320',
      comment: 'width 320',
    },
    {
      action: 'expectCode',
      comment: 'after width',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 320, h 100, bg #27272a, hor, pad 12\n' +
        '  Frame w 60, h 60, bg #2271C1\n' +
        '  Frame w 60, h 60, bg #2271C1',
    },
    { action: 'wait', duration: 800 },

    // Property 2: gap per data-prop="gap"-Input
    {
      action: 'setProperty',
      selector: { byPath: 'Frame', nth: 0 },
      prop: 'gap',
      value: '20',
      comment: 'gap 20',
    },
    {
      action: 'expectCode',
      comment: 'after gap',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 320, h 100, bg #27272a, hor, pad 12, gap 20\n' +
        '  Frame w 60, h 60, bg #2271C1\n' +
        '  Frame w 60, h 60, bg #2271C1',
    },
    { action: 'wait', duration: 800 },

    // Property 3: bg per Color-Picker
    {
      action: 'pickColor',
      selector: { byPath: 'Frame', nth: 0 },
      prop: 'bg',
      color: '#1a1a1a',
      comment: 'bg → dunkler',
    },
    {
      action: 'expectCode',
      comment: 'after bg',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 320, h 100, bg #1a1a1a, hor, pad 12, gap 20\n' +
        '  Frame w 60, h 60, bg #2271C1\n' +
        '  Frame w 60, h 60, bg #2271C1',
    },
    { action: 'wait', duration: 800 },

    // Property 4: radius per data-prop="radius"-Input
    {
      action: 'setProperty',
      selector: { byPath: 'Frame', nth: 0 },
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
        'Frame w 320, h 100, bg #1a1a1a, hor, pad 12, gap 20, rad 12\n' +
        '  Frame w 60, h 60, bg #2271C1\n' +
        '  Frame w 60, h 60, bg #2271C1',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
