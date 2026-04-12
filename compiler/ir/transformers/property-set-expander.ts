/**
 * Property Set Expander
 *
 * Functions for expanding property sets (tokens with multiple properties).
 * A property set reference looks like: { name: 'propset', values: [{ kind: 'token', name: 'cardstyle' }] }
 * If 'cardstyle' is a property set, expand it to its constituent properties.
 *
 * Also handles component references as style mixins:
 * Syntax: Input placeholder "...", InputField
 * If 'InputField' is a component, expand its properties into the instance.
 */

import type { Property, ComponentDefinition } from '../../parser/ast'

/**
 * Expand property sets and component references in a list of properties.
 *
 * @param properties Array of properties to expand
 * @param propertySetMap Map of property set names to their constituent properties
 * @param componentMap Optional map of component names to their definitions (for style mixins)
 * @returns Expanded array of properties
 */
export function expandPropertySets(
  properties: Property[],
  propertySetMap: Map<string, Property[]>,
  componentMap?: Map<string, ComponentDefinition>
): Property[] {
  const expanded: Property[] = []

  for (const prop of properties) {
    // Check if this is a property set reference (propset property from parser)
    // Syntax: Frame $cardstyle → propset: { kind: 'token', name: 'cardstyle' }
    if (prop.name === 'propset' && prop.values.length === 1) {
      const val = prop.values[0]
      if (typeof val === 'object' && val !== null && 'kind' in val && val.kind === 'token') {
        const tokenName = (val as { kind: 'token'; name: string }).name
        const propertySet = propertySetMap.get(tokenName)
        if (propertySet) {
          // Expand the property set - add all its properties
          expanded.push(...propertySet)
          continue
        }
      }
    }

    // Check if this is a component reference used as a style mixin
    // Syntax: Input placeholder "...", InputField
    // A property with PascalCase name and empty values that matches a component name
    if (componentMap && prop.values.length === 0) {
      const name = prop.name
      // Check if name is PascalCase (starts with uppercase letter)
      if (name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) {
        const component = componentMap.get(name)
        if (component && component.properties.length > 0) {
          // Expand the component's properties as a style mixin
          expanded.push(...component.properties)
          continue
        }
      }
    }

    // Regular property - keep as is
    expanded.push(prop)
  }

  return expanded
}
