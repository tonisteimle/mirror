/**
 * MarginManager - Outer margin handles for direct manipulation
 *
 * When M is pressed on a selected element, shows 4 margin handles
 * (top, right, bottom, left) outside the element at the margin boundaries.
 * Dragging these handles adjusts the margin value.
 *
 * Design (Figma-style):
 * - Handles are 1px lines (visual) with 8px hit area
 * - Margin zones are colored with 15% opacity cyan
 * - Full margin area visible from element edge outward
 */

import { OverlayManager } from './overlay-manager'
import { events, getLayoutService } from '../core'
import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'
import { getSnappingService, shouldBypassSnapping, type SnapResult } from './snapping-service'
import { SnapIndicator, createSnapIndicator } from './snap-indicator'

// Visual constants
const HANDLE_VISUAL_SIZE = 2 // Visible line: 2px (1px is too thin to see)
const HANDLE_HIT_AREA = 8 // Clickable area: 8px
const OVERLAY_OPACITY = 0.15 // 15% opacity for margin zones
const HANDLE_COLOR = '#D946EF' // Magenta/Fuchsia (distinct from padding's amber and selection blue)
const HANDLE_HOVER_SIZE = 3 // Hover state: 3px
const GRIP_SIZE = 8 // Square grip indicator size

export type MarginHandle = 'top' | 'right' | 'bottom' | 'left'
export type MarginMode = 'single' | 'all' | 'axis' // single side, all sides, or axis (h/v)

export interface MarginState {
  nodeId: string
  handle: MarginHandle
  mode: MarginMode
  startX: number
  startY: number
  startMargin: number
  currentMargin: number
  element: HTMLElement
  // Store all start margins for multi-side adjustments
  startMargins: { top: number; right: number; bottom: number; left: number }
  // Last snap result for visual feedback
  lastSnapResult?: SnapResult
}

export interface MarginManagerConfig {
  container: HTMLElement
  overlayManager: OverlayManager
  getSourceMap: () => { getNodeById: (id: string) => { parentId?: string } | null } | null
}

export class MarginManager {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: MarginManagerConfig['getSourceMap']

  private handles: HTMLElement[] = []
  private activeDrag: MarginState | null = null
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

  constructor(config: MarginManagerConfig) {
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
    let margin: { top: number; right: number; bottom: number; left: number }

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
      margin = {
        top: parseInt(style.marginTop || '0', 10),
        right: parseInt(style.marginRight || '0', 10),
        bottom: parseInt(style.marginBottom || '0', 10),
        left: parseInt(style.marginLeft || '0', 10),
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
        margin = layout.margin
      } else {
        const style = window.getComputedStyle(element)
        relRect = {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }
        margin = {
          top: parseInt(style.marginTop || '0', 10),
          right: parseInt(style.marginRight || '0', 10),
          bottom: parseInt(style.marginBottom || '0', 10),
          left: parseInt(style.marginLeft || '0', 10),
        }
      }
    }

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()
    this.createMarginHandles(handlesContainer, relRect, margin, nodeId)
  }

  private createMarginHandles(
    container: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
    margin: { top: number; right: number; bottom: number; left: number },
    nodeId: string
  ): void {
    // Draw margin visualization first (behind handles)
    this.createMarginOverlay(container, rect, margin)

    // Margin handles are OUTSIDE the element
    // Top handle - horizontal line above the element
    this.createHandle(container, {
      position: 'top',
      nodeId,
      left: rect.left - margin.left,
      top: rect.top - margin.top,
      width: rect.width + margin.left + margin.right,
      cursor: 'ns-resize',
      currentMargin: margin.top,
    })

    // Bottom handle - horizontal line below the element
    this.createHandle(container, {
      position: 'bottom',
      nodeId,
      left: rect.left - margin.left,
      top: rect.top + rect.height + margin.bottom,
      width: rect.width + margin.left + margin.right,
      cursor: 'ns-resize',
      currentMargin: margin.bottom,
    })

    // Left handle - vertical line to the left of the element (full height including margins)
    this.createHandle(container, {
      position: 'left',
      nodeId,
      left: rect.left - margin.left,
      top: rect.top - margin.top,
      height: rect.height + margin.top + margin.bottom,
      cursor: 'ew-resize',
      currentMargin: margin.left,
    })

    // Right handle - vertical line to the right of the element (full height including margins)
    this.createHandle(container, {
      position: 'right',
      nodeId,
      left: rect.left + rect.width + margin.right,
      top: rect.top - margin.top,
      height: rect.height + margin.top + margin.bottom,
      cursor: 'ew-resize',
      currentMargin: margin.right,
    })
  }

  private createHandle(
    container: HTMLElement,
    options: {
      position: MarginHandle
      nodeId: string
      left: number
      top: number
      width?: number
      height?: number
      cursor: string
      currentMargin: number
    }
  ): void {
    const color = HANDLE_COLOR
    const width = options.width ?? HANDLE_HIT_AREA
    const height = options.height ?? HANDLE_HIT_AREA
    const handle = document.createElement('div')
    handle.className = `margin-handle margin-handle-${options.position}`
    handle.dataset.position = options.position
    handle.dataset.nodeId = options.nodeId
    handle.dataset.margin = String(options.currentMargin)

    const isHorizontal = options.position === 'top' || options.position === 'bottom'
    const hitAreaOffset = (HANDLE_HIT_AREA - HANDLE_VISUAL_SIZE) / 2

    // Position the handle with extended hit area
    Object.assign(handle.style, {
      position: 'absolute',
      left: isHorizontal ? `${options.left}px` : `${options.left - hitAreaOffset}px`,
      top: isHorizontal ? `${options.top - hitAreaOffset}px` : `${options.top}px`,
      width: isHorizontal ? `${width}px` : `${HANDLE_HIT_AREA}px`,
      height: isHorizontal ? `${HANDLE_HIT_AREA}px` : `${height}px`,
      background: 'transparent',
      cursor: options.cursor,
      pointerEvents: 'auto',
      zIndex: String(Z_INDEX_RESIZE_HANDLES + 1),
      boxSizing: 'border-box',
    })

    // Create the visual line element (thin 1px line)
    const visualLine = document.createElement('div')
    visualLine.className = 'margin-handle-line'

    Object.assign(visualLine.style, {
      position: 'absolute',
      background: color,
      opacity: '0.8',
      transition: 'opacity 0.15s ease, height 0.1s ease, width 0.1s ease',
      pointerEvents: 'none',
    })

    if (isHorizontal) {
      Object.assign(visualLine.style, {
        left: '0',
        top: `${hitAreaOffset}px`,
        width: '100%',
        height: `${HANDLE_VISUAL_SIZE}px`,
      })
    } else {
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
    gripIndicator.className = 'margin-handle-grip'

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
      Object.assign(gripIndicator.style, {
        left: '50%',
        top: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        transform: 'translateX(-50%)',
      })
    } else {
      Object.assign(gripIndicator.style, {
        left: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        top: '50%',
        transform: 'translateY(-50%)',
      })
    }

    handle.appendChild(gripIndicator)

    // Hover effect
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

  private createMarginOverlay(
    container: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
    margin: { top: number; right: number; bottom: number; left: number }
  ): void {
    const overlayColor = `rgba(217, 70, 239, ${OVERLAY_OPACITY})` // Magenta/Fuchsia

    // Top margin area - full width including left/right margins
    if (margin.top > 0) {
      this.createMarginArea(container, {
        left: rect.left - margin.left,
        top: rect.top - margin.top,
        width: rect.width + margin.left + margin.right,
        height: margin.top,
        color: overlayColor,
      })
    }

    // Bottom margin area - full width including left/right margins
    if (margin.bottom > 0) {
      this.createMarginArea(container, {
        left: rect.left - margin.left,
        top: rect.top + rect.height,
        width: rect.width + margin.left + margin.right,
        height: margin.bottom,
        color: overlayColor,
      })
    }

    // Left margin area (excluding corners already covered by top/bottom)
    if (margin.left > 0) {
      this.createMarginArea(container, {
        left: rect.left - margin.left,
        top: rect.top,
        width: margin.left,
        height: rect.height,
        color: overlayColor,
      })
    }

    // Right margin area (excluding corners already covered by top/bottom)
    if (margin.right > 0) {
      this.createMarginArea(container, {
        left: rect.left + rect.width,
        top: rect.top,
        width: margin.right,
        height: rect.height,
        color: overlayColor,
      })
    }
  }

  private createMarginArea(
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
    area.className = 'margin-area'

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
    const margin = {
      top: parseInt(style.marginTop || '0', 10),
      right: parseInt(style.marginRight || '0', 10),
      bottom: parseInt(style.marginBottom || '0', 10),
      left: parseInt(style.marginLeft || '0', 10),
    }

    const relRect = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    }

    const hitAreaOffset = (HANDLE_HIT_AREA - HANDLE_VISUAL_SIZE) / 2

    // Update handle positions (margin handles are OUTSIDE the element)
    for (const handle of this.handles) {
      const position = handle.dataset?.position as MarginHandle | undefined
      if (!position) continue // Skip margin areas

      if (position === 'top') {
        handle.style.left = `${relRect.left - margin.left}px`
        handle.style.top = `${relRect.top - margin.top - hitAreaOffset}px`
        handle.style.width = `${relRect.width + margin.left + margin.right}px`
      } else if (position === 'bottom') {
        handle.style.left = `${relRect.left - margin.left}px`
        handle.style.top = `${relRect.top + relRect.height + margin.bottom - hitAreaOffset}px`
        handle.style.width = `${relRect.width + margin.left + margin.right}px`
      } else if (position === 'left') {
        handle.style.left = `${relRect.left - margin.left - hitAreaOffset}px`
        handle.style.top = `${relRect.top - margin.top}px`
        handle.style.height = `${relRect.height + margin.top + margin.bottom}px`
      } else if (position === 'right') {
        handle.style.left = `${relRect.left + relRect.width + margin.right - hitAreaOffset}px`
        handle.style.top = `${relRect.top - margin.top}px`
        handle.style.height = `${relRect.height + margin.top + margin.bottom}px`
      }

      // Update data-margin attribute
      if (position === 'top') handle.dataset.margin = String(margin.top)
      else if (position === 'bottom') handle.dataset.margin = String(margin.bottom)
      else if (position === 'left') handle.dataset.margin = String(margin.left)
      else if (position === 'right') handle.dataset.margin = String(margin.right)
    }

    // Update margin overlay areas
    this.updateMarginOverlays(relRect, margin)
  }

  /**
   * Update margin overlay areas in-place
   */
  private updateMarginOverlays(
    rect: { left: number; top: number; width: number; height: number },
    margin: { top: number; right: number; bottom: number; left: number }
  ): void {
    const areas = this.handles.filter(h => h.classList.contains('margin-area'))

    // We have up to 4 areas: top, bottom, left, right (in that creation order)
    let areaIndex = 0

    // Top margin area (full width including left/right margins)
    if (margin.top > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left - margin.left}px`,
        top: `${rect.top - margin.top}px`,
        width: `${rect.width + margin.left + margin.right}px`,
        height: `${margin.top}px`,
      })
      areaIndex++
    }

    // Bottom margin area (full width including left/right margins)
    if (margin.bottom > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left - margin.left}px`,
        top: `${rect.top + rect.height}px`,
        width: `${rect.width + margin.left + margin.right}px`,
        height: `${margin.bottom}px`,
      })
      areaIndex++
    }

    // Left margin area (excluding top/bottom corners)
    if (margin.left > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left - margin.left}px`,
        top: `${rect.top}px`,
        width: `${margin.left}px`,
        height: `${rect.height}px`,
      })
      areaIndex++
    }

    // Right margin area (excluding top/bottom corners)
    if (margin.right > 0 && areas[areaIndex]) {
      Object.assign(areas[areaIndex].style, {
        left: `${rect.left + rect.width}px`,
        top: `${rect.top}px`,
        width: `${margin.right}px`,
        height: `${rect.height}px`,
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
    if (!(this as any)._documentListenersAdded) {
      document.addEventListener('mousemove', this.boundMouseMove)
      document.addEventListener('mouseup', this.boundMouseUp)
      ;(this as any)._documentListenersAdded = true
    }
  }

  private setupObservers(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.boundRefresh()
    })

    this.mutationObserver = new MutationObserver(mutations => {
      const hasLayoutMutation = mutations.some(
        m =>
          m.type === 'childList' ||
          (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))
      )
      if (hasLayoutMutation) {
        this.boundRefresh()
      }
    })

    const scrollHandler = () => this.boundRefresh()
    this.container.addEventListener('scroll', scrollHandler, { passive: true })
    this.scrollUnsubscribe = () => {
      this.container.removeEventListener('scroll', scrollHandler)
    }

    const resizeHandler = () => this.boundRefresh()
    window.addEventListener('resize', resizeHandler, { passive: true })
    this.windowResizeUnsubscribe = () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }

  private observeElement(element: HTMLElement): void {
    this.resizeObserver?.observe(element)

    this.mutationObserver?.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    const parent = element.parentElement
    if (parent) {
      this.resizeObserver?.observe(parent)
      this.mutationObserver?.observe(parent, {
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true,
      })

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
    const handle = (e.target as HTMLElement).closest('.margin-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const position = handle.dataset.position as MarginHandle
    const nodeId = handle.dataset.nodeId!
    const startMargin = parseInt(handle.dataset.margin || '0', 10)

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    // Detect modifier keys to determine margin mode
    let mode: MarginMode = 'single'
    if (e.shiftKey) {
      mode = 'all'
    } else if (e.altKey) {
      mode = 'axis'
    }

    const style = window.getComputedStyle(element)
    const startMargins = {
      top: parseInt(style.marginTop || '0', 10),
      right: parseInt(style.marginRight || '0', 10),
      bottom: parseInt(style.marginBottom || '0', 10),
      left: parseInt(style.marginLeft || '0', 10),
    }

    this.activeDrag = {
      nodeId,
      handle: position,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startMargin,
      currentMargin: startMargin,
      element,
      startMargins,
    }

    document.body.style.cursor =
      position === 'top' || position === 'bottom' ? 'ns-resize' : 'ew-resize'

    events.emit('margin:start', {
      nodeId,
      handle: position,
      startMargin,
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

    const { handle, mode, startX, startY, startMargin, element } = this.activeDrag

    // For margin, dragging outward increases margin
    let delta: number
    if (handle === 'top') {
      delta = startY - e.clientY // Dragging up increases top margin
    } else if (handle === 'bottom') {
      delta = e.clientY - startY // Dragging down increases bottom margin
    } else if (handle === 'left') {
      delta = startX - e.clientX // Dragging left increases left margin
    } else {
      delta = e.clientX - startX // Dragging right increases right margin
    }

    let newMargin = Math.max(0, startMargin + delta)

    // Token snapping (unless Cmd/Ctrl held to bypass)
    let snapResult: SnapResult | undefined
    if (!shouldBypassSnapping(e)) {
      const snappingService = getSnappingService()
      if (snappingService) {
        snapResult = snappingService.snapSpacing(newMargin, 'mar')
        if (snapResult.snapped) {
          newMargin = snapResult.value

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

    this.activeDrag.currentMargin = newMargin
    this.activeDrag.lastSnapResult = snapResult

    // Live visual feedback
    if (mode === 'all') {
      element.style.marginTop = `${newMargin}px`
      element.style.marginRight = `${newMargin}px`
      element.style.marginBottom = `${newMargin}px`
      element.style.marginLeft = `${newMargin}px`
    } else if (mode === 'axis') {
      if (handle === 'top' || handle === 'bottom') {
        element.style.marginTop = `${newMargin}px`
        element.style.marginBottom = `${newMargin}px`
      } else {
        element.style.marginLeft = `${newMargin}px`
        element.style.marginRight = `${newMargin}px`
      }
    } else {
      const marginProp = `margin${handle.charAt(0).toUpperCase() + handle.slice(1)}`
      ;(element.style as any)[marginProp] = `${newMargin}px`
    }

    // Update handle positions in-place (no remove/recreate to prevent flicker)
    this.updateHandlePositionsDuringDrag()

    // Show size indicator
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    let label: string
    if (mode === 'all') {
      label = 'mar'
    } else if (mode === 'axis') {
      label = handle === 'top' || handle === 'bottom' ? 'mar-y' : 'mar-x'
    } else {
      label = `mar-${handle[0]}`
    }

    // Show token name in indicator if snapped
    const valueDisplay = snapResult?.tokenName || `${newMargin}px`
    this.overlayManager.showSizeIndicator(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
      label,
      valueDisplay
    )

    events.emit('margin:move', {
      nodeId: this.activeDrag.nodeId,
      handle,
      mode,
      margin: newMargin,
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

    const { nodeId, handle, mode, currentMargin, lastSnapResult } = this.activeDrag

    document.body.style.cursor = ''
    this.overlayManager.hideSizeIndicator()
    this.snapIndicator?.hide()

    events.emit('margin:end', {
      nodeId,
      handle,
      mode,
      margin: currentMargin,
      tokenName: lastSnapResult?.tokenName,
    })

    this.activeDrag = null

    if (this.currentNodeId) {
      this.showHandles(this.currentNodeId)
    }
  }
}

export function createMarginManager(config: MarginManagerConfig): MarginManager {
  return new MarginManager(config)
}
