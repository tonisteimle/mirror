# Session-Handoff — Compiler-Cleanup

**Datum:** 2026-04-29
**Branch:** `main`
**Letzter Commit dieser Session:** `e6d37beb` — Phase 5 Iter 5b (parseInlineProperties)
**Tests-Stand:** 10857 grün, 71 skipped, 3 todo (370 Test-Files)

Diese Datei dokumentiert die laufende Mirror-Compiler-Sanierung, damit jede zukünftige Session sofort einsteigen kann.

---

## 1. Was diese Session geliefert hat

| Kategorie                | Wert                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| Commits                  | 15                                                                           |
| Toter Code gelöscht      | ~10.000 LOC                                                                  |
| Aus parser.ts extrahiert | ~1.542 LOC in 6 saubere Sub-Module                                           |
| Neu erstellte Dokumente  | `CLEANUP.md`, `INVENTORY.md`, `parser/ARCHITECTURE.md`, `SESSION-HANDOFF.md` |
| Tests                    | 10857 grün durchgehend, kein einziger Bug eingeführt                         |
| Bugs nebenbei gefixt     | 2 (advance EOF, broken package.json scripts)                                 |

## 2. Commits in Reihenfolge

| Commit     | Phase      | Beschreibung                                                           |
| ---------- | ---------- | ---------------------------------------------------------------------- |
| `160723e6` | 1          | chore(compiler): Phase 1 cleanup — drop ~5800 LOC of dead code         |
| `80cf3732` | 2          | test(validator): close coverage gaps + fix broken package.json scripts |
| `d5cb0c1a` | 3 Iter 1   | drop dead CoordinateTransformer (-374 LOC)                             |
| `1ade5914` | 3 Iter 2+3 | drop dead SpatialCache + ZIndexManager (-374 LOC)                      |
| `a8a11f2d` | 3 Iter 4   | drop dead ComponentIconMatcher (-960 LOC)                              |
| `b9653c93` | 3 Iter 5   | drop dead SelectionManager (-727 LOC)                                  |
| `70d9e58c` | 3 Iter 6   | drop dead SmartSizingService (-152 LOC)                                |
| `9f905e77` | 3 wrap     | docs(compiler): mark Phase 3 done in CLEANUP.md                        |
| `c623af73` | 5 prep     | docs(parser): add ARCHITECTURE.md                                      |
| `780f40bd` | 5 prep     | docs(parser): record coverage baseline (82.3% lines, 94.94% funcs)     |
| `178897a0` | 5 Iter 1   | extract TokenParser (-178 LOC + EOF-bug fix in shared advance)         |
| `f6e4a337` | 5 Iter 2   | extract StateDetector (-137 LOC)                                       |
| `ef610bf9` | 5 Iter 3   | extract TernaryExpressionParser (-158 LOC)                             |
| `b5f50f7d` | 5 Iter 4   | extract DataObjectParser (-449 LOC)                                    |
| `2e7d4246` | 5 Iter 5a  | extract PropertyParser (parseProperty, -246 LOC)                       |
| `e6d37beb` | 5 Iter 5b  | extract InlinePropertyParser (parseInlineProperties, -374 LOC)         |

## 3. Aktueller Stand des `compiler/`-Verzeichnisses

**Vor Session:** 14 Sub-Verzeichnisse (7 davon undokumentiert), 5585-LOC parser.ts, ~50 KB toter V2-Cluster, 10 iCloud-Doubletten.

**Nach Session:**

| Verzeichnis            | Status                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parser/`              | parser.ts ~4043 LOC + 9 Sub-Module                                                                                                                    |
| `ir/`                  | unverändert (war schon sauber)                                                                                                                        |
| `backends/`            | unverändert (war schon sauber)                                                                                                                        |
| `runtime/`             | unverändert                                                                                                                                           |
| `validator/`           | unverändert (Tests gibt's, Coverage gemessen 77 % Lines / 83 % Funcs)                                                                                 |
| `schema/`              | unverändert                                                                                                                                           |
| `studio/`              | aufgeräumt — 6 dead modules gelöscht (CoordinateTransformer, SpatialCache, ZIndexManager, ComponentIconMatcher, SelectionManager, SmartSizingService) |
| `testing/`             | aufgeräumt — iCloud-Doubletten weg                                                                                                                    |
| `utils/`               | unverändert                                                                                                                                           |
| `llm/`                 | unverändert (aktiv als Build-Asset)                                                                                                                   |
| `prelude/`             | unverändert                                                                                                                                           |
| `compiler/compiler/`   | **gelöscht** (war redundant mit `ir/transformers/zag-transformer.ts`)                                                                                 |
| `compiler/converters/` | **gelöscht** (war nur für totes llm-integration)                                                                                                      |
| `compiler/quality/`    | **gelöscht** (Standalone-CLI ohne Aufrufer)                                                                                                           |

### Sub-Module von `compiler/parser/` (vorher 4, jetzt 9)

| Modul                           | LOC                                         | Public API                                                                      |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| `parser.ts`                     | ~4043                                       | `Parser`-Klasse, Hauptorchestrator                                              |
| `ast.ts`                        | (unverändert)                               | AST-Typen                                                                       |
| `lexer.ts`                      | (unverändert)                               | Tokenizer                                                                       |
| `data-parser.ts`                | (unverändert)                               | `.data`-File-Parser (≠ data-object-parser.ts!)                                  |
| `parser-context.ts`             | erweitert                                   | `ParserContext`, `ParserUtils`, `KEYWORD_TOKEN_TYPES` (NEU), `MAX_*` Konstanten |
| `zag-parser.ts`                 | (unverändert, vor Session schon extrahiert) | `parseZagComponent`, Vorbild für Iter 1-6                                       |
| `animation-parser.ts`           | (unverändert, vor Session schon extrahiert) | `parseAnimationDefinition`                                                      |
| **`token-parser.ts`**           | 213                                         | 5 Token-Definition-Varianten + `parseTokenValue`, `inferTokenType`              |
| **`state-detector.ts`**         | 149                                         | `isStateBlockStart` (read-only Lookahead)                                       |
| **`ternary-parser.ts`**         | 234                                         | `parseTernaryExpression` (mit Bug-#23-#26-Fixes)                                |
| **`data-object-parser.ts`**     | 376                                         | `parseDataObject` + interne Helpers                                             |
| **`property-parser.ts`**        | 332                                         | `parseProperty`                                                                 |
| **`inline-property-parser.ts`** | 452                                         | `parseInlineProperties` + `InlinePropertiesCallbacks`-Interface                 |

## 4. Wichtige Design-Entscheidungen

### Pattern für Sub-Parser-Extraktion (etabliert in Iter 1, durchgehalten)

1. **Sub-Parser-Funktionen sind pure Module-Level-Funktionen**, kein Klassenstaat.
2. Sie nehmen `ParserContext` als ersten Parameter und mutieren `ctx.pos` via `ParserUtils.advance(ctx)`.
3. **Wenn keine Callbacks nötig** (Sub-Parser ist Leaf): Direkt importieren und aus dem Wrapper aufrufen.
4. **Wenn Callbacks nötig** (Sub-Parser ruft noch in parser.ts wohnende Methoden auf): zag-parser-Pattern — Callbacks-Interface, Wrapper baut Closures mit `pos`-Sync.
5. **Wrapper-Helper im Hauptparser:** `withSubParserContext<T>(fn: (ctx: ParserContext) => T): T` baut Context, ruft fn, syncht `pos` + `errors` zurück.

### Shared-State-Behandlung

- **`pos`, `tokens`, `source`, `errors`, `loopVariables`** alle über `ParserContext` weitergereicht.
- `loopVariables` bleibt **read-only** in Sub-Parsern — nur `parseEach` (in parser.ts) mutiert sie.
- **`KEYWORD_TOKEN_TYPES`** in Iter 4 von Parser-static nach `parser-context.ts` verschoben (war von 2 Cluster-Methoden geteilt).

### Was bewusst NICHT extrahiert wurde

- **`parseNumericArray`** bleibt in parser.ts — wird via `ZagParserCallbacks` aufgerufen, Extraktion würde Callback-Signatur ändern.
- **Helper-Methoden (`collectExpressionOperand`, `parseRoutePath`, `parseDataBindingValues`, etc.)** bleiben in parser.ts — werden vom inline-property-parser via Callbacks aufgerufen. Eigene Iterationen wert, später.

## 5. Bugs unterwegs gefixt

### Bug 1: `ParserUtils.advance` lief pos über EOF

- **Datei:** `compiler/parser/parser-context.ts`
- **Symptom:** Bei malformed Input wie `parse('primary: color =')` (legacy syntax mit fehlendem Wert) crashte ein Caller von `current()` mit `Cannot read properties of undefined (reading 'type')`.
- **Ursache:** `ParserUtils.advance` inkrementierte pos solange `pos < tokens.length`, ignorierte aber EOF-Token. `parser.ts:advance` behandelt EOF als Wand.
- **Fix:** `advance` ruft jetzt `isAtEnd(ctx)` und stoppt dort. Bestehender Code (zag-parser, animation-parser) profitiert auch.
- **Commit:** in `178897a0` (Phase 5 Iter 1)

### Bug 2: 3 broken Scripts in `package.json`

- **Datei:** `package.json`
- **Symptom:** `npm run validate`, `npm run dev`, `npm run dev:studio` zeigten alle auf nicht-existentes `src/...` (statt `compiler/...`). Würde beim Aufruf failen.
- **Fix:** Pfade korrigiert.
- **Commit:** in `80cf3732` (Phase 2)

## 6. Was in einer Datei steckt aber nicht eingesetzt wird (wichtig)

### `compiler/validator/validator.ts:121` — `checkUnusedDefinitions()` deaktiviert

- Funktion existiert (~30 LOC, Lines 798-832) aber Aufruf auskommentiert mit Kommentar "DISABLED: Unused definitions are allowed".
- Erzeugt UNUSED_TOKEN (W501) und UNUSED_COMPONENT (W503) Warnings — die nie feuern.
- **Entscheidung offen:** Code löschen + Error-Codes entfernen, oder Funktion wieder aktivieren.

### `validator.ts:740-748` — `INVALID_TARGET` (E301) effektiv unerreichbar

- Code-Pfad existiert, aber Parser populiert `action.target` nicht für beliebige Identifier.
- Existierender Test (`validator-error-codes-completeness.test.ts:99`) ist Tautologie (`expect(x || !x || x).toBe(true)`).
- **Entscheidung offen:** Action-Parsing fixen, oder Code löschen.

## 7. Was als Nächstes ansteht

### Phase 5 Iter 6 — BodyParser (consolidated)

**Das ist der große Brocken.** Architektur-Notiz: `compiler/parser/ARCHITECTURE.md` §4 Option F.

**Was zu tun ist:**

- `parseComponentBody` (679 LOC, ~Z. 877 in parser.ts) und `parseInstanceBody` (470 LOC, ~Z. 1556 in parser.ts) sind ~95 % Code-Duplikat.
- Zusammenlegen als `parseBodyCore(ctx, kind: 'component' | 'instance', ...)` mit Branching für die ~5 % Unterschiede:
  - `parseInstanceBody` hat extra: Each-Loops, Selection-Binding, Chart-Slots, externe State-Refs
  - `parseComponentBody` hat extra: keine — ist Subset
- Dedup spart ~300 LOC und macht jeden zukünftigen Bug-Fix nur einmal nötig.

**Warum riskant:**

- 1149 LOC zusammen — größer als jede bisherige Iteration
- Beide rufen 15+ andere parser.ts-Methoden auf → viele Callbacks nötig
- `parseInstance` ↔ Body-Parser ↔ `parseInstance` rekursiv — Pfade sorgfältig abbilden
- Verteilte 5%-Unterschiede statt klar lokalisierte
- **Erste Iteration mit echter Debugging-Wahrscheinlichkeit** — nicht mehr "grün auf ersten Versuch" wie Iter 1-5b.

**Geschätzter Aufwand:** 6-10h fokussiert, mehrere Test-Runden, mindestens ein "ups, das war übersehen"-Moment einplanen.

**Voraussetzungen alle erfüllt:**

- ✅ Coverage 82.3 % auf parser.ts (Sicherheitsnetz)
- ✅ Iters 2 (StateDetector) + 3 (Ternary) + 5a (Property) + 5b (InlineProperty) sind drin (Vorbedingung laut ARCHITECTURE.md)
- ✅ Pattern bewährt durch 6 Iterationen
- ✅ Architektur-Notiz vorhanden

## 8. Wie eine neue Session loslegen kann

1. **Status checken:**

   ```bash
   cd "/Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror"
   git log --oneline -16   # alle Session-Commits sehen
   npm test 2>&1 | tail -8 # 10857 grün erwarten
   ```

2. **Karte lesen:** `compiler/parser/ARCHITECTURE.md` (Schnittkandidaten + Reihenfolge) und diese Datei.

3. **Direkt starten mit Iter 6:** Pattern aus Iter 5b (InlinePropertyParser) ist die beste Vorlage — nutzt Callbacks, hat viele Branches, ist gut benannt.

4. **Wenn Iter 6 zu groß scheint:** alternativ einen kleineren Cleanup machen — z.B. die in §6 erwähnten "deaktivierten Code"-Stellen finalisieren, oder weitere Helpers (parseEvent, parseRoutePath, parseDataBindingValues) als eigene Iterationen extrahieren.

## 9. Was diese Session NICHT angefasst hat

- `studio/` (Studio Runtime) — separates Cleanup-Vorhaben, nie begonnen
- `tools/` — keine Änderungen
- `tests/SKIPPED-TESTS.md` und der große Snapshot-File `tutorial-snapshots.test.ts.snap` — pre-existierende Modifikationen im Working Tree (nicht von dieser Session)
- iCloud-Doubletten **außerhalb** von `compiler/` (haufenweise im repo-root unter `* 2.md`, `* 2.ts` etc.) — separates Cleanup
- `audit/00-setup/rubric.md` — Artefakt aus erstem (verworfenen) Audit-Framework-Versuch, untracked, kann gelöscht werden

## 10. Working-Tree-Stand am Session-Ende

`git status` zeigt:

- Pre-existierende Modifikationen in `studio/*` und einigen `tests/*` (nicht von dieser Session)
- Untracked: viele iCloud-Doubletten im Repo-Root (wie zu Session-Beginn)
- Untracked: `audit/` (Rubrik aus dem ersten Audit-Versuch, kann weg)

Alle Session-Änderungen sind sauber committed in der Liste in §2.
