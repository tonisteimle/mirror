/**
 * V1 Syntax Tests: Tokens
 *
 * Tests for design token definitions and usage.
 */

import { describe, it, expect } from 'vitest'
import { parse, props, getToken } from '../test-utils'

describe('Token Definitions', () => {
  it('defines color token with colon syntax', () => {
    const result = parse('$primary: #3B82F6')
    expect(getToken(result, 'primary')).toBe('#3B82F6')
  })

  it('defines number token', () => {
    const result = parse('$spacing: 16')
    expect(getToken(result, 'spacing')).toBe(16)
  })

  it('defines multiple tokens', () => {
    const result = parse(`$primary: #3B82F6
$spacing: 16
$radius: 8`)
    expect(getToken(result, 'primary')).toBe('#3B82F6')
    expect(getToken(result, 'spacing')).toBe(16)
    expect(getToken(result, 'radius')).toBe(8)
  })
})

describe('Token Usage', () => {
  it('uses token for background', () => {
    expect(props(`$primary: #3B82F6
Box bg $primary`).bg).toBe('#3B82F6')
  })

  it('uses token for padding', () => {
    expect(props(`$spacing: 16
Box pad $spacing`).pad).toBe(16)
  })
})

describe('Token-Scope Syntax', () => {
  it('defines scoped tokens with simple names', () => {
    const result = parse(`$dropdown:
  bg #1A1A23
  border #333`)
    expect(getToken(result, 'dropdown.bg')).toBe('#1A1A23')
    expect(getToken(result, 'dropdown.border')).toBe('#333')
  })

  it('defines scoped tokens with compound names', () => {
    const result = parse(`$dropdown:
  item.hover #333
  item.selected #2271c1`)
    expect(getToken(result, 'dropdown.item.hover')).toBe('#333')
    expect(getToken(result, 'dropdown.item.selected')).toBe('#2271c1')
  })

  it('uses scoped tokens in components', () => {
    expect(props(`$dropdown:
  bg #1A1A23
  item.hover #333

Box bg $dropdown.bg`).bg).toBe('#1A1A23')
  })

  it('mixes scoped and regular tokens', () => {
    const result = parse(`$primary: #3B82F6
$dropdown:
  bg #1A1A23
  selected $primary`)
    expect(getToken(result, 'primary')).toBe('#3B82F6')
    expect(getToken(result, 'dropdown.bg')).toBe('#1A1A23')
    expect(getToken(result, 'dropdown.selected')).toBe('#3B82F6')
  })
})
