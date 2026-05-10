# Test-Plan: Preview-Funktionalitäten via CDP

Systematische Abdeckung aller Preview-Interaktionen mit dem neuen Test-Runner (CDP-Trusted Mouse + Keyboard, siehe `docs/TEST-FRAMEWORK.md` „Grundprinzip"). Atomar, inkrementell, mit klarer Verzeichnisstruktur.

## Ziele

- Jede Preview-Interaktion, die ein User mit Maus + Tastatur auslösen kann, hat mindestens einen aussagekräftigen Test.
- Tests sind **klein und benannt nach dem User-Effekt**, nicht nach Implementation.
- Jeder Test ist eigenständig — kein gemeinsamer State zwischen Tests.
- Inkrementelle Wave-Strategie: pro Wave 1-3 neue Tests bauen, Build, Tests laufen, weiter.

## Constraint: nur Maus + Keyboard

Tests dürfen ausschließlich `__mirrorActions.*` (Schicht 3, CDP-getriebene Sequenzen) oder `cdpInput.*` (Schicht 1, atomare Trusted Events) nutzen. **Verboten:**

- `el.click()`, `el.dispatchEvent(...)`, synthetische `MouseEvent`-Konstruktoren
- `controller.startDrag()`, `panel.changeProperty()`, `editor.dispatch()` als Aktion
- `el.focus()`, `el.value = ...`, `el.select()` (alles Selection-/Focus-Mutation ohne Eingabepfad)

## Verzeichnisstruktur

```
studio/test-api/suites/preview-cdp/
├── _shared/                              # Setup-Fixtures, Hilfs-Selektoren
│   ├── fixtures.ts                       # Mirror-Snippets pro Szenario
│   └── selectors.ts                      # Wieder verwendete byPath/byId-Helper
├── 01-palette-drop/                      # Palette → Preview
│   ├── frame-into-empty-canvas.test.ts
│   ├── frame-into-existing-frame.test.ts
│   ├── text-into-frame.test.ts
│   ├── button-into-frame.test.ts
│   ├── icon-into-frame.test.ts
│   ├── append-at-end-vs-index.test.ts
│   └── drop-into-zone-alignment.test.ts
├── 02-move/                              # Preview → Preview
│   ├── reorder-siblings-up.test.ts
│   ├── reorder-siblings-down.test.ts
│   ├── move-into-different-container.test.ts
│   ├── move-out-of-container.test.ts
│   └── escape-cancels-move.test.ts
├── 03-nesting/                           # 1-2 Ebenen
│   ├── frame-into-frame.test.ts
│   ├── text-into-nested-frame.test.ts
│   └── two-levels-deep.test.ts
├── 04-deep-nesting/                      # ≥3 Ebenen
│   ├── three-levels-deep.test.ts
│   ├── five-levels-deep.test.ts
│   └── nested-inside-each.test.ts
├── 05-padding/
│   ├── handle-drag-uniform.test.ts       # Shift = alle Seiten
│   ├── handle-drag-axis-horizontal.test.ts
│   ├── handle-drag-axis-vertical.test.ts
│   ├── handle-drag-single-top.test.ts
│   ├── handle-drag-single-right.test.ts
│   ├── handle-drag-single-bottom.test.ts
│   ├── handle-drag-single-left.test.ts
│   ├── arrow-increment-with-focus.test.ts
│   └── escape-cancels-drag.test.ts
├── 06-margin/                            # gleiche Struktur wie padding
│   ├── handle-drag-uniform.test.ts
│   ├── handle-drag-axis.test.ts
│   ├── handle-drag-single-side.test.ts
│   └── arrow-increment.test.ts
├── 07-gap/
│   ├── handle-drag-horizontal.test.ts    # row-Layout
│   ├── handle-drag-vertical.test.ts      # column-Layout
│   └── arrow-increment.test.ts
├── 08-resize/
│   ├── width-east-handle.test.ts
│   ├── width-west-handle.test.ts
│   ├── height-south-handle.test.ts
│   ├── corner-southeast-handle.test.ts
│   ├── snap-to-sibling-edge.test.ts
│   └── snap-to-token.test.ts
├── 09-inline-edit/
│   ├── double-click-text.test.ts
│   ├── escape-reverts.test.ts
│   └── enter-commits.test.ts
└── 10-property-panel/                    # direkte Eingabe-Felder
    ├── width-input.test.ts
    ├── height-input.test.ts
    ├── radius-input.test.ts
    ├── border-input.test.ts
    ├── gap-input.test.ts
    ├── padding-uniform-input.test.ts
    ├── padding-side-input.test.ts
    ├── margin-input.test.ts
    ├── opacity-input.test.ts
    ├── direction-toggle.test.ts
    ├── alignment-grid.test.ts
    ├── bg-color-picker-via-hex.test.ts
    ├── bg-color-picker-via-token.test.ts
    ├── text-color-picker.test.ts
    ├── border-color-picker.test.ts
    └── icon-color-picker.test.ts
```

## Namenskonventionen

- **Ordner:** `NN-<bereich>/` mit zweistelliger Sortier-Nummer.
- **Dateien:** `<szenario>-<spezifikum>.test.ts` (kebab-case, beschreibt was getestet wird, nicht wie).
- **Test-Name** im File: ein vollständiger Satz, **was** verifiziert wird (User-Sicht). Beispiel: `'Drag Frame from palette to empty preview produces top-level Frame in editor'`. Kein „test1", kein „check_drop".

## Test-File-Template

```ts
/**
 * Preview CDP — Palette drop: Frame into empty canvas.
 *
 * Maus-/Keyboard-Sequenz:
 *   1. Maus drag von Palette-Item "Frame" zur Mitte des leeren Previews.
 *
 * Verifiziert:
 *   - Editor-Code enthält genau eine `Frame`-Zeile.
 *   - Preview rendert genau ein Element mit data-mirror-id.
 *   - Selection landet automatisch auf dem neuen Knoten.
 */
import type { TestCase } from '../../../types'

export const frameIntoEmptyCanvasTests: TestCase[] = [
  {
    name: 'Palette → leeres Preview: Frame wird Top-Level-Knoten',
    fixture: '',
    test: async api => {
      const actions = (window as any).__mirrorActions
      await actions.dropFromPalette('Frame', { byPath: 'preview' })
      // Behauptung 1: genau ein Knoten im Editor
      const code = api.editor.getValue().trim()
      api.assert.match(code, /^Frame\b/, 'editor source should start with `Frame`')
      // Behauptung 2: genau ein gerendertes Mirror-Element
      const ids = api.preview.getNodeIds()
      api.assert.equals(ids.length, 1, 'preview has exactly one node')
      // Behauptung 3: Auto-Selection
      api.assert.equals(api.panel.property.getSelectedNodeId(), ids[0], 'auto-selected')
    },
  },
]
```

## Registrierung

Jede Wave fügt einen Eintrag in `studio/test-api/suites/categories.ts` hinzu, **nicht** je File einen. Konvention:

```ts
import { frameIntoEmptyCanvasTests } from './preview-cdp/01-palette-drop/frame-into-empty-canvas.test'
import { frameIntoExistingFrameTests } from './preview-cdp/01-palette-drop/frame-into-existing-frame.test'
// ...

export const previewCdpPaletteDropTests: TestCase[] = [
  ...frameIntoEmptyCanvasTests,
  ...frameIntoExistingFrameTests,
  // …
]

// in CATEGORIES:
'preview-cdp.palette-drop': {
  name: 'preview-cdp.palette-drop',
  description: 'Palette → Preview drops via CDP mouse',
  tests: previewCdpPaletteDropTests,
},
```

Subkategorien-Namen (`preview-cdp.palette-drop`) erlauben gezieltes Ausführen pro Bereich:

```bash
npx tsx tools/test.ts --category=preview-cdp.palette-drop
npx tsx tools/test.ts --filter="Palette →"  # alle palette-Tests
```

## Wave-Plan (incremental)

Jede Wave: **bauen → atomic-tests grün → 1-3 neue Tests → build:studio → Tests laufen → committen.** Kein Wave-Sprung ohne grünen Suite-Lauf.

| Wave | Bereich                        | Tests                                                                                                               | Verifikation                                              |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | Infrastruktur                  | `_shared/fixtures.ts`, `_shared/selectors.ts`, neue Kategorie in `categories.ts` (leer), erste Test-Datei als Smoke | Suite-Runner findet die Kategorie, leere Liste läuft grün |
| 2    | 01-palette-drop                | Frame→empty, Frame→Frame, Text→Frame                                                                                | 3/3 grün                                                  |
| 3    | 01-palette-drop (cont.)        | Button, Icon, append-vs-index, zone-alignment                                                                       | 7/7 grün                                                  |
| 4    | 02-move                        | reorder up/down, into-different, out-of, escape-cancels                                                             | 5/5 grün                                                  |
| 5    | 03-nesting                     | Frame→Frame, Text→nested, two-levels                                                                                | 3/3 grün                                                  |
| 6    | 04-deep-nesting                | drei, fünf, in-each                                                                                                 | 3/3 grün                                                  |
| 7    | 05-padding                     | uniform, axis-h, axis-v, vier Single-Sides, arrow-key, escape                                                       | 9/9 grün                                                  |
| 8    | 06-margin                      | uniform, axis, single, arrow                                                                                        | 4/4 grün                                                  |
| 9    | 07-gap                         | hor, ver, arrow                                                                                                     | 3/3 grün                                                  |
| 10   | 08-resize                      | east, west, south, corner, snap-sibling, snap-token                                                                 | 6/6 grün                                                  |
| 11   | 09-inline-edit                 | double-click, escape, enter                                                                                         | 3/3 grün                                                  |
| 12   | 10-property-panel (numerische) | width, height, radius, border, gap, padding-uniform, padding-side, margin, opacity                                  | 9/9 grün                                                  |
| 13   | 10-property-panel (visual)     | direction, alignment, color-picker × 4 (bg/text/border/icon)                                                        | 6/6 grün                                                  |

Total: ~62 Tests, 13 Waves.

## Per-Wave-Workflow

1. Wave-Tasks im Tracker anlegen (`TaskCreate`).
2. Test-Datei(en) schreiben.
3. `npm run build:studio`.
4. `npx tsx tools/atomic-input-tests.ts --studio` — Smoke (8/8).
5. `npx tsx tools/test.ts --category=preview-cdp.<bereich>` — Wave-Tests.
6. Bei Failure: nicht den Helper aufweichen, sondern Test debuggen oder Studio-Bug aufnehmen.
7. Commit mit `test(preview-cdp): <wave-bereich> — N/N grün`.
8. Nächste Wave.

## Erfolgs-Kriterien

- Alle 62 Tests laufen über `npx tsx tools/test.ts --category=preview-cdp` grün.
- Kein Test ruft `el.click()`, `el.dispatchEvent`, `controller.*`, `panel.*` etc. auf.
- Atomic-Smoke-Tests bleiben durchgängig 8/8.
- Suite-Test-Stack der bestehenden 177 Files bleibt unangetastet (separate Migration später).

## Was NICHT zum Plan gehört

- Migration der existierenden 177 Suite-Tests auf CDP — separates Projekt.
- Video-/Demo-Aufnahme — der alte Demo-Runner ist gelöscht; falls eine Video-Demonstration gewünscht ist, ist das ein eigenes Projekt mit klarer Anforderung (headed Chrome + nut-js OS-Maus).
- Zag-Komponenten (DatePicker) — die haben eigene Suite, separat.

## Verankerung

- Plan-Doku: dieses File. Wird nach Abschluss aller Waves nach `docs/archive/` verschoben.
- Grundprinzip: `docs/TEST-FRAMEWORK.md` „Grundprinzip — Maus und Keyboard".
- CLAUDE.md: `## Tests` referenziert TEST-FRAMEWORK.md.
- Memory: `feedback_test_input_principle.md` (User-Quote vom 2026-05-10).
