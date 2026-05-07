/**
 * Shared line-edit boilerplate for code-modifier ops.
 *
 * Extracted because property-ops (updateProperty / addProperty /
 * removeProperty) and text-ops (updateTextContent) all run the same
 * 5-step skeleton:
 *
 *   1. Resolve nodeId → line index via sourceMap.
 *   2. Parse the original line.
 *   3. Hand the parsed line to `compute`, which returns either the
 *      new line (string) OR null for a no-op.
 *   4. Persist the new line back to modifier.source / modifier.lines
 *      (load-bearing for batch + sequential edits — without this,
 *      downstream calls operate on stale source).
 *   5. Build the CodeMirror-shaped { from, to, insert } change.
 *
 * Each op differs only in step 3 — the compute callback. Keeping
 * steps 1, 2, 4, 5 in a single function means the persist contract
 * lives in exactly one place.
 */

import type { CodeModifier, ModificationResult } from './code-modifier'
import { parseLine, type ParsedLine } from './line-property-parser'

export type LineEditCompute = (line: string, parsed: ParsedLine) => string | null

/**
 * Generic line edit. Returns ModificationResult; callers that need
 * extra fields (e.g. text-ops returns oldText for undo) spread the
 * result into their own shape.
 */
export function applyLineEdit(
  modifier: CodeModifier,
  nodeId: string,
  compute: LineEditCompute
): ModificationResult {
  const nodeMapping = modifier.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return modifier.errorResult(`Node not found: ${nodeId}`)

  const nodeLine = nodeMapping.position.line
  const line = modifier.lines[nodeLine - 1]
  if (!line) return modifier.errorResult(`Line not found: ${nodeLine}`)

  const parsedLine = parseLine(line)
  const newLine = compute(line, parsedLine)

  if (newLine === null) {
    return {
      success: true,
      change: { from: 0, to: 0, insert: '' },
      newSource: modifier.source,
    }
  }

  const lineStartOffset = modifier.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  const newLines = [...modifier.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  // CRITICAL: persist for sequential / batch edits.
  modifier.source = newSource
  modifier.lines = newLines

  return {
    success: true,
    newSource,
    change: { from, to, insert: newLine },
  }
}

/**
 * Variant for callers that need the parsedLine in the result (e.g.
 * text-ops captures `oldText` from parsedLine.textContent for undo).
 *
 * Returns the same ModificationResult plus the parsed line so the
 * caller doesn't have to parse a second time.
 */
export function applyLineEditWithParsed(
  modifier: CodeModifier,
  nodeId: string,
  compute: LineEditCompute
): { result: ModificationResult; parsedLine: ParsedLine | null } {
  const nodeMapping = modifier.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return { result: modifier.errorResult(`Node not found: ${nodeId}`), parsedLine: null }
  }

  const nodeLine = nodeMapping.position.line
  const line = modifier.lines[nodeLine - 1]
  if (!line) {
    return { result: modifier.errorResult(`Line not found: ${nodeLine}`), parsedLine: null }
  }

  const parsedLine = parseLine(line)
  const newLine = compute(line, parsedLine)

  if (newLine === null) {
    return {
      result: {
        success: true,
        change: { from: 0, to: 0, insert: '' },
        newSource: modifier.source,
      },
      parsedLine,
    }
  }

  const lineStartOffset = modifier.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  const newLines = [...modifier.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  modifier.source = newSource
  modifier.lines = newLines

  return {
    result: {
      success: true,
      newSource,
      change: { from, to, insert: newLine },
    },
    parsedLine,
  }
}
