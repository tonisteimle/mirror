/**
 * GapManager - Gap handles for direct manipulation
 *
 * When G is pressed on a selected container element, shows gap handles
 * between child elements. Dragging these handles adjusts the gap value.
 *
 * Design:
 * - Handles appear BETWEEN children (not at element boundaries)
 * - Only shows when container has 2+ children
 * - Direction-aware: horizontal layout → vertical handles, vertical layout → horizontal handles
 * - Handle: 2px line (visual) with 8px hit area
 * - Gap zones colored with 15% opacity teal
 */

import { OverlayManager } from './overlay-manager'
import { events, getLayoutService } from '../core'
import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'

// Visual constants
const HANDLE_VISUAL_SIZE = 2 // Visible line: 2px
const HANDLE_HIT_AREA = 8 // Clickable area: 8px
const OVERLAY_OPACITY = 0.15 // 15% opacity for gap zones
const HANDLE_COLOR = '#06B6D4' // Teal/Cyan
const HANDLE_HOVER_SIZE = 3 // Hover state: 3px
const GRIP_SIZE = 8 // Square grip indicator size

export interface GapState {
  nodeId: string
  gapIndex: number
  startX: number
  startY: number
  startGap: number
  currentGap: number
  element: HTMLElement
  direction: 'horizontal' | 'vertical'
}

export interface GapManagerConfig {
  container: HTMLElement
  overlayManager: OverlayManager
  getSourceMap: () => { getNodeById: (id: string) => { parentId?: string } | null } | null
}

interface ChildRect {
  element: HTMLElement
  rect: DOMRect
  relRect: { left: number; top: number; width: number; height: number }
}

export class GapManager {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: GapManagerConfig['getSourceMap']

  private handles: HTMLElement[] = []
  private activeDrag: GapState | null = null
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

  constructor(config: GapManagerConfig) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.getSourceMap

    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundRefresh = this.debouncedRefresh.bind(this)

    this.setupEventListeners()
    this.setupObservers()
  }

  // ============================================================================
  // Debounced Refresh (for scroll, resize, mutations)
  // ============================================================================

  private debouncedRefresh(): void {
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

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    // Check if element is a flex/grid container with children
    const style = window.getComputedStyle(element)
    const display = style.display
    if (display !== 'flex' && display !== 'grid' && display !== 'inline-flex') {
      // Not a flex/grid container - don't show gap handles
      return
    }

    // Get children with data-mirror-id (only Mirror elements)
    const children = Array.from(element.children).filter(
      child => child instanceof HTMLElement && child.hasAttribute('data-mirror-id')
    ) as HTMLElement[]

    if (children.length < 2) {
      // Need at least 2 children to show gap handles
      return
    }

    // Start observing the element for layout changes
    this.observeElement(element)

    const containerRect = this.container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    // Determine flex direction
    const flexDirection = style.flexDirection
    const direction: 'horizontal' | 'vertical' =
      flexDirection === 'row' || flexDirection === 'row-reverse' ? 'horizontal' : 'vertical'

    // Get current gap
    let gap = 0
    if (this.activeDrag) {
      gap = this.activeDrag.currentGap
    } else {
      const layoutService = getLayoutService()
      const layout = layoutService?.getLayout(nodeId)
      if (layout) {
        gap = layout.gap
      } else {
        gap = parseInt(style.gap || '0', 10)
      }
    }

    // Calculate child rects
    const childRects: ChildRect[] = children.map(child => {
      const rect = child.getBoundingClientRect()
      return {
        element: child,
        rect,
        relRect: {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
      }
    })

    // Sort children by position
    if (direction === 'horizontal') {
      childRects.sort((a, b) => a.rect.left - b.rect.left)
    } else {
      childRects.sort((a, b) => a.rect.top - b.rect.top)
    }

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()
    this.createGapHandles(handlesContainer, childRects, gap, direction, nodeId, {
      left: elementRect.left - containerRect.left,
      top: elementRect.top - containerRect.top,
      width: elementRect.width,
      height: elementRect.height,
    })
  }

  private createGapHandles(
    container: HTMLElement,
    childRects: ChildRect[],
    gap: number,
    direction: 'horizontal' | 'vertical',
    nodeId: string,
    parentRect: { left: number; top: number; width: number; height: number }
  ): void {
    // Create gap overlays and handles between children
    for (let i = 0; i < childRects.length - 1; i++) {
      const current = childRects[i]
      const next = childRects[i + 1]

      if (direction === 'horizontal') {
        // Gap zone between current.right and next.left
        const gapStart = current.relRect.left + current.relRect.width
        const gapEnd = next.relRect.left
        const gapWidth = gapEnd - gapStart

        // Draw gap overlay
        if (gapWidth > 0) {
          this.createGapOverlay(container, {
            left: gapStart,
            top: parentRect.top,
            width: gapWidth,
            height: parentRect.height,
          })
        }

        // Create vertical handle in the center of the gap
        const handleX = (gapStart + gapEnd) / 2
        this.createHandle(container, {
          gapIndex: i,
          nodeId,
          direction,
          left: handleX,
          top: parentRect.top,
          height: parentRect.height,
          currentGap: gap,
        })
      } else {
        // Gap zone between current.bottom and next.top
        const gapStart = current.relRect.top + current.relRect.height
        const gapEnd = next.relRect.top
        const gapHeight = gapEnd - gapStart

        // Draw gap overlay
        if (gapHeight > 0) {
          this.createGapOverlay(container, {
            left: parentRect.left,
            top: gapStart,
            width: parentRect.width,
            height: gapHeight,
          })
        }

        // Create horizontal handle in the center of the gap
        const handleY = (gapStart + gapEnd) / 2
        this.createHandle(container, {
          gapIndex: i,
          nodeId,
          direction,
          left: parentRect.left,
          top: handleY,
          width: parentRect.width,
          currentGap: gap,
        })
      }
    }
  }

  private createHandle(
    container: HTMLElement,
    options: {
      gapIndex: number
      nodeId: string
      direction: 'horizontal' | 'vertical'
      left: number
      top: number
      width?: number
      height?: number
      currentGap: number
    }
  ): void {
    const color = HANDLE_COLOR
    const handle = document.createElement('div')
    handle.className = `gap-handle gap-handle-${options.gapIndex}`
    handle.dataset.gapIndex = String(options.gapIndex)
    handle.dataset.nodeId = options.nodeId
    handle.dataset.direction = options.direction
    handle.dataset.gap = String(options.currentGap)

    const isHorizontal = options.direction === 'horizontal'
    const hitAreaOffset = (HANDLE_HIT_AREA - HANDLE_VISUAL_SIZE) / 2

    // For horizontal layout: vertical handle (cursor = ew-resize)
    // For vertical layout: horizontal handle (cursor = ns-resize)
    const cursor = isHorizontal ? 'ew-resize' : 'ns-resize'

    Object.assign(handle.style, {
      position: 'absolute',
      left: isHorizontal ? `${options.left - hitAreaOffset}px` : `${options.left}px`,
      top: isHorizontal ? `${options.top}px` : `${options.top - hitAreaOffset}px`,
      width: isHorizontal ? `${HANDLE_HIT_AREA}px` : `${options.width}px`,
      height: isHorizontal ? `${options.height}px` : `${HANDLE_HIT_AREA}px`,
      background: 'transparent',
      cursor,
      pointerEvents: 'auto',
      zIndex: String(Z_INDEX_RESIZE_HANDLES + 1),
      boxSizing: 'border-box',
    })

    // Create the visual line element
    const visualLine = document.createElement('div')
    visualLine.className = 'gap-handle-line'

    Object.assign(visualLine.style, {
      position: 'absolute',
      background: color,
      opacity: '0.8',
      transition: 'opacity 0.15s ease, height 0.1s ease, width 0.1s ease',
      pointerEvents: 'none',
    })

    if (isHorizontal) {
      // Vertical line for horizontal layouts
      Object.assign(visualLine.style, {
        left: `${hitAreaOffset}px`,
        top: '0',
        width: `${HANDLE_VISUAL_SIZE}px`,
        height: '100%',
      })
    } else {
      // Horizontal line for vertical layouts
      Object.assign(visualLine.style, {
        left: '0',
        top: `${hitAreaOffset}px`,
        width: '100%',
        height: `${HANDLE_VISUAL_SIZE}px`,
      })
    }

    handle.appendChild(visualLine)

    // Create the square grip indicator (centered on the line)
    const gripIndicator = document.createElement('div')
    gripIndicator.className = 'gap-handle-grip'

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
        left: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        top: '50%',
        transform: 'translateY(-50%)',
      })
    } else {
      Object.assign(gripIndicator.style, {
        left: '50%',
        top: `${hitAreaOffset - (GRIP_SIZE - HANDLE_VISUAL_SIZE) / 2}px`,
        transform: 'translateX(-50%)',
      })
    }

    handle.appendChild(gripIndicator)

    // Hover effects
    handle.addEventListener('mouseenter', () => {
      visualLine.style.opacity = '1'
      gripIndicator.style.opacity = '1'
      gripIndicator.style.transform = isHorizontal
        ? 'translateY(-50%) scale(1.2)'
        : 'translateX(-50%) scale(1.2)'
      if (isHorizontal) {
        visualLine.style.width = `${HANDLE_HOVER_SIZE}px`
        visualLine.style.left = `${hitAreaOffset - (HANDLE_HOVER_SIZE - HANDLE_VISUAL_SIZE) / 2}px`
      } else {
        visualLine.style.height = `${HANDLE_HOVER_SIZE}px`
        visualLine.style.top = `${hitAreaOffset - (HANDLE_HOVER_SIZE - HANDLE_VISUAL_SIZE) / 2}px`
      }
    })
    handle.addEventListener('mouseleave', () => {
      if (!this.activeDrag) {
        visualLine.style.opacity = '0.8'
        gripIndicator.style.opacity = '0.9'
        gripIndicator.style.transform = isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)'
        if (isHorizontal) {
          visualLine.style.width = `${HANDLE_VISUAL_SIZE}px`
          visualLine.style.left = `${hitAreaOffset}px`
        } else {
          visualLine.style.height = `${HANDLE_VISUAL_SIZE}px`
          visualLine.style.top = `${hitAreaOffset}px`
        }
      }
    })

    container.appendChild(handle)
    this.handles.push(handle)
  }

  private createGapOverlay(
    container: HTMLElement,
    options: {
      left: number
      top: number
      width: number
      height: number
    }
  ): void {
    const overlayColor = `rgba(6, 182, 212, ${OVERLAY_OPACITY})` // Teal

    const area = document.createElement('div')
    area.className = 'gap-area'

    Object.assign(area.style, {
      position: 'absolute',
      left: `${options.left}px`,
      top: `${options.top}px`,
      width: `${options.width}px`,
      height: `${options.height}px`,
      background: overlayColor,
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
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private setupEventListeners(): void {
    this.handlesContainerRef = this.overlayManager.getResizeHandlesContainer()
    this.handlesContainerRef.addEventListener('mousedown', this.boundMouseDown)
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
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
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true,
    })

    // Observe all children for size changes
    for (const child of element.children) {
      if (child instanceof HTMLElement) {
        this.resizeObserver?.observe(child)
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
    const handle = (e.target as HTMLElement).closest('.gap-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const gapIndex = parseInt(handle.dataset.gapIndex || '0', 10)
    const nodeId = handle.dataset.nodeId!
    const direction = handle.dataset.direction as 'horizontal' | 'vertical'
    const startGap = parseInt(handle.dataset.gap || '0', 10)

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    this.activeDrag = {
      nodeId,
      gapIndex,
      startX: e.clientX,
      startY: e.clientY,
      startGap,
      currentGap: startGap,
      element,
      direction,
    }

    // Visual feedback
    document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize'

    events.emit('gap:start', {
      nodeId,
      gapIndex,
      startGap,
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

    const { direction, startX, startY, startGap, element } = this.activeDrag

    // Calculate delta based on direction
    let delta: number
    if (direction === 'horizontal') {
      // Dragging right increases gap
      delta = e.clientX - startX
    } else {
      // Dragging down increases gap
      delta = e.clientY - startY
    }

    // Calculate new gap (minimum 0)
    const newGap = Math.max(0, startGap + delta)
    this.activeDrag.currentGap = newGap

    // Apply gap to element
    element.style.gap = `${newGap}px`

    // Update handle positions
    this.refresh()

    // Show size indicator
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    this.overlayManager.showSizeIndicator(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
      'gap',
      `${newGap}px`
    )

    events.emit('gap:move', {
      nodeId: this.activeDrag.nodeId,
      gap: newGap,
    })
  }

  private onMouseUp(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingMouseEvent = null

    if (!this.activeDrag) return

    const { nodeId, currentGap } = this.activeDrag

    // Reset cursor
    document.body.style.cursor = ''

    // Hide indicator
    this.overlayManager.hideSizeIndicator()

    events.emit('gap:end', {
      nodeId,
      gap: currentGap,
    })

    this.activeDrag = null

    // Refresh handles to show updated positions
    if (this.currentNodeId) {
      this.showHandles(this.currentNodeId)
    }
  }
}

export function createGapManager(config: GapManagerConfig): GapManager {
  return new GapManager(config)
}
