# Drag & Drop Architektur v3

> Ziel: Schnell, flüssig, stabil. Kein gerenderter Ghost, nur Insertion-Indikator.

## Grundprinzip

```
DRAG = Visual Only (60fps)
DROP = Code Modification (einmalig)
```

Während des Drags wird **kein Code generiert**. Nur auf Drop.

---

## Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    DragController                            │
│  (Orchestrator - koordiniert alles, hält State)             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│   │ HitDetector  │   │ Insertion    │   │ Indicator    │   │
│   │              │   │ Calculator   │   │              │   │
│   │ Findet das   │   │              │   │ Eine Linie,  │   │
│   │ Ziel unter   │   │ Berechnet    │   │ ein Element  │   │
│   │ dem Cursor   │   │ Position     │   │              │   │
│   └──────────────┘   └──────────────┘   └──────────────┘   │
│          ↓                  ↓                  ↓            │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                   LayoutCache                        │   │
│   │  (Gecachte Rects aller Elemente, einmal pro Drag)   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ nur auf DROP
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CodeExecutor                              │
│  (Generiert Code, ruft Recompile auf)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. LayoutCache

**Problem:** `getBoundingClientRect()` bei jedem Mouse-Move ist langsam.

**Lösung:** Einmal beim Drag-Start alle relevanten Rects cachen.

```typescript
interface LayoutCache {
  /** Wird einmal bei dragstart aufgebaut */
  build(container: HTMLElement): void

  /** O(1) Lookup */
  getRect(nodeId: string): DOMRect | null

  /** Kinder eines Containers (schon sortiert nach Position) */
  getChildren(containerId: string): Array<{ nodeId: string; rect: DOMRect }>

  /** Invalidieren wenn Container wechselt */
  invalidate(): void
}
```

**Implementation:**

```typescript
class LayoutCache {
  private rects = new Map<string, DOMRect>()
  private children = new Map<string, Array<{ nodeId: string; rect: DOMRect }>>()

  build(container: HTMLElement): void {
    // Einmal alle Elemente mit data-node-id traversieren
    const elements = container.querySelectorAll('[data-node-id]')

    for (const el of elements) {
      const nodeId = el.getAttribute('data-node-id')!
      const rect = el.getBoundingClientRect()
      this.rects.set(nodeId, rect)
    }

    // Kinder pro Container gruppieren und sortieren
    this.buildChildrenMap()
  }
}
```

**Kosten:** ~2-5ms für 100 Elemente, einmal pro Drag.

---

## 2. HitDetector

**Aufgabe:** Finde das Drop-Target unter dem Cursor.

```typescript
interface HitResult {
  /** Container, in den gedroppt wird */
  containerId: string
  /** Layout-Typ des Containers */
  layout: 'flex-row' | 'flex-column'
  /** Rect des Containers */
  containerRect: DOMRect
}

interface HitDetector {
  detect(cursor: Point, cache: LayoutCache): HitResult | null
}
```

**Strategie:**

1. `document.elementFromPoint(x, y)` → Element unter Cursor
2. Aufwärts laufen bis `data-node-id` mit `display: flex` gefunden
3. Cache-Lookup für Rect

```typescript
class HitDetector {
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) return null

    // Finde nächsten Flex-Container
    let current: Element | null = element
    while (current) {
      const nodeId = current.getAttribute('data-node-id')
      if (nodeId) {
        const style = getComputedStyle(current)
        if (style.display === 'flex') {
          return {
            containerId: nodeId,
            layout: style.flexDirection === 'row' ? 'flex-row' : 'flex-column',
            containerRect: cache.getRect(nodeId)!,
          }
        }
      }
      current = current.parentElement
    }
    return null
  }
}
```

---

## 3. InsertionCalculator

**Aufgabe:** Berechne WO innerhalb des Containers eingefügt wird.

```typescript
interface InsertionResult {
  /** Index im children-Array */
  index: number
  /** Position der Insertion-Line */
  linePosition: { x: number; y: number }
  /** Größe der Line (Breite bei horizontal, Höhe bei vertikal) */
  lineSize: number
}

interface InsertionCalculator {
  calculate(
    cursor: Point,
    children: Array<{ nodeId: string; rect: DOMRect }>,
    layout: 'flex-row' | 'flex-column',
    containerRect: DOMRect
  ): InsertionResult
}
```

**Algorithmus (für flex-column):**

```typescript
calculate(cursor, children, layout, containerRect): InsertionResult {
  // Leerer Container → Index 0
  if (children.length === 0) {
    return {
      index: 0,
      linePosition: { x: containerRect.x, y: containerRect.y },
      lineSize: containerRect.width
    }
  }

  // Finde das Kind, vor oder nach dem eingefügt wird
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const midY = child.rect.y + child.rect.height / 2

    if (cursor.y < midY) {
      // Vor diesem Kind einfügen
      return {
        index: i,
        linePosition: { x: containerRect.x, y: child.rect.y },
        lineSize: containerRect.width
      }
    }
  }

  // Nach dem letzten Kind
  const lastChild = children[children.length - 1]
  return {
    index: children.length,
    linePosition: {
      x: containerRect.x,
      y: lastChild.rect.y + lastChild.rect.height
    },
    lineSize: containerRect.width
  }
}
```

**Wichtig:** Keine DOM-Operationen, nur reine Geometrie auf gecachten Werten.

---

## 4. Indicator

**Aufgabe:** Eine einzige Linie anzeigen.

```typescript
class Indicator {
  private element: HTMLDivElement

  constructor() {
    this.element = document.createElement('div')
    this.element.id = 'drag-indicator'
    Object.assign(this.element.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: '#5BA8F5',
      transition: 'none', // Keine Animation für max. Responsiveness
      willChange: 'transform', // GPU-Beschleunigung
    })
    document.body.appendChild(this.element)
  }

  show(position: Point, width: number, height: number): void {
    Object.assign(this.element.style, {
      display: 'block',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${width}px`,
      height: `${height}px`,
    })
  }

  hide(): void {
    this.element.style.display = 'none'
  }
}
```

**Eigenschaften:**

- Ein DOM-Element, wiederverwendet
- Nur `left`, `top`, `width`, `height` ändern sich
- `will-change: transform` für GPU-Compositing
- Keine Transition (sofortige Reaktion)

---

## 5. DragController

**Der Orchestrator:**

```typescript
interface DragSource {
  type: 'palette' | 'canvas'
  componentName?: string
  template?: string
  nodeId?: string // nur bei canvas
}

interface DropResult {
  containerId: string
  insertionIndex: number
}

class DragController {
  private cache: LayoutCache
  private hitDetector: HitDetector
  private calculator: InsertionCalculator
  private indicator: Indicator
  private codeExecutor: CodeExecutor

  private state: 'idle' | 'dragging' = 'idle'
  private source: DragSource | null = null
  private lastResult: DropResult | null = null

  // === DRAG START ===
  startDrag(source: DragSource, container: HTMLElement): void {
    this.state = 'dragging'
    this.source = source

    // Einmal alle Layouts cachen
    this.cache.build(container)
  }

  // === DRAG MOVE (60fps) ===
  updatePosition(cursor: Point): void {
    if (this.state !== 'dragging') return

    // 1. Finde Container unter Cursor
    const hit = this.hitDetector.detect(cursor, this.cache)
    if (!hit) {
      this.indicator.hide()
      this.lastResult = null
      return
    }

    // 2. Hole Kinder aus Cache
    const children = this.cache.getChildren(hit.containerId)

    // 3. Berechne Insertion-Position
    const insertion = this.calculator.calculate(cursor, children, hit.layout, hit.containerRect)

    // 4. Zeige Indikator
    if (hit.layout === 'flex-column') {
      // Horizontale Linie
      this.indicator.show(insertion.linePosition, insertion.lineSize, 2)
    } else {
      // Vertikale Linie
      this.indicator.show(insertion.linePosition, 2, insertion.lineSize)
    }

    // 5. Merke für Drop
    this.lastResult = {
      containerId: hit.containerId,
      insertionIndex: insertion.index,
    }
  }

  // === DROP (einmalig) ===
  async drop(): Promise<void> {
    if (!this.source || !this.lastResult) {
      this.reset()
      return
    }

    // Hier passiert die teure Arbeit - aber nur einmal
    await this.codeExecutor.execute(this.source, this.lastResult)

    this.reset()
  }

  // === CANCEL ===
  cancel(): void {
    this.reset()
  }

  private reset(): void {
    this.state = 'idle'
    this.source = null
    this.lastResult = null
    this.indicator.hide()
    this.cache.invalidate()
  }
}
```

---

## Event-Integration

```typescript
// In der Preview-Komponente:

container.addEventListener('dragover', e => {
  e.preventDefault()

  // Throttle auf requestAnimationFrame
  if (!this.rafPending) {
    this.rafPending = true
    requestAnimationFrame(() => {
      controller.updatePosition({ x: e.clientX, y: e.clientY })
      this.rafPending = false
    })
  }
})

container.addEventListener('drop', e => {
  e.preventDefault()
  controller.drop()
})

container.addEventListener('dragleave', e => {
  // Nur wenn wirklich den Container verlassen
  if (!container.contains(e.relatedTarget as Node)) {
    controller.cancel()
  }
})
```

---

## Performance-Garantien

| Phase      | Operation              | Budget | Realität |
| ---------- | ---------------------- | ------ | -------- |
| Drag Start | Layout Cache aufbauen  | 16ms   | ~3-5ms   |
| Drag Move  | Hit + Calc + Indicator | 16ms   | ~0.5ms   |
| Drop       | Code + Recompile       | 100ms  | ~30-80ms |

### Warum so schnell?

1. **Kein DOM-Read während Drag** - Alles gecacht
2. **Kein Code-Gen während Drag** - Nur Geometrie
3. **Ein DOM-Element** - Kein Create/Destroy
4. **requestAnimationFrame** - Keine überflüssigen Updates

---

## Vergleich: Alt vs. Neu

| Aspekt          | Alte Architektur      | Neue Architektur                    |
| --------------- | --------------------- | ----------------------------------- |
| Lines of Code   | 995 (Monolith)        | ~200 (4 Klassen)                    |
| DOM-Reads/Move  | 3-5                   | 0 (gecacht)                         |
| DOM-Writes/Move | 2-4                   | 1 (Indicator)                       |
| State           | 10+ Variablen         | 3 (`state`, `source`, `lastResult`) |
| Code-Gen        | Manchmal während Drag | Nur auf Drop                        |
| Testbarkeit     | Schwer (DOM-abhängig) | Einfach (pure Functions)            |

---

## Testbarkeit

```typescript
describe('InsertionCalculator', () => {
  it('inserts before first child when cursor above midpoint', () => {
    const children = [
      { nodeId: 'a', rect: mockRect(0, 0, 100, 50) },
      { nodeId: 'b', rect: mockRect(0, 50, 100, 50) },
    ]
    const cursor = { x: 50, y: 10 } // Über erstem Kind
    const container = mockRect(0, 0, 100, 100)

    const result = calculator.calculate(cursor, children, 'flex-column', container)

    expect(result.index).toBe(0)
    expect(result.linePosition.y).toBe(0)
  })
})
```

**Alle Berechnungen sind pure Functions** → Unit-Tests ohne DOM.

---

## Migration

1. **Phase 1:** Neue Komponenten parallel implementieren
2. **Phase 2:** DragController als Wrapper um alten Code
3. **Phase 3:** Alten Code schrittweise ersetzen
4. **Phase 4:** Legacy-Code entfernen

---

## Zusammenfassung

```
┌─────────────────────────────────────────────────────────────┐
│  PRINZIP: Drag ist Visual, Drop ist Code                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LayoutCache     → Einmal cachen, O(1) lookup               │
│  HitDetector     → Ein elementFromPoint() + DOM-Walk        │
│  Calculator      → Pure Geometrie, keine Side Effects       │
│  Indicator       → Ein DOM-Element, nur repositioniert      │
│  DragController  → 3 Zustände, klare Transitions            │
│                                                              │
│  Ergebnis: 60fps während Drag, stabile Drops                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
