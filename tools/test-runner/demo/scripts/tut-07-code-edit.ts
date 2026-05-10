/**
 * Tutorial-Recording: Code → Preview
 *
 * Die andere Richtung des bidirektionalen Editings: tippe Mirror-Zeilen
 * direkt im Editor, das Preview baut sofort mit. Wir bauen eine kleine
 * Card Zeile für Zeile auf — Frame, Title, Description, Button.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-07-code-edit.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-07-code-edit.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE = 'canvas mobile, bg #0f0f0f, col white, font sans'

export const demoScript: DemoScript = {
  name: 'Tutorial · Code → Preview',
  description: 'Mirror-Zeilen im Editor tippen — Preview baut Zeile für Zeile mit',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
    customTimings: {
      type: {
        charMs: 35,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 200,
        thoughtPauseMs: 400,
      },
    },
  },
  steps: [
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Leerer Canvas' }),
    { action: 'wait', duration: 600 },

    // Cursor ans Ende der canvas-Zeile, dann tippen
    { action: 'setEditorCursor', line: 1, col: 9999 },
    { action: 'wait', duration: 300 },

    {
      action: 'type',
      text:
        '\n\n' +
        'Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 280\n' +
        '  Text "Mirror Studio", fs 18, weight bold\n' +
        '  Text "Bidirektional editieren", col #888\n' +
        '  Button "Loslegen", bg #2271C1, col white, pad 10 20, rad 6',
      comment: 'Card Zeile für Zeile bauen',
    },
    {
      action: 'expectCode',
      comment: 'after typing card',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 280\n' +
        '  Text "Mirror Studio", fs 18, weight bold\n' +
        '  Text "Bidirektional editieren", col #888\n' +
        '  Button "Loslegen", bg #2271C1, col white, pad 10 20, rad 6',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
