# 01 — Slice 24: Single-Value-Token

**Datum:** 2026-05-09
**Status:** Audit erledigt · Vorschläge offen · Umsetzung nicht begonnen

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Entscheidungen (Vorschläge, offen)](#2-entscheidungen-vorschläge-offen)
3. [Offene Fragen](#3-offene-fragen)
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

| #   | Eingabe                                                      | Ergebnis                                                                               |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | `primary.bg: #2271C1` + `Frame bg $primary`                  | ✅ `--primary-bg` + `var(--primary-bg)`                                                |
| 2   | `primaryColor: #2271C1` + `Frame bg $primaryColor`           | ✅                                                                                     |
| 3   | `grey-800: #333` + `Frame bg $grey-800`                      | ✅                                                                                     |
| 4   | `accent.bg: $primary` + `Frame bg $accent`                   | ❌ **`--accent-bg` fehlt im `:root`**, Frame referenziert nicht-existente CSS-Variable |
| 5   | `btn.pad: 10 16` + `Frame pad $btn`                          | ✅ Multi-Value mit Px-Anhang                                                           |
| 6   | `Frame bg $primry` (Typo)                                    | ⚠️ Leiser Pass-through: literal `$primry` im CSS                                       |
| 7   | `bg $primary, col $primary` mit `primary.bg` + `primary.col` | ✅                                                                                     |
| 8   | `Frame mar $primary` mit `primary: #f00` (color)             | ⚠️ Emittiert `margin: #f00`; keine Type-Prüfung                                        |
| 9   | `a: $a` + `Frame bg $a` (Self-Ref)                           | ✅ kein Crash                                                                          |

Voller Output: [Anhang](#6-anhang).

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                    |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Architektur             | **schwach** — drei Token-Resolver, vier Suffix-Listen, keine Single Source of Truth                          |
| 2   | Codequalität            | **mittel** — Sub-Module ok, aber Parser-Dispatch dupliziert; `parseLegacyTokenDefinition` Dead-Pfad-Verdacht |
| 3   | Testqualität            | **mittel** — viele `not.toThrow`-Smoke-Tests                                                                 |
| 4   | Testabdeckung           | **schwach an einer Stelle** — Chain-Resolution End-to-End ungetestet                                         |
| 5   | Funktionale Korrektheit | **Bug** — Chain-Tokens emittieren keine CSS-Variable                                                         |
| 6   | Studio-Roundtrip        | **mittel** — separat getestet, kein E2E vom Picker bis zum Pixel                                             |

**Gesamt:** Slice nicht „done". Bug ist Symptom; Ursache ist die Resolver-Schichtung mit dupliziertem Suffix-Wissen. Architektur-Konsolidierung adressiert beide.

## Touchpoint-Map

| Layer   | Datei                                                         | Rolle                                       |
| ------- | ------------------------------------------------------------- | ------------------------------------------- |
| Parser  | `compiler/parser/token-parser.ts`                             | Token-Formen, Typ-Inferenz                  |
| Parser  | `compiler/parser/parser.ts:200–410`                           | Dispatch (6 if-Blöcke)                      |
| IR      | `compiler/ir/transformers/value-resolver.ts`                  | Use-site Suffix-Mapping                     |
| Schema  | `compiler/schema/ir-helpers.ts:PROPERTY_TO_TOKEN_SUFFIX`      | ~50 Property-Aliasse                        |
| Backend | `compiler/backends/dom.ts:resolveTokenValueWithContext`       | Chain-Resolution (hardcoded 5-Suffix-Liste) |
| Backend | `compiler/backends/dom/style-emitter.ts`                      | `:root`-Emission, `needsPxUnit`-Regex       |
| Studio  | `studio/pickers/token/picker.ts`                              | Filtert nach `tokenType`                    |
| Studio  | `studio/editor/triggers/token-trigger.ts` (+ extract, inline) | Editor-Triggers                             |

---

# 2. Entscheidungen (Vorschläge, offen)

Alle Punkte sind Vorschläge — bitte zustimmen oder überschreiben bevor Umsetzung beginnt.

## V-1 — Chain-Token-Emission via CSS-Cascade

**Frage:** `accent.bg: $primary` im `:root` wie emittieren?

**Optionen:**

- **A:** `--accent-bg: var(--primary-bg)` (CSS-Cascade)
- **B:** `--accent-bg: #2271C1` (inline-resolved)

**Vorschlag:** A.

**Begründung:** Erhält Designer-Intent in DevTools. Theme-Switch / Dark-Mode würde mit B die Verbindung kappen. Code-Komplexität ähnlich.

**Risiko/Unklar:** Verhalten in Animation-Keyframes und State-Styles ungetestet (siehe Offene Fragen).

**Status:** offen.

## V-2 — Suffix-Map als Single Source of Truth

**Frage:** Wo lebt die kanonische „Property → Token-Suffix"-Map?

**Optionen:**

- **A:** Status quo: `compiler/schema/ir-helpers.ts:PROPERTY_TO_TOKEN_SUFFIX`
- **B:** Neue Datei `compiler/schema/token-suffixes.ts` mit Map + abgeleiteten Helpern
- **C:** Suffix als Attribut pro Property im DSL-Schema (`compiler/schema/dsl.ts`)

**Vorschlag:** B als Zwischenschritt; C als Endziel (passt zur Domain-DSL-Vision).

**Begründung:** B konsolidiert sofort und erlaubt klare Helper. C ist langfristig konsistenter, aber Schema-Migration ist größerer Eingriff — separater Slice.

**Status:** offen.

## V-3 — Unknown Token: Compile-Warn

**Frage:** Reaktion auf `bg $primry` wenn `primry` nicht definiert ist?

**Optionen:**

- **A:** Compile-Error
- **B:** Compile-Warn + Pass-through wie heute
- **C:** Compile-Warn + sinnvoller Fallback

**Vorschlag:** B.

**Begründung:** Mirror ist Designer-DSL; Preview-Continuity wichtiger als Build-Strenge. Validator (`mirror-validate`) bleibt die strenge Stelle.

**Status:** offen.

## V-4 — Type-Mismatch: Compile-Warn

**Frage:** `mar $primary` mit `primary` als color-token — wie reagieren?

**Vorschlag:** Compile-Warn, kein Auto-Fix.

**Begründung:** Konsistent mit V-3.

**Status:** offen.

## V-5 — Legacy-Parser-Pfad löschen

**Frage:** `parseLegacyTokenDefinition` (`primary: color = #fff`) — behalten?

**Vorschlag:** Löschen.

**Begründung:** Undokumentiert in CLAUDE.md/Tutorial/README; keine Tests treffen den Pfad; Mirror ist opinionated.

**Status:** offen.

## V-6 — Token-Picker liest Suffix-Map

**Frage:** Picker filtert heute nach `tokenType`. Soll das bleiben?

**Vorschlag:** Ersetzen durch Suffix-basierte Filterung (Schema-Helper aus V-2).

**Begründung:** Picker-Kontext kennt das Property, nicht den Token-Typ. Eliminiert die vierte Repräsentation der Compatibility-Frage.

**Status:** offen.

---

# 3. Offene Fragen

Punkte die ich nicht beantworten kann ohne mehr Untersuchung oder deine Einschätzung:

| #   | Frage                                                                                                            | Wer entscheidet/untersucht |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Q-1 | Wie verhält sich Chain-Resolution in `state-styles-transformer.ts` (Token in `hover:`/`on:`-Bodies)?             | Untersuchung               |
| Q-2 | Was passiert mit Token-Refs in `each`-Loops? Aktuell `__loopVar:`-Marker — kollidiert das mit Chain?             | Untersuchung               |
| Q-3 | Theme-Tokens (Zag/DatePicker) haben separaten Emission-Pfad. Müssen die V-1 mitmachen oder bleiben sie inline?   | Untersuchung               |
| Q-4 | Soll Studio-Picker-Filterung bei unbekanntem Property still alle Tokens zeigen, oder nur ungetypte? (V-6 Detail) | User                       |
| Q-5 | Validator-Strenge: bleibt `mirror-validate` Compile-Error für unbekannte Tokens, oder auch Warn?                 | User                       |
| Q-6 | Cycle-Detection in V-1 Chain — wo platzieren, IR oder Backend?                                                   | Architektur-Entscheidung   |

---

# 4. Umsetzungsplan & Status

Drei Phasen mit Abhängigkeiten. Sub-Tasks sind fein-granular für Tracking, Phasen sind die natürlichen Commit-/Review-Einheiten.

## Phase A — Schema-Konsolidierung

Voraussetzung für alles weitere. Aus V-2.

| ID  | Sub-Task                                                                                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A.1 | `compiler/schema/token-suffixes.ts` mit Map + Helpern (`getTokenSuffix`, `getCompatibleProperties`, `inferTokenTypeFromSuffix`, `needsPxUnit`) | offen  |
| A.2 | IR-Resolver (`value-resolver.ts`) auf Helper umstellen                                                                                         | offen  |
| A.3 | Backend-Chain-Resolver (`dom.ts:resolveTokenValueWithContext`) auf Helper umstellen                                                            | offen  |
| A.4 | Style-Emitter (`needsPxUnit`-Regex) auf Helper umstellen                                                                                       | offen  |
| A.5 | Parser Type-Inferenz auf Helper umstellen                                                                                                      | offen  |

## Phase B — Bug-Fix + DX

Aus V-1, V-3, V-4, V-6.

| ID  | Sub-Task                                                              | Status |
| --- | --------------------------------------------------------------------- | ------ |
| B.1 | Bug-Fix: Chain-Token emittiert `--accent-bg: var(--primary-bg)` (V-1) | offen  |
| B.2 | Compile-Warn für unbekannten Token-Ref (V-3)                          | offen  |
| B.3 | Compile-Warn für Type-Mismatch (V-4)                                  | offen  |
| B.4 | Studio-Picker auf Schema-Helper umstellen (V-6)                       | offen  |

## Phase C — Cleanup

Aus V-5 + Codequalität-Befund.

| ID  | Sub-Task                                                                               | Status |
| --- | -------------------------------------------------------------------------------------- | ------ |
| C.1 | `parseLegacyTokenDefinition` + Dispatch-Branch in `parser.ts` löschen (V-5)            | offen  |
| C.2 | Parser-Dispatch (`parser.ts:200–410`): 6 if-Blöcke → 1 Token-Recognizer (Codequalität) | offen  |

Status-Werte: `offen` · `in-arbeit` · `review` · `erledigt` · `verworfen`.

---

# 5. Tests

## Baseline (vor Refactor — alle grün, müssen grün bleiben)

| Suite                                                         | Tests         |
| ------------------------------------------------------------- | ------------- |
| `tests/compiler/lexer-tokens.test.ts`                         | 90            |
| `tests/compiler/parser-tokens.test.ts`                        | 26            |
| `tests/compiler/tokens-coverage.test.ts`                      | 35            |
| `tests/compiler/ir-token-css-variables.test.ts`               | 15            |
| `tests/behavior/tokens.test.ts`                               | 14            |
| `tests/differential/tokens.test.ts`                           | 11            |
| `tests/compiler-verification/tokens.test.ts`                  | 4             |
| `tests/integration/component-token.test.ts`                   | 5 (4 skipped) |
| `tests/data-binding/tokens.test.ts`                           | 3             |
| `tests/compiler/tutorial/tutorial-03-tokens-behavior.test.ts` | 13            |
| Studio-Token-Tests (9 Files)                                  | 275           |
| **Gesamt**                                                    | **487**       |

## Neue Regression-Tests (RT)

| ID    | Test                                                                                                           | Aus | Status |
| ----- | -------------------------------------------------------------------------------------------------------------- | --- | ------ |
| RT-1  | Chain-Token: `accent.bg: $primary` → `:root` enthält `--accent-bg: var(--primary-bg)`                          | B.1 | offen  |
| RT-2  | Chain-Token via jsdom: gemounteter Frame hat `getComputedStyle().backgroundColor` korrekt                      | B.1 | offen  |
| RT-3  | 3-Glied-Chain: `a.bg: $b` + `b.bg: $c` + `c.bg: #f00` rendert #f00                                             | B.1 | offen  |
| RT-4  | Unknown Token-Ref löst Compile-Warn aus (kein Crash)                                                           | B.2 | offen  |
| RT-5  | Type-Mismatch (color-Token in `mar`) löst Compile-Warn aus                                                     | B.3 | offen  |
| RT-6  | Schema-Helper: `getTokenSuffix('bg') === '.bg'`, `getCompatibleProperties('.bg')` enthält `bg`/`background`    | A.1 | offen  |
| RT-7  | Studio-E2E: Token-Picker → Klick `primary` → Code wird `bg $primary` → DOM `backgroundColor` korrekt           | B.4 | offen  |
| RT-8  | Differential: Chain-Token in DOM- und React-Backend äquivalent                                                 | B.1 | offen  |
| RT-9  | Cycle-Detection: 10-Glied-Cycle terminiert + emittiert sinnvolle Diagnose                                      | B.1 | offen  |
| RT-10 | Legacy-Pfad gelöscht: `primary: color = #fff` parsed nicht mehr (oder produziert Token wie heute, je nach V-5) | C.1 | offen  |

## Test-Status

| Phase                       | Tests           | Status |
| --------------------------- | --------------- | ------ |
| Baseline                    | 487             | grün   |
| Neu zu schreiben            | 10 (RT-1…RT-10) | offen  |
| Nach Refactor erwartet grün | 497             | —      |

---

# 6. Anhang

## Probe #4 (Bug)

```
Eingabe:
  primary.bg: #2271C1
  accent.bg: $primary
  Frame bg $accent

:root-Output:
  --primary-bg: #2271C1;     ← --accent-bg fehlt

Frame styles:
  background: var(--accent-bg)   ← zeigt auf nicht-existente Variable
```

## Probe #6 (DX-Issue)

```
Eingabe:
  primary.bg: #2271C1
  Frame bg $primry

Frame styles:
  background: $primry            ← literal-string, ungültiges CSS
```

## Probe #8 (Type-Mismatch)

```
Eingabe:
  primary: #f00
  Frame mar $primary

:root: --primary: #f00;
Frame styles: margin: var(--primary)   ← margin: #f00 ist ungültiges CSS
```
