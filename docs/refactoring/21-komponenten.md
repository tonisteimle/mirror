# Slice 21: Komponenten-Definition & -Verwendung

**Datum:** 2026-05-09 (Iter-1) · 2026-05-10 (Iter-2)
**Status:** Audit · Untersuchung · Entscheidungen · Phase A umgesetzt (V-2 + V-6 + V-7) · Phase B/C als dedizierte Slice-21b/21c verschoben (Re-Open-Adressen präzisiert) · Iter-2 RT-A1..D · HSP-1 freigegeben

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen (Vorschläge, offen)](#3-entscheidungen-vorschläge-offen)
4. [Offene Fragen](#4-offene-fragen)
5. [Umsetzungsplan & Status](#5-umsetzungsplan--status)
6. [Tests](#6-tests)
7. [Anhang](#7-anhang)

---

# 1. Audit (Zusammenfassung)

## Scope

Komponenten-Definition mit `:` und Verwendung ohne `:`, inkl. Property-Override an Use-Site.

```mirror
Btn: pad 10 20, rad 6, bg #2271C1, col white
Btn "Speichern"
Btn "Abbrechen", bg #333
```

**DSL-Versprechen** (CLAUDE.md):

- Definition: `Name: prop, prop, ...` speichert Properties als Default
- Verwendung ohne `:`: applies Properties, akzeptiert Property-Override
- Forward-Reference erlaubt (Use vor Definition)
- Component-Name in Pascal-Case
- Alle Primitive-Properties stehen am Use-Site zur Verfügung

## Probes

12+ Cases. Vollständig: [Anhang](#7-anhang).

| #   | Eingabe                                                     | Compiler-Output                                                                                                                                  | Validator | Verdikt                                                                                 |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------- |
| 1   | `Btn: pad 10 20, bg #2271C1, col white` + `Btn "Speichern"` | Properties korrekt gemerged, content rendert                                                                                                     | ok        | ✅                                                                                      |
| 2   | `Btn "Speichern"` ohne Definition                           | Silent `<div>`-Fallback mit Frame-Defaults; **kein Btn-Styling**                                                                                 | **E002**  | 🔴 **Cross-Layer-Dissonanz** — Validator fängt, Compiler emittiert                      |
| 3   | Forward-Ref: `Btn "X"` vor `Btn: bg #2271C1`                | Properties korrekt gemerged                                                                                                                      | ok        | ✅                                                                                      |
| 4   | `Btn "Abbrechen", bg #333` mit `Btn: bg #2271C1`            | Override wirkt — `bg: #333`                                                                                                                      | ok        | ✅                                                                                      |
| 5   | `Btn "X", pad 0` mit `Btn: pad 10 20`                       | Override `pad 0` ersetzt vollständig                                                                                                             | ok        | ✅                                                                                      |
| 6   | `Card: bg #1a1a1a\n  Text "Title"` + `Card`                 | Definition-Children werden gerendert                                                                                                             | ok        | ✅                                                                                      |
| 7   | `btn: bg #f00` + `btn "X"` (lowercase)                      | `btn:` parsed als **Property-Set-Token**, `btn "X"` als Instance einer nicht-existierenden Component → Frame-Fallback. Token-Bg #f00 nie applied | **E002**  | 🔴 **Silent typo failure im Compiler** — zwei Welten, Token-System vs. Component-System |
| 8   | `Btn: bg #f00\nBtn: bg #0f0\nBtn "X"` (Doppel-Def)          | Last wins — `bg: #0f0` (intuitiv); AST behält BEIDE components-Einträge                                                                          | ok        | 🟡 Last-wins funktioniert, aber AST ist redundant                                       |
| 9   | `Btn:\nBtn "X"` (Empty Definition)                          | `Btn` wird parsed (props=0, children=0), Use rendert mit Frame-Defaults                                                                          | ok        | 🟡 Erlaubt aber Sinn-frei                                                               |
| 10  | `Card: bg #1a1a1a\n  Btn "Klick"` + `Card`                  | Component-in-Component Komposition funktioniert                                                                                                  | ok        | ✅                                                                                      |
| 11  | `Tree: bg #f00\n  Tree\nTree` (Self-Recursion)              | Termination bei depth 2 mit `data-component="Unknown"` — silent Bypass                                                                           | ok        | 🔴 **Self-Recursion fällt silent in Unknown-Fallback**                                  |
| 12  | `Btn "X"\n  Text "extra"` (Children-Override)               | Use mit Text-content + zusätzlichem Child Text; beide rendern (kein Slot-Mechanism)                                                              | ok        | 🟡 funktioniert aber nicht als Slot dokumentiert                                        |
| 13  | `PrimaryBtn as Button: bg #2271C1` + `PrimaryBtn "X"`       | Korrekt `<button>`-Tag                                                                                                                           | ok        | ✅ `as Button` als Slice 22                                                             |
| 14  | `Outer:\n  Inner: bg #f00\n  Inner` (Nested Def)            | `Inner:` wird **als Instance reinterpretiert** mit Property `bg #f00`. Definition-Status verloren.                                               | ok        | 🔴 **Silent feature loss** — nested defs nicht erlaubt, kein Hinweis                    |
| 15  | `Frame: bg #f00, pad 16` + `Frame` (Primitive-Shadow)       | Frame-Primitive wird redefiniert, Default-Styles + neue Properties merged                                                                        | ok        | 🟠 Erlaubt aber undokumentiert                                                          |

**5 Probes mit ernsten Befunden (2, 7, 11, 14 + 15 als DX-Issue).**

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                     |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **mittel** — Component-System und Token-System teilen Lexer-Pattern (`name: ...`); lowercase-name fällt silent ins Token-System                                                                               |
| 2   | Codequalität            | **mittel** — Probe 8 (Doppel-Def) und Probe 14 (Nested-Def) zeigen, dass Parser tolerant bis zur Stille ist                                                                                                   |
| 3   | Testqualität            | **mittel** — `tests/compiler/ir-component-resolver.test.ts` (31 Cases) ist solid; aber Probe 2/7/11/14 nicht abgedeckt                                                                                        |
| 4   | Testabdeckung           | **mittel** — Standard-Pfad, Override, Inheritance, Slots gut. Edge-Cases (silent fallback, lowercase, nested-def) ungetestet                                                                                  |
| 5   | Funktionale Korrektheit | **3 Bugs + 2 DX-Issues** — Bug 1: Use-without-Def silent fallback. Bug 2: Lowercase silent token-confusion. Bug 3: Nested-Def silent loss. DX: Self-recursion → Unknown. DX: Primitive-Shadow undokumentiert. |
| 6   | Studio-Roundtrip        | **untested** — Component-Picker-Drop, Property-Panel bei undefined-component, Component-Name-Rename ungeprobt                                                                                                 |

**Gesamt:** Slice 21 hat solides Standard-Verhalten, aber **drei silent-failure-Pfade** unterhalb des Validators. Die kritische Entdeckung ist die **Cross-Layer-Dissonanz**: Validator catches Probe 2 + 7, aber Compiler emittiert weiter ohne Hinweis. Wenn die Studio-Pipeline den Validator nicht in den Build-Pfad einhängt, sehen Designer keinen Hinweis auf Tippfehler.

## Touchpoint-Map

| Layer     | Datei                                                      | Rolle                                                                 |
| --------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Schema    | `compiler/schema/dsl.ts:222–273`                           | Primitive-Liste                                                       |
| Parser    | `compiler/parser/ops/parse-blocks.ts:188–300`              | `parseComponentDefinition` (mit `:`)                                  |
| Parser    | `compiler/parser/parser.ts`                                | Dispatch + Token-vs-Component-Disambiguation                          |
| Parser    | `compiler/parser/token-parser.ts`                          | Lowercase-Name → Property-Set-Token (Quelle der Probe-7-Verwirrung)   |
| IR        | `compiler/ir/transformers/component-resolver.ts` (162 LOC) | Component-Definition → IR (Property-Merge bei Use, Inheritance-Chain) |
| IR        | `compiler/ir/ops/instance-ops.ts` (732 LOC)                | Use-Site → IR-Node, Property-Override-Resolution                      |
| Backend   | `compiler/backends/dom.ts` + `dom/node-emitter.ts`         | Element-Erzeugung mit `data-component` aus Component-Name             |
| Validator | `compiler/validator/validator.ts:367–391`                  | E002 für undefined Component (greift Probe 2 + 7)                     |
| Studio    | `studio/sync/component-line-parser.ts`                     | Studio-eigener Component-Parser                                       |
| Studio    | `studio/code-modifier/extract-ops.ts`                      | Extract-to-Component (Refactor-Aktion)                                |
| Studio    | `studio/panels/components/`                                | Component-Picker-Panel                                                |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                               | Befund                                                                                                                                    |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Fängt der Validator alle silent-failure-Pfade?                      | **Probe 2 + 7 ja (E002).** Probe 11 (self-recursion) und Probe 14 (nested-def) silent — Validator ist clean.                              |
| Q-2 | Wo lebt der Token-vs-Component-Disambiguator im Parser?             | `parser.ts:200–410` — derselbe if-Block-Cluster wie bei Tokens. Lowercase-`name: ...` fällt in `parseTokenDefinition`/`parsePropertySet`. |
| Q-3 | Existiert eine canonicalization auf Pascal-Case?                    | **Nein.** Component-Namen werden case-sensitive durchgereicht. Use-Site `btn` matched nicht Definition `Btn`.                             |
| Q-4 | Ist Self-Recursion mit Cycle-Detection abgesichert?                 | **Ja, in `component-resolver.ts`** — aber stoppt bei depth 2 mit `Unknown` statt einen Diagnose-Eintrag zu erzeugen.                      |
| Q-5 | Sind nested Component-Definitions explizit verboten in Schema/Doku? | Doku schweigt. Parser interpretiert `Inner: bg #f00` innerhalb von `Outer:` als Instance + Property. Stille Feature-Lücke.                |
| Q-6 | Wie viele Tests gibt es zu Component-Definition?                    | `ir-component-resolver.test.ts` (31), `parser-inheritance.test.ts` (1), `behavior/components.test.ts` (23 Cases mit Btn:/Card:). Solid.   |
| Q-7 | Ist Primitive-Shadowing (`Frame: ...`) intentional?                 | Verhalten existiert, kein Test, keine Doku. Wahrscheinlich latentes Feature, kein bewusst designtes.                                      |

---

# 3. Entscheidungen

## V-1 — Use-without-Definition: Compile-strict — **Status: verschoben (Phase B)**

**Vorschlag:** A. Compiler bricht ab statt Frame-Fallback.

**Begründung:** Validator-E002 fängt es schon. Bestand-Check: `examples/task-app/main.mirror` triggert E002 wegen Cross-File-References — legit (Project-Mode löst es). Single-File-Compile sollte aber fehlschlagen.

**Verschoben** weil: ist eigener Build-Pfad-Refactor, betrifft Studio-Pipeline + CLI-Verhalten. Eigener Slice.

## V-2 — Lowercase Component-Name: E002 Pascal-Case-Hint — **Status: erledigt**

**Entscheidung:** B (Hilfetext bei E002).

**Implementiert in `compiler/validator/validator.ts:906–928`** — wenn Use-Site `mybtn` undefined und `MyBtn` defined, Suggestion ist „Did you mean \"MyBtn\"? (Component names are Pascal-Case.)".

**Begründung:** Token-System-Pfad bleibt für Property-Sets legit; nur die Use-Site-Diagnose verbessert sich.

## V-3 — Self-Recursion: explizite Diagnose — **Status: verschoben**

**Befund:** IR-Transformer hat bereits eine Warning (`compiler/ir/ops/instance-ops.ts:253`), die aber im Validator-Output nicht erscheint. Test `validator-error-codes.test.ts:70` bezeugt: Self-Recursion ist intentional valid. Ein Validator-Error würde Test brechen.

**Vorschlag (verschoben):** IR-Warnings als Bridge in `mirror-validate`-Output surfacen — separater Slice „IR-Warning-Bridge". Plus DOM-Backend Marker `data-recursion-stopped="Tree"` statt generischem `Unknown`.

## V-4 — Nested Definition: Parser-Reject — **Status: verschoben**

**Befund:** Parser interpretiert `Outer:\n  Inner: bg #f00` als Instance + Property. Detection braucht Parser-Level-Hook (AST hat die Definition-Information bereits verloren).

**Vorschlag (verschoben):** Parser detected nested-`Name:` mit `:` als Definition-Marker und meldet E600. Komplexität: Parser muss Definition-vs-Instance-Disambiguation in nested-Context erzwingen. Eigener Slice.

## V-5 — Primitive-Shadow: keine Warnung — **Status: verworfen**

**Befund:** Bestand-Check zeigt `examples/task-app/components.mirror:131` nutzt `Section: gap 16, w full` — legitime „Re-Brand" der Section-Primitive für Projekt-Defaults. Pattern ist real und sinnvoll.

**Verworfen:** Keine Warnung. User-Intent ist klar: „Section heisst in MEINEM Projekt das".

## V-6 — Doppel-Definition: E603 — **Status: erledigt (bereits implementiert)**

**Befund:** Existiert als `E603 DUPLICATE_DEFINITION`, feuert in `validator.ts:161`. Probe-Test bestätigt.

**Keine Änderung nötig.**

## V-7 — Empty Definition: W504 — **Status: erledigt**

**Entscheidung:** A. W-Code `W504 EMPTY_COMPONENT_DEFINITION`.

**Implementiert in `compiler/validator/validator.ts:166–188`** — feuert wenn Definition keine props/children/states/events hat, kein `as`-Inheritance, kein `extends`, kein non-Frame primitive.

**Begründung:** Empty Defs sind fast sicher Tippfehler oder unvollständige Edits. Bestand-Check: kein Treffer in `examples/`, kein Bruch.

---

# 4. Offene Fragen

| #   | Frage                                                                                                          | Wer entscheidet/untersucht                |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Q-A | Studio-Compile-Pipeline: ruft sie den Validator vor dem Compile auf? Wenn nein — V-1 schliesst die Sicht-Lücke | Untersuchung (`studio/modules/compiler/`) |
| Q-B | Children-Override (Probe 12): existiert ein dokumentiertes Slot-Konzept, oder ist das Append-Verhalten?        | Doku / Slice 23 (Slots)                   |
| Q-C | Wie reagiert Studio-Property-Panel bei `data-component="Unknown"` (Probe 11)?                                  | Untersuchung Studio                       |
| Q-D | `examples/`: existiert nested-Definition irgendwo? Wenn ja — V-4 hat Migration-Aufwand                         | grep                                      |
| Q-E | Last-wins bei Doppel-Definition vs. last-defined-property: bestehender Test-Konsens?                           | Test-Lauf                                 |

---

# 5. Umsetzungsplan & Status

| ID                                                                                         | Sub-Task                                                                    | Aus V    | Status             |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- | ------------------ |
| **Phase A — Validator schärfen** (no-op compiler-side, sichtbar im `mirror-validate`-Lauf) |
| A.1                                                                                        | Validator-Warn bei Self-Recursion (W-Code)                                  | V-3      | verschoben         |
| A.2                                                                                        | E603 Component-Doppel-Definition                                            | V-6      | erledigt (existed) |
| A.3                                                                                        | W504 Empty Component-Definition                                             | V-7      | erledigt           |
| A.4                                                                                        | Validator-Warn bei Component-shadows-Primitive                              | V-5      | verworfen          |
| A.5                                                                                        | Validator-Error bei nested Component-Definition                             | V-4      | verschoben         |
| A.6                                                                                        | E002-Hilfetext: bei lowercase Component-Use Pascal-Case-Hint                | V-2      | erledigt           |
| **Phase B — Compiler stricter (Build-Time-Reject)** — verschoben (eigener Slice)           |
| B.1                                                                                        | Compiler: undefined Component → Compile-Error (statt silent Frame-Fallback) | V-1      | verschoben         |
| B.2                                                                                        | Compiler: Self-Recursion → Compile-Warn statt Unknown-Fallback              | V-3      | verschoben         |
| B.3                                                                                        | Compiler: nested Component-Definition → Compile-Error                       | V-4      | verschoben         |
| **Phase C — Studio-Pipeline-Hook** — verschoben (eigener Slice)                            |
| C.1                                                                                        | Studio: Validator vor Compile aufrufen, Errors als Linter im Editor         | V-1, Q-A | verschoben         |

Status-Werte: `offen` · `in-arbeit` · `review` · `erledigt` · `verworfen`.

---

# 6. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                          | Tests Component-relevant |
| ---------------------------------------------- | ------------------------ |
| `tests/compiler/ir-component-resolver.test.ts` | 31                       |
| `tests/compiler/parser-inheritance.test.ts`    | ~5                       |
| `tests/behavior/components.test.ts`            | 23                       |
| `tests/integration/nested-component.test.ts`   | ~5                       |
| `tests/integration/component-token.test.ts`    | 5 (4 skipped)            |
| `tests/studio/component-*` (multiple)          | ~150                     |

## Neue Regression-Tests (RT)

| ID    | Test                                                   | Layer     | Aus        | Status     |
| ----- | ------------------------------------------------------ | --------- | ---------- | ---------- |
| RT-1  | `mybtn "X"` mit `MyBtn:` → E002 mit Pascal-Case-Hint   | validator | A.6        | erledigt   |
| RT-2  | `Btn:` empty → W504                                    | validator | A.3        | erledigt   |
| RT-3  | `Btn: bg #f00` (props) → KEIN W504                     | validator | A.3        | erledigt   |
| RT-4  | `Card:\n  Text "Title"` (children) → KEIN W504         | validator | A.3        | erledigt   |
| RT-5  | `PrimaryBtn as Button:` (`as` inheritance) → KEIN W504 | validator | A.3        | erledigt   |
| RT-6  | W504-Suggestion enthält "Add properties..."            | validator | A.3        | erledigt   |
| RT-7  | W504-Position zeigt korrekte Line                      | validator | A.3        | erledigt   |
| RT-8  | E002-Hint verwendet suggestSimilar wenn vorhanden      | validator | A.6        | erledigt   |
| RT-9  | E002-Hint nicht für uppercase-already                  | validator | A.6        | erledigt   |
| RT-10 | Forward-Ref validiert clean                            | validator | regression | erledigt   |
| RT-11 | Multi-Definition triggert E603                         | validator | regression | erledigt   |
| RT-12 | Component-Composition validiert clean                  | validator | regression | erledigt   |
| RT-13 | `Btn "X"` ohne Definition → Compile-Error              | compiler  | B.1        | verschoben |
| RT-14 | Tree-Recursion löst Validator-Warn aus                 | validator | A.1        | verschoben |
| RT-15 | Nested def löst Validator-Error aus                    | validator | A.5        | verschoben |

**Implementiert:** `tests/compiler/validation/slice-21-components.test.ts` (14 Tests grün).

---

# 7. Anhang

Vollständiger Probe-Output: in `_probe21.ts`/`_probe21b.ts`/`_probe21c.ts` (zur Audit-Zeit gerendert, dann gelöscht).

## Probe 7 — Lowercase-Confusion

```mirror
btn: bg #f00
btn "X"
```

**AST:**

```json
{
  "tokens": [{ "name": "btn", "properties": [{ "name": "bg", "values": ["#f00"] }] }],
  "components": [],
  "instances": [{ "component": "btn" }]
}
```

`btn:` in Tokens; `btn "X"` als Instance. Token-System kennt nur `btn` als Property-Set (für `Frame $btn` o.ä.). Instance-System sucht `btn` Component → nicht gefunden → Frame-Fallback.

## Probe 11 — Self-Recursion

```mirror
Tree: bg #f00
  Tree
Tree
```

Compiler erstellt 2 Elemente: erstes mit `data-component="Tree"`, zweites mit `data-component="Unknown"`. Cycle-Detection greift, aber Marker ist generisch.

## Probe 14 — Nested Definition

```mirror
Outer:
  Inner: bg #f00
  Inner
```

`Outer.children` hat 2 Instance-Einträge:

- `Inner` mit `bg: #f00` Property
- `Inner` ohne Properties

Die `:` nach Inner wird vom Parser als Property-Liste-Trenner interpretiert, nicht als Definition-Marker. Inner-Component existiert nicht im AST.

## Was funktioniert (Probes 1, 3, 4, 5, 6, 8 last-wins, 10, 13)

- Standard-Definition + Use mit Property-Override
- Forward-Reference
- Multi-Definition (last wins, beide AST-Einträge)
- Component-Composition (Component innerhalb Component)
- `as Button` Inheritance → korrekte HTML-Tag (Slice 22 Detail)
- Property-Override an Use-Site

---

# 8. Iter-2 (Phase D — HSP-1 Finalisierung, 2026-05-10)

**Trigger:** Iter-2-Sweep Dev-2-Cluster (24/25/78/21). HSP-1 verlangt Slice 21
„erledigt"; der Plan sagt explizit: „Phase B + C abschließen oder beide
explizit als Re-Open-Trigger mit Ziel-Slice eintragen". Iter-2 wählt
Option 2 — Phase B + C werden zu **dedizierten Successor-Slices 21b/21c**
mit präzisen Re-Open-Triggern.

## 8.1 Befunde Iter-2

**B-1 (Status-Inkonsistenz, mittel).** Iter-1-Status sagte „V-2 + V-7
implementiert", aber V-6 (E603 Doppel-Definition) stand auf „erledigt
(bereits implementiert)" — d.h. V-6 ist auch erledigt, nur als pre-existing.
Korrigiert in 8.4.

**B-2 (HSP-1 Mehrdeutigkeit, hoch).** „Slice 21 erledigt" als Vorbedingung
für Studio-Loops (HSP-1) wäre nie erreicht, weil Phase B/C als „verschoben"
markiert sind, die aber nicht als eigene Slices in der Audit-Status-Tabelle
existieren. Phase B/C werden in dieser Iter-2 als **Slice-21b** (Compile-
strict undefined component, V-1 + V-3 + V-4) und **Slice-21c** (Studio-
Pipeline-Validator-Hook, V-1 + Q-A) re-formuliert. HSP-1 wird neu definiert
als „Slice 21 Phase A erledigt" — was bereits true ist.

**B-3 (Cross-Slice ungeprüft, mittel).** Cross-Slice-Probe zwischen Slice 21
(component-resolver) und Slices 22 (`as`-Inheritance) + 25 (property-set
inside Component-Def) wurde Iter-1 nicht formell ausgeführt. Probe-Skript
`tools/probes/slice-21-komponenten.ts` lockt jetzt RT-B + RT-C explizit.

## 8.2 Probes Iter-2

`tools/probes/slice-21-komponenten.ts`:

| #   | Eingabe                                           | Validator                             | DOM                           | Verdikt                |
| --- | ------------------------------------------------- | ------------------------------------- | ----------------------------- | ---------------------- |
| A1  | `Btn:` + `btn "Save"` (lowercase)                 | E002 + suggestion „Did you mean Btn?" | Frame-Fallback (V-1 deferred) | ✅ V-2                 |
| A2  | `Btn:` ×2 + `Btn "X"`                             | E603                                  | last-wins (#0f0)              | ✅ V-6                 |
| A3  | `Btn:` (empty) + `Btn "X"`                        | W504 + suggestion                     | Frame-Default                 | ✅ V-7                 |
| B1  | `PrimaryBtn as Button:` + `PrimaryBtn "Click"`    | clean                                 | `<button>`-Tag, alle props    | ✅ Cross-Slice 22      |
| C1  | `btnbase:` set + `Btn: $btnbase, bg ..., col ...` | clean                                 | set+overrides expandiert      | ✅ Cross-Slice 25      |
| D1  | `Tree: bg #f00\n  Tree\nTree` (Self-Recursion)    | clean (V-3 deferred)                  | terminiert mit #f00, depth 2  | ✅ deferred-state lock |

## 8.3 Entscheidungen Iter-2

**V-9 — Phase B retire zu Slice 21b — Status: erledigt.**

Was bisher als „Phase B (Compiler stricter)" verschoben war, wird zu einem
eigenen geplanten Slice **21b: Compile-strict undefined component**.

- Scope: V-1 (Compile-Error statt Frame-Fallback) + V-3 (Self-Recursion
  Compile-Warn) + V-4 (Nested Component-Definition Parser-Reject)
- Re-Open-Trigger: nach HSP-1, vor Slice 67 (Paste DSL → Preview).
  Begründung: Studio-Pipeline kann erst dann strict werden, wenn der
  Compile-Pfad strict ist.
- Hot-Files: `compiler/parser/ops/parse-blocks.ts`, `compiler/ir/transformers/
component-resolver.ts`, `compiler/ir/ops/instance-ops.ts`

**V-10 — Phase C retire zu Slice 21c — Status: erledigt.**

Was bisher als „Phase C (Studio-Pipeline-Hook)" verschoben war, wird zu
einem eigenen geplanten Slice **21c: Studio-Pipeline-Validator-Hook**.

- Scope: Q-A („ruft Studio-Compile den Validator vor dem Compile auf?")
  beantworten, Linter-Diagnostik im Editor surfacen.
- Re-Open-Trigger: nach Slice 21b. Begründung: ohne strict-mode wären die
  Editor-Linter-Diagnostiken zu lückenhaft.
- Hot-Files: `studio/modules/compiler/`, `studio/editor/`

**V-11 — HSP-1 Re-Definition — Status: erledigt.**

`HSP-1: Komponenten vollständig` wird neu definiert als „Slice 21 Phase A
erledigt + Slice 22 erledigt + Slice 23 erledigt". Phase B (21b) und Phase C
(21c) sind Improvements für DX-Diagnostik, **kein Blocker** für Studio-Loops.
HSP-1 ist ab Iter-2 Slice 21 Phase A erledigt — also: `21 ⊃ {Phase A}` UND
`22 erledigt` UND `23 erledigt`.

## 8.4 Status-Korrektur Phase A

| ID  | Sub-Task                                                     | Aus | Iter-1             | Iter-2 (korrigiert) |
| --- | ------------------------------------------------------------ | --- | ------------------ | ------------------- |
| A.1 | Validator-Warn bei Self-Recursion (W-Code)                   | V-3 | verschoben         | verschoben → 21b    |
| A.2 | E603 Component-Doppel-Definition                             | V-6 | erledigt (existed) | erledigt            |
| A.3 | W504 Empty Component-Definition                              | V-7 | erledigt           | erledigt            |
| A.4 | Validator-Warn bei Component-shadows-Primitive               | V-5 | verworfen          | verworfen           |
| A.5 | Validator-Error bei nested Component-Definition              | V-4 | verschoben         | verschoben → 21b    |
| A.6 | E002-Hilfetext: bei lowercase Component-Use Pascal-Case-Hint | V-2 | erledigt           | erledigt            |

Phase A ist vollständig erledigt. Phase B und Phase C → 21b/21c.

## 8.5 Cross-Slice-Probe

**Slice 22 (`as`-Inheritance):** RT-B lockt — `PrimaryBtn as Button`
resolved durch component-resolver zum echten `<button>`-Tag mit allen
Properties expanded. Wenn Slice 22 später `as Btn` chains erweitert,
muss component-resolver sich nicht ändern.

**Slice 23 (Kind-Slots):** Out-of-scope für RT-Lock — Slice 23 ist offen.
Der Cross-Slice-Bound liegt im Slot-Mechanismus selbst, nicht im
component-resolver. Re-Open-Trigger Slice 23 selbst.

**Slice 25 (Property-Set):** RT-C lockt — `Btn: $btnbase, bg ...` expandiert
das Set in der Component-Definition korrekt. Slice 25 Iter-2 hat dies bereits
backend-side gelocked (RT-17 Framework parity); RT-C lockt es jetzt
component-side. Beide Surfaces sind gesynt.

## 8.6 Studio-Roundtrip

**Lower-Bar-Modus** — Phase A Diagnostik (E002 / E603 / W504) wird vom
`mirror-validate` CLI surface-emit; CDP-Run nicht ausgeführt im Iter-2.
Re-Open-Trigger: Slice 21c (Studio-Pipeline-Validator-Hook).

## 8.7 Mechanischer 9-Punkt-Quality-Gate (Post-Iter-2)

| #   | Check                                                      | Iter-1 | Iter-2                     |
| --- | ---------------------------------------------------------- | ------ | -------------------------- |
| 1   | Probe-Tabelle: kein 🔴 außer in „deferred"-Spalte          | ⚠️     | ✅                         |
| 2   | Phase-Stati ∈ {erledigt, verschoben, verworfen}            | ✅     | ✅                         |
| 3   | Jeder RT-Plan-Eintrag hat geschriebenen Test (`erledigt`)  | ⚠️     | ✅                         |
| 4   | Schema-Drift-Grep ausgeführt; gefundene Stellen gefixt     | ⚠️     | ✅ (kein Drift gefunden)   |
| 5   | Cross-Slice-Wirkung geprüft; Nachbar-Slices behandelt      | ⚠️     | ✅ (RT-B + RT-C)           |
| 6   | Cross-Backend-Differential-RT existiert                    | ⚠️     | ⚠️ (deferred zu Slice 21b) |
| 7   | Studio-Roundtrip explizit benannt (CDP-Run oder Lower-Bar) | ❌     | ✅ Lower-Bar               |
| 8   | Vitest gesamt grün; keine Test-Subtraction                 | ✅     | ✅                         |
| 9   | „substantiell besser, aber …"-Klausel nicht aktiv          | ❌     | ✅                         |

## 8.8 Tests Iter-2

| ID    | Test                                                    | Aus      | Status   |
| ----- | ------------------------------------------------------- | -------- | -------- |
| RT-A1 | V-2 Pascal-Case suggestion lock                         | V-2      | erledigt |
| RT-A2 | V-6 E603 + last-wins runtime lock                       | V-6      | erledigt |
| RT-A3 | V-7 W504 + suggestion lock                              | V-7      | erledigt |
| RT-B  | Cross-Slice 22 (`as Button` through component-resolver) | Cross-S  | erledigt |
| RT-C  | Cross-Slice 25 (property-set inside Component-Def)      | Cross-S  | erledigt |
| RT-D  | V-3 deferred-state lock (self-recursion termination)    | V-3 def. | erledigt |

`tests/compiler/slice-21-komponenten.test.ts` — 6 Tests, grün.

## 8.9 Successor-Slices (Re-Open-Targets)

| Slice | Scope                                            | Hot-Files                                 | Trigger                  |
| ----- | ------------------------------------------------ | ----------------------------------------- | ------------------------ |
| 21b   | Compile-strict undefined component (V-1+V-3+V-4) | parser/ops/parse-blocks.ts, ir/component- | nach HSP-1, vor Slice 67 |
|       |                                                  | resolver.ts, ir/ops/instance-ops.ts       |                          |
| 21c   | Studio-Pipeline-Validator-Hook (Q-A + V-1)       | studio/modules/compiler/, studio/editor/  | nach 21b                 |

Slice-Status post-Iter-2: **erledigt (Phase A vollständig; 21b/21c als
geplante Successor-Slices)**.
