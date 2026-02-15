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
 * Maximum recursion depth to prevent stack overflow.
 */
const MAX_RECURSION_DEPTH = 100

/**
 * Find a child node by name recursively (flat access).
 * Returns the node for in-place modification.
 * @param depth - Current recursion depth (internal use)
 */
export function findChildDeep(children: ASTNode[], name: string, depth: number = 0): ASTNode | null {
  // Prevent stack overflow on deeply nested or circular structures
  if (depth >= MAX_RECURSION_DEPTH) {
    console.warn(`findChildDeep: Max recursion depth (${MAX_RECURSION_DEPTH}) reached`)
    return null
  }

  for (const child of children) {
    if (child.name === name) {
      return child
    }
    // Recurse into nested children
    const found = findChildDeep(child.children, name, depth + 1)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * Collect all element names in a hierarchy for uniqueness validation.
 * Returns a map of name -> array of line numbers where it appears.
 * @param depth - Current recursion depth (internal use)
 */
export function collectNames(children: ASTNode[], names: Map<string, number[]> = new Map(), depth: number = 0): Map<string, number[]> {
  // Prevent stack overflow on deeply nested or circular structures
  if (depth >= MAX_RECURSION_DEPTH) {
    console.warn(`collectNames: Max recursion depth (${MAX_RECURSION_DEPTH}) reached`)
    return names
  }

  for (const child of children) {
    // Skip internal names like _text, _conditional, _iterator
    // Skip list items (created with - prefix) - they're not meant to be unique
    if (!child.name.startsWith('_') && !child._isListItem) {
      const lines = names.get(child.name) || []
      lines.push(child.line ?? 0)
      names.set(child.name, lines)
    }
    // Recurse into nested children
    collectNames(child.children, names, depth + 1)
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
