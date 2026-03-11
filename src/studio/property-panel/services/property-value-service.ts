/**
 * PropertyValueService - Unified value handling for property changes
 *
 * This service acts as an intermediary between UI inputs and the CodeModifier.
 * It ensures that compound property values (like border, padding) are correctly
 * updated without losing existing parts.
 *
 * Example:
 *   Border is "2 #FF0000"
 *   User changes color to #00FF00
 *   Without this service: "1 #00FF00" (width lost!)
 *   With this service: "2 #00FF00" (width preserved)
 */

import type { CodeModifier, ModificationResult } from '../../code-modifier'
import type { SourceMap } from '../../source-map'
import { parseLine, findPropertyInLine, getCanonicalName } from '../../line-property-parser'
import { getPropertySchema, isCompoundProperty, type PropertySchema } from './property-schemas'

/**
 * Options for setValue
 */
export interface SetValueOptions {
  /**
   * For compound properties (border, padding), specify which part to update.
   * Examples:
   *   - border: 'width', 'color'
   *   - padding: 'top', 'right', 'bottom', 'left', 'h' (left+right), 'v' (top+bottom)
   *   - radius: 'tl', 'tr', 'br', 'bl'
   */
  part?: string

  /**
   * Whether the value is a token reference (starts with $)
   */
  isToken?: boolean
}

/**
 * Result of a setValue operation
 */
export interface SetValueResult extends ModificationResult {
  /**
   * The complete value that was set (after merging parts)
   */
  finalValue?: string
}

/**
 * PropertyValueService class
 */
export class PropertyValueService {
  private codeModifier: CodeModifier
  private sourceMap: SourceMap
  private sourceGetter: () => string

  constructor(
    codeModifier: CodeModifier,
    sourceMap: SourceMap,
    sourceGetter: () => string
  ) {
    this.codeModifier = codeModifier
    this.sourceMap = sourceMap
    this.sourceGetter = sourceGetter
  }

  /**
   * Set a property value, handling compound properties correctly
   */
  setValue(
    nodeId: string,
    property: string,
    value: string,
    options: SetValueOptions = {}
  ): SetValueResult {
    const schema = getPropertySchema(property)

    // If no part specified or not a compound property, just set directly
    if (!options.part || !isCompoundProperty(property)) {
      // Simple property - validate and set
      if (schema.validate && !schema.validate(value)) {
        return {
          success: false,
          newSource: this.sourceGetter(),
          change: { from: 0, to: 0, insert: '' },
          error: `Invalid value for ${property}: ${value}`,
        }
      }

      const result = this.codeModifier.updateProperty(nodeId, property, value)
      return { ...result, finalValue: value }
    }

    // Compound property - need to merge with existing value
    const currentValue = this.getValue(nodeId, property)
    const newValue = this.mergeCompoundValue(schema, currentValue, value, options.part)

    // Validate the merged value
    if (schema.validate && !schema.validate(newValue)) {
      return {
        success: false,
        newSource: this.sourceGetter(),
        change: { from: 0, to: 0, insert: '' },
        error: `Invalid value for ${property}: ${newValue}`,
      }
    }

    const result = this.codeModifier.updateProperty(nodeId, property, newValue)
    return { ...result, finalValue: newValue }
  }

  /**
   * Remove a property
   */
  removeValue(nodeId: string, property: string): ModificationResult {
    return this.codeModifier.removeProperty(nodeId, property)
  }

  /**
   * Get the current value of a property
   */
  getValue(nodeId: string, property: string): string | null {
    const node = this.sourceMap.getNodeById(nodeId)
    if (!node) return null

    const source = this.sourceGetter()
    const lines = source.split('\n')
    const line = lines[node.position.line - 1]

    if (!line) return null

    const parsedLine = parseLine(line)
    const prop = findPropertyInLine(parsedLine, property)

    return prop?.value || null
  }

  /**
   * Get a specific part of a compound property value
   */
  getValuePart(nodeId: string, property: string, part: string): string | null {
    const value = this.getValue(nodeId, property)
    if (!value) return null

    const schema = getPropertySchema(property)
    if (!schema.parse) return null

    const parsed = schema.parse(value)
    return parsed[part] || null
  }

  /**
   * Merge a new part value into an existing compound property value
   */
  private mergeCompoundValue(
    schema: PropertySchema,
    currentValue: string | null,
    newPartValue: string,
    partName: string
  ): string {
    if (!schema.parse || !schema.format) {
      // No parse/format functions, just return the new value
      return newPartValue
    }

    // Parse the current value
    const parsed = schema.parse(currentValue || '')

    // Handle special part names and short forms
    switch (partName) {
      case 'h':
        // Horizontal: set left and right
        parsed.left = newPartValue
        parsed.right = newPartValue
        break
      case 'v':
        // Vertical: set top and bottom
        parsed.top = newPartValue
        parsed.bottom = newPartValue
        break
      case 't':
        // Short form for top
        parsed.top = newPartValue
        break
      case 'r':
        // Short form for right
        parsed.right = newPartValue
        break
      case 'b':
        // Short form for bottom
        parsed.bottom = newPartValue
        break
      case 'l':
        // Short form for left
        parsed.left = newPartValue
        break
      default:
        // Direct part assignment (top, right, bottom, left, width, color, tl, tr, br, bl)
        parsed[partName] = newPartValue
    }

    // Format back to string
    return schema.format(parsed)
  }

  /**
   * Update the code modifier reference
   */
  updateCodeModifier(codeModifier: CodeModifier): void {
    this.codeModifier = codeModifier
  }

  /**
   * Update the source map reference
   */
  updateSourceMap(sourceMap: SourceMap): void {
    this.sourceMap = sourceMap
  }
}

/**
 * Create a PropertyValueService
 */
export function createPropertyValueService(
  codeModifier: CodeModifier,
  sourceMap: SourceMap,
  sourceGetter: () => string
): PropertyValueService {
  return new PropertyValueService(codeModifier, sourceMap, sourceGetter)
}
