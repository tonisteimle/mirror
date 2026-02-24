/**
 * @generated
 * @description Property validation schema - DO NOT EDIT
 *
 * Generated from src/dsl/properties.ts by scripts/generate-validation-schemas.ts
 * Regenerate with: npx ts-node scripts/generate-validation-schemas.ts
 */

// ============================================
// Property Sets
// ============================================

/** All valid property names (both short and long forms) */
export const VALID_PROPERTIES = new Set([
    'align',
    'alt',
    'background',
    'between',
    'bg',
    'boc',
    'bor',
    'border',
    'border-color',
    'bottom',
    'c',
    'cen',
    'center',
    'centered',
    'clip',
    'col',
    'color',
    'cursor',
    'data',
    'disabled',
    'fill',
    'fit',
    'font',
    'fs',
    'full',
    'g',
    'gap',
    'gap-col',
    'gap-row',
    'gap-x',
    'gap-y',
    'grid',
    'grow',
    'h',
    'h-max',
    'h-min',
    'height',
    'hidden',
    'hor',
    'hor-cen',
    'hor-center',
    'hor-l',
    'hor-r',
    'horizontal',
    'horizontal-center',
    'horizontal-left',
    'horizontal-right',
    'hover-background',
    'hover-bg',
    'hover-boc',
    'hover-bor',
    'hover-border',
    'hover-border-color',
    'hover-col',
    'hover-color',
    'hover-opa',
    'hover-opacity',
    'hover-rad',
    'hover-radius',
    'hover-scale',
    'href',
    'hug',
    'ic',
    'icon-color',
    'icon-size',
    'icon-weight',
    'is',
    'italic',
    'iw',
    'left',
    'length',
    'line',
    'lowercase',
    'm',
    'mar',
    'margin',
    'mask',
    'material',
    'max',
    'max-height',
    'max-width',
    'maxh',
    'maxw',
    'min',
    'min-height',
    'min-width',
    'minh',
    'minw',
    'o',
    'op',
    'opa',
    'opacity',
    'p',
    'pad',
    'padding',
    'pattern',
    'placeholder',
    'pointer',
    'rad',
    'radius',
    'right',
    'rot',
    'rotate',
    'rows',
    'scroll',
    'scroll-both',
    'scroll-hor',
    'scroll-horizontal',
    'scroll-ver',
    'scroll-vertical',
    'segments',
    'shadow',
    'shortcut',
    'shrink',
    'size',
    'snap',
    'spread',
    'src',
    'stacked',
    'step',
    'target',
    'text-align',
    'text-size',
    'top',
    'translate',
    'truncate',
    'ts',
    'type',
    'underline',
    'uppercase',
    'value',
    'ver',
    'ver-b',
    'ver-cen',
    'ver-center',
    'ver-t',
    'vert',
    'vertical',
    'vertical-bottom',
    'vertical-center',
    'vertical-top',
    'visible',
    'w',
    'w-max',
    'w-min',
    'weight',
    'width',
    'wrap',
    'z'
  ])

/** Properties that take boolean values (true when present) */
export const BOOLEAN_PROPERTIES = new Set([
    'between',
    'bottom',
    'cen',
    'center',
    'centered',
    'fill',
    'full',
    'grow',
    'h-max',
    'h-min',
    'hidden',
    'hor',
    'hor-cen',
    'hor-center',
    'hor-l',
    'hor-r',
    'horizontal',
    'horizontal-center',
    'horizontal-left',
    'horizontal-right',
    'hug',
    'italic',
    'left',
    'lowercase',
    'mask',
    'material',
    'max',
    'min',
    'right',
    'spread',
    'stacked',
    'top',
    'truncate',
    'underline',
    'uppercase',
    'ver',
    'ver-b',
    'ver-cen',
    'ver-center',
    'ver-t',
    'vert',
    'vertical',
    'vertical-bottom',
    'vertical-center',
    'vertical-top',
    'visible',
    'w-max',
    'w-min',
    'wrap'
  ])

/** Properties that take color values */
export const COLOR_PROPERTIES = new Set([
    'background',
    'bg',
    'boc',
    'border-color',
    'c',
    'col',
    'color',
    'hover-background',
    'hover-bg',
    'hover-boc',
    'hover-border-color',
    'hover-col',
    'hover-color',
    'ic',
    'icon-color'
  ])

/** Properties that take numeric values */
export const NUMBER_PROPERTIES = new Set([
    'bor',
    'border',
    'g',
    'gap',
    'gap-col',
    'gap-row',
    'h',
    'height',
    'hover-bor',
    'hover-border',
    'hover-opa',
    'hover-opacity',
    'hover-rad',
    'hover-radius',
    'hover-scale',
    'icon-weight',
    'iw',
    'length',
    'line',
    'm',
    'mar',
    'margin',
    'max',
    'max-height',
    'max-width',
    'maxh',
    'maxw',
    'min',
    'min-height',
    'min-width',
    'minh',
    'minw',
    'o',
    'op',
    'opa',
    'opacity',
    'p',
    'pad',
    'padding',
    'rad',
    'radius',
    'rot',
    'rotate',
    'rows',
    'segments',
    'shrink',
    'size',
    'step',
    'value',
    'w',
    'weight',
    'width',
    'z'
  ])

/** Properties that take string values */
export const STRING_PROPERTIES = new Set([
    'align',
    'alt',
    'cursor',
    'fit',
    'font',
    'href',
    'pattern',
    'placeholder',
    'pointer',
    'shadow',
    'shortcut',
    'src',
    'target',
    'text-align',
    'type'
  ])

/** Properties that can take direction modifiers */
export const DIRECTIONAL_PROPERTIES = new Set([
    'bor',
    'border',
    'm',
    'mar',
    'margin',
    'p',
    'pad',
    'padding'
  ])

// ============================================
// Direction Sets
// ============================================

/** Valid direction modifiers (l, r, u, d, t, b) */
export const VALID_DIRECTIONS = new Set([
    'b',
    'd',
    'l',
    'r',
    't',
    'u'
  ])

/** Valid corner directions for radius (tl, tr, bl, br, etc.) */
export const CORNER_DIRECTIONS = new Set([
    'bl',
    'bottom-left',
    'bottom-right',
    'br',
    'tl',
    'top-left',
    'top-right',
    'tr'
  ])

// ============================================
// Border Styles
// ============================================

/** Valid border styles (solid, dashed, dotted) */
export const BORDER_STYLES = new Set([
    'dashed',
    'dotted',
    'solid'
  ])

// ============================================
// Property Keyword Values
// ============================================

/** Valid keyword values for properties (shadow sizes, cursor values, etc.) */
export const PROPERTY_KEYWORD_VALUES = new Set([
    '2xl',
    '3xl',
    '_blank',
    '_parent',
    '_self',
    '_top',
    'alpha',
    'alphanumeric',
    'center',
    'contain',
    'cover',
    'crosshair',
    'date',
    'datetime-local',
    'default',
    'digits',
    'email',
    'fill',
    'grab',
    'grabbing',
    'justify',
    'left',
    'lg',
    'md',
    'move',
    'none',
    'not-allowed',
    'number',
    'password',
    'pointer',
    'right',
    'scale-down',
    'search',
    'sm',
    'tel',
    'text',
    'time',
    'url',
    'wait',
    'xl',
    'xs'
  ])

// ============================================
// Value Constraints
// ============================================

export const VALUE_CONSTRAINTS = {
  opacity: { min: 0, max: 1 },
  shadow: new Set(['sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl', 'none']),
  cursor: new Set(['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'wait', 'crosshair']),
  fit: new Set(['cover', 'contain', 'fill', 'none', 'scale-down']),
  pattern: new Set(['digits', 'alpha', 'alphanumeric']),
  align: new Set(['left', 'center', 'right', 'justify']),
  inputType: new Set(['email', 'password', 'text', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local']),
  linkTarget: new Set(['_blank', '_self', '_parent', '_top']),
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a property name is valid
 */
export function isValidProperty(name: string): boolean {
  return VALID_PROPERTIES.has(name)
}

/**
 * Get the property type (boolean, color, number, string)
 */
export function getPropertyType(name: string): 'boolean' | 'color' | 'number' | 'string' | null {
  if (BOOLEAN_PROPERTIES.has(name)) return 'boolean'
  if (COLOR_PROPERTIES.has(name)) return 'color'
  if (NUMBER_PROPERTIES.has(name)) return 'number'
  if (STRING_PROPERTIES.has(name)) return 'string'
  return null
}

/**
 * Check if a property can take direction modifiers
 */
export function isDirectionalProperty(name: string): boolean {
  return DIRECTIONAL_PROPERTIES.has(name)
}

/**
 * Check if a direction is valid
 */
export function isValidDirection(dir: string): boolean {
  return VALID_DIRECTIONS.has(dir)
}

/**
 * Check if a corner direction is valid
 */
export function isValidCornerDirection(dir: string): boolean {
  return CORNER_DIRECTIONS.has(dir)
}

/**
 * Validate opacity value (0-1)
 */
export function isValidOpacity(value: number): boolean {
  return value >= VALUE_CONSTRAINTS.opacity.min && value <= VALUE_CONSTRAINTS.opacity.max
}
