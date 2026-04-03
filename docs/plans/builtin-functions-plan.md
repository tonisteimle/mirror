# Built-in Functions & Test API Plan

## Übersicht

Inkrementelle Implementierung von Built-in Funktionen für Interaction Designer.
Jede Funktion kommt mit Test-API Hooks und umfassenden Tests.

---

## Phase 0: Test API Infrastruktur

### 0.1 Test API Core

**Datei:** `compiler/runtime/test-api.ts`

```typescript
export interface MirrorTestAPI {
  // Element Access
  getElement(nodeId: string): MirrorElement | null
  getAllElements(): MirrorElement[]
  findByName(name: string): MirrorElement | null

  // State Inspection
  getState(el: MirrorElement): string
  getAvailableStates(el: MirrorElement): string[]
  getStyles(el: MirrorElement): Record<string, string>
  getBaseStyles(el: MirrorElement): Record<string, string>

  // State Manipulation
  setState(el: MirrorElement, state: string): void
  resetToBase(el: MirrorElement): void

  // Event Simulation
  trigger(el: MirrorElement, event: 'click' | 'hover' | 'focus' | 'blur'): void
  triggerKey(el: MirrorElement, key: string): void

  // Built-in Function Calls
  toggle(el: MirrorElement, states?: string[]): void
  exclusive(el: MirrorElement): void

  // Visibility
  isVisible(el: MirrorElement): boolean
  getComputedStyle(el: MirrorElement, prop: string): string

  // Async Helpers
  waitForState(el: MirrorElement, state: string, timeout?: number): Promise<boolean>
  waitForVisible(el: MirrorElement, timeout?: number): Promise<boolean>

  // Debug
  logStateMachine(el: MirrorElement): void
  getStateMachineInfo(el: MirrorElement): StateMachineInfo
}

interface StateMachineInfo {
  current: string
  initial: string
  states: string[]
  transitions: { trigger: string; to: string }[]
}
```

### 0.2 Integration in Runtime

**Datei:** `compiler/runtime/dom-runtime.ts`

```typescript
// Am Ende der Runtime-Initialisierung:
if (typeof window !== 'undefined') {
  window.__MIRROR_TEST__ = createTestAPI()
}
```

### 0.3 Test Utilities

**Datei:** `tests/helpers/test-api.ts`

```typescript
export function getTestAPI(): MirrorTestAPI {
  return (window as any).__MIRROR_TEST__
}

export async function renderAndTest(
  code: string,
  testFn: (api: MirrorTestAPI) => Promise<void>
): Promise<void> {
  // Compile, render, run test
}

export function expectState(el: MirrorElement, state: string): void
export function expectStyle(el: MirrorElement, prop: string, value: string): void
export function expectVisible(el: MirrorElement, visible: boolean): void
```

### Tests für Phase 0

```
tests/
  runtime/
    test-api.test.ts           # API existiert und funktioniert
    test-api-states.test.ts    # State-Manipulation
    test-api-events.test.ts    # Event-Simulation
```

---

## Phase 1: Overlay & Positioning Funktionen

**Priorität: HÖCHSTE** - Am meisten nachgefragt

### 1.1 `showAt(target, placement, options)`

Zeigt ein Element relativ zu einem anderen.

**Syntax:**
```
Button "Open Menu"
  onclick: showAt(MenuContent, "bottom-start")

Frame name MenuContent, hidden
  Text "Menu Item 1"
  Text "Menu Item 2"
```

**Optionen:**
```typescript
interface ShowAtOptions {
  placement: 'top' | 'bottom' | 'left' | 'right' |
             'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  offset?: number           // Default: 4
  flip?: boolean            // Default: true (flip wenn kein Platz)
  shift?: boolean           // Default: true (in Viewport halten)
  arrow?: boolean           // Default: false
}
```

**Implementierung:**
- `compiler/runtime/dom-runtime.ts`: `showAt(trigger, target, placement, options)`
- Verwendet Floating UI oder eigene Berechnung
- Speichert Cleanup-Funktion für `hideAt()`

### 1.2 `hideAt(target)` / `toggleAt(target, placement)`

```
Button "Toggle Menu"
  onclick: toggleAt(MenuContent, "bottom")
```

### 1.3 `showDialog(target)` / `hideDialog()` / `toggleDialog(target)`

Zentrierter modaler Dialog mit Backdrop.

```
Button "Open Settings"
  onclick: showDialog(SettingsDialog)

Frame name SettingsDialog, hidden
  Text "Settings"
  Button "Close"
    onclick: hideDialog()
```

**Features:**
- Automatischer Backdrop
- Focus Trap
- Escape zum Schließen
- Click-Outside zum Schließen (optional)

### Test API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Overlay Testing
  showAt(trigger: MirrorElement, target: MirrorElement, placement: string): void
  hideAt(target: MirrorElement): void
  isOverlayVisible(target: MirrorElement): boolean
  getOverlayPosition(target: MirrorElement): { top: number; left: number }

  // Dialog Testing
  showDialog(target: MirrorElement): void
  hideDialog(): void
  isDialogOpen(): boolean
  getActiveDialog(): MirrorElement | null
}
```

### Tests für Phase 1

```
tests/
  runtime/
    overlay-showAt.test.ts
      - showAt positioniert korrekt unten
      - showAt flippt wenn kein Platz
      - showAt mit offset
      - hideAt entfernt Overlay
      - toggleAt wechselt Visibility

    overlay-dialog.test.ts
      - showDialog zentriert
      - showDialog zeigt Backdrop
      - hideDialog schließt
      - Escape schließt Dialog
      - Click-Outside schließt (wenn enabled)
      - Focus Trap funktioniert

  e2e/
    overlay-positioning.spec.ts
      - Visueller Test: Dropdown öffnet unter Button
      - Visueller Test: Flipped wenn am Rand

    dialog-flow.spec.ts
      - User Flow: Dialog öffnen, interagieren, schließen
```

---

## Phase 2: Navigation Funktionen

**Priorität: HOCH** - Basis für Multi-Screen Prototypes

### 2.1 `show(view)` / `hide(view)` / `switchTo(view)`

View-basierte Navigation (Single-Page).

```
// Navigation
Frame hor, gap 8
  Button "Home"
    onclick: show(HomeView)
  Button "Settings"
    onclick: show(SettingsView)

// Views (nur eine sichtbar)
Frame name HomeView
  Text "Home Content"

Frame name SettingsView, hidden
  Text "Settings Content"
```

**`switchTo`** = exclusive show (versteckt alle anderen Views)

### 2.2 `navigate(page)` - bereits implementiert

Verbessern mit:
- Transition-Animationen
- Browser History Integration (optional)
- Preloading

### 2.3 `back()` / `forward()`

```
Button "Back"
  onclick: back()
```

### Test API Erweiterung

```typescript
interface MirrorTestAPI {
  // Navigation Testing
  show(view: MirrorElement): void
  hide(view: MirrorElement): void
  switchTo(view: MirrorElement): void
  getVisibleViews(): MirrorElement[]
  navigate(page: string): Promise<void>
  getCurrentPage(): string
  getNavigationHistory(): string[]
}
```

### Tests für Phase 2

```
tests/
  runtime/
    navigation-views.test.ts
      - show macht View sichtbar
      - hide versteckt View
      - switchTo zeigt nur eine View
      - Multiple Views gleichzeitig möglich mit show/hide

    navigation-pages.test.ts
      - navigate lädt Page
      - back() geht zurück
      - History wird aufgezeichnet
```

---

## Phase 3: Counter & Value Funktionen

**Priorität: MITTEL** - Häufig in E-Commerce, Forms

### 3.1 `increment(variable, options)` / `decrement(variable, options)`

```
// Token definieren
$count: 1

// UI
Frame hor, gap 8
  Button "-"
    onclick: decrement($count, min: 0)
  Text $count
  Button "+"
    onclick: increment($count, max: 10)
```

**Optionen:**
```typescript
interface CounterOptions {
  min?: number
  max?: number
  step?: number  // Default: 1
  wrap?: boolean // Bei max wieder zu min?
}
```

### 3.2 `set(variable, value)`

```
Button "Reset"
  onclick: set($count, 0)

Button "Large"
  onclick: set($size, "large")
```

### 3.3 `cycle(variable, values)`

Für Enum-artige Werte.

```
// Größen durchschalten
Button "Size"
  onclick: cycle($size, ["S", "M", "L", "XL"])
```

### Test API Erweiterung

```typescript
interface MirrorTestAPI {
  // Variable Testing
  getVariable(name: string): any
  setVariable(name: string, value: any): void
  increment(name: string, options?: CounterOptions): void
  decrement(name: string, options?: CounterOptions): void
}
```

### Tests für Phase 3

```
tests/
  runtime/
    counter-increment.test.ts
      - increment erhöht um 1
      - increment mit step
      - increment respektiert max
      - increment mit wrap

    counter-decrement.test.ts
      - decrement verringert um 1
      - decrement respektiert min

    variable-set.test.ts
      - set setzt Wert
      - set mit verschiedenen Typen

    variable-cycle.test.ts
      - cycle rotiert durch Werte
```

---

## Phase 4: List & Filter Funktionen

**Priorität: MITTEL** - Wichtig für Dashboards, Kataloge

### 4.1 `filter(list, predicate)`

```
Input name SearchInput, placeholder "Search..."
  oninput: filter(ItemList, by: text)

Frame name ItemList
  each item in Items
    Text item.name
```

**Predicate-Arten:**
- `by: text` - Filtert nach Textinhalt
- `by: property` - Filtert nach Eigenschaft
- `by: function` - Custom Filter-Funktion

### 4.2 `sort(list, options)`

```
Button "Sort A-Z"
  onclick: sort(ItemList, by: "name", order: "asc")
```

### 4.3 `reorder(list)` - Drag & Drop

```
Frame name TodoList
  each todo in Todos
    Frame draggable
      ondrop: reorder()
      Text todo.title
```

### Tests für Phase 4

```
tests/
  runtime/
    list-filter.test.ts
      - filter by text
      - filter zeigt/versteckt Items
      - filter case-insensitive
      - leerer Filter zeigt alle

    list-sort.test.ts
      - sort ascending
      - sort descending
      - sort by property

    list-reorder.test.ts
      - reorder via drag
      - reorder aktualisiert Array
```

---

## Phase 5: Animation & Timing Funktionen

**Priorität: MITTEL-NIEDRIG** - Nice to have

### 5.1 `delay(action, ms)`

```
Button "Submit"
  onclick: delay(showDialog(SuccessDialog), 1000)
```

### 5.2 `sequence(actions)`

```
Button "Animate"
  onclick: sequence(
    setState(Box, "step1"),
    delay(300),
    setState(Box, "step2"),
    delay(300),
    setState(Box, "step3")
  )
```

### 5.3 `stagger(children, options)`

```
Frame name List
  onenter: stagger(children, delay: 50, animation: "fade-in")
```

---

## Phase 6: Form Funktionen

**Priorität: MITTEL** - Wichtig für komplexe Forms

### 6.1 `focusNext()` / `focusPrev()`

```
Input
  onenter: focusNext()
```

### 6.2 `validate(form)` / `submit(form)` / `reset(form)`

```
Form name ContactForm
  Input name email, required
  Input name message, required
  Button "Submit"
    onclick: validate(ContactForm), submit(ContactForm)
  Button "Reset"
    onclick: reset(ContactForm)
```

### 6.3 `clear(input)`

```
Input name SearchInput
  Frame
    Icon "x"
      onclick: clear(SearchInput)
```

---

## Phase 7: Media Funktionen

**Priorität: NIEDRIG** - Spezifisch

### 7.1 `play(media)` / `pause(media)` / `togglePlay(media)`

```
Video name VideoPlayer, src "demo.mp4"

Button "Play/Pause"
  onclick: togglePlay(VideoPlayer)
```

### 7.2 `copy(text)`

```
Button "Copy Link"
  onclick: copy($shareUrl)
```

---

## Implementierungs-Reihenfolge

| Phase | Feature | Aufwand | Priorität |
|-------|---------|---------|-----------|
| 0 | Test API Core | 2 Tage | KRITISCH |
| 1.1 | showAt/hideAt | 2 Tage | HÖCHSTE |
| 1.3 | showDialog/hideDialog | 1 Tag | HÖCHSTE |
| 2.1 | show/hide/switchTo | 1 Tag | HOCH |
| 3.1 | increment/decrement | 1 Tag | MITTEL |
| 3.2 | set | 0.5 Tage | MITTEL |
| 4.1 | filter | 2 Tage | MITTEL |
| 5.1 | delay | 0.5 Tage | NIEDRIG |
| 6.1 | focusNext | 0.5 Tage | MITTEL |
| 7.2 | copy | 0.5 Tage | NIEDRIG |

---

## Architektur-Entscheidungen

### 1. Wo leben die Funktionen?

```
compiler/
  runtime/
    functions/
      overlay.ts      # showAt, hideAt, showDialog
      navigation.ts   # show, hide, switchTo, navigate
      counter.ts      # increment, decrement, set
      list.ts         # filter, sort, reorder
      animation.ts    # delay, sequence, stagger
      form.ts         # focusNext, validate, submit
      media.ts        # play, pause, copy
    test-api.ts       # Test API
    dom-runtime.ts    # Haupt-Runtime (importiert functions/)
```

### 2. Wie werden sie aufgerufen?

**Im DSL:**
```
onclick: showAt(Menu, "bottom")
```

**Generierter Code:**
```javascript
element.addEventListener('click', () => {
  _runtime.showAt(element, _runtime.findByName('Menu'), 'bottom')
})
```

### 3. Parser-Änderungen

`parseAction()` muss erweitert werden für:
- Mehrere Argumente: `showAt(Menu, "bottom", offset: 8)`
- Named Parameters: `increment($count, min: 0, max: 10)`
- Verschachtelte Aufrufe: `delay(showDialog(Modal), 500)`

### 4. Test-Modus Aktivierung

```typescript
// Option A: Environment Variable
if (process.env.NODE_ENV === 'test') {
  window.__MIRROR_TEST__ = createTestAPI()
}

// Option B: Compile Flag
compile(code, { includeTestAPI: true })

// Option C: Immer da, aber leichtgewichtig
window.__MIRROR_TEST__ = createTestAPI() // ~2KB overhead
```

**Empfehlung:** Option C - immer verfügbar, minimaler Overhead.

---

## Nächste Schritte

1. [ ] Phase 0: Test API implementieren
2. [ ] Phase 1: Overlay-Funktionen
3. [ ] Parser für erweiterte Funktionsaufrufe
4. [ ] Jede Phase mit vollständigen Tests

---

## Offene Fragen

1. Sollen Funktionen chainbar sein? `onclick: showAt(Menu).then(focus(FirstItem))`
2. Soll es ein Undo für Aktionen geben? `onclick: showAt(Menu), onclickOutside: undo()`
3. Wie mit Accessibility umgehen? (Focus Management, ARIA)
