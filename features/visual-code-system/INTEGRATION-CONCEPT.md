# Visual Code System - Integrationskonzept

## Grundprinzip

**Die bestehende App bleibt. Wir erweitern sie.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Mirror Studio                                                           │
├───────────────┬───────────────────────────────┬─────────────────────────┤
│               │                               │                          │
│    EDITOR     │          PREVIEW              │      PANELS              │
│    (bleibt)   │          (bleibt)             │      (bleibt)            │
│               │                               │                          │
│               │    ┌───────────────────┐      │   ┌──────────────────┐  │
│               │    │  Overlay-Layer    │ NEU  │   │ Components Panel │  │
│               │    │  - Resize Handles │      │   │ (Items werden    │  │
│               │    │  - Drop Zones     │      │   │  draggable)  NEU │  │
│               │    │  - Zone Indicator │      │   └──────────────────┘  │
│               │    └───────────────────┘      │                          │
│               │                               │   ┌──────────────────┐  │
│               │                               │   │ Property Panel   │  │
│               │                               │   │ (bleibt)         │  │
│               │                               │   └──────────────────┘  │
│               │                               │                          │
└───────────────┴───────────────────────────────┴─────────────────────────┘
```

---

## Was bleibt, was kommt dazu

### BLEIBT (keine Änderungen)

| Komponente | Beschreibung |
|------------|--------------|
| App-Layout | Editor links, Preview mitte, Panels rechts |
| Editor | CodeMirror mit Mirror-Syntax |
| Preview Rendering | Kompiliert Mirror → DOM |
| Property Panel | Eigenschaften bearbeiten |
| Compile-Flow | Code → AST → IR → DOM |
| Sync-System | SyncCoordinator, SourceMap |
| Command Executor | Undo/Redo |
| State Store | Zentraler State |

### ERWEITERN (bestehende Komponenten)

| Komponente | Erweiterung |
|------------|-------------|
| Components Panel | Zeigt Mirror-Komponenten aus Library, Items draggable |
| Preview Container | Bekommt Overlay-Layer |
| State | `visualSelection` für Multi-Select |
| PreviewController | Resize-Handles, Drop-Target |

### NEU (neue Module)

| Modul | Funktion |
|-------|----------|
| `studio/visual/overlay-manager.ts` | Verwaltet Overlay-Elemente |
| `studio/visual/resize-manager.ts` | 8-Punkt Resize |
| `studio/visual/drag-drop-coordinator.ts` | Drag-Drop Orchestrierung |
| `studio/core/commands/*.ts` | Insert, Move, Resize, Delete, etc. |

---

## Kernprinzip: Alles ist Mirror

### Layout-Templates = Mirror-Komponenten

**Wichtige Erkenntnis:** Die Layout-Templates in der Components Palette (VStack, HStack, Grid, Card, etc.) sind **keine Sonderfälle**. Sie sind ganz normale Mirror-Komponenten, die in einer Library-Datei definiert werden.

```mirror
// library.mirror oder components.mirror

// Layout-Templates
VStack: ver gap 8
HStack: hor gap 8
Grid: grid 3 gap 8
Stack: stacked

// Container
Container: w full pad 16
Card: pad 16 bg $surface rad 8
Section: ver gap 16

// Primitive Erweiterungen
PrimaryButton: pad 12 24 bg $primary rad 8 cursor pointer
  state hover bg $primary.hover
```

### Was das bedeutet

| Statt | Besser |
|-------|--------|
| Hardcoded JS-Array mit Templates | `library.mirror` Datei |
| Spezielle "Layout Template" Logik | Normale Komponenten-Definitionen |
| Getrennte Systeme für "Palette" vs "Code" | **Ein System: Mirror** |

### Der Vorteil

1. **User-erweiterbar** - Benutzer können eigene Layout-Templates definieren
2. **Konsistent** - Dieselben Tokens, dieselbe Syntax
3. **Sichtbar** - Templates sind editierbar im Studio selbst
4. **Kein Sondercode** - Components Panel lädt einfach alle definierten Komponenten

### Implementierung

```typescript
// Components Panel lädt Komponenten aus:
// 1. Primitives (Box, Text, Image, Input, Icon, Button)
// 2. Library-Datei (library.mirror oder components.mirror)
// 3. User-definierte Komponenten im Projekt

function loadComponentsForPalette(): ComponentItem[] {
  const primitives = getPrimitives()                    // Built-in
  const library = parseLibrary('library.mirror')        // Layout-Templates
  const userComponents = parseUserComponents()          // Projekt-spezifisch

  return [...primitives, ...library, ...userComponents]
}
```

---

## Architektur

### Code ist Source of Truth

```
Editor (Code)  ←──────────────────────────────────────┐
      │                                                │
      ▼                                                │
   Compile                                             │
      │                                                │
      ▼                                                │
  SourceMap  ────────→  Preview (DOM)                  │
      │                      │                         │
      │                      ▼                         │
      │              Overlay-Layer                     │
      │                      │                         │
      │                      ▼                         │
      │              User Interaction                  │
      │              (Resize, Drag, etc.)              │
      │                      │                         │
      │                      ▼                         │
      └─────────────→  Command                         │
                           │                           │
                           ▼                           │
                      CodeModifier  ───────────────────┘
```

**Wichtig:** Visuelle Änderungen modifizieren den Code. Der Code wird neu kompiliert. Die Preview aktualisiert sich.

### Overlay-Layer

Der Overlay-Layer liegt **über** der Preview, aber **innerhalb** des Preview-Containers:

```html
<!-- Bestehend -->
<div class="preview-container" id="preview">

  <!-- Bestehend: Kompilierter Code -->
  <div class="preview-content">
    <div data-mirror-id="node-1">...</div>
    <div data-mirror-id="node-2">...</div>
  </div>

  <!-- NEU: Overlay-Layer -->
  <div class="visual-overlay" style="position: absolute; inset: 0; pointer-events: none;">
    <!-- Resize Handles (pointer-events: auto) -->
    <div class="resize-handles">...</div>

    <!-- Drop Zone Highlight -->
    <div class="drop-zone-highlight">...</div>

    <!-- Sibling Insert Line -->
    <div class="sibling-line">...</div>

    <!-- Zone Indicator -->
    <div class="zone-indicator">...</div>
  </div>

</div>
```

---

## Komponenten im Detail

### 1. Components Panel (ERWEITERN)

**Aktuell:** Statische Liste von Primitives

**Neu:**
- Lädt Komponenten aus Mirror-Dateien (Primitives + Library + User)
- Items sind draggable
- Kategorien basierend auf Datei-Herkunft

```typescript
// studio/panels/components/index.ts (ERWEITERN)

interface ComponentSource {
  name: string
  code: string           // Mirror-Code der Komponente
  category: 'primitive' | 'library' | 'user'
  icon?: string
}

/**
 * Lädt alle verfügbaren Komponenten für die Palette
 * Komponenten kommen aus:
 * 1. Primitives (Box, Text, Image, Input, Icon, Button) - hardcoded
 * 2. library.mirror - Layout-Templates wie VStack, HStack, Card
 * 3. components.mirror - User-definierte Komponenten im Projekt
 */
function loadComponents(): ComponentSource[] {
  // 1. Built-in Primitives
  const primitives: ComponentSource[] = [
    { name: 'Box', code: 'Box', category: 'primitive', icon: 'square' },
    { name: 'Text', code: 'Text "Label"', category: 'primitive', icon: 'type' },
    { name: 'Image', code: 'Image src ""', category: 'primitive', icon: 'image' },
    { name: 'Input', code: 'Input placeholder "..."', category: 'primitive', icon: 'text-cursor-input' },
    { name: 'Icon', code: 'Icon name "star"', category: 'primitive', icon: 'star' },
    { name: 'Button', code: 'Button', category: 'primitive', icon: 'mouse-pointer-click' },
  ]

  // 2. Library (Layout-Templates) aus library.mirror
  const library = parseLibraryFile('library.mirror')

  // 3. User-Komponenten aus components.mirror
  const user = parseComponentsFile('components.mirror')

  return [...primitives, ...library, ...user]
}

function makeItemsDraggable(container: HTMLElement): void {
  const items = container.querySelectorAll('.component-item')

  items.forEach(item => {
    item.setAttribute('draggable', 'true')
    item.addEventListener('dragstart', (e) => {
      const data: DragData = {
        type: 'component',
        component: item.dataset.component,  // 'VStack', 'Card', etc.
        code: item.dataset.code,            // 'ver gap 8', 'pad 16 bg $surface rad 8'
      }
      e.dataTransfer.setData('application/mirror-component', JSON.stringify(data))
      e.dataTransfer.effectAllowed = 'copy'

      events.emit('drag:start', data)
    })
  })
}
```

**CSS Ergänzungen:**
```css
.component-item {
  cursor: grab;
}
.component-item:active {
  cursor: grabbing;
}
.component-item.dragging {
  opacity: 0.5;
}
```

### 2. Preview Container (ERWEITERN)

**Aktuell:** Rendert kompilierten Code, Selection-Highlight

**Neu:** Drop-Target, Overlay-Layer

```typescript
// studio/preview/index.ts (ERWEITERN)

export class PreviewController {
  // ... bestehender Code ...

  private overlayManager: OverlayManager | null = null
  private resizeManager: ResizeManager | null = null
  private dropTarget: DropTarget | null = null

  constructor(config: PreviewConfig) {
    // ... bestehender Code ...

    // NEU: Visual Code Features
    if (config.enableVisualCode) {
      this.overlayManager = new OverlayManager(this.container)
      this.resizeManager = new ResizeManager({
        container: this.container,
        overlayManager: this.overlayManager,
        sourceMap: () => this.sourceMap
      })
      this.dropTarget = new DropTarget({
        container: this.container,
        overlayManager: this.overlayManager,
        sourceMap: () => this.sourceMap
      })
    }
  }

  // Bestehende Methode erweitern
  select(nodeId: string | null): void {
    // ... bestehender Code ...

    // NEU: Resize Handles zeigen
    if (nodeId) {
      this.resizeManager?.showHandles(nodeId)
    } else {
      this.resizeManager?.hideHandles()
    }
  }

  // Bestehende Methode erweitern
  refresh(): void {
    // ... bestehender Code ...

    // NEU: Handles neu positionieren
    this.resizeManager?.refresh()
  }
}
```

### 3. OverlayManager (NEU)

```typescript
// studio/visual/overlay-manager.ts

export class OverlayManager {
  private container: HTMLElement
  private overlay: HTMLElement

  // Overlay-Elemente
  private resizeHandles: HTMLElement
  private dropZoneHighlight: HTMLElement
  private siblingLine: HTMLElement
  private zoneIndicator: HTMLElement
  private semanticDots: HTMLElement

  constructor(previewContainer: HTMLElement) {
    this.container = previewContainer
    this.overlay = this.createOverlay()
    this.container.appendChild(this.overlay)
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'visual-overlay'
    overlay.innerHTML = `
      <div class="resize-handles"></div>
      <div class="drop-zone-highlight"></div>
      <div class="semantic-dots"></div>
      <div class="sibling-line"></div>
      <div class="zone-indicator"><span class="zone-name"></span></div>
    `
    return overlay
  }

  // Resize Handles
  getResizeHandlesContainer(): HTMLElement {
    return this.overlay.querySelector('.resize-handles')!
  }

  // Drop Zone
  showDropZone(rect: DOMRect): void {
    const el = this.overlay.querySelector('.drop-zone-highlight') as HTMLElement
    Object.assign(el.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  hideDropZone(): void {
    const el = this.overlay.querySelector('.drop-zone-highlight') as HTMLElement
    el.style.display = 'none'
  }

  // Semantic Zone Dots (9 Punkte)
  showSemanticDots(rect: DOMRect, activeZone: SemanticZone | null): void {
    const container = this.overlay.querySelector('.semantic-dots') as HTMLElement
    container.style.display = 'block'

    // Position container
    Object.assign(container.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })

    // Update dots
    const zones = ['top-left', 'top-center', 'top-right',
                   'mid-left', 'mid-center', 'mid-right',
                   'bot-left', 'bot-center', 'bot-right']

    container.innerHTML = zones.map(zone =>
      `<div class="zone-dot ${zone} ${zone === activeZone ? 'active' : ''}"></div>`
    ).join('')
  }

  hideSemanticDots(): void {
    const el = this.overlay.querySelector('.semantic-dots') as HTMLElement
    el.style.display = 'none'
  }

  // Sibling Line
  showSiblingLine(rect: DOMRect, position: 'before' | 'after', direction: 'horizontal' | 'vertical'): void {
    const el = this.overlay.querySelector('.sibling-line') as HTMLElement
    el.style.display = 'block'

    if (direction === 'horizontal') {
      // Vertikale Linie
      Object.assign(el.style, {
        left: position === 'before' ? `${rect.left - 2}px` : `${rect.right - 1}px`,
        top: `${rect.top}px`,
        width: '3px',
        height: `${rect.height}px`,
      })
    } else {
      // Horizontale Linie
      Object.assign(el.style, {
        left: `${rect.left}px`,
        top: position === 'before' ? `${rect.top - 2}px` : `${rect.bottom - 1}px`,
        width: `${rect.width}px`,
        height: '3px',
      })
    }
  }

  hideSiblingLine(): void {
    const el = this.overlay.querySelector('.sibling-line') as HTMLElement
    el.style.display = 'none'
  }

  // Zone Indicator
  showZoneIndicator(containerName: string, zoneName: string): void {
    const el = this.overlay.querySelector('.zone-indicator') as HTMLElement
    const nameEl = el.querySelector('.zone-name') as HTMLElement
    nameEl.textContent = `${containerName} | ${zoneName}`
    el.classList.add('visible')
  }

  hideZoneIndicator(): void {
    const el = this.overlay.querySelector('.zone-indicator') as HTMLElement
    el.classList.remove('visible')
  }

  // Cleanup
  dispose(): void {
    this.overlay.remove()
  }
}
```

### 4. ResizeManager (NEU)

```typescript
// studio/visual/resize-manager.ts

export class ResizeManager {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: () => SourceMap | null

  private handles: HTMLElement[] = []
  private activeResize: ResizeState | null = null
  private sizeIndicator: HTMLElement | null = null

  constructor(config: {
    container: HTMLElement
    overlayManager: OverlayManager
    sourceMap: () => SourceMap | null
  }) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.sourceMap

    this.setupEventListeners()
  }

  showHandles(nodeId: string): void {
    this.hideHandles()

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    // Relative Position
    const relRect = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    }

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()

    // 8 Handles erstellen
    const positions = [
      { pos: 'nw', x: 0, y: 0 },
      { pos: 'n', x: 0.5, y: 0 },
      { pos: 'ne', x: 1, y: 0 },
      { pos: 'e', x: 1, y: 0.5 },
      { pos: 'se', x: 1, y: 1 },
      { pos: 's', x: 0.5, y: 1 },
      { pos: 'sw', x: 0, y: 1 },
      { pos: 'w', x: 0, y: 0.5 },
    ]

    positions.forEach(({ pos, x, y }) => {
      const handle = document.createElement('div')
      handle.className = `resize-handle ${pos}`
      handle.dataset.position = pos
      handle.dataset.nodeId = nodeId
      handle.style.cssText = `
        position: absolute;
        left: ${relRect.left + relRect.width * x - 4}px;
        top: ${relRect.top + relRect.height * y - 4}px;
        width: 8px;
        height: 8px;
        background: white;
        border: 2px solid #3B82F6;
        border-radius: 50%;
        cursor: ${this.getCursor(pos)};
        pointer-events: auto;
        z-index: 1000;
      `
      handlesContainer.appendChild(handle)
      this.handles.push(handle)
    })
  }

  hideHandles(): void {
    this.handles.forEach(h => h.remove())
    this.handles = []
  }

  refresh(): void {
    const nodeId = state.get().selection.nodeId
    if (nodeId) {
      this.showHandles(nodeId)
    }
  }

  private setupEventListeners(): void {
    const handlesContainer = this.overlayManager.getResizeHandlesContainer()

    handlesContainer.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  private onMouseDown(e: MouseEvent): void {
    const handle = (e.target as HTMLElement).closest('.resize-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const nodeId = handle.dataset.nodeId!
    const position = handle.dataset.position!
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    const rect = element.getBoundingClientRect()

    this.activeResize = {
      nodeId,
      handle: position as ResizeHandle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      element,
    }

    events.emit('resize:start', { nodeId, handle: position })
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeResize) return

    const { handle, startX, startY, startWidth, startHeight, nodeId, element } = this.activeResize
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight

    // Berechne neue Größe basierend auf Handle
    if (handle.includes('e')) newWidth = startWidth + dx
    if (handle.includes('w')) newWidth = startWidth - dx
    if (handle.includes('s')) newHeight = startHeight + dy
    if (handle.includes('n')) newHeight = startHeight - dy

    // Minimum
    newWidth = Math.max(40, newWidth)
    newHeight = Math.max(40, newHeight)

    // Sizing-Modus erkennen
    const sourceMap = this.getSourceMap()
    const node = sourceMap?.getNodeById(nodeId)
    const parentId = node?.parentId

    let widthMode: 'fill' | 'hug' | number = newWidth
    let heightMode: 'fill' | 'hug' | number = newHeight

    if (parentId) {
      const available = this.getAvailableSpace(parentId, nodeId)
      const childMin = this.getChildrenMinSize(nodeId)

      widthMode = this.detectSizingMode(newWidth, available.width, childMin.width)
      heightMode = this.detectSizingMode(newHeight, available.height, childMin.height)
    }

    // Size Indicator zeigen
    this.showSizeIndicator(element, widthMode, heightMode)

    events.emit('resize:move', { nodeId, width: widthMode, height: heightMode })
  }

  private onMouseUp(): void {
    if (!this.activeResize) return

    this.hideSizeIndicator()

    // Command ausführen wird vom Event-Handler gemacht
    events.emit('resize:end', {
      nodeId: this.activeResize.nodeId,
      // Final values from last move event
    })

    this.activeResize = null
  }

  private detectSizingMode(newSize: number, available: number, childMin: number): 'fill' | 'hug' | number {
    const SNAP_THRESHOLD = 10

    if (newSize >= available - SNAP_THRESHOLD) return 'fill'
    if (newSize <= childMin + SNAP_THRESHOLD) return 'hug'
    return Math.round(newSize)
  }

  private getAvailableSpace(parentId: string, excludeId: string): { width: number, height: number } {
    // TODO: Implementierung via SmartSizingService
    return { width: 400, height: 400 }
  }

  private getChildrenMinSize(nodeId: string): { width: number, height: number } {
    // TODO: Implementierung
    return { width: 40, height: 40 }
  }

  private showSizeIndicator(element: HTMLElement, width: 'fill' | 'hug' | number, height: 'fill' | 'hug' | number): void {
    if (!this.sizeIndicator) {
      this.sizeIndicator = document.createElement('div')
      this.sizeIndicator.className = 'size-indicator'
      document.body.appendChild(this.sizeIndicator)
    }

    const rect = element.getBoundingClientRect()
    const wStr = typeof width === 'number' ? `${width}px` : width
    const hStr = typeof height === 'number' ? `${height}px` : height

    this.sizeIndicator.textContent = `${wStr} × ${hStr}`
    this.sizeIndicator.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      pointer-events: none;
      z-index: 10001;
    `
  }

  private hideSizeIndicator(): void {
    this.sizeIndicator?.remove()
    this.sizeIndicator = null
  }

  private getCursor(pos: string): string {
    const cursors: Record<string, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
      e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
      sw: 'nesw-resize', w: 'ew-resize',
    }
    return cursors[pos] || 'pointer'
  }

  dispose(): void {
    this.hideHandles()
    this.hideSizeIndicator()
  }
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface ResizeState {
  nodeId: string
  handle: ResizeHandle
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  element: HTMLElement
}
```

### 5. DropTarget (NEU)

```typescript
// studio/visual/drop-target.ts

export class DropTarget {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: () => SourceMap | null
  private dropZoneCalculator: DropZoneCalculator

  constructor(config: {
    container: HTMLElement
    overlayManager: OverlayManager
    sourceMap: () => SourceMap | null
  }) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.sourceMap
    this.dropZoneCalculator = new DropZoneCalculator({
      container: this.container,
      nodeIdAttribute: 'data-mirror-id',
      enableSemanticZones: true,
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.container.addEventListener('dragover', this.onDragOver.bind(this))
    this.container.addEventListener('dragleave', this.onDragLeave.bind(this))
    this.container.addEventListener('drop', this.onDrop.bind(this))
  }

  private onDragOver(e: DragEvent): void {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'

    const dropZone = this.dropZoneCalculator.calculateFromPoint(e.clientX, e.clientY)

    if (dropZone) {
      const rect = dropZone.element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()

      // Relative rect
      const relRect = new DOMRect(
        rect.left - containerRect.left,
        rect.top - containerRect.top,
        rect.width,
        rect.height
      )

      this.overlayManager.showDropZone(relRect)

      if (dropZone.placement === 'inside' && dropZone.semanticZone) {
        this.overlayManager.showSemanticDots(relRect, dropZone.semanticZone)
        this.overlayManager.showZoneIndicator(
          this.getNodeName(dropZone.targetId),
          this.formatZoneName(dropZone.semanticZone)
        )
      } else if (dropZone.placement === 'before' || dropZone.placement === 'after') {
        this.overlayManager.hideSemanticDots()
        const direction = this.getParentDirection(dropZone.targetId)
        this.overlayManager.showSiblingLine(relRect, dropZone.placement, direction)
        this.overlayManager.showZoneIndicator(
          this.getNodeName(dropZone.targetId),
          dropZone.placement === 'before' ? 'DAVOR' : 'DANACH'
        )
      }
    } else {
      this.hideAllOverlays()
    }
  }

  private onDragLeave(e: DragEvent): void {
    // Nur ausblenden wenn wirklich außerhalb
    const rect = this.container.getBoundingClientRect()
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
      this.hideAllOverlays()
    }
  }

  private onDrop(e: DragEvent): void {
    e.preventDefault()
    this.hideAllOverlays()

    const dataStr = e.dataTransfer?.getData('application/mirror-component')
    if (!dataStr) return

    const dragData: DragData = JSON.parse(dataStr)
    const dropZone = this.dropZoneCalculator.calculateFromPoint(e.clientX, e.clientY)

    if (dropZone) {
      events.emit('drop:component', { dragData, dropZone })
    }
  }

  private hideAllOverlays(): void {
    this.overlayManager.hideDropZone()
    this.overlayManager.hideSemanticDots()
    this.overlayManager.hideSiblingLine()
    this.overlayManager.hideZoneIndicator()
  }

  private getNodeName(nodeId: string): string {
    const sourceMap = this.getSourceMap()
    const node = sourceMap?.getNodeById(nodeId)
    return node?.name || 'Container'
  }

  private getParentDirection(nodeId: string): 'horizontal' | 'vertical' {
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`)
    const parent = element?.parentElement
    if (!parent) return 'vertical'

    const style = window.getComputedStyle(parent)
    return style.flexDirection === 'row' ? 'horizontal' : 'vertical'
  }

  private formatZoneName(zone: SemanticZone): string {
    const names: Record<SemanticZone, string> = {
      'top-left': 'OBEN-LINKS',
      'top-center': 'OBEN-MITTE',
      'top-right': 'OBEN-RECHTS',
      'mid-left': 'MITTE-LINKS',
      'mid-center': 'MITTE',
      'mid-right': 'MITTE-RECHTS',
      'bot-left': 'UNTEN-LINKS',
      'bot-center': 'UNTEN-MITTE',
      'bot-right': 'UNTEN-RECHTS',
    }
    return names[zone] || zone
  }

  dispose(): void {
    // Event Listeners entfernen
  }
}
```

---

## Commands

### ResizeCommand

```typescript
// studio/core/commands/resize.ts

export class ResizeCommand implements Command {
  readonly type = 'RESIZE'
  readonly description: string

  private nodeId: string
  private width?: 'full' | 'hug' | number
  private height?: 'full' | 'hug' | number
  private originalSource: string | null = null

  constructor(params: {
    nodeId: string
    width?: 'full' | 'hug' | number
    height?: 'full' | 'hug' | number
  }) {
    this.nodeId = params.nodeId
    this.width = params.width
    this.height = params.height
    this.description = `Resize ${params.nodeId}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    this.originalSource = ctx.getSource()

    const props: Record<string, string> = {}
    if (this.width !== undefined) {
      props.w = this.width === 'full' ? 'full' :
                this.width === 'hug' ? 'hug' :
                String(this.width)
    }
    if (this.height !== undefined) {
      props.h = this.height === 'full' ? 'full' :
                this.height === 'hug' ? 'hug' :
                String(this.height)
    }

    const modifier = new CodeModifier(ctx.getSource(), ctx.getSourceMap()!)
    const result = modifier.setProperties(this.nodeId, props)

    if (!result.success) return { success: false, error: result.error }

    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }

    const ctx = getCommandContext()
    ctx.applyChange({
      from: 0,
      to: ctx.getSource().length,
      insert: this.originalSource
    })

    return { success: true }
  }
}
```

### InsertComponentCommand

```typescript
// studio/core/commands/insert-component.ts

export class InsertComponentCommand implements Command {
  readonly type = 'INSERT_COMPONENT'
  readonly description: string

  private parentId: string
  private component: string
  private placement: 'inside' | 'before' | 'after'
  private referenceId?: string
  private semanticZone?: SemanticZone
  private properties?: string
  private originalSource: string | null = null

  constructor(params: {
    parentId: string
    component: string
    placement: 'inside' | 'before' | 'after'
    referenceId?: string
    semanticZone?: SemanticZone
    properties?: string
  }) {
    this.parentId = params.parentId
    this.component = params.component
    this.placement = params.placement
    this.referenceId = params.referenceId
    this.semanticZone = params.semanticZone
    this.properties = params.properties
    this.description = `Insert ${params.component}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    this.originalSource = ctx.getSource()
    const modifier = new CodeModifier(ctx.getSource(), ctx.getSourceMap()!)

    let result: ModificationResult

    if (this.placement === 'inside' && this.semanticZone) {
      // Mit Wrapper einfügen
      result = modifier.insertWithWrapper(
        this.parentId,
        this.component,
        this.semanticZone,
        { properties: this.properties }
      )
    } else if (this.placement === 'before' || this.placement === 'after') {
      // Als Sibling einfügen
      result = modifier.insertSibling(
        this.referenceId!,
        this.component,
        this.placement,
        { properties: this.properties }
      )
    } else {
      // Als Kind einfügen
      result = modifier.addChild(
        this.parentId,
        this.component,
        { properties: this.properties }
      )
    }

    if (!result.success) return { success: false, error: result.error }

    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }

    const ctx = getCommandContext()
    ctx.applyChange({
      from: 0,
      to: ctx.getSource().length,
      insert: this.originalSource
    })

    return { success: true }
  }
}
```

---

## CSS Erweiterungen

```css
/* studio/styles.css - ERGÄNZUNGEN */

/* ============================================================================
   Visual Overlay
   ============================================================================ */

.visual-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

/* Drop Zone Highlight */
.drop-zone-highlight {
  display: none;
  position: absolute;
  border: 2px solid #3B82F6;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  pointer-events: none;
}

/* Semantic Zone Dots */
.semantic-dots {
  display: none;
  position: absolute;
  pointer-events: none;
}

.zone-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transition: all 0.15s;
}

.zone-dot.active {
  background: #3B82F6;
  box-shadow: 0 0 12px #3B82F6;
  transform: scale(1.4);
}

.zone-dot.top-left { top: 12px; left: 12px; }
.zone-dot.top-center { top: 12px; left: 50%; margin-left: -5px; }
.zone-dot.top-right { top: 12px; right: 12px; }
.zone-dot.mid-left { top: 50%; left: 12px; margin-top: -5px; }
.zone-dot.mid-center { top: 50%; left: 50%; margin: -5px 0 0 -5px; }
.zone-dot.mid-right { top: 50%; right: 12px; margin-top: -5px; }
.zone-dot.bot-left { bottom: 12px; left: 12px; }
.zone-dot.bot-center { bottom: 12px; left: 50%; margin-left: -5px; }
.zone-dot.bot-right { bottom: 12px; right: 12px; }

/* Sibling Insert Line */
.sibling-line {
  display: none;
  position: absolute;
  background: #3B82F6;
  border-radius: 2px;
  box-shadow: 0 0 8px #3B82F6;
  pointer-events: none;
}

/* Zone Indicator */
.zone-indicator {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: #1F2937;
  border: 1px solid #374151;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #E5E7EB;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.zone-indicator.visible {
  opacity: 1;
}

.zone-indicator .zone-name {
  color: #3B82F6;
}

/* Resize Handles */
.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-handle {
  pointer-events: auto;
}

.resize-handle:hover {
  transform: scale(1.3);
  background: #3B82F6 !important;
}

/* Size Indicator */
.size-indicator {
  position: fixed;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  pointer-events: none;
  z-index: 10001;
  white-space: nowrap;
}

/* Components Panel - Draggable Items */
.component-item {
  cursor: grab;
  user-select: none;
  transition: opacity 0.15s, border-color 0.15s;
}

.component-item:active {
  cursor: grabbing;
}

.component-item.dragging {
  opacity: 0.5;
}

.component-item:hover {
  border-color: #3B82F6;
}
```

---

## Implementierungs-Phasen

### Phase A: Overlay + Resize (Basis)

**Ziel:** Element selektieren → Resize-Handles → Größe ändern

1. OverlayManager erstellen
2. ResizeManager erstellen
3. ResizeCommand implementieren
4. Integration in PreviewController

**Akzeptanz:**
- [ ] Selektiertes Element zeigt 8 Resize-Handles
- [ ] Drag auf Handle ändert Größe
- [ ] Size-Indicator zeigt aktuelle Größe
- [ ] Snap zu fill/hug funktioniert
- [ ] Code wird aktualisiert
- [ ] Undo/Redo funktioniert

### Phase B: Drag from Palette

**Ziel:** Komponente aus Components Panel in Preview ziehen

1. Components Panel Items draggable machen
2. DropTarget erstellen
3. InsertComponentCommand implementieren
4. Drop-Zone Highlight

**Akzeptanz:**
- [ ] Items im Components Panel sind draggable
- [ ] Beim Drag über Preview: Container wird gehighlightet
- [ ] Drop fügt Komponente ein
- [ ] Code wird aktualisiert

### Phase C: Semantic Zones + Sibling

**Ziel:** 9-Zonen Positionierung + Schwester-Einfügung

1. Semantic Dots aktivieren
2. Zone Indicator
3. Sibling-Line
4. Wrapper-Generierung bei Zone-Drop

**Akzeptanz:**
- [ ] 9 Dots erscheinen beim Drag
- [ ] Aktive Zone leuchtet
- [ ] Zone-Indicator zeigt Position
- [ ] Am Rand: Sibling-Line
- [ ] Zone-Drop generiert Wrapper

### Phase D: Move + Multi-Select + Keyboard

**Ziel:** Vollständige Manipulation

1. Preview-Elemente draggable (Move)
2. Multi-Select mit Shift+Click
3. Keyboard Shortcuts (Delete, Cmd+D, Cmd+G)
4. Entsprechende Commands

**Akzeptanz:**
- [ ] Element verschieben funktioniert
- [ ] Shift+Click: Multi-Select
- [ ] Delete löscht
- [ ] Cmd+D dupliziert
- [ ] Cmd+G gruppiert

---

## Zusammenfassung

| Was | Wo | Wie |
|-----|-----|-----|
| Layout-Templates | `library.mirror` | Normale Mirror-Komponenten |
| Resize-Handles | Preview Overlay | ResizeManager |
| Drop-Zonen | Preview Overlay | DropTarget + OverlayManager |
| Draggable Items | Components Panel | dragstart Event |
| Commands | studio/core/commands/ | Command Pattern |
| State | studio/core/state.ts | visualSelection erweitern |

### Kernprinzipien

1. **Die App bleibt. Wir erweitern sie.**
2. **Alles ist Mirror.** Layout-Templates, User-Komponenten, Primitives - alles dieselbe Sprache.
3. **Ein System.** Keine Sonderbehandlung für "Palette" vs "Code".
