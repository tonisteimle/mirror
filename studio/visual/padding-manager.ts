/**
 * PaddingManager - Inner padding handles for direct manipulation
 *
 * When P is pressed on a selected element, shows 4 padding handles
 * (top, right, bottom, left) inside the element at the padding boundaries.
 * Dragging these handles adjusts the padding value.
 *
 * Design (Figma-style):
 * - Handles are 1px lines (visual) with 8px hit area
 * - Padding zones are colored with 40% opacity amber
 * - Full padding area visible from element edge to handle line
 */

import { OverlayManager } from './overlay-manager'
import { events, getLayoutService } from '../core'
import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'
import { getSnappingService, shouldBypassSnapping, type SnapResult } from './snapping-service'
import { SnapIndicator, createSnapIndicator } from './snap-indicator'

// Visual constants
const HANDLE_VISUAL_SIZE = 1 // Visible line: 1px
const HANDLE_HIT_AREA = 8 // Clickable area: 8px
const OVERLAY_OPACITY = 0.15 // 15% opacity for padding zones
const HANDLE_COLOR = '#F59E0B' // Amber
const HANDLE_HOVER_SIZE = 2 // Hover state: 2px
const GRIP_SIZE = 8 // Square grip indicator size

export type PaddingHandle = 'top' | 'right' | 'bottom' | 'left'
export type PaddingMode = 'single' | 'all' | 'axis' // single side, all sides, or axis (h/v)

export interface PaddingState {
  nodeId: string
  handle: PaddingHandle
  mode: PaddingMode
  startX: number
  startY: number
  startPadding: number
  currentPadding: number
  element: HTMLElement
  // Store all start paddings for multi-side adjustments
  startPaddings: { top: number; right: number; bottom: number; left: number }
  // Last snap result for visual feedback
  lastSnapResult?: SnapResult
}

export interface PaddingManagerConfig {
  container: HTMLElement
  overlayManager: OverlayManager
  getSourceMap: () => { getNodeById: (id: string) => { parentId?: string } | null } | null
}

export class PaddingManager {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: PaddingManagerConfig['getSourceMap']

  private handles: HTMLElement[] = []
  private activeDrag: PaddingState | null = null
  private currentNodeId: string | null = null

  // Cached reference for cleanup
  private handlesContainerRef: HTMLElement | null = null

  // RAF throttling for smooth 60fps drag
  private rafId: number | null = null
  private pendingMouseEvent: MouseEvent | null = null

  // Bound handlers
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundRefresh: () => void

  // Observers for robustness
  private resizeObserver: ResizeObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private scrollUnsubscribe: (() => void) | null = null
  private windowResizeUnsubscribe: (() => void) | null = null

  // Debounce timer for refresh
  private refreshDebounceId: number | null = null

  // Snap indicator for visual feedback
  private snapIndicator: SnapIndicator | null = null

  constructor(config: PaddingManagerConfig) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.getSourceMap

    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundRefresh = this.debouncedRefresh.bind(this)

    this.setupEventListeners()
    this.setupObservers()

    // Initialize snap indicator
    this.snapIndicator = createSnapIndicator({
      container: this.overlayManager.getResizeHandlesContainer(),
    })
  }

  // ============================================================================
  // Debounced Refresh (for scroll, resize, mutations)
  // ============================================================================

  private debouncedRefresh(): void {
    // Don't refresh during active drag (already handled by processMouseMove)
    if (this.activeDrag) return

    if (this.refreshDebounceId !== null) {
      cancelAnimationFrame(this.refreshDebounceId)
    }
    this.refreshDebounceId = requestAnimationFrame(() => {
      this.refreshDebounceId = null
      if (this.currentNodeId) {
        this.showHandles(this.currentNodeId)
      }
    })
  }

  // ============================================================================
  // Public API
  // ============================================================================

  showHandles(nodeId: string): void {
    this.hideHandles()
    this.currentNodeId = nodeId

    // Ensure event listeners are on the current container (handles overlay recreation)
    this.setupEventListeners()

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    // Start observing the element for layout changes
    this.observeElement(element)

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    let relRect: { left: number; top: number; width: number; height: number }
    let padding: { top: number; right: number; bottom: number; left: number }

    // During active drag, ALWAYS use computed styles (includes inline changes)
    // Otherwise we can use LayoutService for better performance
    if (this.activeDrag) {
      const style = window.getComputedStyle(element)
      relRect = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
      padding = {
        top: parseInt(style.paddingTop || '0', 10),
        right: parseInt(style.paddingRight || '0', 10),
        bottom: parseInt(style.paddingBottom || '0', 10),
        left: parseInt(style.paddingLeft || '0', 10),
      }
    } else {
      const layoutService = getLayoutService()
      const layout = layoutService?.getLayout(nodeId)

      if (layout) {
        relRect = {
          left: layout.x,
          top: layout.y,
          width: layout.width,
          height: layout.height,
        }
        padding = layout.padding
      } else {
        const style = window.getComputedStyle(element)
        relRect = {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }
        padding = {
          top: parseInt(style.paddingTop || '0', 10),
          right: parseInt(style.paddingRight || '0', 10),
          bottom: parseInt(style.paddingBottom || '0', 10),
          left: parseInt(style.paddingLeft || '0', 10),
        }
      }
    }

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()
    this.createPaddingHandles(handlesContainer, relRect, padding, nodeId)
  }

  private createPaddingHandles(
    container: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
    padding: { top: number; right: number; bottom: number; left: number },
    nodeId: string
  ): void {
    // Draw padding visualization first (behind handles)
    this.createPaddingOverlay(container, rect, padding)

    // Content area boundaries (inside padding)
    const contentLeft = rect.left + padding.left
    const contentTop = rect.top + padding.top
    const contentWidth = rect.width - padding.left - padding.right
    const contentHeight = rect.height - padding.top - padding.bottom

    // Top handle - horizontal line at top of content area
    this.createHandle(container, {
      position: 'top',
      nodeId,
      left: contentLeft,
      top: contentTop,
      width: contentWidth,
      cursor: 'ns-resize',
      currentPadding: padding.top,
    })

    // Bottom handle - horizontal line at bottom of content area
    this.createHandle(container, {
      position: 'bottom',
      nodeId,
      left: contentLeft,
      top: rect.top + rect.height - padding.bottom,
      width: contentWidth,
      cursor: 'ns-resize',
      currentPadding: padding.bottom,
    })

    // Left handle - vertical line at left of content area
    this.createHandle(container, {
      position: 'left',
      nodeId,
      left: contentLeft,
      top: contentTop,
      height: contentHeight,
      cursor: 'ew-resize',
      currentPadding: padding.left,
    })

    // Right handle - vertical line at right of content area
    this.createHandle(container, {
      position: 'right',
      nodeId,
      left: rect.left + rect.width - padding.right,
      top: contentTop,
      height: contentHeight,
      cursor: 'ew-resize',
      currentPadding: padding.right,
    })
  }

  private createHandle(
    container: HTMLElement,
    options: {
      position: PaddingHandle
      nodeId: string
      left: number
      top: number
      width?: number
      height?: number
      cursor: string
      currentPadding: number
    }
  ): void {
    // Use constants for defaults
    const color = HANDLE_COLOR
    const width = options.width ?? HANDLE_HIT_AREA
    const height = options.height ?? HANDLE_HIT_AREA
    const handle = document.createElement('div')
    handle.className = `padding-handle padding-handle-${options.position}`
    handle.dataset.position = options.position
    handle.dataset.nodeId = options.nodeId
    handle.dataset.padding = String(options.currentPadding)

    const isHorizontal = options.position === 'top' || options.position === 'bottom'
    const hitAreaOffset = (HANDLE_HIT_AREA - HANDLE_VISUAL_SIZE) / 2

    // Position the handle with extended hit area
    // The visual line is centered within the larger clickable area
    Object.assign(handle.style, {
      position: 'absolute',
      // Extend hit area beyond visual bounds
      left: isHorizontal ? `${options.left}px` : `${options.left - hitAreaOffset}px`,
      top: isHorizontal ? `${options.top - hitAreaOffset}px` : `${options.top}px`,
      // Hit area dimensions
      width: isHorizontal ? `${width}px` : `${HANDLE_HIT_AREA}px`,
      height: isHorizontal ? `${HANDLE_HIT_AREA}px` : `${height}px`,
      // Transparent background for hit area, visual line via ::before pseudo-element
      background: 'transparent',
      cursor: options.cursor,
      pointerEvents: 'auto',
      zIndex: String(Z_INDEX_RESIZE_HANDLES + 1),
      boxSizing: 'border-box',
    })

    // Create the visual line element (thin 1px line)
    const visualLine = document.createElement('div')
    visualLine.className = 'padding-handle-line'

    Object.assign(visualLine.style, {
      position: 'absolute',
      background: color,
      opacity: '0.8',
      transition: 'opacity 0.15s ease, height 0.1s ease, width 0.1s ease',
      pointerEvents: 'none',
    })

    if (isHorizontal) {
      // Horizontal line for top/bottom handles
      Object.assign(visualLine.style, {
        left: '0',
        top: `${hitAreaOffset}px`,
        width: '100%',
        height: `${HANDLE_VISUAL_SIZE}px`,
      })
    } else {
      // Vertical line for left/right handles
      Object.assign(visualLine.style, {
        left: `${hitAreaOffset}px`,
        top: '0',
        width: `${HANDLE_VISUAL_SIZE}px`,
        height: '100%',
      })
    }

    handle.appendChild(visualLine)

    // Create the square grip indicator (centered on the line)
    const gripIndicator = document.createElement('div')
    gripIndicator.className = 'padding-handle-grip'

    Object.assign(gripIndicator.style, {
      position: 'absolute',
      width: `${GRIP_SIZE}px`,
      height: `${GRIP_SIZE}px`,
      background: color,
      borderRadius: '1px',
      opacity: '0.9',
      transition: 'opacity 0.15s ease, transform 0.1s ease',
      pointerEvents: 'none',
    })

    if (isHorizontal) {
      // Center horizontally on the line
      Object.assign(gripIndicator.style, {
        left: '50%',
        top: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        transform: 'translateX(-50%)',
      })
    } else {
      // Center vertically on the line
      Object.assign(gripIndicator.style, {
        left: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        top: '50%',
        transform: 'translateY(-50%)',
      })
    }

    handle.appendChild(gripIndicator)

    // Hover effect - thicker line, full opacity, and scale grip
    handle.addEventListener('mouseenter', () => {
      visualLine.style.opacity = '1'
      gripIndicator.style.opacity = '1'
      gripIndicator.style.transform = isHorizontal
        ? 'translateX(-50%) scale(1.2)'
        : 'translateY(-50%) scale(1.2)'
      if (isHorizontal) {
        visualLine.style.height = `${HANDLE_HOVER_SIZE}px`
        visualLine.style.top = `${hitAreaOffset - (HANDLE_HOVER_SIZE - HANDLE_VISUAL_SIZE) / 2}px`
      } else {
        visualLine.style.width = `${HANDLE_HOVER_SIZE}px`
        visualLine.style.left = `${hitAreaOffset - (HANDLE_HOVER_SIZE - HANDLE_VISUAL_SIZE) / 2}px`
      }
    })
    handle.addEventListener('mouseleave', () => {
      if (!this.activeDrag) {
        visualLine.style.opacity = '0.8'
        gripIndicator.style.opacity = '0.9'
        gripIndicator.style.transform = isHorizontal ? 'translateX(-50%)' : 'translateY(-50%)'
        if (isHorizontal) {
          visualLine.style.height = `${HANDLE_VISUAL_SIZE}px`
          visualLine.style.top = `${hitAreaOffset}px`
        } else {
          visualLine.style.width = `${HANDLE_VISUAL_SIZE}px`
          visualLine.style.left = `${hitAreaOffset}px`
        }
      }
    })

    container.appendChild(handle)
    this.handles.push(handle)
  }

  private createPaddingOverlay(
    container: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
    padding: { top: number; right: number; bottom: number; left: number }
  ): void {
    // Use the constant for 40% opacity amber
    const overlayColor = `rgba(245, 158, 11, ${OVERLAY_OPACITY})`

    // Top padding area - full width
    if (padding.top > 0) {
      this.createPaddingArea(container, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: padding.top,
        color: overlayColor,
      })
    }

    // Bottom padding area - full width
    if (padding.bottom > 0) {
      this.createPaddingArea(container, {
        left: rect.left,
        top: rect.top + rect.height - padding.bottom,
        width: rect.width,
        height: padding.bottom,
        color: overlayColor,
      })
    }

    // Left padding area (excluding corners already covered by top/bottom)
    if (padding.left > 0) {
      this.createPaddingArea(container, {
        left: rect.left,
        top: rect.top + padding.top,
        width: padding.left,
        height: rect.height - padding.top - padding.bottom,
        color: overlayColor,
      })
    }

    // Right padding area (excluding corners already covered by top/bottom)
    if (padding.right > 0) {
      this.createPaddingArea(container, {
        left: rect.left + rect.width - padding.right,
        top: rect.top + padding.top,
        width: padding.right,
        height: rect.height - padding.top - padding.bottom,
        color: overlayColor,
      })
    }
  }

  private createPaddingArea(
    container: HTMLElement,
    options: {
      left: number
      top: number
      width: number
      height: number
      color: string
    }
  ): void {
    const area = document.createElement('div')
    area.className = 'padding-area'

    Object.assign(area.style, {
      position: 'absolute',
      left: `${options.left}px`,
      top: `${options.top}px`,
      width: `${options.width}px`,
      height: `${options.height}px`,
      background: options.color,
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_RESIZE_HANDLES - 1),
    })

    container.appendChild(area)
    this.handles.push(area) // Track for cleanup
  }

  hideHandles(): void {
    this.handles.forEach(h => h.remove())
    this.handles = []
    this.currentNodeId = null
    // Stop observing when handles are hidden
    this.unobserveAll()
  }

  refresh(): void {
    if (this.currentNodeId) {
      this.showHandles(this.currentNodeId)
    }
  }

  /**
   * Update handle positions in-place during drag (no remove/recreate)
   * This prevents visual snap-back flickering
   */
  private updateHandlePositionsDuringDrag(): void {
    if (!this.currentNodeId || !this.activeDrag) return

    const element = this.container.querySelector(
      `[data-mirror-id="${this.currentNodeId}"]`
    ) as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    const style = window.getComputedStyle(element)
    const padding = {
      top: parseInt(style.paddingTop || '0', 10),
      right: parseInt(style.paddingRight || '0', 10),
      bottom: parseInt(style.paddingBottom || '0', 10),
      left: parseInt(style.paddingLeft || '0', 10),
    }

    const relRect = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    }

    // Content area boundaries
    const contentLeft = relRect.left + padding.left
    const contentTop = relRect.top + padding.top
    const contentWidth = relRect.width - padding.left - padding.right
    const contentHeight = relRect.height - padding.top - padding.bottom

    const hitAreaOffset = (HANDLE_HIT_AREA - HANDLE_VISUAL_SIZE) / 2

    // Update handle positions
    for (const handle of this.handles) {
      const position = handle.dataset?.position as PaddingHandle | undefined
      if (!position) continue // Skip padding areas

      const isHorizontal = position === 'top' || position === 'bottom'

      if (position === 'top') {
        handle.style.left = `${contentLeft}px`
        handle.style.top = `${contentTop - hitAreaOffset}px`
        handle.style.width = `${contentWidth}px`
      } else if (position === 'bottom') {
        handle.style.left = `${contentLeft}px`
        handle.style.top = `${relRect.top + relRect.height - padding.bottom - hitAreaOffset}px`
        handle.style.width = `${contentWidth}px`
      } else if (position === 'left') {
        handle.style.left = `${contentLeft - hitAreaOffset}px`
        handle.style.top = `${contentTop}px`
        handle.style.height = `${contentHeight}px`
      } else if (position === 'right') {
        handle.style.left = `${relRect.left + relRect.width - padding.right - hitAreaOffset}px`
        handle.style.top = `${contentTop}px`
        handle.style.height = `${contentHeight}px`
      }

      // Update data-padding attribute
      if (position === 'top') handle.dataset.padding = String(padding.top)
      else if (position === 'bottom') handle.dataset.padding = String(padding.bottom)
      else if (position === 'left') handle.dataset.padding = String(padding.left)
      else if (position === 'right') handle.dataset.padding = String(padding.right)
    }

    // Update padding overlay areas
    this.updatePaddingOverlays(relRect, padding)
  }

  /**
   * Update padding overlay areas in-place
   */
  private updatePaddingOverlays(
    rect: { left: number; top: number; width: number; height: number },
    padding: { top: number; right: number; bottom: number; left: number }
  ): void {
    const areas = this.handles.filter(h => h.classList.contains('padding-area'))

    // We have up to 4 areas: top, bottom, left, right (in that creation order)
    let areaIndex = 0

    // Top area
    if (padding.top > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${padding.top}px`,
      })
      areaIndex++
    }

    // Bottom area
    if (padding.bottom > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left}px`,
        top: `${rect.top + rect.height - padding.bottom}px`,
        width: `${rect.width}px`,
        height: `${padding.bottom}px`,
      })
      areaIndex++
    }

    // Left area
    if (padding.left > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left}px`,
        top: `${rect.top + padding.top}px`,
        width: `${padding.left}px`,
        height: `${rect.height - padding.top - padding.bottom}px`,
      })
      areaIndex++
    }

    // Right area
    if (padding.right > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left + rect.width - padding.right}px`,
        top: `${rect.top + padding.top}px`,
        width: `${padding.right}px`,
        height: `${rect.height - padding.top - padding.bottom}px`,
      })
    }
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.refreshDebounceId !== null) {
      cancelAnimationFrame(this.refreshDebounceId)
      this.refreshDebounceId = null
    }
    this.pendingMouseEvent = null
    this.hideHandles()
    this.removeEventListeners()
    this.removeObservers()
    this.snapIndicator?.dispose()
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private setupEventListeners(): void {
    // Get the current handles container
    const currentContainer = this.overlayManager.getResizeHandlesContainer()

    // Only update if container has changed (overlay was recreated)
    if (this.handlesContainerRef !== currentContainer) {
      // Remove old listener if exists
      if (this.handlesContainerRef) {
        this.handlesContainerRef.removeEventListener('mousedown', this.boundMouseDown)
      }
      // Attach to new container
      this.handlesContainerRef = currentContainer
      this.handlesContainerRef.addEventListener('mousedown', this.boundMouseDown)
    }

    // Document listeners only need to be set once (they're on document, which is stable)
    // Check if we've already added them by using a marker
    if (!(this as any)._documentListenersAdded) {
      document.addEventListener('mousemove', this.boundMouseMove)
      document.addEventListener('mouseup', this.boundMouseUp)
      ;(this as any)._documentListenersAdded = true
    }
  }

  private setupObservers(): void {
    // ResizeObserver for element size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.boundRefresh()
    })

    // MutationObserver for DOM changes that might affect layout
    this.mutationObserver = new MutationObserver(mutations => {
      // Only refresh if mutations affect layout (not just text content)
      const hasLayoutMutation = mutations.some(
        m =>
          m.type === 'childList' ||
          (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))
      )
      if (hasLayoutMutation) {
        this.boundRefresh()
      }
    })

    // Scroll listener on container
    const scrollHandler = () => this.boundRefresh()
    this.container.addEventListener('scroll', scrollHandler, { passive: true })
    this.scrollUnsubscribe = () => {
      this.container.removeEventListener('scroll', scrollHandler)
    }

    // Window resize listener
    const resizeHandler = () => this.boundRefresh()
    window.addEventListener('resize', resizeHandler, { passive: true })
    this.windowResizeUnsubscribe = () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }

  private observeElement(element: HTMLElement): void {
    // Observe the element itself for size changes
    this.resizeObserver?.observe(element)

    // Also observe the element itself for style/class changes (e.g., external padding changes)
    this.mutationObserver?.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    // Observe parent for layout changes that might shift the element
    const parent = element.parentElement
    if (parent) {
      this.resizeObserver?.observe(parent)
      // Use subtree: true to catch sibling style changes that might affect our element
      this.mutationObserver?.observe(parent, {
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true, // Observe siblings too
      })

      // Observe all siblings for size changes
      for (const sibling of parent.children) {
        if (sibling !== element && sibling instanceof HTMLElement) {
          this.resizeObserver?.observe(sibling)
        }
      }
    }
  }

  private unobserveAll(): void {
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
  }

  private removeEventListeners(): void {
    if (this.handlesContainerRef) {
      this.handlesContainerRef.removeEventListener('mousedown', this.boundMouseDown)
      this.handlesContainerRef = null
    }
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)
  }

  private removeObservers(): void {
    this.unobserveAll()
    this.scrollUnsubscribe?.()
    this.scrollUnsubscribe = null
    this.windowResizeUnsubscribe?.()
    this.windowResizeUnsubscribe = null
  }

  private onMouseDown(e: MouseEvent): void {
    const handle = (e.target as HTMLElement).closest('.padding-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const position = handle.dataset.position as PaddingHandle
    const nodeId = handle.dataset.nodeId!
    const startPadding = parseInt(handle.dataset.padding || '0', 10)

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    // Detect modifier keys to determine padding mode
    // Shift = all sides, Alt/Option = axis (horizontal or vertical), none = single side
    let mode: PaddingMode = 'single'
    if (e.shiftKey) {
      mode = 'all'
    } else if (e.altKey) {
      mode = 'axis'
    }

    // Get all current paddings from the element
    const style = window.getComputedStyle(element)
    const startPaddings = {
      top: parseInt(style.paddingTop || '0', 10),
      right: parseInt(style.paddingRight || '0', 10),
      bottom: parseInt(style.paddingBottom || '0', 10),
      left: parseInt(style.paddingLeft || '0', 10),
    }

    this.activeDrag = {
      nodeId,
      handle: position,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startPadding,
      currentPadding: startPadding,
      element,
      startPaddings,
    }

    // Visual feedback
    document.body.style.cursor =
      position === 'top' || position === 'bottom' ? 'ns-resize' : 'ew-resize'

    events.emit('padding:start', {
      nodeId,
      handle: position,
      startPadding,
      mode,
    })
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeDrag) return
    this.pendingMouseEvent = e
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        if (this.pendingMouseEvent) {
          this.processMouseMove(this.pendingMouseEvent)
          this.pendingMouseEvent = null
        }
      })
    }
  }

  private processMouseMove(e: MouseEvent): void {
    if (!this.activeDrag) return

    const { handle, mode, startX, startY, startPadding, startPaddings, element } = this.activeDrag

    let delta: number
    if (handle === 'top') {
      delta = e.clientY - startY
    } else if (handle === 'bottom') {
      delta = startY - e.clientY
    } else if (handle === 'left') {
      delta = e.clientX - startX
    } else {
      delta = startX - e.clientX
    }

    // Calculate new padding (clamp to minimum of 0)
    let newPadding = Math.max(0, startPadding + delta)

    // Token snapping (unless Cmd/Ctrl held to bypass)
    let snapResult: SnapResult | undefined
    if (!shouldBypassSnapping(e)) {
      const snappingService = getSnappingService()
      if (snappingService) {
        snapResult = snappingService.snapSpacing(newPadding, 'pad')
        if (snapResult.snapped) {
          newPadding = snapResult.value

          // Show snap indicator
          if (snapResult.tokenName && this.snapIndicator) {
            this.snapIndicator.showTokenSnap(e.clientX, e.clientY, snapResult.tokenName)
          }
        } else {
          // Hide indicator if no snap
          this.snapIndicator?.hide()
        }
      }
    } else {
      // Bypass snapping - hide indicator
      this.snapIndicator?.hide()
    }

    this.activeDrag.currentPadding = newPadding
    this.activeDrag.lastSnapResult = snapResult

    // Live visual feedback - apply padding based on mode
    if (mode === 'all') {
      // Shift: Apply to all sides
      element.style.paddingTop = `${newPadding}px`
      element.style.paddingRight = `${newPadding}px`
      element.style.paddingBottom = `${newPadding}px`
      element.style.paddingLeft = `${newPadding}px`
    } else if (mode === 'axis') {
      // Alt/Option: Apply to axis (horizontal or vertical)
      if (handle === 'top' || handle === 'bottom') {
        // Vertical axis
        element.style.paddingTop = `${newPadding}px`
        element.style.paddingBottom = `${newPadding}px`
      } else {
        // Horizontal axis
        element.style.paddingLeft = `${newPadding}px`
        element.style.paddingRight = `${newPadding}px`
      }
    } else {
      // Single: Apply only to the dragged side
      const paddingProp = `padding${handle.charAt(0).toUpperCase() + handle.slice(1)}`
      ;(element.style as any)[paddingProp] = `${newPadding}px`
    }

    // Update handle positions in-place (no remove/recreate to prevent flicker)
    this.updateHandlePositionsDuringDrag()

    // Show size indicator with mode info
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    let label: string
    if (mode === 'all') {
      label = 'pad'
    } else if (mode === 'axis') {
      label = handle === 'top' || handle === 'bottom' ? 'pad-y' : 'pad-x'
    } else {
      label = `pad-${handle[0]}`
    }

    // Show token name in indicator if snapped
    const valueDisplay = snapResult?.tokenName || `${newPadding}px`
    this.overlayManager.showSizeIndicator(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
      label,
      valueDisplay
    )

    events.emit('padding:move', {
      nodeId: this.activeDrag.nodeId,
      handle,
      mode,
      padding: newPadding,
      tokenName: snapResult?.tokenName,
    })
  }

  private onMouseUp(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingMouseEvent = null

    if (!this.activeDrag) return

    const { nodeId, handle, mode, currentPadding, lastSnapResult } = this.activeDrag

    // Reset cursor
    document.body.style.cursor = ''

    // Hide indicators
    this.overlayManager.hideSizeIndicator()
    this.snapIndicator?.hide()

    events.emit('padding:end', {
      nodeId,
      handle,
      mode,
      padding: currentPadding,
      tokenName: lastSnapResult?.tokenName,
    })

    this.activeDrag = null

    // Refresh handles to show updated positions
    if (this.currentNodeId) {
      this.showHandles(this.currentNodeId)
    }
  }
}

export function createPaddingManager(config: PaddingManagerConfig): PaddingManager {
  return new PaddingManager(config)
}
