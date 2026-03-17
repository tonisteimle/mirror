/**
 * ElementMover - Handles element drag operations within the preview
 *
 * Provides a robust move system for elements with crystal-clear drop indication:
 * - Mouse-based grabbing and dragging
 * - Ghost element for visual feedback
 * - Layout-aware drop zone detection (flex vs absolute)
 * - Integration with DropIndicator for visual feedback
 */

import { DropZone, DropZoneCalculator } from '../../src/studio/drop-zone-calculator'
import type { DropIndicator } from './drop-indicator'
import type { SourceMap } from '../../src/studio/source-map'
import { gridSettings } from '../core/settings'
import { GuideCalculator, GuideRenderer } from './smart-guides'
import { isAbsoluteLayoutContainer } from '../../src/studio/utils/layout-detection'

export interface ElementMoverConfig {
  container: HTMLElement
  dropZoneCalculator: DropZoneCalculator
  dropIndicator: DropIndicator
  getSourceMap: () => SourceMap | null
  nodeIdAttribute?: string
  /** Minimum movement before drag starts (pixels) */
  dragThreshold?: number
  /** Grid snap size for absolute containers (pixels) */
  gridSnapSize?: number
}

export interface MoveResult {
  nodeId: string
  dropZone: DropZone
  /** Layout transition info */
  layoutTransition?: {
    from: 'flex' | 'absolute'
    to: 'flex' | 'absolute'
    absolutePosition?: { x: number; y: number }
  }
}

export type MoveCallback = (result: MoveResult) => void

interface DragState {
  nodeId: string
  element: HTMLElement
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
  ghost: HTMLElement | null
  sourceLayoutType: 'flex' | 'absolute'
}

export class ElementMover {
  private config: Required<ElementMoverConfig>
  private state: DragState | null = null
  private moveCallbacks: Set<MoveCallback> = new Set()
  private cancelCallbacks: Set<() => void> = new Set()

  // Bound handlers
  private boundHandleMouseDown: (e: MouseEvent) => void
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: (e: MouseEvent) => void
  private boundHandleKeyDown: (e: KeyboardEvent) => void

  // Smart guides
  private guideCalculator: GuideCalculator
  private guideRenderer: GuideRenderer

  constructor(config: ElementMoverConfig) {
    this.config = {
      container: config.container,
      dropZoneCalculator: config.dropZoneCalculator,
      dropIndicator: config.dropIndicator,
      getSourceMap: config.getSourceMap,
      nodeIdAttribute: config.nodeIdAttribute ?? 'data-mirror-id',
      dragThreshold: config.dragThreshold ?? 5,
      gridSnapSize: config.gridSnapSize ?? 8,
    }

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)

    // Initialize smart guides
    this.guideCalculator = new GuideCalculator()
    this.guideRenderer = new GuideRenderer(config.container)
  }

  /**
   * Attach event listeners to container
   */
  attach(): void {
    this.config.container.addEventListener('mousedown', this.boundHandleMouseDown)
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    this.config.container.removeEventListener('mousedown', this.boundHandleMouseDown)
    this.cleanup()
  }

  /**
   * Start a move operation programmatically
   */
  startMove(nodeId: string, clientX: number, clientY: number): boolean {
    const element = this.getElementByNodeId(nodeId)
    if (!element) return false

    this.initDragState(element, nodeId, clientX, clientY)
    return true
  }

  /**
   * Cancel the current drag operation
   */
  cancelMove(): void {
    if (this.state) {
      // Cleanup first to ensure ghost element is removed
      this.cleanup()
      // Then notify (failures in callbacks shouldn't affect cleanup)
      try {
        this.notifyCancel()
      } catch (error) {
        console.error('[ElementMover] Error in cancel callback:', error)
      }
    }
  }

  /**
   * Register callback for move completion
   */
  onMove(callback: MoveCallback): () => void {
    this.moveCallbacks.add(callback)
    return () => this.moveCallbacks.delete(callback)
  }

  /**
   * Register callback for move cancellation
   */
  onCancel(callback: () => void): () => void {
    this.cancelCallbacks.add(callback)
    return () => this.cancelCallbacks.delete(callback)
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state?.isDragging ?? false
  }

  /**
   * Get the currently dragged node ID
   */
  getDraggedNodeId(): string | null {
    return this.state?.nodeId ?? null
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleMouseDown(e: MouseEvent): void {
    // Only handle left mouse button
    if (e.button !== 0) return

    // Find the element with node ID
    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (!nodeElement) return

    const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
    if (!nodeId) return

    // Initialize drag state (but don't start dragging yet)
    this.initDragState(nodeElement, nodeId, e.clientX, e.clientY)

    // Add global listeners for move/up
    document.addEventListener('mousemove', this.boundHandleMouseMove)
    document.addEventListener('mouseup', this.boundHandleMouseUp)
    document.addEventListener('keydown', this.boundHandleKeyDown)
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.state) return

    this.state.currentX = e.clientX
    this.state.currentY = e.clientY

    // Check if we've exceeded the drag threshold
    if (!this.state.isDragging) {
      const dx = Math.abs(e.clientX - this.state.startX)
      const dy = Math.abs(e.clientY - this.state.startY)

      if (dx >= this.config.dragThreshold || dy >= this.config.dragThreshold) {
        this.startDragging()
      } else {
        return
      }
    }

    // Update ghost position
    this.updateGhostPosition(e.clientX, e.clientY)

    // Update drop zone indicators
    const dropZone = this.config.dropZoneCalculator.updateDropZone(
      e.clientX,
      e.clientY,
      this.state.nodeId
    )

    // Show appropriate visual feedback based on drop zone
    if (dropZone) {
      this.showDropFeedback(dropZone, e.clientX, e.clientY)
    } else {
      this.config.dropIndicator.hideAll()
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.state) return

    try {
      // If we were dragging, complete the move
      if (this.state.isDragging) {
        const dropZone = this.config.dropZoneCalculator.getCurrentDropZone()

        if (dropZone) {
          this.completeMove(dropZone)
        }
      }
    } catch (error) {
      console.error('[ElementMover] Error completing move:', error)
    } finally {
      // Always cleanup to ensure ghost element is removed
      this.cleanup()
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancelMove()
    }
  }

  private initDragState(element: HTMLElement, nodeId: string, clientX: number, clientY: number): void {
    // Determine source layout type
    const sourceLayoutType = this.getElementLayoutType(element)

    this.state = {
      nodeId,
      element,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isDragging: false,
      ghost: null,
      sourceLayoutType,
    }
  }

  private startDragging(): void {
    if (!this.state) return

    this.state.isDragging = true

    // Create ghost element
    this.state.ghost = this.createGhost(this.state.element)
    this.updateGhostPosition(this.state.currentX, this.state.currentY)

    // Style the original element
    this.state.element.style.opacity = '0.4'
    this.state.element.style.outline = '2px dashed #3B82F6'

    // Set cursor
    document.body.style.cursor = 'grabbing'
  }

  private createGhost(element: HTMLElement): HTMLElement {
    const ghost = element.cloneNode(true) as HTMLElement
    const rect = element.getBoundingClientRect()

    // Reset any selection-related styles
    ghost.classList.remove('studio-selected', 'studio-hover', 'studio-multi-selected')

    // Style as ghost
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
      opacity: '0.7',
      zIndex: '10001',
      transform: 'translate(0, 0)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderRadius: '4px',
    })

    document.body.appendChild(ghost)
    return ghost
  }

  private updateGhostPosition(clientX: number, clientY: number): void {
    if (!this.state?.ghost) return

    const rect = this.state.element.getBoundingClientRect()
    const offsetX = clientX - this.state.startX
    const offsetY = clientY - this.state.startY

    // Position ghost at original position + offset
    const ghostX = rect.left + offsetX
    const ghostY = rect.top + offsetY

    this.state.ghost.style.transform = `translate(${ghostX}px, ${ghostY}px)`
  }

  private showDropFeedback(dropZone: DropZone, clientX: number, clientY: number): void {
    const indicator = this.config.dropIndicator

    // Determine target layout type
    const targetLayoutType = dropZone.isAbsoluteContainer ? 'absolute' : 'flex'

    if (dropZone.isAbsoluteContainer && dropZone.absolutePosition) {
      // Absolute container: show crosshair + coordinates
      const containerRect = dropZone.element.getBoundingClientRect()
      const grid = gridSettings.get()

      let finalX = dropZone.absolutePosition.x
      let finalY = dropZone.absolutePosition.y

      // Use smart guides if grid snap is disabled
      if (!grid.enabled && this.state) {
        const siblings = this.getSiblingRects(dropZone.element, this.state.nodeId)
        const movingRect = this.state.ghost?.getBoundingClientRect() || this.state.element.getBoundingClientRect()

        const snapResult = this.guideCalculator.calculate(movingRect, siblings, containerRect)

        // Show smart guides
        if (snapResult.guides.length > 0) {
          this.guideRenderer.render(snapResult.guides)
        } else {
          this.guideRenderer.clear()
        }

        // Use snapped position if guides were found
        if (snapResult.snappedX || snapResult.snappedY) {
          finalX = snapResult.snappedX ? snapResult.x : finalX
          finalY = snapResult.snappedY ? snapResult.y : finalY
        }
      } else {
        // Grid snap is enabled, clear any smart guides
        this.guideRenderer.clear()
        const snapped = this.snapToGrid(finalX, finalY)
        finalX = snapped.x
        finalY = snapped.y
      }

      indicator.showCrosshair(finalX, finalY, containerRect)
      indicator.showPositionLabel(finalX, finalY)
    } else if (dropZone.placement === 'inside') {
      // Container highlight for reparenting
      this.guideRenderer.clear()
      indicator.showContainerHighlight(dropZone.element)
    } else {
      // Flex container: show insertion line between siblings
      this.guideRenderer.clear()
      const isHorizontal = this.isHorizontalLayout(dropZone.element.parentElement)
      indicator.showInsertionLine(
        dropZone.element.getBoundingClientRect(),
        dropZone.placement,
        isHorizontal ? 'vertical' : 'horizontal'
      )
    }
  }

  /**
   * Get bounding rects of sibling elements
   */
  private getSiblingRects(container: HTMLElement, excludeNodeId: string): Map<string, DOMRect> {
    const siblings = new Map<string, DOMRect>()
    const children = container.querySelectorAll(`[${this.config.nodeIdAttribute}]`)

    for (const child of children) {
      const nodeId = child.getAttribute(this.config.nodeIdAttribute)
      if (nodeId && nodeId !== excludeNodeId) {
        siblings.set(nodeId, (child as HTMLElement).getBoundingClientRect())
      }
    }

    return siblings
  }

  private completeMove(dropZone: DropZone): void {
    if (!this.state) return

    const targetLayoutType = dropZone.isAbsoluteContainer ? 'absolute' : 'flex'

    // Determine if there's a layout transition
    let layoutTransition: MoveResult['layoutTransition'] | undefined

    if (this.state.sourceLayoutType !== targetLayoutType) {
      layoutTransition = {
        from: this.state.sourceLayoutType,
        to: targetLayoutType,
      }

      if (targetLayoutType === 'absolute' && dropZone.absolutePosition) {
        layoutTransition.absolutePosition = this.snapToGrid(
          dropZone.absolutePosition.x,
          dropZone.absolutePosition.y
        )
      }
    } else if (targetLayoutType === 'absolute' && dropZone.absolutePosition) {
      // Same layout type but updating position
      layoutTransition = {
        from: 'absolute',
        to: 'absolute',
        absolutePosition: this.snapToGrid(
          dropZone.absolutePosition.x,
          dropZone.absolutePosition.y
        )
      }
    }

    const result: MoveResult = {
      nodeId: this.state.nodeId,
      dropZone,
      layoutTransition,
    }

    // Notify listeners
    for (const callback of this.moveCallbacks) {
      try {
        callback(result)
      } catch (error) {
        console.error('[ElementMover] Move callback error:', error)
      }
    }
  }

  private cleanup(): void {
    // Always clear drop indicators and smart guides (even if no active drag state)
    this.config.dropZoneCalculator.clear()
    this.config.dropIndicator.hideAll()
    this.guideRenderer.clear()

    // Always remove global listeners (safe to call even if not attached)
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
    document.removeEventListener('keydown', this.boundHandleKeyDown)

    // Reset cursor
    document.body.style.cursor = ''

    if (!this.state) return

    // Remove ghost
    if (this.state.ghost) {
      this.state.ghost.remove()
    }

    // Restore original element styles
    this.state.element.style.opacity = ''
    this.state.element.style.outline = ''

    this.state = null
  }

  private notifyCancel(): void {
    for (const callback of this.cancelCallbacks) {
      try {
        callback()
      } catch (error) {
        console.error('[ElementMover] Cancel callback error:', error)
      }
    }
  }

  private snapToGrid(x: number, y: number): { x: number; y: number } {
    // Use grid settings, fall back to config if not enabled
    const grid = gridSettings.get()

    // If grid snap is disabled, return unmodified position
    if (!grid.enabled) {
      return { x, y }
    }

    // Use settings grid size, or fall back to config
    const gridSize = grid.size || this.config.gridSnapSize
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    }
  }

  private getElementLayoutType(element: HTMLElement): 'flex' | 'absolute' {
    // Check if element is in an absolute container
    const parent = element.parentElement
    if (!parent) return 'flex'

    // Use centralized layout detection for consistency
    if (isAbsoluteLayoutContainer(parent)) {
      return 'absolute'
    }

    // Also check if element itself has absolute positioning
    const style = window.getComputedStyle(element)
    if (style.position === 'absolute') {
      return 'absolute'
    }

    return 'flex'
  }

  private isHorizontalLayout(element: HTMLElement | null): boolean {
    if (!element) return false

    const style = window.getComputedStyle(element)
    const display = style.display
    const flexDirection = style.flexDirection

    if (display === 'flex' || display === 'inline-flex') {
      return flexDirection === 'row' || flexDirection === 'row-reverse'
    }

    // Check data-layout attribute
    return element.dataset.layout === 'hor' || element.dataset.layout === 'horizontal'
  }

  private getElementByNodeId(nodeId: string): HTMLElement | null {
    return this.config.container.querySelector(
      `[${this.config.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
  }

  /**
   * Dispose the mover
   */
  dispose(): void {
    this.detach()
    this.moveCallbacks.clear()
    this.cancelCallbacks.clear()
    this.guideRenderer.dispose()
  }
}

export function createElementMover(config: ElementMoverConfig): ElementMover {
  return new ElementMover(config)
}
