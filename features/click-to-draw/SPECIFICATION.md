# Click-to-Draw Technical Specification

## System Overview

Click-to-Draw is a **state machine-based drawing system** that allows users to create positioned components in absolute containers by clicking and dragging. The system integrates with existing Mirror Studio infrastructure for code modification, snapping, and visual feedback.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      ComponentPanel                              │
│  - onClick(item) → drawManager.enterDrawMode(item)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DrawManager                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  State Machine: idle → ready → drawing → idle            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ Event       │  │ Validation   │  │ Visual Feedback    │     │
│  │ Handling    │  │ Logic        │  │ Rendering          │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
└─────┬───────────────────┬─────────────────────┬─────────────────┘
      │                   │                     │
      ▼                   ▼                     ▼
┌─────────────┐   ┌───────────────┐   ┌─────────────────────┐
│ CodeModifier│   │ LayoutDetection│   │ DrawRectRenderer    │
│ .addChild() │   │ .detectLayout()│   │ + SnapIntegration   │
└─────────────┘   └───────────────┘   └─────────────────────┘
```

---

## Core Components

### 1. DrawManager

**Location:** `studio/visual/draw-manager.ts`

**Responsibility:** Orchestrates the entire draw workflow

```typescript
export class DrawManager {
  // State
  private mode: DrawMode = 'idle'
  private componentToDraw: ComponentItem | null = null
  private drawState: DrawState | null = null

  // Dependencies (injected)
  private container: HTMLElement
  private codeModifier: CodeModifier
  private layoutDetection: LayoutDetection
  private renderer: DrawRectRenderer
  private snapIntegration: SnapIntegration

  // Public API
  enterDrawMode(component: ComponentItem): void
  cancel(): void
  isInDrawMode(): boolean

  // Event Handlers (private)
  private handleMouseDown(e: MouseEvent): void
  private handleMouseMove(e: MouseEvent): void
  private handleMouseUp(e: MouseEvent): void
  private handleKeyDown(e: KeyboardEvent): void
  private handleKeyUp(e: KeyboardEvent): void

  // State Transitions
  private transitionTo(newMode: DrawMode): void
  private validateTransition(from: DrawMode, to: DrawMode): boolean

  // Helpers
  private findContainerAtPoint(x: number, y: number): HTMLElement | null
  private isValidDrawTarget(element: HTMLElement): boolean
  private calculateRect(start: Point, current: Point, modifiers: Modifiers): Rect
  private finishDrawing(): void
  private cleanup(): void
}
```

**State Machine:**

```
┌──────┐
│ idle │ ◄────────────────────────────────┐
└──┬───┘                                  │
   │ enterDrawMode(component)             │
   ▼                                      │
┌───────┐                                 │
│ ready │ ◄─────────────┐                 │
└──┬────┘               │                 │
   │ mouseDown          │                 │
   │ (valid container)  │                 │
   ▼                    │ ESC /           │ ESC /
┌─────────┐             │ error           │ mouseUp /
│ drawing │─────────────┘                 │ finishDrawing()
└─────────┘                               │
   │                                      │
   │ mouseUp (success)                    │
   └──────────────────────────────────────┘
```

**State Transitions:**

| From | To | Trigger | Condition |
|------|----|----|-----------|
| `idle` | `ready` | `enterDrawMode(component)` | Valid component |
| `ready` | `drawing` | `mouseDown` | Valid absolute container |
| `ready` | `idle` | `ESC` / `cancel()` | - |
| `drawing` | `idle` | `mouseUp` | Success |
| `drawing` | `ready` | `ESC` | User cancels |
| `drawing` | `idle` | Error | Code modification fails |

---

### 2. DrawRectRenderer

**Location:** `studio/visual/draw-rect-renderer.ts`

**Responsibility:** Render live drawing rectangle and labels

```typescript
export class DrawRectRenderer {
  private rectElement: HTMLElement | null = null
  private dimensionLabel: HTMLElement | null = null
  private positionLabel: HTMLElement | null = null

  constructor(private container: HTMLElement) {}

  // Main rendering
  render(rect: Rect, containerRect: DOMRect, scale: number): void {
    this.updateRectangle(rect, scale)
    this.updateDimensionLabel(rect)
    this.updatePositionLabel(rect)
  }

  // Individual updates
  private updateRectangle(rect: Rect, scale: number): void
  private updateDimensionLabel(rect: Rect): void
  private updatePositionLabel(rect: Rect): void

  // Cleanup
  hide(): void
  dispose(): void
}
```

**DOM Structure:**

```html
<div class="draw-overlay">
  <!-- Live rectangle -->
  <div class="draw-rect" style="left: 50px; top: 30px; width: 200px; height: 150px;">
    <!-- Dimension label -->
    <div class="draw-rect-label draw-rect-label-dimensions">200 × 150</div>
    <!-- Position label -->
    <div class="draw-rect-label draw-rect-label-position">x: 50, y: 30</div>
  </div>
</div>
```

---

### 3. SnapIntegration

**Location:** `studio/visual/snap-integration.ts`

**Responsibility:** Coordinate grid and smart guide snapping

```typescript
export class SnapIntegration {
  constructor(
    private guideCalculator: GuideCalculator,
    private guideRenderer: GuideRenderer,
    private config: SnapConfig
  ) {}

  // Apply all snapping
  snap(rect: Rect, siblings: HTMLElement[], containerRect: DOMRect): SnapResult {
    let snapped = rect
    let guides: Guide[] = []

    // 1. Grid snapping (if enabled)
    if (this.config.gridSize > 0) {
      snapped = this.applyGridSnap(snapped)
    }

    // 2. Smart guide snapping (if enabled & not disabled by modifier)
    if (this.config.enableSmartGuides && !this.config.disableSnapping) {
      const snapResult = this.guideCalculator.calculate(
        snapped,
        siblings,
        containerRect
      )
      snapped = {
        x: snapResult.snappedX ?? snapped.x,
        y: snapResult.snappedY ?? snapped.y,
        width: snapped.width,
        height: snapped.height,
      }
      guides = snapResult.guides
    }

    return { rect: snapped, guides }
  }

  // Grid snapping
  private applyGridSnap(rect: Rect): Rect {
    const { gridSize } = this.config
    return {
      x: Math.round(rect.x / gridSize) * gridSize,
      y: Math.round(rect.y / gridSize) * gridSize,
      width: Math.round(rect.width / gridSize) * gridSize,
      height: Math.round(rect.height / gridSize) * gridSize,
    }
  }

  // Update config
  updateConfig(config: Partial<SnapConfig>): void
}
```

**Snap Priority:**
1. Grid snap (always first, if enabled)
2. Edge alignment (left, right, top, bottom)
3. Center alignment (centerX, centerY)

---

## Data Structures

### DrawMode

```typescript
type DrawMode = 'idle' | 'ready' | 'drawing'
```

### DrawState

```typescript
interface DrawState {
  // What to draw
  component: ComponentItem

  // Where we're drawing
  containerElement: HTMLElement
  containerNodeId: string
  containerRect: DOMRect

  // Drawing geometry
  startPoint: Point          // Initial mouse down position
  currentPoint: Point        // Current mouse position
  currentRect: Rect          // Calculated rectangle

  // Modifiers
  modifiers: Modifiers

  // Visual feedback
  guides: Guide[]

  // Container scale
  scale: number
}
```

### Point

```typescript
interface Point {
  x: number
  y: number
}
```

### Rect

```typescript
interface Rect {
  x: number          // Relative to container
  y: number          // Relative to container
  width: number
  height: number
}
```

### Modifiers

```typescript
interface Modifiers {
  shift: boolean      // Constrain to square
  alt: boolean        // Draw from center
  meta: boolean       // Disable snapping (Cmd/Ctrl)
}
```

### ComponentItem

```typescript
interface ComponentItem {
  id: string
  name: string
  template: string        // 'Box', 'Button', etc.
  icon: string
  properties?: string     // Default properties
  textContent?: string
  description?: string
}
```

### DrawResult

```typescript
interface DrawResult {
  success: boolean
  nodeId?: string
  properties: {
    x: number
    y: number
    w: number
    h: number
  }
  error?: string
}
```

### SnapConfig

```typescript
interface SnapConfig {
  gridSize: number            // 0 = disabled
  enableSmartGuides: boolean
  snapTolerance: number       // For smart guides (px)
  disableSnapping: boolean    // Runtime override (Cmd key)
}
```

---

## Event Flow

### 1. Enter Draw Mode

```
User clicks "Box" in ComponentPanel
       ↓
ComponentPanel.onClick(item)
       ↓
drawManager.enterDrawMode(item)
       ↓
DrawManager.transitionTo('ready')
       ↓
- Store componentToDraw = item
- Change cursor to crosshair
- Attach global mousedown listener
- Attach global keydown listener (ESC)
- Emit 'draw-mode:entered' event
```

### 2. Start Drawing

```
User clicks in preview (absolute container)
       ↓
DrawManager.handleMouseDown(e)
       ↓
findContainerAtPoint(e.clientX, e.clientY)
       ↓
isValidDrawTarget(container)
  → If invalid: showError(), return
  → If valid: continue
       ↓
DrawManager.transitionTo('drawing')
       ↓
- Create DrawState with startPoint
- Attach mousemove, mouseup listeners
- Show initial rectangle (0×0)
- Emit 'drawing:started' event
```

### 3. Update Drawing (RAF-Throttled)

```
User moves mouse
       ↓
DrawManager.handleMouseMove(e) [throttled]
       ↓
updateCurrentPoint(e.clientX, e.clientY)
       ↓
calculateRect(startPoint, currentPoint, modifiers)
  → Apply negative drawing normalization
  → Apply minimum size (10×10)
  → Convert to container-relative coords
       ↓
snapIntegration.snap(rect, siblings, containerRect)
  → Grid snap
  → Smart guide snap
  → Return snapped rect + guides
       ↓
renderer.render(snappedRect, containerRect, scale)
  → Update rectangle DOM
  → Update dimension label
  → Update position label
       ↓
guideRenderer.render(guides)
  → Show alignment guides
```

### 4. Finish Drawing

```
User releases mouse
       ↓
DrawManager.handleMouseUp(e)
       ↓
finishDrawing()
       ↓
Validate rect size (>= 10×10)
  → If too small: showError(), transitionTo('ready')
  → If valid: continue
       ↓
codeModifier.addChild(containerNodeId, template, {
  properties: `x ${rect.x}, y ${rect.y}, w ${rect.width}, h ${rect.height}`,
  textContent: component.textContent,
  position: 'last'
})
       ↓
If success:
  - Emit 'drawing:completed' event
  - Emit 'compile:requested' event
  - cleanup()
  - transitionTo('idle')
       ↓
If error:
  - showError(error.message)
  - cleanup()
  - transitionTo('idle')
```

### 5. Cancel Drawing

```
User presses ESC (any state)
       ↓
DrawManager.handleKeyDown(e)
  → e.key === 'Escape'
       ↓
cancel()
       ↓
- cleanup()
- transitionTo('idle')
- Emit 'drawing:cancelled' event
```

---

## Algorithms

### Rectangle Calculation

Handles drawing from any corner (4 directions):

```typescript
function calculateRect(
  start: Point,
  current: Point,
  modifiers: Modifiers
): Rect {
  let x = Math.min(start.x, current.x)
  let y = Math.min(start.y, current.y)
  let width = Math.abs(current.x - start.x)
  let height = Math.abs(current.y - start.y)

  // Apply minimum size
  width = Math.max(width, MIN_SIZE)
  height = Math.max(height, MIN_SIZE)

  // Constrain to square (Shift)
  if (modifiers.shift) {
    const size = Math.max(width, height)
    width = size
    height = size
  }

  // Draw from center (Alt)
  if (modifiers.alt) {
    x = start.x - width / 2
    y = start.y - height / 2
  }

  return { x, y, width, height }
}
```

### Container-Relative Coordinates

Convert screen coordinates to container-relative:

```typescript
function screenToContainerCoords(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  scale: number
): Point {
  return {
    x: (screenX - containerRect.left) / scale,
    y: (screenY - containerRect.top) / scale,
  }
}
```

### Container Validation

```typescript
function isValidDrawTarget(element: HTMLElement): boolean {
  // Must have mirror-id (part of AST)
  if (!element.dataset.mirrorId) {
    return false
  }

  // Must be absolute container
  const layout = detectLayout(element)
  if (layout.type !== 'absolute') {
    return false
  }

  return true
}
```

---

## Integration Points

### 1. ComponentPanel Integration

**Modify:** `studio/panels/components/component-panel.ts`

```typescript
// In renderItem():
itemEl.addEventListener('click', () => {
  // Check user preference
  if (userPrefersDraw || item.prefersDraw) {
    drawManager.enterDrawMode(item)
  } else {
    this.callbacks.onClick?.(item)
  }
}, { signal })
```

### 2. Bootstrap Integration

**Modify:** `studio/bootstrap.ts`

```typescript
import { DrawManager, createDrawManager } from './visual/draw-manager'

// Initialize DrawManager
const drawManager = createDrawManager({
  container: config.previewContainer,
  codeModifier,
  sourceMap: () => state.get().sourceMap,
  gridSize: 8,
  enableSmartGuides: true,
})

// Hook up callbacks
drawManager.onDrawComplete = (result) => {
  if (result.success) {
    events.emit('compile:requested', {})
  }
}

drawManager.onDrawCancel = () => {
  console.log('[DrawManager] Drawing cancelled by user')
}

// Store in studio instance
studio.drawManager = drawManager
```

### 3. CodeModifier Integration

Uses existing `CodeModifier.addChild()`:

```typescript
const result = codeModifier.addChild(
  containerNodeId,
  componentTemplate,
  {
    properties: `x ${rect.x}, y ${rect.y}, w ${rect.width}, h ${rect.height}`,
    textContent: component.textContent,
    position: 'last',  // Always append to end
  }
)
```

**No new CodeModifier methods needed!**

### 4. LayoutDetection Integration

Uses existing `detectLayout()`:

```typescript
import { detectLayout } from '../studio/utils/layout-detection'

const layout = detectLayout(element)
const isAbsoluteContainer = layout.type === 'absolute'
```

---

## CSS Styling

### Draw Overlay

```css
/* Overlay container (full-screen) */
.draw-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

/* Live rectangle */
.draw-rect {
  position: absolute;
  border: 2px dashed var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  transition: none; /* No animation during drag */
}

/* Dimension label */
.draw-rect-label-dimensions {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

/* Position label */
.draw-rect-label-position {
  position: absolute;
  top: -24px;
  left: 0;
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-family: var(--font-mono);
  white-space: nowrap;
}

/* Cursor states */
.draw-cursor-crosshair {
  cursor: crosshair !important;
}

.draw-cursor-crosshair * {
  cursor: crosshair !important;
}
```

---

## Error Handling

### Error Types

```typescript
enum DrawErrorType {
  INVALID_CONTAINER = 'invalid_container',
  NO_CONTAINER = 'no_container',
  SOURCE_MAP_STALE = 'source_map_stale',
  CODE_MODIFICATION_FAILED = 'code_modification_failed',
  ELEMENT_TOO_SMALL = 'element_too_small',
}

interface DrawError {
  type: DrawErrorType
  message: string
  userMessage: string
  recoverable: boolean
}
```

### Error Handlers

```typescript
function handleDrawError(error: DrawError): void {
  // Log to console
  console.error('[DrawManager]', error)

  // Show user notification
  showNotification(error.userMessage, 'error')

  // Recoverable errors: stay in ready mode
  if (error.recoverable) {
    cleanup()
    transitionTo('ready')
  }
  // Non-recoverable: exit to idle
  else {
    cleanup()
    transitionTo('idle')
  }
}
```

---

## Performance Considerations

### RAF Throttling

```typescript
private rafId: number | null = null

private handleMouseMove(e: MouseEvent): void {
  if (this.rafId !== null) return

  this.rafId = requestAnimationFrame(() => {
    this.updateDrawing(e.clientX, e.clientY)
    this.rafId = null
  })
}
```

### DOM Reuse

```typescript
// Reuse rectangle element instead of recreating
if (!this.rectElement) {
  this.rectElement = document.createElement('div')
  this.rectElement.className = 'draw-rect'
  this.container.appendChild(this.rectElement)
}

// Update styles (faster than recreating)
this.rectElement.style.left = rect.x + 'px'
this.rectElement.style.top = rect.y + 'px'
// ...
```

### Event Cleanup

```typescript
private cleanup(): void {
  // Cancel RAF
  if (this.rafId) {
    cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  // Remove listeners
  document.removeEventListener('mousemove', this.boundHandleMouseMove)
  document.removeEventListener('mouseup', this.boundHandleMouseUp)

  // Hide visuals
  this.renderer.hide()
  this.guideRenderer.hide()

  // Clear state
  this.drawState = null
}
```

---

## API Reference

### DrawManager

```typescript
class DrawManager {
  constructor(config: DrawManagerConfig)

  // Mode control
  enterDrawMode(component: ComponentItem): void
  cancel(): void
  isInDrawMode(): boolean
  getMode(): DrawMode

  // Configuration
  updateConfig(config: Partial<DrawManagerConfig>): void

  // Callbacks
  onDrawComplete?: (result: DrawResult) => void
  onDrawCancel?: () => void
  onError?: (error: DrawError) => void

  // Lifecycle
  dispose(): void
}
```

### DrawManagerConfig

```typescript
interface DrawManagerConfig {
  container: HTMLElement
  codeModifier: CodeModifier
  sourceMap: () => SourceMap | null
  gridSize?: number             // Default: 8
  enableSmartGuides?: boolean   // Default: true
  snapTolerance?: number        // Default: 4
  minSize?: number              // Default: 10
}
```

### createDrawManager

```typescript
function createDrawManager(
  config: DrawManagerConfig
): DrawManager
```

---

## Events

All events emitted via `studio/core/events.ts`:

```typescript
// Draw mode entered
events.emit('draw-mode:entered', {
  component: ComponentItem
})

// Drawing started
events.emit('drawing:started', {
  component: ComponentItem,
  containerNodeId: string
})

// Drawing completed
events.emit('drawing:completed', {
  result: DrawResult
})

// Drawing cancelled
events.emit('drawing:cancelled', {})

// Drawing error
events.emit('drawing:error', {
  error: DrawError
})
```

---

## Browser Compatibility

**Minimum Requirements:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Used:**
- `requestAnimationFrame` (all browsers)
- `MouseEvent.clientX/Y` (all browsers)
- `KeyboardEvent.key` (all browsers)
- `Element.dataset` (all browsers)
- CSS `position: absolute` (all browsers)

**No Polyfills Required!**

---

**Status:** ✅ Specification Complete
**Last Updated:** 2026-03-16
