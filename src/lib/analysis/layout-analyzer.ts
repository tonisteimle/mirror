/**
 * Layout Analyzer
 *
 * Analyzes the hierarchical structure and layout patterns of Mirror DSL code.
 * Part of the Analysis Foundation (Increment 3).
 */

/**
 * Represents a node in the layout hierarchy
 */
export interface LayoutNode {
  name: string
  type: 'root' | 'section' | 'container' | 'component'
  layout: 'horizontal' | 'vertical' | 'grid' | 'stacked' | 'unknown'
  children: LayoutNode[]
  depth: number
  line: number
}

/**
 * Result of layout analysis
 */
export interface LayoutAnalysis {
  root: LayoutNode | null
  sections: string[]
  maxDepth: number
  layoutPattern: 'sidebar-main' | 'header-content-footer' | 'grid' | 'stack' | 'dashboard' | 'unknown'
}

// Regex patterns
const COMPONENT_START_REGEX = /^\s*(-\s+)?([A-Z][A-Za-z0-9]*)(?:\s+named\s+\w+)?\s*(?::\s*(?:[A-Z][A-Za-z0-9]*\s*)?)?\{/
const LAYOUT_HORIZONTAL_REGEX = /\b(horizontal|hor)\b/
const LAYOUT_VERTICAL_REGEX = /\b(vertical|ver)\b/
const LAYOUT_GRID_REGEX = /\bgrid\s*:/
const LAYOUT_STACKED_REGEX = /\bstacked\b/

// Section name patterns (commonly used for major layout sections)
const SECTION_PATTERNS = [
  /sidebar/i, /header/i, /footer/i, /main/i, /content/i,
  /nav/i, /panel/i, /menu/i, /toolbar/i, /statusbar/i
]

/**
 * Determines the layout direction from a line of code
 */
function detectLayout(line: string): LayoutNode['layout'] {
  if (LAYOUT_HORIZONTAL_REGEX.test(line)) return 'horizontal'
  if (LAYOUT_GRID_REGEX.test(line)) return 'grid'
  if (LAYOUT_STACKED_REGEX.test(line)) return 'stacked'
  if (LAYOUT_VERTICAL_REGEX.test(line)) return 'vertical'
  return 'unknown'
}

/**
 * Determines the node type based on name and context
 */
function determineNodeType(name: string, depth: number, hasChildren: boolean): LayoutNode['type'] {
  if (depth === 0) return 'root'

  // Check if it's a section (matches common section patterns)
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(name)) return 'section'
  }

  // Container if it has children, otherwise component
  return hasChildren ? 'container' : 'component'
}

/**
 * Analyzes the layout structure of Mirror DSL code
 */
export function analyzeLayout(code: string): LayoutAnalysis {
  const lines = code.split('\n')
  let root: LayoutNode | null = null
  let maxDepth = 0
  const sections: string[] = []

  // Stack to track parent nodes
  const nodeStack: LayoutNode[] = []
  let currentDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Count braces for depth tracking
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length

    // Check for component start
    const match = line.match(COMPONENT_START_REGEX)
    if (match) {
      const name = match[2]
      const layout = detectLayout(line)

      const node: LayoutNode = {
        name,
        type: determineNodeType(name, currentDepth, false),
        layout,
        children: [],
        depth: currentDepth,
        line: i
      }

      // Track sections
      if (node.type === 'section' && !sections.includes(name)) {
        sections.push(name)
      }

      // Set as root or add to parent
      if (currentDepth === 0 && !root) {
        root = node
      } else if (nodeStack.length > 0) {
        const parent = nodeStack[nodeStack.length - 1]
        parent.children.push(node)
        // Update parent's type if it now has children
        if (parent.type === 'component') {
          parent.type = 'container'
        }
      }

      // Push to stack for potential children
      nodeStack.push(node)

      // Track max depth
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth
      }
    }

    // Update depth after processing line
    currentDepth += openBraces - closeBraces

    // Pop nodes from stack when we close their braces
    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].depth >= currentDepth) {
      nodeStack.pop()
    }
  }

  // Detect layout pattern
  const layoutPattern = detectLayoutPattern(root)

  return {
    root,
    sections,
    maxDepth: root ? maxDepth + 1 : 0,
    layoutPattern
  }
}

/**
 * Detects the overall layout pattern from the root node
 */
export function detectLayoutPattern(root: LayoutNode | null): LayoutAnalysis['layoutPattern'] {
  if (!root || root.children.length === 0) {
    return 'unknown'
  }

  const children = root.children
  const childNames = children.map(c => c.name.toLowerCase())

  // Sidebar-Main pattern: horizontal layout with sidebar + content/main
  if (root.layout === 'horizontal') {
    const hasSidebar = childNames.some(n => n.includes('sidebar') || n.includes('nav') || n.includes('menu'))
    const hasMain = childNames.some(n => n.includes('main') || n.includes('content'))
    if (hasSidebar && hasMain) {
      return 'sidebar-main'
    }
  }

  // Header-Content-Footer pattern: vertical with header, content/main, footer
  if (root.layout === 'vertical' || root.layout === 'unknown') {
    const hasHeader = childNames.some(n => n.includes('header') || n.includes('toolbar') || n.includes('nav'))
    const hasContent = childNames.some(n => n.includes('content') || n.includes('main') || n.includes('body'))
    const hasFooter = childNames.some(n => n.includes('footer') || n.includes('status'))

    if (hasHeader && hasContent) {
      return 'header-content-footer'
    }
  }

  // Grid pattern: uses grid layout
  if (root.layout === 'grid' || children.some(c => c.layout === 'grid')) {
    return 'grid'
  }

  // Stack pattern: uses stacked layout
  if (root.layout === 'stacked' || children.some(c => c.layout === 'stacked')) {
    return 'stack'
  }

  // Dashboard pattern: multiple panels in horizontal layout
  if (root.layout === 'horizontal' && children.length >= 2) {
    const hasPanel = childNames.some(n => n.includes('panel'))
    if (hasPanel || children.length >= 3) {
      return 'dashboard'
    }
  }

  return 'unknown'
}

/**
 * Gets the depth of a layout hierarchy
 */
export function calculateDepth(node: LayoutNode | null): number {
  if (!node) return 0
  if (node.children.length === 0) return 1
  return 1 + Math.max(...node.children.map(calculateDepth))
}

/**
 * Finds all nodes at a specific depth
 */
export function getNodesAtDepth(root: LayoutNode | null, depth: number): LayoutNode[] {
  if (!root) return []
  if (depth === 0) return [root]

  const result: LayoutNode[] = []
  for (const child of root.children) {
    if (depth === 1) {
      result.push(child)
    } else {
      result.push(...getNodesAtDepth(child, depth - 1))
    }
  }
  return result
}

/**
 * Finds a node by name
 */
export function findNodeByName(root: LayoutNode | null, name: string): LayoutNode | null {
  if (!root) return null
  if (root.name === name) return root

  for (const child of root.children) {
    const found = findNodeByName(child, name)
    if (found) return found
  }
  return null
}

/**
 * Gets the path from root to a node
 */
export function getPathToNode(root: LayoutNode | null, name: string): string[] {
  if (!root) return []

  if (root.name === name) return [name]

  for (const child of root.children) {
    const path = getPathToNode(child, name)
    if (path.length > 0) {
      return [root.name, ...path]
    }
  }

  return []
}
