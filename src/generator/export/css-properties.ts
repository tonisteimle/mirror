/**
 * CSS Properties Converter
 *
 * Converts DSL properties to CSS property-value pairs.
 * Each converter function handles a single concern.
 */

import type { DSLProperties } from '../../parser/types'
import { formatCssValue } from './utils/format-css-value'

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
 * Convert layout properties (hor, ver, gap, between, wrap, grow)
 */
function convertLayout(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // Always add display: flex and default direction
  declarations.push({ property: 'display', value: 'flex' })

  if (props.hor) {
    declarations.push({ property: 'flex-direction', value: 'row' })
  } else {
    // Default to column
    declarations.push({ property: 'flex-direction', value: 'column' })
  }

  if (typeof props.gap === 'number') {
    declarations.push({ property: 'gap', value: formatCssValue(props.gap) })
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
      return 'center'
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    default:
      return value
  }
}

/**
 * Convert alignment properties (cen, hor-l, hor-cen, hor-r, ver-t, ver-cen, ver-b)
 * Note: Parser converts cen to align_main/align_cross = 'cen'
 */
function convertAlignment(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  const isHorizontal = props.hor === true

  // Handle align_main and align_cross (set by parser for cen)
  if (props.align_main) {
    declarations.push({
      property: 'justify-content',
      value: alignmentToCss(props.align_main as string),
    })
  }
  if (props.align_cross) {
    declarations.push({
      property: 'align-items',
      value: alignmentToCss(props.align_cross as string),
    })
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
 * Convert dimension properties (w, h, minw, maxw, minh, maxh, full)
 */
function convertDimensions(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (props.full) {
    declarations.push({ property: 'width', value: '100%' })
    declarations.push({ property: 'height', value: '100%' })
    return declarations
  }

  if (props.w !== undefined) {
    const value = props.w === 'full' ? '100%' : formatCssValue(props.w)
    declarations.push({ property: 'width', value })
  }

  if (props.h !== undefined) {
    const value = props.h === 'full' ? '100%' : formatCssValue(props.h)
    declarations.push({ property: 'height', value })
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

  if (typeof props.pad === 'number') {
    declarations.push({ property: 'padding', value: formatCssValue(props.pad) })
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

  if (typeof props.mar === 'number') {
    declarations.push({ property: 'margin', value: formatCssValue(props.mar) })
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

  if (typeof props.col === 'string') {
    declarations.push({ property: 'color', value: props.col })
  }

  if (typeof props.bg === 'string') {
    const value = props.bg.length === 9 ? hexToRgba(props.bg) : props.bg
    declarations.push({ property: 'background', value })
  }

  if (typeof props.boc === 'string') {
    declarations.push({ property: 'border-color', value: props.boc })
  }

  return declarations
}

/**
 * Convert border properties (bor, rad)
 */
function convertBorder(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  // Border width
  if (typeof props.bor === 'number') {
    const color = typeof props.boc === 'string' ? ` ${props.boc}` : ''
    declarations.push({ property: 'border', value: `${props.bor}px solid${color}` })
  }

  // Directional borders
  if (typeof props.bor_l === 'number') {
    const color = typeof props.boc === 'string' ? ` ${props.boc}` : ''
    declarations.push({ property: 'border-left', value: `${props.bor_l}px solid${color}` })
  }
  if (typeof props.bor_r === 'number') {
    const color = typeof props.boc === 'string' ? ` ${props.boc}` : ''
    declarations.push({ property: 'border-right', value: `${props.bor_r}px solid${color}` })
  }
  if (typeof props.bor_u === 'number') {
    const color = typeof props.boc === 'string' ? ` ${props.boc}` : ''
    declarations.push({ property: 'border-top', value: `${props.bor_u}px solid${color}` })
  }
  if (typeof props.bor_d === 'number') {
    const color = typeof props.boc === 'string' ? ` ${props.boc}` : ''
    declarations.push({ property: 'border-bottom', value: `${props.bor_d}px solid${color}` })
  }

  // Border radius
  if (typeof props.rad === 'number') {
    declarations.push({ property: 'border-radius', value: formatCssValue(props.rad) })
  }

  return declarations
}

/**
 * Convert typography properties (size, weight, line, font, align, etc.)
 */
function convertTypography(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (typeof props.size === 'number') {
    declarations.push({ property: 'font-size', value: formatCssValue(props.size) })
  }

  if (typeof props.weight === 'number') {
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

  return declarations
}

/**
 * Convert visual properties (opacity, shadow, cursor, z)
 */
function convertVisuals(props: DSLProperties): CssDeclaration[] {
  const declarations: CssDeclaration[] = []

  if (typeof props.opacity === 'number') {
    declarations.push({ property: 'opacity', value: String(props.opacity) })
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
