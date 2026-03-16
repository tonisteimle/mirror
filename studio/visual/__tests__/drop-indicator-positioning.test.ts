/**
 * Drop Indicator Positioning Tests
 *
 * Phase 5.1 of Drag-Drop Test Expansion Plan
 * Tests visual indicator positioning for different drop scenarios
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropIndicator, createDropIndicator } from '../drop-indicator'

// ============================================================================
// SETUP HELPERS
// ============================================================================

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'test-container'
  Object.assign(container.style, {
    position: 'relative',
    width: '800px',
    height: '600px',
    left: '0px',
    top: '0px',
  })
  document.body.appendChild(container)
  return container
}

function createTargetElement(rect: Partial<DOMRect>): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', 'target')

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.x ?? 100,
    y: rect.y ?? 100,
    width: rect.width ?? 200,
    height: rect.height ?? 100,
    top: rect.top ?? rect.y ?? 100,
    left: rect.left ?? rect.x ?? 100,
    right: (rect.left ?? rect.x ?? 100) + (rect.width ?? 200),
    bottom: (rect.top ?? rect.y ?? 100) + (rect.height ?? 100),
    toJSON: () => ({}),
  })

  return element
}

function mockContainerRect(container: HTMLElement): void {
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
  })
}

function getIndicatorElement(container: HTMLElement, className: string): HTMLElement | null {
  return container.querySelector(`.${className}`) as HTMLElement | null
}

// ============================================================================
// LINE INDICATORS
// ============================================================================

describe('Drop Indicator: Line Indicators', () => {
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
    indicator = createDropIndicator({ container })
  })

  afterEach(() => {
    indicator.dispose()
    container.remove()
  })

  describe('horizontal line (for vertical layouts)', () => {
    it('positions line correctly for "before" placement', () => {
      const targetRect = new DOMRect(100, 150, 200, 50)
      indicator.showInsertionLine(targetRect, 'before', 'vertical')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()
      expect(line!.style.display).toBe('block')

      // Line should be at top of target (minus half line width)
      const lineTop = parseFloat(line!.style.top)
      expect(lineTop).toBeCloseTo(150 - 1, 0) // 150 - lineWidth/2
    })

    it('positions line correctly for "after" placement', () => {
      const targetRect = new DOMRect(100, 150, 200, 50)
      indicator.showInsertionLine(targetRect, 'after', 'vertical')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be at bottom of target (minus half line width)
      const lineTop = parseFloat(line!.style.top)
      expect(lineTop).toBeCloseTo(200 - 1, 0) // 150 + 50 - lineWidth/2
    })

    it('calculates line width to match target width', () => {
      const targetRect = new DOMRect(50, 100, 300, 50)
      indicator.showInsertionLine(targetRect, 'before', 'vertical')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      const lineWidth = parseFloat(line!.style.width)
      expect(lineWidth).toBe(300)
    })

    it('positions dots at line endpoints', () => {
      const targetRect = new DOMRect(100, 150, 200, 50)
      indicator.showInsertionLine(targetRect, 'before', 'vertical')

      const dots = container.querySelectorAll('.mirror-drop-dot')
      expect(dots.length).toBe(2)

      // Both dots should be visible
      const startDot = dots[0] as HTMLElement
      const endDot = dots[1] as HTMLElement
      expect(startDot.style.display).toBe('block')
      expect(endDot.style.display).toBe('block')
    })
  })

  describe('vertical line (for horizontal layouts)', () => {
    it('positions line correctly for "before" placement', () => {
      const targetRect = new DOMRect(150, 100, 100, 200)
      indicator.showInsertionLine(targetRect, 'before', 'horizontal')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be at left of target (minus half line width)
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(150 - 1, 0)
    })

    it('positions line correctly for "after" placement', () => {
      const targetRect = new DOMRect(150, 100, 100, 200)
      indicator.showInsertionLine(targetRect, 'after', 'horizontal')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be at right of target
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(250 - 1, 0) // 150 + 100 - lineWidth/2
    })

    it('calculates line height to match target height', () => {
      const targetRect = new DOMRect(150, 50, 100, 250)
      indicator.showInsertionLine(targetRect, 'before', 'horizontal')

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      const lineHeight = parseFloat(line!.style.height)
      expect(lineHeight).toBe(250)
    })
  })

  describe('gap insertion line', () => {
    it('centers line between two siblings in horizontal layout', () => {
      const beforeRect = new DOMRect(50, 100, 100, 200)
      const afterRect = new DOMRect(200, 100, 100, 200)
      const parentRect = new DOMRect(0, 0, 400, 400)

      indicator.showInsertionLineInGap(beforeRect, afterRect, parentRect, true)

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be centered in gap: (150 + 200) / 2 = 175
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(175 - 1, 0)
    })

    it('centers line between two siblings in vertical layout', () => {
      const beforeRect = new DOMRect(100, 50, 200, 100)
      const afterRect = new DOMRect(100, 200, 200, 100)
      const parentRect = new DOMRect(0, 0, 400, 400)

      indicator.showInsertionLineInGap(beforeRect, afterRect, parentRect, false)

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be centered in gap: (150 + 200) / 2 = 175
      const lineTop = parseFloat(line!.style.top)
      expect(lineTop).toBeCloseTo(175 - 1, 0)
    })

    it('positions line at edge when only beforeRect provided', () => {
      const beforeRect = new DOMRect(50, 100, 100, 200)
      const parentRect = new DOMRect(0, 0, 400, 400)

      indicator.showInsertionLineInGap(beforeRect, null, parentRect, true)

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be after last sibling: 150 + 4
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(154 - 1, 0)
    })

    it('positions line at edge when only afterRect provided', () => {
      const afterRect = new DOMRect(200, 100, 100, 200)
      const parentRect = new DOMRect(0, 0, 400, 400)

      indicator.showInsertionLineInGap(null, afterRect, parentRect, true)

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be before first sibling: 200 - 4
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(196 - 1, 0)
    })

    it('centers line in empty container', () => {
      const parentRect = new DOMRect(50, 50, 300, 200)

      indicator.showInsertionLineInGap(null, null, parentRect, true)

      const line = getIndicatorElement(container, 'mirror-drop-line')
      expect(line).not.toBeNull()

      // Line should be at center of parent: 50 + 150 = 200
      const lineLeft = parseFloat(line!.style.left)
      expect(lineLeft).toBeCloseTo(200 - 1, 0)
    })
  })
})

// ============================================================================
// CONTAINER HIGHLIGHT
// ============================================================================

describe('Drop Indicator: Container Highlight', () => {
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
    indicator = createDropIndicator({ container })
  })

  afterEach(() => {
    indicator.dispose()
    container.remove()
  })

  it('applies highlight styles to target element', () => {
    const targetElement = document.createElement('div')

    indicator.showContainerHighlight(targetElement)

    expect(targetElement.style.outline).toContain('solid')
    expect(targetElement.style.backgroundColor).toContain('rgba')
  })

  it('restores original styles on hide', () => {
    const targetElement = document.createElement('div')
    targetElement.style.backgroundColor = 'red'
    targetElement.style.outline = 'none'

    indicator.showContainerHighlight(targetElement)
    indicator.hideContainerHighlight()

    expect(targetElement.style.backgroundColor).toBe('red')
    expect(targetElement.style.outline).toBe('none')
  })

  it('handles switching highlight between elements', () => {
    const element1 = document.createElement('div')
    const element2 = document.createElement('div')
    element1.style.backgroundColor = 'blue'
    element2.style.backgroundColor = 'green'

    indicator.showContainerHighlight(element1)
    indicator.showContainerHighlight(element2)

    // element1 should be restored
    expect(element1.style.backgroundColor).toBe('blue')
    // element2 should be highlighted
    expect(element2.style.outline).toContain('solid')
  })

  it('hides insertion line when showing highlight', () => {
    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const line = getIndicatorElement(container, 'mirror-drop-line')
    expect(line?.style.display).toBe('block')

    const targetElement = document.createElement('div')
    indicator.showContainerHighlight(targetElement)

    expect(line?.style.display).toBe('none')
  })
})

// ============================================================================
// CROSSHAIR (ABSOLUTE POSITIONING)
// ============================================================================

describe('Drop Indicator: Crosshair for Absolute Positioning', () => {
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
    indicator = createDropIndicator({ container })
  })

  afterEach(() => {
    indicator.dispose()
    container.remove()
  })

  it('shows crosshair at specified position', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    const hLine = getIndicatorElement(container, 'mirror-drop-crosshair-h')
    const vLine = getIndicatorElement(container, 'mirror-drop-crosshair-v')

    expect(hLine).not.toBeNull()
    expect(vLine).not.toBeNull()
    expect(hLine!.style.display).toBe('block')
    expect(vLine!.style.display).toBe('block')
  })

  it('positions horizontal crosshair line at y coordinate', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    const hLine = getIndicatorElement(container, 'mirror-drop-crosshair-h')
    const top = parseFloat(hLine!.style.top)
    expect(top).toBe(100)
  })

  it('positions vertical crosshair line at x coordinate', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    const vLine = getIndicatorElement(container, 'mirror-drop-crosshair-v')
    const left = parseFloat(vLine!.style.left)
    expect(left).toBe(150)
  })

  it('horizontal line spans full container width', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    const hLine = getIndicatorElement(container, 'mirror-drop-crosshair-h')
    const width = parseFloat(hLine!.style.width)
    expect(width).toBe(400)
  })

  it('vertical line spans full container height', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    const vLine = getIndicatorElement(container, 'mirror-drop-crosshair-v')
    const height = parseFloat(vLine!.style.height)
    expect(height).toBe(300)
  })

  it('hides other indicators when showing crosshair', () => {
    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const line = getIndicatorElement(container, 'mirror-drop-line')
    expect(line?.style.display).toBe('block')

    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    expect(line?.style.display).toBe('none')
  })
})

// ============================================================================
// POSITION LABEL
// ============================================================================

describe('Drop Indicator: Position Label', () => {
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
    indicator = createDropIndicator({ container })
  })

  afterEach(() => {
    indicator.dispose()
    container.remove()
  })

  it('shows position label with correct coordinates', () => {
    // First show crosshair (required for label positioning)
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)

    indicator.showPositionLabel(150, 100)

    const label = getIndicatorElement(container, 'mirror-drop-position-label')
    expect(label).not.toBeNull()
    expect(label!.style.display).toBe('block')
    expect(label!.textContent).toBe('x: 150, y: 100')
  })

  it('updates position label text correctly', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(100, 200, containerRect)
    indicator.showPositionLabel(100, 200)

    const label = getIndicatorElement(container, 'mirror-drop-position-label')
    expect(label!.textContent).toBe('x: 100, y: 200')

    indicator.showCrosshair(250, 175, containerRect)
    indicator.showPositionLabel(250, 175)

    expect(label!.textContent).toBe('x: 250, y: 175')
  })

  it('positions label near crosshair intersection', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)
    indicator.showPositionLabel(150, 100)

    const label = getIndicatorElement(container, 'mirror-drop-position-label')
    const labelLeft = parseFloat(label!.style.left)
    const labelTop = parseFloat(label!.style.top)

    // Label should be offset slightly from crosshair
    expect(labelLeft).toBeGreaterThan(150)
    expect(labelTop).toBeGreaterThan(100)
  })

  it('hides position label', () => {
    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)
    indicator.showPositionLabel(150, 100)

    const label = getIndicatorElement(container, 'mirror-drop-position-label')
    expect(label!.style.display).toBe('block')

    indicator.hidePositionLabel()

    expect(label!.style.display).toBe('none')
  })
})

// ============================================================================
// HIDE ALL
// ============================================================================

describe('Drop Indicator: Hide All', () => {
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
    indicator = createDropIndicator({ container })
  })

  afterEach(() => {
    indicator.dispose()
    container.remove()
  })

  it('hides all indicator types', () => {
    // Show various indicators
    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    indicator.hideAll()

    const line = getIndicatorElement(container, 'mirror-drop-line')
    const dots = container.querySelectorAll('.mirror-drop-dot')

    expect(line?.style.display).toBe('none')
    Array.from(dots).forEach((dot) => {
      expect((dot as HTMLElement).style.display).toBe('none')
    })
  })

  it('can be called multiple times safely', () => {
    indicator.hideAll()
    indicator.hideAll()
    indicator.hideAll()
    // Should not throw
    expect(true).toBe(true)
  })
})

// ============================================================================
// DISPOSE
// ============================================================================

describe('Drop Indicator: Dispose', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('removes all created elements from DOM', () => {
    const indicator = createDropIndicator({ container })

    // Create some indicators
    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const containerRect = new DOMRect(0, 0, 400, 300)
    indicator.showCrosshair(150, 100, containerRect)
    indicator.showPositionLabel(150, 100)

    // Dispose
    indicator.dispose()

    // All indicator elements should be removed
    expect(container.querySelector('.mirror-drop-line')).toBeNull()
    expect(container.querySelector('.mirror-drop-dot')).toBeNull()
    expect(container.querySelector('.mirror-drop-crosshair-h')).toBeNull()
    expect(container.querySelector('.mirror-drop-crosshair-v')).toBeNull()
    expect(container.querySelector('.mirror-drop-position-label')).toBeNull()
  })

  it('clears any container highlight', () => {
    const indicator = createDropIndicator({ container })

    const targetElement = document.createElement('div')
    targetElement.style.backgroundColor = 'red'
    indicator.showContainerHighlight(targetElement)

    indicator.dispose()

    expect(targetElement.style.backgroundColor).toBe('red')
  })
})

// ============================================================================
// CONFIGURATION
// ============================================================================

describe('Drop Indicator: Configuration', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    mockContainerRect(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('uses custom color', () => {
    const indicator = createDropIndicator({
      container,
      color: '#FF0000',
    })

    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const line = getIndicatorElement(container, 'mirror-drop-line')
    expect(line!.style.backgroundColor).toBe('rgb(255, 0, 0)')

    indicator.dispose()
  })

  it('uses custom line width', () => {
    const indicator = createDropIndicator({
      container,
      lineWidth: 4,
    })

    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const line = getIndicatorElement(container, 'mirror-drop-line')
    // For vertical orientation (horizontal layout), height is lineWidth
    expect(parseFloat(line!.style.height)).toBe(4)

    indicator.dispose()
  })

  it('uses custom dot size', () => {
    const indicator = createDropIndicator({
      container,
      dotSize: 10,
    })

    const targetRect = new DOMRect(100, 100, 200, 100)
    indicator.showInsertionLine(targetRect, 'before', 'vertical')

    const dots = container.querySelectorAll('.mirror-drop-dot')
    const dot = dots[0] as HTMLElement
    expect(parseFloat(dot.style.width)).toBe(10)
    expect(parseFloat(dot.style.height)).toBe(10)

    indicator.dispose()
  })

  it('sets container position to relative if static', () => {
    const staticContainer = document.createElement('div')
    staticContainer.style.position = 'static'
    document.body.appendChild(staticContainer)

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      position: 'static',
    } as CSSStyleDeclaration)

    const indicator = createDropIndicator({ container: staticContainer })

    expect(staticContainer.style.position).toBe('relative')

    indicator.dispose()
    staticContainer.remove()
  })
})
