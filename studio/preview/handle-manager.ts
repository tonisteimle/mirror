/**
 * HandleManager - Direct manipulation handles for visual editing
 *
 * Provides resize handles for:
 * - Padding (4 sides)
 * - Gap (between children in flex/grid)
 * - Border radius (corner)
 *
 * Features:
 * - Snapping to common values (4, 8, 16, etc.)
 * - Shift for fine control
 * - Alt to disable snapping
 * - Live value indicator during drag
 */

import { state, events, handleSnapSettings, getLayoutService, type LayoutService } from '../core'
import { HANDLE_SIZE, HANDLE_SIZE_SMALL, SMALL_ELEMENT_THRESHOLD } from '../visual/constants/sizing'

export type HandleType = 'padding' | 'gap' | 'radius'
export type HandleDirection = 'n' | 's' | 'e' | 'w' | 'ne'

export interface Handle {
  type: HandleType
  direction: HandleDirection
  property: string
  currentValue: number
  element: HTMLElement
}

export interface HandleManagerConfig {
  container: HTMLElement
}

const LAYOUT = {
  HANDLE_SIZE,
  HANDLE_SIZE_SMALL,
  MIN_ELEMENT_SIZE: SMALL_ELEMENT_THRESHOLD,  // Below this, use small handles
  Z_INDEX: 10000,
  Z_INDEX_INDICATOR: 10001,
}

// Type-based colors for better visual feedback (Feature 2)
const HANDLE_COLORS: Record<HandleType, string> = {
  padding: '#5BA8F5',   // Blue - padding
  gap: '#10B981',       // Green - gap
  radius: '#F59E0B',    // Orange - radius
}

// Legacy snap points - now configurable via handleSnapSettings (Feature 3)
// const SNAP_POINTS = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
// const SNAP_THRESHOLD = 4

// Max/min value constraints
const MIN_VALUE = 0

export class HandleManager {
  private container: HTMLElement
  private handles: Handle[] = []
  private activeHandle: Handle | null = null
  private overlay: HTMLElement
  private valueIndicator: HTMLElement | null = null

  private startDragPosition: { x: number; y: number } | null = null
  private startValue: number = 0

  // Bound handlers for cleanup
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void

  constructor(config: HandleManagerConfig) {
    this.container = config.container
    this.overlay = this.createOverlay()

    // Bind handlers
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)

    this.setupEventListeners()
  }

  /**
   * Show handles for a selected element
   */
  showHandles(nodeId: string): void {
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) return

    this.hideHandles()
    this.handles = this.calculateHandles(element, nodeId)
    this.renderHandles()
  }

  /**
   * Hide all handles
   */
  hideHandles(): void {
    this.handles = []
    this.overlay.innerHTML = ''
  }

  /**
   * Refresh handle positions (call after preview DOM updates)
   */
  refresh(): void {
    const selection = state.get().selection
    if (selection.nodeId) {
      this.showHandles(selection.nodeId)
    }
  }

  private calculateHandles(element: HTMLElement, nodeId: string): Handle[] {
    const handles: Handle[] = []

    // Try to get layout from cached layoutInfo first (Phase 4 optimization)
    const layoutInfo = this.getLayoutInfo?.()
    const layoutRect = layoutInfo?.get(nodeId)

    let relLeft: number
    let relTop: number
    let width: number
    let height: number
    let padding: { top: number; right: number; bottom: number; left: number }
    let radius: number
    let gap: number
    let flexDirection: string
    let isContainer: boolean

    if (layoutRect) {
      // Use cached layout info - no DOM read needed
      relLeft = layoutRect.x
      relTop = layoutRect.y
      width = layoutRect.width
      height = layoutRect.height
      padding = layoutRect.padding
      radius = layoutRect.radius
      gap = layoutRect.gap
      flexDirection = layoutRect.flexDirection || 'column'
      isContainer = layoutRect.isContainer
    } else {
      // Fallback to DOM read if layoutInfo not available
      const rect = element.getBoundingClientRect()
      const containerRect = this.container.getBoundingClientRect()
      const style = window.getComputedStyle(element)

      relLeft = rect.left - containerRect.left
      relTop = rect.top - containerRect.top
      width = rect.width
      height = rect.height
      padding = {
        top: parseInt(style.paddingTop || '0', 10),
        right: parseInt(style.paddingRight || '0', 10),
        bottom: parseInt(style.paddingBottom || '0', 10),
        left: parseInt(style.paddingLeft || '0', 10),
      }
      radius = parseInt(style.borderRadius || '0', 10)
      gap = parseInt(style.gap || '0', 10)
      flexDirection = style.flexDirection || 'column'
      isContainer = (style.display === 'flex' || style.display === 'grid') && element.children.length > 0
    }

    // Padding handles (4 sides)
    const paddingSides: Array<{
      dir: HandleDirection
      prop: string
      value: number
      x: number
      y: number
    }> = [
      {
        dir: 'n',
        prop: 'pad top',
        value: padding.top,
        x: relLeft + width / 2,
        y: relTop + 12,
      },
      {
        dir: 's',
        prop: 'pad bottom',
        value: padding.bottom,
        x: relLeft + width / 2,
        y: relTop + height - 12,
      },
      {
        dir: 'e',
        prop: 'pad right',
        value: padding.right,
        x: relLeft + width - 12,
        y: relTop + height / 2,
      },
      {
        dir: 'w',
        prop: 'pad left',
        value: padding.left,
        x: relLeft + 12,
        y: relTop + height / 2,
      },
    ]

    const elementSize = { width, height }

    for (const side of paddingSides) {
      handles.push({
        type: 'padding',
        direction: side.dir,
        property: side.prop,
        currentValue: side.value,
        element: this.createHandleElement(side.x, side.y, side.dir, 'padding', elementSize),
      })
    }

    // Radius handle (top-right corner)
    handles.push({
      type: 'radius',
      direction: 'ne',
      property: 'rad',
      currentValue: radius,
      element: this.createHandleElement(
        relLeft + width - 8,
        relTop + 8,
        'ne',
        'radius',
        elementSize
      ),
    })

    // Gap handle (only for flex/grid containers with children)
    const isHorizontal = flexDirection === 'row' || flexDirection === 'row-reverse'

    if (isContainer) {
      // Try to find gap position from children in layoutInfo
      let gapX: number
      let gapY: number
      let hasGapPosition = false

      if (layoutInfo) {
        // Find first two children in layoutInfo
        const children: LayoutRect[] = []
        for (const [childId, childLayout] of layoutInfo) {
          if (childLayout.parentId === nodeId) {
            children.push(childLayout)
            if (children.length >= 2) break
          }
        }

        if (children.length >= 2) {
          if (isHorizontal) {
            gapX = (children[0].x + children[0].width + children[1].x) / 2
            gapY = relTop + height / 2
          } else {
            gapX = relLeft + width / 2
            gapY = (children[0].y + children[0].height + children[1].y) / 2
          }
          hasGapPosition = true
        }
      }

      if (!hasGapPosition && element.children.length >= 2) {
        // Fallback: Read children from DOM
        const containerRect = this.container.getBoundingClientRect()
        const firstChild = element.children[0].getBoundingClientRect()
        const secondChild = element.children[1].getBoundingClientRect()

        if (isHorizontal) {
          gapX = (firstChild.right + secondChild.left) / 2 - containerRect.left
          gapY = relTop + height / 2
        } else {
          gapX = relLeft + width / 2
          gapY = (firstChild.bottom + secondChild.top) / 2 - containerRect.top
        }
        hasGapPosition = true
      }

      if (hasGapPosition) {
        handles.push({
          type: 'gap',
          direction: isHorizontal ? 'e' : 's',
          property: 'gap',
          currentValue: gap,
          element: this.createHandleElement(gapX!, gapY!, isHorizontal ? 'e' : 's', 'gap', elementSize),
        })
      }
    }

    return handles
  }

  private createHandleElement(
    x: number,
    y: number,
    direction: HandleDirection,
    type: string,
    elementSize?: { width: number; height: number }
  ): HTMLElement {
    const el = document.createElement('div')
    el.className = `handle handle-${type}`
    el.dataset.direction = direction
    el.dataset.type = type

    const isGap = type === 'gap'

    // Use smaller handles for small elements
    const useSmallHandle = elementSize &&
      (elementSize.width < LAYOUT.MIN_ELEMENT_SIZE || elementSize.height < LAYOUT.MIN_ELEMENT_SIZE)
    const size = useSmallHandle ? LAYOUT.HANDLE_SIZE_SMALL : LAYOUT.HANDLE_SIZE

    // Type-based border color (Feature 2: Better Visual Feedback)
    const borderColor = HANDLE_COLORS[type as HandleType] || '#5BA8F5'

    Object.assign(el.style, {
      position: 'absolute',
      left: `${x - size / 2}px`,
      top: `${y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: 'white',
      border: `2px solid ${borderColor}`,
      borderRadius: isGap ? '2px' : '50%',
      cursor: this.getCursor(direction),
      zIndex: String(LAYOUT.Z_INDEX),
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      transition: 'transform 100ms ease-out, box-shadow 100ms ease-out',
    })

    // Hover effect is handled by CSS (.handle-element:hover)
    // No JS listeners needed - prevents memory leaks on hideHandles()

    return el
  }

  private renderHandles(): void {
    for (const handle of this.handles) {
      this.overlay.appendChild(handle.element)
    }
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'handle-overlay'
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: String(LAYOUT.Z_INDEX - 1),
    })

    // Ensure container has positioning
    if (!this.container.style.position || this.container.style.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.container.appendChild(overlay)
    return overlay
  }

  private setupEventListeners(): void {
    this.overlay.addEventListener('mousedown', this.boundMouseDown)
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  private onMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (!target.classList.contains('handle')) return

    e.preventDefault()
    e.stopPropagation()

    this.activeHandle = this.handles.find(h => h.element === target) || null

    if (this.activeHandle) {
      this.startDragPosition = { x: e.clientX, y: e.clientY }
      this.startValue = this.activeHandle.currentValue

      // Keep handle scaled while dragging and add active class (Feature 2)
      this.activeHandle.element.style.transform = 'scale(1.2)'
      this.activeHandle.element.classList.add('handle-active')

      const nodeId = state.get().selection.nodeId
      if (nodeId) {
        events.emit('handle:drag-start', {
          nodeId,
          property: this.activeHandle.property,
          startValue: this.startValue,
        })
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeHandle || !this.startDragPosition) return

    const delta = this.getDelta(e, this.activeHandle.direction)
    const sensitivity = e.shiftKey ? 0.5 : 1
    let newValue = Math.round(this.startValue + delta * sensitivity)

    // Get max value from settings (Feature 3)
    const settings = handleSnapSettings.get()
    const maxValue = settings.maxValue

    // Clamp to min/max
    newValue = Math.max(MIN_VALUE, Math.min(maxValue, newValue))

    // Snapping (unless Alt is held)
    if (!e.altKey && settings.enabled) {
      newValue = this.snapValue(newValue, settings.threshold)
    }

    // Update current value for live feedback
    this.activeHandle.currentValue = newValue
    this.showValueIndicator(e.clientX, e.clientY, newValue)

    const nodeId = state.get().selection.nodeId
    if (nodeId) {
      events.emit('handle:drag-move', {
        nodeId,
        property: this.activeHandle.property,
        value: newValue,
      })
    }
  }

  private onMouseUp(): void {
    if (this.activeHandle) {
      // Reset scale and remove active class (Feature 2)
      this.activeHandle.element.style.transform = 'scale(1)'
      this.activeHandle.element.classList.remove('handle-active')
      this.hideValueIndicator()

      const nodeId = state.get().selection.nodeId
      if (nodeId && this.startDragPosition) {
        events.emit('handle:drag-end', {
          nodeId,
          property: this.activeHandle.property,
          value: this.activeHandle.currentValue,
        })
      }
    }

    this.activeHandle = null
    this.startDragPosition = null
  }

  private getDelta(e: MouseEvent, direction: HandleDirection): number {
    if (!this.startDragPosition) return 0

    const dx = e.clientX - this.startDragPosition.x
    const dy = e.clientY - this.startDragPosition.y

    switch (direction) {
      case 'n': return -dy
      case 's': return dy
      case 'e': return dx
      case 'w': return -dx
      case 'ne': return (dx - dy) / 2  // Diagonal for radius
      default: return 0
    }
  }

  /**
   * Snap value to nearest grid point (Feature 3: Custom Snap Grids)
   *
   * Uses binary search for O(log n) performance instead of O(n) linear search.
   * This is important for smooth 60fps interaction during handle dragging.
   */
  private snapValue(value: number, threshold: number): number {
    const snapPoints = handleSnapSettings.getSnapPoints()

    // Empty or single point - quick exit
    if (snapPoints.length === 0) return value
    if (snapPoints.length === 1) {
      return Math.abs(value - snapPoints[0]) < threshold ? snapPoints[0] : value
    }

    // Binary search for the closest snap point
    // Note: snapPoints is assumed to be sorted (ascending)
    let left = 0
    let right = snapPoints.length - 1

    // Handle edge cases: value is outside the range
    if (value <= snapPoints[left]) {
      return Math.abs(value - snapPoints[left]) < threshold ? snapPoints[left] : value
    }
    if (value >= snapPoints[right]) {
      return Math.abs(value - snapPoints[right]) < threshold ? snapPoints[right] : value
    }

    // Binary search to find the two closest snap points
    while (right - left > 1) {
      const mid = Math.floor((left + right) / 2)
      if (snapPoints[mid] <= value) {
        left = mid
      } else {
        right = mid
      }
    }

    // Now left and right are the two closest snap points
    const leftDiff = Math.abs(value - snapPoints[left])
    const rightDiff = Math.abs(value - snapPoints[right])

    // Check if either is within threshold
    if (leftDiff < threshold && leftDiff <= rightDiff) {
      return snapPoints[left]
    }
    if (rightDiff < threshold) {
      return snapPoints[right]
    }

    // No snap point within threshold
    return value
  }

  private showValueIndicator(x: number, y: number, value: number): void {
    if (!this.valueIndicator) {
      this.valueIndicator = document.createElement('div')
      Object.assign(this.valueIndicator.style, {
        position: 'fixed',
        background: '#1F2937',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: String(LAYOUT.Z_INDEX_INDICATOR),
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      })
      document.body.appendChild(this.valueIndicator)
    }

    this.valueIndicator.textContent = `${value}px`
    this.valueIndicator.style.left = `${x + 16}px`
    this.valueIndicator.style.top = `${y - 8}px`
    this.valueIndicator.style.display = 'block'
  }

  private hideValueIndicator(): void {
    if (this.valueIndicator) {
      this.valueIndicator.remove()
      this.valueIndicator = null
    }
  }

  private getCursor(direction: HandleDirection): string {
    const cursors: Record<HandleDirection, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
    }
    return cursors[direction] || 'pointer'
  }

  /**
   * Clean up event listeners and DOM elements
   */
  dispose(): void {
    // Remove event listeners
    this.overlay.removeEventListener('mousedown', this.boundMouseDown)
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)

    // Remove DOM elements
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    if (this.valueIndicator?.parentNode) {
      this.valueIndicator.parentNode.removeChild(this.valueIndicator)
    }
  }
}

/**
 * Create a HandleManager instance
 */
export function createHandleManager(config: HandleManagerConfig): HandleManager {
  return new HandleManager(config)
}
