# Click-to-Draw Requirements

## Functional Requirements

### FR-1: Component Selection
**As a user, I want to click a component in the panel to enter draw mode**

- **Given** I'm viewing the component panel
- **When** I click on any primitive component (Box, Button, Input, etc.)
- **Then** The cursor changes to a crosshair ✛
- **And** Valid absolute containers are highlighted (optional visual hint)
- **And** I enter "ready to draw" mode

**Acceptance Criteria:**
- ✅ Click handler attached to all component items
- ✅ Cursor changes globally (not just over preview)
- ✅ Mode indicator shown (status bar or tooltip)
- ✅ ESC cancels and returns to idle mode

---

### FR-2: Container Validation
**As a user, I want to draw only in absolute containers**

- **Given** I'm in draw mode
- **When** I click in a non-absolute container
- **Then** I see an error message: "Can only draw in absolute containers"
- **And** Valid containers are briefly highlighted
- **And** Draw mode remains active (not cancelled)

**Container Types:**
- ✅ Absolute: `abs`, `stacked`, `absolute` layout property
- ❌ Flex: `hor`, `ver`, `horizontal`, `vertical`
- ❌ Block: Default containers without layout

**Acceptance Criteria:**
- ✅ Detects container layout type via `detectLayout()`
- ✅ Shows helpful error with guidance
- ✅ Highlights valid targets for 1 second
- ✅ Prevents drawing in invalid containers

---

### FR-3: Rectangle Drawing
**As a user, I want to draw a rectangle by clicking and dragging**

- **Given** I'm in draw mode in a valid absolute container
- **When** I press mouse button (mousedown)
- **Then** Drawing starts at that point
- **And** A live rectangle appears following my cursor
- **When** I move the mouse (mousemove)
- **Then** The rectangle updates in real-time
- **When** I release mouse button (mouseup)
- **Then** The component is created with x, y, w, h properties

**Edge Cases:**
- Minimum size: 10×10px (prevent 0-size elements)
- Negative drawing: Allow drawing from any corner
- Container boundaries: Clamp to container edges (optional)

**Acceptance Criteria:**
- ✅ Smooth live preview (RAF-throttled)
- ✅ Handles all 4 corner directions
- ✅ Enforces minimum size
- ✅ Updates dimension labels in real-time

---

### FR-4: Visual Feedback
**As a user, I want clear visual feedback while drawing**

**During "Ready" Mode:**
- Crosshair cursor
- Container highlight (subtle outline)

**During Drawing:**
- Live rectangle with dashed border
- Dimension label: "200 × 150"
- Position label: "x: 100, y: 50"
- Smart guides (alignment lines to siblings)

**Acceptance Criteria:**
- ✅ Rectangle styled with semi-transparent fill
- ✅ Labels positioned next to cursor (not obscured)
- ✅ Labels update on every mousemove
- ✅ Guides show when aligned (tolerance: 2px)

---

### FR-5: Snapping System
**As a user, I want automatic snapping for precise positioning**

**Grid Snapping:**
- Default grid: 8px
- Configurable via settings
- Applies to x, y, width, height

**Smart Guide Snapping:**
- Snap to sibling edges (left, right, top, bottom)
- Snap to sibling centers (centerX, centerY)
- Snap tolerance: 4px
- Visual feedback: Colored guide lines

**Snap Priority:**
1. Grid snap (if enabled)
2. Edge alignment
3. Center alignment

**Acceptance Criteria:**
- ✅ Grid snap configurable (0 = disabled)
- ✅ Smart guides use existing `GuideCalculator`
- ✅ Guides rendered via `GuideRenderer`
- ✅ Can disable snapping with Cmd/Ctrl key

---

### FR-6: Keyboard Modifiers
**As a user, I want keyboard shortcuts for drawing control**

| Key | Behavior | Visual Indicator |
|-----|----------|------------------|
| **ESC** | Cancel draw mode (any state) | Return to normal cursor |
| **Shift** | Constrain to square (1:1 ratio) | Lock icon or tooltip |
| **Alt/Option** | Draw from center point | Center crosshair |
| **Cmd/Ctrl** | Disable all snapping | "No snap" tooltip |

**Acceptance Criteria:**
- ✅ Works in both "ready" and "drawing" states
- ✅ Multiple modifiers combine (Shift + Alt = square from center)
- ✅ Modifier state shown in UI
- ✅ ESC cleans up all visual indicators

---

### FR-7: Code Generation
**As a user, I expect the component to be created with correct properties**

**Generated Code:**
```mirror
# Before
Container abs
  # empty

# After drawing Box at (50, 30) with size (200, 150)
Container abs
  Box x 50, y 30, w 200, h 150
```

**Property Handling:**
- Position: `x {value}, y {value}` (rounded to integers)
- Size: `w {value}, h {value}` (rounded to integers)
- Component defaults: Applied from primitives.ts
- User properties: Template properties from ComponentItem
- Text content: Added if component has textContent

**Acceptance Criteria:**
- ✅ Uses `CodeModifier.addChild()` (same as drag-drop)
- ✅ Properties formatted correctly (commas, spaces)
- ✅ Compilation triggered after insert
- ✅ Undo/redo works (via command pattern)

---

### FR-8: Error Handling
**As a user, I want clear feedback when something goes wrong**

**Error Scenarios:**

1. **Invalid Container**
   - Message: "Can only draw in absolute containers (stacked layout)"
   - Action: Highlight valid containers, stay in draw mode

2. **No Container Found**
   - Message: "No container found at this position"
   - Action: Stay in draw mode

3. **Source Map Stale**
   - Message: "Code has changed, please recompile"
   - Action: Exit draw mode, suggest recompile

4. **Code Modification Failed**
   - Message: "Failed to create component: {error}"
   - Action: Exit draw mode, show error details

5. **Element Too Small**
   - Message: "Element too small (minimum 10×10)"
   - Action: Don't create component, stay in draw mode

**Acceptance Criteria:**
- ✅ All errors logged to console
- ✅ User-friendly toast notifications
- ✅ No silent failures
- ✅ Draw mode state cleaned up on errors

---

## Non-Functional Requirements

### NFR-1: Performance
- Live rectangle updates at 60 FPS (RAF-throttled)
- Snapping calculations < 16ms (per frame)
- No UI freeze during drawing
- Handles containers with 100+ children

### NFR-2: Accessibility
- Keyboard-only workflow (Tab to component, Enter to activate)
- Screen reader announces mode changes
- Visual indicators have ARIA labels
- High contrast cursor for visibility

### NFR-3: Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Handles touch devices (optional, future)
- Scales with browser zoom level
- RTL layout support

### NFR-4: Integration
- Zero impact on existing drag-drop system
- Reuses existing snapping infrastructure
- Follows studio architecture patterns
- Event-driven communication (no tight coupling)

---

## User Stories

### Story 1: Quick Prototyping
**As a UI designer,**
I want to rapidly create positioned elements,
So that I can prototype layouts without precise measurements.

**Scenario:**
1. User clicks "Box" in panel
2. User draws rough rectangle in container
3. Box created with snapped position
4. User repeats for multiple elements

### Story 2: Pixel-Perfect Layout
**As a developer,**
I want to create elements with exact dimensions,
So that I can match design specifications.

**Scenario:**
1. User enables 8px grid snap
2. User clicks "Button" in panel
3. User draws 200×40 button (snaps to grid)
4. Button created at x=80, y=120, w=200, h=40

### Story 3: Alignment-Based Design
**As a designer,**
I want elements to align with siblings automatically,
So that I can create consistent layouts.

**Scenario:**
1. Container has Box at x=100
2. User clicks "Box" to draw another
3. User draws near x=100
4. Smart guide appears, snaps to x=100
5. New box perfectly aligned

### Story 4: Error Recovery
**As a user,**
I want to cancel drawing if I make a mistake,
So that I don't create unwanted elements.

**Scenario:**
1. User clicks "Box" and starts drawing
2. User realizes wrong position
3. User presses ESC
4. Draw mode cancelled, no element created
5. User can try again

---

## Out of Scope (Future Enhancements)

🔮 **V2 Features:**
- Multi-element drawing (Shift+Click to draw multiple)
- Template drawing (preset sizes, e.g., "Mobile screen")
- Copy drawing (draw based on selected element's size)
- Auto-wrapper (draw in flex container → creates wrapper)
- Touch device support
- Drawing constraints (aspect ratio lock, max/min size)
- Drawing guides (rulers, measurement lines)
- History of recent dimensions (quick re-use)

---

## Constraints & Limitations

⚠️ **Known Limitations:**

1. **Absolute Containers Only** - Won't work in flex/block layouts
2. **Single Element** - Can't draw multiple at once (V1)
3. **No Nesting** - Can't draw container + children in one action
4. **Integer Coordinates** - Fractional pixels rounded
5. **Desktop Only** - Touch devices not supported initially

---

## Success Metrics

**Adoption Metrics:**
- % of components created via draw (vs drag-drop)
- Average time to create positioned element
- Error rate (invalid container clicks)
- ESC cancellation rate (user mistakes)

**Quality Metrics:**
- Snapping accuracy (% of elements aligned)
- User satisfaction (survey after 1 week)
- Bug reports related to draw mode

**Technical Metrics:**
- Frame rate during drawing (target: 60 FPS)
- Code modification success rate (target: >99%)
- Undo/redo reliability

---

## Dependencies

**Required for MVP:**
- ✅ `DragDropManager` - Code modification paths
- ✅ `CodeModifier` - Insert child API
- ✅ `LayoutDetection` - Container validation
- ✅ `SourceMap` - Node ID mapping

**Required for Snapping:**
- ✅ `SmartGuides` - Alignment calculation
- ✅ `GuideRenderer` - Visual feedback
- ✅ `AbsoluteDropStrategy` - Grid snap logic

**Required for Polish:**
- ✅ `DropIndicator` - Position labels
- ✅ `OverlayManager` - Cursor management
- ✅ `NotificationSystem` - Error toasts

---

## Acceptance Criteria Summary

**Must Have (MVP):**
- [x] Click component to enter draw mode
- [x] Validate absolute containers only
- [x] Draw rectangle with live preview
- [x] Generate code with x, y, w, h
- [x] ESC to cancel
- [x] Dimension labels during draw
- [x] Minimum size enforcement (10×10)

**Should Have (Phase 2):**
- [x] Grid snapping (8px default)
- [x] Smart guide snapping
- [x] Alignment guides visual feedback
- [x] Keyboard modifiers (Shift, Alt, Cmd)
- [x] Error messages & guidance

**Could Have (Phase 3):**
- [x] Container highlighting in ready mode
- [x] Position labels (x, y coordinates)
- [x] Snap tolerance configuration
- [x] Draw from center (Alt)
- [x] Constrain to square (Shift)

---

**Status:** ✅ Requirements Complete
**Last Updated:** 2026-03-16
