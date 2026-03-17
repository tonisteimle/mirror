# Click-to-Draw Testing Strategy

## Test Pyramid

```
        ┌─────────────────────┐
        │   E2E Tests (5%)    │  Full user workflows in browser
        │   Playwright        │
        ├─────────────────────┤
        │ Integration (25%)   │  Component interactions
        │   Vitest            │
        ├─────────────────────┤
        │  Unit Tests (70%)   │  Individual functions, state machine
        │   Vitest            │
        └─────────────────────┘
```

---

## Unit Tests

### DrawManager State Machine

**File:** `studio/visual/__tests__/draw-manager.test.ts`

```typescript
describe('DrawManager State Machine', () => {
  let drawManager: DrawManager

  beforeEach(() => {
    drawManager = createDrawManager({
      container: document.createElement('div'),
      codeModifier: mockCodeModifier(),
      sourceMap: () => mockSourceMap(),
    })
  })

  describe('State Transitions', () => {
    it('starts in idle state', () => {
      expect(drawManager.getMode()).toBe('idle')
    })

    it('transitions to ready on enterDrawMode', () => {
      drawManager.enterDrawMode(mockComponent('Box'))
      expect(drawManager.getMode()).toBe('ready')
    })

    it('transitions to drawing on valid mousedown', () => {
      drawManager.enterDrawMode(mockComponent('Box'))

      const container = createAbsoluteContainer()
      const event = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 50,
        target: container
      })

      drawManager.handleMouseDown(event)
      expect(drawManager.getMode()).toBe('drawing')
    })

    it('returns to idle on ESC from ready state', () => {
      drawManager.enterDrawMode(mockComponent('Box'))
      drawManager.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(drawManager.getMode()).toBe('idle')
    })

    it('returns to idle on ESC from drawing state', () => {
      drawManager.enterDrawMode(mockComponent('Box'))
      // ... start drawing ...
      drawManager.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(drawManager.getMode()).toBe('idle')
    })

    it('prevents invalid transition from idle to drawing', () => {
      expect(drawManager.getMode()).toBe('idle')
      // Should not be possible to go directly to drawing
      // (requires ready state first)
    })
  })

  describe('Cursor Management', () => {
    it('changes cursor to crosshair in ready mode', () => {
      drawManager.enterDrawMode(mockComponent('Box'))
      expect(document.body.classList.contains('draw-cursor-crosshair')).toBe(true)
    })

    it('restores cursor on cancel', () => {
      drawManager.enterDrawMode(mockComponent('Box'))
      drawManager.cancel()
      expect(document.body.classList.contains('draw-cursor-crosshair')).toBe(false)
    })
  })
})
```

### Rectangle Calculation

```typescript
describe('Rectangle Calculation', () => {
  describe('Basic Drawing', () => {
    it('calculates rect from top-left to bottom-right', () => {
      const rect = calculateRect(
        { x: 100, y: 50 },
        { x: 300, y: 200 },
        { shift: false, alt: false, meta: false }
      )

      expect(rect).toEqual({
        x: 100,
        y: 50,
        width: 200,
        height: 150
      })
    })

    it('calculates rect from bottom-right to top-left (negative drawing)', () => {
      const rect = calculateRect(
        { x: 300, y: 200 },
        { x: 100, y: 50 },
        { shift: false, alt: false, meta: false }
      )

      expect(rect).toEqual({
        x: 100,
        y: 50,
        width: 200,
        height: 150
      })
    })

    it('calculates rect from top-right to bottom-left', () => {
      const rect = calculateRect(
        { x: 300, y: 50 },
        { x: 100, y: 200 },
        { shift: false, alt: false, meta: false }
      )

      expect(rect).toEqual({
        x: 100,
        y: 50,
        width: 200,
        height: 150
      })
    })

    it('enforces minimum size of 10×10', () => {
      const rect = calculateRect(
        { x: 100, y: 50 },
        { x: 102, y: 52 },  // Only 2×2
        { shift: false, alt: false, meta: false }
      )

      expect(rect.width).toBeGreaterThanOrEqual(10)
      expect(rect.height).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Shift Modifier (Square)', () => {
    it('constrains to square aspect ratio', () => {
      const rect = calculateRect(
        { x: 100, y: 50 },
        { x: 300, y: 150 },  // 200×100
        { shift: true, alt: false, meta: false }
      )

      expect(rect.width).toBe(rect.height)
      expect(rect.width).toBe(200)  // Max of 200×100
    })
  })

  describe('Alt Modifier (Center)', () => {
    it('draws from center point', () => {
      const rect = calculateRect(
        { x: 200, y: 100 },  // Center
        { x: 300, y: 200 },  // 100 pixels away = 200×200 rect
        { shift: false, alt: true, meta: false }
      )

      expect(rect.x).toBe(100)  // 200 - 100
      expect(rect.y).toBe(0)    // 100 - 100
      expect(rect.width).toBe(200)
      expect(rect.height).toBe(200)
    })
  })

  describe('Combined Modifiers', () => {
    it('Shift + Alt creates square from center', () => {
      const rect = calculateRect(
        { x: 200, y: 100 },
        { x: 300, y: 150 },  // 100×50
        { shift: true, alt: true, meta: false }
      )

      expect(rect.width).toBe(rect.height)
      expect(rect.x).toBe(200 - rect.width / 2)
      expect(rect.y).toBe(100 - rect.height / 2)
    })
  })
})
```

### Coordinate Conversion

```typescript
describe('Coordinate Conversion', () => {
  it('converts screen coords to container coords', () => {
    const containerRect = new DOMRect(50, 30, 800, 600)
    const scale = 1.0

    const result = screenToContainerCoords(150, 80, containerRect, scale)

    expect(result).toEqual({ x: 100, y: 50 })
  })

  it('accounts for container offset', () => {
    const containerRect = new DOMRect(100, 50, 800, 600)
    const scale = 1.0

    const result = screenToContainerCoords(250, 150, containerRect, scale)

    expect(result).toEqual({ x: 150, y: 100 })
  })

  it('accounts for scale factor', () => {
    const containerRect = new DOMRect(0, 0, 800, 600)
    const scale = 2.0  // 200% zoom

    const result = screenToContainerCoords(200, 100, containerRect, scale)

    expect(result).toEqual({ x: 100, y: 50 })
  })

  it('handles RTL containers', () => {
    const containerRect = new DOMRect(0, 0, 800, 600)
    const scale = 1.0
    const isRTL = true

    const result = screenToContainerCoords(200, 100, containerRect, scale, isRTL)

    expect(result.x).toBe(600)  // 800 - 200
    expect(result.y).toBe(100)
  })
})
```

### Container Validation

```typescript
describe('Container Validation', () => {
  it('accepts absolute containers', () => {
    const container = createDiv()
    container.dataset.mirrorId = 'node-1'
    container.dataset.mirrorAbsolute = 'true'
    container.style.position = 'relative'

    expect(isValidDrawTarget(container)).toBe(true)
  })

  it('rejects flex containers', () => {
    const container = createDiv()
    container.dataset.mirrorId = 'node-1'
    container.style.display = 'flex'

    expect(isValidDrawTarget(container)).toBe(false)
  })

  it('rejects elements without mirror-id', () => {
    const container = createDiv()
    container.style.position = 'relative'

    expect(isValidDrawTarget(container)).toBe(false)
  })

  it('rejects block containers', () => {
    const container = createDiv()
    container.dataset.mirrorId = 'node-1'
    // Default display: block

    expect(isValidDrawTarget(container)).toBe(false)
  })
})
```

---

## Integration Tests

### DrawManager + CodeModifier

**File:** `studio/visual/__tests__/draw-integration.test.ts`

```typescript
describe('DrawManager Integration', () => {
  let drawManager: DrawManager
  let codeModifier: CodeModifier
  let sourceMap: SourceMap

  beforeEach(() => {
    const source = `
App abs
  Container x 50, y 30, w 400, h 300, abs
    # Draw here
`
    const { ir, sourceMap: sm } = compile(source)
    sourceMap = sm
    codeModifier = new CodeModifier(source, sourceMap)

    drawManager = createDrawManager({
      container: document.createElement('div'),
      codeModifier,
      sourceMap: () => sourceMap,
    })
  })

  it('creates Box with x, y, w, h properties', async () => {
    const container = createContainerElement('node-2')

    // Enter draw mode
    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })

    // Simulate drawing
    await simulateDraw(drawManager, container, {
      start: { x: 100, y: 50 },
      end: { x: 300, y: 200 }
    })

    // Verify code generated
    const newSource = codeModifier.getSource()
    expect(newSource).toContain('Box x 100, y 50, w 200, h 150')
  })

  it('includes component properties', async () => {
    const container = createContainerElement('node-2')

    drawManager.enterDrawMode({
      template: 'Button',
      name: 'Button',
      properties: 'bg #3b82f6',
      textContent: 'Click me'
    })

    await simulateDraw(drawManager, container, {
      start: { x: 50, y: 30 },
      end: { x: 150, y: 70 }
    })

    const newSource = codeModifier.getSource()
    expect(newSource).toContain('Button x 50, y 30, w 100, h 40, bg #3b82f6')
    expect(newSource).toContain('"Click me"')
  })

  it('triggers compilation after creation', async () => {
    const compileSpy = vi.fn()
    events.on('compile:requested', compileSpy)

    const container = createContainerElement('node-2')

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })
    await simulateDraw(drawManager, container, {
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 }
    })

    expect(compileSpy).toHaveBeenCalled()
  })
})
```

### DrawManager + SnapIntegration

```typescript
describe('Snapping Integration', () => {
  let drawManager: DrawManager

  beforeEach(() => {
    drawManager = createDrawManager({
      container: document.createElement('div'),
      codeModifier: mockCodeModifier(),
      sourceMap: () => mockSourceMap(),
      gridSize: 8,
      enableSmartGuides: true,
    })
  })

  it('snaps to 8px grid', async () => {
    const container = createContainerElement('node-1')

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })

    await simulateDraw(drawManager, container, {
      start: { x: 103, y: 57 },  // Near grid
      end: { x: 297, y: 203 }
    })

    const newSource = codeModifier.getSource()
    expect(newSource).toContain('Box x 104, y 56, w 192, h 144')
    // All values are multiples of 8
  })

  it('aligns to sibling edges', async () => {
    const container = createContainerElement('node-1')

    // Add sibling at x=100
    const sibling = createDiv()
    sibling.style.left = '100px'
    sibling.style.top = '50px'
    sibling.style.width = '200px'
    sibling.style.height = '100px'
    container.appendChild(sibling)

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })

    await simulateDraw(drawManager, container, {
      start: { x: 98, y: 200 },  // Near x=100
      end: { x: 298, y: 300 }
    })

    const newSource = codeModifier.getSource()
    expect(newSource).toContain('Box x 100')  // Snapped to sibling edge
  })

  it('disables snapping with Cmd modifier', async () => {
    const container = createContainerElement('node-1')

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })

    await simulateDraw(drawManager, container, {
      start: { x: 103, y: 57 },
      end: { x: 297, y: 203 },
      modifiers: { meta: true }  // Cmd held
    })

    const newSource = codeModifier.getSource()
    expect(newSource).toContain('Box x 103, y 57')  // No grid snap
  })
})
```

---

## E2E Tests (Playwright)

**File:** `src/__tests__/playwright/click-to-draw-e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Click-to-Draw E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForSelector('.component-panel')
  })

  test('User can draw Box in absolute container', async ({ page }) => {
    // Click Box in component panel
    await page.click('.component-panel-item[data-id="box"]')

    // Verify cursor changed
    const body = await page.locator('body')
    await expect(body).toHaveClass(/draw-cursor-crosshair/)

    // Find absolute container in preview
    const preview = page.locator('#preview')
    const container = preview.locator('[data-mirror-absolute="true"]').first()

    // Get container position
    const box = await container.boundingBox()
    if (!box) throw new Error('Container not found')

    // Draw rectangle
    await page.mouse.move(box.x + 100, box.y + 50)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 200, { steps: 10 })
    await page.mouse.up()

    // Verify code generated
    const code = await page.locator('.cm-content').textContent()
    expect(code).toContain('Box')
    expect(code).toMatch(/x \d+, y \d+, w \d+, h \d+/)
  })

  test('ESC cancels drawing', async ({ page }) => {
    await page.click('.component-panel-item[data-id="box"]')

    // Start drawing
    const preview = page.locator('#preview')
    await preview.click({ position: { x: 100, y: 50 } })
    await page.mouse.down()

    // Press ESC
    await page.keyboard.press('Escape')

    // Verify no component created
    const code = await page.locator('.cm-content').textContent()
    const boxCount = (code.match(/Box/g) || []).length
    expect(boxCount).toBe(0)

    // Verify cursor restored
    const body = await page.locator('body')
    await expect(body).not.toHaveClass(/draw-cursor-crosshair/)
  })

  test('Shift constrains to square', async ({ page }) => {
    await page.click('.component-panel-item[data-id="box"]')

    const preview = page.locator('#preview')
    const container = preview.locator('[data-mirror-absolute="true"]').first()
    const box = await container.boundingBox()
    if (!box) throw new Error('Container not found')

    // Draw with Shift held
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 50)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 150, { steps: 5 })  // 200×100
    await page.mouse.up()
    await page.keyboard.up('Shift')

    // Verify square created (should be 200×200, not 200×100)
    const code = await page.locator('.cm-content').textContent()
    expect(code).toMatch(/w 200, h 200/)
  })

  test('Grid snapping works', async ({ page }) => {
    await page.click('.component-panel-item[data-id="box"]')

    const preview = page.locator('#preview')
    const container = preview.locator('[data-mirror-absolute="true"]').first()
    const box = await container.boundingBox()
    if (!box) throw new Error('Container not found')

    // Draw near grid boundaries (8px grid)
    await page.mouse.move(box.x + 103, box.y + 57)  // Near 104, 56
    await page.mouse.down()
    await page.mouse.move(box.x + 297, box.y + 203)  // Near 296, 200
    await page.mouse.up()

    // Verify snapped to grid
    const code = await page.locator('.cm-content').textContent()
    const match = code.match(/x (\d+), y (\d+), w (\d+), h (\d+)/)
    if (!match) throw new Error('No box found in code')

    const [, x, y, w, h] = match.map(Number)
    expect(x % 8).toBe(0)
    expect(y % 8).toBe(0)
    expect(w % 8).toBe(0)
    expect(h % 8).toBe(0)
  })

  test('Error shown for invalid container', async ({ page }) => {
    await page.click('.component-panel-item[data-id="box"]')

    // Click in non-absolute container (flex or block)
    const flexContainer = page.locator('[data-mirror-id]').first()
    await flexContainer.click()

    // Verify error notification
    const notification = page.locator('.notification, .toast')
    await expect(notification).toContainText(/absolute container/i)

    // Verify still in draw mode
    const body = await page.locator('body')
    await expect(body).toHaveClass(/draw-cursor-crosshair/)
  })
})
```

---

## Visual Regression Tests

**Tool:** Percy or Playwright screenshots

```typescript
test('Visual: Draw mode cursor', async ({ page }) => {
  await page.click('.component-panel-item[data-id="box"]')
  await expect(page).toHaveScreenshot('draw-mode-crosshair.png')
})

test('Visual: Live rectangle while drawing', async ({ page }) => {
  await page.click('.component-panel-item[data-id="box"]')

  const container = page.locator('[data-mirror-absolute="true"]').first()
  const box = await container.boundingBox()

  await page.mouse.move(box!.x + 100, box!.y + 50)
  await page.mouse.down()
  await page.mouse.move(box!.x + 300, box!.y + 200)

  await expect(page).toHaveScreenshot('draw-live-rectangle.png')
})

test('Visual: Smart guides alignment', async ({ page }) => {
  // Setup: Create sibling element first
  // Then draw near it to trigger guides

  await expect(page).toHaveScreenshot('draw-smart-guides.png')
})
```

---

## Performance Tests

```typescript
describe('Performance', () => {
  it('maintains 60 FPS during drawing', async () => {
    const frameTimes: number[] = []

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })

    // Simulate 100 mousemove events
    for (let i = 0; i < 100; i++) {
      const start = performance.now()

      await simulateMouseMove(drawManager, {
        x: 100 + i * 2,
        y: 50 + i
      })

      const end = performance.now()
      frameTimes.push(end - start)
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length
    const fps = 1000 / avgFrameTime

    expect(fps).toBeGreaterThan(60)
  })

  it('handles large containers (100+ children)', async () => {
    const container = createContainerElement('node-1')

    // Add 100 sibling elements
    for (let i = 0; i < 100; i++) {
      const sibling = createDiv()
      sibling.style.left = `${i * 10}px`
      sibling.style.top = `${i * 10}px`
      container.appendChild(sibling)
    }

    const start = performance.now()

    drawManager.enterDrawMode({ template: 'Box', name: 'Box' })
    await simulateDraw(drawManager, container, {
      start: { x: 500, y: 500 },
      end: { x: 700, y: 700 }
    })

    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(100)  // < 100ms total
  })
})
```

---

## Accessibility Tests

```typescript
describe('Accessibility', () => {
  it('announces mode changes to screen readers', async () => {
    const announcer = page.locator('[aria-live="polite"]')

    await page.click('.component-panel-item[data-id="box"]')

    await expect(announcer).toContainText(/draw mode/i)
  })

  it('supports keyboard-only workflow', async ({ page }) => {
    // Tab to component panel
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Enter on component
    await page.keyboard.press('Enter')

    // Verify draw mode entered
    const body = await page.locator('body')
    await expect(body).toHaveClass(/draw-cursor-crosshair/)
  })

  it('has sufficient color contrast for guides', async () => {
    // Test guide line colors against background
    // Minimum 3:1 ratio for graphics
  })
})
```

---

## Test Data & Fixtures

### Mock Components

```typescript
export function mockComponent(template: string): ComponentItem {
  return {
    id: `component-${template.toLowerCase()}`,
    name: template,
    template,
    icon: 'square',
    properties: undefined,
    textContent: undefined,
  }
}
```

### Mock Containers

```typescript
export function createAbsoluteContainer(): HTMLElement {
  const container = document.createElement('div')
  container.dataset.mirrorId = 'test-container-1'
  container.dataset.mirrorAbsolute = 'true'
  container.style.position = 'relative'
  container.style.width = '800px'
  container.style.height = '600px'
  return container
}
```

### Simulate Drawing

```typescript
async function simulateDraw(
  drawManager: DrawManager,
  container: HTMLElement,
  options: {
    start: Point
    end: Point
    modifiers?: Modifiers
  }
): Promise<void> {
  const { start, end, modifiers = {} } = options

  // Enter draw mode if not already
  if (drawManager.getMode() === 'idle') {
    drawManager.enterDrawMode(mockComponent('Box'))
  }

  // Mousedown
  const downEvent = new MouseEvent('mousedown', {
    clientX: start.x,
    clientY: start.y,
    target: container,
    bubbles: true
  })
  drawManager.handleMouseDown(downEvent)

  // Mousemove (simulate drag)
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    const x = start.x + (end.x - start.x) * (i / steps)
    const y = start.y + (end.y - start.y) * (i / steps)

    const moveEvent = new MouseEvent('mousemove', {
      clientX: x,
      clientY: y,
      bubbles: true,
      shiftKey: modifiers.shift,
      altKey: modifiers.alt,
      metaKey: modifiers.meta,
    })

    drawManager.handleMouseMove(moveEvent)
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  // Mouseup
  const upEvent = new MouseEvent('mouseup', {
    clientX: end.x,
    clientY: end.y,
    bubbles: true
  })
  drawManager.handleMouseUp(upEvent)

  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 50))
}
```

---

## Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| DrawManager | 90% |
| DrawRectRenderer | 80% |
| SnapIntegration | 85% |
| Coordinate functions | 95% |
| Container validation | 95% |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Click-to-Draw Tests

on:
  push:
    paths:
      - 'studio/visual/draw-manager.ts'
      - 'studio/visual/draw-rect-renderer.ts'
      - 'studio/visual/snap-integration.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- studio/visual/__tests__/

      - name: Run integration tests
        run: npm test -- studio/__tests__/click-to-draw

      - name: Run E2E tests
        run: npx playwright test src/__tests__/playwright/click-to-draw-e2e.test.ts

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Manual Testing Checklist

### Phase 1 (MVP)

- [ ] Click Box component
- [ ] Verify crosshair cursor
- [ ] Draw rectangle in absolute container
- [ ] Verify live rectangle preview
- [ ] Verify dimension label shows
- [ ] Release mouse, verify Box created
- [ ] Check code has `x, y, w, h` properties
- [ ] Verify compilation triggered
- [ ] Press ESC during drawing, verify cancel
- [ ] Click in flex container, verify error

### Phase 2 (Snapping)

- [ ] Draw near 8px boundary, verify snap to grid
- [ ] Draw near sibling left edge, verify alignment guide
- [ ] Draw near sibling top edge, verify alignment guide
- [ ] Draw near sibling center, verify center guide
- [ ] Hold Cmd/Ctrl, verify snapping disabled

### Phase 3 (Polish)

- [ ] Hold Shift while drawing, verify square
- [ ] Hold Alt while drawing, verify center drawing
- [ ] Hold Shift + Alt, verify square from center
- [ ] Verify position labels show x, y coordinates
- [ ] Verify container hints in ready mode
- [ ] Click invalid container, verify helpful error
- [ ] Draw too small (<10px), verify error

---

**Status:** ✅ Test Strategy Complete
**Last Updated:** 2026-03-16
