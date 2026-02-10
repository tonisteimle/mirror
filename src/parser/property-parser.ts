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

/**
 * Resolve a component property reference like "Card.pad" or "$Card.pad".
 * Returns the resolved value or undefined if not found.
 */
function resolveComponentPropertyRef(
  ctx: ParserContext,
  refValue: string
): string | number | boolean | undefined {
  const parts = refValue.split('.')
  if (parts.length < 2) return undefined

  const componentName = parts[0].startsWith('$') ? parts[0].slice(1) : parts[0]
  const propPath = parts.slice(1).join('_')
  const compTemplate = ctx.registry.get(componentName)

  if (compTemplate) {
    return compTemplate.properties[propPath]
  }
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
 * Parse a property and its value.
 */
export function parsePropertyValue(ctx: ParserContext, node: ASTNode): void {
  const propName = ctx.advance().value

  // Special handling for pad/mar with directions or CSS shorthand
  if (propName === 'pad' || propName === 'mar') {
    parsePadMarProperty(ctx, node, propName)
  } else if (propName === 'bor') {
    parseBorderProperty(ctx, node)
  } else if (propName === 'hor' || propName === 'ver') {
    parseLayoutProperty(ctx, node, propName)
  } else if (propName === 'cen') {
    parseCenterProperty(ctx, node)
  } else if (propName === 'icon' || propName === 'font') {
    parseStringProperty(ctx, node, propName)
  } else if (propName === 'fit') {
    parseFitProperty(ctx, node)
  } else if (propName === 'w' || propName === 'h') {
    parseDimensionProperty(ctx, node, propName)
  } else {
    parseGenericProperty(ctx, node, propName)
  }
}

/**
 * Parse pad/mar property with directions and CSS shorthand.
 */
function parsePadMarProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const directions: string[] = []

  while (ctx.current()?.type === 'DIRECTION') {
    directions.push(...splitDirections(ctx.advance().value))
  }

  const values: number[] = []
  while (ctx.current()?.type === 'NUMBER') {
    values.push(parseInt(ctx.advance().value, 10))
    if (values.length === 1 && ctx.current()?.type === 'TOKEN_DEF') {
      const tokenName = ctx.advance().value
      ctx.designTokens.set(tokenName, values[0])
    }
  }

  // Handle token references
  if (values.length === 0 && directions.length === 0 && ctx.current()?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)

    if (tokenValue !== undefined && isTokenSequence(tokenValue)) {
      const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
      applyTokenSequenceSpacing(expandedTokens, node, propName)
      return
    } else if (typeof tokenValue === 'number') {
      values.push(tokenValue)
    } else if (tokenValue === undefined) {
      const resolved = resolveComponentPropertyRef(ctx, tokenName)
      if (typeof resolved === 'number') {
        values.push(resolved)
      }
    }
  }

  // Handle component property reference without $: Card.pad
  if (values.length === 0 && directions.length === 0 &&
      ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()!.value.includes('.')) {
    const resolved = resolveComponentPropertyRef(ctx, ctx.advance().value)
    if (typeof resolved === 'number') {
      values.push(resolved)
    }
  }

  // Apply values to properties
  applySpacingToProperties(node.properties, propName, values, directions)
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
         ctx.current()!.type !== 'COMPONENT_NAME' &&
         ctx.current()!.type !== 'STRING') {
    const token = ctx.current()!

    if (token.type === 'DIRECTION') {
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
 * Parse center property.
 * Exported for use in definition-parser.ts.
 */
export function parseCenterProperty(ctx: ParserContext, node: { properties: Record<string, unknown> }): void {
  node.properties['align_main'] = 'cen'
  const next = ctx.current()
  if (next?.type === 'PROPERTY' && next.value === 'cen') {
    ctx.advance()
    node.properties['align_cross'] = 'cen'
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
 * Parse fit property.
 */
function parseFitProperty(ctx: ParserContext, node: ASTNode): void {
  const next = ctx.current()
  if (next?.type === 'COMPONENT_NAME' || next?.type === 'STRING') {
    node.properties['fit'] = ctx.advance().value
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
      const resolved = resolveComponentPropertyRef(ctx, tokenName)
      if (resolved !== undefined) {
        node.properties[propName] = resolved
      }
    }
  } else if (next?.type === 'COMPONENT_NAME' && next.value.includes('.')) {
    const resolved = resolveComponentPropertyRef(ctx, ctx.advance().value)
    if (resolved !== undefined) {
      node.properties[propName] = resolved
    }
  }
}

/**
 * Parse generic property.
 */
function parseGenericProperty(ctx: ParserContext, node: ASTNode, propName: string): void {
  const next = ctx.current()

  if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
    const rawValue = next.type === 'NUMBER'
      ? parseInt(ctx.advance().value, 10)
      : ctx.advance().value
    node.properties[propName] = rawValue

    if (ctx.current()?.type === 'TOKEN_DEF') {
      const tokenName = ctx.advance().value
      ctx.designTokens.set(tokenName, rawValue)
    }
  } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
    node.properties[propName] = ctx.advance().value
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)

    if (tokenValue !== undefined) {
      if (isTokenSequence(tokenValue)) {
        const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
        for (const token of expandedTokens) {
          if (token.type === 'NUMBER') {
            node.properties[propName] = parseInt(token.value, 10)
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
      const resolved = resolveComponentPropertyRef(ctx, tokenName)
      if (resolved !== undefined) {
        node.properties[propName] = resolved
      }
    }
  } else if (next?.type === 'COMPONENT_NAME' && next.value.includes('.')) {
    const resolved = resolveComponentPropertyRef(ctx, ctx.advance().value)
    if (resolved !== undefined) {
      node.properties[propName] = resolved
    }
  } else {
    node.properties[propName] = true
  }
}
