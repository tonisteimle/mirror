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
