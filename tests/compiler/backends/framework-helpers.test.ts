/**
 * framework helpers — direct unit-tests
 *
 * `parseGridSpan` and `parsePxValue` were extracted from inline
 * code in framework.ts during the helpers-cluster split. Both are
 * pure functions covered indirectly via the round-trip differential
 * tests, but the parse semantics are subtle enough (multi-value
 * shorthand, bare-numeric strings, var() pass-through) to warrant
 * direct pins.
 */

import { describe, it, expect } from 'vitest'
import { parseGridSpan, parsePxValue } from '../../../compiler/backends/framework/ops/helpers'

describe('parseGridSpan', () => {
  it('parses `span N` to a number', () => {
    expect(parseGridSpan('span 3')).toBe(3)
    expect(parseGridSpan('span 12')).toBe(12)
    expect(parseGridSpan('span 1')).toBe(1)
  })

  it('parses `span var(--token)` to the var() string', () => {
    expect(parseGridSpan('span var(--cols)')).toBe('var(--cols)')
    expect(parseGridSpan('span var(--grid-12)')).toBe('var(--grid-12)')
  })

  it('returns null for non-span values', () => {
    expect(parseGridSpan('3')).toBe(null)
    expect(parseGridSpan('auto')).toBe(null)
    expect(parseGridSpan('1 / 3')).toBe(null)
    expect(parseGridSpan('')).toBe(null)
  })

  it('returns null for malformed span', () => {
    // No digit
    expect(parseGridSpan('span')).toBe(null)
    expect(parseGridSpan('span ')).toBe(null)
    // Not a var()
    expect(parseGridSpan('span foo')).toBe(null)
  })
})

describe('parsePxValue', () => {
  it('strips `px` suffix and returns number', () => {
    expect(parsePxValue('16px')).toBe(16)
    expect(parsePxValue('100px')).toBe(100)
    expect(parsePxValue('-8px')).toBe(-8)
    expect(parsePxValue('1.5px')).toBe(1.5)
  })

  it('passes var() values through unchanged', () => {
    expect(parsePxValue('var(--gap)')).toBe('var(--gap)')
    expect(parsePxValue('var(--space-md)')).toBe('var(--space-md)')
  })

  it('keeps multi-value shorthand as CSS string', () => {
    expect(parsePxValue('12px 8px')).toBe('12px 8px')
    expect(parsePxValue('1px 2px 3px 4px')).toBe('1px 2px 3px 4px')
  })

  it('round-trips bare numeric strings to numbers', () => {
    expect(parsePxValue('0')).toBe(0)
    expect(parsePxValue('5')).toBe(5)
    expect(parsePxValue('-3')).toBe(-3)
    expect(parsePxValue('1.25')).toBe(1.25)
  })

  it('returns input unchanged for unrecognised non-numeric values', () => {
    expect(parsePxValue('auto')).toBe('auto')
    expect(parsePxValue('inherit')).toBe('inherit')
    expect(parsePxValue('100%')).toBe('100%')
  })
})
