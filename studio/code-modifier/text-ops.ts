/**
 * Text Content Operations — updateTextContent + line rebuild helper.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type { CodeModifier, ModificationResult } from './code-modifier'
import { parseLine, type ParsedLine } from './line-property-parser'

/**
 * Update text content of a text element
 *
 * Handles:
 * - Button "Old" → Button "New"
 * - Text "Hello" → Text "World"
 * - H1 "Title" → H1 "New Title"
 *
 * Preserves all properties on the same line.
 *
 * @returns ModificationResult with oldText for undo support
 */
export function updateTextContent(
  this: CodeModifier,
  nodeId: string,
  newText: string
): ModificationResult & { oldText?: string } {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return { ...this.errorResult(`Node not found: ${nodeId}`), oldText: undefined }
  }

  // Get the node's line
  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return { ...this.errorResult(`Line not found: ${nodeLine}`), oldText: undefined }
  }

  // Parse the line
  const parsedLine = parseLine(line)

  // Get old text content
  const oldText = parsedLine.textContent
    ? parsedLine.textContent.replace(/^["']|["']$/g, '') // Remove quotes
    : ''

  // Escape quotes in new text
  const escapedNewText = newText.replace(/"/g, '\\"')

  // Build the new line
  let newLine: string

  if (parsedLine.textContent) {
    // Replace existing text content
    // Find the FIRST text content position after the component name
    // Using indexOf instead of lastIndexOf to avoid matching duplicate text in properties
    const componentEndApprox = parsedLine.indent.length + (parsedLine.componentPart?.length || 0)
    const textStart = line.indexOf(parsedLine.textContent, componentEndApprox)
    if (textStart !== -1) {
      newLine =
        line.substring(0, textStart) +
        `"${escapedNewText}"` +
        line.substring(textStart + parsedLine.textContent.length)
    } else {
      // Fallback: rebuild line
      newLine = this.rebuildLineWithText(parsedLine, escapedNewText)
    }
  } else {
    // Add text content after component name
    // Insert before first property or at end
    if (parsedLine.properties.length > 0) {
      // Insert text content before first property
      const firstProp = parsedLine.properties[0]
      const beforeProps = line.substring(0, firstProp.startIndex)
      const afterProps = line.substring(firstProp.startIndex)
      // Check if there's a comma separator or not
      const needsComma = afterProps.trim().startsWith(',') ? '' : ','
      newLine = `${beforeProps.trimEnd()} "${escapedNewText}"${needsComma} ${afterProps.trimStart()}`
    } else {
      // No properties, just append text content
      newLine = `${line.trimEnd()} "${escapedNewText}"`
    }
  }

  // Calculate character offsets for the change
  const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  // Apply the change
  const newLines = [...this.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  // CRITICAL: Persist the changes for subsequent calls
  this.source = newSource
  this.lines = newLines

  return {
    success: true,
    newSource,
    change: {
      from,
      to,
      insert: newLine,
    },
    oldText,
  }
}

/**
 * Rebuild a line with new text content
 */
export function rebuildLineWithText(
  this: CodeModifier,
  parsedLine: ParsedLine,
  newText: string
): string {
  let line = parsedLine.indent + parsedLine.componentPart
  if (newText) line += ` "${newText}"`
  if (parsedLine.properties.length > 0) {
    line += `, ${parsedLine.properties.map(p => (p.isBoolean ? p.name : `${p.name} ${p.value}`)).join(', ')}`
  }
  return line
}

/**
 * Clean up consecutive empty lines in source code
 * Replaces multiple consecutive empty lines with a single empty line
 */
export function cleanupEmptyLines(this: CodeModifier, source: string): string {
  // Replace 2+ consecutive empty lines (or lines with only whitespace) with a single empty line
  return source.replace(/\n\s*\n\s*\n/g, '\n\n')
}
