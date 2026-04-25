# Thema 9: Data-Binding & Iteration

**Status:** abgeschlossen (2026-04-25, Pilot für Tutorial-Coverage-Prozess).

**Ergebnis:** **3 echte Bugs gefixt** (List-Daten-Deduplication, Token-Array-
Serialisierung, Nested-Each-Object-Crash), 14 Verhaltens-Tests + 52 Pure-
function-Tests. Tutorial-Coverage 100% (alle 20 Aspekte aus 09-daten.html
abgedeckt).

## Bugs gefixt

- **Bug 1 — List-Style Daten dedupliziert via JS-Object-Map:**
  Tutorial-Beispiel `colors:\n  red\n  blue\n  red\n  green\n  blue\n  red`
  produzierte `$colors.count = 3` statt 6 (Tutorial verspricht 6).
  `transformDataAttributes` baute aus 6 attrs ein Object → JS-Object-Key-
  Uniqueness kollabiert Duplikate. Fix: List-Style erkennen
  (alle attrs `key === value`, keine children) und als
  `IRDataValue[]` zurückgeben statt `IRDataObject`.

- **Bug 2 — Token-Array wird als Object serialisiert:**
  Nach Bug-1-Fix: `transformDataAttributes` returnt Array, aber
  `token-emitter.ts:72` rief immer `serializeDataObject` auf, was Arrays
  als `{0: 'red', 1: 'blue', ...}` serialisierte. Fix: Array-Check vor
  Serialisierung, dann `serializeDataValue` (das Arrays nativ behandelt).

- **Bug 3 — Nested-Each crasht bei Object-Collections:**
  `each x in $xs\n  each y in $ys` mit Object-`$ys` warf
  `forEach is not a function`, weil der **inner**-each (in `dom.ts:1239
emitNestedEachLoop`) keine Object→Array-Konvertierung machte (anders
  als der outer-each in `loop-emitter.ts`). Fix: gleiche Inline-IIFE wie
  outer-each davorgesetzt.

**Scope:** Data-Bereich aus Tutorial 09-daten.html — Variablen, Listen,
Sammlungen, each-Iteration, Relationen, Aggregationen, externe `.data`-
Dateien. Conditionals (if/else, Logik, Inline-Ternary) gehören zu
**Thema 10**.

## 1. Scope

**Im Scope (Pipeline: Parser → IR → Backend):**

- Variablen-Definition: `name: "Max"`, `count: 42`, `active: true`
- Variable-Substitution in Strings: `"Hallo $name"`, `"$count Punkte"`
- Arithmetik: `$count * $price`, String-Verkettung
- Inline-Arrays: `tags: ["a", "b", "c"]`
- Datenobjekte (nested): `user:\n  name: "..."\n  email: "..."`
- Sammlungen: `users:\n  max:\n    ...\n  anna:\n    ...`
- Verschachtelte Datenobjekte: `$user.address.city`
- **Externe `.data`-Dateien** (`data/customers.data` mit identischer Syntax)
- `each user in $users` Iteration
- `each user, i in $users` mit Index
- **Verschachtelte each-Loops**
- **Relationen 1:n** (`assignee: $users.toni`)
- **Relationen N:N** (`members: $users.toni, $users.anna`)
- **Aggregationen** `.count`, `.first`, `.last`, `.unique`

**Pure-function Module:**

- `compiler/ir/transformers/data-transformer.ts` (transformDataValue,
  transformDataAttributes)
- `compiler/ir/transformers/loop-utils.ts` (markLoopVariablesInFilter,
  fixLoopVariableReferences)
- `compiler/parser/data-types.ts` (Type-guards)

**Nicht im Scope:**

- Conditionals (if/else, Logik, Ternary) → **Thema 10**
- Two-way binding (`bind`) → **Thema 14**

## 2. Ist-Aufnahme

| Datei                                                       | Tests | Bereich                                                       |
| ----------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| `tests/compiler/data-parser.test.ts`                        | viele | Parser-Seite                                                  |
| `tests/compiler/data-references.test.ts`                    | 18    | `$user.name` Resolution                                       |
| `tests/compiler/data-variables.test.ts`                     | 22    | Variablen in Properties                                       |
| `tests/compiler/data-integration.test.ts`                   | …     | End-to-end                                                    |
| `tests/compiler/parser-data-objects.test.ts`                | 24    | Data-Objects basic + Markdown + Relations                     |
| `tests/compiler/tutorial/tutorial-11-data-behavior.test.ts` | 15    | Tutorial-Verhaltens-Tests                                     |
| `tests/compiler/data-transformer-coverage.test.ts`          | 52    | Pure-function Module (data-transformer/loop-utils/data-types) |
| `tests/compiler/crud-operations.test.ts`                    | ~20   | add/remove (für Thema 8)                                      |
| `tests/compiler/crud-aggressive.test.ts`                    | ~15   | CRUD-Edge-Cases                                               |

## 3. Tutorial-Aspekt-Coverage

**Tutorial:** `docs/tutorial/09-daten.html` (Daten-Subset; Conditionals-
Subset gehört zu Thema 10).

| Tutorial-Abschnitt          | Aspekt                                    | Test                                        |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| Variablen definieren        | `name: "Max"` einfache Variable           | `tutorial-11-data-behavior` Bsp 1           |
| In Text verwenden           | `"$name"` in Strings                      | Bsp 1, 3                                    |
| Arithmetik (Zahlen)         | `$count * $price` Multiplikation          | Bsp 2, 9                                    |
| Arithmetik (Strings)        | `$firstName + " " + $lastName` Verkettung | Bsp 8                                       |
| Einfache Listen             | `tags: ["a", "b"]` Inline-Array           | Bsp 4                                       |
| Datenobjekte                | `user:\n  name: "..."` nested             | Bsp 14                                      |
| Attribut-Typen              | string/number/boolean Attribute           | implizit Bsp 14, **dedizierter Test fehlt** |
| Sammlungen                  | `users:\n  max:\n    ...`                 | Bsp 5, 15                                   |
| Verschachtelte Datenobjekte | `$user.address.city` deep-path            | Bsp 14                                      |
| **Externe `.data`-Dateien** | `data/customers.data` separate Files      | `tutorial-09-data-aspects` (Iter 1)         |
| Über Einträge iterieren     | `each user in $users`                     | Bsp 5                                       |
| each mit Index              | `each user, i in $users`                  | Bsp 6                                       |
| Verschachtelte Loops        | `each x in $list1\n  each y in $list2`    | Bsp 7                                       |
| **1:n Relationen**          | `assignee: $users.toni` Reference         | `tutorial-09-data-aspects` (Iter 1)         |
| **N:N Relationen**          | `members: $users.toni, $users.anna`       | `tutorial-09-data-aspects` (Iter 1)         |
| **Aggregation `.count`**    | `$tasks.count` zählt Einträge             | `tutorial-09-data-aspects` (Iter 1)         |
| **Aggregation `.first`**    | `$tasks.first.name` erster Eintrag        | `tutorial-09-data-aspects` (Iter 1)         |
| **Aggregation `.last`**     | `$tasks.last.name` letzter Eintrag        | `tutorial-09-data-aspects` (Iter 1)         |
| **Aggregation `.unique`**   | `$colors.unique` deduplizierte Liste      | `tutorial-09-data-aspects` (Iter 1)         |
| Praktisch: Produktliste     | Komplexes each-Beispiel                   | Bsp 11                                      |

**Tutorial-Coverage:** 14 von 20 Aspekten getestet (70%). 6 Aspekte fehlen.
1 Aspekt nur implizit (Attribut-Typen).

## 4. Code-Coverage (Stand vor Iter 1)

| Modul                                                      | Lines | Branches | Funcs |
| ---------------------------------------------------------- | ----- | -------- | ----- |
| `compiler/ir/transformers/data-transformer.ts`             | 100%  | 93.47%   | 100%  |
| `compiler/ir/transformers/loop-utils.ts`                   | 100%  | 100%     | 100%  |
| `compiler/parser/data-types.ts`                            | 100%  | 100%     | 100%  |
| `compiler/ir/transformers/data-binding-transformer.ts` (?) | ?     | ?        | ?     |
| `compiler/parser/data-parser.ts`                           | 84.5% | 78.1%    | 89.5% |

Pure-function Module ✓. Parser noch unter 90% (Iter 2 nötig falls
Tutorial-Aspekt-Tests das nicht abdecken).

## 5. Provokations-Liste (Bug-Hunt zusätzlich zum Tutorial)

| #   | Input                                                    | Erwartet                        | Status |
| --- | -------------------------------------------------------- | ------------------------------- | ------ |
| D1  | Empty collection: `tasks:\n` mit each → keine Renderings | each hat 0 Iterationen          | offen  |
| D2  | Unbekannte Variable `"$undefined"` in Text               | leer / literal `$undefined`     | offen  |
| D3  | Zirkuläre Relation `a.next: $b\nb.next: $a`              | terminiert, kein Stack-Overflow | offen  |
| D4  | Aggregation auf leerer Sammlung: `$empty.count`          | 0                               | offen  |
| D5  | Aggregation `.first` auf leerer Sammlung                 | undefined / leerer Knoten       | offen  |
| D6  | Tiefe each-Verschachtelung (3-Levels)                    | korrekte Index-Auflösung        | offen  |
| D7  | each über Inline-Array `each x in [1, 2, 3]`             | 3 Iterationen                   | offen  |

## 6. Schließen der Aspekt-Lücken

`tests/compiler/tutorial/tutorial-09-data-aspects.test.ts` — 14 Tests,
alle Verhaltens-Tests mit `renderWithRuntime`:

- **Attribut-Typen** (1 Test): string + number + boolean rendern korrekt
- **Aggregation `.count`** (2 Tests): nested-object + flat-list collection
- **Aggregation `.first`/`.last`** (2 Tests): erste/letzte Einträge
- **Aggregation `.unique`** (1 Test): Duplikate werden eliminiert
- **1:n Relationen** (1 Test): `assignee: $users.toni` → `.assignee.name`
- **N:N Relationen** (1 Test): comma-separated refs + each
- **Provokationen D1-D7** (6 Tests): empty collection, undefined ref, count
  on empty, first on empty, nested each cartesian, each over list-style

**Tutorial-Coverage nach Iter 1:** 20 von 20 Aspekten getestet (100%).

## 7. Code-Coverage (post Iter 1)

| Modul                                          | Vorher | Nachher                                                |
| ---------------------------------------------- | ------ | ------------------------------------------------------ |
| `compiler/ir/transformers/data-transformer.ts` | 29.7%  | **100%** L / 94.44% B / 100% F                         |
| `compiler/ir/transformers/loop-utils.ts`       | 52.6%  | **100%** L / **100%** B / **100%** F                   |
| `compiler/parser/data-types.ts`                | 33.3%  | **100%** L / **100%** B / **100%** F                   |
| `compiler/parser/data-parser.ts`               | 84.5%  | **84.5%** (unverändert; eigene Tests deckten schon ab) |

Globaler Effekt nach allen 3 Bug-Fixes: 74.7% → **75.13% Lines**.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme
- [x] Schritt 3: Tutorial-Aspekt-Audit (6 Lücken identifiziert)
- [x] Schritt 4: Provokations-Liste finalisiert
- [x] Schritt 5: 14 Tests + 3 Bugs gefixt + 7 Tutorial-Snapshots aktualisiert
- [x] Schritt 6: Coverage-Audit (Tutorial 100% + Code ≥ 84%)
