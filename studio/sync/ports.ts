/**
 * SyncCoordinator Ports (Hexagonal Architecture)
 *
 * Port interfaces that abstract external dependencies for testability.
 * These enable testing SyncCoordinator without DOM, global state, or event systems.
 *
 * Architecture:
 * ```
 * SyncCoordinator (pure orchestration logic)
 *        │
 *        ├── EventBusPort (event subscription/emission)
 *        ├── StateStorePort (selection, breadcrumb state)
 *        ├── DOMQueryPort (preview element queries)
 *        └── ClockPort (timers, animation frames)
 * ```
 */

// ============================================
// Re-export SelectionOrigin from core
// ============================================

import type { SelectionOrigin as CoreSelectionOrigin } from '../core/state'
export type SelectionOrigin = CoreSelectionOrigin

// ============================================
// Breadcrumb Types
// ============================================

export interface BreadcrumbItem {
  nodeId: string
  name: string
}

// ============================================
// Event Bus Port
// ============================================

/**
 * EventBusPort abstracts the global event system.
 * Enables isolated testing without global event bus coupling.
 */
export interface EventBusPort {
  /**
   * Subscribe to a selection changed event.
   * Returns cleanup function.
   */
  onSelectionChanged(handler: (data: SelectionChangedEvent) => void): CleanupFn

  /**
   * Emit a definition selected event (for .com files).
   * Note: This only makes sense when triggered from editor (cursor on definition line).
   */
  emitDefinitionSelected(componentName: string, origin: 'editor'): void
}

export interface SelectionChangedEvent {
  nodeId: string | null
  origin: SelectionOrigin
}

// ============================================
// State Store Port
// ============================================

/**
 * StateStorePort abstracts the global state store.
 * Handles selection state and breadcrumb updates.
 */
export interface StateStorePort {
  /**
   * Get current selection from state.
   */
  getSelection(): { nodeId: string | null; origin: SelectionOrigin }

  /**
   * Set selection in state (triggers selection:changed event).
   */
  setSelection(nodeId: string | null, origin: SelectionOrigin): void

  /**
   * Set multiple elements as selected (multiselection).
   */
  setMultiSelection(nodeIds: string[]): void

  /**
   * Clear multiselection.
   */
  clearMultiSelection(): void

  /**
   * Update breadcrumb in state.
   */
  setBreadcrumb(breadcrumb: BreadcrumbItem[]): void
}

// ============================================
// DOM Query Port
// ============================================

/**
 * DOMQueryPort abstracts DOM queries for preview elements.
 * Enables testing without jsdom or real DOM.
 */
export interface DOMQueryPort {
  /**
   * Find root element in preview container.
   * Used for initial sync when no selection exists.
   */
  findRootMirrorElement(): { nodeId: string } | null

  /**
   * Find element by mirror ID in preview.
   * Returns element info for breadcrumb computation.
   */
  findElementByMirrorId(nodeId: string): PreviewElement | null

  /**
   * Get parent element with mirror ID.
   * Returns null if no more parents with mirror IDs.
   */
  getParentWithMirrorId(element: PreviewElement): PreviewElement | null

  /**
   * Check if element is the preview container boundary.
   */
  isPreviewBoundary(element: PreviewElement): boolean
}

export interface PreviewElement {
  /** The data-mirror-id attribute value */
  nodeId: string
  /** Reference for parent traversal (opaque to tests) */
  _ref?: unknown
}

// ============================================
// Clock Port
// ============================================

/**
 * ClockPort abstracts timing APIs.
 * Enables deterministic testing of debounce and async operations.
 */
export interface ClockPort {
  /**
   * Schedule a callback after delay.
   */
  setTimeout(callback: () => void, delay: number): number

  /**
   * Cancel a scheduled timeout.
   */
  clearTimeout(id: number): void

  /**
   * Schedule a callback for next animation frame.
   */
  requestAnimationFrame(callback: () => void): number

  /**
   * Cancel a scheduled animation frame.
   */
  cancelAnimationFrame(id: number): void
}

// ============================================
// SourceMap Port
// ============================================

/**
 * SourceMapPort abstracts SourceMap queries.
 * Enables testing without real SourceMap instances.
 */
export interface SourceMapPort {
  /**
   * Get node by ID from SourceMap.
   */
  getNodeById(nodeId: string): SourceMapNode | null

  /**
   * Get node at a specific line.
   */
  getNodeAtLine(line: number): SourceMapNode | null

  /**
   * Get definition at a specific line (for .com files).
   */
  getDefinitionAtLine(line: number): SourceMapDefinition | null
}

export interface SourceMapNode {
  nodeId: string
  componentName: string
  position?: { line: number; column: number }
}

export interface SourceMapDefinition {
  componentName: string
  position: { line: number; column: number }
}

// ============================================
// Combined Ports
// ============================================

/**
 * All ports required by SyncCoordinator.
 */
export interface SyncPorts {
  eventBus: EventBusPort
  stateStore: StateStorePort
  domQuery: DOMQueryPort
  clock: ClockPort
}

// ============================================
// Cleanup Function Type
// ============================================

export type CleanupFn = () => void
