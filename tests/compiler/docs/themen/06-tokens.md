# Thema 6: Tokens & Property-Sets

**Status:** Abgeschlossen (2026-04-25).

**Ergebnis:** **2 echte Bugs entdeckt UND gefixt** — beide zur Property-Set-
Verschachtelung („Property-Set referenziert anderes Property-Set"). 35 neue
Tests in 8 Bereichen, keine Regressionen.

**Was gefixt wurde:**

- **Property-Set-Detection erkennt jetzt `$ref` als zulässigen Start**:
  `b: $a, bg #f00` wurde vorher als Component definiert (weil `$a` keinen
  `isValidProperty`-Test bestand). Jetzt wird das Pattern als Property-Set
  erkannt — solange nach `$ref` weitere Properties folgen.
- **Property-Set-Body erweitert** Token-References als Propset-Property:
  `$a` innerhalb eines Property-Set wird jetzt zu `{ name: 'propset',
values: [{ kind: 'token', name: 'a' }] }`, was der existierende
  Property-Set-Expander rekursiv expandiert. Vorher: literal Property mit
  `$a` als Name und leeren Values (also nutzlos).

**Was nicht abgedeckt ist:**

- **Validator-Detail-Tests** für Token-Type-Konflikte (gehört zu Thema 18)
- **Forward-References zwischen Tokens** (lazy resolution) — funktioniert für
  Properties, aber nicht systematisch getestet zwischen Tokens

Details: `tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Tokens & Property-Sets – Thema 6)".

## 1. Scope

**Im Scope:**

- **5 Token-Definition-Varianten** (alle in `compiler/parser/parser.ts`):
  1. **Simple**: `primary: #5BA8F5` (color/size auto-detect)
  2. **Suffix-Single**: `primary.bg: #2271C1` (lexer combines `name.suffix` to one IDENTIFIER)
  3. **Suffix-Legacy** (separate tokens): `name . suffix : value`
  4. **Reference**: `accent.bg: $primary` (token referencing another)
  5. **Legacy with `$`**: `$primary.bg: #f00`
  6. **Legacy with `=`**: `name: type = value`
- **Property-Set (Mixin)**: `cardstyle: pad 16, bg #f00, rad 8` (lowercase, multi-property)
- **Token-References als Property-Werte**: `Frame bg $primary` → CSS-Variable `var(--primary)`
- **Token-Suffix-Path-References**: `Frame bg $primary.bg`
- **Section-Tracked Tokens**: `--- Buttons ---\nbutton.bg: #f00` (currentSection wird zur Token-Metadata)
- **Data-Objects** (nested attributes): `user:\n  name: "Max"\n  age: 42`
- Token-Resolution beim CSS-Output (var(--name) generation)
- Token-Wert-Typen: hex colors, named colors, numbers, strings, booleans, references

**Nicht im Scope:**

- Property-Aliasing/Mappings (Thema 3, abgeschlossen)
- Property-Sets in Inheritance (Thema 5, abgeschlossen)
- $icons / $schema (gehören zu Custom Icons / Schema)

## 2. Ist-Aufnahme

| Datei                            | Tests | Bereich                                                                                                                                     |
| -------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `parser-tokens.test.ts`          | 26    | Token-Definitionen aller 5 Varianten, Token-Edge-Cases (hyphenated, hex variants, decimal), Tokens vor/nach Components, mit Section-Headers |
| `parser-data-objects.test.ts`    | 24    | Data-Objects basic + Markdown + Relations + Nested + Coexistence                                                                            |
| `data-references.test.ts`        | 18    | Data-References (`$user.name`) auflösen                                                                                                     |
| `data-variables.test.ts`         | 22    | Data-Variables in Properties                                                                                                                |
| `ir-token-css-variables.test.ts` | 15    | Token → CSS-Variable, Token in Vererbung, Token in States                                                                                   |

**Summe:** ca. **105 Tests**.

**Bereits abgedeckt:**

- Token-Definition-Syntax aller 5 Varianten (parser-tokens)
- Hex/Number/String-Werte
- Suffix-Token-Definition
- Token-References
- Token in CSS-Variablen-Output
- Token in Inheritance (Thema 5)

**Auffällige Lücken:**

- **Self-Reference**: `a: $a` — bekannt aus Thema 3 als known limitation
- **Circular References**: `a: $b; b: $a` — Cycle-Detection?
- **Token überschreibt sich selbst**: zwei Definitionen mit gleichem Namen
- **Token-Name = Reserved Keyword**: `if: #f00` (in Thema 2 als „verkorkste AST" dokumentiert), `each: 16`
- **Token-Suffix mit reserved keyword**: `name.if: #f00`?
- **Property-Set Edge-Cases**: empty, recursive, mit Direction-Properties, mit Token-Reference inside
- **Token mit Multi-Value**: `colors: #f00 #0f0` — was passiert?
- **Token unbekanntem Suffix**: `primary.foo: #f00` — wird gespeichert, aber wann/wie genutzt?
- **Token mit boolean Wert**: `loggedIn: true`
- **`$undefined`-Reference auf nicht existenten Token**
- **Forward-Reference auf Token**: `Frame bg $primary` → `primary: #f00` definiert später

## 3. Provokations-Liste

### 3.1 Self- und Circular-References

| #   | Input                                        | Erwartet                              | Status      |
| --- | -------------------------------------------- | ------------------------------------- | ----------- |
| C1  | `a: $a; Frame bg $a` (self)                  | leakt literal `$a` ODER Cycle-Warning | known limit |
| C2  | `a: $b; b: $a; Frame bg $a` (2-cycle)        | does not crash; resolution stops      | **fehlt**   |
| C3  | `a: $b; b: $c; c: $a; Frame bg $a` (3-cycle) | terminiert                            | **fehlt**   |
| C4  | 10-deep cycle                                | terminiert                            | **fehlt**   |
| C5  | `a: $a.suffix` self with suffix              | weird but no crash                    | **fehlt**   |

### 3.2 Token Re-Definition

| #   | Input                                             | Erwartet                | Status    |
| --- | ------------------------------------------------- | ----------------------- | --------- |
| R1  | `primary: #f00; primary: #0f0; Frame bg $primary` | last wins               | **fehlt** |
| R2  | `primary.bg: #f00; primary.bg: #0f0`              | last wins               | **fehlt** |
| R3  | `primary: #f00; primary: 16` (different types)    | last wins, type changes | **fehlt** |

### 3.3 Token-Name Edge-Cases

| #   | Input                                   | Erwartet                    | Status                |
| --- | --------------------------------------- | --------------------------- | --------------------- |
| N1  | `if: #f00` (reserved keyword)           | conditional path or warning | known limit (Thema 2) |
| N2  | `each: 16`                              | each-loop path              | known limit           |
| N3  | `name-with-hyphen: #f00`                | works                       | tested                |
| N4  | `Bütton: #f00` (Unicode)                | works                       | **fehlt**             |
| N5  | `primary.if: #f00` (suffix is reserved) | ?                           | **fehlt**             |
| N6  | `primary.: #f00` (empty suffix)         | error or weird              | **fehlt**             |
| N7  | `: #f00` (no name)                      | error                       | **fehlt**             |

### 3.4 Token-Wert-Edge-Cases

| #   | Input                                                   | Erwartet                            | Status                 |
| --- | ------------------------------------------------------- | ----------------------------------- | ---------------------- |
| V1  | `colors: #f00 #0f0` (multi-value)                       | only first / array?                 | **fehlt**              |
| V2  | `loggedIn: true` (boolean)                              | works                               | **fehlt** explicit     |
| V3  | `primary: $undefined` (forward)                         | works after pass1 collects all?     | **fehlt**              |
| V4  | `Frame bg $undefined-token`                             | unresolved leaks `$undefined-token` | dokumentiert (Thema 3) |
| V5  | `negative: -10`                                         | works as size                       | **fehlt**              |
| V6  | `withcomma: red, blue`                                  | parses as multi-property?           | **fehlt**              |
| V7  | Token-Wert mit Komma als Liste vs. Property-Set-Trigger | unklar                              | **fehlt**              |

### 3.5 Property-Set Edge-Cases

| #   | Input                                                       | Erwartet               | Status    |
| --- | ----------------------------------------------------------- | ---------------------- | --------- |
| PS1 | `cs: pad 16, bg #f00; Frame $cs`                            | expanded               | tested    |
| PS2 | `cs: ; Frame $cs` (empty mixin)                             | works                  | **fehlt** |
| PS3 | `cs: hor; Frame $cs` (direction in mixin)                   | direction applied      | **fehlt** |
| PS4 | `a: pad 8; b: $a, bg #f00; Frame $b` (nested mixin)         | both expanded          | **fehlt** |
| PS5 | `a: pad 8; b: $a; a: pad 16; Frame $a` (re-defined)         | last wins, b reflects? | **fehlt** |
| PS6 | `cs: pad 16; cs: bg #f00` (re-define mixin)                 | last wins              | **fehlt** |
| PS7 | `cs: $primary; Frame $cs` (mixin with single token-ref)     | works                  | **fehlt** |
| PS8 | Recursive: `a: $b; b: $a; Frame $a`                         | does not crash         | **fehlt** |
| PS9 | Property-Set with Each: `cs: each item in $list` (illegal?) | error                  | **fehlt** |

### 3.6 Token-Suffix Path References

| #   | Input                                                      | Erwartet                                         | Status             |
| --- | ---------------------------------------------------------- | ------------------------------------------------ | ------------------ |
| P1  | `primary: #f00; Frame bg $primary`                         | works                                            | tested             |
| P2  | `primary.bg: #f00; Frame bg $primary`                      | resolves to var(--primary-bg) or var(--primary)? | **fehlt** explicit |
| P3  | `primary.bg: #f00; Frame bg $primary.bg` (explicit suffix) | works                                            | **fehlt** explicit |
| P4  | `primary.bg.deep: #f00` (multi-suffix)                     | works or error                                   | **fehlt**          |
| P5  | `Frame bg $primary.foo` (unknown suffix)                   | unresolved                                       | **fehlt**          |

### 3.7 Section-Tracked Tokens

| #   | Input                                     | Erwartet                       | Status             |
| --- | ----------------------------------------- | ------------------------------ | ------------------ |
| SE1 | Tokens vor Section-Header                 | section = undefined            | **fehlt** explicit |
| SE2 | Tokens in Section                         | section = name                 | tested             |
| SE3 | Tokens nach mehreren Sections             | section = last                 | **fehlt** explicit |
| SE4 | Section-Header zwischen Components+Tokens | tokens nehmen aktuelle section | **fehlt**          |

### 3.8 Pathologische

| #   | Input                                 | Erwartet     | Status    |
| --- | ------------------------------------- | ------------ | --------- |
| PA1 | 1000 Tokens                           | works        | **fehlt** |
| PA2 | Token-Name 1000 chars                 | works        | **fehlt** |
| PA3 | 100 Token-Refs in einer Property-List | all resolved | **fehlt** |
| PA4 | Long suffix chain `a.b.c.d.e: 1`      | works        | **fehlt** |

## 4. Test-Plan

Eine Datei `tests/compiler/tokens-coverage.test.ts` mit allen Bereichen, ~50 Tests.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste (~50 Hypothesen in 8 Bereichen)
- [x] Schritt 4: 35 neue Tests, 2 Bugs gefixt (Property-Set-Verschachtelung)
- [x] Schritt 5: Coverage-Audit dokumentiert (siehe oben)
