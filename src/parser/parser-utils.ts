/**
 * Parser Utilities Module
 *
 * Low-level helper functions for the parser.
 * Includes CSS utilities, node traversal, and AST manipulation.
 */

import type { ASTNode, SelectionCommand } from './types'
import { INTERNAL_NODES } from '../constants'

// ============================================
// CSS Constants
// ============================================

/**
 * CSS color keywords that should be treated as color values.
 * These are valid CSS color names that can be used without # or rgb().
 */
export const CSS_COLOR_KEYWORDS = new Set([
  'transparent', 'currentColor', 'inherit',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'
])

// ============================================
// Direction Utilities
// ============================================

/**
 * Split combined directions like 'u-d' into ['u', 'd']
 * Used for pad/mar/bor with multiple directions.
 */
export function splitDirections(dirValue: string): string[] {
  // Handle hyphenated: 'u-d' -> ['u', 'd']
  if (dirValue.includes('-')) {
    return dirValue.split('-')
  }
  // Single direction: 'u' -> ['u']
  return [dirValue]
}

/**
 * Expand CSS shorthand values for padding/margin/border.
 * Converts 1-4 values to individual directional values.
 *
 * @param values Array of 1-4 numeric values
 * @returns Object with u, r, d, l values (top, right, bottom, left)
 */
export function expandCSSShorthand(values: number[]): { u: number; r: number; d: number; l: number } {
  if (values.length === 1) {
    return { u: values[0], r: values[0], d: values[0], l: values[0] }
  } else if (values.length === 2) {
    return { u: values[0], d: values[0], l: values[1], r: values[1] }
  } else if (values.length === 3) {
    return { u: values[0], l: values[1], r: values[1], d: values[2] }
  } else if (values.length >= 4) {
    return { u: values[0], r: values[1], d: values[2], l: values[3] }
  }
  return { u: 0, r: 0, d: 0, l: 0 }
}

/**
 * Apply spacing values (pad/mar) to a properties object.
 * Handles both directional and CSS shorthand values.
 *
 * @param properties Target properties object to modify
 * @param prefix Property prefix ('pad' or 'mar')
 * @param values Array of numeric values (1-4 for CSS shorthand)
 * @param directions Optional array of specific directions to apply
 */
export function applySpacingToProperties(
  properties: Record<string, unknown>,
  prefix: string,
  values: number[],
  directions: string[] = []
): void {
  if (values.length === 0) return

  if (directions.length > 0) {
    // Apply to specific directions
    for (const dir of directions) {
      properties[`${prefix}_${dir}`] = values[0]
    }
  } else if (values.length === 1) {
    // Single value - apply uniformly
    properties[prefix] = values[0]
  } else {
    // CSS shorthand - expand to all directions
    const expanded = expandCSSShorthand(values)
    properties[`${prefix}_u`] = expanded.u
    properties[`${prefix}_r`] = expanded.r
    properties[`${prefix}_d`] = expanded.d
    properties[`${prefix}_l`] = expanded.l
  }
}

// ============================================
// AST Node Creation
// ============================================

/**
 * Create a text node (_text) from a string token.
 * Used for inline string content in components.
 *
 * @param content The text content
 * @param generateId ID generator function, or null for template nodes (id will be empty)
 * @param line Source line number
 * @param column Source column number
 */
export function createTextNode(
  content: string,
  generateId: ((name: string) => string) | null,
  line?: number,
  column?: number
): ASTNode {
  return {
    type: 'component',
    name: INTERNAL_NODES.TEXT,
    id: generateId ? generateId('text') : '',
    modifiers: [],
    properties: {},
    content,
    children: [],
    line,
    column
  }
}

// ============================================
// AST Node Traversal
// ============================================

interface FindNodeResult {
  node: ASTNode
  parent: ASTNode | null
  index: number
}

/**
 * Find a node by ID in a flat list of nodes.
 * Returns the node, its parent (if any), and index.
 */
export function findNode(nodes: ASTNode[], id: string): FindNodeResult | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === id) {
      return { node, parent: null, index: i }
    }
    const found = findNodeRecursive(node, id)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * Recursively search for a node by ID within a parent node's children.
 */
export function findNodeRecursive(parent: ASTNode, id: string): FindNodeResult | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (child.id === id) {
      return { node: child, parent, index: i }
    }
    const found = findNodeRecursive(child, id)
    if (found) {
      return found
    }
  }
  return null
}

// ============================================
// AST Cloning
// ============================================

/**
 * Clone children with new IDs for template instantiation.
 * Creates deep copies of nodes with fresh IDs.
 */
export function cloneChildrenWithNewIds(
  children: ASTNode[],
  generateId: (name: string) => string
): ASTNode[] {
  return children.map(child => ({
    ...child,
    id: generateId(child.name),
    children: cloneChildrenWithNewIds(child.children, generateId)
  }))
}

// ============================================
// Selection Commands
// ============================================

/**
 * Apply selection commands to the AST.
 * Modifies nodes in-place based on commands.
 */
export function applyCommands(
  nodes: ASTNode[],
  commands: SelectionCommand[],
  generateId: (name: string) => string
): void {
  for (const cmd of commands) {
    const found = findNode(nodes, cmd.targetId)
    if (!found) continue

    switch (cmd.type) {
      case 'modify':
        if (cmd.property && cmd.value !== undefined) {
          found.node.properties[cmd.property] = cmd.value
        }
        break

      case 'addChild':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          found.node.children.push(newNode)
        }
        break

      case 'addAfter':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          if (found.parent) {
            found.parent.children.splice(found.index + 1, 0, newNode)
          } else {
            nodes.splice(found.index + 1, 0, newNode)
          }
        }
        break

      case 'addBefore':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          if (found.parent) {
            found.parent.children.splice(found.index, 0, newNode)
          } else {
            nodes.splice(found.index, 0, newNode)
          }
        }
        break
    }
  }
}
