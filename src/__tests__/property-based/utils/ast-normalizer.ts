/**
 * AST Normalizer for Property-Based Testing
 *
 * Normalizes AST structures for comparison by removing
 * position information and other non-semantic details.
 */

import type { ParsedNode } from '../../../parser/types'

/**
 * Remove position/location info from AST for comparison
 */
export function normalizeAst(nodes: ParsedNode[]): unknown[] {
  return nodes.map(normalizeNode)
}

/**
 * Normalize a single AST node
 */
function normalizeNode(node: ParsedNode): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  // Core properties
  if (node.name) normalized.name = node.name
  if (node.type) normalized.type = node.type
  if (node.isDefinition !== undefined) normalized.isDefinition = node.isDefinition

  // Properties (skip empty)
  if (node.properties && Object.keys(node.properties).length > 0) {
    normalized.properties = normalizeProperties(node.properties)
  }

  // Children (recursively normalize)
  if (node.children && node.children.length > 0) {
    normalized.children = node.children.map(normalizeNode)
  }

  // States
  if (node.states && Object.keys(node.states).length > 0) {
    normalized.states = normalizeStates(node.states)
  }

  // Events
  if (node.events && node.events.length > 0) {
    normalized.events = normalizeEvents(node.events)
  }

  // Conditionals
  if (node.conditional) {
    normalized.conditional = normalizeConditional(node.conditional)
  }

  // Iterator
  if (node.iterator) {
    normalized.iterator = normalizeIterator(node.iterator)
  }

  // Animations
  if (node.showAnimation) {
    normalized.showAnimation = node.showAnimation
  }
  if (node.hideAnimation) {
    normalized.hideAnimation = node.hideAnimation
  }
  if (node.animation) {
    normalized.animation = node.animation
  }

  // Content
  if (node.content !== undefined) {
    normalized.content = node.content
  }

  // Data binding
  if (node.dataBinding) {
    normalized.dataBinding = node.dataBinding
  }

  // Inheritance
  if (node.inheritsFrom) {
    normalized.inheritsFrom = node.inheritsFrom
  }

  // Named instance
  if (node.instanceName) {
    normalized.instanceName = node.instanceName
  }

  return normalized
}

/**
 * Normalize properties object
 */
function normalizeProperties(props: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    // Skip undefined/null values
    if (value === undefined || value === null) continue

    // Normalize color values to lowercase
    if (typeof value === 'string' && value.startsWith('#')) {
      normalized[key] = value.toLowerCase()
    } else {
      normalized[key] = value
    }
  }

  return normalized
}

/**
 * Normalize states object
 */
function normalizeStates(states: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  for (const [stateName, stateValue] of Object.entries(states)) {
    if (typeof stateValue === 'object' && stateValue !== null) {
      normalized[stateName] = normalizeProperties(stateValue as Record<string, unknown>)
    } else {
      normalized[stateName] = stateValue
    }
  }

  return normalized
}

/**
 * Normalize events array
 */
function normalizeEvents(events: unknown[]): unknown[] {
  return events.map(event => {
    if (typeof event === 'object' && event !== null) {
      const e = event as Record<string, unknown>
      return {
        type: e.type,
        key: e.key,
        actions: e.actions,
        timing: e.timing
      }
    }
    return event
  })
}

/**
 * Normalize conditional
 */
function normalizeConditional(cond: unknown): unknown {
  if (typeof cond === 'object' && cond !== null) {
    const c = cond as Record<string, unknown>
    return {
      condition: c.condition,
      thenBranch: c.thenBranch ? normalizeAst(c.thenBranch as ParsedNode[]) : undefined,
      elseBranch: c.elseBranch ? normalizeAst(c.elseBranch as ParsedNode[]) : undefined
    }
  }
  return cond
}

/**
 * Normalize iterator
 */
function normalizeIterator(iter: unknown): unknown {
  if (typeof iter === 'object' && iter !== null) {
    const i = iter as Record<string, unknown>
    return {
      variable: i.variable,
      collection: i.collection,
      indexVariable: i.indexVariable
    }
  }
  return iter
}

/**
 * Deep equality check for normalized ASTs
 */
export function astEquals(ast1: unknown, ast2: unknown): boolean {
  return JSON.stringify(ast1) === JSON.stringify(ast2)
}

/**
 * Get structural difference between two ASTs
 */
export function astDiff(ast1: unknown, ast2: unknown): string[] {
  const diffs: string[] = []
  compareObjects(ast1, ast2, '', diffs)
  return diffs
}

function compareObjects(obj1: unknown, obj2: unknown, path: string, diffs: string[]): void {
  if (typeof obj1 !== typeof obj2) {
    diffs.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`)
    return
  }

  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      diffs.push(`${path}: ${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)}`)
    }
    return
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push(`${path}: ${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)}`)
    }
    return
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      diffs.push(`${path}: array length mismatch (${obj1.length} vs ${obj2.length})`)
    }
    const maxLen = Math.max(obj1.length, obj2.length)
    for (let i = 0; i < maxLen; i++) {
      compareObjects(obj1[i], obj2[i], `${path}[${i}]`, diffs)
    }
    return
  }

  const keys1 = Object.keys(obj1 as object)
  const keys2 = Object.keys(obj2 as object)
  const allKeys = new Set([...keys1, ...keys2])

  for (const key of allKeys) {
    const val1 = (obj1 as Record<string, unknown>)[key]
    const val2 = (obj2 as Record<string, unknown>)[key]

    if (val1 === undefined && val2 !== undefined) {
      diffs.push(`${path}.${key}: missing in first`)
    } else if (val1 !== undefined && val2 === undefined) {
      diffs.push(`${path}.${key}: missing in second`)
    } else {
      compareObjects(val1, val2, `${path}.${key}`, diffs)
    }
  }
}

/**
 * Check if AST has expected structure
 */
export function hasValidStructure(nodes: ParsedNode[]): boolean {
  return nodes.every(node => {
    // Every node must have a name
    if (typeof node.name !== 'string' || node.name.length === 0) {
      return false
    }

    // Children must be valid nodes
    if (node.children) {
      if (!Array.isArray(node.children)) return false
      if (!hasValidStructure(node.children)) return false
    }

    // Properties must be an object
    if (node.properties && typeof node.properties !== 'object') {
      return false
    }

    return true
  })
}

/**
 * Count total nodes in AST
 */
export function countNodes(nodes: ParsedNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children)
    }
  }
  return count
}

/**
 * Get maximum depth of AST
 */
export function maxDepth(nodes: ParsedNode[], currentDepth = 0): number {
  if (nodes.length === 0) return currentDepth

  let max = currentDepth + 1
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = maxDepth(node.children, currentDepth + 1)
      if (childDepth > max) max = childDepth
    }
  }
  return max
}
