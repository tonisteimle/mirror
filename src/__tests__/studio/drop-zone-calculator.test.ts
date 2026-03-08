import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropZoneCalculator } from '../../studio/drop-zone-calculator'

/**
 * Tests for DropZoneCalculator
 *
 * Tests the drop zone calculation and indicator positioning logic
 */

// Helper to setup mock bounding rect for an element
interface MockRect {
  left: number
  top: number
  width: number
  height: number
}

function setupMockRects(container: HTMLElement, rects: Map<string, MockRect>) {
  // Mock getBoundingClientRect for each element
  const elements = container.querySelectorAll('[data-mirror-id]')
  elements.forEach(el => {
    const nodeId = el.getAttribute('data-mirror-id')
    if (nodeId && rects.has(nodeId)) {
      const mockRect = rects.get(nodeId)!
      ;(el as HTMLElement).getBoundingClientRect = () => ({
        left: mockRect.left,
        top: mockRect.top,
        right: mockRect.left + mockRect.width,
        bottom: mockRect.top + mockRect.height,
        width: mockRect.width,
        height: mockRect.height,
        x: mockRect.left,
        y: mockRect.top,
        toJSON: () => ({})
      })
    }
  })

  // Mock container rect
  container.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 600,
    width: 400,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({})
  })
}

describe('DropZoneCalculator', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    // Create a mock container
    container = document.createElement('div')
    container.id = 'preview'
    container.style.position = 'relative'
    container.style.width = '400px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // Mock elementFromPoint - jsdom doesn't implement it
    document.elementFromPoint = vi.fn((x, y) => {
      // Find element at coordinates by checking bounding rects
      // Return the most specific (deepest/smallest) element that contains the point
      const elements = container.querySelectorAll('[data-mirror-id]')
      let bestMatch: Element | null = null
      let bestArea = Infinity

      for (const el of elements) {
        const rect = el.getBoundingClientRect()
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          const area = rect.width * rect.height
          // Prefer smaller elements (more specific)
          if (area < bestArea) {
            bestArea = area
            bestMatch = el
          }
        }
      }
      return bestMatch || container
    })

    // Mock getComputedStyle for layout detection
    const originalGetComputedStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      const htmlEl = el as HTMLElement
      const style = htmlEl.style
      return {
        ...originalGetComputedStyle(el),
        display: style.display || 'block',
        flexDirection: style.flexDirection || 'column',
        gridTemplateColumns: 'none'
      } as CSSStyleDeclaration
    })
  })

  afterEach(() => {
    if (calculator) {
      calculator.dispose()
    }
    if (container.parentNode) {
      document.body.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  describe('indicator creation', () => {
    it('creates indicator elements on initialization', () => {
      calculator = new DropZoneCalculator(container)

      const line = container.querySelector('.mirror-drop-indicator')
      const dots = container.querySelectorAll('.mirror-drop-indicator-dot')

      expect(line).not.toBeNull()
      expect(dots.length).toBe(2)
    })

    it('indicators are hidden by default', () => {
      calculator = new DropZoneCalculator(container)

      const line = container.querySelector('.mirror-drop-indicator') as HTMLElement
      const dots = container.querySelectorAll('.mirror-drop-indicator-dot')

      expect(line.style.display).toBe('none')
      dots.forEach(dot => {
        expect((dot as HTMLElement).style.display).toBe('none')
      })
    })

    it('ensureIndicators recreates indicators if removed', () => {
      calculator = new DropZoneCalculator(container)

      // Remove indicators (simulating innerHTML update)
      container.innerHTML = '<div>New content</div>'

      // Indicators should be gone
      expect(container.querySelector('.mirror-drop-indicator')).toBeNull()

      // Ensure indicators
      calculator.ensureIndicators()

      // Indicators should be back
      expect(container.querySelector('.mirror-drop-indicator')).not.toBeNull()
      expect(container.querySelectorAll('.mirror-drop-indicator-dot').length).toBe(2)
    })
  })

  describe('calculateFromPoint', () => {
    beforeEach(() => {
      // Setup container with elements
      container.innerHTML = `
        <div data-mirror-id="node-1" style="display: flex; flex-direction: column; padding: 16px;">
          <div data-mirror-id="node-2" style="width: 100px; height: 50px; margin-bottom: 8px;">Item 1</div>
          <div data-mirror-id="node-3" style="width: 100px; height: 50px; margin-bottom: 8px;">Item 2</div>
          <div data-mirror-id="node-4" style="width: 100px; height: 50px;">Item 3</div>
        </div>
      `

      // Setup mock rects for elements
      setupMockRects(container, new Map([
        ['node-1', { left: 0, top: 0, width: 400, height: 200 }],
        ['node-2', { left: 16, top: 16, width: 100, height: 50 }],
        ['node-3', { left: 16, top: 74, width: 100, height: 50 }],
        ['node-4', { left: 16, top: 132, width: 100, height: 50 }],
      ]))

      calculator = new DropZoneCalculator(container)
    })

    it('returns null for points outside container', () => {
      const result = calculator.calculateFromPoint(-100, -100)
      expect(result).toBeNull()
    })

    it('prevents self-drop when sourceNodeId matches target', () => {
      // Use coordinates that hit node-2 (left: 16, top: 16, width: 100, height: 50)
      const centerX = 16 + 50 // 66 - center of node-2
      const centerY = 16 + 25 // 41 - center of node-2

      const result = calculator.calculateFromPoint(centerX, centerY, 'node-2')
      expect(result).toBeNull()
    })

    it('calculates before placement for top edge of element', () => {
      // Hit top edge of node-2 (top: 16, height: 50)
      const x = 66 // center horizontally
      const y = 18 // near top (16 + 2)

      const result = calculator.calculateFromPoint(x, y)
      expect(result).not.toBeNull()
      expect(result!.placement).toBe('before')
      expect(result!.targetId).toBe('node-2')
    })

    it('calculates after placement for bottom edge of element', () => {
      // Hit bottom edge of node-2 (top: 16, height: 50, so bottom = 66)
      const x = 66 // center horizontally
      const y = 63 // near bottom (66 - 3)

      const result = calculator.calculateFromPoint(x, y)
      expect(result).not.toBeNull()
      expect(result!.placement).toBe('after')
      expect(result!.targetId).toBe('node-2')
    })

    it('calculates inside placement for center of container', () => {
      // Hit center of node-1 where no children are
      // node-1 covers 0-400 width, 0-200 height
      // Children are at x: 16-116, so hit outside that range
      const x = 300 // right side of node-1, no children
      const y = 100 // middle

      const result = calculator.calculateFromPoint(x, y)
      expect(result).not.toBeNull()
      expect(result!.placement).toBe('inside')
      expect(result!.targetId).toBe('node-1')
    })
  })

  describe('updateDropZone', () => {
    beforeEach(() => {
      container.innerHTML = `
        <div data-mirror-id="node-1" style="display: flex; flex-direction: column; padding: 16px;">
          <div data-mirror-id="node-2" style="width: 100px; height: 50px; margin-bottom: 8px;">Item 1</div>
          <div data-mirror-id="node-3" style="width: 100px; height: 50px;">Item 2</div>
        </div>
      `

      // Setup mock rects
      setupMockRects(container, new Map([
        ['node-1', { left: 0, top: 0, width: 400, height: 150 }],
        ['node-2', { left: 16, top: 16, width: 100, height: 50 }],
        ['node-3', { left: 16, top: 74, width: 100, height: 50 }],
      ]))

      calculator = new DropZoneCalculator(container)
    })

    it('shows indicator line for before/after placement', () => {
      // Hit top edge of node-2 (top: 16)
      const x = 66 // center of node-2
      const y = 18 // near top edge

      calculator.updateDropZone(x, y)

      const line = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(line.style.display).toBe('block')
    })

    it('getCurrentDropZone returns the current zone', () => {
      const x = 66 // center of node-2
      const y = 18 // near top edge

      calculator.updateDropZone(x, y)

      const dropZone = calculator.getCurrentDropZone()
      expect(dropZone).not.toBeNull()
      expect(dropZone!.targetId).toBe('node-2')
    })

    it('clear() hides indicators and resets drop zone', () => {
      const x = 66 // center of node-2
      const y = 18 // near top edge
      calculator.updateDropZone(x, y)

      // Verify indicator is shown
      const line = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(line.style.display).toBe('block')

      // Clear
      calculator.clear()

      // Verify hidden
      expect(line.style.display).toBe('none')
      expect(calculator.getCurrentDropZone()).toBeNull()
    })
  })

  describe('layout detection', () => {
    it('detects vertical layout (column) and uses horizontal line', () => {
      container.innerHTML = `
        <div data-mirror-id="node-1" style="display: flex; flex-direction: column;">
          <div data-mirror-id="node-2" style="width: 100px; height: 50px;">Item 1</div>
          <div data-mirror-id="node-3" style="width: 100px; height: 50px;">Item 2</div>
        </div>
      `

      // Setup mock rects
      setupMockRects(container, new Map([
        ['node-1', { left: 0, top: 0, width: 400, height: 150 }],
        ['node-2', { left: 0, top: 0, width: 100, height: 50 }],
        ['node-3', { left: 0, top: 58, width: 100, height: 50 }],
      ]))

      calculator = new DropZoneCalculator(container)

      // Hit top edge of node-2 for 'before' placement
      calculator.updateDropZone(50, 5)

      const line = container.querySelector('.mirror-drop-indicator') as HTMLElement
      // In vertical layout, line should be horizontal (height: 2px, width > 2px)
      expect(line.style.height).toBe('2px')
      expect(parseInt(line.style.width)).toBeGreaterThan(2)
    })

    it('detects horizontal layout (row) and uses vertical line', () => {
      container.innerHTML = `
        <div data-mirror-id="node-1" style="display: flex; flex-direction: row;">
          <div data-mirror-id="node-2" style="width: 50px; height: 100px;">Item 1</div>
          <div data-mirror-id="node-3" style="width: 50px; height: 100px;">Item 2</div>
        </div>
      `

      // Setup mock rects
      setupMockRects(container, new Map([
        ['node-1', { left: 0, top: 0, width: 400, height: 100 }],
        ['node-2', { left: 0, top: 0, width: 50, height: 100 }],
        ['node-3', { left: 58, top: 0, width: 50, height: 100 }],
      ]))

      calculator = new DropZoneCalculator(container)

      // Hit left edge of node-2 for 'before' placement in horizontal layout
      calculator.updateDropZone(5, 50)

      const line = container.querySelector('.mirror-drop-indicator') as HTMLElement
      // In horizontal layout, line should be vertical (width: 2px, height > 2px)
      expect(line.style.width).toBe('2px')
      expect(parseInt(line.style.height)).toBeGreaterThan(2)
    })
  })

  describe('descendant drop prevention', () => {
    it('prevents dropping into descendants of source node', () => {
      container.innerHTML = `
        <div data-mirror-id="node-1">
          <div data-mirror-id="node-2">
            <div data-mirror-id="node-3">Nested child</div>
          </div>
        </div>
      `

      // Setup mock rects
      setupMockRects(container, new Map([
        ['node-1', { left: 0, top: 0, width: 400, height: 200 }],
        ['node-2', { left: 10, top: 10, width: 380, height: 180 }],
        ['node-3', { left: 20, top: 20, width: 360, height: 160 }],
      ]))

      calculator = new DropZoneCalculator(container)

      // Try to drop node-1 into its descendant node-3 (center: 200, 100)
      const result = calculator.calculateFromPoint(200, 100, 'node-1')

      expect(result).toBeNull()
    })
  })
})
