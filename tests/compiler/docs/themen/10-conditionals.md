# Thema 10: Conditionals & Expressions

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 18 Tutorial-Aspekt-Tests + 2 Tutorial-Limitations als
`it.todo` markiert. **2 echte Tutorial-Bugs entdeckt** (siehe unten),
beide sind nicht-trivial zu fixen.

## Scope

- `if X` (block)
- `if/else`
- Logische Operatoren: `&&`, `||`
- Vergleiche: `==`, `!=`, `>`, `<`
- Negation: `!` / `not`
- Verschachtelte Bedingungen (if im if)
- `if` + `each` Kombination
- Inline Ternary: `expr ? a : b`
- Block vs Inline
- Praxis: Empty State, Loading, User-Status

**Module:** `compiler/ir/transformers/expression-transformer.ts` (95.5%) und
`compiler/ir/transformers/control-flow-transformer.ts` (89.5%).

## Tutorial-Aspekt-Coverage

**Tutorial:** `docs/tutorial/09-daten.html` (Conditionals-Subset).

| Aspekt                              | Test                                         |
| ----------------------------------- | -------------------------------------------- |
| if (single condition)               | `tutorial-09-conditionals-aspects` if-Branch |
| if/else                             | if/else-Branch                               |
| Logische && (AND)                   | Logische Operatoren (&&)                     |
| Logische \|\| (OR)                  | Logische Operatoren (\|\|)                   |
| Vergleich `>` / `==` / `!=`         | Vergleiche                                   |
| Verschachtelte if                   | Verschachtelte if                            |
| if + each Filter                    | **`it.todo`** — Tutorial-Limitation          |
| Inline Ternary `? :`                | Inline Ternary (Text + bg-color)             |
| Empty State / Loading / User-Status | Praxis-Patterns                              |

**Tutorial-Coverage:** 11/11 Aspekte adressiert (9 working + 2 todos).

## Tutorial-Limitations (entdeckt 2026-04-25)

- **Variable-Substitution in if-Block-Text:** `Text "$count Punkte"` außerhalb
  eines if-Blocks renderiert `5 Punkte`, innerhalb bleibt es literal
  `$count Punkte`. Vermutlich greift der template-resolver für conditional
  children einen anderen Pfad als für top-level. `it.todo` für
  „Variable-Substitution inside if-block-Text-Property".
- ~~**`if + each` Filter funktioniert nicht**~~ — **gefixt 2026-04-25.**
  `resolveLoopCondition` in `compiler/backends/dom.ts` und
  `compiler/backends/dom/value-resolver.ts` checkt jetzt, ob die Wurzel
  einer `$variable.field` Referenz dem Loop-`itemVar`/`indexVar` entspricht.
  Wenn ja, wird das `$` gestrippt → lokaler JS-Zugriff `task.done`. Sonst
  bleibt es `$get("global.path")`.

## Status

- [x] Schritt 1-3: Tutorial-Audit + Aspekt-Tabelle
- [x] Schritt 4: 18 Verhaltens-Tests + 2 todos
- [x] Schritt 5: Coverage-Audit (Code: expression 95.5%, control-flow 89.5%)
