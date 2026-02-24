/**
 * @module property-parser
 * @description Parst Property-Werte aus DSL-Tokens
 *
 * Zuständig für alle Property-spezifischen Parsing-Logik.
 * Normalisiert Property-Namen zu Kurzformen und handhabt komplexe Syntax.
 *
 * @property-categories
 * | Kategorie      | Properties                                           | Besonderheit                    |
 * |----------------|------------------------------------------------------|---------------------------------|
 * | Spacing        | pad, mar                                             | CSS-Shorthand + Richtungen      |
 * | Border         | bor                                                  | width + style + color           |
 * | Layout         | hor, ver, stacked, grid                              | + Alignment + Distribution      |
 * | Alignment      | left, right, hor-center, top, bottom, ver-center     | Ausgeschriebene Richtungen      |
 * | Distribution   | spread, between                                      | Space-between                   |
 * | Center         | cen                                                  | Setzt beide Achsen              |
 * | Radius         | rad                                                  | CSS-Shorthand + Corners         |
 * | Dimensions     | w, h, size                                           | Zahlen, %, min, max, hug, full  |
 * | Grid           | grid                                                 | Spalten, auto-fill, rows        |
 * | Pointer        | cursor, pointer                                      | Cursor-Werte                    |
 * | Data           | data                                                 | Binding mit where-Clause        |
 * | Generisch      | Alle anderen                                         | Zahlen, Farben, Strings         |
 *
 * @normalization
 * Eingabe → Interner Name (Kurzform):
 * - padding → pad
 * - background → bg
 * - border → bor
 * - radius → rad
 * - horizontal → hor
 * - vertical → ver
 * - width → w
 * - height → h
 * - opacity → op
 * - gap → g
 *
 * @alignment
 * Ausgeschriebene Alignment-Syntax:
 * - left, right, hor-center     → Horizontal alignment (align_h)
 * - top, bottom, ver-center     → Vertical alignment (align_v)
 * - spread                      → Space-between (= between)
 * - Kombinationen möglich: left top, top left
 *
 * @sizing
 * Dimensionen und Sizing-Keywords:
 * - w/width, h/height           → Feste Werte (px, %)
 * - hug / min                   → fit-content
 * - full / max                  → 100% + flex-grow
 * - Sequential: hug full        → w: min, h: max
 * - Sequential: full hug        → w: max, h: min
 * - size 100 200                → w: 100, h: 200
 *
 * @directions
 * Für Spacing (pad, mar) und Border (bor):
 * - Kurzformen: l, r, u/t, d/b
 * - Ausgeschrieben: left, right, top, bottom
 * - Kombinationen: l-r, t-b, left-right, top-bottom
 * - Beispiele:
 *   pad left 16           → pad_l: 16
 *   pad top 8 bottom 24   → pad_u: 8, pad_d: 24
 *
 * @corners
 * Für Radius (rad):
 * - tl = top-left, tr = top-right, bl = bottom-left, br = bottom-right
 * - t = tl + tr, b = bl + br, l = tl + bl, r = tr + br
 *
 * @grid
 * Grid-Layout Syntax:
 * - grid N                      → N gleiche Spalten
 * - grid N M                    → N Spalten, M Zeilen (rows)
 * - grid auto 250               → auto-fill mit min 250px
 * - grid 30% 70%                → Prozentuale Spalten
 *
 * @typography
 * Text-Sizing Properties:
 * - text-size / ts / font-size / fs   → Schriftgröße
 * - icon-size / is                    → Icon-Größe
 * - Context-aware size:
 *   - Icon size 16    → icon-size: 16
 *   - Text size 14    → text-size: 14
 *   - Box size 100    → w: 100, h: 100
 *
 * @visibility
 * Sichtbarkeits-Properties:
 * - hidden                      → Element versteckt
 * - visible                     → Inverse von hidden (setzt hidden: false)
 *
 * @legacy-properties
 * Abwärtskompatibilität:
 * - grow / fill                 → flex-grow: 1
 * - w-min, w-max, h-min, h-max  → Sizing shortcuts
 * - fit                         → object-fit (cover, contain, etc.)
 *
 * @token-references
 * - $primary → Lookup in designTokens Map
 * - Card.padding → Component Property Reference
 *
 * @css-shorthand
 * pad 8           → pad: 8 (alle)
 * pad 8 16        → pad_u: 8, pad_d: 8, pad_l: 16, pad_r: 16
 * pad 8 16 8 16   → pad_u: 8, pad_r: 16, pad_d: 8, pad_l: 16
 *
 * @example
 * parsePropertyValue(ctx, node)
 * // Mit Token PROPERTY 'padding', NUMBER '16'
 * // → node.properties.pad = 16
 *
 * @example
 * // pad l-r 16 → pad_l: 16, pad_r: 16
 * // pad left 16 → pad_l: 16
 * // pad top 8 bottom 24 → pad_u: 8, pad_d: 24
 * // rad tl 8 br 4 → rad_tl: 8, rad_br: 4
 * // bor l 1 #333 → bor_l: 1, bor_l_color: '#333'
 * // hug full → w: min, h: max
 * // full hug → w: max, h: min
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parsePropertyValue(ctx, node)
 *   Haupt-Einstiegspunkt - Parst eine Property mit Wert
 *
 * @function parseLayoutProperty(ctx, node, propName)
 *   Parst Layout-Properties (hor/ver) mit Alignment
 *   Exportiert für definition-parser.ts
 *
 * @function parseCenterProperty(ctx, node)
 *   Parst Center-Property (beide Achsen)
 *   Exportiert für definition-parser.ts
 *
 * @function applyTokenSequenceSpacing(expandedTokens, node, prefix)
 *   Wendet Token-Sequenz auf Spacing-Properties an
 *   Für $default-pad → "l-r 4" Expansion
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, TokenValue, TokenSequence } from './types'
import { isTokenSequence } from './types'
import type { Token } from './lexer'
import { CSS_COLOR_KEYWORDS, splitDirections, applySpacingToProperties } from './parser-utils'
import { STRING_PROPERTIES, BOOLEAN_PROPERTIES, CORNER_DIRECTIONS, CORNER_SHORT_FORMS, normalizePropertyToShort, LONG_DIRECTIONS, normalizeDirection } from '../dsl/properties'
import { parseCondition } from './condition-parser'
import { isIconComponent, isTextComponent, isHeadingComponent } from './sugar/component-type-matcher'

/**
 * Resolve a component property reference like "Card.pad" or "$Card.pad".
 * Returns the resolved value or undefined if not found.
 * Reports warnings via parser context when references cannot be resolved.
 * @param ctx Parser context
 * @param refValue Reference string like "Card.pad"
 * @param sourceToken Optional token for error position (defaults to ctx.current())
 */
function resolveComponentPropertyRef(
  ctx: ParserContext,
  refValue: string,
  sourceToken?: Token
): string | number | boolean | undefined {
  const parts = refValue.split('.')
  if (parts.length < 2) return undefined

  const componentName = parts[0].startsWith('$') ? parts[0].slice(1) : parts[0]
  const compTemplate = ctx.registry.get(componentName)

  if (!compTemplate) {
    // Only warn if it looks like an intentional component reference
    // (starts with uppercase letter)
    if (/^[A-Z]/.test(componentName)) {
      const token = sourceToken ?? ctx.current()
      if (token) {
        ctx.addWarning(
          'UNDEFINED_COMPONENT',
          `Component "${componentName}" is not defined`,
          token,
          `Cannot resolve reference "${refValue}"`
        )
      }
    }
    return undefined
  }

  // Try single property first (most common case: Card.pad)
  if (parts.length === 2) {
    const value = compTemplate.properties[parts[1]]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }
  }

  // For nested paths like Card.Header.style, try both formats:
  // 1. Dot notation (Header.style) for nested component access
  // 2. Underscore notation (Header_style) for flat property storage
  const propPathDot = parts.slice(1).join('.')
  const propPathUnderscore = parts.slice(1).join('_')

  // Try dot notation first
  let value = compTemplate.properties[propPathDot]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  // Fallback to underscore notation for backwards compatibility
  value = compTemplate.properties[propPathUnderscore]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  // Property not found on component
  const token = sourceToken ?? ctx.current()
  if (token) {
    const availableProps = Object.keys(compTemplate.properties).join(', ') || 'none'
    ctx.addWarning(
      'UNDEFINED_PROPERTY',
      `Component "${componentName}" has no property "${parts.slice(1).join('.')}"`,
      token,
      `Available properties: ${availableProps}`
    )
  }
  return undefined
}

/**
 * Try to resolve a component property reference and assign to node.properties.
 * Returns true if resolved and assigned, false otherwise.
 */
function tryAssignResolvedRef(
  ctx: ParserContext,
  node: ASTNode,
  propName: string,
  refValue: string
): boolean {
  const resolved = resolveComponentPropertyRef(ctx, refValue)
  if (resolved !== undefined) {
    node.properties[propName] = resolved
    return true
  }
  return false
}

/**
 * Look up a token value with optional warning on failure.
 * Reports warnings via parser context when tokens are not found.
 * @param ctx Parser context
 * @param tokenName Name of the token to look up
 * @param warnOnMissing Whether to warn if the token is not found
 * @param sourceToken Optional token for error position (defaults to ctx.current())
 * @returns The token value or undefined
 */
function lookupToken(
  ctx: ParserContext,
  tokenName: string,
  warnOnMissing: boolean = false,
  sourceToken?: Token
): unknown {
  const value = ctx.designTokens.get(tokenName)
  if (value === undefined && warnOnMissing) {
    // Only warn if it doesn't look like a component property reference
    if (!tokenName.includes('.')) {
      const token = sourceToken ?? ctx.current()
      if (token) {
        ctx.addWarning(
          'UNDEFINED_TOKEN',
          `Token "$${tokenName}" is not defined`,
          token
        )
      }
    }
  }
  return value
}

/**
 * Property-to-token-suffix mapping for context-aware token resolution.
 * When `gap $md` is written, we try `$md.gap` if `$md` doesn't exist.
 */
const PROPERTY_TO_TOKEN_SUFFIX: Record<string, string> = {
  // Spacing
  'pad': 'pad',
  'padding': 'pad',
  'mar': 'mar',
  'margin': 'mar',
  'gap': 'gap',
  'g': 'gap',
  // Colors
  'bg': 'bg',
  'background': 'bg',
  'col': 'col',
  'color': 'col',
  'boc': 'boc',
  'border-color': 'boc',
  // Border & Radius
  'rad': 'rad',
  'radius': 'rad',
  'bor': 'bor',
  'border': 'bor',
  // Typography
  'text-size': 'font.size',
  'font-size': 'font.size',
  'fs': 'font.size',
  'ts': 'font.size',
  'size': 'font.size',
  'icon-size': 'icon.size',
  'is': 'icon.size',
}

/**
 * Context-aware token resolution.
 * When a short token like `$md` is used in a property context like `gap`,
 * we first try `$md`, then `$md.gap` to find the value.
 *
 * @param ctx Parser context with design tokens
 * @param tokenName The token name (without $)
 * @param propContext The property context (e.g., 'gap', 'pad', 'bg')
 * @returns The resolved token value or undefined
 */
function resolveTokenWithContext(
  ctx: ParserContext,
  tokenName: string,
  propContext: string
): TokenValue | undefined {
  // Try exact match first (e.g., $md.gap when user writes gap $md.gap)
  let value = ctx.designTokens.get(tokenName)
  if (value !== undefined) return value as TokenValue

  // If token name already has a suffix, don't try to add another
  if (tokenName.includes('.')) return undefined

  // Get the token suffix for this property
  const suffix = PROPERTY_TO_TOKEN_SUFFIX[propContext]
  if (!suffix) return undefined

  // Try with property context suffix (e.g., $md → $md.gap)
  const suffixedName = `${tokenName}.${suffix}`
  value = ctx.designTokens.get(suffixedName)
  if (value !== undefined) return value as TokenValue

  return undefined
}

/**
 * Process an expanded token sequence and apply spacing properties.
 * Used for pad/mar/bor properties that can now use token sequences like "$default-pad" → "l-r 4"
 */
export function applyTokenSequenceSpacing(
  expandedTokens: Token[],
  node: ASTNode,
  prefix: string
): void {
  let currentDirections: string[] = []
  let hasAppliedAny = false

  for (const token of expandedTokens) {
    if (token.type === 'DIRECTION') {
      currentDirections.push(...splitDirections(token.value))
    } else if (token.type === 'NUMBER') {
      const value = parseInt(token.value, 10)

      if (currentDirections.length > 0) {
        for (const dir of currentDirections) {
          node.properties[`${prefix}_${dir}`] = value
        }
        currentDirections = []
        hasAppliedAny = true
      } else if (!hasAppliedAny) {
        node.properties[prefix] = value
        hasAppliedAny = true
      }
    }
  }
}

/**
 * @doc parsePropertyValue
 * @brief Haupt-Einstiegspunkt - Parst eine Property mit Wert
 *
 * @syntax
 * PROPERTY_NAME [DIRECTION]* [VALUE]+
 *
 * @routing
 * pad, mar          → parsePadMarProperty (CSS-Shorthand + Directions)
 * bor               → parseBorderProperty (width + style + color)
 * hor, ver          → parseLayoutProperty (+ Alignment)
 * cen               → parseCenterProperty (beide Achsen)
 * rad               → parseRadiusProperty (CSS-Shorthand + Corners)
 * w, h              → parseDimensionProperty (Zahlen, %, min, max)
 * grid              → parseGridProperty (Spalten, auto-fill)
 * cursor, pointer   → parsePointerProperty
 * data              → parseDataProperty (Binding)
 * icon, font        → parseStringProperty
 * weight            → parseWeightProperty
 * fit               → parseFitProperty
 * alle anderen      → parseGenericProperty
 *
 * @input
 * - ctx: ParserContext - Aktueller Token muss PROPERTY sein
 * - node: ASTNode - Ziel für properties
 *
 * @output Setzt node.properties[propName] = value
 *
 * @example
 * // Token: PROPERTY 'padding', NUMBER '12'
 * parsePropertyValue(ctx, node)
 * // → node.properties.pad = 12
 *
 * // Token: PROPERTY 'bg', COLOR '#3B82F6'
 * parsePropertyValue(ctx, node)
 * // → node.properties.bg = '#3B82F6'
 */
export function parsePropertyValue(ctx: ParserContext, node: ASTNode): void {
  const rawPropName = ctx.advance().value
  // Normalize to short form for internal storage (padding -> pad, background -> bg, etc.)
  const propName = normalizePropertyToShort(rawPropName)

  // Skip optional colon after property name (w: 25% or w 25%)
  if (ctx.current()?.type === 'COLON') {
    ctx.advance()
  }

  // Special handling for spacing with directions or CSS shorthand
  // Note: propName is already normalized (padding->pad, background->bg, etc.)
  if (propName === 'pad' || propName === 'mar') {
    parsePadMarProperty(ctx, node, propName)
  } else if (propName === 'bor') {
    parseBorderProperty(ctx, node)
  } else if (propName === 'hor' || propName === 'ver' || propName === 'vert') {
    parseLayoutProperty(ctx, node, propName === 'vert' ? 'ver' : propName)
  } else if (propName === 'cen') {
    parseCenterProperty(ctx, node)
  } else if (propName === 'rad') {
    parseRadiusProperty(ctx, node)
  } else if (propName === 'font') {
    // font can be followed by STRING (font family) or NUMBER (font size)
    // "font 16" is treated as "size 16" for convenience
    if (ctx.current()?.type === 'NUMBER') {
      parseGenericProperty(ctx, node, 'size')
    } else {
      parseStringProperty(ctx, node, propName)
    }
  } else if (propName === 'fit') {
    parseFitProperty(ctx, node)
  } else if (propName === 'w' || propName === 'h') {
    parseDimensionProperty(ctx, node, propName)
  } else if (propName === 'w-min') {
    node.properties['w'] = 'min'
  } else if (propName === 'w-max') {
    node.properties['w'] = 'max'
  } else if (propName === 'h-min') {
    node.properties['h'] = 'min'
  } else if (propName === 'h-max') {
    node.properties['h'] = 'max'
  } else if (propName === 'min' || propName === 'max' || propName === 'full' || propName === 'hug') {
    // Sizing keywords: full/max → 100% + flex-grow, hug/min → fit-content
    // Sequential parsing: "full hug" → w: max, h: min
    const widthValue = (propName === 'full' || propName === 'max') ? 'max' : 'min'

    // Check if next token is also a sizing keyword (for sequential parsing)
    const nextToken = ctx.current()
    const nextIsSizing = nextToken?.type === 'PROPERTY' &&
      ['min', 'max', 'full', 'hug'].includes(nextToken.value)

    if (nextIsSizing) {
      // Sequential: this keyword sets width, next will set height
      node.properties['w'] = widthValue
      ctx.advance() // consume next sizing keyword
      const heightValue = (nextToken.value === 'full' || nextToken.value === 'max') ? 'max' : 'min'
      node.properties['h'] = heightValue
    } else {
      // Standalone: set both dimensions
      node.properties['w'] = widthValue
      node.properties['h'] = widthValue
    }
  } else if (propName === 'grow' || propName === 'fill') {
    // Legacy 'grow'/'fill': now equivalent to flex-grow behavior
    // These are handled in style-converter as flexGrow: 1
    node.properties[propName] = true
  } else if (propName === 'left') {
    // NEU: 'left' = horizontal-left alignment
    parseAlignmentProperty(ctx, node, 'left')
  } else if (propName === 'right') {
    // NEU: 'right' = horizontal-right alignment
    parseAlignmentProperty(ctx, node, 'right')
  } else if (propName === 'hor-center') {
    // NEU: 'hor-center' = horizontal-center alignment
    parseAlignmentProperty(ctx, node, 'hor-center')
  } else if (propName === 'top') {
    // NEU: 'top' = vertical-top alignment
    parseAlignmentProperty(ctx, node, 'top')
  } else if (propName === 'bottom') {
    // NEU: 'bottom' = vertical-bottom alignment
    parseAlignmentProperty(ctx, node, 'bottom')
  } else if (propName === 'ver-center') {
    // NEU: 'ver-center' = vertical-center alignment
    parseAlignmentProperty(ctx, node, 'ver-center')
  } else if (propName === 'spread') {
    // NEU: 'spread' = between (space-between distribution)
    node.properties['between'] = true
  } else if (propName === 'visible') {
    // 'visible' is the inverse of 'hidden' - they are the same property
    // Setting visible clears hidden, allowing overrides in inheritance
    node.properties['hidden'] = false
  } else if (propName === 'size') {
    // 'size' is always dimensions: size hug 32, size 100 200, size full, size hug
    parseSizeProperty(ctx, node)
  } else if (propName === 'text-size' || propName === 'ts' || propName === 'font-size' || propName === 'fs') {
    // text-size for typography (font-size/fs kept for backwards compatibility)
    parseTextSizeProperty(ctx, node)
  } else if (propName === 'icon-size' || propName === 'is') {
    // icon-size for icons
    parseIconSizeProperty(ctx, node)
  } else if (propName === 'weight') {
    parseWeightProperty(ctx, node)
  } else if (propName === 'grid') {
    parseGridProperty(ctx, node)
  } else if (propName === 'pointer' || propName === 'cursor') {
    parsePointerProperty(ctx, node, propName)
  } else if (propName === 'data') {
    parseDataProperty(ctx, node)
  } else {
    parseGenericProperty(ctx, node, propName)
  }
}

/**
 * @doc parsePadMarProperty
 * @brief Parst Spacing-Properties mit Directions und CSS-Shorthand
 *
 * @syntax
 * pad 8               → pad: 8 (alle Seiten)
 * pad 8 16            → pad_u: 8, pad_d: 8, pad_l: 16, pad_r: 16
 * pad 8 16 8 16       → pad_u: 8, pad_r: 16, pad_d: 8, pad_l: 16 (CSS-Order)
 * pad l 16            → pad_l: 16
 * pad l-r 16          → pad_l: 16, pad_r: 16
 * pad t-b 8 l-r 16    → pad_u: 8, pad_d: 8, pad_l: 16, pad_r: 16
 * pad $spacing        → Token-Auflösung
 * pad Card.pad        → Component Property Reference
 *
 * @directions
 * l = left, r = right, u/t = top, d/b = bottom
 * l-r = left AND right (Hyphen kombiniert)
 * t-b = top AND bottom
 *
 * @normalization
 * Intern werden t→u und b→d normalisiert:
 * pad_u, pad_d, pad_l, pad_r
 *
 * @input
 * - ctx: ParserContext nach PROPERTY 'pad' oder 'mar'
 * - node: ASTNode
 * - propName: 'pad' oder 'mar'
 *
 * @output node.properties[propName] oder node.properties[propName_dir]
 */
function parsePadMarProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  let hasAppliedAny = false

  // Handle token references first (before any directions or numbers)
  if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    // Use context-aware token resolution: pad $md → tries $md, then $md.pad
    const tokenValue = resolveTokenWithContext(ctx, tokenName, propName)

    if (tokenValue !== undefined && isTokenSequence(tokenValue)) {
      const expandedTokens = ctx.expandTokenSequence((tokenValue as TokenSequence).tokens)
      applyTokenSequenceSpacing(expandedTokens, node, propName)
      return
    } else if (typeof tokenValue === 'number') {
      node.properties[propName] = tokenValue
      return
    } else if (tokenValue === undefined) {
      const resolved = resolveComponentPropertyRef(ctx, tokenName)
      if (typeof resolved === 'number') {
        node.properties[propName] = resolved
        return
      }
    }
  }

  // Handle component property reference without $: Card.pad
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()!.value.includes('.')) {
    const resolved = resolveComponentPropertyRef(ctx, ctx.advance().value)
    if (typeof resolved === 'number') {
      node.properties[propName] = resolved
      return
    }
  }

  // Helper to check if a token is a long direction (left, right, top, bottom)
  const isLongDirection = (token: Token | undefined) =>
    token?.type === 'PROPERTY' && LONG_DIRECTIONS.has(token.value)

  // Parse direction+value pairs or CSS shorthand
  // Support both: "pad 8 16" (CSS shorthand) and "pad t-b 8 l-r 16" (direction pairs)
  // NEU: Also supports "pad left 16" and "pad top 8 bottom 24" with ausgeschriebenen Richtungen
  while (ctx.current() &&
         ctx.current()!.type !== 'NEWLINE' &&
         ctx.current()!.type !== 'EOF' &&
         // Allow PROPERTY tokens that are long directions (left, right, top, bottom)
         (ctx.current()!.type !== 'PROPERTY' || isLongDirection(ctx.current())) &&
         ctx.current()!.type !== 'COMPONENT_NAME' &&
         ctx.current()!.type !== 'STRING' &&
         ctx.current()!.type !== 'COLOR' &&
         ctx.current()!.type !== 'COMMA') {
    const token = ctx.current()!

    if (token.type === 'DIRECTION') {
      // Collect directions (short forms: l, r, t, b, l-r, t-b)
      const directions: string[] = []
      while (ctx.current()?.type === 'DIRECTION') {
        directions.push(...splitDirections(ctx.advance().value))
      }

      // Get the value for these directions
      if (ctx.current()?.type === 'NUMBER') {
        const value = parseInt(ctx.advance().value, 10)
        for (const dir of directions) {
          node.properties[`${propName}_${dir}`] = value
        }
        hasAppliedAny = true
      }
    } else if (isLongDirection(token)) {
      // NEU: Handle long direction names (left, right, top, bottom)
      const directions: string[] = []
      while (isLongDirection(ctx.current())) {
        directions.push(normalizeDirection(ctx.advance().value))
      }

      // Get the value for these directions
      if (ctx.current()?.type === 'NUMBER') {
        const value = parseInt(ctx.advance().value, 10)
        for (const dir of directions) {
          node.properties[`${propName}_${dir}`] = value
        }
        hasAppliedAny = true
      }
    } else if (token.type === 'NUMBER') {
      // CSS shorthand - collect all numbers
      const values: number[] = []
      while (ctx.current()?.type === 'NUMBER') {
        values.push(parseInt(ctx.advance().value, 10))
        if (values.length === 1 && ctx.current()?.type === 'TOKEN_DEF') {
          const tokenName = ctx.advance().value
          ctx.designTokens.set(tokenName, values[0])
        }
      }
      applySpacingToProperties(node.properties, propName, values, [])
      hasAppliedAny = true
      break // CSS shorthand consumes all remaining numbers
    } else {
      break
    }
  }

  // If nothing was applied, set the property to true
  if (!hasAppliedAny) {
    node.properties[propName] = true
  }
}

/**
 * Parse compound border property.
 */
function parseBorderProperty(ctx: ParserContext, node: ASTNode): void {
  const directions: string[] = []
  let width: number | undefined
  let style: string | undefined
  let color: string | undefined

  while (ctx.current() &&
         ctx.current()!.type !== 'NEWLINE' &&
         ctx.current()!.type !== 'EOF' &&
         ctx.current()!.type !== 'PROPERTY' &&
         ctx.current()!.type !== 'STRING') {
    const token = ctx.current()!

    // Handle COMPONENT_NAME with dot (property reference) vs regular COMPONENT_NAME
    if (token.type === 'COMPONENT_NAME') {
      if (token.value.includes('.')) {
        // Property reference like Card.bor
        const resolved = resolveComponentPropertyRef(ctx, ctx.advance().value)
        if (typeof resolved === 'number') {
          width = resolved
        } else if (typeof resolved === 'string') {
          color = resolved
        }
      } else {
        // Regular component name - stop parsing border
        break
      }
    } else if (token.type === 'DIRECTION') {
      directions.push(...splitDirections(ctx.advance().value))
    } else if (token.type === 'NUMBER') {
      width = parseInt(ctx.advance().value, 10)
    } else if (token.type === 'BORDER_STYLE') {
      style = ctx.advance().value
    } else if (token.type === 'COLOR') {
      color = ctx.advance().value
    } else if (token.type === 'TOKEN_REF') {
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)
      if (typeof tokenValue === 'number') {
        width = tokenValue
      } else if (typeof tokenValue === 'string') {
        color = tokenValue
      } else {
        // Try component property reference from token: $Card.bor
        const resolved = resolveComponentPropertyRef(ctx, tokenName)
        if (typeof resolved === 'number') {
          width = resolved
        } else if (typeof resolved === 'string') {
          color = resolved
        }
      }
    } else {
      break
    }
  }

  if (directions.length > 0) {
    for (const dir of directions) {
      if (width !== undefined) {
        node.properties[`bor_${dir}`] = width
        node.properties[`bor_${dir}_width`] = width
      }
      if (style) node.properties[`bor_${dir}_style`] = style
      if (color) node.properties[`bor_${dir}_color`] = color
    }
  } else {
    if (width !== undefined) node.properties['bor_width'] = width
    if (style) node.properties['bor_style'] = style
    if (color) node.properties['bor_color'] = color
    if (width !== undefined) {
      node.properties['bor'] = width
    }
  }
}

/**
 * Parse layout property (hor/ver) with alignment.
 * Exported for use in definition-parser.ts.
 */
export function parseLayoutProperty(ctx: ParserContext, node: { properties: Record<string, unknown> }, propName: string): void {
  // Normalize to short form for consistency
  const normalizedName = propName === 'horizontal' ? 'hor' : propName === 'vertical' ? 'ver' : propName
  node.properties[normalizedName] = true

  const next = ctx.current()
  if (next?.type === 'DIRECTION') {
    node.properties['align_main'] = ctx.advance().value
  } else if (next?.type === 'PROPERTY' && next.value === 'cen') {
    // cen after hor/ver centers both axes
    ctx.advance()
    node.properties['align_main'] = 'cen'
    node.properties['align_cross'] = 'cen'
    return  // cen handles both axes, no need to check cross
  } else if (next?.type === 'PROPERTY' && next.value === 'between') {
    // between is stored as boolean, not as align_main value
    ctx.advance()
    node.properties['between'] = true
  }

  const cross = ctx.current()
  if (cross?.type === 'DIRECTION') {
    node.properties['align_cross'] = ctx.advance().value
  } else if (cross?.type === 'PROPERTY' && cross.value === 'cen') {
    node.properties['align_cross'] = ctx.advance().value
  }
}

/**
 * Parse grid property.
 * Syntax: grid [count] [widths...] [rows heights...] gap N
 * Examples:
 *   grid 4 gap 16           → 4 equal columns
 *   grid 20% 80% gap 16     → 2 columns with percentages
 *   grid 200 auto 30%       → 3 columns with mixed units
 *   grid auto 250           → auto-fill with min 250px
 *   grid 2 rows 100 200     → 2 columns with explicit row heights
 */
function parseGridProperty(ctx: ParserContext, node: ASTNode): void {
  const columns: string[] = []
  const rows: string[] = []
  let parsingRows = false
  let isAutoFill = false

  // Parse values until we hit a different property, newline, or EOF
  while (ctx.current() &&
         ctx.current()!.type !== 'NEWLINE' &&
         ctx.current()!.type !== 'EOF' &&
         ctx.current()!.type !== 'COMMA') {
    const token = ctx.current()!

    // Check for 'rows' keyword
    if (token.type === 'PROPERTY' && token.value === 'rows') {
      ctx.advance()
      parsingRows = true
      continue
    }

    // Check for 'gap' - stop parsing grid values
    if (token.type === 'PROPERTY' && token.value === 'gap') {
      break
    }

    // Check for other properties - stop parsing
    if (token.type === 'PROPERTY') {
      break
    }

    // Check for 'auto' keyword
    if (token.type === 'COMPONENT_NAME' && token.value === 'auto') {
      ctx.advance()
      // If 'auto' is the first value, it means auto-fill mode
      // Otherwise, it's just an 'auto' column width
      if (columns.length === 0 && !parsingRows) {
        isAutoFill = true
      } else if (parsingRows) {
        rows.push('auto')
      } else {
        columns.push('auto')
      }
      continue
    }

    // Parse number or percentage
    if (token.type === 'NUMBER') {
      const value = ctx.advance().value
      if (parsingRows) {
        rows.push(value)
      } else {
        columns.push(value)
      }
      continue
    }

    // Parse string value (e.g., grid "250 auto" or grid "30% 70%")
    if (token.type === 'STRING') {
      const value = ctx.advance().value
      // String values are passed through directly and split into columns
      const parts = value.split(/\s+/).filter(Boolean)
      for (const part of parts) {
        if (parsingRows) {
          rows.push(part)
        } else {
          columns.push(part)
        }
      }
      continue
    }

    // Anything else, break
    break
  }

  // Store parsed grid values
  if (isAutoFill && columns.length === 1) {
    // Auto-fill: grid auto 250 → repeat(auto-fill, minmax(250px, 1fr))
    node.properties['grid'] = `auto ${columns[0]}`
  } else if (columns.length === 1 && !columns[0].includes('%')) {
    // Single number without % means column count: grid 4
    node.properties['grid'] = parseInt(columns[0], 10)
  } else if (columns.length > 0) {
    // Multiple values or percentages: grid 20% 80% or grid 200 300 200
    node.properties['grid'] = columns.join(' ')
  }

  // Store row values if present
  if (rows.length > 0) {
    node.properties['grid_rows'] = rows.join(' ')
  }
}

/**
 * Parse pointer/cursor property.
 * Accepts: pointer, none, auto, grab, etc.
 */
function parsePointerProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()
  // Accept cursor values: COMPONENT_NAME, PROPERTY (for 'pointer' which is also a property),
  // ANIMATION (for 'none'), or STRING
  // Known cursor values: pointer, default, text, move, grab, grabbing, not-allowed, wait, crosshair, help
  if (next?.type === 'COMPONENT_NAME' || next?.type === 'PROPERTY' || next?.type === 'ANIMATION' || next?.type === 'STRING') {
    node.properties[propName] = ctx.advance().value
  } else {
    // Boolean - just the property name without value
    node.properties[propName] = true
  }
}

/**
 * Edge to corner mapping for radius.
 * rad t 4 → sets both top corners (tl, tr)
 * rad l 4 → sets both left corners (tl, bl)
 * rad l-r 4 → sets all corners (same as rad 4)
 */
const EDGE_TO_CORNERS: Record<string, string[]> = {
  't': ['tl', 'tr'],
  'u': ['tl', 'tr'],
  'top': ['tl', 'tr'],
  'b': ['bl', 'br'],
  'd': ['bl', 'br'],
  'bottom': ['bl', 'br'],
  'l': ['tl', 'bl'],
  'left': ['tl', 'bl'],
  'r': ['tr', 'br'],
  'right': ['tr', 'br'],
}

/**
 * Expand a radius direction (possibly hyphenated) to corner names.
 * rad t → ['tl', 'tr']
 * rad l-r → ['tl', 'bl', 'tr', 'br']
 * rad tl → ['tl']
 */
function expandRadiusDirection(dir: string): string[] {
  // Handle hyphenated combinations: l-r, t-b, etc.
  if (dir.includes('-')) {
    const parts = dir.split('-')
    const corners = new Set<string>()
    for (const part of parts) {
      if (EDGE_TO_CORNERS[part]) {
        for (const corner of EDGE_TO_CORNERS[part]) {
          corners.add(corner)
        }
      } else if (CORNER_SHORT_FORMS[part]) {
        corners.add(CORNER_SHORT_FORMS[part])
      } else if (CORNER_DIRECTIONS.has(part)) {
        corners.add(part)
      }
    }
    return Array.from(corners)
  }

  // Single edge direction
  if (EDGE_TO_CORNERS[dir]) {
    return EDGE_TO_CORNERS[dir]
  }

  // Single corner direction
  const corner = CORNER_SHORT_FORMS[dir] || dir
  if (CORNER_DIRECTIONS.has(corner) || CORNER_DIRECTIONS.has(dir)) {
    return [corner]
  }

  return []
}

// All valid radius directions (corners + edges)
const RADIUS_DIRECTIONS = new Set([
  ...CORNER_DIRECTIONS,
  't', 'u', 'top', 'b', 'd', 'bottom', 'l', 'left', 'r', 'right'
])

/**
 * Parse radius property.
 * Supports:
 * - CSS shorthand: rad 8 (all corners) or rad 8 8 0 0 (top-left, top-right, bottom-right, bottom-left)
 * - Corner directions: rad tl 8, rad top-left 8, rad br 12
 * - Edge directions: rad t 8 (both top corners), rad l 8 (both left corners)
 * - Combinations: rad l-r 8 (all corners), rad t-b 8 (all corners)
 */
function parseRadiusProperty(ctx: ParserContext, node: ASTNode): void {
  const values: number[] = []

  // Handle component property reference: Card.rad
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()!.value.includes('.')) {
    if (tryAssignResolvedRef(ctx, node, 'rad', ctx.advance().value)) {
      return
    }
  }

  // Handle token reference: $radius or $md (with context-aware resolution)
  if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    // Use context-aware token resolution: rad $md → tries $md, then $md.rad
    const tokenValue = resolveTokenWithContext(ctx, tokenName, 'rad')
    if (typeof tokenValue === 'number') {
      node.properties['rad'] = tokenValue
      return
    }
    // Try component property reference from token: $Card.rad
    if (tryAssignResolvedRef(ctx, node, 'rad', tokenName)) {
      return
    }
  }

  // Check for direction: rad tl 8, rad t 8, rad l-r 8, rad top-left 8
  const current = ctx.current()
  const isRadiusDirection = (token: typeof current) => {
    if (!token) return false
    // DIRECTION tokens include hyphenated combos like l-r, t-b
    if (token.type === 'DIRECTION') return true
    // COMPONENT_NAME for corner names like tl, top-left
    if (token.type === 'COMPONENT_NAME' && RADIUS_DIRECTIONS.has(token.value)) return true
    return false
  }

  if (isRadiusDirection(current)) {
    // Parse direction-specific radius values
    while (isRadiusDirection(ctx.current())) {
      const dirValue = ctx.advance().value

      // Expect a number after the direction
      if (ctx.current()?.type === 'NUMBER') {
        const value = parseInt(ctx.advance().value, 10)

        // Expand direction to corners (handles single, edge, and hyphenated)
        const corners = expandRadiusDirection(dirValue)
        for (const corner of corners) {
          node.properties[`rad_${corner}`] = value
        }
      }
    }
    return
  }

  // Collect all consecutive numbers (CSS shorthand)
  while (ctx.current()?.type === 'NUMBER' && values.length < 4) {
    values.push(parseInt(ctx.advance().value, 10))
  }

  if (values.length === 0) {
    node.properties['rad'] = 8  // Default border radius
  } else if (values.length === 1) {
    node.properties['rad'] = values[0]
  } else if (values.length === 2) {
    // 2 values: top-left/bottom-right, top-right/bottom-left
    node.properties['rad_tl'] = values[0]
    node.properties['rad_br'] = values[0]
    node.properties['rad_tr'] = values[1]
    node.properties['rad_bl'] = values[1]
  } else if (values.length === 3) {
    // 3 values: top-left, top-right/bottom-left, bottom-right
    node.properties['rad_tl'] = values[0]
    node.properties['rad_tr'] = values[1]
    node.properties['rad_bl'] = values[1]
    node.properties['rad_br'] = values[2]
  } else if (values.length === 4) {
    // 4 values: top-left, top-right, bottom-right, bottom-left
    node.properties['rad_tl'] = values[0]
    node.properties['rad_tr'] = values[1]
    node.properties['rad_br'] = values[2]
    node.properties['rad_bl'] = values[3]
  }
}

/**
 * Parse center property.
 * Exported for use in definition-parser.ts.
 */
export function parseCenterProperty(ctx: ParserContext, node: { properties: Record<string, unknown> }): void {
  // cen centers both axes by default
  node.properties['align_main'] = 'cen'
  node.properties['align_cross'] = 'cen'
  // If followed by another cen, consume it (backwards compatibility)
  const next = ctx.current()
  if (next?.type === 'PROPERTY' && next.value === 'cen') {
    ctx.advance()
  }
}

/**
 * Parse string property (icon, font).
 */
function parseStringProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()
  if (next?.type === 'STRING') {
    node.properties[propName] = ctx.advance().value
  }
}

/**
 * Parse weight property.
 * Accepts numeric values (400, 600, 700) or 'bold' keyword.
 */
function parseWeightProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    node.properties['weight'] = parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'COMPONENT_NAME' && next.value === 'bold') {
    ctx.advance()
    node.properties['weight'] = 700  // Convert 'bold' to numeric weight
  } else if (next?.type === 'COMPONENT_NAME' && next.value.includes('.')) {
    // Component property reference: Card.weight
    if (tryAssignResolvedRef(ctx, node, 'weight', ctx.advance().value)) {
      return
    }
    node.properties['weight'] = 700  // Default if not resolved
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (typeof tokenValue === 'number') {
      node.properties['weight'] = tokenValue
    } else if (tryAssignResolvedRef(ctx, node, 'weight', tokenName)) {
      return
    }
  } else {
    node.properties['weight'] = 700  // Default bold weight
  }
}

/**
 * Parse fit property.
 */
function parseFitProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()
  if (next?.type === 'COMPONENT_NAME' || next?.type === 'STRING') {
    node.properties['fit'] = ctx.advance().value as import('../types/dsl-properties').ObjectFit
  }
}

/**
 * Parse alignment property for new ausgeschriebene alignment syntax.
 * Maps: left/right/hor-center → horizontal alignment
 *       top/bottom/ver-center → vertical alignment
 *       spread → between
 */
function parseAlignmentProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  // Horizontal alignment: left, right, hor-center
  if (propName === 'left') {
    node.properties['align_main'] = 'l'
  } else if (propName === 'right') {
    node.properties['align_main'] = 'r'
  } else if (propName === 'hor-center') {
    node.properties['align_main'] = 'cen'
  }
  // Vertical alignment: top, bottom, ver-center
  else if (propName === 'top') {
    node.properties['align_cross'] = 'u'
  } else if (propName === 'bottom') {
    node.properties['align_cross'] = 'd'
  } else if (propName === 'ver-center') {
    node.properties['align_cross'] = 'cen'
  }
}

/**
 * Parse dimension property (w/h).
 * Supports: numbers (200), percentages (50%), 'min', 'max', 'full' (legacy), 'hug' (alias for min)
 */
function parseDimensionProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    const value = ctx.advance().value
    // Preserve percentage values as strings, parse plain numbers as integers
    node.properties[propName] = value.includes('%') ? value : parseInt(value, 10)
  } else if (next?.type === 'PROPERTY' && (next.value === 'min' || next.value === 'max')) {
    // New min/max sizing: width min → fit-content, width max → 100% + flex-grow
    node.properties[propName] = ctx.advance().value
  } else if (next?.type === 'PROPERTY' && next.value === 'hug') {
    // NEU: 'hug' is alias for 'min' (fit-content)
    ctx.advance()
    node.properties[propName] = 'min'
  } else if (next?.type === 'PROPERTY' && next.value === 'full') {
    // Legacy: 'full' is now equivalent to 'max'
    ctx.advance()
    node.properties[propName] = 'max'
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (tokenValue !== undefined) {
      node.properties[propName] = tokenValue
    } else {
      tryAssignResolvedRef(ctx, node, propName, tokenName)
    }
  } else if (next?.type === 'COMPONENT_NAME' && next.value.includes('.')) {
    tryAssignResolvedRef(ctx, node, propName, ctx.advance().value)
  }
}

/**
 * Helper to check if a token is a sizing keyword (hug, full, min, max)
 */
function isSizingKeyword(token: Token | undefined): boolean {
  if (!token) return false
  if (token.type !== 'PROPERTY') return false
  return ['hug', 'full', 'min', 'max'].includes(token.value)
}

/**
 * Helper to parse a single dimension value (number, percentage, or sizing keyword)
 * Returns the normalized value or undefined if not a valid dimension.
 */
function parseSingleDimensionValue(ctx: ParserContext): string | number | undefined {
  const token = ctx.current()
  if (!token) return undefined

  if (token.type === 'NUMBER') {
    const value = ctx.advance().value
    return value.includes('%') ? value : parseInt(value, 10)
  }

  if (token.type === 'PROPERTY') {
    if (token.value === 'hug' || token.value === 'min') {
      ctx.advance()
      return 'min'
    }
    if (token.value === 'full' || token.value === 'max') {
      ctx.advance()
      return 'max'
    }
  }

  return undefined
}

/**
 * Parse 'size' property - context-dependent based on component type.
 *
 * On Icon components: size → icon-size
 * On Text/Heading components: size → text-size
 * On containers: size → dimensions (width/height)
 *
 * Syntax: size hug 32, size 100 200, size full, size hug, size 16
 */
function parseSizeProperty(ctx: ParserContext, node: ASTNode): void {
  // Check component type for context-dependent behavior
  if (isIconComponent(node)) {
    // Icon: size → icon-size
    const next = ctx.current()
    if (next?.type === 'NUMBER') {
      node.properties['icon-size'] = parseInt(ctx.advance().value, 10)
    } else if (next?.type === 'TOKEN_REF') {
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)
      if (typeof tokenValue === 'number') {
        node.properties['icon-size'] = tokenValue
      } else {
        node.properties['icon-size'] = `$${tokenName}`
      }
    }
    return
  }

  if (isTextComponent(node) || isHeadingComponent(node)) {
    // Text/Heading: size → text-size
    const next = ctx.current()
    if (next?.type === 'NUMBER') {
      node.properties['text-size'] = parseInt(ctx.advance().value, 10)
    } else if (next?.type === 'TOKEN_REF') {
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)
      if (typeof tokenValue === 'number') {
        node.properties['text-size'] = tokenValue
      } else {
        node.properties['text-size'] = `$${tokenName}`
      }
    }
    return
  }

  // Container/default: size → dimensions (width/height)
  // Parse first dimension value (width)
  const widthValue = parseSingleDimensionValue(ctx)
  if (widthValue !== undefined) {
    node.properties['w'] = widthValue

    // Check for second value (height)
    const heightValue = parseSingleDimensionValue(ctx)
    if (heightValue !== undefined) {
      node.properties['h'] = heightValue
    } else {
      // Single value: apply to both dimensions
      // e.g., size hug → width hug, height hug
      // e.g., size 16 → width 16, height 16
      node.properties['h'] = widthValue
    }
  }
}

/**
 * Parse 'text-size', 'ts', 'font-size', or 'fs' property for typography.
 */
function parseTextSizeProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    node.properties['text-size'] = parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    // Use context-aware resolution: fs $lg → tries $lg, then $lg.font.size
    const tokenValue = resolveTokenWithContext(ctx, tokenName, 'text-size')
    if (typeof tokenValue === 'number') {
      node.properties['text-size'] = tokenValue
    } else {
      node.properties['text-size'] = `$${tokenName}`
    }
  }
}

/**
 * Parse 'icon-size' property for icons.
 */
function parseIconSizeProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    node.properties['icon-size'] = parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    // Use context-aware resolution: is $lg → tries $lg, then $lg.icon.size
    const tokenValue = resolveTokenWithContext(ctx, tokenName, 'icon-size')
    if (typeof tokenValue === 'number') {
      node.properties['icon-size'] = tokenValue
    } else {
      node.properties['icon-size'] = `$${tokenName}`
    }
  }
}

/**
 * Parse generic property.
 */
function parseGenericProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()

  // Boolean properties don't consume values - they just get set to true
  // The following token (like a string) should be left for child parsing
  if (BOOLEAN_PROPERTIES.has(propName)) {
    node.properties[propName] = true
    return
  }

  if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
    const rawValue = next.type === 'NUMBER'
      ? parseFloat(ctx.advance().value)
      : ctx.advance().value
    node.properties[propName] = rawValue

    if (ctx.current()?.type === 'TOKEN_DEF') {
      const tokenName = ctx.advance().value
      ctx.designTokens.set(tokenName, rawValue)
    }
  } else if (next?.type === 'STRING') {
    // Handle string values for properties like href, src, placeholder, etc.
    node.properties[propName] = ctx.advance().value
  } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
    node.properties[propName] = ctx.advance().value
  } else if ((next?.type === 'COMPONENT_NAME' || next?.type === 'PROPERTY') && STRING_PROPERTIES.has(propName)) {
    // Handle COMPONENT_NAME or PROPERTY values for string properties (e.g., align center/cen, fit cover)
    node.properties[propName] = ctx.advance().value
  } else if (next?.type === 'TOKEN_REF') {
    const tokenRefToken = ctx.advance()
    const tokenName = tokenRefToken.value

    // Use context-aware token resolution: gap $md → tries $md, then $md.gap
    const tokenValue = resolveTokenWithContext(ctx, tokenName, propName)

    if (tokenValue !== undefined) {
      if (isTokenSequence(tokenValue)) {
        const expandedTokens = ctx.expandTokenSequence((tokenValue as TokenSequence).tokens)
        for (const token of expandedTokens) {
          if (token.type === 'NUMBER') {
            node.properties[propName] = parseFloat(token.value)
            break
          } else if (token.type === 'COLOR') {
            node.properties[propName] = token.value
            break
          } else if (token.type === 'STRING') {
            node.properties[propName] = token.value
            break
          }
        }
      } else {
        node.properties[propName] = tokenValue
      }
    } else {
      // Token not found - try as component property reference
      const resolved = tryAssignResolvedRef(ctx, node, propName, tokenName)
      // If both token and component property lookup failed, report via error collector
      if (!resolved && !tokenName.includes('.')) {
        ctx.addWarning(
          'UNDEFINED_TOKEN',
          `Token "$${tokenName}" is not defined`,
          tokenRefToken
        )
      }
    }
  } else if (next?.type === 'COMPONENT_NAME' && next.value.includes('.')) {
    tryAssignResolvedRef(ctx, node, propName, ctx.advance().value)
  } else {
    node.properties[propName] = true
  }
}

/**
 * Parse data property for data binding.
 * Syntax: data TypeName [where condition]
 * Examples:
 *   data Tasks
 *   data Tasks where done == false
 *   data Users where active == true and role == "admin"
 */
function parseDataProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()

  // Expect a type name (uppercase component name like Tasks, Users)
  if (!next || next.type !== 'COMPONENT_NAME') {
    return
  }

  const typeName = ctx.advance().value

  // Initialize dataBinding
  node.dataBinding = {
    typeName
  }

  // Check for optional 'where' clause
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'where') {
    ctx.advance() // consume 'where'

    // Parse the filter condition
    const filter = parseCondition(ctx)
    if (filter) {
      node.dataBinding.filter = filter
    }
  }
}
