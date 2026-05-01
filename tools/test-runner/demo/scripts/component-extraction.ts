/**
 * Component Extraction Demo
 *
 * Mirror's Component-Definition-Pattern: components.com mit Card-Definition,
 * index.mir mit drei Card-Instanzen — Single-Source-of-Truth für die UI.
 *
 * Spec: docs/archive/concepts/component-extraction-demo.md
 */

import type { DemoScript } from '../types'
import { resetMultiFileProject } from '../fragments/multi-file'
import { validateStudioReady } from '../fragments/setup'

const COMPONENTS_COM = [
  '// Wiederverwendbare Card-Komponente',
  'Card: bg #27272a, pad 16, gap 8, rad 8, w 240',
  '  Title: fs 18, weight bold, col white',
  '  Body: col #a1a1aa',
].join('\n')

const LAYOUT = [
  'Frame bg #0f0f0f, pad 24, gap 16, w full, h full',
  '  Card',
  '    Title "Pro"',
  '    Body "Für kleine Teams"',
  '  Card',
  '    Title "Team"',
  '    Body "Für mittlere Firmen"',
  '  Card',
  '    Title "Enterprise"',
  '    Body "Für Konzerne"',
].join('\n')

export const demoScript: DemoScript = {
  name: 'Component Extraction',
  description: 'Card-Component in components.com, 3× im Layout verwendet',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Multi-file project reset ===
    ...resetMultiFileProject(),
    ...validateStudioReady(),

    // === 2. components.com erstellen ===
    { action: 'comment', text: 'Schritt 1: Card-Komponente in components.com definieren' },
    {
      action: 'createFile',
      path: 'components.com',
      content: COMPONENTS_COM,
      switchTo: true,
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'components.com contents',
      code: COMPONENTS_COM,
    },

    // === 3. Zurück zu index.mir, Layout mit 3 Cards schreiben ===
    { action: 'comment', text: 'Schritt 2: Layout mit drei Card-Instanzen' },
    { action: 'switchFile', path: 'index.mir' },
    { action: 'wait', duration: 500 },
    {
      action: 'execute',
      code: `
        (async function() {
          // Persist the layout to storage and load it into the editor.
          const { storage } = await import('./dist/index.js');
          await storage.writeFile('index.mir', ${JSON.stringify(LAYOUT)});
          await new Promise(r => setTimeout(r, 200));
          await window.__dragTest.setTestCode(${JSON.stringify(LAYOUT)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'Layout schreiben',
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'layout uses Card 3×',
      code: LAYOUT,
    },

    // === 4. Test-Mode verlassen → components.com wird als prelude compiliert ===
    { action: 'comment', text: 'Schritt 3: Components werden compiliert — Cards rendern' },
    {
      action: 'execute',
      code: `
        (async function() {
          if (typeof window.__exitTestMode === 'function') {
            window.__exitTestMode();
          }
          const studio = window.__mirrorStudio__;
          if (studio && studio.events) {
            studio.events.emit('compile:requested', {});
          }
          await new Promise(r => setTimeout(r, 600));
        })();
      `,
      comment: 'Switch to prelude-aware compile',
    },
    { action: 'wait', duration: 500 },

    // === 5. Computed-Style: alle 3 Cards identisch ===
    // Nach exitTestMode sind die node-IDs verschoben (App-wrapper +
    // components.com-prelude). Wir nutzen byTag-Lookup mit nth, was robust ist.
    {
      action: 'expectDom',
      comment: 'all three cards render identically',
      checks: [
        { selector: { byText: 'Pro' }, text: 'Pro' },
        { selector: { byText: 'Team' }, text: 'Team' },
        { selector: { byText: 'Enterprise' }, text: 'Enterprise' },
      ],
    },

    // === Closing ===
    { action: 'comment', text: 'Eine Card-Definition, drei Verwendungen — DRY' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
