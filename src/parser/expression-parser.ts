/**
 * Expression Parser Module
 *
 * Parses values and expressions including:
 * - Literal values (numbers, strings, booleans, colors)
 * - Variable references ($varName, $obj.prop)
 * - Binary expressions ($count + 1, $x * 2)
 */

import type { ParserContext } from './parser-context'
import type { Expression } from './types'

/**
 * Parse a literal value (number, string, boolean, color, or variable reference).
 */
export function parseValue(ctx: ParserContext): string | number | boolean | null {
  const token = ctx.current()
  if (!token) return null

  if (token.type === 'NUMBER') {
    ctx.advance()
    return parseInt(token.value, 10)
  }
  if (token.type === 'STRING') {
    ctx.advance()
    return token.value
  }
  if (token.type === 'COLOR') {
    ctx.advance()
    return token.value
  }
  if (token.type === 'COMPONENT_NAME') {
    // Could be true, false, or a variable name
    if (token.value === 'true') {
      ctx.advance()
      return true
    }
    if (token.value === 'false') {
      ctx.advance()
      return false
    }
    // Variable reference - return as string
    ctx.advance()
    return token.value
  }
  return null
}

/**
 * Parse an expression: $count, $count + 1, $user.avatar, 42, etc.
 */
export function parseExpression(ctx: ParserContext): Expression | null {
  const token = ctx.current()
  if (!token) return null

  // Variable reference with optional property access
  if (token.type === 'TOKEN_REF') {
    const value = ctx.advance().value
    const parts = value.split('.')

    const expr: Expression = parts.length > 1
      ? { type: 'property_access', path: parts }
      : { type: 'variable', name: parts[0] }

    // Check for arithmetic operator
    if (ctx.current()?.type === 'ARITHMETIC') {
      const operator = ctx.advance().value as '+' | '-' | '*' | '/'
      const right = parseExpression(ctx)
      if (right) {
        return { type: 'binary', operator, left: expr, right }
      }
    }
    return expr
  }

  // Literal number
  if (token.type === 'NUMBER') {
    const value = parseInt(ctx.advance().value, 10)
    const expr: Expression = { type: 'literal', value }

    // Check for arithmetic operator
    if (ctx.current()?.type === 'ARITHMETIC') {
      const operator = ctx.advance().value as '+' | '-' | '*' | '/'
      const right = parseExpression(ctx)
      if (right) {
        return { type: 'binary', operator, left: expr, right }
      }
    }
    return expr
  }

  // Literal string
  if (token.type === 'STRING') {
    return { type: 'literal', value: ctx.advance().value }
  }

  // Boolean literals
  if (token.type === 'COMPONENT_NAME' && (token.value === 'true' || token.value === 'false')) {
    return { type: 'literal', value: ctx.advance().value === 'true' }
  }

  // Component property access: ComponentName.property (e.g., Email.value)
  // This is handled at parse time by looking for a COMPONENT_NAME that contains a dot
  // The lexer doesn't split it, so we handle it here
  if (token.type === 'COMPONENT_NAME' && token.value.includes('.')) {
    const value = ctx.advance().value
    const [componentName, ...propertyParts] = value.split('.')
    const propertyName = propertyParts.join('.')
    return {
      type: 'component_property',
      componentName,
      propertyName
    }
  }

  return null
}
