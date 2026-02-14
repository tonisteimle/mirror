/**
 * Property Parser Module
 *
 * Parses property values from DSL tokens.
 * Handles:
 * - pad/mar with directions and CSS shorthand
 * - bor with compound syntax
 * - hor/ver with alignment
 * - Token references and component property references
 */

import type { ParserContext } from './parser-context'
import type { ASTNode } from './types'
import { isTokenSequence } from './types'
import type { Token } from './lexer'
import { CSS_COLOR_KEYWORDS, splitDirections, applySpacingToProperties } from './parser-utils'
import { STRING_PROPERTIES, BOOLEAN_PROPERTIES } from '../dsl/properties'
import { parseCondition } from './condition-parser'

/**
 * Resolve a component property reference like "Card.pad" or "$Card.pad".
 * Returns the resolved value or undefined if not found.
 * Logs warnings when references cannot be resolved.
 */
function resolveComponentPropertyRef(
  ctx: ParserContext,
  refValue: string
): string | number | boolean | undefined {
  const parts = refValue.split('.')
  if (parts.length < 2) return undefined

  const componentName = parts[0].startsWith('$') ? parts[0].slice(1) : parts[0]
  const compTemplate = ctx.registry.get(componentName)

  if (!compTemplate) {
    // Only warn if it looks like an intentional component reference
    // (starts with uppercase letter)
    if (/^[A-Z]/.test(componentName)) {
      console.warn(`Component property reference failed: "${componentName}" is not defined. Reference: "${refValue}"`)
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
  console.warn(`Component property reference failed: "${componentName}" has no property "${parts.slice(1).join('.')}". Available properties: ${Object.keys(compTemplate.properties).join(', ') || 'none'}`)
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
 * @param ctx Parser context
 * @param tokenName Name of the token to look up
 * @param warnOnMissing Whether to warn if the token is not found
 * @returns The token value or undefined
 */
function lookupToken(
  ctx: ParserContext,
  tokenName: string,
  warnOnMissing: boolean = false
): unknown {
  const value = ctx.designTokens.get(tokenName)
  if (value === undefined && warnOnMissing) {
    // Only warn if it doesn't look like a component property reference
    if (!tokenName.includes('.')) {
      console.warn(`Token reference failed: "$${tokenName}" is not defined`)
    }
  }
  return value
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
 * Parse a property and its value.
 */
export function parsePropertyValue(ctx: ParserContext, node: ASTNode): void {
  const propName = ctx.advance().value

  // Special handling for spacing with directions or CSS shorthand (both forms)
  if (propName === 'pad' || propName === 'padding' || propName === 'mar' || propName === 'margin') {
    parsePadMarProperty(ctx, node, propName)
  } else if (propName === 'bor' || propName === 'border') {
    parseBorderProperty(ctx, node)
  } else if (propName === 'hor' || propName === 'horizontal' || propName === 'ver' || propName === 'vertical') {
    parseLayoutProperty(ctx, node, propName)
  } else if (propName === 'cen' || propName === 'center') {
    parseCenterProperty(ctx, node)
  } else if (propName === 'rad' || propName === 'radius') {
    parseRadiusProperty(ctx, node)
  } else if (propName === 'icon' || propName === 'font') {
    parseStringProperty(ctx, node, propName)
  } else if (propName === 'fit') {
    parseFitProperty(ctx, node)
  } else if (propName === 'w' || propName === 'width' || propName === 'h' || propName === 'height') {
    parseDimensionProperty(ctx, node, propName)
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
 * Parse pad/mar property with directions and CSS shorthand.
 * Supports multiple direction+value pairs: pad t-b 8 l-r 16
 */
function parsePadMarProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  let hasAppliedAny = false

  // Handle token references first (before any directions or numbers)
  if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)

    if (tokenValue !== undefined && isTokenSequence(tokenValue)) {
      const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
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

  // Parse direction+value pairs or CSS shorthand
  // Support both: "pad 8 16" (CSS shorthand) and "pad t-b 8 l-r 16" (direction pairs)
  while (ctx.current() &&
         ctx.current()!.type !== 'NEWLINE' &&
         ctx.current()!.type !== 'EOF' &&
         ctx.current()!.type !== 'PROPERTY' &&
         ctx.current()!.type !== 'COMPONENT_NAME' &&
         ctx.current()!.type !== 'STRING' &&
         ctx.current()!.type !== 'COLOR' &&
         ctx.current()!.type !== 'COMMA') {
    const token = ctx.current()!

    if (token.type === 'DIRECTION') {
      // Collect directions
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
  node.properties[propName] = true

  const next = ctx.current()
  if (next?.type === 'DIRECTION') {
    node.properties['align_main'] = ctx.advance().value
  } else if (next?.type === 'PROPERTY' && (next.value === 'cen' || next.value === 'between')) {
    node.properties['align_main'] = ctx.advance().value
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

    // Anything else, break
    break
  }

  // Store parsed grid values
  if (isAutoFill && columns.length === 1) {
    // Auto-fill: grid auto 250 → repeat(auto-fill, minmax(250px, 1fr))
    node.properties['grid'] = `auto ${columns[0]}`
  } else if (columns.length === 1 && !columns[0].includes('%')) {
    // Single number without % means column count: grid 4
    node.properties['grid'] = columns[0]
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
  // Accept COMPONENT_NAME (pointer, auto, grab), ANIMATION (none), or STRING
  if (next?.type === 'COMPONENT_NAME' || next?.type === 'ANIMATION' || next?.type === 'STRING') {
    node.properties[propName] = ctx.advance().value
  } else {
    // Boolean - just the property name without value
    node.properties[propName] = true
  }
}

/**
 * Parse radius property.
 * Supports CSS shorthand: rad 8 (all corners) or rad 8 8 0 0 (top-left, top-right, bottom-right, bottom-left)
 */
function parseRadiusProperty(ctx: ParserContext, node: ASTNode): void {
  const values: number[] = []

  // Handle component property reference: Card.rad
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()!.value.includes('.')) {
    if (tryAssignResolvedRef(ctx, node, 'rad', ctx.advance().value)) {
      return
    }
  }

  // Handle token reference: $radius
  if (ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (typeof tokenValue === 'number') {
      node.properties['rad'] = tokenValue
      return
    }
    // Try component property reference from token: $Card.rad
    if (tryAssignResolvedRef(ctx, node, 'rad', tokenName)) {
      return
    }
  }

  // Collect all consecutive numbers
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
 * Parse dimension property (w/h).
 */
function parseDimensionProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    node.properties[propName] = parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'PROPERTY' && next.value === 'full') {
    node.properties[propName] = ctx.advance().value
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
  } else if (next?.type === 'COMPONENT_NAME' && STRING_PROPERTIES.has(propName)) {
    // Handle COMPONENT_NAME values for string properties (e.g., align center, fit cover)
    node.properties[propName] = ctx.advance().value
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)

    if (tokenValue !== undefined) {
      if (isTokenSequence(tokenValue)) {
        const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
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
      // If both token and component property lookup failed, warn
      if (!resolved && !tokenName.includes('.')) {
        console.warn(`Token reference failed: "$${tokenName}" is not defined`)
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
