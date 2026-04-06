/**
 * Token Resolution Utilities
 *
 * Centralized token resolution for property panel sections.
 */

import type { ColorToken, SectionData } from '../types'

/**
 * Resolve a color token reference to its actual value
 *
 * @param tokenRef - Token reference like "$primary.bg" or "$blue"
 * @param data - Section data containing token information
 * @returns The resolved color value or empty string if not found
 */
export function resolveColorToken(tokenRef: string, data: SectionData): string {
  const colorTokens = data.colorTokens || []
  const token = colorTokens.find(t => `$${t.name}` === tokenRef)
  return token?.value || ''
}

/**
 * Resolve a spacing token reference to its actual value
 *
 * @param tokenRef - Token reference like "$sm.pad" or "$md.gap"
 * @param data - Section data containing token information
 * @returns The resolved spacing value or empty string if not found
 */
export function resolveSpacingToken(tokenRef: string, data: SectionData): string {
  const spacingTokens = data.spacingTokens || []
  const token = spacingTokens.find(t => `$${t.fullName}` === tokenRef)
  return token?.value || ''
}

/**
 * Check if a value is a token reference
 */
export function isTokenRef(value: string): boolean {
  return value.startsWith('$')
}

/**
 * Resolve any token (color or spacing) to its value
 */
export function resolveToken(tokenRef: string, data: SectionData): string {
  // Try color tokens first
  const colorValue = resolveColorToken(tokenRef, data)
  if (colorValue) return colorValue

  // Then try spacing tokens
  const spacingValue = resolveSpacingToken(tokenRef, data)
  if (spacingValue) return spacingValue

  return ''
}
