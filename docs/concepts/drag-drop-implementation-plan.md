# Drag & Drop v3 – Umsetzungsplan

> **Status:** ✅ Vollständig implementiert (Phase 1-5)

## Übersicht

**Ziel:** Schnelles, stabiles Drag & Drop mit Insertion-Indikator (keine Ghost-Preview).

**Scope:**

- 5 neue Klassen (~200 LOC gesamt)
- Refactoring bestehender Event-Handler
- Keine Breaking Changes für User

---

## Phase 1: Core-Komponenten (Pure Functions)

### 1.1 LayoutCache

**Datei:** `studio/preview/drag/layout-cache.ts`

**Abhängigkeiten:** Keine

**Interface:**

```typescript
interface LayoutCache {
  build(container: HTMLElement): void
  getRect(nodeId: string): DOMRect | null
  getChildren(containerId: string): ChildInfo[]
  invalidate(): void
}

interface ChildInfo {
  nodeId: string
  rect: DOMRect
}
```

**Implementation:**

```typescript
export class LayoutCache {
  private rects = new Map<string, DOMRect>()
  private children = new Map<string, ChildInfo[]>()

  build(container: HTMLElement): void {
    this.invalidate()

    const elements = container.querySelectorAll('[data-node-id]')
    for (const el of elements) {
      const nodeId = el.getAttribute('data-node-id')!
      this.rects.set(nodeId, el.getBoundingClientRect())
    }

    this.buildChildrenMap(container)
  }

  private buildChildrenMap(container: HTMLElement): void {
    // Gruppiere Kinder pro Container, sortiert nach Position
    for (const [nodeId, rect] of this.rects) {
      const el = container.querySelector(`[data-node-id="${nodeId}"]`)
      const parent = el?.parentElement?.closest('[data-node-id]')
      if (parent) {
        const parentId = parent.getAttribute('data-node-id')!
        if (!this.children.has(parentId)) {
          this.children.set(parentId, [])
        }
        this.children.get(parentId)!.push({ nodeId, rect })
      }
    }

    // Sortiere Kinder nach Position
    for (const [, kids] of this.children) {
      kids.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
    }
  }

  getRect(nodeId: string): DOMRect | null {
    return this.rects.get(nodeId) ?? null
  }

  getChildren(containerId: string): ChildInfo[] {
    return this.children.get(containerId) ?? []
  }

  invalidate(): void {
    this.rects.clear()
    this.children.clear()
  }
}
```

**Tests:** `tests/studio/drag/layout-cache.test.ts`

- Cache baut korrekt auf
- `getRect()` gibt richtige Werte zurück
- `getChildren()` sortiert nach Position
- `invalidate()` leert alles

---

### 1.2 InsertionCalculator

**Datei:** `studio/preview/drag/insertion-calculator.ts`

**Abhängigkeiten:** Keine (pure function)

**Interface:**

```typescript
interface Point {
  x: number
  y: number
}

interface InsertionResult {
  index: number
  linePosition: Point
  lineSize: number
  orientation: 'horizontal' | 'vertical'
}

type FlexLayout = 'flex-row' | 'flex-column'

interface InsertionCalculator {
  calculate(
    cursor: Point,
    children: ChildInfo[],
    layout: FlexLayout,
    containerRect: DOMRect
  ): InsertionResult
}
```

**Implementation:**

```typescript
export class InsertionCalculator {
  calculate(
    cursor: Point,
    children: ChildInfo[],
    layout: FlexLayout,
    containerRect: DOMRect
  ): InsertionResult {
    const isVertical = layout === 'flex-column'

    // Leerer Container
    if (children.length === 0) {
      return {
        index: 0,
        linePosition: { x: containerRect.x, y: containerRect.y },
        lineSize: isVertical ? containerRect.width : containerRect.height,
        orientation: isVertical ? 'horizontal' : 'vertical',
      }
    }

    // Finde Insertion-Position
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const mid = isVertical
        ? child.rect.y + child.rect.height / 2
        : child.rect.x + child.rect.width / 2
      const cursorPos = isVertical ? cursor.y : cursor.x

      if (cursorPos < mid) {
        return {
          index: i,
          linePosition: isVertical
            ? { x: containerRect.x, y: child.rect.y }
            : { x: child.rect.x, y: containerRect.y },
          lineSize: isVertical ? containerRect.width : containerRect.height,
          orientation: isVertical ? 'horizontal' : 'vertical',
        }
      }
    }

    // Nach letztem Kind
    const last = children[children.length - 1]
    return {
      index: children.length,
      linePosition: isVertical
        ? { x: containerRect.x, y: last.rect.y + last.rect.height }
        : { x: last.rect.x + last.rect.width, y: containerRect.y },
      lineSize: isVertical ? containerRect.width : containerRect.height,
      orientation: isVertical ? 'horizontal' : 'vertical',
    }
  }
}
```

**Tests:** `tests/studio/drag/insertion-calculator.test.ts`

- Leerer Container → Index 0
- Cursor über erstem Kind → Index 0
- Cursor zwischen Kindern → korrekter Index
- Cursor nach letztem Kind → Index = children.length
- Funktioniert für flex-row und flex-column

---

## Phase 2: DOM-Komponenten

### 2.1 HitDetector

**Datei:** `studio/preview/drag/hit-detector.ts`

**Abhängigkeiten:** LayoutCache

**Interface:**

```typescript
interface HitResult {
  containerId: string
  layout: FlexLayout
  containerRect: DOMRect
}

interface HitDetector {
  detect(cursor: Point, cache: LayoutCache): HitResult | null
}
```

**Implementation:**

```typescript
export class HitDetector {
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) return null

    // Finde nächsten Flex-Container nach oben
    let current: Element | null = element
    while (current) {
      const nodeId = current.getAttribute('data-node-id')
      if (nodeId) {
        const style = getComputedStyle(current)
        if (style.display === 'flex') {
          const rect = cache.getRect(nodeId)
          if (rect) {
            return {
              containerId: nodeId,
              layout: style.flexDirection === 'row' ? 'flex-row' : 'flex-column',
              containerRect: rect,
            }
          }
        }
      }
      current = current.parentElement
    }

    return null
  }
}
```

**Tests:** `tests/studio/drag/hit-detector.test.ts`

- Findet Flex-Container unter Cursor
- Ignoriert Non-Flex-Container
- Gibt null zurück wenn kein Container

---

### 2.2 Indicator

**Datei:** `studio/preview/drag/indicator.ts`

**Abhängigkeiten:** Keine

**Interface:**

```typescript
interface Indicator {
  show(position: Point, size: number, orientation: 'horizontal' | 'vertical'): void
  hide(): void
  destroy(): void
}
```

**Implementation:**

```typescript
export class Indicator {
  private element: HTMLDivElement | null = null

  private ensureElement(): HTMLDivElement {
    if (!this.element) {
      this.element = document.createElement('div')
      this.element.id = 'drag-indicator'
      Object.assign(this.element.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '10000',
        background: '#5BA8F5',
        borderRadius: '2px',
        transition: 'none',
        willChange: 'transform',
        display: 'none',
      })
      document.body.appendChild(this.element)
    }
    return this.element
  }

  show(position: Point, size: number, orientation: 'horizontal' | 'vertical'): void {
    const el = this.ensureElement()

    const width = orientation === 'horizontal' ? size : 3
    const height = orientation === 'vertical' ? size : 3

    Object.assign(el.style, {
      display: 'block',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${width}px`,
      height: `${height}px`,
    })
  }

  hide(): void {
    if (this.element) {
      this.element.style.display = 'none'
    }
  }

  destroy(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}
```

**Tests:** Manuell (visuell)

---

## Phase 3: Orchestrator

### 3.1 DragController

**Datei:** `studio/preview/drag/drag-controller.ts`

**Abhängigkeiten:** Alle obigen Komponenten + CodeExecutor (bestehend)

**Interface:**

```typescript
interface DragSource {
  type: 'palette' | 'canvas'
  componentName?: string
  template?: string
  nodeId?: string
}

interface DropTarget {
  containerId: string
  insertionIndex: number
}

interface DragController {
  startDrag(source: DragSource, container: HTMLElement): void
  updatePosition(cursor: Point): void
  drop(): Promise<void>
  cancel(): void
  isDragging(): boolean
}
```

**Implementation:**

```typescript
export class DragController {
  private cache = new LayoutCache()
  private hitDetector = new HitDetector()
  private calculator = new InsertionCalculator()
  private indicator = new Indicator()

  private state: 'idle' | 'dragging' = 'idle'
  private source: DragSource | null = null
  private lastTarget: DropTarget | null = null

  constructor(private codeExecutor: CodeExecutor) {}

  startDrag(source: DragSource, container: HTMLElement): void {
    this.state = 'dragging'
    this.source = source
    this.cache.build(container)
  }

  updatePosition(cursor: Point): void {
    if (this.state !== 'dragging') return

    const hit = this.hitDetector.detect(cursor, this.cache)
    if (!hit) {
      this.indicator.hide()
      this.lastTarget = null
      return
    }

    const children = this.cache.getChildren(hit.containerId)
    const insertion = this.calculator.calculate(cursor, children, hit.layout, hit.containerRect)

    this.indicator.show(insertion.linePosition, insertion.lineSize, insertion.orientation)

    this.lastTarget = {
      containerId: hit.containerId,
      insertionIndex: insertion.index,
    }
  }

  async drop(): Promise<void> {
    if (!this.source || !this.lastTarget) {
      this.reset()
      return
    }

    try {
      await this.codeExecutor.insertComponent(this.source, this.lastTarget)
    } finally {
      this.reset()
    }
  }

  cancel(): void {
    this.reset()
  }

  isDragging(): boolean {
    return this.state === 'dragging'
  }

  private reset(): void {
    this.state = 'idle'
    this.source = null
    this.lastTarget = null
    this.indicator.hide()
    this.cache.invalidate()
  }
}
```

---

## Phase 4: Integration

### 4.1 Event-Handler anpassen

**Datei:** `studio/preview/preview-controller.ts` (bestehend)

**Änderungen:**

```typescript
// Bestehende Drag-Handler durch DragController ersetzen

private dragController: DragController
private rafPending = false

initDragHandlers(): void {
  const container = this.previewContainer

  container.addEventListener('dragover', (e) => {
    e.preventDefault()

    if (!this.rafPending) {
      this.rafPending = true
      requestAnimationFrame(() => {
        this.dragController.updatePosition({
          x: e.clientX,
          y: e.clientY
        })
        this.rafPending = false
      })
    }
  })

  container.addEventListener('drop', (e) => {
    e.preventDefault()
    this.dragController.drop()
  })

  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget as Node)) {
      this.dragController.cancel()
    }
  })
}
```

### 4.2 Component Panel anpassen

**Datei:** `studio/panels/components/component-panel.ts` (bestehend)

**Änderungen:**

```typescript
// dragstart Event anpassen

private handleDragStart(e: DragEvent, item: ComponentItem): void {
  if (!e.dataTransfer) return

  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/mirror-component', JSON.stringify({
    type: 'palette',
    componentName: item.name,
    template: item.template
  }))

  // DragController starten
  const preview = document.getElementById('preview')
  if (preview) {
    getDragController().startDrag({
      type: 'palette',
      componentName: item.name,
      template: item.template
    }, preview)
  }
}
```

### 4.3 Alte Drag-Logik entfernen

**Dateien zum Aufräumen:**

- `studio/preview/drag-preview.ts` → Entfernen oder stark reduzieren
- `studio/preview/drop-target-overlay.ts` → Prüfen ob noch benötigt
- Alte Insertion-Logik in preview-controller.ts → Entfernen

---

## Phase 5: Polish & Cleanup

### 5.1 Visuelle Verbesserungen

- Indicator-Animation (optional): Kurzes Fade-In
- Indicator-Farbe aus Theme-Tokens
- Edge-Case: Indicator bei sehr schmalen Containern

### 5.2 Edge Cases

- Drag über nicht-droppable Bereiche
- Schnelle Mausbewegungen
- Drag außerhalb des Fensters
- Escape-Taste zum Abbrechen

### 5.3 Cleanup

- Alte Ghost-Renderer-Referenzen (bereits entfernt)
- Ungenutzte Imports
- Dokumentation aktualisieren

---

## Dateistruktur

```
studio/preview/drag/
├── index.ts              # Exports
├── layout-cache.ts       # Phase 1.1
├── insertion-calculator.ts # Phase 1.2
├── hit-detector.ts       # Phase 2.1
├── indicator.ts          # Phase 2.2
├── drag-controller.ts    # Phase 3.1
└── types.ts              # Shared Interfaces
```

---

## Zeitplan

| Phase     | Beschreibung                             | Geschätzt |
| --------- | ---------------------------------------- | --------- |
| 1         | Core-Komponenten (Cache, Calculator)     | ~1h       |
| 2         | DOM-Komponenten (HitDetector, Indicator) | ~30min    |
| 3         | DragController                           | ~1h       |
| 4         | Integration                              | ~1-2h     |
| 5         | Polish & Cleanup                         | ~1h       |
| **Total** |                                          | **~5h**   |

---

## Risiken & Mitigationen

| Risiko                                       | Mitigation                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| LayoutCache wird ungültig bei DOM-Änderungen | Cache nur während eines Drags gültig, wird bei dragend invalidiert           |
| Performance bei vielen Elementen             | querySelectorAll + Map ist O(n), sollte für <1000 Elemente kein Problem sein |
| Koordinaten-Offset durch Scroll              | Verwende `getBoundingClientRect()` das Scroll berücksichtigt                 |
| Z-Index Konflikte                            | Indicator hat z-index 10000, sollte über allem liegen                        |

---

## Erfolgs-Kriterien

1. **Performance:** `updatePosition()` < 1ms (messbar via Performance.now())
2. **Stabilität:** Kein Flackern, keine falschen Positionen
3. **UX:** Indicator folgt Maus ohne merkbare Verzögerung
4. **Code:** < 250 LOC für alle neuen Dateien zusammen
