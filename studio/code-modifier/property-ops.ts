/**
 * Property Operations — updateProperty, addProperty, removeProperty + helpers.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type {
  CodeModifier,
  ModificationResult,
  ModifyPropertyOptions,
  CodeChange,
} from './code-modifier'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  type ParsedLine,
} from './line-property-parser'

/**
 * Boilerplate skeleton for any single-line property edit.
 *
 * 1. Resolve nodeId → line index via sourceMap.
 * 2. Parse the original line.
 * 3. Hand the parsed line to `compute`, which returns either the new
 *    line string OR null for a no-op.
 * 4. Persist the new line to the modifier's source/lines (load-bearing
 *    for batch / sequential edits — without this, downstream calls
 *    operate on stale source).
 * 5. Build the CodeMirror-shaped { from, to, insert } change.
 *
 * The three property ops below differ only in step 3.
 */
function applyLineEdit(
  modifier: CodeModifier,
  nodeId: string,
  compute: (line: string, parsed: ParsedLine) => string | null
): ModificationResult {
  const nodeMapping = modifier.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return modifier.errorResult(`Node not found: ${nodeId}`)

  const nodeLine = nodeMapping.position.line
  const line = modifier.lines[nodeLine - 1]
  if (!line) return modifier.errorResult(`Line not found: ${nodeLine}`)

  const parsedLine = parseLine(line)
  const newLine = compute(line, parsedLine)

  if (newLine === null) {
    // No-op: signal success without touching the source.
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

  // CRITICAL: persist for subsequent calls (sequential / batch edits).
  modifier.source = newSource
  modifier.lines = newLines

  return {
    success: true,
    newSource,
    change: { from, to, insert: newLine },
  }
}

/**
 * Update an existing property value
 *
 * Uses LinePropertyParser for robust line analysis:
 * - Supports property aliases (bg, background, etc.)
 * - Correctly handles multi-value properties
 * - Preserves original property name used in source
 */
export function updateProperty(
  this: CodeModifier,
  nodeId: string,
  propName: string,
  newValue: string,
  options: ModifyPropertyOptions = {}
): ModificationResult {
  // Existing-prop check decides between in-place update vs append.
  // We need the parse result before deciding, so we do the lookup
  // up-front (outside applyLineEdit), then either delegate to
  // addProperty or pass the new-line computer to applyLineEdit.
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return this.errorResult(`Node not found: ${nodeId}`)
  const line = this.lines[nodeMapping.position.line - 1]
  if (!line) return this.errorResult(`Line not found: ${nodeMapping.position.line}`)

  const parsed = parseLine(line)
  if (!findPropertyInLine(parsed, propName)) {
    return this.addProperty(nodeId, propName, newValue, options)
  }

  return applyLineEdit(this, nodeId, (_line, parsedLine) =>
    updatePropertyInLine(parsedLine, propName, newValue)
  )
}

/**
 * Add a new property to a node
 *
 * Uses LinePropertyParser for consistent line handling
 */
export function addProperty(
  this: CodeModifier,
  nodeId: string,
  propName: string,
  value: string,
  _options: ModifyPropertyOptions = {}
): ModificationResult {
  return applyLineEdit(this, nodeId, (_line, parsed) => addPropertyToLine(parsed, propName, value))
}

/**
 * Remove a property from a node
 *
 * Uses LinePropertyParser for alias-aware property removal
 */
export function removeProperty(
  this: CodeModifier,
  nodeId: string,
  propName: string
): ModificationResult {
  return applyLineEdit(this, nodeId, (_line, parsed) => {
    if (!findPropertyInLine(parsed, propName)) return null // no-op
    return removePropertyFromLine(parsed, propName)
  })
}

/**
 * Find and replace a property value in a line
 */
export function findAndReplaceProperty(
  this: CodeModifier,
  line: string,
  propName: string,
  newValue: string,
  lineNumber: number
): { newLine: string; change: CodeChange } | null {
  // Patterns to match property:
  // 1. "propName value" or "propName value," or "propName value\n"
  // 2. For boolean: just "propName" or "propName,"

  // Try to match property with value
  const patterns = [
    // Property with quoted value: propName "value"
    new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)("[^"]*"|'[^']*')`, 'g'),
    // Property with unquoted value: propName value (captured until comma or end)
    new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)([^,\\s]+(?:\\s+[^,\\s]+)*)`, 'g'),
    // Boolean property (no value)
    new RegExp(`(\\b${this.escapeRegex(propName)})(\\b)(?=\\s*,|\\s*$)`, 'g'),
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(line)
    if (match) {
      const fullMatch = match[0]
      const prefix = match[1]
      const matchStart = match.index
      const matchEnd = matchStart + fullMatch.length

      // Format the new value
      const formattedValue = this.formatValue(propName, newValue)
      const newProp = `${prefix.trim()} ${formattedValue}`

      // Build the new line
      const newLine = line.substring(0, matchStart) + newProp + line.substring(matchEnd)

      // Calculate character offsets
      const from = this.getCharacterOffset(lineNumber, matchStart + 1)
      const to = this.getCharacterOffset(lineNumber, matchEnd + 1)

      return {
        newLine,
        change: {
          from,
          to,
          insert: newProp,
        },
      }
    }
  }

  return null
}

/**
 * Find and remove a property from a line
 */
export function findAndRemoveProperty(
  this: CodeModifier,
  line: string,
  propName: string,
  lineNumber: number
): { newLine: string; change: CodeChange } | null {
  // Patterns to match property (including leading/trailing comma)
  const patterns = [
    // Property with comma before: ", propName value"
    new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, 'g'),
    // Property with comma after: "propName value,"
    new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+,\\s*`, 'g'),
    // Property alone: "propName value"
    new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, 'g'),
    // Boolean with comma before: ", propName"
    new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\b`, 'g'),
    // Boolean with comma after: "propName,"
    new RegExp(`\\b${this.escapeRegex(propName)}\\b,\\s*`, 'g'),
    // Boolean alone: "propName"
    new RegExp(`\\b${this.escapeRegex(propName)}\\b`, 'g'),
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(line)
    if (match) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length

      // Build the new line
      const newLine = line.substring(0, matchStart) + line.substring(matchEnd)

      // Calculate character offsets
      const from = this.getCharacterOffset(lineNumber, matchStart + 1)
      const to = this.getCharacterOffset(lineNumber, matchEnd + 1)

      return {
        newLine: newLine.trim() ? newLine : line, // Don't leave empty lines
        change: {
          from,
          to,
          insert: '',
        },
      }
    }
  }

  return null
}

/**
 * Format a property for insertion
 */
export function formatProperty(this: CodeModifier, name: string, value: string): string {
  // Boolean properties
  if (value === 'true' || value === '') {
    return name
  }

  // Values that need quotes
  if (value.includes(' ') && !value.startsWith('$') && !value.startsWith('#')) {
    return `${name} "${value}"`
  }

  return `${name} ${value}`
}

/**
 * Format a value (may need quotes, etc.)
 */
export function formatValue(this: CodeModifier, propName: string, value: string): string {
  // Boolean properties don't need a value
  if (value === 'true' || value === '') {
    return ''
  }

  // Token references
  if (value.startsWith('$')) {
    return value
  }

  // Color values
  if (value.startsWith('#')) {
    return value
  }

  // Numeric values
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value
  }

  // Values with spaces need quotes
  if (value.includes(' ')) {
    return `"${value}"`
  }

  return value
}

/**
 * Check if a line already has properties
 */
export function lineHasProperties(this: CodeModifier, line: string): boolean {
  // Look for common property patterns
  return line.includes(',') || /\s+(pad|bg|col|w|h|gap|rad|bor)\s+/.test(line)
}

/**
 * Escape regex special characters
 */
export function escapeRegex(this: CodeModifier, str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Atomic batch property change.
 *
 * Snapshot before, apply each change in sequence (each call updates
 * `this.source` and `this.lines`), restore on first failure. The result
 * folds the per-change diffs into one whole-file CodeChange so that
 * downstream consumers (CodeMirror, undo history) treat the batch as
 * a single edit step.
 */
export interface BatchPropertyChange {
  name: string
  value: string
  action: 'set' | 'remove' | 'toggle'
}

export function applyBatchChanges(
  this: CodeModifier,
  nodeId: string,
  changes: BatchPropertyChange[]
): ModificationResult {
  if (changes.length === 0) {
    return {
      success: true,
      newSource: this.source,
      change: { from: 0, to: 0, insert: '' },
      noChange: true,
    }
  }

  const originalSource = this.source
  this.createSnapshot()

  for (const change of changes) {
    let result: ModificationResult
    switch (change.action) {
      case 'set':
        result = this.updateProperty(nodeId, change.name, change.value)
        break
      case 'remove':
        result = this.removeProperty(nodeId, change.name)
        break
      case 'toggle':
        result =
          change.value === 'true'
            ? this.addProperty(nodeId, change.name, '')
            : this.removeProperty(nodeId, change.name)
        break
    }

    if (!result.success) {
      this.restoreSnapshot()
      return {
        success: false,
        newSource: originalSource,
        change: { from: 0, to: 0, insert: '' },
        error: result.error ?? `Batch failed at ${change.action} ${change.name}`,
      }
    }
  }

  // All changes succeeded — fold into a single whole-file replacement so
  // editor/undo history sees the batch as one step.
  return {
    success: true,
    newSource: this.source,
    change: {
      from: 0,
      to: originalSource.length,
      insert: this.source,
    },
  }
}
