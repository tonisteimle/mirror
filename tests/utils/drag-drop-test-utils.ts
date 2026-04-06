/**
 * Drag & Drop Test Utilities
 *
 * Provides helpers for testing drag & drop functionality programmatically,
 * bypassing unreliable browser event simulation.
 */

import type { DragDropSystem } from '../../studio/drag-drop'
import type { DragSource, DropResult, Point, Rect, Size } from '../../studio/drag-drop/types'

/**
 * Test helper class for Drag & Drop operations.
 * Wraps the DragDropSystem's test API with convenient methods.
 */
export class DragDropTestHelper {
  constructor(private system: DragDropSystem) {}

  // ============================================
  // Component Operations
  // ============================================

  /**
   * Insert a new component from the palette.
   *
   * @example
   * helper.insertComponent({
   *   componentName: 'Button',
   *   targetNodeId: '1',
   *   placement: 'inside',
   *   textContent: 'Click me'
   * })
   */
  insertComponent(params: {
    componentName: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    properties?: string
    textContent?: string
  }): { success: boolean; error?: string } {
    return this.system.simulateInsert(params)
  }

  /**
   * Move an existing element to a new position.
   *
   * @example
   * helper.moveElement({
   *   sourceNodeId: '3',
   *   targetNodeId: '1',
   *   placement: 'before'
   * })
   */
  moveElement(params: {
    sourceNodeId: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
  }): { success: boolean; error?: string } {
    return this.system.simulateMove(params)
  }

  /**
   * Low-level drop with full control over DragSource.
   */
  drop(params: {
    source: DragSource
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    insertionIndex?: number
  }): { success: boolean; error?: string } {
    return this.system.simulateDrop(params)
  }

  // ============================================
  // Position Calculation
  // ============================================

  /**
   * Calculate where a drop would land at a specific position.
   * Does NOT execute the drop.
   *
   * @example
   * const result = helper.calculateDropAt(100, 200)
   * expect(result?.placement).toBe('before')
   * expect(result?.targetId).toBe('2')
   */
  calculateDropAt(x: number, y: number): DropResult | null {
    return this.system.simulateDragTo({ x, y })
  }

  /**
   * Calculate drop position relative to an element's bounding box.
   *
   * @example
   * helper.calculateDropRelativeTo('1', { horizontal: 'center', vertical: 'bottom' })
   */
  calculateDropRelativeTo(
    nodeId: string,
    position: {
      horizontal: 'left' | 'center' | 'right'
      vertical: 'top' | 'center' | 'bottom'
    }
  ): DropResult | null {
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) return null

    const rect = element.getBoundingClientRect()
    let x: number
    let y: number

    switch (position.horizontal) {
      case 'left':
        x = rect.left + 5
        break
      case 'center':
        x = rect.left + rect.width / 2
        break
      case 'right':
        x = rect.right - 5
        break
    }

    switch (position.vertical) {
      case 'top':
        y = rect.top + 5
        break
      case 'center':
        y = rect.top + rect.height / 2
        break
      case 'bottom':
        y = rect.bottom - 5
        break
    }

    return this.calculateDropAt(x, y)
  }

  // ============================================
  // State Inspection
  // ============================================

  /**
   * Get current drag state for assertions.
   */
  getDragState() {
    return this.system.getState()
  }

  /**
   * Get visual state (indicator visibility, rects) for assertions.
   */
  getVisualState() {
    return this.system.getVisualState()
  }

  /**
   * Check if the drop indicator is currently visible.
   */
  isIndicatorVisible(): boolean {
    return this.system.getVisualState().indicatorVisible
  }

  /**
   * Get the current indicator position/size.
   */
  getIndicatorRect(): Rect | null {
    return this.system.getVisualState().indicatorRect
  }

  // ============================================
  // Assertions
  // ============================================

  /**
   * Assert that the drop indicator is visible/hidden.
   * @throws Error if assertion fails
   */
  assertIndicatorVisible(expected: boolean): void {
    const state = this.system.getVisualState()
    if (state.indicatorVisible !== expected) {
      throw new Error(
        `Expected indicator to be ${expected ? 'visible' : 'hidden'}, but it was ${state.indicatorVisible ? 'visible' : 'hidden'}`
      )
    }
  }

  /**
   * Assert that the parent outline is visible/hidden.
   * @throws Error if assertion fails
   */
  assertParentOutlineVisible(expected: boolean): void {
    const state = this.system.getVisualState()
    if (state.parentOutlineVisible !== expected) {
      throw new Error(
        `Expected parent outline to be ${expected ? 'visible' : 'hidden'}, but it was ${state.parentOutlineVisible ? 'visible' : 'hidden'}`
      )
    }
  }

  /**
   * Assert a drop at position would result in specific placement.
   * @throws Error if assertion fails
   */
  assertDropPlacement(
    cursor: Point,
    expected: {
      targetId?: string
      placement?: 'before' | 'after' | 'inside'
    }
  ): void {
    const result = this.calculateDropAt(cursor.x, cursor.y)

    if (!result) {
      throw new Error(`No drop result at position (${cursor.x}, ${cursor.y})`)
    }

    if (expected.targetId !== undefined && result.targetId !== expected.targetId) {
      throw new Error(
        `Expected targetId "${expected.targetId}", got "${result.targetId}"`
      )
    }

    if (expected.placement !== undefined && result.placement !== expected.placement) {
      throw new Error(
        `Expected placement "${expected.placement}", got "${result.placement}"`
      )
    }
  }

  // ============================================
  // Absolute Positioning Operations
  // ============================================

  /**
   * Calculate absolute drop position at a specific cursor location.
   * Returns the calculated position within a positioned (stacked) container.
   *
   * @example
   * const result = helper.calculateAbsoluteDropAt('container-1', 250, 180)
   * expect(result?.position?.x).toBe(100)  // relative to container
   * expect(result?.position?.y).toBe(30)
   */
  calculateAbsoluteDropAt(
    containerId: string,
    cursorX: number,
    cursorY: number
  ): DropResult | null {
    const result = this.calculateDropAt(cursorX, cursorY)

    if (!result) return null

    // Verify it's an absolute placement on the expected container
    if (result.placement !== 'absolute' || result.target.nodeId !== containerId) {
      return null
    }

    return result
  }

  /**
   * Insert a component at absolute position in a positioned container.
   *
   * @example
   * helper.insertAtAbsolutePosition({
   *   componentName: 'Frame',
   *   containerId: 'stacked-container',
   *   position: { x: 100, y: 50 },
   *   ghostSize: { width: 80, height: 40 }
   * })
   */
  insertAtAbsolutePosition(params: {
    componentName: string
    containerId: string
    position: Point
    properties?: string
    textContent?: string
    ghostSize?: Size
  }): { success: boolean; error?: string } {
    const { componentName, containerId, position, properties, textContent, ghostSize } = params

    // Find the container element
    const containerElement = document.querySelector(`[data-mirror-id="${containerId}"]`)
    if (!containerElement) {
      return { success: false, error: `Container "${containerId}" not found` }
    }

    // Calculate the cursor position from the container-relative position
    const containerRect = containerElement.getBoundingClientRect()
    const defaultSize = ghostSize ?? { width: 100, height: 40 }

    // Convert from container-relative back to cursor position (center of ghost)
    const cursorX = containerRect.left + position.x + defaultSize.width / 2
    const cursorY = containerRect.top + position.y + defaultSize.height / 2

    // Use simulateDragTo to calculate the drop result
    const result = this.calculateDropAt(cursorX, cursorY)

    if (!result || result.placement !== 'absolute') {
      return { success: false, error: 'Could not calculate absolute drop position' }
    }

    // Create the source and execute
    const source: DragSource = {
      type: 'palette',
      componentName,
      properties,
      textContent,
      size: ghostSize,
    }

    return this.system.simulateDrop({
      source,
      targetNodeId: containerId,
      placement: 'inside', // absolute drops use 'inside' internally
    })
  }

  // ============================================
  // Ghost Indicator Assertions
  // ============================================

  /**
   * Check if the ghost indicator is currently visible.
   */
  isGhostVisible(): boolean {
    return this.system.getVisualState().ghostVisible
  }

  /**
   * Get the current ghost indicator position/size.
   */
  getGhostRect(): Rect | null {
    return this.system.getVisualState().ghostRect
  }

  /**
   * Assert that the ghost indicator is visible/hidden.
   * @throws Error if assertion fails
   */
  assertGhostVisible(expected: boolean): void {
    const state = this.system.getVisualState()
    if (state.ghostVisible !== expected) {
      throw new Error(
        `Expected ghost to be ${expected ? 'visible' : 'hidden'}, but it was ${state.ghostVisible ? 'visible' : 'hidden'}`
      )
    }
  }

  /**
   * Assert that the ghost indicator is at the expected position.
   * @param x Expected x coordinate
   * @param y Expected y coordinate
   * @param tolerance Allowed deviation in pixels (default: 1)
   * @throws Error if assertion fails
   */
  assertGhostPosition(x: number, y: number, tolerance: number = 1): void {
    const state = this.system.getVisualState()

    if (!state.ghostVisible || !state.ghostRect) {
      throw new Error('Expected ghost to be visible, but it was hidden')
    }

    const rect = state.ghostRect
    const dx = Math.abs(rect.x - x)
    const dy = Math.abs(rect.y - y)

    if (dx > tolerance || dy > tolerance) {
      throw new Error(
        `Expected ghost at (${x}, ${y}), but found (${rect.x}, ${rect.y}) (tolerance: ${tolerance})`
      )
    }
  }

  /**
   * Assert that the ghost indicator has the expected size.
   * @param width Expected width
   * @param height Expected height
   * @param tolerance Allowed deviation in pixels (default: 1)
   * @throws Error if assertion fails
   */
  assertGhostSize(width: number, height: number, tolerance: number = 1): void {
    const state = this.system.getVisualState()

    if (!state.ghostVisible || !state.ghostRect) {
      throw new Error('Expected ghost to be visible, but it was hidden')
    }

    const rect = state.ghostRect
    const dw = Math.abs(rect.width - width)
    const dh = Math.abs(rect.height - height)

    if (dw > tolerance || dh > tolerance) {
      throw new Error(
        `Expected ghost size (${width}, ${height}), but found (${rect.width}, ${rect.height}) (tolerance: ${tolerance})`
      )
    }
  }

  // ============================================
  // Positioned Container Helpers
  // ============================================

  /**
   * Create a positioned (stacked) container element in the DOM for testing.
   * Returns the container element.
   *
   * @example
   * const container = helper.createPositionedContainer('stacked-1', {
   *   x: 100, y: 100, width: 400, height: 300
   * })
   */
  createPositionedContainer(
    id: string,
    rect: Rect,
    parent?: HTMLElement
  ): HTMLElement {
    const container = document.createElement('div')
    container.setAttribute('data-mirror-id', id)
    container.style.position = 'relative'
    container.style.left = `${rect.x}px`
    container.style.top = `${rect.y}px`
    container.style.width = `${rect.width}px`
    container.style.height = `${rect.height}px`

    // Add data attribute to indicate positioned layout
    container.setAttribute('data-layout', 'stacked')

    const targetParent = parent ?? document.body
    targetParent.appendChild(container)

    return container
  }

  /**
   * Add a positioned child element to a container.
   *
   * @example
   * helper.addPositionedChild(container, 'child-1', { x: 50, y: 30, width: 100, height: 40 })
   */
  addPositionedChild(
    container: HTMLElement,
    id: string,
    rect: Rect
  ): HTMLElement {
    const child = document.createElement('div')
    child.setAttribute('data-mirror-id', id)
    child.style.position = 'absolute'
    child.style.left = `${rect.x}px`
    child.style.top = `${rect.y}px`
    child.style.width = `${rect.width}px`
    child.style.height = `${rect.height}px`

    container.appendChild(child)
    return child
  }
}

/**
 * Create a DragDropTestHelper from a DragDropSystem instance.
 */
export function createDragDropTestHelper(system: DragDropSystem): DragDropTestHelper {
  return new DragDropTestHelper(system)
}

/**
 * Playwright-specific utilities for E2E tests.
 * These functions are meant to be used within page.evaluate().
 */
export const playwrightHelpers = {
  /**
   * Get the global DragDropSystem from the window object.
   * Use inside page.evaluate().
   */
  getSystem: `() => (window as any).__mirrorDragDrop__`,

  /**
   * Insert a component via the test API.
   * Use inside page.evaluate().
   */
  insertComponent: `(params) => {
    const system = (window as any).__mirrorDragDrop__
    if (!system) return { success: false, error: 'DragDropSystem not available' }
    return system.simulateInsert(params)
  }`,

  /**
   * Move an element via the test API.
   * Use inside page.evaluate().
   */
  moveElement: `(params) => {
    const system = (window as any).__mirrorDragDrop__
    if (!system) return { success: false, error: 'DragDropSystem not available' }
    return system.simulateMove(params)
  }`,

  /**
   * Get visual state via the test API.
   * Use inside page.evaluate().
   */
  getVisualState: `() => {
    const system = (window as any).__mirrorDragDrop__
    if (!system) return null
    return system.getVisualState()
  }`,
}
