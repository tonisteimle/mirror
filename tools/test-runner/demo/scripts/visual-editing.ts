/**
 * Visual Editing Demo
 *
 * Inkrementell aufgebaut: jeder Schritt wird einzeln verifiziert (alle
 * Pflicht-Validierungen grün) bevor der nächste dazukommt.
 *
 * Spec: docs/concepts/visual-editing-demo.md
 * Blueprint: docs/concepts/demo-blueprint.md
 */

import type { DemoScript } from '../types'
import { paletteHighlight } from '../fragments/palette'

export const demoScript: DemoScript = {
  name: 'Visual Editing',
  description: 'Card per Drag & Drop bauen',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === Step 1: canvas + Card-Container tippen ===
    { action: 'comment', text: 'Schritt 1: canvas und Card-Container tippen' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    {
      action: 'type',
      text: 'canvas mobile, bg #0f0f0f, col white\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 800 },

    // === Step 2: Resize SE-Eckhandle ===
    { action: 'comment', text: 'Schritt 2: Card per Eckhandle vergrößern' },
    {
      action: 'dragResize',
      selector: { byId: 'node-2' },
      position: 'se',
      deltaX: 180,
      deltaY: 180,
      bypassSnap: true,
      comment: 'SE-Handle Δ(180,180) — Card auf ~280×280',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' + 'Frame w 280, h 280, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 600 },

    // === Step 3: H1 in die Card droppen ===
    { action: 'comment', text: 'Schritt 3: Titel (H1) in die Card' },
    ...paletteHighlight('comp-h1'),
    {
      action: 'dropFromPalette',
      component: 'H1',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 0 },
      comment: 'H1 als erster Child der Card',
      // Mirror fügt `, center` hinzu: die leere Card ist 280×280 (groß
      // genug für die 9-Zonen-Grid), Cursor landet in der Center-Zone,
      // → Alignment-Drop. Children der Card werden ab jetzt zentriert.
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center\n' +
        '  H1 "Heading 1", col #e4e4e7',
    },
    { action: 'wait', duration: 500 },
    {
      action: 'execute',
      code: `
        (() => {
          const ids = Array.from(document.querySelectorAll('#preview [data-mirror-id]'))
            .map(el => el.tagName + '#' + el.getAttribute('data-mirror-id'));
          console.error('[DIAG-AFTER-H1] ' + JSON.stringify(ids));
        })();
      `,
    },
  ],
}
