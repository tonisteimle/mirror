# Semantic Direct Manipulation - Implementation

Detaillierte Implementierung für Mirror's Direct Manipulation System.

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        Preview Container                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Mirror Runtime                         │  │
│  │  (Gerenderte UI - touch-events: none während Edit)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Manipulation Layer                       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Handle Overlay (SVG)                    │  │  │
│  │  │  - Padding Handles                                   │  │  │
│  │  │  - Gap Handles                                       │  │  │
│  │  │  - Radius Handles                                    │  │  │
│  │  │  - Size Handles                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Feedback Layer                          │  │  │
│  │  │  - Value Labels                                      │  │  │
│  │  │  - Guide Lines                                       │  │  │
│  │  │  - Snap Indicators                                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Core System

### 1.1 ManipulationController

```typescript
// studio/preview/manipulation/ManipulationController.ts

import interact from 'interactjs'
import { state, events } from '../../core'
import { HandleRegistry } from './HandleRegistry'
import { FeedbackRenderer } from './FeedbackRenderer'
import { PropertyMapper } from './PropertyMapper'

export class ManipulationController {
  private container: HTMLElement
  private overlay: SVGElement
  private feedback: FeedbackRenderer
  private handles: HandleRegistry
  private mapper: PropertyMapper
  private activeHandle: Handle | null = null
  private isDragging = false

  constructor(config: ManipulationConfig) {
    this.container = config.container
    this.overlay = this.createOverlay()
    this.feedback = new FeedbackRenderer(this.overlay)
    this.handles = new HandleRegistry()
    this.mapper = new PropertyMapper()

    this.setupInteract()
    this.subscribeToSelection()
  }

  private createOverlay(): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'manipulation-overlay')
    svg.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1000;
    `
    this.container.appendChild(svg)
    return svg
  }

  private setupInteract() {
    // Handles sind pointer-events: all
    interact('.manipulation-handle')
      .draggable({
        inertia: false,
        modifiers: [
          interact.modifiers.snap({
            targets: [this.getSnapTargets.bind(this)],
            relativePoints: [{ x: 0.5, y: 0.5 }]
          })
        ],
        listeners: {
          start: this.onDragStart.bind(this),
          move: this.onDragMove.bind(this),
          end: this.onDragEnd.bind(this)
        }
      })
  }

  private subscribeToSelection() {
    events.on('selection:changed', ({ nodeId }) => {
      if (nodeId) {
        this.showHandlesFor(nodeId)
      } else {
        this.hideHandles()
      }
    })
  }

  private showHandlesFor(nodeId: string) {
    const element = this.getElementByNodeId(nodeId)
    if (!element) return

    const ir = state.getState().ir
    const node = this.findNodeInIR(ir, nodeId)
    if (!node) return

    // Bestimme welche Handles relevant sind
    const handleConfig = this.mapper.getHandlesForNode(node, element)

    // Render Handles
    this.handles.clear()
    this.renderHandles(handleConfig, element)
  }

  private renderHandles(config: HandleConfig, element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    // Offset relativ zum Container
    const offset = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top
    }

    // Padding Handles
    if (config.padding) {
      this.renderPaddingHandles(rect, offset, config.padding)
    }

    // Gap Handles
    if (config.gaps) {
      this.renderGapHandles(element, offset, config.gaps)
    }

    // Size Handles
    if (config.size) {
      this.renderSizeHandles(rect, offset, config.size)
    }

    // Radius Handles
    if (config.radius) {
      this.renderRadiusHandles(rect, offset, config.radius)
    }
  }

  // ... mehr Implementation
}
```

### 1.2 HandleRegistry

```typescript
// studio/preview/manipulation/HandleRegistry.ts

export type HandleType = 'padding' | 'gap' | 'size' | 'radius' | 'flex'
export type HandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Handle {
  id: string
  type: HandleType
  direction?: HandleDirection
  property: string           // z.B. 'pad', 'gap', 'w', 'rad'
  subProperty?: string       // z.B. 'left', 'top' für padding
  element: SVGElement
  currentValue: number | string
  unit?: string              // 'px', '%', token
}

export class HandleRegistry {
  private handles: Map<string, Handle> = new Map()
  private container: SVGElement

  constructor(container: SVGElement) {
    this.container = container
  }

  register(handle: Handle) {
    this.handles.set(handle.id, handle)
    handle.element.dataset.handleId = handle.id
    handle.element.classList.add('manipulation-handle')
    this.container.appendChild(handle.element)
  }

  get(id: string): Handle | undefined {
    return this.handles.get(id)
  }

  clear() {
    this.handles.forEach(h => h.element.remove())
    this.handles.clear()
  }

  getAll(): Handle[] {
    return Array.from(this.handles.values())
  }
}
```

### 1.3 PropertyMapper

Mappt Mirror-Properties auf Handles:

```typescript
// studio/preview/manipulation/PropertyMapper.ts

import { IRNode } from '../../../src/ir'

export interface HandleConfig {
  padding?: PaddingHandleConfig
  gaps?: GapHandleConfig[]
  size?: SizeHandleConfig
  radius?: RadiusHandleConfig
  flex?: FlexHandleConfig
}

export class PropertyMapper {

  getHandlesForNode(node: IRNode, element: HTMLElement): HandleConfig {
    const config: HandleConfig = {}
    const props = node.properties || {}
    const computedStyle = getComputedStyle(element)

    // 1. Padding - immer wenn Container
    if (this.isContainer(node)) {
      config.padding = this.getPaddingConfig(props, computedStyle)
    }

    // 2. Gap - nur wenn Flex/Grid mit Children
    if (this.hasFlexLayout(props) && node.children?.length > 1) {
      config.gaps = this.getGapConfig(node, element)
    }

    // 3. Size - basierend auf w/h Properties
    config.size = this.getSizeConfig(props, computedStyle)

    // 4. Radius - wenn rad Property existiert oder möglich
    if (props.rad !== undefined || this.couldHaveRadius(node)) {
      config.radius = this.getRadiusConfig(props, computedStyle)
    }

    // 5. Flex - für flex-items in flex-container
    if (this.isFlexItem(element) && props.grow !== undefined) {
      config.flex = this.getFlexConfig(props)
    }

    return config
  }

  private getPaddingConfig(props: any, style: CSSStyleDeclaration): PaddingHandleConfig {
    // Prüfe ob einzelne Seiten oder uniform
    const pad = props.pad
    const padTop = props.padt ?? props.pady ?? pad
    const padRight = props.padr ?? props.padx ?? pad
    const padBottom = props.padb ?? props.pady ?? pad
    const padLeft = props.padl ?? props.padx ?? pad

    return {
      top: { value: padTop, parsed: this.parseValue(padTop, style.paddingTop) },
      right: { value: padRight, parsed: this.parseValue(padRight, style.paddingRight) },
      bottom: { value: padBottom, parsed: this.parseValue(padBottom, style.paddingBottom) },
      left: { value: padLeft, parsed: this.parseValue(padLeft, style.paddingLeft) },
      isUniform: padTop === padRight && padRight === padBottom && padBottom === padLeft
    }
  }

  private getGapConfig(node: IRNode, element: HTMLElement): GapHandleConfig[] {
    const children = Array.from(element.children) as HTMLElement[]
    const gaps: GapHandleConfig[] = []
    const layout = this.getLayoutDirection(node.properties)

    for (let i = 0; i < children.length - 1; i++) {
      const child1 = children[i]
      const child2 = children[i + 1]

      gaps.push({
        index: i,
        between: [child1, child2],
        direction: layout,
        value: node.properties?.gap,
        parsed: this.parseValue(node.properties?.gap, getComputedStyle(element).gap)
      })
    }

    return gaps
  }

  private parseValue(mirrorValue: any, computedValue: string): ParsedValue {
    if (typeof mirrorValue === 'string' && mirrorValue.startsWith('$')) {
      return {
        type: 'token',
        token: mirrorValue,
        resolved: parseFloat(computedValue)
      }
    }
    if (typeof mirrorValue === 'number') {
      return {
        type: 'number',
        value: mirrorValue
      }
    }
    if (typeof mirrorValue === 'string' && mirrorValue.endsWith('%')) {
      return {
        type: 'percentage',
        value: parseFloat(mirrorValue)
      }
    }
    // Fallback: Parse computed
    return {
      type: 'number',
      value: parseFloat(computedValue) || 0
    }
  }

  private hasFlexLayout(props: any): boolean {
    return props.hor !== undefined ||
           props.ver !== undefined ||
           props.layout === 'hor' ||
           props.layout === 'ver'
  }

  private getLayoutDirection(props: any): 'horizontal' | 'vertical' {
    if (props.hor !== undefined) return 'horizontal'
    if (props.ver !== undefined) return 'vertical'
    return 'vertical' // default
  }

  private isContainer(node: IRNode): boolean {
    return node.children !== undefined && node.children.length >= 0
  }

  private isFlexItem(element: HTMLElement): boolean {
    const parent = element.parentElement
    if (!parent) return false
    const display = getComputedStyle(parent).display
    return display === 'flex' || display === 'inline-flex'
  }
}
```

---

## 2. Handle Rendering

### 2.1 Padding Handles

```typescript
// studio/preview/manipulation/handles/PaddingHandles.ts

export class PaddingHandleRenderer {
  private registry: HandleRegistry
  private svg: SVGElement

  constructor(svg: SVGElement, registry: HandleRegistry) {
    this.svg = svg
    this.registry = registry
  }

  render(rect: DOMRect, offset: Point, config: PaddingHandleConfig) {
    const sides: Array<{
      direction: HandleDirection
      x: number
      y: number
      cursor: string
      axis: 'x' | 'y'
    }> = [
      {
        direction: 'n',
        x: offset.x + rect.width / 2,
        y: offset.y + config.top.parsed.value / 2,
        cursor: 'ns-resize',
        axis: 'y'
      },
      {
        direction: 'e',
        x: offset.x + rect.width - config.right.parsed.value / 2,
        y: offset.y + rect.height / 2,
        cursor: 'ew-resize',
        axis: 'x'
      },
      {
        direction: 's',
        x: offset.x + rect.width / 2,
        y: offset.y + rect.height - config.bottom.parsed.value / 2,
        cursor: 'ns-resize',
        axis: 'y'
      },
      {
        direction: 'w',
        x: offset.x + config.left.parsed.value / 2,
        y: offset.y + rect.height / 2,
        cursor: 'ew-resize',
        axis: 'x'
      }
    ]

    // Padding-Zonen visualisieren (subtle)
    this.renderPaddingZones(rect, offset, config)

    // Handles
    sides.forEach(side => {
      const handle = this.createHandle(side, config)
      this.registry.register(handle)
    })
  }

  private renderPaddingZones(rect: DOMRect, offset: Point, config: PaddingHandleConfig) {
    // Top zone
    const topZone = this.createZone(
      offset.x, offset.y,
      rect.width, config.top.parsed.value,
      'n'
    )
    this.svg.appendChild(topZone)

    // ... andere Zonen
  }

  private createZone(x: number, y: number, w: number, h: number, dir: string): SVGRectElement {
    const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    zone.setAttribute('x', String(x))
    zone.setAttribute('y', String(y))
    zone.setAttribute('width', String(w))
    zone.setAttribute('height', String(h))
    zone.setAttribute('class', `padding-zone padding-zone-${dir}`)
    zone.setAttribute('fill', 'rgba(59, 130, 246, 0.1)')
    zone.setAttribute('stroke', 'none')
    zone.style.pointerEvents = 'none'
    return zone
  }

  private createHandle(side: any, config: PaddingHandleConfig): Handle {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.style.cursor = side.cursor
    group.style.pointerEvents = 'all'

    // Invisible larger hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    hitArea.setAttribute('x', String(side.x - 12))
    hitArea.setAttribute('y', String(side.y - 12))
    hitArea.setAttribute('width', '24')
    hitArea.setAttribute('height', '24')
    hitArea.setAttribute('fill', 'transparent')
    group.appendChild(hitArea)

    // Visible handle
    const visual = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    visual.setAttribute('x', String(side.x - 4))
    visual.setAttribute('y', String(side.y - 4))
    visual.setAttribute('width', '8')
    visual.setAttribute('height', '8')
    visual.setAttribute('rx', '2')
    visual.setAttribute('fill', '#3B82F6')
    visual.setAttribute('stroke', 'white')
    visual.setAttribute('stroke-width', '1')
    group.appendChild(visual)

    const propConfig = this.getPropertyForDirection(side.direction, config)

    return {
      id: `padding-${side.direction}`,
      type: 'padding',
      direction: side.direction,
      property: 'pad',
      subProperty: this.directionToSubProperty(side.direction),
      element: group,
      currentValue: propConfig.value,
      axis: side.axis
    }
  }

  private directionToSubProperty(dir: HandleDirection): string {
    const map = { n: 'top', e: 'right', s: 'bottom', w: 'left' }
    return map[dir] || dir
  }
}
```

### 2.2 Gap Handles

```typescript
// studio/preview/manipulation/handles/GapHandles.ts

export class GapHandleRenderer {

  render(element: HTMLElement, offset: Point, gaps: GapHandleConfig[]) {
    gaps.forEach((gap, index) => {
      const [child1, child2] = gap.between
      const rect1 = child1.getBoundingClientRect()
      const rect2 = child2.getBoundingClientRect()
      const containerRect = element.getBoundingClientRect()

      if (gap.direction === 'horizontal') {
        // Gap zwischen horizontal angeordneten Items
        const gapX = rect1.right + (rect2.left - rect1.right) / 2 - containerRect.left
        const gapY = rect1.top + rect1.height / 2 - containerRect.top

        this.createGapHandle({
          x: offset.x + gapX,
          y: offset.y + gapY,
          width: rect2.left - rect1.right,
          direction: 'horizontal',
          index,
          value: gap.value
        })
      } else {
        // Gap zwischen vertikal angeordneten Items
        const gapX = rect1.left + rect1.width / 2 - containerRect.left
        const gapY = rect1.bottom + (rect2.top - rect1.bottom) / 2 - containerRect.top

        this.createGapHandle({
          x: offset.x + gapX,
          y: offset.y + gapY,
          height: rect2.top - rect1.bottom,
          direction: 'vertical',
          index,
          value: gap.value
        })
      }
    })
  }

  private createGapHandle(config: GapHandleParams): Handle {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.style.cursor = config.direction === 'horizontal' ? 'ew-resize' : 'ns-resize'
    group.style.pointerEvents = 'all'

    // Visual: Line between items
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    if (config.direction === 'horizontal') {
      line.setAttribute('x1', String(config.x))
      line.setAttribute('y1', String(config.y - 15))
      line.setAttribute('x2', String(config.x))
      line.setAttribute('y2', String(config.y + 15))
    } else {
      line.setAttribute('x1', String(config.x - 15))
      line.setAttribute('y1', String(config.y))
      line.setAttribute('x2', String(config.x + 15))
      line.setAttribute('y2', String(config.y))
    }
    line.setAttribute('stroke', '#3B82F6')
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-dasharray', '4 2')
    group.appendChild(line)

    // Handle circle in center
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    handle.setAttribute('cx', String(config.x))
    handle.setAttribute('cy', String(config.y))
    handle.setAttribute('r', '6')
    handle.setAttribute('fill', '#3B82F6')
    handle.setAttribute('stroke', 'white')
    handle.setAttribute('stroke-width', '2')
    group.appendChild(handle)

    // Larger invisible hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    hitArea.setAttribute('x', String(config.x - 15))
    hitArea.setAttribute('y', String(config.y - 15))
    hitArea.setAttribute('width', '30')
    hitArea.setAttribute('height', '30')
    hitArea.setAttribute('fill', 'transparent')
    group.appendChild(hitArea)

    return {
      id: `gap-${config.index}`,
      type: 'gap',
      property: 'gap',
      element: group,
      currentValue: config.value,
      axis: config.direction === 'horizontal' ? 'x' : 'y'
    }
  }
}
```

### 2.3 Radius Handles

```typescript
// studio/preview/manipulation/handles/RadiusHandles.ts

export class RadiusHandleRenderer {

  render(rect: DOMRect, offset: Point, config: RadiusHandleConfig) {
    // Nur top-left Corner für einfaches Editing
    // (Shift für alle Corners gleichzeitig)

    const currentRadius = config.parsed.value
    const maxRadius = Math.min(rect.width, rect.height) / 2

    // Position: Auf dem Radius-Bogen
    const angle = Math.PI / 4 // 45 Grad
    const handleX = offset.x + currentRadius - Math.cos(angle) * currentRadius
    const handleY = offset.y + currentRadius - Math.sin(angle) * currentRadius

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.style.cursor = 'nwse-resize'
    group.style.pointerEvents = 'all'

    // Arc visualization
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const arcPath = this.describeArc(
      offset.x + currentRadius,
      offset.y + currentRadius,
      currentRadius,
      180, 270
    )
    arc.setAttribute('d', arcPath)
    arc.setAttribute('fill', 'none')
    arc.setAttribute('stroke', '#3B82F6')
    arc.setAttribute('stroke-width', '2')
    arc.setAttribute('stroke-dasharray', '4 2')
    group.appendChild(arc)

    // Handle
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    handle.setAttribute('cx', String(handleX))
    handle.setAttribute('cy', String(handleY))
    handle.setAttribute('r', '6')
    handle.setAttribute('fill', '#3B82F6')
    handle.setAttribute('stroke', 'white')
    handle.setAttribute('stroke-width', '2')
    group.appendChild(handle)

    return {
      id: 'radius-tl',
      type: 'radius',
      direction: 'nw',
      property: 'rad',
      element: group,
      currentValue: config.value,
      maxValue: maxRadius
    }
  }

  private describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(x, y, radius, endAngle)
    const end = this.polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ')
  }

  private polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    }
  }
}
```

---

## 3. Drag Handling

### 3.1 Drag Controller

```typescript
// studio/preview/manipulation/DragController.ts

export class DragController {
  private activeHandle: Handle | null = null
  private startValue: number = 0
  private startPosition: Point = { x: 0, y: 0 }
  private feedback: FeedbackRenderer
  private codeModifier: CodeModifier

  onDragStart(event: InteractEvent) {
    const handleId = (event.target as HTMLElement).dataset.handleId
    this.activeHandle = this.handles.get(handleId)
    if (!this.activeHandle) return

    this.startPosition = { x: event.clientX, y: event.clientY }
    this.startValue = this.parseCurrentValue(this.activeHandle.currentValue)

    // Show feedback
    this.feedback.showValueLabel(this.activeHandle, this.startValue)
    this.feedback.showGuides(this.activeHandle)

    // Disable preview interactions
    this.disablePreviewInteractions()

    events.emit('manipulation:start', {
      handle: this.activeHandle,
      value: this.startValue
    })
  }

  onDragMove(event: InteractEvent) {
    if (!this.activeHandle) return

    const delta = this.calculateDelta(event)
    const newValue = this.calculateNewValue(delta)
    const snappedValue = this.applySnapping(newValue, event)

    // Update feedback
    this.feedback.updateValueLabel(this.activeHandle, snappedValue)

    // Live preview update (debounced code update)
    this.updatePreview(this.activeHandle, snappedValue)

    events.emit('manipulation:move', {
      handle: this.activeHandle,
      value: snappedValue,
      delta
    })
  }

  onDragEnd(event: InteractEvent) {
    if (!this.activeHandle) return

    const delta = this.calculateDelta(event)
    const newValue = this.calculateNewValue(delta)
    const snappedValue = this.applySnapping(newValue, event)

    // Commit to code
    this.commitToCode(this.activeHandle, snappedValue)

    // Hide feedback
    this.feedback.hide()

    // Re-enable preview interactions
    this.enablePreviewInteractions()

    events.emit('manipulation:end', {
      handle: this.activeHandle,
      value: snappedValue,
      previousValue: this.startValue
    })

    this.activeHandle = null
  }

  private calculateDelta(event: InteractEvent): number {
    const handle = this.activeHandle!
    if (handle.axis === 'x') {
      return event.clientX - this.startPosition.x
    } else {
      return event.clientY - this.startPosition.y
    }
  }

  private calculateNewValue(delta: number): number {
    const handle = this.activeHandle!

    // Verschiedene Sensitivität je nach Handle-Typ
    let sensitivity = 1
    if (handle.type === 'radius') {
      sensitivity = 0.5 // Feinere Kontrolle
    }
    if (handle.type === 'flex') {
      sensitivity = 0.01 // flex-grow ist 0-2 range
    }

    // Direction-aware: manche Handles sind invertiert
    let directionMultiplier = 1
    if (handle.direction === 'n' || handle.direction === 'w') {
      directionMultiplier = -1 // Nach innen ziehen = größerer Wert
    }

    return this.startValue + delta * sensitivity * directionMultiplier
  }

  private applySnapping(value: number, event: InteractEvent): number {
    // Alt gedrückt = kein Snapping
    if (event.altKey) return Math.round(value)

    // Shift = größere Snap-Schritte
    const snapPoints = event.shiftKey
      ? [0, 8, 16, 24, 32, 48, 64, 96, 128]
      : [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64]

    // Token-aware Snapping wenn Token definiert
    const tokenValues = this.getTokenSnapPoints()
    const allSnapPoints = [...snapPoints, ...tokenValues]

    // Finde nächsten Snap-Punkt
    const threshold = 4
    for (const snap of allSnapPoints) {
      if (Math.abs(value - snap) < threshold) {
        return snap
      }
    }

    return Math.round(value)
  }

  private getTokenSnapPoints(): number[] {
    const tokens = state.getState().tokens || {}
    const spacingTokens = Object.entries(tokens)
      .filter(([key]) => key.includes('spacing') || key.includes('pad') || key.includes('gap'))
      .map(([_, value]) => parseFloat(value as string))
      .filter(v => !isNaN(v))

    return spacingTokens
  }

  private updatePreview(handle: Handle, value: number) {
    // Direktes Style-Update für flüssige Preview
    const element = this.getSelectedElement()
    if (!element) return

    const cssProperty = this.toCSSProperty(handle)
    element.style[cssProperty] = `${value}px`
  }

  private commitToCode(handle: Handle, value: number) {
    const nodeId = state.getState().selectedNodeId
    if (!nodeId) return

    // Bestimme Property-Name für Mirror Code
    const property = this.toMirrorProperty(handle)

    // CodeModifier für atomares Update
    this.codeModifier.updateProperty(nodeId, property, value)

    // Undo-Step
    events.emit('command:execute', {
      type: 'updateProperty',
      nodeId,
      property,
      value,
      previousValue: this.startValue
    })
  }

  private toMirrorProperty(handle: Handle): string {
    if (handle.type === 'padding') {
      if (handle.subProperty) {
        const dirMap = { top: 'padt', right: 'padr', bottom: 'padb', left: 'padl' }
        return dirMap[handle.subProperty] || 'pad'
      }
      return 'pad'
    }
    return handle.property
  }

  private toCSSProperty(handle: Handle): string {
    if (handle.type === 'padding' && handle.subProperty) {
      return `padding${handle.subProperty.charAt(0).toUpperCase() + handle.subProperty.slice(1)}`
    }
    const map = {
      'gap': 'gap',
      'rad': 'borderRadius',
      'w': 'width',
      'h': 'height'
    }
    return map[handle.property] || handle.property
  }
}
```

---

## 4. Feedback System

### 4.1 Value Labels

```typescript
// studio/preview/manipulation/FeedbackRenderer.ts

export class FeedbackRenderer {
  private svg: SVGElement
  private valueLabel: SVGGElement | null = null
  private guides: SVGGElement | null = null

  showValueLabel(handle: Handle, value: number) {
    this.hideValueLabel()

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('class', 'value-label')

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('rx', '4')
    bg.setAttribute('fill', '#1F2937')

    // Text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('fill', 'white')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-family', 'system-ui, sans-serif')
    text.textContent = this.formatValue(handle, value)

    group.appendChild(bg)
    group.appendChild(text)

    // Position based on handle
    const pos = this.getLabelPosition(handle)
    group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`)

    // Size background to text
    requestAnimationFrame(() => {
      const textRect = text.getBBox()
      bg.setAttribute('x', String(textRect.x - 6))
      bg.setAttribute('y', String(textRect.y - 4))
      bg.setAttribute('width', String(textRect.width + 12))
      bg.setAttribute('height', String(textRect.height + 8))
    })

    this.svg.appendChild(group)
    this.valueLabel = group
  }

  updateValueLabel(handle: Handle, value: number) {
    if (!this.valueLabel) return

    const text = this.valueLabel.querySelector('text')
    if (text) {
      text.textContent = this.formatValue(handle, value)

      // Animate if snapped
      if (this.isSnapped(value)) {
        this.valueLabel.classList.add('snapped')
        setTimeout(() => this.valueLabel?.classList.remove('snapped'), 150)
      }
    }
  }

  private formatValue(handle: Handle, value: number): string {
    // Check if value matches a token
    const token = this.findMatchingToken(value)
    if (token) {
      return `${token} (${value})`
    }

    if (handle.type === 'flex') {
      return `flex: ${value.toFixed(1)}`
    }

    return `${Math.round(value)}px`
  }

  showGuides(handle: Handle) {
    this.hideGuides()

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('class', 'manipulation-guides')

    if (handle.type === 'padding') {
      this.addPaddingGuides(group, handle)
    } else if (handle.type === 'gap') {
      this.addGapGuides(group, handle)
    }

    this.svg.appendChild(group)
    this.guides = group
  }

  private addPaddingGuides(group: SVGGElement, handle: Handle) {
    const element = this.getSelectedElement()
    if (!element) return

    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)

    // Zeige alle Padding-Werte
    const sides = ['Top', 'Right', 'Bottom', 'Left']
    sides.forEach(side => {
      const value = parseFloat(style[`padding${side}`])
      if (value > 0) {
        this.addDimensionLine(group, side.toLowerCase(), value, rect)
      }
    })
  }

  private addDimensionLine(group: SVGGElement, side: string, value: number, rect: DOMRect) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('stroke', '#3B82F6')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('stroke-dasharray', '4 2')

    // Position based on side
    // ... positioning logic

    group.appendChild(line)

    // Dimension text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('fill', '#3B82F6')
    text.setAttribute('font-size', '10')
    text.textContent = `${Math.round(value)}`
    group.appendChild(text)
  }

  hide() {
    this.hideValueLabel()
    this.hideGuides()
  }

  private hideValueLabel() {
    this.valueLabel?.remove()
    this.valueLabel = null
  }

  private hideGuides() {
    this.guides?.remove()
    this.guides = null
  }
}
```

### 4.2 CSS für Feedback

```css
/* studio/styles/manipulation.css */

.manipulation-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
}

.manipulation-handle {
  pointer-events: all;
  transition: transform 0.1s ease;
}

.manipulation-handle:hover {
  transform: scale(1.2);
}

.manipulation-handle:active {
  transform: scale(1.1);
}

.padding-zone {
  transition: fill 0.15s ease;
}

.manipulation-handle:hover ~ .padding-zone,
.padding-zone:hover {
  fill: rgba(59, 130, 246, 0.2) !important;
}

.value-label {
  pointer-events: none;
  transition: transform 0.1s ease;
}

.value-label.snapped {
  transform: scale(1.1);
}

.value-label.snapped text {
  fill: #10B981;
}

.manipulation-guides line {
  opacity: 0.6;
}

/* Während Drag: Element-Highlight */
.manipulation-active .selected-element {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

/* Cursor während Drag */
body.dragging-padding {
  cursor: ns-resize !important;
}

body.dragging-gap {
  cursor: ew-resize !important;
}

body.dragging-radius {
  cursor: nwse-resize !important;
}
```

---

## 5. Keyboard Modifiers

```typescript
// studio/preview/manipulation/KeyboardModifiers.ts

export class KeyboardModifiers {
  private modifiers = {
    shift: false,
    alt: false,
    cmd: false
  }

  constructor() {
    this.setupListeners()
  }

  private setupListeners() {
    document.addEventListener('keydown', (e) => {
      this.modifiers.shift = e.shiftKey
      this.modifiers.alt = e.altKey
      this.modifiers.cmd = e.metaKey || e.ctrlKey

      this.updateCursor()
      events.emit('modifiers:changed', this.modifiers)
    })

    document.addEventListener('keyup', (e) => {
      this.modifiers.shift = e.shiftKey
      this.modifiers.alt = e.altKey
      this.modifiers.cmd = e.metaKey || e.ctrlKey

      this.updateCursor()
      events.emit('modifiers:changed', this.modifiers)
    })
  }

  private updateCursor() {
    document.body.classList.toggle('modifier-shift', this.modifiers.shift)
    document.body.classList.toggle('modifier-alt', this.modifiers.alt)
    document.body.classList.toggle('modifier-cmd', this.modifiers.cmd)
  }

  get current() {
    return { ...this.modifiers }
  }
}

/*
Modifier-Effekte:

SHIFT während Padding-Drag:
→ Ändert gegenüberliegende Seite gleichzeitig
→ pad 16 → padx 24 (oder pady 24)

CMD während Padding-Drag:
→ Ändert alle Seiten gleichzeitig
→ pad 16 → pad 24

ALT während Drag:
→ Deaktiviert Snapping
→ Freie Werte möglich

SHIFT während Radius-Drag:
→ Ändert alle Corners
→ rad 8 → rad 16 (alle gleich)
*/
```

---

## 6. Integration mit Mirror

### 6.1 Preview Controller Integration

```typescript
// studio/preview/index.ts

import { ManipulationController } from './manipulation/ManipulationController'

export function createPreviewController(config: PreviewConfig) {
  const controller = {
    container: config.container,
    manipulation: null as ManipulationController | null,

    initialize() {
      // ... existing init

      // Manipulation Layer
      this.manipulation = new ManipulationController({
        container: this.container,
        getElement: (nodeId) => this.getElementByNodeId(nodeId),
        getIR: () => state.getState().ir
      })
    },

    enableManipulation() {
      this.manipulation?.enable()
    },

    disableManipulation() {
      this.manipulation?.disable()
    }
  }

  return controller
}
```

### 6.2 Code Sync

```typescript
// studio/preview/manipulation/CodeSync.ts

export class ManipulationCodeSync {
  private codeModifier: CodeModifier
  private debounceTimer: number | null = null

  constructor(codeModifier: CodeModifier) {
    this.codeModifier = codeModifier

    events.on('manipulation:move', this.onMove.bind(this))
    events.on('manipulation:end', this.onEnd.bind(this))
  }

  private onMove({ handle, value }: ManipulationEvent) {
    // Debounced code update während Drag
    // (Preview wird direkt via CSS aktualisiert)

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = window.setTimeout(() => {
      this.updateCodePreview(handle, value)
    }, 50)
  }

  private onEnd({ handle, value, previousValue }: ManipulationEvent) {
    // Clear debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Final code update
    this.commitCode(handle, value, previousValue)
  }

  private updateCodePreview(handle: Handle, value: number) {
    // Ghost-Text im Editor zeigen
    const nodeId = state.getState().selectedNodeId
    if (!nodeId) return

    const property = this.toMirrorProperty(handle)
    const formattedValue = this.formatValue(handle, value)

    events.emit('editor:showGhost', {
      nodeId,
      property,
      value: formattedValue
    })
  }

  private commitCode(handle: Handle, value: number, previousValue: number) {
    const nodeId = state.getState().selectedNodeId
    if (!nodeId) return

    const property = this.toMirrorProperty(handle)
    const formattedValue = this.formatValue(handle, value)

    // Execute as command for undo/redo
    events.emit('command:execute', {
      type: 'property:update',
      payload: {
        nodeId,
        property,
        newValue: formattedValue,
        oldValue: previousValue
      }
    })
  }

  private formatValue(handle: Handle, value: number): string {
    // Check if matches token
    const token = this.findMatchingToken(handle.type, value)
    if (token) {
      return token
    }

    return String(Math.round(value))
  }

  private findMatchingToken(type: string, value: number): string | null {
    const tokens = state.getState().tokens || {}

    // Suche nach Token mit diesem Wert
    for (const [name, tokenValue] of Object.entries(tokens)) {
      if (parseFloat(tokenValue as string) === value) {
        // Prüfe ob Token-Typ passt
        if (type === 'padding' && (name.includes('spacing') || name.includes('pad'))) {
          return `$${name}`
        }
        if (type === 'gap' && (name.includes('spacing') || name.includes('gap'))) {
          return `$${name}`
        }
        if (type === 'radius' && name.includes('radius')) {
          return `$${name}`
        }
      }
    }

    return null
  }
}
```

---

## 7. Dateistruktur

```
studio/preview/manipulation/
├── index.ts                    # Exports
├── ManipulationController.ts   # Hauptcontroller
├── DragController.ts           # Drag-Handling
├── PropertyMapper.ts           # IR → Handles Mapping
├── HandleRegistry.ts           # Handle-Verwaltung
├── FeedbackRenderer.ts         # Visual Feedback
├── KeyboardModifiers.ts        # Shift/Alt/Cmd
├── CodeSync.ts                 # Mirror Code Sync
├── SnapEngine.ts               # Snapping Logic
├── handles/
│   ├── PaddingHandles.ts
│   ├── GapHandles.ts
│   ├── RadiusHandles.ts
│   ├── SizeHandles.ts
│   └── FlexHandles.ts
└── __tests__/
    ├── ManipulationController.test.ts
    ├── PropertyMapper.test.ts
    └── DragController.test.ts
```

---

## 8. Roadmap

### Phase 1: Core (1-2 Wochen)
- [ ] ManipulationController Setup
- [ ] interact.js Integration
- [ ] HandleRegistry
- [ ] Padding Handles (basic)

### Phase 2: Handles (1-2 Wochen)
- [ ] Gap Handles
- [ ] Size Handles
- [ ] Radius Handles
- [ ] Feedback Renderer

### Phase 3: Polish (1 Woche)
- [ ] Snapping
- [ ] Keyboard Modifiers
- [ ] Token-aware Snapping
- [ ] Code Sync

### Phase 4: Advanced (1 Woche)
- [ ] Flex Handles
- [ ] Multi-Select
- [ ] Nested Elements
- [ ] Performance Optimization
