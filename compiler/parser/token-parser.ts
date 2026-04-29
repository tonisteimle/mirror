/**
 * Token Definition Parser
 *
 * Parses Mirror token definitions in their five DSL forms:
 *   primary.bg: #2271C1                  (suffix, single lexer token)
 *   primary . bg: #2271C1                (suffix, three lexer tokens)
 *   accent.bg: $primary                  (token reference)
 *   simple: 42                           (no suffix, infer type from value)
 *   primary: color = #fff                (legacy assign-style)
 *
 * Extracted from parser.ts (Phase 5 — first incremental cut). All five
 * functions are pure — they take a ParserContext, advance pos, and return
 * a TokenDefinition. No circular dependencies, no shared state beyond ctx.
 */

import type { Token } from './lexer'
import type { TokenDefinition } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'

const U = ParserUtils

/** Suffixes that map a token to size semantics. */
const SIZE_SUFFIXES = new Set(['pad', 'gap', 'margin', 'rad'])

/**
 * Convert a Mirror NUMBER/STRING/IDENTIFIER token to its primitive value.
 *
 * Edge cases (preserved from the original parser implementation):
 * - NUMBER tokens starting with `#` (hex colors lexed as NUMBER) stay as string
 * - NUMBER tokens that fail parseFloat fall back to the raw string value
 * - The boolean identifiers `true` / `false` become real booleans
 */
export function parseTokenValue(token: Token): string | number | boolean {
  if (token.type === 'NUMBER') {
    if (token.value.startsWith('#')) return token.value
    const num = parseFloat(token.value)
    return isNaN(num) ? token.value : num
  }
  if (token.type === 'IDENTIFIER' && (token.value === 'true' || token.value === 'false')) {
    return token.value === 'true'
  }
  return token.value
}

/** Infer token type from raw value (color #hex, size 12, font "Inter"). */
export function inferTokenType(
  value: string | number
): 'color' | 'size' | 'font' | 'icon' | undefined {
  const str = String(value)
  if (str.startsWith('#')) return 'color'
  if (/^\d+(%|px|rem|em)?$/.test(str)) return 'size'
  if (typeof value === 'string' && !str.startsWith('#') && !/^\d/.test(str)) return 'font'
  return undefined
}

/** Infer token type from a `.suffix` (e.g. `.bg` → color, `.pad` → size). */
function inferTypeFromSuffix(suffix: string): 'color' | 'size' | 'font' | 'icon' {
  if (SIZE_SUFFIXES.has(suffix)) return 'size'
  if (suffix === 'font') return 'font'
  return 'color'
}

/** Strip a leading `$` (legacy syntax kept for backwards compatibility). */
function stripDollar(name: string): string {
  return name.startsWith('$') ? name.slice(1) : name
}

/**
 * Simplest form: `name: value` (no suffix). Type is inferred from value.
 *
 *   primaryColor: #2271C1
 *   maxWidth: 1024
 *   fontFamily: "Inter"
 */
export function parseTokenDefinition(ctx: ParserContext, section?: string): TokenDefinition | null {
  const name = U.advance(ctx)
  U.advance(ctx) // :
  const value = U.advance(ctx)

  return {
    type: 'Token',
    name: name.value,
    tokenType: inferTokenType(value.value),
    value: parseTokenValue(value),
    section,
    line: name.line,
    column: name.column,
  }
}

/**
 * Suffix syntax where the lexer emits `primary.bg` as ONE token.
 *
 *   primary.bg: #2271C1
 *   $primary.bg: #2271C1   (legacy `$` prefix, stripped on definition)
 */
export function parseTokenWithSuffixSingleToken(
  ctx: ParserContext,
  section?: string
): TokenDefinition | null {
  const nameToken = U.advance(ctx) // `primary.bg`
  U.advance(ctx) // :
  const value = U.advance(ctx)

  const fullName = stripDollar(nameToken.value)
  const dotIndex = fullName.lastIndexOf('.')
  const suffix = dotIndex > 0 ? fullName.slice(dotIndex + 1) : ''

  return {
    type: 'Token',
    name: fullName,
    tokenType: inferTypeFromSuffix(suffix),
    value: parseTokenValue(value),
    section,
    line: nameToken.line,
    column: nameToken.column,
  }
}

/**
 * Suffix syntax where the lexer emits `primary . bg` as THREE tokens.
 * Same semantics as `parseTokenWithSuffixSingleToken`, different lexer shape.
 */
export function parseTokenWithSuffix(ctx: ParserContext, section?: string): TokenDefinition | null {
  const baseName = U.advance(ctx)
  U.advance(ctx) // .
  const suffix = U.advance(ctx)
  U.advance(ctx) // :
  const value = U.advance(ctx)

  const fullName = `${stripDollar(baseName.value)}.${suffix.value}`

  return {
    type: 'Token',
    name: fullName,
    tokenType: inferTypeFromSuffix(suffix.value),
    value: parseTokenValue(value),
    section,
    line: baseName.line,
    column: baseName.column,
  }
}

/**
 * Token reference: a token whose value is *another* token.
 *
 *   accent.bg: $primary
 *   $accent.bg: $primary   (legacy `$` prefix on definition, stripped)
 */
export function parseTokenReference(ctx: ParserContext, section?: string): TokenDefinition | null {
  const nameToken = U.advance(ctx) // `accent.bg` (or `$accent.bg`)
  U.advance(ctx) // :
  const value = U.advance(ctx) // `$primary`

  const name = stripDollar(nameToken.value)

  // Infer type from any embedded suffix in the name.
  let tokenType: 'color' | 'size' | 'font' | 'icon' = 'color'
  if (name.includes('.pad') || name.includes('.gap') || name.includes('.margin')) {
    tokenType = 'size'
  } else if (name.includes('.rad')) {
    tokenType = 'size'
  } else if (name.includes('.font')) {
    tokenType = 'font'
  }

  return {
    type: 'Token',
    name,
    tokenType,
    value: value.value,
    section,
    line: nameToken.line,
    column: nameToken.column,
  }
}

/**
 * Legacy assign-style syntax (kept for backwards compatibility):
 *
 *   primary: color = #2271C1
 *   maxWidth: size = 1024
 */
export function parseLegacyTokenDefinition(
  ctx: ParserContext,
  section?: string
): TokenDefinition | null {
  const name = U.advance(ctx)
  U.advance(ctx) // :
  const tokenType = U.advance(ctx)
  U.advance(ctx) // =
  const value = U.advance(ctx)

  return {
    type: 'Token',
    name: name.value,
    tokenType: tokenType.value as 'color' | 'size' | 'font' | 'icon',
    value: parseTokenValue(value),
    section,
    line: name.line,
    column: name.column,
  }
}
