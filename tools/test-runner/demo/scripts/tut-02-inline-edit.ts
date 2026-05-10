/**
 * Tutorial-Recording: Inline-Edit
 *
 * Doppelklick auf einen Text im Preview macht ihn editierbar. Die neue
 * Eingabe wird sofort in die entsprechende Code-Zeile geschrieben.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-02-inline-edit.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-02-inline-edit.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame pad 32, gap 16, w full, h full, center\n' +
  '  Text "Klick zum Editieren", fs 20, weight 500'

export const demoScript: DemoScript = {
  name: 'Tutorial · Inline-Edit',
  description: 'Doppelklick auf Text im Preview, neuer Text wandert in den Code',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
    customTimings: {
      type: {
        charMs: 50,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 0,
        thoughtPauseMs: 0,
      },
    },
  },
  steps: [
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Frame mit Text' }),
    { action: 'wait', duration: 800 },

    // Inline-Edit auf den Text
    {
      action: 'inlineEdit',
      selector: { byPath: 'Text' },
      text: 'Im Preview editiert',
      comment: 'Text via Doppelklick + Tippen ändern',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
