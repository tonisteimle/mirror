# Drag & Drop System - Architektur-Analyse

## Übersicht

Das Drag & Drop System ermöglicht:
1. Einfügen neuer Komponenten aus der Palette
2. Verschieben bestehender Elemente auf dem Canvas
3. Visuelles Feedback während des Drag-Vorgangs
4. Code-Modifikation nach dem Drop

---

## Aktuelle Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DragDropSystem                                 │
│  (drag-drop-system.ts - 995 Zeilen)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Pragmatic DnD  │  │  Native HTML5   │  │  Keyboard       │          │
│  │  Integration    │  │  Drag Handlers  │  │  Listeners      │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                    │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Internal State                              │    │
│  │  { isActive, source, currentTarget, currentResult, isAltKey }   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                │                                         │
│           ┌────────────────────┼────────────────────┐                    │
│           ▼                    ▼                    ▼                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ TargetDetector  │  │ StrategyRegistry│  │  VisualSystem   │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       CodeExecutor                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Komponenten im Detail

### 1. DragDropSystem (Orchestrator)

**Datei:** `studio/drag-drop/system/drag-drop-system.ts`

**Verantwortlichkeiten:**
- Event-Handling (Pragmatic DnD + Native HTML5)
- State-Management (inline, nicht extrahiert)
- Koordination aller Subsysteme
- Mode-Debouncing (flex ↔ absolute)

**Probleme:**
- 995 Zeilen - zu viel in einer Klasse
- State-Logik ist inline, nicht als State Machine extrahiert
- Schwer testbar wegen direkter DOM-Event-Bindung
- Mischung aus Event-Handling und Business-Logik

**Aktueller State:**
```typescript
interface DragState {
  isActive: boolean
  source: DragSource | null
  currentTarget: DropTarget | null
  currentResult: DropResult | null
  isAltKeyPressed: boolean
}
```

---

### 2. TargetDetector

**Datei:** `studio/drag-drop/system/target-detector.ts`

**Funktionen:**
| Funktion | Zweck | DOM-Abhängig |
|----------|-------|--------------|
| `detectTarget()` | Element → DropTarget | Ja (getComputedStyle) |
| `findClosestTarget()` | Nächstes gültiges Target finden | Ja |
| `detectLayoutType()` | flex/positioned/none erkennen | Ja (CSSStyleDeclaration) |
| `detectDirection()` | horizontal/vertical erkennen | Ja (CSSStyleDeclaration) |
| `hasValidChildren()` | Kinder mit Node-ID? | Nein (nur DOM-Traversal) |
| `isLeafComponent()` | Ist Leaf (Text, Button)? | Nein (nur Attribut-Check) |
| `getChildRects()` | Kind-Rechtecke holen | Teilweise (layoutInfo first) |
| `getContainerRect()` | Container-Rechteck holen | Teilweise (layoutInfo first) |

**Bereits abstrahiert:**
- `DOMAdapter` Interface existiert
- `layoutInfo` Pattern für Rect-Daten implementiert

**Noch nicht abstrahiert:**
- `getComputedStyle` Aufrufe in `detectTarget`
- `elementFromPoint` (nicht in dieser Datei, aber in System)

---

### 3. Strategies

**Dateien:** `studio/drag-drop/strategies/`

| Strategy | Matches | Berechnet |
|----------|---------|-----------|
| `AbsolutePositionStrategy` | `layoutType === 'positioned'` | x/y Position |
| `FlexWithChildrenStrategy` | `layoutType === 'flex' && hasChildren` | insertionIndex |
| `SimpleInsideStrategy` | `layoutType === 'flex' && !hasChildren` | placement: 'inside' |
| `NonContainerStrategy` | `layoutType === 'none'` | before/after |

**Interface:**
```typescript
interface DropStrategy {
  name: string
  matches(target: DropTarget): boolean
  calculate(cursor, target, source, childRects?, containerRect?): DropResult
  getVisualHint(result, childRects?, containerRect?, layoutInfo?): VisualHint | null
}
```

**Status:**
- `calculate()` - Pure function (containerRect als Parameter)
- `getVisualHint()` - Fast pure (layoutInfo mit Fallback)
- `matches()` - Pure function

**Gut testbar:** Ja, alle Strategies sind bereits gut testbar.

---

### 4. VisualSystem

**Datei:** `studio/drag-drop/visual/system.ts`

**Verantwortlichkeiten:**
- Insertion-Line anzeigen (blau)
- Ghost-Indicator anzeigen (lila, für absolute)
- Parent-Outline anzeigen (gestrichelt)

**DOM-Operationen:**
- `document.createElement()` - unvermeidbar
- `document.body.appendChild()` - unvermeidbar
- Style-Manipulation - unvermeidbar

**Status:** Nicht abstrahierbar - muss DOM manipulieren. Aber hat bereits Test-API:
```typescript
getState(): {
  indicatorVisible: boolean
  indicatorRect: Rect | null
  // ...
}
```

---

### 5. CodeExecutor

**Datei:** `studio/drag-drop/executor/code-executor.ts`

**Dependency Injection bereits implementiert:**
```typescript
interface CodeExecutorDependencies {
  getSource: () => string
  getResolvedSource: () => string
  getPreludeOffset: () => number
  getSourceMap: () => SourceMap | null
  applyChange: (newSource: string) => void
  recompile: () => Promise<void>
  createModifier: (source: string, sourceMap: SourceMap) => CodeModifier
}
```

**Status:** Bereits gut testbar durch DI.

---

## DOM-Abhängigkeiten Matrix

| Modul | getBoundingClientRect | getComputedStyle | elementFromPoint | DOM Events |
|-------|:---------------------:|:----------------:|:----------------:|:----------:|
| DragDropSystem | - | - | ✓ (L346) | ✓ (viele) |
| TargetDetector | ✓ (Fallback) | ✓ | - | - |
| Strategies | ✓ (Fallback) | - | - | - |
| VisualSystem | - | - | - | ✓ (create/append) |
| CodeExecutor | - | - | - | - |

**Legende:**
- ✓ = Verwendet
- ✓ (Fallback) = Nur wenn layoutInfo nicht verfügbar
- - = Nicht verwendet

---

## Datenfluss

```
User Action (mousedown/dragstart)
        │
        ▼
┌─────────────────────┐
│ extractDragSource() │  → DragSource
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ state.isActive=true │
│ state.source=...    │
└─────────────────────┘
        │
        ▼ (mousemove/drag)
┌─────────────────────┐
│ elementFromPoint()  │  → HTMLElement
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ findClosestTarget() │  → DropTarget
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ registry.find()     │  → DropStrategy
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ strategy.calculate()│  → DropResult
└─────────────────────┘
        │
        ├──────────────────────┐
        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ visual.show()   │    │ state.current   │
└─────────────────┘    │ Result=...      │
                       └─────────────────┘
        │
        ▼ (mouseup/drop)
┌─────────────────────┐
│ executeDrop()       │  → CodeModifier
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ recompile()         │
└─────────────────────┘
```

---

## State-Übergänge (implizit)

Aktuell ist der State in `DragDropSystem` verstreut:

```
                    ┌──────────┐
                    │   IDLE   │
                    └────┬─────┘
                         │ DRAG_START
                         ▼
                    ┌──────────┐
          ┌─────────│ DRAGGING │─────────┐
          │         └────┬─────┘         │
          │              │               │
          │ TARGET_LOST  │ TARGET_FOUND  │ DRAG_END
          │              ▼               │
          │         ┌──────────┐         │
          └─────────│OVER_TARGET│────────┤
                    └────┬─────┘         │
                         │ DRAG_END      │
                         ▼               │
                    ┌──────────┐         │
                    │ DROPPED  │◄────────┘
                    └────┬─────┘
                         │ (auto)
                         ▼
                    ┌──────────┐
                    │   IDLE   │
                    └──────────┘
```

---

## Existierende Abstraktionen

### DOMAdapter (bereits implementiert)

```typescript
interface DOMAdapter {
  getComputedStyle(element: HTMLElement): CSSStyleDeclaration
  elementFromPoint(x: number, y: number): Element | null
  getBoundingClientRect(element: HTMLElement): DOMRect
}
```

**Verwendet in:**
- `target-detector.ts` - als optionaler Parameter
- Nicht in `drag-drop-system.ts` - direkter `document.elementFromPoint` Aufruf

### layoutInfo (bereits implementiert)

```typescript
type LayoutInfo = Map<string, LayoutRect>

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
  // ...
}
```

**Verwendet in:**
- `getChildRects()` - primary source
- `getContainerRect()` - primary source
- `strategy.getVisualHint()` - als Parameter

---

## Test-Abdeckung

| Datei | Tests | Testbar ohne DOM |
|-------|-------|------------------|
| target-detector.ts | ✓ (66 Tests) | Teilweise (mit jsdom + Mocks) |
| absolute-position.ts | ✓ | Ja (mit Mocks) |
| flex-with-children.ts | Indirekt | Ja |
| simple-inside.ts | Indirekt | Ja |
| non-container.ts | Indirekt | Ja |
| visual-system.ts | ✓ | Nein (braucht DOM) |
| drag-drop-system.ts | ✓ (Integration) | Nein (braucht DOM + Events) |
| code-executor.ts | ✓ | Ja (DI) |

---

## Identifizierte Probleme

### 1. Monolithischer Orchestrator

`DragDropSystem` ist 995 Zeilen und macht zu viel:
- Event-Binding (Pragmatic DnD, Native HTML5, Keyboard)
- State-Management
- Mode-Debouncing
- Target-Detection Koordination
- Visual-Feedback Koordination
- Drop-Execution

### 2. Impliziter State

State-Übergänge sind über die ganze Klasse verstreut:
- `this.state.isActive = true` in `onDragStart`
- `this.state.currentResult = null` in `onDragLeave`
- `this.dropExecuted = false` als separate Flag
- Mode-Debouncing als eigenes State-System

### 3. DOM-Kopplung im Orchestrator

```typescript
// Zeile 346 - direkter DOM-Zugriff
const elementUnderCursor = document.elementFromPoint(cursor.x, cursor.y)
```

Nicht über `DOMAdapter` abstrahiert.

### 4. Event-Handling vermischt

Pragmatic DnD und Native HTML5 Events sind parallel implementiert mit Duplikation:
- `setupMonitor()` - Pragmatic DnD
- `setupNativeDragHandlers()` - Native HTML5
- Beide rufen `updateDropIndicator()` auf

---

## Refactoring-Plan: Best-in-Class

### Phase 1: State Machine extrahieren

**Ziel:** Pure State Machine ohne Side Effects

```typescript
// state-machine.ts
type State = 'idle' | 'dragging' | 'over-target' | 'dropped'

type Event =
  | { type: 'DRAG_START'; source: DragSource; cursor: Point }
  | { type: 'DRAG_MOVE'; cursor: Point }
  | { type: 'TARGET_FOUND'; target: DropTarget; result: DropResult }
  | { type: 'TARGET_LOST' }
  | { type: 'DRAG_END' }
  | { type: 'ALT_KEY'; pressed: boolean }

function transition(state: State, event: Event): State
```

**Testbar:** 100% ohne DOM

### Phase 2: Ports definieren

**Ziel:** Alle externe Abhängigkeiten als Interfaces

```typescript
// ports.ts

interface LayoutPort {
  getRect(nodeId: string): Rect | null
  getChildRects(parentId: string): ChildRect[]
  getContainerRect(nodeId: string): Rect | null
}

interface StylePort {
  getLayoutType(element: HTMLElement): LayoutType
  getDirection(element: HTMLElement): Direction
  elementFromPoint(x: number, y: number): HTMLElement | null
}

interface EventPort {
  onDragStart(handler: (source: DragSource, cursor: Point) => void): Cleanup
  onDragMove(handler: (cursor: Point) => void): Cleanup
  onDragEnd(handler: () => void): Cleanup
  onKeyDown(key: string, handler: () => void): Cleanup
  onKeyUp(key: string, handler: () => void): Cleanup
}

interface VisualPort {
  showIndicator(hint: VisualHint): void
  showOutline(rect: Rect): void
  hideAll(): void
}

interface ExecutionPort {
  execute(source: DragSource, result: DropResult): ExecutionResult
}
```

### Phase 3: System refactoren

**Ziel:** DragDropSystem wird zum "Glue Code"

```typescript
class DragDropSystem {
  constructor(
    private layout: LayoutPort,
    private style: StylePort,
    private events: EventPort,
    private visual: VisualPort,
    private executor: ExecutionPort,
    private strategies: StrategyRegistry
  ) {}

  init() {
    this.events.onDragStart((source, cursor) => {
      const event = { type: 'DRAG_START', source, cursor }
      this.state = transition(this.state, event)
      this.updateVisuals()
    })
    // ...
  }
}
```

### Phase 4: Adapter implementieren

```typescript
// adapters/dom-layout-adapter.ts
class DOMLayoutAdapter implements LayoutPort {
  constructor(private layoutInfo: () => Map<string, LayoutRect> | null) {}

  getRect(nodeId: string): Rect | null {
    return this.layoutInfo()?.get(nodeId) ?? null
  }
}

// adapters/dom-style-adapter.ts
class DOMStyleAdapter implements StylePort {
  getLayoutType(element: HTMLElement): LayoutType {
    const style = window.getComputedStyle(element)
    return detectLayoutType(element, style)
  }
}

// adapters/pragmatic-event-adapter.ts
class PragmaticEventAdapter implements EventPort {
  // Wraps @atlaskit/pragmatic-drag-and-drop
}
```

### Phase 5: Tests

```typescript
// Unit Tests - kein DOM
describe('State Machine', () => {
  it('transitions from idle to dragging on DRAG_START', () => {
    const state = transition('idle', { type: 'DRAG_START', ... })
    expect(state).toBe('dragging')
  })
})

// Integration Tests - mit Mock-Adapters
describe('DragDropSystem', () => {
  it('calculates correct drop position', () => {
    const system = new DragDropSystem(
      mockLayoutPort,
      mockStylePort,
      mockEventPort,
      mockVisualPort,
      mockExecutorPort,
      strategies
    )
    // Trigger events via mockEventPort
    // Assert via mockVisualPort
  })
})
```

---

## Aufwandsschätzung

| Phase | Beschreibung | Aufwand |
|-------|--------------|---------|
| 1 | State Machine extrahieren | 2h |
| 2 | Port Interfaces definieren | 1h |
| 3 | System refactoren | 3h |
| 4 | Adapter implementieren | 2h |
| 5 | Tests schreiben | 2h |
| **Total** | | **10h** |

---

## Fortschritt

| Phase | Status | Tests | Details |
|-------|--------|-------|---------|
| 1 | ✅ Abgeschlossen | 43 | `state-machine.ts` - Pure State Machine mit Effects |
| 2 | ✅ Abgeschlossen | 42 | `ports.ts` + `adapters/mock-adapters.ts` |
| 3 | ✅ Abgeschlossen | 41 | `drag-drop-controller.ts` - Neuer testbarer Controller |
| 4 | ✅ Abgeschlossen | 31 | `dom-adapters.ts` - Production DOM Implementations |
| 5 | ✅ Abgeschlossen | 20 | `integration.test.ts` - Full Flow & Adapter Coordination |
| 6 | ✅ Abgeschlossen | 24 | `native-drag-adapter.ts` - ComponentPanel Integration |

### Phase 1: State Machine (abgeschlossen)

**Datei:** `studio/drag-drop/system/state-machine.ts`

Implementiert:
- 4 States: `idle`, `dragging`, `over-target`, `dropped`
- 12 Events: DRAG_START, DRAG_MOVE, DRAG_END, DRAG_CANCEL, TARGET_FOUND, TARGET_LOST, TARGET_UPDATED, ALT_KEY_DOWN/UP, DISABLE, ENABLE, RESET
- 4 Effects: HIDE_VISUALS, EXECUTE_DROP, NOTIFY_DRAG_START, NOTIFY_DRAG_END
- 8 Query-Funktionen: isIdle, isDragging, isOverTarget, isDropped, getSource, getTarget, getResult, canDrop

### Phase 2: Port Interfaces (abgeschlossen)

**Datei:** `studio/drag-drop/system/ports.ts`

Definierte Ports:
- `LayoutPort` - Rect-Daten (layoutInfo/getBoundingClientRect)
- `StylePort` - CSS Styles (getComputedStyle, elementFromPoint)
- `EventPort` - Event-Binding (Drag, Keys)
- `VisualPort` - Visuelles Feedback
- `ExecutionPort` - Code-Modifikation
- `TargetDetectionPort` - Target-Erkennung
- `DragDropPorts` - Combined interface

**Datei:** `studio/drag-drop/system/adapters/mock-adapters.ts`

Mock-Implementierungen für alle Ports mit Test-Helfern.

### Phase 3: DragDropController (abgeschlossen)

**Datei:** `studio/drag-drop/system/drag-drop-controller.ts`

Neuer, vollständig testbarer Controller, der State Machine und Ports kombiniert:
- Koordiniert Events → State Machine → Effects → Ports
- Mode-Debouncing für flex ↔ absolute Übergänge
- Alt-Key Duplicate-Logik (nur für Canvas-Elemente)
- Lifecycle: init(), dispose(), disable(), enable()
- Query-Methoden: getState(), getContext(), isOverValidTarget(), getCurrentResult()

**Test-Datei:** `tests/studio/drag-drop/drag-drop-controller.test.ts`

Test-Kategorien:
- Initialization (3 tests)
- Drag Start (4 tests)
- Target Detection (5 tests)
- Drop Execution (5 tests)
- Drop without Target (3 tests)
- Drag Cancel (4 tests)
- Alt Key / Duplicate (4 tests)
- Disable/Enable (4 tests)
- Dispose (3 tests)
- Query Methods (4 tests)
- Full Drag Sequence (3 tests)

### Phase 4: DOM Adapters (abgeschlossen)

**Datei:** `studio/drag-drop/system/adapters/dom-adapters.ts`

Production-Implementierungen der Port-Interfaces für DOM-Umgebung:

- `createDOMLayoutPort` - Rect-Abfragen via layoutInfo oder DOM-Query
- `createDOMStylePort` - Layout-Type und Direction via getComputedStyle
- `createDOMEventPort` - Event-Handler-Registry mit Keyboard-Unterstützung
- `createDOMVisualPort` - Wraps VisualSystem für Indicator/Outline/Ghost
- `createDOMExecutionPort` - Wraps CodeExecutor für Drop-Ausführung
- `createDOMTargetDetectionPort` - Wraps TargetDetector und StrategyRegistry
- `createDOMPorts` - Factory-Funktion für alle Ports

**Test-Datei:** `tests/studio/drag-drop/dom-adapters.test.ts`

Test-Kategorien:
- DOMLayoutPort (6 tests)
- DOMStylePort (6 tests)
- DOMEventPort (7 tests)
- DOMVisualPort (5 tests)
- DOMTargetDetectionPort (5 tests)
- createDOMPorts (2 tests)

### Phase 5: Integration Tests (abgeschlossen)

**Datei:** `tests/studio/drag-drop/integration.test.ts`

End-to-End Tests für das gesamte Drag-Drop-System:

- Full Drag-Drop Flow (Palette → Canvas)
- Canvas Element Reordering
- Alt Key Duplicate Mode
- Disable/Enable Lifecycle
- DOM Adapter Coordination
- Strategy Selection (Flex, Positioned)

**Test-Kategorien:**
- Full Drag-Drop Flow (6 tests)
- Canvas Element Reordering (2 tests)
- Alt Key Duplicate Mode (2 tests)
- Disable/Enable (3 tests)
- DOM Adapter Coordination (4 tests)
- Strategy Selection (3 tests)

### Phase 6: Native Drag Adapter (abgeschlossen)

**Datei:** `studio/drag-drop/system/adapters/native-drag-adapter.ts`

Brücke zwischen ComponentPanel (HTML5 Drag) und DragDropController:

```
ComponentPanel (dragstart)
      │
      ▼ dataTransfer.setData('application/mirror-component', ...)
      │
NativeDragAdapter (dragover/drop auf Container)
      │
      ▼ triggerDragStart/Move/End/Cancel
      │
EventPort → DragDropController
```

Features:
- Erkennt `application/mirror-component` MIME-Type
- Extrahiert DragSource aus DataTransfer
- Konvertiert HTML5 Events → EventPort Aufrufe
- Unterstützt Disable-State
- Testet mit Mock-DragEvents

**Test-Datei:** `tests/studio/drag-drop/native-drag-adapter.test.ts`

Test-Kategorien:
- Initialization (4 tests)
- Drag Start (4 tests)
- Drag Move (3 tests)
- Drag End/Drop (3 tests)
- Drag Cancel (3 tests)
- Disabled State (1 test)
- Non-Mirror Drags (2 tests)
- Custom Size Provider (1 test)
- Integration with DragDropController (3 tests)

---

## Refactoring Abgeschlossen

Alle 6 Phasen sind abgeschlossen. Das System hat jetzt:

- **201 neue Tests** (43 + 42 + 41 + 31 + 20 + 24)
- **439 Tests insgesamt** für Drag & Drop
- **Best-in-Class Testbarkeit** durch Hexagonal Architecture
- **Pure State Machine** ohne DOM-Abhängigkeiten
- **Mock Adapters** für schnelle Unit-Tests
- **DOM Adapters** für Production
- **Native Drag Adapter** für ComponentPanel Integration

---

## Risiken

1. **Breaking Changes:** Event-Timing könnte sich ändern
2. **Pragmatic DnD:** Library-spezifisches Verhalten muss erhalten bleiben
3. **Mode-Debouncing:** Komplexe Timing-Logik muss korrekt migriert werden
4. **Native HTML5:** Parallele Event-Handler müssen funktionieren

---

## Empfehlung

**Schrittweise vorgehen:**

1. **State Machine first** - größter Testbarkeits-Gewinn
2. **Ports second** - formalisiert bestehende Abstraktionen
3. **System refactor last** - höchstes Risiko

Jede Phase einzeln deployen und testen.
