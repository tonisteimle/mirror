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
  if (name.endsWith('-bg')) return 'bg'
  if (name.endsWith('-boc')) return 'boc'
  if (name.endsWith('-bor')) return 'bor'

  // size/weight: Both short and long variants allowed
  if (name.endsWith('-siz') || name.endsWith('-size')) return 'size'
  if (name.endsWith('-wei') || name.endsWith('-weight')) return 'weight'

  return null
}

/**
 * Text components - shorthand colors become 'col' (text color)
 * Also includes Icon since icon color is text-like (fills the glyph)
 */
const TEXT_COMPONENTS = new Set([
  'Text', 'Label', 'Title', 'Heading', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Paragraph', 'P', 'Span', 'Link', 'A', 'Value', 'Description', 'Caption',
  'Subtitle', 'Hint', 'Error', 'Message',
  'Icon' // Icon color fills the glyph, like text
])

/**
 * Infer default color property from component type.
 * - Text components: 'col' (text color)
 * - Container components: 'bg' (background color)
 */
export function inferColorProperty(componentName: string, _properties: Record<string, unknown>): string {
  // Text components use col for text color
  if (TEXT_COMPONENTS.has(componentName)) {
    return 'col'
  }
  // All other components (containers) use bg for background color
  return 'bg'
}
