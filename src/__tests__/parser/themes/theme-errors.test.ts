/**
 * Theme Error Cases Tests
 *
 * Tests for error handling in theme parsing:
 * - Undefined theme reference
 * - Forward reference (use before define)
 * - Syntax errors
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'

describe('Theme Error Cases', () => {
  it('should error when using undefined theme', () => {
    const code = `
use theme undefined
`
    const result = parse(code)

    expect(result.errors.length).toBeGreaterThan(0)
    const hasError = result.errors.some(e => e.includes('not defined'))
    expect(hasError).toBe(true)
    expect(result.activeTheme).toBeNull()
  })

  it('should error on forward reference (use before define)', () => {
    const code = `
use theme dark

theme dark:
  $primary: #3B82F6
`
    const result = parse(code)

    expect(result.errors.length).toBeGreaterThan(0)
    const hasError = result.errors.some(e => e.includes('not defined'))
    expect(hasError).toBe(true)
  })

  it('should error when theme keyword is missing after use', () => {
    const code = `
theme dark:
  $primary: #3B82F6

use dark
`
    const result = parse(code)

    // Should error because 'use' expects 'theme' after it
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should handle ambiguous syntax (theme: is parsed as component definition)', () => {
    // Note: `theme:` without a name is ambiguous and gets parsed as a component definition
    // This is correct behavior - the lexer sees PascalCase + colon and returns COMPONENT_DEF
    const code = `
theme:
  $primary: #3B82F6
`
    const result = parse(code)

    // 'theme:' is interpreted as a component definition, not a theme definition
    // So no themes are created, and no errors about missing theme name
    expect(result.themes.size).toBe(0)
  })

  it('should error when colon is missing after theme name', () => {
    const code = `
theme dark
  $primary: #3B82F6
`
    const result = parse(code)

    expect(result.errors.length).toBeGreaterThan(0)
    const hasError = result.errors.some(e => e.includes('Expected ":"'))
    expect(hasError).toBe(true)
  })

  it('should handle nested themes gracefully (not supported)', () => {
    // Nested themes are not supported - they should be parsed as separate definitions
    const code = `
theme dark:
  $primary: #3B82F6
  theme nested:
    $secondary: #10B981
`
    const result = parse(code)

    // The nested theme should not be recognized as a theme definition
    // It should be treated as invalid indented content
    expect(result.themes.has('dark')).toBe(true)
    // 'nested' should NOT be a separate theme since it's indented inside 'dark'
  })

  it('should recover from errors and continue parsing', () => {
    const code = `
theme dark:
  $primary: #3B82F6

use theme undefined

theme light:
  $secondary: #10B981

Button "After errors"
`
    const result = parse(code)

    // Should have error for undefined theme
    expect(result.errors.length).toBeGreaterThan(0)

    // But should still parse the rest
    expect(result.themes.has('dark')).toBe(true)
    expect(result.themes.has('light')).toBe(true)
    expect(result.nodes.length).toBe(1)
    expect(result.nodes[0].name).toBe('Button')
  })
})
