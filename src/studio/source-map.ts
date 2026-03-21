/**
 * SourceMap for bidirectional editing
 *
 * Maps IR node IDs to source code positions, enabling:
 * - Click on preview → find source position
 * - Property change → update exact source location
 */

import type { SourcePosition, PropertySourceMap } from '../ir/types'

/**
 * Complete mapping for a single node
 */
export interface NodeMapping {
  nodeId: string
  componentName: string
  instanceName?: string
  position: SourcePosition
  properties: Map<string, SourcePosition>
  isDefinition: boolean
  isEachTemplate?: boolean      // Template inside each loop
  isConditional?: boolean       // Inside conditional branch
  parentId?: string             // Parent node ID for hierarchy
}

/**
 * SourceMap class for node-to-source mapping
 */
export class SourceMap {
  private nodes: Map<string, NodeMapping> = new Map()

  /**
   * Add a node mapping
   */
  addNode(mapping: NodeMapping): void {
    this.nodes.set(mapping.nodeId, mapping)
  }

  /**
   * Get node mapping by ID
   * Supports template instance IDs like "node-5[2]" by falling back to template ID "node-5"
   */
  getNodeById(id: string): NodeMapping | null {
    // Direct lookup first
    const direct = this.nodes.get(id)
    if (direct) return direct

    // Check if this is a template instance ID (e.g., "node-5[2]")
    const templateId = this.getTemplateId(id)
    if (templateId && templateId !== id) {
      return this.nodes.get(templateId) || null
    }

    return null
  }

  /**
   * Extract template ID from instance ID
   * e.g., "node-5[2]" -> "node-5"
   */
  getTemplateId(nodeId: string): string {
    const match = nodeId.match(/^(.+)\[\d+\]$/)
    return match ? match[1] : nodeId
  }

  /**
   * Check if a node ID is a template instance
   * e.g., "node-5[2]" -> true, "node-5" -> false
   */
  isTemplateInstance(nodeId: string): boolean {
    return /\[\d+\]$/.test(nodeId)
  }

  /**
   * Get property position for a specific node and property
   */
  getPropertyPosition(nodeId: string, propName: string): SourcePosition | null {
    const node = this.nodes.get(nodeId)
    if (!node) return null
    return node.properties.get(propName) || null
  }

  /**
   * Get all node IDs
   */
  getAllNodeIds(): string[] {
    return Array.from(this.nodes.keys())
  }

  /**
   * Get nodes by component name
   */
  getNodesByComponent(componentName: string): NodeMapping[] {
    return Array.from(this.nodes.values())
      .filter(n => n.componentName === componentName)
  }

  /**
   * Get node by instance name
   */
  getNodeByInstanceName(instanceName: string): NodeMapping | null {
    for (const node of this.nodes.values()) {
      if (node.instanceName === instanceName) {
        return node
      }
    }
    return null
  }

  /**
   * Check if a node is a template (each loop or conditional)
   */
  isTemplate(nodeId: string): boolean {
    const node = this.nodes.get(nodeId)
    return node?.isEachTemplate || node?.isConditional || false
  }

  /**
   * Get children of a node
   */
  getChildren(parentId: string): NodeMapping[] {
    return Array.from(this.nodes.values())
      .filter(n => n.parentId === parentId)
  }

  /**
   * Get siblings of a node (other children of same parent)
   * Returns siblings sorted by source position (line number)
   */
  getSiblings(nodeId: string): NodeMapping[] {
    const node = this.getNodeById(nodeId)
    if (!node) return []

    const parentId = node.parentId
    // If no parent, siblings are other root nodes
    const siblings = parentId
      ? this.getChildren(parentId)
      : this.getRootNodes()

    // Exclude self and sort by line number
    return siblings
      .filter(n => n.nodeId !== nodeId)
      .sort((a, b) => a.position.line - b.position.line)
  }

  /**
   * Find the next sibling after this node
   */
  getNextSibling(nodeId: string): NodeMapping | null {
    const node = this.getNodeById(nodeId)
    if (!node) return null

    const siblings = this.getSiblings(nodeId)
    // Find first sibling that comes after this node
    return siblings.find(s => s.position.line > node.position.line) || null
  }

  /**
   * Find the previous sibling before this node
   */
  getPreviousSibling(nodeId: string): NodeMapping | null {
    const node = this.getNodeById(nodeId)
    if (!node) return null

    const siblings = this.getSiblings(nodeId)
    // Find last sibling that comes before this node
    const before = siblings.filter(s => s.position.line < node.position.line)
    return before.length > 0 ? before[before.length - 1] : null
  }

  /**
   * Get the parent node
   */
  getParent(nodeId: string): NodeMapping | null {
    const node = this.getNodeById(nodeId)
    if (!node || !node.parentId) return null
    return this.getNodeById(node.parentId)
  }

  /**
   * Get all nodes (for debugging)
   */
  getAllNodes(): NodeMapping[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Find the node that contains a specific line (for editor cursor sync)
   * Returns the most specific (deepest/smallest range) node at that line
   * Skips definition nodes to prefer instances
   */
  getNodeAtLine(line: number): NodeMapping | null {
    let bestMatch: NodeMapping | null = null
    let bestSpecificity = Infinity

    for (const node of this.nodes.values()) {
      // Skip definitions - we want to select instances in preview
      if (node.isDefinition) continue

      const startLine = node.position.line
      const endLine = node.position.endLine

      // Check if line is within this node's range
      if (line >= startLine && line <= endLine) {
        // Prefer more specific (smaller range) matches
        const specificity = endLine - startLine

        if (specificity < bestSpecificity) {
          bestMatch = node
          bestSpecificity = specificity
        }
      }
    }

    return bestMatch
  }

  /**
   * Get all nodes that start at a specific line
   * Useful for finding exact matches when cursor is on component line
   */
  getNodesStartingAtLine(line: number): NodeMapping[] {
    return Array.from(this.nodes.values())
      .filter(n => n.position.line === line && !n.isDefinition)
  }

  /**
   * Get root nodes (nodes without a parent)
   * Returns non-definition nodes that have no parentId
   */
  getRootNodes(): NodeMapping[] {
    return Array.from(this.nodes.values())
      .filter(n => !n.parentId && !n.isDefinition)
  }

  /**
   * Get the main root node (typically "App")
   * Prefers nodes named "App", otherwise returns first root
   */
  getMainRoot(): NodeMapping | null {
    const roots = this.getRootNodes()
    if (roots.length === 0) return null

    // Prefer "App" if it exists
    const app = roots.find(n => n.instanceName === 'App' || n.componentName === 'App')
    return app || roots[0]
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.nodes.clear()
  }

  /**
   * Get size
   */
  get size(): number {
    return this.nodes.size
  }
}

/**
 * Builder class for constructing SourceMap during IR transformation
 */
export class SourceMapBuilder {
  private sourceMap: SourceMap = new SourceMap()

  /**
   * Add a node with its source position
   */
  addNode(
    nodeId: string,
    componentName: string,
    position: SourcePosition,
    options: {
      instanceName?: string
      isDefinition?: boolean
      isEachTemplate?: boolean
      isConditional?: boolean
      parentId?: string
    } = {}
  ): void {
    this.sourceMap.addNode({
      nodeId,
      componentName,
      position,
      properties: new Map(),
      instanceName: options.instanceName,
      isDefinition: options.isDefinition || false,
      isEachTemplate: options.isEachTemplate,
      isConditional: options.isConditional,
      parentId: options.parentId,
    })
  }

  /**
   * Add property source position to an existing node
   */
  addPropertyPosition(nodeId: string, propName: string, position: SourcePosition): void {
    const node = this.sourceMap.getNodeById(nodeId)
    if (node) {
      node.properties.set(propName, position)
    }
  }

  /**
   * Build and return the SourceMap
   */
  build(): SourceMap {
    return this.sourceMap
  }

  /**
   * Get the current map (for intermediate access)
   */
  getMap(): SourceMap {
    return this.sourceMap
  }
}

/**
 * Calculate source position from AST node with line/column
 * The AST only has start position, so we estimate end based on content
 */
export function calculateSourcePosition(
  line: number,
  column: number,
  content?: string
): SourcePosition {
  // If no content, assume single line
  if (!content) {
    return {
      line,
      column,
      endLine: line,
      endColumn: column + 1,
    }
  }

  // Calculate end position based on content
  const lines = content.split('\n')
  const endLine = line + lines.length - 1
  const endColumn = lines.length === 1
    ? column + content.length
    : lines[lines.length - 1].length

  return {
    line,
    column,
    endLine,
    endColumn,
  }
}

/**
 * Calculate position for a property value within a line
 */
export function calculatePropertyPosition(
  sourceLine: string,
  lineNumber: number,
  propName: string,
  propValue: string
): SourcePosition | null {
  // Find property in line: "pad 12, bg #333, col white"
  // Look for "propName value" or "propName" at start of value sequence

  // Try to find "propName value" pattern
  const patterns = [
    new RegExp(`\\b${propName}\\s+([^,\\s]+(?:\\s+[^,\\s]+)*)`, 'i'),
    new RegExp(`\\b${propName}\\b`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = sourceLine.match(pattern)
    if (match && match.index !== undefined) {
      const startColumn = match.index + 1 // 1-indexed
      const fullMatch = match[0]
      return {
        line: lineNumber,
        column: startColumn,
        endLine: lineNumber,
        endColumn: startColumn + fullMatch.length,
      }
    }
  }

  return null
}
