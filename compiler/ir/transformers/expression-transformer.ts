/**
 * Expression Transformer
 *
 * Pure utility functions for building and transforming JavaScript expressions.
 * Handles expression string building from parts and operators.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type { TokenReference, LoopVarReference } from '../../parser/ast'

// =============================================================================
// Types
// =============================================================================

/**
 * Expression part type - operands in computed expressions.
 * Can be a literal string/number or a reference (token or loop variable).
 */
export type ExpressionPart = string | number | TokenReference | LoopVarReference

// =============================================================================
// Expression Building
// =============================================================================

/**
 * Build a JavaScript expression string from parts and operators.
 *
 * Parts may include parentheses for grouping. Operators are placed between
 * actual operands (not between a paren and an operand).
 *
 * @example
 * buildExpressionString(["Hello ", {kind:'token', name:'name'}], ["+"])
 * // → '"Hello " + $name'
 *
 * @example
 * buildExpressionString(["Summe: €", "(", {kind:'token', name:'count'}, {kind:'token', name:'price'}, ")"], ["+", "*"])
 * // → '"Summe: €" + ($count * $price)'
 */
export function buildExpressionString(parts: ExpressionPart[], operators: string[]): string {
  const result: string[] = []
  let opIndex = 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const prev = i > 0 ? parts[i - 1] : null
    const isOpenParen = typeof part === 'string' && part === '('
    const isCloseParen = typeof part === 'string' && part === ')'
    const prevIsOpenParen = typeof prev === 'string' && prev === '('

    // Add operator before this part (if needed)
    // We add an operator when:
    // - There's a previous part
    // - The previous part is NOT an opening paren
    // - This part is NOT a closing paren
    if (i > 0 && !prevIsOpenParen && !isCloseParen && opIndex < operators.length) {
      result.push(` ${operators[opIndex++]} `)
    }

    // Add the part
    if (typeof part === 'object' && part.kind === 'token') {
      result.push(`$${part.name}`)
    } else if (typeof part === 'object' && part.kind === 'loopVar') {
      // Loop variable reference - use special marker for backend
      result.push(`__loopVar:${part.name}`)
    } else if (typeof part === 'string') {
      if (part === '(' || part === ')') {
        result.push(part)
      } else {
        result.push(`"${part}"`)
      }
    } else if (typeof part === 'number') {
      result.push(String(part))
    } else {
      result.push(String(part))
    }
  }

  return result.join('')
}
