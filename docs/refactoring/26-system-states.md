# Slice 26: System-States (`hover:`/`focus:`/`active:`/`disabled:`)

**Datum:** 2026-05-09
**Status:** DOM-Backend ✅ · Studio-Sync ✅ (Review-Pass) · Browser-CDP-E2E ⚠️ offen · Studio-Roundtrip ⚠️ offen

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

---

# 6. Review-Pass-Befunde

Der Review-Pass (Step 7 in `plan.md`) wurde auf Slice 26+27+29 gemeinsam ausgeführt, weil sie alle dieselbe Bug-Familie betreffen (Schema-Erweiterung von 4 → 13 system-states).

## Probe-Tabelle Post-Fix-Spiegelung

Die ursprünglichen 🔴-Befunde aus Abschnitt 1 (P-9..P-13: `focus-visible`, `focus-within`, `visited`, `checked`, `placeholder` emittieren kein CSS) sind alle ✅. Verifiziert durch RT-5..RT-9 in `tests/compiler/slice-26-system-states.test.ts`.

## Schema-Drift-Grep — der entscheidende Schritt

Der Grep nach hardcoded 4-State-Listen (`grep -rEn "['\"]hover['\"].*['\"]focus['\"]" compiler/ studio/`) hat **eine Stelle ausserhalb der Slice-26-Touchpoint-Map** gefunden, die das ursprüngliche Audit übersehen hatte:

| Stelle                                           | Status nach Slice 26    | Status nach Review-Pass |
| ------------------------------------------------ | ----------------------- | ----------------------- |
| `studio/sync/component-line-parser.ts` (3 Regex) | 🔴 4-State-Drift        | ✅ schema-derived       |
| `studio/editor/syntax-highlight.ts`              | 🟡 visueller Gap        | ✅ schema-derived       |
| `studio/autocomplete/schema-completions.ts`      | ✅ schon schema-derived | ✅ unverändert          |

User-visible-Effekt vor dem Fix: Cursor in einem `visited:` / `checked:` / `focus-visible:` / `placeholder:` Block wurde mit `childType: 'nested'` statt `'state'` gemeldet — Property-Panel-Context, Breadcrumbs und Code-Edit-Operations sahen den State-Block nicht. **27 RTs in `tests/studio/sync-system-states.test.ts` lockeen den Fix ein.**

## Cross-Backend (verbindliche Dimension)

| Backend                          | Stelle mit eigenem System-State-Filter? | Korrekt? |
| -------------------------------- | --------------------------------------- | -------- |
| `compiler/backends/dom/`         | ja, mehrere — alle schema-derived       | ✅       |
| `compiler/backends/framework.ts` | nein, deklarativer Pass-through         | ✅       |
| `compiler/backends/react.ts`     | nein, deklarativer Pass-through         | ✅       |
| `studio/react-converter/`        | nein                                    | ✅       |

Die Bug-Familie war korrekt DOM-only — non-DOM Backends emittieren States als Daten und delegieren an die Target-Framework-Runtime.

## Verbleibende Lücken (offen, dokumentiert)

| Lücke                                                                                  | Risiko  | Vermerk                                                                          |
| -------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Browser-CDP-Smoke-Test eines kompilierten Programms mit `visited:` / `checked:` / etc. | mittel  | jsdom + Schema-Drift-Guard decken die Logik; Browser-Quirks bleiben unentdeckt   |
| Studio-Roundtrip — Property-Panel-State-Editor für die neuen 9 system-states           | mittel  | Click im Preview → Property-Panel zeigt State-Tabs für alle 13 ist nicht geprüft |
| `state-styles-transformer.ts:13` — Transition-Eligibility-Liste (6 von 13)             | niedrig | Browser-Limitation für `:visited`; Slice 32 Territory (`hover 0.15s:`)           |

## Methodische Lehre

**Schema-Erweiterung ohne Repo-weiten Grep ist eine halbe Reform.** Slice 26 hat das Compile-Zeit-CSS-Emit erweitert; der Sync-Layer in Studio bleibt aber im Suchradius eines Compiler-Audits unsichtbar. Der Schema-Drift-Grep in Step 7 ist die direkte Konsequenz: vor jedem „erledigt"-Verdikt repo-weit nach den alten enum-Werten suchen.

---

# 7. Iter-2 (Dev 3, 2026-05-10)

**Auftrag:** Phase-0-Sweep aus dem überarbeiteten `plan.md`. CDP-Schuld einlösen, Iter-2-Probe-Skript committen, Schema-Drift-Grep wiederholen, 9-Punkt-Quality-Gate durchlaufen.

## 7.1 Iter-1-Review (Status-Carry-Forward)

| Iter-1-Spalte                   | Status nach Iter-1                                               | Iter-2-Update                                                                                              |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Probe-Tabelle (12 Cases)        | Alle ✅ post-fix                                                 | unverändert; Iter-2-Probe ergänzt 8 weitere shorthand-Cases (siehe 7.2)                                    |
| RTs (RT-1..RT-12)               | Alle erledigt in `tests/compiler/slice-26-system-states.test.ts` | unverändert grün (jsdom)                                                                                   |
| Schema-Drift-Grep               | 1 Stelle gefixt (`studio/sync/component-line-parser.ts`)         | **2 neue Stellen gefunden** (`compiler/schema/ir-helpers.ts`, `property-transformer.ts`) — siehe V-Iter2-1 |
| Browser-CDP-E2E                 | ⚠️ offen (Iter-1-Lücke #1)                                       | **erledigt** — `studio/test-api/suites/states/system-states.test.ts` um 5 RTs erweitert (siehe 7.3)        |
| Studio-Roundtrip Property-Panel | ⚠️ offen (Iter-1-Lücke #2)                                       | **Lower-Bar deklariert** (siehe 7.4)                                                                       |
| Transition-Eligibility-Liste    | niedrig — Slice 32 Territory (Iter-1-Lücke #3)                   | unverändert deferred — Re-Open-Trigger: Slice 32 (`hover 0.15s:`)                                          |

## 7.2 Iter-2-Probe (`tools/probes/slice-26-system-states.ts`)

Probe deckt zwei Bereiche:

**Section A — State-Shorthand-Drift (neu, Iter-2-Befund):**

| #   | Eingabe                       | Validator | DOM-State-Selector                 | Iter-1                                                        | Iter-2       | Verdikt                                               |
| --- | ----------------------------- | --------- | ---------------------------------- | ------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| A1  | `Frame hover-bg #fff`         | clean     | `:hover` + `[data-hover="true"]`   | ✅                                                            | ✅           | unverändert                                           |
| A2  | `Frame hover-col #000`        | clean     | `:hover` + `[data-hover="true"]`   | ✅                                                            | ✅           | unverändert                                           |
| A3  | `Frame focus-bg #fff`         | E100      | `:focus` + `[data-focus="true"]`   | ⚠️ V-C-Disagreement                                           | ⚠️ unchanged | Validator E100 trotz Helper-Emit; deferred → Slice 31 |
| A4  | `Frame active-bg #fff`        | E100      | `:active` + `[data-active="true"]` | ⚠️                                                            | ⚠️           | wie A3                                                |
| A5  | `Frame disabled-bg #fff`      | E100      | `[disabled]`                       | ⚠️                                                            | ⚠️           | wie A3                                                |
| A6  | `Frame focus-visible-bg #fff` | E100      | `:focus-visible`                   | 🔴 longest-match-bug: emittierte `:focus { visible-bg: ... }` | ✅ V-Iter2-1 | gefixt durch Schema-Derive                            |
| A7  | `Frame visited-bg #fff`       | E100      | `:visited`                         | 🔴 helper-prefix-list missed                                  | ✅ V-Iter2-1 | gefixt durch Schema-Derive                            |
| A8  | `Frame checked-bg #fff`       | E100      | `:checked`                         | 🔴 helper-prefix-list missed                                  | ✅ V-Iter2-1 | gefixt durch Schema-Derive                            |

**Section B — Schema-system-states CSS-Emit Cross-Backend:**

Alle 13 schema-system-states emittieren DOM-CSS ✅. React/Framework lassen states als deklarativen Pass-through ohne CSS-Emit (Iter-1-Audit-Doc-Behauptung re-verifiziert). Probe-Lauf 7.2-B in Probe-Skript bestätigt.

## 7.3 V-Iter2-1: STATE_PROPERTY_PREFIXES Schema-Drift

**Befund (neu):** Zwei Stellen mit hardcoded 4-State-Liste, die Iter-1 nicht gefunden hat:

1. `compiler/schema/ir-helpers.ts:490` — `STATE_PROPERTY_PREFIXES = ['hover', 'focus', 'active', 'disabled']` (Helper für inline-shorthand `hover-bg`/etc.)
2. `compiler/ir/transformers/property-transformer.ts:550` — `STATE_PREFIXES = ['hover-', 'focus-', 'active-', 'disabled-']` (Caller-Side-Filter, der entscheidet welche Properties zum Helper gehen)

**3 Symptome bei der Hardcoded-Liste:**

1. **Validator-Compiler-Disagreement.** `Frame focus-bg #fff` → Validator E100 (unknown property) UND Helper emittiert CSS. User bekommt einen Fehler UND ein funktionierendes Render gleichzeitig — schlechtes Signal-Verhältnis.
2. **Longest-Match-Bug.** `Frame focus-visible-bg #fff` matched die `focus`-Prefix (erster Hit in der for-Schleife), schnitt `focus-` ab und nutzte `visible-bg` als Property — emittierte `:focus { visible-bg: #fff !important }`. Die 5 Slice-26-Iter-1-Erweiterungs-States (`focus-visible`, `focus-within`, `placeholder-shown`, `first-child`, `last-child`) waren via Inline-Shorthand silent broken.
3. **Schema-Drift-Familie.** Iter-1 fixte den DOM-Emitter und den Studio-Sync-Layer; **diese zwei Stellen waren ausserhalb des Iter-1-Suchradius** weil der Iter-1-Grep auf `'hover'.*'focus'` matchte aber `STATE_PROPERTY_PREFIXES`/`STATE_PREFIXES` nicht.

**Fix (V-Iter2-1):**

1. `ir-helpers.ts`: `STATE_PROPERTY_PREFIXES` schema-derived aus `SYSTEM_STATES`, sortiert longest-first (so wie `studio/sync/component-line-parser.ts` schon im Iter-1-Fix).
2. `property-transformer.ts`: `STATE_PREFIXES` schema-derived (`SYSTEM_STATES.map(s => s + '-')`, longest-first).

**RTs:** Bestehende `tests/compiler/properties-deep-coverage.test.ts` und `properties-deep.test.ts` testen `focus-bg`/`active-col`/`disabled-bg` — alle weiterhin grün. Neuer Probe-Lauf in `tools/probes/slice-26-system-states.ts` lockt die fix-state visuell.

**Cross-Slice-Probe:** Die zwei Schema-derived Listen werden auch von Slice 27 (`toggle()`), Slice 28 (Multi-State-Cycle) und Slice 29 (`exclusive()`) konsumiert — Cross-Slice-Bug-Familie. Slice 27/28/29-RTs (CompileSync) bleiben grün, lockt durch automatischen Test-Lauf.

**Nicht-fixed (deferred):** Validator-Compiler-Disagreement bei `focus-bg`/`active-bg`/`disabled-bg`. Schema definiert nur `hover-*`-Properties; die anderen 12 Schema-System-States haben keine entsprechenden `<state>-bg`/`<state>-col`/etc. Schema-Einträge. Re-Open-Trigger: **Slice 31 (Initialer State)** — dort wird state-shorthand insgesamt audited inkl. Schema-Erweiterung.

## 7.4 CDP-E2E-Schuld eingelöst

`studio/test-api/suites/states/system-states.test.ts` um 5 RTs erweitert (Iter-1 hatte nur 56 für `focus`/`active`/`disabled` + combined):

| RT              | Eingabe                                      | Assertion                                   |
| --------------- | -------------------------------------------- | ------------------------------------------- |
| `focus-visible` | `Button` mit `focus-visible:` Block          | Preview-Stylesheet enthält `:focus-visible` |
| `focus-within`  | `Frame` mit `focus-within:` Block            | Preview-Stylesheet enthält `:focus-within`  |
| `visited`       | `Link` mit `visited:` Block                  | Preview-Stylesheet enthält `:visited`       |
| `checked`       | `Input type "checkbox"` mit `checked:` Block | Preview-Stylesheet enthält `:checked`       |
| `placeholder`   | `Input` mit `placeholder:` Block             | Preview-Stylesheet enthält `::placeholder`  |

**Helper:** `getPreviewCSS()` liest gezielt nur die `<style>`-Elemente innerhalb von `.mirror-root` (per `compiler/backends/dom/style-emitter.ts:490 _root.appendChild(_style)`), nicht die Studio-Chrome-CSS (CodeMirror, Property-Panel) — vermeidet False-Positives wo der Studio's eigenes CSS bereits `:focus-visible` (CodeMirror), `::placeholder` (Property-Panel) etc. enthält.

**Bundle-Inkonsistenz beim Setup:** `dist/browser/index.global.js` war gegenüber `compiler/runtime/state-machine.ts` **5 Tage stale** — bundle's `CSS_PSEUDO_STATES` hatte nur 5 Einträge statt 13. `npm run build:studio` rebuilt die Studio-Chunks, aber NICHT das Runtime-Bundle (kommt vom übergeordneten `npm run build`). Workflow-Dokumentation: vor CDP-Run `npm run build && cp dist/browser/index.global.js studio/dist/browser/` (DTS-Build-Failure ignorieren — irrelevant für CDP).

**Status:** 61 von 61 states-CDP-Tests grün. CDP-Schuld-Limit: 0 von max 5 für Slice 26.

## 7.5 Studio-Roundtrip — Lower-Bar-Deklaration

Property-Panel-State-Tabs für die 13 system-states sind ungeprüft. Voll-CDP-Test des Roundtrip (Click im Preview → Property-Panel zeigt State-Tabs für `:focus-visible` etc.) erfordert eine deutlich grössere Test-Infrastruktur (state-tab-discovery, conditional-render basierend auf dem selektierten Element).

**Lower-Bar:** DOM-Pfad gelocked via RT-1..RT-12 (jsdom) + 5 neue CDP-RTs (Section 7.4). Property-Panel-State-Tabs als **deferred mit explizitem Re-Open-Trigger:** Ziel **Slice 69 (Property-Panel-Roundtrip)** — dort wird die State-Tab-UI dediziert audited.

## 7.6 9-Punkt-Quality-Gate (Iter-2)

| #   | Check                                                                                                     | Status | Vermerk                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Probe-Tabelle: kein 🔴 außer in expliziter „deferred"-Spalte                                              | ✅     | A6/A7/A8 fixed; A3-A5 deferred zu Slice 31 dokumentiert                                                                                 |
| 2   | Phase-Stati ∈ {erledigt, verschoben, verworfen}; kein „pending"/„offen"/„in-arbeit"                       | ✅     | Iter-2-Items alle erledigt oder Re-Open-Trigger gesetzt                                                                                 |
| 3   | Jeder RT-Plan-Eintrag hat einen geschriebenen Test                                                        | ✅     | RT-1..RT-12 (jsdom, vorhanden seit Iter-1) + 5 neue CDP-RTs                                                                             |
| 4   | Schema-Drift-Grep ausgeführt; gefundene Stellen gefixt oder dokumentiert                                  | ✅     | 2 neue Stellen gefunden, beide schema-derived; V-Iter2-1                                                                                |
| 5   | Cross-Slice-Wirkung geprüft; betroffene Nachbar-Slices haben In-scope-Fix oder Deferred-Lock-RT           | ✅     | V-Iter2-1 propagiert via `SYSTEM_STATES` automatisch zu Slice 27/28/29; jeweilige Suites grün                                           |
| 6   | Cross-Backend-Differential-RT existiert pro Property/Verhalten                                            | ✅     | Section 7.2-B Probe-Lauf (DOM ✅, React/FW deklarativer Pass-through wie Iter-1 dokumentiert)                                           |
| 7   | Studio-Roundtrip explizit benannt: „CDP-Run grün" oder „Lower-Bar: DOM gelocked via RT-X"                 | ✅     | CDP-Run grün (61/61) + Lower-Bar für Property-Panel-State-Tabs (Section 7.5)                                                            |
| 8   | Vitest gesamt grün; vor-Slice-Vergleich bestätigt: keine Test-Subtraction                                 | ✅     | 7169 grün vor + nach (1 skipped); +5 CDP-RTs; +20 Probe-Sub-Asserts; keine Test-Subtraction                                             |
| 9   | Wer auf „ist das nun richtig gut?" mit „substantiell besser, aber …" antwortet, hat 1–8 nicht durchlaufen | ✅     | Antwort: ja. Iter-1-Lücken alle geschlossen oder mit explizitem Re-Open-Trigger versehen. Slice 31 + Slice 69 sind die offenen Stränge. |

**Slice-26-Status: erledigt** (Iter-2-Pass abgeschlossen).
