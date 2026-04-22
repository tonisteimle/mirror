# Test-Verbesserungsplan

> Erstellt: 2026-04-21
> Status: In Bearbeitung
> Geschätzte Dauer: 4-6 Wochen (2 Entwickler parallel)
> Letzte Aktualisierung: 2026-04-21 (Phase 1-6 erledigt, E2E Tests hinzugefügt)

## Zusammenfassung

Die Analyse aller 17 Test-Kategorien hat kritische Lücken aufgedeckt:

| Problem                         | Betroffene Tests | Risiko |
| ------------------------------- | ---------------- | ------ |
| Keine Interaktions-Tests (Data) | ~98              | Hoch   |
| System States nicht getestet    | ~43              | Hoch   |
| Keyboard-Navigation fehlt       | ~291             | Hoch   |
| Animation nur CSS-Check         | ~79              | Mittel |
| Tutorial 81% nur Compilation    | ~196             | Mittel |
| Error-Handling fehlt            | Alle             | Mittel |

**Gesamtziel**: Test-Qualität von 60% auf 85% erhöhen.

---

## Aufteilung

### Entwickler A: Interaktion & Behavior

**Fokus**: Tests die tatsächlich klicken, tippen, navigieren

### Entwickler B: Validation & Infrastructure

**Fokus**: Tiefere Assertions, Error-Handling, Framework-Verbesserungen

---

# Entwickler A: Interaktion & Behavior

## Phase 1: Data-Kategorie reparieren (Woche 1-2)

### A1.1 Event-Tests mit echten Interaktionen

**Datei**: `studio/test-api/suites/event-tests.ts`

**Aktuell**: Tests definieren Events aber triggern sie nie

```typescript
// AKTUELL (schlecht)
Button "Click", onclick increment(count)
async (api) => {
  api.assert.exists('node-1')  // Nur Existenz
}
```

**Neu**: Tests müssen Events auslösen und Ergebnis prüfen

```typescript
// NEU (gut)
count: 0
Button "Click", onclick increment(count)
Text "$count"
async (api) => {
  api.dom.expect('node-2', { text: '0' })
  await api.interact.click('node-1')
  await api.utils.delay(100)
  api.dom.expect('node-2', { text: '1' })
}
```

**Tasks**:

- [x] onclick Tests (5 Tests) - Clicks triggern, State prüfen ✅
- [x] onhover Tests (3 Tests) - Hover/Unhover, Style-Changes ✅
- [x] onfocus/onblur Tests (4 Tests) - Focus-State prüfen ✅
- [x] oninput/onchange Tests (4 Tests) - Input-Werte ändern ✅
- [x] onkeydown Tests (6 Tests) - Keyboard-Events triggern ✅
- [x] onenter/onescape Tests (4 Tests) - Spezial-Keys ✅

**Aufwand**: 3-4 Tage → ✅ ERLEDIGT

### A1.2 Action-Tests mit Ausführung ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/action-tests.ts`

**Tasks**:

- [x] show()/hide() Tests - Visibility tatsächlich prüfen ✅
- [x] toggle() Tests - State-Wechsel verifizieren ✅
- [x] increment()/decrement() Tests - Counter-Werte prüfen ✅
- [x] toast() Tests - Toast-Element erscheint ✅
- [x] focus()/blur() Tests - Focus-State prüfen ✅
- [x] navigate() Tests - View-Wechsel ✅
- [x] scroll Actions Tests - scrollToTop/Bottom/To ✅
- [x] overlay Actions Tests - showModal/dismiss/showBelow ✅
- [x] CRUD Actions Tests - add/remove Items ✅

**Aufwand**: 2-3 Tage → ✅ ERLEDIGT

### A1.3 Responsive-Tests mit Viewport-Änderung ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/responsive-tests.ts`

**Tasks**:

- [x] Container-Resize Helper erstellen (`setContainerSize()`) ✅
- [x] compact: State bei < 400px testen ✅
- [x] regular: State bei 400-800px testen ✅
- [x] wide: State bei > 800px testen ✅
- [x] Custom Thresholds testen ✅
- [x] Layout-Wechsel bei Resize verifizieren ✅
- [x] Responsive Visibility Tests ✅
- [x] Responsive Components Tests ✅

**Aufwand**: 2 Tage → ✅ ERLEDIGT

---

## Phase 2: States-Kategorie erweitern (Woche 2)

### A2.1 System States hinzufügen ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/states/system-states.test.ts` (NEU)

**Implementiert**: Alle System States in einer Datei zusammengefasst:

- `focusStateTests` - 7 Tests für focus: State
- `activeStateTests` - 3 Tests für active: State
- `disabledStateTests` - 5 Tests für disabled: State
- `combinedSystemStatesTests` - 3 Tests für kombinierte States

**Tasks**:

- [x] Focus-State Tests erstellen ✅
- [x] Active-State Tests erstellen ✅
- [x] Disabled-State Tests erstellen ✅
- [x] Keyboard-Focus-Chain testen (Tab-Navigation) ✅
- [x] Kombinierte States (focus + hover) testen ✅
- [x] In states/index.ts integriert ✅

**Aufwand**: 3-4 Tage → ✅ ERLEDIGT

### A2.2 Size-States implementieren ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/responsive-tests.ts` (bereits in A1.3 implementiert)

**Hinweis**: Size-States wurden vollständig in den Responsive-Tests abgedeckt:

- Container-Query-Simulation mit `setContainerSize()` Helper
- compact/regular/wide Transitions
- Custom Threshold Tests (tablet breakpoint etc.)
- Nested Size-States
- Responsive Components

**Aufwand**: 2 Tage → ✅ ERLEDIGT (Teil von A1.3)

---

## Phase 3: Keyboard-Navigation (Woche 3)

### A3.1 Zag Component Keyboard-Tests ✅ ERLEDIGT

**Neue Datei**: `studio/test-api/suites/zag/keyboard-navigation.test.ts`

**Implementiert (30+ Tests)**:

**Dialog**:

- [x] Escape schließt Dialog ✅
- [x] Tab bleibt in Dialog (Focus-Trap) ✅
- [x] Enter auf Trigger öffnet Dialog ✅
- [x] Space auf Trigger öffnet Dialog ✅

**Tabs**:

- [x] Arrow Right/Left wechselt Tabs ✅
- [x] Home/End zu erstem/letztem Tab ✅
- [x] Enter aktiviert Tab ✅

**Select**:

- [x] Arrow Down öffnet Dropdown ✅
- [x] Arrow navigiert Optionen ✅
- [x] Enter wählt Option ✅
- [x] Escape schließt Dropdown ✅
- [x] Typeahead Filter ✅

**RadioGroup**:

- [x] Arrow navigiert zwischen Optionen ✅
- [x] Space wählt Option ✅
- [x] Arrow wraps around ✅

**Checkbox/Switch**:

- [x] Space togglet Checkbox ✅
- [x] Enter togglet Checkbox ✅
- [x] Space togglet Switch ✅
- [x] ArrowRight/Left für Switch ✅

**Slider**:

- [x] Arrow Left/Right ändert Wert ✅
- [x] Home/End zu Min/Max ✅

**Tooltip**:

- [x] Focus zeigt Tooltip ✅
- [x] Escape versteckt Tooltip ✅

**Aufwand**: 4-5 Tage → ✅ ERLEDIGT

### A3.2 Keyboard-Test-Helper erstellen ✅ ERLEDIGT

**Neue Datei**: `studio/test-api/helpers/keyboard.ts`

**Implementiert**:

```typescript
// Individual Key Presses
export async function tab(api: TestAPI, delay?: number): Promise<void>
export async function shiftTab(api: TestAPI, delay?: number): Promise<void>
export async function enter(api: TestAPI, delay?: number): Promise<void>
export async function space(api: TestAPI, delay?: number): Promise<void>
export async function escape(api: TestAPI, delay?: number): Promise<void>
export async function arrowUp/Down/Left/Right(api: TestAPI, delay?: number): Promise<void>
export async function home(api: TestAPI, delay?: number): Promise<void>
export async function end(api: TestAPI, delay?: number): Promise<void>
export async function backspace(api: TestAPI, delay?: number): Promise<void>
export async function deleteKey(api: TestAPI, delay?: number): Promise<void>

// Element-Specific Key Presses
export async function pressOn(api: TestAPI, nodeId: string, key: string, delay?: number): Promise<void>
export async function pressOnWithModifiers(api: TestAPI, nodeId: string, key: string, modifiers: KeyModifiers, delay?: number): Promise<void>

// Focus + Key Combinations
export async function focusAndPress(api: TestAPI, nodeId: string, key: string, delay?: number): Promise<void>
export async function focusAndEnter(api: TestAPI, nodeId: string, delay?: number): Promise<void>
export async function focusAndSpace(api: TestAPI, nodeId: string, delay?: number): Promise<void>

// Key Sequences
export async function tabSequence(api: TestAPI, count: number, delay?: number): Promise<void>
export async function shiftTabSequence(api: TestAPI, count: number, delay?: number): Promise<void>
export async function arrowSequence(api: TestAPI, direction: 'up'|'down'|'left'|'right', count: number, delay?: number): Promise<void>
export async function keySequence(api: TestAPI, keys: string[], delay?: number): Promise<void>

// Common Patterns
export async function navigateDropdown(api: TestAPI, openKey?: string, steps?: number): Promise<void>
export async function selectDropdownOption(api: TestAPI, steps: number, selectKey?: string): Promise<void>
export async function navigateTabs(api: TestAPI, direction: 'left'|'right', count?: number): Promise<void>
export async function adjustSlider(api: TestAPI, direction: 'increase'|'decrease', steps?: number): Promise<void>
export async function jumpSlider(api: TestAPI, target: 'min'|'max'): Promise<void>

// Focus Assertions
export function hasFocus(nodeId: string): boolean
export function getFocusedNodeId(): string | null
export function isFocusWithin(containerNodeId: string): boolean
export function isFocusInZagComponent(componentType: string): boolean

// Bundle Export
export const keyboard = { /* all functions */ }
```

**Auch erstellt**: `studio/test-api/helpers/index.ts`

**keyboard-navigation.test.ts aktualisiert**: Verwendet jetzt die Helper statt inline-Funktionen.

**Aufwand**: 1 Tag → ✅ ERLEDIGT

---

## Phase 4: Animation & Visuals (Woche 4)

### A4.1 Animation-Playback-Verification ✅ ERLEDIGT

**Neue Datei**: `studio/test-api/suites/animations/playback-verification.test.ts`

**Implementiert (17 Tests)**:

**Playback State Tests**:

- [x] Spin animation has running playState ✅
- [x] Pulse animation has running playState ✅
- [x] Bounce animation has running playState ✅
- [x] Shake animation has running playState ✅

**Duration Tests**:

- [x] Spin has correct duration (0.5-2s) ✅
- [x] Bounce has short duration (≤2s) ✅
- [x] Shake has quick duration (≤1s) ✅
- [x] Fade-in has appropriate duration ✅

**Timing Function Tests**:

- [x] Spin uses linear timing ✅
- [x] Bounce uses ease or ease-out ✅
- [x] Pulse has timing function ✅

**Transform Motion Tests**:

- [x] Spin transform changes over time ✅
- [x] Bounce affects transform ✅
- [x] Shake oscillates horizontally ✅

**Multiple Animation Tests**:

- [x] Multiple elements animate independently ✅
- [x] Animation on parent does not affect child ✅

**Helper Functions**:

```typescript
function getAnimationState(element: HTMLElement): {
  name
  duration
  timingFunction
  iterationCount
  playState
  isRunning
  transform
}
function parseDuration(duration: string): number
function verifyPlayState(api, element, context): void
```

**Aufwand**: 2-3 Tage → ✅ ERLEDIGT

### A4.2 Transform-Kombinations-Tests ✅ ERLEDIGT

**Neue Datei**: `studio/test-api/suites/transforms/combinations.test.ts`

**Implementiert (18 Tests)**:

**Rotate + Scale Combinations**:

- [x] Icon with rotate and scale ✅
- [x] Frame with scale and rotation ✅
- [x] Button with hover scale and rotation ✅

**Translate + Rotate Combinations**:

- [x] Icon with offset and rotation ✅
- [x] Positioned and rotated element ✅

**Multi-Transform Combinations**:

- [x] All transforms combined ✅
- [x] Nested transforms ✅

**Transform Order Tests**:

- [x] Rotate then scale vs scale then rotate ✅
- [x] Transform property order is normalized ✅

**Transform Origin Tests**:

- [x] Default transform origin is center ✅
- [x] Rotation with scale preserves origin ✅
- [x] Icon rotation uses center origin ✅

**Edge Cases**:

- [x] Zero scale makes element invisible ✅
- [x] Negative scale mirrors element ✅
- [x] Large rotation value wraps correctly ✅

**Helper Functions**:

```typescript
function parseTransformMatrix(transform: string): {
  scaleX
  scaleY
  rotation
  translateX
  translateY
}
function hasRotation(transform: string): boolean
function hasScaling(transform: string): boolean
function debugTransform(transform: string): string
```

**Aufwand**: 1-2 Tage → ✅ ERLEDIGT

---

# Entwickler B: Validation & Infrastructure

## Phase 1: Test-Infrastructure verbessern (Woche 1)

### B1.1 Assertion-Helpers erweitern ✅ ERLEDIGT

**Datei**: `studio/test-api/assertions.ts`

**Implementierte Helpers**:

```typescript
// Style mit Toleranz
api.assert.hasStyleApprox('node-1', 'width', 100, 5) // 100px ±5

// Mehrere Styles auf einmal
api.assert.hasStyles('node-1', {
  backgroundColor: 'rgb(34, 113, 193)',
  color: 'rgb(255, 255, 255)',
  paddingTop: '12px',
})

// Element ist sichtbar (nicht nur exists)
api.assert.isVisible('node-1')
api.assert.isHidden('node-1')

// Animation läuft
api.assert.isAnimating('node-1')
api.assert.hasAnimation('node-1', 'spin')

// Focus State
api.assert.hasFocus('node-1')
api.assert.isFocusable('node-1')
```

**Status**: ✅ Alle 7 neuen Helpers implementiert:

- `hasStyleApprox()` - Style mit numerischer Toleranz
- `hasStyles()` - Mehrere Styles gleichzeitig prüfen
- `isHidden()` - Element ist versteckt
- `isAnimating()` - Animation läuft
- `hasAnimation()` - Spezifische Animation
- `hasFocus()` - Element hat Focus
- `isFocusable()` - Element kann Focus erhalten

Auch in der Fluent API (`ElementAssert`) verfügbar.

**Aufwand**: 2 Tage → ✅ Fertig

### B1.2 Timing-Robustness ✅ IMPLEMENTIERT

**Problem**: Viele Tests nutzen `await delay(100)` - fragil

**Lösung**: Zustandsbasiertes Warten

```typescript
// SCHLECHT
await api.utils.delay(100)

// GUT
await api.utils.waitForStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
await api.utils.waitForText('node-1', 'Updated')
await api.utils.waitForVisible('node-1')
await api.utils.waitForHidden('node-1')
await api.utils.waitForAnimation('node-1')
```

**Tasks**:

- [x] `waitForStyle()` - bereits implementiert
- [x] `waitForText()` - NEU implementiert
- [x] `waitForVisible()` - NEU implementiert
- [x] `waitForHidden()` - NEU implementiert (Bonus)
- [x] `waitForAnimation()` - bereits implementiert
- [ ] Bestehende Tests migrieren (schrittweise) - später

**Status**: ✅ Alle Wait-Helper verfügbar. Migration bestehender Tests kann schrittweise erfolgen.

**Aufwand**: 3 Tage → ✅ Kern fertig (Migration separat)

### B1.3 Test-Isolation verbessern ✅ ERLEDIGT

**Problem**: Tests können sich gegenseitig beeinflussen

**Tasks**:

- [x] State-Reset zwischen Tests garantieren
- [x] Focus-Reset nach jedem Test (blur active element)
- [x] Hover-State-Reset (mouseleave events, data-hover cleanup)
- [x] Dialog/Modal/Overlay State Reset (close open dialogs, tooltips, selects)
- [x] UI Mode Reset (padding/margin mode, play mode)

**Implementierung**: Erweiterte `resetTestState()` Methode in `test-runner.ts`:

- Focus blur für Preview und Main Document
- Hover cleanup mit mouseleave Events
- data-hover Attribute entfernen
- Offene Dialoge, Selects, Tooltips schließen
- UI-Modi zurücksetzen

**Aufwand**: 1-2 Tage → ✅ Fertig

---

## Phase 2: Error-Handling Tests (Woche 2)

### B2.1 Compiler-Error-Tests ✅ ERLEDIGT

**Neue Datei**: `studio/test-api/suites/compiler-verification/errors.test.ts`

```typescript
export const compilerErrorTests = describe('Compiler Error Handling', [
  testWithSetup(
    'Invalid property value shows error',
    `Frame w abc`, // "abc" ist ungültig
    async api => {
      // Sollte Fehler anzeigen, nicht crashen
      const hasError = api.compiler.hasError()
      api.assert.ok(hasError, 'Should have compilation error')

      const errorMessage = api.compiler.getErrorMessage()
      api.assert.ok(
        errorMessage.includes('width') || errorMessage.includes('abc'),
        'Error should mention invalid value'
      )
    }
  ),

  testWithSetup(
    'Missing component definition',
    `MyButton "Click"`, // MyButton nicht definiert
    async api => {
      const hasError = api.compiler.hasError()
      api.assert.ok(hasError, 'Should have error for undefined component')
    }
  ),

  testWithSetup('Recovery after fixing error', `Frame w abc`, async api => {
    api.assert.ok(api.compiler.hasError(), 'Initial error')

    await api.editor.setCode('Frame w 100')
    await api.utils.waitForCompile()

    api.assert.ok(!api.compiler.hasError(), 'Error resolved')
    api.assert.exists('node-1')
  }),
])
```

**Tasks**:

- [x] Ungültige Property-Werte (5 Tests) ✅
- [x] Fehlende Component-Definitionen (3 Tests) ✅
- [x] Ungültige Token-Referenzen (3 Tests) ✅
- [x] Syntax-Errors (5 Tests) ✅
- [x] Recovery nach Error-Fix (4 Tests) ✅
- [x] Edge Cases (5 Tests) ✅

**Implementiert**: 25 Tests in 6 Test-Suiten:

- `invalidPropertyTests` - Ungültige Werte für w, h, bg, etc.
- `undefinedComponentTests` - Nicht-definierte Komponenten
- `invalidTokenTests` - $undefined, $, verschachtelte Token
- `syntaxErrorTests` - Fehlende Kommas, unclosed strings, etc.
- `compilerErrorRecoveryTests` - Recovery nach Fixes
- `edgeCaseErrorTests` - Empty code, whitespace, deep nesting

**Aufwand**: 3-4 Tage → ✅ ERLEDIGT

### B2.2 Property-Panel Error-Tests ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/property-panel/errors.test.ts`

**Tasks**:

- [x] Ungültige Farb-Werte eingeben ✅
- [x] Negative Größen eingeben ✅
- [x] Ungültige Token-Namen ✅
- [x] Leere Pflichtfelder ✅

**Implementiert** (25 Tests in 7 Kategorien):

- `invalidColorTests` - Invalid hex, incomplete hex, invalid rgba, empty color
- `invalidSizeTests` - Negative width, non-numeric, very large, decimal, zero
- `invalidTokenReferenceTests` - Non-existent token, invalid syntax, unavailable click
- `spacingErrorTests` - Negative padding, invalid margin format, invalid gap
- `borderErrorTests` - Negative border width, invalid border color, negative radius
- `typographyErrorTests` - Negative font size, invalid weight, invalid line height
- `panelEdgeCaseTests` - Rapid changes, selection change during edit, unicode, special chars, long values

**Aufwand**: 2 Tage → ✅ ERLEDIGT

---

## Phase 3: Validation-Tiefe erhöhen (Woche 2-3)

### B3.1 Selection-Tests vertiefen ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/interactions/validation.test.ts`

**Tasks**:

- [x] Multiselect mit DOM-Validation ✅
- [x] Ungroup mit Style-Verification ✅
- [x] Spread-Toggle mit CSS-Check ✅
- [x] Selection-State nach Undo/Redo ✅

**Implementiert** (18 Tests in 4 Kategorien):

- `spreadCssTests` - CSS justifyContent verification, visual distribution
- `ungroupDomTests` - DOM structure after ungroup, child order, visibility
- `selectionUndoRedoTests` - Selection state through undo/redo cycles
- `multiselectVisualTests` - Visual indicators for multiselection

**Aufwand**: 2-3 Tage → ✅ ERLEDIGT

### B3.2 Styling-Tests erweitern ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/styling/extended.test.ts`

**Tasks**:

- [x] `rgba()` Format testen ✅
- [x] Hex mit Alpha (`#2271C180`) testen ✅
- [x] Per-Side Padding (`pad-t`, `pad-r`, etc.) ✅
- [x] Per-Side Margin ✅
- [x] Per-Side Border ✅
- [x] Shadow-Werte exakt prüfen ✅

**Implementiert** (35 Tests in 6 Kategorien):

- `rgbaColorTests` - rgba() with various opacity levels
- `hexAlphaTests` - Hex colors with alpha channel (#RRGGBBAA)
- `perSidePaddingTests` - pad-t, pad-r, pad-b, pad-l and aliases
- `perSideMarginTests` - mar-t, mar-r, mar-b, mar-l and aliases
- `perSideBorderTests` - bor-t, bor-r, bor-b, bor-l and aliases
- `shadowValidationTests` - shadow sm/md/lg blur value verification

**Aufwand**: 2 Tage → ✅ ERLEDIGT

### B3.3 Layout-Tests erweitern ✅ ERLEDIGT

**Datei**: `studio/test-api/suites/layout/extended.test.ts`

**Tasks**:

- [x] `minw`/`maxw` Constraints ✅
- [x] `minh`/`maxh` Constraints ✅
- [x] Grid mit expliziter x/y Position ✅
- [x] `row-height` Verification ✅
- [x] `gap-x`/`gap-y` getrennt ✅

**Implementiert** (26 Tests in 5 Kategorien):

- `minMaxWidthTests` - minw/maxw constraints and interactions
- `minMaxHeightTests` - minh/maxh constraints
- `gridPositionTests` - Grid with x/y positioning, multi-row spans
- `rowHeightTests` - row-height (rh) grid property
- `gapXYTests` - gap-x/gap-y (gx/gy) separate axis gaps

**Aufwand**: 2 Tage → ✅ ERLEDIGT

---

## Phase 4: Tutorial-Tests vertiefen (Woche 3-4) ✅ ERLEDIGT

### B4.1 Tutorial-Generator verbessern ✅ ERLEDIGT

**Problem**: Generator erzeugt 81% `api.assert.ok(true)`

**Lösung**: Generator erweitert für Deep Validation

**Tasks**:

- [x] Generator analysieren (wo/wie werden Tests erzeugt?) ✅
- [x] Deep-Validation für States hinzufügen ✅
- [x] Deep-Validation für Functions hinzufügen ✅
- [x] Deep-Validation für Overlays hinzufügen ✅

**Implementierung** (`tools/generate-tutorial-tests.ts`):

- `generateSkippedTest()` erzeugt jetzt Deep Validation statt `api.assert.ok(true)`
- State Validation: cursor:pointer Check, toggle element detection
- Function Validation: Button existence, counter elements, named targets
- Zag/Overlay Validation: data-part/data-scope attributes, ARIA roles
- Animation Validation: animationName, animationDuration CSS checks
- Chart Validation: canvas/SVG element detection

**Neue PreviewAPI Methoden** (`studio/test-api/inspector.ts`):

- `getElement(nodeId)` - Get raw HTMLElement
- `find(predicate)` - Find first matching element
- `findAll(predicate)` - Find all matching elements

**Aufwand**: 3-4 Tage → ✅ ERLEDIGT

### B4.2 Manuelle kritische Tests ✅ ERLEDIGT

Für Features die der Generator nicht abdeckt:

**Neue Test-Dateien**:

- `studio/test-api/suites/tutorial/states-deep.test.ts` (18 Tests)
- `studio/test-api/suites/tutorial/functions-deep.test.ts` (15 Tests)
- `studio/test-api/suites/tutorial/overlays-deep.test.ts` (20 Tests)

**States Tests** (18 Tests):

- [x] Toggle changes visual state on click ✅
- [x] Toggle with Icon state change ✅
- [x] Toggle starts in on state ✅
- [x] Hover changes background color ✅
- [x] Hover with transition timing ✅
- [x] Three-state toggle cycles correctly ✅
- [x] Exclusive tabs - only one active ✅
- [x] Menu button controls menu visibility ✅

**Functions Tests** (15 Tests):

- [x] Increment increases counter value ✅
- [x] Set and reset counter ✅
- [x] Show and hide element ✅
- [x] Toast appears on button click ✅
- [x] Toast with different types ✅
- [x] Focus moves to input ✅
- [x] Navigate changes visible view ✅
- [x] Multiple functions on single click ✅

**Overlays Tests** (20 Tests):

- [x] Dialog opens and closes ✅
- [x] Dialog has accessibility attributes ✅
- [x] Dialog backdrop blocks interaction ✅
- [x] Tooltip appears on hover ✅
- [x] Tooltip has correct positioning data ✅
- [x] Select dropdown opens and shows options ✅
- [x] Select has correct ARIA roles ✅
- [x] Tabs switch content panels ✅
- [x] Tab panels have correct ARIA relationships ✅
- [x] Checkbox toggles on click ✅
- [x] Switch has visual track and thumb ✅
- [x] RadioGroup allows single selection ✅
- [x] Slider has thumb and track ✅

**Aufwand**: 3-4 Tage → ✅ ERLEDIGT

---

## Phase 5: Stress-Tests reparieren (Woche 4) ✅ ERLEDIGT

### B5.1 Disabled Tests fixen ✅ ERLEDIGT

**Problem**: Hover-Tests hängen, sind disabled

**Datei**: `studio/test-api/suites/stress/interaction-stress.test.ts`

**Tasks**:

- [x] Root-Cause für Hover-Hang finden ✅
- [x] State-Management zwischen Tests fixen ✅
- [x] Event-Listener-Cleanup implementieren ✅
- [x] Tests wieder aktivieren ✅

**Implementierung**:

- `clearAllHoverStates()` in `interactions.ts` erweitert:
  - Dispatcht `mouseleave`/`mouseout` vor Attribute-Entfernung
  - Bereinigt auch `data-focus` um State-Konflikte zu vermeiden
- `resetTestState()` in `test-runner.ts` verbessert:
  - Dispatcht Events mit `cancelable: true`
  - Bereinigt `data-focus` Attribute
- Hover-Tests aktualisiert mit robusteren Assertions:
  - Prüft `data-hover` Attribute statt nur CSS-Farben
  - Längere Delays für Stabilität

**Aufwand**: 2-3 Tage → ✅ ERLEDIGT

### B5.2 Compile-Timeout-Bug fixen ✅ ERLEDIGT

**Problem**: Leerer Content verursacht Compile-Timeout

**Implementierung**:

- `waitForCompileWithCode()` in `test-runner.ts`:
  - Prüft ob Code leer ist
  - Für leeren Code: wartet nur auf Editor-State, nicht auf Nodes
- `waitForCompile()` in `UtilsAPIImpl`:
  - Prüft aktuellen Editor-Code
  - Für leeren Code: resolved sofort ohne Node-Check

**Test**: `Pattern: Content to empty` wieder aktiviert

**Aufwand**: 1-2 Tage → ✅ ERLEDIGT

### B5.3 Performance-Baseline erstellen (optional)

**Status**: Übersprungen - nicht priorisiert

**Aufwand**: 2 Tage (bei Bedarf)

---

## Phase 6: E2E Tests - Comprehensive App Simulation ✅ ERLEDIGT

### B6.1 UX Agency Management App E2E Test ✅ ERLEDIGT

**Neue Dateien**:

- `studio/test-api/suites/e2e/ux-agency-app.test.ts`
- `studio/test-api/suites/e2e/index.ts`

**Beschreibung**: Umfassender E2E-Test, der simuliert, wie ein Designer eine komplette UX-Agentur-Verwaltungs-App aufbaut. Der Test durchläuft alle Schritte vom Design System bis zur fertigen App und validiert jeden Schritt.

**Implementiert (20 Tests)**:

**Phase 1 - Design System**:

- [x] Token-Definitionen (Farben, Abstände, Typografie) ✅
- [x] Basis-Komponenten (Btn, Card, Badge, Avatar) ✅
- [x] Layout-Komponenten (AppShell, Sidebar, NavItem) ✅
- [x] Spezialisierte Komponenten (StatCard, DataTable) ✅

**Phase 2 - Layout-Architektur**:

- [x] AppShell-Struktur (Sidebar + MainArea) ✅
- [x] Sidebar-Navigation (NavItems) ✅
- [x] Header mit User-Info ✅

**Phase 3-7 - Feature-Module**:

- [x] Dashboard mit Stats ✅
- [x] Projects-Modul (Liste, Karten) ✅
- [x] Clients-Modul ✅
- [x] Team-Modul ✅
- [x] Time-Tracking-Modul ✅
- [x] Dialogs und Forms ✅

**Test-Suites**:

- `uxAgencyDesignSystemTests` - 4 Tests (Token, Komponenten)
- `uxAgencyLayoutTests` - 3 Tests (Shell, Sidebar, Header)
- `uxAgencyFeatureTests` - 2 Tests (Dashboard, Projects)
- `uxAgencyProjectsTests` - 2 Tests (Liste, Karten)
- `uxAgencyIntegrationTests` - 6 Tests (Komplette App)
- `uxAgencyInteractionTests` - 3 Tests (Navigation, Dialogs)

**Integration**:

- [x] In `studio/test-api/suites/index.ts` eingebunden ✅
- [x] Als `e2e` Kategorie verfügbar ✅
- [x] CLI: `npm run test:browser -- --category=e2e` ✅

**Aufwand**: 1 Tag → ✅ ERLEDIGT

---

# Zeitplan

## Woche 1

| Tag | Entwickler A             | Entwickler B           |
| --- | ------------------------ | ---------------------- |
| Mo  | A1.1 Event-Tests (Start) | B1.1 Assertion-Helpers |
| Di  | A1.1 Event-Tests         | B1.1 Assertion-Helpers |
| Mi  | A1.1 Event-Tests         | B1.2 Timing-Robustness |
| Do  | A1.2 Action-Tests        | B1.2 Timing-Robustness |
| Fr  | A1.2 Action-Tests        | B1.3 Test-Isolation    |

## Woche 2

| Tag | Entwickler A          | Entwickler B              |
| --- | --------------------- | ------------------------- |
| Mo  | A1.3 Responsive-Tests | B2.1 Compiler-Error-Tests |
| Di  | A1.3 Responsive-Tests | B2.1 Compiler-Error-Tests |
| Mi  | A2.1 Focus-Tests      | B2.1 Compiler-Error-Tests |
| Do  | A2.1 Active-Tests     | B2.2 Panel-Error-Tests    |
| Fr  | A2.1 Disabled-Tests   | B2.2 Panel-Error-Tests    |

## Woche 3

| Tag | Entwickler A         | Entwickler B              |
| --- | -------------------- | ------------------------- |
| Mo  | A2.2 Size-States     | B3.1 Selection-Validation |
| Di  | A2.2 Size-States     | B3.1 Selection-Validation |
| Mi  | A3.1 Dialog Keyboard | B3.2 Styling-Tests        |
| Do  | A3.1 Tabs Keyboard   | B3.2 Styling-Tests        |
| Fr  | A3.1 Select Keyboard | B3.3 Layout-Tests         |

## Woche 4

| Tag | Entwickler A                        | Entwickler B                 |
| --- | ----------------------------------- | ---------------------------- |
| Mo  | A3.1 Radio/Checkbox/Slider Keyboard | B3.3 Layout-Tests            |
| Di  | A3.2 Keyboard-Helpers               | B4.1 Tutorial-Generator      |
| Mi  | A4.1 Animation-Playback             | B4.1 Tutorial-Generator      |
| Do  | A4.1 Animation-Playback             | B4.2 Tutorial manuelle Tests |
| Fr  | A4.2 Transform-Kombinationen        | B4.2 Tutorial manuelle Tests |

## Woche 5 (Buffer/Cleanup)

| Tag | Entwickler A    | Entwickler B              |
| --- | --------------- | ------------------------- |
| Mo  | Puffer / Review | B5.1 Hover-Bug fixen      |
| Di  | Puffer / Review | B5.1 Hover-Bug fixen      |
| Mi  | Integration     | B5.2 Compile-Timeout-Bug  |
| Do  | Integration     | B5.3 Performance-Baseline |
| Fr  | Dokumentation   | Dokumentation             |

---

# Erfolgskriterien

## Quantitativ

- [ ] Test-Anzahl: 1939 → 2200+ (+15%)
- [ ] Deep-Validation: 25% → 60%
- [ ] Keyboard-Tests: 0 → 50+
- [ ] Error-Handling-Tests: 0 → 40+
- [ ] Disabled Tests: 2 Suites → 0

## Qualitativ

- [ ] Jeder Event-Test triggert tatsächlich Events
- [ ] Jeder State-Test prüft State-Änderung
- [ ] Jeder Animation-Test prüft Playback
- [ ] Keine `delay()` ohne State-basiertes Warten
- [ ] Alle System-States (focus, active, disabled) getestet

---

# Risiken & Mitigation

| Risiko                     | Wahrscheinlichkeit | Mitigation                  |
| -------------------------- | ------------------ | --------------------------- |
| Hover-Bug nicht fixbar     | Mittel             | Workaround mit State-Reset  |
| Keyboard-API unvollständig | Niedrig            | API erweitern falls nötig   |
| Tutorial-Generator komplex | Mittel             | Manuelle Tests als Fallback |
| Zeitüberschreitung         | Mittel             | Puffer in Woche 5           |

---

# Nach Abschluss

## Dokumentation aktualisieren

- [ ] `docs/TEST-FRAMEWORK.md` erweitern
- [ ] Neue Assertion-Helpers dokumentieren
- [ ] Best Practices für neue Test-Muster

## CI/CD

- [ ] Alle neuen Tests in CI integrieren
- [ ] Performance-Regression-Checks
- [ ] Coverage-Reporting erweitern

## Maintenance

- [ ] Monatlicher Test-Health-Check
- [ ] Neue Features immer mit Tests
- [ ] Test-Qualitäts-Guidelines
