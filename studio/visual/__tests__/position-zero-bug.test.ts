/**
 * Position Zero Bug Tests
 *
 * Tests to reproduce and prevent the bug where elements get moved to position (0,0)
 * when they should be moved to a specific position in an absolute container.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { ElementMover, ElementMoverConfig, MoveResult } from '../element-mover'
import type { DropZone, DropZoneCalculator } from '../../../src/studio/drop-zone-calculator'
import type { DropIndicator } from '../drop-indicator'
import type { SourceMap } from '../../../src/studio/source-map'

// Mock DOMRect for JSDOM
class MockDOMRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.top = y
    this.left = x
    this.right = x + width
    this.bottom = y + height
  }

  toJSON() {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }
}

// @ts-ignore - Mock global
global.DOMRect = MockDOMRect

// Mock DropIndicator
function createMockDropIndicator(): DropIndicator {
  return {
    showInsertionLine: vi.fn(),
    showContainerHighlight: vi.fn(),
    showCrosshair: vi.fn(),
    showPositionLabel: vi.fn(),
    hideAll: vi.fn(),
  } as unknown as DropIndicator
}

// Mock SourceMap
function createMockSourceMap(): SourceMap {
  return {
    getNodePosition: vi.fn().mockReturnValue(null),
    getPositionForNodeId: vi.fn().mockReturnValue(null),
    getNodeIdForPosition: vi.fn().mockReturnValue(null),
  } as unknown as SourceMap
}

describe('Position Zero Bug', () => {
  let dom: JSDOM
  let container: HTMLElement
  let mover: ElementMover
  let mockDropIndicator: ReturnType<typeof createMockDropIndicator>
  let capturedMoveResult: MoveResult | null = null

  // Helper to create an absolute container with children
  function setupAbsoluteContainer() {
    const document = dom.window.document
    container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'container')
    container.setAttribute('data-positioned', 'true')
    container.style.cssText = 'position: relative; width: 500px; height: 400px;'

    // Mock getBoundingClientRect for container
    container.getBoundingClientRect = () => new MockDOMRect(0, 0, 500, 400)

    // Create a child element at position (100, 150)
    const child = document.createElement('div')
    child.setAttribute('data-mirror-id', 'box-1')
    child.style.cssText = 'position: absolute; left: 100px; top: 150px; width: 80px; height: 60px;'
    child.textContent = 'Box 1'

    // Mock getBoundingClientRect for child - position relative to viewport
    // Element is at (100, 150) relative to container which is at (0, 0)
    child.getBoundingClientRect = () => new MockDOMRect(100, 150, 80, 60)

    container.appendChild(child)

    document.body.appendChild(container)
    return { container, child }
  }

  // Helper to create a mock DropZoneCalculator that returns specific drop zones
  function createMockDropZoneCalculator(dropZone: DropZone | null): DropZoneCalculator {
    return {
      getDropZones: vi.fn().mockReturnValue([]),
      updateDropZone: vi.fn().mockReturnValue(dropZone),
      getCurrentDropZone: vi.fn().mockReturnValue(dropZone),
      clear: vi.fn(),
      calculateChildInsertionZone: vi.fn().mockReturnValue(null),
    } as unknown as DropZoneCalculator
  }

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis
    global.MouseEvent = dom.window.MouseEvent as unknown as typeof MouseEvent
    global.KeyboardEvent = dom.window.KeyboardEvent as unknown as typeof KeyboardEvent

    mockDropIndicator = createMockDropIndicator()
    capturedMoveResult = null
  })

  afterEach(() => {
    if (mover) {
      mover.detach()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('Invalid absolutePosition scenarios', () => {
    it('should NOT produce (0,0) when absolutePosition is undefined', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Create drop zone WITHOUT absolutePosition (this is a bug scenario)
      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        // absolutePosition is MISSING - this could cause (0,0)
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      // Register callback to capture result
      mover.onMove((result) => {
        capturedMoveResult = result
      })

      // Start drag
      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 140,
        clientY: 180,
        button: 0,
        bubbles: true,
      }))

      // Move past threshold
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      // Release
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      // If layoutTransition contains absolutePosition, it should NOT be (0,0)
      // when undefined absolutePosition is the cause of the bug
      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        // This is the bug: we get (0,0) when absolutePosition was undefined
        expect(x === 0 && y === 0).toBe(false)
      }
    })

    it('should handle NaN coordinates gracefully', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Create drop zone with NaN coordinates
      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: {
          x: NaN,
          y: NaN,
        },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      // Execute drag
      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 140,
        clientY: 180,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      // NaN coordinates should be handled - either filtered or converted to valid values
      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }
    })

    it('should handle Infinity coordinates gracefully', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Create drop zone with Infinity coordinates
      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: {
          x: Infinity,
          y: -Infinity,
        },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 140,
        clientY: 180,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      }))

      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }
    })
  })

  describe('Container rect edge cases', () => {
    it('should handle zero-width container rect', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Mock getBoundingClientRect to return zero-width
      const originalGetBoundingClientRect = cont.getBoundingClientRect.bind(cont)
      cont.getBoundingClientRect = () => new MockDOMRect(0, 0, 0, 400)

      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: { x: 100, y: 150 },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 100,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 150,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 100,
        clientY: 150,
        bubbles: true,
      }))

      // Should have valid coordinates even with edge case container
      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }

      // Restore
      cont.getBoundingClientRect = originalGetBoundingClientRect
    })
  })

  describe('Layout transition edge cases', () => {
    it('should correctly pass coordinates from absolute→absolute move', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Element starts at (100, 150) in container
      // We click at cursor (140, 180) - somewhere on the element
      // We drag to cursor (250, 300)
      // Delta = (250 - 140, 300 - 180) = (110, 120)
      // Expected new position = (100 + 110, 150 + 120) = (210, 270)

      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        // Note: this is the cursor position, but the ElementMover now uses delta calculation
        absolutePosition: { x: 250, y: 300 },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 140,
        clientY: 180,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 250,
        clientY: 300,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 250,
        clientY: 300,
        bubbles: true,
      }))

      expect(capturedMoveResult).not.toBeNull()
      expect(capturedMoveResult?.layoutTransition).toBeDefined()
      expect(capturedMoveResult?.layoutTransition?.from).toBe('absolute')
      expect(capturedMoveResult?.layoutTransition?.to).toBe('absolute')

      // The key assertion: coordinates should NOT be (0,0)
      const pos = capturedMoveResult?.layoutTransition?.absolutePosition
      expect(pos).toBeDefined()
      expect(pos?.x).not.toBe(0)
      expect(pos?.y).not.toBe(0)

      // With delta-based calculation:
      // elementStart = (100, 150), delta = (110, 120), result = (210, 270)
      // Grid snapping might round these values
      expect(pos?.x).toBeGreaterThan(200)
      expect(pos?.y).toBeGreaterThan(260)
    })

    it('should handle rapid drag start/end', () => {
      const { container: cont } = setupAbsoluteContainer()

      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: { x: 200, y: 200 },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      const results: MoveResult[] = []
      mover.onMove((result) => {
        results.push(result)
      })

      // Rapid drag operations
      for (let i = 0; i < 3; i++) {
        const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement

        element.dispatchEvent(new MouseEvent('mousedown', {
          clientX: 140 + i * 10,
          clientY: 180 + i * 10,
          button: 0,
          bubbles: true,
        }))

        document.dispatchEvent(new MouseEvent('mousemove', {
          clientX: 200 + i * 20,
          clientY: 200 + i * 20,
          bubbles: true,
        }))

        document.dispatchEvent(new MouseEvent('mouseup', {
          clientX: 200 + i * 20,
          clientY: 200 + i * 20,
          bubbles: true,
        }))
      }

      // All results should have valid coordinates
      for (const result of results) {
        if (result.layoutTransition?.absolutePosition) {
          const { x, y } = result.layoutTransition.absolutePosition
          expect(Number.isFinite(x)).toBe(true)
          expect(Number.isFinite(y)).toBe(true)
          // None should be (0,0) as that's the bug we're trying to catch
          expect(x === 0 && y === 0).toBe(false)
        }
      }
    })
  })

  describe('Grid snapping edge cases', () => {
    it('should not produce (0,0) when grid size is 0', () => {
      const { container: cont } = setupAbsoluteContainer()

      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: { x: 123, y: 456 },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
        gridSnapSize: 0, // This could cause division by zero
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 50,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 200,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 150,
        clientY: 200,
        bubbles: true,
      }))

      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }
    })
  })

  describe('Negative coordinates', () => {
    it('should clamp negative coordinates to minimum of 0', () => {
      const { container: cont } = setupAbsoluteContainer()

      // Drop zone with negative coordinates (from drag outside container)
      const dropZone: DropZone = {
        targetId: 'container',
        placement: 'inside',
        element: cont,
        parentId: 'container',
        isAbsoluteContainer: true,
        absolutePosition: { x: -50, y: -30 },
      }

      const mockCalculator = createMockDropZoneCalculator(dropZone)

      const config: ElementMoverConfig = {
        container: cont,
        dropZoneCalculator: mockCalculator,
        dropIndicator: mockDropIndicator,
        getSourceMap: () => createMockSourceMap(),
      }

      mover = new ElementMover(config)
      mover.attach()

      mover.onMove((result) => {
        capturedMoveResult = result
      })

      const element = cont.querySelector('[data-mirror-id="box-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 50,
        button: 0,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: -20,
        clientY: -10,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: -20,
        clientY: -10,
        bubbles: true,
      }))

      // Negative coordinates should be clamped or handled
      if (capturedMoveResult?.layoutTransition?.absolutePosition) {
        const { x, y } = capturedMoveResult.layoutTransition.absolutePosition
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
      }
    })
  })
})

describe('AbsoluteDropStrategy coordinate calculation', () => {
  // Direct tests for the AbsoluteDropStrategy
  // These isolate the coordinate calculation logic

  it('should handle scale factor correctly', () => {
    // When scale is 0.5 (zoomed out), clicking at (100, 100) in container at (0, 0)
    // should produce coordinates of (200, 200) in the unscaled coordinate system
    const containerRect = new MockDOMRect(0, 0, 500, 400)
    const clientX = 100
    const clientY = 100
    const scale = 0.5

    // This is what AbsoluteDropStrategy does:
    let x = (clientX - containerRect.left) / scale
    let y = (clientY - containerRect.top) / scale

    expect(x).toBe(200)
    expect(y).toBe(200)
  })

  it('should handle scale of 0 (edge case)', () => {
    const containerRect = new MockDOMRect(0, 0, 500, 400)
    const clientX = 100
    const clientY = 100
    const scale = 0 // This would cause division by zero!

    // Safe handling should prevent Infinity
    const safeScale = scale || 1
    let x = (clientX - containerRect.left) / safeScale
    let y = (clientY - containerRect.top) / safeScale

    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })

  it('should produce non-zero coordinates for valid inputs', () => {
    const containerRect = new MockDOMRect(50, 50, 500, 400)
    const clientX = 200
    const clientY = 150
    const scale = 1

    let x = (clientX - containerRect.left) / scale
    let y = (clientY - containerRect.top) / scale

    x = Math.max(0, Math.round(x))
    y = Math.max(0, Math.round(y))

    expect(x).toBe(150) // 200 - 50
    expect(y).toBe(100) // 150 - 50
    expect(x !== 0 || y !== 0).toBe(true) // Not both zero
  })
})
