/**
 * @module sugar/handlers/token-handler
 * @description Token Handler - Token-Referenzen zu Properties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Verarbeitet TOKEN_REF Tokens mit Property-Inferenz aus Suffix
 *
 * @example
 *   $default-pad   → pad: <token value>
 *   $primary-col   → col: <token value>
 *   $card-bg       → bg: <token value>
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INFERENZ-LOGIK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @step 1 Name-basierte Inferenz
 *   -pad, -padding, -spacing → pad
 *   -col → col
 *   -bg, -background, -color → bg
 *   -rad, -radius → rad
 *   etc.
 *
 * @step 2 Value-basierte Inferenz (Fallback)
 *   Wenn Name-Inferenz fehlschlägt:
 *   - Farbwert (#..., rgb(), hsl()) → col
 *
 * @step 3 Token-Sequences
 *   Für Spacing-Tokens: Sequence expandieren
 *   $spacing: 16 8 → pad_u: 16, pad_d: 16, pad_l: 8, pad_r: 8
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WARNINGS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @warning S006 - Token ohne Property-Inferenz
 *   Token existiert aber Property nicht ableitbar
 *   Hint: Suffix hinzufügen oder explizite Property
 *
 * @warning S001 - Undefinierter Token
 *   Token $name ist nicht definiert
 *   Ausnahme: $item.field (Iterator-Variablen) → kein Warning
 *
 * @used-by sugar/index.ts
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import type { Expression } from '../../types'
import { isTokenSequence } from '../../types'
import { inferPropertyFromTokenName, isColorValue } from '../../property-inference'
import { applyTokenSequenceSpacing } from '../../property-parser'
import { isTextComponent, isItemComponent } from '../component-type-matcher'

/**
 * Token reference handler.
 * Infers property from token name suffix and applies the value.
 */
export const tokenHandler: SugarHandler = {
  name: 'token-ref',
  priority: 100,
  tokenTypes: ['TOKEN_REF'],

  canHandle(_context: SugarContext): boolean {
    // Always try to handle TOKEN_REF tokens
    return true
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, token } = context
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    let inferredProp = inferPropertyFromTokenName(tokenName)

    // Value-based inference: if name inference fails, check if value is a color
    if (!inferredProp && tokenValue !== undefined) {
      if (typeof tokenValue === 'string' && isColorValue(tokenValue)) {
        inferredProp = 'col'
      }
    }

    if (inferredProp && tokenValue !== undefined) {
      // Apply the token value to the inferred property
      if (isTokenSequence(tokenValue)) {
        // For spacing tokens (pad, mar, bor), expand the sequence
        if (inferredProp === 'pad' || inferredProp === 'mar') {
          const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
          applyTokenSequenceSpacing(expandedTokens, node, inferredProp)
        } else {
          // For other properties, extract the first value
          const expandedTokens = ctx.expandTokenSequence(tokenValue.tokens)
          for (const t of expandedTokens) {
            if (t.type === 'NUMBER') {
              node.properties[inferredProp] = parseInt(t.value, 10)
              break
            } else if (t.type === 'COLOR') {
              node.properties[inferredProp] = t.value
              break
            }
          }
        }
      } else {
        node.properties[inferredProp] = tokenValue
      }
      return { handled: true }
    }

    if (tokenValue !== undefined && !inferredProp) {
      // Token exists but couldn't infer property - warn with helpful hint
      ctx.addWarning(
        'S006',
        `Token "$${tokenName}" used without property - couldn't infer from name`,
        token,
        `Add a suffix like '-col', '-pad', '-rad', or use: col $${tokenName}`
      )
      return { handled: true }
    }

    // Token not found - check if it's a runtime variable (contains '.')
    // Property access tokens like $item.name are runtime variables from iterators
    if (tokenName.includes('.')) {
      // For Text-like components, set the runtime variable as contentExpression
      const isText = isTextComponent(node)
      const isItem = isItemComponent(node)
      if (isText || isItem) {
        const parts = tokenName.split('.')
        const expr: Expression = {
          type: 'property_access',
          path: parts
        }
        node.contentExpression = expr
        // Clear any _text children inherited from template - dynamic content takes precedence
        node.children = node.children.filter(child => child.name !== '_text')
      }
      // For other components, the variable is silently ignored (might be used elsewhere)
      return { handled: true }
    }

    // Simple token not defined - warn
    ctx.addWarning(
      'S001',
      `Token "$${tokenName}" is not defined`,
      token,
      `Define it with: $${tokenName}: <value>`
    )
    return { handled: true }
  }
}
