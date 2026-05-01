/**
 * Layout Operations — setLayoutDirection, getLayoutForZone, applyLayoutToContainer.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import { CodeModifier, type ModificationResult, type SemanticZone } from './code-modifier'
import {
  parseLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
} from './line-property-parser'

/**
 * Set layout direction by removing competing layout properties and adding the new one
 *
 * Removes: hor, horizontal, ver, vertical, grid, stacked
 * Adds: hor (for horizontal) or ver (for vertical)
 *
 * This is done in a single operation to avoid SourceMap invalidation issues
 */
export function setLayoutDirection(
  this: CodeModifier,
  nodeId: string,
  direction: 'horizontal' | 'vertical'
): ModificationResult {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) {
    return this.errorResult(`Node not found: ${nodeId}`)
  }

  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) {
    return this.errorResult(`Line not found: ${nodeLine}`)
  }

  // Parse the line
  const parsedLine = parseLine(line)

  // Layout properties to remove
  const layoutProps = ['hor', 'horizontal', 'ver', 'vertical', 'grid', 'stacked']

  // Create new line by removing layout properties and adding the new one
  let newLine = line
  for (const propName of layoutProps) {
    const parsed = parseLine(newLine)
    const existingProp = findPropertyInLine(parsed, propName)
    if (existingProp) {
      newLine = removePropertyFromLine(parseLine(newLine), propName)
    }
  }

  // Add the new layout property
  const propToAdd = direction === 'horizontal' ? 'hor' : 'ver'
  const finalParsed = parseLine(newLine)
  newLine = addPropertyToLine(finalParsed, propToAdd, '')

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
 * Get layout properties for a semantic zone
 */
export function getLayoutForZone(this: CodeModifier, zone: SemanticZone): string {
  return CodeModifier.ZONE_CONTAINER_LAYOUT[zone]
}

/**
 * Check if container already has layout/alignment properties
 */
export function containerHasLayoutDirection(this: CodeModifier, containerLine: string): boolean {
  const layoutProps = [
    'ver',
    'hor',
    'center',
    'spread',
    'grid',
    'left',
    'right',
    'top',
    'bottom',
    'hor-center',
    'ver-center',
    // Absolute layout properties - don't add flex layout to these containers
    'stacked',
  ]
  const parsedLine = parseLine(containerLine)
  return parsedLine.properties.some(p => layoutProps.includes(p.name))
}

/**
 * Apply layout properties to a container based on semantic zone
 *
 * Returns a modified source with layout properties added to the container line.
 */
export function applyLayoutToContainer(
  this: CodeModifier,
  containerId: string,
  semanticZone: SemanticZone
): ModificationResult {
  const layoutProps = this.getLayoutForZone(semanticZone)

  // No layout needed for center-left (default)
  if (!layoutProps) {
    return {
      success: true,
      newSource: this.source,
      change: { from: 0, to: 0, insert: '' },
    }
  }

  const containerMapping = this.sourceMap.getNodeById(containerId)
  if (!containerMapping) {
    return this.errorResult(`Container not found: ${containerId}`)
  }

  // Get container's line
  const containerLine = this.lines[containerMapping.position.line - 1]

  // Check if container already has layout - skip if it does
  if (this.containerHasLayoutDirection(containerLine)) {
    return {
      success: true,
      newSource: this.source,
      change: { from: 0, to: 0, insert: '' },
    }
  }

  // Parse the line and add layout properties
  const parsedLine = parseLine(containerLine)

  // Add each layout property
  let newLine = containerLine
  const propsToAdd = layoutProps
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)

  for (const prop of propsToAdd) {
    // Handle boolean props (ver, hor, center, spread) vs value props
    const parts = prop.split(/\s+/)
    const propName = parts[0]
    const propValue = parts.slice(1).join(' ') || 'true'

    // Check if property already exists
    const existingProp = findPropertyInLine(parseLine(newLine), propName)
    if (!existingProp) {
      // Add the property
      const parsed = parseLine(newLine)
      if (propValue === 'true') {
        newLine = addPropertyToLine(parsed, propName, '')
      } else {
        newLine = addPropertyToLine(parsed, propName, propValue)
      }
    }
  }

  // Calculate character offsets for the change
  const lineStartOffset = this.getCharacterOffset(containerMapping.position.line, 1)
  const from = lineStartOffset
  const to = lineStartOffset + containerLine.length

  // Apply the change
  const newLines = [...this.lines]
  newLines[containerMapping.position.line - 1] = newLine
  const newSource = newLines.join('\n')

  // Persist changes for subsequent operations
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
