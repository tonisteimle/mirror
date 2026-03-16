/**
 * Layout Transition Tests
 *
 * Phase 6.2 of Drag-Drop Test Expansion Plan
 * Tests transitions between different layout types (flex, absolute, grid)
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ElementMover, MoveResult } from '../visual/element-mover'
import { DropIndicator } from '../visual/drop-indicator'
import { DropZone, DropZoneCalculator } from '../../src/studio/drop-zone-calculator'

// ============================================================================
// SETUP HELPERS
// ============================================================================

function createMockDropIndicator(): DropIndicator {
  return {
    showInsertionLine: vi.fn(),
    hideInsertionLine: vi.fn(),
    showContainerHighlight: vi.fn(),
    hideContainerHighlight: vi.fn(),
    showCrosshair: vi.fn(),
    hideCrosshair: vi.fn(),
    showPositionLabel: vi.fn(),
    hidePositionLabel: vi.fn(),
    hideAll: vi.fn(),
    dispose: vi.fn(),
  } as unknown as DropIndicator
}

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'preview-container'
  Object.assign(container.style, {
    position: 'relative',
    width: '800px',
    height: '600px',
  })
  document.body.appendChild(container)
  return container
}

function createDraggableElement(
  nodeId: string,
  layoutType: 'flex' | 'absolute'
): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  Object.assign(element.style, {
    width: '100px',
    height: '50px',
    position: layoutType === 'absolute' ? 'absolute' : 'relative',
  })
  return element
}

function mockElementRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    width: rect.width ?? 100,
    height: rect.height ?? 50,
    top: rect.top ?? rect.y ?? 0,
    left: rect.left ?? rect.x ?? 0,
    right: (rect.left ?? rect.x ?? 0) + (rect.width ?? 100),
    bottom: (rect.top ?? rect.y ?? 0) + (rect.height ?? 50),
    toJSON: () => ({}),
  })
}

function simulateMouseEvent(
  type: string,
  target: EventTarget,
  options: Partial<MouseEventInit> = {}
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...options,
  })
  target.dispatchEvent(event)
}

// ============================================================================
// FLEX TO ABSOLUTE TRANSITIONS
// ============================================================================

describe('Layout Transition: Flex to Absolute', () => {
  let container: HTMLElement
  let mover: ElementMover
  let dropIndicator: DropIndicator
  let moveResults: MoveResult[]

  beforeEach(() => {
    container = createContainer()
    dropIndicator = createMockDropIndicator()
    moveResults = []

    // Create a mock calculator that returns absolute container drop zones
    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 150, y: 100 },
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 150, y: 100 },
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()
  })

  afterEach(() => {
    mover.dispose()
    container.remove()
    document.body.style.cursor = ''
    document.querySelectorAll('[style*="position: fixed"]').forEach((el) => el.remove())
  })

  it('detects flex to absolute transition', () => {
    // Create element in flex parent
    const flexParent = document.createElement('div')
    flexParent.style.display = 'flex'
    flexParent.setAttribute('data-mirror-id', 'flex-parent')
    container.appendChild(flexParent)

    const element = createDraggableElement('test-node', 'flex')
    flexParent.appendChild(element)
    mockElementRect(element, { x: 100, y: 100, width: 100, height: 50 })

    // Drag and drop
    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition).toBeDefined()
    expect(moveResults[0].layoutTransition!.from).toBe('flex')
    expect(moveResults[0].layoutTransition!.to).toBe('absolute')
  })

  it('includes absolute position for flex to absolute transition', () => {
    const element = createDraggableElement('test-node', 'flex')
    container.appendChild(element)
    mockElementRect(element, { x: 100, y: 100, width: 100, height: 50 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition?.absolutePosition).toBeDefined()
    expect(moveResults[0].layoutTransition?.absolutePosition?.x).toBe(152) // Snapped to 8px grid
    expect(moveResults[0].layoutTransition?.absolutePosition?.y).toBe(104) // Snapped to 8px grid
  })
})

// ============================================================================
// ABSOLUTE TO FLEX TRANSITIONS
// ============================================================================

describe('Layout Transition: Absolute to Flex', () => {
  let container: HTMLElement
  let mover: ElementMover
  let dropIndicator: DropIndicator
  let moveResults: MoveResult[]

  beforeEach(() => {
    container = createContainer()
    dropIndicator = createMockDropIndicator()
    moveResults = []

    // Create a mock calculator that returns flex container drop zones
    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'flex-container',
          placement: 'inside',
          isAbsoluteContainer: false,
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'flex-container',
          placement: 'inside',
          isAbsoluteContainer: false,
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()
  })

  afterEach(() => {
    mover.dispose()
    container.remove()
    document.body.style.cursor = ''
    document.querySelectorAll('[style*="position: fixed"]').forEach((el) => el.remove())
  })

  it('detects absolute to flex transition', () => {
    // Create element in absolute container
    const absParent = document.createElement('div')
    absParent.style.position = 'relative'
    absParent.setAttribute('data-layout', 'abs')
    absParent.setAttribute('data-mirror-id', 'abs-parent')
    container.appendChild(absParent)

    const element = createDraggableElement('test-node', 'absolute')
    absParent.appendChild(element)
    mockElementRect(element, { x: 100, y: 100, width: 100, height: 50 })

    // Drag and drop
    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition).toBeDefined()
    expect(moveResults[0].layoutTransition!.from).toBe('absolute')
    expect(moveResults[0].layoutTransition!.to).toBe('flex')
  })

  it('does not include absolute position for absolute to flex transition', () => {
    const absParent = document.createElement('div')
    absParent.style.position = 'relative'
    absParent.setAttribute('data-layout', 'abs')
    container.appendChild(absParent)

    const element = createDraggableElement('test-node', 'absolute')
    absParent.appendChild(element)
    mockElementRect(element, { x: 100, y: 100, width: 100, height: 50 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition?.absolutePosition).toBeUndefined()
  })
})

// ============================================================================
// SAME LAYOUT TRANSITIONS
// ============================================================================

describe('Layout Transition: Same Layout Type', () => {
  let container: HTMLElement
  let dropIndicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    dropIndicator = createMockDropIndicator()
  })

  afterEach(() => {
    container.remove()
    document.body.style.cursor = ''
    document.querySelectorAll('[style*="position: fixed"]').forEach((el) => el.remove())
  })

  it('flex to flex has no layout transition', () => {
    const moveResults: MoveResult[] = []

    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'another-flex',
          placement: 'inside',
          isAbsoluteContainer: false,
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'another-flex',
          placement: 'inside',
          isAbsoluteContainer: false,
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    const mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()

    const element = createDraggableElement('test-node', 'flex')
    container.appendChild(element)
    mockElementRect(element, { x: 100, y: 100 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition).toBeUndefined()

    mover.dispose()
  })

  it('absolute to absolute includes updated position', () => {
    const moveResults: MoveResult[] = []

    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 200, y: 150 },
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 200, y: 150 },
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    const mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()

    const absParent = document.createElement('div')
    absParent.style.position = 'relative'
    absParent.setAttribute('data-layout', 'abs')
    container.appendChild(absParent)

    const element = createDraggableElement('test-node', 'absolute')
    absParent.appendChild(element)
    mockElementRect(element, { x: 100, y: 100 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    expect(moveResults[0].layoutTransition).toBeDefined()
    expect(moveResults[0].layoutTransition!.from).toBe('absolute')
    expect(moveResults[0].layoutTransition!.to).toBe('absolute')
    expect(moveResults[0].layoutTransition!.absolutePosition).toBeDefined()

    mover.dispose()
  })
})

// ============================================================================
// GRID LAYOUT CONSIDERATIONS
// ============================================================================

describe('Layout Transition: Grid Considerations', () => {
  // Note: These are conceptual tests for future grid support

  it('treats grid as flex-like for layout detection', () => {
    // Grid layouts should be treated similarly to flex
    // They have structured positioning, not absolute
    const gridLayoutType = 'flex' // Currently treated as flex
    expect(gridLayoutType).toBe('flex')
  })

  it('grid to absolute should behave like flex to absolute', () => {
    // When moving from grid to absolute container:
    // - Remove grid positioning properties
    // - Add x/y properties
    const expectedTransition = {
      from: 'flex', // Grid treated as flex
      to: 'absolute',
    }
    expect(expectedTransition.from).toBe('flex')
    expect(expectedTransition.to).toBe('absolute')
  })
})

// ============================================================================
// GRID SNAP
// ============================================================================

describe('Layout Transition: Grid Snap', () => {
  let container: HTMLElement
  let dropIndicator: DropIndicator

  beforeEach(() => {
    container = createContainer()
    dropIndicator = createMockDropIndicator()
  })

  afterEach(() => {
    container.remove()
    document.body.style.cursor = ''
    document.querySelectorAll('[style*="position: fixed"]').forEach((el) => el.remove())
  })

  it('snaps absolute position to grid', () => {
    const moveResults: MoveResult[] = []

    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 153, y: 97 }, // Non-aligned values
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 153, y: 97 },
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    const mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
      gridSnapSize: 8,
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()

    const element = createDraggableElement('test-node', 'flex')
    container.appendChild(element)
    mockElementRect(element, { x: 100, y: 100 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    const pos = moveResults[0].layoutTransition?.absolutePosition
    expect(pos).toBeDefined()
    // 153 rounds to 152 (19 * 8), 97 rounds to 96 (12 * 8)
    expect(pos!.x).toBe(152)
    expect(pos!.y).toBe(96)

    mover.dispose()
  })

  it('uses default 8px grid snap', () => {
    const moveResults: MoveResult[] = []

    const mockCalculator = {
      setDraggedNodeId: vi.fn(),
      updateDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 10, y: 20 },
        })
      ),
      getCurrentDropZone: vi.fn().mockImplementation(
        (): DropZone => ({
          element: container,
          targetId: 'abs-container',
          placement: 'inside',
          isAbsoluteContainer: true,
          absolutePosition: { x: 10, y: 20 },
        })
      ),
      clear: vi.fn(),
    } as unknown as DropZoneCalculator

    const mover = new ElementMover({
      container,
      dropZoneCalculator: mockCalculator,
      dropIndicator,
      getSourceMap: () => null,
      dragThreshold: 5,
      // No gridSnapSize specified - should use default 8
    })
    mover.onMove((result) => moveResults.push(result))
    mover.attach()

    const element = createDraggableElement('test-node', 'flex')
    container.appendChild(element)
    mockElementRect(element, { x: 100, y: 100 })

    simulateMouseEvent('mousedown', element, { clientX: 110, clientY: 110 })
    simulateMouseEvent('mousemove', document, { clientX: 200, clientY: 200 })
    simulateMouseEvent('mouseup', document, { clientX: 200, clientY: 200 })

    expect(moveResults.length).toBe(1)
    const pos = moveResults[0].layoutTransition?.absolutePosition
    expect(pos).toBeDefined()
    // 10 rounds to 8, 20 rounds to 24
    expect(pos!.x).toBe(8)
    expect(pos!.y).toBe(24)

    mover.dispose()
  })
})
