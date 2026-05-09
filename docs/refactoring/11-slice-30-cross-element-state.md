# 11 — Slice 30: Cross-Element-State (`MenuBtn.open: visible`)

**Datum:** 2026-05-10
**Status:** Compile-Layer ✅ · Validator ✅ (Slice-30-Reform) · Studio-Sync ✅ · Browser-CDP-E2E ⚠️ offen · Studio-Roundtrip ⚠️ offen

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

Element X reagiert auf state Z von Element Y:

```mirror
Button named MenuBtn, pad 10 20, bg #333, col white, rad 6, toggle()
  open:
    bg #2271C1

Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
  MenuBtn.open:
    visible
  Text "Menü Item 1", col white
```

**DSL-Versprechen** (CLAUDE.md):

- `<Element>.<state>:` form — externer state-trigger
- `visible when X open and Y open:` form — explizite when-clause mit `and`/`or`
- Element-Referenz per `named X` (instance-name)
- Beim state-change auf X führt Frame seinen body aus (z. B. `visible`)

## Probes

8 Compile/IR + Validator + Sync.

### Compile/Runtime

| #   | Eingabe                                         | Befund                                                                | Verdikt |
| --- | ----------------------------------------------- | --------------------------------------------------------------------- | ------- |
| P-1 | `MenuBtn.open: visible` — basic                 | IR baut state-machine; emit `watchStates(node, '_MenuBtn_open', ...)` | ✅      |
| P-2 | Compile output                                  | `watchStates(node_2, '_MenuBtn_open', 'default', 'or', [...])`        | ✅      |
| P-4 | `visible when MenuBtn open:` — alternative form | `watchStates(node_2, 'visible', 'default', 'or', [...])`              | ✅      |
| P-5 | `and`/`or` conditions                           | `watchStates(node_3, 'visible', 'default', 'and', [...])`             | ✅      |

### Validator

| #   | Eingabe                                      | Befund aktuell  | Erwartet                 | Verdikt |
| --- | -------------------------------------------- | --------------- | ------------------------ | ------- |
| P-3 | Valid cross-element-state                    | 0 errors        | 0                        | ✅      |
| P-6 | `GhostBtn.open:` (GhostBtn doesn't exist)    | **0 errors** ❌ | E-code für undef ref     | 🔴      |
| P-7 | `MenuBtn.unknown-state:` (state not defined) | **0 errors** ❌ | E-code für unknown state | 🔴      |

### Studio-Sync

| #   | Eingabe                         | Befund aktuell      | Erwartet    | Verdikt |
| --- | ------------------------------- | ------------------- | ----------- | ------- |
| P-8 | Cursor in `MenuBtn.open:` block | **null context** ❌ | state-block | 🔴      |

**Kern:**

1. Compile-Pfad ist solide — `watchStates` korrekt emittiert für beide Syntax-Varianten.
2. **Validator silent über Tippfehler/falsche Refs** — gleiche DX-Lücke wie Slice 21 vor seinem E002-Hint-Fix. Nutzer kriegt erst zur Runtime mit, dass das Menu nie aufgeht.
3. **Studio-Sync sieht `Element.state:` Form gar nicht** — Cross-Slice-Probe fängt das jetzt am Audit-Beginn ab. Slice 28 hat lowercase-only-Heuristik; `MenuBtn.open` ist PascalCase.<dot>lowercase, anderes Pattern.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                |
| --- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Architektur             | **stark** — `watchStates` Runtime-Helper, schema-derived state-tracking                  |
| 2   | Codequalität            | **gut** — beide Syntax-Varianten konvergieren auf einen IR-Knoten                        |
| 3   | Testqualität            | **mittel** — IR-Pfade getestet, aber kein Validator-Coverage für Tippfehler              |
| 4   | Testabdeckung           | **schwach** — Validator-Lücke + Sync-Lücke + kein Browser-CDP                            |
| 5   | Funktionale Korrektheit | **DX-Lücke** — silent fail bei Tippfehler ist genau das, was Mirror eigentlich vermeidet |
| 6   | Studio-Roundtrip        | **schwach** — Sync-Layer recognized das Pattern nicht                                    |

## Touchpoint-Map

| Layer       | Datei                                                   | Rolle                                                        |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Parser      | `compiler/parser/state-detector.ts:72-79`               | Erkennung `Element.state:`                                   |
| Parser      | `compiler/parser/state-detector.ts:86-109`              | Erkennung `... when Element state and/or ...:`               |
| AST         | `compiler/parser/ast.ts:294`                            | `targetState` field für `when` deps                          |
| IR          | `compiler/ir/transformers/state-machine-transformer.ts` | Synthese `_<Element>_<state>` synthetic states               |
| Backend     | `compiler/backends/dom/state-machine-emitter.ts`        | Emit `watchStates(node, ...)` Aufruf                         |
| Runtime     | `compiler/runtime/state-machine.ts:484` `watchStates`   | Beobachtet target-Element via `data-mirror-name`             |
| Validator   | `compiler/validator/validator.ts`                       | **fehlt** — keine Validierung von cross-element refs         |
| Studio-Sync | `studio/sync/component-line-parser.ts`                  | **fehlt** — `Element.state:` Pattern nicht im state-Detector |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                       | Befund                                                                                                                                 |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Wie löst der IR `MenuBtn` zur Element-ID auf?                               | Per `data-mirror-name="MenuBtn"`-Selector zur Render-Zeit. Kein Compile-Zeit-Check ob `MenuBtn` existiert.                             |
| Q-2 | Was passiert wenn `MenuBtn` nicht existiert?                                | Runtime queryt `[data-mirror-name="MenuBtn"]`, kriegt null, watchStates läuft ins Leere. Stille UX-Pannenursache.                      |
| Q-3 | Sollte das ein Validator-Error oder eine Warning sein?                      | **Error.** Mirror's DX-Versprechen ist „kaputter Input fällt zur Compile-Zeit auf". Tippfehler im Element-Namen ist genau dieser Case. |
| Q-4 | Wie soll der Validator den Set bekannter `named X` Instanzen erstellen?     | AST-Walk über alle Instances und Sammeln `instanceName`. Dann gegen Cross-Element-Refs validieren.                                     |
| Q-5 | Soll der Validator auch unbekannte Zustände auf Cross-Element-Refs flaggen? | Ja. Wenn `MenuBtn.unknown-state:` und MenuBtn keinen `unknown-state` definiert hat — Tippfehler.                                       |
| Q-6 | Was tut der Sync-Layer mit `MenuBtn.open:`?                                 | Sieht es nicht als state-block (PascalCase + dot + lowercase + colon ist ein bisher unbekanntes Pattern). Drift.                       |
| Q-7 | Heuristik für Sync-Layer für diese Form?                                    | Pattern: `^[A-Z]\w*\.[a-z][\w-]*:\s*$` ist **immer** ein cross-element-state-block — kein false-positive denkbar.                      |

---

# 3. Entscheidungen

## V-1 — Validator: E-Code für undefined cross-element-refs — **Status: erledigt**

**Entscheidung:** Neuer Error-Code `E404 UNDEFINED_ELEMENT_REF` für Cross-Element-Refs zu nicht-existenten Elementen (kein `named X` und keine Component mit dem Namen).

**Begründung:** Das ist exakt die DX-Lücke, die wir bei Slice 21 mit `E002 UNDEFINED_COMPONENT` geschlossen haben — nur einen Layer tiefer (states statt components). Konsistente Fehlerlandschaft.

## V-2 — Validator: E-Code für unknown state auf bekanntem Element — **Status: erledigt**

**Entscheidung:** Neuer Error-Code `E405 UNKNOWN_STATE_REF` für `MenuBtn.foo:` wenn MenuBtn keinen `foo` state definiert.

**Begründung:** Symmetrie zu V-1. Catch-Tippfehler-im-State-Namen.

## V-3 — Studio-Sync: Pattern für `Element.state:` — **Status: erledigt**

**Entscheidung:** Neue Regex `^[A-Z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9-]*` im Sync-Layer. Wenn matched, `childType: 'state'`, `childLabel: 'MenuBtn.open'` (full ref als Label).

**Begründung:** Das Pattern ist eindeutig (PascalCase.lowercase + colon). Keine false-positives gegen Tokens (haben PascalCase nicht), Components (haben kein `.lowercase`), Properties (kein PascalCase).

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                            | Status   |
| --- | --------------------------------------------------- | -------- |
| A.1 | `E404 UNDEFINED_ELEMENT_REF` Validator-Code + Logik | erledigt |
| A.2 | `E405 UNKNOWN_STATE_REF` Validator-Code + Logik     | erledigt |
| A.3 | Sync-Layer: `Element.state:` Pattern                | erledigt |
| A.4 | RT-Tests für alle drei (Validator + Sync + Compile) | erledigt |

---

# 5. Tests

## Baseline

| Suite                                          | Tests                       |
| ---------------------------------------------- | --------------------------- |
| `tests/compiler/parser-state-triggers.test.ts` | ~10 (when/cross-element)    |
| `tests/compiler/state-reference.test.ts`       | ~5 (cross-element-state IR) |

## Neue RT-Tests (`tests/compiler/slice-30-cross-element-state.test.ts` + sync extension)

| ID    | Test                                                                          | Status   |
| ----- | ----------------------------------------------------------------------------- | -------- |
| RT-1  | `MenuBtn.open: visible` compile + watchStates                                 | erledigt |
| RT-2  | `visible when MenuBtn open:` alternative form                                 | erledigt |
| RT-3  | `and` condition: `visible when A open and B open:`                            | erledigt |
| RT-4  | `or` condition (default)                                                      | erledigt |
| RT-5  | Validator E404 — undefined cross-element ref (`GhostBtn.open:`)               | erledigt |
| RT-6  | Validator E405 — unknown state on existing element (`MenuBtn.unknown-state:`) | erledigt |
| RT-7  | Validator clean for valid cross-element-state                                 | erledigt |
| RT-8  | Studio Sync: cursor in `MenuBtn.open:` block → state context                  | erledigt |
| RT-9  | Studio Sync: cursor in `visible when MenuBtn open:` block → state context     | erledigt |
| RT-10 | Validator E404 hint suggests existing instance names if close                 | erledigt |
