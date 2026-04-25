/**
 * Visual Editing Demo
 *
 * Mirror-Workflow per Drag & Drop, Resize/Padding/Margin-Handles und
 * Inline-Editing — voll durch echte OS-Maus + Tastatur-Inputs (--driver=os).
 * Empfohlen: --headed --pacing=video --driver=os.
 *
 * Spec & Plan: docs/concepts/visual-editing-demo.md
 *
 * Reihenfolge so gewählt, dass die Card durchgehend sichtbar ist:
 * Drop → Rename → Resize → Inhalts-Drops → Hug → Padding → Margin → …
 * Würden wir h=hug VOR den Inhalts-Drops setzen, wäre die leere Card
 * 0px hoch und für den Viewer unsichtbar.
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
    { action: 'comment', text: 'Card komplett visuell bauen' },
    { action: 'wait', duration: 800 },
    ...validateStudioReady(),

    // === 2. Frame als Card-Container ===
    { action: 'comment', text: 'Schritt 1: Card-Container aus der Palette' },
    ...paletteHighlight('comp-frame', { duration: 1200 }),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame in Canvas',
    },
    { action: 'wait', duration: 600 },

    // === 3. Frame zu Card umbenennen ===
    // Mirror's Komponenten-Alias: `Card as Frame` macht aus dem Bezeichner
    // "Card" einen Frame mit demselben Verhalten. Wir fügen die Definition
    // oben ins Dokument ein und ersetzen den gedropten Frame-Bezeichner
    // durch Card. Direkter Editor-Edit, weil "Component umbenennen" als
    // UI-Operation in Mirror nicht existiert.
    { action: 'comment', text: 'Frame in Card umbenennen' },
    {
      action: 'execute',
      code: `
        (async function() {
          const editor = window.editor;
          const before = editor.state.doc.toString();
          // Specific match: only the inner Frame line we just dropped.
          const renamed = before.replace(
            /^(\\s+)Frame (w 100, h 100, bg #27272a, rad 8)/m,
            '$1Card $2'
          );
          // Trailing colon is required by the Mirror parser — "Card as Frame"
          // without colon is a syntax error.
          const withDef = 'Card as Frame:\\n\\n' + renamed;
          await window.__dragTest.setTestCode(withDef);
          await new Promise(r => setTimeout(r, 200));
        })();
      `,
      comment: 'Frame-Bezeichner → Card + Definition',
    },
    { action: 'wait', duration: 600 },

    // === 4. Resize: Card per SE-Eckhandle größer ziehen ===
    // Diagonaler Eckhandle zieht beide Achsen gleichzeitig — natürliche
    // User-Geste. 180×180 Delta gibt eine 280×280 Card mit Platz für
    // H1 + Text + Button + späteres Padding.
    { action: 'comment', text: 'Schritt 2: Card per Eckhandle vergrößern' },
    {
      action: 'dragResize',
      selector: { byId: 'node-2' },
      position: 'se',
      deltaX: 180,
      deltaY: 180,
      bypassSnap: true,
      comment: 'SE-Handle Δ(180,180) — Card auf ~280×280',
    },
    { action: 'wait', duration: 600 },

    // === 5. H1 in die Card ===
    { action: 'comment', text: 'Schritt 3: Titel (H1) in die Card' },
    ...paletteHighlight('comp-h1'),
    {
      action: 'dropFromPalette',
      component: 'H1',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 0 },
      comment: 'H1 in Card',
    },
    { action: 'wait', duration: 500 },

    // === 6. Text in die Card ===
    { action: 'comment', text: 'Schritt 4: Beschreibung (Text)' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 1 },
      comment: 'Text an Index 1',
    },
    { action: 'wait', duration: 500 },

    // === 7. Button in die Card ===
    { action: 'comment', text: 'Schritt 5: Button' },
    ...paletteHighlight('comp-button'),
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byId: 'node-2' },
      at: { kind: 'index', index: 2 },
      comment: 'Button an Index 2',
    },
    { action: 'wait', duration: 600 },

    // === 8. Padding rundum ===
    { action: 'comment', text: 'Schritt 6: Padding rundum (P + Shift-Drag)' },
    {
      action: 'dragPadding',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 24,
      mode: 'all',
      comment: 'Padding +24 rundum',
    },
    { action: 'wait', duration: 600 },

    // === 9. Margin oben ===
    { action: 'comment', text: 'Schritt 7: Margin oben' },
    {
      action: 'dragMargin',
      selector: { byId: 'node-2' },
      side: 'top',
      delta: 16,
      comment: 'Top-Margin +16',
    },
    { action: 'wait', duration: 600 },

    // === 10. Inline-Edit Titel ===
    { action: 'comment', text: 'Schritt 8: Titel per Doppelklick bearbeiten' },
    {
      action: 'inlineEdit',
      selector: { byTag: 'h1' },
      text: 'Willkommen',
      comment: 'H1 → Willkommen',
    },
    { action: 'wait', duration: 500 },

    // === 11. Inline-Edit Button ===
    { action: 'comment', text: 'Schritt 9: Button-Text bearbeiten' },
    {
      action: 'inlineEdit',
      selector: { byTag: 'button' },
      text: 'Loslegen',
      comment: 'Button → Loslegen',
    },
    { action: 'wait', duration: 600 },

    // === Finale ===
    { action: 'comment', text: 'Card komplett visuell aufgebaut' },
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild' },

    // Endstand-Validierung als Editor-Inhalt-Suche (snapshot-frei, robust
    // gegen kleine Format-Drift durch echte vs. synthetische Drops).
    {
      action: 'validate',
      comment: 'Endstand: alle Komponenten + Texte vorhanden',
      checks: [
        { type: 'editorContains', text: 'Card as Frame' },
        { type: 'editorContains', text: 'canvas mobile' },
        { type: 'editorContains', text: 'Card w' },
        { type: 'editorContains', text: 'H1 "Willkommen"' },
        { type: 'editorContains', text: 'Text "Text"' },
        { type: 'editorContains', text: 'Button "Loslegen"' },
      ],
    },
  ],
}
