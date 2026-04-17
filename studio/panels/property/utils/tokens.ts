/**
 * Token utilities for Property Panel
 */

import type { SpacingToken, ColorToken, GetAllSourceCallback } from '../types'

/**
 * Token cache manager
 */
export class TokenCache {
  private cachedSpacingTokens: Map<string, SpacingToken[]> = new Map()
  private cachedColorTokens: ColorToken[] | null = null
  private cachedSourceHash: string = ''

  /**
   * Hash source for cache invalidation
   */
  private hashSource(source: string): string {
    let hash = 0
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  /**
   * Clear all cached tokens
   */
  invalidate(): void {
    this.cachedSpacingTokens.clear()
    this.cachedColorTokens = null
    this.cachedSourceHash = ''
  }

  /**
   * Get spacing tokens for a property type
   */
  getSpacingTokens(propType: string, getSource: () => string): SpacingToken[] {
    const source = getSource()
    const hash = this.hashSource(source)

    // Invalidate all if source changed
    if (hash !== this.cachedSourceHash) {
      this.cachedSpacingTokens.clear()
      this.cachedSourceHash = hash
    }

    // Return cached if available
    const cached = this.cachedSpacingTokens.get(propType)
    if (cached) {
      return cached
    }

    const lines = source.split('\n')
    const tokenMap = new Map<string, SpacingToken>()

    // Build regex for the specific property type
    const regex = new RegExp(`^\\$?([a-zA-Z0-9_-]+)\\.${propType}\\s*:\\s*(\\d+)$`)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//')) continue

      const match = trimmed.match(regex)
      if (match) {
        const name = match[1]
        tokenMap.set(name, {
          name,
          fullName: `${name}.${propType}`,
          value: match[2],
        })
      }
    }

    const tokens = Array.from(tokenMap.values())
    this.cachedSpacingTokens.set(propType, tokens)
    return tokens
  }

  /**
   * Get color tokens
   */
  getColorTokens(getSource: () => string): ColorToken[] {
    const source = getSource()
    const hash = this.hashSource(source)

    if (hash === this.cachedSourceHash && this.cachedColorTokens) {
      return this.cachedColorTokens
    }

    const tokenMap = new Map<string, ColorToken>()
    const tokenRegex = /\$?([\w.-]+):\s*(#[0-9A-Fa-f]{3,8})/g
    let match
    while ((match = tokenRegex.exec(source)) !== null) {
      tokenMap.set(match[1], {
        name: match[1],
        value: match[2],
      })
    }

    const tokens = Array.from(tokenMap.values())
    this.cachedColorTokens = tokens
    this.cachedSourceHash = hash
    return tokens
  }

  /**
   * Resolve token value
   * @param tokenRef - Token reference like "$s" or "$s.pad"
   * @param getSource - Function to get source code
   * @param propType - Optional property type hint (e.g., "pad", "gap") for short references
   */
  resolveTokenValue(tokenRef: string, getSource: () => string, propType?: string): string | null {
    const normalizedRef = tokenRef.startsWith('$') ? tokenRef.slice(1) : tokenRef
    const parts = normalizedRef.split('.')

    // If full reference like "s.pad", use that
    if (parts.length >= 2) {
      const propTypeSuffix = parts[parts.length - 1]
      const tokens = this.getSpacingTokens(propTypeSuffix, getSource)
      const token = tokens.find(t => t.fullName === normalizedRef)
      return token?.value || null
    }

    // Short reference like "s" - need propType hint
    if (parts.length === 1 && propType) {
      const tokenName = parts[0]
      const fullName = `${tokenName}.${propType}`
      const tokens = this.getSpacingTokens(propType, getSource)
      const token = tokens.find(t => t.fullName === fullName || t.name === tokenName)
      return token?.value || null
    }

    return null
  }

  /**
   * Get all tokens, optionally filtered by suffix
   */
  getAllTokens(getSource: () => string, propertySuffix?: string): ColorToken[] {
    const source = getSource()
    const tokens: ColorToken[] = []

    const tokenRegex = /^\s*\$?([\w.-]+):\s*(.+)$/gm
    let match
    while ((match = tokenRegex.exec(source)) !== null) {
      const name = match[1]
      const value = match[2].trim()

      if (!name.includes('.')) continue

      if (propertySuffix) {
        if (name.endsWith('.' + propertySuffix)) {
          tokens.push({ name, value })
        }
      } else {
        tokens.push({ name, value })
      }
    }

    return tokens
  }
}

/**
 * Map property name to token suffix
 */
export const TOKEN_SUFFIX_MAP: Record<string, string> = {
  pad: 'pad',
  padding: 'pad',
  p: 'pad',
  gap: 'gap',
  g: 'gap',
  bg: 'bg',
  background: 'bg',
  col: 'col',
  color: 'col',
  c: 'col',
  rad: 'rad',
  radius: 'rad',
  bor: 'bor',
  border: 'bor',
  boc: 'boc',
  'border-color': 'boc',
  fs: 'fs',
  'font-size': 'fs',
  line: 'line',
  o: 'o',
  opacity: 'o',
  opa: 'o',
  m: 'm',
  margin: 'm',
  w: 'w',
  width: 'w',
  h: 'h',
  height: 'h',
}

/**
 * Get token suffix for a property name
 */
export function getTokenSuffixForProperty(propName: string): string | undefined {
  return TOKEN_SUFFIX_MAP[propName]
}

/**
 * Get short label from token name for display
 * e.g., "sm.pad" -> "SM", "spacing.small.pad" -> "Sma"
 */
export function getTokenShortLabel(tokenName: string): string {
  // Remove .pad suffix
  const name = tokenName.replace(/\.pad$/, '')
  // Get the most descriptive part
  const parts = name.split('.')
  // Use first part if short, otherwise abbreviate
  const label = parts[0]
  return label.length <= 3 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1, 3)
}
