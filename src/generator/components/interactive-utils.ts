/**
 * Interactive Component Utilities
 *
 * Utility functions for interactive components.
 * Separated from components to avoid react-refresh issues.
 */

import type { ASTNode } from '../../parser/parser'

/**
 * Check if a node needs interactive component wrapper.
 */
export function needsInteractiveComponent(node: ASTNode): boolean {
  return Boolean(
    (node.states && node.states.length > 0) ||
    (node.variables && node.variables.length > 0) ||
    (node.eventHandlers && node.eventHandlers.length > 0) ||
    (node.conditionalProperties && node.conditionalProperties.length > 0)
  )
}
