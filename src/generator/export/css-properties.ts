/**
 * CSS Properties Converter
 *
 * Converts DSL properties to CSS property-value pairs.
 * Each converter function handles a single concern.
 */

import type { DSLProperties } from '../../parser/types'
import { formatCssValue } from './utils/format-css-value'

/**
 * Property aliases: maps short forms to long forms.
 * Used to support both `pad` and `padding`, `bg` and `background`, etc.
 */
const PROPERTY_ALIASES: Record<string, string[]> = {
  // Spacing
  pad: ['pad', 'padding'],
  mar: ['mar', 'margin'],
  // Colors
  bg: ['bg', 'background'],
  col: ['col', 'color', 'c'],
  boc: ['boc', 'border-color'],
  // Border
  rad: ['rad', 'radius'],
  bor: ['bor', 'border'],
  // Layout
  hor: ['hor', 'horizontal'],
  ver: ['ver', 'vertical'],
  // Sizing
  w: ['w', 'width'],
  h: ['h', 'height'],
  // Visuals
  o: ['o', 'opa', 'op', 'opacity'],
  g: ['g', 'gap'],
}

/**
 * Get a property value, checking both short and long forms.
 */
function getProp<T>(props: DSLProperties, shortForm: string): T | undefined {
  const aliases = PROPERTY_ALIASES[shortForm] || [shortForm]
  for (const alias of aliases) {
    const value = (props as Record<string, unknown>)[alias]
    if (value !== undefined) {
      return value as T
    }
  }
  return undefined
}

/**
 * A single CSS declaration
 */
export interface CssDeclaration {
  property: string
  value: string
}

/**
 * Convert a hex color with alpha to rgba
 */
function hexToRgba(hex: string): string {
  if (hex.length !== 9 || !hex.startsWith('#')) {
    return hex
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const a = parseInt(hex.slice(7, 9), 16) / 255

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}

/**
 * Convert layout properties (hor, ver, gap, between, wrap, grow, grid)
 */
function convertLayout(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // Check for grid layout first
  if (props.grid !== undefined) {
    declarations.push({ property: 'display', value: 'grid' })
    if (typeof props.grid === 'number') {
      declarations.push({
        property: 'grid-template-columns',
        value: `repeat(${props.grid}, 1fr)`,
      })
    } else if (typeof props.grid === 'string') {
      // e.g., "auto 250" for auto-fill with min 250px
      const parts = props.grid.split(' ')
      if (parts[0] === 'auto' && parts[1]) {
        declarations.push({
          property: 'grid-template-columns',
          value: `repeat(auto-fill, minmax(${parts[1]}px, 1fr))`,
        })
      }
    }
    return declarations
  }

  // Default: flex layout
  declarations.push({ property: 'display', value: 'flex' })

  if (getProp<boolean>(props, 'hor')) {
    declarations.push({ property: 'flex-direction', value: 'row' })
  } else {
    // Default to column
    declarations.push({ property: 'flex-direction', value: 'column' })
  }

  // Check both short form (g) and long form (gap) for gap property
  const gapValue = getProp<number>(props, 'g')
  if (typeof gapValue === 'number') {
    declarations.push({ property: 'gap', value: formatCssValue(gapValue) })
  }

  if (props.between) {
    declarations.push({ property: 'justify-content', value: 'space-between' })
  }

  if (props.wrap) {
    declarations.push({ property: 'flex-wrap', value: 'wrap' })
  }

  if (props.grow) {
    declarations.push({ property: 'flex-grow', value: '1' })
  }

  if (typeof props.shrink === 'number') {
    declarations.push({ property: 'flex-shrink', value: String(props.shrink) })
  }

  return declarations
}

/**
 * Convert alignment value to CSS
 */
function alignmentToCss(value: string): string {
  switch (value) {
    case 'cen':
    case 'center':
      return 'center'
    case 'start':
    case 'l':
    case 'u':
      return 'flex-start'
    case 'end':
    case 'r':
    case 'd':
      return 'flex-end'
    default:
      return value
  }
}

/**
 * Convert alignment properties (cen, hor-l, hor-cen, hor-r, ver-t, ver-cen, ver-b)
 * Note: Parser converts cen to align_main/align_cross = 'cen'
 *
 * For default column layout:
 * - left/right affect cross axis (align-items)
 * - top/bottom affect main axis (justify-content)
 */
function convertAlignment(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  const isHorizontal = props.hor === true

  // Handle align_main and align_cross (set by parser)
  // The parser sets align_main for left/right and align_cross for top/bottom,
  // but semantically left/right should be cross-axis for vertical layouts.
  // We need to swap based on the actual alignment value.
  if (props.align_main) {
    const value = props.align_main as string
    // For left/right values, they should affect cross axis (align-items) in column layout
    if (value === 'l' || value === 'r') {
      declarations.push({
        property: isHorizontal ? 'justify-content' : 'align-items',
        value: alignmentToCss(value),
      })
    } else {
      declarations.push({
        property: 'justify-content',
        value: alignmentToCss(value),
      })
    }
  }
  if (props.align_cross) {
    const value = props.align_cross as string
    // For top/bottom values, they should affect main axis (justify-content) in column layout
    if (value === 'u' || value === 'd') {
      declarations.push({
        property: isHorizontal ? 'align-items' : 'justify-content',
        value: alignmentToCss(value),
      })
    } else {
      declarations.push({
        property: 'align-items',
        value: alignmentToCss(value),
      })
    }
  }

  // Horizontal alignment
  if (props['hor-l']) {
    declarations.push({
      property: isHorizontal ? 'justify-content' : 'align-items',
      value: 'flex-start',
    })
  }
  if (props['hor-cen']) {
    declarations.push({
      property: isHorizontal ? 'justify-content' : 'align-items',
      value: 'center',
    })
  }
  if (props['hor-r']) {
    declarations.push({
      property: isHorizontal ? 'justify-content' : 'align-items',
      value: 'flex-end',
    })
  }

  // Vertical alignment
  if (props['ver-t']) {
    declarations.push({
      property: isHorizontal ? 'align-items' : 'justify-content',
      value: 'flex-start',
    })
  }
  if (props['ver-cen']) {
    declarations.push({
      property: isHorizontal ? 'align-items' : 'justify-content',
      value: 'center',
    })
  }
  if (props['ver-b']) {
    declarations.push({
      property: isHorizontal ? 'align-items' : 'justify-content',
      value: 'flex-end',
    })
  }

  return declarations
}

/**
 * Convert sizing keyword to CSS value
 * Parser outputs: "max" for full, "min" for hug
 */
function sizingKeywordToCss(value: string | number): string {
  if (typeof value === 'number') {
    return formatCssValue(value)
  }
  switch (value) {
    case 'full':
    case 'max':
      return '100%'
    case 'hug':
    case 'min':
      return 'fit-content'
    default:
      return formatCssValue(value)
  }
}

/**
 * Convert dimension properties (w, h, minw, maxw, minh, maxh, full)
 */
function convertDimensions(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (props.full) {
    declarations.push({ property: 'width', value: '100%' })
    declarations.push({ property: 'height', value: '100%' })
    return declarations
  }

  // Check both short (w) and long (width) forms
  const wValue = getProp<number | string>(props, 'w')
  if (wValue !== undefined) {
    const value = sizingKeywordToCss(wValue)
    declarations.push({ property: 'width', value })
    // Add flex-grow for "full" sizing
    if (wValue === 'full' || wValue === 'max') {
      declarations.push({ property: 'flex-grow', value: '1' })
    }
  }

  // Check both short (h) and long (height) forms
  const hValue = getProp<number | string>(props, 'h')
  if (hValue !== undefined) {
    const value = sizingKeywordToCss(hValue)
    declarations.push({ property: 'height', value })
    // Add flex-grow for "full" sizing
    if (hValue === 'full' || hValue === 'max') {
      declarations.push({ property: 'flex-grow', value: '1' })
    }
  }

  if (props.minw !== undefined) {
    declarations.push({ property: 'min-width', value: formatCssValue(props.minw) })
  }
  if (props.maxw !== undefined) {
    declarations.push({ property: 'max-width', value: formatCssValue(props.maxw) })
  }
  if (props.minh !== undefined) {
    declarations.push({ property: 'min-height', value: formatCssValue(props.minh) })
  }
  if (props.maxh !== undefined) {
    declarations.push({ property: 'max-height', value: formatCssValue(props.maxh) })
  }

  return declarations
}

/**
 * Convert padding properties
 */
function convertPadding(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  const padValue = getProp<number>(props, 'pad')
  if (typeof padValue === 'number') {
    declarations.push({ property: 'padding', value: formatCssValue(padValue) })
  }

  if (typeof props.pad_l === 'number') {
    declarations.push({ property: 'padding-left', value: formatCssValue(props.pad_l) })
  }
  if (typeof props.pad_r === 'number') {
    declarations.push({ property: 'padding-right', value: formatCssValue(props.pad_r) })
  }
  if (typeof props.pad_u === 'number') {
    declarations.push({ property: 'padding-top', value: formatCssValue(props.pad_u) })
  }
  if (typeof props.pad_d === 'number') {
    declarations.push({ property: 'padding-bottom', value: formatCssValue(props.pad_d) })
  }

  return declarations
}

/**
 * Convert margin properties
 */
function convertMargin(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // centered: horizontal centering via auto margins
  if (props.centered) {
    declarations.push({ property: 'margin-left', value: 'auto' })
    declarations.push({ property: 'margin-right', value: 'auto' })
  }

  const marValue = getProp<number>(props, 'mar')
  if (typeof marValue === 'number') {
    declarations.push({ property: 'margin', value: formatCssValue(marValue) })
  }

  if (typeof props.mar_l === 'number') {
    declarations.push({ property: 'margin-left', value: formatCssValue(props.mar_l) })
  }
  if (typeof props.mar_r === 'number') {
    declarations.push({ property: 'margin-right', value: formatCssValue(props.mar_r) })
  }
  if (typeof props.mar_u === 'number') {
    declarations.push({ property: 'margin-top', value: formatCssValue(props.mar_u) })
  }
  if (typeof props.mar_d === 'number') {
    declarations.push({ property: 'margin-bottom', value: formatCssValue(props.mar_d) })
  }

  return declarations
}

/**
 * Convert color properties (col, bg, boc)
 */
function convertColors(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  const colValue = getProp<string>(props, 'col')
  if (typeof colValue === 'string') {
    declarations.push({ property: 'color', value: colValue })
  }

  const bgValue = getProp<string>(props, 'bg')
  if (typeof bgValue === 'string') {
    const value = bgValue.length === 9 ? hexToRgba(bgValue) : bgValue
    declarations.push({ property: 'background', value })
  }

  const bocValue = getProp<string>(props, 'boc')
  if (typeof bocValue === 'string') {
    declarations.push({ property: 'border-color', value: bocValue })
  }

  return declarations
}

/**
 * Convert border properties (bor, rad)
 */
function convertBorder(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // Border width - check both short (bor) and long (border) forms
  const borValue = getProp<number>(props, 'bor')
  // Check both boc (short) and bor_color (from parser)
  const bocValue = getProp<string>(props, 'boc') || (props.bor_color as string | undefined)
  if (typeof borValue === 'number') {
    const color = typeof bocValue === 'string' ? ` ${bocValue}` : ''
    declarations.push({ property: 'border', value: `${borValue}px solid${color}` })
  }

  // Directional borders - check for direction-specific colors
  if (typeof props.bor_l === 'number') {
    const color = (props.bor_l_color as string) || bocValue
    const colorStr = typeof color === 'string' ? ` ${color}` : ''
    declarations.push({ property: 'border-left', value: `${props.bor_l}px solid${colorStr}` })
  }
  if (typeof props.bor_r === 'number') {
    const color = (props.bor_r_color as string) || bocValue
    const colorStr = typeof color === 'string' ? ` ${color}` : ''
    declarations.push({ property: 'border-right', value: `${props.bor_r}px solid${colorStr}` })
  }
  if (typeof props.bor_u === 'number') {
    const color = (props.bor_u_color as string) || bocValue
    const colorStr = typeof color === 'string' ? ` ${color}` : ''
    declarations.push({ property: 'border-top', value: `${props.bor_u}px solid${colorStr}` })
  }
  if (typeof props.bor_d === 'number') {
    const color = (props.bor_d_color as string) || bocValue
    const colorStr = typeof color === 'string' ? ` ${color}` : ''
    declarations.push({ property: 'border-bottom', value: `${props.bor_d}px solid${colorStr}` })
  }

  // Border radius - check both short (rad) and long (radius) forms
  const radValue = getProp<number>(props, 'rad')
  if (typeof radValue === 'number') {
    declarations.push({ property: 'border-radius', value: formatCssValue(radValue) })
  }

  // Directional border radius
  if (typeof props.rad_tl === 'number') {
    declarations.push({ property: 'border-top-left-radius', value: formatCssValue(props.rad_tl) })
  }
  if (typeof props.rad_tr === 'number') {
    declarations.push({ property: 'border-top-right-radius', value: formatCssValue(props.rad_tr) })
  }
  if (typeof props.rad_bl === 'number') {
    declarations.push({ property: 'border-bottom-left-radius', value: formatCssValue(props.rad_bl) })
  }
  if (typeof props.rad_br === 'number') {
    declarations.push({ property: 'border-bottom-right-radius', value: formatCssValue(props.rad_br) })
  }

  return declarations
}

/**
 * Convert typography properties (size, weight, line, font, align, etc.)
 */
function convertTypography(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // font-size: check multiple property names (font-size, text-size, fs, size, icon-size)
  const fontSize =
    props['font-size'] ?? props['text-size'] ?? props['icon-size'] ?? props.fs ?? props.size
  if (typeof fontSize === 'number') {
    declarations.push({ property: 'font-size', value: formatCssValue(fontSize) })
  }

  if (typeof props.weight === 'number' || typeof props.weight === 'string') {
    declarations.push({ property: 'font-weight', value: String(props.weight) })
  }

  if (typeof props.line === 'number') {
    declarations.push({ property: 'line-height', value: formatCssValue(props.line, 'none') })
  }

  if (typeof props.font === 'string') {
    declarations.push({ property: 'font-family', value: `'${props.font}'` })
  }

  if (props.align) {
    declarations.push({ property: 'text-align', value: props.align })
  }

  if (props.uppercase) {
    declarations.push({ property: 'text-transform', value: 'uppercase' })
  }

  if (props.truncate) {
    declarations.push({ property: 'overflow', value: 'hidden' })
    declarations.push({ property: 'text-overflow', value: 'ellipsis' })
    declarations.push({ property: 'white-space', value: 'nowrap' })
  }

  if (props.italic) {
    declarations.push({ property: 'font-style', value: 'italic' })
  }

  if (props.underline) {
    declarations.push({ property: 'text-decoration', value: 'underline' })
  }

  return declarations
}

/**
 * Convert visual properties (opacity, shadow, cursor, z, hidden, rotate)
 */
function convertVisuals(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // Check both short forms (o, opa, op) and long form (opacity) via getProp
  const opacityValue = getProp<number>(props, 'o')
  if (typeof opacityValue === 'number') {
    declarations.push({ property: 'opacity', value: String(opacityValue) })
  }

  if (props.shadow) {
    const shadows: Record<string, string> = {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    }
    const value = shadows[props.shadow as string] || props.shadow
    declarations.push({ property: 'box-shadow', value: value as string })
  }

  if (props.cursor) {
    declarations.push({ property: 'cursor', value: props.cursor as string })
  }

  if (typeof props.z === 'number') {
    declarations.push({ property: 'z-index', value: String(props.z) })
  }

  // Hidden - override display
  if (props.hidden === true) {
    declarations.push({ property: 'display', value: 'none' })
  }

  // Disabled state
  if (props.disabled === true) {
    declarations.push({ property: 'opacity', value: '0.5' })
    declarations.push({ property: 'pointer-events', value: 'none' })
  }

  // Rotation (rot property)
  if (typeof props.rot === 'number') {
    declarations.push({ property: 'transform', value: `rotate(${props.rot}deg)` })
  }

  // Translate
  if (props.translate) {
    const [x, y] = Array.isArray(props.translate) ? props.translate : [props.translate, 0]
    declarations.push({ property: 'transform', value: `translate(${x}px, ${y}px)` })
  }

  return declarations
}

/**
 * Convert image-specific properties (fit)
 */
function convertImage(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (props.fit) {
    declarations.push({ property: 'object-fit', value: props.fit })
  }

  return declarations
}

/**
 * Convert overflow/scroll properties
 */
function convertOverflow(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (props.scroll === true) {
    declarations.push({ property: 'overflow-y', value: 'auto' })
  }
  if (props['scroll-hor'] === true) {
    declarations.push({ property: 'overflow-x', value: 'auto' })
  }
  if (props['scroll-ver'] === true) {
    declarations.push({ property: 'overflow-y', value: 'auto' })
  }
  if (props['scroll-both'] === true) {
    declarations.push({ property: 'overflow', value: 'auto' })
  }
  if (props.clip === true) {
    declarations.push({ property: 'overflow', value: 'hidden' })
  }

  return declarations
}

/**
 * Convert hover properties to separate hover declarations
 */
export function convertHoverProperties(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (props['hover-bg']) {
    declarations.push({ property: 'background', value: props['hover-bg'] as string })
  }

  if (props['hover-col']) {
    declarations.push({ property: 'color', value: props['hover-col'] as string })
  }

  if (props['hover-boc']) {
    declarations.push({ property: 'border-color', value: props['hover-boc'] as string })
  }

  if (typeof props['hover-bor'] === 'number') {
    declarations.push({ property: 'border-width', value: formatCssValue(props['hover-bor']) })
  }

  return declarations
}

/**
 * Check if node has hover properties
 */
export function hasHoverProperties(props: DSLProperties): boolean {
  return !!(
    props['hover-bg'] ||
    props['hover-col'] ||
    props['hover-boc'] ||
    props['hover-bor']
  )
}

/**
 * Convert all DSL properties to CSS declarations
 */
export function convertProperties(props: DSLProperties): CssDeclaration[] {
  return [
    ...convertLayout(props),
    ...convertAlignment(props),
    ...convertDimensions(props),
    ...convertPadding(props),
    ...convertMargin(props),
    ...convertColors(props),
    ...convertBorder(props),
    ...convertTypography(props),
    ...convertVisuals(props),
    ...convertImage(props),
    ...convertOverflow(props),
  ]
}

/**
 * Format CSS declarations as a style block
 */
export function formatCssBlock(selector: string, declarations: CssDeclaration[]): string {
  if (declarations.length === 0) return ''

  const props = declarations.map((d) => `${d.property}: ${d.value};`).join(' ')
  return `${selector} { ${props} }`
}
