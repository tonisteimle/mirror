/**
 * Visual Editing Demo
 *
 * Vollständiger Mirror-Workflow per Drag & Drop, Resize/Padding/Margin-Handles
 * und Inline-Editing — als Spec-by-Example. Jede mutierende Aktion ist eine
 * dedizierte Demo-Action, kein eingebettetes JavaScript. Cursor-Sync und
 * Browser-Interaction laufen zentral im Runner (siehe MIRROR_ACTIONS_API in
 * tools/test-runner/demo/runner.ts).
 *
 * Spec & Plan: docs/concepts/visual-editing-demo.md
 *
 * Validierung: pro mutierender Schritt ein `expectCode` mit erwartetem
 * Editor-Inhalt. Lern-Modus (kein `code`-Feld) dumpt den aktuellen Code für die
 * Erstkalibrierung; danach werden die Snapshots eingefroren.
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'
import { paletteHighlight } from '../fragments/palette'

export const demoScript: DemoScript = {
  name: 'Visual Editing',
  description: 'Card per Drag & Drop bauen — Hierarchie, Sizing, Padding, Margin, Inline-Editing',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Reset ===
    ...resetCanvas(),

    // === Intro ===
    { action: 'comment', text: 'Card komplett visuell bauen — ohne Code zu tippen' },
    { action: 'wait', duration: 1000 },
    ...validateStudioReady(),

    // === 2. Frame als Card-Container in Canvas droppen ===
    // atIndex(0) statt atAlignmentZone('center') — node-1 hat schon `center`,
    // ein zweites würde via parent-property-add ein Duplikat einfügen.
    { action: 'comment', text: 'Schritt 1: Card-Container aus der Palette' },
    ...paletteHighlight('comp-frame', { duration: 500 }),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame in Canvas',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after Frame drop',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },
    // expectDom (A2): structurelle DOM-Validation. Wir prüfen nur das, was
    // tatsächlich vom Drop verändert wurde — die innere Card wurde mit Default-
    // Properties eingefügt und sollte 100×100, kein Padding, bg #27272a haben.
    // Outer-Frame-Werte (Width/Height) sind viewport-abhängig und werden hier
    // nicht festgenagelt; childCount wird geprüft.
    {
      action: 'expectDom',
      comment: 'after Frame drop',
      checks: [
        {
          selector: { byId: 'node-1' },
          tag: 'div',
          childCount: 1,
          layout: { direction: 'vertical', gap: 16, align: 'center' },
        },
        {
          selector: { byId: 'node-2' },
          tag: 'div',
          width: 100,
          height: 100,
          background: '#27272a',
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          childCount: 0,
        },
      ],
    },

    // === 3. Resize: Card breiter ziehen ===
    // Erst resize-east für die Breite. h wird dabei auf einen fixen Wert
    // gesetzt (104), das ist erwartet — wir korrigieren das gleich.
    { action: 'comment', text: 'Schritt 2: Card breiter ziehen (Resize-Handle Ost)' },
    {
      action: 'dragResize',
      selector: { byId: 'node-2' },
      position: 'e',
      deltaX: 180,
      deltaY: 0,
      bypassSnap: true,
      comment: 'Card auf ~280 breit',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after resize east +180',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h 104, bg #27272a, rad 8',
    },

    // === 3b. Höhe auf hug — wächst mit Inhalt ===
    // Card mit fixer Höhe wäre für H1+Text+Button zu klein und würde
    // überlaufen. `h hug` ist die idiomatische Mirror-Lösung: Höhe folgt
    // dem Inhalt automatisch. Nach dem Resize gesetzt damit die Breite fix bleibt.
    { action: 'comment', text: 'Card-Höhe auto — wächst mit Inhalt' },
    {
      action: 'setProperty',
      selector: { byId: 'node-2' },
      prop: 'h',
      value: 'hug',
      comment: 'h = hug (auto-height)',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after h=hug',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8',
    },

    // === 3c. Padding rundum — Card bekommt Innenabstand ===
    // Padding-Handle mit Shift gedrückt zieht alle 4 Seiten gleichzeitig.
    // Delta 24 → pad 24 rundum, deutlich sichtbar im 280px Card.
    { action: 'comment', text: 'Schritt 3: Padding rundum — Card-Innenabstand' },
    {
      action: 'dragPadding',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 24,
      mode: 'all',
      comment: 'Padding +24 rundum (Shift = alle Seiten)',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after pad=24',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24',
    },

    // === 4. H1 in die leere Card ===
    // Index-Drop statt Alignment-Zone: die Card hat zwar Padding, ist aber
    // immer noch sehr flach (h=32 mit pad 16); Alignment-Zonen brauchen 80x80.
    { action: 'comment', text: 'Schritt 4: Titel (H1) in die Card draggen' },
    ...paletteHighlight('comp-h1'),
    {
      action: 'dropFromPalette',
      component: 'H1',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 0 },
      comment: 'H1 in leere Card',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after H1 drop',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24\n' +
        '    H1 "Heading 1", col #e4e4e7',
    },

    // === 5. Text in die Card ===
    { action: 'comment', text: 'Schritt 4: Beschreibung (Text) in die Card' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 1 },
      comment: 'Text an Index 1',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after Text drop',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24\n' +
        '    H1 "Heading 1", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7',
    },

    // === 6. Button in die Card ===
    { action: 'comment', text: 'Schritt 5: Button in die Card' },
    ...paletteHighlight('comp-button'),
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 2 },
      comment: 'Button an Index 2',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after Button drop',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24\n' +
        '    H1 "Heading 1", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7\n' +
        '    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6',
    },

    // === 7. Margin ===
    // Padding wurde bereits in Schritt 3 demonstriert (rundum 16 vor Content).
    // Hier zeigen wir Margin: Card vom Canvas-Rand wegrücken.
    // Reorder kommt erst am Ende — sobald Knoten umsortiert werden, vergibt
    // Mirror neue node-IDs nach AST-Reihenfolge.
    { action: 'comment', text: 'Schritt 7: Margin-Handle ziehen' },
    {
      action: 'dragMargin',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 16,
      comment: 'Top-Margin +16',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after margin top +16',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24, mar-t 16\n' +
        '    H1 "Heading 1", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7\n' +
        '    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6',
    },

    // === 9. Inline-Edit Titel ===
    { action: 'comment', text: 'Schritt 8: Titel per Doppelklick bearbeiten' },
    {
      action: 'inlineEdit',
      selector: { byTag: 'h1' },
      text: 'Willkommen',
      comment: 'H1 → "Willkommen"',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after H1 inline-edit',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24, mar-t 16\n' +
        '    H1 "Willkommen", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7\n' +
        '    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6',
    },

    // === 10. Inline-Edit Button ===
    { action: 'comment', text: 'Schritt 9: Button-Text bearbeiten' },
    {
      action: 'inlineEdit',
      selector: { byTag: 'button' },
      text: 'Loslegen',
      comment: 'Button → "Loslegen"',
    },
    { action: 'wait', duration: 500 },
    {
      action: 'expectCode',
      comment: 'after Button inline-edit',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24, mar-t 16\n' +
        '    H1 "Willkommen", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7\n' +
        '    Button "Loslegen", pad 12 24, bg #5BA8F5, col white, rad 6',
    },

    // === 11. Reorder: Button nach vorne (Index 0) ===
    // Demonstriert Hierarchie-Manipulation 2. Stufe: bestehende Knoten
    // umordnen. Bewusst am Ende, weil moveElement node-IDs neu vergibt.
    { action: 'comment', text: 'Schritt 10: Reorder — Button vor den Titel' },
    {
      action: 'moveElement',
      source: { byTag: 'button' },
      target: { byPath: 'Frame > Frame' },
      index: 0,
      comment: 'Button auf Index 0',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'after reorder (Button → index 0)',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 280, h hug, bg #27272a, rad 8, pad 24, mar-t 16\n' +
        '    Button "Loslegen", pad 12 24, bg #5BA8F5, col white, rad 6\n' +
        '    H1 "Willkommen", col #e4e4e7\n' +
        '    Text "Text", fs 14, col #e4e4e7',
    },

    // === Finale ===
    { action: 'comment', text: 'Fertig — UI komplett visuell aufgebaut' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },

    {
      action: 'validate',
      comment: 'Endstand',
      checks: [
        { type: 'editorContains', text: 'Frame' },
        { type: 'editorContains', text: 'H1' },
        { type: 'editorContains', text: 'Button' },
        { type: 'editorContains', text: 'Willkommen' },
        { type: 'editorContains', text: 'Loslegen' },
        { type: 'noLintErrors', allowWarnings: true },
      ],
    },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
