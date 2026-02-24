/**
 * @module property-inference
 * @description Property Inference - Leitet Properties aus Token-Namen ab
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Inferiert Property-Namen aus Token-Suffixen und Component-Typen
 *
 * Ermöglicht syntaktischen Zucker wo Property-Namen weggelassen werden:
 *   $primary-col          → col (text color)
 *   $card-bg              → bg (background)
 *   $default-pad          → pad (padding)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-SUFFIX-MAPPING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @mapping Spacing
 *   -pad, -padding, -spacing → pad (padding)
 *   -mar, -margin            → mar (margin)
 *   -gap                     → gap
 *
 * @mapping Colors
 *   -col                     → col (text color, short form only)
 *   -bg, -background, -color → bg (background color)
 *   -boc, -border-color      → boc (border color)
 *
 * @mapping Sizing
 *   -rad, -radius            → rad (border radius)
 *   -bor, -border            → bor (border width)
 *   -siz, -size              → size (font size)
 *   -wei, -weight            → weight (font weight)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * COLOR INFERENCE BY COMPONENT TYPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @rule Text Components
 *   Text, Label, Title, Heading, H1-H6, Paragraph, P, Span, Link, A,
 *   Value, Description, Caption, Subtitle, Hint, Error, Message, Icon
 *   → Shorthand-Farbe wird zu 'col' (text color)
 *
 * @rule Container Components
 *   Alle anderen (Box, Card, Panel, etc.)
 *   → Shorthand-Farbe wird zu 'bg' (background)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function isColorValue(value) → boolean
 *   Prüft ob String ein Farbwert ist (hex, rgb, hsl)
 *
 * @function inferPropertyFromTokenName(tokenName) → string | null
 *   Inferiert Property aus Token-Suffix
 *
 * @function inferColorProperty(componentName, properties) → string
 *   Inferiert Farb-Property basierend auf Component-Typ
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIELE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Token-Suffix Inference
 *   $primary-col      → inferPropertyFromTokenName → 'col'
 *   $card-background  → inferPropertyFromTokenName → 'bg'
 *   $default-pad      → inferPropertyFromTokenName → 'pad'
 *
 * @example Component-based Color Inference
 *   Text #3B82F6      → inferColorProperty('Text', {}) → 'col'
 *   Card #3B82F6      → inferColorProperty('Card', {}) → 'bg'
 *   Icon #FFF         → inferColorProperty('Icon', {}) → 'col'
 *
 * @used-by sugar/token-handler.ts für implizite Property-Zuweisung
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
 * Supports both short (3-char) and long-form suffixes.
 */
export function inferPropertyFromTokenName(tokenName: string): string | null {
  const name = tokenName.toLowerCase()

  // Padding: -pad, -padding, -spacing
  if (name.endsWith('-pad') || name.endsWith('-padding') || name.endsWith('-spacing')) return 'pad'

  // Margin: -mar, -margin
  if (name.endsWith('-mar') || name.endsWith('-margin')) return 'mar'

  // Border radius: -rad, -radius
  if (name.endsWith('-rad') || name.endsWith('-radius')) return 'rad'

  // Gap: -gap → g (short form)
  if (name.endsWith('-gap')) return 'g'

  // Border color: -boc, -border-color (MUST be before -color check)
  if (name.endsWith('-boc') || name.endsWith('-border-color')) return 'boc'

  // Text color: -col (short form only)
  if (name.endsWith('-col')) return 'col'

  // Background: -bg, -background, -color (long form -color maps to background)
  if (name.endsWith('-bg') || name.endsWith('-background') || name.endsWith('-color')) return 'bg'

  // Border: -bor, -border (but not -border-color which is handled above)
  if ((name.endsWith('-bor') || name.endsWith('-border')) && !name.endsWith('-border-color')) return 'bor'

  // Font size: -siz, -size → text-size (normalized form)
  if (name.endsWith('-siz') || name.endsWith('-size')) return 'text-size'

  // Font weight: -wei, -weight
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
