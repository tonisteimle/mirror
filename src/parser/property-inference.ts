/**
 * Property Inference Module
 *
 * Infers property names from token name suffixes and component types.
 * Used for syntactic sugar where property names are omitted.
 */

/**
 * Infer property name from token name suffix.
 * e.g., $default-pad → 'pad', $card-radius → 'rad'
 */
export function inferPropertyFromTokenName(tokenName: string): string | null {
  const name = tokenName.toLowerCase()

  // Check suffixes in order of specificity
  if (name.endsWith('-pad') || name.endsWith('-padding')) return 'pad'
  if (name.endsWith('-mar') || name.endsWith('-margin')) return 'mar'
  if (name.endsWith('-rad') || name.endsWith('-radius')) return 'rad'
  if (name.endsWith('-gap')) return 'gap'
  // Unified color: col is used for all colors (maps to bg or text color based on component)
  if (name.endsWith('-col') || name.endsWith('-color')) return 'col'
  if (name.endsWith('-boc') || name.endsWith('-border-color')) return 'boc'
  if (name.endsWith('-bor') || name.endsWith('-border')) return 'bor'
  if (name.endsWith('-size') || name.endsWith('-font-size')) return 'size'
  if (name.endsWith('-weight') || name.endsWith('-font-weight')) return 'weight'
  if (name.endsWith('-w') || name.endsWith('-width')) return 'w'
  if (name.endsWith('-h') || name.endsWith('-height')) return 'h'
  if (name.endsWith('-z') || name.endsWith('-index')) return 'z'

  return null
}

/**
 * Infer default color property from component type.
 * All components use 'col' for color.
 */
export function inferColorProperty(_componentName: string, _properties: Record<string, unknown>): string {
  // All colors are 'col' - no bg property exists
  return 'col'
}
