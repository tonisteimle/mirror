/**
 * Loop Utility Functions
 *
 * Pure functions for handling loop (each) transformations.
 * Extracted from IRTransformer for modularity.
 */

import type { IRNode } from '../types'

/**
 * Transform filter expression to mark loop variable references.
 *
 * Replaces references to the loop item variable (and its properties) with
 * __loopVar: markers so the backend knows not to transform them to $get() calls.
 *
 * Examples:
 * - "entry.project == $filter" → "__loopVar:entry.project == $filter"
 * - "entry.task.toLowerCase().includes($query)" → "__loopVar:entry.task.toLowerCase().includes($query)"
 *
 * @param filter The filter expression string
 * @param itemVar The loop item variable name (e.g., "entry")
 * @param indexVar Optional index variable name (e.g., "i")
 * @returns Transformed filter expression with __loopVar: markers
 */
export function markLoopVariablesInFilter(
  filter: string,
  itemVar: string,
  indexVar?: string
): string {
  // Match the item variable followed by optional property access or method calls
  // e.g., "entry", "entry.project", "entry.task.toLowerCase()"
  // We need to be careful not to match partial words (e.g., "entry" in "reentry")
  // Added: also recognize Mirror's 'and'/'or' operators as valid boundaries
  const itemVarPattern = new RegExp(
    `(?<![\\w$])${escapeRegex(itemVar)}(?=\\.|\\s|==|!=|&&|\\|\\||\\)|$|,|\\s+and\\s|\\s+or\\s)`,
    'g'
  )
  let result = filter.replace(itemVarPattern, `__loopVar:${itemVar}`)

  // Also mark index variable if present
  if (indexVar) {
    const indexVarPattern = new RegExp(
      `(?<![\\w$])${escapeRegex(indexVar)}(?=\\s|==|!=|&&|\\|\\||\\)|$|,|\\s+and\\s|\\s+or\\s)`,
      'g'
    )
    result = result.replace(indexVarPattern, `__loopVar:${indexVar}`)
  }

  return result
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Fix loop variable references in each template nodes.
 *
 * When parsing "Text item" inside "each item in ...", the parser incorrectly
 * sets initialState: "item" instead of textContent. This function fixes that
 * by converting initialState matching the loop variable to textContent.
 *
 * @param node The IR node to fix
 * @param itemVar The loop item variable name (e.g., "item" in "each item in $items")
 * @param indexVar Optional index variable name (e.g., "i" in "each item, i in $items")
 */
export function fixLoopVariableReferences(node: IRNode, itemVar: string, indexVar?: string): void {
  // Check if this node has initialState matching the item variable
  // Handle both with and without $ prefix (e.g., "task" or "$task")
  if (node.initialState === itemVar || node.initialState === `$${itemVar}`) {
    // Convert to textContent property with $item reference
    node.properties.push({
      name: 'textContent',
      value: `$${itemVar}`,
    })
    delete node.initialState
  }

  // Check if this node has initialState matching the index variable
  if (indexVar && (node.initialState === indexVar || node.initialState === `$${indexVar}`)) {
    // Convert to textContent property with $index reference
    node.properties.push({
      name: 'textContent',
      value: `$${indexVar}`,
    })
    delete node.initialState
  }

  // Also handle dot notation: initialState: "item.name" or "$item.name" → textContent: "$item.name"
  if (
    node.initialState?.startsWith(`${itemVar}.`) ||
    node.initialState?.startsWith(`$${itemVar}.`)
  ) {
    // Ensure value has $ prefix
    const value = node.initialState.startsWith('$') ? node.initialState : `$${node.initialState}`
    node.properties.push({
      name: 'textContent',
      value,
    })
    delete node.initialState
  }

  // Recursively fix children
  for (const child of node.children) {
    fixLoopVariableReferences(child, itemVar, indexVar)
  }
}
