/**
 * Webpage Direct-Manipulation Demo
 *
 * Counterpart to webpage-build.ts. Where the other demo builds via
 * typing + drawing-into-grid, this one builds the same target through
 * Studio's direct-manipulation surfaces:
 *
 *   • Components panel  → dropFromPalette
 *   • Resize handles    → dragResize
 *   • Padding handles   → dragPadding
 *   • Inline editing    → inlineEdit (double-click in preview)
 *   • Property panel    → setProperty
 *   • Color picker      → pickColor
 *
 * Only the `canvas` directive is typed — Mirror needs an explicit
 * `canvas` line to know the device preset and base bg, and there's no
 * Studio surface to set that without code.
 *
 * Target output:
 *
 *   canvas mobile, bg #0a0a0a
 *   Frame w 280, h 360, bg #18181b, rad 12, gap 16, center, pad 24
 *     Image w 80, h 80, rad 99
 *     Text "Anna Schmid", col white, fs 18, weight 600
 *     Text "Senior Designer", col #a1a1aa, fs 14
 *     Button "Folgen", bg #2271C1, col white, pad 10 20, rad 8
 *
 * The chosen scene matches the snippet that the marketing-page demo
 * (webpage-build.ts) shows in its code-pane — same composition, two
 * production paths, same final pixel output.
 */

import type { DemoScript } from '../types'
import { paletteHighlight } from '../fragments/palette'

export const demoScript: DemoScript = {
  name: 'Webpage Direct',
  description: 'Profile-Card per Drag-and-Drop + Property-Panel — kein Code-Tippen außer canvas',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    // ===================================================================
    // Phase 1: canvas-Direktive tippen (einziger Tipp-Schritt)
    // ===================================================================
    { action: 'comment', text: 'Phase 1: canvas-Direktive — App-Basis' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      text: 'canvas mobile, bg #0a0a0a',
      pauseAfter: { ' ': 0 },
      expectCode: 'canvas mobile, bg #0a0a0a',
    },
    { action: 'wait', duration: 600 },

    // ===================================================================
    // Phase 2: Card-Container per Drag-and-Drop aus dem Palette
    // ===================================================================
    { action: 'comment', text: 'Phase 2: Frame aus dem Components-Panel droppen' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame als Top-Level-Element',
      expectCode: 'canvas mobile, bg #0a0a0a\n\nFrame w 100, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 3: Card auf 280×360 ziehen (SE-Handle)
    // ===================================================================
    { action: 'comment', text: 'Phase 3: Card per SE-Eckhandle vergrößern' },
    {
      action: 'dragResize',
      selector: { byId: 'node-1' },
      position: 'se',
      deltaX: 180,
      deltaY: 260,
      bypassSnap: true,
      comment: 'SE-Handle Δ(180, 260) — Card wird 280×360',
      expectCode: 'canvas mobile, bg #0a0a0a\n\nFrame w 280, h 360, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 4: Card-Hintergrund über den Color-Picker auf #18181b
    // ===================================================================
    { action: 'comment', text: 'Phase 4: Card-Hintergrund über den Color-Picker setzen' },
    {
      action: 'pickColor',
      selector: { byId: 'node-1' },
      prop: 'bg',
      color: '#18181b',
      comment: 'Card-Surface',
      expectCode: 'canvas mobile, bg #0a0a0a\n\nFrame w 280, h 360, bg #18181b, rad 8',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 5: Radius + gap + center via Property-Panel
    // ===================================================================
    { action: 'comment', text: 'Phase 5: rad 12, gap 16, center per Property-Panel' },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'rad',
      value: '12',
      comment: 'Border-Radius 12',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'gap',
      value: '16',
      comment: 'Gap zwischen Card-Children',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'setProperty',
      selector: { byId: 'node-1' },
      prop: 'center',
      value: 'true',
      comment: 'Inhalte zentrieren',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 6: Padding-Handles auf 24
    // ===================================================================
    { action: 'comment', text: 'Phase 6: Card-Padding per Handles auf 24' },
    {
      action: 'dragPadding',
      selector: { byId: 'node-1' },
      side: 'top',
      delta: 24,
      mode: 'all',
      comment: 'pad 24 (alle Seiten via Shift)',
    },
    { action: 'wait', duration: 600 },

    // ===================================================================
    // Phase 7: Avatar-Image droppen
    // ===================================================================
    { action: 'comment', text: 'Phase 7: Image als Avatar in die Card droppen' },
    ...paletteHighlight('comp-image'),
    {
      action: 'dropFromPalette',
      component: 'Image',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Image als erstes Card-Kind',
    },
    { action: 'wait', duration: 500 },
    // Avatar zu 80×80 mit voller Rundung
    {
      action: 'setProperty',
      selector: { byId: 'node-2' },
      prop: 'w',
      value: '80',
      comment: 'Avatar w 80',
    },
    { action: 'wait', duration: 250 },
    {
      action: 'setProperty',
      selector: { byId: 'node-2' },
      prop: 'h',
      value: '80',
      comment: 'Avatar h 80',
    },
    { action: 'wait', duration: 250 },
    {
      action: 'setProperty',
      selector: { byId: 'node-2' },
      prop: 'rad',
      value: '99',
      comment: 'Avatar rund',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 8: Name (Text) droppen + inline editieren
    // ===================================================================
    { action: 'comment', text: 'Phase 8: Name-Text droppen, inline editieren, stylen' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 1 },
      comment: 'Text als zweites Card-Kind',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'inlineEdit',
      selector: { byId: 'node-3' },
      text: 'Anna Schmid',
      comment: 'Doppelklick → "Anna Schmid"',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'pickColor',
      selector: { byId: 'node-3' },
      prop: 'col',
      color: '#ffffff',
      comment: 'Name-Farbe weiß',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'setProperty',
      selector: { byId: 'node-3' },
      prop: 'fs',
      value: '18',
      comment: 'Name fs 18',
    },
    { action: 'wait', duration: 250 },
    {
      action: 'setProperty',
      selector: { byId: 'node-3' },
      prop: 'weight',
      value: '600',
      comment: 'Name semibold',
    },
    { action: 'wait', duration: 500 },

    // ===================================================================
    // Phase 9: Rolle (Text) droppen + inline editieren
    // ===================================================================
    { action: 'comment', text: 'Phase 9: Rollen-Text droppen, inline editieren, stylen' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 2 },
      comment: 'Text als drittes Card-Kind',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'inlineEdit',
      selector: { byId: 'node-4' },
      text: 'Senior Designer',
      comment: 'Doppelklick → "Senior Designer"',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'pickColor',
      selector: { byId: 'node-4' },
      prop: 'col',
      color: '#a1a1aa',
      comment: 'Rolle-Farbe muted',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'fs',
      value: '14',
      comment: 'Rolle fs 14',
    },
    // Inter-phase settle: setProperty leaves the property-panel input
    // focused, which races with the next dropFromPalette mousedown
    // pipeline (observed flake: __dragTest occasionally undefined when
    // the drop kicks in). Press Escape to blur, then wait longer than
    // the property-panel commit cycle.
    { action: 'pressKey', key: 'Escape' },
    { action: 'wait', duration: 1000 },

    // ===================================================================
    // Phase 10: Button droppen + inline editieren
    // ===================================================================
    { action: 'comment', text: 'Phase 10: Button droppen, inline editieren, blau einfärben' },
    ...paletteHighlight('comp-button'),
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 3 },
      comment: 'Button als viertes Card-Kind',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'inlineEdit',
      selector: { byId: 'node-5' },
      text: 'Folgen',
      comment: 'Doppelklick → "Folgen"',
    },
    // Inline-edit → pickColor flaked in ~25% of runs with node-5 not
    // yet re-mounted by Mirror's compile cycle. 800ms is generous but
    // matches the lower-bound observed compile + DOM-sync latency.
    { action: 'wait', duration: 800 },
    {
      action: 'pickColor',
      selector: { byId: 'node-5' },
      prop: 'bg',
      color: '#2271C1',
      comment: 'Button-Hintergrund Mirror-Blau',
    },
    { action: 'wait', duration: 600 },

    // ===================================================================
    // Endbild — Card hervorheben
    // ===================================================================
    { action: 'comment', text: 'Endbild: fertige Profile-Card' },
    { action: 'highlight', target: '#preview', duration: 1500 },
    {
      action: 'expectDom',
      comment: 'Card hat 4 Children: Image, Text, Text, Button',
      checks: [{ selector: { byId: 'node-1' }, childCount: 4 }],
    },
  ],
}
