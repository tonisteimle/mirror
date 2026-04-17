/**
 * ResizeManager - 8-Punkt Resize mit Sizing-Modus-Erkennung
 *
 * Zeigt 8 Resize-Handles (nw, n, ne, e, se, s, sw, w) für das selektierte Element.
 * Beim Drag wird die Größe berechnet und fill/hug/px automatisch erkannt.
 */

import { OverlayManager } from './overlay-manager'
import { events, getLayoutService } from '../core'
import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'
import { MIN_RESIZE_SIZE, DEFAULT_CONTAINER_SIZE } from './constants/sizing'
import {
  calculateBoundingBox,
  calculateResizedPositions,
  type BoundingBox,
  type Rect,
} from '../preview/multi-selection-bounds'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** 8 handle positions around a rectangle (shared constant to avoid duplication) */
const HANDLE_POSITIONS: ReadonlyArray<{ pos: ResizeHandle; x: number; y: number }> = [
  { pos: 'nw', x: 0, y: 0 },
  { pos: 'n', x: 0.5, y: 0 },
  { pos: 'ne', x: 1, y: 0 },
  { pos: 'e', x: 1, y: 0.5 },
  { pos: 'se', x: 1, y: 1 },
  { pos: 's', x: 0.5, y: 1 },
  { pos: 'sw', x: 0, y: 1 },
  { pos: 'w', x: 0, y: 0.5 },
] as const

/** Position lookup map for O(1) access (derived from HANDLE_POSITIONS) */
const HANDLE_POSITION_MAP: Record<ResizeHandle, { x: number; y: number }> = Object.fromEntries(
  HANDLE_POSITIONS.map(({ pos, x, y }) => [pos, { x, y }])
) as Record<ResizeHandle, { x: number; y: number }>

export type SizingMode = 'fill' | 'hug' | number

export interface ResizeState {
  nodeId: string
  handle: ResizeHandle
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startLeft: number
  startTop: number
  currentWidth: SizingMode
  currentHeight: SizingMode
  currentLeft: number
  currentTop: number
  isAbsolute: boolean
  element: HTMLElement
}

export interface MultiResizeState {
  nodeIds: string[]
  handle: ResizeHandle
  startX: number
  startY: number
  boundingBox: BoundingBox
  currentWidth: number
  currentHeight: number
}

export interface ResizeManagerConfig {
  container: HTMLElement
  overlayManager: OverlayManager
  getSourceMap: () => { getNodeById: (id: string) => { parentId?: string } | null } | null
}

export class ResizeManager {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private getSourceMap: ResizeManagerConfig['getSourceMap']

  private handles: HTMLElement[] = []
  private activeResize: ResizeState | null = null
  private activeMultiResize: MultiResizeState | null = null
  private currentNodeId: string | null = null
  private currentNodeIds: string[] = []

  // Cached reference to prevent memory leaks on dispose
  private handlesContainerRef: HTMLElement | null = null

  // RAF throttling for smooth 60fps resize
  private rafId: number | null = null
  private pendingMouseEvent: MouseEvent | null = null

  // Bound handlers
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundDoubleClick: (e: MouseEvent) => void

  constructor(config: ResizeManagerConfig) {
    this.container = config.container
    this.overlayManager = config.overlayManager
    this.getSourceMap = config.getSourceMap

    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundDoubleClick = this.onDoubleClick.bind(this)

    this.setupEventListeners()
  }

  // ============================================================================
  // Public API
  // ============================================================================

  showHandles(nodeId: string): void {
    this.hideHandles()
    this.currentNodeId = nodeId

    // Use LayoutService for unified layout access (cache-first, DOM-fallback)
    const layoutService = getLayoutService()
    const layout = layoutService?.getLayout(nodeId)

    let relRect: { left: number; top: number; width: number; height: number }

    if (layout) {
      // Use layout from service (either cached or freshly read from DOM)
      relRect = {
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
      }
    } else {
      // Ultimate fallback if LayoutService not available
      const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (!element) return

      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()

      relRect = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
    }

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()

    // Create handles using shared helper
    this.createHandlesForRect(handlesContainer, relRect, { nodeId, borderColor: '#5BA8F5' })
  }

  /**
   * Create resize handles around a rectangle
   * Extracted to avoid duplication between showHandles() and showMultiHandles()
   */
  private createHandlesForRect(
    container: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
    options: {
      nodeId?: string
      nodeIds?: string[]
      borderColor?: string
      isMulti?: boolean
    }
  ): void {
    const borderColor = options.borderColor || '#5BA8F5'

    for (const { pos, x, y } of HANDLE_POSITIONS) {
      const handle = document.createElement('div')
      handle.className = `resize-handle resize-handle-${pos}${options.isMulti ? ' resize-handle-multi' : ''}`
      handle.dataset.position = pos

      if (options.nodeId) {
        handle.dataset.nodeId = options.nodeId
      }
      if (options.nodeIds) {
        handle.dataset.nodeIds = JSON.stringify(options.nodeIds)
        handle.dataset.isMulti = 'true'
      }

      Object.assign(handle.style, {
        position: 'absolute',
        left: `${rect.left + rect.width * x - 4}px`,
        top: `${rect.top + rect.height * y - 4}px`,
        width: '8px',
        height: '8px',
        background: 'white',
        border: `2px solid ${borderColor}`,
        borderRadius: '50%',
        cursor: this.getCursor(pos),
        pointerEvents: 'auto',
        zIndex: String(Z_INDEX_RESIZE_HANDLES),
        boxSizing: 'border-box',
      })

      container.appendChild(handle)
      this.handles.push(handle)
    }
  }

  /**
   * Show resize handles around the combined bounding box of multiple selected elements.
   * Feature 4: Multi-Element Manipulation
   */
  showMultiHandles(nodeIds: string[]): void {
    if (nodeIds.length === 0) return

    // For single element, delegate to showHandles
    if (nodeIds.length === 1) {
      this.showHandles(nodeIds[0])
      return
    }

    this.hideHandles()
    this.currentNodeIds = nodeIds
    this.currentNodeId = null

    // Calculate combined bounding box
    const boundingBox = this.calculateMultiSelectionBounds(nodeIds)
    if (!boundingBox) return

    const handlesContainer = this.overlayManager.getResizeHandlesContainer()

    // Create handles using shared helper
    this.createHandlesForRect(
      handlesContainer,
      {
        left: boundingBox.x,
        top: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
      { nodeIds, borderColor: '#10B981', isMulti: true }
    )

    // Draw bounding box outline
    this.drawMultiSelectionOutline(boundingBox)
  }

  private calculateMultiSelectionBounds(nodeIds: string[]): BoundingBox | null {
    const layoutService = getLayoutService()

    const getRect = (nodeId: string): Rect | null => {
      // Try LayoutService first (cache-first, DOM-fallback)
      const layout = layoutService?.getLayout(nodeId)
      if (layout) {
        return {
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height,
        }
      }

      // Ultimate fallback if LayoutService not available
      const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (!element) return null

      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()

      return {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
    }

    return calculateBoundingBox(nodeIds, getRect)
  }

  private drawMultiSelectionOutline(boundingBox: BoundingBox): void {
    const handlesContainer = this.overlayManager.getResizeHandlesContainer()

    const outline = document.createElement('div')
    outline.className = 'multi-selection-outline'
    Object.assign(outline.style, {
      position: 'absolute',
      left: `${boundingBox.x}px`,
      top: `${boundingBox.y}px`,
      width: `${boundingBox.width}px`,
      height: `${boundingBox.height}px`,
      border: '1px dashed #10B981',
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_RESIZE_HANDLES - 1),
      boxSizing: 'border-box',
    })
    handlesContainer.appendChild(outline)
    this.handles.push(outline) // Track so it gets removed with hideHandles
  }

  hideHandles(): void {
    this.handles.forEach(h => h.remove())
    this.handles = []
    this.currentNodeId = null
    this.currentNodeIds = []
  }

  refresh(): void {
    if (this.currentNodeIds.length > 1) {
      this.showMultiHandles(this.currentNodeIds)
    } else if (this.currentNodeId) {
      this.showHandles(this.currentNodeId)
    }
  }

  dispose(): void {
    // Cancel any pending RAF
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
    // Cache container reference to ensure we remove from same element on dispose
    this.handlesContainerRef = this.overlayManager.getResizeHandlesContainer()
    this.handlesContainerRef.addEventListener('mousedown', this.boundMouseDown)
    this.handlesContainerRef.addEventListener('dblclick', this.boundDoubleClick)
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  private removeEventListeners(): void {
    // Use cached reference to avoid memory leak if overlay was recreated
    if (this.handlesContainerRef) {
      this.handlesContainerRef.removeEventListener('mousedown', this.boundMouseDown)
      this.handlesContainerRef.removeEventListener('dblclick', this.boundDoubleClick)
      this.handlesContainerRef = null
    }
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)
  }

  private onMouseDown(e: MouseEvent): void {
    const handle = (e.target as HTMLElement).closest('.resize-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const position = handle.dataset.position as ResizeHandle

    // Check if this is a multi-selection resize
    if (handle.dataset.isMulti === 'true') {
      this.startMultiResize(e, handle, position)
      return
    }

    const nodeId = handle.dataset.nodeId!
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    // Use LayoutService for unified layout access (cache-first, DOM-fallback)
    const layoutService = getLayoutService()
    const layout = layoutService?.getLayout(nodeId)

    let startWidth: number
    let startHeight: number
    let startLeft: number
    let startTop: number
    let isAbsolute: boolean

    if (layout) {
      // Use layout from service (either cached or freshly read from DOM)
      startWidth = layout.width
      startHeight = layout.height
      startLeft = layout.x
      startTop = layout.y
      isAbsolute = layout.isAbsolute
    } else {
      // Ultimate fallback if LayoutService not available
      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      startWidth = rect.width
      startHeight = rect.height
      isAbsolute = computedStyle.position === 'absolute'
      startLeft = parseFloat(computedStyle.left) || rect.left - containerRect.left
      startTop = parseFloat(computedStyle.top) || rect.top - containerRect.top
    }

    this.activeResize = {
      nodeId,
      handle: position,
      startX: e.clientX,
      startY: e.clientY,
      startWidth,
      startHeight,
      startLeft,
      startTop,
      currentWidth: startWidth,
      currentHeight: startHeight,
      currentLeft: startLeft,
      currentTop: startTop,
      isAbsolute,
      element,
    }

    // Visual Feedback: Body Cursor ändern
    document.body.style.cursor = this.getCursor(position)

    events.emit('resize:start', {
      nodeId,
      handle: position,
      startWidth,
      startHeight,
    })
  }

  /**
   * Double-click on resize handle sets dimension to full
   * - n/s handles: set height to full
   * - e/w handles: set width to full
   * - corner handles (nw/ne/sw/se): set both width and height to full
   */
  private onDoubleClick(e: MouseEvent): void {
    const handle = (e.target as HTMLElement).closest('.resize-handle') as HTMLElement
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const position = handle.dataset.position as ResizeHandle

    // Multi-selection double-click not supported for now
    if (handle.dataset.isMulti === 'true') return

    const nodeId = handle.dataset.nodeId
    if (!nodeId) return

    // Determine which dimensions to set to full based on handle position
    const setWidth = position.includes('e') || position.includes('w')
    const setHeight = position.includes('n') || position.includes('s')

    // Emit resize:end event with fill values (undefined means no change)
    // The preview controller will convert 'fill' to 'full' in the ResizeCommand
    events.emit('resize:end', {
      nodeId,
      width: setWidth ? 'fill' : undefined,
      height: setHeight ? 'fill' : undefined,
    })
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeResize && !this.activeMultiResize) return
    this.pendingMouseEvent = e // RAF throttling: batch mouse events to animation frames for smooth 60fps
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

  /**
   * Process mouse move event (called via RAF throttling)
   */
  private processMouseMove(e: MouseEvent): void {
    // Handle multi-selection resize
    if (this.activeMultiResize) {
      this.handleMultiResizeMove(e)
      return
    }

    if (!this.activeResize) return

    const {
      handle,
      startX,
      startY,
      startWidth,
      startHeight,
      startLeft,
      startTop,
      nodeId,
      element,
    } = this.activeResize
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newLeft = startLeft
    let newTop = startTop

    // Berechne neue Größe und Position basierend auf Handle-Position
    if (handle.includes('e')) newWidth = startWidth + dx
    if (handle.includes('w')) {
      newWidth = startWidth - dx
      newLeft = startLeft + dx
    }
    if (handle.includes('s')) newHeight = startHeight + dy
    if (handle.includes('n')) {
      newHeight = startHeight - dy
      newTop = startTop + dy
    }

    // Clamp to minimum size
    if (newWidth < MIN_RESIZE_SIZE) {
      if (handle.includes('w')) newLeft = startLeft + (startWidth - MIN_RESIZE_SIZE)
      newWidth = MIN_RESIZE_SIZE
    }
    if (newHeight < MIN_RESIZE_SIZE) {
      if (handle.includes('n')) newTop = startTop + (startHeight - MIN_RESIZE_SIZE)
      newHeight = MIN_RESIZE_SIZE
    }

    // LIVE VISUAL FEEDBACK: Apply size directly to the element
    element.style.width = `${Math.round(newWidth)}px`
    element.style.height = `${Math.round(newHeight)}px`

    // For w/n handles, also update position (for absolute positioned elements)
    if (handle.includes('w') || handle.includes('n')) {
      if (this.activeResize.isAbsolute) {
        if (handle.includes('w')) element.style.left = `${Math.round(newLeft)}px`
        if (handle.includes('n')) element.style.top = `${Math.round(newTop)}px`
      }
    }

    // Track current position for absolute elements
    this.activeResize.currentLeft = Math.round(newLeft)
    this.activeResize.currentTop = Math.round(newTop)

    // Update resize handles position to follow the element
    this.updateHandlePositions(element)

    // Sizing-Modus erkennen
    const sourceMap = this.getSourceMap()
    const node = sourceMap?.getNodeById(nodeId)
    const parentId = node?.parentId

    let widthMode: SizingMode = Math.round(newWidth)
    let heightMode: SizingMode = Math.round(newHeight)

    if (parentId) {
      const available = this.getAvailableSpace(parentId, nodeId)
      const childMin = this.getChildrenMinSize(nodeId)

      widthMode = this.detectSizingMode(newWidth, available.width, childMin.width)
      heightMode = this.detectSizingMode(newHeight, available.height, childMin.height)
    }

    this.activeResize.currentWidth = widthMode
    this.activeResize.currentHeight = heightMode

    // Size Indicator zeigen
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    const wStr = typeof widthMode === 'number' ? `${widthMode}px` : widthMode
    const hStr = typeof heightMode === 'number' ? `${heightMode}px` : heightMode

    this.overlayManager.showSizeIndicator(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
      wStr,
      hStr
    )

    events.emit('resize:move', {
      nodeId,
      width: widthMode,
      height: heightMode,
    })
  }

  private updateHandlePositions(element: HTMLElement): void {
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    const relRect = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    }

    // Update handle positions using shared constant
    this.handles.forEach(handle => {
      const pos = handle.dataset.position as ResizeHandle
      const position = HANDLE_POSITION_MAP[pos]
      if (!position) return
      handle.style.left = `${relRect.left + relRect.width * position.x - 4}px`
      handle.style.top = `${relRect.top + relRect.height * position.y - 4}px`
    })
  }

  private onMouseUp(): void {
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingMouseEvent = null

    // Handle multi-selection resize
    if (this.activeMultiResize) {
      this.handleMultiResizeEnd()
      return
    }

    if (!this.activeResize) return

    const {
      nodeId,
      handle,
      currentWidth,
      currentHeight,
      currentLeft,
      currentTop,
      startLeft,
      startTop,
      isAbsolute,
    } = this.activeResize

    // Cursor zurücksetzen
    document.body.style.cursor = ''

    // Indicator ausblenden
    this.overlayManager.hideSizeIndicator()

    // Build event data
    const eventData: {
      nodeId: string
      width: SizingMode
      height: SizingMode
      x?: number
      y?: number
    } = {
      nodeId,
      width: currentWidth,
      height: currentHeight,
    }

    // Include x/y for absolute positioned elements when position changed
    if (isAbsolute) {
      if (handle.includes('w') && currentLeft !== startLeft) {
        eventData.x = currentLeft
      }
      if (handle.includes('n') && currentTop !== startTop) {
        eventData.y = currentTop
      }
    }

    events.emit('resize:end', eventData)

    this.activeResize = null
  }

  // ============================================================================
  // Multi-Selection Resize
  // ============================================================================

  private startMultiResize(e: MouseEvent, handle: HTMLElement, position: ResizeHandle): void {
    const nodeIdsJson = handle.dataset.nodeIds
    if (!nodeIdsJson) return

    const nodeIds: string[] = JSON.parse(nodeIdsJson)
    const boundingBox = this.calculateMultiSelectionBounds(nodeIds)
    if (!boundingBox) return

    this.activeMultiResize = {
      nodeIds,
      handle: position,
      startX: e.clientX,
      startY: e.clientY,
      boundingBox,
      currentWidth: boundingBox.width,
      currentHeight: boundingBox.height,
    }

    // Visual feedback: change cursor
    document.body.style.cursor = this.getCursor(position)

    events.emit('multiResize:start', {
      nodeIds,
      handle: position,
      boundingBox: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    })
  }

  private handleMultiResizeMove(e: MouseEvent): void {
    if (!this.activeMultiResize) return

    const { handle, startX, startY, boundingBox, nodeIds } = this.activeMultiResize
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newWidth = boundingBox.width
    let newHeight = boundingBox.height

    // Calculate new size based on handle position
    if (handle.includes('e')) newWidth = boundingBox.width + dx
    if (handle.includes('w')) newWidth = boundingBox.width - dx
    if (handle.includes('s')) newHeight = boundingBox.height + dy
    if (handle.includes('n')) newHeight = boundingBox.height - dy

    // Clamp to minimum size
    newWidth = Math.max(MIN_RESIZE_SIZE, newWidth)
    newHeight = Math.max(MIN_RESIZE_SIZE, newHeight)

    this.activeMultiResize.currentWidth = newWidth
    this.activeMultiResize.currentHeight = newHeight

    // Determine anchor based on handle
    const anchor = this.getAnchorFromHandle(handle)

    // Calculate new positions for all elements
    const newPositions = calculateResizedPositions(boundingBox, newWidth, newHeight, anchor)

    // Apply visual feedback to all elements
    for (const [nodeId, pos] of newPositions) {
      const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (element) {
        element.style.width = `${pos.width}px`
        element.style.height = `${pos.height}px`
        element.style.left = `${pos.x}px`
        element.style.top = `${pos.y}px`
      }
    }

    // Update handle positions around new bounding box
    this.updateMultiHandlePositions(boundingBox, newWidth, newHeight, anchor)

    // Show size indicator
    const scaleX = newWidth / boundingBox.width
    const scaleY = newHeight / boundingBox.height
    const centerX = boundingBox.x + newWidth / 2
    const centerY = boundingBox.y + newHeight / 2

    this.overlayManager.showSizeIndicator(
      centerX,
      centerY,
      `${Math.round(newWidth)}px (${Math.round(scaleX * 100)}%)`,
      `${Math.round(newHeight)}px (${Math.round(scaleY * 100)}%)`
    )

    events.emit('multiResize:move', {
      nodeIds,
      width: newWidth,
      height: newHeight,
      scaleX,
      scaleY,
    })
  }

  private handleMultiResizeEnd(): void {
    if (!this.activeMultiResize) return

    const { nodeIds, boundingBox, currentWidth, currentHeight, handle } = this.activeMultiResize

    // Reset cursor
    document.body.style.cursor = ''

    // Hide indicator
    this.overlayManager.hideSizeIndicator()

    // Calculate final scale factors
    const scaleX = currentWidth / boundingBox.width
    const scaleY = currentHeight / boundingBox.height
    const anchor = this.getAnchorFromHandle(handle)

    events.emit('multiResize:end', {
      nodeIds,
      scaleX,
      scaleY,
      anchor,
    })

    this.activeMultiResize = null

    // Refresh handles to show new bounding box
    this.showMultiHandles(nodeIds)
  }

  private getAnchorFromHandle(
    handle: ResizeHandle
  ): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' {
    switch (handle) {
      case 'se':
        return 'top-left'
      case 'sw':
        return 'top-right'
      case 'ne':
        return 'bottom-left'
      case 'nw':
        return 'bottom-right'
      case 'e':
        return 'top-left'
      case 'w':
        return 'top-right'
      case 's':
        return 'top-left'
      case 'n':
        return 'bottom-left'
      default:
        return 'top-left'
    }
  }

  private updateMultiHandlePositions(
    originalBounds: BoundingBox,
    newWidth: number,
    newHeight: number,
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  ): void {
    // Calculate new bounding box position based on anchor
    let newX = originalBounds.x
    let newY = originalBounds.y

    switch (anchor) {
      case 'top-right':
        newX = originalBounds.x + originalBounds.width - newWidth
        break
      case 'bottom-left':
        newY = originalBounds.y + originalBounds.height - newHeight
        break
      case 'bottom-right':
        newX = originalBounds.x + originalBounds.width - newWidth
        newY = originalBounds.y + originalBounds.height - newHeight
        break
      case 'center':
        newX = originalBounds.x + (originalBounds.width - newWidth) / 2
        newY = originalBounds.y + (originalBounds.height - newHeight) / 2
        break
    }

    // Update handle positions using shared constant
    this.handles.forEach(handle => {
      const pos = handle.dataset.position as ResizeHandle
      if (!pos || handle.className.includes('outline')) return

      const position = HANDLE_POSITION_MAP[pos]
      if (!position) return
      handle.style.left = `${newX + newWidth * position.x - 4}px`
      handle.style.top = `${newY + newHeight * position.y - 4}px`
    })

    // Update outline
    const outline = this.handles.find(h => h.className.includes('outline'))
    if (outline) {
      outline.style.left = `${newX}px`
      outline.style.top = `${newY}px`
      outline.style.width = `${newWidth}px`
      outline.style.height = `${newHeight}px`
    }
  }

  // ============================================================================
  // Sizing Logic
  // ============================================================================

  private detectSizingMode(newSize: number, available: number, childMin: number): SizingMode {
    // Use both absolute and percentage-based thresholds for better detection
    const SNAP_THRESHOLD_PX = 20 // Absolute threshold in pixels
    const SNAP_THRESHOLD_PCT = 0.05 // 5% of available space

    // Calculate effective threshold (use larger of the two)
    const fillThreshold = Math.max(SNAP_THRESHOLD_PX, available * SNAP_THRESHOLD_PCT)
    const hugThreshold = Math.max(SNAP_THRESHOLD_PX, childMin * SNAP_THRESHOLD_PCT)

    // Wenn nahe am verfügbaren Platz → fill
    // Also trigger fill if size exceeds available (dragged beyond parent)
    if (newSize >= available - fillThreshold) {
      return 'fill'
    }

    // Wenn nahe am Minimum der Kinder → hug
    // Also trigger hug if size is less than children minimum
    if (childMin > MIN_RESIZE_SIZE && newSize <= childMin + hugThreshold) {
      return 'hug'
    }

    // Sonst: Pixel-Wert
    return Math.round(newSize)
  }

  private getAvailableSpace(
    parentId: string,
    excludeId: string
  ): { width: number; height: number } {
    // Use LayoutService to get parent layout
    const layoutService = getLayoutService()
    const parentLayout = layoutService?.getLayout(parentId)

    // For available space calculation, we need to iterate siblings and exclude one by ID
    // The LayoutService's getChildrenLayouts doesn't return nodeIds, so we use DOM for siblings
    // but still benefit from LayoutService for parent layout
    const parent = this.container.querySelector(`[data-mirror-id="${parentId}"]`) as HTMLElement
    if (!parent) return { width: DEFAULT_CONTAINER_SIZE, height: DEFAULT_CONTAINER_SIZE }

    let parentWidth: number
    let parentHeight: number
    let padding: { left: number; right: number; top: number; bottom: number }
    let gap: number
    let isHorizontal: boolean

    if (parentLayout) {
      // Use cached parent layout
      parentWidth = parentLayout.width
      parentHeight = parentLayout.height
      padding = parentLayout.padding
      gap = parentLayout.gap
      isHorizontal = parentLayout.flexDirection === 'row'
    } else {
      // Fallback to DOM for parent
      const parentRect = parent.getBoundingClientRect()
      const style = window.getComputedStyle(parent)

      parentWidth = parentRect.width
      parentHeight = parentRect.height
      padding = {
        left: parseInt(style.paddingLeft || '0', 10),
        right: parseInt(style.paddingRight || '0', 10),
        top: parseInt(style.paddingTop || '0', 10),
        bottom: parseInt(style.paddingBottom || '0', 10),
      }
      gap = parseInt(style.gap || '0', 10)
      isHorizontal = style.flexDirection === 'row'
    }

    let availableWidth = parentWidth - padding.left - padding.right
    let availableHeight = parentHeight - padding.top - padding.bottom

    // Subtract sibling space (need DOM for ID-based exclusion)
    const siblings = parent.querySelectorAll(':scope > [data-mirror-id]')
    siblings.forEach(sibling => {
      const siblingId = sibling.getAttribute('data-mirror-id')
      if (siblingId === excludeId) return
      const siblingLayout = layoutService?.getLayout(siblingId!)
      const siblingWidth =
        siblingLayout?.width ?? (sibling as HTMLElement).getBoundingClientRect().width
      const siblingHeight =
        siblingLayout?.height ?? (sibling as HTMLElement).getBoundingClientRect().height
      if (isHorizontal) availableWidth -= siblingWidth + gap
      else availableHeight -= siblingHeight + gap
    })

    return {
      width: Math.max(MIN_RESIZE_SIZE, availableWidth),
      height: Math.max(MIN_RESIZE_SIZE, availableHeight),
    }
  }

  private getChildrenMinSize(nodeId: string): { width: number; height: number } {
    // Use LayoutService for unified layout access (cache-first, DOM-fallback)
    const layoutService = getLayoutService()

    if (layoutService) {
      const childLayouts = layoutService.getChildrenLayouts(nodeId)

      let minWidth = MIN_RESIZE_SIZE
      let minHeight = MIN_RESIZE_SIZE

      for (const layout of childLayouts) {
        minWidth = Math.max(minWidth, layout.width)
        minHeight = Math.max(minHeight, layout.height)
      }

      // If we found children, return the calculated sizes
      if (childLayouts.length > 0) {
        return { width: minWidth, height: minHeight }
      }
    }

    // Ultimate fallback if LayoutService not available or no children found
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return { width: MIN_RESIZE_SIZE, height: MIN_RESIZE_SIZE }

    let minWidth = MIN_RESIZE_SIZE
    let minHeight = MIN_RESIZE_SIZE

    const children = element.querySelectorAll(':scope > [data-mirror-id]')
    children.forEach(child => {
      const rect = child.getBoundingClientRect()
      minWidth = Math.max(minWidth, rect.width)
      minHeight = Math.max(minHeight, rect.height)
    })

    return { width: minWidth, height: minHeight }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private getCursor(pos: ResizeHandle): string {
    const cursors: Record<ResizeHandle, string> = {
      nw: 'nwse-resize',
      n: 'ns-resize',
      ne: 'nesw-resize',
      e: 'ew-resize',
      se: 'nwse-resize',
      s: 'ns-resize',
      sw: 'nesw-resize',
      w: 'ew-resize',
    }
    return cursors[pos] || 'pointer'
  }
}

export function createResizeManager(config: ResizeManagerConfig): ResizeManager {
  return new ResizeManager(config)
}
