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
} from './line-property-parser'

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
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return this.errorResult(`Node not found: ${nodeId}`)
  }

  // Get the node's line
  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return this.errorResult(`Line not found: ${nodeLine}`)
  }

  // Parse the entire line for robust property handling
  const parsedLine = parseLine(line)

  // Check if property exists (using alias-aware lookup)
  const existingProp = findPropertyInLine(parsedLine, propName)

  if (!existingProp) {
    // Property doesn't exist - add it
    return this.addProperty(nodeId, propName, newValue, options)
  }

  // Update the property using the line parser
  const newLine = updatePropertyInLine(parsedLine, propName, newValue)

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
  }
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
  options: ModifyPropertyOptions = {}
): ModificationResult {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return this.errorResult(`Node not found: ${nodeId}`)
  }

  // Find the node's line
  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return this.errorResult(`Line not found: ${nodeLine}`)
  }

  // Parse the line and add property
  const parsedLine = parseLine(line)
  const newLine = addPropertyToLine(parsedLine, propName, value)

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
  }
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
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return this.errorResult(`Node not found: ${nodeId}`)
  }

  // Get the node's line
  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return this.errorResult(`Line not found: ${nodeLine}`)
  }

  // Parse the line and check if property exists
  const parsedLine = parseLine(line)
  const existingProp = findPropertyInLine(parsedLine, propName)

  if (!existingProp) {
    // Property doesn't exist - this is a successful no-op
    // (the property is already "removed" since it's not there)
    return {
      success: true,
      change: { from: 0, to: 0, insert: '' },
      newSource: this.source,
    }
  }

  // Remove the property using the line parser
  const newLine = removePropertyFromLine(parsedLine, propName)

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
  }
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
