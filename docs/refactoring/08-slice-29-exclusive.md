# 07 — Slice 29: `exclusive()` (Tab-Gruppe)

**Datum:** 2026-05-09
**Status:** Audit · Untersuchung · Entscheidungen · Umsetzung in Arbeit

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)

---

# 1. Audit (Zusammenfassung)

## Scope

`exclusive()` als State-Cycling-Modifier — Radio-Group-Verhalten:

```mirror
Tab: pad 12 20, col #888, cursor pointer, exclusive()
  selected:
    col white
    bor 0 0 2 0, boc #2271C1

Frame hor, gap 0
  Tab "Home", selected
  Tab "Profile"
  Tab "Settings"
```

**DSL-Versprechen** (CLAUDE.md + `compiler/schema/dsl.ts:482, 488`):

- `exclusive()` ist Builtin-State-Function (parallel zu `toggle()`)
- Nur **eine** Komponente in der Gruppe trägt den Custom-State
- Klick auf Sibling deselektiert alle anderen, selektiert das Geklickte
- Cycle-Target = erster „custom state" — gleiche Definition wie bei `toggle()`
- Kann mit `bind` kombiniert werden: `exclusive(), bind selected`

## Probes

11 Cases gegen IR + DOM-Backend + Runtime.

### Positive Cases (alle grün)

| #   | Eingabe                                            | Ergebnis                                                        | Verdikt |
| --- | -------------------------------------------------- | --------------------------------------------------------------- | ------- |
| P-1 | `Tab: exclusive() + selected:`                     | IR-Transition `selected/onclick/exclusive`                      | ✅      |
| P-2 | Compile-Output                                     | `exclusiveTransition(node_1, 'selected')` mit explizitem Target | ✅      |
| P-3 | `Tab "X" onclick exclusive()` (Event-Emitter-Pfad) | Geht ebenfalls über IR-Transformer-Helper                       | ✅      |
| P-4 | `Tab "X", exclusive()` (Instance-Use-Site)         | Funktioniert                                                    | ✅      |
| P-5 | `each t in $tabs / Tab t, exclusive()` (Loop)      | State-Machine-Emitter setzt korrektes Target                    | ✅      |
| P-6 | `exclusive(), bind selected`                       | Bind-Variable wird beim Selection-Wechsel aktualisiert          | ✅      |
| P-7 | `Tab "Home", selected` (initial state)             | Initial state korrekt gesetzt                                   | ✅      |

### Bug-Cluster

Die Slice-27-Reform (`isToggleableStateName`-Helper + Compile-Time-stateOrder) hat **die meisten** `exclusive()`-Pfade gleich mit gefixt. Es bleibt **eine** Stelle, die Slice 27 nicht abgedeckt hat:

| #   | Eingabe                                                                    | Ergebnis aktuell                                                                                 | Erwartet                           | Verdikt |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | ------- |
| B-1 | `each` + `exclusive()` + System-State im Body (`visited:` vor `selected:`) | `_runtime.exclusive(node)` Wrapper picks `Object.keys(states).find(s !== 'default')` → `visited` | Filter muss schema-konsistent sein | 🔴      |

**Kern:** `compiler/backends/dom/runtime-template/index.ts:1800-1806` (`exclusive(el, state)` Wrapper) hat dieselbe Drift wie der Slice-27-Bug, nur eine Schicht tiefer. Wird von `emit-events.ts:45` (each-loop-template-actions) aufgerufen.

**Bemerkung zu vermeintlichen Bugs, die aktuell tot sind:**

- `compiler/backends/dom/event-emitter.ts:188-191` (`Object.keys(...).find(s !== 'default') || 'active'`) ist **nie** in einem von 9 geprüften Mirror-Pattern erreicht worden. Der IR-Transformer's Third-Pass nimmt `exclusive()` als builtin-state-function vor und routet die Transition durch `state-machine-emitter.ts:235` (mit explizitem Target). Die Stelle ist **dead code**, hinterlässt aber gefährliches Vorbild — wird in Phase A bereinigt.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                       |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **mittel** — Slice 27 hat den Helper geschaffen, aber der each-loop-Pfad benutzt ihn noch nicht.                |
| 2   | Codequalität            | **mittel** — `event-emitter.ts:188-191` ist unreachable dead code, suggeriert falsches Verhalten.               |
| 3   | Testqualität            | **mittel** — Tab-Tests in `tests/compiler/state-machine.test.ts` decken Happy-Paths.                            |
| 4   | Testabdeckung           | **schwach** — kein Test prüft each-loop + exclusive() + System-State-Body. Edge fällt durchs Raster.            |
| 5   | Funktionale Korrektheit | **1 Bug-Cluster (B-1)** — Wrapper picks System-State als Target. Race mit korrektem `exclusiveTransition`-Call. |
| 6   | Studio-Roundtrip        | **untested**                                                                                                    |

**Gesamt:** Slice 29 ist im Wesentlichen Slice-27-Beifang. Der Helper-Pattern hat 80% der `exclusive()`-Pfade automatisch korrekt gemacht. Der each-loop-Wrapper ist die letzte Stelle. Plus: Eliminierung von dead code in event-emitter.

## Touchpoint-Map

| Layer   | Datei                                                           | Rolle                                                                          |
| ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Schema  | `compiler/schema/parser-helpers.ts`                             | `isToggleableStateName` (Slice 27 helper, schema-derived)                      |
| IR      | `compiler/ir/transformers/event-transformer.ts:22`              | `BUILTIN_STATE_FUNCTIONS = Set(['toggle','cycle','exclusive'])`                |
| IR      | `compiler/ir/transformers/state-machine-transformer.ts:185-205` | Third pass: konvertiert `exclusive()` events in transitions; Target via Helper |
| Backend | `compiler/backends/dom/state-machine-emitter.ts:233-235`        | `_runtime.exclusiveTransition(varName, '${t.to}')` — explizites Target ✓       |
| Backend | `compiler/backends/dom/event-emitter.ts:188-191`                | **dead code** — nie erreicht; bleibt als gefährliches Vorbild                  |
| Backend | `compiler/backends/dom/ops/emit-events.ts:43-45`                | each-loop template-action: `_runtime.exclusive(currentVar)` (1-arg, buggy)     |
| Runtime | `compiler/backends/dom/runtime-template/index.ts:1800-1806`     | `exclusive(el, state)` wrapper: fallback `Object.keys.find(s !== 'default')`   |
| Runtime | `compiler/runtime/state-machine.ts:429`                         | TS-Source `exclusiveTransition`: nimmt explizites Target — **kein Wrapper**    |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                                    | Befund                                                                                                                |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Hat Slice 27 `exclusive()` im IR-Transformer mit gefixt?                                 | **Ja.** Der Third-Pass nutzt `isToggleableStateName` für ALLE builtin-state-functions, nicht nur `toggle`.            |
| Q-2 | Wie oft erreicht der each-loop `_runtime.exclusive`-Wrapper?                             | Nur in Loop-Templates mit `Tab t, exclusive()`-Pattern. Standalone-Verwendung geht über state-machine-emitter.        |
| Q-3 | Sind beide Calls (`exclusiveTransition` korrekt + `exclusive` wrapper) im selben Bundle? | **Ja.** State-machine-emitter und emit-events emittieren beide. Race auf Click — wer gewinnt, ist nicht garantiert.   |
| Q-4 | Ist `event-emitter.ts:188-191` jemals erreicht?                                          | **Nein** in allen geprüften Mirror-Patterns. Dead code.                                                               |
| Q-5 | Sollten beide Calls deduplicate werden?                                                  | Aus Slice-29-Sicht: außerhalb des Scope. Beide korrekt zu machen ist genug — Race-Cleanup wäre eigene Refactor-Frage. |

---

# 3. Entscheidungen

## V-1 — Runtime-Wrapper `exclusive(el, state)` schema-konsistent — **Status: erledigt**

**Entscheidung:** Im Fallback-Pfad (`state` arg fehlt) verwendet der Wrapper jetzt die existierende `cssStates`-Liste (13-er, schema-konform, von Slice 27 etabliert) statt `find(s !== 'default')`.

**Begründung:** Wir haben die korrekte Liste schon inlined; der Wrapper hat sie nur nicht benutzt. Symmetrie zum `stateMachineToggle`-Wrapper.

## V-2 — Dead code in `event-emitter.ts:188-191` entfernen — **Status: erledigt**

**Entscheidung:** Der `case 'exclusive':`-Branch in `emitAction` wird gelöscht. Comment-of-record: state-machine-transformer's third pass übernimmt diese Aktion immer.

**Begründung:** Code, der nie ausgeführt wird, ist nicht inert — er ist falsches Vorbild für zukünftige Entwicklung und enthält die exakte Drift, die wir gerade in 4 anderen Stellen beseitigt haben.

## V-3 — Doppel-Emission (state-machine + template-action) bleibt — **Status: bewusst nicht angepackt**

**Entscheidung:** Slice 29 fixt **nicht** die Tatsache, dass im each-loop sowohl `exclusiveTransition` (korrekt, von state-machine-emitter) als auch `_runtime.exclusive` (Wrapper, von emit-events) emittiert werden. Beide sind nach V-1 korrekt — die Doppel-Emission ist Bundle-Bloat, kein Verhaltensbug.

**Begründung:** Doppel-Emission zu eliminieren würde die Beziehung zwischen state-machine-emitter und emit-events neu definieren — Scope für eine eigene Slice (oder einen separaten Cleanup-PR).

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                                                 | Status   |
| --- | ------------------------------------------------------------------------ | -------- |
| A.1 | Runtime-Template `exclusive(el, state)` Wrapper schema-konsistent machen | erledigt |
| A.2 | Dead code in `event-emitter.ts:188-191` entfernen                        | erledigt |
| A.3 | RT-Tests für Slice 29                                                    | erledigt |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                             | Tests `exclusive()`-relevant |
| ------------------------------------------------- | ---------------------------- |
| `tests/compiler/parser-state-triggers.test.ts`    | ~10                          |
| `tests/compiler/ir-state-machine-codegen.test.ts` | ~5                           |
| `tests/behavior/states.test.ts`                   | ~5                           |

## Neue RT-Tests (`tests/compiler/slice-29-exclusive.test.ts`)

| ID   | Test                                                                                            | Status   |
| ---- | ----------------------------------------------------------------------------------------------- | -------- |
| RT-1 | `exclusive() + selected:` → IR-Target = `selected`                                              | erledigt |
| RT-2 | Compile-Output enthält `exclusiveTransition(el, 'selected')`                                    | erledigt |
| RT-3 | `exclusive() + visited:` → Target = `on` (via Slice-27-Helper, regression-pin)                  | erledigt |
| RT-4 | `Tab "Home", selected` → initial state                                                          | erledigt |
| RT-5 | each-loop + exclusive() + visited(unstyled) im Body → Wrapper picks `selected`, NICHT `visited` | erledigt |
| RT-6 | `event-emitter.ts:188-191` ist tatsächlich entfernt (Source-grep)                               | erledigt |
| RT-7 | Runtime `exclusive(el)` wrapper Direkt-Test mit System-State in `sm.states`                     | erledigt |
| RT-8 | `exclusive(), bind selected` — Bind funktioniert weiterhin                                      | erledigt |
