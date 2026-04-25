# Thema 2: Parser

**Status:** Abgeschlossen (2026-04-25).

1 Soft-Error-Verbesserung (Top-Level skip-unknown), 11 reaktivierte Schema-Tests,
~75 neue Tests. Insgesamt 662 Parser-Tests grün, 6 skipped (Schema-Constraints).
Details: `tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Parser Bulletproof)".

**Echte Code-Coverage** (V8, gemessen 2026-04-25):

| Modul                               | Lines | Branches | Funcs |
| ----------------------------------- | ----- | -------- | ----- |
| `compiler/parser/parser.ts`         | 77.3% | 70.9%    | 81.8% |
| `compiler/parser/ast.ts`            | 60.0% | 60.0%    | 60.0% |
| `compiler/parser/parser-context.ts` | 13.0% | 0.0%     | 83.3% |

**Lücke:** `parser-context.ts` (Internal-Helper) und `ast.ts` (AST-Types-Helper).
Die Hauptdatei `parser.ts` ist okay, könnte auf 85%+ wachsen mit gezielter
Nachschärfung der Branches in selten genommenen Pfaden (Schema-Constraints,
Markdown, etc.).

## 1. Scope

Der Parser (`compiler/parser/parser.ts`, 5466 Zeilen, plus AST-Definition `ast.ts` 840 Z., Sub-Parser `animation-parser.ts` 248 Z., `data-parser.ts` 466 Z., `zag-parser.ts` 1065 Z.) wandelt eine Token-Liste in eine AST um.

**Im Scope:**

- Top-Level-Konstrukt-Erkennung in `parse()`: Canvas, Section-Header, Use-Imports, 5 Token-Varianten (simple, suffix-single, suffix-legacy, reference, legacy), Schema, Custom-Icons, Data-Objekt, Property-Set, Legacy-Token, Each, If, JavaScript, Component/Animation/Instance/Zag
- Hierarchie aus INDENT/DEDENT zu Eltern-Kind-Beziehungen
- Komponenten-Definitionen (`Btn:`, `Btn as Button:`, `Btn extends Button:`)
- Instances (`Btn "Click"`, `Btn named saveBtn`, named/unnamed)
- Property-Listen (Komma-getrennt, multi-value, auto-property-separation)
- Inline-Children (Semicolon-Syntax: `Frame; Btn; Text`)
- States (System/Custom, Inline/Block, mit Triggers + when-Clauses)
- Events (onclick/onhover/onkeydown/etc., Implicit onclick, Multi-Element-Triggers)
- Each-Loops (mit `where` und `by`)
- Conditionals (if/else block + Ternary inline)
- Slots als Primitive
- Token-Definitionen aller 5 Syntaxen
- Schema-Definition (`$schema:`) — derzeit `describe.skip` in Tests
- Custom-Icons (`$icons:`)
- Data-Objekte (mit Markdown, Relations, Nested)
- Property-Sets (Mixins)
- Use-Imports (`use components`)
- JavaScript-Block (let/const/var/function/class)
- Dropdown-Features (visibleWhen, selection, initialState, focusable, onclick-outside)
- Position-Tracking (line/column auf jedem AST-Knoten)
- Error-Recovery (Parser crasht nie, sammelt Errors, gibt partielle AST zurück)

**Nicht im Scope (gehört zu späteren Themen):**

- Property-Werte semantisch validieren → Validator (Thema 18)
- Auflösen von Token-/Component-Referenzen → IR (Themen 5, 6)
- Vererbungs-Merge-Semantik → Thema 5 (Komponenten & Vererbung)
- State-Machine-Generierung → Thema 7
- Layout-Konfliktlösung → Thema 4
- SourceMap-Konsistenz → Thema 17

## 2. Ist-Aufnahme

Insgesamt **29 Test-Dateien**, **~605 Tests**, ~6959 Zeilen.

### Strukturelle Parser-Tests

| Datei                                     | Tests | Bereich                                                                                                                                                                                                                                             |
| ----------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parser-basic-structure.test.ts`          | 3     | Frame mit Text-Kindern, verschachtelte Frames, Properties auf Frame                                                                                                                                                                                 |
| `parser-components.test.ts`               | 24    | Component-Definitionen mit `as` (frame/text/button/input/image/link/icon), inline + block properties, position, edge cases                                                                                                                          |
| `parser-instances.test.ts`                | 24    | Basic Instances, Named Instances, Nested Instances, Position, Edge Cases (hyphenated names)                                                                                                                                                         |
| `parser-inheritance.test.ts`              | 16    | `extends`-Syntax, Multiple Variants, Inheritance Chain, mit String-Content, mit Properties, hyphenated parent, `as` vs `extends`                                                                                                                    |
| `parser-inheritance-model.test.ts`        | 10    | 4-Ebenen-Vererbungsketten, Property-Override, Children-Merging, States/Events vererben                                                                                                                                                              |
| `parser-properties.test.ts`               | 29    | Single-Value, Multi-Value (pad 8 16, pad 8 16 8 16), Border, Comma-separated, String content, Position                                                                                                                                              |
| `parser-property-aliases.test.ts`         | 3     | Aliase äquivalent, Reihenfolge egal, Kurz-/Langform gemischt                                                                                                                                                                                        |
| `parser-auto-property-separation.test.ts` | 57    | **Whitespace-statt-Komma** zwischen Properties (`hor center` statt `hor, center`), Multi-Value-Detection, Booleans, Align-Position-Werte, special values (full, hug), Min/Max-Sizing, Typography, Visual, Grid, Scroll, Backward-compat mit Kommata |
| `parser-inline-children.test.ts`          | 17    | Semicolon-Syntax (`Frame; Btn`), Child-Overrides in Inheritance/State, Edge Cases (trailing semicolon, lowercase = property)                                                                                                                        |
| `parser-states.test.ts`                   | 22    | System (hover/focus/active/disabled), Custom (highlighted/selected/expanded/collapsed/on/off/filled), Inline States, hyphenated names, child-overrides                                                                                              |
| `parser-state-triggers.test.ts`           | 14    | State mit onclick/onkeydown-Triggern, exclusive/toggle Modifiers, when-Clauses (or/and/chained)                                                                                                                                                     |
| `parser-events.test.ts`                   | 38    | onclick/onhover/onchange/oninput/onfocus/onblur, Actions (with target args), relative targets, Keyboard-Events (enter/escape/arrow/tab/space), Timing (debounce)                                                                                    |
| `parser-implicit-onclick.test.ts`         | 46    | `toggle()`/`show()`/`hide()` ohne explizites onclick, exclusive/navigate/scrollTo/showModal/dismiss, Keyboard-Shortcuts (`onkeyenter`, `onkeyescape`), CSS-functions (rgba) ≠ Action                                                                |
| `parser-multi-element-triggers.test.ts`   | 4     | Cross-Element-Triggers (z.B. `MenuBtn.open: ...` block-Syntax)                                                                                                                                                                                      |
| `parser-slots.test.ts`                    | 16    | Slot Primitive (mit/ohne Name, mit Properties, als Child, in Component-Definition, hyphenated name)                                                                                                                                                 |
| `parser-tokens.test.ts`                   | 26    | Token-Definitionen (color, size, font, icon, hyphenated, hex, decimal), simplified vs legacy syntax, mit Components/Instances                                                                                                                       |
| `parser-iteration.test.ts`                | 11    | Each-Loop (basic, mit Children, nested, where, complex filter), Data-Binding-Property, Variable-References                                                                                                                                          |
| `parser-conditionals.test.ts`             | 15    | Block-Conditionals (basic, if-else, mit logischer Expression, comparison, negation, nested, multi-then), Inline-Ternary                                                                                                                             |
| `parser-data-objects.test.ts`             | 24    | Data-Objects (basic, Markdown, mixed, multiple, nested, Relations), Property-Sets, Legacy `$`-Prefix                                                                                                                                                |
| `parser-schema.test.ts`                   | 17    | **`describe.skip(`** — Schema-Parser-Tests aktuell deaktiviert!                                                                                                                                                                                     |
| `parser-javascript.test.ts`               | 9     | JS-Detection (let/const/var/function/class), block-Capture, Mirror+JS Coexistence                                                                                                                                                                   |
| `parser-custom-icons.test.ts`             | 6     | `$icons:` Block, Source-Position, IR-Transform, mit UI-Elements                                                                                                                                                                                     |
| `parser-use-import.test.ts`               | 3     | `use` Statements (single, multiple, hyphenated filenames)                                                                                                                                                                                           |
| `parser-dropdown-features.test.ts`        | 21    | visibleWhen via if(open), selection-Bindings, initialState, focusable, onclick-outside, Edge-Cases                                                                                                                                                  |
| `parser-dropdown-errors.test.ts`          | 17    | Invalid initialState-Words, Selection-Bindings ohne `$`, VisibleWhen-Edge-Cases (empty/no-paren/unbalanced), Multiple Declarations, onclick-outside without action                                                                                  |
| `parser-full-documents.test.ts`           | 20    | Integration: minimal/whitespace/comment-only documents, tokens-only/components-only/instances-only/mixed, realistic examples (card, form, dropdown)                                                                                                 |

### Error & Recovery

| Datei                           | Tests | Bereich                                                                                                                                                                                                        |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `errors-parser-errors.test.ts`  | 30    | Missing Colons, Incomplete Definitions, Invalid Token Definitions, Indentation Errors, Property Errors, Empty Constructs, Stray Tokens (colon/equals/comma/number/string), Event Errors, Named-Instance Errors |
| `errors-recovery.test.ts`       | 22    | Error Collection (missing colon, incomplete), Graceful Handling (unknown tokens, empty body), Token/Instance/State/Event Parsing, Partial Parsing, Recovery                                                    |
| `parser-error-recovery.test.ts` | 28    | Multiple-Errors-Collection, Recovery at Different Levels, Partial AST Generation, Error-Message-Quality, Common Syntax Errors, Stress Tests                                                                    |

### Sub-Parser

- `tests/compiler/data-parser.test.ts` (81 Tests) — eigener Test für `compiler/parser/data-parser.ts` (YAML-ähnliches Datenformat). Liegt in Scope von Thema 9 (Data-Binding & Iteration).
- Animation-Parser (`animation-parser.ts`) — getestet via `motion-one-codegen.test.ts` und `state-animation-codegen.test.ts`. Im Scope von Thema 13 (Animationen).
- Zag-Parser (`zag-parser.ts`) — getestet implizit via Component-/IR-Tests. Im Scope von Thema 12 (Zag-Komponenten).

### Was bereits gut abgedeckt ist

- Top-Level-Konstrukte (Tokens, Components, Instances) – jeweils 20+ Tests
- Auto-Property-Separation (57 Tests, sehr gründlich)
- Implicit-onclick (46 Tests)
- Events (38 Tests)
- Inheritance (16 + 10 Tests)
- Error-Recovery (3 Test-Files mit insgesamt 80 Tests)

### Auffällige Lücken auf den ersten Blick

- **`parser-schema.test.ts` ist `describe.skip(`** — Schema-Parsing wird nicht getestet, obwohl `parseSchema()` und `parseSchemaField()` existieren (`parser.ts` Z. 747, 819).
- **Sehr wenige Position-Tracking-Tests** — Tests sagen meist nur „has line number", prüfen aber nicht systematisch, dass alle AST-Knoten korrekte line/column haben.
- **Kein dedizierter Stress-Test für AST-Tiefe** — `errors-recovery.test.ts` hat „handles large documents", aber kein systematisches Limit-Testing.
- **Wenige Tests für gemeinsame Edge-Cases zwischen Konstrukten**: z.B. Comment INNERHALB von Property-Liste; Section-Header zwischen Component-Body und State-Block; `each` innerhalb State-Body; Conditional als Inline-Child.

## 3. Provokations-Liste

Spalte „Erwartet" beschreibt das, was _vermutlich_ korrekt ist. Spalte „Status" sagt, ob ein direkter Test existiert.

### 3.1 Top-Level-Detection-Logic (parse() if-Kette)

| #   | Input                                                                               | Erwartet                                                  | Status    |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- | --------- |
| T1  | `name:` ohne Wert dahinter (NUR `name` + COLON + NEWLINE)                           | Soft-Error oder leeres Token                              | **fehlt** |
| T2  | `name.: value` (leerer Suffix-Teil)                                                 | Soft-Error                                                | **fehlt** |
| T3  | `name..deep.path: value` (doppelter Punkt)                                          | Verhalten? Möglicherweise als ein langer Identifier       | **fehlt** |
| T4  | `if: ...` (Schlüsselwort als Token-Name)                                            | aktuell: scheitert wahrscheinlich an `IDENTIFIER`-Check   | **fehlt** |
| T5  | `each: ...` (Schlüsselwort als Token-Name)                                          | aktuell: triggert each-Branch                             | **fehlt** |
| T6  | `Btn: pad 12` versus `btn: pad 12` (Case-sensitivity für Component vs Property-Set) | Großbuchstabe = Component, klein = Property-Set           | teilweise |
| T7  | Mehrere Section-Header hintereinander (`--- A ---\n--- B ---`)                      | Beide als Section-Marker; currentSection = letzter        | **fehlt** |
| T8  | `use` ohne Filename                                                                 | Soft-Error oder ignoriert                                 | **fehlt** |
| T9  | `use ""` (leerer Filename)                                                          | Verhalten?                                                | **fehlt** |
| T10 | Canvas mitten im Dokument (statt am Anfang)                                         | aktuell: Wird **nicht** als Canvas erkannt (nur am Start) | **fehlt** |
| T11 | Canvas ZWEIMAL am Anfang                                                            | Erste gewinnt? Oder zweite?                               | **fehlt** |
| T12 | JavaScript-Keyword als Property-Name (`Frame let 5`)                                | Verhalten? `let` würde JS-Branch triggern!                | **fehlt** |

### 3.2 Token-Definitionen

| #   | Input                                                                        | Erwartet                                                            | Status    |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| TK1 | `name: =` (EQUALS direkt nach COLON)                                         | Soft-Error                                                          | **fehlt** |
| TK2 | `name: type =` (kein Wert)                                                   | Soft-Error                                                          | **fehlt** |
| TK3 | `name: 123abc` (NUMBER + IDENTIFIER kombiniert)                              | Tokenisiert als zwei Tokens; Parser-Behavior?                       | **fehlt** |
| TK4 | Token-Name mit reserved keyword (`if: #f00`)                                 | Vermutlich Error                                                    | **fehlt** |
| TK5 | Token-Wert ist self-reference: `primary: $primary`                           | Lexisch ok, Parser akzeptiert; semantisch: zirkulär (Validator-Job) | **fehlt** |
| TK6 | Multi-line-Wert (`name:\n  long-value`) — als Property-Set oder Data-Objekt? | Property-Set wenn nächste Zeile valid Property                      | **fehlt** |
| TK7 | Token mit Liste (`colors: #f00, #0f0, #00f`)                                 | aktuell: nur erster Wert wird als Wert erfasst                      | **fehlt** |

### 3.3 Komponenten-Definitionen

| #   | Input                                                                                      | Erwartet                                       | Status    |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------- |
| C1  | `Btn:` (kein `as`, keine Children)                                                         | Component ohne Primitive ok                    | teilweise |
| C2  | `Btn as Btn:` (zirkulär, sich selbst als Primitive)                                        | Lexer/Parser ok, Validator-Job                 | **fehlt** |
| C3  | `Btn extends Btn:` (Self-Inheritance)                                                      | Parser akzeptiert, Validator/IR-Problem        | **fehlt** |
| C4  | `Btn as InvalidPrimitive:` (unbekanntes Primitive)                                         | Parser akzeptiert; Validator findet es         | **fehlt** |
| C5  | Component-Name = Schlüsselwort: `Each as frame:`                                           | Vermutlich Error im Lexer (each → EACH-Token)  | **fehlt** |
| C6  | Component-Name mit Bindestrichen: `My-Btn as Button:`                                      | ok? lexer macht `My-Btn` als single IDENTIFIER | teilweise |
| C7  | Component mit identischem Inheritance-Namen mehrfach: `Btn extends Btn:`                   | semantisch ill-formed                          | **fehlt** |
| C8  | Component mit Bindestrich-Parent: `Foo extends My-Btn:`                                    | ok                                             | getestet  |
| C9  | Inheritance-Kette mit identischem Namen unterschiedlich: was wenn `Btn` zweimal definiert? | Last wins? Oder Error?                         | **fehlt** |
| C10 | Komponenten-Definition direkt nach Inline-Children-Parent (`Card; Btn\nNewComp:`)          | Korrekte Trennung?                             | **fehlt** |

### 3.4 Inline-Children

| #   | Input                                                                                                   | Erwartet                                               | Status             |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------ |
| IC1 | `Frame;`                                                                                                | Trailing-Semicolon ohne Inhalt (in tests dokumentiert) | getestet           |
| IC2 | `Frame;;` (Doppel-Semicolon)                                                                            | Doppelt? Leeres Inline-Kind?                           | **fehlt**          |
| IC3 | `Frame; ; Btn` (leerer Slot zwischen)                                                                   | Verhalten?                                             | **fehlt**          |
| IC4 | `Frame; Btn; Card` (3 Inline-Kinder)                                                                    | 3 Kinder                                               | getestet           |
| IC5 | `Frame; Btn; bg #f00` (lowercase nach Semicolon = ?)                                                    | aktuell: Property auf `Btn`                            | **fehlt** explizit |
| IC6 | Inline-Children über mehrere Zeilen — geht nicht? Zeilen sind klare Grenze.                             | NEWLINE beendet Inline-Children                        | **fehlt**          |
| IC7 | Inline-Child mit Inline-Children: `Frame; Card; Btn` (verschachtelt sequence) — wie wird interpretiert? | Mirror-Spec: alle sind Geschwister                     | **fehlt**          |
| IC8 | Inline-Child mit Block-Body — geht nicht inline                                                         | Error/Ignored?                                         | **fehlt**          |

### 3.5 Properties & Auto-Property-Separation

| #   | Input                                                            | Erwartet                                                                        | Status                     |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| P1  | `Frame pad`                                                      | Property ohne Wert — Soft-Error oder leerer Wert?                               | **fehlt**                  |
| P2  | `Frame pad,`                                                     | Trailing comma                                                                  | getestet                   |
| P3  | `Frame pad 8 16 24 32 40` (5 Werte für pad)                      | Mirror erwartet 1/2/4 Werte, was passiert mit 5?                                | **fehlt**                  |
| P4  | `Frame w 100 w 200 w full` ("letzter gewinnt")                   | Parser akzeptiert alle drei als separate Properties; IR macht "letzter gewinnt" | **fehlt**                  |
| P5  | `Frame "text" pad 12 "more"` (zwei String-Contents)              | Verhalten? Erste content-Property wins?                                         | **fehlt**                  |
| P6  | `Frame hor center spread tc` (4 standalone properties)           | Auto-Separation greift; alle 4 Properties                                       | getestet (vermutlich)      |
| P7  | `Frame pad 8 16 hor center` (multi-value pad + standalones nach) | 8/16 zu pad, hor/center separate                                                | getestet                   |
| P8  | `Frame, , , bg #f00` (mehrere Kommata in Folge)                  | Soft-Error oder ignoriert                                                       | getestet (multiple-commas) |
| P9  | Property mit Token-Reference: `Frame bg $primary`                | Wert = TokenReference                                                           | teilweise                  |
| P10 | Property mit ternary: `Frame bg active ? red : blue`             | Conditional-Wert                                                                | **fehlt**                  |

### 3.6 States

| #   | Input                                                                                            | Erwartet                                     | Status    |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------- |
| S1  | Mehrere `hover:` Blocks im selben Component                                                      | Last wins? Merged? Beide?                    | **fehlt** |
| S2  | `hover:` mit leerem Body                                                                         | OK (getestet als „state with no properties") | getestet  |
| S3  | State auf root-Level (außerhalb Component-Body)                                                  | Error oder Ignored                           | **fehlt** |
| S4  | `selected onclick:` (State mit Trigger) — ohne Children                                          | Trigger ok; State greift                     | getestet  |
| S5  | Custom State mit `selected onclick toggle()` Inline                                              | Inline-Definition; getestet                  | getestet  |
| S6  | When-Clause mit zirkulärer Reference: `selected when Btn.selected:` (auf eigene Komponente)      | Validator-Job                                | **fehlt** |
| S7  | When-Clause mit komplexen and/or/not Kombinationen                                               | tested mit „and", „or", „chained"            | getestet  |
| S8  | State Child Override mit Inheritance: was wenn Child ein Override hat, das aber Parent nicht hat | Verhalten?                                   | **fehlt** |

### 3.7 Events & Actions

| #   | Input                                                           | Erwartet                              | Status    |
| --- | --------------------------------------------------------------- | ------------------------------------- | --------- |
| E1  | `Btn onclick`                                                   | Event ohne Action — Soft-Error        | getestet  |
| E2  | `Btn onclick toggle()` vs `Btn toggle()` (implicit vs explicit) | Beides erkannt                        | getestet  |
| E3  | `Btn onclick toggle(), toast("hi")`                             | Mehrere Actions; getestet             | getestet  |
| E4  | `Btn onclick`+next-line `  toggle()` (Action im Block)          | Block-Form für Events?                | **fehlt** |
| E5  | `Btn onclick rgba(255,0,0)` — CSS-function als Action?          | Tests sagen: nicht als Action erkannt | getestet  |
| E6  | `Btn onkeydown` (kein Key)                                      | Soft-Error                            | getestet  |
| E7  | `Btn onkeydown enter+ctrl: ...` (Modifier)                      | Aktuell nicht supported; Verhalten?   | **fehlt** |
| E8  | Cross-Element-Trigger: `Menu.open:` mit mehreren Aktionen       | tested basic                          | getestet  |

### 3.8 Iteration (each)

| #   | Input                                                      | Erwartet                                         | Status    |
| --- | ---------------------------------------------------------- | ------------------------------------------------ | --------- |
| EA1 | `each in $list` (kein loop-variable)                       | Soft-Error                                       | **fehlt** |
| EA2 | `each item in $missing`                                    | Parser ok; semantisch (Validator) findet missing | **fehlt** |
| EA3 | Nested each: `each cat in $cats\n  each item in cat.items` | tested „nested each loops"                       | getestet  |
| EA4 | `each item in $list where`                                 | where ohne expression                            | **fehlt** |
| EA5 | `each item in $list by`                                    | by ohne field                                    | **fehlt** |
| EA6 | `each item in $list by field desc, asc`                    | Konflikt: desc und asc                           | **fehlt** |
| EA7 | `each item in $list where item.x > 0 by name desc`         | Combined                                         | **fehlt** |

### 3.9 Conditionals

| #   | Input                                                        | Erwartet                                        | Status    |
| --- | ------------------------------------------------------------ | ----------------------------------------------- | --------- |
| CO1 | `if`                                                         | Soft-Error                                      | **fehlt** |
| CO2 | `if condition\n  then-children\nelse\n  else-children`       | tested basic                                    | getestet  |
| CO3 | `if a\nelse if b\nelse`                                      | else-if Chain — supported?                      | **fehlt** |
| CO4 | Tiefes Nesting: 5+ Level if-in-if                            | Parser-Stack ok? `MAX_LOOKAHEAD` greift?        | **fehlt** |
| CO5 | Inline ternary in Property: `Frame bg active ? red : blue`   | Wert ist Conditional                            | **fehlt** |
| CO6 | Komplexe Expression: `if (a and b) or (c and not d)`         | Expression-Tree korrekt                         | getestet  |
| CO7 | Conditional als Inline-Child: `Frame; if a; Btn; else; Card` | Geht das überhaupt? Getrennte Inline-Sequenzen? | **fehlt** |

### 3.10 Inheritance & Composition

| #   | Input                                                                        | Erwartet            | Status    |
| --- | ---------------------------------------------------------------------------- | ------------------- | --------- |
| IH1 | Diamond inheritance — schwer im DSL: nur single-extends supported            | Single-extends-only | implicit  |
| IH2 | Vererbung mit Namespace-Konflikt: zwei verschiedene Komponenten heißen `Btn` | Ungeprüft           | **fehlt** |
| IH3 | State im Vererbungskette: Child overridet Parent-State                       | tested              | getestet  |
| IH4 | Inheritance + Slot: Child fügt Slot hinzu, Parent hat keinen                 | Verhalten?          | **fehlt** |
| IH5 | Inheritance + child override mit verschiedenen Indentation-Levels            | OK?                 | **fehlt** |

### 3.11 Error-Recovery & Robustheit

| #   | Input                                                                   | Erwartet                                        | Status             |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| ER1 | `MAX_ITERATIONS` greift bei pathologischem Input                        | Parser exit ohne Hang                           | **fehlt** explizit |
| ER2 | Lexer-Errors → Parser sieht beschädigte Tokens; produziert trotzdem AST | Recovery                                        | teilweise          |
| ER3 | Sehr tiefes Nesting (50+) — Stack-Overflow?                             | Sollte mit Indent-Limit aus Lexer funktionieren | **fehlt**          |
| ER4 | Component-Body mit Mix von gültigen und ungültigen Statements           | Recovery innerhalb body                         | teilweise          |
| ER5 | Multiple Statements with errors → alle Errors gesammelt                 | tested                                          | getestet           |
| ER6 | Fuzz-Input (zufällige Tokens) → keine Crashs                            | tested in `fuzz.test.ts`                        | getestet           |

### 3.12 Schema (deaktiviert)

| #   | Input                         | Erwartet            | Status              |
| --- | ----------------------------- | ------------------- | ------------------- |
| SC1 | `$schema:` mit Feldern        | Schema-AST-Knoten   | **`describe.skip`** |
| SC2 | Schema-Felder mit Constraints | tested aber skipped | **`describe.skip`** |
| SC3 | Relations zwischen Schemas    | tested aber skipped | **`describe.skip`** |

→ Eigene Untersuchung in Schritt 4: warum sind die Tests skipped? Funktioniert das Feature überhaupt? Wenn nicht → entweder fixen oder Tests entfernen.

### 3.13 Position-Tracking

| #    | Test                                                       | Status    |
| ---- | ---------------------------------------------------------- | --------- |
| PT1  | Component-Definition: line/column                          | getestet  |
| PT2  | Instance: line/column                                      | getestet  |
| PT3  | Property: line/column                                      | getestet  |
| PT4  | State-Block: line                                          | getestet  |
| PT5  | Slot: line/column                                          | getestet  |
| PT6  | Token-Definition: line/column                              | teilweise |
| PT7  | Each-Loop: line/column                                     | **fehlt** |
| PT8  | If/Else-Block: line/column                                 | **fehlt** |
| PT9  | Event/Action: line/column                                  | **fehlt** |
| PT10 | Inline-Property innerhalb Multi-Property-List: line/column | **fehlt** |

## 4. Test-Plan

Ich schlage **3 neue Test-Dateien** vor. Erfahrungswert aus Thema 1: Bug-Tests zuerst, dann ergänzende Coverage-Files.

### 4.1 `tests/compiler/parser-bugs.test.ts` (neu, Bug-Hunting)

Konzentrierte Bug-Hypothesen, die echte Probleme aufdecken könnten. Jede Hypothese wird zu einem Test, der das _erwartete_ Verhalten formuliert. Schlägt der Test fehl → Bug gefunden.

Top-Kandidaten:

- **T4/T5**: Reserved keywords als Token-Name (`if:`, `each:`)
- **T10/T11**: Canvas mid-document oder zweimal
- **T12**: JS-Keyword-Property (`Frame let 5`)
- **TK1**: `name: =` (leerer Wert)
- **TK4**: Reserved keyword als Token-Name (`if: #f00`)
- **C2/C3**: Self-inheritance / self-as
- **IC2/IC3**: Doppel-Semicolon, leerer Inline-Slot
- **IC8**: Inline-Child mit Block-Body
- **P3**: 5+ Werte für eine Multi-Value-Property
- **P5**: Zwei String-Contents
- **S1**: Mehrere `hover:` Blocks
- **S3**: State auf root-Level
- **EA1**: each ohne loop-variable
- **EA4/EA5**: where/by ohne expression
- **CO1**: lone `if`
- **CO3**: else-if-chain
- **CO7**: Conditional als Inline-Child

**Geschätzt: 15–25 Tests, mit Erwartung dass 5–10 echte Bugs aufdecken.**

### 4.2 `tests/compiler/parser-additional.test.ts` (neu, Coverage)

Lücken aus 3.1–3.10, die ergänzende Coverage liefern. Tests fixieren bestehendes Verhalten.

Schwerpunkte:

- **3.1 Top-Level**: Section-Header-Sequenzen, use-Edge-Cases
- **3.5 Properties**: Token-Reference-Werte, Comma-Handling
- **3.7 Events**: Block-Form für Events, Modifier-Keys
- **3.8 Iteration**: Combined where + by
- **3.10 Inheritance**: Slot in Inheritance-Chain, Child-Overrides Indentation
- **3.13 Position-Tracking**: Each, If/Else, Event-Position systematisch

**Geschätzt: ~50 Tests.**

### 4.3 Schema-Klärung

`parser-schema.test.ts` ist `describe.skip(`. In Schritt 4:

1. Lese die skipped Tests zur Hypothesen-Bildung
2. Aktiviere einen probeweise — schaue, was passiert
3. Entscheidung: Schema-Feature funktioniert / brauche Fix / Feature ist tot, Tests löschen

**Geschätzt: 1–2 Stunden Klärung, kein dedizierter Test-File-Schreiben.**

### 4.4 Stress-Tests (optional, 4. File)

Wenn Stress-Tests sinnvoll erscheinen (gegen MAX_ITERATIONS, MAX_LOOKAHEAD, Stack-Overflow): `tests/compiler/parser-stress.test.ts` mit ~10 Tests:

- Sehr lange Property-Listen
- Sehr tiefes Nesting
- Pathologischer Input gegen MAX_LOOKAHEAD
- Multi-Component-Documents (1000+ Components)

Aber: viele dieser Aspekte sind in `fuzz.test.ts` und `stress-performance.test.ts` schon abgedeckt. Vermutlich nicht nötig.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste erstellt (~70 Hypothesen in 13 Bereichen)
- [x] Schritt 4: Tests geschrieben (parser-bugs, parser-additional), 1 Bug gefixt, 11 Schema-Tests reaktiviert
