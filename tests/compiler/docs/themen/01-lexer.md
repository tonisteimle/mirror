# Thema 1: Lexer

**Status:** Abgeschlossen (2026-04-25).

5 Bugs behoben, ~120 neue Tests hinzugefügt, alle 364 Lexer-Tests grün. Details
siehe `tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Lexer Bulletproof)".

## 1. Scope

Der Lexer (`compiler/parser/lexer.ts`, 767 Zeilen) wandelt Mirror-Source in eine Token-Liste um.

**Im Scope:**

- 32 Token-Typen (`IDENTIFIER`, `STRING`, `NUMBER`, alle Operatoren, Strukturtokens `INDENT`/`DEDENT`/`NEWLINE`/`EOF`, `SECTION`, `COMMENT`)
- Keyword-Erkennung aus `DSL.keywords.reserved` (24 Keywords: `as`, `extends`, `named`, `each`, `in`, `if`, `else`, `where`, `by`, `asc`, `desc`, `grouped`, `data`, `keys`, `selection`, `bind`, `route`, `with`, `use`, `and`, `or`, `not`, `then`, `canvas`)
- Zahlen-Tokenisierung: Integer, Float, Hex-Color (3/4/6/8 Digits), Negative, Leading/Trailing Decimal, Suffixe (`%`, `s`, `ms`, `vh`, `vw`, `vmin`, `vmax`), Aspect-Fraction (`16/9`)
- String-Tokenisierung: `"..."` und `'...'`, Escaped Quotes (`\"`), Unicode/Emoji
- Indentation: INDENT/DEDENT auf Basis eines Indent-Stacks; erste Einrückung definiert Standard-Unit; Tabs = 4 Spaces; MAX_INDENT_DEPTH = 51
- Initial Indentation (Files, die eingerückt anfangen)
- Section Headers: `--- Name ---` (auch mit nur 2 Dashes, ohne Trailing-Dashes)
- Kommentare: `//` bis Zeilenende
- Dollar-Identifier: `$name`, `$obj.prop`, mit `-` und `.`
- Position-Tracking: line/column pro Token (column = END-Position des Tokens)
- Line-Ending-Normalisierung: `\r\n` und `\r` → `\n`
- Fehler-Handling: 8 dokumentierte Fehlerarten (Unclosed String, Invalid Hex, Unknown Character, Indent Depth, Inconsistent Indent, Multiple Decimals, Leading Decimal, Trailing Decimal); Lexer crasht nie, sondern emittiert Error + Token

**Nicht im Scope (gehört zu späteren Themen):**

- AST-Bau (Parser, Thema 2)
- Property-/Keyword-Validierung (Validator, Thema 18)
- SourceMap-Konsistenz (Thema 17)

## 2. Ist-Aufnahme

| Datei                                  | Tests | Was geprüft wird                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lexer-tokens.test.ts` (598 Z.)        | ~80   | IDENTIFIER (CamelCase, hyphenated, Underscore), STRING (escaped, Unicode, Emoji), NUMBER (Integer, Float, Hex 3/6/8, große Zahlen), Keywords (`as`, `extends`, `named`, `each`, `in`, `if`, `else`, `where`, `data`, `keys`, `and`, `or`, `not`, `then`), `import` ist KEIN Keyword, Comparison (`>`, `<`, `>=`, `<=`, `!=`, `==`, `===`, `&&`, `                                                                                                           |     | `, `!`), Punctuation (`:` `,` `;` `.` `=` `?` `@`), Combined-Patterns (Komponenten-Def, Vererbung, Named-Instance, Property-Listen, Events, Iteration, Conditional, Ternary, Dot-Access) |
| `lexer-indentation.test.ts` (378 Z.)   | ~25   | INDENT/DEDENT-Balance, 2/4/Tab-Indent, multi-level (bis 10), Empty-Lines erhalten Kontext, Whitespace-only-Lines = empty, Mixed Tabs/Spaces, Realistic Structures (Component, State-Block, Keys-Block), Re-Indent nach Dedent, Skip-Levels-Dedent, NEWLINE/INDENT-Reihenfolge                                                                                                                                                                               |
| `lexer-positions.test.ts` (193 Z.)     | ~15   | Line-Tracking (auch nach empty lines, comments, sections), Column = Token-END (dokumentiert!), Reset nach Newline, EOF-Position                                                                                                                                                                                                                                                                                                                             |
| `lexer-sections.test.ts` (123 Z.)      | ~12   | Standard `--- Name ---`, extra Spaces, ohne Trailing-Dashes, lange Namen, mehrere Sections, Spezialzeichen im Namen, Numbers im Namen, viele Dashes (`-------- Name --------`), Section am EOF, hyphenated identifiers ≠ Section, **2 Dashes reichen** für Section                                                                                                                                                                                          |
| `lexer-comments.test.ts` (95 Z.)       | ~11   | `//` bis Zeilenende, inline, leerer Kommentar, mit Spezialzeichen/Emoji, mehrere Kommentare, in Property-Listen, `//` in String ist KEIN Kommentar, Kommentar erhält Indentation-Kontext                                                                                                                                                                                                                                                                    |
| `lexer-edge-cases.test.ts` (314 Z.)    | ~30   | Empty/Whitespace-Input, Unicode in Strings (Ümlaut, Emoji, CJK, Arabisch, Mixed), Whitespace-Varianten, sehr lange Inputs (1000-10000 Zeichen), Boundary (MAX_SAFE_INTEGER, `#`, `.5` → `0.5`, `:::`), Error Resilience (unknown chars, unclosed string), Special Sequences (`==`, `::`, `->`, `.prop`, `name:`)                                                                                                                                            |
| `errors-lexer-errors.test.ts` (427 Z.) | ~35   | Unclosed Strings (am EOF, vor Newline, mit Escapes, multiple), Invalid Hex (`#`, `#12`, `#12345`, `#1234567`, `#GGG`), valid Hex (3/4/6/8), Unknown Chars (` ` `, `~`, `^`, `\0`), Indent-Depth-Limit (60 Levels Error, 100 Levels keine Hängung), Indent-Konsistenz (2-Space, 4-Space, mixed-Warning, irregular jumps), Numbers (`1.2.3`, `.5`, `5.`, `1.5`, `123abc`), Malformed (extreme Längen, Null-Bytes), Recovery (Position nach Error, multi-line) |
| `fuzz.test.ts` (Lexer-Block)           | ~30   | Stress (sehr lange Identifier, 1000 Tokens, alternierender Indent, nur Operatoren, mixed valid/invalid), Pure Random Chaos (20× ASCII-Random), Unicode Chaos (10× BMP-Random) — alle prüfen nur **„crasht nicht"**                                                                                                                                                                                                                                          |

**Summe:** ca. **240 Lexer-Tests**, ca. **2900 Zeilen Test-Code**.

**Was die Tests bereits gut abdecken:**

- Token-Typen einzeln und in Standard-Kombinationen
- Indent/Dedent-Balance und übliche Strukturen
- Line-Endings (`\r\n` getestet)
- Unicode in Strings, lange Inputs, Performance/No-Crash
- Bekannte Fehlerarten und Recovery

## 3. Provokations-Liste

Hypothesen, die ich finden konnte, indem ich Code und bestehende Tests vergleiche. Spalte „Erwartet" beschreibt das, was _vermutlich_ korrekt ist. Spalte „Status" sagt, ob aktuell ein Test existiert.

### 3.1 Number-Suffixe

| #   | Input                           | Erwartet                                                            | Status                                                              |
| --- | ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| N1  | `0.5s`                          | NUMBER `"0.5s"`                                                     | **fehlt** (nur `5.` Trailing-Decimal getestet, kein Decimal+Suffix) |
| N2  | `200ms`                         | NUMBER `"200ms"`                                                    | **fehlt**                                                           |
| N3  | `100vh`, `100vw`                | NUMBER inkl. Suffix                                                 | **fehlt**                                                           |
| N4  | `100vmin`, `100vmax`            | NUMBER inkl. Suffix                                                 | **fehlt**                                                           |
| N5  | `50%`                           | NUMBER `"50%"`                                                      | **fehlt**                                                           |
| N6  | `16/9` (Aspect Ratio)           | NUMBER `"16/9"`                                                     | **fehlt**                                                           |
| N7  | `100sms`                        | NUMBER `"100s"`, dann IDENTIFIER `"ms"` (s wins)                    | **fehlt** — Verhalten ist subtil, sollte fixiert werden             |
| N8  | `100v` (kein gültiges v-Suffix) | NUMBER `"100"`, dann IDENTIFIER `"v"`                               | **fehlt** — Code-Pfad existiert, ungetestet                         |
| N9  | `100vminx`                      | NUMBER `"100vmin"`, dann IDENTIFIER `"x"`                           | **fehlt**                                                           |
| N10 | `2vh1`                          | NUMBER `"2vh"`, dann NUMBER `"1"`                                   | **fehlt**                                                           |
| N11 | `-100vh`                        | NUMBER `"-100"`, dann IDENTIFIER `"vh"` (Bug?)                      | **vermutlicher Bug**: `scanNegativeNumber` hat keinen Suffix-Pfad!  |
| N12 | `100sec`                        | NUMBER `"100s"`, dann IDENTIFIER `"ec"`                             | **fehlt**                                                           |
| N13 | `100msec`                       | NUMBER `"100ms"`, dann IDENTIFIER `"ec"`                            | **fehlt**                                                           |
| N14 | `100vhpx`                       | NUMBER `"100vh"`, dann IDENTIFIER `"px"`                            | **fehlt**                                                           |
| N15 | `16/0`                          | NUMBER `"16/0"` (Lexer urteilt nicht über Math)                     | **fehlt**                                                           |
| N16 | `16/-9`                         | NUMBER `"16"`, SLASH, NUMBER `"-9"`                                 | **fehlt**                                                           |
| N17 | `16.5/9`                        | NUMBER `"16.5/9"`                                                   | **fehlt**                                                           |
| N18 | `16/abc`                        | NUMBER `"16"`, SLASH, IDENTIFIER `"abc"`                            | **fehlt**                                                           |
| N19 | `1e10` (Scientific)             | aktuell: NUMBER `"1"`, IDENTIFIER `"e10"` (kein Bug, dokumentieren) | **fehlt**                                                           |
| N20 | `0xff` (Hex-Literal-Notation)   | aktuell: NUMBER `"0"`, IDENTIFIER `"xff"`                           | **fehlt**                                                           |

### 3.2 Hex-Color

| #   | Input                           | Erwartet                                      | Status                                                                |
| --- | ------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| H1  | `#fffG`                         | NUMBER `"#fff"`, dann IDENTIFIER `"G"`        | **fehlt**                                                             |
| H2  | `# fff` (Space)                 | Error für `#` allein, dann IDENTIFIER `"fff"` | **fehlt**                                                             |
| H3  | `#FFFFFF` (uppercase, 6 digits) | NUMBER, kein Error                            | **fehlt** (`#3B82F6` getestet, aber gemischt; reines uppercase nicht) |
| H4  | `#1`, `#12345`, `#1234567`      | Error mit `expected 3, 4, 6, or 8 ... got N`  | `#12`, `#12345`, `#1234567` getestet, **`#1` (1 digit) fehlt**        |
| H5  | `#0`                            | Error                                         | **fehlt**                                                             |

### 3.3 Strings

| #   | Input                                | Erwartet                                                        | Status                                                                                                    |
| --- | ------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| S1  | `'hello'` (single quotes)            | STRING `"hello"`                                                | **fehlt** als expliziter Lexer-Test (in Tutorial-/Robustness-Tests vermutlich, aber nicht im Lexer-Modul) |
| S2  | `"He said \"hi\""`                   | STRING `'He said "hi"'`                                         | getestet ✓                                                                                                |
| S3  | `'don\'t'` (escape mit single quote) | STRING `"don't"`                                                | **fehlt** — laut Code wird `\\` + quote akzeptiert, aber nur für die _aktuell verwendete_ Quote-Art       |
| S4  | `"hello\\"` (Backslash am Ende)      | STRING `"hello\\"` und Unclosed-Error? oder STRING `"hello\""`? | **fehlt** — Verhalten unklar                                                                              |
| S5  | `"ÿ"`                                | STRING `"ÿ"` (literale Zeichen `\`, `u`, `0`, `0`, `F`, `F`)    | **fehlt**                                                                                                 |
| S6  | `'He said "hi"'`                     | STRING `'He said "hi"'` (mixed quotes)                          | **fehlt**                                                                                                 |
| S7  | Multi-line via `\` Continuation      | aktuell: nicht supported, Unclosed-Error                        | **fehlt**                                                                                                 |
| S8  | Sehr lange Strings mit Newlines drin | Error pro Newline                                               | **fehlt**                                                                                                 |

### 3.4 Identifier

| #   | Input                                    | Erwartet                              | Status                                                    |
| --- | ---------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| I1  | `Ümlaut` (Identifier startet mit Umlaut) | IDENTIFIER (Code unterstützt `\p{L}`) | **fehlt** — nur in Strings getestet                       |
| I2  | `日本語` als Identifier                  | IDENTIFIER                            | **fehlt**                                                 |
| I3  | `Üml-äut` (Unicode mit Bindestrich)      | IDENTIFIER                            | **fehlt**                                                 |
| I4  | `name-` (endet auf `-`)                  | IDENTIFIER `"name-"`                  | **fehlt** — wahrscheinlich erlaubt, sollte fixiert werden |
| I5  | `--name` (startet auf `-`)               | aktuell: SECTION-Versuch!             | **vermutlicher Bug**                                      |
| I6  | `bg as` (Keyword als Property-Wert)      | IDENTIFIER `"bg"`, AS `"as"`          | **fehlt** — laut Lexer wird das immer Keyword             |
| I7  | `$my-var`                                | IDENTIFIER `"$my-var"`                | **fehlt**                                                 |
| I8  | `$my.var.deep.path`                      | IDENTIFIER `"$my.var.deep.path"`      | **fehlt** explizit (nur `$item.title` indirekt)           |
| I9  | `$` allein (kein Name dahinter)          | IDENTIFIER `"$"`                      | **fehlt**                                                 |
| I10 | `_` allein                               | IDENTIFIER `"_"`                      | getestet ✓                                                |

### 3.5 Indentation

| #   | Input                                                                                       | Erwartet                                         | Status                                       |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| D1  | `\tFrame` als erste Zeile (initial Tab-Indent)                                              | initialIndent gesetzt, kein INDENT-Token         | **fehlt**                                    |
| D2  | Mix Tab+Space innerhalb einer Indentation (`\t  Frame`)                                     | indent = 4+2 = 6                                 | **fehlt**                                    |
| D3  | 3 Spaces wenn unit=2 (`   Frame`)                                                           | Inconsistent-Warning                             | **fehlt** explizit (5 und 6 Spaces getestet) |
| D4  | Indent-Stack-Korruption: `A\n  B\n   C\n  D` (3 Spaces zwischen 2- und 2-Levels)            | Inconsistent-Warning beim 3                      | **fehlt**                                    |
| D5  | Initial-Indent + dann Top-Level: `  Frame\nFrame2`                                          | Frame2 dedented unter initialIndent — Verhalten? | **fehlt**                                    |
| D6  | DEDENT um mehrere Stufen + irreguläres Ziel: `A\n  B\n    C\n D` (1 Space)                  | Invalid-Indentation-Error                        | **fehlt**                                    |
| D7  | Comment-Line mit „falscher" Indentation: `Card\n  Child\n    // 4-space comment\n  Sibling` | Sollte funktionieren, da empty-line-Skip greift  | **fehlt**                                    |
| D8  | Tab=4 Annahme: `\tA\n        A2` (Tab vs 8 Spaces)                                          | beide level-1                                    | **fehlt** explizit                           |
| D9  | NEWLINE direkt vor EOF (trailing newline)                                                   | DEDENTs am EOF korrekt                           | teilweise getestet                           |

### 3.6 Sections

| #   | Input                                           | Erwartet                                                 | Status               |
| --- | ----------------------------------------------- | -------------------------------------------------------- | -------------------- |
| SE1 | `---` allein                                    | SECTION mit leerem Namen `""`                            | **fehlt**            |
| SE2 | `Button -- Foo --` (inline)                     | aktuell: SECTION! da scanToken bei `--` Section triggert | **vermutlicher Bug** |
| SE3 | `--- foo-bar ---` (Bindestrich im Namen)        | SECTION `"foo-bar"`                                      | **fehlt**            |
| SE4 | `--Foo--` (kein Space zwischen `--` und Name)   | SECTION `"Foo"`                                          | **fehlt**            |
| SE5 | `---\n--- Foo ---` (zwei direkt hintereinander) | 2 Sections                                               | **fehlt**            |
| SE6 | Section mit nur Spaces im Namen `---   ---`     | SECTION `""`                                             | **fehlt**            |

### 3.7 Comments

| #   | Input                              | Erwartet                                                 | Status                                      |
| --- | ---------------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| C1  | `///` triple slash                 | aktuell: skipComment behandelt alles als comment-content | **fehlt**                                   |
| C2  | `/* block */`                      | nicht supported: SLASH, STAR, ... bis next SLASH         | **fehlt**                                   |
| C3  | `//` direkt vor EOF (ohne Newline) | OK, skipComment terminiert                               | **fehlt** explizit                          |
| C4  | `"hello // world"` (// in String)  | STRING mit //                                            | getestet ✓                                  |
| C5  | URL in String `"https://x"`        | STRING vollständig                                       | **fehlt** explizit (nur `http://` getestet) |

### 3.8 Operatoren

| #   | Input                               | Erwartet                                                            | Status                                  |
| --- | ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| O1  | `&` allein (ohne zweites &)         | aktuell: **kein Token, kein Error**, char wird einfach verschluckt! | **vermutlicher Bug** (Lexer Z. 299–304) |
| O2  | `\|` allein                         | gleicher Bug                                                        | **vermutlicher Bug** (Lexer Z. 306–311) |
| O3  | `> =` (Space dazwischen)            | GT, EQUALS                                                          | **fehlt**                               |
| O4  | `====`                              | STRICT_EQUAL `===`, EQUALS `=`                                      | **fehlt**                               |
| O5  | `!==`                               | STRICT_NOT_EQUAL                                                    | **fehlt** explizit                      |
| O6  | `+++`                               | drei PLUS                                                           | **fehlt**                               |
| O7  | `---5` (drei Minus + Zahl)          | aktuell: triggert scanSection ab `--`                               | **vermutlicher Bug**                    |
| O8  | `*5` (Star + Number)                | STAR, NUMBER                                                        | **fehlt**                               |
| O9  | `/5` (Slash + Number, kein Comment) | SLASH, NUMBER                                                       | **fehlt**                               |

### 3.9 Position-Tracking

| #   | Input                                       | Erwartet                                                                                             | Status                                                 |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| P1  | Tab-Indent: column-Wert für Token nach `\t` | column tracks Tab als +1 (advance), nicht +4 → könnte zu falschen Spalten in Errors/SourceMap führen | **vermutlicher Bug**                                   |
| P2  | Column nach unicode multi-byte char         | wahrscheinlich +1 pro JS-char-Index (Surrogate-Pairs +2!) → Emoji wird falsch gezählt                | **vermutlicher Bug**                                   |
| P3  | Column eines STRING-Tokens                  | aktuell: END of token. Test sagt nur `>1`. Sollte exakt fixiert werden                               | **schwach getestet**                                   |
| P4  | Errors haben korrekte Line/Column           | `Frame\n  ~invalid` → line=2, column=3 getestet                                                      | getestet ✓ (aber für andere Errors nicht systematisch) |
| P5  | INDENT-Token line/column                    | nicht explizit getestet                                                                              | **fehlt**                                              |

### 3.10 Recovery & Robustheit

| #   | Input                                    | Erwartet                               | Status                                          |
| --- | ---------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| R1  | Nur `\r` (alter Mac, mitten im Source)   | Wird zu `\n` normalisiert              | **fehlt** explizit (nur `\r\n` getestet)        |
| R2  | BOM (`﻿`) am Anfang                      | aktuell: vermutlich Unknown-Char-Error | **fehlt**                                       |
| R3  | Smart Quotes (`"..."` U+201C/U+201D)     | aktuell: Unknown-Char                  | **fehlt**                                       |
| R4  | Hyphen-Variante U+2010 statt `-`         | aktuell: Unknown-Char                  | **fehlt**                                       |
| R5  | Datei mit nur `\n\r\n\r\n`               | EOF, keine Crashs                      | **fehlt** explizit                              |
| R6  | EOF mitten in `=`                        | nur EQUALS                             | **fehlt**                                       |
| R7  | EOF mitten in `&`                        | aktuell: kein Token (siehe O1)         | **fehlt**                                       |
| R8  | EOF in Section: `--- Foo` (ohne Newline) | SECTION `"Foo"`                        | **fehlt**                                       |
| R9  | EOF mitten in String mit Escape          | wie unclosed                           | teilweise getestet                              |
| R10 | 1MB+ Input (Memory/Speed)                | < 5s                                   | **fehlt** (10000 chars getestet, aber nicht 1M) |

### 3.11 Stille Pfade (im Code, kein einziger Test)

| #    | Code-Pfad                                     | Bedeutung                                             |
| ---- | --------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| C-N1 | `scanNumber` Z. 591–613: vmin/vmax-Parsing    | komplexe 4-char-Lookahead, ungetestet                 |
| C-N2 | `scanNumber` Z. 615–621: Aspect-Fraction `/n` | ungetestet                                            |
| C-N3 | `scanLeadingDecimal` Z. 636–645               | erzeugt Warning + konvertiert                         | nur 1 Test (`.5`)                 |
| C-N4 | `scanNegativeNumber` Z. 626–634               | hat KEIN Suffix-Handling                              | ungetestet als isolierte Funktion |
| C-N5 | `handleInitialIndentation` Z. 384–413         | Edge-Cases (Tab+Space, dann nicht-existenter Newline) | nur 1 indirekter Test             |
| C-N6 | `&` und `\|` ohne Folgezeichen                | erzeugt KEIN Token, KEIN Error                        | **echter Bug-Verdacht**           |

## 4. Test-Plan

Vorschlag, neue Tests in **3 neuen Dateien** zu organisieren, damit die existierenden nicht überlaufen:

### 4.1 `tests/compiler/lexer-number-suffixes.test.ts` (neu)

Deckt N1–N20 ab. Gruppen:

- **Time suffixes**: `0.5s`, `200ms`, `1s`, `60ms`
- **Viewport units**: `100vh`, `100vw`, `50vmin`, `50vmax`, plus negative Tests `100v`, `100vmix`
- **Percentage**: `50%`, `100%`, `0%`, `0.5%`
- **Aspect ratio**: `16/9`, `4/3`, `16.5/9`, `16/0`, `16/-9`, `16/abc`
- **Combinations & boundaries**: `100sms`, `100sec`, `100msec`, `100vhpx`, `2vh1`
- **Negative + Suffix** (Bug-Test): `-100vh` → erwartet vermutlich Bug, dokumentieren oder fixen
- **Non-supported notations**: `1e10`, `0xff`, `0b101` → was tut der Lexer aktuell

### 4.2 `tests/compiler/lexer-bugs.test.ts` (neu)

Konzentrierte Bug-Tests für die 5 Verdachtsfälle. Wenn Tests rot sind → Bug bestätigt → fixen → Eintrag in `changelog.md`. Wenn grün → Test bleibt als Regression.

| Bug   | Hypothese                                                  |
| ----- | ---------------------------------------------------------- |
| O1/O2 | `&` und `\|` allein erzeugen kein Token und keinen Error   |
| I5    | `--name` triggert Section-Lexer statt Identifier           |
| SE2   | `Button -- Foo --` (inline) triggert Section               |
| O7    | `---5` triggert Section statt MINUS+NUMBER                 |
| N11   | `-100vh` verliert das Suffix                               |
| P1    | Column nach Tab ist falsch (1 statt 4)                     |
| P2    | Column nach Emoji ist um 1 zu klein (Surrogate-Pair-Issue) |

### 4.3 `tests/compiler/lexer-additional.test.ts` (neu)

Lücken aus 3.1–3.10, die keine Bug-Tests sind, sondern ergänzende Coverage:

- **Hex-Color** (H1–H5): `#fffG`, `# fff`, `#FFFFFF`, `#1`, `#0`
- **Strings** (S1, S3–S8): single quotes, mixed quotes, Backslash am Ende, Newlines in Strings
- **Identifier** (I1–I9): Unicode-Identifier, hyphenated mit Unicode, Trailing-Hyphen, `$my-var`, `$` allein, Keyword-mid-line
- **Indentation** (D1–D9): Tab-initial, Tab+Space-mix, 3-Spaces-Inconsistent, irregulärer Dedent, Comment mit anderer Indent
- **Sections** (SE1, SE3–SE6): leere Section, Hyphen-Name, ohne Space, Doppel-Section, Whitespace-Section
- **Comments** (C1–C3, C5): `///`, `/* */`, `//` vor EOF, URL in String
- **Operators** (O3–O6, O8, O9): `> =`, `====`, `!==` explicit, `+++`, `*5`, `/5`
- **Recovery** (R1–R6, R8, R10): Lone `\r`, BOM, Smart Quotes, Smart Hyphen, EOF-Edge-Cases, 1MB-Datei

**Geschätzter Umfang:** ~80 neue Tests, davon ~7–8 Bug-Tests (rot/fix). Aufwand: 1 Tag Test-Schreiben + Bug-Fix-Zeit je nach Befund.

## 5. Aufgedeckte Limitierungen (während Schritt 4)

- **Hyphen im Section-Namen wird abgeschnitten**: `--- foo-bar ---` ergibt SECTION `'foo'` (statt `'foo-bar'`). `scanSection` stoppt am ersten `-`. Der Rest wird vom trailing-dash-Skip aufgefressen. Test in `lexer-additional.test.ts` dokumentiert das aktuelle Verhalten als known limitation. Behebung wäre eine eigene kleine Änderung an `scanSection` (z.B. Stop nur bei 3+ aufeinanderfolgenden `-` oder Newline).

## 6. Bekannte Limitierungen, die dokumentiert (nicht gefixt) werden sollten

- **Column = END of token** (statt Start) — durchgängig in allen Tokens. Kommentar in `lexer-positions.test.ts` Z. 82 dokumentiert das, aber kein systematischer Test sichert es ab.
- **Tab = 4 Spaces** für Indentation, aber nur **+1 column** beim advance. Inkonsistenz, die Errors/SourceMap betrifft.
- **Reserved Keywords sind kontextfrei**: `bg as #f00` würde `as` immer als Keyword tokenisieren, der Parser muss damit umgehen.
- **Backslash-Escapes nur für die aktuelle Quote-Art** im String. `\n`, `\t`, `ÿ` werden nicht interpretiert, sondern als literale Zeichen behalten.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste erstellt
- [x] Schritt 4: Tests geschrieben (lexer-bugs, -number-suffixes, -additional), 5 Bugs gefixt
