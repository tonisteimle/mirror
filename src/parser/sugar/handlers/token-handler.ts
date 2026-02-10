/**
 * Token Reference Handler
 *
 * Handles TOKEN_REF tokens as implicit property assignments.
 * Infers property name from token name suffix.
 * Example: $default-pad -> pad: <token value>
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import { isTokenSequence } from '../../types'
import { inferPropertyFromTokenName } from '../../property-inference'
import { applyTokenSequenceSpacing } from '../../property-parser'

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
    const inferredProp = inferPropertyFromTokenName(tokenName)

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
      // Token exists but couldn't infer property - warn
      ctx.errors.push(
        `Warning: Line ${token.line + 1}: Token "$${tokenName}" used without property - couldn't infer from name`
      )
      return { handled: true }
    }

    // Token not found - warn only for simple tokens (not property access like $item.name)
    // Property access tokens (containing '.') are runtime variables from iterators
    if (!tokenName.includes('.')) {
      ctx.errors.push(
        `Warning: Line ${token.line + 1}: Token "$${tokenName}" not defined`
      )
    }
    return { handled: true }
  }
}
