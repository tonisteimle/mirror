# Compiler Bulletproof: Themen-Übersicht

Ziel: Den Mirror-Compiler systematisch absichern, Thema für Thema.

## Anspruch: Radikal gute Absicherung pro Thema

**Ein Thema gilt erst dann als abgeschlossen, wenn jeder vernünftige User-Input
entweder korrekt verarbeitet oder mit klarem Error abgewiesen wird — keine
Silent-Failures, keine inkonsistenten Behaviors, keine ungetesteten
Pipeline-Pfade.**

Konkret heißt das pro Thema:

- **Pair-Coverage** für die wichtigsten Property-Achsen (≥ 80% der relevanten
  2-er Kombinationen, nicht nur Pairwise-Sample)
- **Triple-Coverage** für die häufigen Konflikt-Konstellationen (mindestens
  alle Konflikt-Triples, plus Stichprobe der nicht-konfliktären)
- **Eltern-Kind-Interaktionen** für jede strukturelle Property
  (z.B. Layout-System des Parents × Layout-Property des Childs)
- **Kontext-Achsen** für jede Property:
  Container vs. Non-Container, in States, in Inheritance, in Iteration,
  in Conditionals, mit Token-Reference
- **Pathologische Werte**: extreme Zahlen, Negative, Zero, sehr lange
  Strings, Unicode-Edges, malformed Input
- **Tiefe Verschachtelung** mit gemischten Zuständen (4+ Levels)
- **Cross-Schichten-Tests**: nicht nur IR, sondern bis zum finalen DOM-Output
  wo relevant

Jedes Thema-Doc soll explizit auflisten, **was nicht abgedeckt ist** — keine
„abgehakten" Themen mit versteckten Lücken. Ein Thema, das nur bei 30–40%
Coverage hängt, bleibt im Status „Schritt 4 in Arbeit", auch wenn schon Tests
geschrieben wurden.

Zur Erinnerung an mich (Claude): **„Bulletproof"** ist nicht „keine Bugs
gefunden", sondern „aggressiv gesucht und systematisch dokumentiert was
verbleibt". Bei 0 gefundenen Bugs in einem Bereich ist die Frage:
hat die Hypothesen-Liste Lücken? Sind die Tests nur die Standard-Pfade?

## Vorgehen pro Thema

1. **Scope abstecken** — Was gehört zum Thema, was nicht. Granularität: ein Sprach-Feature/Bereich, der typischerweise die ganze Pipeline durchläuft (Lexer → Parser → IR → Backend → Runtime).
2. **Ist-Aufnahme** — Existierende Tests zum Thema durchgehen. Nicht nur Datei-Namen, sondern was tatsächlich an Assertions geprüft wird.
3. **Provokations-Liste** — „Wie kann ich das kaputt machen?" Bug-Hypothesen sammeln, jede als konkreten Test formulieren. Mindestens die Coverage-Kriterien aus „Anspruch" oben durchgehen.
4. **Lücken schließen** — Tests schreiben, gefundene Bugs fixen, in `changelog.md` dokumentieren.
5. **Coverage-Audit** — Bevor abgeschlossen: explizit prüfen, dass die Pair-/Triple-/Kontext-Coverage wirklich erreicht ist. Was nicht, in einer „Was nicht abgedeckt ist"-Sektion festhalten.

**Aufgabenteilung:** Schritte 1–3 + 5 macht Claude eigenständig (Inventar, Analyse, Test-Vorschläge, Audit). Schritt 4 erfolgt in Abstimmung mit dem User (Test-Implementierung, Bug-Fix-Entscheidungen).

## Themen-Liste

Reihenfolge: Pipeline-Basis zuerst, dann Sprach-Features, dann Querschnitt.

| #   | Thema                                                  | Status        | Dokument                                                   |
| --- | ------------------------------------------------------ | ------------- | ---------------------------------------------------------- |
| 1   | Lexer (Tokens, Indentation, Edge-Cases)                | abgeschlossen | [01-lexer.md](01-lexer.md)                                 |
| 2   | Parser (AST, Error-Recovery)                           | abgeschlossen | [02-parser.md](02-parser.md)                               |
| 3   | Properties & Aliases (inkl. „letzter gewinnt")         | abgeschlossen | [03-properties.md](03-properties.md)                       |
| 4   | Layout (flex, grid, stacked, 9-Zone-Alignment)         | abgeschlossen | [04-layout.md](04-layout.md)                               |
| 5   | Komponenten & Vererbung                                | abgeschlossen | [05-komponenten-vererbung.md](05-komponenten-vererbung.md) |
| 6   | Tokens & Property-Sets                                 | abgeschlossen | [06-tokens.md](06-tokens.md)                               |
| 7   | States (System + Custom + Cross-Element + Transitions) | abgeschlossen | [07-states.md](07-states.md)                               |
| 8   | Events & Actions                                       | abgeschlossen | [08-events-actions.md](08-events-actions.md)               |
| 9   | Data-Binding & Iteration (each, where, by)             | offen         | —                                                          |
| 10  | Conditionals & Expressions                             | offen         | —                                                          |
| 11  | Slots                                                  | offen         | —                                                          |
| 12  | DatePicker (einzige verbleibende Zag-Komponente)       | Iter 2 nötig  | [12-datepicker.md](12-datepicker.md)                       |
| 13  | Animationen & Transitions                              | abgeschlossen | [13-animations.md](13-animations.md)                       |
| 14  | Input Mask & Two-way Binding                           | offen         | —                                                          |
| 15  | Tables / Charts                                        | offen         | —                                                          |
| 16  | Canvas / Device Presets / Custom Icons                 | offen         | —                                                          |
| 17  | SourceMap (bidirektional)                              | offen         | —                                                          |
| 18  | Validator                                              | offen         | —                                                          |
| 19  | Robustheit (Whitespace, Strings, Kommentare, Fuzz)     | offen         | —                                                          |
| 20  | Performance / Stress / Skalierbarkeit                  | offen         | —                                                          |
| 21  | React-Backend (NEU — 0% coverage)                      | offen         | —                                                          |
| 22  | DOM-Backend Cross-Cutting (NEU — `dom.ts`, internals)  | offen         | —                                                          |

## Themen-Dokument-Struktur

Jedes Thema bekommt ein eigenes Dokument: `tests/compiler/docs/themen/<nr>-<slug>.md`

Aufbau:

1. **Scope** — Was gehört dazu, was nicht.
2. **Ist-Aufnahme** — Tabelle: Datei → was geprüft, was nicht.
3. **Provokations-Liste** — Tabelle: Hypothese → Erwartung → Status (offen/getestet/Bug).
4. **Test-Plan** — Konkrete neue Tests, gruppiert.
5. **Status** — offen / in Arbeit / abgeschlossen.

## Status-Definitionen

| Status        | Bedeutung                                                   |
| ------------- | ----------------------------------------------------------- |
| offen         | Noch nicht angefangen.                                      |
| Schritt 1–3   | Scope/Ist-Aufnahme/Provokationen dokumentiert.              |
| Schritt 4     | Tests werden geschrieben / Bugs werden gefixt.              |
| abgeschlossen | Alle identifizierten Lücken geschlossen, Bugs dokumentiert. |

## Echte Code-Coverage (Stand: 2026-04-25, post-Zag-Cleanup)

Gemessen mit `npx vitest run tests/compiler/ --coverage` (V8-Provider). Diese
Zahlen ersetzen frühere Bauchgefühl-Schätzungen.

**Gesamt:** 62.95% Lines / 55.81% Branches / 65.63% Functions

Sprung gegenüber Pre-Cleanup (52.5% → 62.95% Lines, **+10.4 pp**) kommt durch
Entfernung von ~12'000 LOC totem Zag-Code (siehe „Zag-Cleanup 2026-04-25"
unten). Die verbleibenden Zag-Files (`zag-parser.ts`, `zag-transformer.ts`,
`zag-runtime.ts` reduziert auf DatePicker, `zag/overlay-emitters.ts`) haben
weiterhin ~0% Coverage — DatePicker-spezifische Tests sind das Thema 12.

### Sehr gut abgedeckt (≥90% Lines)

| Modul                                           | Lines | Branches | Funcs | Thema |
| ----------------------------------------------- | ----- | -------- | ----- | ----- |
| `parser/lexer.ts`                               | 99.7% | 97.8%    | 100%  | 1     |
| `ir/transformers/validation.ts`                 | 100%  | 89.5%    | 100%  | –     |
| `ir/transformers/state-styles-transformer.ts`   | 100%  | –        | 100%  | 7     |
| `ir/transformers/event-transformer.ts`          | 100%  | 100%     | 100%  | 8     |
| `ir/transformers/property-set-expander.ts`      | 100%  | 96%      | 100%  | 6     |
| `ir/transformers/property-utils-transformer.ts` | 97.9% | 93.5%    | 100%  | 3     |
| `ir/transformers/expression-transformer.ts`     | 95.5% | 96.7%    | 100%  | 10    |
| `ir/transformers/layout-transformer.ts`         | 95.8% | 87.8%    | 96.7% | 4     |
| `ir/transformers/chart-transformer.ts`          | 90.4% | 71.3%    | 100%  | 15    |
| `ir/transformers/control-flow-transformer.ts`   | 89.5% | 83.3%    | 100%  | 10    |
| `backends/dom/loop-emitter.ts`                  | 98.2% | 90.9%    | 100%  | 9     |
| `backends/dom/style-emitter.ts`                 | 97.9% | 81.5%    | 100%  | 3     |
| `backends/dom/api-emitter.ts`                   | 94.0% | 83.3%    | 95.2% | –     |
| `backends/dom/chart-emitter.ts`                 | 93.5% | 80.0%    | 100%  | 15    |

### Gut abgedeckt (70–89% Lines)

| Modul                                          | Lines | Branches | Funcs | Thema     |
| ---------------------------------------------- | ----- | -------- | ----- | --------- |
| `parser/parser.ts`                             | 77.3% | 70.9%    | 81.8% | 2         |
| `parser/data-parser.ts`                        | 84.5% | 78.1%    | 89.5% | 9         |
| `ir/index.ts`                                  | 81.3% | 79.0%    | 84.4% | – (multi) |
| `ir/transformers/state-machine-transformer.ts` | 88.7% | 80.2%    | 85.7% | 7         |
| `ir/transformers/state-child-transformer.ts`   | 72.2% | 71.4%    | 100%  | 7         |
| `ir/transformers/property-transformer.ts`      | 79.7% | 78.8%    | 91.7% | 3         |
| `ir/transformers/component-resolver.ts`        | 75.6% | 60.8%    | 100%  | 5         |
| `ir/transformers/style-utils-transformer.ts`   | 85.2% | 75.0%    | 100%  | 3         |
| `ir/transformers/value-resolver.ts`            | 81.9% | 83.3%    | 100%  | 6         |
| `ir/transformers/slot-utils.ts`                | 81.8% | 50.0%    | 80.0% | 11        |
| `backends/dom/node-emitter.ts`                 | 87.8% | 79.6%    | 90.4% | –         |
| `backends/dom/state-machine-emitter.ts`        | 83.2% | 68.9%    | 71.4% | 7         |
| `backends/dom/token-emitter.ts`                | 86.0% | 63.5%    | 68.8% | 6         |
| `backends/dom/utils.ts`                        | 77.8% | 28.6%    | 80.0% | –         |

### Mittelmäßig (50–69% Lines)

| Modul                           | Lines | Branches | Funcs | Thema |
| ------------------------------- | ----- | -------- | ----- | ----- |
| `backends/dom.ts`               | 59.9% | 53.3%    | 66.9% | –     |
| `parser/ast.ts`                 | 60.0% | 60.0%    | 60.0% | 2     |
| `ir/source-map.ts`              | 55.1% | 49.4%    | 60.5% | 17    |
| `ir/transformers/loop-utils.ts` | 52.6% | 64.7%    | 100%  | 9     |

### Kritisch ungeschützt (<50% Lines)

| Modul                                    | Lines    | Thema  | Note                |
| ---------------------------------------- | -------- | ------ | ------------------- |
| `backends/react.ts`                      | **0.0%** | NEU 21 | Komplett ungetestet |
| `backends/dom/zag-emitters.ts`           | **0.0%** | 12     |                     |
| `backends/dom/zag-emitter-context.ts`    | **0.0%** | 12     |                     |
| `backends/dom/template-emitter.ts`       | **0.0%** | 12     |                     |
| `backends/dom/value-resolver.ts`         | **0.0%** | 12     |                     |
| `backends/dom/emitter-context.ts`        | **0.0%** | –      |                     |
| `backends/dom/base-emitter-context.ts`   | **0.0%** | –      |                     |
| `backends/dom/index.ts`                  | 8.3%     | –      |                     |
| `backends/dom/form-emitters.ts`          | 0.1%     | 12     |                     |
| `backends/dom/overlay-emitters.ts`       | 0.2%     | 12     |                     |
| `backends/dom/nav-emitters.ts`           | 0.3%     | 12     |                     |
| `backends/dom/select-emitters.ts`        | 0.4%     | 12     |                     |
| `backends/dom/animation-emitter.ts`      | 2.6%     | 13     |                     |
| `backends/framework.ts`                  | 0.4%     | NEU 21 |                     |
| `parser/animation-parser.ts`             | **1.1%** | 13     |                     |
| `parser/zag-parser.ts`                   | **0.3%** | 12     |                     |
| `parser/parser-context.ts`               | 13.0%    | –      | Internal            |
| `ir/transformers/zag-transformer.ts`     | **0.8%** | 12     |                     |
| `ir/transformers/transformer-context.ts` | **0.0%** | –      | Internal            |
| `ir/transformers/data-transformer.ts`    | 29.7%    | 9      |                     |
| `ir/transformers/inline-extraction.ts`   | 41.9%    | –      | Internal            |
| `backends/dom/event-emitter.ts`          | 43.5%    | 8      |                     |
| `parser/data-types.ts`                   | 33.3%    | 9      |                     |

## Prioritäten und Themen-Anpassung

Die Themen 7–20 müssen **konkrete Coverage-Ziele** pro Modul setzen:

- **Thema 7 (States)**: state-machine-emitter, state-machine-transformer (beide ~85%) → 95%; **state-child-transformer (72%)** → 90%
- **Thema 8 (Events)**: **event-emitter (43.5%)** → 90% — kritische Lücke
- **Thema 9 (Data/Each)**: **loop-utils (52.6%)** → 90%, **data-transformer (29.7%)** → 90%
- **Thema 12 (Zag)**: **alle Zag-Emitters (0–8%)** → 80% — größte Lücke (~3000 Zeilen)
- **Thema 13 (Animationen)**: **animation-parser (1.1%)** → 90%, **animation-emitter (2.6%)** → 90%
- **Thema 17 (SourceMap)**: source-map.ts (55%) → 90%

**Neu hinzugefügt:**

- **Thema 21 (NEU): React-Backend** — 0% Coverage, eigenes Thema notwendig
- **Thema 22 (NEU): DOM-Backend Cross-Cutting** — `backends/dom.ts` (60%) und Backend-Internals (emitter-context, helpers)

## Querschnitts-Phasen (Bullet-Proof-Strategie)

Parallel zu den Themen 1–22 laufen Querschnitts-Phasen, die nicht an einen
einzelnen Bereich gebunden sind, sondern **Test-Methodik** ergänzen:

| Phase | Methode                      | Status        | Notiz                                                                  |
| ----- | ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| 1     | Real Coverage (V8)           | abgeschlossen | `npm test -- --coverage` (siehe Tabellen oben)                         |
| 2     | Property-based (fast-check)  | abgeschlossen | 31 Properties × 1000 Runs für die 5 zentralen IR-Funktionen            |
| 3     | Mutation Testing (Stryker)   | offen         | Misst, ob Tests Mutationen wirklich fangen                             |
| 4     | Differential Testing         | offen         | DOM-Backend ↔ React-Backend (gleiches IR, äquivalentes Output)         |
| 5     | Fuzz-Expansion (Parser/IR)   | offen         | Heutiger `fuzz.test.ts` ist klein — auf alle Pipeline-Stufen erweitern |
| 6     | Visual Regression            | offen         | Pixel-Diff für Demo-Outputs                                            |
| 7     | Integration-Tests (Pipeline) | offen         | End-to-end: `.mir` → DOM → gerendert → Snapshot                        |

**Phase 2 (abgeschlossen, 2026-04-25):**

- **31 Property-Tests** in `tests/compiler/properties-property-based.test.ts`
- **31'000 zufällige Inputs** pro Lauf (1000 Runs × 31 Properties)
- **Funktionen unter Test:** `mergeProperties`, `formatCSSValue`,
  `schemaPropertyToCSS`, `expandPropertySets`, `generateLayoutStyles`
- **Ergebnis:** Keine neuen Bugs entdeckt — die Funktionen halten ihre
  Invarianten unter Random-Stress. Quantitative Bestätigung der Robustheit
  der Themen 1–6.

## Zag-Cleanup (2026-04-25)

Vor Beginn von Thema 12 entdeckt: das ursprüngliche Thema 12 („Zag-Komponenten")
existierte schon nicht mehr — nur DatePicker bleibt als Zag-Komponente, alle
anderen sind Pure-Mirror-Templates (`studio/panels/components/component-templates.ts`).
Das alte Zag-Code lebte als toter Code im Repo. Cleanup-Aktion:

| Schritt | Was                                                   | LOC    | Commit    |
| ------- | ----------------------------------------------------- | ------ | --------- |
| 3a/b    | Emitter (form/nav/select gelöscht, overlay reduziert) | -2'982 | `e528237` |
| 3c      | zag-runtime.ts auf DatePicker reduziert               | -8'672 | `6592afc` |
| 3e      | zag-prop-metadata.ts auf DatePicker reduziert         | -1'323 | `d6f7d11` |
| 4       | 8 ungenutzte `@zag-js/*` deps entfernt                | (deps) | `e9ad76e` |

**Total: ~12'977 LOC tot entfernt, 8 npm-deps weg.**

DatePicker-Compile-Output schrumpft von 12'443 → 3'823 LOC (~70% kleiner).
Coverage-Sprung global: 52.5% → 62.95% Lines (+10.4 pp), weil die
0%-Coverage-Module aus der Total-Average entfernt wurden.

Bewusst **nicht** angefasst: `compiler/parser/zag-parser.ts` (1065 LOC),
`compiler/ir/transformers/zag-transformer.ts` (587 LOC), `compiler/compiler/zag/*`
(765 LOC). Diese sind durch das `isZagPrimitive()`-Gate jetzt nur noch für
DatePicker aktiv; die nicht-DatePicker-Pfade sind technisch tot, bringen aber
keinen User-Bundle-Gewinn (Parser läuft nicht im Output) und Reduktion hätte
hohes Bruchrisiko. Ggf. später, wenn Coverage-Audit zeigt, dass es lohnt.
