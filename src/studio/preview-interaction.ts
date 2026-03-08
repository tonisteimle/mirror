/**
 * PreviewInteraction - Handles click and hover on preview elements
 *
 * Connects DOM events in the preview to the SelectionManager:
 * - Click on element → select it
 * - Hover → highlight it
 * - Click outside → deselect
 */

import type { SelectionManager } from './selection-manager'

/**
 * Options for PreviewInteraction
 */
export interface PreviewInteractionOptions {
  /** CSS class to add for hover highlight */
  hoverClass?: string
  /** CSS class to add for selection highlight */
  selectedClass?: string
  /** Whether to stop propagation on click */
  stopPropagation?: boolean
  /** Custom attribute name for node IDs (default: data-mirror-id) */
  nodeIdAttribute?: string
}

/**
 * Default highlight styles
 */
const DEFAULT_HOVER_STYLES = {
  outline: '2px solid rgba(59, 130, 246, 0.5)',
  outlineOffset: '-2px',
}

const DEFAULT_SELECTED_STYLES = {
  outline: '2px solid #3B82F6',
  outlineOffset: '-2px',
}

/**
 * PreviewInteraction class
 */
export class PreviewInteraction {
  private container: HTMLElement
  private selectionManager: SelectionManager
  private options: Required<PreviewInteractionOptions>

  private currentHoverElement: HTMLElement | null = null
  private currentSelectedElement: HTMLElement | null = null

  private boundHandleClick: (e: MouseEvent) => void
  private boundHandleMouseOver: (e: MouseEvent) => void
  private boundHandleMouseOut: (e: MouseEvent) => void

  private unsubscribeSelection: (() => void) | null = null
  private unsubscribeHover: (() => void) | null = null

  constructor(
    container: HTMLElement,
    selectionManager: SelectionManager,
    options: PreviewInteractionOptions = {}
  ) {
    this.container = container
    this.selectionManager = selectionManager
    this.options = {
      hoverClass: options.hoverClass || '',
      selectedClass: options.selectedClass || '',
      stopPropagation: options.stopPropagation ?? true,
      nodeIdAttribute: options.nodeIdAttribute || 'data-mirror-id',
    }

    // Bind event handlers
    this.boundHandleClick = this.handleClick.bind(this)
    this.boundHandleMouseOver = this.handleMouseOver.bind(this)
    this.boundHandleMouseOut = this.handleMouseOut.bind(this)

    this.attach()
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    this.container.addEventListener('click', this.boundHandleClick)
    this.container.addEventListener('mouseover', this.boundHandleMouseOver)
    this.container.addEventListener('mouseout', this.boundHandleMouseOut)

    // Subscribe to selection changes to update visual state and breadcrumb
    this.unsubscribeSelection = this.selectionManager.subscribe((nodeId, previousNodeId) => {
      this.updateSelectionVisual(nodeId, previousNodeId)
      // Update breadcrumb chain
      if (nodeId) {
        const element = this.findElementByNodeId(nodeId)
        if (element) {
          const chain = this.getAncestorChain(element).map(item => ({
            nodeId: item.id,
            name: item.name,
          }))
          this.selectionManager.setBreadcrumb(chain)
        }
      } else {
        this.selectionManager.setBreadcrumb([])
      }
    })

    this.unsubscribeHover = this.selectionManager.subscribeHover((nodeId, previousNodeId) => {
      this.updateHoverVisual(nodeId, previousNodeId)
    })
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    this.container.removeEventListener('click', this.boundHandleClick)
    this.container.removeEventListener('mouseover', this.boundHandleMouseOver)
    this.container.removeEventListener('mouseout', this.boundHandleMouseOut)

    if (this.unsubscribeSelection) {
      this.unsubscribeSelection()
      this.unsubscribeSelection = null
    }

    if (this.unsubscribeHover) {
      this.unsubscribeHover()
      this.unsubscribeHover = null
    }

    // Clear visual state
    this.clearHighlight(this.currentHoverElement)
    this.clearSelection(this.currentSelectedElement)
    this.currentHoverElement = null
    this.currentSelectedElement = null
  }

  /**
   * Handle click events
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement
    const nodeId = this.findNodeId(target)

    if (this.options.stopPropagation && nodeId) {
      e.stopPropagation()
    }

    this.selectionManager.select(nodeId)
  }

  /**
   * Handle mouseover events
   */
  private handleMouseOver(e: MouseEvent): void {
    const target = e.target as HTMLElement
    const nodeId = this.findNodeId(target)

    this.selectionManager.hover(nodeId)
  }

  /**
   * Handle mouseout events
   */
  private handleMouseOut(e: MouseEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement | null

    // Only clear hover if leaving the container entirely
    // or moving to an element without a node ID
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.selectionManager.hover(null)
    }
  }

  /**
   * Find the node ID for an element by traversing up the DOM tree
   */
  private findNodeId(element: HTMLElement): string | null {
    let current: HTMLElement | null = element

    while (current && current !== this.container) {
      const nodeId = current.getAttribute(this.options.nodeIdAttribute)
      if (nodeId) {
        return nodeId
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Find element by node ID
   */
  private findElementByNodeId(nodeId: string): HTMLElement | null {
    return this.container.querySelector(`[${this.options.nodeIdAttribute}="${nodeId}"]`)
  }

  /**
   * Update visual state when selection changes
   */
  private updateSelectionVisual(nodeId: string | null, previousNodeId: string | null): void {
    // Clear previous selection
    if (previousNodeId && this.currentSelectedElement) {
      this.clearSelection(this.currentSelectedElement)
      this.currentSelectedElement = null
    }

    // Apply new selection
    if (nodeId) {
      const element = this.findElementByNodeId(nodeId)
      if (element) {
        this.applySelection(element)
        this.currentSelectedElement = element
      }
    }
  }

  /**
   * Update visual state when hover changes
   */
  private updateHoverVisual(nodeId: string | null, previousNodeId: string | null): void {
    // Clear previous hover
    if (previousNodeId && this.currentHoverElement) {
      this.clearHighlight(this.currentHoverElement)
      this.currentHoverElement = null
    }

    // Apply new hover (but not if it's the selected element)
    if (nodeId && nodeId !== this.selectionManager.getSelection()) {
      const element = this.findElementByNodeId(nodeId)
      if (element) {
        this.applyHighlight(element)
        this.currentHoverElement = element
      }
    }
  }

  /**
   * Apply hover highlight to an element
   */
  private applyHighlight(element: HTMLElement): void {
    if (this.options.hoverClass) {
      element.classList.add(this.options.hoverClass)
    } else {
      // Apply default styles
      element.style.outline = DEFAULT_HOVER_STYLES.outline
      element.style.outlineOffset = DEFAULT_HOVER_STYLES.outlineOffset
    }
  }

  /**
   * Clear hover highlight from an element
   */
  private clearHighlight(element: HTMLElement | null): void {
    if (!element) return

    if (this.options.hoverClass) {
      element.classList.remove(this.options.hoverClass)
    } else {
      element.style.outline = ''
      element.style.outlineOffset = ''
    }
  }

  /**
   * Apply selection highlight to an element
   */
  private applySelection(element: HTMLElement): void {
    if (this.options.selectedClass) {
      element.classList.add(this.options.selectedClass)
    } else {
      element.style.outline = DEFAULT_SELECTED_STYLES.outline
      element.style.outlineOffset = DEFAULT_SELECTED_STYLES.outlineOffset
    }
  }

  /**
   * Clear selection highlight from an element
   */
  private clearSelection(element: HTMLElement | null): void {
    if (!element) return

    if (this.options.selectedClass) {
      element.classList.remove(this.options.selectedClass)
    } else {
      element.style.outline = ''
      element.style.outlineOffset = ''
    }
  }

  /**
   * Get the ancestor chain for breadcrumb navigation
   * Returns array from root to selected element
   */
  getAncestorChain(element: HTMLElement): { id: string; name: string }[] {
    const chain: { id: string; name: string }[] = []
    let current: HTMLElement | null = element

    while (current && current !== this.container) {
      const id = current.dataset?.mirrorId
      const name = current.dataset?.mirrorName || current.tagName.toLowerCase()
      if (id) {
        chain.push({ id, name })
      }
      current = current.parentElement
    }

    return chain.reverse() // Root → Selected
  }

  /**
   * Get the ancestor chain for the currently selected element
   */
  getSelectedAncestorChain(): { id: string; name: string }[] | null {
    const selectedId = this.selectionManager.getSelection()
    if (!selectedId) return null

    const element = this.findElementByNodeId(selectedId)
    if (!element) return null

    return this.getAncestorChain(element)
  }

  /**
   * Refresh the visual state (useful after preview re-render)
   */
  refresh(): void {
    const selectedId = this.selectionManager.getSelection()
    const hoveredId = this.selectionManager.getHoveredNode()

    // Clear current visuals
    this.clearSelection(this.currentSelectedElement)
    this.clearHighlight(this.currentHoverElement)
    this.currentSelectedElement = null
    this.currentHoverElement = null

    // Reapply selection visual and update breadcrumb
    if (selectedId) {
      this.updateSelectionVisual(selectedId, null)
      // Update breadcrumb based on new DOM
      const element = this.findElementByNodeId(selectedId)
      if (element) {
        const chain = this.getAncestorChain(element).map(item => ({
          nodeId: item.id,
          name: item.name,
        }))
        this.selectionManager.setBreadcrumb(chain)
      } else {
        // Element no longer exists in DOM, clear breadcrumb
        this.selectionManager.setBreadcrumb([])
      }
    } else {
      this.selectionManager.setBreadcrumb([])
    }

    if (hoveredId && hoveredId !== selectedId) {
      this.updateHoverVisual(hoveredId, null)
    }
  }

  /**
   * Dispose the interaction handler
   */
  dispose(): void {
    this.detach()
  }
}

/**
 * Create a PreviewInteraction for a container
 */
export function createPreviewInteraction(
  container: HTMLElement,
  selectionManager: SelectionManager,
  options?: PreviewInteractionOptions
): PreviewInteraction {
  return new PreviewInteraction(container, selectionManager, options)
}
