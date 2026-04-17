/**
 * Indicator - Visual insertion line and container highlight
 *
 * Shows both:
 * 1. An insertion line where the element will be placed
 * 2. A highlight around the target container
 *
 * No create/destroy cycles, no transitions for max responsiveness.
 */

import type { Point } from './types'
import type { IndicatorReport, Reportable } from './reporter/types'

const INDICATOR_ID = 'drag-insertion-indicator'
const CONTAINER_HIGHLIGHT_ID = 'drag-container-highlight'
const GHOST_INDICATOR_ID = 'drag-ghost-indicator'
const ALIGNMENT_ZONES_ID = 'drag-alignment-zones'
const INDICATOR_COLOR = '#5BA8F5'
const INDICATOR_GLOW = 'rgba(91, 168, 245, 0.4)'
const GHOST_COLOR = 'rgba(139, 92, 246, 0.08)'
const GHOST_BORDER = 'rgba(139, 92, 246, 0.4)'
const INDICATOR_THICKNESS = 3

/** Minimum container size to show alignment zones (in pixels) */
const MIN_SIZE_FOR_ALIGNMENT_ZONES = 80

/** All 9 alignment positions */
export type AlignPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** Map from position to Mirror DSL property */
export const ALIGN_TO_PROPERTY: Record<AlignPosition, string> = {
  'top-left': 'tl',
  'top-center': 'tc',
  'top-right': 'tr',
  'center-left': 'cl',
  center: 'center',
  'center-right': 'cr',
  'bottom-left': 'bl',
  'bottom-center': 'bc',
  'bottom-right': 'br',
}

export class Indicator implements Reportable<IndicatorReport> {
  private element: HTMLDivElement | null = null
  private containerHighlight: HTMLDivElement | null = null
  private ghostElement: HTMLDivElement | null = null
  private alignmentZonesContainer: HTMLDivElement | null = null
  private alignmentZones: Map<AlignPosition, HTMLDivElement> = new Map()
  private currentContainerId: string | null = null
  private hoveredAlignPosition: AlignPosition | null = null

  // Last state for reporting
  private lastLinePosition: Point | null = null
  private lastHighlightRect: DOMRect | null = null
  private lastGhostRect: DOMRect | null = null

  /** Ensure the indicator element exists */
  private ensureElement(): HTMLDivElement {
    if (this.element) return this.element

    this.element = this.createElement()
    document.body.appendChild(this.element)
    return this.element
  }

  /** Ensure the container highlight element exists */
  private ensureContainerHighlight(): HTMLDivElement {
    if (this.containerHighlight) return this.containerHighlight

    this.containerHighlight = this.createContainerHighlight()
    document.body.appendChild(this.containerHighlight)
    return this.containerHighlight
  }

  /** Create the indicator DOM element */
  private createElement(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = INDICATOR_ID
    this.applyStyles(el)
    return el
  }

  /** Create the container highlight DOM element */
  private createContainerHighlight(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = CONTAINER_HIGHLIGHT_ID
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      border: `1px dashed ${INDICATOR_COLOR}`,
      borderRadius: '4px',
      display: 'none',
      background: 'rgba(91, 168, 245, 0.08)',
      willChange: 'left, top, width, height',
      transition: 'all 0.15s ease-out',
    })
    return el
  }

  /** Apply indicator styles */
  private applyStyles(el: HTMLDivElement): void {
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: INDICATOR_COLOR,
      borderRadius: '2px',
      display: 'none',
      boxShadow: `0 0 8px ${INDICATOR_GLOW}`,
      willChange: 'left, top, width, height',
      transition: 'none',
    })
  }

  /** Show indicator at position */
  show(position: Point, size: number, orientation: 'horizontal' | 'vertical'): void {
    const el = this.ensureElement()
    this.setPosition(el, position)
    this.setSize(el, size, orientation)
    el.style.display = 'block'

    // Hide ghost when showing line indicator
    this.hideGhost()

    // Store for reporting
    this.lastLinePosition = { ...position }
  }

  /** Show ghost indicator for absolute positioning */
  showGhost(rect: DOMRect, sourceElement?: HTMLElement): void {
    const el = this.ensureGhostElement()
    el.style.left = `${rect.x}px`
    el.style.top = `${rect.y}px`
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'

    // If source element provided, show a clone of it inside the ghost
    if (sourceElement) {
      this.updateGhostContent(el, sourceElement)
    } else {
      // Clear any previous content for palette drops
      el.innerHTML = ''
    }

    // Hide line indicator when showing ghost
    if (this.element) {
      this.element.style.display = 'none'
    }

    // Store for reporting
    this.lastGhostRect = rect
    this.lastLinePosition = null
  }

  /** Update ghost content with a clone of the source element */
  private updateGhostContent(ghost: HTMLDivElement, sourceElement: HTMLElement): void {
    // Only update if content changed (avoid flicker)
    const sourceId = sourceElement.getAttribute('data-mirror-id')
    if (ghost.dataset.sourceId === sourceId) return
    ghost.dataset.sourceId = sourceId || ''

    // Clone the element
    const clone = sourceElement.cloneNode(true) as HTMLElement

    // Reset positioning on clone (it will be positioned by the ghost container)
    clone.style.position = 'static'
    clone.style.left = ''
    clone.style.top = ''
    clone.style.transform = ''
    clone.style.opacity = '0.85'
    clone.style.pointerEvents = 'none'

    // Remove drag-related attributes
    clone.removeAttribute('draggable')
    delete clone.dataset.dragging
    delete clone.dataset.mirrorId

    // Clear and add the clone
    ghost.innerHTML = ''
    ghost.appendChild(clone)

    // Adjust ghost styling when showing content
    ghost.style.background = 'transparent'
    ghost.style.border = `2px solid ${GHOST_BORDER}`
    ghost.style.overflow = 'hidden'
  }

  /** Hide ghost indicator */
  hideGhost(): void {
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
      this.ghostElement.innerHTML = ''
      delete this.ghostElement.dataset.sourceId
      // Reset to default ghost styling
      this.ghostElement.style.background = GHOST_COLOR
      this.ghostElement.style.border = `2px dashed ${GHOST_BORDER}`
    }
    this.lastGhostRect = null
  }

  /** Ensure the ghost element exists */
  private ensureGhostElement(): HTMLDivElement {
    if (this.ghostElement) return this.ghostElement

    this.ghostElement = document.createElement('div')
    this.ghostElement.id = GHOST_INDICATOR_ID
    Object.assign(this.ghostElement.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: GHOST_COLOR,
      border: `2px dashed ${GHOST_BORDER}`,
      borderRadius: '4px',
      display: 'none',
      willChange: 'left, top, width, height',
    })
    document.body.appendChild(this.ghostElement)
    return this.ghostElement
  }

  /** Highlight the target container */
  highlightContainer(containerId: string, rect: DOMRect): void {
    // Skip if same container
    if (this.currentContainerId === containerId) return
    this.currentContainerId = containerId

    const el = this.ensureContainerHighlight()
    el.style.left = `${rect.x}px`
    el.style.top = `${rect.y}px`
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'

    // Store for reporting
    this.lastHighlightRect = rect
  }

  /** Hide container highlight (for same-container moves) */
  hideContainerHighlight(): void {
    if (this.containerHighlight) {
      this.containerHighlight.style.display = 'none'
    }
    this.currentContainerId = null
    this.lastHighlightRect = null
  }

  /** Set position styles */
  private setPosition(el: HTMLDivElement, position: Point): void {
    el.style.left = `${position.x}px`
    el.style.top = `${position.y}px`
  }

  /** Set size based on orientation */
  private setSize(el: HTMLDivElement, size: number, orientation: 'horizontal' | 'vertical'): void {
    el.style.width = `${orientation === 'horizontal' ? size : INDICATOR_THICKNESS}px`
    el.style.height = `${orientation === 'vertical' ? size : INDICATOR_THICKNESS}px`
  }

  /**
   * Hide the indicator and container highlight
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none'
    }
    if (this.containerHighlight) {
      this.containerHighlight.style.display = 'none'
    }
    this.hideGhost()
    this.hideAlignmentZones()
    this.currentContainerId = null
    this.lastLinePosition = null
    this.lastHighlightRect = null
  }

  /**
   * Check if indicator is currently visible
   */
  isVisible(): boolean {
    return this.element?.style.display === 'block'
  }

  // ===========================================================================
  // Alignment Zones (9-point grid for empty containers)
  // ===========================================================================

  /**
   * Check if container is large enough for alignment zones
   */
  isLargeEnoughForAlignmentZones(rect: DOMRect): boolean {
    return rect.width >= MIN_SIZE_FOR_ALIGNMENT_ZONES && rect.height >= MIN_SIZE_FOR_ALIGNMENT_ZONES
  }

  /**
   * Show the 9-point alignment zone grid for empty containers
   */
  showAlignmentZones(rect: DOMRect): void {
    // Hide other indicators
    if (this.element) this.element.style.display = 'none'
    this.hideGhost()

    const container = this.ensureAlignmentZonesContainer()
    container.style.left = `${rect.x}px`
    container.style.top = `${rect.y}px`
    container.style.width = `${rect.width}px`
    container.style.height = `${rect.height}px`
    container.style.display = 'grid'
  }

  /**
   * Hide alignment zones
   */
  hideAlignmentZones(): void {
    if (this.alignmentZonesContainer) {
      this.alignmentZonesContainer.style.display = 'none'
    }
    this.hoveredAlignPosition = null
  }

  /**
   * Get the currently hovered alignment position based on cursor
   */
  getAlignmentPositionFromCursor(cursor: Point, containerRect: DOMRect): AlignPosition {
    // Divide container into 3x3 grid
    const thirdWidth = containerRect.width / 3
    const thirdHeight = containerRect.height / 3
    const relX = cursor.x - containerRect.x
    const relY = cursor.y - containerRect.y

    // Determine column (left, center, right)
    let col: 'left' | 'center' | 'right'
    if (relX < thirdWidth) col = 'left'
    else if (relX < thirdWidth * 2) col = 'center'
    else col = 'right'

    // Determine row (top, center, bottom)
    let row: 'top' | 'center' | 'bottom'
    if (relY < thirdHeight) row = 'top'
    else if (relY < thirdHeight * 2) row = 'center'
    else row = 'bottom'

    // Combine to position
    if (row === 'center' && col === 'center') return 'center'
    if (row === 'center') return `center-${col}` as AlignPosition
    if (col === 'center') return `${row}-center` as AlignPosition
    return `${row}-${col}` as AlignPosition
  }

  /**
   * Update which zone is hovered (highlights the active zone)
   */
  updateHoveredZone(position: AlignPosition): void {
    if (position === this.hoveredAlignPosition) return
    this.hoveredAlignPosition = position

    // Update visual state of all zones
    for (const [pos, zone] of this.alignmentZones) {
      if (pos === position) {
        zone.classList.add('active')
      } else {
        zone.classList.remove('active')
      }
    }
  }

  /**
   * Get currently hovered alignment position
   */
  getHoveredAlignPosition(): AlignPosition | null {
    return this.hoveredAlignPosition
  }

  /**
   * Check if alignment zones are visible
   */
  areAlignmentZonesVisible(): boolean {
    return this.alignmentZonesContainer?.style.display === 'grid'
  }

  /** Ensure alignment zones container exists */
  private ensureAlignmentZonesContainer(): HTMLDivElement {
    if (this.alignmentZonesContainer) return this.alignmentZonesContainer

    this.alignmentZonesContainer = document.createElement('div')
    this.alignmentZonesContainer.id = ALIGNMENT_ZONES_ID
    Object.assign(this.alignmentZonesContainer.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      display: 'none',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      background: 'rgba(91, 168, 245, 0.05)',
      border: `1px dashed ${INDICATOR_COLOR}`,
      borderRadius: '4px',
    })

    // Create the 9 zones
    const positions: AlignPosition[] = [
      'top-left',
      'top-center',
      'top-right',
      'center-left',
      'center',
      'center-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ]

    for (const pos of positions) {
      const zone = document.createElement('div')
      zone.dataset.position = pos
      zone.className = 'alignment-zone'
      Object.assign(zone.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s ease-out',
      })

      // Add dot indicator
      const dot = document.createElement('div')
      dot.className = 'alignment-dot'
      Object.assign(dot.style, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'rgba(128, 128, 128, 0.3)',
        transition: 'all 0.15s ease-out',
      })
      zone.appendChild(dot)

      this.alignmentZones.set(pos, zone)
      this.alignmentZonesContainer.appendChild(zone)
    }

    // Add styles for active state via stylesheet
    const style = document.createElement('style')
    style.textContent = `
      #${ALIGNMENT_ZONES_ID} .alignment-zone.active {
        background: rgba(91, 168, 245, 0.15);
      }
      #${ALIGNMENT_ZONES_ID} .alignment-zone.active .alignment-dot {
        background: ${INDICATOR_COLOR};
        transform: scale(1.3);
        box-shadow: 0 0 6px ${INDICATOR_GLOW};
      }
    `
    document.head.appendChild(style)

    document.body.appendChild(this.alignmentZonesContainer)
    return this.alignmentZonesContainer
  }

  /**
   * Remove the indicator from DOM completely
   * Call on cleanup/unmount
   */
  destroy(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
    if (this.containerHighlight) {
      this.containerHighlight.remove()
      this.containerHighlight = null
    }
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
    if (this.alignmentZonesContainer) {
      this.alignmentZonesContainer.remove()
      this.alignmentZonesContainer = null
    }
    this.alignmentZones.clear()
    this.currentContainerId = null
    this.lastLinePosition = null
    this.lastHighlightRect = null
    this.lastGhostRect = null
    this.hoveredAlignPosition = null
  }

  /** Report current state for debugging */
  report(): IndicatorReport {
    const lineVisible = this.element?.style.display === 'block'
    const ghostVisible = this.ghostElement?.style.display === 'block'
    const highlightVisible = this.containerHighlight?.style.display === 'block'

    return {
      lineVisible,
      linePosition: this.lastLinePosition ? { ...this.lastLinePosition } : null,
      ghostVisible: ghostVisible ?? false,
      ghostRect: this.lastGhostRect,
      highlightVisible,
      highlightedContainerId: this.currentContainerId,
      highlightRect: this.lastHighlightRect,
    }
  }
}
