/**
 * Grid Layout Draw — Edge Cases
 *
 * Companion to `grid-layout-draw`. Validates three behaviors that the
 * happy-path demo doesn't touch:
 *
 *   1. Click without drag in a cell → produces a 1×1 frame. Important
 *      because it keeps the gesture monomorphic (every press/release =
 *      one element). Without this guarantee a stray click would either
 *      silently no-op or produce a 0-sized invalid frame.
 *
 *   2. Click on the palette → DrawManager enters 'ready' state and
 *      paints the body with `.draw-cursor-crosshair`. We test the UI
 *      state machine independently of any draw operation.
 *
 *   3. Escape during 'ready' → DrawManager goes back to 'idle', the
 *      crosshair class is removed, and the source remains untouched.
 *      Regression: a buggy cancel that committed a 0-sized element
 *      would corrupt the source even though the user pressed Escape.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Grid Layout Draw — Edges',
  description: 'Click-only 1×1, palette-click → ready, Escape → cancel',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
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
    // === Setup: same Stage as the happy-path demo ===
    { action: 'comment', text: 'Setup: 4×8 Stage Grid' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    // The Setup deliberately avoids `#hex` values because the editor's
    // color trigger stays open after typing a `#` and Escape would later
    // route to the trigger (cancelling the partial hex) instead of to
    // the DrawManager. Named colors / no bg keeps Escape clean.
    {
      action: 'type',
      text:
        'canvas desktop\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16',
      expectCode:
        'canvas desktop\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16',
      pauseAfter: { ' ': 0 },
    },
    { action: 'wait', duration: 400 },

    // === Case 1: Click-without-drag → 1×1 frame ===
    //
    // Demo runner's drawInGrid uses manualDrag(start, end) — when start
    // === end the path still fires mousedown → 0-distance mousemove →
    // mouseup, which is exactly what a real click-without-drag produces.
    // The DrawManager's grid path treats start === current as w/h = 1.
    { action: 'comment', text: 'Case 1: click ohne drag in Cell (3,4) → 1×1 Frame' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 3, y: 4 },
      to: { x: 3, y: 4 },
      comment: 'click-only on cell (3,4)',
      expectCode:
        'canvas desktop\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16\n' +
        '  Frame bg #27272a, rad 8, x 3, y 4, w 1, h 1',
    },
    { action: 'wait', duration: 500 },

    // === Case 2 + 3: Palette-click → ready state, Escape → idle ===
    //
    // We don't draw anything this time — just validate that:
    //   - clicking the palette transitions into 'ready' (crosshair on)
    //   - Escape transitions back to 'idle' (crosshair off)
    //   - the source is unchanged after the cancellation
    { action: 'comment', text: 'Case 2: palette-click → DrawManager ready (crosshair visible)' },
    { action: 'click', target: '#components-panel [data-id="comp-frame"]' },
    { action: 'wait', duration: 200 },
    {
      action: 'expectUiState',
      comment: 'crosshair body class set during ready',
      allVisible: ['.draw-cursor-crosshair'],
    },

    { action: 'comment', text: 'Case 3: Escape → cancel back to idle' },
    { action: 'pressKey', key: 'Escape' },
    { action: 'wait', duration: 200 },
    {
      action: 'expectUiState',
      comment: 'crosshair class removed after cancel',
      noneVisible: ['.draw-cursor-crosshair'],
    },
    // Source must be unchanged from after Case 1 — no stray frame.
    {
      action: 'expectCode',
      comment: 'source unchanged after Escape-cancel',
      code:
        'canvas desktop\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16\n' +
        '  Frame bg #27272a, rad 8, x 3, y 4, w 1, h 1',
    },
  ],
}
