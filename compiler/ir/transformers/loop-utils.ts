/**
 * Loop Utility Functions
 *
 * Pure functions for handling loop (each) transformations.
 * Extracted from IRTransformer for modularity.
 */

import type { IRNode } from '../types'

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
  if (node.initialState?.startsWith(`${itemVar}.`) || node.initialState?.startsWith(`$${itemVar}.`)) {
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
