# Slice 24: Single-Value-Token

**Datum:** 2026-05-09
**Status:** Audit · Untersuchung · Entscheidungen · Phasen A/B/C umgesetzt · 8 Regression-Tests · Slice **green**

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse (Q-1 bis Q-6)](#2-untersuchungs-ergebnisse-q-1-bis-q-6)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)
6. [Anhang](#6-anhang)

---

# 1. Audit (Zusammenfassung)

## Scope

Single-Value-Tokens als Single Source of Truth:

```mirror
primary.bg: #2271C1
Frame bg $primary
```

DSL-Versprechen: Definition mit Suffix typisiert; Verwendung mit `$name` ohne Suffix wird kontextabhängig vom Property gemappt; Token-zu-Token-Reference möglich (`accent.bg: $primary`).

## Probes

| #   | Eingabe                                            | Ergebnis vor Refactor             | Ergebnis nach Refactor (Phase B)     |
| --- | -------------------------------------------------- | --------------------------------- | ------------------------------------ |
| 1   | `primary.bg: #2271C1` + `Frame bg $primary`        | ✅                                | ✅                                   |
| 2   | `primaryColor: #2271C1` + `Frame bg $primaryColor` | ✅                                | ✅                                   |
| 3   | `grey-800: #333` + `Frame bg $grey-800`            | ✅                                | ✅                                   |
| 4   | `accent.bg: $primary` + `Frame bg $accent`         | ❌ `--accent-bg` fehlt im `:root` | ✅ `--accent-bg: var(--primary-bg);` |
| 5   | `btn.pad: 10 16` + `Frame pad $btn`                | ✅                                | ✅                                   |
| 6   | `Frame bg $primry` (Typo)                          | ⚠️ literal `$primry` im CSS       | ✅ skip — Validator W500 deckt DX    |
| 7   | `bg $primary, col $primary`                        | ✅                                | ✅                                   |
| 8   | `Frame mar $primary` mit `primary: #f00`           | ⚠️ ungültiges CSS                 | ⚠️ unverändert (Validator-Aufgabe)   |
| 9   | `a: $a` + `Frame bg $a` (Self-Ref)                 | ✅ kein Crash                     | ✅ kein Crash                        |

Voller Output: [Anhang](#6-anhang).

## Verdikt pro Dimension

| #   | Dimension               | Vor Refactor                                                                                            | Nach Refactor                                                    |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Architektur             | **schwach** — drei Token-Resolver, vier Suffix-Listen                                                   | **gut** — eine Quelle in `compiler/schema/token-suffixes.ts`     |
| 2   | Codequalität            | **mittel** — Sub-Module ok, Parser-Dispatch dupliziert; `parseLegacyTokenDefinition` Dead-Pfad-Verdacht | **besser** — Legacy-Pfad gelöscht; 4 Token-Formen statt 5        |
| 3   | Testqualität            | **mittel** — viele `not.toThrow`-Smoke-Tests                                                            | **mittel** — RT-Suite ergänzt 8 verhaltensbasierte Tests         |
| 4   | Testabdeckung           | **schwach an einer Stelle** — Chain-Resolution End-to-End ungetestet                                    | **gut** — `tests/integration/token-chain-regression.test.ts`     |
| 5   | Funktionale Korrektheit | **Bug** — Chain-Tokens emittieren keine CSS-Variable                                                    | **gefixt** — Phase B                                             |
| 6   | Studio-Roundtrip        | **mittel** — separat getestet, kein E2E vom Picker bis zum Pixel                                        | **mittel** — Picker-Refactor (V-6) auf späteren Slice verschoben |

## Touchpoint-Map (nach Refactor)

| Layer   | Datei                                                     | Rolle                                                                   |
| ------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Schema  | `compiler/schema/token-suffixes.ts` (neu)                 | **Single Source of Truth** für Suffix-Map + Helpers                     |
| Parser  | `compiler/parser/token-parser.ts`                         | 4 Token-Formen, Typ-Inferenz via Schema-Helper                          |
| Parser  | `compiler/parser/parser.ts:200–400`                       | Dispatch (5 if-Blöcke statt 6)                                          |
| IR      | `compiler/ir/transformers/value-resolver.ts`              | Use-site Suffix-Mapping via Schema-Helper                               |
| Backend | `compiler/backends/dom/style-emitter.ts:emitCustomTokens` | Chain-Emission via `var(--source)` (CSS-Cascade)                        |
| Backend | `compiler/schema/theme-generator.ts:resolveChainsInPlace` | Chain-Resolution für Theme-Tokens (inline-resolve für Color-Transforms) |
| Studio  | `studio/pickers/token/picker.ts`                          | Filtert nach `tokenType` (V-6 separat)                                  |

---

# 2. Untersuchungs-Ergebnisse (Q-1 bis Q-6)

| Q   | Frage                                      | Befund                                                                                                                               | Wirkung auf V                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Q-1 | Token in state-styles?                     | State-Bodies nutzen denselben `value-resolver` — Fix wirkt automatisch                                                               | V-1 unverändert                                       |
| Q-2 | Token-Refs in `each`-Loops?                | Tokens und loop-vars sind orthogonal (`__loopVar:`-Marker getrennt); kein Konflikt                                                   | Kein Konflikt                                         |
| Q-3 | Theme-Token-Path?                          | **Zusätzlicher Bug:** Theme-Emitter emittiert literal `$primary` bei Chain. Color-Transforms (darken/lighten) brauchen real hex.     | V-1 muss Theme-Emitter mit-fixen → erledigt           |
| Q-4 | Picker-Filterung bei unbekanntem Property? | Status quo OK (zeigt alle Tokens)                                                                                                    | V-6 Detail entschieden                                |
| Q-5 | Validator-Strenge?                         | **W500 für `undefined-token` existiert bereits**                                                                                     | **V-3 revidiert:** Compiler skipt, Validator deckt DX |
| Q-6 | Cycle-Detection?                           | Bestehender Guard greift nicht (`tokenMap` hat `name` ohne `$`). CSS-Cascade-Strategie macht Compile-Zeit-Cycle-Detection irrelevant | Cycle-Tolerance via Browser                           |

---

# 3. Entscheidungen

## V-1 — Chain-Token-Emission via CSS-Cascade — **Status: erledigt**

**Entscheidung:** A. `accent.bg: $primary` → `--accent-bg: var(--primary-bg);`

**Begründung:** Erhält Designer-Intent; Theme-Switch / Dark-Mode würde mit Inline-Resolve (B) die Verbindung kappen.

**Ausnahme:** Theme-Tokens mit auto-derived hover/active Variants brauchen real hex (Color-Transforms). Theme-Emitter inline-resolved, User-Emitter cascaded.

## V-2 — Suffix-Map als Single Source of Truth — **Status: erledigt**

**Entscheidung:** B. Neues Modul `compiler/schema/token-suffixes.ts` mit Map + Helpern.

**Helper-API:**

- `getTokenSuffix(propertyName): string | undefined`
- `getCompatibleProperties(suffix): string[]`
- `inferTokenTypeFromSuffix(suffix): TokenType | undefined`
- `needsPxUnit(tokenName): boolean`
- `getSuffix(tokenName): string`
- `stripDollar(value): string`
- `tokenToCSSVarName(tokenName): string`

C als Endziel (Suffix als Property-Attribut im DSL-Schema) — separater Slice.

## V-3 — Unknown Token: Compile-skip — **Status: erledigt (revidiert)**

**Entscheidung (revidiert nach Q-5):** Compiler skipt unresolved Token-Refs (kein literal `$name` im CSS). Validator-W500 ist die DX-Quelle.

**Begründung:** W500 existiert bereits. Compiler-Warns wären doppelt; Compiler bleibt fail-soft.

## V-4 — Type-Mismatch: keine Compiler-Warn — **Status: verworfen**

**Entscheidung:** Keine Compile-Zeit-Type-Prüfung im Compiler. Validator kann strenger werden (separater Slice).

**Begründung:** V-3 schiebt DX-Verantwortung an den Validator; V-4 konsistent halten.

## V-5 — Legacy-Parser-Pfad löschen — **Status: erledigt**

**Entscheidung:** `parseLegacyTokenDefinition` (`primary: color = #fff`) gelöscht.

**Begründung:** Undokumentiert in CLAUDE.md/Tutorial/README; nur compiler-interne Tests trafen den Pfad. Tests migriert auf simplifizierte Syntax.

## V-6 — Token-Picker auf Schema-Helper — **Status: verschoben**

**Entscheidung:** Verschoben auf separaten Slice (Studio-Picker-Refactor). Picker hat eigenen Token-Parser (`studio/pickers/token/types.ts:parseTokens`) — der größere Refactor wäre, diesen Parser durch den compiler-shared Parser zu ersetzen.

**Begründung:** Aktuelles Verhalten ist funktional korrekt; die "vierte Repräsentation" ist philosophisch, nicht funktional broken. Nicht im Scope von Slice 24.

---

# 4. Umsetzungsplan & Status

| ID                                  | Sub-Task                                                                                 | Aus V        | Status                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| **Phase A — Schema-Konsolidierung** |
| A.1                                 | `compiler/schema/token-suffixes.ts` mit Map + Helpern                                    | V-2          | erledigt                             |
| A.2                                 | IR-Resolver auf Helper umstellen                                                         | V-2          | erledigt                             |
| A.3                                 | Backend-Style-Emitter (`needsPxUnit`, `tokenToCSSVarName`) auf Helper umstellen          | V-2          | erledigt                             |
| A.4                                 | Parser Type-Inferenz auf Helper umstellen                                                | V-2          | erledigt                             |
| A.5                                 | `compiler/schema/ir-helpers.ts` re-exportiert für Backwards-Kompat                       | V-2          | erledigt                             |
| **Phase B — Bug-Fix**               |
| B.1                                 | User-Emitter: Chain-Token emittiert `--target: var(--source)`                            | V-1          | erledigt                             |
| B.2                                 | Theme-Emitter: `resolveChainsInPlace` löst Chains vor Color-Transforms inline            | V-1, Q-3     | erledigt                             |
| B.3                                 | Theme-Emitter: erhält ALLE user tokens (nicht nur theme-token-Namen) für Chain-Auflösung | V-1, Q-3     | erledigt                             |
| B.4                                 | Compile-skip für unresolved Token-Refs (kein literal `$name`)                            | V-3          | erledigt                             |
| **Phase C — Cleanup**               |
| C.1                                 | `parseLegacyTokenDefinition` + Dispatch + Tests gelöscht/migriert                        | V-5          | erledigt                             |
| C.2                                 | Parser-Dispatch (`parser.ts:200–410`) Konsolidierung                                     | Codequalität | verworfen — riskant, separater Slice |
| C.3                                 | Studio-Picker-Refactor                                                                   | V-6          | verschoben — separater Slice         |

**Commits:**

- `b32c724a` — `docs(refactoring): audit Slice 24`
- `fbe5f97e` — `refactor(schema/tokens): single source of truth for token suffixes` (Phase A)
- `d48e0d70` — `fix(tokens): chain references resolve correctly across user + theme tokens` (Phase B)
- `77bb8f23` — `test(tokens): regression suite for chain-token bug + schema helpers`
- `370470bf` — `refactor(parser): drop legacy \`name: type = value\` token syntax` (Phase C)

---

# 5. Tests

## Baseline (vor Refactor — alle grün, müssen grün bleiben)

| Suite                                                         | Tests          |
| ------------------------------------------------------------- | -------------- |
| `tests/compiler/lexer-tokens.test.ts`                         | 89             |
| `tests/compiler/parser-tokens.test.ts`                        | 22 (rewritten) |
| `tests/compiler/tokens-coverage.test.ts`                      | 35             |
| `tests/compiler/ir-token-css-variables.test.ts`               | 15             |
| `tests/behavior/tokens.test.ts`                               | 14             |
| `tests/differential/tokens.test.ts`                           | 11             |
| `tests/compiler-verification/tokens.test.ts`                  | 4              |
| `tests/integration/component-token.test.ts`                   | 5 (4 skipped)  |
| `tests/data-binding/tokens.test.ts`                           | 3              |
| `tests/compiler/tutorial/tutorial-03-tokens-behavior.test.ts` | 13             |
| `tests/contract/hotel-checkin.contract.test.ts`               | 5              |
| Studio-Token-Tests (9 Files)                                  | 275            |
| **Gesamt Baseline**                                           | **491**        |

## Neue Regression-Tests

| ID       | Test                                                                                 | Aus | Status                                                          |
| -------- | ------------------------------------------------------------------------------------ | --- | --------------------------------------------------------------- |
| RT-1     | Chain-Token: `accent.bg: $primary` → `:root` enthält `var(--primary-bg)`             | B.1 | erledigt                                                        |
| RT-2     | Chain via jsdom: gemounteter Frame nutzt CSS-Cascade                                 | B.1 | erledigt                                                        |
| RT-3     | 3-Glied-Chain: `a → b → c → terminal`                                                | B.1 | erledigt                                                        |
| RT-4     | Unknown Token-Ref: skipped (kein literal `$name`)                                    | B.4 | erledigt                                                        |
| RT-5     | Type-Mismatch                                                                        | V-4 | verworfen — V-4 verworfen                                       |
| RT-6     | Schema-Helper: 8 Helper-Tests                                                        | A.1 | erledigt                                                        |
| RT-7     | Studio-E2E Picker → Pixel                                                            | V-6 | verschoben — V-6 verschoben                                     |
| RT-8     | Differential DOM ≡ React für Chain-Token                                             | B.1 | (von bestehendem `tests/differential/tokens.test.ts` abgedeckt) |
| RT-9     | Cycle-Detection: 2-Cycle und 10-Cycle terminieren                                    | B.1 | erledigt                                                        |
| RT-10    | Legacy-Path gelöscht                                                                 | C.1 | (durch Test-Migration in `parser-tokens.test.ts` abgedeckt)     |
| RT-Theme | Theme-Token-Chain mit auto-derived hover/active Variants computiert von resolved hex | B.2 | erledigt                                                        |

## Test-Status

| Phase                                | Tests                             | Status                                            |
| ------------------------------------ | --------------------------------- | ------------------------------------------------- |
| Baseline (vor Refactor)              | 491                               | grün                                              |
| Neu geschrieben                      | 33 (RT-Suite + Schema-Helper)     | grün                                              |
| Migriert (Legacy → simplified)       | ~30                               | grün                                              |
| Pre-existing Failures (vor Refactor) | 12 fixture + 74 tutorial-snapshot | unverändert (nicht durch diesen Slice eingeführt) |

---

# 6. Anhang

## Probe #4 (Bug — vor Refactor)

```
Eingabe:
  primary.bg: #2271C1
  accent.bg: $primary
  Frame bg $accent

:root-Output (User Tokens):
  --primary-bg: #2271C1;     ← --accent-bg fehlte

Frame styles:
  background: var(--accent-bg)   ← zeigte auf nicht-existente Variable
```

## Probe #4 (nach Refactor)

```
Eingabe:
  primary.bg: #2271C1
  accent.bg: $primary
  Frame bg $accent

:root-Output (Theme Tokens, weil accent.bg ein Theme-Token-Name ist):
  --accent-bg: #2271C1;
  --accent-hover-bg: #1a5896;   ← korrekt darkened
  --accent-active-bg: #174b80;  ← korrekt darkened

Frame styles:
  background: var(--accent-bg)   ← funktioniert
```

## Probe #6 (DX — nach Refactor)

```
Eingabe:
  primary.bg: #2271C1
  Frame bg $primry  (Typo)

:root-Output:
  --primary-bg: #2271C1;
  (kein --primry, kein literal `$primry`)

Validator (`mirror-validate`):
  ⚠ [W500] Token "$primry" is not defined
```
