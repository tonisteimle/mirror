/**
 * Text Content Operations — updateTextContent + line rebuild helper.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type { CodeModifier, ModificationResult } from './code-modifier'
import { type ParsedLine } from './line-property-parser'
import { applyLineEditWithParsed } from './line-edit'

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
  const escapedNewText = newText.replace(/"/g, '\\"')
  const modifier = this

  const { result, parsedLine } = applyLineEditWithParsed(this, nodeId, (line, parsed) =>
    computeNewTextLine(modifier, line, parsed, escapedNewText)
  )

  // Capture oldText for undo. parsedLine is null only if nodeMapping
  // / line lookup failed — in that case the result is already an
  // error and oldText is undefined.
  const oldText = parsedLine?.textContent ? parsedLine.textContent.replace(/^["']|["']$/g, '') : ''

  return { ...result, oldText: result.success ? oldText : undefined }
}

/**
 * Compute the new line for a text-content edit. Three cases:
 *   - Quoted literal already on the line  → in-place replace.
 *   - No text content + has properties    → insert before first prop.
 *   - No text content + no properties     → append at end.
 */
function computeNewTextLine(
  modifier: CodeModifier,
  line: string,
  parsedLine: ParsedLine,
  escapedNewText: string
): string {
  if (parsedLine.textContent) {
    // Find the FIRST text content position after the component name
    // (indexOf, not lastIndexOf, so duplicate text in property values
    // doesn't get rewritten).
    const componentEndApprox = parsedLine.indent.length + (parsedLine.componentPart?.length || 0)
    const textStart = line.indexOf(parsedLine.textContent, componentEndApprox)
    if (textStart !== -1) {
      return (
        line.substring(0, textStart) +
        `"${escapedNewText}"` +
        line.substring(textStart + parsedLine.textContent.length)
      )
    }
    // Fallback if indexOf doesn't find the literal — rebuild.
    return modifier.rebuildLineWithText(parsedLine, escapedNewText)
  }

  if (parsedLine.properties.length > 0) {
    // Insert text content before first property.
    const firstProp = parsedLine.properties[0]
    const beforeProps = line.substring(0, firstProp.startIndex)
    const afterProps = line.substring(firstProp.startIndex)
    const needsComma = afterProps.trim().startsWith(',') ? '' : ','
    return `${beforeProps.trimEnd()} "${escapedNewText}"${needsComma} ${afterProps.trimStart()}`
  }

  // No properties, no existing text — append.
  return `${line.trimEnd()} "${escapedNewText}"`
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
