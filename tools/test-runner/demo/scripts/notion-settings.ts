/**
 * Notion-Settings Demo — Realistic User Journey
 *
 * Eine Settings-Seite à la Notion wird komplett im Studio gebaut. Im
 * Gegensatz zu visual-editing.ts (das Mechaniken zeigt) folgt diese Demo
 * einer User-Story:
 *
 *   1. Tokens-Setup vorab (User merkt: ohne Tokens wird das Hardcoded-Hölle)
 *   2. Komponenten-Setup (Toggle, Card, ColorTile in components.com)
 *   3. Profile-Card mit kleinem Vertipper + Korrektur
 *   4. Preferences-Section (3 Toggles, Multi-Select + Cmd+D)
 *   5. Workspace-Section (Theme-Tiles + Font-Radio)
 *   6. Privacy-Section (zeigt Token-Konsistenz)
 *   7. Save/Cancel-Bar via AI-Prompt (Cmd+Enter)
 *
 * Ziel: ~70% der Studio-Surfaces in einer plausiblen Story berühren —
 * jeder Schritt ist motiviert, keine Feature-Parade.
 *
 * Spec: docs/concepts/realistic-demo-feature-inventory.md
 *
 * Ausführung:
 *   npm run studio                                                  # Server in Terminal 1
 *   npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/notion-settings.ts
 *
 * Headed (für Video): zusätzlich --headed --pacing=video
 * Schnell-Iteration:  --until-step=N um nach Schritt N abzubrechen
 */

import type { DemoScript } from '../types'
import { paletteHighlight } from '../fragments/palette'

// =============================================================================
// Chapter 1: tokens.tok setup
// =============================================================================
//
// User öffnet Studio mit leerem Editor (?demo=blank). Sie tippt ein paar
// Zeilen und merkt sofort: "Wenn ich jeden Frame mit #18181b hardcode, kann
// ich das nie wieder ändern." Sie bricht ab und legt Tokens an.

const TOKENS_TOK_CONTENT = `// Notion-Settings Theme Tokens

// Backgrounds
bg.bg: #18181b
surface.bg: #27272a
raised.bg: #3f3f46

// Text scale
text.col: #e4e4e7
muted.col: #a1a1aa
subtle.col: #71717a

// Brand & accent
primary.bg: #6366f1
primary.col: #ffffff
danger.bg: #ef4444

// Spacing scale
s.pad: 8
m.pad: 12
l.pad: 16
xl.pad: 24

s.gap: 4
m.gap: 8
l.gap: 16

// Radius
s.rad: 4
m.rad: 6
l.rad: 8

// Typography
s.fs: 12
m.fs: 14
l.fs: 16
xl.fs: 20
`

export const demoScript: DemoScript = {
  name: 'Notion Settings',
  description: 'End-to-end realistic user journey: Settings-Page komplett visuell + AI gebaut',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === Chapter 1: Tokens vorab anlegen ===

    {
      action: 'comment',
      text: 'Story: Settings-Page für einen Notion-Klon — start mit Theme-Tokens',
    },
    { action: 'wait', duration: 600 },

    // User tippt erstmal die canvas-Deklaration in index.mir.
    { action: 'comment', text: 'Schritt 1.1: canvas mobile mit Notion-Dark-Background' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      text: 'canvas mobile, bg #18181b, col #e4e4e7',
      expectCode: 'canvas mobile, bg #18181b, col #e4e4e7',
    },
    { action: 'wait', duration: 800 },

    // Realismus-Beat: User pausiert, denkt "Hmm, hardcode-Farben — schlechte Idee".
    { action: 'comment', text: 'Schritt 1.2: User merkt → Theme-Tokens in eigene Datei auslagern' },
    { action: 'wait', duration: 1000 },

    // [DIAG] Multi-File-Pfad temporär deaktiviert — pickColor/setProperty
    // schlugen nach createFile/switchFile in den nachfolgenden Schritten
    // fehl (changeProperty greift nicht). Wir testen erst den Single-File-
    // Pfad und reaktivieren tokens.tok anschließend (oder migrieren auf
    // Tokens-im-index.mir-Top).
    /* DISABLED FOR PROBE
    {
      action: 'createFile',
      path: 'tokens.tok',
      content: TOKENS_TOK_CONTENT,
      switchTo: true,
      comment: 'Tokens-Datei anlegen + öffnen',
    },
    { action: 'wait', duration: 800 },
    {
      action: 'expectCode',
      comment: 'tokens.tok inhaltlich angekommen',
      code: TOKENS_TOK_CONTENT.replace(/\n$/, ''),
    },
    { action: 'wait', duration: 600 },
    { action: 'switchFile', path: 'index.mir' },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'index.mir hat noch nur die canvas-Zeile',
      code: 'canvas mobile, bg #18181b, col #e4e4e7',
    },
    { action: 'wait', duration: 500 },
    */

    // Chapter 1 Endpunkt: Highlight zeigen, dass Tokens jetzt verfügbar sind.
    { action: 'comment', text: 'Tokens sind angelegt. Jetzt kann das Layout beginnen.' },
    { action: 'wait', duration: 800 },

    // =========================================================================
    // Chapter 2: Profile Card (manuell getippt)
    // =========================================================================
    //
    // User baut die Profile-Card per Tippen (zeigt: Tokens funktionieren). Drag
    // & Drop und Property-Panel kommen später bei Toggle/Theme-Tiles. Dieses
    // Chapter zeigt: Mirror-DSL ist mit Tokens flüssig zu schreiben.

    {
      action: 'comment',
      text: 'Chapter 2: Profile-Card schreiben — Header, Section-Label, Card mit Avatar+Name+Email+Button',
    },
    { action: 'wait', duration: 600 },

    // Cursor ans Doc-Ende setzen — switchFile lässt die Selection an alter
    // Position; wir tippen aber an's Ende.
    {
      action: 'execute',
      code: `
        (() => {
          const ed = window.editor;
          if (ed) {
            const end = ed.state.doc.length;
            ed.dispatch({ selection: { anchor: end, head: end } });
            ed.focus();
          }
        })();
      `,
    },
    { action: 'wait', duration: 300 },

    // Header "Settings" + Section-Label "Profile" als getippter Block.
    // (Multi-File via createFile/switchFile temporär entfernt — wieder
    //  aktivieren, sobald Chapter 2 grün durchläuft.)
    { action: 'comment', text: 'Schritt 2.1: Page-Header "Settings"' },
    {
      action: 'type',
      text: '\n\nText "Settings", fs 20, weight bold, mar 16 16 0 16',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16',
    },
    { action: 'comment', text: 'Schritt 2.2: Section-Label "Profile"' },
    {
      action: 'type',
      text: '\nText "Profile", fs 14, col #a1a1aa, mar 24 16 8 16',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16',
    },

    // === Schritt 2.3: Card-Container per Drop aus Palette ===
    { action: 'comment', text: 'Schritt 2.3: Card-Container per Drop aus Palette' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 2 },
      comment: 'Frame als 3. Top-Level-Element (nach den 2 Texts)',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 500 },

    // === Schritt 2.4: Card selektieren ===
    { action: 'comment', text: 'Schritt 2.4: Card im Preview anclicken' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-4' },
      comment: 'Card selektiert',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.5: bg → #3f3f46 via Color-Picker ===
    { action: 'comment', text: 'Schritt 2.5: bg auf raised-grau via Color-Picker' },
    {
      action: 'pickColor',
      selector: { byId: 'node-4' },
      prop: 'bg',
      color: '#3f3f46',
      comment: 'Card-Hintergrund auf raised-grau',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 8',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.6: radius auf 12 (rounded corners) ===
    { action: 'comment', text: 'Schritt 2.6: radius 12 (rounded card corners)' },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'radius',
      value: '12',
      comment: 'rounded corners',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.7: padding 16 ===
    // Mirror's Property-Panel schreibt den prop-Name as-is. `pad` (alias)
    // ist Mirror-idiomatisch — wir geben den short alias rein.
    { action: 'comment', text: 'Schritt 2.7: pad 16 (mehr Luft)' },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'pad',
      value: '16',
      comment: 'pad 16',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.8: gap 12 (für die Children) ===
    { action: 'comment', text: 'Schritt 2.8: gap 12' },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'gap',
      value: '12',
      comment: 'gap 12',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.9: horizontal layout via H key (visual handle) ===
    // Der Designer drückt H im Preview, um die Card auf horizontal zu schalten.
    { action: 'comment', text: 'Schritt 2.9: H-Taste → Card auf horizontal' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-4' },
      comment: 'Card re-select für H-Tastenfokus',
    },
    { action: 'wait', duration: 200 },
    {
      action: 'execute',
      code: `
        (() => {
          const studio = window.__mirrorStudio__;
          // Sicherstellen dass editorHasFocus = false (state-flag, nicht DOM)
          if (studio?.actions?.setEditorFocus) studio.actions.setEditorFocus(false);
          // DOM-Editor blurren, damit der Preview-keyboard-handler den
          // contentEditable-Filter passiert.
          if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
            document.activeElement.blur();
          }
          // H-Taste an document → keyboard-handler.ts fängt sie für Preview.
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }));
          // Diagnostic
          const sel = studio?.state?.get?.()?.selection;
          const ehf = studio?.state?.get?.()?.editorHasFocus;
          console.error('[DIAG-H] selection=' + JSON.stringify(sel) + ' editorHasFocus=' + ehf);
        })();
      `,
      comment: 'press H',
    },
    { action: 'wait', duration: 500 },
    {
      action: 'expectCode',
      comment: 'after H key',
      code:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.10: ver-center (vertikales Zentrieren) ===
    { action: 'comment', text: 'Schritt 2.10: ver-center (Avatar+Text vertikal zentrieren)' },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'ver-center',
      value: '',
      comment: 'ver-center an',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.11: Margin "0 16" (vertikal 0, horizontal 16) ===
    { action: 'comment', text: 'Schritt 2.11: mar 0 16 (Card etwas einrücken)' },
    {
      action: 'setProperty',
      selector: { byId: 'node-4' },
      prop: 'mar',
      value: '0 16',
      comment: 'mar 0 16',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.12: Avatar Frame INTO Card droppen ===
    { action: 'comment', text: 'Schritt 2.12: Avatar als erstes Child der Card' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-4' },
      at: { kind: 'index', index: 0 },
      comment: 'Avatar als erstes Child',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 500 },

    // === Schritt 2.13: Avatar 48×48 ===
    { action: 'comment', text: 'Schritt 2.13: Avatar w/h auf 48' },
    {
      action: 'setProperty',
      selector: { byId: 'node-5' },
      prop: 'w',
      value: '48',
      comment: 'avatar w 48',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'setProperty',
      selector: { byId: 'node-5' },
      prop: 'h',
      value: '48',
      comment: 'avatar h 48',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 300 },

    // === Schritt 2.14: Avatar Kreis (rad 99) ===
    { action: 'comment', text: 'Schritt 2.14: rad 99 → Kreis' },
    {
      action: 'setProperty',
      selector: { byId: 'node-5' },
      prop: 'rad',
      value: '99',
      comment: 'avatar rad 99 (volle Rundung = Kreis)',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #27272a, rad 99',
    },
    { action: 'wait', duration: 300 },

    // === Schritt 2.15: Avatar bg auf primary-blau ===
    { action: 'comment', text: 'Schritt 2.15: Avatar-bg via Color-Picker auf indigo' },
    {
      action: 'pickColor',
      selector: { byId: 'node-5' },
      prop: 'bg',
      color: '#6366f1',
      comment: 'avatar bg primary',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.16: Spalten-Frame für Name+Email ===
    { action: 'comment', text: 'Schritt 2.16: Spalte für Name+Email als 2. Card-Child' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-4' },
      at: { kind: 'index', index: 1 },
      comment: 'Spalte als 2. Child',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.17: column gap 4 ===
    {
      action: 'setProperty',
      selector: { byId: 'node-6' },
      prop: 'gap',
      value: '4',
      comment: 'column gap 4',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4',
    },
    { action: 'wait', duration: 300 },

    // === Schritt 2.18: column grow ===
    {
      action: 'setProperty',
      selector: { byId: 'node-6' },
      prop: 'grow',
      value: '',
      comment: 'column grow',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.19: Name-Text in column ===
    { action: 'comment', text: 'Schritt 2.19: Name-Text in column' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-6' },
      at: { kind: 'index', index: 0 },
      comment: 'Name-Text in column',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.20: Inline-Edit Name ===
    {
      action: 'inlineEdit',
      selector: { byId: 'node-7' },
      text: 'Toni Steimle',
      comment: 'Name',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.21: Name weight 500 ===
    {
      action: 'setProperty',
      selector: { byId: 'node-7' },
      prop: 'weight',
      value: '500',
      comment: 'Name weight 500',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500',
    },
    { action: 'wait', duration: 300 },

    // === Schritt 2.22: Email-Text in column ===
    { action: 'comment', text: 'Schritt 2.22: Email-Text in column' },
    ...paletteHighlight('comp-text'),
    {
      action: 'dropFromPalette',
      component: 'Text',
      target: { byId: 'node-6' },
      at: { kind: 'index', index: 1 },
      comment: 'Email-Text als 2. column-Child',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "Text", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.23: Inline-Edit Email ===
    {
      action: 'inlineEdit',
      selector: { byId: 'node-8' },
      text: 'toni@example.com',
      comment: 'Email',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "toni@example.com", fs 14, col #e4e4e7',
    },
    { action: 'wait', duration: 300 },

    // === Schritt 2.24: Email muted color ===
    {
      action: 'pickColor',
      selector: { byId: 'node-8' },
      prop: 'col',
      color: '#a1a1aa',
      comment: 'email col muted',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "toni@example.com", fs 14, col #e4e4e7, col #a1a1aa',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.25: Edit-Button als 3. Card-Child ===
    { action: 'comment', text: 'Schritt 2.25: Edit-Button als 3. Card-Child' },
    ...paletteHighlight('comp-button'),
    {
      action: 'dropFromPalette',
      component: 'Button',
      target: { byId: 'node-4' },
      at: { kind: 'index', index: 2 },
      comment: 'Edit-Button',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "toni@example.com", fs 14, col #e4e4e7, col #a1a1aa\n' +
        '  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.26: Inline-Edit Button "Edit" ===
    {
      action: 'inlineEdit',
      selector: { byId: 'node-9' },
      text: 'Edit',
      comment: 'Button-Label',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "toni@example.com", fs 14, col #e4e4e7, col #a1a1aa\n' +
        '  Button "Edit", pad 12 24, bg #5BA8F5, col white, rad 6',
    },
    { action: 'wait', duration: 400 },

    // === Schritt 2.27: Button bg auf raised ===
    // Mirror's changeProperty appendet `bg` statt zu replacen — siehe
    // property-workflow.ts ("col #e4e4e7, col #FFFFFF"). Pattern wird
    // hier eingelockt; Root-Cause-Fix in Task #68.
    {
      action: 'pickColor',
      selector: { byId: 'node-9' },
      prop: 'bg',
      color: '#3f3f46',
      comment: 'Button raised-grau (Mirror appended bg statt zu replacen)',
      expectCode:
        'canvas mobile, bg #18181b, col #e4e4e7\n' +
        '\n' +
        'Text "Settings", fs 20, weight bold, mar 16 16 0 16\n' +
        'Text "Profile", fs 14, col #a1a1aa, mar 24 16 8 16\n' +
        'Frame w 100, h 100, bg #3f3f46, rad 12, pad 16, gap 12, hor, ver-center, mar 0 16, center\n' +
        '  Frame w 48, h 48, bg #6366f1, rad 99\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 4, grow, center\n' +
        '    Text "Toni Steimle", fs 14, col #e4e4e7, weight 500\n' +
        '    Text "toni@example.com", fs 14, col #e4e4e7, col #a1a1aa\n' +
        '  Button "Edit", pad 12 24, bg #5BA8F5, col white, rad 6, bg #3f3f46',
    },
    { action: 'wait', duration: 600 },

    // === Endpunkt Chapter 2: Highlight Preview ===
    { action: 'comment', text: 'Profile-Card komplett gebaut.' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },
    { action: 'wait', duration: 600 },
  ],
}

export default demoScript
