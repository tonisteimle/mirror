/**
 * Schema helpers for token suffixes (RT-6).
 *
 * Locks down the canonical map and helpers that drive token resolution
 * across parser, IR, backend, and studio picker.
 */

import { describe, it, expect } from 'vitest'
import {
  PROPERTY_TO_TOKEN_SUFFIX,
  getTokenSuffix,
  getCompatibleProperties,
  inferTokenTypeFromSuffix,
  needsPxUnit,
  getSuffix,
  stripDollar,
  tokenToCSSVarName,
} from '../../../compiler/schema/token-suffixes'

describe('getTokenSuffix', () => {
  it('returns the suffix for canonical property names', () => {
    expect(getTokenSuffix('bg')).toBe('.bg')
    expect(getTokenSuffix('col')).toBe('.col')
    expect(getTokenSuffix('pad')).toBe('.pad')
    expect(getTokenSuffix('rad')).toBe('.rad')
    expect(getTokenSuffix('font')).toBe('.font')
  })

  it('handles long-form aliases', () => {
    expect(getTokenSuffix('background')).toBe('.bg')
    expect(getTokenSuffix('color')).toBe('.col')
    expect(getTokenSuffix('padding')).toBe('.pad')
    expect(getTokenSuffix('font-family')).toBe('.font')
  })

  it('returns undefined for unknown properties', () => {
    expect(getTokenSuffix('unknown')).toBeUndefined()
    expect(getTokenSuffix('')).toBeUndefined()
  })
})

describe('getCompatibleProperties', () => {
  it('returns all aliases for a suffix', () => {
    const bgProps = getCompatibleProperties('.bg')
    expect(bgProps).toContain('bg')
    expect(bgProps).toContain('background')
  })

  it('returns three aliases for color', () => {
    const colProps = getCompatibleProperties('.col')
    expect(colProps).toContain('col')
    expect(colProps).toContain('color')
    expect(colProps).toContain('c')
  })

  it('returns empty array for unknown suffix', () => {
    expect(getCompatibleProperties('.xyz')).toEqual([])
  })
})

describe('inferTokenTypeFromSuffix', () => {
  it('infers color for color-related suffixes', () => {
    expect(inferTokenTypeFromSuffix('.bg')).toBe('color')
    expect(inferTokenTypeFromSuffix('.col')).toBe('color')
    expect(inferTokenTypeFromSuffix('.boc')).toBe('color')
    expect(inferTokenTypeFromSuffix('.ic')).toBe('color')
  })

  it('infers size for spacing/sizing/typography', () => {
    expect(inferTokenTypeFromSuffix('.pad')).toBe('size')
    expect(inferTokenTypeFromSuffix('.gap')).toBe('size')
    expect(inferTokenTypeFromSuffix('.mar')).toBe('size')
    expect(inferTokenTypeFromSuffix('.rad')).toBe('size')
    expect(inferTokenTypeFromSuffix('.fs')).toBe('size')
    expect(inferTokenTypeFromSuffix('.line')).toBe('size')
    expect(inferTokenTypeFromSuffix('.is')).toBe('size')
  })

  it('infers font for .font', () => {
    expect(inferTokenTypeFromSuffix('.font')).toBe('font')
  })

  it('returns undefined for unknown suffix', () => {
    expect(inferTokenTypeFromSuffix('.xyz')).toBeUndefined()
    expect(inferTokenTypeFromSuffix('')).toBeUndefined()
  })
})

describe('needsPxUnit', () => {
  it('returns true for size-suffixed token names', () => {
    expect(needsPxUnit('btn.pad')).toBe(true)
    expect(needsPxUnit('container.w')).toBe(true)
    expect(needsPxUnit('heading.fs')).toBe(true)
    expect(needsPxUnit('icon.is')).toBe(true)
  })

  it('returns false for color/font tokens', () => {
    expect(needsPxUnit('primary.bg')).toBe(false)
    expect(needsPxUnit('primary.col')).toBe(false)
    expect(needsPxUnit('heading.font')).toBe(false)
  })

  it('returns false for tokens without a suffix', () => {
    expect(needsPxUnit('primary')).toBe(false)
    expect(needsPxUnit('')).toBe(false)
  })
})

describe('getSuffix', () => {
  it('extracts the trailing suffix with leading dot', () => {
    expect(getSuffix('primary.bg')).toBe('.bg')
    expect(getSuffix('btn.pad')).toBe('.pad')
  })

  it('returns empty string when no dot', () => {
    expect(getSuffix('primary')).toBe('')
    expect(getSuffix('')).toBe('')
  })

  it('uses the LAST dot for nested names', () => {
    expect(getSuffix('a.b.c')).toBe('.c')
  })
})

describe('stripDollar', () => {
  it('removes leading $ if present', () => {
    expect(stripDollar('$primary')).toBe('primary')
    expect(stripDollar('$accent.bg')).toBe('accent.bg')
  })

  it('returns input unchanged without $', () => {
    expect(stripDollar('primary')).toBe('primary')
    expect(stripDollar('')).toBe('')
  })
})

describe('tokenToCSSVarName', () => {
  it('converts dots to hyphens', () => {
    expect(tokenToCSSVarName('primary.bg')).toBe('primary-bg')
    expect(tokenToCSSVarName('btn.pad')).toBe('btn-pad')
  })

  it('strips leading $', () => {
    expect(tokenToCSSVarName('$primary.bg')).toBe('primary-bg')
  })

  it('preserves hyphens in the name', () => {
    expect(tokenToCSSVarName('grey-800')).toBe('grey-800')
  })
})

describe('PROPERTY_TO_TOKEN_SUFFIX is the single source of truth', () => {
  it('contains the canonical short property names', () => {
    // Every short property name has an entry. If you add an alias to
    // schema/properties.ts you must add it here too.
    const canonical = ['bg', 'col', 'pad', 'mar', 'gap', 'rad', 'fs', 'w', 'h', 'is', 'ic']
    for (const prop of canonical) {
      expect(PROPERTY_TO_TOKEN_SUFFIX[prop]).toBeDefined()
    }
  })

  it('aliases map to the same suffix as their canonical form', () => {
    expect(PROPERTY_TO_TOKEN_SUFFIX.bg).toBe(PROPERTY_TO_TOKEN_SUFFIX.background)
    expect(PROPERTY_TO_TOKEN_SUFFIX.col).toBe(PROPERTY_TO_TOKEN_SUFFIX.color)
    expect(PROPERTY_TO_TOKEN_SUFFIX.col).toBe(PROPERTY_TO_TOKEN_SUFFIX.c)
    expect(PROPERTY_TO_TOKEN_SUFFIX.pad).toBe(PROPERTY_TO_TOKEN_SUFFIX.padding)
  })
})
