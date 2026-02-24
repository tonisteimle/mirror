/**
 * @module style-parser
 * @description Style Group und Mixin Parser
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Style-Gruppen und Mixins in Klammern
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STYLE GROUPS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Style Group (anonymes Mixin)
 *   Button (hor cen gap 8) "Click"
 *          ↑──────────────↑
 *          Properties werden direkt angewendet
 *
 * @syntax Named Style Mixin
 *   (hor cen gap 8):centered
 *   Button centered "Click"    // Mixin wird referenziert
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPPORTED PROPERTIES IN GROUPS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @property pad, mar, bor
 *   Mit CSS-Shorthand: (pad 16 8)
 *   Mit Directions: (pad l-r 16)
 *
 * @property hor, ver
 *   Layout Direction: (hor) oder (ver)
 *   Mit Alignment: (hor cen) oder (hor l cen)
 *
 * @property cen
 *   Center Shorthand: (cen cen) = beide Achsen
 *
 * @property gap, bg, col, rad, etc.
 *   Standard Properties mit Werten
 *
 * @property boolean
 *   Properties ohne Wert: (wrap) = wrap: true
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseStyleGroup(ctx) → StyleMixin
 *   Parst Properties zwischen ( und )
 *   Gibt StyleMixin { properties: {...} } zurück
 *
 * @function applyMixin(node, mixin)
 *   Wendet Mixin-Properties auf Node an
 *   Überschreibt NICHT existierende Properties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIELE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Inline Style Group
 *   Box (hor cen gap 16) "Content"
 *   → hor: true, align_main: 'cen', gap: 16
 *
 * @example Named Mixin Definition
 *   (ver pad 24 gap 16):section
 *   Section section "First"
 *   Section section "Second"
 *
 * @example CSS Shorthand in Group
 *   (pad 16 8):padded
 *   → pad_u: 16, pad_d: 16, pad_l: 8, pad_r: 8
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, StyleMixin } from './types'
import { splitDirections } from './parser-utils'

/**
 * Parse properties inside parentheses for style mixins.
 */
export function parseStyleGroup(ctx: ParserContext): StyleMixin {
  const mixin: StyleMixin = { properties: {} }

  while (ctx.current() && ctx.current()!.type !== 'PAREN_CLOSE' && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    if (token.type === 'PROPERTY') {
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
}
