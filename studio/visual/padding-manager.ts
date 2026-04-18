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

// Visual constants
const HANDLE_VISUAL_SIZE = 1 // Visible line: 1px
const HANDLE_HIT_AREA = 8 // Clickable area: 8px
const OVERLAY_OPACITY = 0.4 // 40% opacity for padding zones
const HANDLE_COLOR = '#F59E0B' // Amber
const HANDLE_HOVER_SIZE = 2 // Hover state: 2px
const GRIP_SIZE = 8 // Square grip indicator size

export type PaddingHandle = 'top' | 'right' | 'bottom' | 'left'

export interface PaddingState {
  nodeId: string
  handle: PaddingHandle
  startX: number
  startY: number
  startPadding: number
  currentPadding: number
  element: HTMLElement
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

  constructor(config: PaddingManagerConfig) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.getSourceMap

    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)

    this.setupEventListeners()
  }

  // ============================================================================
  // Public API
  // ============================================================================

  showHandles(nodeId: string): void {
    this.hideHandles()
    this.currentNodeId = nodeId

    const layoutService = getLayoutService()
    const layout = layoutService?.getLayout(nodeId)

    let relRect: { left: number; top: number; width: number; height: number }
    let padding: { top: number; right: number; bottom: number; left: number }

    if (layout) {
      relRect = {
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
      }
      padding = layout.padding
    } else {
      const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (!element) return

      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()
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
    this.pendingMouseEvent = null
    this.hideHandles()
    this.removeEventListeners()
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

  private removeEventListeners(): void {
    if (this.handlesContainerRef) {
      this.handlesContainerRef.removeEventListener('mousedown', this.boundMouseDown)
      this.handlesContainerRef = null
    }
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)
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

    this.activeDrag = {
      nodeId,
      handle: position,
      startX: e.clientX,
      startY: e.clientY,
      startPadding,
      currentPadding: startPadding,
      element,
    }

    // Visual feedback
    document.body.style.cursor =
      position === 'top' || position === 'bottom' ? 'ns-resize' : 'ew-resize'

    events.emit('padding:start', {
      nodeId,
      handle: position,
      startPadding,
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

    const { handle, startX, startY, startPadding, element } = this.activeDrag

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
    const newPadding = Math.max(0, startPadding + delta)
    this.activeDrag.currentPadding = newPadding

    // Live visual feedback - apply padding directly
    const paddingProp = `padding${handle.charAt(0).toUpperCase() + handle.slice(1)}`
    ;(element.style as any)[paddingProp] = `${newPadding}px`

    // Update handle positions
    this.refresh()

    // Show size indicator
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    this.overlayManager.showSizeIndicator(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
      `pad-${handle}`,
      `${newPadding}px`
    )

    events.emit('padding:move', {
      nodeId: this.activeDrag.nodeId,
      handle,
      padding: newPadding,
    })
  }

  private onMouseUp(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingMouseEvent = null

    if (!this.activeDrag) return

    const { nodeId, handle, currentPadding } = this.activeDrag

    // Reset cursor
    document.body.style.cursor = ''

    // Hide indicator
    this.overlayManager.hideSizeIndicator()

    events.emit('padding:end', {
      nodeId,
      handle,
      padding: currentPadding,
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
