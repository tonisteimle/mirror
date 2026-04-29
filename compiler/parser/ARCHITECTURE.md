# Parser Architecture

**Stand:** 2026-04-29
**Zweck:** Karte des `parser.ts`-Monolithen (5585 LOC) als Vorbereitung für inkrementelles Refactoring (Phase 5 des Cleanup-Plans). Kein Refactoring-Code — nur Topographie.

---

## 1. High-Level

`Parser` (Z. 1–5585) ist eine einzige Klasse mit ~50 Methoden. Hauptbereiche:

| Bereich                           | Zeilen        | LOC     |
| --------------------------------- | ------------- | ------- |
| `parse()` Top-Level-Loop          | 238–541       | ~300    |
| Token-Definitionen (3 Varianten)  | 606–756       | ~150    |
| Data-Objects + -Attributes        | 992–1414      | ~420    |
| Property-Set-Definitionen         | 1428–1496     | ~70     |
| Component-/Instance-Definitionen  | 1579–1873     | ~300    |
| Zag- + Animation-Wrappers         | 1907–1988     | ~80     |
| `parseComponentBody` (Block-Body) | **2107–2785** | **679** |
| `parseInstanceBody` (Block-Body)  | **2787–3252** | **470** |
| `parseInlineProperties`           | 3374–3754     | 380     |
| `parseProperty` (inkl. Ternary)   | 3818–4200+    | 400+    |
| Helpers, Lookaheads, Recovery     | restlich      | ~2300   |

**Interner State** (Klasse-Felder): `pos` (Token-Position), `tokens`, `source`, `errors`, `loopVariables: Set<string>` (Kontext für `each`), `nodeIdCounter`.

**Vorbild**: `compiler/parser/zag-parser.ts` (547 LOC) und `animation-parser.ts` (269 LOC) **sind bereits extrahiert** — via `ParserContext` + Callbacks-Interface, ohne shared state. Das Muster funktioniert.

---

## 2. Methoden-Inventar (gruppiert)

### A. Lexer-Lookahead (low-level)

`checkAt`, `peekAt`, `advance`, `previous`, `isAtEnd`, `hasColonOnLine`, `hasInlineChildSyntax` — alle direkt auf `pos`/`tokens`. **Würden zu jedem Sub-Parser via Context durchgereicht.**

### B. Token-Definition-Parsing (3 Varianten — siehe §3)

`parseTokenDefinition` (606), `parseTokenWithSuffixSingleToken` (629), `parseTokenWithSuffix` (665), `parseLegacyTokenDefinition` (741), `parseTokenReference` (708). Plus Helpers `parseTokenValue`, `inferTokenType` (1515).

### C. Data-Parsing

`parseDataObject` (992), `parseDataAttribute` (1088, recursive), `parseDataArray`/`parseNumericArray` (1230), `parseDataReference` (1292), `parseDataBlock` (1317).

### D. Component/Instance-Definitionen

`parseComponentDefinition` (1579), `parseComponentInheritance` (1629), `parseComponentDefinitionWithDefaultPrimitive` (1679), `parseInstance` (1728).

### E. Block-Body-Parsing (das Herz)

`parseComponentBody` (2107, 679 LOC), `parseInstanceBody` (2787, 470 LOC). **Quasi-Duplikate**: ~95 % Überlappung, Unterschiede nur in Each-Loops, Selection-Binding, Chart-Slots, externe State-Refs.

### F. Property-Parsing

`parseInlineProperties` (3374, 380 LOC), `parseProperty` (3818, 400+ LOC inkl. Ternary), Helpers `parseDataBindingValues`, `parseWhenClause`, `collectExpressionOperand`, `parseInlineChildren` (3285).

### G. State-Block-Erkennung

`isStateBlockStart` (5250–5388, ~140 LOC) — der Lookahead-König. Erkennt 10+ Muster: System-States, Behavior-States, Triggers, Modifiers, externe State-Refs, when-Dependencies, Animation-Configs.

### H. Bereits extrahiert (Vorbilder)

Wrapper-Methoden in der Hauptklasse delegieren an `zag-parser.ts` (1907) und `animation-parser.ts` (1975) via `ParserContext` + Callbacks. **Modell für alle weiteren Extraktionen.**

---

## 3. Die drei Token-Parser-Varianten — Diagnose

| Methode                           | Zeilen  | Trigger                                                   | Macht                                                        |
| --------------------------------- | ------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| `parseTokenWithSuffixSingleToken` | 629–661 | Lexer emittiert `primary.bg` als **ein** IDENTIFIER-Token | extrahiert Suffix nach `.`, infert Typ, gibt TokenDefinition |
| `parseTokenWithSuffix`            | 665–703 | Lexer emittiert `primary . bg` als **drei** Tokens        | dasselbe wie oben, nur andere Token-Form                     |
| `parseLegacyTokenDefinition`      | 741–756 | Echte alte Syntax: `name: type = value`                   | Andere DSL-Form (assign-style)                               |

**Befund:**

- Variante 1 und 2 sind **inhaltlich gleich** (~95 % Code-Duplikat) — nur Eingabe-Token-Form unterscheidet.
- `parseLegacyTokenDefinition` ist **echt anders** — andere Syntax — der Name "Legacy" ist berechtigt.

**Refactor-Chance:** 1+2 zusammenlegen mit Branch auf Lexer-Variante. 3 separat behalten oder deprecaten + entfernen wenn DSL-Audit zeigt dass die alte Syntax nicht mehr in echten `.mirror`-Files vorkommt.

---

## 4. Schnittkandidaten

### Option A — TokenParser (Low Risk, Quick Win) ⭐

**Inhalt:** §B oben (Token-Definition-Cluster, ~150 LOC).
**Public API:** `parseTokenDefinition(ctx)`, `parseTokenWithSuffix(ctx, lexerVariant)`, `parseTokenReference(ctx)`.
**State-Sharing:** nur `pos` via Context — kein loopVariables, kein nodeIdCounter.
**Hub-Risiko:** `parseTokenValue` wird auch von Data-Parser genutzt — entweder beide migrieren oder Helper als shared utility.
**Aufwand:** 2–3h.

### Option B — DataParser (Medium Risk)

**Inhalt:** §C oben (~420 LOC).
**Public API:** `parseDataObject(ctx)`, `parseDataAttribute(ctx)`.
**State-Sharing:** nur `pos`. Aber `parseDataAttribute` ist recursive — ParserContext-Stack muss handhaben.
**Hub-Risiko:** `checkIsIdentifierOrKeyword` / `advanceIdentifierOrKeyword` werden auch anderswo gebraucht (für reserved keywords wie `desc`).
**Aufwand:** 3–4h.

### Option C — StateDetector (Low Risk, hoher Hebel) ⭐

**Inhalt:** `isStateBlockStart` (~140 LOC standalone Lookahead-Logik) + State-Pattern-Helpers.
**Public API:** `isStateBlockStart(ctx)`, `classifyStatePattern(ctx)`.
**State-Sharing:** read-only auf `tokens`/`pos`, mutiert nichts.
**Aufwand:** 1–2h.
**Hebel:** macht beide Body-Parser deutlich lesbarer.

### Option D — TernaryExpressionParser (Low–Medium Risk)

**Inhalt:** ~150 LOC aus `parseProperty` (Z. 3845–3995). Bug-anfällige Logik (Bug-#23-Fix Comparison-Ops, Bug-#26-Fix Re-Quoting).
**Public API:** `parseTernaryExpression(ctx)`.
**Aufwand:** 2–3h.
**Hebel:** vereinfacht `parseProperty` um ~35 %.

### Option E — PropertyParser (High Risk)

**Inhalt:** §F (~800 LOC, `parseInlineProperties` + `parseProperty`).
**State-Sharing:** **kritisch** — braucht `loopVariables` (sonst wird `user.name` als Token-Ref statt Loop-Var behandelt).
**Voraussetzung:** Option D vorher (Ternary raus) und ggf. C (StateDetector raus).
**Aufwand:** 6–8h.

### Option F — BodyParser (High Risk, höchster Hebel)

**Inhalt:** §E zusammengelegt (~1150 LOC → ~850 LOC nach Dedup).
**Strategie:** `parseBodyCore(ctx, kind: 'component' | 'instance')` mit Branching für die ~5 % Unterschiede.
**Voraussetzung:** D, E müssen vorher raus, sonst wird das Monster nur verschoben.
**Aufwand:** 8–10h.
**Hebel:** ~300 LOC Duplikat eliminiert, jeder zukünftige Bug-Fix nur an einer Stelle.

---

## 5. Fallen und Warnungen

### F1 — Zirkuläre Aufrufe

`parseInstance` ↔ `parseComponentBody` ↔ `parseInstanceBody` rufen sich gegenseitig auf (für nested Children). Naive Extraktion eines Teils zieht den Rest mit. Lösung: **Callbacks-Interface** wie bei `zag-parser.ts`.

### F2 — `loopVariables` als versteckter Kontext

Wird von `parseEach` mutiert, von `parseInlineProperties` (Z. 3629) gelesen, um Loop-Vars von Property-Refs zu unterscheiden. Muss explizit durch ParserContext.

### F3 — `parseInstanceBody` ≈ `parseComponentBody`

~95 % Überlappung. **Jeder Bug-Fix muss heute zweimal eingepflegt werden.** Hauptmotiv für Option F.

### F4 — `isStateBlockStart` ist 140 LOC reines Pattern-Matching

Verteilt sind State-Erkennungs-Calls in mindestens 6 weiteren Stellen (Z. 2193, 2318, 2391, 2534, 2986, 3102). Konsolidierung in StateDetector zahlt sich vielfach aus.

### F5 — `parseProperty` ist 4-in-1

Ternary + Operator-Collection + Loop-Var-Auflösung + Token-Refs. Zerlegung erhöht Testbarkeit drastisch.

### F6 — Drei Token-Parser-Varianten

Code-Duplikat zwischen Variante 1 und 2 (~95 %), aber **nicht zusammenlegbar ohne Lexer-Verständnis** — der Lexer entscheidet, welche Form ankommt. Sub-Klärung: kann der Lexer das vereinheitlichen? Wenn ja, würde eine Variante ausreichen.

---

## 6. Empfohlene Reihenfolge

| #   | Schnitt                       | LOC | Aufwand | Risiko   | Begründung                                  |
| --- | ----------------------------- | --- | ------- | -------- | ------------------------------------------- |
| 1   | **TokenParser**               | 150 | 2–3h    | Low      | Vorbild-Lauf der Methodik, niedriges Risiko |
| 2   | **StateDetector**             | 140 | 1–2h    | Low      | Vereinfacht beide Body-Parser für später    |
| 3   | **TernaryExpressionParser**   | 150 | 2–3h    | Low–Med  | Vereinfacht `parseProperty` um 35 %         |
| 4   | **DataParser**                | 420 | 3–4h    | Med      | Eigenständig, nur recursion auflösen        |
| 5   | **PropertyParser**            | 800 | 6–8h    | Med–High | `loopVariables`-Kontext sauber lösen        |
| 6   | **BodyParser** (consolidated) | 850 | 8–10h   | High     | Größter Hebel, größtes Risiko — zuletzt     |

**Gesamt:** ~2.500 LOC in eigenständige Module, ~22–30h Aufwand. Hauptklasse schrumpft von 5585 auf ~3000 LOC.

**Wichtig:** Reihenfolge ist nicht optional. Schritte 5 und 6 setzen 2 und 3 voraus, sonst wird Komplexität nur verschoben.

---

## 7. Bewusst NICHT in dieser Notiz

- Konkrete Code-Vorschläge (Schnittstellen-Designs etc.) — kommen erst pro Iteration
- Performance-Bewertungen — nicht Refactoring-Ziel
- Tests-Strategie — separat, vor jedem Refactor: Coverage maximieren
- Lexer-Refactoring — möglicherweise impliziert von §6 F6, aber separates Thema

---

## 8. Voraussetzungen vor der ersten Extraktion

| #   | Voraussetzung                                           | Status                                                    |
| --- | ------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Test-Coverage `compiler/parser/parser.ts` ≥ 80 %        | ✅ **82.3 % Lines / 94.94 % Funcs** (gemessen 2026-04-29) |
| 2   | Coverage des gesamten `compiler/parser/`-Verzeichnisses | ✅ 83.88 % Lines / 95.18 % Funcs                          |
| 3   | Pre-Commit-Snapshot der Test-Suite                      | ✅ 10857 Tests grün                                       |
| 4   | Definition-of-Done pro Extraktion                       | siehe `compiler/CLEANUP.md`                               |

**Coverage-Lücken (nicht Blocker, aber gut zu wissen):**

- `parser-context.ts` 69.56 % — Context-Utilities, weniger kritisch
- `zag-parser.ts` 69.69 % — bereits extrahiertes Modul; bei Anpassungen im Rahmen von Phase 5 ggf. mitziehen
- `parser.ts` Uncovered-Hotspots: Z. ~5553, 5564–5570 (Error-Recovery / Edge-Cases)

**→ Phase 5 kann starten. Erster Schritt: Option A (TokenParser).**
