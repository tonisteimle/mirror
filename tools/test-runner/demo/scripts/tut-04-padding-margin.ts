/**
 * Tutorial-Recording: Padding & Margin per Handle
 *
 * Innerhalb eines selektierten Containers ziehen Padding-Handles den
 * Innenabstand auf, am Rand des Elements werden Margin-Handles gezogen.
 * Wir zeigen erst Padding-Top dann Margin-Top, damit beide Diff-Stellen
 * sichtbar werden.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-04-padding-margin.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-04-padding-margin.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame w 240, h 200, bg #2271C1, rad 8, center'

export const demoScript: DemoScript = {
  name: 'Tutorial · Padding & Margin',
  description: 'Padding und Margin via Handles ziehen — Code zeigt pad-t / mar-t',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Frame 240×200' }),
    { action: 'wait', duration: 800 },

    // Padding-Top per Handle
    {
      action: 'dragPadding',
      selector: { byPath: 'Frame' },
      side: 'top',
      delta: 32,
      comment: 'pad-t 32',
    },
    { action: 'wait', duration: 1200 },

    // Margin-Top per Handle
    {
      action: 'dragMargin',
      selector: { byPath: 'Frame' },
      side: 'top',
      delta: 24,
      comment: 'mar-t 24',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
