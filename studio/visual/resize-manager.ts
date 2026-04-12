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
import { calculateBoundingBox, calculateResizedPositions, type BoundingBox, type Rect } from '../preview/multi-selection-bounds'

/** @deprecated Use MIN_RESIZE_SIZE from constants/sizing.ts */
const MIN_ELEMENT_SIZE = MIN_RESIZE_SIZE

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

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

  // Bound handlers
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void

  constructor(config: ResizeManagerConfig) {
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

    // 8 Handle-Positionen
    const positions: Array<{ pos: ResizeHandle; x: number; y: number }> = [
      { pos: 'nw', x: 0, y: 0 },
      { pos: 'n', x: 0.5, y: 0 },
      { pos: 'ne', x: 1, y: 0 },
      { pos: 'e', x: 1, y: 0.5 },
      { pos: 'se', x: 1, y: 1 },
      { pos: 's', x: 0.5, y: 1 },
      { pos: 'sw', x: 0, y: 1 },
      { pos: 'w', x: 0, y: 0.5 },
    ]

    positions.forEach(({ pos, x, y }) => {
      const handle = document.createElement('div')
      handle.className = `resize-handle resize-handle-${pos}`
      handle.dataset.position = pos
      handle.dataset.nodeId = nodeId
      Object.assign(handle.style, {
        position: 'absolute',
        left: `${relRect.left + relRect.width * x - 4}px`,
        top: `${relRect.top + relRect.height * y - 4}px`,
        width: '8px',
        height: '8px',
        background: 'white',
        border: '2px solid #5BA8F5',
        borderRadius: '50%',
        cursor: this.getCursor(pos),
        pointerEvents: 'auto',
        zIndex: String(Z_INDEX_RESIZE_HANDLES),
        boxSizing: 'border-box',
      })
      handlesContainer.appendChild(handle)
      this.handles.push(handle)
    })
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

    // 8 Handle positions around the bounding box
    const positions: Array<{ pos: ResizeHandle; x: number; y: number }> = [
      { pos: 'nw', x: 0, y: 0 },
      { pos: 'n', x: 0.5, y: 0 },
      { pos: 'ne', x: 1, y: 0 },
      { pos: 'e', x: 1, y: 0.5 },
      { pos: 'se', x: 1, y: 1 },
      { pos: 's', x: 0.5, y: 1 },
      { pos: 'sw', x: 0, y: 1 },
      { pos: 'w', x: 0, y: 0.5 },
    ]

    positions.forEach(({ pos, x, y }) => {
      const handle = document.createElement('div')
      handle.className = `resize-handle resize-handle-${pos} resize-handle-multi`
      handle.dataset.position = pos
      handle.dataset.nodeIds = JSON.stringify(nodeIds)
      handle.dataset.isMulti = 'true'
      Object.assign(handle.style, {
        position: 'absolute',
        left: `${boundingBox.x + boundingBox.width * x - 4}px`,
        top: `${boundingBox.y + boundingBox.height * y - 4}px`,
        width: '8px',
        height: '8px',
        background: 'white',
        border: '2px solid #10B981',  // Green for multi-selection
        borderRadius: '50%',
        cursor: this.getCursor(pos),
        pointerEvents: 'auto',
        zIndex: String(Z_INDEX_RESIZE_HANDLES),
        boxSizing: 'border-box',
      })
      handlesContainer.appendChild(handle)
      this.handles.push(handle)
    })

    // Draw bounding box outline
    this.drawMultiSelectionOutline(boundingBox)
  }

  private calculateMultiSelectionBounds(nodeIds: string[]): BoundingBox | null {
    const layoutInfo = this.getLayoutInfo?.()

    const getRect = (nodeId: string): Rect | null => {
      // Try cached layout info first
      const layoutRect = layoutInfo?.get(nodeId)
      if (layoutRect) {
        return {
          x: layoutRect.x,
          y: layoutRect.y,
          width: layoutRect.width,
          height: layoutRect.height,
        }
      }

      // Fallback to DOM
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
    this.handles.push(outline)  // Track so it gets removed with hideHandles
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
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  private removeEventListeners(): void {
    // Use cached reference to avoid memory leak if overlay was recreated
    if (this.handlesContainerRef) {
      this.handlesContainerRef.removeEventListener('mousedown', this.boundMouseDown)
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

    // Try to get layout from cached layoutInfo first (Phase 3 optimization)
    const layoutInfo = this.getLayoutInfo?.()
    const layoutRect = layoutInfo?.get(nodeId)

    let startWidth: number
    let startHeight: number
    let startLeft: number
    let startTop: number
    let isAbsolute: boolean

    if (layoutRect) {
      // Use cached layout info - no DOM read needed
      startWidth = layoutRect.width
      startHeight = layoutRect.height
      startLeft = layoutRect.x
      startTop = layoutRect.y
      isAbsolute = layoutRect.isAbsolute
    } else {
      // Fallback to DOM read if layoutInfo not available
      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      startWidth = rect.width
      startHeight = rect.height
      isAbsolute = computedStyle.position === 'absolute'
      startLeft = parseFloat(computedStyle.left) || (rect.left - containerRect.left)
      startTop = parseFloat(computedStyle.top) || (rect.top - containerRect.top)
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

  private onMouseMove(e: MouseEvent): void {
    // Handle multi-selection resize
    if (this.activeMultiResize) {
      this.handleMultiResizeMove(e)
      return
    }

    if (!this.activeResize) return

    const { handle, startX, startY, startWidth, startHeight, startLeft, startTop, nodeId, element } = this.activeResize
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
    if (newWidth < MIN_ELEMENT_SIZE) {
      if (handle.includes('w')) newLeft = startLeft + (startWidth - MIN_ELEMENT_SIZE)
      newWidth = MIN_ELEMENT_SIZE
    }
    if (newHeight < MIN_ELEMENT_SIZE) {
      if (handle.includes('n')) newTop = startTop + (startHeight - MIN_ELEMENT_SIZE)
      newHeight = MIN_ELEMENT_SIZE
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

    // Position map for each handle
    const positionMap: Record<ResizeHandle, { x: number; y: number }> = {
      nw: { x: 0, y: 0 },
      n: { x: 0.5, y: 0 },
      ne: { x: 1, y: 0 },
      e: { x: 1, y: 0.5 },
      se: { x: 1, y: 1 },
      s: { x: 0.5, y: 1 },
      sw: { x: 0, y: 1 },
      w: { x: 0, y: 0.5 },
    }

    this.handles.forEach(handle => {
      const pos = handle.dataset.position as ResizeHandle
      const { x, y } = positionMap[pos]
      handle.style.left = `${relRect.left + relRect.width * x - 4}px`
      handle.style.top = `${relRect.top + relRect.height * y - 4}px`
    })
  }

  private onMouseUp(): void {
    // Handle multi-selection resize
    if (this.activeMultiResize) {
      this.handleMultiResizeEnd()
      return
    }

    if (!this.activeResize) return

    const { nodeId, handle, currentWidth, currentHeight, currentLeft, currentTop, startLeft, startTop, isAbsolute } = this.activeResize

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
    newWidth = Math.max(MIN_ELEMENT_SIZE, newWidth)
    newHeight = Math.max(MIN_ELEMENT_SIZE, newHeight)

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

  private getAnchorFromHandle(handle: ResizeHandle): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' {
    switch (handle) {
      case 'se': return 'top-left'
      case 'sw': return 'top-right'
      case 'ne': return 'bottom-left'
      case 'nw': return 'bottom-right'
      case 'e': return 'top-left'
      case 'w': return 'top-right'
      case 's': return 'top-left'
      case 'n': return 'bottom-left'
      default: return 'top-left'
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

    const positionMap: Record<ResizeHandle, { x: number; y: number }> = {
      nw: { x: 0, y: 0 },
      n: { x: 0.5, y: 0 },
      ne: { x: 1, y: 0 },
      e: { x: 1, y: 0.5 },
      se: { x: 1, y: 1 },
      s: { x: 0.5, y: 1 },
      sw: { x: 0, y: 1 },
      w: { x: 0, y: 0.5 },
    }

    this.handles.forEach(handle => {
      const pos = handle.dataset.position as ResizeHandle
      if (!pos || handle.className.includes('outline')) return

      const { x, y } = positionMap[pos]
      handle.style.left = `${newX + newWidth * x - 4}px`
      handle.style.top = `${newY + newHeight * y - 4}px`
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
    const SNAP_THRESHOLD_PX = 20  // Absolute threshold in pixels
    const SNAP_THRESHOLD_PCT = 0.05  // 5% of available space

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
    if (childMin > MIN_ELEMENT_SIZE && newSize <= childMin + hugThreshold) {
      return 'hug'
    }

    // Sonst: Pixel-Wert
    return Math.round(newSize)
  }

  private getAvailableSpace(parentId: string, excludeId: string): { width: number; height: number } {
    // Try to get layout from cached layoutInfo first (Phase 3 optimization)
    const layoutInfo = this.getLayoutInfo?.()
    const parentLayout = layoutInfo?.get(parentId)

    if (parentLayout) {
      // Use cached layout info - no DOM read needed
      const { width: parentWidth, height: parentHeight, padding, gap, flexDirection } = parentLayout

      let availableWidth = parentWidth - padding.left - padding.right
      let availableHeight = parentHeight - padding.top - padding.bottom

      const isHorizontal = flexDirection === 'row'

      // Find siblings from layoutInfo
      for (const [nodeId, layout] of layoutInfo!) {
        if (nodeId === excludeId || layout.parentId !== parentId) continue

        if (isHorizontal) {
          availableWidth -= layout.width + gap
        } else {
          availableHeight -= layout.height + gap
        }
      }

      return {
        width: Math.max(MIN_ELEMENT_SIZE, availableWidth),
        height: Math.max(MIN_ELEMENT_SIZE, availableHeight),
      }
    }

    // Fallback to DOM read if layoutInfo not available
    const parent = this.container.querySelector(`[data-mirror-id="${parentId}"]`) as HTMLElement
    if (!parent) return { width: DEFAULT_CONTAINER_SIZE, height: DEFAULT_CONTAINER_SIZE }

    const parentRect = parent.getBoundingClientRect()
    const style = window.getComputedStyle(parent)

    // Padding abziehen
    const paddingLeft = parseInt(style.paddingLeft || '0', 10)
    const paddingRight = parseInt(style.paddingRight || '0', 10)
    const paddingTop = parseInt(style.paddingTop || '0', 10)
    const paddingBottom = parseInt(style.paddingBottom || '0', 10)

    let availableWidth = parentRect.width - paddingLeft - paddingRight
    let availableHeight = parentRect.height - paddingTop - paddingBottom

    // Gap und andere Kinder berücksichtigen
    const gap = parseInt(style.gap || '0', 10)
    const isHorizontal = style.flexDirection === 'row'

    // Andere Kinder finden
    const siblings = parent.querySelectorAll(':scope > [data-mirror-id]')
    siblings.forEach(sibling => {
      if (sibling.getAttribute('data-mirror-id') === excludeId) return

      const siblingRect = sibling.getBoundingClientRect()
      if (isHorizontal) {
        availableWidth -= siblingRect.width + gap
      } else {
        availableHeight -= siblingRect.height + gap
      }
    })

    return {
      width: Math.max(MIN_ELEMENT_SIZE, availableWidth),
      height: Math.max(MIN_ELEMENT_SIZE, availableHeight),
    }
  }

  private getChildrenMinSize(nodeId: string): { width: number; height: number } {
    // Try to get layout from cached layoutInfo first (Phase 3 optimization)
    const layoutInfo = this.getLayoutInfo?.()

    if (layoutInfo) {
      let minWidth = MIN_ELEMENT_SIZE
      let minHeight = MIN_ELEMENT_SIZE

      // Find children from layoutInfo by checking parentId
      for (const [childNodeId, layout] of layoutInfo) {
        if (layout.parentId !== nodeId) continue

        minWidth = Math.max(minWidth, layout.width)
        minHeight = Math.max(minHeight, layout.height)
      }

      return { width: minWidth, height: minHeight }
    }

    // Fallback to DOM read if layoutInfo not available
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return { width: MIN_ELEMENT_SIZE, height: MIN_ELEMENT_SIZE }

    let minWidth = MIN_ELEMENT_SIZE
    let minHeight = MIN_ELEMENT_SIZE

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
