# Thema 20: Performance / Stress / Skalierbarkeit

**Status:** abgeschlossen (2026-04-25, Schritt 4 erweitert).

**Ergebnis:** 35 Stress-Tests in `stress-performance.test.ts` (existierend) +
7 zusätzliche DOM-Generation-Stress-Tests in `stress-dom-generation.test.ts`.

## Scope

Performance-Budgets als **Regression-Detector**: kein Test soll
"alles geht schnell" beweisen, sondern frühe Warnung geben, wenn ein
Refactor Compile-Time signifikant verschlechtert.

## Was war abgedeckt

`tests/compiler/stress-performance.test.ts` (35 Tests):

- **Large Files - Components** (100, 500 Components)
- **Large Files - Instances** (100, 500 Top-Level + 200, 500 Siblings)
- **Large Files - Tokens** (100, 500 Tokens)
- **Deep Nesting** (10, 20, 50 Levels)
- **Multi-File** (5 Tokens, 10 Components, gemischt)
- **Name Conflicts** (Definition-Reihenfolge)
- **Combined** (große realistische Files)

**Performance-Budgets** (existierend, nur Parser + IR):

| Operation                                   | Budget  |
| ------------------------------------------- | ------- |
| Parse 100 components                        | < 50ms  |
| Parse 500 instances                         | < 100ms |
| Parse 50 levels deep                        | < 20ms  |
| Full IR (50 tokens, 50 comps, 100 children) | < 100ms |
| Large realistic doc (parse + IR)            | < 200ms |

## Was war nicht abgedeckt — geschlossen in `stress-dom-generation.test.ts`

DOM-Generation hat eigenes Performance-Budget benötigt, weil sie der
schwergewichtigste Pipeline-Schritt ist (String-Builder, viele Lookups).

| Operation                                          | Budget     |
| -------------------------------------------------- | ---------- |
| DOM 200 instances                                  | < 200ms    |
| DOM 500 instances                                  | < 400ms    |
| DOM 50 levels deep                                 | < 100ms    |
| DOM mixed (100 tokens + 100 comps + 100 instances) | < 500ms    |
| Full pipeline (parse + IR + DOM, 50/50/200)        | < 800ms    |
| each-loop mit 100 Entries → DOM                    | < 200ms    |
| **Linearität:** 200 vs 100 instances               | Ratio < 4x |

**Linearitäts-Test** ist die wichtigste Erweiterung — fängt
Regressions-Klassen wie "O(n²) im DOM-Emitter" frühzeitig.

## Status

- [x] Schritt 1-3: Audit der bestehenden `stress-performance.test.ts`
- [x] Schritt 4: 7 zusätzliche DOM-Stress-Tests
- [x] Schritt 5: 35 + 7 = 42 Stress/Perf-Tests, alle bestehen
- [x] Schritt 6: Pipeline-Coverage komplett (Parser + IR + DOM Budget-getestet)
