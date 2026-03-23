/**
 * Flex Drop Strategy
 *
 * Handles drop behavior for flex containers (HStack, VStack, Box with hor/ver).
 * Elements are inserted as siblings (before/after) or as children (inside).
 */

import type { DropZone, DropPlacement, DropSlot, SemanticZone } from '../drop-zone-calculator'
import type {
  LayoutDropStrategy,
  DropContext,
  FlexDropResult,
  LayoutDropResult,
  IndicatorConfig,
} from './types'
import { detectLayout, isAbsoluteLayoutContainer } from '../utils/layout-detection'

/**
 * Zone boundaries for 9-zone alignment model
 */
const ZONE = {
  THIRD_START: 0.33,
  THIRD_END: 0.66,
} as const

/**
 * Flex layout drop strategy
 */
export class FlexDropStrategy implements LayoutDropStrategy {
  readonly type = 'flex' as const

  /**
   * Check if element is a flex container
   * Uses centralized layout detection for consistency.
   * Matches flex and block layouts (not absolute or grid).
   */
  matches(element: HTMLElement): boolean {
    // Don't handle absolute containers
    if (isAbsoluteLayoutContainer(element)) {
      return false
    }

    const layout = detectLayout(element)
    // Handle flex and block layouts (block is treated as vertical flex)
    return layout.type === 'flex' || layout.type === 'block'
  }

  /**
   * Calculate drop zone for flex container
   */
  calculateDropZone(
    container: HTMLElement,
    context: DropContext
  ): FlexDropResult | null {
    const { clientX, clientY, children, containerRect, sourceNodeId, isRTL = false } = context
    const isHorizontal = this.isHorizontalLayout(container)

    // Calculate effective children (excluding the element being dragged)
    // This handles the case where the only child is being repositioned
    const effectiveChildren = sourceNodeId
      ? children.filter(c => c.nodeId !== sourceNodeId)
      : children

    // Empty container OR only child being moved: use 9-zone model for alignment
    if (effectiveChildren.length === 0) {
      return this.calculateEmptyContainerZone(container, context, isHorizontal, isRTL)
    }

    // Container with other children: calculate insertion slot
    const slot = this.calculateInsertionSlot(
      container,
      children,
      clientX,
      clientY,
      isHorizontal,
      isRTL,
      sourceNodeId
    )

    if (!slot) {
      return null
    }

    const containerId = container.getAttribute('data-mirror-id') || 'root'

    // Determine placement and target based on slot
    let placement: DropPlacement
    let targetId: string
    let siblingId: string | undefined

    if (slot.siblingAfterId && !slot.siblingBeforeId) {
      // Before first child
      placement = 'before'
      targetId = slot.siblingAfterId
      siblingId = slot.siblingAfterId
    } else if (slot.siblingBeforeId && !slot.siblingAfterId) {
      // After last child
      placement = 'after'
      targetId = slot.siblingBeforeId
      siblingId = slot.siblingBeforeId
    } else if (slot.siblingBeforeId && slot.siblingAfterId) {
      // Between children
      placement = 'after'
      targetId = slot.siblingBeforeId
      siblingId = slot.siblingBeforeId
    } else {
      // Fallback: inside container
      placement = 'inside'
      targetId = containerId
    }

    return {
      layoutType: 'flex',
      placement,
      targetId,
      parentId: containerId,
      siblingId,
      insertionIndex: slot.index,
      direction: isHorizontal ? 'horizontal' : 'vertical',
    }
  }

  /**
   * Calculate drop zone for empty container using 9-zone model
   * RTL-aware: flips horizontal alignment for RTL layouts
   * Scale-aware: adjusts padding calculations for CSS transforms
   */
  private calculateEmptyContainerZone(
    container: HTMLElement,
    context: DropContext,
    isHorizontal: boolean,
    isRTL: boolean
  ): FlexDropResult {
    const { clientX, clientY, containerRect, scale = 1 } = context
    const containerId = container.getAttribute('data-mirror-id') || 'root'

    const style = window.getComputedStyle(container)
    // Padding values are in CSS pixels - multiply by scale to get screen pixels
    const paddingLeft = (parseFloat(style.paddingLeft) || 0) * scale
    const paddingTop = (parseFloat(style.paddingTop) || 0) * scale
    const paddingRight = (parseFloat(style.paddingRight) || 0) * scale
    const paddingBottom = (parseFloat(style.paddingBottom) || 0) * scale

    const contentLeft = containerRect.left + paddingLeft
    const contentRight = containerRect.right - paddingRight
    const contentTop = containerRect.top + paddingTop
    const contentBottom = containerRect.bottom - paddingBottom
    const contentWidth = contentRight - contentLeft
    const contentHeight = contentBottom - contentTop

    // For RTL, flip the X coordinate calculation
    const relativeX = isRTL
      ? (contentRight - clientX) / contentWidth
      : (clientX - contentLeft) / contentWidth
    const relativeY = (clientY - contentTop) / contentHeight

    // Determine alignments (RTL already accounted for in relativeX)
    const horizontalAlignment: 'start' | 'center' | 'end' =
      relativeX < ZONE.THIRD_START ? 'start' :
      relativeX > ZONE.THIRD_END ? 'end' : 'center'

    const verticalAlignment: 'start' | 'center' | 'end' =
      relativeY < ZONE.THIRD_START ? 'start' :
      relativeY > ZONE.THIRD_END ? 'end' : 'center'

    return {
      layoutType: 'flex',
      placement: 'inside',
      targetId: containerId,
      parentId: containerId,
      insertionIndex: 0,
      direction: isHorizontal ? 'horizontal' : 'vertical',
      suggestedAlignment: isHorizontal ? horizontalAlignment : verticalAlignment,
      suggestedCrossAlignment: isHorizontal ? verticalAlignment : horizontalAlignment,
    }
  }

  /**
   * Calculate insertion slot between children
   * RTL-aware: for horizontal layouts with RTL, children are visually reversed
   */
  private calculateInsertionSlot(
    container: HTMLElement,
    children: Array<{ element: HTMLElement; nodeId: string }>,
    clientX: number,
    clientY: number,
    isHorizontal: boolean,
    isRTL: boolean,
    excludeNodeId?: string
  ): DropSlot | null {
    const containerRect = container.getBoundingClientRect()

    // Filter out excluded node (for move operations)
    const filteredChildren = excludeNodeId
      ? children.filter(c => c.nodeId !== excludeNodeId)
      : children

    if (filteredChildren.length === 0) {
      return null
    }

    const cursorPos = isHorizontal ? clientX : clientY
    const GAP_OFFSET = 4

    // Get rects for children
    let childRects = filteredChildren.map(({ element, nodeId }) => ({
      element,
      nodeId,
      rect: element.getBoundingClientRect(),
    }))

    // For RTL horizontal layouts, sort children by X position (right to left)
    // This ensures visual order matches DOM order for slot calculation
    if (isHorizontal && isRTL) {
      childRects = childRects.sort((a, b) => b.rect.left - a.rect.left)
    }

    // Calculate slots
    const slots: Array<{
      position: number
      index: number
      beforeChild: typeof childRects[0] | null
      afterChild: typeof childRects[0] | null
    }> = []

    // For RTL horizontal: "first" is rightmost, "last" is leftmost
    const firstChild = childRects[0]
    const lastChild = childRects[childRects.length - 1]

    if (isHorizontal && isRTL) {
      // RTL: Slot before first child (at right edge)
      slots.push({
        position: firstChild.rect.right + GAP_OFFSET,
        index: 0,
        beforeChild: null,
        afterChild: firstChild,
      })

      // Slots between children (right to left)
      for (let i = 0; i < childRects.length - 1; i++) {
        const before = childRects[i]
        const after = childRects[i + 1]
        slots.push({
          position: (before.rect.left + after.rect.right) / 2,
          index: i + 1,
          beforeChild: before,
          afterChild: after,
        })
      }

      // Slot after last child (at left edge)
      slots.push({
        position: lastChild.rect.left - GAP_OFFSET,
        index: childRects.length,
        beforeChild: lastChild,
        afterChild: null,
      })
    } else {
      // LTR or vertical: standard left-to-right / top-to-bottom
      slots.push({
        position: isHorizontal
          ? firstChild.rect.left - GAP_OFFSET
          : firstChild.rect.top - GAP_OFFSET,
        index: 0,
        beforeChild: null,
        afterChild: firstChild,
      })

      for (let i = 0; i < childRects.length - 1; i++) {
        const before = childRects[i]
        const after = childRects[i + 1]
        slots.push({
          position: isHorizontal
            ? (before.rect.right + after.rect.left) / 2
            : (before.rect.bottom + after.rect.top) / 2,
          index: i + 1,
          beforeChild: before,
          afterChild: after,
        })
      }

      slots.push({
        position: isHorizontal
          ? lastChild.rect.right + GAP_OFFSET
          : lastChild.rect.bottom + GAP_OFFSET,
        index: childRects.length,
        beforeChild: lastChild,
        afterChild: null,
      })
    }

    // Find nearest slot
    let nearestSlot = slots[0]
    let minDistance = Math.abs(cursorPos - slots[0].position)

    for (let i = 1; i < slots.length; i++) {
      const distance = Math.abs(cursorPos - slots[i].position)
      if (distance < minDistance) {
        minDistance = distance
        nearestSlot = slots[i]
      }
    }

    return {
      index: nearestSlot.index,
      siblingBeforeId: nearestSlot.beforeChild?.nodeId ?? null,
      siblingAfterId: nearestSlot.afterChild?.nodeId ?? null,
      indicatorPosition: nearestSlot.position,
      siblingBeforeRect: nearestSlot.beforeChild?.rect ?? null,
      siblingAfterRect: nearestSlot.afterChild?.rect ?? null,
    }
  }

  /**
   * Check if element has horizontal layout
   * Uses centralized layout detection for consistency.
   */
  private isHorizontalLayout(element: HTMLElement): boolean {
    return detectLayout(element).direction === 'horizontal'
  }

  /**
   * Get indicator configuration
   */
  getIndicatorConfig(
    result: LayoutDropResult,
    containerRect: DOMRect
  ): IndicatorConfig {
    const flexResult = result as FlexDropResult
    const isHorizontal = flexResult.direction === 'horizontal'

    // For empty containers, show zone indicator with alignment info
    if (result.placement === 'inside' && flexResult.suggestedAlignment) {
      return {
        type: 'zone',
        x: containerRect.left + containerRect.width / 2,
        y: containerRect.top + containerRect.height / 2,
        width: containerRect.width,
        height: containerRect.height,
        alignment: flexResult.suggestedAlignment,
        crossAlignment: flexResult.suggestedCrossAlignment,
        direction: flexResult.direction,
        showDots: true,
      }
    }

    // For sibling insertion, show line
    return {
      type: 'line',
      x: isHorizontal ? containerRect.left : containerRect.left + containerRect.width / 2,
      y: isHorizontal ? containerRect.top + containerRect.height / 2 : containerRect.top,
      width: isHorizontal ? 2 : containerRect.width,
      height: isHorizontal ? containerRect.height : 2,
      showDots: true,
    }
  }

  /**
   * Get insertion properties (flex doesn't add layout properties)
   */
  getInsertionProperties(_result: LayoutDropResult): Record<string, string> {
    return {}
  }

  /**
   * Convert to standard DropZone
   */
  toDropZone(result: LayoutDropResult, element: HTMLElement): DropZone {
    const flexResult = result as FlexDropResult

    // Derive semanticZone from alignment suggestions
    const semanticZone = this.deriveSemanticZone(
      flexResult.suggestedAlignment,
      flexResult.suggestedCrossAlignment,
      flexResult.direction
    )

    return {
      targetId: result.targetId,
      placement: result.placement,
      element,
      parentId: result.parentId,
      siblingId: result.siblingId,
      insertionIndex: result.insertionIndex,
      parentDirection: flexResult.direction,
      suggestedAlignment: flexResult.suggestedAlignment,
      suggestedCrossAlignment: flexResult.suggestedCrossAlignment,
      semanticZone,
      isAbsoluteContainer: false,
    }
  }

  /**
   * Derive semantic zone from alignment suggestions
   * Maps alignment (start/center/end) to zone names (top/center/bottom, left/center/right)
   */
  private deriveSemanticZone(
    mainAlignment?: 'start' | 'center' | 'end',
    crossAlignment?: 'start' | 'center' | 'end',
    direction?: 'horizontal' | 'vertical'
  ): SemanticZone | undefined {
    if (!mainAlignment || !crossAlignment) {
      return undefined
    }

    // For horizontal layouts: main = horizontal, cross = vertical
    // For vertical layouts: main = vertical, cross = horizontal
    const isHorizontal = direction === 'horizontal'
    const horizontalAlign = isHorizontal ? mainAlignment : crossAlignment
    const verticalAlign = isHorizontal ? crossAlignment : mainAlignment

    const verticalMap = { start: 'top', center: 'center', end: 'bottom' } as const
    const horizontalMap = { start: 'left', center: 'center', end: 'right' } as const

    const v = verticalMap[verticalAlign]
    const h = horizontalMap[horizontalAlign]

    // Special case: center-center → just 'center'
    if (v === 'center' && h === 'center') {
      return 'center' as SemanticZone
    }

    return `${v}-${h}` as SemanticZone
  }
}

/**
 * Create flex drop strategy instance
 */
export function createFlexDropStrategy(): FlexDropStrategy {
  return new FlexDropStrategy()
}
