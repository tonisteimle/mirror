/**
 * MarginHandles - Visual margin manipulation controls
 *
 * Displays draggable margin handles around the selected element.
 * Shows margin values and allows direct manipulation by dragging.
 *
 * Architecture:
 * - Shows colored margin regions around the element
 * - Dragging edges adjusts individual margin values
 * - Values update in real-time with visual feedback
 */

import type {
  MarginEdge,
  MarginValues,
  MarginHandleState,
  MarginHandlesConfig,
  ElementLayout,
} from './types'
import { getLayoutService } from '../../core'

// ============================================================================
// Constants
// ============================================================================

const MARGIN_COLOR = 'rgba(249, 115, 22, 0.15)' // Orange tint for margin
const MARGIN_BORDER_COLOR = 'rgba(249, 115, 22, 0.6)'
const HANDLE_SIZE = 8
const Z_INDEX_MARGIN_OVERLAY = 999

// ============================================================================
// MarginHandles Class
// ============================================================================

export class MarginHandles {
  private container: HTMLElement
  private config: Required<MarginHandlesConfig>
  private overlayElement: HTMLElement | null = null
  private currentNodeId: string | null = null
  private dragState: MarginHandleState | null = null
  private rafId: number | null = null

  // Cached elements for performance
  private marginElements: Map<MarginEdge, HTMLElement> = new Map()
  private labelElements: Map<MarginEdge, HTMLElement> = new Map()
  private handleElements: Map<MarginEdge, HTMLElement> = new Map()

  // Bound event handlers
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void

  constructor(config: MarginHandlesConfig) {
    this.container = config.container
    this.config = {
      container: config.container,
      onMarginChange: config.onMarginChange,
      onMarginDragEnd: config.onMarginDragEnd ?? (() => {}),
      nodeIdAttribute: config.nodeIdAttribute ?? 'data-mirror-id',
      minValue: config.minValue ?? 0,
      maxValue: config.maxValue ?? 200,
      showValues: config.showValues ?? true,
    }

    this.boundMouseDown = this.handleMouseDown.bind(this)
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundMouseUp = this.handleMouseUp.bind(this)

    this.createOverlay()
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Show margin handles for an element
   */
  show(nodeId: string): void {
    this.currentNodeId = nodeId
    const layout = this.getElementLayout(nodeId)
    if (!layout) {
      this.hide()
      return
    }

    this.updateMarginVisualization(layout)
    this.overlayElement!.style.display = 'block'
  }

  /**
   * Hide margin handles
   */
  hide(): void {
    this.currentNodeId = null
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none'
    }
  }

  /**
   * Refresh the margin handles (e.g., after layout change)
   */
  refresh(): void {
    if (this.currentNodeId) {
      this.show(this.currentNodeId)
    }
  }

  /**
   * Check if handles are currently visible
   */
  isVisible(): boolean {
    return this.currentNodeId !== null && this.overlayElement?.style.display !== 'none'
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)

    this.overlayElement?.remove()
    this.overlayElement = null
    this.marginElements.clear()
    this.labelElements.clear()
    this.handleElements.clear()
  }

  // ============================================================================
  // Overlay Creation
  // ============================================================================

  private createOverlay(): void {
    this.overlayElement = document.createElement('div')
    this.overlayElement.className = 'margin-handles-overlay'
    Object.assign(this.overlayElement.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_MARGIN_OVERLAY),
      display: 'none',
    })

    // Create margin regions for each edge
    const edges: MarginEdge[] = ['top', 'right', 'bottom', 'left']
    for (const edge of edges) {
      this.createMarginRegion(edge)
      this.createHandle(edge)
      if (this.config.showValues) {
        this.createLabel(edge)
      }
    }

    this.container.appendChild(this.overlayElement)
  }

  private createMarginRegion(edge: MarginEdge): void {
    const region = document.createElement('div')
    region.className = `margin-region margin-${edge}`
    region.dataset.edge = edge
    Object.assign(region.style, {
      position: 'absolute',
      background: MARGIN_COLOR,
      pointerEvents: 'none',
    })

    this.marginElements.set(edge, region)
    this.overlayElement!.appendChild(region)
  }

  private createHandle(edge: MarginEdge): void {
    const handle = document.createElement('div')
    handle.className = `margin-handle margin-handle-${edge}`
    handle.dataset.edge = edge
    Object.assign(handle.style, {
      position: 'absolute',
      width: edge === 'top' || edge === 'bottom' ? '40px' : `${HANDLE_SIZE}px`,
      height: edge === 'left' || edge === 'right' ? '40px' : `${HANDLE_SIZE}px`,
      background: MARGIN_BORDER_COLOR,
      borderRadius: '2px',
      cursor: edge === 'top' || edge === 'bottom' ? 'ns-resize' : 'ew-resize',
      pointerEvents: 'auto',
      transition: 'background 0.15s',
    })

    handle.addEventListener('mousedown', this.boundMouseDown)
    handle.addEventListener('mouseenter', () => {
      handle.style.background = 'rgba(249, 115, 22, 1)'
    })
    handle.addEventListener('mouseleave', () => {
      if (!this.dragState || this.dragState.edge !== edge) {
        handle.style.background = MARGIN_BORDER_COLOR
      }
    })

    this.handleElements.set(edge, handle)
    this.overlayElement!.appendChild(handle)
  }

  private createLabel(edge: MarginEdge): void {
    const label = document.createElement('div')
    label.className = `margin-label margin-label-${edge}`
    Object.assign(label.style, {
      position: 'absolute',
      background: 'rgba(249, 115, 22, 0.9)',
      color: 'white',
      fontSize: '10px',
      fontFamily: 'system-ui, sans-serif',
      padding: '1px 4px',
      borderRadius: '2px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    })

    this.labelElements.set(edge, label)
    this.overlayElement!.appendChild(label)
  }

  // ============================================================================
  // Layout Calculation
  // ============================================================================

  private getElementLayout(nodeId: string): ElementLayout | null {
    const layoutService = getLayoutService()
    const layout = layoutService?.getLayout(nodeId)

    // LayoutService's ElementLayout doesn't include margin data,
    // so we always need to read margin from DOM
    if (layout) {
      // Get element for margin reading
      const element = this.container.querySelector(
        `[${this.config.nodeIdAttribute}="${nodeId}"]`
      ) as HTMLElement | null

      const style = element ? window.getComputedStyle(element) : null

      return {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        margin: {
          top: style ? parseInt(style.marginTop || '0', 10) : 0,
          right: style ? parseInt(style.marginRight || '0', 10) : 0,
          bottom: style ? parseInt(style.marginBottom || '0', 10) : 0,
          left: style ? parseInt(style.marginLeft || '0', 10) : 0,
        },
      }
    }

    // Fallback to DOM
    const element = this.container.querySelector(
      `[${this.config.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      margin: {
        top: parseInt(style.marginTop || '0', 10),
        right: parseInt(style.marginRight || '0', 10),
        bottom: parseInt(style.marginBottom || '0', 10),
        left: parseInt(style.marginLeft || '0', 10),
      },
    }
  }

  // ============================================================================
  // Visualization Update
  // ============================================================================

  private updateMarginVisualization(layout: ElementLayout): void {
    const { x, y, width, height, margin } = layout

    // Position overlay to cover element + margins
    Object.assign(this.overlayElement!.style, {
      left: `${x - margin.left}px`,
      top: `${y - margin.top}px`,
      width: `${width + margin.left + margin.right}px`,
      height: `${height + margin.top + margin.bottom}px`,
    })

    // Update margin regions
    this.updateMarginRegion('top', margin.left, 0, width, margin.top)
    this.updateMarginRegion('right', margin.left + width, margin.top, margin.right, height)
    this.updateMarginRegion('bottom', margin.left, margin.top + height, width, margin.bottom)
    this.updateMarginRegion('left', 0, margin.top, margin.left, height)

    // Update handles
    this.updateHandle('top', margin.left + width / 2 - 20, margin.top - HANDLE_SIZE / 2)
    this.updateHandle('right', margin.left + width + margin.right / 2 - HANDLE_SIZE / 2, margin.top + height / 2 - 20)
    this.updateHandle('bottom', margin.left + width / 2 - 20, margin.top + height + margin.bottom / 2 - HANDLE_SIZE / 2)
    this.updateHandle('left', margin.left / 2 - HANDLE_SIZE / 2, margin.top + height / 2 - 20)

    // Update labels
    if (this.config.showValues) {
      this.updateLabel('top', margin.left + width / 2, margin.top / 2, margin.top)
      this.updateLabel('right', margin.left + width + margin.right / 2, margin.top + height / 2, margin.right)
      this.updateLabel('bottom', margin.left + width / 2, margin.top + height + margin.bottom / 2, margin.bottom)
      this.updateLabel('left', margin.left / 2, margin.top + height / 2, margin.left)
    }
  }

  private updateMarginRegion(edge: MarginEdge, x: number, y: number, w: number, h: number): void {
    const region = this.marginElements.get(edge)
    if (!region) return

    // Don't show region if margin is 0
    if (w <= 0 || h <= 0) {
      region.style.display = 'none'
      return
    }

    region.style.display = 'block'
    Object.assign(region.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    })
  }

  private updateHandle(edge: MarginEdge, x: number, y: number): void {
    const handle = this.handleElements.get(edge)
    if (!handle) return

    Object.assign(handle.style, {
      left: `${x}px`,
      top: `${y}px`,
    })
  }

  private updateLabel(edge: MarginEdge, x: number, y: number, value: number): void {
    const label = this.labelElements.get(edge)
    if (!label) return

    // Don't show label if margin is 0
    if (value <= 0) {
      label.style.display = 'none'
      return
    }

    label.style.display = 'block'
    label.textContent = `${Math.round(value)}`

    // Center label
    const labelWidth = label.offsetWidth || 20
    const labelHeight = label.offsetHeight || 14
    Object.assign(label.style, {
      left: `${x - labelWidth / 2}px`,
      top: `${y - labelHeight / 2}px`,
    })
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private handleMouseDown(e: MouseEvent): void {
    if (!this.currentNodeId) return

    const handle = e.target as HTMLElement
    const edge = handle.dataset.edge as MarginEdge
    if (!edge) return

    e.preventDefault()
    e.stopPropagation()

    const layout = this.getElementLayout(this.currentNodeId)
    if (!layout) return

    this.dragState = {
      nodeId: this.currentNodeId,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startValue: layout.margin[edge],
      currentValue: layout.margin[edge],
    }

    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)

    // Visual feedback
    document.body.style.cursor = edge === 'top' || edge === 'bottom' ? 'ns-resize' : 'ew-resize'
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.dragState) return

    // RAF throttle
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.dragState) return

      this.processMouseMove(e)
    })
  }

  private processMouseMove(e: MouseEvent): void {
    if (!this.dragState) return

    const { edge, startX, startY, startValue, nodeId } = this.dragState

    // Calculate delta based on edge direction
    let delta: number
    if (edge === 'top') {
      delta = startY - e.clientY // Dragging up increases top margin
    } else if (edge === 'bottom') {
      delta = e.clientY - startY // Dragging down increases bottom margin
    } else if (edge === 'left') {
      delta = startX - e.clientX // Dragging left increases left margin
    } else {
      delta = e.clientX - startX // Dragging right increases right margin
    }

    // Calculate new value with clamping
    const newValue = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, startValue + delta)
    )

    this.dragState.currentValue = newValue

    // Notify change
    this.config.onMarginChange(nodeId, edge, Math.round(newValue))

    // Update visualization with new value
    const layout = this.getElementLayout(nodeId)
    if (layout) {
      layout.margin[edge] = newValue
      this.updateMarginVisualization(layout)
    }
  }

  private handleMouseUp(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)

    if (this.dragState) {
      const { nodeId, edge, currentValue } = this.dragState

      // Notify drag end
      this.config.onMarginDragEnd(nodeId, { [edge]: Math.round(currentValue) })

      // Reset handle color
      const handle = this.handleElements.get(edge)
      if (handle) {
        handle.style.background = MARGIN_BORDER_COLOR
      }
    }

    this.dragState = null
    document.body.style.cursor = ''
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarginHandles(config: MarginHandlesConfig): MarginHandles {
  return new MarginHandles(config)
}
