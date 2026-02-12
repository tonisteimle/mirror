/**
 * Component Validation Module
 *
 * Validation utilities for component hierarchies:
 * - Finding children by name
 * - Collecting all element names
 * - Validating uniqueness for flat access
 */

import type { ASTNode } from './types'

/**
 * Find a child node by name recursively (flat access).
 * Returns the node for in-place modification.
 */
export function findChildDeep(children: ASTNode[], name: string): ASTNode | null {
  for (const child of children) {
    if (child.name === name) {
      return child
    }
    // Recurse into nested children
    const found = findChildDeep(child.children, name)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * Collect all element names in a hierarchy for uniqueness validation.
 * Returns a map of name -> array of line numbers where it appears.
 */
export function collectNames(children: ASTNode[], names: Map<string, number[]> = new Map()): Map<string, number[]> {
  for (const child of children) {
    // Skip internal names like _text, _conditional, _iterator
    if (!child.name.startsWith('_')) {
      const lines = names.get(child.name) || []
      lines.push(child.line ?? 0)
      names.set(child.name, lines)
    }
    // Recurse into nested children
    collectNames(child.children, names)
  }
  return names
}

/**
 * Validate that all element names in a component hierarchy are unique.
 * Returns error messages for duplicates.
 */
export function validateUniqueNames(children: ASTNode[], componentName: string): string[] {
  const names = collectNames(children)
  const errors: string[] = []

  for (const [name, lines] of Array.from(names)) {
    if (lines.length > 1) {
      errors.push(`Error in ${componentName}: Duplicate element name "${name}" on lines ${lines.map(l => l + 1).join(', ')}. Names must be unique for flat access.`)
    }
  }

  return errors
}
