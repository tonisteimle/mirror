import type { ASTNode } from '../../parser/parser'
import React from 'react'
import { getStylesFromNode as getStylesFromNodeUtil } from '../../utils/style-converter'

// ============================================
// Behavior State Types
// ============================================

/**
 * Typed behavior states for library components.
 * Provides type safety for component state management.
 */
export type BehaviorState = 'open' | 'closed' | 'on' | 'off' | 'checked' | 'unchecked' | 'visible' | 'hidden' | 'default'

// ============================================
// Render Function Type
// ============================================

// Type for render function passed to behavior handlers
export type RenderFn = (
  node: ASTNode,
  options?: {
    skipLibraryHandling?: boolean
  }
) => React.ReactNode

// ============================================
// Behavior Handler Interface
// ============================================

// Interface for behavior handlers
export interface BehaviorHandler {
  // The library component name this handler handles
  name: string

  // Render the library component with its slots
  render(
    node: ASTNode,
    children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ): React.ReactNode
}

// ============================================
// Behavior Registry Interface
// ============================================

// Registry for all behavior handlers
export interface BehaviorRegistry {
  getHandler(name: string): BehaviorHandler | undefined
  getState(componentId: string): BehaviorState | string | undefined
  setState(componentId: string, state: BehaviorState | string): void
  toggle(componentId: string): void
  // Behavior actions for dropdowns, lists, etc.
  highlight(itemId: string, containerId: string): void
  highlightNext(containerId: string): void
  highlightPrev(containerId: string): void
  highlightFirst(containerId: string): void
  highlightLast(containerId: string): void
  highlightSelfAndBefore(itemId: string, containerId: string): void
  highlightAll(containerId: string): void
  highlightNone(containerId: string): void
  select(itemId: string, containerId: string): void
  selectHighlighted(containerId: string): void
  selectSelfAndBefore(itemId: string, containerId: string): void
  selectAll(containerId: string): void
  selectNone(containerId: string): void
  filter(containerId: string, query: string): void
  // Activation actions for tabs, toggle groups
  deactivateSiblings(itemId: string, containerId: string): void
  // Getters for behavior state
  getHighlightedItem(containerId: string): string | null
  getSelectedItem(containerId: string): string | null
  getHighlightedItems(containerId: string): Set<string>
  getSelectedItems(containerId: string): Set<string>
  isItemHighlighted(itemId: string, containerId: string): boolean
  isItemSelected(itemId: string, containerId: string): boolean
  getFilterQuery(containerId: string): string
  // Item registration for containers
  registerContainerItem(containerId: string, itemId: string): void
  unregisterContainerItem(containerId: string, itemId: string): void
}

// ============================================
// Slot Grouping Utility
// ============================================

// Group children by slot name
export function groupChildrenBySlot(node: ASTNode): Map<string, ASTNode[]> {
  const grouped = new Map<string, ASTNode[]>()

  for (const child of node.children) {
    const slotName = child.name
    const existing = grouped.get(slotName) || []
    existing.push(child)
    grouped.set(slotName, existing)
  }

  return grouped
}

// ============================================
// Shared Style Utilities
// ============================================

/**
 * Convert DSL node properties to CSS styles.
 * Delegates to the shared utility in utils/style-converter.ts
 */
export function getStylesFromNode(node: ASTNode): React.CSSProperties {
  return getStylesFromNodeUtil(node.properties)
}

// ============================================
// Re-exports for convenience
// ============================================

// Registry exports
export { BehaviorRegistryContext } from './behavior-context'
export { getBehaviorHandler } from './behavior-handlers'
export { useBehaviorRegistry } from './registry-hooks'
export { BehaviorRegistryProvider } from './registry'
