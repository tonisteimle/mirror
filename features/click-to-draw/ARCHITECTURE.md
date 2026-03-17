# Click-to-Draw Architecture

## System Context

Click-to-Draw integrates into Mirror Studio's existing architecture, reusing infrastructure for code modification, snapping, and visual feedback. It operates as a **parallel interaction mode** to drag-and-drop, sharing the same code generation paths.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Mirror Studio Core                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐      │
│  │ State Store  │  │ Event Bus    │  │ Command Pattern │      │
│  │ (state.ts)   │  │ (events.ts)  │  │ (executor.ts)   │      │
│  └──────────────┘  └──────────────┘  └─────────────────┘      │
└────────────────────────────────────────────────────────────────┘
                             ▲
                             │
                    Uses core primitives
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      DrawManager Module                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             State Machine                                │   │
│  │   idle ──→ ready ──→ drawing ──→ idle                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐      │
│  │ Event        │  │ Validation   │  │ Visual Feedback │      │
│  │ Handling     │  │ (containers) │  │ (DrawRenderer)  │      │
│  └──────────────┘  └──────────────┘  └─────────────────┘      │
└────────────────────────────────────────────────────────────────┘
          │                    │                      │
          │ Uses               │ Uses                 │ Uses
          ▼                    ▼                      ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  CodeModifier    │  │ LayoutDetection │  │  SnapIntegration │
│  .addChild()     │  │ .detectLayout() │  │  (SmartGuides)   │
└──────────────────┘  └─────────────────┘  └──────────────────┘
```

---

## Module Dependencies

### Direct Dependencies

| Module | Usage | Location |
|--------|-------|----------|
| `CodeModifier` | Generate x, y, w, h properties | `src/studio/code-modifier.ts` |
| `LayoutDetection` | Validate absolute containers | `src/studio/utils/layout-detection.ts` |
| `SmartGuides` | Alignment snapping | `studio/visual/smart-guides/` |
| `GuideRenderer` | Render guide lines | `studio/visual/smart-guides/guide-renderer.ts` |
| `DropIndicator` | Position labels (reuse) | `studio/visual/drop-indicator.ts` |

### Indirect Dependencies (via Core)

| Module | Usage | Location |
|--------|-------|----------|
| `State Store` | Get SourceMap | `studio/core/state.ts` |
| `Event Bus` | Emit events | `studio/core/events.ts` |
| `SourceMap` | Map nodeId to code | `src/studio/source-map.ts` |

### NO Dependencies On

- ❌ `DragDropManager` - Independent system
- ❌ `ElementMover` - Different interaction
- ❌ `ResizeManager` - Post-creation only

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ComponentPanel                            │
│  onClick(item) ──────────────────────────────┐              │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │   DrawManager        │
                                    │                      │
                                    │  - mode: DrawMode    │
                                    │  - drawState         │
                                    │  - componentToDraw   │
                                    └──────┬───────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │ DrawRectRenderer │  │ SnapIntegration  │  │ ContainerFinder  │
         │                  │  │                  │  │                  │
         │ - render()       │  │ - snap()         │  │ - findAt()       │
         │ - hide()         │  │ - applyGridSnap()│  │ - validate()     │
         └──────────────────┘  └──────────────────┘  └──────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                   ┌──────────────────┐  ┌──────────────────┐
                   │ GuideCalculator  │  │  GuideRenderer   │
                   │ (existing)       │  │  (existing)      │
                   └──────────────────┘  └──────────────────┘
```

---

## Sequence Diagrams

### 1. Enter Draw Mode

```
User          ComponentPanel    DrawManager      Preview
 │                 │                 │              │
 │ click "Box"     │                 │              │
 ├────────────────>│                 │              │
 │                 │ enterDrawMode() │              │
 │                 ├────────────────>│              │
 │                 │                 │ mode='ready' │
 │                 │                 │ cursor=✛     │
 │                 │                 ├─────────────>│
 │                 │                 │              │
 │                 │   <ready state> │              │
```

### 2. Draw Rectangle

```
User     DrawManager    ContainerFinder  SnapIntegration  DrawRenderer  CodeModifier
 │            │               │                 │              │             │
 │ mousedown  │               │                 │              │             │
 ├───────────>│               │                 │              │             │
 │            │ findAt(x,y)   │                 │              │             │
 │            ├──────────────>│                 │              │             │
 │            │<──container───┤                 │              │             │
 │            │               │                 │              │             │
 │            │ validate()    │                 │              │             │
 │            ├──────────────>│                 │              │             │
 │            │<──isValid?────┤                 │              │             │
 │            │               │                 │              │             │
 │ mousemove  │               │                 │              │             │
 ├───────────>│ calcRect()    │                 │              │             │
 │            │               │                 │              │             │
 │            │ snap(rect)    │                 │              │             │
 │            ├───────────────┼────────────────>│              │             │
 │            │<──snapped─────┼─────────────────┤              │             │
 │            │               │                 │              │             │
 │            │ render()      │                 │              │             │
 │            ├───────────────┼─────────────────┼─────────────>│             │
 │            │               │                 │              │             │
 │ mouseup    │               │                 │              │             │
 ├───────────>│               │                 │              │             │
 │            │ addChild()    │                 │              │             │
 │            ├───────────────┼─────────────────┼──────────────┼────────────>│
 │            │<──success─────┼─────────────────┼──────────────┼─────────────┤
 │            │               │                 │              │             │
 │            │ cleanup()     │                 │              │             │
 │            │ mode='idle'   │                 │              │             │
```

---

## State Machine Detail

### States

```typescript
type DrawMode = 'idle' | 'ready' | 'drawing'
```

| State | Description | Active Listeners | Visual Indicators |
|-------|-------------|------------------|-------------------|
| **idle** | Normal operation, no draw mode | None | Default cursor |
| **ready** | Component selected, waiting for mousedown | `mousedown`, `keydown (ESC)` | Crosshair cursor, container hints |
| **drawing** | User is drawing rectangle | `mousemove`, `mouseup`, `keydown` | Live rect, labels, guides |

### Transitions

```typescript
const transitions: Record<DrawMode, Partial<Record<DrawMode, boolean>>> = {
  idle: { ready: true },
  ready: { drawing: true, idle: true },
  drawing: { idle: true, ready: true }, // ready only on ESC
}
```

### Guards

```typescript
function canTransition(from: DrawMode, to: DrawMode): boolean {
  return transitions[from]?.[to] ?? false
}
```

---

## Data Flow

### Input Flow

```
User Input (MouseEvent)
       ↓
DrawManager.handleMouseMove()
       ↓
screenToContainerCoords()  (coordinate transform)
       ↓
calculateRect()  (geometry calculation)
       ↓
SnapIntegration.snap()  (snap to grid + guides)
       ↓
DrawRectRenderer.render()  (visual feedback)
```

### Output Flow

```
DrawManager.finishDrawing()
       ↓
Build properties string: `x ${x}, y ${y}, w ${w}, h ${h}`
       ↓
CodeModifier.addChild(nodeId, template, { properties })
       ↓
If success: events.emit('compile:requested')
       ↓
Compilation runs, IR updated, preview re-renders
```

---

## Coordinate Systems

### Screen Coordinates

- Origin: Top-left of viewport
- Units: CSS pixels
- Source: `MouseEvent.clientX/Y`

### Container Coordinates

- Origin: Top-left of absolute container
- Units: Logical pixels (accounting for scale)
- Conversion:
  ```typescript
  containerX = (screenX - containerRect.left) / scale
  containerY = (screenY - containerRect.top) / scale
  ```

### Code Coordinates

- Same as container coordinates
- Rounded to integers
- Written as: `x 50, y 30`

---

## Error Handling Strategy

### Error Classification

| Type | Severity | Recovery |
|------|----------|----------|
| Invalid container | Warning | Stay in ready mode, show guidance |
| No container found | Warning | Stay in ready mode |
| Element too small | Info | Stay in ready mode, allow retry |
| Source map stale | Error | Exit to idle, prompt recompile |
| Code modification failed | Error | Exit to idle, log details |

### Error Propagation

```
Error occurs in DrawManager
       ↓
handleDrawError(error)
       ↓
Log to console (always)
       ↓
Show user notification (toast)
       ↓
If recoverable: cleanup(), transitionTo('ready')
If not: cleanup(), transitionTo('idle')
       ↓
Emit 'drawing:error' event
```

---

## Performance Optimizations

### 1. RAF Throttling

**Problem:** `mousemove` fires ~100 times/sec, but screen refreshes at 60 FPS

**Solution:** Request animation frame throttling

```typescript
private rafId: number | null = null

private handleMouseMove(e: MouseEvent): void {
  if (this.rafId !== null) return // Already scheduled

  this.rafId = requestAnimationFrame(() => {
    this.updateDrawing(e.clientX, e.clientY)
    this.rafId = null
  })
}
```

**Impact:** Reduces updates from ~100/sec to 60/sec (40% reduction)

### 2. DOM Reuse

**Problem:** Creating/destroying DOM elements is expensive

**Solution:** Create once, update styles

```typescript
// Create once in constructor
this.rectElement = document.createElement('div')

// Reuse in render()
this.rectElement.style.left = rect.x + 'px'  // Fast
this.rectElement.style.top = rect.y + 'px'
```

**Impact:** ~10× faster than createElement() per frame

### 3. Sibling Caching

**Problem:** Finding siblings for smart guides on every frame is slow

**Solution:** Cache siblings when entering drawing state

```typescript
// Cache once on mousedown
this.cachedSiblings = Array.from(container.children)
  .filter(child => child !== draggedElement)

// Reuse in mousemove
snapIntegration.snap(rect, this.cachedSiblings, containerRect)
```

**Impact:** O(1) instead of O(n) per frame

### 4. Coordinate Caching

**Problem:** `getBoundingClientRect()` forces layout reflow

**Solution:** Cache container rect, invalidate on resize

```typescript
private containerRect: DOMRect | null = null
private containerRectValidUntil = 0

private getContainerRect(element: HTMLElement): DOMRect {
  const now = Date.now()
  if (this.containerRect && now < this.containerRectValidUntil) {
    return this.containerRect
  }

  this.containerRect = element.getBoundingClientRect()
  this.containerRectValidUntil = now + 100 // 100ms TTL
  return this.containerRect
}
```

**Impact:** Avoids 60 reflows/sec during drawing

---

## Integration Points

### 1. Bootstrap Integration

**File:** `studio/bootstrap.ts`

```typescript
// Import
import { DrawManager, createDrawManager } from './visual/draw-manager'

// Initialize (after preview/codeModifier setup)
const drawManager = createDrawManager({
  container: previewContainer,
  codeModifier,
  sourceMap: () => state.get().sourceMap,
  gridSize: 8,
  enableSmartGuides: true,
})

// Wire up callbacks
drawManager.onDrawComplete = (result) => {
  if (result.success) {
    events.emit('compile:requested', {})
  }
}

// Add to studio instance
studio.drawManager = drawManager
```

### 2. ComponentPanel Integration

**File:** `studio/panels/components/component-panel.ts`

```typescript
// In renderItem(), add click handler:
itemEl.addEventListener('click', () => {
  // Check if draw mode preferred (future: user setting)
  const preferDraw = false // TODO: user preference

  if (preferDraw) {
    // Use draw mode
    const drawManager = getDrawManager() // From bootstrap
    drawManager.enterDrawMode(item)
  } else {
    // Use existing insert logic
    this.callbacks.onClick?.(item)
  }
}, { signal })
```

### 3. Event Subscriptions

**File:** `studio/app.js` or `studio/bootstrap.ts`

```typescript
// Subscribe to draw events
events.on('draw-mode:entered', ({ component }) => {
  console.log('[Studio] Entered draw mode:', component.name)
  // Optional: update UI state
})

events.on('drawing:completed', ({ result }) => {
  console.log('[Studio] Component created:', result.nodeId)
  // Optional: auto-select new element
})

events.on('drawing:error', ({ error }) => {
  console.error('[Studio] Draw error:', error.message)
})
```

---

## Extensibility Points

### Future Extensions

**1. Grid Layout Support**

Add grid snapping strategy:

```typescript
class GridSnapStrategy implements SnapStrategy {
  snap(rect: Rect, gridConfig: GridConfig): Rect {
    // Snap to grid cells
  }
}
```

**2. Template Drawing**

Pre-defined sizes for common components:

```typescript
const templates = {
  'mobile': { w: 375, h: 667 },
  'tablet': { w: 768, h: 1024 },
  'desktop': { w: 1440, h: 900 },
}

drawManager.enterDrawModeWithTemplate(component, templates.mobile)
```

**3. Constraint System**

Lock aspect ratio, min/max size:

```typescript
interface DrawConstraints {
  aspectRatio?: number        // 16/9, 4/3
  minSize?: { w: number, h: number }
  maxSize?: { w: number, h: number }
}
```

**4. Auto-Wrapper**

Draw in flex container → creates wrapper:

```typescript
if (containerType === 'flex') {
  // Create absolute wrapper first
  const wrapper = createWrapper(containerNodeId, rect)
  // Then add component inside wrapper
  addChild(wrapper.nodeId, component)
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('DrawManager', () => {
  describe('State Machine', () => {
    it('transitions from idle to ready on enterDrawMode()')
    it('transitions from ready to drawing on valid mousedown')
    it('returns to idle on ESC from any state')
    it('prevents invalid transitions')
  })

  describe('Coordinate Conversion', () => {
    it('converts screen coords to container coords')
    it('accounts for container offset')
    it('accounts for scale factor')
    it('handles RTL containers')
  })

  describe('Rectangle Calculation', () => {
    it('calculates rect from top-left to bottom-right')
    it('calculates rect from bottom-right to top-left')
    it('enforces minimum size')
    it('constrains to square with Shift modifier')
    it('draws from center with Alt modifier')
  })
})
```

### Integration Tests

```typescript
describe('Click-to-Draw Integration', () => {
  it('creates Box with x, y, w, h properties')
  it('snaps to 8px grid by default')
  it('aligns to sibling edges with smart guides')
  it('triggers compilation after creation')
  it('supports undo/redo via command pattern')
})
```

### E2E Tests (Playwright)

```typescript
test('User can draw Box in absolute container', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Click Box in component panel
  await page.click('.component-panel-item[data-id="box"]')

  // Draw rectangle in preview
  const preview = await page.locator('#preview')
  await preview.click({ position: { x: 100, y: 50 } })
  await page.mouse.down()
  await page.mouse.move(300, 200)
  await page.mouse.up()

  // Verify code generated
  const code = await page.locator('.cm-content').textContent()
  expect(code).toContain('Box x 100, y 50, w 200, h 150')
})
```

---

## Deployment Considerations

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  clickToDraw: true,              // Master toggle
  drawModeByDefault: false,       // vs drag-drop
  showContainerHints: true,       // Highlight valid containers
  enableGridSnap: true,
  enableSmartGuides: true,
}
```

### Backwards Compatibility

- ✅ No breaking changes to existing systems
- ✅ Drag-drop continues to work unchanged
- ✅ Can be disabled via feature flag
- ✅ No schema changes required

### Performance Impact

- ✅ Zero overhead when not in draw mode
- ✅ RAF-throttled during drawing (60 FPS max)
- ✅ No impact on compilation time
- ✅ No impact on preview rendering

---

## Security Considerations

### Input Validation

```typescript
// Validate container element
if (!element?.dataset?.mirrorId) {
  throw new DrawError('Invalid container: no mirror-id')
}

// Validate rect size
if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
  throw new DrawError('Element too small')
}

// Validate coordinates (within container)
if (rect.x < 0 || rect.y < 0) {
  // Clamp or reject
}
```

### XSS Prevention

- ✅ No `innerHTML` used (only `textContent` and style properties)
- ✅ Component names validated by ComponentPanel
- ✅ Coordinates are numbers (no string injection)

---

**Status:** ✅ Architecture Complete
**Last Updated:** 2026-03-16
