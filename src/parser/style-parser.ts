/**
 * Style Parser Module
 *
 * Parses style-related constructs:
 * - Style groups: (hor cen gap 8)
 * - Style mixins: (hor cen gap 8):styleName
 * - Applying styles to nodes
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, StyleMixin } from './types'
import { splitDirections } from './parser-utils'

/**
 * Parse properties inside parentheses for style mixins.
 */
export function parseStyleGroup(ctx: ParserContext): StyleMixin {
  const mixin: StyleMixin = { properties: {}, modifiers: [] }

  while (ctx.current() && ctx.current()!.type !== 'PAREN_CLOSE' && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    if (token.type === 'MODIFIER') {
      mixin.modifiers.push(ctx.advance().value)
    } else if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value

      // Handle property values similar to main parser
      if (propName === 'pad' || propName === 'mar' || propName === 'bor') {
        const directions: string[] = []
        while (ctx.current()?.type === 'DIRECTION') {
          directions.push(...splitDirections(ctx.advance().value))
        }

        // Collect all number values (for CSS shorthand)
        const values: number[] = []
        while (ctx.current()?.type === 'NUMBER') {
          values.push(parseInt(ctx.advance().value, 10))
        }

        const prefix = propName

        if (values.length > 0) {
          if (directions.length > 0) {
            for (const dir of directions) {
              mixin.properties[`${prefix}_${dir}`] = values[0]
            }
          } else if (values.length === 1) {
            mixin.properties[propName] = values[0]
          } else if (values.length === 2) {
            mixin.properties[`${prefix}_u`] = values[0]
            mixin.properties[`${prefix}_d`] = values[0]
            mixin.properties[`${prefix}_l`] = values[1]
            mixin.properties[`${prefix}_r`] = values[1]
          } else if (values.length === 3) {
            mixin.properties[`${prefix}_u`] = values[0]
            mixin.properties[`${prefix}_l`] = values[1]
            mixin.properties[`${prefix}_r`] = values[1]
            mixin.properties[`${prefix}_d`] = values[2]
          } else if (values.length >= 4) {
            mixin.properties[`${prefix}_u`] = values[0]
            mixin.properties[`${prefix}_r`] = values[1]
            mixin.properties[`${prefix}_d`] = values[2]
            mixin.properties[`${prefix}_l`] = values[3]
          }
        }
      } else if (propName === 'hor' || propName === 'ver') {
        mixin.properties[propName] = true
        const next = ctx.current()
        if (next?.type === 'DIRECTION') {
          mixin.properties['align_main'] = ctx.advance().value
        } else if (next?.type === 'PROPERTY' && (next.value === 'cen' || next.value === 'between')) {
          mixin.properties['align_main'] = ctx.advance().value
        }
        const cross = ctx.current()
        if (cross?.type === 'DIRECTION') {
          mixin.properties['align_cross'] = ctx.advance().value
        } else if (cross?.type === 'PROPERTY' && cross.value === 'cen') {
          mixin.properties['align_cross'] = ctx.advance().value
        }
      } else if (propName === 'cen') {
        mixin.properties['align_main'] = 'cen'
        if (ctx.current()?.type === 'PROPERTY' && ctx.current()!.value === 'cen') {
          ctx.advance()
          mixin.properties['align_cross'] = 'cen'
        }
      } else {
        const next = ctx.current()
        if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
          mixin.properties[propName] = next.type === 'NUMBER'
            ? parseInt(ctx.advance().value, 10)
            : ctx.advance().value
        } else {
          mixin.properties[propName] = true
        }
      }
    } else {
      break
    }
  }

  return mixin
}

/**
 * Apply a style mixin to a node.
 */
export function applyMixin(node: ASTNode, mixin: StyleMixin): void {
  for (const [key, value] of Object.entries(mixin.properties)) {
    if (!(key in node.properties)) {
      node.properties[key] = value
    }
  }
  for (const mod of mixin.modifiers) {
    if (!node.modifiers.includes(mod)) {
      node.modifiers.push(mod)
    }
  }
}
