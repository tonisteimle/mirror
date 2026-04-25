/**
 * Property to CSS Transformer
 *
 * Converts Mirror DSL properties to CSS styles.
 * Extracted from ir/index.ts for better modularity.
 */

import type {
  Property,
  TokenReference,
  LoopVarReference,
  Conditional,
  ComputedExpression,
} from '../../parser/ast'
import type { IRStyle, SourcePosition } from '../types'
import type { ParentLayoutContext } from './transformer-context'
import {
  simplePropertyToCSS,
  PROPERTY_TO_CSS,
  BORDER_DIRECTION_MAP,
  hoverPropertyToCSS,
} from '../../schema/ir-helpers'
import {
  formatCSSValue,
  parseDirectionalSpacing,
  formatBorderValue,
  booleanPropertyToCSS,
} from './style-utils-transformer'

/** Property value type from AST - matches Property.values element type */
type PropertyValue =
  | string
  | number
  | boolean
  | TokenReference
  | LoopVarReference
  | Conditional
  | ComputedExpression

/**
 * Context interface for property transformation.
 * Provides callbacks to the IRTransformer instance.
 */
export interface PropertyTransformContext {
  /** Resolve property values to CSS string */
  resolveValue: (values: PropertyValue[], propertyName?: string) => string
  /** Validate property name and emit warnings */
  validateProperty: (propName: string, position?: SourcePosition) => boolean
}

/**
 * Transform context for accumulating transforms (rotate, scale, etc.)
 */
export interface TransformAccumulator {
  transforms: string[]
}

/**
 * Convert a Mirror property to CSS styles.
 *
 * @param prop The property to convert
 * @param ctx Context with resolveValue and validateProperty callbacks
 * @param primitive The primitive type (frame, text, icon, etc.)
 * @param transformContext Optional context for combining multiple transforms
 * @param parentLayoutContext Optional parent layout context for grid/flex awareness
 * @returns Array of CSS styles
 */
export function propertyToCSS(
  prop: Property,
  ctx: PropertyTransformContext,
  primitive: string = 'frame',
  transformContext?: TransformAccumulator,
  parentLayoutContext?: ParentLayoutContext
): IRStyle[] {
  const name = prop.name
  const value = ctx.resolveValue(prop.values, name)
  const values = prop.values

  // Validate property against schema
  ctx.validateProperty(name, {
    line: prop.line,
    column: prop.column,
    endLine: prop.line,
    endColumn: prop.column,
  })

  // Handle boolean properties (value is true OR empty values array)
  if ((prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0) {
    const styles = booleanPropertyToCSS(name)

    // If transformContext exists, extract transform values and add to context
    // This allows multiple transforms (rotate + scale etc.) to combine
    if (transformContext) {
      const nonTransformStyles: IRStyle[] = []
      for (const style of styles) {
        if (style.property === 'transform') {
          // Add to transform context for combining with other transforms
          transformContext.transforms.push(style.value)
        } else {
          nonTransformStyles.push(style)
        }
      }
      return nonTransformStyles
    }

    return styles
  }

  // Handle gradient syntax: bg grad #color1 #color2, col grad #color1 #color2
  // Supports: grad, grad-ver, grad N (angle), and multiple colors
  if (
    (name === 'background' ||
      name === 'bg' ||
      name === 'color' ||
      name === 'col' ||
      name === 'c') &&
    values.length >= 2 &&
    (String(values[0]) === 'grad' || String(values[0]).startsWith('grad-'))
  ) {
    const gradType = String(values[0])
    const isTextGradient = name === 'color' || name === 'col' || name === 'c'

    // Determine angle based on gradient type
    let angle = '90deg' // default: horizontal (left to right)
    let colorStartIndex = 1

    if (gradType === 'grad-ver') {
      angle = '180deg' // vertical (top to bottom)
    } else if (gradType === 'grad') {
      // Check if second value is an angle (number)
      const possibleAngle = String(values[1])
      if (/^\d+$/.test(possibleAngle)) {
        angle = `${possibleAngle}deg`
        colorStartIndex = 2
      }
    }

    // Collect colors (remaining values)
    const colors = values.slice(colorStartIndex).map(v => String(v))

    if (colors.length < 2) {
      // Not enough colors, skip gradient processing
      return []
    }

    const gradientValue = `linear-gradient(${angle}, ${colors.join(', ')})`

    if (isTextGradient) {
      // Text gradient requires background-clip workaround
      return [
        { property: 'background', value: gradientValue },
        { property: '-webkit-background-clip', value: 'text' },
        { property: 'background-clip', value: 'text' },
        { property: 'color', value: 'transparent' },
      ]
    } else {
      // Background gradient
      return [{ property: 'background', value: gradientValue }]
    }
  }

  // Handle size property - context-dependent
  // For text: size = font-size
  // For icon: size = width/height (icons are sized via dimensions)
  // For frame/box: size = width/height
  if (name === 'size') {
    // Text primitives: size means font-size
    if (primitive === 'text') {
      const val = String(values[0])
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return [{ property: 'font-size', value: px }]
    }

    // Icon primitives: size means width/height (square)
    if (primitive === 'icon') {
      const val = String(values[0])
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return [
        { property: 'width', value: px },
        { property: 'height', value: px },
      ]
    }

    // Box/Frame primitives: size means width/height
    if (values.length === 1) {
      const val = String(values[0])
      if (val === 'hug') {
        return [
          { property: 'width', value: 'fit-content' },
          { property: 'height', value: 'fit-content' },
        ]
      }
      if (val === 'full') {
        // Use flex: 1 1 0% for proper flex fill - no explicit width/height
        // as those would override flexbox behavior and ignore parent padding
        // align-self: stretch ensures cross-axis fill even when parent has center alignment
        return [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-width', value: '0' },
          { property: 'min-height', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ]
      }
      // Single value = square
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return [
        { property: 'width', value: px },
        { property: 'height', value: px },
      ]
    }
    if (values.length >= 2) {
      const w = String(values[0])
      const h = String(values[1])
      return [
        { property: 'width', value: /^\d+$/.test(w) ? `${w}px` : w },
        { property: 'height', value: /^\d+$/.test(h) ? `${h}px` : h },
      ]
    }
  }

  // Handle directional padding: pad left 20, pad top 8 bottom 24, pad x 16, pad left right 8
  if ((name === 'pad' || name === 'padding' || name === 'p') && values.length >= 2) {
    const directions = [
      'left',
      'right',
      'top',
      'bottom',
      'down',
      'l',
      'r',
      't',
      'b',
      'x',
      'y',
      'horizontal',
      'vertical',
      'hor',
      'ver',
    ]
    if (directions.includes(String(values[0]))) {
      return parseDirectionalSpacing('padding', values)
    }
    // Multi-value shorthand: pad 16 24 → padding: 16px 24px
    // Also handles mixed values like pad 8 $token → padding: 8px var(--token)
    if (values.length <= 4) {
      const paddingValue = values
        .map(v => {
          // Handle token references: { kind: "token", name: "space-md" }
          if (v && typeof v === 'object' && 'kind' in v && v.kind === 'token') {
            const tokenName = (v as { kind: string; name: string }).name
            return `var(--${tokenName}-pad)`
          }
          const str = String(v)
          // Add px to plain numeric values
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        })
        .join(' ')
      return [{ property: 'padding', value: paddingValue }]
    }
  }

  // Handle directional margin: margin left 8, margin top 16 bottom 24, margin x 16
  if ((name === 'margin' || name === 'm' || name === 'mar') && values.length >= 2) {
    const directions = [
      'left',
      'right',
      'top',
      'bottom',
      'down',
      'l',
      'r',
      't',
      'b',
      'x',
      'y',
      'horizontal',
      'vertical',
      'hor',
      'ver',
    ]
    if (directions.includes(String(values[0]))) {
      return parseDirectionalSpacing('margin', values)
    }
    // Multi-value shorthand: margin 16 24 → margin: 16px 24px
    // Also handles mixed values like margin 8 $token → margin: 8px var(--token)
    if (values.length <= 4) {
      const marginValue = values
        .map(v => {
          // Handle token references: { kind: "token", name: "space-md" }
          if (v && typeof v === 'object' && 'kind' in v && v.kind === 'token') {
            const tokenName = (v as { kind: string; name: string }).name
            return `var(--${tokenName}-pad)`
          }
          const str = String(v)
          // Add px to plain numeric values (preserve 'auto')
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        })
        .join(' ')
      return [{ property: 'margin', value: marginValue }]
    }
  }

  // Handle directional border: bor t 1 #333, bor left right 1 #333, bor x 2 #666
  // Uses BORDER_DIRECTION_MAP from schema/ir-helpers.ts
  if ((name === 'bor' || name === 'border') && values.length >= 2) {
    const firstVal = String(values[0])
    if (BORDER_DIRECTION_MAP[firstVal]) {
      // Collect all direction tokens
      const borderDirs: string[] = []
      let i = 0
      while (i < values.length && BORDER_DIRECTION_MAP[String(values[i])]) {
        borderDirs.push(...BORDER_DIRECTION_MAP[String(values[i])])
        i++
      }
      // Rest are the border values (width, style, color)
      const restValues = values.slice(i)
      const borderValue = formatBorderValue(restValues)
      // Apply to all directions (deduplicated), with 'border-' prefix
      const uniqueDirs = [...new Set(borderDirs)]
      return uniqueDirs.map(dir => ({ property: `border-${dir}`, value: borderValue }))
    }
    // Check for border-width shorthand: bor 0 0 1 0 → border-width: 0 0 1px 0; border-style: solid
    // This is when we have 2-4 numeric values (top [right] [bottom] [left])
    const allNumeric = values.every(v => /^\d+$/.test(String(v)))
    if (allNumeric && values.length >= 2 && values.length <= 4) {
      const widthValue = values
        .map(v => {
          const str = String(v)
          return str === '0' ? '0' : `${str}px`
        })
        .join(' ')
      // border-width needs border-style to be visible
      return [
        { property: 'border-style', value: 'solid' },
        { property: 'border-width', value: widthValue },
      ]
    }
    // Non-directional multi-value border: bor 1 #333 → border: 1px solid #333
    const borderValue = formatBorderValue(values)
    return [{ property: 'border', value: borderValue }]
  }

  // Handle corner-specific radius: rad tl 8, rad t 8, rad 8 8 0 0
  // Uses CORNER_MAP from schema/ir-helpers.ts
  if ((name === 'rad' || name === 'radius') && values.length >= 1) {
    const cornerMap: Record<string, string[]> = {
      tl: ['border-top-left-radius'],
      tr: ['border-top-right-radius'],
      bl: ['border-bottom-left-radius'],
      br: ['border-bottom-right-radius'],
      t: ['border-top-left-radius', 'border-top-right-radius'],
      b: ['border-bottom-left-radius', 'border-bottom-right-radius'],
      l: ['border-top-left-radius', 'border-bottom-left-radius'],
      r: ['border-top-right-radius', 'border-bottom-right-radius'],
    }
    const firstVal = String(values[0])
    if (cornerMap[firstVal] && values.length >= 2) {
      const props = cornerMap[firstVal]
      const val = String(values[1])
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return props.map(p => ({ property: p, value: px }))
    }
    // Multi-value radius shorthand: rad 8 16 → border-radius: 8px 16px
    if (values.length >= 2 && values.every(v => /^-?\d+(\.\d+)?(%|px)?$/.test(String(v)))) {
      const radiusValue = values
        .map(v => {
          const str = String(v)
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        })
        .join(' ')
      return [{ property: 'border-radius', value: radiusValue }]
    }
  }

  // Grid positioning: x → grid-column-start (when parent is grid)
  // Absolute positioning: x → left + position: absolute (default)
  if (name === 'x') {
    const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
    if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
      return [{ property: 'grid-column-start', value: String(numVal) }]
    }
    // Default: position absolute + left
    const val = typeof values[0] === 'number' ? `${values[0]}px` : String(values[0])
    const px = /^-?\d+$/.test(val) ? `${val}px` : val
    return [
      { property: 'position', value: 'absolute' },
      { property: 'left', value: px },
    ]
  }

  // Grid positioning: y → grid-row-start (when parent is grid)
  // Absolute positioning: y → top + position: absolute (default)
  if (name === 'y') {
    const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
    if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
      return [{ property: 'grid-row-start', value: String(numVal) }]
    }
    // Default: position absolute + top
    const val = typeof values[0] === 'number' ? `${values[0]}px` : String(values[0])
    const px = /^-?\d+$/.test(val) ? `${val}px` : val
    return [
      { property: 'position', value: 'absolute' },
      { property: 'top', value: px },
    ]
  }

  // Grid span: w (numeric) → grid-column: span N (when parent is grid)
  if ((name === 'w' || name === 'width') && parentLayoutContext?.type === 'grid') {
    const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
    if (!isNaN(numVal) && numVal > 0) {
      // In grid context, numeric w means column span
      // Also add width: 100% so the element fills the cell horizontally
      return [
        { property: 'grid-column', value: `span ${numVal}` },
        { property: 'width', value: '100%' },
      ]
    }
    // If not numeric, fall through to default handling (hug, full, etc.)
  }

  // Grid span: h (numeric) → grid-row: span N (when parent is grid)
  if ((name === 'h' || name === 'height') && parentLayoutContext?.type === 'grid') {
    const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
    if (!isNaN(numVal) && numVal > 0) {
      // In grid context, numeric h means row span
      // Also add height: 100% so the element fills the cell vertically
      return [
        { property: 'grid-row', value: `span ${numVal}` },
        { property: 'height', value: '100%' },
      ]
    }
    // If not numeric, fall through to default handling (hug, full, etc.)
  }

  // Handle rotate: rotate 45 (fallback for states)
  if (name === 'rotate' || name === 'rot') {
    const deg = String(values[0])
    return [{ property: 'transform', value: `rotate(${deg}deg)` }]
  }

  // Handle scale: scale 1.2 (fallback for states)
  if (name === 'scale') {
    const val = String(values[0])
    return [{ property: 'transform', value: `scale(${val})` }]
  }

  // Handle aspect ratio: aspect 16/9, aspect 1, aspect 4/3, aspect square, aspect video
  if (name === 'aspect') {
    const val = String(values[0])
    // Map keywords to their values
    const aspectKeywords: Record<string, string> = {
      square: '1',
      video: '16/9',
    }
    const resolvedVal = aspectKeywords[val] ?? val
    return [{ property: 'aspect-ratio', value: resolvedVal }]
  }

  // Handle backdrop-blur: backdrop-blur 10
  if (name === 'backdrop-blur' || name === 'blur-bg') {
    const val = String(values[0])
    const px = /^\d+$/.test(val) ? `${val}px` : val
    return [{ property: 'backdrop-filter', value: `blur(${px})` }]
  }

  // Handle filter blur: blur 5
  if (name === 'blur') {
    const val = String(values[0])
    const px = /^\d+$/.test(val) ? `${val}px` : val
    return [{ property: 'filter', value: `blur(${px})` }]
  }

  // Handle animation property: animation fade-in, anim bounce
  if (name === 'animation' || name === 'anim') {
    const animName = String(values[0])
    // Map animation keywords to CSS animation values
    const animationMap: Record<string, string> = {
      'fade-in': 'mirror-fade-in 0.3s ease forwards',
      'fade-out': 'mirror-fade-out 0.3s ease forwards',
      'slide-in': 'mirror-slide-in 0.3s ease forwards',
      'slide-out': 'mirror-slide-out 0.3s ease forwards',
      'slide-up': 'mirror-slide-up 0.4s ease forwards',
      'slide-down': 'mirror-slide-down 0.4s ease forwards',
      'slide-left': 'mirror-slide-left 0.3s ease forwards',
      'slide-right': 'mirror-slide-right 0.3s ease forwards',
      'scale-in': 'mirror-scale-in 0.3s ease forwards',
      'scale-out': 'mirror-scale-out 0.3s ease forwards',
      bounce: 'mirror-bounce 0.5s ease infinite',
      pulse: 'mirror-pulse 1s ease infinite',
      shake: 'mirror-shake 0.5s ease',
      spin: 'mirror-spin 1s linear infinite',
      'reveal-up': 'mirror-reveal-up 0.5s ease forwards',
      'reveal-scale': 'mirror-reveal-scale 0.5s ease forwards',
      'reveal-fade': 'mirror-reveal-fade 0.5s ease forwards',
    }
    const animValue = animationMap[animName] || animName
    return [{ property: 'animation', value: animValue }]
  }

  // Handle inline state-prefixed properties: hover-bg, focus-bor, active-col, disabled-opa, etc.
  // Uses hoverPropertyToCSS from schema/ir-helpers.ts (now generalized for all system states).
  const STATE_PREFIXES = ['hover-', 'focus-', 'active-', 'disabled-']
  const matchedPrefix = STATE_PREFIXES.find(p => name.startsWith(p))
  if (matchedPrefix) {
    const hoverResult = hoverPropertyToCSS(name, value)
    if (hoverResult.handled) {
      return hoverResult.styles
    }
    // Fallback for unknown state-prefixed properties
    const baseProp = name.slice(matchedPrefix.length)
    const cssValue = formatCSSValue(baseProp, value)
    return [{ property: baseProp, value: cssValue, state: matchedPrefix.slice(0, -1) }]
  }

  // Handle special cases FIRST (before the early return check)
  // These are layout/positioning properties that need special CSS mapping
  if (name === 'horizontal' || name === 'hor') {
    return [
      { property: 'display', value: 'flex' },
      { property: 'flex-direction', value: 'row' },
    ]
  }

  if (name === 'vertical' || name === 'ver') {
    return [
      { property: 'display', value: 'flex' },
      { property: 'flex-direction', value: 'column' },
      { property: 'align-items', value: 'flex-start' },
    ]
  }

  if (name === 'center' || name === 'cen') {
    return [
      { property: 'display', value: 'flex' },
      { property: 'justify-content', value: 'center' },
      { property: 'align-items', value: 'center' },
    ]
  }

  if (name === 'spread') {
    return [
      { property: 'display', value: 'flex' },
      { property: 'justify-content', value: 'space-between' },
    ]
  }

  if (name === 'wrap') {
    return [{ property: 'flex-wrap', value: 'wrap' }]
  }

  if (name === 'stacked') {
    return [{ property: 'position', value: 'relative' }]
  }

  if (name === 'scroll' || name === 'scroll-ver') {
    return [{ property: 'overflow-y', value: 'auto' }]
  }

  if (name === 'scroll-hor') {
    return [{ property: 'overflow-x', value: 'auto' }]
  }

  if (name === 'scroll-both') {
    return [{ property: 'overflow', value: 'auto' }]
  }

  // Handle width/height 'full' - use flex: 1 1 0% only when dimension matches flex direction
  // This ensures w full works in hor containers, h full works in ver containers
  // For cross-axis (h full in hor, w full in ver), use align-self: stretch instead
  if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'full') {
    const isWidth = name === 'width' || name === 'w'
    const isHorizontalFlex =
      parentLayoutContext?.type === 'flex' && parentLayoutContext?.flexDirection === 'row'
    const isVerticalFlex =
      parentLayoutContext?.type === 'flex' && parentLayoutContext?.flexDirection === 'column'

    // Check if this 'full' is on the main axis of the flex container
    const isMainAxis = (isWidth && isHorizontalFlex) || (!isWidth && isVerticalFlex)

    if (isMainAxis) {
      // Main axis: use flex: 1 1 0% to fill available space
      return [
        { property: 'flex', value: '1 1 0%' },
        { property: isWidth ? 'min-width' : 'min-height', value: '0' },
      ]
    } else {
      // Cross axis: use both explicit 100% and align-self: stretch
      // align-self: stretch alone doesn't work if parent has no explicit size
      return [
        { property: isWidth ? 'width' : 'height', value: '100%' },
        { property: 'align-self', value: 'stretch' },
        { property: isWidth ? 'min-width' : 'min-height', value: '0' },
      ]
    }
  }

  // Handle width/height 'hug' before schema
  if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'hug') {
    return [
      { property: name === 'width' || name === 'w' ? 'width' : 'height', value: 'fit-content' },
    ]
  }

  // Handle numeric width/height - prevent shrinking in flex containers
  // Value can be number or numeric string from parser
  // Always add flex-shrink: 0 for explicit dimensions to prevent flex from overriding
  // This is especially important for:
  // 1. Root elements that may be inside a flex preview container
  // 2. Child elements in flex containers
  const isNumericValue =
    typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))
  if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && isNumericValue) {
    const isWidth = name === 'width' || name === 'w'
    const cssValue = formatCSSValue(name, String(value))
    // Always add flex-shrink: 0 to prevent flex containers from shrinking explicit sizes
    return [
      { property: isWidth ? 'width' : 'height', value: cssValue },
      { property: 'flex-shrink', value: '0' },
    ]
  }

  // Try schema-based conversion FIRST - handles schema-defined properties
  // This must come before the PROPERTY_TO_CSS check to support schema-defined properties
  const schemaResult = simplePropertyToCSS(name, value)
  if (schemaResult.handled) {
    return schemaResult.styles
  }

  // Use centralized property mapping from schema
  const cssProperty = PROPERTY_TO_CSS[name]

  if (!cssProperty) {
    // Skip non-CSS properties (content, data, etc.)
    return []
  }

  if (name === 'clip') {
    return [{ property: 'overflow', value: 'hidden' }]
  }

  // Handle grid
  if (name === 'grid') {
    const gridValues = prop.values

    // grid 3 → repeat(3, 1fr)
    if (gridValues.length === 1 && /^\d+$/.test(String(gridValues[0]))) {
      return [
        { property: 'display', value: 'grid' },
        { property: 'grid-template-columns', value: `repeat(${gridValues[0]}, 1fr)` },
      ]
    }

    // grid auto 250 → auto-fill, minmax(250px, 1fr)
    if (gridValues.length === 2 && gridValues[0] === 'auto') {
      const minWidth = /^\d+$/.test(String(gridValues[1])) ? `${gridValues[1]}px` : gridValues[1]
      return [
        { property: 'display', value: 'grid' },
        { property: 'grid-template-columns', value: `repeat(auto-fill, minmax(${minWidth}, 1fr))` },
      ]
    }

    // grid 30% 70% → explicit columns
    if (gridValues.length >= 2) {
      const columns = gridValues
        .map(v => {
          const str = String(v)
          if (/^\d+$/.test(str)) return `${str}px`
          if (str.endsWith('%')) return str
          return str
        })
        .join(' ')
      return [
        { property: 'display', value: 'grid' },
        { property: 'grid-template-columns', value: columns },
      ]
    }

    return [{ property: 'display', value: 'grid' }]
  }

  // Handle shadow presets - fallback for custom values
  if (name === 'shadow') {
    // Schema was already tried above, this is just the fallback
    return [{ property: 'box-shadow', value: value }]
  }

  // Fallback: direct mapping with formatting
  if (cssProperty) {
    const cssValue = formatCSSValue(name, value)
    return [{ property: cssProperty as string, value: cssValue }]
  }

  return []
}
