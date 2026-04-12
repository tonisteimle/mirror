/**
 * Slot Utility Functions
 *
 * Pure functions for slot filling and child override handling.
 * Extracted from IRTransformer for modularity.
 */

import type { Instance, Text, Property, ChildOverride } from '../../parser/ast'
import { isText, hasContent } from '../../parser/ast'

/**
 * Convert childOverrides to Instance objects for slot filling
 *
 * childOverrides syntax: NavItem Icon "home"; Label "Home"
 * Each override becomes a pseudo-Instance that fills the corresponding slot
 */
export function childOverridesToInstances(overrides: ChildOverride[]): Instance[] {
  return overrides.map(override => ({
    type: 'Instance' as const,
    component: override.childName,
    name: null,
    properties: override.properties,
    children: [],
    line: override.properties[0]?.line || 0,
    column: override.properties[0]?.column || 0,
  }))
}

/**
 * Merge slot properties into a filler element.
 * Slot properties provide defaults, filler properties override them.
 *
 * Example:
 *   Slot definition: Title: fs 16, weight 500, col white
 *   Filler: Title "Hello", col red
 *   Result: fs 16, weight 500, col red (filler's col wins)
 */
export function mergeSlotPropertiesIntoFiller(
  filler: Instance | Text,
  slotProperties: Property[]
): Instance | Text {
  // If no slot properties, return filler as-is
  if (slotProperties.length === 0) {
    return filler
  }

  // Text nodes need to be wrapped or converted to Instance
  if (isText(filler) || hasContent(filler)) {
    const text = filler as Text
    // Create an Instance that acts as a styled text container
    return {
      type: 'Instance',
      component: 'Text',
      name: null,
      properties: [...slotProperties, { type: 'Property', name: 'content', values: [text.content], line: text.line, column: text.column }],
      children: [],
      line: text.line,
      column: text.column,
    } as Instance
  }

  // For Instance fillers, merge properties (filler wins on conflict)
  const fillerInstance = filler as Instance
  const fillerPropNames = new Set(fillerInstance.properties.map(p => p.name))

  // Add slot properties that aren't overridden by filler
  const mergedProperties = [
    ...slotProperties.filter(p => !fillerPropNames.has(p.name)),
    ...fillerInstance.properties,
  ]

  return {
    ...fillerInstance,
    properties: mergedProperties,
  }
}
