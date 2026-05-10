# 05 — Slice 5: `center` / `spread` / `ver-center` / `hor-center`

**Datum:** 2026-05-10
**Status:** DOM ✅ · Validator ✅ · React: `hor-center`/`ver-center` ✗ → ✅ (Slice-5-Reform) · Browser-CDP-E2E ⚠️ offen · Studio-Roundtrip ⚠️ offen

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)
6. [Review-Pass-Befunde](#6-review-pass-befunde)

---

# 1. Audit (Zusammenfassung)

## Scope

Die zwei-Achsen-Alignment-Keywords:

```mirror
Frame w 200, h 200, center        // beide Achsen zentriert
Frame hor, spread                  // main-axis space-between
Frame hor, ver-center             // cross-axis (vertikal) zentriert auf hor-Layout
Frame hor-center                   // cross-axis (horizontal) zentriert auf col-Layout
Frame center, cen                  // `cen` = Alias für center
```

**DSL-Versprechen** (CLAUDE.md):

- `center` / `cen` — beide Achsen zentriert
- `spread` — `justify-content: space-between` (main-axis)
- `hor-center` — horizontal zentriert (axis-richtung-unabhängig: in col → `align-items: center`; in row → `justify-content: center`)
- `ver-center` — vertikal zentriert (in col → `justify-content: center`; in row → `align-items: center`)
- Kombinierbar: `hor + spread + ver-center` ist gültig
- Konfliktfall: `center + spread` ist Validator-Fehler (E110 LAYOUT_CONFLICT)

## Probes

12 Compile/Validator + 7 Cross-Backend.

### Compile/Validator (DOM)

| #    | Eingabe                                    | Befund                                         | Verdikt |
| ---- | ------------------------------------------ | ---------------------------------------------- | ------- |
| P-1  | `Frame center` (col)                       | `justify-content: center, align-items: center` | ✅      |
| P-2  | `Frame hor, center`                        | beide Achsen center                            | ✅      |
| P-3  | `Frame hor, spread`                        | `justify-content: space-between`               | ✅      |
| P-4  | `Frame hor, ver-center`                    | `align-items: center` (cross-axis)             | ✅      |
| P-5  | `Frame hor-center` (col)                   | `align-items: center` (cross-axis)             | ✅      |
| P-6  | `Frame hor, spread, ver-center`            | space-between + center kombiniert              | ✅      |
| P-7  | Validator catches `center + spread`        | E110 LAYOUT_CONFLICT                           | ✅      |
| P-10 | 9-positions tl/tc/tr/cl/center/cr/bl/bc/br | alle korrekt direction-aware                   | ✅      |
| P-11 | `center` ohne Konflikt                     | 0 errors                                       | ✅      |
| P-12 | `cen` Alias                                | identisch zu `center`                          | ✅      |

### Cross-Backend (verbindliche Step-7-Dimension)

| #    | Eingabe            | DOM justify/align        | React justify/align      | Verdikt |
| ---- | ------------------ | ------------------------ | ------------------------ | ------- |
| CB-1 | `center` (col)     | center/center            | center/center            | ✅      |
| CB-2 | `center` (row)     | center/center            | center/center            | ✅      |
| CB-3 | `spread` (row)     | space-between/flex-start | space-between/flex-start | ✅      |
| CB-4 | `hor-center` (col) | -/center                 | -/**flex-start**         | 🔴      |
| CB-5 | `hor-center` (row) | center/flex-start        | -/flex-start             | 🔴      |
| CB-6 | `ver-center` (row) | -/center                 | -/**flex-start**         | 🔴      |
| CB-7 | `ver-center` (col) | center/flex-start        | -/flex-start             | 🔴      |

**Kern:** DOM-Backend nutzt `layout-transformer.ts` mit direction-aware Zone-Logik. React-Backend hat seit Slice 4 `nineZoneToFlex` für 9-Positionen, aber `hor-center` / `ver-center` sind **nicht in der 9-Zone-Tabelle** — sie sind separate Single-Axis-Keywords mit eigener Direction-Aware-Semantik. React Backend hat keine Cases für sie → fall-through zur Default-`alignItems: flex-start`.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                               |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **mittel** — DOM zone-aware, React partial; same family as Slice 4 9-position drift                                                                     |
| 2   | Codequalität            | **mittel** — drei Stellen mit Alignment-Logik (layout-transformer / property-transformer / style-utils-transformer); akzeptabel weil context-spezifisch |
| 3   | Testqualität            | **schwach** — kein systematischer Cross-Backend-Test für hor-center/ver-center                                                                          |
| 4   | Testabdeckung           | **schwach** — `hor-center` / `ver-center` × col/row = 4 Cases nirgendwo gepinnt                                                                         |
| 5   | Funktionale Korrektheit | **Cross-Backend-Bug** — React silently dropt 4 Cases                                                                                                    |
| 6   | Studio-Roundtrip        | **untested** — Property-Panel-Toggle für alignment ungeprüft                                                                                            |

## Touchpoint-Map

| Layer     | Datei                                                           | Rolle                                                            |
| --------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| Schema    | `compiler/schema/layout-defaults.ts:181-203` `ZONE_TO_SEMANTIC` | 9-position semantic map (Slice 4)                                |
| Schema    | `compiler/schema/layout-defaults.ts:239` `nineZoneToFlex`       | Direction-aware mapping (Slice 4); covers `center` only          |
| IR        | `compiler/ir/transformers/layout-transformer.ts:263-296`        | Main pass, zone-based context with direction-aware resolution    |
| IR        | `compiler/ir/transformers/property-transformer.ts:553-565`      | State-style/inline pass, hardcoded center/spread/cen             |
| IR        | `compiler/ir/transformers/style-utils-transformer.ts:218,224`   | `booleanPropertyToCSS` für hor-center/ver-center (state context) |
| Backend   | `compiler/backends/react.ts:557,604` `nineZoneToFlex`           | Slice 4 — hor/ver-center NICHT abgedeckt                         |
| Backend   | `compiler/backends/react.ts:549-557,598-617`                    | Switch mit `center`/`spread`/`left`/`right`/`top`/`bottom`       |
| Validator | `compiler/validator/validator.ts:1195-1200`                     | E110 für `center + spread`                                       |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                              | Befund                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Sind `hor-center` / `ver-center` 9-Zone-Aliasse?                   | **Nein.** 9-Zonen sind tl/tc/tr/cl/center/cr/bl/bc/br. `hor-center` / `ver-center` sind separate Single-Axis-Keywords.                                                                                                       |
| Q-2 | Was ist die korrekte Semantik?                                     | `hor-center`: horizontal-axis center; `ver-center`: vertical-axis center. Beide direction-aware (col → cross, row → main).                                                                                                   |
| Q-3 | Gibt es eine schema-side Helper-Funktion?                          | Nicht spezifisch. `nineZoneToFlex` deckt nur 9-Zonen. `hor-center`/`ver-center` brauchen ein eigenes 2-Eintrag-Mapping.                                                                                                      |
| Q-4 | Soll `hor-center`/`ver-center` zu `nineZoneToFlex` ergänzt werden? | Nein — semantisch verschieden (single-axis vs. zwei-axis). Eigener Helper `singleAxisCenterToFlex(name, direction)` ist sauberer.                                                                                            |
| Q-5 | Wie behandelt DOM die 4 Drift-Cases korrekt?                       | layout-transformer.ts:286-296 setzt `_hAlign='center'` bzw `_vAlign='center'` und resolved später direction-aware.                                                                                                           |
| Q-6 | Hat die Studio-Sync `hor-center` / `ver-center` Implikationen?     | **Nein.** Sie tauchen als Properties auf, nicht als state-block. Sync-Layer nicht betroffen.                                                                                                                                 |
| Q-7 | Was ist mit weiteren Backends (framework.ts → Vue/Svelte/Vanilla)? | `framework.ts:394-395` mappt nur `justify-content: center` und `align-items: center` zurück — also nur `center` keyword. `hor-center`/`ver-center` fehlen auch dort als Reverse-Mapping, aber Forward-Pfad geht über DOM-IR. |

---

# 3. Entscheidungen

## V-1 — Schema-Side Helper für single-axis center keywords — **Status: erledigt**

**Entscheidung:** Neuer Helper `singleAxisCenterToFlex(name, direction)` in `compiler/schema/layout-defaults.ts` neben `nineZoneToFlex`. Mappings:

| Keyword    | col direction             | row direction             |
| ---------- | ------------------------- | ------------------------- |
| hor-center | `align-items: center`     | `justify-content: center` |
| ver-center | `justify-content: center` | `align-items: center`     |

**Begründung:** Single Source of Truth für die Semantik. Existierende `nineZoneToFlex` deckt 9-Zonen, der neue Helper deckt Single-Axis. Beide werden vom React-Backend aufgerufen. DOM nutzt schon `layout-transformer.ts` direkt — könnte auf den Helper umgestellt werden, ist aber nicht nötig (kein Drift-Risiko, da DOM die einzige korrekte Implementation hat).

## V-2 — React-Backend nutzt den Helper — **Status: erledigt**

**Entscheidung:** Im React-Backend's switch-statement (line ~552 + line ~603) zusätzliche Lookup gegen `singleAxisCenterToFlex(name, layoutDirection)` direkt nach `nineZoneToFlex`-Lookup. Wenn match, wird das Mapping direkt gesetzt.

**Begründung:** Symmetrisch zum existierenden 9-Zone-Lookup, minimaler Eingriff.

## V-3 — RT-Suite mit cross-backend-tabelle — **Status: erledigt**

**Entscheidung:** Slice-5-RT-Suite enthält eine pro-Keyword-Tabelle mit DOM ≡ React für alle 7 Cases (4 Drift + 3 Baseline).

**Begründung:** Ohne explizite Cross-Backend-RT würde der Bug nicht regression-pinned und die Drift kann wieder einreißen (passierte schon bei Slice 4).

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                                      | Status   |
| --- | ------------------------------------------------------------- | -------- |
| A.1 | `singleAxisCenterToFlex` in `layout-defaults.ts`              | erledigt |
| A.2 | React-Backend: nutzt den Helper für `hor-center`/`ver-center` | erledigt |
| A.3 | RT-Suite mit Cross-Backend-Tabelle für alle 7 Cases           | erledigt |
| A.4 | Schema-Drift-Grep (verbindlich)                               | erledigt |
| A.5 | Cross-Slice-Probe gegen Slice 4 (9-positions)                 | erledigt |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                                | Tests                       |
| ---------------------------------------------------- | --------------------------- |
| `tests/compiler/parser-keywords.test.ts`             | ~10 alignment-keyword tests |
| `tests/compiler/slice-1-frame.test.ts`               | Frame default behavior      |
| `tests/compiler/tutorial/tutorial-snapshots.test.ts` | Layout chapter snapshots    |

## Neue RT-Tests (`tests/compiler/05-center-spread.test.ts`)

| ID    | Test                                                                                    | Status   |
| ----- | --------------------------------------------------------------------------------------- | -------- |
| RT-1  | `Frame center` (col): both axes center                                                  | erledigt |
| RT-2  | `Frame hor, center`: both axes center                                                   | erledigt |
| RT-3  | `Frame hor, spread`: justify space-between                                              | erledigt |
| RT-4  | `Frame hor, ver-center`: align-items center                                             | erledigt |
| RT-5  | `Frame ver-center` (col): justify-content center                                        | erledigt |
| RT-6  | `Frame hor-center` (col): align-items center                                            | erledigt |
| RT-7  | `Frame hor, hor-center`: justify-content center                                         | erledigt |
| RT-8  | `cen` alias === `center`                                                                | erledigt |
| RT-9  | E110 conflict for `center + spread`                                                     | erledigt |
| RT-10 | Cross-Backend table: DOM ≡ React for all 7 cases (CB-1..CB-7)                           | erledigt |
| RT-11 | `Frame hor, spread, ver-center`: combined correctly                                     | erledigt |
| RT-12 | Schema-drift guard: `singleAxisCenterToFlex` covers all hor-center/ver-center × col/row | erledigt |

---

# 6. Review-Pass-Befunde

**Datum:** 2026-05-10

## Quality-Gate

| Gate                                             | Resultat                               |
| ------------------------------------------------ | -------------------------------------- |
| Slice-Test grün (`tests/compiler/slice-5-…`)     | ✅ 22/22                               |
| Compiler-Regression grün (`tests/compiler`)      | ✅ 7231 passed / 1 skipped (217 files) |
| Behavior + Integration + Differential + Contract | ✅ 887 passed / 5 skipped (74 files)   |
| Studio                                           | ✅ 5799 passed (197 files)             |
| Cross-Backend-Bug behoben                        | ✅ DOM ≡ React für 7/7 Cases           |
| Schema-Drift-Grep                                | ✅ siehe unten                         |
| Cross-Slice-Probe                                | ✅ keine 9-Position-Regression         |

## Schema-Drift-Grep

**Befehl:** `grep -rEn "['\"]hor-center['\"]" compiler/ studio/`

| Vorkommen                                                    | Rolle                                                | Status |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------ |
| `compiler/schema/layout-defaults.ts:116,283`                 | Schema-side single-source-of-truth (Helper + Doc)    | ✅     |
| `compiler/schema/properties.ts:157`                          | Property-Schema-Eintrag                              | ✅     |
| `compiler/schema/property-schema.ts:801`                     | Validator-Schema                                     | ✅     |
| `compiler/schema/parser-helpers.ts:135`                      | Parser-Whitelist                                     | ✅     |
| `compiler/schema/ir-helpers.ts:84`                           | IR-Whitelist                                         | ✅     |
| `compiler/runtime/mirror-runtime.ts:77,292`                  | Runtime-Property-Liste (kein Mapping, nur Allowlist) | ✅     |
| `compiler/ir/transformers/layout-transformer.ts:171,286`     | Direction-aware Hauptpass (DOM-Pfad korrekt)         | ✅     |
| `compiler/ir/transformers/property-utils-transformer.ts:155` | Layout-Property-Whitelist                            | ✅     |
| `compiler/ir/transformers/style-utils-transformer.ts:218`    | State-/Inline-Pfad — direction hardcoded auf col     | ⚠️     |
| `compiler/backends/react.ts` (`singleAxisCenterToFlex`)      | Slice 5 V-2 — direction-aware                        | ✅     |
| `studio/panels/property/utils/html.ts:35`                    | UI-Label                                             | ✅     |
| `studio/panels/property/sections/layout-section.ts:180`      | UI-Toggle-State                                      | ✅     |
| `studio/code-modifier/layout-ops.ts:107`                     | Layout-Ops-Whitelist                                 | ✅     |
| `studio/react-converter/index.ts:168`                        | Reverse-Map (CSS→Mirror), nicht direction-aware      | ⚠️     |
| `compiler/backends/framework.ts`                             | Kein Reverse-Mapping für `hor-center`/`ver-center`   | ⚠️     |

**⚠️ Bekannte cross-slice Lücken** (außerhalb Slice-5-Scope, dokumentiert für spätere Slices):

1. `style-utils-transformer.ts` hat `flex-direction: column` hardcoded für `hor-center`/`ver-center` — gilt nur für State-Pfad, wo direction-pivot selten ist. Symptom-frei in den existierenden Tests, aber drift-anfällig wenn ein State direction wechselt. Konsequenz wenn rauh: gehört nach derselben Reform wie der DOM-Hauptpfad in einen direction-aware Resolver. Marker für Slice-7+ (state-styles-Reform).
2. `react-converter/index.ts` mappt `justify-content: center` immer zu `hor-center` — nicht direction-aware. Slice-Scope = Studio-internal CSS-Roundtrip; betrifft Slice 5 nicht (Probes deckten nur Compile-Pfade DOM/React). Zugehörig zu späterer Studio-Roundtrip-Slice.
3. `framework.ts` hat keine Reverse-Mapping-Cases für `hor-center`/`ver-center` — Framework-Export verliert die Keywords beim Round-Trip durch IR-Style. Analog Slice 4 V-2 für 9-positions, aber für single-axis-keywords noch offen. Marker für eigene Mini-Slice (analog Slice 4 V-2).

## Cross-Slice-Probe

**Slice 4 (9-positions):** alle 9 Zonen × col/row → erwartete justify+align in DOM und React (RT-1, RT-3, RT-6, RT-13 in `slice-4-9-positions.test.ts`) → grün, keine Regression.

**Slice 1 (Frame defaults):** `Frame` ohne Alignment → `flex-direction: column, align-items: flex-start` → unverändert (DOM-Probe explizit verifiziert).

**Slice 2 (gap):** `Frame gap 12, hor-center` → align-items center bei erhaltenem gap → grün.

## Bekannte Folge-Slices

- **Slice „state-styles direction-aware":** `style-utils-transformer.ts` über den schema-Helper umsetzen.
- **Slice „framework reverse-map single-axis":** analog Slice 4 V-2 für `hor-center`/`ver-center`.
- **Slice „studio react-converter direction-aware":** Reverse-Mapper in `studio/react-converter/index.ts` direction-aware.
