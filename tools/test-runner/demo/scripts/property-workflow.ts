/**
 * Property Workflow Demo
 *
 * Cross-Panel-Workflow zwischen Preview, Property-Panel und Code:
 * User klickt im Preview, ändert Properties über die Panel-UI, sieht den Code
 * sofort updaten.
 *
 * Spec: docs/concepts/property-workflow-demo.md
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { paletteHighlight } from '../fragments/palette'

export const demoScript: DemoScript = {
  name: 'Property Workflow',
  description:
    'Card per Property-Panel gestalten — Cross-Panel-Workflow Preview ↔ Properties ↔ Code',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Reset auf canvas-Baseline ===
    // Per memory feedback_mirror_canvas_idiom: Default ist `canvas mobile, …`,
    // nicht ein nackter Frame.
    ...resetCanvas({ baseCode: 'canvas mobile, bg #0f0f0f, col white' }),
    { action: 'comment', text: 'Card per Property-Panel gestalten — keine Code-Eingabe' },
    { action: 'wait', duration: 800 },

    // === 2. Card-Frame in Canvas droppen ===
    // (validateStudioReady ist mit canvas-only nicht anwendbar — canvas
    // selbst rendert keinen DOM-Knoten in #preview.)
    { action: 'comment', text: 'Schritt 1: Card-Frame aus der Palette droppen' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame als Top-Level unter canvas',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'baseline (frame dropped)',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
    },

    // Canvas-only Drop-Pipeline numeriert die Top-Level-Frame als node-1
    // (canvas selbst rendert keinen DOM-Knoten, kriegt also keine ID).
    // Children, die später hineinfallen, werden node-2, node-3, …

    // === 3. Card im Preview selektieren — Property-Panel updates ===
    { action: 'comment', text: 'Schritt 2: Card im Preview anclicken' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-1' },
      comment: 'Card selektiert → Property-Panel zeigt Properties',
    },
    { action: 'wait', duration: 600 },

    // === 4. Width auf 320 ===
    { action: 'comment', text: 'Schritt 3: Width auf 320 setzen' },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'width',
      value: '320',
      comment: 'width 320',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'expectCode',
      comment: 'after width=320',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 320, h 100, bg #27272a, rad 8',
    },

    // === 5. Height auf 200 ===
    { action: 'comment', text: 'Schritt 4: Height auf 200' },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'height',
      value: '200',
      comment: 'height 200',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'expectCode',
      comment: 'after height=200',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 320, h 200, bg #27272a, rad 8',
    },

    // === 6. Gap auf 12 ===
    { action: 'comment', text: 'Schritt 5: Gap auf 12 für Innenabstand' },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'gap',
      value: '12',
      comment: 'gap 12',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'expectCode',
      comment: 'after gap=12',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        '\n' +
        'Frame w 320, h 200, bg #27272a, rad 8, gap 12',
    },

    // === 7. Background via Color-Picker ===
    { action: 'comment', text: 'Schritt 6: Background via Color-Picker setzen' },
    {
      action: 'pickColor',
      selector: { byId: 'node-1' },
      prop: 'bg',
      color: '#2196F3',
      comment: 'Background → Material-Blue',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after bg=#2196F3',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        '\n' +
        'Frame w 320, h 200, bg #2196F3, rad 8, gap 12',
    },

    // === 8. H1 in die Card droppen ===
    { action: 'comment', text: 'Schritt 7: Titel (H1) in die Card draggen' },
    ...paletteHighlight('comp-h1'),
    {
      action: 'dropFromPalette',
      component: 'H1',
      target: { byId: 'node-1' },
      at: { kind: 'zone', zone: 'center' },
      comment: 'H1 in Card',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after H1 drop',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        '\n' +
        'Frame w 320, h 200, bg #2196F3, rad 8, gap 12, center\n' +
        '  H1 "Heading 1", col #e4e4e7',
    },

    // === 9. H1 im Preview selektieren ===
    { action: 'comment', text: 'Schritt 8: Titel im Preview anclicken' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-2' },
      comment: 'H1 selektiert',
    },
    { action: 'wait', duration: 500 },

    // === 10. Title-Color auf weiß ===
    { action: 'comment', text: 'Schritt 9: Titel-Farbe auf weiß' },
    {
      action: 'pickColor',
      selector: { byId: 'node-2' },
      prop: 'col',
      color: '#FFFFFF',
      comment: 'col → weiß',
    },
    { action: 'wait', duration: 400 },
    // Note: Mirror's changeProperty appends a new `col` rather than updating
    // the existing one (palette default `col #e4e4e7` is preserved). The
    // duplicate is harmless — last wins at compile — and is the actual
    // behavior we want to lock in here.
    {
      action: 'expectCode',
      comment: 'after col=#FFFFFF',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        '\n' +
        'Frame w 320, h 200, bg #2196F3, rad 8, gap 12, center\n' +
        '  H1 "Heading 1", col #e4e4e7, col #FFFFFF',
    },

    // === 11. Title-Text per Inline-Edit ===
    { action: 'comment', text: 'Schritt 10: Titel per Doppelklick ändern' },
    {
      action: 'inlineEdit',
      selector: { byId: 'node-2' },
      text: 'Willkommen',
      comment: 'H1 → "Willkommen"',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'final',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        '\n' +
        'Frame w 320, h 200, bg #2196F3, rad 8, gap 12, center\n' +
        '  H1 "Willkommen", col #e4e4e7, col #FFFFFF',
    },

    // === Finale: DOM-Verifikation ===
    {
      action: 'expectDom',
      comment: 'card renders correctly',
      checks: [
        {
          selector: { byId: 'node-1' },
          width: 320,
          height: 200,
          background: '#2196F3',
          childCount: 1,
        },
        {
          selector: { byId: 'node-2' },
          text: 'Willkommen',
          color: '#ffffff',
        },
      ],
    },

    // === Closing highlights ===
    { action: 'comment', text: 'Card komplett über das Property-Panel gestylt' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
