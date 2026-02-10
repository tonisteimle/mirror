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
  getState(componentId: string): BehaviorState | string
  setState(componentId: string, state: BehaviorState | string): void
  toggle(componentId: string): void
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
