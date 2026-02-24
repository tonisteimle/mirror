/**
 * Transformer Capability
 *
 * Programmatic AST modifications: set properties, add/remove children.
 */

import type { ASTNode } from '../../parser/types'
import type { PropertyOptions, ChildOptions, ChildDefinition } from '../types'

/**
 * Deep clone an AST node array.
 */
export function cloneNodes(nodes: ASTNode[]): ASTNode[] {
  return JSON.parse(JSON.stringify(nodes))
}

/**
 * Find node(s) by name, instanceName, or id.
 */
export function findNodes(
  nodes: ASTNode[],
  target: string,
  all = false
): ASTNode[] {
  const results: ASTNode[] = []

  function search(nodeList: ASTNode[]): void {
    for (const node of nodeList) {
      const matches =
        node.name === target ||
        node.instanceName === target ||
        node.id === target

      if (matches) {
        results.push(node)
        if (!all) return
      }

      if (node.children?.length) {
        search(node.children)
        if (!all && results.length > 0) return
      }
    }
  }

  search(nodes)
  return results
}

/**
 * Find a single node by target.
 */
export function findNode(nodes: ASTNode[], target: string): ASTNode | null {
  const found = findNodes(nodes, target, false)
  return found[0] ?? null
}

/**
 * Set properties on matching node(s).
 */
export function setProperty(
  nodes: ASTNode[],
  options: PropertyOptions
): { nodes: ASTNode[]; modified: number } {
  const cloned = cloneNodes(nodes)
  const targets = findNodes(cloned, options.target, options.all ?? false)

  for (const node of targets) {
    Object.assign(node.properties, options.set)
  }

  return {
    nodes: cloned,
    modified: targets.length,
  }
}

/**
 * Convert a ChildDefinition to a partial ASTNode.
 */
function childDefToNode(def: ChildDefinition, idCounter: number): ASTNode {
  const node: ASTNode = {
    type: 'component',
    name: def.name,
    id: `engine-${idCounter}`,
    properties: (def.properties ?? {}) as ASTNode['properties'],
    content: def.content,
    children: [],
  }

  if (def.children?.length) {
    node.children = def.children.map((child, i) =>
      childDefToNode(child, idCounter * 100 + i)
    )
  }

  return node
}

let idCounter = 0

/**
 * Add a child to a parent node.
 */
export function addChild(
  nodes: ASTNode[],
  options: ChildOptions
): { nodes: ASTNode[]; added: boolean } {
  if (!options.child) {
    return { nodes, added: false }
  }

  const cloned = cloneNodes(nodes)
  const parent = findNode(cloned, options.parent)

  if (!parent) {
    return { nodes: cloned, added: false }
  }

  // Convert child definition to ASTNode
  let childNode: ASTNode
  if ('type' in options.child && options.child.type === 'component') {
    childNode = options.child as ASTNode
  } else {
    const def = options.child as ChildDefinition
    childNode = childDefToNode(def, ++idCounter)
  }

  // Initialize children array if needed
  if (!parent.children) {
    parent.children = []
  }

  // Insert at index or append
  if (options.index !== undefined && options.index >= 0) {
    parent.children.splice(options.index, 0, childNode)
  } else {
    parent.children.push(childNode)
  }

  return { nodes: cloned, added: true }
}

/**
 * Remove a child from a parent node.
 */
export function removeChild(
  nodes: ASTNode[],
  options: ChildOptions
): { nodes: ASTNode[]; removed: boolean } {
  if (options.index === undefined) {
    return { nodes, removed: false }
  }

  const cloned = cloneNodes(nodes)
  const parent = findNode(cloned, options.parent)

  if (!parent || !parent.children || options.index >= parent.children.length) {
    return { nodes: cloned, removed: false }
  }

  parent.children.splice(options.index, 1)
  return { nodes: cloned, removed: true }
}

/**
 * Reset the internal ID counter (for testing).
 */
export function resetIdCounter(): void {
  idCounter = 0
}
