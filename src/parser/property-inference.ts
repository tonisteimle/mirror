/**
 * Property Inference Module
 *
 * Infers property names from token name suffixes and component types.
 * Used for syntactic sugar where property names are omitted.
 */

/**
 * Check if a string value is a color (hex, rgb, hsl, or named color).
 */
export function isColorValue(value: string): boolean {
  // Hex colors: #RGB, #RRGGBB, #RRGGBBAA
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true

  // rgb/rgba/hsl/hsla functions
  if (/^(rgb|hsl)a?\(/.test(value)) return true

  return false
}

/**
 * Infer property name from token name suffix.
 * e.g., $default-pad → 'pad', $card-rad → 'rad'
 * Uses 3-character suffixes consistent with keywords.
 */
export function inferPropertyFromTokenName(tokenName: string): string | null {
  const name = tokenName.toLowerCase()

  // 3-character suffixes (consistent with keywords)
  if (name.endsWith('-pad')) return 'pad'
  if (name.endsWith('-mar')) return 'mar'
  if (name.endsWith('-rad')) return 'rad'
  if (name.endsWith('-gap')) return 'gap'
  if (name.endsWith('-col')) return 'col'
  if (name.endsWith('-boc')) return 'boc'
  if (name.endsWith('-bor')) return 'bor'

  // size/weight: Both short and long variants allowed
  if (name.endsWith('-siz') || name.endsWith('-size')) return 'size'
  if (name.endsWith('-wei') || name.endsWith('-weight')) return 'weight'

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
