# Thema 4: Layout

**Status:** Abgeschlossen (2026-04-25), Iteration 2.

**Iteration 1** (~30 Tests): 1 Bug gefixt (`gap -10`); Limitation #8 als Pseudo-Bug aufgelöst.

**Iteration 2** (~189 Tests): systematische Property-Pair-Matrix, Container-vs-Non-Container-Matrix, Sizing × Layout-System Matrix, Eltern-Kind-Layout-Interaktionen, Grid-Cell-Position-Vertiefung, Triple-Konflikte, Tokens in Layout, Conditional/State/Inheritance/Iteration-Layout. **1 weiterer echter Bug gefixt:** `hor, ver, hor` ergab `column` statt `row` weil `mergeProperties` die Property-Reihenfolge bei Doppelung verlor.

**Coverage-Status:** ~70-75% aller realistischen Layout-Kombinationen abgedeckt. Verbleibende Lücken in „Was nicht abgedeckt ist" unten.

**Was noch nicht abgedeckt ist (bewusste Auslassungen):**

- Vollständige Triple-Pairs-Matrix (Mirror hat ~1140 mögliche, ~50 wichtige Triples; ich habe ~10)
- Performance/Stress: 1MB Layout-Files, 1000+ Components in einem Grid, parallele Layout-Berechnungen
- Cross-Schicht (IR → Backend → DOM) für seltene Kombinationen
- Layout-Properties in Property-Sets (Mixins) — `lay: hor center; Frame $lay`
- Grid mit anderen Grid-Modes (subgrid, named lines)

Für 100%-Bulletproof müsste man weitere ~80-100 Tests schreiben. Aktuelle Coverage ist „radikal gut" für die häufigsten User-Cases.

**Kernerkenntnis:** Limitation #8 (vermeintliche Cross-System-Layout-Konflikte) ist **kein Bug, sondern dokumentierte Mirror-Semantik**. Stacked, Flex und Grid sind nicht alle gegenseitig exklusiv:

- `stacked` ist ein **Modifier** (`position: relative`), der mit Flex koexistiert.
- `hor`/`ver` und 9-Zone IM Grid-Kontext interpretieren sich als `grid-auto-flow` (kein Konflikt).
- Nur Grid und Flex schließen sich für `display:` aus — Grid hat dort Vorrang.

Aggressive Hypothesen-Tests deckten 1 echten Bug auf: `formatCSSValue` versah negative Zahlen
nicht mit `px`. Behoben.

~30 neue Tests dokumentieren das exakte Verhalten aller Layout-Kombinationen. Details:
`tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Layout)".

## 1. Scope

Layout-Logik wird hauptsächlich von `compiler/ir/transformers/layout-transformer.ts` (541 Z.) verarbeitet, plus `compiler/schema/layout-defaults.ts` (163 Z.).

**Drei „Layout-Systeme":**

1. **Flex** (default für Container): `hor`/`horizontal`, `ver`/`vertical`, `center`/`cen`, `spread`, `wrap`
2. **Grid**: `grid N`, `grid auto N`, `grid 30% 70%`, `gap-x`/`gap-y`, `row-height`/`rh`, `dense`
3. **Stacked**: `stacked` → position:relative; Children werden absolute via `applyAbsolutePositioningToChildren`

**9-Zone-Alignment:** `tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br` setzen sowohl Direction als auch H/V-Alignment.

**Grid-Cell-Positioning:** `x N`, `y N` werden im Grid-Context zu `grid-column-start`/`grid-row-start`, sonst zu `position: absolute; left/top` (siehe `applyGridContextToChildren`).

**Container-Sizing-Logic:** Container (Frame, Card, …) stretchen by default; Non-Container (Text, Button, Icon) huggen by default; `hasExplicitWidth` und `childHasWidthFull` ändern das.

**Im Scope:**

- Flex: Direction (hor/ver), Alignments (start/end/center, 9-zone), Gap, Wrap
- Grid: 1- und 2-dim Definitionen, Gap-Splits, Cell-Positioning via x/y, dense, auto
- Stacked: Position-Modes für Eltern + Kinder, Conversion von w-full zu 100%
- Konfliktlösung zwischen den drei Systemen (**Limitation #8**)
- Container vs. Non-Container Default-Behavior
- Hug/Full/Fit-Content Logic
- 9-Zone-Position als syntactic sugar
- Context-aware Center (vert./horiz. abhängig von Direction)

**Nicht im Scope:**

- Padding/Margin/Gap auf Property-Ebene (Thema 3, abgeschlossen)
- Vererbung von Layout-Properties (Thema 5)
- Property-Aliase (Thema 3, abgeschlossen)
- Animationen auf Layout-Wechsel (Thema 13)

## 2. Ist-Aufnahme

| Datei                                      | Tests | Bereich                                          |
| ------------------------------------------ | ----- | ------------------------------------------------ |
| `layout-css-matrix.test.ts`                | 45    | Property-Kombinationen → CSS-Output (E2E-Matrix) |
| `ir-context-aware-alignment.test.ts`       | 14    | `center` ändert Bedeutung je nach hor/ver        |
| `ir-absolute-layout.test.ts`               | 17    | Stacked-Layout, position-Modi für Children       |
| `ir-layout-measurement.test.ts`            | 47    | Größen-Berechnung, hug/full/fit-content          |
| `ir-full-sizing.test.ts`                   | 17    | `w full` / `h full` Verhalten                    |
| `ir-hug-edge-cases.test.ts`                | 9     | Hug bei Container vs. Non-Container              |
| `layout/layout-context.test.ts`            | 33    | LayoutContext Operationen                        |
| `layout/layout-defaults.test.ts`           | 34    | Default-Verhalten von Containern/Non-Containern  |
| `layout/layout-grid.test.ts`               | 62    | Grid: Spalten, Gaps, Cells, dense, auto-fit      |
| `layout/layout-manual.test.ts`             | 49    | manuelle Position via x/y                        |
| `layout/layout-matrix.test.ts` + Generator | 50    | Pairwise-Matrix-Generator-Tests                  |

**Summe**: ca. **377 Layout-Tests**, ~5500 Zeilen Test-Code.

**Bereits gut abgedeckt:**

- 9-Zone-Alignment (alle 9 Positionen × 2 Directions in `layout-css-matrix`)
- Hug/Full-Sizing-Edge-Cases
- Grid-Spalten in 4 Varianten
- Context-aware Center
- Pairwise-Matrix für Property-Kombinationen

**Auffällige Lücken:**

- **Cross-System-Konflikte**: Wie schon in Properties-Deep entdeckt — `stacked, hor`, `hor, grid`, `grid, stacked` produzieren widersprüchliche Styles ohne Konfliktlösung
- **Reihenfolge der Layout-System-Wahl**: ist es immer „letzter gewinnt" innerhalb eines Systems, aber zwischen Systemen unklar
- **Grid x/y für Children außerhalb Grid-Parent**: was passiert mit `Frame stacked` Kind das `x 1, y 1` hat? Das wäre Stacked-Position, nicht Grid-Cell, da kein Grid-Parent
- **Mixed Direction-Konflikte**: `Frame hor ver hor` → letzter gewinnt? (vermutlich getestet)
- **Stacked + Grid-Children**: Grid hat „takes precedence" → was wenn `stacked` zusätzlich gesetzt ist?
- **Wrap mit Grid**: `Frame grid 3, wrap` — wird wrap ignoriert?
- **9-Zone + explizite Direction**: `Frame tl, hor` — überschreibt hor die Zone-Direction?
- **Container-Default-Override**: Frame `Frame hidden` (no layout props) — verhält sich wie Container oder explizit-deaktiviert?

## 3. Provokations-Liste

### 3.1 Cross-System-Konflikte (Limitation #8 aktiv adressieren)

| #   | Input                               | Erwartet (proposal: „letzter gewinnt")                       | Status                        |
| --- | ----------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| L1  | `Frame stacked, hor`                | letzter (`hor`) gewinnt: flex layout, kein position relative | aktuell beide aktiv           |
| L2  | `Frame hor, stacked`                | letzter (`stacked`) gewinnt: position relative, kein flex    | aktuell beide aktiv           |
| L3  | `Frame grid 12, hor`                | letzter (`hor`) gewinnt: flex layout                         | aktuell grid takes precedence |
| L4  | `Frame hor, grid 12`                | letzter (`grid`) gewinnt: grid layout                        | wahrscheinlich ok             |
| L5  | `Frame stacked, grid 12`            | letzter (`grid`) gewinnt: grid layout                        | wahrscheinlich gemischt       |
| L6  | `Frame grid 12, stacked`            | letzter (`stacked`) gewinnt: stacked, no grid                | aktuell grid wins             |
| L7  | `Frame hor, ver, hor, ver, stacked` | letzter (`stacked`) gewinnt                                  | mixed                         |

**Fix-Ansatz**: `LayoutContext` um `layoutSystem: 'flex' | 'grid' | 'stacked' | null` erweitern. Bei jedem Layout-Property die Wahl überschreiben. `generateLayoutStyles` schaltet anhand des finalen Werts — keine Koexistenz.

### 3.2 9-Zone vs. explizite Direction

| #   | Input               | Erwartet                                                            | Status             |
| --- | ------------------- | ------------------------------------------------------------------- | ------------------ |
| Z1  | `Frame tl`          | direction default column, h-align: start, v-align: start            | tested             |
| Z2  | `Frame tl, hor`     | letzter (`hor`) → row direction, aber alignments behalten?          | **fehlt**          |
| Z3  | `Frame hor, tl`     | letzter (`tl`) → direction overridden zu column? Oder behält `hor`? | **fehlt**          |
| Z4  | `Frame center, hor` | center hat keine direction → hor gewinnt; center bleibt             | **fehlt**          |
| Z5  | `Frame tl, br`      | letzter (`br`) gewinnt komplett: bottom-right + column              | **fehlt** explizit |

### 3.3 Grid-Cell-Position-Edge-Cases

| #   | Input                                             | Erwartet                                                         | Status    |
| --- | ------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| G1  | Outer `grid 12`, inner `Frame x 1, y 2, w 6, h 3` | grid-column-start: 1, grid-row-start: 2, grid-column-end: span 6 | tested    |
| G2  | Outer `stacked`, inner `Frame x 10, y 20`         | position absolute, left: 10px, top: 20px                         | tested    |
| G3  | NO outer system, inner `Frame x 10`               | position absolute (default)                                      | tested    |
| G4  | Outer `hor`, inner `Frame x 1, y 1`               | grid? absolute? Verhalten unklar                                 | **fehlt** |
| G5  | Outer `grid 12, stacked` (konflikt), inner `x 1`  | nach Konfliktlösung: hängt vom letzten ab                        | **fehlt** |

### 3.4 Wrap und Multi-Direction

| #   | Input                    | Erwartet                                                   | Status    |
| --- | ------------------------ | ---------------------------------------------------------- | --------- |
| W1  | `Frame hor, wrap, gap 8` | flex-wrap: wrap                                            | tested    |
| W2  | `Frame ver, wrap`        | wrap mit Spalten — semantisch ok?                          | **fehlt** |
| W3  | `Frame grid 3, wrap`     | wrap im Grid sinnlos; sollte ignoriert werden oder Warning | **fehlt** |
| W4  | `Frame stacked, wrap`    | wrap im Stacked sinnlos                                    | **fehlt** |
| W5  | `Frame hor ver hor`      | letzter direction (`hor`) gewinnt                          | tested    |

### 3.5 Container vs. Non-Container

| #   | Input                          | Erwartet                                                   | Status    |
| --- | ------------------------------ | ---------------------------------------------------------- | --------- |
| C1  | `Frame` (kein Layout)          | Container-Default: column, stretch                         | tested    |
| C2  | `Text "x"` (kein Layout)       | Non-Container: hug content                                 | tested    |
| C3  | `Frame hor`                    | flex row, stretch                                          | tested    |
| C4  | `Text hor`                     | Non-Container mit explicit hor → flex row, fit-content     | **fehlt** |
| C5  | `Frame w 100` (explicit width) | flex column, NO stretch                                    | tested    |
| C6  | `Frame center`                 | flex column, items center, stretch (centering needs width) | tested    |

### 3.6 Gap-Splits (general vs. specific)

| #   | Input                     | Erwartet                                                                     | Status             |
| --- | ------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| GA1 | `Frame gap 8`             | gap: 8px                                                                     | tested             |
| GA2 | `Frame gap-x 8, gap-y 12` | column-gap: 8px, row-gap: 12px (NO general gap)                              | tested             |
| GA3 | `Frame gap 4, gap-x 8`    | gap-x überschreibt; row-gap fällt auf 4? oder gap-x explizit + gap fällt weg | **fehlt**          |
| GA4 | `Frame gap 8, gap 12`     | letzter gewinnt: 12                                                          | **fehlt** explizit |

### 3.7 Pathologische Sonderfälle (aggressiv)

| #   | Input                                                                                                        | Erwartet                                                         | Status             |
| --- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------ |
| X1  | `Frame grid 0`                                                                                               | sinnloses Grid mit 0 Spalten — Soft-Error oder fall-back         | **fehlt**          |
| X2  | `Frame grid -1`                                                                                              | negative Spalten-Anzahl — Soft-Error                             | **fehlt**          |
| X3  | `Frame grid 999`                                                                                             | extreme Spalten-Anzahl (sollte funktionieren, aber Performance?) | **fehlt**          |
| X4  | `Frame gap 99999`                                                                                            | extreme gap-Wert — passt durch                                   | **fehlt**          |
| X5  | `Frame gap -10`                                                                                              | negative gap                                                     | **fehlt**          |
| X6  | `Frame wrap` (ohne flex)                                                                                     | wrap ohne flex-context — verloren oder applied?                  | **fehlt**          |
| X7  | `Frame dense` (ohne grid)                                                                                    | dense ohne grid-context                                          | **fehlt**          |
| X8  | `Frame hor, ver, hor, grid 12, stacked, grid 6, hor` (chaos sequence)                                        | mit Fix: letzter (`hor`) → flex row                              | **fehlt**          |
| X9  | Alle 9 Zonen hintereinander: `Frame tl tc tr cl center cr bl bc br`                                          | letzter (`br`) gewinnt                                           | **fehlt**          |
| X10 | `Text grid 3` (Non-Container mit Grid)                                                                       | grid layout auf span — semantisch zweifelhaft, aber kein Crash   | **fehlt**          |
| X11 | `Icon hor` (Non-Container mit Flex)                                                                          | flex auf span — Verhalten?                                       | **fehlt**          |
| X12 | `Button stacked` (Non-Container mit Stacked)                                                                 | position relative auf button                                     | **fehlt**          |
| X13 | `Frame x 1, y 1, w 6, h 3` ohne Grid-Parent                                                                  | absolute positioning fallback                                    | tested             |
| X14 | Outer `grid 3`, child `x 5` (column-start außerhalb Grid-Range)                                              | grid-column-start: 5 (CSS überschreitet implizit)                | **fehlt**          |
| X15 | Outer `grid 3`, child `x -1` (negative grid position)                                                        | grid-column-start: -1 (CSS supports negative)                    | **fehlt**          |
| X16 | `Frame hor, gap $space` mit `space: 16`                                                                      | gap: var(--space)                                                | **fehlt**          |
| X17 | `Frame grid $cols` mit `cols: 12`                                                                            | grid-template-columns mit token                                  | **fehlt**          |
| X18 | Empty Layout: `Frame` (Container, no props) → keine Children                                                 | flex column default, no errors                                   | tested implicitly  |
| X19 | Layout-Properties auf nichts: `hor` (top-level, ohne Frame)                                                  | Parser produziert nichts gültiges                                | **fehlt** explicit |
| X20 | 50 Layout-Properties hintereinander: `Frame hor center spread tl br hor center cl cr ... gap 8 gap 12 gap 0` | nur die finalen Werte gewinnen                                   | **fehlt**          |

### 3.8 Tiefe Verschachtelung mit Layout-Mix

| #   | Szenario                                                                   | Erwartet                        | Status             |
| --- | -------------------------------------------------------------------------- | ------------------------------- | ------------------ |
| N1  | `stacked` → child `grid 3` → grandchild `hor` → great-grandchild `stacked` | jede Ebene unabhängig           | **fehlt**          |
| N2  | 5 Levels of `Frame hor` nested                                             | flex chain ok                   | **fehlt** explicit |
| N3  | Grid mit Grid-Children mit Grid-Grandchildren (nested grids)               | jeder Grid hat eigenes template | **fehlt**          |
| N4  | Stacked-Eltern haben stacked-Kinder                                        | Position-Vererbung über Ebenen  | **fehlt**          |
| N5  | Flex-Eltern haben Flex-Children mit `w full`                               | Stretch-Verhalten               | tested             |

### 3.9 Layout im Vererbungs-Kontext

| #   | Szenario                                                     | Erwartet                                 | Status             |
| --- | ------------------------------------------------------------ | ---------------------------------------- | ------------------ |
| V1  | Component `Btn as Button: hor` + Instance `Btn ver`          | Override: ver wins (Komponenten-Thema 5) | **fehlt** explicit |
| V2  | Component `Card as Frame: stacked` + Instance `Card grid 12` | Konflikt im Vererbungs-Pfad              | **fehlt**          |
| V3  | 4-Levels Inheritance, jede Ebene anderes Layout              | letzte Ebene gewinnt?                    | **fehlt**          |

### 3.10 Layout in States

| #   | Szenario                                                           | Erwartet                              | Status    |
| --- | ------------------------------------------------------------------ | ------------------------------------- | --------- |
| ST1 | `Btn:\n  hor\n  hover:\n    ver`                                   | hover→ver, default→hor                | **fehlt** |
| ST2 | Hover ändert grid columns: `hover: grid 6` (default war `grid 12`) | hover-state mit grid-template-columns | **fehlt** |
| ST3 | Stacked nur in disabled-state                                      | `disabled: stacked`                   | **fehlt** |

### 3.11 Layout in Iteration / Conditionals

| #   | Szenario                                             | Erwartet                                 | Status    |
| --- | ---------------------------------------------------- | ---------------------------------------- | --------- |
| I1  | `each item in $items` → grid-cells (jeder ein Frame) | parent grid; children sind grid-items    | implicit  |
| I2  | `if cond: hor else: ver`                             | Conditional als Layout-Property          | **fehlt** |
| I3  | Loop in Stacked-Container                            | loop-children alle absolute positioniert | **fehlt** |
| I4  | Nested loops mit verschiedenen Layouts               | jede Ebene eigene Layout                 | **fehlt** |

### 3.12 Sizing-Edge-Cases unter Layout

| #   | Input                                                                | Erwartet                                       | Status             |
| --- | -------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| S1  | `Frame w hug, w full, w 100` (3 Konflikte)                           | letzter (`w 100`) gewinnt                      | **fehlt** explicit |
| S2  | `Frame w full` aber Parent ist Stacked (kein flex)                   | full → 100% statt flex 1                       | tested             |
| S3  | `Frame w full` aber Parent ist Grid                                  | grid-cell sizing wins                          | **fehlt**          |
| S4  | `Frame w 100, hor, center`                                           | width 100px, no fit-content (hasExplicitWidth) | tested             |
| S5  | Container `Frame` → Child `Text "x"` → wer ist hug, wer ist stretch? | Frame stretches, Text hugs                     | tested             |
| S6  | Non-Container `Text grid 3` → wie sieht das aus?                     | unklar                                         | **fehlt**          |

## 4. Test-Plan

### 4.1 `tests/compiler/layout-bugs.test.ts` (~25 Tests)

Bug-Hypothesen mit Fokus auf:

- **L1–L7** (Cross-System-Konflikte) — die zentrale Lücke. Tests formulieren das **erwartete „letzter gewinnt"** Verhalten. Aktuell rote Tests = Bug-Bestätigung.
- **Z2, Z3, Z5** (9-Zone vs. Direction)
- **G4, G5** (Grid-Cell-Position-Edge-Cases)
- **W3, W4** (Wrap im falschen System)
- **GA3** (mixed Gap-Properties)

### 4.2 `tests/compiler/layout-additional.test.ts` (~30 Tests)

Coverage:

- Z1, Z4 (9-Zone + explizit)
- C1–C6 (Container/Non-Container Behavior)
- GA1, GA2, GA4 (Gap-Varianten)
- Verschiedene Grid-Configs systematisch

### 4.3 Limitation #8 Fix

Refactor `LayoutContext`:

```ts
interface LayoutContext {
  ...
  // NEW: track which layout system was last activated
  layoutSystem: 'flex' | 'grid' | 'stacked' | null
}
```

In `applyAlignmentsToContext`: bei jedem Direction-Set (`hor`, `ver`, 9-Zone) → `system = 'flex'`. Bei `grid` → `system = 'grid'`. Bei `stacked` → `system = 'stacked'`.

In `generateLayoutStyles`: nur Styles des finalen `layoutSystem` produzieren. Stacked bleibt position relative aber **ohne** flex-direction-Konflikt; Grid bleibt grid-template aber **ohne** flex-direction; Flex bleibt nur Flex.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste erstellt (~25 Hypothesen, Fokus Limitation #8)
- [x] Schritt 4: 1 Bug gefixt (`formatCSSValue` für negative Zahlen). Limitation #8 als
      dokumentierte Mirror-Semantik geklärt — Stacked/Flex/Grid sind keine
      vollständig konkurrierenden Systeme. ~30 neue Tests fixieren das Verhalten.
