/**
 * @module parser/preprocessor
 * @description Preprocessor that converts Mirror DSL to canonical form
 *
 * This is the first step in the parsing pipeline:
 * User Input → PREPROCESSOR → Canonical Form → Parser → AST
 *
 * The preprocessor handles:
 * - Short form → Long form property names (pad → padding)
 * - Direction normalization (l → left, tl → top-left)
 * - Inline → Block syntax conversion
 * - Implicit property expansion (Box 300 → Box width 300)
 * - CSS shorthand expansion (padding 16 8 → padding top 16, ...)
 * - Indent normalization (tabs → 2 spaces)
 */

import { tokenize, type Token } from './tokenizer'
import { normalizePropertyName, normalizeDirection, normalizeCorner, normalizeComponentRef } from './property-normalizer'
import { convertToBlockSyntax } from './layout-normalizer'
import { expandImplicitProperties } from './sugar-expander'
import { expandShorthands } from './shorthand-expander'

export interface PreprocessOptions {
  /** Preserve comments in output (default: true) */
  preserveComments?: boolean
  /** Indent size in spaces (default: 2) */
  indentSize?: number
  /** Expand CSS shorthands (default: true) */
  expandShorthands?: boolean
}

const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
  preserveComments: true,
  indentSize: 2,
  expandShorthands: true,
}

/**
 * Preprocess Mirror DSL code to canonical form
 *
 * @param code - Raw Mirror DSL code (any syntax variant)
 * @returns Canonical form (block syntax, long forms, normalized)
 *
 * @example
 * preprocess('Button pad 12, bg #333')
 * // Returns:
 * // Button
 * //   padding 12
 * //   background #333
 */
export function preprocess(code: string, options?: PreprocessOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Skip preprocessing for code containing multiline strings
  // (The tokenizer doesn't handle multiline strings properly)
  // Multiline strings are common in doc mode (text, playground components)
  if (containsMultilineString(code)) {
    return code
  }

  // Step 1: Tokenize
  const tokens = tokenize(code)

  // Step 2: Normalize property names and directions
  const normalizedTokens = normalizeTokens(tokens)

  // Step 3: Expand CSS shorthands (padding 8 16 → padding top-bottom 8, padding left-right 16)
  const shorthandExpanded = opts.expandShorthands
    ? expandShorthands(normalizedTokens)
    : normalizedTokens

  // Step 4: Expand implicit properties (dimension sugar, color sugar, etc.)
  const expandedTokens = expandImplicitProperties(shorthandExpanded)

  // Step 5: Convert to block syntax
  const canonical = convertToBlockSyntax(expandedTokens, opts)

  return canonical
}

/**
 * Normalize tokens: property names, directions, corners, strings
 *
 * Property names are normalized to canonical (long) form:
 * - pad → padding
 * - bg → background
 * - col → color
 * - etc.
 *
 * This is the ONLY place where normalization happens.
 * The parser does NOT normalize - it stores properties as received.
 */
function normalizeTokens(tokens: Token[]): Token[] {
  return tokens.map((token, index, arr) => {
    switch (token.type) {
      case 'PROPERTY':
        // Normalize property names to canonical (long) form
        return {
          ...token,
          value: normalizePropertyName(token.value),
        }

      case 'DIRECTION':
        return {
          ...token,
          value: normalizeDirection(token.value),
        }

      case 'CORNER':
        return {
          ...token,
          value: normalizeCorner(token.value),
        }

      case 'COMPONENT_REF':
        // Normalize component references (Base.bg → Base.background)
        return {
          ...token,
          value: normalizeComponentRef(token.value),
        }

      case 'STRING':
        // Normalize single quotes to double quotes
        if (token.value.startsWith("'") && token.value.endsWith("'")) {
          return {
            ...token,
            value: '"' + token.value.slice(1, -1) + '"',
          }
        }
        return token

      default:
        return token
    }
  })
}

/**
 * Check if code contains single-quoted strings (doc-mode content)
 * Single quotes have special meaning in Mirror DSL:
 * - They create MULTILINE_STRING tokens in the main lexer
 * - Used for doc-mode (text, playground components)
 *
 * We skip preprocessing for any code with single quotes to preserve semantics.
 */
function containsMultilineString(code: string): boolean {
  // Look for any single-quoted strings
  // Single quotes are used for doc-mode content and must be preserved
  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments
    if (trimmed.startsWith('//')) continue

    // Check if line contains a single-quoted string (complete or partial)
    // Complete: '$h2 Hello World'
    // Partial start: '$h2 Hello World
    // Partial end: more content'
    if (trimmed.includes("'")) {
      // Make sure it's not inside a double-quoted string
      // Simple check: count unescaped double quotes before the single quote
      const firstSingleQuote = trimmed.indexOf("'")
      const beforeSingle = trimmed.slice(0, firstSingleQuote)
      const doubleQuoteCount = (beforeSingle.match(/(?<!\\)"/g) || []).length

      // If even number of double quotes before single quote, it's not inside a string
      if (doubleQuoteCount % 2 === 0) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if code is already in canonical form
 * Useful for optimization - skip preprocessing if already canonical
 *
 * Canonical form means:
 * - Block syntax (no comma-separated properties)
 * - Long-form property names (padding, background, not pad, bg)
 * - Short-form directions (l, r, t, b) - these ARE canonical
 */
export function isCanonical(code: string): boolean {
  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    // Check for inline syntax (comma-separated properties)
    if (trimmed.includes(',') && !trimmed.startsWith('"') && !trimmed.includes('","')) {
      return false
    }

    // Check for common short forms (non-canonical)
    // These should be normalized to long forms
    const shortForms = /\b(pad|bg|col|rad|bor|hor|ver|mar|fs|ts|is|iw|ic|minw|maxw|minh|maxh|pt|pb|pl|pr|mt|mb|ml|mr|boc|opa)\b/
    if (shortForms.test(trimmed)) {
      return false
    }

    // Note: Short directions (l, r, t, b) ARE canonical
    // They are parser-compatible tokens recognized as DIRECTION
  }

  return true
}

// Re-export types and utilities
export { tokenize, type Token } from './tokenizer'
export { normalizePropertyName, normalizeDirection, normalizeCorner, normalizeComponentRef } from './property-normalizer'
export { convertToBlockSyntax } from './layout-normalizer'
export { expandImplicitProperties } from './sugar-expander'
export { expandShorthands } from './shorthand-expander'
