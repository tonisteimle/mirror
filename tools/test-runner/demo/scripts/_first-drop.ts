/**
 * First Drop Demo (SKIPPED in suite — `_` prefix)
 *
 * Iterations-Sandbox für die ersten Schritte:
 *   1. Leerer Editor (Studio startet via ?demo=blank ohne State)
 *   2. canvas-Deklaration tippen
 *   3. Frame aus dem Components-Panel direkt in den Canvas droppen
 *      (Mirror Studio akzeptiert Drops auf canvas-only State und hängt
 *      den neuen Component als Top-Level-Element an — siehe
 *      drag:dropped-Subscriber in studio/app.js)
 *
 * Lauf:
 *   npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/_first-drop.ts --headed --pacing=video --driver=os
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'First Drop',
  description: 'Empty → canvas → Frame droppen',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === Schritt 0: Editor startet leer (?demo=blank) ===
    { action: 'expectCode', comment: 'Editor startet leer', code: '' },

    { action: 'comment', text: 'Studio gestartet — Editor ist leer' },
    { action: 'wait', duration: 1000 },

    // === Schritt 1: canvas tippen ===
    { action: 'comment', text: 'Schritt 1: canvas tippen — App-Basis' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 400 },
    { action: 'type', text: 'canvas mobile, bg #0f0f0f, col white' },
    { action: 'wait', duration: 1200 },
    {
      action: 'expectCode',
      comment: 'after canvas typed',
      code: 'canvas mobile, bg #0f0f0f, col white',
    },

    // === Schritt 2: Frame aus dem Components-Panel direkt in Canvas droppen ===
    { action: 'comment', text: 'Schritt 2: Frame aus dem Components-Panel droppen' },
    { action: 'wait', duration: 600 },
    { action: 'moveTo', target: '#components-panel [data-id="comp-frame"]' },
    { action: 'highlight', target: '#components-panel [data-id="comp-frame"]', duration: 1500 },
    { action: 'wait', duration: 400 },
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame als erstes Top-Level Element',
    },
    { action: 'wait', duration: 800 },
    {
      action: 'expectCode',
      comment: 'after Frame drop',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
    },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild' },
  ],
}
