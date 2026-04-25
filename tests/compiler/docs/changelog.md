# Compiler Changelog

Chronologische Liste aller Bug-Fixes und Features.

---

## 2026-04-25 (Properties & Aliases – Thema 3)

Property-Logik systematisch durchleuchtet: 50 Property-Aliase, „letzter gewinnt"
über Aliase hinweg, Boolean-Properties, Multi-Value-Excess, Token-References,
Edge-Werte. Resultat: **keine echten Bugs gefunden**, ~46 neue Tests als
Regressionsschutz, 1 dokumentierte Limitation.

### Added

- `tests/compiler/properties-bugs.test.ts` (~21 Tests) — gezielte Bug-Hypothesen:
  Alias-Konflikte (`w` vs `width`, `pad` vs `padding`, `bg` vs `background` usw.),
  Multi-Value-Excess für Single-Value-Properties (border, fs, opacity, rotate),
  Boolean-Properties mit Werten, Token-Reference-Edge-Cases, Edge-Werte (negative
  pad-direction, opacity 0/-0.5/1.5). Alle Tests grün — Property-Logik ist robust.
- `tests/compiler/properties-additional.test.ts` (~25 Tests) — Coverage für direkte
  CSS-Property-Namen (`width 100`, `max-width 200`), Edge-Werte (negative margin,
  z-index, scale 0, rotate ±720), Boolean-Kombinationen (`truncate, italic, uppercase`),
  Transform-Kombinationen, Token-References mit Suffixen, Hover-Properties
  (`hover-bg`, `hover-opacity`, `hover-scale`), Property-Listen-Edge-Cases.

### Documented

- `tests/compiler/docs/themen/03-properties.md` — Scope, Inventar (~10 Test-Files
  thematisch + viele indirekte), 50 Provokations-Hypothesen in 10 Bereichen.
- Bestätigte Verhaltensweisen:
  - „Letzter gewinnt" funktioniert über alle Alias-Kombinationen hinweg
  - Multi-Value-Properties mit Überschuss crashen nicht
  - Boolean-Properties idempotent
  - Token-References werden zu CSS-Variablen
  - Negative Werte (margin, z-index, rotate, opacity) werden roh durchgelassen
  - opacity-Werte werden nicht clamped (CSS-Engine macht das)

### Known limitations (dokumentiert, nicht gefixt)

- **CSS-Property-Form-Aliase fehlen für manche Properties**: `border-radius 8`
  als direkte CSS-Form-Schreibweise wird stillschweigend ignoriert (kein Style,
  kein Error). Nur `radius` und `rad` mappen zu `border-radius` in
  `compiler/schema/ir-helpers.ts`. Validator-Thema (18) wird das später fangen.

---

## 2026-04-25 (Parser Bulletproof – Thema 2)

Fortsetzung des Compiler-Bulletproof-Plans. Parser systematisch durchleuchtet:
~605 existierende Tests katalogisiert, 70 Hypothesen in 13 Bereichen geprüft,
1 Soft-Error-Verbesserung, 11 deaktivierte Schema-Tests reaktiviert, ~75 neue Tests.

### Fixed

- **Top-Level skip-unknown emittiert jetzt einen Soft-Error**, wenn der Parser
  vor einem `IDENTIFIER COLON` strandet, das keiner Definition entspricht.
  Vorher: lautloses Verschlucken. Jetzt: „Unrecognized definition: ':' has no
  value or body" mit Hinweis (`compiler/parser/parser.ts` Z. 514).

### Added

- `tests/compiler/parser-bugs.test.ts` (~33 Tests) — Bug-Hypothesen für Top-Level-
  Detection (reserved keywords, Canvas-Position, JS-Keyword-Mid-Doc), Token-Edge-Cases,
  Self-Inheritance, Empty-Inline-Slots, Multi-Value-Excess, State-Doppel-Definition,
  Each-Edge-Cases, Else-If-Chain, Robustness (1000 props / 50 nesting / 100 components).
  Drei vermutete Bugs sind bestätigt-aber-nicht-Silent-Swallow (Parser produziert
  „verkorkste" AST-Knoten statt Fehler) — als known limitations dokumentiert.
- `tests/compiler/parser-additional.test.ts` (~44 Tests) — Coverage für Top-Level-
  Constructs, Token-Definitionen, Component-Patterns, Property-Patterns (inkl.
  `bg`/`pad` bleiben raw bis IR), States (inline, mit Trigger, mit when-Clause),
  Events (Multi-Action wird zu 2 Events!), Each-Loops (mit `where`, index, nested),
  Conditionals, systematisches Position-Tracking.
- 11 reaktivierte Schema-Tests in `parser-schema.test.ts` (vorher `describe.skip(`).
  API-Calls von `ast.program.schema` auf `ast.schema` umgestellt. 6 Constraint-
  Tests bleiben skipped (Feature nicht implementiert).

### Documented

- `tests/compiler/docs/themen/02-parser.md` — Scope, Inventar von 29 Test-Files
  (~605 Tests), 70 Provokations-Hypothesen in 13 Bereichen, Test-Plan.
- Wichtige fixierte Verhaltensweisen:
  - Property-Namen bleiben im AST roh (`bg`, `pad`) — Alias-Resolution passiert in IR
  - Token-References sind Objects: `{ kind: 'token', name: 'primary' }`
  - `onclick toggle(), toast(...)` produziert 2 Events (nicht 1 mit 2 Actions)
  - `Btn:` wird Component mit Default-Primitive Frame
  - `if: #f00` wird (suboptimal) als malformed Conditional interpretiert
  - `each in $list` (ohne loop-var) wird als Instance reinterpretiert

### Known limitations (dokumentiert, nicht gefixt)

- Reserved Keywords als Token-Namen (`if:`, `each:`) ergeben verkorkste AST-Knoten
- Schema-Constraints (`required`, `max`, `onDelete`) noch nicht implementiert

---

## 2026-04-25 (Lexer Bulletproof – Thema 1)

Erste systematische Absicherung des Lexers im Rahmen des Compiler-Bulletproof-Plans
(`tests/compiler/docs/themen/uebersicht.md`). 5 Bugs gefunden und behoben, ~120
neue Tests hinzugefügt.

### Fixed

- **Section headers nur am Zeilenanfang**: `Button -- Foo --` (inline) erzeugte
  bisher fälschlich einen `SECTION`-Token mitten in der Zeile. Der Lexer prüft
  jetzt via `isAtLineStart()`, dass der vorherige Token `NEWLINE`/`INDENT`/
  `DEDENT` war oder die Token-Liste leer ist. Ebenso für `---5` inline.
- **Lone `&` und `|`** wurden bislang lautlos verschluckt (kein Token, kein
  Error). Sie emittieren jetzt einen `Unexpected character`-Error mit Hinweis
  „Did you mean '&&'?" / „Did you mean '||'?".
- **Negative Numbers verlieren Suffixe nicht mehr**: `-100vh`, `-50%`,
  `-0.5s`, `-200ms` wurden bisher als `NUMBER "-100"` + separater Identifier
  tokenisiert. `scanNegativeNumber` ruft jetzt `consumeNumberSuffixes()` auf,
  das aus `scanNumber` extrahiert und geteilt wird.

### Added

- `tests/compiler/lexer-bugs.test.ts` – 18 Tests, die jeden der 5 Bugs als
  Erwartung formulieren und gleichzeitig Regressionschutz für die unveränderten
  Code-Pfade (Tab-Column-Tracking, Surrogate-Pair-Spalten) liefern.
- `tests/compiler/lexer-number-suffixes.test.ts` – ~45 Tests für `%`, `s`,
  `ms`, `vh`, `vw`, `vmin`, `vmax`, Aspect-Ratio `16/9`, inkl. Edge-Cases
  (`100v`, `100vmix`, `100sms`, `1e10`, `0xff`).
- `tests/compiler/lexer-additional.test.ts` – ~56 Tests für Hex-Color-Edges,
  Single-Quote-Strings, Mixed-Quote-Strings, Unicode-Identifier (CJK, Umlaut),
  Indent-Inkonsistenzen, Section-Edges, Block-Comment-Splitting (`/* */`),
  Operator-Sequenzen (`> =`, `====`, `!==`), BOM/Smart-Quotes/Lone-`\r`.

### Documented

- `tests/compiler/docs/themen/uebersicht.md` – 20-Themen-Roadmap für die
  systematische Compiler-Absicherung. Vorgehen: 4 Schritte pro Thema.
- `tests/compiler/docs/themen/01-lexer.md` – Vollständige Analyse: Scope,
  Ist-Aufnahme von 240 existierenden Lexer-Tests, 66 Provokations-Hypothesen
  in 11 Bereichen, Test-Plan, dokumentierte Limitierungen (Column = char-index
  basiert, Hyphen in Section-Namen).

### Known limitations (dokumentiert, nicht gefixt)

- **Hyphen im Section-Namen** (`--- foo-bar ---`) ergibt `SECTION 'foo'` statt
  `'foo-bar'`, weil `scanSection` am ersten `-` stoppt. Test fixiert das
  Verhalten; Behebung ist Folge-PR.
- **Column-Tracking Tab/Emoji**: Tabs zählen 1 Spalte (statt 4), Emoji-
  Surrogate-Pairs zählen 2 (statt 1). Tests fixieren das.

---

## 2026-03-28 (Animation Integration)

### Added

- **State Transition Animations** - Animationen in State-Blöcken
  - Preset nach Colon: `selected onclick: bounce`
  - Duration vor Colon: `selected onclick 0.2s:`
  - Duration + Easing: `selected onclick 0.3s ease-out:`
  - Kombiniert: `selected onclick 0.2s: bounce`
  - Lexer: `scanNumber()` unterstützt jetzt `s` und `ms` Suffixe
  - Parser: `isStateBlockStart()` erkennt Duration-Tokens
  - Test: `tests/parser/state-animations.test.ts` (17 Tests)

- **Enter/Exit Pseudo-Properties** - Separate Ein-/Aus-Animationen
  - `enter: slide-in` - Animation beim Eintreten in State
  - `exit: fade-out` - Animation beim Verlassen des States
  - Mit Duration und Easing: `enter: bounce 0.5s ease-out`
  - Test: `tests/parser/state-animations.test.ts`

- **When mit Animation** - Animationen für Abhängigkeiten
  - `visible when Menu open 0.3s:` - Auto-Transition bei When-Clause
  - Test: `tests/parser/state-animations.test.ts`

### Schema

- `DSL.animationPresets` - 10 Animation-Presets
- `DSL.easingFunctions` - 7 Easing-Funktionen
- `ANIMATION_PRESETS`, `EASING_FUNCTIONS` Sets in parser-helpers

### IR Types

- `IRStateAnimation` - Animation-Konfiguration (preset, duration, easing, delay)
- `IRStateDefinition.enter/exit` - State-Level Enter/Exit-Animationen
- `IRStateTransition.animation` - Transition-Level Animation

### Code Generation

- `compiler/backends/dom.ts` - Animation-Daten in State-Machine-Config
  - `serializeAnimation()` - Serialisiert Animation-Objekte
  - State-Definitionen mit `enter`/`exit` Animationen
  - Transition-Config mit `animation` Property
  - `transitionTo()` und `exclusiveTransition()` mit Animation-Argument
  - Test: `tests/compiler/state-animation-codegen.test.ts` (11 Tests)

### Runtime

- `compiler/runtime/dom-runtime.ts` - Animation-Playback
  - `StateAnimation` Interface (preset, duration, easing, delay)
  - `ANIMATION_PRESETS` - 10 Keyframe-Definitionen (fade-in/out, slide-in/out, scale-in/out, bounce, pulse, shake, spin)
  - `playStateAnimation()` - Web Animations API Integration
  - `transitionTo()` akzeptiert optionales Animation-Argument
  - `exclusiveTransition()` akzeptiert optionales Animation-Argument

### Test Coverage

| Test-Datei                        | Tests | Beschreibung                      |
| --------------------------------- | ----- | --------------------------------- |
| `state-animations.test.ts`        | 17    | Parser: Animation-Syntax          |
| `state-machine-animation.test.ts` | 11    | IR: Animation-Transformation      |
| `state-animation-codegen.test.ts` | 11    | Code-Generation: Animation-Output |

**Gesamt: 39 Animation-Integration Tests**

---

## 2026-03-28 (Interaction Model)

### Added

- **State Blocks mit Triggers** - `selected onclick:` Syntax für deklarative State-Übergänge
  - State-Namen gefolgt von Event-Trigger und Doppelpunkt
  - Parser: `isStateBlockStart()` erkennt komplexe Patterns
  - Test: `tests/parser/state-triggers.test.ts` (14 Tests)

- **State Modifiers** - `exclusive`, `toggle`, `initial`
  - `exclusive` - Nur ein Element in der Gruppe kann diesen State haben
  - `toggle` - State wechselt zwischen aktiv/initial
  - `initial` - Markiert den Anfangszustand
  - Code-Generation: `_runtime.exclusiveTransition()`, Toggle-Logik
  - Test: `tests/compiler/state-machine-codegen.test.ts`

- **Keyboard Triggers** - `onkeydown escape:` Syntax
  - Event mit Key-Filter: `onkeydown`, `onkeyup` + Key-Name
  - Unterstützte Keys: escape, enter, space, tab, arrow-\*, home, end
  - Test: `tests/parser/state-triggers.test.ts`

- **When Dependencies** - `visible when Menu open:` Syntax
  - Reaktive State-Abhängigkeiten zwischen Elementen
  - Parser: `parseWhenClause()` mit and/or Ketten
  - Runtime: `watchStates()` mit MutationObserver
  - Test: `tests/ir/state-machine.test.ts`, `tests/compiler/state-machine-codegen.test.ts`

- **Multi-Element Triggers** - Block-Syntax für mehrere Targets

  ```
  onclick:
    Menu open
    Backdrop visible
  ```

  - Parser: Event-Parsing in `parseInstanceBody()`
  - Code-Generation: `_runtime.transitionTo(_elements['Target'], 'state')`
  - Test: `tests/parser/multi-element-triggers.test.ts` (4 Tests)

### IR Types

- `IRStateMachine` - State-Machine-Konfiguration
- `IRStateDefinition` - State mit Styles
- `IRStateTransition` - Transition mit Trigger/When
- `IRStateDependency` - When-Abhängigkeitskette

### Runtime Functions

- `transitionTo(el, stateName)` - State-Übergang
- `exclusiveTransition(el, stateName)` - Exklusiver Übergang (Geschwister deaktivieren)
- `watchStates(el, targetState, initialState, condition, dependencies)` - Reaktive When-Watcher

### Test Coverage

| Test-Datei                       | Tests | Beschreibung                        |
| -------------------------------- | ----- | ----------------------------------- |
| `state-triggers.test.ts`         | 14    | Parser: Trigger-Syntax, When-Clause |
| `multi-element-triggers.test.ts` | 4     | Parser: Block-Actions               |
| `state-machine.test.ts`          | 11    | IR: State-Machine-Generierung       |
| `state-machine-codegen.test.ts`  | 22    | Code-Generation + Edge Cases        |

**Gesamt: 51 Interaction Model Tests**

---

## 2026-03-28

### Discovered (Provocation-025: Testlücken-Analyse)

Systematische Analyse nach Strategie-Ansatz (`provocation-025.test.ts`) - 76 Tests, 5 echte Bugs gefunden (alle gefixt):

**Transform + Pin Kombinationen - BUG (2 Tests failed):**

- `pin-center-x rotate 45` → rotate überschreibt translate statt zu kombinieren
- `pin-center scale 1.5` → scale überschreibt translate statt zu kombinieren
- Ursache: Transform-Werte werden nicht gemerged
- Betrifft: `compiler/ir/index.ts` - Transform-Handling

**State Vererbung - BUG (2 Tests failed):**

- `Parent hover: bg #f00` + `Child hover: bg #00f` → Parent gewinnt statt Child
- Focus-State von Parent wird bei Child-Override nicht erhalten
- Ursache: State-Merging in Vererbung fehlerhaft
- Betrifft: `compiler/ir/index.ts` - `resolveComponent` / `mergeProperties`

**Alias Reihenfolge - BUG (1 Test failed):**

- `bg #f00 background #00f` → erster gewinnt statt letzter
- Ursache: Alias nicht als gleiche Property erkannt bei Merging
- Betrifft: `compiler/ir/index.ts` - Property-Key-Generierung

**Text-Align - BUG (1 Test failed):**

- `Text text-align center` → text-align wird nicht gesetzt
- Ursache: Property wird auf Text-Primitive nicht transformiert
- Betrifft: `compiler/ir/index.ts` - `propertyToCSS`

**Truncate + Sizing - BUG (2 Tests failed):**

- `Text truncate w 100` → width nicht gesetzt (nur overflow)
- `Text truncate maxw 200` → maxw nicht gesetzt
- Ursache: truncate setzt overflow, aber width/maxw werden ignoriert
- Betrifft: Property-Reihenfolge oder Truncate-Handling

### Fixed (Provocation-025 Bugs)

- **Transform + Pin Kombinationen** - `pin-center-x rotate 45` kombiniert jetzt korrekt
  - Fix: `propertyToCSS` extrahiert Transforms aus Boolean-Properties in transformContext
  - Fix: Transform-Emission nach Second Pass verschoben
  - Test: `provocation-025.test.ts` - "Transform-Kombinationen"

- **State Vererbung** - Child States überschreiben Parent States korrekt
  - Fix: `mergeStates` Methode erstellt - merged State-Properties statt zu ersetzen
  - Test: `provocation-025.test.ts` - "State-Vererbung"

- **Alias Reihenfolge** - `bg #f00 background #00f` → letzter gewinnt
  - Fix: `getCanonicalPropertyName` importiert und in `getPropertyKey` verwendet
  - Test: `provocation-025.test.ts` - "Alias-Verhalten"

- **Text-Align** - War bereits funktional (Schema-basierte Konversion)
  - Test validiert: `Text "Hello" text-align center` → `text-align: center`

- **Truncate + Sizing** - War bereits funktional
  - Test validiert: `Text truncate w 100` → overflow + width korrekt

### Discovered (Provocation-024: Schema-Driven Analysis)

Systematische Schema-Analyse (`provocation-024.test.ts`) - 81 Tests, alle bestanden:

**Directional Properties - VERIFIED WORKING:**

- `pad left 10`, `pad right 20` → ✓ generiert korrektes CSS
- `pad x 10`, `margin x 20`, `margin y 10` → ✓ Achsen-Syntax funktioniert
- `rad t 10`, `rad l 10`, `rad r 20` → ✓ Direktionale Radius funktioniert

**Schema-Definiert aber Nicht-Implementiert (20 Tests skipped):**

- Custom States: `expanded`, `collapsed`, `on`, `off`, `open`, `closed`, `filled`, `valid`, `invalid`, `loading`, `error`
- State-Variant Props: `hover-bg`, `hover-col`, `hover-opacity`, `hover-scale`, `hover-border`, `hover-border-color`, `hover-radius`
- Icon Properties: `icon-size`, `icon-color`, `icon-weight`, `fill`, `material`
- Animation Keywords: `animation fade-in`, `bounce`, `spin`, `pulse`
- Input Properties: `focusable` (tabindex)

### Fixed

- **Event-Vererbung** - `onclick:` wurde fälschlich als State geparst
  - Ursache: Event-Detection kam nach State/Slot-Detection
  - Fix: `compiler/parser/parser.ts` - Event-Check vor State-Check
  - Test: `inheritance-005.test.ts` - "5.6: Vererbung mit Events"

- **Child Override Parsing** - Semicolons wurden von `parseInlineProperties` konsumiert
  - Ursache: Semicolons als Separator behandelt statt als Delimiter
  - Fix: `stopAtSemicolon` Parameter in `parseInlineProperties`
  - Test: `parser-child-overrides.test.ts`

### Added

- **Single Quotes** - Strings können jetzt mit `'` oder `"` geschrieben werden
  - Fix: `compiler/parser/lexer.ts` - `scanString()` unterstützt beide Quote-Typen
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

| Tag        | Bedeutung          |
| ---------- | ------------------ |
| Fixed      | Bug behoben        |
| Added      | Neues Feature      |
| Changed    | Verhalten geändert |
| Deprecated | Wird entfernt      |
| Removed    | Entfernt           |
