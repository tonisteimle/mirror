/**
 * Tutorial-Recording: Drag-Reorder
 *
 * Element im Preview greifen, in einen anderen Slot ziehen — die
 * entsprechenden Code-Zeilen sortieren sich um. Wir bauen drei farbige
 * Frames in einer horizontalen Reihe und verschieben den dritten
 * (gelb) auf Index 0, dann den ersten (rot) auf Index 2 — der ganze
 * Tausch ist im Code sichtbar.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-06-reorder.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-06-reorder.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame hor, gap 12, pad 24\n' +
  '  Frame w 60, h 60, bg #ef4444, rad 8\n' +
  '  Frame w 60, h 60, bg #2271C1, rad 8\n' +
  '  Frame w 60, h 60, bg #f59e0b, rad 8'

export const demoScript: DemoScript = {
  name: 'Tutorial · Drag-Reorder',
  description: 'Kinder per Drag im Container umsortieren — Code-Reihenfolge updated',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Drei farbige Frames' }),
    { action: 'wait', duration: 1000 },

    // Gelb (Index 2) → an Index 0
    {
      action: 'moveElement',
      source: { byPath: 'Frame', nth: 3 },
      target: { byPath: 'Frame', nth: 0 },
      index: 0,
      comment: 'Gelb nach vorne',
    },
    { action: 'wait', duration: 1500 },

    // Rot (jetzt Index 1) → an Index 2 (Ende)
    {
      action: 'moveElement',
      source: { byPath: 'Frame', nth: 2 },
      target: { byPath: 'Frame', nth: 0 },
      index: 2,
      comment: 'Rot ans Ende',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
