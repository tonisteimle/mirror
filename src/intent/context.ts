/**
 * Intent Context Optimization
 *
 * Reduces token usage by sending only relevant parts of the intent to the LLM.
 */

import type { Intent, LayoutNode, ComponentDefinition, TokenDefinitions } from './schema'

// =============================================================================
// Types
// =============================================================================

export interface Selection {
  /** Selected node IDs or indices */
  nodeIds?: string[]
  /** Selected node path (e.g., [0, 2, 1] for layout[0].children[2].children[1]) */
  nodePath?: number[]
  /** Range of lines in the editor */
  lineRange?: { start: number; end: number }
}

export interface FocusedIntent {
  /** Reduced intent with only relevant parts */
  intent: Intent
  /** Map from focused indices to original indices */
  layoutMapping: Map<number, number>
  /** Components that were included */
  includedComponents: Set<string>
  /** Tokens that were included */
  includedTokens: Set<string>
}

// =============================================================================
// Token Extraction
// =============================================================================

/**
 * Extracts all token references from a layout node tree
 */
function extractTokenReferences(nodes: LayoutNode[]): Set<string> {
  const tokens = new Set<string>()

  function processNode(node: LayoutNode): void {
    // Check style properties for token references
    if (node.style) {
      for (const value of Object.values(node.style)) {
        if (typeof value === 'string' && value.startsWith('$')) {
          tokens.add(value.slice(1)) // Remove $ prefix
        }
      }
    }

    // Process children
    if (node.children) {
      for (const child of node.children) {
        processNode(child)
      }
    }
  }

  for (const node of nodes) {
    processNode(node)
  }

  return tokens
}

/**
 * Extracts all component references from a layout node tree
 */
function extractComponentReferences(nodes: LayoutNode[]): Set<string> {
  const components = new Set<string>()

  function processNode(node: LayoutNode): void {
    components.add(node.component)

    if (node.children) {
      for (const child of node.children) {
        processNode(child)
      }
    }
  }

  for (const node of nodes) {
    processNode(node)
  }

  return components
}

// =============================================================================
// Context Focusing
// =============================================================================

/**
 * Creates a focused intent with only the selected nodes and their dependencies
 */
export function createFocusedIntent(
  fullIntent: Intent,
  selection: Selection
): FocusedIntent {
  const layoutMapping = new Map<number, number>()
  let focusedLayout: LayoutNode[] = []

  // Determine which nodes to include
  if (selection.nodePath && selection.nodePath.length > 0) {
    // Get the node at the path
    let node: LayoutNode | undefined = fullIntent.layout[selection.nodePath[0]]
    for (let i = 1; i < selection.nodePath.length && node; i++) {
      node = node.children?.[selection.nodePath[i]]
    }

    if (node) {
      focusedLayout = [node]
      layoutMapping.set(0, selection.nodePath[0])
    }
  } else if (selection.nodeIds && selection.nodeIds.length > 0) {
    // Find nodes by ID
    const nodeSet = new Set(selection.nodeIds)

    function findNodes(nodes: LayoutNode[], baseIndex: number): LayoutNode[] {
      const found: LayoutNode[] = []
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.id && nodeSet.has(node.id)) {
          found.push(node)
          layoutMapping.set(found.length - 1, baseIndex + i)
        }
        if (node.children) {
          found.push(...findNodes(node.children, baseIndex))
        }
      }
      return found
    }

    focusedLayout = findNodes(fullIntent.layout, 0)
  } else {
    // No selection - include all
    focusedLayout = fullIntent.layout
    for (let i = 0; i < focusedLayout.length; i++) {
      layoutMapping.set(i, i)
    }
  }

  // Extract referenced tokens and components
  const referencedTokens = extractTokenReferences(focusedLayout)
  const referencedComponents = extractComponentReferences(focusedLayout)

  // Build focused tokens (only those referenced)
  const focusedTokens: TokenDefinitions = {
    colors: {},
    spacing: {},
    radii: {},
    sizes: {},
  }

  for (const tokenName of referencedTokens) {
    if (fullIntent.tokens.colors?.[tokenName]) {
      focusedTokens.colors![tokenName] = fullIntent.tokens.colors[tokenName]
    }
    if (fullIntent.tokens.spacing?.[tokenName]) {
      focusedTokens.spacing![tokenName] = fullIntent.tokens.spacing[tokenName]
    }
    if (fullIntent.tokens.radii?.[tokenName]) {
      focusedTokens.radii![tokenName] = fullIntent.tokens.radii[tokenName]
    }
    if (fullIntent.tokens.sizes?.[tokenName]) {
      focusedTokens.sizes![tokenName] = fullIntent.tokens.sizes[tokenName]
    }
  }

  // Build focused components (only those referenced)
  const focusedComponents = fullIntent.components.filter(
    comp => referencedComponents.has(comp.name)
  )

  // Also include base components
  const baseComponents = new Set<string>()
  for (const comp of focusedComponents) {
    if (comp.base) {
      baseComponents.add(comp.base)
    }
  }

  const allComponents = fullIntent.components.filter(
    comp => referencedComponents.has(comp.name) || baseComponents.has(comp.name)
  )

  return {
    intent: {
      tokens: focusedTokens,
      components: allComponents,
      layout: focusedLayout,
    },
    layoutMapping,
    includedComponents: referencedComponents,
    includedTokens: referencedTokens,
  }
}

// =============================================================================
// Context Merging
// =============================================================================

/**
 * Merges a focused intent result back into the full intent
 */
export function mergeFocusedIntent(
  fullIntent: Intent,
  focusedResult: Intent,
  focused: FocusedIntent
): Intent {
  // Deep clone the full intent
  const merged: Intent = JSON.parse(JSON.stringify(fullIntent))

  // Merge tokens
  if (focusedResult.tokens) {
    if (focusedResult.tokens.colors) {
      merged.tokens.colors = { ...merged.tokens.colors, ...focusedResult.tokens.colors }
    }
    if (focusedResult.tokens.spacing) {
      merged.tokens.spacing = { ...merged.tokens.spacing, ...focusedResult.tokens.spacing }
    }
    if (focusedResult.tokens.radii) {
      merged.tokens.radii = { ...merged.tokens.radii, ...focusedResult.tokens.radii }
    }
    if (focusedResult.tokens.sizes) {
      merged.tokens.sizes = { ...merged.tokens.sizes, ...focusedResult.tokens.sizes }
    }
  }

  // Merge components
  const existingCompNames = new Set(merged.components.map(c => c.name))
  for (const comp of focusedResult.components) {
    const existingIndex = merged.components.findIndex(c => c.name === comp.name)
    if (existingIndex >= 0) {
      merged.components[existingIndex] = comp
    } else {
      merged.components.push(comp)
    }
  }

  // Merge layout using the mapping
  for (const [focusedIndex, originalIndex] of focused.layoutMapping) {
    if (focusedResult.layout[focusedIndex]) {
      merged.layout[originalIndex] = focusedResult.layout[focusedIndex]
    }
  }

  // Add any new layout nodes
  for (let i = focused.layoutMapping.size; i < focusedResult.layout.length; i++) {
    merged.layout.push(focusedResult.layout[i])
  }

  return merged
}

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Estimates the number of tokens in an intent (rough approximation)
 */
export function estimateTokenCount(intent: Intent): number {
  const json = JSON.stringify(intent)
  // Rough estimate: 4 characters per token
  return Math.ceil(json.length / 4)
}

/**
 * Checks if focusing would significantly reduce token count
 */
export function shouldUseFocusedContext(
  fullIntent: Intent,
  selection: Selection,
  threshold: number = 0.5
): boolean {
  const fullTokens = estimateTokenCount(fullIntent)
  const focused = createFocusedIntent(fullIntent, selection)
  const focusedTokens = estimateTokenCount(focused.intent)

  return focusedTokens / fullTokens < threshold
}

// =============================================================================
// Smart Context Selection
// =============================================================================

/**
 * Automatically determines the best context to send based on the request
 */
export function selectOptimalContext(
  fullIntent: Intent,
  userRequest: string,
  maxTokens: number = 4000
): Intent {
  const fullTokens = estimateTokenCount(fullIntent)

  // If under limit, send everything
  if (fullTokens <= maxTokens) {
    return fullIntent
  }

  // Try to identify what the user is referring to
  const requestLower = userRequest.toLowerCase()

  // Check for component references
  const mentionedComponents = fullIntent.components
    .filter(c => requestLower.includes(c.name.toLowerCase()))
    .map(c => c.name)

  // Check for node references
  const mentionedNodes: string[] = []
  function checkNodes(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      if (node.id && requestLower.includes(node.id.toLowerCase())) {
        mentionedNodes.push(node.id)
      }
      if (node.text && requestLower.includes(node.text.toLowerCase())) {
        mentionedNodes.push(node.id || node.component)
      }
      if (node.children) {
        checkNodes(node.children)
      }
    }
  }
  checkNodes(fullIntent.layout)

  // Create focused context if we found references
  if (mentionedNodes.length > 0 || mentionedComponents.length > 0) {
    const focused = createFocusedIntent(fullIntent, {
      nodeIds: mentionedNodes,
    })

    if (estimateTokenCount(focused.intent) <= maxTokens) {
      return focused.intent
    }
  }

  // Otherwise, progressively trim the layout
  const trimmedIntent = { ...fullIntent }

  // Remove children beyond depth 2
  function trimDepth(nodes: LayoutNode[], depth: number): LayoutNode[] {
    return nodes.map(node => ({
      ...node,
      children: depth < 2 && node.children
        ? trimDepth(node.children, depth + 1)
        : undefined,
    }))
  }

  trimmedIntent.layout = trimDepth(fullIntent.layout, 0)

  return trimmedIntent
}
