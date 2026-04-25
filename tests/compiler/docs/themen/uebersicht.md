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
| 6   | Tokens & Property-Sets                                 | offen         | —                                                          |
| 7   | States (System + Custom + Cross-Element + Transitions) | offen         | —                                                          |
| 8   | Events & Actions                                       | offen         | —                                                          |
| 9   | Data-Binding & Iteration (each, where, by)             | offen         | —                                                          |
| 10  | Conditionals & Expressions                             | offen         | —                                                          |
| 11  | Slots                                                  | offen         | —                                                          |
| 12  | Zag-Komponenten (Slot-Styling, Nesting)                | offen         | —                                                          |
| 13  | Animationen & Transitions                              | offen         | —                                                          |
| 14  | Input Mask & Two-way Binding                           | offen         | —                                                          |
| 15  | Tables / Charts                                        | offen         | —                                                          |
| 16  | Canvas / Device Presets / Custom Icons                 | offen         | —                                                          |
| 17  | SourceMap (bidirektional)                              | offen         | —                                                          |
| 18  | Validator                                              | offen         | —                                                          |
| 19  | Robustheit (Whitespace, Strings, Kommentare, Fuzz)     | offen         | —                                                          |
| 20  | Performance / Stress / Skalierbarkeit                  | offen         | —                                                          |

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
