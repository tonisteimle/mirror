# Thema 16: Canvas / Device Presets / Custom Icons / Primitives

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 16 Verhaltens-Tests, **0 Bugs**. Tutorial-Coverage 100%.

## Scope

- Canvas (`canvas mobile`, `canvas tablet`, `canvas desktop`, custom)
- Primitives (Frame, Text, Button, Input, Image, Link, Icon)
- Hierarchie durch Einrückung (2-space indent)
- Semicolon-Kurzschreibweise
- Icons (Lucide via `Icon "check"`, `ic`, `is`, `fill`)

## Tutorial-Aspekt-Coverage

**Tutorial:** `docs/tutorial/01-elemente.html`

| Aspekt                         | Test                                      |
| ------------------------------ | ----------------------------------------- |
| Primitives (Frame/Text/Button) | `tutorial-01-elemente-aspects` Primitives |
| Input mit placeholder          | Primitives                                |
| Image src                      | Primitives                                |
| Link href                      | Primitives                                |
| Hierarchie durch Einrückung    | Hierarchie                                |
| Semicolon-Kurzschreibweise     | Semicolon Kurzschreibweise                |
| Icons + Lucide                 | Icons                                     |
| Icon mit fill                  | Icons                                     |
| Icon default size = 16         | Icons                                     |
| canvas mobile/tablet/desktop   | Canvas / Device Presets                   |
| canvas mit Override            | Canvas / Device Presets                   |

**Tutorial-Coverage:** 11/11 (100%). 0 Bugs entdeckt.

## Status

- [x] Schritt 1-3: Tutorial-Audit
- [x] Schritt 4: 16 Tests (alle bestanden)
- [x] Schritt 5: Coverage abgedeckt
