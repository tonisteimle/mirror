# Slice 28: Multi-State-Cycle (`todo → doing → done`)

**Datum:** 2026-05-09
**Status:** Compile-Layer ✅ · Studio-Sync ✅ (Cross-Slice-Probe-Funde gefixt) · Browser-CDP-E2E ⚠️ offen · Studio-Roundtrip ⚠️ offen

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

Mehrstufiger State-Cycle: `toggle()` mit ≥ 2 custom states, jeder Klick rückt eine Stelle weiter, Wrap am Ende.

```mirror
TaskStatus: pad 8 16, rad 6, hor, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic #888, is 16
    Text "To Do", col #888
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 16
    Text "In Progress", col white
  done:
    bg #10b981
    Icon "check", ic white, is 16
    Text "Done", col white
```

**DSL-Versprechen** (CLAUDE.md):

- 1 custom state → binary toggle (`default ↔ state`)
- 2+ custom states → cycle in DSL-source-order, wrap nach letztem
- Initial-State setzbar (`Status, doing` startet auf `doing`)
- Children pro State werden bei Transition geswapped
- Cycle preserves source order (nicht alphabetisch)

## Probes

12 Compile/IR/Runtime + 6 Sync-Layer.

### Compile/Runtime Probes

| #    | Eingabe                                                 | Befund                                                                            | Verdikt |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| P-1  | 3-state cycle `todo → doing → done`                     | IR + Emit korrekt; order `['todo', 'doing', 'done']`                              | ✅      |
| P-2  | 5-state cycle                                           | order `['one','two','three','four','five']`                                       | ✅      |
| P-3  | Cycle wraps (`done → todo`)                             | Runtime `stateMachineToggle` macht modulo wrap                                    | ✅      |
| P-4  | Initial state mid-cycle (`Status, doing`)               | `current: 'doing'`                                                                | ✅      |
| P-5  | Source order (`zeta, alpha, mike`) — nicht alphabetisch | order erhalten: `['zeta','alpha','mike']`                                         | ✅      |
| P-6  | 2-state-Cycle: binary oder multi?                       | **multi** — `stateMachineToggle(el, ['todo','done'])` (NICHT binary if/else)      | ✅      |
| P-7  | Cycle + System-State (`visited:`) im Body               | Slice-27-Helper exclude `visited`; cycle bleibt 3-er                              | ✅      |
| P-8  | State mit unterschiedlichen Children pro State          | `children: () => [...]` Factory pro state; runtime swappt                         | ✅      |
| P-9  | Cycle + Initial-State + Action-Chaining                 | initial korrekt, cycle korrekt                                                    | ✅      |
| P-10 | Cycle + `, toast(...)` action chaining                  | beide actions emittiert                                                           | ✅      |
| P-11 | Cycle in `each`-Loop (data-driven status)               | `stateMachineToggle(node_2_tpl, [...])` per Iteration                             | ✅      |
| P-12 | Runtime fallback (kein stateOrder von compiler)         | `getCustomStates(sm)` nutzt 14-er CSS_PSEUDO_STATES Liste (Slice-27-Fix) → `todo` | ✅      |

### Studio-Sync Probes (Cross-Slice-Probe per Step 7)

| #    | Eingabe                                       | Befund vor Slice 28             | Erwartet            | Verdikt |
| ---- | --------------------------------------------- | ------------------------------- | ------------------- | ------- |
| SD-1 | Cursor in `todo:` block (custom name)         | `childType: 'nested'` ❌        | `state: 'todo'`     | 🔴      |
| SD-2 | Cursor in `doing:` block                      | `childType: 'nested'` ❌        | `state: 'doing'`    | 🔴      |
| SD-3 | Cursor in `selected:` (built-in custom state) | `childType: 'nested'` ❌        | `state: 'selected'` | 🔴      |
| SD-4 | Cursor in `on:` (built-in custom state)       | `childType: 'nested'` ❌        | `state: 'on'`       | 🔴      |
| SD-5 | `extractComponentFromLine('  todo bg #333')`  | `null` ✓ (nicht falsch erkannt) | `null`              | ✅      |
| SD-6 | `extractComponentFromLine('  selected bg X')` | `null` ✓                        | `null`              | ✅      |

**Kern:** Compile-Layer und Runtime sind nach Slice 27 sauber. Studio-Sync hat eine nochmals breitere Drift-Familie als Slice 26 erfasst hatte: nicht nur **system**-states, sondern auch **custom** states (`on`/`off`/`selected`/`open`/etc.) und **author-invented** state names (`todo`/`doing`/`done`) werden vom Sync-Layer nicht als state-block erkannt.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                            |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **stark** — Slice 27 Helper greift auch hier; cycle-order-Berechnung am Compile-Time, runtime simpel |
| 2   | Codequalität            | **gut** — keine doppelte Logik; cycle-Code in einem Helper-Aufruf                                    |
| 3   | Testqualität            | **mittel** — RT-12 in Slice 27 deckt 3-state cycle, aber kein Wrap-Test, kein Initial-Mid-Cycle-Test |
| 4   | Testabdeckung           | **mittel-schwach** — Sync-Layer war ungeprüft, daher 4 Drift-Cases unentdeckt                        |
| 5   | Funktionale Korrektheit | **stark** — Compile + Runtime: alle 12 Probes pass                                                   |
| 6   | Studio-Roundtrip        | **schwach** — Sync-Layer recognizet user-invented cycle-state-names nicht                            |

**Gesamt:** Compile-Pfad ist solide (Slice 27 Vorarbeit). Sync-Layer hat die gleiche Bug-Familie wie Slice 26, nur eine Ebene tiefer (custom + author-invented states). **Cross-Slice-Probe per Step 7 hat den Sync-Drift gefunden, ohne ihn wäre er erst beim Property-Panel-Test aufgefallen.**

## Touchpoint-Map

| Layer       | Datei                                                           | Rolle                                                                        |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Schema      | `compiler/schema/parser-helpers.ts:204` SYSTEM_STATES           | 13 system-states                                                             |
| Schema      | `compiler/schema/parser-helpers.ts:214` CUSTOM_STATES           | 15 built-in custom states                                                    |
| Helper      | `compiler/schema/parser-helpers.ts:240` `isToggleableStateName` | Slice 27 — picks toggle target                                               |
| Backend     | `compiler/backends/dom/state-machine-emitter.ts:199-219`        | Multi vs binary decision; passes explicit stateOrder for multi               |
| Runtime     | `compiler/runtime/state-machine.ts:147` `stateMachineToggle`    | Cycle index + wrap                                                           |
| Runtime-Tpl | `compiler/backends/dom/runtime-template/index.ts:1685`          | Inlined runtime copy                                                         |
| Studio-Sync | `studio/sync/component-line-parser.ts:159, 199`                 | **Drift** — system-states only, custom + author-invented states unrecognized |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                 | Befund                                                                                                                                     |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-1 | Funktioniert Multi-State-Cycle im Compile-Pfad?                       | **Ja.** Source-order erhalten; Wrap korrekt; Initial-mid-cycle korrekt; each-Loop korrekt.                                                 |
| Q-2 | Boundary 1-state ↔ 2-state — wechselt das Verhalten?                  | **Ja.** 1 state = binary (default↔state), 2+ states = cycle (default unreachable außer initial). Beabsichtigt, sollte dokumentiert sein.   |
| Q-3 | Sieht Studio-Sync user-invented state-names (`todo`/`doing`/`done`)?  | **Nein.** Drift gleicher Familie wie Slice 26.                                                                                             |
| Q-4 | Sieht Studio-Sync built-in custom states (`on`/`off`/`selected`/...)? | **Nein.** Slice 26 fix hat nur system-states erweitert.                                                                                    |
| Q-5 | Kann der Sync-Layer user-invented Namen ohne Schema-Liste erkennen?   | **Ja, per Heuristik:** lowercase-identifier + bare colon (kein Wert nach `:`) am body-indent ist immer ein state-block.                    |
| Q-6 | Hat die Heuristik false-positives?                                    | Tokens (`primary.bg:`) haben Punkt-Notation; events (`onclick:`) starten mit `on`; control flow (`each`/`if`) sind keywords. Risk niedrig. |

---

# 3. Entscheidungen

## V-1 — Sync-Layer erkennt CUSTOM_STATES schemafähig — **Status: erledigt**

**Entscheidung:** Sync-Layer-Regex erweitert um `CUSTOM_STATES` (built-in custom states aus `DSL.states.*` mit `system !== true`). Gemeinsam mit den 13 system-states ergibt das einen 28-Eintrag-Filter.

**Begründung:** Mirror's DSL definiert `CUSTOM_STATES` schemafähig (selected, highlighted, on, off, open, closed, ...). Das ist eine geschlossene Menge — schema-derived, drift-frei.

## V-2 — Heuristik-Fallback für user-invented state-names — **Status: erledigt**

**Entscheidung:** Wenn ein eingerückter Body-line dem Pattern `^[a-z][a-zA-Z0-9-]*:\s*$` entspricht (lowercase identifier + bare colon, kein Wert nach), wird er als state-block behandelt.

**Begründung:** Mirror erlaubt user-invented multi-state cycle names (`todo`/`doing`/`done`). Ohne Heuristik müsste der Sync-Layer das Schema fragen, das er nicht hat. Heuristik catch alle realistischen Patterns, false-positives sind syntaktisch ausgeschlossen (Tokens haben Punkte, Events starten mit `on`, Control-Flow sind Keywords).

## V-3 — Boundary 1↔2 states beabsichtigt — **Status: dokumentiert**

**Entscheidung:** Verhalten beibehalten (1 state = binary, 2+ = cycle). DSL-Doc erhält keinen Patch — die existierende CLAUDE.md Beschreibung ist bereits konsistent.

**Begründung:** Das ist Slice-27-Design. Hier nur als Klärung erwähnt.

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                                    | Status   |
| --- | ----------------------------------------------------------- | -------- |
| A.1 | Sync-Layer-Regex um `CUSTOM_STATES` erweitern               | erledigt |
| A.2 | Heuristik-Fallback für user-invented state-names hinzufügen | erledigt |
| A.3 | RT-Tests für Multi-State-Cycle (Compile + Runtime + Sync)   | erledigt |
| A.4 | Review-Pass per Step 7 dokumentieren                        | erledigt |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                     | Tests Multi-State-relevant |
| ----------------------------------------- | -------------------------- |
| `tests/compiler/parser-states.test.ts`    | ~30                        |
| `tests/compiler/states-coverage.test.ts`  | ~40                        |
| `tests/compiler/slice-27-toggle.test.ts`  | RT-12 (3-state cycle)      |
| `tests/studio/sync-system-states.test.ts` | 27 (Slice 26 review-pass)  |

## Neue RT-Tests (`tests/compiler/slice-28-multi-state.test.ts` + extend `tests/studio/sync-system-states.test.ts`)

| ID    | Test                                                                     | Status   |
| ----- | ------------------------------------------------------------------------ | -------- |
| RT-1  | 3-state cycle (`todo → doing → done`) — IR + emit                        | erledigt |
| RT-2  | Source order preserved (zeta, alpha, mike — nicht alphabetisch)          | erledigt |
| RT-3  | Cycle wraps (last → first)                                               | erledigt |
| RT-4  | 2-state cycle uses multi-state path (NICHT binary if/else)               | erledigt |
| RT-5  | Initial state mid-cycle (`Status, doing`)                                | erledigt |
| RT-6  | Cycle + system-state (`visited:`) im Body — Helper guard                 | erledigt |
| RT-7  | Cycle in each-loop                                                       | erledigt |
| RT-8  | State-children swap pro state (factory `children: () => [...]`)          | erledigt |
| RT-9  | Sync — Cursor in `todo:` (user-invented) → `state: 'todo'`               | erledigt |
| RT-10 | Sync — Cursor in `selected:` (built-in custom) → `state: 'selected'`     | erledigt |
| RT-11 | Sync — Cursor in `on:` / `off:` (built-in custom) → state                | erledigt |
| RT-12 | Sync schema-drift guard: jeder CUSTOM_STATE wird als state-block erkannt | erledigt |
