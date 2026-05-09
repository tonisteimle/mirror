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
import { inferTokenTypeFromSuffix as inferTypeFromCanonicalSuffix } from '../schema/token-suffixes'

const U = ParserUtils

/**
 * Convert a Mirror NUMBER/STRING/IDENTIFIER token to its primitive value.
 *
 * Edge cases (preserved from the original parser implementation):
 * - NUMBER tokens starting with `#` (hex colors lexed as NUMBER) stay as string
 * - NUMBER tokens that fail parseFloat fall back to the raw string value
 * - The boolean identifiers `true` / `false` become real booleans
 */
function parseTokenValue(token: Token): string | number | boolean {
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

/**
 * Read additional value tokens that sit on the same line after the first.
 * Used by token forms whose property accepts multiple values, e.g.
 * `btn.pad: 10 16` (CSS shorthand padding-y / padding-x). Returns the joined
 * string (`"10 16"`) plus how many extra tokens were consumed; if there is no
 * trailing value, returns `null` so the caller keeps the scalar.
 */
function readTrailingValues(
  ctx: ParserContext,
  first: Token
): { joined: string; consumed: number } | null {
  const VALUE_TYPES: ReadonlyArray<Token['type']> = ['NUMBER', 'IDENTIFIER', 'STRING']
  const parts: string[] = [String(first.value)]
  let consumed = 0
  while (true) {
    const next = ctx.tokens[ctx.pos + consumed]
    if (!next) break
    if (!VALUE_TYPES.includes(next.type)) break
    parts.push(next.value)
    consumed++
  }
  if (consumed === 0) return null
  // Advance past the trailing tokens we just claimed.
  ctx.pos += consumed
  return { joined: parts.join(' '), consumed }
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

/** Infer token type from a bare `.suffix` (e.g. `bg` → color, `pad` → size). */
function inferTypeFromSuffix(suffix: string): 'color' | 'size' | 'font' | 'icon' {
  // Schema-canonical helper expects a leading dot.
  return inferTypeFromCanonicalSuffix('.' + suffix) ?? 'color'
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
  const trailing = readTrailingValues(ctx, value)

  const fullName = stripDollar(nameToken.value)
  const dotIndex = fullName.lastIndexOf('.')
  const suffix = dotIndex > 0 ? fullName.slice(dotIndex + 1) : ''

  return {
    type: 'Token',
    name: fullName,
    tokenType: inferTypeFromSuffix(suffix),
    value: trailing ? trailing.joined : parseTokenValue(value),
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
  const trailing = readTrailingValues(ctx, value)

  const fullName = `${stripDollar(baseName.value)}.${suffix.value}`

  return {
    type: 'Token',
    name: fullName,
    tokenType: inferTypeFromSuffix(suffix.value),
    value: trailing ? trailing.joined : parseTokenValue(value),
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

  // Infer type from any embedded suffix in the name (canonical helper).
  const dotIndex = name.lastIndexOf('.')
  const suffix = dotIndex > 0 ? name.slice(dotIndex) : ''
  const tokenType = inferTypeFromCanonicalSuffix(suffix) ?? 'color'

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
