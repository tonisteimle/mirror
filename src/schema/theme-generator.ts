/**
 * Theme Generator
 *
 * Generates CSS custom properties from user-defined tokens.
 * Automatically creates hover/active variants.
 */

import type { TokenDefinition } from '../parser/ast'
import {
  THEME_TOKENS,
  USER_TOKEN_MAPPINGS,
  type ThemeTokenDefinition,
} from './component-tokens'
import { applyTransform } from './color-utils'

// ============================================================================
// Types
// ============================================================================

export interface GeneratedTheme {
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
    // Normalize token name (remove $ prefix)
    const name = token.name.startsWith('$') ? token.name.slice(1) : token.name
    userValues.set(name, token.value)
  }

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
      const baseValue = themeTokens[baseToken] ?? userValues.get(baseToken) ?? THEME_TOKENS[baseToken]?.defaultValue

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
    const isNumeric = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))
    const numericValue = isNumeric ? Number(value) : null

    if (isNumeric && numericValue !== null) {
      // Add px unit for sizing/spacing/border/typography (but not line-height)
      const needsPx = (
        definition.category === 'sizing' ||
        definition.category === 'spacing' ||
        definition.category === 'border' ||
        definition.category === 'typography'
      ) && tokenKey !== 'line-height'

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
 * Get only the user-overridden tokens and their generated variants
 */
export function generateUserOverrides(userTokens: TokenDefinition[]): GeneratedTheme {
  const userValues = new Map<string, string | number>()
  for (const token of userTokens) {
    const name = token.name.startsWith('$') ? token.name.slice(1) : token.name
    userValues.set(name, token.value)
  }

  const themeTokens: Record<string, string | number> = {}

  // Only process tokens that map to theme tokens
  for (const mapping of USER_TOKEN_MAPPINGS) {
    if (userValues.has(mapping.userToken)) {
      const baseValue = userValues.get(mapping.userToken)!

      // Generate all variants
      for (const generatedKey of mapping.generates) {
        const definition = THEME_TOKENS[generatedKey]
        if (!definition) continue

        if (generatedKey === mapping.userToken) {
          // Base token
          themeTokens[generatedKey] = baseValue
        } else if (definition.derivedFrom) {
          // Derived token
          themeTokens[generatedKey] = applyTransform(
            baseValue,
            definition.derivedFrom.transform,
            definition.derivedFrom.amount
          )
        }
      }
    }
  }

  // Also include directly-named tokens (e.g., "gap", "pad")
  for (const [name, value] of userValues) {
    if (THEME_TOKENS[name] && !themeTokens[name]) {
      themeTokens[name] = value
    }
  }

  const css = generateCSS(themeTokens)
  return { css, tokens: themeTokens }
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

/**
 * Get default theme CSS (no user overrides)
 */
export function getDefaultThemeCSS(): string {
  const tokens: Record<string, string | number> = {}
  for (const [key, def] of Object.entries(THEME_TOKENS)) {
    tokens[key] = def.defaultValue
  }
  return generateCSS(tokens)
}
