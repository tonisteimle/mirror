/**
 * Primitive Arbitraries for Mirror DSL
 *
 * Basic random value generators for colors, numbers, strings, tokens, etc.
 * These are the building blocks for more complex component arbitraries.
 */

import * as fc from 'fast-check'

// =============================================================================
// Basic Value Generators
// =============================================================================

/** Random hex digit (0-9, A-F) */
const hexDigit = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f'
)

/** Random 6-digit hex color: #RRGGBB */
export const hexColor = fc.array(hexDigit, { minLength: 6, maxLength: 6 })
  .map(chars => `#${chars.join('')}`)

/** Random 3-digit hex color: #RGB */
export const shortHexColor = fc.array(hexDigit, { minLength: 3, maxLength: 3 })
  .map(chars => `#${chars.join('')}`)

/** Random 8-digit hex color with alpha: #RRGGBBAA */
export const hexColorWithAlpha = fc.array(hexDigit, { minLength: 8, maxLength: 8 })
  .map(chars => `#${chars.join('')}`)

/** Any valid hex color format */
export const anyHexColor = fc.oneof(hexColor, shortHexColor, hexColorWithAlpha)

/** Random pixel value (reasonable range 0-9999) */
export const pixelValue = fc.integer({ min: 0, max: 9999 })

/** Random small pixel value (0-100, common for padding/margin/gap) */
export const smallPixelValue = fc.integer({ min: 0, max: 100 })

/** Random percentage value (0-100%) */
export const percentValue = fc.integer({ min: 0, max: 100 }).map(n => `${n}%`)

/** Random opacity value (0-1 with decimals) */
export const opacityValue = fc.double({ min: 0, max: 1, noNaN: true })
  .map(n => Math.round(n * 100) / 100) // Round to 2 decimal places

/** Random z-index value */
export const zIndexValue = fc.integer({ min: -100, max: 1000 })

/** Random rotation degrees */
export const rotationValue = fc.integer({ min: -360, max: 360 })

/** Random line-height value */
export const lineHeightValue = fc.oneof(
  fc.double({ min: 0.8, max: 3, noNaN: true }).map(n => Math.round(n * 10) / 10),
  fc.integer({ min: 12, max: 48 }) // Pixel values
)

// =============================================================================
// Spacing Values
// =============================================================================

/** Random spacing value (number or keyword) */
export const spacingValue = fc.oneof(
  smallPixelValue,
  fc.constantFrom('auto')
)

/** Random dimension keyword */
export const dimensionKeyword = fc.constantFrom('hug', 'full', 'auto', 'min', 'max')

/** Random width/height value */
export const dimensionValue = fc.oneof(
  pixelValue,
  percentValue,
  dimensionKeyword
)

// =============================================================================
// String Generators
// =============================================================================

/** Safe character set (no special chars that might break parsing) */
const safeChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')
)

/** Random safe string content (1-30 chars) */
export const stringContent = fc.array(safeChar, { minLength: 1, maxLength: 30 })
  .map(chars => chars.join(''))

/** Random short label (1-15 chars, for buttons, etc.) */
export const shortLabel = fc.array(safeChar, { minLength: 1, maxLength: 15 })
  .map(chars => chars.join('').trim() || 'Label')

/** Random quoted string */
export const quotedString = stringContent.map(s => `"${s}"`)

// =============================================================================
// Token Generators
// =============================================================================

/** Lowercase letter for token names */
const lowerLetter = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split(''))

/** Random valid token name: $name */
export const tokenName = fc.array(lowerLetter, { minLength: 3, maxLength: 12 })
  .map(chars => `$${chars.join('')}`)

/** Random semantic token name with property binding: $name.property */
export const semanticTokenName = fc.record({
  base: fc.array(lowerLetter, { minLength: 3, maxLength: 8 }).map(c => c.join('')),
  property: fc.constantFrom('bg', 'col', 'pad', 'gap', 'rad', 'font.size')
}).map(({ base, property }) => `$${base}.${property}`)

/** Random token definition line */
export const tokenDefinition = fc.record({
  name: tokenName,
  value: fc.oneof(hexColor, pixelValue.map(String))
}).map(({ name, value }) => `${name}: ${value}`)

// =============================================================================
// Component Name Generators
// =============================================================================

/** Standard Mirror component names */
export const componentName = fc.constantFrom(
  'Box', 'Button', 'Text', 'Icon', 'Input', 'Image',
  'Container', 'Card', 'Header', 'Footer', 'Nav',
  'Row', 'Column', 'Grid', 'Stack', 'Flex',
  'Title', 'Label', 'Description', 'Badge', 'Tag',
  'Avatar', 'Thumbnail', 'Panel', 'Section', 'Wrapper',
  'Item', 'ListItem', 'MenuItem', 'NavItem', 'TabItem'
)

/** Custom component name (PascalCase) */
export const customComponentName = fc.array(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 1, maxLength: 1 }
).chain(first =>
  fc.array(lowerLetter, { minLength: 2, maxLength: 10 })
    .map(rest => first[0] + rest.join(''))
)

/** Any valid component name */
export const anyComponentName = fc.oneof(componentName, customComponentName)

// =============================================================================
// Property Name Generators
// =============================================================================

/** Layout property names */
export const layoutPropertyName = fc.constantFrom(
  'hor', 'horizontal', 'ver', 'vertical', 'cen', 'center',
  'gap', 'g', 'wrap', 'spread', 'stacked', 'grid'
)

/** Spacing property names */
export const spacingPropertyName = fc.constantFrom(
  'pad', 'padding', 'p', 'margin', 'mar', 'm'
)

/** Color property names */
export const colorPropertyName = fc.constantFrom(
  'bg', 'background', 'col', 'color', 'c', 'boc', 'border-color'
)

/** Sizing property names */
export const sizingPropertyName = fc.constantFrom(
  'w', 'width', 'h', 'height', 'minw', 'min-width', 'maxw', 'max-width',
  'minh', 'min-height', 'maxh', 'max-height'
)

/** Border property names */
export const borderPropertyName = fc.constantFrom(
  'bor', 'border', 'rad', 'radius'
)

/** Visual property names */
export const visualPropertyName = fc.constantFrom(
  'o', 'opacity', 'opa', 'shadow', 'z', 'cursor', 'hidden', 'visible'
)

/** Typography property names */
export const typographyPropertyName = fc.constantFrom(
  'fs', 'font-size', 'ts', 'text-size', 'weight', 'font', 'line',
  'align', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase'
)

/** Any property name */
export const anyPropertyName = fc.oneof(
  layoutPropertyName,
  spacingPropertyName,
  colorPropertyName,
  sizingPropertyName,
  borderPropertyName,
  visualPropertyName,
  typographyPropertyName
)

// =============================================================================
// Direction Generators
// =============================================================================

/** Single direction (short form) */
export const shortDirection = fc.constantFrom('l', 'r', 'u', 'd', 't', 'b')

/** Single direction (long form) */
export const longDirection = fc.constantFrom('left', 'right', 'top', 'bottom')

/** Direction combo */
export const directionCombo = fc.constantFrom(
  'l-r', 'u-d', 't-b', 'lr', 'ud', 'left-right', 'top-bottom'
)

/** Corner direction for radius */
export const cornerDirection = fc.constantFrom(
  'tl', 'tr', 'bl', 'br', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
  't', 'b', 'l', 'r' // Edge shortcuts
)

// =============================================================================
// Icon Generators
// =============================================================================

/** Lucide icon names */
export const lucideIconName = fc.constantFrom(
  'home', 'search', 'user', 'settings', 'mail', 'bell', 'heart', 'star',
  'plus', 'minus', 'check', 'x', 'menu', 'arrow-up', 'arrow-down',
  'arrow-left', 'arrow-right', 'chevron-up', 'chevron-down', 'edit', 'trash'
)

/** Material icon names */
export const materialIconName = fc.constantFrom(
  'home', 'search', 'person', 'settings', 'email', 'notifications', 'favorite',
  'star', 'add', 'remove', 'check', 'close', 'menu', 'keyboard_arrow_up',
  'keyboard_arrow_down', 'edit', 'delete'
)

/** Any icon name */
export const iconName = fc.oneof(lucideIconName, materialIconName)

// =============================================================================
// Shadow Generators
// =============================================================================

/** Shadow size keywords */
export const shadowSize = fc.constantFrom('sm', 'md', 'lg', 'xl', 'none')

// =============================================================================
// Border Style Generators
// =============================================================================

/** Border styles */
export const borderStyle = fc.constantFrom('solid', 'dashed', 'dotted')

// =============================================================================
// Re-export fast-check
// =============================================================================

export { fc }
