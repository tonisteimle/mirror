/**
 * Theme Usage Tests
 *
 * Tests for applying themes with `use theme X`:
 * theme dark:
 *   $primary: #3B82F6
 *
 * use theme dark
 *
 * Button bg $primary
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'

describe('Theme Usage (use theme)', () => {
  it('should apply theme tokens to designTokens', () => {
    const code = `
theme dark:
  $primary: #3B82F6
  $background: #1a1a1a

use theme dark
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.activeTheme).toBe('dark')
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.tokens.get('background')).toBe('#1a1a1a')
  })

  it('should resolve theme tokens in component properties', () => {
    const code = `
theme dark:
  $primary: #3B82F6
  $text: #ffffff

use theme dark

Button bg $primary, col $text, "Click"
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)

    const button = result.nodes[0]
    expect(button.properties.bg).toBe('#3B82F6')
    expect(button.properties.col).toBe('#ffffff')
  })

  it('should allow switching between themes (last one wins)', () => {
    const code = `
theme dark:
  $primary: #3B82F6

theme light:
  $primary: #2563EB

use theme dark
use theme light
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.activeTheme).toBe('light')
    expect(result.tokens.get('primary')).toBe('#2563EB')
  })

  it('should override global tokens with theme tokens', () => {
    const code = `
$primary: #FF0000

theme dark:
  $primary: #3B82F6

use theme dark

Button bg $primary
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    // Theme token should override global token
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })

  it('should keep global tokens not defined in theme', () => {
    const code = `
$secondary: #10B981
$radius: 8

theme dark:
  $primary: #3B82F6

use theme dark

Button bg $primary, rad $radius
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.tokens.get('secondary')).toBe('#10B981')
    expect(result.tokens.get('radius')).toBe(8)
  })

  it('should set activeTheme in parse result', () => {
    const code = `
theme dark:
  $primary: #3B82F6

theme light:
  $primary: #2563EB

use theme dark
`
    const result = parse(code)

    expect(result.activeTheme).toBe('dark')
  })

  it('should set activeTheme to null when no theme is used', () => {
    const code = `
theme dark:
  $primary: #3B82F6

Button "No theme"
`
    const result = parse(code)

    expect(result.activeTheme).toBeNull()
  })
})
