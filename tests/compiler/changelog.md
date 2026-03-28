# Compiler Changelog

Chronologische Liste aller Bug-Fixes und Features.

---

## 2026-03-28

### Fixed
- **Event-Vererbung** - `onclick:` wurde fälschlich als State geparst
  - Ursache: Event-Detection kam nach State/Slot-Detection
  - Fix: `src/parser/parser.ts` - Event-Check vor State-Check
  - Test: `inheritance-005.test.ts` - "5.6: Vererbung mit Events"

- **Child Override Parsing** - Semicolons wurden von `parseInlineProperties` konsumiert
  - Ursache: Semicolons als Separator behandelt statt als Delimiter
  - Fix: `stopAtSemicolon` Parameter in `parseInlineProperties`
  - Test: `parser-child-overrides.test.ts`

### Added
- **Single Quotes** - Strings können jetzt mit `'` oder `"` geschrieben werden
  - Fix: `src/parser/lexer.ts` - `scanString()` unterstützt beide Quote-Typen
  - Test: `html-output-022.test.ts` - "single quotes"

- **Semicolons als Property-Trenner** - `Frame bg #f00; w 100`
  - Design: PascalCase nach `;` = Child Override, lowercase = Property Separator
  - Test: `html-output-022.test.ts` - "semicolons"

---

## 2026-03-27 (Session 5)

### Fixed
- **Nested h full / w full Tests** - Test-Syntax war falsch
  - Problem: Komma-separierte Properties, Doppelpunkte nach Instance-Namen
  - Fix: Tests korrigiert

- **Overlay Slots** - `Trigger` statt `Trigger:`
  - Problem: Slots erfordern Doppelpunkt
  - Fix: Test korrigiert

---

## 2026-03-26 (Session 4)

### Fixed
- **Bug 6: Inline Hover State** - `Frame bg #333 hover: bg light` ignoriert
  - Ursache: Parser stoppte nicht bei `identifier:`
  - Fix: `parseInlineProperties` stoppt bei lowercase + `:`
  - Fix: `instance.states` zu IR transformiert
  - Test: `token-usage-013.test.ts`

- **Bug 7: onkeydown enter:** - Parser Crash
  - Ursache: `enter:` als State statt Key behandelt
  - Fix: `KEYBOARD_KEYS` Set hinzugefügt
  - Test: `provocation-021.test.ts`

- **Bug 8: Block Hover State** - `hover:` als Kind-Instance geparst
  - Fix: `STATE_NAMES` Set, State-Block-Detection vor Child-Parsing
  - Test: `token-usage-013.test.ts`

- **Bug 9: Zag Styling ignoriert** - `Select w 200` → styles leer
  - Ursache: Alle Props an Machine Config
  - Fix: Styling-Properties separiert in `transformZagComponent`
  - Test: `zag-selection-015.test.ts`

---

## 2026-03-25 (Session 3)

### Fixed
- **Bug 5: x -50 ohne px** - `left: -50` statt `left: -50px`
  - Ursache: Regex `/^\d+$/` matcht keine negativen Zahlen
  - Fix: Regex zu `/^-?\d+$/` geändert
  - Test: `provocation-021.test.ts`

---

## 2026-03-24 (Session 2)

### Fixed
- **Bug 2: minw/maxw + w full** - min-width wurde ignoriert
  - Ursache: Flex-Konvertierung entfernte explizite min/max
  - Fix: Nur automatisches `min-width: 0` entfernen
  - Test: `html-output-022.test.ts`

- **Bug 3: aspect video** - Gibt `video` statt `16/9`
  - Fix: Keyword-Mapping hinzugefügt (video → 16/9, square → 1)
  - Test: `html-output-022.test.ts`

- **Bug 4: pin-left nicht generiert** - `Frame pin-left 10` → kein CSS
  - Ursache: Schema-Konvertierung kam nach PROPERTY_TO_CSS
  - Fix: Reihenfolge geändert
  - Test: `html-output-022.test.ts`

---

## 2026-03-23 (Session 1)

### Fixed
- **Bug 1: 9-Zone + hor/ver Konflikt** - `Frame tc hor` → column statt row
  - Ursache: 9-Zone Properties nicht in Source-Reihenfolge
  - Fix: Layout-Properties in Reihenfolge verarbeiten
  - Test: `bugs-found.test.ts`

---

## Legende

| Tag | Bedeutung |
|-----|-----------|
| Fixed | Bug behoben |
| Added | Neues Feature |
| Changed | Verhalten geändert |
| Deprecated | Wird entfernt |
| Removed | Entfernt |
