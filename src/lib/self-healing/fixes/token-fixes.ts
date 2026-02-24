/**
 * Token Fixes
 *
 * Phase 2: Fix token definitions and references.
 */

import type { Fix } from '../types'

// Import DSL keywords from source of truth
import { ALL_DSL_KEYWORDS as DSL_PROPERTIES } from '../../../dsl/properties'

// Token suffix aliases for fuzzy matching
const TOKEN_SUFFIX_ALIASES: Record<string, string[]> = {
  'background': ['bg', 'color'],
  'bg': ['background', 'color'],
  'color': ['col', 'c'],
  'col': ['color', 'c'],
  'primary': ['accent', 'main'],
  'accent': ['primary', 'secondary'],
}

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Fix missing $ prefix on token references.
 */
export function fixMissingTokenPrefix(code: string): string {
  const tokenDefPattern = /^\$([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/gm
  const definedTokens = new Set<string>()

  let match
  while ((match = tokenDefPattern.exec(code)) !== null) {
    const tokenName = match[1]
    if (!DSL_PROPERTIES.has(tokenName)) {
      definedTokens.add(tokenName)
    }
  }

  if (definedTokens.size === 0) return code

  let result = code
  for (const token of Array.from(definedTokens)) {
    const usePattern = new RegExp(
      `(?<!\\$|[a-zA-Z0-9_-])\\b(${token})\\b(?![-a-zA-Z0-9_]|\\s*:)`,
      'g'
    )
    result = result.replace(usePattern, (match, tokenName, offset) => {
      const before = result.substring(Math.max(0, offset - 50), offset)
      const quoteCount = (before.match(/"/g) || []).length
      if (quoteCount % 2 === 1) return match
      if (/\bstate\s+$/.test(before)) return match
      return `$${tokenName}`
    })
  }

  return result
}

/**
 * Fix token names used as property names.
 */
export function fixTokenAsProperty(code: string): string {
  const knownProperties = [
    'border-color', 'boc', 'background', 'bg', 'color', 'col',
    'border', 'bor', 'padding', 'pad', 'margin', 'mar',
    'radius', 'rad', 'width', 'w', 'height', 'h',
    'opacity', 'opa', 'gap', 'size', 'weight'
  ]

  let result = code

  for (const prop of knownProperties) {
    const pattern = new RegExp(`\\$${prop}(\\s+)(\\d|#[0-9a-fA-F]|\\$)`, 'g')
    result = result.replace(pattern, `${prop}$1$2`)
  }

  return result
}

/**
 * Fix multiple token definitions on same line.
 */
export function fixTokensOnSameLine(code: string): string {
  return code.split('\n').map(line => {
    if (!/ \$[a-zA-Z_][a-zA-Z0-9_-]*:/.test(line)) return line
    const parts = line.split(/(?= \$[a-zA-Z_][a-zA-Z0-9_-]*:)/)
    return parts.map(p => p.trim()).filter(Boolean).join('\n')
  }).join('\n')
}

/**
 * Fix token names with hyphens that cause lexer issues.
 */
export function fixHyphenatedTokenNames(code: string): string {
  const hyphenatedTokens = new Map<string, string>()
  const defPattern = /\$([a-zA-Z]+(?:-[a-zA-Z]+)+)\s*:/g
  let match

  while ((match = defPattern.exec(code)) !== null) {
    const original = match[1]
    const camelCase = original.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    hyphenatedTokens.set(original, camelCase)
  }

  if (hyphenatedTokens.size === 0) return code

  let result = code

  for (const [hyphenated, camelCase] of Array.from(hyphenatedTokens)) {
    result = result.replace(
      new RegExp(`\\$${hyphenated}\\s*:`, 'g'),
      `$${camelCase}:`
    )
    result = result.replace(
      new RegExp(`\\$${hyphenated}(?=\\s|$|")`, 'g'),
      `$${camelCase}`
    )
  }

  return result
}

/**
 * Remove empty lines between token definitions.
 */
export function removeEmptyLinesBetweenTokens(code: string): string {
  return code.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*:[^\n]+)\n\n+(\$[a-zA-Z_])/g, '$1\n$2')
}

/**
 * Fix undefined token references by finding similar defined tokens.
 */
export function fixUndefinedTokenReferences(code: string): string {
  const definedTokens = new Set<string>()
  const defPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g
  let match

  while ((match = defPattern.exec(code)) !== null) {
    definedTokens.add(match[1])
  }

  if (definedTokens.size === 0) return code

  const usagePattern = /\$([a-zA-Z_][a-zA-Z0-9_-]*)(?=\s|$|")/g
  let result = code
  const tokens = Array.from(definedTokens)

  result = result.replace(usagePattern, (fullMatch, tokenName, offset) => {
    const afterMatch = code.substring(offset + fullMatch.length, offset + fullMatch.length + 5)
    if (afterMatch.trim().startsWith(':')) return fullMatch
    if (definedTokens.has(tokenName)) return fullMatch
    if (DSL_PROPERTIES.has(tokenName) || DSL_PROPERTIES.has(tokenName.replace(/-/g, ''))) {
      return fullMatch
    }

    let bestMatch = ''
    let bestScore = 0

    for (const defined of tokens) {
      let score = 0

      if (tokenName.includes(defined)) {
        score = defined.length / tokenName.length
        if (tokenName.startsWith(defined)) {
          score += 0.3
        }
      } else if (defined.includes(tokenName)) {
        score = tokenName.length / defined.length
      }

      // Check for equivalent suffixes
      for (const [suffix, aliases] of Object.entries(TOKEN_SUFFIX_ALIASES)) {
        if (tokenName.toLowerCase().endsWith(suffix.toLowerCase())) {
          const suffixStart = tokenName.length - suffix.length
          const base = tokenName.slice(0, suffixStart)
          const cleanBase = base.replace(/-$/, '')

          for (const alias of aliases) {
            const variations = [
              cleanBase + alias,
              cleanBase + alias.charAt(0).toUpperCase() + alias.slice(1),
              cleanBase + '-' + alias,
            ]
            for (const variant of variations) {
              if (defined.toLowerCase() === variant.toLowerCase()) {
                score = Math.max(score, 0.9)
              }
            }
          }
          if (defined.toLowerCase() === cleanBase.toLowerCase()) {
            score = Math.max(score, 0.85)
          }
        }
      }

      // Check for common prefix
      let commonPrefix = 0
      for (let i = 0; i < Math.min(defined.length, tokenName.length); i++) {
        if (defined[i].toLowerCase() === tokenName[i].toLowerCase()) {
          commonPrefix++
        } else break
      }
      const prefixScore = commonPrefix / Math.max(defined.length, tokenName.length)
      if (prefixScore > 0.5) {
        score = Math.max(score, prefixScore)
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = defined
      }
    }

    if (bestMatch && bestScore > 0.4) {
      return `$${bestMatch}`
    }

    return fullMatch
  })

  return result
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const tokenFixes: Fix[] = [
  {
    name: 'fixHyphenatedTokenNames',
    fn: fixHyphenatedTokenNames,
    phase: 'token',
    description: 'Convert hyphenated token names to camelCase',
  },
  {
    name: 'fixTokensOnSameLine',
    fn: fixTokensOnSameLine,
    phase: 'token',
    description: 'Split multiple token definitions on same line',
  },
  {
    name: 'removeEmptyLinesBetweenTokens',
    fn: removeEmptyLinesBetweenTokens,
    phase: 'token',
    description: 'Remove empty lines between token definitions',
  },
  {
    name: 'fixMissingTokenPrefix',
    fn: fixMissingTokenPrefix,
    phase: 'token',
    description: 'Add missing $ prefix to token references',
  },
  {
    name: 'fixUndefinedTokenReferences',
    fn: fixUndefinedTokenReferences,
    phase: 'token',
    description: 'Fix references to undefined tokens by finding similar tokens',
  },
  {
    name: 'fixTokenAsProperty',
    fn: fixTokenAsProperty,
    phase: 'token',
    description: 'Fix token names incorrectly used as property names',
  },
]
