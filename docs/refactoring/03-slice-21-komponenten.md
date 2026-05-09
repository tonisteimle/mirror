# 03 — Slice 21: Komponenten-Definition & -Verwendung

**Datum:** 2026-05-09
**Status:** Audit erledigt · Untersuchung abgeschlossen · Entscheidungen offen · Umsetzung nicht begonnen

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

# 3. Entscheidungen (Vorschläge, offen)

## V-1 — Use-without-Definition: Compile-Pipeline-Hook für Validator

**Frage:** Compiler emittiert silent `<div>`-Fallback bei `Btn "X"` ohne `Btn:` Definition. Validator-E002 ist da, wird aber im Build-Pfad nicht zwingend ausgelöst. Wie schliessen?

**Optionen:**

- **A:** Compiler bricht ab bei undefined component (Validator-Equivalence)
- **B:** Compiler emittiert weiter UND emittiert `console.warn(...)` im erzeugten JS
- **C:** Compiler emittiert weiter, aber Studio-Pipeline ruft Validator vor Compile auf (UI-Linter)
- **D:** Status quo

**Vorschlag:** **A** — strikter wäre besser. Mirror DSL-Versprechen: Components müssen definiert sein. Silent fallback ist Design-Bug.

**Risiko:** Bestehende Mirror-Files könnten `Btn "X"` nutzen ohne `Btn:` Definition (= versehentliche Frame-Verwendung). Migration-Aufwand niedrig (kein Treffer in `examples/` oder `studio/storage/` per grep).

**Status:** offen.

## V-2 — Lowercase Component-Name: Validator-Warn + Parser-Disambiguation

**Frage:** `btn: bg #f00` parsed als Token, `btn "X"` als Component-Use. Beide leben in getrennten Systemen. User merkt nichts.

**Optionen:**

- **A:** Parser hebt lowercase-name in Component-System wenn Use-Site mit Positional-Argument (= `btn "X"` ist eine Instanz, nicht ein Token) → Component-Definition wird daraus
- **B:** Validator-Warn bei lowercase Component-Use (E002 schon da, aber als Hilfetext „Component-Name muss Pascal-Case sein, oder das ist ein Token")
- **C:** Status quo (Validator E002 unverändert)

**Vorschlag:** **B** + Pascal-Case-Canonicalization (siehe Slice 1 V-2). Erstmal nicht heben — der Token-System-Pfad ist legit für Property-Sets.

**Status:** offen.

## V-3 — Self-Recursion: explizite Diagnose statt Unknown-Fallback

**Frage:** `Tree:\n  Tree\nTree` produziert `data-component="Unknown"` für die innere Tree-Referenz. Silent.

**Optionen:**

- **A:** Compiler erzeugt Validator-Error/Warn bei detected Self-Recursion
- **B:** Compiler emittiert explicit `data-recursion-stopped="true"` Marker
- **C:** Status quo (Unknown-Fallback)

**Vorschlag:** **A** — Self-Recursion ist seltener Fall, aber wenn er auftritt sollte er sichtbar sein. Validator-Warn (W-Code), nicht Error.

**Status:** offen.

## V-4 — Nested Definition: Validator-Warn + Parser-Reject

**Frage:** `Outer:\n  Inner: bg #f00` wird zu Instance reinterpretiert. Definition-Status verloren.

**Optionen:**

- **A:** Parser detected nested-`Name:` und erzeugt Validator-Error
- **B:** Parser erlaubt nested Definitions als lokale Components (Scope: nur innerhalb Outer)
- **C:** Status quo (silent reinterpret)

**Vorschlag:** **A** — Mirror DSL-Versprechen: top-level Definitionen. Lokale Scopes sind nicht im Versprechen. A schliesst die Stille.

**Risiko:** Selten genutzt? `examples/` durchsuchen vor Implementierung.

**Status:** offen.

## V-5 — Primitive-Shadow: Validator-Warn

**Frage:** `Frame: bg #f00` redefiniert die Primitive Frame. Funktioniert, aber undokumentiert.

**Optionen:**

- **A:** Verbieten (Error)
- **B:** Warnen (Validator-W-Code „Component shadows primitive")
- **C:** Erlauben + dokumentieren

**Vorschlag:** **B** — schlecht für AI-Generierung (Halluzinationen mit Primitive-Namen) und für Code-Lesbarkeit. Warnung gibt Lautstärke ohne Bruch.

**Status:** offen.

## V-6 — Doppel-Definition: Validator-Warn

**Frage:** `Btn: bg #f00\nBtn: bg #0f0` — last wins, AST behält beide. Doku schweigt.

**Vorschlag:** Validator-Warn „Component re-defined". AST darf beide Einträge behalten (für Studio-Tooling), Codepfad nutzt last.

**Status:** offen.

## V-7 — Empty Definition: Validator-Warn

**Frage:** `Btn:` (leer) erlaubt. Sinn-frei aber legal.

**Vorschlag:** Validator-Warn „Empty component definition". Niedrige Priorität.

**Status:** offen.

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

| ID                                                                                         | Sub-Task                                                                           | Aus V    | Status |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------- | ------ |
| **Phase A — Validator schärfen** (no-op compiler-side, sichtbar im `mirror-validate`-Lauf) |
| A.1                                                                                        | Validator-Warn bei Self-Recursion (W-Code)                                         | V-3      | offen  |
| A.2                                                                                        | Validator-Warn bei Component-Doppel-Definition                                     | V-6      | offen  |
| A.3                                                                                        | Validator-Warn bei Empty Component-Definition                                      | V-7      | offen  |
| A.4                                                                                        | Validator-Warn bei Component-shadows-Primitive                                     | V-5      | offen  |
| A.5                                                                                        | Validator-Error bei nested Component-Definition                                    | V-4      | offen  |
| A.6                                                                                        | E002-Hilfetext: bei lowercase Component-Use „Component-Name muss Pascal-Case sein" | V-2      | offen  |
| **Phase B — Compiler stricter (Build-Time-Reject)**                                        |
| B.1                                                                                        | Compiler: undefined Component → Compile-Error (statt silent Frame-Fallback)        | V-1      | offen  |
| B.2                                                                                        | Compiler: Self-Recursion → Compile-Warn statt Unknown-Fallback                     | V-3      | offen  |
| B.3                                                                                        | Compiler: nested Component-Definition → Compile-Error                              | V-4      | offen  |
| **Phase C — Studio-Pipeline-Hook**                                                         |
| C.1                                                                                        | Studio: Validator vor Compile aufrufen, Errors als Linter im Editor                | V-1, Q-A | offen  |

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

| ID    | Test                                                                            | Layer     | Aus        | Status |
| ----- | ------------------------------------------------------------------------------- | --------- | ---------- | ------ |
| RT-1  | `Btn "X"` ohne Definition → Compile-Error oder explicit Diagnostik              | compiler  | B.1        | offen  |
| RT-2  | `btn "X"` (lowercase) → Validator-E002 mit Pascal-Case-Hinweis                  | validator | A.6        | offen  |
| RT-3  | `Btn "Abbrechen", bg #333` mit `Btn: bg #2271C1` → Override wirkt (Smoke-Probe) | compiler  | regression | offen  |
| RT-4  | Tree → Tree → ... Self-Recursion löst Validator-Warn aus                        | validator | A.1        | offen  |
| RT-5  | `Outer:\n  Inner:\n  Inner` (nested def) löst Validator-Error aus               | validator | A.5        | offen  |
| RT-6  | `Frame: bg #f00` (Primitive-Shadow) löst Validator-Warn aus                     | validator | A.4        | offen  |
| RT-7  | `Btn:\nBtn:` (Empty + redefine) löst Validator-Warn aus                         | validator | A.2/A.3    | offen  |
| RT-8  | Forward-Ref: `Btn "X"\nBtn: ...` rendert Properties korrekt                     | compiler  | regression | offen  |
| RT-9  | Multi-Definition: `Btn: bg #f00\nBtn: bg #0f0\nBtn "X"` → last wins (`#0f0`)    | compiler  | regression | offen  |
| RT-10 | Studio-E2E: Component-Picker drop → Definition + Use beide entstehen            | browser   | C.1        | offen  |

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
