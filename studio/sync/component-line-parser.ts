/**
 * Component Line Parser
 *
 * Parses Mirror code lines to extract component information.
 * Used for editor-cursor-to-element synchronization.
 */

import type { SourceMap } from '../../src/studio/source-map'

/**
 * Information about a component found on a line
 */
export interface ComponentInfo {
  /** Component name (e.g., "Button", "Card") */
  name: string
  /** Whether this is a definition (ends with :) or an instance */
  isDefinition: boolean
  /** Line number (1-indexed) */
  line: number
}

/**
 * Parent definition context
 */
export interface ParentContext {
  /** Parent component name */
  name: string
  /** Line number of parent definition */
  line: number
  /** Type of nested content */
  childType: 'state' | 'event' | 'child' | 'nested'
  /** Specific label (e.g., "state: selected", "onclick") */
  childLabel: string
}

/**
 * Skip patterns for lines that are not components
 */
const SKIP_PATTERNS = [
  /^\s*$/,                    // Empty lines
  /^\s*\/\//,                 // Comments
  /^\s*\$/,                   // Token definitions
  /^\s*---/,                  // Section headers
  /^\s*(state|hover|focus|active|disabled)\s/,  // State blocks
  /^\s*on(click|hover|change|input|keydown|keyup|focus|blur)\b/,  // Event handlers
  /^\s*keys\b/,               // Keyboard shortcuts
  /^\s*(each|if|else)\b/,     // Control flow
  /^\s*(show|hide|animate|data)\b/,  // Action keywords
]

/**
 * Extract component information from a line of Mirror code
 *
 * @param line - The line content
 * @returns ComponentInfo or null if not a component line
 */
export function extractComponentFromLine(line: string): Omit<ComponentInfo, 'line'> | null {
  const trimmed = line.trim()

  // Check skip patterns
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(line)) {
      return null
    }
  }

  // Match component name: must start with uppercase letter
  // Pattern: "ComponentName ..." or "ComponentName: ..." or "ComponentName as Parent:"
  const match = trimmed.match(/^([A-Z][a-zA-Z0-9]*)((\s+as\s+[A-Z][a-zA-Z0-9]*)?\s*:|[\s,]|$)/)
  if (!match) {
    return null
  }

  const name = match[1]
  const isDefinition = match[2].includes(':')

  return { name, isDefinition }
}

/**
 * Find the parent component definition for a nested line
 *
 * Scans upward from the current line to find a component definition
 * with less indentation.
 *
 * @param source - The full source code
 * @param lineNum - Current line number (1-indexed)
 * @returns ParentContext or null if no parent found
 */
export function findParentDefinition(source: string, lineNum: number): ParentContext | null {
  const lines = source.split('\n')

  // Validate line number
  if (lineNum < 1 || lineNum > lines.length) {
    return null
  }

  const currentLine = lines[lineNum - 1]
  const currentIndent = getIndent(currentLine)

  // If no indent, this is a top-level line
  if (currentIndent === 0) {
    return null
  }

  // Track context as we scan upward (state/event blocks)
  let contextType: ParentContext['childType'] | null = null
  let contextLabel: string | null = null
  let searchIndent = currentIndent

  // Scan upward to find parent definition
  for (let i = lineNum - 2; i >= 0; i--) {
    const line = lines[i]
    const lineIndent = getIndent(line)
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Found a line with less indentation
    if (lineIndent < searchIndent) {
      // Check if it's a component definition
      const match = trimmed.match(/^([A-Z][a-zA-Z0-9]*)(\s+as\s+[A-Z][a-zA-Z0-9]*)?\s*:/)
      if (match) {
        // Use tracked context or analyze current line
        const { childType, childLabel } = contextType
          ? { childType: contextType, childLabel: contextLabel! }
          : analyzeNestedLine(currentLine)

        return {
          name: match[1],
          line: i + 1,
          childType,
          childLabel,
        }
      }

      // Check if it's a state block - track and continue searching
      if (/^state\s+\w+/.test(trimmed)) {
        const stateMatch = trimmed.match(/^state\s+(\w+)/)
        contextType = 'state'
        contextLabel = stateMatch ? `state: ${stateMatch[1]}` : 'state'
        searchIndent = lineIndent
        continue
      }

      // Check if it's a pseudo-state (hover, focus, etc.)
      if (/^(hover|focus|active|disabled)\b/.test(trimmed)) {
        const stateMatch = trimmed.match(/^(\w+)/)
        contextType = 'state'
        contextLabel = stateMatch ? stateMatch[1] : 'state'
        searchIndent = lineIndent
        continue
      }

      // Check if it's an event handler - track and continue searching
      if (/^on\w+/.test(trimmed)) {
        const eventMatch = trimmed.match(/^(on\w+)/)
        contextType = 'event'
        contextLabel = eventMatch ? eventMatch[1] : 'event'
        searchIndent = lineIndent
        continue
      }

      // It's a component instance or other content - continue searching
      // Update search indent to find lines with less indentation than this
      searchIndent = lineIndent
    }
  }

  return null
}

/**
 * Analyze a nested line to determine its type
 */
function analyzeNestedLine(line: string): { childType: ParentContext['childType']; childLabel: string } {
  const trimmed = line.trim()

  // State declaration
  if (trimmed.startsWith('state ')) {
    const match = trimmed.match(/^state\s+(\w+)/)
    return {
      childType: 'state',
      childLabel: match ? `state: ${match[1]}` : 'state',
    }
  }

  // Event handler
  if (/^on\w+/.test(trimmed)) {
    const match = trimmed.match(/^(on\w+)/)
    return {
      childType: 'event',
      childLabel: match ? match[1] : 'event',
    }
  }

  // Hover/focus/active states
  if (/^(hover|focus|active|disabled)\b/.test(trimmed)) {
    const match = trimmed.match(/^(\w+)/)
    return {
      childType: 'state',
      childLabel: match ? match[1] : 'state',
    }
  }

  // Component child
  const componentMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)
  if (componentMatch) {
    return {
      childType: 'child',
      childLabel: componentMatch[1],
    }
  }

  return {
    childType: 'nested',
    childLabel: 'nested',
  }
}

/**
 * Get the indentation level of a line
 */
function getIndent(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Get the node ID for a specific line using the SourceMap
 *
 * Finds the most specific node that contains the given line.
 *
 * @param sourceMap - The SourceMap instance
 * @param lineNum - Line number (1-indexed)
 * @returns Node ID or null if no node found
 */
export function getNodeIdForLine(sourceMap: SourceMap, lineNum: number): string | null {
  const node = sourceMap.getNodeAtLine(lineNum)
  return node?.nodeId || null
}

/**
 * Get the definition name from a definition line
 *
 * Handles patterns like "Button:" or "Button as Parent:"
 *
 * @param line - The line content
 * @returns Component name or null
 */
export function getDefinitionName(line: string): string | null {
  const match = line.match(/^\s*([A-Z][a-zA-Z0-9]*)\s*(as\s+\w+)?:/)
  return match ? match[1] : null
}

/**
 * Check if a line is inside a component definition block
 *
 * @param source - The full source code
 * @param lineNum - Line number to check (1-indexed)
 * @returns true if inside a definition block
 */
export function isInsideDefinition(source: string, lineNum: number): boolean {
  const parent = findParentDefinition(source, lineNum)
  return parent !== null
}
