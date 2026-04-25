# Thema 19: Robustheit / Fuzz

**Status:** abgeschlossen (2026-04-25, Schritt 4 erweitert).

**Ergebnis:** 13 zusätzliche Pipeline-Fuzz-Tests in `fuzz-pipeline.test.ts`
zur bestehenden `fuzz.test.ts` (27 Test-Definitionen → 454 generierte
Tests).

## Scope

**Property:** Der Compiler darf **niemals** crashen — egal welcher Input.

- **Phase A:** Lexer + Validator dürfen nicht throwen (bestehende
  `fuzz.test.ts`)
- **Phase B (neu):** Bei valid-parsten Inputs dürfen IR-Transformation
  und DOM-Generation ebenfalls nicht throwen (`fuzz-pipeline.test.ts`)

## Was war abgedeckt — `fuzz.test.ts`

454 generierte Tests verteilt auf 15 Kategorien:

- Random Token Sequences
- Mutated Valid Inputs
- Number Boundaries (extreme negative/positive, NaN-likes)
- Random Characters
- Deep Nesting
- Property Combinations
- String Edge Cases
- Color Edge Cases (hex 3/4/6/8 + named)
- Lexer Stress
- Pure Random Chaos
- Unicode Chaos
- Random Structure
- Token Definitions
- Component Definitions
- Regression Cases

**Annahme:** Alle Tests prüfen `validate()` und `tokenize()` — die
**parse()→IR→DOM**-Pipeline war NICHT im Test.

## Was war nicht abgedeckt — geschlossen in `fuzz-pipeline.test.ts`

| Kategorie                           | Iterationen | Mechanismus                              |
| ----------------------------------- | ----------- | ---------------------------------------- |
| Random valid elements               | 1000        | Generator: Primitives + Props + Children |
| Random component definitions        | 500         | Generator: `Name: pad N, bg COLOR`       |
| Random token definitions            | 500         | Generator: `name.suffix: VALUE`          |
| Random state-blocks                 | 200         | `Button "X"\n  hover:\n    bg`           |
| Random each-loops                   | 200         | `each x in $list\n  Text x.title`        |
| Random conditionals                 | 200         | `if flag\n  Text "Y"\nelse\n  …`         |
| Deep nesting (20 levels)            | 1           | 20× `  ` indent + Text "leaf"            |
| Very wide (50 siblings)             | 1           | 50× Text-Child                           |
| Long Text content (10000 chars)     | 1           | Single-Line 10kb-String                  |
| Many props on single element        | 1           | 20+ Properties                           |
| Unicode in strings                  | 6           | über/Emoji/中/Arabic/Cyrillic/Combining  |
| Mixed each + if + state             | 1           | Realistische Komposition                 |
| Component + Slots + Tokens + States | 1           | Realistische Komposition                 |

**Total: ~2615 Pipeline-Iterationen pro Test-Lauf.** Alle deterministisch
via `seed`-Reset.

**Property unter Test (Phase B):**

> Wenn `parse(src).errors.length === 0`, dann müssen `toIR(ast)` und
> `generateDOM(ast)` ohne Exception laufen.

Ergebnis dieses Audits: **0 Crashes** in 2615 Iterationen. Die Pipeline
ist robust gegen die generierten Patterns.

## Ergebnis

- [x] Schritt 1-3: Audit der bestehenden `fuzz.test.ts` + Lücken-Liste
- [x] Schritt 4: 13 zusätzliche Pipeline-Fuzz-Tests
- [x] Schritt 5: 0 neue Crashes entdeckt — Pipeline robust
- [x] Schritt 6: 454 + 13 = 467 Fuzz-Tests, ~2615 zusätzliche Iterationen
