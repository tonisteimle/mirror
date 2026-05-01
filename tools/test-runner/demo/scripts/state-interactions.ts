/**
 * State Interactions Demo
 *
 * Zeigt Mirror's State-System: Button mit `hover:`-Block, Demo simuliert
 * Hover, Computed-Style ändert sich. Beweist, dass der State-Block in CSS
 * compiliert wird, das auf System-Events reagiert.
 *
 * Spec: docs/archive/concepts/state-interactions-demo.md
 */

import type { DemoScript } from '../types'
import { validateStudioReady } from '../fragments/setup'

const BASELINE = [
  'canvas bg #0f0f0f, col white, pad 24',
  'Button "Klick mich", bg #2271C1, col white, pad 12 24, rad 6',
  '  hover:',
  '    bg #ef4444',
].join('\n')

export const demoScript: DemoScript = {
  name: 'State Interactions',
  description: 'Mirror states: Button mit hover-Block, runtime state change',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Reset mit baseline-Button ===
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.setTestCode(${JSON.stringify(BASELINE)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'Reset auf Button mit hover-State',
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'baseline (button + hover)',
      code: BASELINE,
    },
    ...validateStudioReady(),

    // === 2. Default-State verifizieren ===
    { action: 'comment', text: 'Schritt 1: Default-State — Button blau' },
    {
      action: 'expectDom',
      comment: 'default state: blue background',
      checks: [{ selector: { byTag: 'button' }, background: '#2271C1' }],
    },

    // === 3. Hover triggern ===
    // __mirrorTest.interact.hover setzt data-hover="true" + dispatches
    // mouseenter — der hover-Block kompiliert zu [data-hover="true"]-CSS,
    // also greift der State sofort.
    { action: 'comment', text: 'Schritt 2: Mauszeiger schwebt über dem Button' },
    {
      action: 'execute',
      code: `
        (async function() {
          // Find the button's nodeId and trigger hover via the interaction API
          const btn = document.querySelector('#preview button[data-mirror-id]');
          if (!btn) throw new Error('button not found');
          const nodeId = btn.getAttribute('data-mirror-id');
          await window.__mirrorTest.interact.hover(nodeId);
          await new Promise(r => setTimeout(r, 200));
        })();
      `,
      comment: 'hover trigger',
    },
    { action: 'wait', duration: 400 },

    // === 4. Hover-State verifizieren ===
    {
      action: 'expectDom',
      comment: 'hover state: red background',
      checks: [{ selector: { byTag: 'button' }, background: '#ef4444' }],
    },

    // === 5. Unhover ===
    { action: 'comment', text: 'Schritt 3: Mauszeiger verlässt Button' },
    {
      action: 'execute',
      code: `
        (async function() {
          const btn = document.querySelector('#preview button[data-mirror-id]');
          const nodeId = btn.getAttribute('data-mirror-id');
          await window.__mirrorTest.interact.unhover(nodeId);
          await new Promise(r => setTimeout(r, 200));
        })();
      `,
      comment: 'unhover',
    },
    { action: 'wait', duration: 400 },

    // === 6. Zurück zum Default-State ===
    {
      action: 'expectDom',
      comment: 'default state restored: blue background',
      checks: [{ selector: { byTag: 'button' }, background: '#2271C1' }],
    },

    // === 7. Code unverändert ===
    {
      action: 'expectCode',
      comment: 'source code unchanged',
      code: BASELINE,
    },

    // === Closing ===
    { action: 'comment', text: 'States: deklarativ im Code, reaktiv zur Laufzeit' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
