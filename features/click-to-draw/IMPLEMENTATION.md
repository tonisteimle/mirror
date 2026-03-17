# Click-to-Draw Implementation Plan

## Overview

Implementation is divided into **3 phases** with clear milestones. Each phase is independently testable and deployable.

---

## Phase 1: MVP (Core Drawing)

**Goal:** Basic click-to-draw functionality without snapping

**Duration:** ~2-3 days

### Tasks

#### 1.1 Create DrawManager Class

**File:** `studio/visual/draw-manager.ts`

```typescript
export class DrawManager {
  private mode: DrawMode = 'idle'
  private componentToDraw: ComponentItem | null = null
  private drawState: DrawState | null = null

  constructor(private config: DrawManagerConfig) {
    this.attachGlobalListeners()
  }

  enterDrawMode(component: ComponentItem): void
  cancel(): void
  private handleMouseDown(e: MouseEvent): void
  private handleMouseMove(e: MouseEvent): void
  private handleMouseUp(e: MouseEvent): void
  private handleKeyDown(e: KeyboardEvent): void
}
```

**Checklist:**
- [x] Create file `studio/visual/draw-manager.ts`
- [x] Implement state machine (idle → ready → drawing)
- [x] Add event listeners (mousedown, mousemove, mouseup, keydown)
- [x] Implement `enterDrawMode()` public API
- [x] Implement `cancel()` method
- [x] Add cleanup logic

#### 1.2 Create DrawRectRenderer

**File:** `studio/visual/draw-rect-renderer.ts`

```typescript
export class DrawRectRenderer {
  private rectElement: HTMLElement | null = null
  private dimensionLabel: HTMLElement | null = null

  render(rect: Rect, containerRect: DOMRect, scale: number): void
  hide(): void
  dispose(): void
}
```

**Checklist:**
- [x] Create file `studio/visual/draw-rect-renderer.ts`
- [x] Create overlay DOM structure
- [x] Implement `render()` method
- [x] Implement `hide()` method
- [x] Add dimension label
- [x] Style with CSS

#### 1.3 Container Validation

**File:** `studio/visual/draw-manager.ts`

```typescript
private isValidDrawTarget(element: HTMLElement): boolean {
  // Must have mirror-id
  if (!element.dataset.mirrorId) return false

  // Must be absolute container
  const layout = detectLayout(element)
  return layout.type === 'absolute'
}
```

**Checklist:**
- [x] Import `detectLayout` from layout-detection
- [x] Implement validation logic
- [x] Add error messages for invalid containers
- [x] Highlight valid containers on error (optional)

#### 1.4 Rectangle Calculation

**File:** `studio/visual/draw-manager.ts`

```typescript
private calculateRect(
  start: Point,
  current: Point,
  modifiers: Modifiers
): Rect {
  // Handle 4-corner drawing
  let x = Math.min(start.x, current.x)
  let y = Math.min(start.y, current.y)
  let width = Math.abs(current.x - start.x)
  let height = Math.abs(current.y - start.y)

  // Enforce minimum size
  width = Math.max(width, MIN_SIZE)
  height = Math.max(height, MIN_SIZE)

  return { x, y, width, height }
}
```

**Checklist:**
- [x] Implement 4-corner drawing support
- [x] Add minimum size enforcement (10×10)
- [x] Convert screen coords to container coords
- [x] Handle container scale

#### 1.5 Code Generation

**File:** `studio/visual/draw-manager.ts`

```typescript
private finishDrawing(): void {
  const { x, y, width, height } = this.drawState!.currentRect
  const nodeId = this.drawState!.containerNodeId
  const component = this.componentToDraw!

  const properties = `x ${x}, y ${y}, w ${width}, h ${height}`

  const result = this.codeModifier.addChild(nodeId, component.template, {
    properties,
    textContent: component.textContent,
    position: 'last'
  })

  if (result.success) {
    this.onDrawComplete?.({ success: true, nodeId: result.nodeId, properties: { x, y, w: width, h: height } })
  }
}
```

**Checklist:**
- [x] Build properties string
- [x] Call `CodeModifier.addChild()`
- [x] Handle success/error
- [x] Emit events
- [x] Trigger compilation

#### 1.6 Bootstrap Integration

**File:** `studio/bootstrap.ts`

```typescript
import { DrawManager, createDrawManager } from './visual/draw-manager'

// Initialize DrawManager
const drawManager = createDrawManager({
  container: config.previewContainer,
  codeModifier,
  sourceMap: () => state.get().sourceMap,
  gridSize: 0,  // Disabled in Phase 1
  enableSmartGuides: false,  // Disabled in Phase 1
})

drawManager.onDrawComplete = (result) => {
  if (result.success) {
    events.emit('compile:requested', {})
  }
}

studio.drawManager = drawManager
```

**Checklist:**
- [x] Import DrawManager
- [x] Initialize with config
- [x] Wire callbacks
- [x] Add to studio instance

#### 1.7 ComponentPanel Integration

**File:** `studio/panels/components/component-panel.ts`

```typescript
// In renderItem():
itemEl.addEventListener('click', () => {
  const drawManager = studio.drawManager  // From bootstrap
  if (drawManager) {
    drawManager.enterDrawMode(item)
  } else {
    this.callbacks.onClick?.(item)
  }
}, { signal })
```

**Checklist:**
- [x] Add click handler
- [x] Call `drawManager.enterDrawMode()`
- [x] Fallback to existing logic if no drawManager

#### 1.8 CSS Styling

**File:** `studio/styles.css`

```css
/* Draw overlay */
.draw-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

.draw-rect {
  position: absolute;
  border: 2px dashed var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
}

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

.draw-cursor-crosshair,
.draw-cursor-crosshair * {
  cursor: crosshair !important;
}
```

**Checklist:**
- [x] Add overlay styles
- [x] Add rectangle styles
- [x] Add label styles
- [x] Add cursor styles

### Testing Phase 1

```bash
# Unit tests
npm test studio/visual/draw-manager.test.ts

# Integration tests
npm test studio/__tests__/click-to-draw.test.ts

# Manual testing
npm run dev
# 1. Click Box in panel
# 2. Draw rectangle in absolute container
# 3. Verify Box created with x, y, w, h
```

### Acceptance Criteria Phase 1

- [x] User can click component to enter draw mode
- [x] Cursor changes to crosshair
- [x] User can draw rectangle in absolute container
- [x] Live rectangle preview shown
- [x] Dimension label shown
- [x] ESC cancels drawing
- [x] Component created with x, y, w, h properties
- [x] Code compilation triggered
- [x] Undo/redo works

---

## Phase 2: Snapping

**Goal:** Add grid snapping and smart guides

**Duration:** ~1-2 days

### Tasks

#### 2.1 Create SnapIntegration Class

**File:** `studio/visual/snap-integration.ts`

```typescript
export class SnapIntegration {
  constructor(
    private guideCalculator: GuideCalculator,
    private guideRenderer: GuideRenderer,
    private config: SnapConfig
  ) {}

  snap(rect: Rect, siblings: HTMLElement[], containerRect: DOMRect): SnapResult {
    // 1. Grid snap
    // 2. Smart guide snap
    // 3. Return snapped rect + guides
  }

  private applyGridSnap(rect: Rect): Rect
}
```

**Checklist:**
- [x] Create file `studio/visual/snap-integration.ts`
- [x] Implement grid snapping
- [x] Integrate GuideCalculator
- [x] Integrate GuideRenderer
- [x] Export `SnapResult` type

#### 2.2 Grid Snapping

```typescript
private applyGridSnap(rect: Rect): Rect {
  const { gridSize } = this.config
  if (gridSize === 0) return rect

  return {
    x: Math.round(rect.x / gridSize) * gridSize,
    y: Math.round(rect.y / gridSize) * gridSize,
    width: Math.round(rect.width / gridSize) * gridSize,
    height: Math.round(rect.height / gridSize) * gridSize,
  }
}
```

**Checklist:**
- [x] Snap x, y to grid
- [x] Snap width, height to grid
- [x] Configurable grid size (default: 8px)
- [x] Grid size 0 = disabled

#### 2.3 Smart Guide Integration

```typescript
snap(rect: Rect, siblings: HTMLElement[], containerRect: DOMRect): SnapResult {
  let snapped = this.applyGridSnap(rect)
  let guides: Guide[] = []

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
```

**Checklist:**
- [x] Import existing GuideCalculator
- [x] Call `calculate()` with rect + siblings
- [x] Extract snapped coordinates
- [x] Return guides for rendering

#### 2.4 Update DrawManager

```typescript
private updateDrawing(clientX: number, clientY: number): void {
  // ... calculate rect ...

  // Apply snapping
  const siblings = this.getSiblings()
  const snapResult = this.snapIntegration.snap(rect, siblings, containerRect)

  // Render snapped rect
  this.renderer.render(snapResult.rect, containerRect, scale)

  // Render guides
  this.guideRenderer.render(snapResult.guides)
}
```

**Checklist:**
- [x] Inject SnapIntegration
- [x] Call `snap()` in mousemove handler
- [x] Render guides via GuideRenderer
- [x] Hide guides on mouseup

#### 2.5 Enable in Bootstrap

**File:** `studio/bootstrap.ts`

```typescript
const drawManager = createDrawManager({
  container: config.previewContainer,
  codeModifier,
  sourceMap: () => state.get().sourceMap,
  gridSize: 8,                    // Enable grid snap
  enableSmartGuides: true,        // Enable alignment guides
  snapTolerance: 4,
})
```

**Checklist:**
- [x] Set gridSize to 8
- [x] Enable smart guides
- [x] Configure tolerance

### Testing Phase 2

```bash
# Unit tests
npm test studio/visual/snap-integration.test.ts

# Integration tests
npm test studio/__tests__/click-to-draw-snapping.test.ts

# Manual testing
# 1. Draw rectangle, verify 8px grid snap
# 2. Draw near sibling, verify alignment guides appear
# 3. Hold Cmd/Ctrl, verify snapping disabled
```

### Acceptance Criteria Phase 2

- [x] Grid snapping works (8px default)
- [x] Smart guides appear when aligned
- [x] Guides disappear after mouseup
- [x] Cmd/Ctrl disables snapping
- [x] Snap tolerance configurable

---

## Phase 3: Polish

**Goal:** Keyboard modifiers, position labels, error handling

**Duration:** ~1 day

### Tasks

#### 3.1 Keyboard Modifiers

**File:** `studio/visual/draw-manager.ts`

```typescript
private handleKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'Escape':
      this.cancel()
      break
    case 'Shift':
      this.modifiers.shift = true
      if (this.mode === 'drawing') this.updateDrawing()
      break
    case 'Alt':
      this.modifiers.alt = true
      if (this.mode === 'drawing') this.updateDrawing()
      break
    case 'Meta':
    case 'Control':
      this.modifiers.meta = true
      this.snapIntegration.updateConfig({ disableSnapping: true })
      if (this.mode === 'drawing') this.updateDrawing()
      break
  }
}

private handleKeyUp(e: KeyboardEvent): void {
  // Reset modifiers on keyup
}
```

**Checklist:**
- [x] Implement Shift (constrain to square)
- [x] Implement Alt (draw from center)
- [x] Implement Cmd/Ctrl (disable snapping)
- [x] Track modifier state
- [x] Update drawing on modifier change

#### 3.2 Constrain to Square (Shift)

```typescript
private calculateRect(start: Point, current: Point, modifiers: Modifiers): Rect {
  // ... basic calculation ...

  if (modifiers.shift) {
    const size = Math.max(width, height)
    width = size
    height = size
  }

  return { x, y, width, height }
}
```

**Checklist:**
- [x] Calculate max(width, height)
- [x] Set both to max
- [x] Update on modifier change

#### 3.3 Draw from Center (Alt)

```typescript
private calculateRect(start: Point, current: Point, modifiers: Modifiers): Rect {
  // ... basic + square ...

  if (modifiers.alt) {
    x = start.x - width / 2
    y = start.y - height / 2
  }

  return { x, y, width, height }
}
```

**Checklist:**
- [x] Offset x, y by half size
- [x] Keep center at start point

#### 3.4 Position Labels

**File:** `studio/visual/draw-rect-renderer.ts`

```typescript
render(rect: Rect, containerRect: DOMRect, scale: number): void {
  this.updateRectangle(rect, scale)
  this.updateDimensionLabel(rect)
  this.updatePositionLabel(rect)  // New
}

private updatePositionLabel(rect: Rect): void {
  if (!this.positionLabel) {
    this.positionLabel = document.createElement('div')
    this.positionLabel.className = 'draw-rect-label draw-rect-label-position'
    this.rectElement!.appendChild(this.positionLabel)
  }

  this.positionLabel.textContent = `x: ${Math.round(rect.x)}, y: ${Math.round(rect.y)}`
}
```

**Checklist:**
- [x] Create position label element
- [x] Update with x, y coordinates
- [x] Position above rectangle
- [x] Style with mono font

#### 3.5 Error Handling

```typescript
private showInvalidContainerError(): void {
  // Show toast notification
  showNotification('Can only draw in absolute containers (stacked layout)', 'warning')

  // Briefly highlight valid containers
  this.highlightValidContainers(1000)  // 1 second
}

private highlightValidContainers(duration: number): void {
  const containers = document.querySelectorAll('[data-mirror-id]')

  containers.forEach(container => {
    const layout = detectLayout(container as HTMLElement)
    if (layout.type === 'absolute') {
      container.classList.add('draw-valid-target')
    }
  })

  setTimeout(() => {
    containers.forEach(c => c.classList.remove('draw-valid-target'))
  }, duration)
}
```

**Checklist:**
- [x] Add error toast for invalid container
- [x] Highlight valid containers
- [x] Add CSS for highlight
- [x] Handle "too small" error
- [x] Handle code modification errors

#### 3.6 Container Highlighting (Ready Mode)

```typescript
private transitionTo(newMode: DrawMode): void {
  // ... existing logic ...

  if (newMode === 'ready') {
    this.showContainerHints()
  } else {
    this.hideContainerHints()
  }
}

private showContainerHints(): void {
  const containers = document.querySelectorAll('[data-mirror-id]')
  containers.forEach(container => {
    const layout = detectLayout(container as HTMLElement)
    if (layout.type === 'absolute') {
      container.classList.add('draw-container-hint')
    }
  })
}
```

**Checklist:**
- [x] Add subtle outline to valid containers
- [x] Only show in ready mode
- [x] Hide when entering drawing/idle
- [x] Add CSS for hint

### Testing Phase 3

```bash
# Unit tests
npm test studio/visual/draw-manager.test.ts

# Manual testing
# 1. Shift - verify square constraint
# 2. Alt - verify center drawing
# 3. Cmd - verify snapping disabled
# 4. ESC - verify cancel from all states
# 5. Invalid container - verify error message
# 6. Ready mode - verify container hints
```

### Acceptance Criteria Phase 3

- [x] Shift constrains to square
- [x] Alt draws from center
- [x] Cmd/Ctrl disables snapping
- [x] ESC cancels from any state
- [x] Position labels show x, y
- [x] Error messages helpful
- [x] Container hints show in ready mode
- [x] All keyboard combos work together

---

## Rollout Strategy

### Soft Launch (Internal Testing)

**Phase 1 Complete:**
- Deploy to staging
- Internal team testing
- Collect feedback
- Fix critical bugs

**Phase 2 Complete:**
- Deploy to production with feature flag OFF
- Enable for beta users only
- Monitor performance
- Collect feedback

**Phase 3 Complete:**
- Enable for all users
- Monitor adoption metrics
- Write user documentation
- Create video tutorial

---

## Rollback Plan

If critical issues found:

1. **Disable via Feature Flag**
   ```typescript
   const FEATURE_FLAGS = {
     clickToDraw: false,  // Disable immediately
   }
   ```

2. **Revert Code**
   ```bash
   git revert <commit-hash>
   git push
   ./deploy.sh
   ```

3. **No Data Loss**
   - Feature doesn't modify data structures
   - Safe to disable without migration

---

## Documentation Tasks

### User Documentation

- [x] README.md - Feature overview
- [x] REQUIREMENTS.md - User stories
- [ ] VIDEO.md - Screen recording tutorial
- [ ] FAQ.md - Common questions

### Developer Documentation

- [x] SPECIFICATION.md - Technical spec
- [x] ARCHITECTURE.md - System design
- [x] IMPLEMENTATION.md - This file
- [x] TESTING.md - Test strategy
- [ ] API.md - Public API reference

### Code Documentation

```typescript
/**
 * DrawManager - Click-to-draw interaction system
 *
 * Allows users to create positioned components in absolute containers
 * by clicking a component and dragging to define size and position.
 *
 * @example
 * ```typescript
 * const drawManager = createDrawManager({
 *   container: previewElement,
 *   codeModifier,
 *   sourceMap: () => state.sourceMap,
 * })
 *
 * drawManager.enterDrawMode({ template: 'Box', name: 'Box' })
 * ```
 */
export class DrawManager { ... }
```

---

## Dependencies

### Required Before Start

- ✅ CodeModifier with `addChild()` API
- ✅ LayoutDetection with absolute container support
- ✅ SmartGuides system (GuideCalculator, GuideRenderer)
- ✅ SourceMap with node ID mapping

### Can Implement in Parallel

- ⚠️ User preferences (draw mode vs drag-drop default)
- ⚠️ Settings UI for grid size, snap tolerance
- ⚠️ Undo/redo integration (should work automatically)

---

## Risk Mitigation

### Risk 1: Performance Issues

**Mitigation:**
- RAF throttling for mousemove
- DOM element reuse
- Cache container rect
- Profile with large containers (100+ children)

### Risk 2: Browser Compatibility

**Mitigation:**
- Test in Chrome, Firefox, Safari, Edge
- Use standard DOM APIs only
- No experimental features
- Provide fallback cursor if crosshair unsupported

### Risk 3: User Confusion (Draw vs Drag)

**Mitigation:**
- Clear visual feedback (crosshair cursor)
- Toast notifications for errors
- Highlight valid containers
- User preference to choose default

### Risk 4: Integration Bugs

**Mitigation:**
- Comprehensive unit tests
- Integration tests with CodeModifier
- E2E tests with Playwright
- Staged rollout with feature flag

---

## Success Metrics

**Adoption:**
- % of components created via draw (target: >20%)
- Average time to create positioned element (target: <5s)

**Quality:**
- Error rate (target: <5%)
- Bug reports (target: <10 in first week)

**Performance:**
- Frame rate during drawing (target: 60 FPS)
- Code modification success rate (target: >99%)

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1 (MVP) | 2-3 days | Day 1 | Day 3 |
| Phase 2 (Snapping) | 1-2 days | Day 4 | Day 5 |
| Phase 3 (Polish) | 1 day | Day 6 | Day 6 |
| **Total** | **4-6 days** | - | - |

**Milestones:**
- Day 3: MVP deployed to staging
- Day 5: Snapping enabled for beta users
- Day 6: Full rollout to production

---

**Status:** 🔵 Ready to Implement
**Last Updated:** 2026-03-16
**Next Step:** Begin Phase 1 - Create DrawManager class
