/**
 * First Drop Demo (SKIPPED in suite — `_` prefix)
 *
 * Iterations-Sandbox für die ersten Schritte:
 *   1. Leerer Editor (truly empty start)
 *   2. canvas-Deklaration tippen — App bekommt Hintergrund & Größe
 *   3. Erstes Frame aus dem Components-Panel droppen
 *
 * Manueller Lauf:
 *   npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/_first-drop.ts --headed --pacing=video
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'First Drop',
  description: 'Empty start → canvas tippen → Frame droppen',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === Schritt 1: Editor komplett leeren ===
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.setTestCode('');
          await new Promise(r => setTimeout(r, 200));
        })();
      `,
      comment: 'Editor leeren — truly empty start',
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'after empty reset',
      code: '',
    },

    { action: 'comment', text: 'Leerer Editor — wir fangen ganz von vorn an' },
    { action: 'wait', duration: 1200 },

    // === Schritt 2: canvas-Deklaration tippen ===
    { action: 'comment', text: 'Schritt 1: canvas tippen — App-Basis' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 400 },
    { action: 'type', text: 'canvas mobile, bg #0f0f0f, col white' },
    { action: 'wait', duration: 1500 },
    {
      action: 'expectCode',
      comment: 'after canvas typed',
      code: 'canvas mobile, bg #0f0f0f, col white',
    },

    // === Schritt 3: Frame aus dem Components-Panel ===
    { action: 'comment', text: 'Schritt 2: Frame aus dem Components-Panel droppen' },
    { action: 'wait', duration: 500 },
    { action: 'moveTo', target: '#components-panel [data-id="comp-frame"]' },
    {
      action: 'highlight',
      target: '#components-panel [data-id="comp-frame"]',
      duration: 1500,
    },
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
      comment: 'after first Frame drop',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
    },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild' },
  ],
}
