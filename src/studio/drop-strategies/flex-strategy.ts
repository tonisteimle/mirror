/**
 * Flex Drop Strategy
 *
 * Handles drop behavior for flex containers (HStack, VStack, Box with hor/ver).
 * Elements are inserted as siblings (before/after) or as children (inside).
 */

import type { DropZone, DropPlacement, DropSlot } from '../drop-zone-calculator'
import type {
  LayoutDropStrategy,
  DropContext,
  FlexDropResult,
  LayoutDropResult,
  IndicatorConfig,
} from './types'

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
   */
  matches(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    const display = style.display

    // Standard flex
    if (display === 'flex' || display === 'inline-flex') {
      return true
    }

    // Mirror-specific layouts that compile to flex
    const layout = element.dataset.layout
    if (layout === 'hor' || layout === 'ver' || layout === 'horizontal' || layout === 'vertical') {
      return true
    }

    // Default block layout is treated as vertical flex
    if (display === 'block' || display === 'inline-block') {
      return true
    }

    return false
  }

  /**
   * Calculate drop zone for flex container
   */
  calculateDropZone(
    container: HTMLElement,
    context: DropContext
  ): FlexDropResult | null {
    const { clientX, clientY, children, containerRect, sourceNodeId } = context
    const isHorizontal = this.isHorizontalLayout(container)

    // Empty container: use 9-zone model for alignment
    if (children.length === 0) {
      return this.calculateEmptyContainerZone(container, context, isHorizontal)
    }

    // Container with children: calculate insertion slot
    const slot = this.calculateInsertionSlot(
      container,
      children,
      clientX,
      clientY,
      isHorizontal,
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
   */
  private calculateEmptyContainerZone(
    container: HTMLElement,
    context: DropContext,
    isHorizontal: boolean
  ): FlexDropResult {
    const { clientX, clientY, containerRect } = context
    const containerId = container.getAttribute('data-mirror-id') || 'root'

    const style = window.getComputedStyle(container)
    const paddingLeft = parseFloat(style.paddingLeft) || 0
    const paddingTop = parseFloat(style.paddingTop) || 0
    const paddingRight = parseFloat(style.paddingRight) || 0
    const paddingBottom = parseFloat(style.paddingBottom) || 0

    const contentLeft = containerRect.left + paddingLeft
    const contentRight = containerRect.right - paddingRight
    const contentTop = containerRect.top + paddingTop
    const contentBottom = containerRect.bottom - paddingBottom
    const contentWidth = contentRight - contentLeft
    const contentHeight = contentBottom - contentTop

    const relativeX = (clientX - contentLeft) / contentWidth
    const relativeY = (clientY - contentTop) / contentHeight

    // Determine alignments
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
   */
  private calculateInsertionSlot(
    container: HTMLElement,
    children: Array<{ element: HTMLElement; nodeId: string }>,
    clientX: number,
    clientY: number,
    isHorizontal: boolean,
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
    const childRects = filteredChildren.map(({ element, nodeId }) => ({
      element,
      nodeId,
      rect: element.getBoundingClientRect(),
    }))

    // Calculate slots
    const slots: Array<{
      position: number
      index: number
      beforeChild: typeof childRects[0] | null
      afterChild: typeof childRects[0] | null
    }> = []

    // Slot before first child
    const firstChild = childRects[0]
    slots.push({
      position: isHorizontal
        ? firstChild.rect.left - GAP_OFFSET
        : firstChild.rect.top - GAP_OFFSET,
      index: 0,
      beforeChild: null,
      afterChild: firstChild,
    })

    // Slots between children
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

    // Slot after last child
    const lastChild = childRects[childRects.length - 1]
    slots.push({
      position: isHorizontal
        ? lastChild.rect.right + GAP_OFFSET
        : lastChild.rect.bottom + GAP_OFFSET,
      index: childRects.length,
      beforeChild: lastChild,
      afterChild: null,
    })

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
   */
  private isHorizontalLayout(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    const display = style.display
    const flexDirection = style.flexDirection

    if (display === 'flex' || display === 'inline-flex') {
      return flexDirection === 'row' || flexDirection === 'row-reverse'
    }

    // Mirror-specific
    const layout = element.dataset.layout
    if (layout === 'hor' || layout === 'horizontal') {
      return true
    }

    return false
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

    // For empty containers, show zone indicator
    if (result.placement === 'inside' && flexResult.suggestedAlignment) {
      return {
        type: 'zone',
        x: containerRect.left + containerRect.width / 2,
        y: containerRect.top + containerRect.height / 2,
        width: containerRect.width,
        height: containerRect.height,
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
    }
  }
}

/**
 * Create flex drop strategy instance
 */
export function createFlexDropStrategy(): FlexDropStrategy {
  return new FlexDropStrategy()
}
