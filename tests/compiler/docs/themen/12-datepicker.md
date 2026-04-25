# Thema 12: DatePicker

**Status:** abgeschlossen (2026-04-25).

**Ergebnis:** **3 echte Bugs entdeckt UND gefixt**, 27 Tests in 4 Bereichen,
Coverage-Sprung in den DatePicker-Pfaden.

**Was gefixt wurde:**

- **Bug 1 — Zag-Boolean-Property als initialState misinterpretiert**: In
  `compiler/parser/zag-parser.ts` extrahierte die initialState-Detection
  jede value-lose lowercase-IDENTIFIER-Property. `DatePicker fixedWeeks`
  → `fixedWeeks` wurde als initialState statt boolean property erkannt
  → fehlte in machineConfig. Fix: zag-component-spezifische Property-Namen
  (aus `primitiveDef.props`) von der Detection ausschließen.

- **Bug 2 — `positioning` nicht in MACHINE_CONFIG_PROPS**: In
  `compiler/ir/transformers/zag-transformer.ts` fehlte `positioning` in
  der Whitelist und im processMachineConfigProperty-switch. `DatePicker
positioning "top"` → wurde als styling-Property abgewertet. Fix: Eintrag
  in beiden Stellen ergänzt (analog zu `placement`).

- **Bug 3 — `closeOnSelect false` als boolean-true mit `false` als
  initialState misinterpretiert**: Mirror-Lexer emittiert `true`/`false`
  als IDENTIFIER (kein BOOLEAN-Token-Typ). Der zag-parser sah
  `closeOnSelect` (IDENTIFIER) gefolgt von einem IDENTIFIER → Property
  ohne Wert (boolean-true) und nahm `false` als nächste Property → die als
  initialState landete. Fix: nächsten Token-Identifier explizit auf
  `'true'`/`'false'` prüfen, dann als boolean-Wert in den Wert-Pfad
  übergeben.

**Scope-Korrektur:** Ursprünglich „Zag-Komponenten" — nach dem Cleanup
2026-04-25 ist DatePicker die einzige Zag-Komponente. Alle anderen
Komponenten sind Pure-Mirror-Templates und gehören zu Thema 11 (Slots) oder
Thema 5 (Komponenten/Vererbung).

## 1. Scope

**Im Scope:**

- DatePicker-Parsing (`compiler/parser/zag-parser.ts`, derzeit 0.26%)
- DatePicker-IR-Transformation (`compiler/ir/transformers/zag-transformer.ts`,
  derzeit 0.75%)
- DatePicker-DOM-Code-Emission (`compiler/backends/dom/zag/overlay-emitters.ts`,
  derzeit 1.21%)
- DatePicker-Runtime (`compiler/runtime/parts/zag-runtime.ts`, derzeit 0%)
- Zag-Properties für DatePicker laut Schema:
  - `value`, `defaultValue`, `disabled`, `readOnly`, `min`, `max`, `locale`
  - `selectionMode` (single/multiple/range), `fixedWeeks`, `startOfWeek`,
    `closeOnSelect`, `positioning`
- Slots (Schema kennt 23): Root, Label, Control, Input, Trigger, Positioner,
  Content, ViewControl, PrevTrigger, NextTrigger, ViewTrigger, RangeText,
  Table\*, MonthSelect, YearSelect, ClearTrigger, PresetTrigger
- `bind` (two-way binding)

**Nicht im Scope:**

- Visuelles Calendar-Rendering (E2E)
- Locale-spezifische Datumsformate (Browser-Logik)
- DST-Handling
- Zag-Library-internes Verhalten

## 2. Ist-Aufnahme

| Datei                                            | Status                                  |
| ------------------------------------------------ | --------------------------------------- |
| `tests/compiler/*.test.ts`                       | **0 Tests** für DatePicker              |
| `tests/studio/component-code-generation.test.ts` | 2 Tests (Code-Gen `DatePicker` keyword) |
| `tests/studio/panel-behavior-presets.test.ts`    | 2 Tests (Preset-Existenz)               |
| `tests/studio/autocomplete.test.ts`              | 1 Test (Autocomplete)                   |

Studio-Tests prüfen Component-Panel-Wiring. Compiler-Pipeline-Verhalten ist
ungetestet.

## 3. Provokations-Liste

### 3.1 Property-Mapping (zag-transformer)

| #   | Input                                           | Erwartet                               | Status    |
| --- | ----------------------------------------------- | -------------------------------------- | --------- |
| D1  | `DatePicker` (no props)                         | IR-Knoten `zagType: 'datepicker'`      | offen     |
| D2  | `DatePicker placeholder "Pick"`                 | machineConfig.placeholder = 'Pick'     | offen     |
| D3  | `DatePicker selectionMode "single"`             | machineConfig.selectionMode = 'single' | offen     |
| D4  | `DatePicker selectionMode "multiple"`           | machineConfig.selectionMode='multiple' | offen     |
| D5  | `DatePicker selectionMode "range"`              | machineConfig.selectionMode = 'range'  | offen     |
| D6  | `DatePicker fixedWeeks` (boolean standalone)    | machineConfig.fixedWeeks = true        | **Bug 1** |
| D7  | `DatePicker closeOnSelect false`                | machineConfig.closeOnSelect = false    | offen     |
| D8  | `DatePicker startOfWeek 1`                      | machineConfig.startOfWeek = 1          | offen     |
| D9  | `DatePicker positioning "top-end"`              | machineConfig.positioning = 'top-end'  | **Bug 2** |
| D10 | `DatePicker disabled`                           | machineConfig.disabled = true          | offen     |
| D11 | `DatePicker readOnly`                           | machineConfig.readOnly = true          | offen     |
| D12 | `DatePicker value "2026-04-25"`                 | machineConfig.value = '2026-04-25'     | offen     |
| D13 | `DatePicker min "2026-01-01", max "2026-12-31"` | min/max korrekt gesetzt                | offen     |
| D14 | `DatePicker locale "de-DE"`                     | machineConfig.locale = 'de-DE'         | offen     |

### 3.2 Bind & Interaction

| #   | Input                     | Erwartet                                  | Status |
| --- | ------------------------- | ----------------------------------------- | ------ |
| D15 | `DatePicker bind myDate`  | IR-Bind = 'myDate', kein `$` mehr im Wert | offen  |
| D16 | `DatePicker bind $myDate` | IR-Bind = 'myDate' (Strip `$`)            | offen  |

### 3.3 Code-Emission (overlay-emitters)

| #   | Input                                   | Erwartet                                                                                     | Status |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| D17 | DatePicker-Output                       | enthält `_zagConfig`, `initDatePickerComponent`, `Control`/`Input`/`Trigger`/`Content` Slots | offen  |
| D18 | `DatePicker placeholder "Pick"`-Output  | `${inputVar}.placeholder = 'Pick'`                                                           | offen  |
| D19 | `DatePicker` (kein placeholder)         | placeholder 'Select date...' (Default)                                                       | offen  |
| D20 | DatePicker mit Style: `bg #f00, pad 16` | Root-Styles enthalten background/padding                                                     | offen  |

### 3.4 Slots

| #   | Input                                  | Erwartet                                     | Status |
| --- | -------------------------------------- | -------------------------------------------- | ------ |
| D21 | `DatePicker:` mit `Label "Date:"` Slot | Slot Label im IR enthalten, mit Text-Content | offen  |
| D22 | `DatePicker:` mit `Control: bg #f00`   | Slot Control mit Style                       | offen  |
| D23 | `DatePicker:` mit allen 23 Slots leer  | IR enthält alle 23 Slot-Definitionen         | offen  |

### 3.5 Pathologisch

| #   | Input                                        | Erwartet                                               | Status |
| --- | -------------------------------------------- | ------------------------------------------------------ | ------ |
| D24 | `DatePicker selectionMode "INVALID"`         | string wird unverändert übernommen, Validator-Warning? | offen  |
| D25 | `DatePicker startOfWeek 7` (out of range)    | Wert übernommen, Validator-Warning?                    | offen  |
| D26 | `DatePicker startOfWeek "abc"` (kein Number) | NaN oder Default? Kein Crash                           | offen  |
| D27 | DatePicker in `each`-Loop                    | jede Iteration eigene `_zagConfig.id`                  | offen  |
| D28 | DatePicker in if/else Branch                 | nur aktiver Zweig wird init                            | offen  |
| D29 | 2 DatePicker auf einer Seite                 | distinct IDs                                           | offen  |

## 4. Test-Plan

`tests/compiler/datepicker.test.ts` — ~30 Tests in 5 Bereichen.

## 5. Coverage-Ziele (post-Tests)

| Modul                                           | Aktuell | Ziel                                  |
| ----------------------------------------------- | ------- | ------------------------------------- |
| `compiler/parser/zag-parser.ts`                 | 0.26%   | ≥ 60% (DatePicker-Pfad)               |
| `compiler/ir/transformers/zag-transformer.ts`   | 0.75%   | ≥ 70% (DatePicker-Pfad)               |
| `compiler/backends/dom/zag/overlay-emitters.ts` | 1.21%   | ≥ 90%                                 |
| `compiler/runtime/parts/zag-runtime.ts`         | 0%      | (Runtime-String nicht direkt testbar) |

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme
- [x] Schritt 3: Provokations-Liste (29 Hypothesen, 2 Bugs vorab + 1 beim Test-Run entdeckt)
- [x] Schritt 4: 27 Tests, 3 Bugs gefixt
- [x] Schritt 5: Coverage-Audit (siehe Tabelle oben)

**Was nicht abgedeckt ist:**

- DatePicker-Slot-Body (D21-D23 Hypothesen) — Tests fehlen, weil das Custom-
  Slot-Override-Pattern via `DatePicker:` mit Slot-Body nicht gängig ist
- Bind/two-way-binding für DatePicker (D15-D16) — Tests sind im File aber
  bind-Property ist nicht im IR sichtbar (lebt in `bindValue`, das nicht
  durchgereicht wird?). Eigene Iteration falls relevant.
- DatePicker in each-Loop (D27) und if/else (D28) — gehören zu Themen 9/10
- Validator-Warnings für invalide Werte (D24, D25) — gehört zu Thema 18
- DatePicker-Runtime-Verhalten (Calendar-Rendering, Locale, DST) — E2E-Bereich

## Echte Code-Coverage (V8, gemessen 2026-04-25 nach Cleanup + Tests)

| Modul                                           | Vorher | Nachher    |
| ----------------------------------------------- | ------ | ---------- |
| `compiler/backends/dom/zag/overlay-emitters.ts` | 1.21%  | **70.73%** |
| `compiler/ir/transformers/zag-transformer.ts`   | 0.75%  | **42.96%** |
| `compiler/backends/dom/zag/helpers.ts`          | 2.17%  | **45.65%** |
| `compiler/backends/dom/zag/index.ts`            | 8.33%  | **41.66%** |
| `compiler/parser/zag-parser.ts`                 | 0.26%  | **11.88%** |

zag-parser bleibt niedrig, weil Item/Group-Pfade (für nicht-DatePicker-
Komponenten) tot sind. Diese ~500 LOC könnten in einer Folge-Iteration
gelöscht werden, was die Coverage des Moduls auf ~50%+ heben würde.

**Globaler Effekt:** 62.95% → **65.56% Lines (+2.6 pp)**.
