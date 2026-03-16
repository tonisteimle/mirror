# Visual Code System - Integrationsplan V2

## Prinzip

**Bestehende Systeme erweitern, nicht ersetzen.**

---

## Bestehende Systeme (nutzen, nicht ersetzen)

| System | Datei | Funktion |
|--------|-------|----------|
| **DropZoneCalculator** | `src/studio/drop-zone-calculator.ts` | Drop-Zonen, Edge-Detection, Indicators |
| **DragDropManager** | `src/studio/drag-drop-manager.ts` | Drag-Events, Drop-Handling |
| **CodeModifier** | `src/studio/code-modifier.ts` | Code-Änderungen |
| **SyncCoordinator** | `studio/sync/sync-coordinator.ts` | Editor ↔ Preview ↔ Panel Sync |
| **PreviewController** | `studio/preview/index.ts` | Preview-Interaktion |
| **State Store** | `studio/core/state.ts` | Zentraler State |
| **Command Executor** | `studio/core/command-executor.ts` | Undo/Redo |

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VISUAL CODE SYSTEM                           │
│                    (Integration in bestehende Systeme)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PreviewController                          │   │
│  │              (koordiniert alle Interaktionen)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│           │                    │                    │                │
│           ▼                    ▼                    ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │DragDropManager│    │ HandleManager│    │  MultiSelect │          │
│  │  (erweitert)  │    │    (NEU)     │    │    (NEU)     │          │
│  └───────┬───────┘    └───────┬──────┘    └───────┬──────┘          │
│          │                    │                    │                 │
│          ▼                    │                    │                 │
│  ┌──────────────┐             │                    │                 │
│  │DropZone-     │             │                    │                 │
│  │Calculator    │             │                    │                 │
│  │(9-Zone, Grid)│             │                    │                 │
│  └───────┬──────┘             │                    │                 │
│          │                    │                    │                 │
│          └────────────────────┼────────────────────┘                 │
│                               ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      CodeModifier                             │   │
│  │          (erweitert um wrapNodes, insertWithWrapper)          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│                               ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Command Executor                           │   │
│  │                      (Undo/Redo)                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│                               ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              SyncCoordinator + State Store                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Wichtig:** HandleManager und MultiSelect arbeiten unabhängig von DropZoneCalculator.
Nur DragDropManager nutzt DropZoneCalculator für Drop-Zonen-Erkennung.

---

## Phasen-Übersicht

| Phase | Feature | Änderungen |
|-------|---------|------------|
| **1** | Sibling-Insertion | DropZoneCalculator: dynamischer Threshold |
| **2** | Semantic Drag (9-Zone) | DropZoneCalculator + CodeModifier: Wrapper-Generierung |
| **3** | Smart Sizing | SmartSizingService (NEU) |
| **4** | Direct Manipulation | HandleManager (NEU) |
| **5** | Multi-Select & Gruppieren | State erweitern, WrapNodesCommand |
| **6** | Grid-Layout | DropZoneCalculator: Grid-Zellen (Future) |
| **7** | Polish | Edge Cases, Performance |

---

## Phase 1: Sibling-Insertion

**Ziel:** Bessere Edge-Detection für Sibling-Insertion.

### 1.1 DropZoneCalculator erweitern

**Datei:** `src/studio/drop-zone-calculator.ts`

```typescript
// Bestehender Code hat bereits:
// - edgeThreshold (0.25) als Option
// - before/after/inside placement
// - isHorizontalLayout() detection

// ERWEITERUNG: Dynamischer Threshold basierend auf Element-Größe
private calculateDynamicThreshold(element: HTMLElement, rect: DOMRect): number {
  const isHorizontal = this.isHorizontalLayout(element.parentElement)
  const size = isHorizontal ? rect.width : rect.height

  // Minimum 6px, Maximum 16px, sonst 15% der Größe
  return Math.min(16, Math.max(6, size * 0.15))
}

// In calculateFromPoint() ändern:
// ALT: const threshold = this.options.edgeThreshold
// NEU:
const dynamicThreshold = this.calculateDynamicThreshold(targetElement, rect)
const threshold = dynamicThreshold / (isHorizontalLayout ? rect.width : rect.height)
```

### 1.2 Tests erweitern

**Datei:** `src/studio/__tests__/drop-zone-calculator.test.ts`

```typescript
describe('Dynamic Edge Threshold', () => {
  it('should use smaller threshold for small elements', () => {
    // Element 40px breit → threshold ~6px
  })

  it('should use larger threshold for large elements', () => {
    // Element 200px breit → threshold ~16px (capped)
  })

  it('should respect layout direction', () => {
    // Horizontal layout → width-based threshold
    // Vertical layout → height-based threshold
  })
})
```

### 1.3 Akzeptanzkriterien

- [x] Threshold passt sich an Elementgröße an (6-16px)
- [x] Indikator-Linie ist mittig im Gap (bereits implementiert)
- [x] Horizontale/Vertikale Layouts funktionieren korrekt

**Status: ✅ Implementiert (2026-03-13)**
- `calculateDynamicThreshold()` in `src/studio/drop-zone-calculator.ts:123-131`
- Verwendet in `calculateFromPoint()` bei Zeile 172-175
- 4 neue Tests in `drop-zone-calculator.test.ts`

---

## Phase 2: Semantic Drag (9-Zone)

**Ziel:** Element in Zone ziehen → System generiert passenden Wrapper-Code.

### 2.1 Das 9-Zonen-Modell

```
┌─────────────────────────────────────┐
│  TL   │    TOP-CENTER    │   TR    │
│───────┼──────────────────┼─────────│
│ LEFT  │      CENTER      │  RIGHT  │
│───────┼──────────────────┼─────────│
│  BL   │   BOT-CENTER     │   BR    │
└─────────────────────────────────────┘
```

Jede Zone generiert spezifischen Code:

| Zone | Generierter Wrapper |
|------|---------------------|
| TOP-LEFT | `Box ver` mit `pad top N, pad left N` |
| TOP-CENTER | `Box ver, center` mit `pad top N` |
| TOP-RIGHT | `Box ver, hor` mit `pad top N, pad right N` |
| LEFT | `Box hor` (default, kein Wrapper nötig) |
| CENTER | `Box center` |
| RIGHT | `Box hor` mit Element am Ende |
| BOT-LEFT | `Box ver, hor` mit `pad bottom N, pad left N` |
| BOT-CENTER | `Box ver, center` mit `pad bottom N` |
| BOT-RIGHT | `Box ver, hor` mit `pad bottom N, pad right N` |

### 2.2 DropZoneCalculator erweitern

**Datei:** `src/studio/drop-zone-calculator.ts`

```typescript
// Neue Types
export type SemanticZone =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'mid-center' | 'mid-right'
  | 'bot-left' | 'bot-center' | 'bot-right'

export interface SemanticDropZone extends DropZone {
  semanticZone?: SemanticZone
}

// Neue Option
export interface DropZoneCalculatorOptions {
  // ... existing ...
  /** Enable 9-zone semantic positioning for 'inside' drops */
  enableSemanticZones?: boolean
}

// Neue Methode
calculateSemanticZone(
  clientX: number,
  clientY: number,
  containerRect: DOMRect
): SemanticZone {
  const relX = (clientX - containerRect.left) / containerRect.width
  const relY = (clientY - containerRect.top) / containerRect.height

  // 3x3 Grid
  const col = relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'center'
  const row = relY < 0.33 ? 'top' : relY > 0.66 ? 'bot' : 'mid'

  return `${row}-${col}` as SemanticZone
}

// In calculateFromPoint() erweitern:
if (placement === 'inside' && this.options.enableSemanticZones) {
  const semanticZone = this.calculateSemanticZone(clientX, clientY, rect)
  return {
    ...dropZone,
    semanticZone
  }
}
```

### 2.3 Semantic Zone Indicator

```typescript
// In showIndicator() erweitern:
private showSemanticZoneIndicator(dropZone: SemanticDropZone): void {
  if (!dropZone.semanticZone || !this.indicatorElement) return

  const rect = dropZone.element.getBoundingClientRect()
  const containerRect = this.container.getBoundingClientRect()

  // Zone-Highlight (9tel des Containers)
  const zoneWidth = rect.width / 3
  const zoneHeight = rect.height / 3

  const [row, col] = this.parseSemanticZone(dropZone.semanticZone)
  const colIndex = col === 'left' ? 0 : col === 'center' ? 1 : 2
  const rowIndex = row === 'top' ? 0 : row === 'mid' ? 1 : 2

  Object.assign(this.indicatorElement.style, {
    display: 'block',
    left: `${rect.left - containerRect.left + colIndex * zoneWidth}px`,
    top: `${rect.top - containerRect.top + rowIndex * zoneHeight}px`,
    width: `${zoneWidth}px`,
    height: `${zoneHeight}px`,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '2px dashed #3B82F6',
  })
}

private parseSemanticZone(zone: SemanticZone): [string, string] {
  const [row, col] = zone.split('-')
  return [row, col]
}
```

### 2.4 CodeModifier erweitern: Wrapper-Generierung

**Datei:** `src/studio/code-modifier.ts`

```typescript
/**
 * Insert a component with automatic wrapper based on semantic zone
 */
insertWithWrapper(
  parentId: string,
  componentName: string,
  semanticZone: SemanticZone,
  options: AddChildOptions = {}
): ModificationResult {
  const wrapperConfig = this.getWrapperForZone(semanticZone)

  if (!wrapperConfig.needsWrapper) {
    // Zone benötigt keinen Wrapper (z.B. mid-left in hor-Container)
    return this.addChild(parentId, componentName, options)
  }

  // Wrapper + Kind einfügen
  const wrapperProps = wrapperConfig.props
  const wrapperLine = `Box ${wrapperProps}`

  // Erst Wrapper einfügen
  const wrapperResult = this.addChild(parentId, 'Box', {
    ...options,
    properties: wrapperProps
  })

  if (!wrapperResult.success) return wrapperResult

  // Dann Kind in Wrapper (benötigt neuen SourceMap nach Compile)
  // → Callback-Pattern oder zwei-Schritt-Prozess
  return {
    ...wrapperResult,
    // Flag für DragDropManager: nach Compile Kind einfügen
    pendingChild: { componentName, options }
  }
}

private getWrapperForZone(zone: SemanticZone): { needsWrapper: boolean; props: string } {
  const configs: Record<SemanticZone, { needsWrapper: boolean; props: string }> = {
    'top-left':     { needsWrapper: true,  props: 'ver, pad top 16, pad left 16' },
    'top-center':   { needsWrapper: true,  props: 'ver, center, pad top 16' },
    'top-right':    { needsWrapper: true,  props: 'ver, hor, pad top 16, pad right 16' },
    'mid-left':     { needsWrapper: false, props: '' },  // Default in hor
    'mid-center':   { needsWrapper: true,  props: 'center' },
    'mid-right':    { needsWrapper: true,  props: 'hor, spread' },
    'bot-left':     { needsWrapper: true,  props: 'ver, spread, pad left 16' },
    'bot-center':   { needsWrapper: true,  props: 'ver, spread, center' },
    'bot-right':    { needsWrapper: true,  props: 'ver, spread, hor, pad right 16' },
  }
  return configs[zone]
}
```

### 2.5 DragDropManager Integration

**Datei:** `src/studio/drag-drop-manager.ts`

```typescript
// In insertComponent():
private insertComponent(dropZone: DropZone, dragData: DragData): ModificationResult {
  const { componentName, properties, textContent } = dragData
  const { placement, targetId } = dropZone

  // Semantic Zone handling
  if (placement === 'inside' && 'semanticZone' in dropZone && dropZone.semanticZone) {
    return this.codeModifier.insertWithWrapper(
      targetId,
      componentName,
      dropZone.semanticZone,
      { properties, textContent }
    )
  }

  // ... existing code for before/after/inside ...
}
```

### 2.6 Akzeptanzkriterien

- [x] 9-Zone Visual Feedback beim Drag
- [x] Wrapper wird generiert wenn nötig
- [x] mid-left generiert keinen Wrapper (Default)
- [x] Padding-Werte sind konfigurierbar (via ZONE_WRAPPER_CONFIG)

**Status: ✅ Implementiert (2026-03-13)**

Geänderte Dateien:
- `src/studio/drop-zone-calculator.ts`:
  - `SemanticZone` Type hinzugefügt
  - `enableSemanticZones` Option
  - `calculateSemanticZone()` Methode
  - `showSemanticZoneIndicator()` für Zone-Visualisierung
  - 11 neue Tests für Semantic Zones
- `src/studio/code-modifier.ts`:
  - `ZONE_WRAPPER_CONFIG` für alle 9 Zonen
  - `getWrapperForZone()` Methode
  - `insertWithWrapper()` Methode
  - 6 neue Tests
- `src/studio/drag-drop-manager.ts`:
  - `insertComponent()` nutzt jetzt `semanticZone`

---

## Phase 3: Smart Sizing

**Ziel:** Neue Elemente bekommen intelligente Startgröße.

### 3.1 SmartSizingService (NEU)

**Datei:** `src/studio/services/smart-sizing.ts`

```typescript
import type { SourceMap } from '../source-map'

export interface SizingResult {
  width: string   // 'full' | 'hug' | number
  height: string  // 'full' | 'hug' | number
}

export interface SmartSizingService {
  calculateInitialSize(
    parentId: string,
    sourceMap: SourceMap,
    container: HTMLElement
  ): SizingResult

  calculateResidualSpace(
    parentId: string,
    excludeChildId: string | undefined,
    sourceMap: SourceMap,
    container: HTMLElement
  ): { width: number; height: number }
}

export function createSmartSizingService(): SmartSizingService {

  function isHorizontalLayout(element: Element | null): boolean {
    if (!element) return false
    const style = window.getComputedStyle(element as HTMLElement)
    return style.flexDirection === 'row' || style.flexDirection === 'row-reverse'
  }

  function calculateResidualSpace(
    parentId: string,
    excludeChildId: string | undefined,
    sourceMap: SourceMap,
    container: HTMLElement
  ): { width: number; height: number } {
    const parent = container.querySelector(`[data-mirror-id="${parentId}"]`)
    if (!parent) return { width: 0, height: 0 }

    const parentRect = parent.getBoundingClientRect()
    const style = window.getComputedStyle(parent)
    const gap = parseInt(style.gap || '0', 10)

    let usedWidth = 0
    let usedHeight = 0

    const children = sourceMap.getChildren(parentId)
    for (const child of children) {
      if (child.nodeId === excludeChildId) continue
      const childEl = container.querySelector(`[data-mirror-id="${child.nodeId}"]`)
      if (childEl) {
        const childRect = childEl.getBoundingClientRect()
        if (isHorizontalLayout(parent)) {
          usedWidth += childRect.width + gap
        } else {
          usedHeight += childRect.height + gap
        }
      }
    }

    return {
      width: Math.max(0, parentRect.width - usedWidth),
      height: Math.max(0, parentRect.height - usedHeight),
    }
  }

  function calculateInitialSize(
    parentId: string,
    sourceMap: SourceMap,
    container: HTMLElement
  ): SizingResult {
    const parent = container.querySelector(`[data-mirror-id="${parentId}"]`)
    if (!parent) return { width: 'full', height: 'hug' }

    const isHorizontal = isHorizontalLayout(parent)
    const residual = calculateResidualSpace(parentId, undefined, sourceMap, container)

    if (isHorizontal) {
      // Horizontal: halbe verfügbare Breite, volle Höhe
      const width = Math.max(40, Math.round(residual.width / 2))
      return { width: String(width), height: 'full' }
    } else {
      // Vertical: volle Breite, halbe verfügbare Höhe
      const height = Math.max(40, Math.round(residual.height / 2))
      return { width: 'full', height: String(height) }
    }
  }

  return {
    calculateInitialSize,
    calculateResidualSpace
  }
}
```

### 3.2 DragDropManager Integration

**Datei:** `src/studio/drag-drop-manager.ts`

```typescript
export interface DragDropManagerOptions {
  // ... existing ...
  /** Smart sizing service for new elements */
  smartSizing?: SmartSizingService
}

// In constructor:
this.smartSizing = options.smartSizing || null

// In insertComponent():
private insertComponent(dropZone: DropZone, dragData: DragData): ModificationResult {
  let { properties } = dragData

  // Smart Sizing für neue Elemente (nicht bei Move)
  if (!dragData.isMove && this.smartSizing && this.sourceMap) {
    const sizing = this.smartSizing.calculateInitialSize(
      dropZone.parentId,
      this.sourceMap,
      this.container
    )
    const sizeProps = `w ${sizing.width}, h ${sizing.height}`
    properties = properties ? `${properties}, ${sizeProps}` : sizeProps
  }

  // ... rest of existing code ...
}
```

### 3.3 Akzeptanzkriterien

- [x] Neue Elemente bekommen 50% des verfügbaren Platzes
- [x] Minimum 40px
- [x] Cross-Direction ist 'full'
- [x] Gap wird berücksichtigt

**Status: ✅ Implementiert (2026-03-13)**

Geänderte Dateien:
- `src/studio/services/smart-sizing.ts` (NEU):
  - `createSmartSizingService()` Factory
  - `calculateInitialSize()` - berechnet Startgröße
  - `calculateResidualSpace()` - berechnet verfügbaren Platz
  - 8 Tests
- `src/studio/drag-drop-manager.ts`:
  - `enableSmartSizing` Option (default: true)
  - `smartSizing` Service-Instanz
  - `insertComponent()` fügt w/h Properties hinzu
- `src/studio/index.ts`:
  - Export `SmartSizingService`, `SizingResult`, `ResidualSpace`

---

## Phase 4: Direct Manipulation (Handles)

**Ziel:** Resize-Handles für Padding, Gap, Radius.

### 4.1 Event-Types definieren

**Datei:** `studio/core/events.ts`

```typescript
export interface StudioEvents {
  // ... existing ...

  // Handle events
  'handle:drag-start': { nodeId: string; property: string; startValue: number }
  'handle:drag-move': { nodeId: string; property: string; value: number }
  'handle:drag-end': { nodeId: string; property: string; value: number }
}
```

### 4.2 HandleManager (NEU)

**Datei:** `studio/preview/handle-manager.ts`

```typescript
import { state, events } from '../core'

export type HandleType = 'padding' | 'gap' | 'radius'
export type HandleDirection = 'n' | 's' | 'e' | 'w' | 'ne'

export interface Handle {
  type: HandleType
  direction: HandleDirection
  property: string
  currentValue: number
  element: HTMLElement
}

export interface HandleManagerConfig {
  container: HTMLElement
}

export class HandleManager {
  private container: HTMLElement
  private handles: Handle[] = []
  private activeHandle: Handle | null = null
  private overlay: HTMLElement
  private valueIndicator: HTMLElement | null = null

  private startDragPosition: { x: number; y: number } | null = null
  private startValue: number = 0

  // Bound handlers for cleanup
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void

  constructor(config: HandleManagerConfig) {
    this.container = config.container
    this.overlay = this.createOverlay()

    // Bind handlers
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)

    this.setupEventListeners()
  }

  showHandles(nodeId: string): void {
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    this.hideHandles()
    this.handles = this.calculateHandles(element)
    this.renderHandles()
  }

  hideHandles(): void {
    this.handles = []
    this.overlay.innerHTML = ''
  }

  /** Call when preview DOM updates to reposition handles */
  refresh(): void {
    const nodeId = state.get().selection.nodeId
    if (nodeId) {
      this.showHandles(nodeId)
    }
  }

  private calculateHandles(element: HTMLElement): Handle[] {
    const handles: Handle[] = []
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    // Padding handles (4 Seiten)
    const sides: Array<{ dir: HandleDirection; prop: string; getValue: () => number; x: number; y: number }> = [
      { dir: 'n', prop: 'pad top', getValue: () => parseInt(style.paddingTop || '0'), x: rect.width / 2, y: 12 },
      { dir: 's', prop: 'pad bottom', getValue: () => parseInt(style.paddingBottom || '0'), x: rect.width / 2, y: rect.height - 12 },
      { dir: 'e', prop: 'pad right', getValue: () => parseInt(style.paddingRight || '0'), x: rect.width - 12, y: rect.height / 2 },
      { dir: 'w', prop: 'pad left', getValue: () => parseInt(style.paddingLeft || '0'), x: 12, y: rect.height / 2 },
    ]

    for (const side of sides) {
      handles.push({
        type: 'padding',
        direction: side.dir,
        property: side.prop,
        currentValue: side.getValue(),
        element: this.createHandleElement(
          rect.left - containerRect.left + side.x,
          rect.top - containerRect.top + side.y,
          side.dir
        ),
      })
    }

    // Radius handle (top-right Ecke)
    handles.push({
      type: 'radius',
      direction: 'ne',
      property: 'rad',
      currentValue: parseInt(style.borderRadius || '0'),
      element: this.createHandleElement(
        rect.right - containerRect.left - 8,
        rect.top - containerRect.top + 8,
        'ne'
      ),
    })

    // Gap handle (nur wenn Element Kinder hat und flex/grid ist)
    const hasChildren = element.children.length > 0
    const isFlexOrGrid = style.display === 'flex' || style.display === 'grid'
    if (hasChildren && isFlexOrGrid) {
      const gap = parseInt(style.gap || '0')
      const isHorizontal = style.flexDirection === 'row'

      // Handle zwischen erstem und zweitem Kind
      if (element.children.length >= 2) {
        const firstChild = element.children[0].getBoundingClientRect()
        const secondChild = element.children[1].getBoundingClientRect()

        const gapX = isHorizontal
          ? (firstChild.right + secondChild.left) / 2 - containerRect.left
          : rect.left - containerRect.left + rect.width / 2
        const gapY = isHorizontal
          ? rect.top - containerRect.top + rect.height / 2
          : (firstChild.bottom + secondChild.top) / 2 - containerRect.top

        handles.push({
          type: 'gap',
          direction: isHorizontal ? 'e' : 's',
          property: 'gap',
          currentValue: gap,
          element: this.createHandleElement(gapX, gapY, isHorizontal ? 'e' : 's', 'gap'),
        })
      }
    }

    return handles
  }

  private createHandleElement(x: number, y: number, direction: HandleDirection, type: string = 'default'): HTMLElement {
    const el = document.createElement('div')
    el.className = `handle handle-${type}`
    el.style.cssText = `
      position: absolute;
      left: ${x - 6}px;
      top: ${y - 6}px;
      width: 12px;
      height: 12px;
      background: white;
      border: 2px solid #3B82F6;
      border-radius: ${type === 'gap' ? '2px' : '50%'};
      cursor: ${this.getCursor(direction)};
      z-index: 10000;
      pointer-events: auto;
    `
    el.dataset.direction = direction
    return el
  }

  private renderHandles(): void {
    for (const handle of this.handles) {
      this.overlay.appendChild(handle.element)
    }
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'handle-overlay'
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
    `
    this.container.style.position = this.container.style.position || 'relative'
    this.container.appendChild(overlay)
    return overlay
  }

  private setupEventListeners(): void {
    // Handle clicks sind auf dem Overlay
    this.overlay.addEventListener('mousedown', this.boundMouseDown)
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  private onMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (!target.classList.contains('handle')) return

    e.preventDefault()
    e.stopPropagation()

    const direction = target.dataset.direction as HandleDirection
    this.activeHandle = this.handles.find(h => h.element === target) || null

    if (this.activeHandle) {
      this.startDragPosition = { x: e.clientX, y: e.clientY }
      this.startValue = this.activeHandle.currentValue

      events.emit('handle:drag-start', {
        nodeId: state.get().selection.nodeId!,
        property: this.activeHandle.property,
        startValue: this.startValue
      })
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeHandle || !this.startDragPosition) return

    const delta = this.getDelta(e, this.activeHandle.direction)
    const sensitivity = e.shiftKey ? 0.5 : 1
    let newValue = Math.max(0, Math.round(this.startValue + delta * sensitivity))

    // Snapping (außer bei Alt)
    if (!e.altKey) {
      newValue = this.snapValue(newValue)
    }

    this.showValueIndicator(e.clientX, e.clientY, newValue)

    const nodeId = state.get().selection.nodeId
    if (nodeId) {
      events.emit('handle:drag-move', {
        nodeId,
        property: this.activeHandle.property,
        value: newValue
      })
    }
  }

  private onMouseUp(): void {
    if (this.activeHandle) {
      this.hideValueIndicator()

      const nodeId = state.get().selection.nodeId
      if (nodeId && this.startDragPosition) {
        events.emit('handle:drag-end', {
          nodeId,
          property: this.activeHandle.property,
          value: this.activeHandle.currentValue
        })
      }
    }
    this.activeHandle = null
    this.startDragPosition = null
  }

  private getDelta(e: MouseEvent, direction: HandleDirection): number {
    if (!this.startDragPosition) return 0
    const dx = e.clientX - this.startDragPosition.x
    const dy = e.clientY - this.startDragPosition.y

    switch (direction) {
      case 'n': return -dy
      case 's': return dy
      case 'e': return dx
      case 'w': return -dx
      case 'ne': return (dx - dy) / 2
      default: return 0
    }
  }

  private snapValue(value: number): number {
    const snapPoints = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
    const threshold = 4

    for (const snap of snapPoints) {
      if (Math.abs(value - snap) < threshold) {
        return snap
      }
    }
    return value
  }

  private showValueIndicator(x: number, y: number, value: number): void {
    if (!this.valueIndicator) {
      this.valueIndicator = document.createElement('div')
      this.valueIndicator.style.cssText = `
        position: fixed;
        background: #1F2937;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
        z-index: 10001;
        pointer-events: none;
      `
      document.body.appendChild(this.valueIndicator)
    }
    this.valueIndicator.textContent = `${value}`
    this.valueIndicator.style.left = `${x + 16}px`
    this.valueIndicator.style.top = `${y - 8}px`
    this.valueIndicator.style.display = 'block'
  }

  private hideValueIndicator(): void {
    if (this.valueIndicator) {
      this.valueIndicator.style.display = 'none'
    }
  }

  private getCursor(direction: HandleDirection): string {
    const cursors: Record<HandleDirection, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
    }
    return cursors[direction] || 'pointer'
  }

  dispose(): void {
    // Event Listeners entfernen
    this.overlay.removeEventListener('mousedown', this.boundMouseDown)
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)

    // DOM Cleanup
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    if (this.valueIndicator?.parentNode) {
      this.valueIndicator.parentNode.removeChild(this.valueIndicator)
    }
  }
}

export function createHandleManager(config: HandleManagerConfig): HandleManager {
  return new HandleManager(config)
}
```

### 4.3 PreviewController Integration

**Datei:** `studio/preview/index.ts`

```typescript
import { HandleManager, createHandleManager } from './handle-manager'

export interface PreviewConfig {
  // ... existing ...
  enableHandles?: boolean
}

export class PreviewController {
  // ... existing ...
  private handleManager: HandleManager | null = null

  constructor(config: PreviewConfig) {
    // ... existing ...

    if (config.enableHandles !== false) {
      this.handleManager = createHandleManager({
        container: this.container
      })
    }
  }

  select(nodeId: string | null): void {
    // ... existing selection code ...

    // Handles aktualisieren
    if (this.handleManager) {
      if (nodeId) {
        this.handleManager.showHandles(nodeId)
      } else {
        this.handleManager.hideHandles()
      }
    }
  }

  /** Call after preview DOM refresh */
  refresh(): void {
    // ... existing ...
    this.handleManager?.refresh()
  }

  dispose(): void {
    // ... existing ...
    this.handleManager?.dispose()
  }
}
```

### 4.4 Bootstrap Integration

**Datei:** `studio/bootstrap.ts`

```typescript
import { SetPropertyCommand } from './core'

// In initializeStudio():

// Handle Events → Commands
events.on('handle:drag-end', ({ nodeId, property, value }) => {
  executor.execute(new SetPropertyCommand({
    nodeId,
    property,
    value: String(value)
  }))
})

// Handle refresh nach Compile
events.on('compile:completed', () => {
  studio.preview?.refresh()
})
```

### 4.5 Akzeptanzkriterien

- [ ] Padding-Handles an 4 Seiten
- [ ] Gap-Handle zwischen Kindern (wenn flex/grid)
- [ ] Radius-Handle in Ecke
- [ ] Snapping an 4, 8, 16, etc.
- [ ] Shift = feinere Kontrolle
- [ ] Alt = kein Snapping
- [ ] Handles aktualisieren nach Preview-Refresh

---

## Phase 5: Multi-Select & Gruppieren

**Ziel:** Mehrere Elemente selektieren und gruppieren.

### 5.1 State erweitern

**Datei:** `studio/core/state.ts`

```typescript
export interface StudioState {
  // ... existing ...
  multiSelection: string[]
}

// Initial state
const initialState: StudioState = {
  // ... existing ...
  multiSelection: [],
}

// Actions
export const actions = {
  // ... existing ...

  toggleMultiSelection(nodeId: string): void {
    const current = state.get().multiSelection
    const index = current.indexOf(nodeId)

    if (index >= 0) {
      state.set({ multiSelection: current.filter(id => id !== nodeId) })
    } else {
      state.set({ multiSelection: [...current, nodeId] })
    }
    events.emit('multiselection:changed', { nodeIds: state.get().multiSelection })
  },

  setMultiSelection(nodeIds: string[]): void {
    state.set({ multiSelection: nodeIds })
    events.emit('multiselection:changed', { nodeIds })
  },

  clearMultiSelection(): void {
    state.set({ multiSelection: [] })
    events.emit('multiselection:changed', { nodeIds: [] })
  },
}
```

### 5.2 Events erweitern

**Datei:** `studio/core/events.ts`

```typescript
export interface StudioEvents {
  // ... existing ...
  'multiselection:changed': { nodeIds: string[] }
}
```

### 5.3 CodeModifier: wrapNodes

**Datei:** `src/studio/code-modifier.ts`

```typescript
/**
 * Wrap multiple sibling nodes in a new container
 */
wrapNodes(
  nodeIds: string[],
  wrapperName: string = 'Box',
  wrapperProps?: string
): ModificationResult {
  if (nodeIds.length < 2) {
    return this.errorResult('Need at least 2 nodes to wrap')
  }

  // Validate: alle Nodes müssen denselben Parent haben
  const mappings = nodeIds.map(id => this.sourceMap.getNodeById(id))
  if (mappings.some(m => !m)) {
    return this.errorResult('Some nodes not found')
  }

  const parents = mappings.map(m => m!.parentId)
  if (new Set(parents).size !== 1) {
    return this.errorResult('All nodes must have the same parent')
  }

  // Nach Line-Number sortieren
  const sortedNodes = mappings
    .filter(Boolean)
    .sort((a, b) => a!.position.line - b!.position.line) as NodeMapping[]

  const firstNode = sortedNodes[0]
  const lastNode = sortedNodes[sortedNodes.length - 1]

  // Indentation des ersten Nodes
  const firstLine = this.lines[firstNode.position.line - 1]
  const indent = this.getLineIndent(firstLine)

  // Wrapper-Zeile
  const wrapperLine = wrapperProps
    ? `${indent}${wrapperName} ${wrapperProps}`
    : `${indent}${wrapperName}`

  // Alle Zeilen der Nodes (inkl. Kinder)
  const startLine = firstNode.position.line
  const endLine = lastNode.position.endLine
  const nodeLines = this.lines.slice(startLine - 1, endLine)

  // Re-indent (2 Spaces mehr)
  const reindentedLines = nodeLines.map(line => '  ' + line)

  // Neuen Content bauen
  const newContent = [wrapperLine, ...reindentedLines].join('\n')

  // Offsets berechnen
  const from = this.getCharacterOffset(startLine, 1)
  const to = this.getCharacterOffset(endLine, this.lines[endLine - 1].length + 1)

  const newSource = this.source.substring(0, from) + newContent + this.source.substring(to)

  return {
    success: true,
    newSource,
    change: { from, to, insert: newContent }
  }
}
```

### 5.4 WrapNodesCommand

**Datei:** `studio/core/commands/wrap-nodes.ts`

```typescript
import { Command, CommandResult, getCommandContext } from '../commands'
import { CodeModifier } from '../../../src/studio/code-modifier'

export class WrapNodesCommand implements Command {
  readonly type = 'WRAP_NODES'
  readonly description: string

  private nodeIds: string[]
  private wrapperName: string
  private wrapperProps?: string
  private originalSource: string | null = null

  constructor(params: {
    nodeIds: string[]
    wrapperName?: string
    wrapperProps?: string
  }) {
    this.nodeIds = params.nodeIds
    this.wrapperName = params.wrapperName || 'Box'
    this.wrapperProps = params.wrapperProps
    this.description = `Wrap ${params.nodeIds.length} nodes in ${this.wrapperName}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()

    if (!sourceMap) return { success: false, error: 'No source map' }

    this.originalSource = source

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.wrapNodes(this.nodeIds, this.wrapperName, this.wrapperProps)

    if (!result.success) return { success: false, error: result.error }

    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }

    const ctx = getCommandContext()
    const currentSource = ctx.getSource()

    ctx.applyChange({
      from: 0,
      to: currentSource.length,
      insert: this.originalSource
    })

    return { success: true }
  }
}
```

### 5.5 Keyboard Handler

**Datei:** `studio/preview/keyboard-handler.ts`

```typescript
import { state, actions, executor, events } from '../core'
import { WrapNodesCommand } from '../core/commands/wrap-nodes'

export function setupKeyboardHandler(container: HTMLElement): () => void {

  function handleKeyDown(e: KeyboardEvent): void {
    // Cmd/Ctrl+G = Gruppieren
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      e.preventDefault()

      const multiSelection = state.get().multiSelection
      if (multiSelection.length >= 2) {
        // Parent Direction erkennen
        const sourceMap = state.get().sourceMap
        if (!sourceMap) return

        const firstNode = sourceMap.getNodeById(multiSelection[0])
        if (!firstNode?.parentId) return

        const parentEl = container.querySelector(
          `[data-mirror-id="${firstNode.parentId}"]`
        ) as HTMLElement

        const isHorizontal = parentEl &&
          window.getComputedStyle(parentEl).flexDirection === 'row'

        executor.execute(new WrapNodesCommand({
          nodeIds: multiSelection,
          wrapperName: 'Box',
          wrapperProps: isHorizontal ? 'hor' : 'ver'
        }))

        actions.clearMultiSelection()
      }
    }

    // Escape = Multi-Selection leeren
    if (e.key === 'Escape') {
      if (state.get().multiSelection.length > 0) {
        actions.clearMultiSelection()
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}
```

### 5.6 Multi-Select Click Handler

**Datei:** `studio/preview/index.ts`

```typescript
// In handleClick():
private handleClick(e: MouseEvent): void {
  const target = e.target as HTMLElement
  const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null

  if (nodeElement) {
    const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
    if (nodeId) {
      e.stopPropagation()

      // Shift+Click = Multi-Select
      if (e.shiftKey) {
        actions.toggleMultiSelection(nodeId)
      } else {
        // Normal click = Single select, clear multi
        actions.clearMultiSelection()
        this.select(nodeId)
      }
    }
  }
}
```

### 5.7 Akzeptanzkriterien

- [ ] Shift+Click fügt zur Multi-Selection hinzu
- [ ] Cmd/Ctrl+G gruppiert selektierte Elemente
- [ ] Wrapper bekommt richtigen Direction (hor/ver)
- [ ] Escape leert Multi-Selection
- [ ] Nur Siblings können gruppiert werden

---

## Phase 6: Grid-Layout (Future)

**Status:** Konzept, noch nicht priorisiert.

### 6.1 Konzept

Grid-Container erkennen und Zellen-basiertes Drop ermöglichen.

```typescript
// DropZoneCalculator Erweiterung
export interface GridDropZone extends DropZone {
  gridCell?: { column: number; row: number }
}

// Generierter Code
// span 3, start 2, row 1
```

### 6.2 Offene Fragen

- Wie wird Grid in Mirror definiert? (`grid 12` oder `grid cols 12`?)
- Row-Height handling (auto vs fixed)?
- Spanning UI (Resize-Handles für Span)?

**→ Spezifikation vor Implementierung nötig.**

---

## Phase 7: Polish

### 7.1 Error Handling

- Graceful degradation wenn SourceMap stale
- User Feedback bei ungültigen Operationen
- Console Warnings für Entwickler

### 7.2 Performance

- Handle-Berechnung nur bei Selection-Change
- Debounce für Drag-Events (bereits in DragDropManager)
- RAF für Handle-Position-Updates

### 7.3 Edge Cases

- Handle-Drag über Container-Grenzen
- Sehr kleine Elemente (Handles überlappen)
- Verschachtelte selektierbare Elemente

---

## Datei-Übersicht

### Neue Dateien

| Datei | Phase | Beschreibung |
|-------|-------|--------------|
| `src/studio/services/smart-sizing.ts` | 3 | Größenberechnung |
| `studio/preview/handle-manager.ts` | 4 | Direct Manipulation |
| `studio/preview/keyboard-handler.ts` | 5 | Keyboard Shortcuts |
| `studio/core/commands/wrap-nodes.ts` | 5 | Gruppieren-Command |

### Erweiterte Dateien

| Datei | Phase | Änderung |
|-------|-------|----------|
| `src/studio/drop-zone-calculator.ts` | 1, 2 | Dynamic Threshold, 9-Zone |
| `src/studio/drag-drop-manager.ts` | 2, 3 | Semantic Zone, Smart Sizing |
| `src/studio/code-modifier.ts` | 2, 5 | insertWithWrapper, wrapNodes |
| `studio/core/state.ts` | 5 | multiSelection |
| `studio/core/events.ts` | 4, 5 | Handle-Events, MultiSelect-Events |
| `studio/preview/index.ts` | 4, 5 | HandleManager, Shift+Click |
| `studio/bootstrap.ts` | 4 | Handle-Events, Refresh |

---

## Abhängigkeiten

```
Phase 1 (Dynamic Threshold)
    │
    ▼
Phase 2 (Semantic Drag / 9-Zone)
    │
    ├──────────────────────────┬──────────────────┐
    ▼                          ▼                  │
Phase 3 (Smart Sizing)    Phase 5 (Multi-Select)  │
    │                          │                  │
    ▼                          │                  │
Phase 4 (Handles)              │                  │
    │                          │                  │
    └──────────────────────────┘                  │
                │                                 │
                ▼                                 │
          Phase 7 (Polish)                        │
                                                  │
                          Phase 6 (Grid) ─────────┘
                          (Future, separate Spec)
```

---

## Nächste Schritte

1. **Phase 1 starten:** `calculateDynamicThreshold()` implementieren
2. **Tests first:** Baseline-Tests für DropZoneCalculator
3. **Inkrementell:** Eine Phase nach der anderen, jeweils mit Tests

---

## Changelog

- **V2.1:** Semantic Drag (9-Zone) als Phase 2 hinzugefügt
- **V2.1:** Code-Fehler korrigiert (element scope, this-binding)
- **V2.1:** Event Listener Cleanup in HandleManager
- **V2.1:** Gap-Handles hinzugefügt
- **V2.1:** WrapNodesCommand als separate Datei
- **V2.1:** Keyboard Handler als separate Datei
- **V2.1:** Handle-Refresh nach Compile
- **V2.1:** Event-Types definiert
- **V2.1:** Architektur-Diagramm korrigiert
- **V2.1:** Grid als "Future" markiert
