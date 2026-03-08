/**
 * SelectionManager - Central event hub for element selection
 *
 * Manages the currently selected element in the preview and notifies
 * all subscribers when selection changes.
 */

export type SelectionListener = (nodeId: string | null, previousNodeId: string | null) => void

/**
 * Breadcrumb item for ancestor chain
 */
export interface BreadcrumbItem {
  nodeId: string
  name: string
}

export type BreadcrumbListener = (chain: BreadcrumbItem[]) => void

/**
 * SelectionManager class
 */
export class SelectionManager {
  private selectedNodeId: string | null = null
  private hoveredNodeId: string | null = null
  private listeners: Set<SelectionListener> = new Set()
  private hoverListeners: Set<SelectionListener> = new Set()
  private breadcrumbListeners: Set<BreadcrumbListener> = new Set()
  private currentBreadcrumb: BreadcrumbItem[] = []

  /**
   * Select a node by ID
   * @param nodeId The node ID to select, or null to clear selection
   */
  select(nodeId: string | null): void {
    if (nodeId === this.selectedNodeId) {
      return // No change
    }

    const previous = this.selectedNodeId
    this.selectedNodeId = nodeId
    this.notifyListeners(nodeId, previous)
  }

  /**
   * Get the currently selected node ID
   */
  getSelection(): string | null {
    return this.selectedNodeId
  }

  /**
   * Clear the current selection
   */
  clearSelection(): void {
    this.select(null)
  }

  /**
   * Check if a specific node is selected
   */
  isSelected(nodeId: string): boolean {
    return this.selectedNodeId === nodeId
  }

  /**
   * Set hover state for a node
   * @param nodeId The node ID being hovered, or null to clear hover
   */
  hover(nodeId: string | null): void {
    if (nodeId === this.hoveredNodeId) {
      return // No change
    }

    const previous = this.hoveredNodeId
    this.hoveredNodeId = nodeId
    this.notifyHoverListeners(nodeId, previous)
  }

  /**
   * Get the currently hovered node ID
   */
  getHoveredNode(): string | null {
    return this.hoveredNodeId
  }

  /**
   * Subscribe to selection changes
   * @param listener The callback to invoke when selection changes
   * @returns Unsubscribe function
   */
  subscribe(listener: SelectionListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Subscribe to hover changes
   * @param listener The callback to invoke when hover changes
   * @returns Unsubscribe function
   */
  subscribeHover(listener: SelectionListener): () => void {
    this.hoverListeners.add(listener)
    return () => {
      this.hoverListeners.delete(listener)
    }
  }

  /**
   * Subscribe to breadcrumb changes
   * @param listener The callback to invoke when breadcrumb changes
   * @returns Unsubscribe function
   */
  subscribeBreadcrumb(listener: BreadcrumbListener): () => void {
    this.breadcrumbListeners.add(listener)
    // Immediately call with current breadcrumb
    if (this.currentBreadcrumb.length > 0) {
      listener(this.currentBreadcrumb)
    }
    return () => {
      this.breadcrumbListeners.delete(listener)
    }
  }

  /**
   * Set the current breadcrumb chain
   * Called by PreviewInteraction when selection changes
   */
  setBreadcrumb(chain: BreadcrumbItem[]): void {
    this.currentBreadcrumb = chain
    this.notifyBreadcrumbListeners(chain)
  }

  /**
   * Get the current breadcrumb chain
   */
  getBreadcrumb(): BreadcrumbItem[] {
    return this.currentBreadcrumb
  }

  /**
   * Get number of subscribers
   */
  get subscriberCount(): number {
    return this.listeners.size
  }

  /**
   * Notify all selection listeners
   */
  private notifyListeners(nodeId: string | null, previousNodeId: string | null): void {
    for (const listener of this.listeners) {
      try {
        listener(nodeId, previousNodeId)
      } catch (error) {
        console.error('Error in selection listener:', error)
      }
    }
  }

  /**
   * Notify all hover listeners
   */
  private notifyHoverListeners(nodeId: string | null, previousNodeId: string | null): void {
    for (const listener of this.hoverListeners) {
      try {
        listener(nodeId, previousNodeId)
      } catch (error) {
        console.error('Error in hover listener:', error)
      }
    }
  }

  /**
   * Notify all breadcrumb listeners
   */
  private notifyBreadcrumbListeners(chain: BreadcrumbItem[]): void {
    for (const listener of this.breadcrumbListeners) {
      try {
        listener(chain)
      } catch (error) {
        console.error('Error in breadcrumb listener:', error)
      }
    }
  }

  /**
   * Dispose the manager and clear all listeners
   */
  dispose(): void {
    this.listeners.clear()
    this.hoverListeners.clear()
    this.breadcrumbListeners.clear()
    this.selectedNodeId = null
    this.hoveredNodeId = null
    this.currentBreadcrumb = []
  }
}

/**
 * Create a singleton SelectionManager instance
 */
let defaultInstance: SelectionManager | null = null

export function getSelectionManager(): SelectionManager {
  if (!defaultInstance) {
    defaultInstance = new SelectionManager()
  }
  return defaultInstance
}

export function resetSelectionManager(): void {
  if (defaultInstance) {
    defaultInstance.dispose()
    defaultInstance = null
  }
}
