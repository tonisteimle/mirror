/**
 * Property Set Expander
 *
 * Functions for expanding property sets (tokens with multiple properties).
 * A property set reference looks like: { name: 'propset', values: [{ kind: 'token', name: 'cardstyle' }] }
 * If 'cardstyle' is a property set, expand it to its constituent properties.
 */

import type { Property } from '../../parser/ast'

/**
 * Expand property sets in a list of properties.
 *
 * @param properties Array of properties to expand
 * @param propertySetMap Map of property set names to their constituent properties
 * @returns Expanded array of properties
 */
export function expandPropertySets(
  properties: Property[],
  propertySetMap: Map<string, Property[]>
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

    // Regular property - keep as is
    expanded.push(prop)
  }

  return expanded
}
