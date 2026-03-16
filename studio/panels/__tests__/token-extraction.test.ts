/**
 * Token Extraction Tests
 *
 * Tests that tokens are correctly:
 * 1. Extracted from source code
 * 2. Categorized by type (color, spacing, radius, gap)
 * 3. Resolved when used in properties
 * 4. Available in token pickers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

// =============================================================================
// TOKEN EXTRACTION UTILITIES (extracted from PropertyPanel for testing)
// =============================================================================

interface SpacingToken {
  name: string      // e.g., "sm", "md", "lg"
  fullName: string  // e.g., "sm.pad", "md.rad"
  value: string     // e.g., "4", "8"
}

interface ColorToken {
  name: string      // e.g., "primary.bg", "text.col"
  value: string     // e.g., "#3B82F6"
}

/**
 * Extract spacing tokens for a property type from source
 */
function extractSpacingTokens(source: string, propType: string): SpacingToken[] {
  const lines = source.split('\n')
  const tokenMap = new Map<string, SpacingToken>()

  // Matches: $name.propType: value (e.g., "$sm.pad: 4", "$md.rad: 8")
  const regex = new RegExp(`^\\$?([a-zA-Z0-9_-]+)\\.${propType}\\s*:\\s*(\\d+)$`)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('$')) continue

    const match = trimmed.match(regex)
    if (match) {
      const name = match[1]
      const value = match[2]
      tokenMap.set(name, {
        name,
        fullName: `${name}.${propType}`,
        value
      })
    }
  }

  return Array.from(tokenMap.values())
}

/**
 * Extract color tokens from source
 */
function extractColorTokens(source: string): ColorToken[] {
  const tokens: ColorToken[] = []
  const tokenRegex = /\$?([\w.-]+):\s*(#[0-9A-Fa-f]{3,8})/g

  let match
  while ((match = tokenRegex.exec(source)) !== null) {
    tokens.push({
      name: match[1],
      value: match[2]
    })
  }

  return tokens
}

/**
 * Resolve a token reference to its value
 */
function resolveTokenValue(source: string, tokenRef: string): string | null {
  const normalizedRef = tokenRef.replace(/^\$/, '')
  const parts = normalizedRef.split('.')

  if (parts.length < 2) {
    // Simple token like $primary - look for exact match
    const regex = new RegExp(`^\\$?${normalizedRef}:\\s*(.+)$`, 'm')
    const match = source.match(regex)
    return match ? match[1].trim() : null
  }

  const propType = parts[parts.length - 1]
  const tokens = extractSpacingTokens(source, propType)
  const token = tokens.find(t => t.fullName === normalizedRef)

  if (token) return token.value

  // Also check color tokens
  const colorTokens = extractColorTokens(source)
  const colorToken = colorTokens.find(t => t.name === normalizedRef)
  return colorToken?.value || null
}

// =============================================================================
// SPACING TOKEN TESTS
// =============================================================================

describe('Spacing Token Extraction', () => {
  it('extracts padding tokens', () => {
    const source = `
$sm.pad: 4
$md.pad: 8
$lg.pad: 16
`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'sm')?.value).toBe('4')
    expect(tokens.find(t => t.name === 'md')?.value).toBe('8')
    expect(tokens.find(t => t.name === 'lg')?.value).toBe('16')
  })

  it('extracts radius tokens', () => {
    const source = `
$sm.rad: 4
$md.rad: 8
$lg.rad: 16
`
    const tokens = extractSpacingTokens(source, 'rad')

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'sm')?.value).toBe('4')
    expect(tokens.find(t => t.name === 'md')?.value).toBe('8')
    expect(tokens.find(t => t.name === 'lg')?.value).toBe('16')
  })

  it('extracts gap tokens', () => {
    const source = `
$sm.gap: 4
$md.gap: 8
$lg.gap: 16
`
    const tokens = extractSpacingTokens(source, 'gap')

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'sm')?.value).toBe('4')
  })

  it('handles mixed token types', () => {
    const source = `
$sm.pad: 4
$sm.rad: 2
$sm.gap: 4
$md.pad: 8
$md.rad: 4
$md.gap: 8
`
    const padTokens = extractSpacingTokens(source, 'pad')
    const radTokens = extractSpacingTokens(source, 'rad')
    const gapTokens = extractSpacingTokens(source, 'gap')

    expect(padTokens).toHaveLength(2)
    expect(radTokens).toHaveLength(2)
    expect(gapTokens).toHaveLength(2)
  })

  it('ignores non-matching tokens', () => {
    const source = `
$primary.bg: #3B82F6
$sm.pad: 4
$button.hover: #2563EB
`
    const padTokens = extractSpacingTokens(source, 'pad')

    expect(padTokens).toHaveLength(1)
    expect(padTokens[0].name).toBe('sm')
  })

  it('handles tokens without $ prefix in value lookup', () => {
    const source = `
$xs.pad: 2
$sm.pad: 4
`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(2)
    expect(tokens.find(t => t.name === 'xs')?.value).toBe('2')
  })

  it('returns fullName with property type', () => {
    const source = `$sm.pad: 4`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens[0].fullName).toBe('sm.pad')
  })

  it('later definitions override earlier ones', () => {
    const source = `
$sm.pad: 4
$sm.pad: 8
`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('8')
  })

  it('handles hyphenated token names', () => {
    const source = `$extra-small.pad: 2`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('extra-small')
  })

  it('handles numeric token names', () => {
    const source = `$size-4.pad: 4`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('size-4')
  })
})

// =============================================================================
// COLOR TOKEN TESTS
// =============================================================================

describe('Color Token Extraction', () => {
  it('extracts simple color tokens', () => {
    const source = `
$primary: #3B82F6
$secondary: #10B981
$danger: #EF4444
`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'primary')?.value).toBe('#3B82F6')
    expect(tokens.find(t => t.name === 'secondary')?.value).toBe('#10B981')
    expect(tokens.find(t => t.name === 'danger')?.value).toBe('#EF4444')
  })

  it('extracts namespaced color tokens', () => {
    const source = `
$primary.bg: #3B82F6
$primary.hover: #2563EB
$text.col: #FFFFFF
`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'primary.bg')?.value).toBe('#3B82F6')
    expect(tokens.find(t => t.name === 'primary.hover')?.value).toBe('#2563EB')
    expect(tokens.find(t => t.name === 'text.col')?.value).toBe('#FFFFFF')
  })

  it('handles 3-digit hex colors', () => {
    const source = `$primary: #333`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('#333')
  })

  it('handles 6-digit hex colors', () => {
    const source = `$primary: #333333`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('#333333')
  })

  it('handles 8-digit hex colors (with alpha)', () => {
    const source = `$overlay: #00000080`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('#00000080')
  })

  it('handles mixed case hex', () => {
    const source = `$primary: #3b82F6`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('#3b82F6')
  })

  it('ignores non-color tokens', () => {
    const source = `
$sm.pad: 4
$primary: #3B82F6
$lg.rad: 16
`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('primary')
  })

  it('extracts multiple tokens per line (edge case)', () => {
    // This shouldn't normally happen, but test robustness
    const source = `$a: #111 $b: #222`
    const tokens = extractColorTokens(source)

    expect(tokens.length).toBeGreaterThanOrEqual(1)
  })
})

// =============================================================================
// TOKEN RESOLUTION TESTS
// =============================================================================

describe('Token Resolution', () => {
  it('resolves spacing token', () => {
    const source = `$sm.pad: 4`
    const value = resolveTokenValue(source, '$sm.pad')

    expect(value).toBe('4')
  })

  it('resolves spacing token without $ prefix', () => {
    const source = `$sm.pad: 4`
    const value = resolveTokenValue(source, 'sm.pad')

    expect(value).toBe('4')
  })

  it('resolves color token', () => {
    const source = `$primary.bg: #3B82F6`
    const value = resolveTokenValue(source, '$primary.bg')

    expect(value).toBe('#3B82F6')
  })

  it('resolves simple color token', () => {
    const source = `$primary: #3B82F6`
    const value = resolveTokenValue(source, '$primary')

    expect(value).toBe('#3B82F6')
  })

  it('returns null for non-existent token', () => {
    const source = `$sm.pad: 4`
    const value = resolveTokenValue(source, '$nonexistent')

    expect(value).toBeNull()
  })

  it('resolves from complex source', () => {
    const source = `
// Design Tokens
$sm.pad: 4
$md.pad: 8
$lg.pad: 16

$primary.bg: #3B82F6
$secondary.bg: #10B981

Card pad $md.pad, bg $primary.bg
`
    expect(resolveTokenValue(source, '$sm.pad')).toBe('4')
    expect(resolveTokenValue(source, '$md.pad')).toBe('8')
    expect(resolveTokenValue(source, '$lg.pad')).toBe('16')
    expect(resolveTokenValue(source, '$primary.bg')).toBe('#3B82F6')
    expect(resolveTokenValue(source, '$secondary.bg')).toBe('#10B981')
  })

  it('handles overridden tokens (uses last definition)', () => {
    const source = `
$sm.pad: 4
$sm.pad: 8
`
    const value = resolveTokenValue(source, '$sm.pad')
    expect(value).toBe('8')
  })
})

// =============================================================================
// TOKEN CATEGORIZATION TESTS
// =============================================================================

describe('Token Categorization', () => {
  const source = `
// Spacing Tokens
$xs.pad: 2
$sm.pad: 4
$md.pad: 8
$lg.pad: 16
$xl.pad: 24

// Gap Tokens
$sm.gap: 4
$md.gap: 8
$lg.gap: 16

// Radius Tokens
$sm.rad: 2
$md.rad: 4
$lg.rad: 8
$xl.rad: 16

// Color Tokens
$grey-900: #18181B
$grey-800: #27272A
$primary.bg: #3B82F6
$primary.hover: #2563EB
$text.col: #E4E4E7
`

  it('extracts only pad tokens', () => {
    const tokens = extractSpacingTokens(source, 'pad')
    expect(tokens).toHaveLength(5)
    expect(tokens.every(t => t.fullName.endsWith('.pad'))).toBe(true)
  })

  it('extracts only gap tokens', () => {
    const tokens = extractSpacingTokens(source, 'gap')
    expect(tokens).toHaveLength(3)
    expect(tokens.every(t => t.fullName.endsWith('.gap'))).toBe(true)
  })

  it('extracts only rad tokens', () => {
    const tokens = extractSpacingTokens(source, 'rad')
    expect(tokens).toHaveLength(4)
    expect(tokens.every(t => t.fullName.endsWith('.rad'))).toBe(true)
  })

  it('extracts all color tokens', () => {
    const tokens = extractColorTokens(source)
    expect(tokens.length).toBeGreaterThanOrEqual(5)
    expect(tokens.every(t => t.value.startsWith('#'))).toBe(true)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty source', () => {
    const padTokens = extractSpacingTokens('', 'pad')
    const colorTokens = extractColorTokens('')

    expect(padTokens).toHaveLength(0)
    expect(colorTokens).toHaveLength(0)
  })

  it('handles source with no tokens', () => {
    const source = `
Box pad 16, bg #333
Card rad 8
`
    const padTokens = extractSpacingTokens(source, 'pad')
    const colorTokens = extractColorTokens(source)

    expect(padTokens).toHaveLength(0)
    // #333 inline is not a token definition
  })

  it('handles comments in source', () => {
    const source = `
// This is a comment
$sm.pad: 4
// $md.pad: 8 - this is commented out
$lg.pad: 16
`
    const tokens = extractSpacingTokens(source, 'pad')

    // Commented line should not be extracted as it doesn't start with $
    expect(tokens).toHaveLength(2)
  })

  it('handles whitespace variations', () => {
    const source = `
$sm.pad:4
$md.pad: 8
$lg.pad:  16
`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(3)
    expect(tokens.find(t => t.name === 'sm')?.value).toBe('4')
    expect(tokens.find(t => t.name === 'md')?.value).toBe('8')
    expect(tokens.find(t => t.name === 'lg')?.value).toBe('16')
  })

  it('handles deeply namespaced tokens', () => {
    const source = `$button.primary.bg: #3B82F6`
    const tokens = extractColorTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('button.primary.bg')
  })

  it('handles token names with underscores', () => {
    const source = `$my_custom_token.pad: 12`
    const tokens = extractSpacingTokens(source, 'pad')

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('my_custom_token')
  })
})

// =============================================================================
// REAL-WORLD SCENARIOS
// =============================================================================

describe('Real-World Scenarios', () => {
  it('Design System tokens file', () => {
    const source = `
// Design System Tokens
// ====================

// Spacing Scale
$xs.pad: 2
$sm.pad: 4
$md.pad: 8
$lg.pad: 16
$xl.pad: 24
$2xl.pad: 32

// Gap Scale (same as spacing)
$xs.gap: 2
$sm.gap: 4
$md.gap: 8
$lg.gap: 16

// Border Radius
$sm.rad: 2
$md.rad: 4
$lg.rad: 8
$xl.rad: 16
$full.rad: 9999

// Colors - Grey Scale
$grey-50: #FAFAFA
$grey-100: #F4F4F5
$grey-200: #E4E4E7
$grey-300: #D4D4D8
$grey-400: #A1A1AA
$grey-500: #71717A
$grey-600: #52525B
$grey-700: #3F3F46
$grey-800: #27272A
$grey-900: #18181B

// Colors - Primary
$primary: #3B82F6
$primary.bg: #3B82F6
$primary.hover: #2563EB
$primary.active: #1D4ED8

// Colors - Semantic
$success: #10B981
$warning: #F59E0B
$danger: #EF4444
$info: #3B82F6

// Text Colors
$text.primary: #18181B
$text.secondary: #52525B
$text.muted: #A1A1AA
`
    // Verify all token types are extracted correctly
    const padTokens = extractSpacingTokens(source, 'pad')
    const gapTokens = extractSpacingTokens(source, 'gap')
    const radTokens = extractSpacingTokens(source, 'rad')
    const colorTokens = extractColorTokens(source)

    expect(padTokens.length).toBe(6)
    expect(gapTokens.length).toBe(4)
    expect(radTokens.length).toBe(5)
    expect(colorTokens.length).toBeGreaterThan(15)

    // Verify specific values
    expect(resolveTokenValue(source, '$md.pad')).toBe('8')
    expect(resolveTokenValue(source, '$lg.rad')).toBe('8')
    expect(resolveTokenValue(source, '$primary')).toBe('#3B82F6')
    expect(resolveTokenValue(source, '$grey-800')).toBe('#27272A')
  })

  it('Component using tokens', () => {
    const source = `
$primary.bg: #3B82F6
$md.pad: 8
$md.rad: 4

Button: bg $primary.bg, pad $md.pad, rad $md.rad
Button
`
    // Tokens should be extractable even when used in components
    const colorTokens = extractColorTokens(source)
    const padTokens = extractSpacingTokens(source, 'pad')
    const radTokens = extractSpacingTokens(source, 'rad')

    expect(colorTokens.find(t => t.name === 'primary.bg')).toBeDefined()
    expect(padTokens.find(t => t.name === 'md')).toBeDefined()
    expect(radTokens.find(t => t.name === 'md')).toBeDefined()
  })

  it('Multi-file scenario (concatenated source)', () => {
    // Simulates getAllSource() returning concatenated content
    const tokensFile = `
// tokens.mirror
$sm.pad: 4
$md.pad: 8
$primary.bg: #3B82F6
`
    const componentsFile = `
// components.mirror
Button: bg $primary.bg, pad $md.pad
Card: pad $sm.pad, bg #333
`
    const combinedSource = tokensFile + '\n' + componentsFile

    const padTokens = extractSpacingTokens(combinedSource, 'pad')
    const colorTokens = extractColorTokens(combinedSource)

    expect(padTokens).toHaveLength(2)
    expect(colorTokens.find(t => t.name === 'primary.bg')).toBeDefined()
  })
})
