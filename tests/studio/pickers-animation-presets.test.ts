/**
 * Tests for studio/pickers/animation/presets.ts
 *
 * Pure data + 3 query helpers. Module was 0% covered. Tests pin the
 * preset registry shape + the lookup functions.
 */

import { describe, it, expect } from 'vitest'
import {
  ANIMATION_PRESETS,
  getPresetsByCategory,
  getAnimationCategories,
  getPreset,
} from '../../studio/pickers/animation/presets'

describe('ANIMATION_PRESETS — registry shape', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(ANIMATION_PRESETS)).toBe(true)
    expect(ANIMATION_PRESETS.length).toBeGreaterThan(0)
  })

  it('every preset has the required fields', () => {
    for (const p of ANIMATION_PRESETS) {
      expect(typeof p.name).toBe('string')
      expect(p.name.length).toBeGreaterThan(0)
      expect(typeof p.label).toBe('string')
      expect(typeof p.category).toBe('string')
      expect(p.keyframes).toMatch(/^@keyframes /)
      expect(p.duration).toMatch(/^\d+(\.\d+)?s$/)
      expect(typeof p.easing).toBe('string')
    }
  })

  it('preset names are unique', () => {
    const names = ANIMATION_PRESETS.map(p => p.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('contains the expected core animations', () => {
    const names = ANIMATION_PRESETS.map(p => p.name)
    expect(names).toContain('fade-in')
    expect(names).toContain('fade-out')
    expect(names).toContain('slide-in-left')
    expect(names).toContain('scale-in')
    expect(names).toContain('bounce')
    expect(names).toContain('spin')
    expect(names).toContain('shake')
    expect(names).toContain('pulse')
  })
})

describe('getPresetsByCategory', () => {
  it('returns all presets in a category', () => {
    const fades = getPresetsByCategory('fade')
    expect(fades.length).toBeGreaterThan(0)
    for (const p of fades) {
      expect(p.category).toBe('fade')
    }
  })

  it('returns an empty array for unknown categories', () => {
    expect(getPresetsByCategory('nonexistent')).toEqual([])
  })

  it('preserves order within a category', () => {
    const slides = getPresetsByCategory('slide')
    const names = slides.map(p => p.name)
    // The first slide preset should be 'slide-in-left' per the file order.
    expect(names[0]).toBe('slide-in-left')
  })
})

describe('getAnimationCategories', () => {
  it('returns the union of all categories', () => {
    const categories = getAnimationCategories()
    expect(categories).toContain('fade')
    expect(categories).toContain('slide')
    expect(categories).toContain('scale')
    expect(categories).toContain('bounce')
    expect(categories).toContain('rotate')
    expect(categories).toContain('attention')
  })

  it('returns DEDUPED categories (no duplicates)', () => {
    const categories = getAnimationCategories()
    expect(new Set(categories).size).toBe(categories.length)
  })
})

describe('getPreset', () => {
  it('returns the preset by exact name', () => {
    const p = getPreset('fade-in')
    expect(p).not.toBeNull()
    expect(p!.name).toBe('fade-in')
    expect(p!.category).toBe('fade')
  })

  it('returns null for unknown name', () => {
    expect(getPreset('nope')).toBeNull()
  })

  it('is case-sensitive', () => {
    expect(getPreset('FADE-IN')).toBeNull()
  })

  it('returns the same reference as the registry entry', () => {
    const p = getPreset('spin')
    const registryEntry = ANIMATION_PRESETS.find(x => x.name === 'spin')
    expect(p).toBe(registryEntry)
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: getPresetsByCategory uses STRICT equality (not includes)', () => {
    // Catches a mutation that uses `category.includes(query)` instead.
    // 'fad' as input must NOT match 'fade'.
    expect(getPresetsByCategory('fad')).toEqual([])
  })

  it('M2: getAnimationCategories DEDUPLICATES via Set (catches map-without-set mutation)', () => {
    const categories = getAnimationCategories()
    // If the dedup is dropped, the result would have ≥ ANIMATION_PRESETS.length.
    expect(categories.length).toBeLessThan(ANIMATION_PRESETS.length)
  })

  it('M3: getPreset returns null (NOT undefined) for unknown name', () => {
    // Catches a mutation that drops the `|| null` fallback.
    const result = getPreset('does-not-exist')
    expect(result).toBeNull()
    expect(result).not.toBeUndefined()
  })
})
