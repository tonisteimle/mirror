/**
 * Tutorial-Recording: Drop & Sync
 *
 * Zeigt das Killer-Feature von Studio: ein Element aus der Components-
 * Palette in das Preview ziehen, und der Code-Editor schreibt sofort
 * die passende Mirror-Zeile mit. Zwei Drops nacheinander (Frame in
 * Canvas, Button in Frame) damit das Wachsen der Hierarchie sichtbar
 * wird.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-01-drop-sync.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-01-drop-sync.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'

const INITIAL_CODE = 'canvas mobile, bg #0f0f0f, col white, font sans'

export const demoScript: DemoScript = {
  name: 'Tutorial · Drop & Sync',
  description: 'Frame und Button aus der Palette droppen — Code wächst synchron mit',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    // Reset auf reinen Canvas
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Leerer Canvas' }),
    { action: 'wait', duration: 600 },

    // Drop 1: Frame aus Palette → in den Canvas
    {
      action: 'highlight',
      target: '#components-panel [data-id="comp-frame"]',
      duration: 1000,
    },
    { action: 'wait', duration: 200 },
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame als Top-Level Element',
    },
    { action: 'wait', duration: 1200 },

    // Drop 2: Button aus Palette → in den eben gedroppten Frame
    {
      action: 'highlight',
      target: '#components-panel [data-id="comp-button"]',
      duration: 1000,
    },
    { action: 'wait', duration: 200 },
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byPath: 'Frame' },
      at: { kind: 'index', index: 0 },
      comment: 'Button in den Frame',
    },
    { action: 'wait', duration: 1500 },

    // Endbild — Cursor weg vom UI, kurze Schluss-Pause für den Loop
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
