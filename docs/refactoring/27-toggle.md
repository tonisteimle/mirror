# Slice 27: Custom-State `toggle()`

**Datum:** 2026-05-09 (Iter-1) · 2026-05-10 (Iter-2 Dev 3)
**Status:** DOM-Backend ✅ · Studio-Sync ✅ (gemeinsam mit 26/29) · Browser-CDP-E2E ✅ (Iter-2) · Studio-Roundtrip ✅ Lower-Bar (Iter-2)

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

`toggle()` als State-Cycle-Modifier auf Komponenten/Instanzen:

```mirror
LikeBtn: bg #333, col #888, pad 12 20, rad 6, toggle()
  Icon "heart", ic #888, is 18
  Text "Gefällt mir"
  on:
    bg #ef4444
    col white

// Multi-State-Cycle (Slice 28-Vorboten — hier nur Binary)
TaskStatus: pad 8 16, toggle()
  todo:
    bg #333
  doing:
    bg #f0f
  done:
    bg #0f0
```

**DSL-Versprechen** (CLAUDE.md + `compiler/schema/dsl.ts:476–489`):

- `toggle()` ist Builtin-State-Function (`event-transformer.ts:22`)
- Cycle target = erste „custom state" (nicht-system); Pseudo-Classes (`:hover`, `:focus`, …) bleiben außen vor
- Ohne explizite States: implizites `'on'`-State wird gemacht (Binary)
- Mit 2+ Custom-States: Multi-State-Cycle (Slice 28 detailliert)
- `cycle()` ist Alias für `toggle()`

## Probes

13 Cases gegen IR + DOM-Backend + Runtime.

### Positive Cases (alle grün)

| #    | Eingabe                                               | Ergebnis                                              | Verdikt |
| ---- | ----------------------------------------------------- | ----------------------------------------------------- | ------- |
| P-1  | `toggle()` + `on:`                                    | IR baut state-machine, transition `on/onclick/toggle` | ✅      |
| P-2  | `toggle()` ohne explizite States                      | implizites `'on'`-State                               | ✅      |
| P-3  | Emit produziert `transitionTo` / `stateMachineToggle` | ja                                                    | ✅      |
| P-4  | Validator-clean                                       | 0 errors, 0 warnings                                  | ✅      |
| P-5  | Instance `, on` → initial state                       | `current: 'on'`                                       | ✅      |
| P-6  | 3-State (`todo/doing/done`) → multi-state cycle       | `stateMachineToggle(el)`                              | ✅      |
| P-7  | `toggle()` + `hover:` co-existent                     | beide korrekt; CSS für hover, state-machine für on    | ✅      |
| P-8  | `toggle()` auf Instance-Use-Site                      | funktioniert                                          | ✅      |
| P-9  | `cycle()` ≡ `toggle()` (Alias)                        | identischer JS-Output                                 | ✅      |
| P-11 | `, on` Instance + Definition mit `toggle()`           | initial = on                                          | ✅      |
| P-12 | Initial-State setzt `data-state` Attribut             | setzt `dataset.state`                                 | ✅      |

### Bug-Cluster (Schema-Drift)

| #   | Eingabe                                                                             | Ergebnis aktuell                                                         | Erwartet                                                  | Verdikt |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- | ------- |
| B-1 | `toggle()` + `focus-visible:` zuerst, dann `on:`                                    | target='on' korrekt (Glück: focus-visible in `ALWAYS_CSS_PSEUDO_STATES`) | target='on'                                               | ✅      |
| B-2 | `toggle()` + nur `visited:`                                                         | **target='visited'** (Cycle setzt CSS-Pseudoclass als Toggle-Target)     | implizites `'on'` als target                              | 🔴      |
| B-3 | `toggle()` + nur `checked:`                                                         | **target='checked'** (gleiche Drift)                                     | implizites `'on'` als target                              | 🔴      |
| B-4 | `toggle()` + 3 Custom-States + `focus-visible:`                                     | Multi-state cycle inkl. `focus-visible` (4-er Cycle)                     | 3-er Cycle a→b→c→a; focus-visible bleibt CSS pseudo-class | 🔴      |
| B-5 | Direkter Runtime-Aufruf `stateMachineToggle(el)` mit `focus-visible` in `sm.states` | `cssStates` Liste hardcoded auf 5; `focus-visible` rutscht in Cycle      | Schema-konsistente System-State-Filterung                 | 🔴      |

**Kern:** Drei Layer (IR-Transformer, Backend-Emitter, Runtime) haben jeweils eigene **hardcoded** Listen davon, was eine „CSS-pseudo-state vs. custom-state" ist. Schema deklariert 13 system-states. Die Listen kennen aber nur 4–6 davon. → Drift garantiert; `visited`/`checked`/`placeholder`/etc. werden silent als Toggle-Targets behandelt.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                 |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **schwach** — drei Layer mit eigenen, divergenten Listen. Kein Single-Source-of-Truth-Helper.                                             |
| 2   | Codequalität            | **mittel** — die Filter-Logik ist klar, aber die Definition „custom state vs. system state" ist auf 3 Stellen verstreut.                  |
| 3   | Testqualität            | **mittel** — `tests/compiler/state-machine.test.ts` und Browser-Tests decken die Happy-Paths. Keine Tests für Schema-Drift-Edge-Cases.    |
| 4   | Testabdeckung           | **schwach** — kein Test verlangt explizit, dass `visited:` / `checked:` / `placeholder:` mit `toggle()` NICHT als Targets gewählt werden. |
| 5   | Funktionale Korrektheit | **2 Bug-Cluster** — IR-Transformer wählt Pseudo-Class als Toggle-Target (B-2, B-3); Runtime cyclet durch Pseudo-Class (B-4, B-5).         |
| 6   | Studio-Roundtrip        | **untested** — interaktive Studio-Bedienung von toggle()-Komponenten hier nicht geprüft.                                                  |

**Gesamt:** Slice 27 funktioniert für die alltäglichsten Patterns (`toggle()` + `on:`, `cycle()` Alias, Initial-State). Aber sobald eine fortgeschrittene CSS-pseudo-class (visited / checked / focus-visible / placeholder) co-defined wird, geht das Verhalten silent kaputt. Das ist die direkte Konsequenz aus Slice 26 (Schema-Erweiterung von 4 → 13 system-states): die Toggle-Pickerei wurde nicht mitgezogen.

## Touchpoint-Map

| Layer   | Datei                                                           | Rolle                                                                                                |
| ------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Schema  | `compiler/schema/dsl.ts:386–398`                                | 13 system-states (Single Source of Truth)                                                            |
| Schema  | `compiler/schema/parser-helpers.ts:204`                         | `SYSTEM_STATES = Set<string>` schema-derived                                                         |
| IR      | `compiler/ir/transformers/event-transformer.ts:22`              | `BUILTIN_STATE_FUNCTIONS = Set(['toggle','cycle','exclusive'])` (hardcoded)                          |
| IR      | `compiler/ir/transformers/state-machine-transformer.ts:27`      | `ALWAYS_CSS_PSEUDO_STATES = Set(['hover','focus','focus-within','focus-visible'])` (hardcoded, 4-er) |
| IR      | `compiler/ir/transformers/state-machine-transformer.ts:35`      | `MAYBE_CUSTOM_STATES = Set(['active','disabled'])` (Allow-List)                                      |
| IR      | `compiler/ir/transformers/state-machine-transformer.ts:216–231` | Custom-state-Picker für Toggle-Target                                                                |
| Backend | `compiler/backends/dom/state-machine-emitter.ts:199–219`        | Multi vs. Binary-Decision; Multi delegiert an Runtime ohne stateOrder                                |
| Backend | `compiler/backends/dom/event-emitter.ts:179–186`                | `toggle()`/`cycle()` → `stateMachineToggle(el[, stateOrder])`                                        |
| Runtime | `compiler/runtime/state-machine.ts:114`                         | `CSS_PSEUDO_STATES = ['default','hover','focus','active','disabled']` (hardcoded, 5-er)              |
| Runtime | `compiler/backends/dom/runtime-template/index.ts:1685–1708`     | Stamped Runtime-Kopie; gleiche 5-er Liste                                                            |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                                 | Befund                                                                                                                        |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Welche States dürfen Toggle-Targets sein?                                             | Alle states, die NICHT system-pseudo-classes sind. Ausnahmen `active`/`disabled`: dürfen Custom werden, wenn Styles defined.  |
| Q-2 | Warum 3 verschiedene Listen für die gleiche Frage?                                    | Historisch gewachsen. Schema (parser-helpers) hat 13 schema-derived. IR-Transformer hat 4 hardcoded. Runtime hat 5 hardcoded. |
| Q-3 | Liefert der Emitter im Multi-State-Cycle eine explizite `stateOrder`?                 | **Nein.** `_runtime.stateMachineToggle(el)` ohne 2. Argument. Runtime fällt auf eigenen Filter zurück → 5-er Liste.           |
| Q-4 | Lässt sich der Runtime-Filter eliminieren, wenn der Emitter immer order liefert?      | **Ja.** Test-API ruft die Runtime-Function bereits mit explizitem 2. Argument auf. User-Code ruft `_runtime.*` nicht direkt.  |
| Q-5 | Gibt es Mirror-Code im Bestand mit `visited:`/`checked:`/`placeholder:` + `toggle()`? | Grep über `examples/`/`studio/storage/` — keine Treffer. Bug ist real, aber niemand hatte ihn bisher.                         |
| Q-6 | Ist `cycle()`-Alias schemafähig oder muss er hardcoded bleiben?                       | Schema kennt nur `toggle` als state-modifier. `cycle` ist purer Compiler-Alias. Aufnehmen wäre Lärm — bleibt hardcoded.       |

---

# 3. Entscheidungen

## V-1 — Single helper für „Custom-state-Picker" — **Status: erledigt**

**Entscheidung:** Neuer Helper `getToggleableStateName(stateNames, stateDefs)` in `compiler/schema/parser-helpers.ts`. Logik:

- include if name not in `SYSTEM_STATES`,
- include if name ∈ {`active`, `disabled`} AND has styles defined.

**Begründung:** Single source of truth für die Frage „Welcher state ist Toggle-Target?". Schema-derived → automatisch konsistent mit allen 13 system-states.

## V-2 — Emitter berechnet `stateOrder` zur Compile-Time — **Status: erledigt**

**Entscheidung:** Backend-Emitter bestimmt explizit, welche States in den Cycle gehören, und passt sie als 2. Argument zu `_runtime.stateMachineToggle(el, [...])`. Runtime-seitiger Filter (5-er Liste) wird damit zur reinen defensive default.

**Begründung:**

1. Schema-Wissen lebt im Compiler, nicht in der Runtime — kein Schema-Schleppen ins User-Bundle.
2. Emitter sieht ohnehin schon alle States; berechnen ist trivial.
3. Runtime bleibt schmal, deterministisch, schema-frei.

## V-3 — Runtime-Filter erhalten als defensive default — **Status: erledigt**

**Entscheidung:** `compiler/runtime/state-machine.ts:114` und `compiler/backends/dom/runtime-template/index.ts:1690` werden NICHT entfernt — der Filter wird auf die schema-konforme 13-er Liste erweitert. Dadurch sind direkte Aufrufer (Test-API, etwaige Custom-Bridges) auch ohne explizite `stateOrder` sicher.

**Begründung:** Defensive depth statt single-point-of-failure. Kosten: 8 zusätzliche String-Literale in der Runtime — vernachlässigbar.

## V-4 — `BUILTIN_STATE_FUNCTIONS` bleibt hardcoded — **Status: bewusst nicht refaktoriert**

**Entscheidung:** `event-transformer.ts:22` (`new Set(['toggle','cycle','exclusive'])`) bleibt hardcoded, kein Schema-Eintrag.

**Begründung:** `cycle` ist purer Compiler-Alias (kein Schema-Konzept). `toggle` und `exclusive` sind in `DSL.stateModifiers`, aber das ist eine semantisch andere Liste (Modifier nach State-Namen, nicht function-call-actions). Cross-Referenz wäre Lärm; das Set wächst nicht.

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                                                           | Status   |
| --- | ---------------------------------------------------------------------------------- | -------- |
| A.1 | `getToggleableStateName` Helper in `parser-helpers.ts`                             | erledigt |
| A.2 | IR-Transformer (`state-machine-transformer.ts:216–231`) auf Helper umstellen       | erledigt |
| A.3 | Backend-Emitter (`state-machine-emitter.ts:199–219`) berechnet stateOrder explizit | erledigt |
| A.4 | Runtime-Filter `CSS_PSEUDO_STATES` schemakonform erweitern (TS + Template)         | erledigt |
| A.5 | RT-Tests für alle Schema-Drift-Cases                                               | erledigt |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                             | Tests States-relevant |
| ------------------------------------------------- | --------------------- |
| `tests/compiler/parser-states.test.ts`            | ~30                   |
| `tests/compiler/states-coverage.test.ts`          | ~40                   |
| `tests/compiler/parser-state-triggers.test.ts`    | ~20                   |
| `tests/compiler/ir-state-machine-codegen.test.ts` | ~25                   |
| `tests/behavior/states.test.ts`                   | ~30                   |

## Neue RT-Tests (`tests/compiler/slice-27-toggle.test.ts`)

| ID     | Test                                                                                        | Status   |
| ------ | ------------------------------------------------------------------------------------------- | -------- |
| RT-1   | `toggle()` + `on:` → transition target = `on`                                               | erledigt |
| RT-2   | `toggle()` ohne states → implicit `on` state + binary toggle                                | erledigt |
| RT-3   | `toggle()` + nur `visited:` → target NICHT `visited`, sondern implicit `on`                 | erledigt |
| RT-4   | `toggle()` + nur `checked:` → target NICHT `checked`                                        | erledigt |
| RT-5   | `toggle()` + nur `placeholder:` → target NICHT `placeholder`                                | erledigt |
| RT-6   | `toggle()` + 3 custom states + `focus-visible:` → cycle 3-er, focus-visible ausgeschlossen  | erledigt |
| RT-7   | `cycle()` ≡ `toggle()` (Alias-Stabilität)                                                   | erledigt |
| RT-8   | Instance `, on` mit `toggle()` → initial state = `on`                                       | erledigt |
| RT-9   | `active:` mit Styles bleibt Custom-Toggle-Target (Allow-List)                               | erledigt |
| RT-10  | Runtime `stateMachineToggle` direkt mit Schema-Drift-State (`focus-visible` in `sm.states`) | erledigt |
| RT-11  | Schema-Drift-Schutz: für jedes system-state in DSL ist Toggle-Target-Filter robust          | erledigt |
| RT-12  | Multi-state cycle: Emitter passt explizite `stateOrder` als 2. Argument                     | erledigt |
| RT-12a | `_stateStyles`-Filter ist schema-derived (4. Drift-Stelle, im Review-Pass nachgezogen)      | erledigt |

---

# 6. Review-Pass-Befunde

Der Review-Pass nach Step 7 in `plan.md` hat zwei zusätzliche Drift-Stellen aufgedeckt, die der ursprüngliche Slice-27-Pass übersehen hatte. Beide sind jetzt gefixt; das Doc spiegelt den Stand.

## Was Slice 27 ursprünglich gefixt hat

| Layer            | Stelle                                                      | Status |
| ---------------- | ----------------------------------------------------------- | ------ |
| Helper           | `compiler/schema/parser-helpers.ts` `isToggleableStateName` | ✅ neu |
| IR-Transformer   | `compiler/ir/transformers/state-machine-transformer.ts:216` | ✅     |
| DOM-Emitter      | `compiler/backends/dom/state-machine-emitter.ts:199-219`    | ✅     |
| Runtime (TS)     | `compiler/runtime/state-machine.ts:114`                     | ✅     |
| Runtime-Template | `compiler/backends/dom/runtime-template/index.ts:1685-1708` | ✅     |

## Was der Review-Pass nachgezogen hat

| Stelle                                                   | Drift-Typ                            | Folgeaktion                                   |
| -------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| `compiler/backends/dom/node-emitter.ts:318`              | 4-State-Liste filtert `_stateStyles` | ✅ schema-derived (RT-12a)                    |
| `studio/sync/component-line-parser.ts` (3 Regex-Stellen) | 4-State-Liste in Sync-Layer          | ✅ schema-derived (gemeinsam mit Slice 26/29) |
| `studio/editor/syntax-highlight.ts`                      | 4-State-Liste im Highlighter         | ✅ schema-derived                             |

## Dead Code als Bug-Vorbild

Der Review-Pass hat zusätzlich zwei dead-code-Stellen identifiziert, die zwar nie erreicht wurden, aber das exakte Drift-Pattern eingefroren hatten, das Slice 27 gerade beseitigte. Beide entfernt:

- `compiler/backends/dom/event-emitter.ts:188-191` (`case 'exclusive':` mit `Object.keys.find(s !== 'default')`) — entfernt in Slice 29.
- (kein zweites — der `event-emitter` `toggle`-Branch ist erreichbar und korrekt)

## Cross-Backend (verbindliche Dimension)

Identisch zu Slice 26: `framework.ts` und `react.ts` sind deklarative Pass-throughs, kein eigener Toggle-Filter, keine Drift möglich. ✅

## Verbleibende Lücken (offen, dokumentiert)

| Lücke                                                                                  | Risiko  | Slice-Scope                                                |
| -------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| Browser-CDP-Smoke-Test eines Klick-Cycles auf einer kompilierten `toggle()`-Komponente | mittel  | Eigener E2E-Pass (nicht Compile-Layer)                     |
| Studio-Roundtrip — Property-Panel-Toggle für Custom-States                             | mittel  | Slice 69 (Property-Panel-Roundtrip)                        |
| Doppel-Emission im each-loop (siehe Slice 29 V-3)                                      | niedrig | Bewusst nicht angepackt — Bundle-Bloat, kein Verhaltensbug |

## Methodische Lehre

**Bug-Familien-Audit statt Slice-Audit.** Slice 27 hat den Helper für `toggle()` eingeführt, hätte aber bei Helper-Einführung sofort `exclusive()` (Slice 29) und `cycle()` (Alias) gegen den Helper testen müssen. Der Review-Pass hat genau das nachgeholt — und gefunden, dass Slice 29 schon zu 80% mitprofitiert, aber 2 weitere Stellen nicht. Step 7 enthält daher jetzt explizit die „Cross-Slice-Probe" als verbindlich.

---

# 7. Iter-2-Sweep (Dev 3, 2026-05-10)

Iter-1 hat den `isToggleableStateName` Helper plus drei Drift-Layer-Fixes (IR-Transformer, DOM-Emitter, Runtime + Runtime-Template) etabliert. Iter-2 verifiziert (a) Stabilität gegen Bundle-Regression, (b) keine neue hardcoded State-Liste außerhalb des Helpers nachgewachsen, (c) CDP-Schuld eingelöst.

## 7.1 Iter-1-Review (Pre-Iter-2-Stand)

| Layer            | Stelle                                                                         | Helper-Adoption   | Iter-2-Re-Probe              |
| ---------------- | ------------------------------------------------------------------------------ | ----------------- | ---------------------------- |
| Helper           | `compiler/schema/parser-helpers.ts:270` `isToggleableStateName`                | ✅ neu            | 16/16 cases ✅               |
| IR-Transformer   | `compiler/ir/transformers/state-machine-transformer.ts:202`                    | ✅                | E2E B1–B8 ✅                 |
| DOM-Emitter      | `compiler/backends/dom/state-machine-emitter.ts:210`                           | ✅                | `stateOrder` literal ✅      |
| Runtime (TS)     | `compiler/runtime/state-machine.ts:120` (CSS_PSEUDO_STATES, defensive default) | ✅ 14 entries     | grep ✅                      |
| Runtime-Template | `compiler/backends/dom/runtime-template/index.ts:1692, 1808`                   | ✅ 14 entries × 2 | runtime-emit literal-grep ✅ |

`tools/probes/slice-27-toggle.ts` reproduziert alle Cases. Sektion C des Probes inspiziert das emittierte Runtime und bestätigt: 2 cssStates-Literale gefunden, beide 14-Einträge, schema-konform.

## 7.2 Schema-Drift-Grep (Iter-2 — repo-weit)

`grep -rn "'hover'" compiler/ studio/ | grep -v dist/ | grep -v .test.ts` lieferte 4 nicht-triviale Treffer außerhalb des Helpers:

| #   | Stelle                                                                | Befund / Verdikt                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `compiler/ir/transformers/state-styles-transformer.ts:27`             | 6-State-Liste (`hover/focus/active/disabled/focus-within/focus-visible`) für Transition-eligible-States. **Bewusst eng** — Slice 32 territory; Kommentar-Lock vorhanden. **Out-of-scope.** Naming-Konflikt mit `parser-helpers.ts:SYSTEM_STATES` als V-Iter2-3 dokumentiert. |
| 2   | `compiler/backends/dom/style-emitter.ts:151`                          | `PROGRAMMATIC_FALLBACK_STATES = ['hover', 'focus', 'active']` — **bewusst eng** (nur 3 fallbacken auf `data-{state}="true"` weil pseudo-classes nicht reliably unter headless feuern). Slice 26 territory; Kommentar-Lock vorhanden. **Out-of-scope.**                       |
| 3   | `studio/agent/generation-pipeline.ts:380` (`STATE_BLOCK_NAMES`)       | **Drift-Bug.** 18-Element-Liste (4 system + 11 custom + 3 size). Schema kennt 13+15+3 = 31. Pre-flight detector verpasst Nested-State-Block-Patterns mit `visited:`/`checked:`/`focus-visible:`/etc. **In-scope-Fix.** ⇒ V-Iter2-1                                           |
| 4   | `compiler/backends/dom/runtime-template/parts/test-api-runtime.ts:72` | `case 'hover':` für trigger-event-mapping (`api.interact.trigger(el, 'hover')`). Event-Trigger-Switch, kein State-Cycle-Filter. **Out-of-scope.**                                                                                                                            |

## 7.3 V-Iter2-1 — `STATE_BLOCK_NAMES` schema-derived (in-scope-Fix)

**Befund:** `studio/agent/generation-pipeline.ts:380` enthielt eine flach hardcodierte Liste aller Namen, die als State-Block-Header (`name:`) auftreten dürfen. Die Liste war Iter-1 (Slice 26 Schema-Erweiterung 4 → 13 system-states) nicht mitgezogen worden — gleicher Drift-Pattern wie Slice 27 selbst, nur in der LLM-Generation-Pipeline statt in `toggle()`-Targeting.

**Risiko:** Wenn der LLM eine Mirror-Generation mit `visited:` oder `checked:` oder `focus-visible:` als nested State-Block produzierte, fing der Pre-Flight-Check das Pattern nicht ab. Der Parser hängt aber bei nested State-Blocks (Profile-Card-Toggle Smoke-Test 2026-05-05). → Silent infinite-loop möglich.

**Fix:** Schema-derived aus `SYSTEM_STATES ∪ CUSTOM_STATES ∪ SIZE_STATES`. 18 → 31 Namen. Regex-Source robust gegen zukünftige Sonderzeichen (escape).

**Status:** ✅ erledigt. `tests/agent/generation-pipeline.test.ts` 43/43 grün — keine Test-Subtraction.

## 7.4 V-Iter2-2 — CDP-Schuld eingelöst

| RT       | Quelle                                                                                                       | Status   |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| RT-CDP-1 | `Toggle Schema-Drift Safeguards / toggle() + visited: only → click cycles default ↔ on (NOT visited)`        | erledigt |
| RT-CDP-2 | `Toggle Schema-Drift Safeguards / toggle() + checked: only → click cycles default ↔ on (NOT checked)`        | erledigt |
| RT-CDP-3 | `Toggle Schema-Drift Safeguards / toggle() + 3 custom + focus-visible: → cycle 3-er, focus-visible excluded` | erledigt |
| RT-CDP-4 | `Toggle Schema-Drift Safeguards / cycle() ≡ toggle() alias`                                                  | erledigt |

Suite-Lauf:

- `npx tsx tools/test.ts --filter="Toggle|toggle()"` → **66/66 grün** (62 Iter-1-Baseline + 4 RT-CDP-1..4 neu).
- `npx tsx tools/test.ts --category=states` → **65/65 grün** (Slice 26+27+29+30 zusammen).

CDP-Schuld-Limit-Zähler: -1 (Slice 27 abgeräumt).

## 7.5 V-Iter2-3 — Naming-Konflikt `SYSTEM_STATES` (deferred-lock)

**Befund:** `compiler/ir/transformers/state-styles-transformer.ts:27` deklariert ein **lokales** `SYSTEM_STATES` mit 6 Einträgen (Transition-eligible). Der Name shadowt den schema-derived `SYSTEM_STATES` (13 Einträge) aus `compiler/schema/parser-helpers.ts:228`. Der Kommentar erklärt explicit "Subset of the schema's full system-state list", aber der Namens-Overlap ist eine Drift-Falle — ein zukünftiger Author könnte den lokalen Set für den globalen halten.

**Entscheidung:** Rename auf `TRANSITION_ELIGIBLE_SYSTEM_STATES` (oder Import + Filter) ist Slice 32 territory (State-Transitions). **Deferred-Lock-RT** in `tools/probes/slice-27-toggle.ts` Sektion C dokumentiert es nur als „weiter als Drift-Trap zu beobachten".

**Re-Open-Trigger:** Slice 32 (State-Transitions). Adresse im Re-Open-Tracking.

## 7.6 Studio-Roundtrip — Lower-Bar deklariert

`toggle()` wirkt im Studio über den DOM-Backend-Pfad (Studio-Preview rendert via DOM-Emitter). DOM-Backend ist Iter-1 + Iter-2 voll gelocked (RT-1..RT-12a, plus RT-CDP-1..RT-4). Property-Panel-Toggle für Custom-States bleibt Slice 69 (Property-Panel-Roundtrip) — Re-Open-Trigger steht in Sektion 6.

**Modus:** **Lower-Bar — DOM-Pfad gelocked via RT-1..RT-12a + RT-CDP-1..RT-CDP-4. Studio-Property-Panel-Roundtrip Slice 69.**

## 7.7 9-Punkt-Quality-Gate (Iter-2)

| #   | Check                                                                                            | Status                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Audit-Doc-Probe-Tabelle: kein 🔴 außer in expliziter „deferred"/„out-of-scope"-Spalte.           | ✅                                                                                                                         |
| 2   | Phase-Stati ∈ {erledigt, verschoben, verworfen}; kein „pending"/„offen"/„in-arbeit".             | ✅                                                                                                                         |
| 3   | Jeder RT-Plan-Eintrag hat einen geschriebenen Test (Status `erledigt`).                          | ✅ (RT-1..RT-12a + RT-CDP-1..RT-CDP-4)                                                                                     |
| 4   | Schema-Drift-Grep ausgeführt; gefundene Stellen gefixt oder dokumentiert.                        | ✅ (4 Stellen geprüft, 1 gefixt, 1 deferred-lock, 2 out-of-scope dokumentiert)                                             |
| 5   | Cross-Slice-Wirkung geprüft; betroffene Nachbar-Slices haben In-scope-Fix oder Deferred-Lock-RT. | ✅ (Slice 26 already-fixed, Slice 29 already-fixed in Iter-1; Slice 32 deferred-lock V-Iter2-3)                            |
| 6   | Cross-Backend-Differential-RT existiert pro Property/Verhalten, das ≥ 2 Backends emittieren.     | ✅ (React/Framework deklarativer Pass-through, kein eigener Filter — kein Drift möglich, dokumentiert Section 6)           |
| 7   | Studio-Roundtrip explizit benannt: „CDP-Run grün" oder „Lower-Bar: DOM gelocked via RT-X".       | ✅ Lower-Bar deklariert (7.6); CDP-Schuld via RT-CDP-1..4 eingelöst                                                        |
| 8   | Vitest gesamt grün; vor-Slice-Vergleich bestätigt: keine Test-Subtraction.                       | ✅ (`tests/compiler/slice-27-toggle.test.ts` 13/13, `tests/agent/generation-pipeline.test.ts` 43/43, gesamt: 15100 passed) |
| 9   | Kein „substantiell besser, aber …".                                                              | ✅                                                                                                                         |

Alle 9 ✅. Slice 27 ist Iter-2-fertig.
