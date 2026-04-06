/**
 * Drag & Drop Test Utilities
 *
 * Provides helpers for testing drag & drop functionality programmatically,
 * bypassing unreliable browser event simulation.
 */

import type { DragDropSystem } from '../../studio/drag-drop'
import type { DragSource, DropResult, Point, Rect } from '../../studio/drag-drop/types'

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
