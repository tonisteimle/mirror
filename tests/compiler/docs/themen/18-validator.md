# Thema 18: Validator

**Status:** abgeschlossen (2026-04-25, Schritt 4 erweitert).

**Ergebnis:** 559 bestehende Tests + 7 zusätzliche Completeness-Tests +
9 dokumentierte „Dead-Code-Slots" (definiert aber nie emittiert).

## Scope

`compiler/validator/` — schemagetriebene Validierung:

- **`validator.ts`** (1025 LOC) — Haupt-Logik: `Validator`-Klasse mit
  `validate(ast)` und allen `validate*`-Methoden
- **`generator.ts`** (300 LOC) — Erzeugt Validation-Rules aus Schema
- **`index.ts`** (246 LOC) — Public API + Lexer/Parser-Error-Mapping
- **`types.ts`** (147 LOC) — Error-Code-Konstanten, Result-Types
- **`studio-integration.ts`** (288 LOC) — Studio-spezifische Hooks
- **`validation-config.ts`** / **`string-utils.ts`** / **`cli.ts`**

## Coverage-Stand

Existierende Test-Files:

| Datei                                  | Tests | Fokus                                    |
| -------------------------------------- | ----- | ---------------------------------------- |
| `validator-validator.test.ts`          | 280+  | Breit: Primitives/Properties/Events/etc. |
| `validator-error-codes.test.ts`        | 150+  | Pro Error-Code 2 Tests                   |
| `validator-schema-driven.test.ts`      | 80+   | Schema-Treue                             |
| `validator-studio-integration.test.ts` | 50+   | Studio-API                               |
| `errors-lexer-errors.test.ts`          | 50+   | E010-W015 Lexer-Codes                    |

**Total: 559 Tests bestehen, 13 skipped.**

## Lücken-Audit (2026-04-25)

Systematisch geprüft: für jeden `ERROR_CODES`-Eintrag, ob ein
Test-File ihn explizit triggert.

### Aktiv emittierte Codes mit voller Coverage

E001-E003, E010-W015, E020-E022 (parser-mapped), E100, E101, E104, E105,
E110, W110, E120, E200-E202, E300, E400, W500-W503, E602-E603 — alle in
existierenden Test-Files abgedeckt.

### Geschlossen in `validator-error-codes-completeness.test.ts`

| Code                  | Beschreibung                                           |
| --------------------- | ------------------------------------------------------ |
| E020 MISSING_COLON    | Parser→Validator-Mapping verifiziert                   |
| E021 UNEXPECTED_TOKEN | Parser→Validator-Mapping verifiziert                   |
| E022 PARSER_ERROR     | Fallback-Pfad nicht-throw verifiziert                  |
| E203 MISSING_ACTION   | Event ohne Action triggert Warning                     |
| E301 INVALID_TARGET   | `highlight(invalid)` triggert; legitime Targets passen |

### Dead Codes — definiert in `types.ts`, **niemals** emittiert von `validator.ts`

| Code | Konstante              | Status                                          |
| ---- | ---------------------- | ----------------------------------------------- |
| E102 | `MISSING_VALUE`        | Schema-Driven-Pfad könnte das nutzen, ungenutzt |
| E103 | `INVALID_DIRECTION`    | Layout-Direction-Check ungenutzt                |
| E106 | `INVALID_KEYWORD`      | Property-Keyword-Check ungenutzt                |
| E111 | `INVALID_COMBINATION`  | Mehr-Property-Kombinations-Check ungenutzt      |
| E302 | `MISSING_TARGET`       | Action-ohne-Target-Check ungenutzt              |
| E401 | `DUPLICATE_STATE`      | State-Block-Duplikat-Check ungenutzt            |
| W502 | `INVALID_TOKEN_TYPE`   | Token-Typ-Check ungenutzt                       |
| E600 | `INVALID_NESTING`      | Nesting-Regel-Check ungenutzt                   |
| E601 | `DEFINITION_AFTER_USE` | Definitions-vor-Use-Reihenfolge-Check ungenutzt |

**9 Dead-Codes** sind keine Bugs — sie wurden für zukünftige Validierungs-
Regeln vorbereitet, aber nie verdrahtet. Future-PRs sollten beim
Implementieren positive Tests in `validator-error-codes.test.ts` ergänzen.

## Status

- [x] Schritt 1-3: Audit + Lücken-Liste
- [x] Schritt 4: 7 zusätzliche Completeness-Tests
- [x] Schritt 5: Aktive Codes voll abgedeckt; Dead Codes dokumentiert
- [x] Schritt 6: Coverage-Audit (559 + 7 = 566 Tests)
