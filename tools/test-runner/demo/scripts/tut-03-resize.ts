/**
 * Tutorial-Recording: Resize-Handles
 *
 * Element selektieren → an einem Eck-Handle ziehen → w/h im Code laufen
 * synchron mit. Wir zeigen einen SE-Drag (vergrößern) gefolgt von einem
 * S-Drag (Höhe weiter ändern), damit Cursor und Code-Diff zweimal
 * sichtbar werden.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-03-resize.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-03-resize.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame w 120, h 80, bg #2271C1, rad 8'

export const demoScript: DemoScript = {
  name: 'Tutorial · Resize-Handles',
  description: 'Frame per Eck-Handle vergrößern — w/h im Code laufen mit',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Frame 120×80' }),
    { action: 'wait', duration: 800 },

    // SE-Handle ziehen → größer
    {
      action: 'dragResize',
      selector: { byPath: 'Frame' },
      position: 'se',
      deltaX: 160,
      deltaY: 120,
      bypassSnap: true,
      comment: 'SE-Drag Δ(160,120) → ~280×200',
    },
    {
      action: 'expectCode',
      comment: 'after SE resize',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 280, h 200, bg #2271C1, rad 8',
    },
    { action: 'wait', duration: 1000 },

    // S-Handle ziehen → noch höher
    {
      action: 'dragResize',
      selector: { byPath: 'Frame' },
      position: 's',
      deltaX: 0,
      deltaY: 80,
      bypassSnap: true,
      comment: 'S-Drag Δ(0,80) → noch höher',
    },
    {
      action: 'expectCode',
      comment: 'after S resize',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame w 280, h 280, bg #2271C1, rad 8',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
