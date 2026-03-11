/**
 * SelectionAdapter - Bridges studio core state to SelectionManager interface
 *
 * This adapter provides the same public API as SelectionManager using the
 * studio core state and events, enabling PropertyPanelV2 integration.
 */

import { state, actions, events, type BreadcrumbItem } from './index'

export type SelectionListener = (nodeId: string | null, previousNodeId: string | null) => void
export type BreadcrumbListener = (chain: BreadcrumbItem[]) => void

/**
 * Adapter that provides SelectionManager-compatible API using studio core state
 */
export class StateSelectionAdapter {
  private listeners: Set<SelectionListener> = new Set()
  private breadcrumbListeners: Set<BreadcrumbListener> = new Set()
  private unsubscribeSelection: (() => void) | null = null
  private unsubscribeBreadcrumb: (() => void) | null = null

  constructor() {
    // Listen to selection changes from core state
    this.unsubscribeSelection = events.on('selection:changed', ({ nodeId }) => {
      this.notifyListeners(nodeId, null)
    })

    // Listen to breadcrumb changes from core state
    this.unsubscribeBreadcrumb = events.on('breadcrumb:changed', ({ breadcrumb }) => {
      this.notifyBreadcrumbListeners(breadcrumb)
    })
  }

  /**
   * Select a node by ID
   */
  select(nodeId: string | null): void {
    actions.setSelection(nodeId, 'panel')
  }

  /**
   * Get the currently selected node ID
   */
  getSelection(): string | null {
    return state.get().selection.nodeId
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
    return state.get().selection.nodeId === nodeId
  }

  /**
   * Subscribe to selection changes
   */
  subscribe(listener: SelectionListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Subscribe to breadcrumb changes
   */
  subscribeBreadcrumb(listener: BreadcrumbListener): () => void {
    this.breadcrumbListeners.add(listener)
    const currentBreadcrumb = state.get().breadcrumb
    if (currentBreadcrumb.length > 0) {
      listener(currentBreadcrumb)
    }
    return () => {
      this.breadcrumbListeners.delete(listener)
    }
  }

  /**
   * Set the current breadcrumb chain
   */
  setBreadcrumb(chain: BreadcrumbItem[]): void {
    actions.setBreadcrumb(chain)
  }

  /**
   * Get the current breadcrumb chain
   */
  getBreadcrumb(): BreadcrumbItem[] {
    return state.get().breadcrumb
  }

  /**
   * Get number of subscribers
   */
  get subscriberCount(): number {
    return this.listeners.size
  }

  /**
   * Hover - not used by PropertyPanelV2 but provided for compatibility
   */
  hover(_nodeId: string | null): void {}
  getHoveredNode(): string | null { return null }
  subscribeHover(_listener: SelectionListener): () => void { return () => {} }

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
   * Dispose the adapter
   */
  dispose(): void {
    if (this.unsubscribeSelection) {
      this.unsubscribeSelection()
      this.unsubscribeSelection = null
    }
    if (this.unsubscribeBreadcrumb) {
      this.unsubscribeBreadcrumb()
      this.unsubscribeBreadcrumb = null
    }
    this.listeners.clear()
    this.breadcrumbListeners.clear()
  }
}

let instance: StateSelectionAdapter | null = null

export function getStateSelectionAdapter(): StateSelectionAdapter {
  if (!instance) {
    instance = new StateSelectionAdapter()
  }
  return instance
}

export function disposeStateSelectionAdapter(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
