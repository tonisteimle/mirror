# Thema 22: DOM-Backend Cross-Cutting

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 12 zusätzliche Cross-Cutting-Tests in
`backend-dom-cross-cutting.test.ts`.

## Scope

`compiler/backends/dom.ts` (~2094 LOC, 60% Coverage) ist der Orchestrator
für alle Sub-Emitters. Die einzelnen Features sind exzellent abgedeckt
(siehe `backend-dom.test.ts`, `backend-html-dom-output.test.ts`), aber
**Cross-Cutting-Pfade** waren Lücke:

- `dataFiles`-Option (extern geladene `.data`-Files)
- Empty / Whitespace-only / Comment-only Programs
- Mehrere Features kombiniert (each + conditional + token + state)
- Output-Format-Stabilität (gültiges JS, deterministisch)

## Was ist abgedeckt — `backend-dom.test.ts` + `backend-html-dom-output.test.ts`

Vorhandene Test-Files:

| Datei                             | Tests | Fokus                                                                                                                                     |
| --------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-dom.test.ts`             | ~80   | Pro Feature: Layout, Tokens, States, Each, Conditionals, Slots, Click-Outside                                                             |
| `backend-dom-javascript.test.ts`  | ~50   | JS-Integration (Named Instances, Events)                                                                                                  |
| `backend-html-dom-output.test.ts` | ~250  | HTML/CSS-Output-Snapshots: Structure, Properties, Layout, Pair-Combinations, 9-Zone, Inheritance, Each, Conditionals, Slots, Aliases, ... |
| `stress-dom-generation.test.ts`   | 7     | Performance-Budgets (Thema 20)                                                                                                            |

## Was war nicht abgedeckt — geschlossen in `backend-dom-cross-cutting.test.ts`

| Bereich                                             | Tests |
| --------------------------------------------------- | ----- |
| `dataFiles`-Option (default + empty + entry)        | 3     |
| Empty/Whitespace/Comment-only inputs                | 3     |
| Combined: each + conditional + token + state        | 1     |
| Combined: component + slots + tokens + nested       | 1     |
| Combined: chart + table + state                     | 1     |
| Output-Format: valid JS (Function-constructor test) | 1     |
| Output-Format: createUI signature                   | 1     |
| Output-Format: deterministic across calls           | 1     |

**Wichtigster Test: Determinismus.** Wenn der Compiler bei gleichem Input
unterschiedliche Outputs erzeugt, bricht das Snapshot-Tests, Caching und
Reproduzierbarkeit. Test fängt Regressionen wie "uuid in output" oder
"timestamp in output" frühzeitig.

## Status

- [x] Schritt 1-3: Audit + Lücken-Liste
- [x] Schritt 4: 12 Cross-Cutting-Tests
- [x] Schritt 5: dataFiles-Option, Empty-Inputs, Combined-Features abgedeckt
- [x] Schritt 6: Determinismus + Output-Format-Stabilität verifiziert
