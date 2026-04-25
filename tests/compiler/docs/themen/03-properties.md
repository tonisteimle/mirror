# Thema 3: Properties & Aliases

**Status:** Abgeschlossen (2026-04-25).

Keine echten Bugs gefunden. ~46 neue Tests als Regressionsschutz. 1 dokumentierte
Limitation. 413 Property-bezogene Tests grün. Details:
`tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Properties & Aliases)".

## 1. Scope

Properties sind im Parser-AST roh (`bg`, `pad`, `w`). Die Auflösung zu CSS und alle Property-Semantik passieren im IR (`compiler/ir/transformers/property-transformer.ts`, 695 Z., plus `style-utils-transformer.ts` 224 Z., `property-utils-transformer.ts` 190 Z.).

**Im Scope:**

- **Alias-Map** `PROPERTY_TO_CSS` in `compiler/schema/ir-helpers.ts` (Z. 89–160): ~50 Aliase → CSS-Property (`w → width`, `pad → padding`, `bg → background`, …)
- **„Letzter gewinnt"-Regel** für mehrfach gesetzte Properties (`Frame w 100 w full` → `width: 100%`)
- **Multi-Value-Properties** mit positionalen Bedeutungen: `pad N` (alle), `pad N M` (vert/hor), `pad N M O P` (top/right/bottom/left)
- **Directional spacing**: `pad-t/r/b/l`, `pad-x/y`, `pt/pr/pb/pl`, `px/py` (analog für `mar`, `gap`, `bor`)
- **Boolean Properties** (standalone keywords): `hor`, `ver`, `center`, `spread`, `wrap`, `hidden`, `visible`, `clip`, `truncate`, `italic`, `uppercase`, …
- **Border shortcut** mit allen Direktionen
- **Transform combination**: `rotate`, `scale`, `translate` müssen sich kombinieren in einer einzigen `transform`-CSS-Property
- **Token-References als Property-Werte**: `bg $primary` → `background: var(--primary)`
- **Hover-Properties** (`hover-bg`, `hover-col`, …) als Sonderfall (eigentlich State-Bereich, aber als Property-Variante)
- **Property validation**: unbekannte Property-Namen, Werte ausserhalb Schema
- **Konflikte zwischen Aliasen**: `w 100, width 200` → letzter gewinnt (sollten dieselbe CSS-Property sein)

**Nicht im Scope (gehört zu späteren Themen):**

- Layout-Properties als System (flex/grid Konfliktlösung) → Thema 4
- Tokens-Definition → Thema 6
- Hover/Focus/Active als State-Block → Thema 7
- Property-Vererbung über Komponenten → Thema 5

## 2. Ist-Aufnahme

Property-Tests sind über das ganze Test-Verzeichnis verstreut, weil fast jeder Test Properties verwendet. Konkret thematische Files:

| Datei                                     | Tests | Bereich                                                                                                      |
| ----------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| `parser-property-aliases.test.ts`         | 3     | Aliase äquivalent, Reihenfolge egal, Kurz-/Langform gemischt                                                 |
| `parser-properties.test.ts`               | 29    | Single-Value, Multi-Value (pad), Border, Comma-separated, String content, Position                           |
| `parser-auto-property-separation.test.ts` | 57    | Whitespace-getrennte Properties, Boolean-Detection, Special Values, Sizing, Typography, Visual, Grid, Scroll |
| `validation/property-matrix.test.ts`      | ?     | Property-Matrix (Schema-driven)                                                                              |
| `validation/style-validation.test.ts`     | ?     | Style-Validierung                                                                                            |
| `validation/state-styling.test.ts`        | ?     | State-Styling (separates Thema, aber mit Property-Bezug)                                                     |
| `ir-token-css-variables.test.ts`          | ?     | Token-References als Property-Werte (CSS-Variables)                                                          |
| `ir-child-overrides-ir.test.ts`           | ?     | Child-Property-Overrides                                                                                     |
| `layout-css-matrix.test.ts`               | ?     | Layout-Properties zu CSS-Matrix                                                                              |
| `backend-html-dom-output.test.ts`         | ~273  | E2E Property → HTML-DOM-Test (das größte Property-Test-File)                                                 |

**Zusätzlich indirekt getestet** in: `backend-dom.test.ts`, `canvas.test.ts`, `device-presets.test.ts`, `chart-primitives.test.ts`, `crud-operations.test.ts`, `data-variables.test.ts`, `edge-cases.test.ts`, `motion-one-codegen.test.ts`, `regression-*.test.ts`, `size-states.test.ts`, `tutorial/*.test.ts`, `markdown.test.ts`, `simple-list.test.ts`.

**Bereits gut abgedeckt:**

- ~50 Aliase haben mindestens einen Test in `backend-html-dom-output.test.ts` (Bereich „Property Aliases", 10 Tests)
- Multi-Value-Properties (1/2/4 Werte für padding/margin) in `parser-properties.test.ts` und HTML-Output
- Auto-Property-Separation sehr gründlich (57 Tests)
- "Letzter gewinnt" indirekt in `backend-html-dom-output.test.ts` (Bereich „Last Value Wins", 6 Tests: `w 100 w 200`, `hor ver`, `tc hor`)
- Boolean-Properties + Single-Properties über die Schema-Driven-Tests automatisch
- Token-References via `ir-token-css-variables.test.ts`

**Auffällige Lücken:**

- **Alias-Konflikte**: `w 100, width 200` (verschiedene Aliase derselben CSS-Property) — wird "letzter gewinnt" angewandt? Welche Reihenfolge ist maßgeblich?
- **Direkte CSS-Eigenschaftsnamen im Mirror-Code**: `Frame width 100` (CSS-Form statt Mirror-Form) — wird das akzeptiert?
- **Multi-Value-Excess** für andere Properties als pad/margin: `border 1 2 3` (nur 1 Wert sollte ok sein) — was passiert?
- **Cross-Alias-„letzter gewinnt"**: `Frame pad 8, padding 16` — beides gleichzeitig — wer gewinnt?
- **Negative Werte für directional spacing**: `pad-t -10` — gehen die durch?
- **Falsche Werte für Boolean-Properties**: `hor 5` (number wo nichts erwartet) — Verhalten?
- **Property-Wert ist ein Object-Literal** (z.B. wenn Schema das nicht erlaubt): `bg { color: red }` — wird vom Parser akzeptiert? Vom IR?
- **Transform combination edge cases**: `rotate 0` + `rotate 45` — was gewinnt?
- **Hover-Property mit Token-Reference**: `hover-bg $primary` — funktioniert die CSS-Variable-Auflösung im :hover-Kontext?

## 3. Provokations-Liste

### 3.1 Alias-Konflikte und „letzter gewinnt"

| #   | Input                                | Erwartet                                       | Status    |
| --- | ------------------------------------ | ---------------------------------------------- | --------- |
| A1  | `Frame w 100, width 200`             | letzter (`width 200`) gewinnt → `width: 200px` | **fehlt** |
| A2  | `Frame width 100, w 200`             | letzter (`w 200`) gewinnt → `width: 200px`     | **fehlt** |
| A3  | `Frame pad 8, padding 16`            | letzter gewinnt                                | **fehlt** |
| A4  | `Frame bg #f00, background #0f0`     | letzter gewinnt                                | **fehlt** |
| A5  | `Frame col red, color blue, c green` | letzter gewinnt                                | **fehlt** |
| A6  | `Frame opacity 0.5, o 0.7, opa 0.9`  | letzter gewinnt (`opa 0.9`)                    | **fehlt** |

### 3.2 Direkte CSS-Property-Namen

| #   | Input                          | Erwartet               | Status            |
| --- | ------------------------------ | ---------------------- | ----------------- |
| C1  | `Frame width 100`              | NUMBER mit width-Alias | wahrscheinlich ja |
| C2  | `Frame max-width 200`          | min-/max- Aliase       | wahrscheinlich ja |
| C3  | `Frame border-radius 8`        | OK?                    | **fehlt**         |
| C4  | `Frame min-width 50, maxw 200` | beide CSS-Names        | **fehlt**         |

### 3.3 Multi-Value-Excess für nicht-spacing Properties

| #   | Input                                     | Erwartet                                 | Status    |
| --- | ----------------------------------------- | ---------------------------------------- | --------- |
| M1  | `Frame border 1 2 3` (3 Werte für border) | Vermutlich Bug oder nur erstes verwendet | **fehlt** |
| M2  | `Frame fs 14 16 18` (multiple font-sizes) | Verhalten?                               | **fehlt** |
| M3  | `Frame opacity 0.5 0.8`                   | Verhalten?                               | **fehlt** |
| M4  | `Frame rotate 45 90`                      | letzter? Beide kombiniert?               | **fehlt** |

### 3.4 Negative & Edge-Werte

| #   | Input                        | Erwartet                         | Status             |
| --- | ---------------------------- | -------------------------------- | ------------------ |
| E1  | `Frame pad-t -10`            | `padding-top: -10px`             | **fehlt** explizit |
| E2  | `Frame mar -20`              | margin negative ok               | teilweise getestet |
| E3  | `Frame z -1`                 | z-index negative ok              | teilweise getestet |
| E4  | `Frame opacity 1.5` (über 1) | Lexer akzeptiert; CSS clamped    | **fehlt**          |
| E5  | `Frame opacity -0.5`         | Negative opacity                 | **fehlt**          |
| E6  | `Frame rotate 720`           | 2 volle rotations                | teilweise getestet |
| E7  | `Frame rotate -360`          | Negative rotation                | teilweise getestet |
| E8  | `Frame scale 0`              | Element ist 0×0                  | teilweise          |
| E9  | `Frame w 0, h 0`             | ok                               | teilweise          |
| E10 | `Frame opacity 0`            | Element unsichtbar (aber im DOM) | **fehlt** explizit |

### 3.5 Boolean-Properties mit Werten

| #   | Input                                           | Erwartet                                   | Status    |
| --- | ----------------------------------------------- | ------------------------------------------ | --------- |
| B1  | `Frame hor 5` (Wert für Boolean)                | Wert ignoriert / Soft-Error                | **fehlt** |
| B2  | `Frame center #f00`                             | Wert als nächste Property? Oder ignoriert? | **fehlt** |
| B3  | `Frame hidden true`                             | OK?                                        | **fehlt** |
| B4  | `Frame italic false`                            | Wird italic gesetzt oder nicht?            | **fehlt** |
| B5  | `Frame truncate, italic, uppercase` (3 Boolean) | alle 3 angewandt                           | **fehlt** |
| B6  | `Frame italic, italic` (doppelt)                | idempotent                                 | **fehlt** |

### 3.6 Transform-Kombinationen

| #   | Input                                     | Erwartet                            | Status    |
| --- | ----------------------------------------- | ----------------------------------- | --------- |
| T1  | `Frame rotate 45, scale 2`                | `transform: rotate(45deg) scale(2)` | teilweise |
| T2  | `Frame rotate 45, rotate 90`              | letzter gewinnt? Oder addiert?      | **fehlt** |
| T3  | `Frame x 10, y 20, rotate 45`             | Translate + Rotate                  | teilweise |
| T4  | `Frame rotate 0` (ohne Wert ungewöhnlich) | identity oder ignoriert             | **fehlt** |

### 3.7 Token-References als Property-Werte

| #   | Input                                                       | Erwartet                                 | Status    |
| --- | ----------------------------------------------------------- | ---------------------------------------- | --------- |
| TR1 | `Frame bg $primary` (mit token-suffix)                      | `background: var(--primary)`             | getestet  |
| TR2 | `Frame bg $primary.bg`                                      | sollte gehen                             | getestet  |
| TR3 | `Frame bg $undefined-token`                                 | unresolved → bleibt? Oder Validator-Job? | **fehlt** |
| TR4 | `Frame pad $space, bg $primary` (multi mit Tokens)          | beide aufgelöst                          | **fehlt** |
| TR5 | `Frame bg $primary, bg #f00` (Token + Hex, letzter gewinnt) | `#f00` wins                              | **fehlt** |

### 3.8 Hover-Properties

| #   | Input                                    | Erwartet                     | Status    |
| --- | ---------------------------------------- | ---------------------------- | --------- |
| H1  | `Btn hover-bg #f00`                      | `:hover { background: red }` | getestet  |
| H2  | `Btn hover-bg $primary`                  | mit CSS-Variable             | **fehlt** |
| H3  | `Btn hover-bg #f00, hover-bg #0f0`       | letzter                      | **fehlt** |
| H4  | `Btn hover-opacity 0.5, hover-scale 1.1` | beide                        | **fehlt** |

### 3.9 Schema-Validation für Properties

| #   | Input                                              | Erwartet          | Status    |
| --- | -------------------------------------------------- | ----------------- | --------- |
| V1  | `Frame foo bar` (unbekannte Property `foo`)        | Validator-Warning | teilweise |
| V2  | `Frame opacity "high"` (String wo Number erwartet) | Validator         | teilweise |
| V3  | `Frame center top` (Boolean property mit Wert)     | Soft-Error        | **fehlt** |

### 3.10 Property-Listen-Edge-Cases

| #   | Input                                                          | Erwartet                       | Status             |
| --- | -------------------------------------------------------------- | ------------------------------ | ------------------ |
| L1  | `Frame ` (Frame ohne irgendwas)                                | Frame-Instance ohne Properties | getestet           |
| L2  | `Frame ,`                                                      | Soft-Error für leading comma   | getestet           |
| L3  | `Frame, , bg #f00`                                             | mehrere Kommata                | getestet           |
| L4  | `Frame bg, col` (Properties ohne Werte)                        | beide leer                     | **fehlt**          |
| L5  | 50 Properties auf einer Zeile                                  | OK                             | **fehlt** explizit |
| L6  | `Frame pad 8 hor pad 16` (multi-value gemischt mit standalone) | Auto-separation                | teilweise          |

## 4. Test-Plan

Vorschlag: **2 neue Test-Dateien**.

### 4.1 `tests/compiler/properties-bugs.test.ts`

Bug-Hypothesen die mit hoher Wahrscheinlichkeit echte Probleme aufdecken könnten:

- A1–A6: Alias-Konflikte (vor allem A2, A4 — sehr realistische Anwendungsfälle)
- M1–M4: Multi-Value-Excess für Properties die nur 1 Wert erwarten
- B1, B3, B4: Boolean-Properties mit (illegal?) Wert
- T2: Transform-Repeats
- TR3: Unresolved token references
- TR5: Token vs Hex „letzter gewinnt"

**Geschätzt: ~20 Tests, 3–6 echte Bugs erwartet.**

### 4.2 `tests/compiler/properties-additional.test.ts`

Coverage-Lücken aus den anderen Bereichen:

- Alle direkten CSS-Property-Namen (C1–C4)
- Boolean-Properties Idempotenz und Kombinationen (B5, B6)
- Edge-Werte (E1, E4, E5, E10) — opacity-clamping, negative pad-direction
- Hover-Properties Vielfalt (H2–H4)
- Property-Listen-Edge-Cases (L4, L5)
- Token-Reference-Kombinationen (TR2, TR4)

**Geschätzt: ~30 Tests.**

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste erstellt (~50 Hypothesen in 10 Bereichen)
- [x] Schritt 4: Tests geschrieben (properties-bugs, properties-additional). 0 echte Bugs, 1 Limitation dokumentiert.
