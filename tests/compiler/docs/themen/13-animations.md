# Thema 13: Animationen (Custom)

**Status:** abgeschlossen (2026-04-25, nach Iteration 2).

**Ergebnis:** **1 echter Bug gefixt** (Custom-Animation-Parser crashte
komplett), 26 Tests, Coverage von 1-3% auf **91.75% / 100%** in beiden
Modulen.

## 1. Scope

**Im Scope:**

- **Custom user-defined animations** mit DSL-Syntax:
  ```mirror
  FadeUp as animation: ease-out
    0.00 opacity 0, y-offset 20
    1.00 all opacity 1, y-offset 0
  ```
- Anwendung via `Frame anim FadeUp`
- Pipeline: `compiler/parser/animation-parser.ts` (vor Fix 1.1%) → AST →
  `compiler/backends/dom/animation-emitter.ts` (vor Fix 2.6%) → Output
  `_runtime.registerAnimation({...})`

**Nicht im Scope:**

- **Built-in animation presets** (`anim fade-in`, `anim bounce`, `anim spin`,
  …) — diese leben in `property-transformer.ts` + `style-emitter.ts`
  (bereits gut abgedeckt)
- Runtime-Animation-Ausführung (Browser-API)

## 2. Ist-Aufnahme (vor Thema 13)

| Datei                               | Tests  | Coverage                   |
| ----------------------------------- | ------ | -------------------------- |
| `state-animation-codegen.test.ts`   | ~12    | testet Built-in animations |
| `motion-one-codegen.test.ts`        | ~viele | Motion.dev integration     |
| `motion-one-ir.test.ts`             | ~viele | inView animation feature   |
| `tests/compiler/*` für custom anims | **0**  | komplett ungetestet        |

| Modul                                        | Lines | Branches | Funcs |
| -------------------------------------------- | ----- | -------- | ----- |
| `compiler/parser/animation-parser.ts`        | 1.1%  | …        | …     |
| `compiler/backends/dom/animation-emitter.ts` | 2.6%  | …        | …     |

## 3. Bug-Fix: animation-parser crashte komplett

**Befund (beim ersten Probelauf entdeckt):**
`FadeUp as animation: ...` wirft `TypeError: U.expect is not a function`.

**Wo:** `compiler/parser/animation-parser.ts` Zeilen 35 und 59 nutzten
`U.expect(ctx, 'COLON')` und `U.addError(ctx, msg)`. Diese Methoden
existieren nicht auf `ParserUtils` (nur `check`, `advance`, `reportError`,
…). Die Datei war seit langem broken — aber 0 Examples nutzten das Feature,
0 Tests deckten es ab, also blieb der Bug unbemerkt.

**Fix:** Lokale `expect`/`addError`-Helper in `animation-parser.ts`
hinzugefügt (basierend auf den existierenden ParserUtils-Methoden), 2 Call-
Sites umgeschrieben. Kein API-Bruch — die ParserUtils selbst bleiben
unverändert.

## 4. Tests

`tests/compiler/animations-custom.test.ts` — 14 Tests in 3 Bereichen:

### 4.1 Parser (6 Tests)

- A1: Simple animation parses
- A2: Animation ohne easing
- A3: Multi-property keyframe (property-name shape)
- A4: `all` target keyword
- A5: 3+ keyframes in time-order
- A6: Missing colon → graceful error (kein Crash)

### 4.2 DOM Emission (5 Tests)

- A7: registerAnimation call mit name + easing
- A8: keyframes-Array mit time + properties
- A9: target marker durchgereicht
- A10: y-offset → transform translateY
- A11: x-offset → transform translateX

### 4.3 Pathological (3 Tests)

- A12: Animation defined-but-never-referenced registriert sich trotzdem
- A13: 2 distinkte Animationen → 2 registerAnimation-calls
- A14: Single-keyframe-animation crasht nicht

## 5. Coverage nach Iteration 2

| Modul                                        | Vorher | Iter 1                         | **Iter 2**                       |
| -------------------------------------------- | ------ | ------------------------------ | -------------------------------- |
| `compiler/parser/animation-parser.ts`        | 1.1%   | 71.13% L / 61.72% B / 83.33% F | **91.75% L / 82.71% B / 100% F** |
| `compiler/backends/dom/animation-emitter.ts` | 2.6%   | 94.87% L / 70% B / 100% F      | **100% L / 100% B / 100% F**     |

**Iter 2 ergänzt 12 Tests:** roles-Klausel (4 Tests), duration-Berechnung bei
ms-skala-keyframes (3 Tests), unknown-tokens-recovery (1 Test), property-
target+string/identifier value (3 Tests), error-recovery zwischen Definitionen
(1 Test).

**Globaler Effekt:** 66.63% → **70.02% Lines (+3.4 pp)** seit Thema 13 Start.

## 6. Was nicht abgedeckt ist

- **Easing als String** statt IDENTIFIER (z.B. `: "ease-out"`) — DSL-
  Definition unklar, ob unterstützt
- **Recovery aus mehreren broken Animations hintereinander** — eigene
  Fuzz-Iteration
- **Custom timing functions** (cubic-bezier etc.) — Datei deckt das nicht ab
- **Roles / duration auf Animation-Level** — emitter unterstützt es
  (`emitDuration`/`emitRoles`), DSL-Syntax dazu unklar

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme
- [x] Schritt 3: Provokations-Liste (Bug-Fix als zentrale Frage)
- [x] Schritt 4: 14 Tests, 1 Bug gefixt
- [x] Schritt 5: Coverage-Audit
