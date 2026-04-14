# Drag & Drop System - Technische Dokumentation

> Stand: April 2026

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#architektur)
2. [DragDropSystem - Der Monolith](#dragdropsystem---der-monolith)
3. [Strategy Pattern](#strategy-pattern)
4. [Visual System](#visual-system)
5. [Code Executor](#code-executor)
6. [State Machine (ungenutzt)](#state-machine)
7. [Ports & Adapters](#ports--adapters)
8. [Performance Optimierungen](#performance-optimierungen)
9. [Edge Cases & Schwachstellen](#edge-cases--schwachstellen)
10. [Test Coverage](#test-coverage)
11. [ComponentPanel Integration](#componentpanel-integration)

---

## Architektur

```
ComponentPanel / Preview Canvas
        ↓
   DragDropSystem (995 Zeilen Monolith)
        ↓
   ┌────┴────┐
   ↓         ↓
Pragmatic   Native HTML5
   DnD      Events
   ↓         ↓
   └────┬────┘
        ↓
   Target Detection → Strategy Selection → Visual Feedback → Code Execution
```

### Komponenten

| Komponente          | Datei                                             | Beschreibung                                     |
| ------------------- | ------------------------------------------------- | ------------------------------------------------ |
| DragDropSystem      | `studio/drag-drop/system/drag-drop-system.ts`     | Hauptorchestrator (Legacy, 995 Zeilen)           |
| DragDropController  | `studio/drag-drop/system/drag-drop-controller.ts` | Neue hexagonale Architektur (v2, nicht deployed) |
| State Machine       | `studio/drag-drop/system/state-machine.ts`        | Pure State Machine (nicht genutzt)               |
| Ports               | `studio/drag-drop/system/ports.ts`                | Interface-Definitionen                           |
| Target Detector     | `studio/drag-drop/system/target-detector.ts`      | DOM-Analyse                                      |
| Adapters            | `studio/drag-drop/system/adapters/`               | DOM/Mock/Native Adapters                         |
| Visual System       | `studio/drag-drop/visual/system.ts`               | Linien, Ghost, Outline                           |
| Code Executor       | `studio/drag-drop/executor/code-executor.ts`      | CodeModifier Integration                         |
| Editor Drop Handler | `studio/editor/editor-drop-handler.ts`            | CodeMirror Drop-Handler                          |
| Drag Preview        | `studio/preview/drag-preview.ts`                  | Einfacher Placeholder während Drag               |

## Drag Sources

| Quelle                              | Typ       | Datenstruktur                                                              |
| ----------------------------------- | --------- | -------------------------------------------------------------------------- |
| **ComponentPanel** - Primitives     | `palette` | `{ type: 'palette', componentName, properties?, textContent?, children? }` |
| **ComponentPanel** - Zag Components | `palette` | Wie oben + Template mit Slots                                              |
| **ComponentPanel** - Layout Presets | `palette` | Wie oben                                                                   |
| **Preview Canvas** - Elemente       | `canvas`  | `{ type: 'canvas', nodeId, element }`                                      |

## Drop Targets

| Ziel                         | Layout-Typ | Strategy           | Ergebnis                           | Visualisierung             |
| ---------------------------- | ---------- | ------------------ | ---------------------------------- | -------------------------- |
| Flex Container (leer)        | flex       | `SimpleInside`     | `placement: 'inside'`              | Blaue gestrichelte Outline |
| Flex Container (mit Kindern) | flex       | `FlexWithChildren` | `placement: 'before'/'after'`      | Insertion Line             |
| Positioned Container         | positioned | `AbsolutePosition` | `placement: 'absolute'` + `{x, y}` | Lila Ghost                 |
| Leaf-Elemente                | none       | `NonContainer`     | `placement: 'before'/'after'`      | Insertion Line             |
| CodeMirror Editor            | -          | -                  | Cursor Position                    | Drop Indicator             |

## Strategien

```
studio/drag-drop/strategies/
├── flex-with-children.ts    # Flex Container mit Kindern
├── simple-inside.ts         # Leere Container
├── non-container.ts         # Leaf-Elemente (Text, Button, etc.)
└── absolute-position.ts     # Stacked/Positioned Container
```

Jede Strategie implementiert:

```typescript
interface DropStrategy {
  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource,
    childRects: DOMRect[]
  ): DropResult
}
```

---

## DragDropSystem - Der Monolith

Der `DragDropSystem` ist mit 995 Zeilen der zentrale Orchestrator. Er verwaltet State direkt auf der Klasse statt über die vorbereitete State Machine.

### State Variablen

```typescript
private state: DragState = {
  isActive: boolean              // Ist Drag aktiv?
  source: DragSource | null      // Quelle (palette oder canvas)
  currentTarget: DropTarget | null
  currentResult: DropResult | null
  isAltKeyPressed: boolean       // Für Alt+Drop = Duplicate
}

// Mode Transition State
private currentMode: DropMode | null = null  // 'flex' | 'absolute'
private lastStableModel: { result, mode } | null
private modeTransitionTimer: ReturnType<setTimeout> | null
```

### Event-Handler Setup

Drei verschiedene Handler-Systeme werden parallel verwendet:

#### A) Pragmatic DnD Monitor

```typescript
monitorForElements({
  onDragStart:   // source.element, source.data
  onDrag:        // location.current.input (aber nicht genutzt!)
  onDrop:        // führt executeDrop aus
})
```

**Besonderheit**: `onDrag` wird aufgerufen, macht aber nichts. `updateDropIndicator` wird stattdessen im `dropTarget` Handler aufgerufen.

#### B) Drop Target (Event Delegation)

```typescript
dropTargetForElements({
  element: container, // Event Delegation auf Container
  canDrop,
  onDragEnter, // updateDropIndicator
  onDrag, // updateDropIndicator
  onDragLeave, // hideIndicator
  onDrop, // (noop - wird vom Monitor behandelt)
})
```

#### C) Native HTML5 Drag Events

```typescript
container.addEventListener('dragover', handleDragOver)
container.addEventListener('dragenter', handleDragEnter)
container.addEventListener('dragleave', handleDragLeave)
container.addEventListener('drop', handleDrop)
```

**Problem**: Native Handlers und Pragmatic DnD können beide feuern → Double execution Prevention via `this.dropExecuted` Flag.

### updateDropIndicator - Die Kernfunktion

Diese Funktion wird bei jedem Drag-Move aufgerufen:

```typescript
private updateDropIndicator(input: { clientX, clientY }): void {
  // 1. Cursor Position in Point umwandeln
  const cursor = { x: input.clientX, y: input.clientY }

  // 2. Element unter Cursor finden
  const elementUnderCursor = document.elementFromPoint(cursor.x, cursor.y)

  // 3. Nächstes Drop Target finden (Up the DOM tree)
  let target = findClosestTarget(elementUnderCursor, this.nodeIdAttr)

  // 4. Strategy für Target finden
  const strategy = this.registry.findStrategy(target)

  // 5. Child Rects holen (cache via layoutInfo)
  const childRects = getChildRects(target.element, this.nodeIdAttr, layoutInfo)

  // 6. Strategy.calculate() - Placement bestimmen
  let calcResult = strategy.calculate(cursor, target, source, childRects, containerRect)

  // 7. Container Redirect Check
  // Wenn Cursor unter einem Flex-Container, zum Container hinzufügen
  // statt zum nächsten Sibling (30px Threshold)

  // 8. Mode Transition Handling
  // Bei flex ↔ absolute Wechsel: 80ms Debounce Timer

  // 9. Visual Hint generieren und anzeigen
  const visualHint = strategy.getVisualHint(effectiveResult, childRects, containerRect)
  this.visual.showIndicator(visualHint)
  this.visual.showParentOutline(containerRect)
}
```

**Key Insights**:

- `document.elementFromPoint()` wird bei JEDEM Move aufgerufen
- layoutInfo Caching (Phase 5) spart DOM-Reads
- Mode Transition Debounce (80ms) verhindert visuelles Flackern
- Container Redirect verbessert UX für nested containers

### executeDrop Flow

```typescript
private executeDrop(source: DragSource, result: DropResult): { success, error? } {
  // 1. Double-Execution Prevention
  if (this.dropExecuted) return { success: false }
  this.dropExecuted = true

  // 2. Code Executor aufrufen
  const executor = this.config.codeExecutor

  // 3. Entscheiden: Move, Add oder Duplicate?
  if (this.config.enableAltDuplicate && this.state.isAltKeyPressed && source.type === 'canvas') {
    execResult = executor.duplicate(source, result)
  } else {
    execResult = executor.execute(source, result)
  }

  // 4. Callbacks und State Reset
  this.config.onDrop?.(source, result)
  this.resetState()

  return execResult
}
```

---

## Strategy Pattern

### Registry und Matching-Reihenfolge

```typescript
// Reihenfolge ist kritisch - erste Match gewinnt!
registry.register(new AbsolutePositionStrategy()) // 1. Positioned (stacked)
registry.register(new FlexWithChildrenStrategy()) // 2. Flex mit Children
registry.register(new SimpleInsideStrategy()) // 3. Leere Flex Container
registry.register(new NonContainerStrategy()) // 4. Leaf elements
```

### AbsolutePositionStrategy

**Matches**: `target.layoutType === 'positioned'` (stacked containers)

```typescript
calculate(cursor, target, source, _, containerRect):
  // Position RELATIV zum Container berechnen
  relativeX = cursor.x - rect.x + scrollLeft
  relativeY = cursor.y - rect.y + scrollTop

  // Ghost Größe holen (aus source.size oder DEFAULT 100x40)
  ghostSize = source.size ?? { width: 100, height: 40 }

  // Auf Cursor zentrieren und in Container-Grenzen clampen
  centeredX = Math.max(0, relativeX - ghostSize.width / 2)
  centeredY = Math.max(0, relativeY - ghostSize.height / 2)

  return {
    placement: 'absolute',
    position: { x: centeredX, y: centeredY }
  }
```

**Visual**: Ghost Indicator (lila Rechteck)

### FlexWithChildrenStrategy

**Matches**: `target.layoutType === 'flex' && target.hasChildren`

```typescript
calculate(cursor, target, source, childRects):
  // Nächstes Kind zum Cursor finden (basierend auf Richtung)
  for each child:
    center = rect.y + rect.height / 2  // bei vertical
    distance = Math.abs(cursor.y - center)
    // Track closestIndex und closestDistance

  // Before/after anhand der Cursor-Position relativ zur Mittellinie
  placement = cursor.y < rect.center ? 'before' : 'after'

  // No-Op Detection
  isNoOp = (insertionIndex === sourceIndex || insertionIndex === sourceIndex + 1)

  return { placement, targetId, insertionIndex, isNoOp }

getVisualHint(result, childRects):
  // Insertion Line bei Gap Midpoint zwischen Kindern
  if (insertionIndex === 0):
    linePos = firstChild.rect.y
  else if (insertionIndex >= childRects.length):
    linePos = lastChild.bottom
  else:
    // Midpoint zwischen zwei Kindern
    linePos = (prevChild.bottom + nextChild.top) / 2

  return { type: 'line', direction: 'horizontal', rect: ... }
```

**Visual**: Blaue Insertion Line

### SimpleInsideStrategy

**Matches**: `target.layoutType === 'flex' && !target.hasChildren`

```typescript
calculate():
  return { placement: 'inside', targetId, insertionIndex: 0 }

getVisualHint():
  return { type: 'outline', rect: containerRect }
```

**Visual**: Gestrichelte blaue Outline

### NonContainerStrategy

**Matches**: `target.layoutType === 'none'` (Text, Button, Input, etc.)

```typescript
calculate(cursor, target):
  midY = rect.y + rect.height / 2
  placement = cursor.y < midY ? 'before' : 'after'
  return { placement, targetId }
```

**Visual**: Horizontale Linie am oberen oder unteren Rand

---

## Visual System

### Indicator Types

```typescript
showIndicator(hint: VisualHint):
  switch (hint.type):
    case 'ghost':
      // Purple dashed rectangle (absolute positioning)
      border: 2px dashed #8b5cf6
    case 'line':
      // Blaue horizontale/vertikale Linie
      background: #5BA8F5
      box-shadow: 0 0 4px rgba(59, 130, 246, 0.5)
    case 'outline':
      // Dashed Border um Container
      border: 2px dashed #5BA8F5
      border-radius: 4px
```

### Visual State Tracking (Test API)

```typescript
private _indicatorVisible: boolean
private _indicatorRect: Rect | null
private _parentOutlineVisible: boolean
private _ghostVisible: boolean

getState(): {
  indicatorVisible, indicatorRect,
  parentOutlineVisible, parentOutlineRect,
  ghostVisible, ghostRect
}
```

---

## Code Executor

### Architektur

```typescript
export interface CodeExecutorDependencies {
  getSource(): string // Editor-Inhalt
  getResolvedSource(): string // Prelude + Editor
  getPreludeOffset(): number // Offset des Prelude
  getSourceMap(): SourceMap | null // Von letztem Compile
  applyChange(source: string): void
  recompile(): Promise<void>
  createModifier(source, map): CodeModifier
}
```

### Palette Drop (neues Element)

```typescript
executePaletteDrop(modifier, source, result):
  // 1. Template Lookup
  template = getComponentTemplate(source.componentId, fileType)

  // 2. Bei absolute: x/y in Template injizieren
  if (result.placement === 'absolute'):
    adjustedTemplate = template + ` x ${pos.x}, y ${pos.y}`

  // 3. Placement basiert einfügen
  switch (result.placement):
    case 'before'/'after':
      modifier.addChildWithTemplateRelativeTo(targetId, template, placement)
    case 'inside':
      modifier.addChildWithTemplate(nodeId, template, { position: insertionIndex })
    case 'absolute':
      modifier.addChildWithTemplate(nodeId, template, { position: 'last' })
```

### Canvas Drop (Move)

```typescript
executeCanvasDrop(modifier, source, result):
  switch (result.placement):
    case 'before'/'after':
      modifier.moveNode(source.nodeId, targetId, placement)
    case 'inside':
      modifier.moveNode(source.nodeId, targetId, 'inside', insertionIndex)
    case 'absolute':
      // Mit x/y Properties updaten
      modifier.moveNode(source.nodeId, targetId, 'inside', undefined, {
        properties: `x ${result.position.x}, y ${result.position.y}`
      })
```

---

## State Machine

Die State Machine ist **vollständig implementiert aber nicht genutzt**!

### Design

```typescript
// States
type DragState = IdleState | DraggingState | OverTargetState | DroppedState

// Events
type DragEvent =
  | { type: 'DRAG_START'; source; cursor }
  | { type: 'DRAG_MOVE'; cursor }
  | { type: 'DRAG_END' }
  | { type: 'TARGET_FOUND'; target; result }
  | { type: 'TARGET_LOST' }
  | { type: 'ALT_KEY_DOWN' | 'ALT_KEY_UP' }

// Effects (für Orchestrator)
type Effect =
  | { type: 'HIDE_VISUALS' }
  | { type: 'EXECUTE_DROP'; source; result }
  | { type: 'NOTIFY_DRAG_START' | 'NOTIFY_DRAG_END' }
```

### Warum wird sie nicht genutzt?

1. **DragDropSystem verwaltet State direkt** via `this.state`
2. State Machine wurde für **Planung/Design** erstellt
3. Refactoring würde nur `transition()` Calls hinzufügen
4. Klasse ist bereits funktional

**Empfehlung**: Entweder State Machine entfernen (Dead Code) oder DragDropSystem refaktorieren um sie zu nutzen.

---

## Ports & Adapters

### DOM Adapter

```typescript
export interface DOMAdapter {
  getComputedStyle(element: HTMLElement): CSSStyleDeclaration
  elementFromPoint(x: number, y: number): Element | null
  getBoundingClientRect(element: HTMLElement): DOMRect
}

const defaultDOMAdapter: DOMAdapter = {
  getComputedStyle: el => window.getComputedStyle(el),
  elementFromPoint: (x, y) => document.elementFromPoint(x, y),
  getBoundingClientRect: el => el.getBoundingClientRect(),
}
```

**Ziel**: Tests ohne echtes DOM möglich

### Code Executor Port

```typescript
export interface CodeExecutor {
  execute(source: DragSource, result: DropResult): ExecutionResult
  duplicate(source: DragSource, result: DropResult): ExecutionResult
}
```

---

## Performance Optimierungen

### Phase 5: layoutInfo Caching

```typescript
// In updateDropIndicator:
const layoutInfo = this.config.getLayoutInfo?.() // Map<nodeId, LayoutRect>

// OHNE layoutInfo:
const childRects = getChildRects(target.element, nodeIdAttr)
// → for child in container.children → getBoundingClientRect()

// MIT layoutInfo:
if (layoutInfo) {
  for (const [nodeId, layout] of layoutInfo) {
    if (layout.parentId === containerId) {
      children.push({ nodeId, rect: layout })
    }
  }
}
```

**Benefit**: ~60% schneller bei großen Bäumen, keine DOM-Reads während drag

---

## Edge Cases & Schwachstellen

### 1. Double-Execution Prevention

```typescript
if (this.dropExecuted) return { success: false }
this.dropExecuted = true
```

**Problem**: Flag-basiert, fragil

### 2. Mode Transition Debounce

```typescript
if (this.currentMode === newMode) {
  this.clearModeTransitionTimer()
  this.lastStableModel = { result, mode }
  return false
}

if (!this.modeTransitionTimer) {
  this.modeTransitionTimer = setTimeout(() => {
    this.currentMode = newMode
  }, 80)
}
```

**Problem**: Bei schnellem hin/her zwischen Modes könnte Timer mehrmals neugestartet werden

### 3. Hardcoded Leaf Components

```typescript
const LEAF_COMPONENTS = new Set([
  'text',
  'muted',
  'title',
  'label',
  'button',
  'link',
  'input',
  'textarea',
  'image',
  'img',
  'icon',
  'divider',
  'spacer',
])
```

**Problem**: Muss manuell aktualisiert werden bei neuen Komponenten

### 4. Container Redirect Threshold

30px Threshold ist hardcoded - edge-case anfällig bei kleinen Containern

---

## Kompletter Drag-Cycle

```
1. User drückt Maus auf Element
   ↓ draggable() oder native drag handler
   ↓ source = { type: 'canvas' | 'palette', ... }

2. monitorForElements.onDragStart()
   ↓ this.state.isActive = true
   ↓ this.state.source = dragSource

3. User bewegt Maus über Container
   ↓ dropTargetForElements.onDrag()
   ↓ updateDropIndicator(clientX, clientY)
     ├─ document.elementFromPoint() → element
     ├─ findClosestTarget() → target
     ├─ registry.findStrategy(target) → strategy
     ├─ strategy.calculate() → DropResult
     ├─ checkContainerRedirect()
     ├─ handleModeTransition()
     └─ visual.showIndicator(hint)

4. User lässt Maus los
   ↓ monitorForElements.onDrop()
   ↓ executeDrop(source, currentResult)
     ├─ codeExecutor.execute()
     ├─ applyChange(newSource)
     └─ recompile()

5. State Reset
   ↓ visual.clear()
   ↓ this.resetState()
```

## Datenfluss

### Palette → Preview (Component hinzufügen)

```
1. ComponentPanel: dragstart
   → sets dataTransfer('application/mirror-component', JSON)

2. DragDropSystem: setupNativeDragHandlers
   → listens on container for dragover/drop

3. Native Handler: dragover
   → extractNativeDragSource(e) → DragSource
   → this.state.source = source

4. updateDropIndicator(cursor)
   → findClosestTarget() → DropTarget
   → strategy.calculate(cursor, target, source, childRects)

5. Strategy Result: DropResult
   → { target, placement, targetId, insertionIndex, position? }

6. Visual Feedback
   → visual.showIndicator(VisualHint)

7. Drop Handler
   → executeDrop(source, result)
   → CodeExecutor.execute(source, result)
   → CodeModifier.addElement(code)
   → applyChange(newSource)
   → recompile()
```

### Canvas → Canvas (Move/Duplicate)

```
1. Preview Element: dragstart (Pragmatic DnD)
   → draggable({ getInitialData: () => ({ type: 'canvas', nodeId }) })

2. monitorForElements.onDragStart
   → this.state.source = dragSource

3. dropTargetForElements.onDrag
   → updateDropIndicator(cursor)

4. Drop mit Alt-Taste
   → executor.duplicate(source, result)
   → CodeModifier.duplicateElement(nodeId)
```

## Events

### Pragmatic DnD (Canvas Elements)

```typescript
draggable({ element, getInitialData })
dropTargetForElements({ element, canDrop, onDragEnter, onDrag, onDragLeave, onDrop })
monitorForElements({ onDragStart, onDrag, onDrop })
```

### Native HTML5 (ComponentPanel)

```typescript
dragover   → extractNativeDragSource() → state.source
dragenter  → preventDefault()
dragleave  → visual.hideIndicator()
drop       → JSON.parse(dataTransfer.getData('application/mirror-component'))
```

### Keyboard

```typescript
keydown 'Alt'  → state.isAltKeyPressed = true  → duplicate statt move
keyup 'Alt'    → state.isAltKeyPressed = false
```

## Bekannte Probleme

### Architektur

| Problem                      | Status | Beschreibung                                                                  |
| ---------------------------- | ------ | ----------------------------------------------------------------------------- |
| Monolith                     | ⚠️     | DragDropSystem ist 995 Zeilen, mischt alles zusammen                          |
| v2 nicht deployed            | ⚠️     | DragDropController, State Machine, Ports existieren aber werden nicht genutzt |
| Redundante Implementierungen | ⚠️     | Legacy System + Native Adapter parallel                                       |
| Direkte DOM-Calls            | ⚠️     | System nutzt Ports nicht konsequent                                           |

### Funktional

| Problem              | Status | Beschreibung                            |
| -------------------- | ------ | --------------------------------------- |
| Mode Debouncing      | ✅     | 80ms Debounce für flex↔absolute Wechsel |
| Double Execution     | ✅     | Flag verhindert doppelte Ausführung     |
| Container Redirect   | ⚠️     | 30px Threshold, edge-case anfällig      |
| Editor Drop Position | ⚠️     | Nutzt Cursor statt Maus-Koordinaten     |

## Neue Architektur (v2)

Die hexagonale Architektur ist vorbereitet aber nicht integriert:

```
┌────────────────────────────────────────────────────────┐
│              DragDropController                        │
│  (testbar, pure state machine + ports)                │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌─────────────┐      ┌─────────────────┐            │
│   │ State       │      │  Ports          │            │
│   │ Machine     │      │  - EventPort    │            │
│   │ (pure)      │      │  - LayoutPort   │            │
│   │             │      │  - StylePort    │            │
│   │ transition()│      │  - VisualPort   │            │
│   └─────────────┘      │  - ExecutionPort│            │
│                        └─────────────────┘            │
│                              │                        │
│         ┌────────────────────┴───────────────────┐   │
│         │                                        │    │
│    ┌──────────────┐  ┌──────────────┐  ┌────────┐   │
│    │ DOM Adapters │  │ Mock Adapters│  │ Native │   │
│    │ (production) │  │ (testing)    │  │Adapter │   │
│    └──────────────┘  └──────────────┘  └────────┘   │
└────────────────────────────────────────────────────────┘
```

### Vorteile v2

- Pure State Machine, vollständig testbar
- Adapters für DOM/Mock/Native
- Klare Trennung von Concerns
- Einfacher zu erweitern

### Migration

Die Migration erfordert:

1. DragDropController als Ersatz für DragDropSystem integrieren
2. Alle DOM-Calls über Ports routen
3. State Machine für Zustandsübergänge nutzen
4. Legacy-Code entfernen

## Test Coverage

```
tests/studio/drag-drop/
├── controller.test.ts       # Controller Tests (v2 Architektur)
├── state-machine.test.ts    # State Machine Tests (pure functions)
├── strategies/              # Strategy Tests
│   ├── flex-with-children.test.ts
│   ├── simple-inside.test.ts
│   ├── non-container.test.ts
│   └── absolute-position.test.ts
└── adapters/                # Adapter Tests
    ├── dom-adapter.test.ts
    ├── mock-adapter.test.ts
    └── native-adapter.test.ts

tests/e2e/
└── drag-drop.spec.ts        # E2E Tests (Playwright)
```

### Test-Strategie

| Ebene       | Scope                     | Tools                 |
| ----------- | ------------------------- | --------------------- |
| Unit        | State Machine, Strategies | Vitest, Mock Adapters |
| Integration | Controller + Adapters     | Vitest, JSDOM         |
| E2E         | Full Drag & Drop Flow     | Playwright            |

### Mock System

Die v2-Architektur ermöglicht vollständige Testbarkeit durch Mock-Adapters:

```typescript
// tests/studio/drag-drop/adapters/mock-adapter.ts
export class MockDOMAdapter implements DOMPort {
  elements: Map<string, MockElement> = new Map()

  getElement(nodeId: string): MockElement | null {
    return this.elements.get(nodeId) ?? null
  }

  getBoundingRect(element: MockElement): DOMRect {
    return element.rect
  }
}

export class MockVisualAdapter implements VisualPort {
  indicators: VisualHint[] = []

  showIndicator(hint: VisualHint): void {
    this.indicators.push(hint)
  }

  hideIndicator(): void {
    this.indicators = []
  }
}
```

### Test-Patterns

```typescript
// Strategy Test Pattern
describe('FlexWithChildrenStrategy', () => {
  it('calculates insertion before first child', () => {
    const childRects = [mockRect(0, 0, 100, 50), mockRect(0, 50, 100, 50)]
    const cursor = { x: 50, y: 10 }

    const result = strategy.calculate(cursor, target, source, childRects)

    expect(result.placement).toBe('before')
    expect(result.insertionIndex).toBe(0)
  })
})

// State Machine Test Pattern
describe('DragDropStateMachine', () => {
  it('transitions from idle to dragging', () => {
    const machine = createStateMachine()

    const nextState = machine.transition('idle', { type: 'DRAG_START', source })

    expect(nextState.value).toBe('dragging')
    expect(nextState.context.source).toBe(source)
  })
})
```

## ComponentPanel Integration

### Drag-Initiierung

Das ComponentPanel startet Drags über native HTML5 Events:

```typescript
// studio/panels/components/component-panel.ts
export class ComponentPanel {
  private setupDragHandlers(item: ComponentItem, element: HTMLElement): void {
    element.draggable = true

    element.addEventListener('dragstart', e => {
      // Drag-Daten setzen
      const dragData: ComponentDragData = {
        type: 'palette',
        componentName: item.name,
        template: item.template,
        properties: item.properties,
        textContent: item.textContent,
        children: item.children,
      }

      e.dataTransfer?.setData('application/mirror-component', JSON.stringify(dragData))

      // Drag data global speichern (für DragPreview)
      setCurrentDragData(dragData, item)

      // Event emittieren
      events.emit('component:drag-start', { item, event: e })
    })

    element.addEventListener('dragend', e => {
      clearCurrentDragData()
      events.emit('component:drag-end', { item, event: e })
    })
  }
}
```

### Drag Preview

> **Hinweis:** Der GhostRenderer wurde entfernt (April 2026). Da nur Flex-Container (nicht Stacked-Container) Drag & Drop unterstützen, wird kein gerendertes Komponenten-Preview mehr benötigt.

Der DragPreview zeigt einen einfachen Placeholder mit dem Komponentennamen:

```typescript
// studio/preview/drag-preview.ts
export class DragPreview {
  private ghostElement: HTMLElement | null = null

  private showGhost(item: ComponentItem, x: number, y: number): void {
    if (!this.ghostElement) {
      this.ghostElement = document.createElement('div')
      this.ghostElement.id = 'drag-preview-ghost'
      document.body.appendChild(this.ghostElement)
    }

    // Einfacher Placeholder statt gerenderter Komponente
    Object.assign(this.ghostElement.style, {
      position: 'fixed',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '6px',
      padding: '10px 16px',
      color: 'white',
      fontSize: '14px',
    })

    this.ghostElement.textContent = item.name
  }
}
```

### Datenstruktur

```typescript
// studio/panels/components/types.ts
export interface ComponentDragData {
  type: 'palette'
  componentName: string
  template: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]
}

export interface ComponentChild {
  name: string
  template: string
  properties?: string
}

export interface ComponentItem {
  id: string
  name: string
  template: string
  category?: string
  icon?: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]
  defaultSize?: { width: number; height: number }
}
```

### NativeDragAdapter Bridge

Der NativeDragAdapter bildet die Brücke zwischen HTML5 Drag Events und dem DragDropSystem:

```typescript
// studio/drag-drop/system/adapters/native-adapter.ts
export class NativeDragAdapter {
  extractDragSource(event: DragEvent): DragSource | null {
    const data = event.dataTransfer?.getData('application/mirror-component')
    if (!data) return null

    try {
      const parsed = JSON.parse(data) as ComponentDragData
      return {
        type: 'palette',
        componentName: parsed.componentName,
        template: parsed.template,
        properties: parsed.properties,
        textContent: parsed.textContent,
        children: parsed.children,
      }
    } catch {
      return null
    }
  }
}
```

### Event-Flow: ComponentPanel → Preview

```
┌─────────────────┐
│  ComponentPanel │
│                 │
│  [Button] ←─────────── User starts drag
│                 │
└────────┬────────┘
         │ dragstart
         │ setData('application/mirror-component', JSON)
         │ setCurrentDragData()
         ▼
┌─────────────────┐
│  Preview Canvas │
│                 │
│  dragover ──────────→ NativeDragAdapter.extractDragSource()
│                 │     DragDropSystem.state.source = source
│                 │     updateDropIndicator(cursor)
│                 │
│  drop ──────────────→ executeDrop(source, result)
│                 │     CodeExecutor.addElement()
│                 │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Code Editor   │
│                 │
│  Source updated │
│  Recompile      │
│                 │
└─────────────────┘
```

---

## Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────┐
│ USER EVENTS (Native & Pragmatic DnD)                        │
├─────────────────────────────────────────────────────────────┤
│ DragDropSystem                                              │
│  ├─ setupMonitor() → monitorForElements                     │
│  ├─ setupDropTarget() → dropTargetForElements (delegation)  │
│  ├─ setupNativeDragHandlers() → dragover/drop events        │
│  └─ updateDropIndicator() [CORE]                            │
│      ├─ document.elementFromPoint()                         │
│      ├─ findClosestTarget() [walk up DOM tree]              │
│      ├─ registry.findStrategy(target)                       │
│      └─ strategy.calculate() → DropResult                   │
├─────────────────────────────────────────────────────────────┤
│ Strategy Registry                                           │
│  ├─ AbsolutePositionStrategy (positioned containers)        │
│  ├─ FlexWithChildrenStrategy (flex with children)           │
│  ├─ SimpleInsideStrategy (empty flex)                       │
│  └─ NonContainerStrategy (leaf elements)                    │
├─────────────────────────────────────────────────────────────┤
│ Visual System                                               │
│  ├─ showIndicator() → line|outline|ghost                    │
│  ├─ showParentOutline()                                     │
│  └─ clear()                                                 │
├─────────────────────────────────────────────────────────────┤
│ Code Executor                                               │
│  ├─ execute() → modifier.addChild...() / moveNode()         │
│  ├─ duplicate() → modifier.duplicateNode()                  │
│  └─ applyChange() + recompile()                             │
├─────────────────────────────────────────────────────────────┤
│ Adapters (Abstraction)                                      │
│  ├─ DOMAdapter { getComputedStyle, elementFromPoint, ... }  │
│  ├─ CodeExecutor Port                                       │
│  └─ Test API                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Zusammenfassung

### Stärken

| Aspekt                 | Beschreibung                              |
| ---------------------- | ----------------------------------------- |
| ✅ Strategy Pattern    | Saubere Trennung der Platzierungslogik    |
| ✅ Adapter Pattern     | Abstraktion für Tests und Erweiterbarkeit |
| ✅ Event Delegation    | Effiziente Handler auf Container-Ebene    |
| ✅ Flexible Placements | before, after, inside, absolute (x/y)     |
| ✅ Visual Feedback     | Linien, Outlines, Ghost Indicators        |
| ✅ Phase 5 Ready       | layoutInfo Caching für Performance        |
| ✅ Test API            | Vollständige programmatische Kontrolle    |

### Schwächen

| Problem                     | Status | Beschreibung                          |
| --------------------------- | ------ | ------------------------------------- |
| 995 Zeilen Monolith         | ⚠️     | Zu viel Verantwortung in einer Klasse |
| Ungenutzter State Machine   | ⚠️     | Dead Code oder unfertige Refactorings |
| Double-Execution Prevention | ⚠️     | Flag-basiert, fragil                  |
| Hardcoded Leaf Components   | ⚠️     | Dynamische Konfiguration wäre besser  |
| Mode Transition Debounce    | ⚠️     | Könnte Timing-Issues haben            |
| Container Redirect          | ⚠️     | 30px Threshold ist edge-case anfällig |

### Verbesserungspotential

1. **State Machine Integration** - Echte Verwendung der vorbereiteten State Machine
2. **Decorator Pattern für Strategies** - Vor/Nach Hooks für Erweiterungen
3. **Event Bus** - Statt direkter Callbacks für bessere Entkopplung
4. **Lazy Element Detection** - Nur Kandidaten prüfen statt `elementFromPoint` bei jedem Move
5. **Configuration API für Leaf Components** - Dynamische Registrierung
6. **DragDropSystem aufteilen** - Separate Concerns in eigene Klassen

### Empfohlene Refactoring-Schritte

1. State Machine aktivieren oder entfernen (Dead Code eliminieren)
2. DragDropSystem in kleinere Klassen aufteilen
3. Leaf Components dynamisch konfigurierbar machen
4. Double-Execution Prevention robuster implementieren

---

## Weiterführende Dokumentation

- `docs/concepts/drag-drop-architecture.md` - Detaillierte Architektur-Analyse (geplant)
- `docs/concepts/drag-drop-use-cases.md` - Use Case Katalog (geplant)
- `docs/concepts/drag-drop-testability.md` - Test-Strategie (geplant)
- `docs/concepts/drag-drop-absolute-positioning.md` - Absolute Positioning Guide (geplant)
