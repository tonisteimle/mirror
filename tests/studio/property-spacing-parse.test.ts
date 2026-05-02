/**
 * Tests for the shared spacing/margin parsing utilities.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  parseSidesValue,
  extractSides,
  spacingPropertyNames,
} from '../../studio/panels/property/utils/spacing-parse'
import type { ExtractedProperty } from '../../studio/core/compiler-types'

function prop(name: string, value: string): ExtractedProperty {
  return {
    name,
    value,
    hasValue: true,
    source: 'instance' as const,
  } as ExtractedProperty
}

describe('parseSidesValue', () => {
  it('returns empty sides for empty input', () => {
    expect(parseSidesValue('')).toEqual({ t: '', r: '', b: '', l: '' })
  })

  it('1-value: applies to all sides', () => {
    expect(parseSidesValue('8')).toEqual({ t: '8', r: '8', b: '8', l: '8' })
  })

  it('2-value: V then H', () => {
    expect(parseSidesValue('8 16')).toEqual({ t: '8', r: '16', b: '8', l: '16' })
  })

  it('3-value: T then H then B (CSS shorthand)', () => {
    expect(parseSidesValue('8 16 12')).toEqual({ t: '8', r: '16', b: '12', l: '16' })
  })

  it('4-value: T R B L', () => {
    expect(parseSidesValue('8 16 12 24')).toEqual({ t: '8', r: '16', b: '12', l: '24' })
  })

  it('returns empty for malformed input (5+ parts)', () => {
    expect(parseSidesValue('1 2 3 4 5')).toEqual({ t: '', r: '', b: '', l: '' })
  })

  it('tolerates extra whitespace', () => {
    expect(parseSidesValue('  8   16  ')).toEqual({ t: '8', r: '16', b: '8', l: '16' })
  })
})

describe('extractSides', () => {
  it('reads shorthand alone', () => {
    const r = extractSides([prop('pad', '8 16')], 'padding', 'pad', 'p')
    expect(r).toEqual({ t: '8', r: '16', b: '8', l: '16' })
  })

  it('reads per-side props alone (no shorthand)', () => {
    const r = extractSides(
      [prop('pad-t', '4'), prop('pad-r', '8'), prop('pad-b', '12'), prop('pad-l', '16')],
      'padding',
      'pad',
      'p'
    )
    expect(r).toEqual({ t: '4', r: '8', b: '12', l: '16' })
  })

  it('per-side props override shorthand', () => {
    const r = extractSides([prop('pad', '8'), prop('pad-t', '20')], 'padding', 'pad', 'p')
    expect(r).toEqual({ t: '20', r: '8', b: '8', l: '8' })
  })

  it('axis props apply to both sides on the axis', () => {
    const r = extractSides([prop('pad-x', '12'), prop('pad-y', '4')], 'padding', 'pad', 'p')
    expect(r).toEqual({ t: '4', r: '12', b: '4', l: '12' })
  })

  it('per-side props win over axis props', () => {
    const r = extractSides([prop('pad-x', '12'), prop('pad-r', '30')], 'padding', 'pad', 'p')
    expect(r.r).toBe('30')
    expect(r.l).toBe('12')
  })

  it('works for margin family', () => {
    const r = extractSides([prop('mar', '4 8 12'), prop('mar-r', '99')], 'margin', 'mar', 'm')
    expect(r).toEqual({ t: '4', r: '99', b: '12', l: '8' })
  })

  it('falls back to ultra-short alias (`p`, `m`)', () => {
    const r = extractSides([prop('p', '8')], 'padding', 'pad', 'p')
    expect(r).toEqual({ t: '8', r: '8', b: '8', l: '8' })
  })
})

describe('spacingPropertyNames', () => {
  it('lists every shorthand + axis + per-side name', () => {
    expect(spacingPropertyNames('padding', 'pad', 'p')).toEqual([
      'padding',
      'pad',
      'p',
      'pad-x',
      'pad-y',
      'pad-t',
      'pad-r',
      'pad-b',
      'pad-l',
    ])
  })

  it('produces the margin family symmetrically', () => {
    expect(spacingPropertyNames('margin', 'mar', 'm')).toEqual([
      'margin',
      'mar',
      'm',
      'mar-x',
      'mar-y',
      'mar-t',
      'mar-r',
      'mar-b',
      'mar-l',
    ])
  })
})
