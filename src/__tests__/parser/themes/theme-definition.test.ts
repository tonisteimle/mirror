/**
 * Theme Definition Tests
 *
 * Tests for parsing theme block definitions:
 * theme dark:
 *   $primary: #3B82F6
 *   $background: #1a1a1a
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'

describe('Theme Definition Parsing', () => {
  it('should parse a simple theme definition', () => {
    const code = `
theme dark:
  $primary: #3B82F6
  $background: #1a1a1a
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.themes.has('dark')).toBe(true)

    const darkTheme = result.themes.get('dark')!
    expect(darkTheme.get('primary')).toBe('#3B82F6')
    expect(darkTheme.get('background')).toBe('#1a1a1a')
  })

  it('should parse multiple theme definitions', () => {
    const code = `
theme dark:
  $primary: #3B82F6
  $text: #ffffff

theme light:
  $primary: #2563EB
  $text: #1a1a1a
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.themes.size).toBe(2)
    expect(result.themes.has('dark')).toBe(true)
    expect(result.themes.has('light')).toBe(true)

    expect(result.themes.get('dark')!.get('text')).toBe('#ffffff')
    expect(result.themes.get('light')!.get('text')).toBe('#1a1a1a')
  })

  it('should parse theme with numeric tokens', () => {
    const code = `
theme compact:
  $spacing: 8
  $radius: 4
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    const compactTheme = result.themes.get('compact')!
    expect(compactTheme.get('spacing')).toBe(8)
    expect(compactTheme.get('radius')).toBe(4)
  })

  it('should warn on empty theme', () => {
    const code = `
theme empty:
`
    const result = parse(code)

    // Empty themes should produce a warning but still be stored
    expect(result.themes.has('empty')).toBe(true)
    expect(result.themes.get('empty')!.size).toBe(0)
    // Check for warning in errors array
    const hasWarning = result.errors.some(e => e.includes('has no tokens'))
    expect(hasWarning).toBe(true)
  })

  it('should parse theme with PascalCase name', () => {
    const code = `
theme DarkMode:
  $primary: #3B82F6
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.themes.has('DarkMode')).toBe(true)
  })

  it('should not render theme definitions as nodes', () => {
    const code = `
theme dark:
  $primary: #3B82F6

Button "Test"
`
    const result = parse(code)

    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('Button')
  })
})
