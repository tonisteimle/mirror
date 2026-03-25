# Drag & Drop Redesign - Architektur-Konzept

## 1. Design-Prinzipien

### 1.1 Separation of Concerns
```
┌─────────────────────────────────────────────────────────────┐
│  Input Layer         Was wird gedraggt?                     │
│  (Drag Sources)      Woher kommt es?                        │
├─────────────────────────────────────────────────────────────┤
│  Detection Layer     Wo ist der Cursor?                     │
│  (Drop Zones)        Was ist das Ziel?                      │
├─────────────────────────────────────────────────────────────┤
│  Decision Layer      Welches Placement?                     │
│  (Strategies)        Welche Code-Änderung?                  │
├─────────────────────────────────────────────────────────────┤
│  Visual Layer        Ghost, Indicators, Guides              │
│  (Renderers)                                                │
├─────────────────────────────────────────────────────────────┤
│  Output Layer        CodeModifier aufrufen                  │
│  (Execution)         Events emittieren                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Single Source of Truth
- **Ein** Drag-State (nicht zwei parallele Systeme)
- **Ein** Weg für Visual Feedback
- **Ein** Weg für Code-Änderungen

### 1.3 Testbarkeit
- Reine Funktionen für Berechnungen
- DOM-Interaktion isoliert in dünner Schicht
- Mocking-freundliche Interfaces

---

## 2. Komponenten-Architektur

```
┌──────────────────────────────────────────────────────────────────┐
│                         DragDropSystem                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │  DragSource    │  │  DropTarget    │  │  DragOrchestrator  │  │
│  │  Registry      │  │  Registry      │  │                    │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘  │
│          │                   │                     │              │
│          └───────────────────┼─────────────────────┘              │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐   │
│  │                    Pragmatic DnD Core                      │   │
│  │  draggable() │ dropTargetForElements() │ monitorForElements│   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐   │
│  │                    Strategy Layer                          │   │
│  │  FlexStrategy │ PositionedStrategy │ EmptyContainerStrategy│   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────┐  ┌────────┴───────┐  ┌─────────────────────┐   │
│  │ VisualSystem │  │ CodeExecutor   │  │ EventBus            │   │
│  │ (Renderers)  │  │ (CodeModifier) │  │ (Notifications)     │   │
│  └──────────────┘  └────────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Datenfluss

### 3.1 Drag Start

```
User: mousedown auf Element
         │
         ▼
┌─────────────────────┐
│ DragSourceRegistry  │ ── Welcher Source-Typ?
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Pragmatic.draggable │ ── onDragStart callback
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ DragOrchestrator    │ ── State initialisieren
└─────────┬───────────┘
          │
          ├──► VisualSystem.showGhost(source)
          │
          └──► EventBus.emit('drag:started')
```

### 3.2 Drag Move

```
User: mousemove
         │
         ▼
┌─────────────────────┐
│ Pragmatic.onDrag    │ ── location.current.input
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ DropTargetRegistry  │ ── Welcher Target ist aktiv?
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Strategy.calculate  │ ── Placement berechnen
└─────────┬───────────┘
          │
          ├──► VisualSystem.updateIndicator(placement)
          │
          └──► VisualSystem.updateGhost(position)
```

### 3.3 Drop

```
User: mouseup
         │
         ▼
┌─────────────────────┐
│ Pragmatic.onDrop    │ ── source + location
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Strategy.calculate  │ ── Finales Placement
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ CodeExecutor        │ ── CodeModifier aufrufen
└─────────┬───────────┘
          │
          ├──► VisualSystem.clear()
          │
          ├──► EventBus.emit('drop:completed')
          │
          └──► SelectionManager.select(newNodeId)
```

---

## 4. Interfaces

### 4.1 DragSource

```typescript
interface DragSource {
  type: 'palette' | 'canvas'

  // Palette
  componentName?: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]

  // Canvas
  nodeId?: string
  element?: HTMLElement
}

interface DragSourceConfig {
  element: HTMLElement
  getData: () => DragSource
  onDragStart?: () => void
  onDragEnd?: () => void
}
```

### 4.2 DropTarget

```typescript
interface DropTarget {
  nodeId: string
  element: HTMLElement
  layoutType: 'flex' | 'positioned' | 'none'
  direction: 'horizontal' | 'vertical'
  hasChildren: boolean
  isPositioned: boolean
}

interface DropResult {
  target: DropTarget
  placement: Placement
  position?: { x: number; y: number }  // für positioned
  zone?: AlignmentZone                  // für leere flex
  insertionIndex?: number               // für flex mit kindern
}

type Placement = 'before' | 'after' | 'inside' | 'absolute'
```

### 4.3 Strategy

```typescript
interface DropStrategy {
  /** Prüft ob Strategy für dieses Target zuständig ist */
  matches(target: DropTarget): boolean

  /** Berechnet Placement basierend auf Cursor-Position */
  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource
  ): DropResult

  /** Liefert Visual-Daten für Rendering */
  getVisualHint(result: DropResult): VisualHint
}

interface VisualHint {
  type: 'line' | 'zone' | 'outline'
  rect: Rect
  direction?: 'horizontal' | 'vertical'
  zone?: AlignmentZone
}
```

### 4.4 VisualSystem

```typescript
interface VisualSystem {
  showGhost(source: DragSource, position: Point): void
  updateGhost(position: Point): void
  hideGhost(): void

  showIndicator(hint: VisualHint): void
  hideIndicator(): void

  showSnapGuides(guides: SnapGuide[]): void
  hideSnapGuides(): void

  clear(): void
}
```

### 4.5 CodeExecutor

```typescript
interface CodeExecutor {
  execute(source: DragSource, result: DropResult): ExecutionResult
}

interface ExecutionResult {
  success: boolean
  newSource?: string
  newNodeId?: string
  error?: string
}
```

---

## 5. Strategies im Detail

### 5.1 FlexWithChildrenStrategy

**Zuständig für:** `display: flex` + hat Kinder
**Placement:** `before` | `after` relativ zu Kind

```typescript
class FlexWithChildrenStrategy implements DropStrategy {
  matches(target: DropTarget): boolean {
    return target.layoutType === 'flex' && target.hasChildren
  }

  calculate(cursor: Point, target: DropTarget): DropResult {
    // Nutze Pragmatic hitbox für Edge-Detection
    const children = target.element.querySelectorAll(':scope > [data-mirror-id]')

    for (const child of children) {
      const rect = child.getBoundingClientRect()
      const edge = this.getClosestEdge(cursor, rect, target.direction)

      if (edge) {
        return {
          target,
          placement: edge === 'top' || edge === 'left' ? 'before' : 'after',
          insertionIndex: this.getIndex(child, edge),
        }
      }
    }

    // Fallback: nach letztem Kind
    return { target, placement: 'inside', insertionIndex: children.length }
  }

  getVisualHint(result: DropResult): VisualHint {
    const isVertical = result.target.direction === 'vertical'
    return {
      type: 'line',
      direction: isVertical ? 'horizontal' : 'vertical',
      rect: this.calculateLineRect(result),
    }
  }
}
```

### 5.2 EmptyFlexStrategy (9-Zone)

**Zuständig für:** `display: flex` + keine Kinder
**Placement:** `inside` mit Zone

```typescript
class EmptyFlexStrategy implements DropStrategy {
  matches(target: DropTarget): boolean {
    return target.layoutType === 'flex' && !target.hasChildren
  }

  calculate(cursor: Point, target: DropTarget): DropResult {
    const rect = target.element.getBoundingClientRect()
    const zone = this.detectZone(cursor, rect)

    return {
      target,
      placement: 'inside',
      zone,
    }
  }

  private detectZone(cursor: Point, rect: Rect): AlignmentZone {
    const relX = (cursor.x - rect.x) / rect.width
    const relY = (cursor.y - rect.y) / rect.height

    const col: 'left' | 'center' | 'right' =
      relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'center'
    const row: 'top' | 'middle' | 'bottom' =
      relY < 0.33 ? 'top' : relY > 0.66 ? 'bottom' : 'middle'

    return { row, col }
  }

  getVisualHint(result: DropResult): VisualHint {
    return {
      type: 'zone',
      zone: result.zone,
      rect: this.getZoneRect(result.target, result.zone),
    }
  }
}
```

### 5.3 PositionedStrategy

**Zuständig für:** `pos` oder `stacked` Container
**Placement:** `absolute` mit x/y

```typescript
class PositionedStrategy implements DropStrategy {
  private snapCalculator: SnapCalculator

  matches(target: DropTarget): boolean {
    return target.isPositioned
  }

  calculate(cursor: Point, target: DropTarget, source: DragSource): DropResult {
    const containerRect = target.element.getBoundingClientRect()

    // Relative Position zum Container
    let x = cursor.x - containerRect.left
    let y = cursor.y - containerRect.top

    // Grab-Offset berücksichtigen (wo wurde das Element angefasst)
    if (source.type === 'canvas' && source.element) {
      const sourceRect = source.element.getBoundingClientRect()
      const grabOffset = {
        x: cursor.x - sourceRect.left,
        y: cursor.y - sourceRect.top,
      }
      x -= grabOffset.x
      y -= grabOffset.y
    }

    // Snapping
    const snapped = this.snapCalculator.snap({ x, y }, target)

    return {
      target,
      placement: 'absolute',
      position: snapped.position,
    }
  }

  getVisualHint(result: DropResult): VisualHint {
    return {
      type: 'outline',
      rect: {
        x: result.position.x,
        y: result.position.y,
        width: this.getSourceWidth(result),
        height: this.getSourceHeight(result),
      },
    }
  }
}
```

### 5.4 NonContainerStrategy

**Zuständig für:** Text, Input, Image, etc.
**Placement:** `before` | `after` als Sibling

```typescript
class NonContainerStrategy implements DropStrategy {
  matches(target: DropTarget): boolean {
    return target.layoutType === 'none'
  }

  calculate(cursor: Point, target: DropTarget): DropResult {
    const rect = target.element.getBoundingClientRect()
    const isTopHalf = cursor.y < rect.top + rect.height / 2

    return {
      target,
      placement: isTopHalf ? 'before' : 'after',
    }
  }
}
```

---

## 6. Editor Drop (Sonderfall)

Editor Drop bleibt separates System, da es mit CodeMirror interagiert.

```typescript
interface EditorDropSystem {
  /** CodeMirror Extension für Drop-Events */
  createExtension(config: EditorDropConfig): Extension

  /** Insertion bei Drop */
  insertCode(code: string, position: EditorPosition): void
}

// Bleibt weitgehend wie bestehender EditorDropHandler
// Nur Interface-Anpassung für Konsistenz
```

**Integration:**
- Pragmatic `draggable()` setzt Drag-Data
- CodeMirror Extension fängt `drop` Event
- Bestehende Logik für Zeile/Indent bleibt

---

## 7. Snap-System

### 7.1 SnapCalculator (Pure Function)

```typescript
interface SnapConfig {
  threshold: number      // Pixel-Abstand für Snap
  gridSize: number       // 0 = kein Grid
  snapToEdges: boolean   // Container-Kanten
  snapToCenter: boolean  // Container-Mitte
  snapToSiblings: boolean // Andere Elemente
}

interface SnapResult {
  position: Point
  snapped: boolean
  guides: SnapGuide[]
}

interface SnapGuide {
  axis: 'x' | 'y'
  position: number
  type: 'edge' | 'center' | 'sibling'
}

function calculateSnap(
  position: Point,
  sourceRect: Rect,
  container: Rect,
  siblings: Rect[],
  config: SnapConfig
): SnapResult {
  const guides: SnapGuide[] = []
  let { x, y } = position

  // Container Edges
  if (config.snapToEdges) {
    // Left edge
    if (Math.abs(x - container.x) < config.threshold) {
      x = container.x
      guides.push({ axis: 'x', position: x, type: 'edge' })
    }
    // ... right, top, bottom
  }

  // Container Center
  if (config.snapToCenter) {
    const centerX = container.x + container.width / 2
    if (Math.abs(x + sourceRect.width / 2 - centerX) < config.threshold) {
      x = centerX - sourceRect.width / 2
      guides.push({ axis: 'x', position: centerX, type: 'center' })
    }
    // ... vertical center
  }

  // Siblings
  if (config.snapToSiblings) {
    for (const sibling of siblings) {
      // Align left edges
      if (Math.abs(x - sibling.x) < config.threshold) {
        x = sibling.x
        guides.push({ axis: 'x', position: x, type: 'sibling' })
      }
      // ... other alignments
    }
  }

  return {
    position: { x, y },
    snapped: guides.length > 0,
    guides,
  }
}
```

---

## 8. Ghost-System

### 8.1 GhostFactory

```typescript
interface GhostConfig {
  opacity: number
  shadow: boolean
  showLabel: boolean
}

class GhostFactory {
  private ghostElement: HTMLElement | null = null

  createFromElement(element: HTMLElement): HTMLElement {
    const clone = element.cloneNode(true) as HTMLElement
    this.applyGhostStyles(clone)
    return clone
  }

  createFromComponent(name: string, size: Size): HTMLElement {
    // Nutze bestehenden GhostRenderer
    const rendered = ghostRenderer.renderSync({ name })
    if (rendered) {
      return this.wrapRendered(rendered.element)
    }
    return this.createPlaceholder(name, size)
  }

  private createPlaceholder(name: string, size: Size): HTMLElement {
    const el = document.createElement('div')
    el.className = 'drag-ghost-placeholder'
    el.textContent = name
    el.style.width = `${size.width}px`
    el.style.height = `${size.height}px`
    return el
  }
}
```

---

## 9. Pragmatic DnD Integration

### 9.1 Setup

```typescript
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'

import {
  attachClosestEdge,
  extractClosestEdge
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'

class DragDropSystem {
  private strategies: DropStrategy[]
  private visualSystem: VisualSystem
  private codeExecutor: CodeExecutor

  registerPaletteItem(element: HTMLElement, data: PaletteItemData): () => void {
    return draggable({
      element,
      getInitialData: () => ({
        type: 'palette',
        componentName: data.componentName,
        properties: data.properties,
      }),
      onDragStart: () => {
        this.visualSystem.showGhost(/* ... */)
      },
    })
  }

  registerCanvasElement(element: HTMLElement): () => void {
    const nodeId = element.dataset.mirrorId

    // Als Drag Source
    const cleanupDraggable = draggable({
      element,
      getInitialData: () => ({
        type: 'canvas',
        nodeId,
      }),
    })

    // Als Drop Target
    const cleanupDropTarget = dropTargetForElements({
      element,
      getData: ({ input }) => {
        const target = this.buildDropTarget(element)
        const strategy = this.findStrategy(target)

        // Hitbox für Edge-Detection (Flex mit Kindern)
        if (strategy instanceof FlexWithChildrenStrategy) {
          return attachClosestEdge({ nodeId }, {
            element,
            input,
            allowedEdges: target.direction === 'horizontal'
              ? ['left', 'right']
              : ['top', 'bottom'],
          })
        }

        return { nodeId }
      },
      canDrop: ({ source }) => {
        // Verhindere Self-Drop
        return source.data.nodeId !== nodeId
      },
      onDrag: ({ self, location }) => {
        const target = this.buildDropTarget(element)
        const cursor = location.current.input
        const result = this.calculateDrop(cursor, target, self.data)

        this.visualSystem.showIndicator(result.visualHint)
      },
      onDrop: ({ source, location }) => {
        const target = this.buildDropTarget(element)
        const cursor = location.current.input
        const result = this.calculateDrop(cursor, target, source.data)

        this.codeExecutor.execute(source.data, result)
        this.visualSystem.clear()
      },
    })

    return () => {
      cleanupDraggable()
      cleanupDropTarget()
    }
  }
}
```

### 9.2 Monitor für globale Events

```typescript
// Globaler Monitor für Drag-Lifecycle
monitorForElements({
  onDragStart: ({ source }) => {
    events.emit('drag:started', { source: source.data })
  },
  onDrop: ({ source, location }) => {
    events.emit('drag:ended', { success: true })
  },
  canMonitor: ({ source }) => {
    // Nur unsere Drags tracken
    return source.data.type === 'palette' || source.data.type === 'canvas'
  },
})
```

---

## 10. Migration

### Phase 1: Foundation (Tag 1)
- [ ] Pragmatic DnD installieren
- [ ] Interfaces definieren (TypeScript)
- [ ] GhostFactory refactoren (bestehenden Code nutzen)
- [ ] VisualSystem Interface implementieren

### Phase 2: Strategies (Tag 2)
- [ ] FlexWithChildrenStrategy implementieren
- [ ] EmptyFlexStrategy (9-Zone) portieren
- [ ] PositionedStrategy mit Snap implementieren
- [ ] NonContainerStrategy implementieren

### Phase 3: Integration (Tag 3)
- [ ] DragDropSystem mit Pragmatic aufsetzen
- [ ] Palette-Integration
- [ ] Canvas-Element-Integration
- [ ] CodeExecutor anbinden

### Phase 4: Visual & Polish (Tag 4)
- [ ] Indicator Rendering
- [ ] Snap-Guides Rendering
- [ ] Ghost-Transitions
- [ ] Edge Cases testen

### Phase 5: Cleanup (Tag 5)
- [ ] Alten Code entfernen
- [ ] Tests migrieren
- [ ] Dokumentation aktualisieren

---

## 11. Design-Entscheidungen

### Entschieden:

1. **Space+Drag:** ❌ Feature entfernen
   - HTML5 Drag API unterstützt es nicht
   - Kein Workaround - sauberer Cut

2. **Alt+Duplicate:** ✅ `altKey` im Drop-Event prüfen
   - Standard-Pattern (wie Figma, Sketch)
   - Pragmatic gibt Zugriff auf natives Event
   - Implementation:
   ```typescript
   onDrop: ({ source, location }) => {
     const isDuplicate = location.current.input.altKey
     if (isDuplicate) {
       codeExecutor.duplicate(source.data, result)
     } else {
       codeExecutor.move(source.data, result)
     }
   }
   ```

3. **Editor Drop:** ✅ Separates System beibehalten
   - Drag *Source* einheitlich (Pragmatic `draggable`)
   - Drop *Target* unterschiedlich:
     - Preview → DragDropSystem (DOM-basiert)
     - Editor → CodeMirror Extension (Zeilen/Indent)
   - Grund: Fundamental unterschiedliche Logik
   - Bestehender EditorDropHandler bleibt, nur Interface-Anpassung

4. **Performance:** ✅ Keine vorzeitige Optimierung
   - Pragmatic ist für Trello/Jira gebaut (tausende Elemente)
   - Bei Bedarf: Lazy Registration nachrüsten
   - Profiling vor Optimierung

---

## 12. Edge Case Handling

### 12.1 Compile während Drag → Drag abbrechen

**Problem:** Nach Compile ist SourceMap neu, nodeIds können ungültig sein.

**Lösung:** Compile bricht laufenden Drag ab.

```typescript
// In DragDropSystem
private setupCompileGuard(): void {
  events.on('compile:started', () => {
    if (this.isDragging()) {
      this.cancel()
      console.log('[DragDrop] Cancelled due to compile')
    }
  })
}
```

**Begründung:**
- Einfach und sicher
- Seltener Fall (User tippt selten während Drag)
- Keine Race Conditions möglich

### 12.2 Registration → Event Delegation

**Problem:** Nach jedem Compile ändert sich das DOM. Müssen wir alle Drop Targets neu registrieren?

**Lösung:** Ein globaler Handler auf dem Preview-Container (Event Delegation).

```typescript
// EINMAL beim Setup - nicht nach jedem Compile
dropTargetForElements({
  element: previewContainer,

  getData: ({ input }) => {
    // Dynamisch: Finde Element unter Cursor
    const elementAtPoint = document.elementFromPoint(input.clientX, input.clientY)
    const mirrorElement = findClosestMirrorElement(elementAtPoint)

    if (!mirrorElement) return { valid: false }

    return {
      valid: true,
      nodeId: mirrorElement.dataset.mirrorId,
      element: mirrorElement,
    }
  },

  canDrop: ({ self }) => self.data.valid === true,

  onDrag: ({ self, location }) => {
    if (!self.data.valid) return

    const target = this.buildDropTarget(self.data.element)
    const cursor = { x: location.current.input.clientX, y: location.current.input.clientY }
    const result = this.calculateDrop(cursor, target)

    this.visualSystem.showIndicator(result.visualHint)
  },

  onDrop: ({ source, self, location }) => {
    if (!self.data.valid) return

    const target = this.buildDropTarget(self.data.element)
    const cursor = { x: location.current.input.clientX, y: location.current.input.clientY }
    const result = this.calculateDrop(cursor, target)

    this.codeExecutor.execute(source.data, result)
  },
})
```

**Vorteile:**
- Kein Re-Registrieren nach Compile
- Performance: O(1) statt O(n) Elemente
- Kein Cleanup nötig
- Neue Elemente automatisch "registriert"

### 12.3 Self-Drop Prevention

```typescript
canDrop: ({ source, self }) => {
  // Nicht auf sich selbst droppen
  if (source.data.nodeId === self.data.nodeId) return false

  // Nicht in eigene Kinder droppen
  if (source.data.nodeId && self.data.element) {
    const sourceElement = document.querySelector(`[data-mirror-id="${source.data.nodeId}"]`)
    if (sourceElement?.contains(self.data.element)) return false
  }

  return self.data.valid
}
```

---

## 12.4 Risiko-Mitigation

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Library-Bug | Niedrig | Atlassian maintained, große Nutzerbasis |
| Performance | Niedrig | Event Delegation, kein O(n) |
| Compile während Drag | Niedrig | Drag wird abgebrochen |
| Self-Drop | Niedrig | canDrop Filter |

---

## 13. Testbarkeit

### 13.1 Test-Pyramide

```
                    ┌───────────┐
                    │   E2E     │  ← Playwright: Full User Flows
                    │  (wenige) │
                 ┌──┴───────────┴──┐
                 │  Integration    │  ← JSDOM: DOM + Events
                 │   (mittel)      │
              ┌──┴─────────────────┴──┐
              │      Unit Tests       │  ← Vitest: Pure Functions
              │       (viele)         │
              └───────────────────────┘
```

### 13.2 Unit Tests (Pure Functions)

Diese Komponenten sind **ohne DOM** testbar:

#### Strategies
```typescript
// test/drag-drop/strategies/flex-with-children.test.ts
import { FlexWithChildrenStrategy } from '../strategies'

describe('FlexWithChildrenStrategy', () => {
  const strategy = new FlexWithChildrenStrategy()

  describe('matches', () => {
    it('returns true for flex container with children', () => {
      const target = { layoutType: 'flex', hasChildren: true }
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for empty flex container', () => {
      const target = { layoutType: 'flex', hasChildren: false }
      expect(strategy.matches(target)).toBe(false)
    })
  })

  describe('calculate', () => {
    it('returns "before" when cursor in top half of child', () => {
      const cursor = { x: 100, y: 15 }
      const target = {
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: true,
      }
      const childRects = [
        { nodeId: 'child-1', rect: { top: 0, bottom: 40, left: 0, right: 200 } }
      ]

      const result = strategy.calculate(cursor, target, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('child-1')
    })

    it('returns "after" when cursor in bottom half of child', () => {
      const cursor = { x: 100, y: 35 }
      const target = {
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: true,
      }
      const childRects = [
        { nodeId: 'child-1', rect: { top: 0, bottom: 40, left: 0, right: 200 } }
      ]

      const result = strategy.calculate(cursor, target, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('child-1')
    })

    it('handles horizontal direction correctly', () => {
      const cursor = { x: 15, y: 50 }
      const target = {
        layoutType: 'flex',
        direction: 'horizontal',
        hasChildren: true,
      }
      const childRects = [
        { nodeId: 'child-1', rect: { top: 0, bottom: 100, left: 0, right: 40 } }
      ]

      const result = strategy.calculate(cursor, target, childRects)

      expect(result.placement).toBe('before')
    })
  })
})
```

#### 9-Zone Detection
```typescript
// test/drag-drop/strategies/empty-flex.test.ts
import { detectZone } from '../strategies/empty-flex'

describe('detectZone', () => {
  const rect = { x: 0, y: 0, width: 300, height: 300 }

  it.each([
    [{ x: 30, y: 30 }, { row: 'top', col: 'left' }],
    [{ x: 150, y: 30 }, { row: 'top', col: 'center' }],
    [{ x: 270, y: 30 }, { row: 'top', col: 'right' }],
    [{ x: 30, y: 150 }, { row: 'middle', col: 'left' }],
    [{ x: 150, y: 150 }, { row: 'middle', col: 'center' }],
    [{ x: 270, y: 150 }, { row: 'middle', col: 'right' }],
    [{ x: 30, y: 270 }, { row: 'bottom', col: 'left' }],
    [{ x: 150, y: 270 }, { row: 'bottom', col: 'center' }],
    [{ x: 270, y: 270 }, { row: 'bottom', col: 'right' }],
  ])('cursor %j returns zone %j', (cursor, expectedZone) => {
    expect(detectZone(cursor, rect)).toEqual(expectedZone)
  })

  it('handles edge cases at zone boundaries', () => {
    // Exactly at 33% boundary
    const cursor = { x: 99, y: 150 }
    const zone = detectZone(cursor, rect)
    expect(zone.col).toBe('left')
  })
})
```

#### Snap Calculator
```typescript
// test/drag-drop/snap-calculator.test.ts
import { calculateSnap } from '../snap-calculator'

describe('calculateSnap', () => {
  const container = { x: 0, y: 0, width: 400, height: 300 }
  const sourceSize = { width: 100, height: 50 }

  describe('edge snapping', () => {
    it('snaps to left edge within threshold', () => {
      const position = { x: 8, y: 100 }
      const config = { threshold: 10, snapToEdges: true }

      const result = calculateSnap(position, sourceSize, container, [], config)

      expect(result.position.x).toBe(0)
      expect(result.snapped).toBe(true)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'edge', position: 0 })
      )
    })

    it('snaps to right edge (accounting for source width)', () => {
      const position = { x: 295, y: 100 } // 400 - 100 - 5 = 295
      const config = { threshold: 10, snapToEdges: true }

      const result = calculateSnap(position, sourceSize, container, [], config)

      expect(result.position.x).toBe(300) // 400 - 100
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'edge', position: 400 })
      )
    })

    it('does not snap when outside threshold', () => {
      const position = { x: 50, y: 100 }
      const config = { threshold: 10, snapToEdges: true }

      const result = calculateSnap(position, sourceSize, container, [], config)

      expect(result.position.x).toBe(50)
      expect(result.snapped).toBe(false)
    })
  })

  describe('center snapping', () => {
    it('snaps to horizontal center', () => {
      const position = { x: 147, y: 100 } // center would be 150
      const config = { threshold: 10, snapToCenter: true }

      const result = calculateSnap(position, sourceSize, container, [], config)

      expect(result.position.x).toBe(150) // (400 - 100) / 2
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'center' })
      )
    })
  })

  describe('sibling snapping', () => {
    it('snaps to sibling left edge', () => {
      const position = { x: 53, y: 100 }
      const siblings = [{ x: 50, y: 200, width: 80, height: 40 }]
      const config = { threshold: 10, snapToSiblings: true }

      const result = calculateSnap(position, sourceSize, container, siblings, config)

      expect(result.position.x).toBe(50)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'sibling' })
      )
    })
  })

  describe('multiple snaps', () => {
    it('can snap both axes simultaneously', () => {
      const position = { x: 8, y: 5 }
      const config = { threshold: 10, snapToEdges: true }

      const result = calculateSnap(position, sourceSize, container, [], config)

      expect(result.position).toEqual({ x: 0, y: 0 })
      expect(result.guides).toHaveLength(2)
    })
  })
})
```

#### Visual Hint Generation
```typescript
// test/drag-drop/strategies/visual-hints.test.ts
import { FlexWithChildrenStrategy } from '../strategies'

describe('getVisualHint', () => {
  const strategy = new FlexWithChildrenStrategy()

  it('returns horizontal line for vertical flex', () => {
    const result = {
      target: { direction: 'vertical' },
      placement: 'before',
      targetRect: { top: 100, left: 0, width: 200 },
    }

    const hint = strategy.getVisualHint(result)

    expect(hint.type).toBe('line')
    expect(hint.direction).toBe('horizontal')
    expect(hint.rect.y).toBe(100)
    expect(hint.rect.height).toBe(2)
  })

  it('returns vertical line for horizontal flex', () => {
    const result = {
      target: { direction: 'horizontal' },
      placement: 'before',
      targetRect: { top: 0, left: 100, height: 50 },
    }

    const hint = strategy.getVisualHint(result)

    expect(hint.type).toBe('line')
    expect(hint.direction).toBe('vertical')
    expect(hint.rect.x).toBe(100)
    expect(hint.rect.width).toBe(2)
  })
})
```

### 13.3 Integration Tests (mit JSDOM)

Diese Tests brauchen DOM, aber kein echter Browser:

```typescript
// test/drag-drop/integration/drop-target-registry.test.ts
import { JSDOM } from 'jsdom'
import { DropTargetRegistry } from '../drop-target-registry'

describe('DropTargetRegistry', () => {
  let dom: JSDOM
  let document: Document
  let registry: DropTargetRegistry

  beforeEach(() => {
    dom = new JSDOM(`
      <div id="preview">
        <div data-mirror-id="box-1" style="display: flex; flex-direction: column;">
          <div data-mirror-id="text-1">Hello</div>
          <div data-mirror-id="text-2">World</div>
        </div>
      </div>
    `)
    document = dom.window.document
    registry = new DropTargetRegistry()
  })

  it('builds correct DropTarget from DOM element', () => {
    const element = document.querySelector('[data-mirror-id="box-1"]')

    const target = registry.buildDropTarget(element)

    expect(target.nodeId).toBe('box-1')
    expect(target.layoutType).toBe('flex')
    expect(target.direction).toBe('vertical')
    expect(target.hasChildren).toBe(true)
  })

  it('detects positioned container', () => {
    const element = document.querySelector('[data-mirror-id="box-1"]')
    element.dataset.positioned = 'true'

    const target = registry.buildDropTarget(element)

    expect(target.isPositioned).toBe(true)
  })
})
```

### 13.4 E2E Tests (Playwright)

Für kritische User Flows:

```typescript
// test/e2e/drag-drop.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio')
    await page.waitForSelector('#preview')
  })

  test('palette to preview drop creates component', async ({ page }) => {
    // Drag Button from palette
    const button = page.locator('.component-panel-item:has-text("Button")')
    const preview = page.locator('#preview')

    await button.dragTo(preview)

    // Verify component was created
    await expect(page.locator('[data-mirror-id]')).toContainText('Button')

    // Verify code was updated
    const editor = page.locator('.cm-content')
    await expect(editor).toContainText('Button')
  })

  test('canvas element reorder works', async ({ page }) => {
    // Setup: Create two elements
    await page.fill('.cm-content', 'Box\n  Text "First"\n  Text "Second"')
    await page.waitForSelector('[data-mirror-id]')

    // Drag second text before first
    const second = page.locator('text="Second"')
    const first = page.locator('text="First"')

    await second.dragTo(first, { targetPosition: { x: 10, y: 5 } })

    // Verify order changed in code
    const code = await page.locator('.cm-content').textContent()
    expect(code.indexOf('Second')).toBeLessThan(code.indexOf('First'))
  })

  test('9-zone alignment applies correct properties', async ({ page }) => {
    // Create empty container
    await page.fill('.cm-content', 'Box w 300 h 200')
    await page.waitForSelector('[data-mirror-id]')

    // Drag button to top-left zone
    const button = page.locator('.component-panel-item:has-text("Button")')
    const container = page.locator('[data-mirror-id="1"]')
    const box = await container.boundingBox()

    await button.dragTo(container, {
      targetPosition: { x: box.width * 0.15, y: box.height * 0.15 }
    })

    // Verify alignment was applied
    const code = await page.locator('.cm-content').textContent()
    expect(code).toMatch(/align.*top.*left|top.*left/i)
  })

  test('escape cancels drag', async ({ page }) => {
    const button = page.locator('.component-panel-item:has-text("Button")')

    // Start drag
    await button.hover()
    await page.mouse.down()
    await page.mouse.move(400, 300)

    // Press escape
    await page.keyboard.press('Escape')

    // Verify no component was created
    const code = await page.locator('.cm-content').textContent()
    expect(code).not.toContain('Button')
  })
})
```

### 13.5 Test-Utilities

Helfer für konsistente Tests:

```typescript
// test/drag-drop/test-utils.ts

/** Create mock DropTarget */
export function createMockTarget(overrides: Partial<DropTarget> = {}): DropTarget {
  return {
    nodeId: 'test-node',
    element: document.createElement('div'),
    layoutType: 'flex',
    direction: 'vertical',
    hasChildren: false,
    isPositioned: false,
    ...overrides,
  }
}

/** Create mock DragSource */
export function createMockSource(overrides: Partial<DragSource> = {}): DragSource {
  return {
    type: 'palette',
    componentName: 'Button',
    ...overrides,
  }
}

/** Create mock rect */
export function createRect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height }
}

/** Simulate cursor position relative to rect */
export function cursorAt(rect: Rect, relX: number, relY: number): Point {
  return {
    x: rect.x + rect.width * relX,
    y: rect.y + rect.height * relY,
  }
}
```

### 13.6 Test-Coverage Ziele

| Komponente | Ziel | Grund |
|------------|------|-------|
| Strategies | 95% | Kern-Logik, muss korrekt sein |
| SnapCalculator | 95% | Geometrie-Berechnungen |
| 9-Zone Detection | 100% | Einfach, kritisch |
| VisualSystem | 70% | DOM-lastig |
| Integration | 80% | Wichtige Flows |

### 13.7 Pragmatic DnD Mocking

Für Unit Tests ohne echte Library:

```typescript
// test/drag-drop/mocks/pragmatic-mock.ts

export const mockDraggable = vi.fn((config) => {
  // Return cleanup function
  return () => {}
})

export const mockDropTarget = vi.fn((config) => {
  return () => {}
})

export const mockMonitor = vi.fn((config) => {
  return () => {}
})

// Simulate drag event
export function simulateDrag(
  source: DragSource,
  path: Point[],
  onDrag: (location: Point) => void
): void {
  for (const point of path) {
    onDrag(point)
  }
}

// Simulate drop
export function simulateDrop(
  source: DragSource,
  target: DropTarget,
  location: Point
): void {
  // Trigger registered onDrop callback
}
```

---

## 14. Erfolgs-Kriterien

### Funktional
- [ ] Alle 10 Must-Have Kriterien aus Requirements erfüllt
- [ ] Keine Regression gegenüber aktuellem System
- [ ] Editor Drop funktioniert unverändert

### Qualität
- [ ] < 1000 LOC für gesamtes Drag-Drop System
- [ ] > 90% Test Coverage für Strategies und SnapCalculator
- [ ] Keine bekannten Race Conditions

### Performance
- [ ] Drag Start < 16ms (ein Frame)
- [ ] Drag Move < 8ms (smooth 120fps)
- [ ] Kein Jank bei 50+ Elementen im Preview
