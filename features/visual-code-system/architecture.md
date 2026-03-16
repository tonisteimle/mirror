# Visual Code System - Architektur

> **⚠️ HINWEIS:** Diese Architektur-Beschreibung entspricht dem ursprünglichen Plan (V1).
> Die tatsächliche Implementierung folgt V2 (siehe `INTEGRATION-PLAN-V2.md`), welche
> die bestehenden Systeme erweitert statt neue parallele Komponenten zu erstellen.
>
> **Konzeptionell bleibt die Pipeline gültig:**
> Gesture → Intent → Structure → Code → Commit
>
> **Aber die Komponenten sind anders:**
> - GestureTracker → Browser DragEvent API (existiert)
> - ZoneDetector → DropZoneCalculator (erweitert)
> - CodeGenerator → CodeModifier (existiert)
> - FeedbackRenderer → DropZoneCalculator Indicators (erweitert)

---

Einheitliche Architektur für alle visuellen Interaktionen die Code generieren.

---

## Grundprinzip

Alle vier Features (Direct Manipulation, Semantic Drag, Grid Positioning, Layout Components) folgen demselben Pattern:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Gesture │ → │  Intent  │ → │ Structure│ → │   Code   │ → │  Commit  │
│  Track   │    │ Recognize│    │  Plan    │    │ Generate │    │  Change  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↓               ↓               ↓               ↓               ↓
  mousedown     "Was will      "Braucht es      Mirror-Code     CodeModifier
  mousemove      der User?"     Wrapper?"       generieren      + Undo/Redo
  mouseup
```

**Das System ist ein Pipeline-Prozessor für visuelle Gesten.**

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         VISUAL CODE SYSTEM                                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      InteractionController                             │ │
│  │                                                                        │ │
│  │  State: { mode, activeElement, gesture, intent, preview }             │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Gesture    │ │   Zone      │ │   Intent    │ │  Feedback   │          │
│  │  Tracker    │ │  Detector   │ │ Recognizer  │ │  Renderer   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│       │               │               │               │                    │
│       └───────────────┴───────────────┴───────────────┘                    │
│                               │                                             │
│                               ▼                                             │
│                    ┌─────────────────────┐                                 │
│                    │   StructurePlanner  │                                 │
│                    └─────────────────────┘                                 │
│                               │                                             │
│                               ▼                                             │
│                    ┌─────────────────────┐                                 │
│                    │    CodeGenerator    │                                 │
│                    └─────────────────────┘                                 │
│                               │                                             │
│                               ▼                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        EXISTING SYSTEMS                                │ │
│  │                                                                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │CodeModifier │ │   Command   │ │   State     │ │   Events    │     │ │
│  │  │             │ │  Executor   │ │   Store     │ │    Bus      │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. InteractionController

Der zentrale Controller der alle Interaktionen orchestriert.

### State

```typescript
interface InteractionState {
  // Aktueller Modus
  mode: InteractionMode

  // Element das manipuliert wird
  activeElement: {
    nodeId: string
    domElement: HTMLElement
    irNode: IRNode
    initialRect: DOMRect
  } | null

  // Aktuelle Geste
  gesture: GestureState | null

  // Erkannte Intention
  intent: Intent | null

  // Live-Preview der Änderung
  preview: PreviewState | null

  // Keyboard Modifiers
  modifiers: {
    shift: boolean
    alt: boolean
    cmd: boolean
  }
}

type InteractionMode =
  | 'idle'           // Nichts aktiv
  | 'selecting'      // Element wird ausgewählt
  | 'dragging'       // Element wird gezogen (Semantic Drag / Grid)
  | 'resizing'       // Handle wird gezogen (Direct Manipulation)
  | 'dropping'       // Element wird in Slot gedroppt
```

### Implementation

```typescript
// studio/interaction/InteractionController.ts

import { GestureTracker } from './GestureTracker'
import { ZoneDetector } from './ZoneDetector'
import { IntentRecognizer } from './IntentRecognizer'
import { FeedbackRenderer } from './FeedbackRenderer'
import { StructurePlanner } from './StructurePlanner'
import { CodeGenerator } from './CodeGenerator'
import { state, events } from '../core'

export class InteractionController {
  private gestureTracker: GestureTracker
  private zoneDetector: ZoneDetector
  private intentRecognizer: IntentRecognizer
  private feedbackRenderer: FeedbackRenderer
  private structurePlanner: StructurePlanner
  private codeGenerator: CodeGenerator

  private interactionState: InteractionState = {
    mode: 'idle',
    activeElement: null,
    gesture: null,
    intent: null,
    preview: null,
    modifiers: { shift: false, alt: false, cmd: false }
  }

  constructor(config: InteractionConfig) {
    this.gestureTracker = new GestureTracker(config.container)
    this.zoneDetector = new ZoneDetector(config.container)
    this.intentRecognizer = new IntentRecognizer()
    this.feedbackRenderer = new FeedbackRenderer(config.container)
    this.structurePlanner = new StructurePlanner()
    this.codeGenerator = new CodeGenerator()

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Gesture Events
    this.gestureTracker.on('start', this.onGestureStart.bind(this))
    this.gestureTracker.on('move', this.onGestureMove.bind(this))
    this.gestureTracker.on('end', this.onGestureEnd.bind(this))

    // Keyboard Modifiers
    this.gestureTracker.on('modifiers', this.onModifiersChange.bind(this))

    // Selection Changes
    events.on('selection:changed', this.onSelectionChanged.bind(this))
  }

  // ─────────────────────────────────────────────────────────────
  // GESTURE HANDLERS
  // ─────────────────────────────────────────────────────────────

  private onGestureStart(gesture: GestureState) {
    const target = this.identifyTarget(gesture)

    if (target.type === 'handle') {
      // Direct Manipulation: Handle angefasst
      this.startResizing(target, gesture)
    } else if (target.type === 'element') {
      // Semantic Drag / Grid: Element angefasst
      this.startDragging(target, gesture)
    } else if (target.type === 'component-library') {
      // Layout Components: Aus Library gezogen
      this.startDropping(target, gesture)
    }
  }

  private onGestureMove(gesture: GestureState) {
    this.interactionState.gesture = gesture

    // 1. Zonen aktualisieren basierend auf Position
    const zones = this.zoneDetector.detectZones(
      gesture.current,
      this.interactionState.activeElement,
      this.getContext()
    )

    // 2. Intent erkennen
    const intent = this.intentRecognizer.recognize(
      gesture,
      zones,
      this.interactionState.modifiers
    )
    this.interactionState.intent = intent

    // 3. Struktur planen (was muss sich ändern?)
    const plan = this.structurePlanner.plan(
      intent,
      this.interactionState.activeElement.irNode
    )

    // 4. Feedback zeigen
    this.feedbackRenderer.update({
      zones,
      activeZone: intent?.zone,
      intent,
      plan,
      gesture
    })

    // 5. Live-Preview (optional, für flüssiges Feedback)
    if (this.interactionState.mode === 'resizing') {
      this.applyLivePreview(intent)
    }
  }

  private onGestureEnd(gesture: GestureState) {
    const intent = this.interactionState.intent

    if (intent) {
      // 1. Finale Struktur planen
      const plan = this.structurePlanner.plan(
        intent,
        this.interactionState.activeElement.irNode
      )

      // 2. Code generieren
      const codeChanges = this.codeGenerator.generate(plan)

      // 3. Als Command ausführen (für Undo/Redo)
      this.executeChanges(codeChanges)
    }

    // Cleanup
    this.feedbackRenderer.hide()
    this.resetState()
  }

  // ─────────────────────────────────────────────────────────────
  // MODE-SPECIFIC STARTERS
  // ─────────────────────────────────────────────────────────────

  private startResizing(target: HandleTarget, gesture: GestureState) {
    this.interactionState.mode = 'resizing'
    this.interactionState.activeElement = this.getElementInfo(target.nodeId)

    // Zeige relevante Handles
    this.feedbackRenderer.showHandles(
      this.interactionState.activeElement,
      target.handleType
    )
  }

  private startDragging(target: ElementTarget, gesture: GestureState) {
    this.interactionState.mode = 'dragging'
    this.interactionState.activeElement = this.getElementInfo(target.nodeId)

    // Bestimme Kontext: Grid oder Flexbox?
    const context = this.analyzeLayoutContext(target.nodeId)

    // Zeige entsprechende Zonen
    if (context.type === 'grid') {
      this.feedbackRenderer.showGridOverlay(context.gridConfig)
    } else {
      this.feedbackRenderer.showDropZones(context.parentElement)
    }
  }

  private startDropping(target: LibraryTarget, gesture: GestureState) {
    this.interactionState.mode = 'dropping'

    // Zeige alle verfügbaren Slots
    this.feedbackRenderer.showSlotZones()
  }

  // ─────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────

  private executeChanges(changes: CodeChange[]) {
    events.emit('command:execute', {
      type: 'visual-code-change',
      changes,
      // Für Undo
      previousState: this.captureState()
    })
  }
}
```

---

## 2. GestureTracker

Erfasst alle Maus/Touch-Interaktionen und normalisiert sie.

### Interface

```typescript
interface GestureState {
  // Positionen
  start: Point
  current: Point
  delta: Point        // current - start

  // Bewegung
  velocity: Point
  direction: 'up' | 'down' | 'left' | 'right' | 'none'

  // Timing
  startTime: number
  duration: number

  // Status
  phase: 'start' | 'move' | 'end' | 'cancel'

  // Buttons
  button: 'left' | 'right' | 'middle'
}

interface Point {
  x: number
  y: number
}
```

### Implementation

```typescript
// studio/interaction/GestureTracker.ts

import { EventEmitter } from '../core/events'

export class GestureTracker extends EventEmitter {
  private container: HTMLElement
  private isTracking = false
  private gestureState: GestureState | null = null
  private modifiers = { shift: false, alt: false, cmd: false }

  constructor(container: HTMLElement) {
    super()
    this.container = container
    this.setupListeners()
  }

  private setupListeners() {
    // Mouse Events
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))

    // Touch Events
    this.container.addEventListener('touchstart', this.onTouchStart.bind(this))
    document.addEventListener('touchmove', this.onTouchMove.bind(this))
    document.addEventListener('touchend', this.onTouchEnd.bind(this))

    // Keyboard Modifiers
    document.addEventListener('keydown', this.onKeyDown.bind(this))
    document.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  private onMouseDown(e: MouseEvent) {
    // Ignoriere wenn nicht linke Maustaste (außer für Kontext-Menü)
    if (e.button !== 0) return

    this.isTracking = true
    this.gestureState = this.createGestureState(e, 'start')
    this.emit('start', this.gestureState)
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isTracking || !this.gestureState) return

    this.updateGestureState(e)
    this.emit('move', this.gestureState)
  }

  private onMouseUp(e: MouseEvent) {
    if (!this.isTracking || !this.gestureState) return

    this.gestureState.phase = 'end'
    this.emit('end', this.gestureState)

    this.isTracking = false
    this.gestureState = null
  }

  private createGestureState(e: MouseEvent | Touch, phase: GestureState['phase']): GestureState {
    const point = { x: e.clientX, y: e.clientY }

    return {
      start: point,
      current: point,
      delta: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      direction: 'none',
      startTime: Date.now(),
      duration: 0,
      phase,
      button: 'left'
    }
  }

  private updateGestureState(e: MouseEvent | Touch) {
    if (!this.gestureState) return

    const prevCurrent = { ...this.gestureState.current }

    this.gestureState.current = { x: e.clientX, y: e.clientY }
    this.gestureState.delta = {
      x: this.gestureState.current.x - this.gestureState.start.x,
      y: this.gestureState.current.y - this.gestureState.start.y
    }
    this.gestureState.velocity = {
      x: this.gestureState.current.x - prevCurrent.x,
      y: this.gestureState.current.y - prevCurrent.y
    }
    this.gestureState.duration = Date.now() - this.gestureState.startTime
    this.gestureState.phase = 'move'
    this.gestureState.direction = this.calculateDirection(this.gestureState.delta)
  }

  private calculateDirection(delta: Point): GestureState['direction'] {
    const threshold = 5
    if (Math.abs(delta.x) < threshold && Math.abs(delta.y) < threshold) {
      return 'none'
    }
    if (Math.abs(delta.x) > Math.abs(delta.y)) {
      return delta.x > 0 ? 'right' : 'left'
    } else {
      return delta.y > 0 ? 'down' : 'up'
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    const changed = this.updateModifiers(e)
    if (changed) {
      this.emit('modifiers', this.modifiers)
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const changed = this.updateModifiers(e)
    if (changed) {
      this.emit('modifiers', this.modifiers)
    }
  }

  private updateModifiers(e: KeyboardEvent): boolean {
    const prev = { ...this.modifiers }
    this.modifiers = {
      shift: e.shiftKey,
      alt: e.altKey,
      cmd: e.metaKey || e.ctrlKey
    }
    return (
      prev.shift !== this.modifiers.shift ||
      prev.alt !== this.modifiers.alt ||
      prev.cmd !== this.modifiers.cmd
    )
  }

  getModifiers() {
    return { ...this.modifiers }
  }
}
```

---

## 3. ZoneDetector

Erkennt Drop-Zonen basierend auf Position und Kontext.

### Zone Types

```typescript
type ZoneType =
  | 'padding'      // Semantic Drag: Padding-Zone
  | 'center'       // Semantic Drag: Zentrierung
  | 'align'        // Semantic Drag: Ausrichtung
  | 'grid-cell'    // Grid: Spezifische Zelle
  | 'grid-span'    // Grid: Bereich über mehrere Zellen
  | 'slot'         // Layout Components: Slot
  | 'handle'       // Direct Manipulation: Handle
  | 'between'      // Gap zwischen Elementen

interface Zone {
  id: string
  type: ZoneType
  bounds: DOMRect
  data: ZoneData
  priority: number  // Höher = bevorzugt bei Überlappung
}

type ZoneData =
  | PaddingZoneData
  | GridZoneData
  | SlotZoneData
  | HandleZoneData

interface PaddingZoneData {
  side: 'left' | 'right' | 'top' | 'bottom'
  value: number
  token?: string
}

interface GridZoneData {
  column: number
  columnSpan: number
  row: number
  rowSpan: number
}

interface SlotZoneData {
  slotName: string
  parentComponent: string
  isEmpty: boolean
}

interface HandleZoneData {
  handleType: 'padding' | 'gap' | 'radius' | 'size'
  direction?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  property: string
  currentValue: number | string
}
```

### Implementation

```typescript
// studio/interaction/ZoneDetector.ts

export class ZoneDetector {
  private container: HTMLElement
  private zoneCache: Map<string, Zone[]> = new Map()

  constructor(container: HTMLElement) {
    this.container = container
  }

  detectZones(
    position: Point,
    activeElement: ActiveElement | null,
    context: InteractionContext
  ): Zone[] {
    const allZones: Zone[] = []

    // 1. Handle Zones (für Direct Manipulation)
    if (context.mode === 'resizing' && activeElement) {
      allZones.push(...this.getHandleZones(activeElement))
    }

    // 2. Grid Zones (für Grid Positioning)
    if (context.hasGrid && activeElement) {
      allZones.push(...this.getGridZones(context.gridConfig, activeElement))
    }

    // 3. Semantic Drag Zones (für Positionierung)
    if (context.mode === 'dragging' && activeElement) {
      allZones.push(...this.getSemanticZones(activeElement, context))
    }

    // 4. Slot Zones (für Layout Components)
    if (context.mode === 'dropping') {
      allZones.push(...this.getSlotZones())
    }

    // Filtere Zonen die die Position enthalten
    const matchingZones = allZones.filter(zone =>
      this.pointInRect(position, zone.bounds)
    )

    // Sortiere nach Priorität
    return matchingZones.sort((a, b) => b.priority - a.priority)
  }

  // ─────────────────────────────────────────────────────────────
  // ZONE GENERATORS
  // ─────────────────────────────────────────────────────────────

  private getHandleZones(element: ActiveElement): Zone[] {
    const zones: Zone[] = []
    const rect = element.domElement.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    // Padding Handles
    const paddingHandles: Array<{
      direction: 'n' | 's' | 'e' | 'w'
      x: number
      y: number
    }> = [
      { direction: 'n', x: rect.width / 2, y: 0 },
      { direction: 's', x: rect.width / 2, y: rect.height },
      { direction: 'e', x: rect.width, y: rect.height / 2 },
      { direction: 'w', x: 0, y: rect.height / 2 }
    ]

    paddingHandles.forEach(handle => {
      zones.push({
        id: `handle-padding-${handle.direction}`,
        type: 'handle',
        bounds: this.createHandleBounds(
          rect.left - containerRect.left + handle.x,
          rect.top - containerRect.top + handle.y,
          24  // Handle hit area
        ),
        data: {
          handleType: 'padding',
          direction: handle.direction,
          property: 'pad',
          currentValue: this.getPaddingValue(element, handle.direction)
        },
        priority: 100  // Handles haben höchste Priorität
      })
    })

    // Gap Handles (zwischen Kindern)
    if (element.irNode.children?.length > 1) {
      zones.push(...this.getGapHandleZones(element))
    }

    // Radius Handle
    zones.push(...this.getRadiusHandleZones(element))

    return zones
  }

  private getGridZones(gridConfig: GridConfig, element: ActiveElement): Zone[] {
    const zones: Zone[] = []
    const containerRect = this.getGridContainer(element).getBoundingClientRect()

    const cellWidth = (containerRect.width - (gridConfig.columns - 1) * gridConfig.gap) / gridConfig.columns
    const rowCount = gridConfig.rows || Math.ceil(containerRect.height / cellWidth)
    const cellHeight = gridConfig.rows
      ? (containerRect.height - (rowCount - 1) * gridConfig.gap) / rowCount
      : cellWidth

    for (let row = 1; row <= rowCount; row++) {
      for (let col = 1; col <= gridConfig.columns; col++) {
        const x = (col - 1) * (cellWidth + gridConfig.gap)
        const y = (row - 1) * (cellHeight + gridConfig.gap)

        zones.push({
          id: `grid-${row}-${col}`,
          type: 'grid-cell',
          bounds: new DOMRect(
            containerRect.left + x,
            containerRect.top + y,
            cellWidth,
            cellHeight
          ),
          data: {
            column: col,
            columnSpan: 1,
            row: row,
            rowSpan: 1
          },
          priority: 50
        })
      }
    }

    return zones
  }

  private getSemanticZones(element: ActiveElement, context: InteractionContext): Zone[] {
    const zones: Zone[] = []
    const parentRect = element.domElement.parentElement?.getBoundingClientRect()
    if (!parentRect) return zones

    const containerRect = this.container.getBoundingClientRect()

    // Spacing-Werte (aus Tokens oder Defaults)
    const spacings = context.tokens?.spacing || [8, 16, 24, 32]

    // Linke Padding-Zonen
    let currentX = 0
    spacings.forEach(spacing => {
      zones.push({
        id: `semantic-pad-left-${spacing}`,
        type: 'padding',
        bounds: new DOMRect(
          parentRect.left - containerRect.left + currentX,
          parentRect.top - containerRect.top,
          spacing - currentX,
          parentRect.height
        ),
        data: {
          side: 'left',
          value: spacing,
          token: context.tokens?.findToken('spacing', spacing)
        },
        priority: 30
      })
      currentX = spacing
    })

    // Center Zone
    const centerWidth = parentRect.width * 0.4
    zones.push({
      id: 'semantic-center',
      type: 'center',
      bounds: new DOMRect(
        parentRect.left - containerRect.left + parentRect.width * 0.3,
        parentRect.top - containerRect.top,
        centerWidth,
        parentRect.height
      ),
      data: { side: 'center', value: 0 },
      priority: 40
    })

    // Rechte Padding-Zonen (gespiegelt)
    currentX = parentRect.width
    spacings.forEach(spacing => {
      zones.push({
        id: `semantic-pad-right-${spacing}`,
        type: 'padding',
        bounds: new DOMRect(
          parentRect.left - containerRect.left + currentX - spacing,
          parentRect.top - containerRect.top,
          spacing,
          parentRect.height
        ),
        data: {
          side: 'right',
          value: spacing,
          token: context.tokens?.findToken('spacing', spacing)
        },
        priority: 30
      })
      currentX = currentX - spacing
    })

    return zones
  }

  private getSlotZones(): Zone[] {
    const zones: Zone[] = []

    // Finde alle Slots im aktuellen Dokument
    const slots = this.findAllSlots()

    slots.forEach(slot => {
      const element = this.getElementForSlot(slot)
      if (!element) return

      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()

      zones.push({
        id: `slot-${slot.parentComponent}-${slot.name}`,
        type: 'slot',
        bounds: new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height
        ),
        data: {
          slotName: slot.name,
          parentComponent: slot.parentComponent,
          isEmpty: !slot.hasChildren
        },
        priority: 60
      })
    })

    return zones
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private pointInRect(point: Point, rect: DOMRect): boolean {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    )
  }

  private createHandleBounds(centerX: number, centerY: number, size: number): DOMRect {
    return new DOMRect(
      centerX - size / 2,
      centerY - size / 2,
      size,
      size
    )
  }
}
```

---

## 4. IntentRecognizer

Interpretiert Gesten und Zonen zu einer konkreten Intention.

### Intent Types

```typescript
type Intent =
  | PropertyIntent      // Direct Manipulation
  | PositionIntent      // Semantic Drag
  | GridIntent          // Grid Positioning
  | SlotIntent          // Layout Components

interface PropertyIntent {
  type: 'property'
  property: string          // 'pad', 'gap', 'rad', etc.
  subProperty?: string      // 'left', 'top', etc.
  value: number | string
  previousValue: number | string
}

interface PositionIntent {
  type: 'position'
  position: 'left' | 'center' | 'right' | 'top' | 'bottom'
  value?: number            // Für padding
  token?: string            // Wenn Token-Wert
  needsWrapper: boolean
}

interface GridIntent {
  type: 'grid'
  column: number
  columnSpan: number
  row?: number
  rowSpan?: number
  alignment?: 'start' | 'center' | 'end'
}

interface SlotIntent {
  type: 'slot'
  slotName: string
  parentComponent: string
  insertIndex?: number      // Position innerhalb des Slots
}
```

### Implementation

```typescript
// studio/interaction/IntentRecognizer.ts

export class IntentRecognizer {

  recognize(
    gesture: GestureState,
    zones: Zone[],
    modifiers: Modifiers
  ): Intent | null {
    if (zones.length === 0) return null

    // Höchste Priorität Zone
    const primaryZone = zones[0]

    switch (primaryZone.type) {
      case 'handle':
        return this.recognizePropertyIntent(gesture, primaryZone, modifiers)

      case 'padding':
      case 'center':
      case 'align':
        return this.recognizePositionIntent(gesture, primaryZone, zones, modifiers)

      case 'grid-cell':
      case 'grid-span':
        return this.recognizeGridIntent(gesture, primaryZone, zones, modifiers)

      case 'slot':
        return this.recognizeSlotIntent(primaryZone)

      default:
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PROPERTY INTENT (Direct Manipulation)
  // ─────────────────────────────────────────────────────────────

  private recognizePropertyIntent(
    gesture: GestureState,
    zone: Zone,
    modifiers: Modifiers
  ): PropertyIntent {
    const data = zone.data as HandleZoneData

    // Berechne neuen Wert basierend auf Drag-Delta
    const delta = this.getDeltaForDirection(gesture.delta, data.direction)

    // Sensitivität je nach Property
    const sensitivity = this.getSensitivity(data.handleType, modifiers)

    let newValue = (data.currentValue as number) + delta * sensitivity

    // Snapping (außer bei Alt)
    if (!modifiers.alt) {
      newValue = this.snapValue(newValue, data.handleType, modifiers)
    }

    // Clamp
    newValue = Math.max(0, Math.round(newValue))

    return {
      type: 'property',
      property: data.property,
      subProperty: this.directionToSubProperty(data.direction),
      value: newValue,
      previousValue: data.currentValue
    }
  }

  private getDeltaForDirection(delta: Point, direction?: string): number {
    switch (direction) {
      case 'n': return -delta.y
      case 's': return delta.y
      case 'e': return delta.x
      case 'w': return -delta.x
      case 'nw': return -(delta.x + delta.y) / 2
      case 'ne': return (delta.x - delta.y) / 2
      case 'sw': return (-delta.x + delta.y) / 2
      case 'se': return (delta.x + delta.y) / 2
      default: return delta.x
    }
  }

  private getSensitivity(handleType: string, modifiers: Modifiers): number {
    // Shift = feinere Kontrolle
    const base = modifiers.shift ? 0.5 : 1

    switch (handleType) {
      case 'radius': return base * 0.5
      case 'gap': return base * 1
      case 'padding': return base * 1
      case 'size': return base * 1
      default: return base
    }
  }

  private snapValue(value: number, handleType: string, modifiers: Modifiers): number {
    // Shift = größere Snap-Schritte
    const snapPoints = modifiers.shift
      ? [0, 8, 16, 24, 32, 48, 64, 96, 128]
      : [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48]

    const threshold = 4

    for (const snap of snapPoints) {
      if (Math.abs(value - snap) < threshold) {
        return snap
      }
    }

    return value
  }

  // ─────────────────────────────────────────────────────────────
  // POSITION INTENT (Semantic Drag)
  // ─────────────────────────────────────────────────────────────

  private recognizePositionIntent(
    gesture: GestureState,
    zone: Zone,
    allZones: Zone[],
    modifiers: Modifiers
  ): PositionIntent {
    const data = zone.data as PaddingZoneData

    if (zone.type === 'center') {
      return {
        type: 'position',
        position: 'center',
        needsWrapper: true
      }
    }

    return {
      type: 'position',
      position: data.side as PositionIntent['position'],
      value: data.value,
      token: data.token,
      needsWrapper: true
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GRID INTENT (Grid Positioning)
  // ─────────────────────────────────────────────────────────────

  private recognizeGridIntent(
    gesture: GestureState,
    zone: Zone,
    allZones: Zone[],
    modifiers: Modifiers
  ): GridIntent {
    const data = zone.data as GridZoneData

    // Finde alle Grid-Zellen die vom Element überdeckt werden
    const coveredCells = allZones.filter(z =>
      z.type === 'grid-cell' || z.type === 'grid-span'
    )

    if (coveredCells.length === 0) {
      return {
        type: 'grid',
        column: data.column,
        columnSpan: 1
      }
    }

    // Berechne Span basierend auf überdeckten Zellen
    const columns = coveredCells.map(z => (z.data as GridZoneData).column)
    const minCol = Math.min(...columns)
    const maxCol = Math.max(...columns)

    // Prüfe ob zentriert
    const totalColumns = 12 // TODO: aus Config
    const leftSpace = minCol - 1
    const rightSpace = totalColumns - maxCol

    let alignment: GridIntent['alignment']
    if (Math.abs(leftSpace - rightSpace) <= 1) {
      alignment = 'center'
    } else if (leftSpace < rightSpace) {
      alignment = 'start'
    } else {
      alignment = 'end'
    }

    return {
      type: 'grid',
      column: minCol,
      columnSpan: maxCol - minCol + 1,
      alignment
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SLOT INTENT (Layout Components)
  // ─────────────────────────────────────────────────────────────

  private recognizeSlotIntent(zone: Zone): SlotIntent {
    const data = zone.data as SlotZoneData

    return {
      type: 'slot',
      slotName: data.slotName,
      parentComponent: data.parentComponent,
      insertIndex: data.isEmpty ? 0 : undefined
    }
  }
}
```

---

## 5. StructurePlanner

Plant welche strukturellen Änderungen am Code nötig sind.

### Plan Types

```typescript
interface StructurePlan {
  changes: StructureChange[]
  description: string       // Für Hint-Anzeige
  codePreview: string       // Für Code-Vorschau
}

type StructureChange =
  | UpdatePropertyChange
  | WrapNodeChange
  | UnwrapNodeChange
  | InsertChildChange
  | MoveNodeChange
  | RemoveNodeChange

interface UpdatePropertyChange {
  type: 'update-property'
  nodeId: string
  property: string
  value: any
  previousValue?: any
}

interface WrapNodeChange {
  type: 'wrap-node'
  nodeId: string
  wrapper: {
    component: string
    properties: Record<string, any>
  }
}

interface UnwrapNodeChange {
  type: 'unwrap-node'
  nodeId: string
  wrapperId: string
}

interface InsertChildChange {
  type: 'insert-child'
  parentId: string
  slotName?: string
  child: {
    component: string
    properties?: Record<string, any>
  }
  index?: number
}

interface MoveNodeChange {
  type: 'move-node'
  nodeId: string
  newParentId: string
  newIndex?: number
}
```

### Implementation

```typescript
// studio/interaction/StructurePlanner.ts

export class StructurePlanner {

  plan(intent: Intent | null, currentNode: IRNode): StructurePlan | null {
    if (!intent) return null

    switch (intent.type) {
      case 'property':
        return this.planPropertyChange(intent, currentNode)

      case 'position':
        return this.planPositionChange(intent, currentNode)

      case 'grid':
        return this.planGridChange(intent, currentNode)

      case 'slot':
        return this.planSlotChange(intent, currentNode)

      default:
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PROPERTY CHANGE (Direct Manipulation)
  // ─────────────────────────────────────────────────────────────

  private planPropertyChange(intent: PropertyIntent, node: IRNode): StructurePlan {
    const fullProperty = intent.subProperty
      ? `${intent.property} ${intent.subProperty}`
      : intent.property

    return {
      changes: [{
        type: 'update-property',
        nodeId: node.id,
        property: fullProperty,
        value: intent.value,
        previousValue: intent.previousValue
      }],
      description: `${fullProperty}: ${intent.value}`,
      codePreview: `${fullProperty} ${intent.value}`
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POSITION CHANGE (Semantic Drag)
  // ─────────────────────────────────────────────────────────────

  private planPositionChange(intent: PositionIntent, node: IRNode): StructurePlan {
    // Prüfe ob bereits ein passender Wrapper existiert
    const existingWrapper = this.findExistingWrapper(node)

    if (existingWrapper) {
      // Wrapper modifizieren statt neu erstellen
      return this.planWrapperModification(intent, existingWrapper)
    }

    if (!intent.needsWrapper) {
      // Kein Wrapper nötig (z.B. nur Reihenfolge ändern)
      return this.planSimpleMove(intent, node)
    }

    // Neuen Wrapper erstellen
    return this.planWrapperCreation(intent, node)
  }

  private planWrapperCreation(intent: PositionIntent, node: IRNode): StructurePlan {
    const wrapperProps: Record<string, any> = { w: 'full' }

    if (intent.position === 'center') {
      wrapperProps.center = true
    } else if (intent.position === 'left' || intent.position === 'right') {
      const padProp = intent.position === 'left' ? 'pad left' : 'pad right'
      wrapperProps[padProp] = intent.token || intent.value
    }

    const propsString = Object.entries(wrapperProps)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')

    return {
      changes: [{
        type: 'wrap-node',
        nodeId: node.id,
        wrapper: {
          component: 'Box',
          properties: wrapperProps
        }
      }],
      description: `Wrapper: Box ${propsString}`,
      codePreview: `Box ${propsString}\n  ${node.name || node.type}`
    }
  }

  private planWrapperModification(intent: PositionIntent, wrapper: IRNode): StructurePlan {
    const changes: StructureChange[] = []

    // Entferne alte Positionierung
    if (wrapper.properties.center) {
      changes.push({
        type: 'update-property',
        nodeId: wrapper.id,
        property: 'center',
        value: undefined
      })
    }
    ['pad left', 'pad right', 'pad top', 'pad bottom'].forEach(prop => {
      if (wrapper.properties[prop]) {
        changes.push({
          type: 'update-property',
          nodeId: wrapper.id,
          property: prop,
          value: undefined
        })
      }
    })

    // Füge neue Positionierung hinzu
    if (intent.position === 'center') {
      changes.push({
        type: 'update-property',
        nodeId: wrapper.id,
        property: 'center',
        value: true
      })
    } else {
      const padProp = `pad ${intent.position}`
      changes.push({
        type: 'update-property',
        nodeId: wrapper.id,
        property: padProp,
        value: intent.token || intent.value
      })
    }

    return {
      changes,
      description: intent.position === 'center'
        ? 'Zentriert'
        : `${intent.position}: ${intent.token || intent.value}`,
      codePreview: this.generateCodePreview(wrapper, changes)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GRID CHANGE (Grid Positioning)
  // ─────────────────────────────────────────────────────────────

  private planGridChange(intent: GridIntent, node: IRNode): StructurePlan {
    const changes: StructureChange[] = []

    // Span
    changes.push({
      type: 'update-property',
      nodeId: node.id,
      property: 'span',
      value: intent.columnSpan
    })

    // Start (wenn nicht Spalte 1)
    if (intent.column > 1 && intent.alignment !== 'center') {
      changes.push({
        type: 'update-property',
        nodeId: node.id,
        property: 'start',
        value: intent.column
      })
    }

    // Center (wenn zentriert)
    if (intent.alignment === 'center') {
      changes.push({
        type: 'update-property',
        nodeId: node.id,
        property: 'center',
        value: true
      })
    }

    // Row (wenn mehrzeilig)
    if (intent.row && intent.row > 1) {
      changes.push({
        type: 'update-property',
        nodeId: node.id,
        property: 'row',
        value: intent.row
      })
    }

    const codePreview = this.generateGridCodePreview(intent)

    return {
      changes,
      description: `Spalte ${intent.column}-${intent.column + intent.columnSpan - 1}`,
      codePreview
    }
  }

  private generateGridCodePreview(intent: GridIntent): string {
    const parts: string[] = [`span ${intent.columnSpan}`]

    if (intent.alignment === 'center') {
      parts.push('center')
    } else if (intent.column > 1) {
      parts.push(`start ${intent.column}`)
    }

    if (intent.row && intent.row > 1) {
      parts.push(`row ${intent.row}`)
    }

    return parts.join(', ')
  }

  // ─────────────────────────────────────────────────────────────
  // SLOT CHANGE (Layout Components)
  // ─────────────────────────────────────────────────────────────

  private planSlotChange(intent: SlotIntent, node: IRNode): StructurePlan {
    return {
      changes: [{
        type: 'move-node',
        nodeId: node.id,
        newParentId: `${intent.parentComponent}/${intent.slotName}`,
        newIndex: intent.insertIndex
      }],
      description: `In ${intent.parentComponent} → ${intent.slotName}`,
      codePreview: `${intent.parentComponent}\n  ${intent.slotName}\n    ${node.name || node.type}`
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private findExistingWrapper(node: IRNode): IRNode | null {
    // Prüfe ob direkter Parent ein "leerer" Wrapper ist
    // (Box mit nur Layout-Properties, ein Kind)
    const parent = this.getParent(node)
    if (!parent) return null

    if (
      parent.type === 'Box' &&
      parent.children?.length === 1 &&
      this.isPositioningWrapper(parent)
    ) {
      return parent
    }

    return null
  }

  private isPositioningWrapper(node: IRNode): boolean {
    const props = node.properties || {}
    const positioningProps = ['center', 'pad left', 'pad right', 'pad top', 'pad bottom', 'hor-center', 'ver-center']
    return positioningProps.some(p => props[p] !== undefined)
  }
}
```

---

## 6. CodeGenerator

Generiert Mirror-Code-Änderungen aus dem StructurePlan.

```typescript
// studio/interaction/CodeGenerator.ts

import { CodeModifier } from '../../src/studio/code-modifier'

export interface CodeChange {
  type: 'insert' | 'replace' | 'delete'
  from: number        // Position im Code
  to: number
  text: string
}

export class CodeGenerator {
  private codeModifier: CodeModifier

  constructor() {
    this.codeModifier = new CodeModifier()
  }

  generate(plan: StructurePlan): CodeChange[] {
    const changes: CodeChange[] = []

    for (const change of plan.changes) {
      switch (change.type) {
        case 'update-property':
          changes.push(...this.generatePropertyUpdate(change))
          break

        case 'wrap-node':
          changes.push(...this.generateWrap(change))
          break

        case 'unwrap-node':
          changes.push(...this.generateUnwrap(change))
          break

        case 'insert-child':
          changes.push(...this.generateInsert(change))
          break

        case 'move-node':
          changes.push(...this.generateMove(change))
          break
      }
    }

    return this.optimizeChanges(changes)
  }

  private generatePropertyUpdate(change: UpdatePropertyChange): CodeChange[] {
    // Nutze bestehenden CodeModifier
    return this.codeModifier.updateProperty(
      change.nodeId,
      change.property,
      change.value
    )
  }

  private generateWrap(change: WrapNodeChange): CodeChange[] {
    const node = this.getNode(change.nodeId)
    const sourceMap = this.getSourceMap()

    const nodeRange = sourceMap.getRange(change.nodeId)
    if (!nodeRange) return []

    // Wrapper-Code generieren
    const wrapperProps = Object.entries(change.wrapper.properties)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')

    const wrapperLine = `${change.wrapper.component} ${wrapperProps}`

    // Einrückung des Original-Nodes erhöhen
    const originalCode = this.getCode(nodeRange)
    const indentedCode = this.indent(originalCode, 2)

    return [{
      type: 'replace',
      from: nodeRange.from,
      to: nodeRange.to,
      text: `${wrapperLine}\n${indentedCode}`
    }]
  }

  private generateUnwrap(change: UnwrapNodeChange): CodeChange[] {
    const wrapper = this.getNode(change.wrapperId)
    const child = this.getNode(change.nodeId)
    const sourceMap = this.getSourceMap()

    const wrapperRange = sourceMap.getRange(change.wrapperId)
    const childRange = sourceMap.getRange(change.nodeId)
    if (!wrapperRange || !childRange) return []

    // Kind-Code mit reduzierter Einrückung
    const childCode = this.getCode(childRange)
    const dedentedCode = this.dedent(childCode, 2)

    return [{
      type: 'replace',
      from: wrapperRange.from,
      to: wrapperRange.to,
      text: dedentedCode
    }]
  }

  private generateInsert(change: InsertChildChange): CodeChange[] {
    const parent = this.getNode(change.parentId)
    const sourceMap = this.getSourceMap()

    // Finde Einfügeposition
    const insertPos = this.findInsertPosition(parent, change.slotName, change.index)

    // Generiere Child-Code
    const childCode = this.generateNodeCode(change.child)
    const indentedCode = this.indent(childCode, this.getIndentLevel(parent) + 2)

    return [{
      type: 'insert',
      from: insertPos,
      to: insertPos,
      text: `\n${indentedCode}`
    }]
  }

  private generateMove(change: MoveNodeChange): CodeChange[] {
    // Move = Delete + Insert
    const deleteChanges = this.generateDelete(change.nodeId)
    const insertChanges = this.generateInsert({
      type: 'insert-child',
      parentId: change.newParentId,
      child: this.nodeToSpec(this.getNode(change.nodeId)),
      index: change.newIndex
    })

    return [...deleteChanges, ...insertChanges]
  }

  private optimizeChanges(changes: CodeChange[]): CodeChange[] {
    // Sortiere nach Position (rückwärts, damit Indizes stabil bleiben)
    return changes.sort((a, b) => b.from - a.from)
  }
}
```

---

## 7. FeedbackRenderer

Rendert visuelles Feedback während der Interaktion.

```typescript
// studio/interaction/FeedbackRenderer.ts

export class FeedbackRenderer {
  private container: HTMLElement
  private overlay: SVGElement
  private hintBox: HTMLElement

  private elements: {
    zones: SVGGElement
    handles: SVGGElement
    gridLines: SVGGElement
    activeHighlight: SVGRectElement
    valueLabel: SVGGElement
  }

  constructor(container: HTMLElement) {
    this.container = container
    this.createOverlay()
    this.createHintBox()
  }

  private createOverlay() {
    this.overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.overlay.setAttribute('class', 'interaction-overlay')
    this.overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1000;
    `

    // Layer für verschiedene Feedback-Typen
    this.elements = {
      zones: this.createGroup('zones'),
      handles: this.createGroup('handles'),
      gridLines: this.createGroup('grid-lines'),
      activeHighlight: this.createRect('active-highlight'),
      valueLabel: this.createGroup('value-label')
    }

    Object.values(this.elements).forEach(el => this.overlay.appendChild(el))
    this.container.appendChild(this.overlay)
  }

  private createHintBox() {
    this.hintBox = document.createElement('div')
    this.hintBox.className = 'interaction-hint'
    this.hintBox.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #1F2937;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      display: none;
      z-index: 1001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    this.container.appendChild(this.hintBox)
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  update(state: FeedbackState) {
    // Zonen rendern
    this.renderZones(state.zones, state.activeZone)

    // Active Highlight
    if (state.activeZone) {
      this.showActiveHighlight(state.activeZone)
    }

    // Hint aktualisieren
    if (state.intent && state.plan) {
      this.showHint(state.plan)
    }

    // Value Label (für Direct Manipulation)
    if (state.intent?.type === 'property') {
      this.showValueLabel(state.intent, state.gesture)
    }
  }

  showHandles(element: ActiveElement, activeHandle?: string) {
    this.clearGroup(this.elements.handles)

    const handles = this.calculateHandles(element)

    handles.forEach(handle => {
      const group = this.createHandleElement(handle)

      if (handle.id === activeHandle) {
        group.classList.add('active')
      }

      // Handles brauchen pointer-events
      group.style.pointerEvents = 'all'

      this.elements.handles.appendChild(group)
    })
  }

  showGridOverlay(gridConfig: GridConfig) {
    this.clearGroup(this.elements.gridLines)

    const containerRect = this.container.getBoundingClientRect()
    const cellWidth = (containerRect.width - (gridConfig.columns - 1) * gridConfig.gap) / gridConfig.columns

    // Vertikale Linien
    for (let i = 0; i <= gridConfig.columns; i++) {
      const x = i * (cellWidth + gridConfig.gap) - gridConfig.gap / 2

      const line = this.createLine(x, 0, x, containerRect.height)
      line.setAttribute('stroke', '#3B82F6')
      line.setAttribute('stroke-width', '1')
      line.setAttribute('stroke-dasharray', '4 4')
      line.setAttribute('opacity', '0.3')

      this.elements.gridLines.appendChild(line)

      // Spaltennummer
      if (i < gridConfig.columns) {
        const label = this.createText(x + cellWidth / 2, 16, String(i + 1))
        label.setAttribute('fill', '#3B82F6')
        label.setAttribute('font-size', '10')
        label.setAttribute('text-anchor', 'middle')
        label.setAttribute('opacity', '0.6')

        this.elements.gridLines.appendChild(label)
      }
    }
  }

  showDropZones(parentElement: HTMLElement) {
    this.clearGroup(this.elements.zones)

    const rect = parentElement.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    const offset = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top
    }

    // Padding Zones
    const spacings = [16, 32]

    spacings.forEach(spacing => {
      // Links
      this.elements.zones.appendChild(
        this.createZoneRect(
          offset.x,
          offset.y,
          spacing,
          rect.height,
          `pad-left-${spacing}`
        )
      )

      // Rechts
      this.elements.zones.appendChild(
        this.createZoneRect(
          offset.x + rect.width - spacing,
          offset.y,
          spacing,
          rect.height,
          `pad-right-${spacing}`
        )
      )
    })

    // Center Zone
    const centerWidth = rect.width * 0.4
    this.elements.zones.appendChild(
      this.createZoneRect(
        offset.x + rect.width * 0.3,
        offset.y,
        centerWidth,
        rect.height,
        'center'
      )
    )
  }

  showSlotZones() {
    // Ähnlich wie showDropZones, aber für Slots
  }

  hide() {
    this.clearGroup(this.elements.zones)
    this.clearGroup(this.elements.handles)
    this.clearGroup(this.elements.gridLines)
    this.elements.activeHighlight.style.display = 'none'
    this.elements.valueLabel.style.display = 'none'
    this.hintBox.style.display = 'none'
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  private renderZones(zones: Zone[], activeZone?: Zone) {
    this.clearGroup(this.elements.zones)

    zones.forEach(zone => {
      const rect = this.createZoneRect(
        zone.bounds.x,
        zone.bounds.y,
        zone.bounds.width,
        zone.bounds.height,
        zone.id
      )

      if (activeZone?.id === zone.id) {
        rect.setAttribute('fill', 'rgba(59, 130, 246, 0.3)')
        rect.setAttribute('stroke', '#3B82F6')
        rect.setAttribute('stroke-width', '2')
      }

      this.elements.zones.appendChild(rect)
    })
  }

  private showActiveHighlight(zone: Zone) {
    const rect = this.elements.activeHighlight
    rect.setAttribute('x', String(zone.bounds.x))
    rect.setAttribute('y', String(zone.bounds.y))
    rect.setAttribute('width', String(zone.bounds.width))
    rect.setAttribute('height', String(zone.bounds.height))
    rect.setAttribute('fill', 'rgba(59, 130, 246, 0.2)')
    rect.setAttribute('stroke', '#3B82F6')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('rx', '4')
    rect.style.display = 'block'
  }

  private showHint(plan: StructurePlan) {
    this.hintBox.innerHTML = `
      <div style="margin-bottom: 4px; opacity: 0.7;">${plan.description}</div>
      <code style="font-family: 'SF Mono', monospace; font-size: 12px;">
        ${plan.codePreview}
      </code>
    `
    this.hintBox.style.display = 'block'
  }

  private showValueLabel(intent: PropertyIntent, gesture: GestureState) {
    this.clearGroup(this.elements.valueLabel)

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('fill', '#1F2937')
    bg.setAttribute('rx', '4')

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('fill', 'white')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-family', 'SF Mono, monospace')
    text.textContent = `${intent.property}: ${intent.value}`

    this.elements.valueLabel.appendChild(bg)
    this.elements.valueLabel.appendChild(text)

    // Position nahe dem Cursor
    const x = gesture.current.x + 20
    const y = gesture.current.y - 10
    this.elements.valueLabel.setAttribute('transform', `translate(${x}, ${y})`)

    // Größe des Hintergrunds anpassen
    requestAnimationFrame(() => {
      const textBox = text.getBBox()
      bg.setAttribute('x', String(textBox.x - 6))
      bg.setAttribute('y', String(textBox.y - 4))
      bg.setAttribute('width', String(textBox.width + 12))
      bg.setAttribute('height', String(textBox.height + 8))
    })

    this.elements.valueLabel.style.display = 'block'
  }

  private createGroup(id: string): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('id', id)
    return g
  }

  private createRect(id: string): SVGRectElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('id', id)
    rect.style.display = 'none'
    return rect
  }

  private createZoneRect(x: number, y: number, w: number, h: number, id: string): SVGRectElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(x))
    rect.setAttribute('y', String(y))
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('fill', 'rgba(59, 130, 246, 0.1)')
    rect.setAttribute('stroke', 'rgba(59, 130, 246, 0.3)')
    rect.setAttribute('stroke-width', '1')
    rect.setAttribute('rx', '4')
    rect.setAttribute('data-zone', id)
    return rect
  }

  private createLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    return line
  }

  private createText(x: number, y: number, content: string): SVGTextElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', String(x))
    text.setAttribute('y', String(y))
    text.textContent = content
    return text
  }

  private clearGroup(group: SVGGElement) {
    while (group.firstChild) {
      group.removeChild(group.firstChild)
    }
  }
}
```

---

## 8. Dateistruktur

```
studio/interaction/
├── index.ts                      # Exports
├── InteractionController.ts      # Haupt-Orchestrator
├── GestureTracker.ts            # Maus/Touch Events
├── ZoneDetector.ts              # Drop-Zonen berechnen
├── IntentRecognizer.ts          # Intention erkennen
├── StructurePlanner.ts          # Änderungen planen
├── CodeGenerator.ts             # Mirror-Code generieren
├── FeedbackRenderer.ts          # Visuelles Feedback
├── types.ts                     # Shared Types
└── __tests__/
    ├── InteractionController.test.ts
    ├── ZoneDetector.test.ts
    ├── IntentRecognizer.test.ts
    └── StructurePlanner.test.ts
```

---

## 9. Integration

### Bootstrap

```typescript
// studio/bootstrap.ts

import { InteractionController } from './interaction'

export function initializeStudio(config: BootstrapConfig) {
  // ... bestehende Initialisierung

  // Interaction System
  const interaction = new InteractionController({
    container: config.previewContainer,
    codeModifier: codeModifier,
    sourceMap: sourceMap,
    state: state,
    events: events
  })

  // In State registrieren
  state.setState({ interaction })

  return {
    // ... andere exports
    interaction
  }
}
```

### Event Flow

```
User drückt Maus
       │
       ▼
GestureTracker.onMouseDown
       │
       ▼
InteractionController.onGestureStart
       │
       ├─── identifyTarget()
       │         │
       │         ├─── Handle? → startResizing()
       │         ├─── Element? → startDragging()
       │         └─── Library? → startDropping()
       │
       ▼
User bewegt Maus
       │
       ▼
GestureTracker.onMouseMove
       │
       ▼
InteractionController.onGestureMove
       │
       ├─── ZoneDetector.detectZones()
       ├─── IntentRecognizer.recognize()
       ├─── StructurePlanner.plan()
       └─── FeedbackRenderer.update()
       │
       ▼
User lässt los
       │
       ▼
GestureTracker.onMouseUp
       │
       ▼
InteractionController.onGestureEnd
       │
       ├─── CodeGenerator.generate()
       ├─── CommandExecutor.execute()
       └─── FeedbackRenderer.hide()
```

---

## 10. Erweiterbarkeit

Neue Interaktions-Modi können einfach hinzugefügt werden:

```typescript
// Beispiel: Neuer "Constraint" Mode

// 1. Neuen ZoneType hinzufügen
type ZoneType = ... | 'constraint'

// 2. Zone Detection erweitern
class ZoneDetector {
  private getConstraintZones(): Zone[] {
    // ...
  }
}

// 3. Intent Recognition erweitern
class IntentRecognizer {
  private recognizeConstraintIntent(): ConstraintIntent {
    // ...
  }
}

// 4. Structure Planning erweitern
class StructurePlanner {
  private planConstraintChange(): StructurePlan {
    // ...
  }
}
```

Das System ist **modular und erweiterbar** - neue Features können hinzugefügt werden ohne bestehenden Code zu ändern.
