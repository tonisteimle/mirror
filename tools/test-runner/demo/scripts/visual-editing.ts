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

    // === Step 4: Text in die Card droppen (atIndex 1, nach H1) ===
    { action: 'comment', text: 'Schritt 4: Text als zweites Card-Kind' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 1 },
      comment: 'Text unter H1',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center\n' +
        '  H1 "Heading 1", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 500 },

    // === Step 5: Button in die Card droppen (atIndex 2) ===
    { action: 'comment', text: 'Schritt 5: Button als drittes Card-Kind' },
    ...paletteHighlight('comp-button'),
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 2 },
      comment: 'Button unter Text',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center\n' +
        '  H1 "Heading 1", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6',
    },
    { action: 'wait', duration: 500 },

    // === Step 6: Reorder Button vor H1 (index 0) ===
    { action: 'comment', text: 'Schritt 6: Button ganz nach oben verschieben' },
    {
      action: 'moveElement',
      source: { byText: 'Button' },
      target: { byId: 'node-2' },
      index: 0,
      comment: 'Button auf Index 0',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '  H1 "Heading 1", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 500 },

    // === Step 7: Padding-Top per Handle +24 ===
    { action: 'comment', text: 'Schritt 7: Padding-Top per Handle +24' },
    {
      action: 'dragPadding',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 24,
      comment: 'pad-t 24',
    },
    { action: 'wait', duration: 800 },
    {
      action: 'expectCode',
      comment: 'after pad-t 24',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center, pad-t 24\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '  H1 "Heading 1", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },

    // === Step 8: Margin-Top per Handle +16 ===
    { action: 'comment', text: 'Schritt 8: Margin-Top per Handle +16' },
    {
      action: 'dragMargin',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 16,
      comment: 'mar-t 16',
    },
    { action: 'wait', duration: 800 },
    {
      action: 'expectCode',
      comment: 'after mar-t 16',
      code:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center, pad-t 24, mar-t 16\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '  H1 "Heading 1", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },

    // === Step 9: Inline-Edit H1 → "Willkommen" ===
    { action: 'comment', text: 'Schritt 9: H1-Text per Doppelklick ändern' },
    {
      action: 'inlineEdit',
      selector: { byText: 'Heading 1' },
      text: 'Willkommen',
      comment: 'H1 → Willkommen',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center, pad-t 24, mar-t 16\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '  H1 "Willkommen", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 500 },

    // === Step 10: Inline-Edit Button → "Loslegen" ===
    { action: 'comment', text: 'Schritt 10: Button-Text per Doppelklick ändern' },
    {
      action: 'inlineEdit',
      selector: { byText: 'Button' },
      text: 'Loslegen',
      comment: 'Button → Loslegen',
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' +
        'Frame w 280, h 280, bg #27272a, rad 8, center, pad-t 24, mar-t 16\n' +
        '  Button "Loslegen", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '  H1 "Willkommen", col #e4e4e7\n' +
        '  Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 600 },
  ],
}
