/**
 * ResizeManager - 8-Punkt Resize mit Sizing-Modus-Erkennung
 *
 * Zeigt 8 Resize-Handles (nw, n, ne, e, se, s, sw, w) für das selektierte Element.
 * Beim Drag wird die Größe berechnet und fill/hug/px automatisch erkannt.
 */

import { OverlayManager } from './overlay-manager'
import { events } from '../core'
import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'
import { MIN_RESIZE_SIZE, DEFAULT_CONTAINER_SIZE } from './constants/sizing'

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
  private currentNodeId: string | null = null

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

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    // Relative Position zum Container
    const relRect = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
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
        border: '2px solid #3B82F6',
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

    const nodeId = handle.dataset.nodeId!
    const position = handle.dataset.position as ResizeHandle

    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    // Get initial position (for absolute positioned elements)
    const isAbsolute = computedStyle.position === 'absolute'
    const startLeft = parseFloat(computedStyle.left) || (rect.left - containerRect.left)
    const startTop = parseFloat(computedStyle.top) || (rect.top - containerRect.top)

    this.activeResize = {
      nodeId,
      handle: position,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft,
      startTop,
      currentWidth: rect.width,
      currentHeight: rect.height,
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
      startWidth: rect.width,
      startHeight: rect.height,
    })
  }

  private onMouseMove(e: MouseEvent): void {
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
