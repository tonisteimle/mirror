# Compiler Bulletproof: Themen-Übersicht

Ziel: Den Mirror-Compiler systematisch absichern, Thema für Thema.

## Vorgehen pro Thema

1. **Scope abstecken** — Was gehört zum Thema, was nicht. Granularität: ein Sprach-Feature/Bereich, der typischerweise die ganze Pipeline durchläuft (Lexer → Parser → IR → Backend → Runtime).
2. **Ist-Aufnahme** — Existierende Tests zum Thema durchgehen. Nicht nur Datei-Namen, sondern was tatsächlich an Assertions geprüft wird.
3. **Provokations-Liste** — „Wie kann ich das kaputt machen?" Bug-Hypothesen sammeln, jede als konkreten Test formulieren.
4. **Lücken schließen** — Tests schreiben, gefundene Bugs fixen, in `changelog.md` dokumentieren.

**Aufgabenteilung:** Schritte 1–3 macht Claude eigenständig (Inventar, Analyse, Test-Vorschläge). Schritt 4 erfolgt in Abstimmung mit dem User (Test-Implementierung, Bug-Fix-Entscheidungen).

## Themen-Liste

Reihenfolge: Pipeline-Basis zuerst, dann Sprach-Features, dann Querschnitt.

| #   | Thema                                                  | Status        | Dokument                   |
| --- | ------------------------------------------------------ | ------------- | -------------------------- |
| 1   | Lexer (Tokens, Indentation, Edge-Cases)                | abgeschlossen | [01-lexer.md](01-lexer.md) |
| 2   | Parser (AST, Error-Recovery)                           | offen         | —                          |
| 3   | Properties & Aliases (inkl. „letzter gewinnt")         | offen         | —                          |
| 4   | Layout (flex, grid, stacked, 9-Zone-Alignment)         | offen         | —                          |
| 5   | Komponenten & Vererbung                                | offen         | —                          |
| 6   | Tokens & Property-Sets                                 | offen         | —                          |
| 7   | States (System + Custom + Cross-Element + Transitions) | offen         | —                          |
| 8   | Events & Actions                                       | offen         | —                          |
| 9   | Data-Binding & Iteration (each, where, by)             | offen         | —                          |
| 10  | Conditionals & Expressions                             | offen         | —                          |
| 11  | Slots                                                  | offen         | —                          |
| 12  | Zag-Komponenten (Slot-Styling, Nesting)                | offen         | —                          |
| 13  | Animationen & Transitions                              | offen         | —                          |
| 14  | Input Mask & Two-way Binding                           | offen         | —                          |
| 15  | Tables / Charts                                        | offen         | —                          |
| 16  | Canvas / Device Presets / Custom Icons                 | offen         | —                          |
| 17  | SourceMap (bidirektional)                              | offen         | —                          |
| 18  | Validator                                              | offen         | —                          |
| 19  | Robustheit (Whitespace, Strings, Kommentare, Fuzz)     | offen         | —                          |
| 20  | Performance / Stress / Skalierbarkeit                  | offen         | —                          |

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
