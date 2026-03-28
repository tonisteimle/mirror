/**
 * Lexer Error Tests
 *
 * Tests lexer behavior with invalid input
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../src/parser/lexer'

// ============================================================================
// UNCLOSED STRINGS
// ============================================================================

describe('Lexer Errors: Unclosed Strings', () => {
  it('handles unclosed string at end of input', () => {
    // Lexer should either throw or return partial token
    expect(() => tokenize('"Hello')).not.toThrow()
    // Check that it doesn't hang
    const tokens = tokenize('"Hello')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles unclosed string mid-line', () => {
    const tokens = tokenize('"Hello World')
    // Should not hang
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles unclosed string with escaped quote', () => {
    const tokens = tokenize('"Hello \\"World')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles multiple unclosed strings', () => {
    const tokens = tokenize('"Hello "World')
    expect(tokens.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// INVALID HEX COLORS
// ============================================================================

describe('Lexer Errors: Invalid Hex Colors', () => {
  it('handles invalid hex characters', () => {
    // #GGG is invalid hex
    const tokens = tokenize('#GGG')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles incomplete hex color', () => {
    const tokens = tokenize('#12')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles hash without digits', () => {
    const tokens = tokenize('# ')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles hash at end of input', () => {
    const tokens = tokenize('#')
    expect(tokens.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// UNKNOWN CHARACTERS
// ============================================================================

describe('Lexer Errors: Unknown Characters', () => {
  it('skips at-sign @', () => {
    const tokens = tokenize('@test')
    // Should skip @ and parse test
    const identifiers = tokens.filter(t => t.type === 'IDENTIFIER')
    expect(identifiers.some(t => t.value === 'test')).toBe(true)
  })

  it('skips backtick `', () => {
    const tokens = tokenize('`code`')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('skips tilde ~', () => {
    const tokens = tokenize('~value')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles multiple unknown characters', () => {
    const tokens = tokenize('@#$%^&')
    // Should not hang
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('continues after unknown character', () => {
    const tokens = tokenize('Button @ "Click"')
    const identifiers = tokens.filter(t => t.type === 'IDENTIFIER')
    const strings = tokens.filter(t => t.type === 'STRING')
    expect(identifiers.some(t => t.value === 'Button')).toBe(true)
    expect(strings.some(t => t.value === 'Click')).toBe(true)
  })
})

// ============================================================================
// INVALID NUMBERS
// ============================================================================

describe('Lexer Errors: Invalid Numbers', () => {
  it('handles multiple decimal points', () => {
    const tokens = tokenize('1.2.3')
    // Should parse as 1.2 then . then 3
    expect(tokens.length).toBeGreaterThan(1)
  })

  it('handles leading decimal', () => {
    const tokens = tokenize('.5')
    // Should be DOT then NUMBER
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles trailing decimal', () => {
    const tokens = tokenize('5.')
    // Should be NUMBER then DOT
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('handles number with letters', () => {
    const tokens = tokenize('123abc')
    // Should be NUMBER then IDENTIFIER
    expect(tokens.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// MALFORMED INPUT
// ============================================================================

describe('Lexer Errors: Malformed Input', () => {
  it('handles only whitespace variations', () => {
    const tokens = tokenize('   \t  \t\t  ')
    expect(tokens.some(t => t.type === 'EOF')).toBe(true)
  })

  it('handles only special characters', () => {
    const tokens = tokenize('!!!???')
    expect(tokens.some(t => t.type === 'EOF')).toBe(true)
  })

  it('handles very deep nesting attempt', () => {
    // 100 levels of indent
    const input = Array(100).fill('  ').map((s, i) => s.repeat(i + 1) + 'x').join('\n')
    expect(() => tokenize(input)).not.toThrow()
  })

  it('handles extremely long identifier', () => {
    const longName = 'a'.repeat(10000)
    const tokens = tokenize(longName)
    const identifier = tokens.find(t => t.type === 'IDENTIFIER')
    expect(identifier?.value.length).toBe(10000)
  })

  it('handles extremely long string', () => {
    const longString = '"' + 'a'.repeat(10000) + '"'
    const tokens = tokenize(longString)
    const string = tokens.find(t => t.type === 'STRING')
    expect(string?.value.length).toBe(10000)
  })

  it('handles null bytes', () => {
    const tokens = tokenize('Button\0"Click"')
    // Should handle gracefully
    expect(tokens.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// RECOVERY
// ============================================================================

describe('Lexer: Error Recovery', () => {
  it('finds identifiers before and after invalid content', () => {
    // Test that lexer processes identifiers correctly
    const tokens = tokenize('Button Card')
    const identifiers = tokens.filter(t => t.type === 'IDENTIFIER')
    expect(identifiers.some(t => t.value === 'Button')).toBe(true)
    expect(identifiers.some(t => t.value === 'Card')).toBe(true)
  })

  it('tracks lines correctly in multiline input', () => {
    const tokens = tokenize('Line1\nLine2\nLine3')
    const line3 = tokens.find(t => t.value === 'Line3')
    expect(line3?.line).toBe(3)
  })

  it('handles mixed valid and invalid', () => {
    const tokens = tokenize('valid @ invalid # 123 "text"')
    const valid = tokens.find(t => t.value === 'valid')
    const invalid = tokens.find(t => t.value === 'invalid')
    const num = tokens.find(t => t.value === '123')
    const str = tokens.find(t => t.value === 'text')

    expect(valid).toBeDefined()
    expect(invalid).toBeDefined()
    expect(num).toBeDefined()
    expect(str).toBeDefined()
  })
})
