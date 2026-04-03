/**
 * Lexer Comment Tests
 *
 * Tests comment handling - comments should be skipped.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, Token } from '../../compiler/parser/lexer'

// Helper: Get tokens without structural tokens
function tokens(source: string): Token[] {
  return tokenize(source).filter(t =>
    t.type !== 'EOF' && t.type !== 'NEWLINE' && t.type !== 'INDENT' && t.type !== 'DEDENT'
  )
}

// ============================================================================
// COMMENT TESTS
// ============================================================================

describe('Lexer: Comments', () => {
  it('skips single-line comment', () => {
    const source = '// This is a comment'
    expect(tokens(source).length).toBe(0)
  })

  it('skips comment, keeps code before', () => {
    const source = 'Button // This is a comment'
    const result = tokens(source)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('Button')
  })

  it('skips comment, keeps code after on next line', () => {
    const source = `// Comment
Button`
    const result = tokens(source)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('Button')
  })

  it('skips empty comment', () => {
    const source = '//'
    expect(tokens(source).length).toBe(0)
  })

  it('skips comment with only whitespace', () => {
    const source = '//   '
    expect(tokens(source).length).toBe(0)
  })

  it('skips comment with special characters', () => {
    const source = '// 🎉 Party! @#$%^&*()'
    expect(tokens(source).length).toBe(0)
  })

  it('handles multiple consecutive comments', () => {
    const source = `// Comment 1
// Comment 2
// Comment 3
Button`
    const result = tokens(source)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('Button')
  })

  it('handles inline comments after code', () => {
    const source = `Button "Click" // Click button
Card // Card component`
    const result = tokens(source)
    expect(result.length).toBe(3) // Button, "Click", Card
  })

  it('handles comment after property', () => {
    const source = 'pad 16, // padding'
    const result = tokens(source)
    expect(result.length).toBe(3) // pad, 16, ,
  })

  it('does not treat // in string as comment', () => {
    const source = '"http://example.com"'
    const result = tokens(source)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('http://example.com')
  })

  it('comment preserves indentation context', () => {
    const source = `Card
  // This is a comment
  Child`
    const allTokens = tokenize(source)
    const indentCount = allTokens.filter(t => t.type === 'INDENT').length
    expect(indentCount).toBe(1)
  })
})
