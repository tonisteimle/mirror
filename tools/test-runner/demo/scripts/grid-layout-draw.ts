/**
 * Grid Layout Draw Demo
 *
 * Exercises the grid-aware DrawManager path: user clicks a palette
 * component (Frame), then drags across grid cells in the canvas to
 * define position and size. Output lands in the Mirror source as
 * `Frame x A, y B, w C, h D` — 1-indexed cell coordinates.
 *
 * Scenario: build a classic 3-zone app shell (header / sidebar /
 * content) on a 4×8 grid. The `grid 4 8` short form declares both
 * axes in one keyword, so all 8 row tracks exist before any child is
 * placed — that's what enables drawing into empty cells (without it
 * the rows would auto-flow only as content is added, breaking row-2..N
 * drags before they ever happen).
 *
 * The drawn-frame source merges palette defaults (bg, rad) with the
 * draw-derived position (x, y, w, h). w/h on the palette default get
 * stripped because the drag tells us the size directly.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Grid Layout Draw',
  description: 'Click palette → drag across grid cells → frames snap to cell boundaries',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
    // Same fast typing profile as llm-edit-flow.ts: charMs 30 reads
    // smoothly without dragging the demo. Default video pacing also
    // adds 600ms autocomplete pauses on every space — the per-step
    // `pauseAfter: { ' ': 0 }` overrides that on the type action.
    customTimings: {
      type: {
        charMs: 30,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 80,
        thoughtPauseMs: 200,
      },
    },
  },
  steps: [
    // === Step 1: Canvas + 4×8 Grid as Layout-Substrat ===
    { action: 'comment', text: 'Schritt 1: Canvas + 4×8 Grid mit explizit deklarierten Rows' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    {
      action: 'type',
      text:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a',
      // Default trigger map pauses 600ms after every space for
      // autocomplete — irrelevant here, costs ~10s over this line.
      pauseAfter: { ' ': 0 },
    },
    // Typing `#hexvalue` opens the color picker as a side-effect. The
    // picker uses an overlay layer that swallows pointer events, which
    // would intercept the palette-click and any subsequent drag. The
    // dismissal handler listens for mousedown *outside* its element —
    // hard to reliably synthesize without coordinates collisions — so
    // we just call the exposed helper directly. (`Escape` cancels the
    // partial hex value, which would corrupt the source; click-outside
    // synthesis is fragile when the picker covers most of the viewport.)
    {
      action: 'execute',
      // Studio has two color-picker surfaces: the global picker (used
      // from the property panel) and the editor's inline picker. Typing
      // a hex value in the editor opens the latter; `hideColorPicker`
      // is the editor's exposed dismiss helper.
      code: 'window.hideColorPicker && window.hideColorPicker(); window.hideGlobalColorPicker && window.hideGlobalColorPicker()',
      comment: 'dismiss any open color picker before drawing',
    },
    { action: 'wait', duration: 400 },

    // === Step 2: Header — Frame über alle 4 Spalten der ersten Zeile ===
    { action: 'comment', text: 'Schritt 2: Header über Cells (1,1) bis (4,1)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 1, y: 1 },
      to: { x: 4, y: 1 },
      comment: 'Header: 4×1 Cell-Span',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame bg #27272a, rad 8, x 1, y 1, w 4, h 1',
    },
    { action: 'wait', duration: 600 },

    // === Step 3: Sidebar — linke Spalte, Zeilen 2..8 ===
    { action: 'comment', text: 'Schritt 3: Sidebar über Cells (1,2) bis (1,8)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 1, y: 2 },
      to: { x: 1, y: 8 },
      comment: 'Sidebar: 1×7 Cell-Span',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '  Frame bg #27272a, rad 8, x 1, y 2, w 1, h 7',
    },
    { action: 'wait', duration: 600 },

    // === Step 4: Content — Spalten 2..4, Zeilen 2..8 ===
    { action: 'comment', text: 'Schritt 4: Content über Cells (2,2) bis (4,8)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 2, y: 2 },
      to: { x: 4, y: 8 },
      comment: 'Content: 3×7 Cell-Span',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '  Frame bg #27272a, rad 8, x 1, y 2, w 1, h 7\n' +
        '  Frame bg #27272a, rad 8, x 2, y 2, w 3, h 7',
    },
    { action: 'wait', duration: 800 },

    // === Step 5: DOM-Verification — Stage hat 3 Kinder ===
    //
    // The cell-positions of each child are already pinned by the
    // expectCode strings above (e.g. `Frame ..., x 1, y 1, w 4, h 1`).
    // CSS-Grid placement from those properties is exercised by the
    // dedicated grid-cell tests in `tests/compiler/layout/`. So here we
    // just verify the structural outcome: three drawn frames landed in
    // Stage as direct children (not stacked inside each other, not lost).
    {
      action: 'expectDom',
      comment: 'three child Frames present after drawing',
      checks: [
        {
          selector: { byPath: 'Stage' },
          childCount: 3,
        },
      ],
    },
  ],
}
