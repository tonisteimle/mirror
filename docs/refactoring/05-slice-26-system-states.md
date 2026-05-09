# 05 — Slice 26: System-States (`hover:`/`focus:`/`active:`/`disabled:`)

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

System-States als CSS-Pseudo-Class-Mapping:

```mirror
Btn: bg #333, col white
  hover:
    bg #444
  active:
    scale 0.98
  focus:
    bor 2, boc #2271C1
  disabled:
    opacity 0.5, cursor not-allowed
```

**DSL-Versprechen** (CLAUDE.md + `compiler/schema/dsl.ts:386–398`):

- 13 System-States im Schema deklariert (`system: true`):
  `hover`, `focus`, `focus-visible`, `focus-within`, `active`, `disabled`, `visited`, `checked`, `placeholder`, `placeholder-shown`, `first-child`, `last-child`, `empty`
- Werden zu CSS-Pseudo-Classes / Attribut-Selektoren / Pseudo-Elements emittiert
- Programmatic-Fallback für interaktive States via `[data-X="true"]` (Test/Headless-Browser-Support)
- Inline-Form `hover: bg #444` und Block-Form unterstützt
- Transition-Sugar: `hover 0.15s:` emittiert `transition` auf Base-Element

## Probes

12 Cases gegen DOM-Backend + IR.

| #   | Eingabe                                            | IR enthält State?         | Backend emittiert CSS?                                                  | Verdikt |
| --- | -------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | ------- |
| 1   | `hover:` Block                                     | ✅ `state: hover`         | ✅ `[data-mirror-id]:hover, [data-hover="true"]`                        | ✅      |
| 2   | `focus:` Block                                     | ✅ `state: focus`         | ✅ `[data-mirror-id]:focus, [data-focus="true"]`                        | ✅      |
| 3   | `active:` Block                                    | ✅ `state: active`        | ✅ `[data-mirror-id]:active, [data-active="true"]`                      | ✅      |
| 4   | `disabled:` Block                                  | ✅ `state: disabled`      | ✅ `[data-mirror-id][disabled]` (Attribut-Selektor, keine Dual-Form)    | ✅      |
| 5   | Multiple states (`hover:`, `active:`, `disabled:`) | ✅ alle drei              | ✅ alle drei korrekt                                                    | ✅      |
| 6   | Inline `hover: bg #444`                            | ✅                        | ✅                                                                      | ✅      |
| 7   | `hover 0.15s:` (Transition)                        | ✅                        | ✅ + `'transition': 'background 150ms ease'` inline auf Base            | ✅      |
| 8   | Token im hover-Body (`bg $primary`)                | ✅                        | ✅ `bg: var(--primary-bg)`                                              | ✅      |
| 9   | `focus-visible:` Block                             | ✅ `state: focus-visible` | ❌ **kein CSS emittiert** — Schema deklariert system, Backend ignoriert | 🔴      |
| 10  | `focus-within:` Block                              | ✅ `state: focus-within`  | ❌ **kein CSS emittiert**                                               | 🔴      |
| 11  | `visited:` Block (Link)                            | ✅ `state: visited`       | ❌ **kein CSS emittiert**                                               | 🔴      |
| 12  | `checked:` Block (Checkbox)                        | ✅ `state: checked`       | ❌ **kein CSS emittiert**                                               | 🔴      |
| 13  | `placeholder:` Block (Input)                       | ✅ `state: placeholder`   | ❌ **kein CSS emittiert** (zudem braucht es ::pseudo-element-Form)      | 🔴      |
| 14  | Multi-Properties in einem State                    | ✅                        | ✅ alle drei in einer `{}`-Group                                        | ✅      |
| 15  | State auf Instance (nicht Definition)              | ✅                        | ✅                                                                      | ✅      |
| 16  | State ohne Base-Properties                         | ✅                        | ✅                                                                      | ✅      |

**5 Probes mit identischem Befund:** Schema deklariert 13 system-states, DOM-Backend emittiert nur für 4. 9 Pseudo-Classes/Attribute/Elements werden silent geschluckt.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                          |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **schwach an einer Stelle** — `SYSTEM_STATES` als hardcoded 4er-Liste im Backend statt aus Schema abgeleitet. Drift garantiert.                    |
| 2   | Codequalität            | **mittel** — `emitNodeStateCSS` ist klar, aber Selektor-Logik (`pseudo-class` vs `[disabled]` vs `::placeholder`) ist Special-Case-Verschachtelung |
| 3   | Testqualität            | **mittel** — `tests/compiler/parser-states.test.ts` deckt Parser, `behavior/states.test.ts` einige Verhaltensaspekte                               |
| 4   | Testabdeckung           | **schwach** — kein Test deckt `focus-visible`, `focus-within`, `visited`, `checked`, `placeholder` als state-emit                                  |
| 5   | Funktionale Korrektheit | **1 Bug-Cluster** — 9 Schema-deklarierte system-states emittieren keine CSS                                                                        |
| 6   | Studio-Roundtrip        | **untested** — Property-Panel-Verhalten für advanced states ungeprobt                                                                              |

**Gesamt:** Slice 26 funktioniert für die 4 alltäglichsten States. Aber das DSL-Versprechen ist 13 States; 9 davon sind silent broken.

## Touchpoint-Map

| Layer   | Datei                                                  | Rolle                                              |
| ------- | ------------------------------------------------------ | -------------------------------------------------- |
| Schema  | `compiler/schema/dsl.ts:386–398`                       | 13 system-states deklariert                        |
| Parser  | `compiler/parser/state-detector.ts`                    | State-Block-Erkennung                              |
| IR      | `compiler/ir/transformers/state-styles-transformer.ts` | State → IR-Style mit `state`-Field                 |
| Backend | `compiler/backends/dom/style-emitter.ts:128`           | **Bug: `SYSTEM_STATES` hardcoded 4er-Liste**       |
| Backend | `compiler/backends/dom/style-emitter.ts:140–148`       | Selektor-Form pro State (`:state` vs `[disabled]`) |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                          | Befund                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Trifft IR/Parser alle 13 system-states?                        | **Ja.** Probe-Test bestätigt: IR enthält `state: focus-visible/focus-within/visited/checked/placeholder/...` in Style-Liste.                                                                                                                                    |
| Q-2 | Welche Selektor-Form gehört zu welchem State?                  | Pseudo-class (10): `hover`, `focus`, `active`, `focus-visible`, `focus-within`, `visited`, `checked`, `placeholder-shown`, `first-child`, `last-child`, `empty`. Attribute (1): `disabled` → `[disabled]`. Pseudo-element (1): `placeholder` → `::placeholder`. |
| Q-3 | Welche brauchen den `[data-X="true"]` programmatic-Fallback?   | Nur die interaktiven (`hover`, `focus`, `active`). Andere sind passiv (`visited` = browser-history, `checked` = form-state, `*-child` = struktur).                                                                                                              |
| Q-4 | Gibt es Tests, die das aktuelle 4er-Verhalten zementieren?     | **Nein.** Tests prüfen Parser/IR-Pfade. Keine Test verlangt explizit dass `focus-visible` NICHT emittiert wird.                                                                                                                                                 |
| Q-5 | Gibt es Mirror-Code im Bestand der die fehlenden states nutzt? | **Nein.** Grep über `examples/`/`studio/storage/` — keine Treffer.                                                                                                                                                                                              |

---

# 3. Entscheidungen

## V-1 — `SYSTEM_STATES` aus Schema ableiten — **Status: erledigt**

**Entscheidung:** Backend liest `Object.entries(DSL.states).filter(([, v]) => v.system).map(([k]) => k)` — keine hardcoded Liste.

**Begründung:** Schema ist Single Source of Truth. Drift zwischen Schema und Backend ausschliessen.

## V-2 — Selektor-Form pro State korrekt — **Status: erledigt**

**Entscheidung:** Pro State explizite Selektor-Form:

- Pseudo-class (`:hover` etc.): 10 States
- Attribut (`[disabled]`): `disabled`
- Pseudo-element (`::placeholder`): `placeholder`

**Begründung:** CSS verlangt unterschiedliche Selektor-Syntaxen je nach Browser-Konzept (state vs. attribute vs. pseudo-element).

## V-3 — Programmatic-Fallback nur für interaktive States — **Status: erledigt**

**Entscheidung:** `[data-X="true"]` Dual-Selector nur für `hover`, `focus`, `active`. Passive States (visited/checked/structure-pseudo-classes) brauchen keinen, weil sie nicht testbar simuliert werden.

**Begründung:** Status quo war richtig für die 3 interaktiven; einfach erhalten.

---

# 4. Umsetzungsplan & Status

| ID  | Sub-Task                                                                      | Status   |
| --- | ----------------------------------------------------------------------------- | -------- |
| A.1 | `SYSTEM_STATES` aus DSL-Schema ableiten                                       | erledigt |
| A.2 | Selektor-Form pro State (pseudo-class / attribute / pseudo-element) bestimmen | erledigt |
| A.3 | Programmatic-Fallback nur für interaktive States                              | erledigt |
| A.4 | RT-Tests für alle 13 System-States                                            | erledigt |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                    | Tests States-relevant |
| ---------------------------------------- | --------------------- |
| `tests/compiler/parser-states.test.ts`   | ~30                   |
| `tests/compiler/states-coverage.test.ts` | ~40                   |
| `tests/behavior/states.test.ts`          | ~30                   |

## Neue RT-Tests (alle in `tests/compiler/slice-26-system-states.test.ts`)

| ID    | Test                                                                     | Status   |
| ----- | ------------------------------------------------------------------------ | -------- |
| RT-1  | `hover:` emittiert `:hover, [data-hover="true"]`                         | erledigt |
| RT-2  | `focus:` emittiert `:focus, [data-focus="true"]`                         | erledigt |
| RT-3  | `active:` emittiert `:active, [data-active="true"]`                      | erledigt |
| RT-4  | `disabled:` emittiert `[disabled]`                                       | erledigt |
| RT-5  | `focus-visible:` emittiert `:focus-visible`                              | erledigt |
| RT-6  | `focus-within:` emittiert `:focus-within`                                | erledigt |
| RT-7  | `visited:` emittiert `:visited`                                          | erledigt |
| RT-8  | `checked:` emittiert `:checked`                                          | erledigt |
| RT-9  | `placeholder:` emittiert `::placeholder` (pseudo-element)                | erledigt |
| RT-10 | Schema-Drift-Schutz: Backend `SYSTEM_STATES` ≡ Schema-system-states      | erledigt |
| RT-11 | Multiple states co-existence (`hover:` + `disabled:` + `focus-visible:`) | erledigt |
| RT-12 | Token-resolved property in advanced state                                | erledigt |
