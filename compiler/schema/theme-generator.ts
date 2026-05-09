/**
 * Theme Generator
 *
 * Generates CSS custom properties from user-defined tokens.
 * Automatically creates hover/active variants.
 */

import type { TokenDefinition } from '../parser/ast'
import { THEME_TOKENS, USER_TOKEN_MAPPINGS } from './component-tokens'
import { applyTransform } from './color-utils'

// ============================================================================
// Types
// ============================================================================

interface GeneratedTheme {
  /** CSS custom property declarations */
  css: string
  /** Token values as JS object */
  tokens: Record<string, string | number>
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate theme CSS from user tokens
 */
export function generateTheme(userTokens: TokenDefinition[]): GeneratedTheme {
  // Build a map of user-defined values
  const userValues = new Map<string, string | number>()
  for (const token of userTokens) {
    if (token.value === undefined || typeof token.value === 'boolean') continue
    // Normalize token name (remove $ prefix)
    const name = token.name.startsWith('$') ? token.name.slice(1) : token.name
    userValues.set(name, token.value)
  }

  // Resolve any chain references in userValues. Theme tokens drive auto-
  // generated hover/active variants via color-transforms (darken/lighten),
  // which need a real hex value — `$primary` literal would break the
  // transform. Inline-resolve here so downstream code sees concrete values.
  resolveChainsInPlace(userValues)

  // Generate all theme tokens
  const themeTokens: Record<string, string | number> = {}

  for (const [tokenKey, definition] of Object.entries(THEME_TOKENS)) {
    // Check if user defined this token directly
    if (userValues.has(tokenKey)) {
      themeTokens[tokenKey] = userValues.get(tokenKey)!
      continue
    }

    // Check if this token is derived from another
    if (definition.derivedFrom) {
      const baseToken = definition.derivedFrom.token
      const baseValue =
        themeTokens[baseToken] ?? userValues.get(baseToken) ?? THEME_TOKENS[baseToken]?.defaultValue

      if (baseValue !== undefined) {
        themeTokens[tokenKey] = applyTransform(
          baseValue,
          definition.derivedFrom.transform,
          definition.derivedFrom.amount
        )
        continue
      }
    }

    // Use default value
    themeTokens[tokenKey] = definition.defaultValue
  }

  // Generate CSS
  const css = generateCSS(themeTokens)

  return { css, tokens: themeTokens }
}

/**
 * Walk userValues and replace `$xxx` chain references with their resolved
 * value. Tries direct lookup first, then with the target token's suffix.
 *
 * If a chain target is unresolvable (typo, undefined source), the entry is
 * removed so the theme falls back to its default value rather than emitting
 * literal `$xxx` (invalid CSS). Validator W500 covers the user-facing diagnostic.
 *
 * Cycles terminate after MAX_DEPTH steps to avoid infinite recursion; the
 * last terminal value (or removal) is taken.
 */
function resolveChainsInPlace(userValues: Map<string, string | number>): void {
  const MAX_DEPTH = 16

  for (const [name, value] of userValues) {
    if (typeof value !== 'string' || !value.startsWith('$')) continue

    let current = value
    let resolved: string | number | undefined
    const visited = new Set<string>()

    for (let i = 0; i < MAX_DEPTH; i++) {
      if (typeof current !== 'string' || !current.startsWith('$')) {
        resolved = current
        break
      }
      if (visited.has(current)) break
      visited.add(current)

      const stripped = current.slice(1)

      // Direct match
      if (userValues.has(stripped)) {
        const next = userValues.get(stripped)!
        if (typeof next === 'string') {
          current = next
          continue
        }
        resolved = next
        break
      }

      // With target suffix
      const dotIdx = name.lastIndexOf('.')
      const targetSuffix = dotIdx > 0 ? name.slice(dotIdx) : ''
      if (targetSuffix && userValues.has(stripped + targetSuffix)) {
        const next = userValues.get(stripped + targetSuffix)!
        if (typeof next === 'string') {
          current = next
          continue
        }
        resolved = next
        break
      }

      // Unresolvable
      break
    }

    if (resolved !== undefined && (typeof resolved !== 'string' || !resolved.startsWith('$'))) {
      userValues.set(name, resolved)
    } else {
      userValues.delete(name)
    }
  }
}

/**
 * Generate CSS from theme tokens
 */
function generateCSS(tokens: Record<string, string | number>): string {
  const lines: string[] = ['/* Mirror Theme Tokens (auto-generated) */', ':root {']

  // Group by category for readability
  const categories: Record<string, string[]> = {
    color: [],
    spacing: [],
    sizing: [],
    border: [],
    typography: [],
  }

  for (const [tokenKey, value] of Object.entries(tokens)) {
    const definition = THEME_TOKENS[tokenKey]
    if (!definition) continue

    const cssVar = `--${definition.cssVar}`
    let cssValue: string

    // Check if value is numeric (either number type or numeric string)
    const isNumeric =
      typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))
    const numericValue = isNumeric ? Number(value) : null

    if (isNumeric && numericValue !== null) {
      // Add px unit for sizing/spacing/border/typography (but not line-height)
      const needsPx =
        (definition.category === 'sizing' ||
          definition.category === 'spacing' ||
          definition.category === 'border' ||
          definition.category === 'typography') &&
        tokenKey !== 'line-height'

      if (needsPx) {
        cssValue = `${numericValue}px`
      } else {
        cssValue = String(numericValue)
      }
    } else {
      cssValue = String(value)
    }

    categories[definition.category].push(`  ${cssVar}: ${cssValue};`)
  }

  // Output grouped
  for (const [category, vars] of Object.entries(categories)) {
    if (vars.length > 0) {
      lines.push(`  /* ${category} */`)
      lines.push(...vars)
      lines.push('')
    }
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * Check if a user token name maps to a theme token
 */
export function isThemeToken(tokenName: string): boolean {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName

  // Direct match
  if (THEME_TOKENS[name]) return true

  // Mapping match
  return USER_TOKEN_MAPPINGS.some(m => m.userToken === name)
}
