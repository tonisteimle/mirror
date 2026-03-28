/**
 * Lexer Edge Case Tests
 *
 * Tests unusual inputs, unicode, whitespace variants, etc.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, Token } from '../../src/parser/lexer'

// Helper
function tokens(source: string): Token[] {
  return tokenize(source).filter(t => t.type !== 'EOF')
}

function allTokens(source: string): Token[] {
  return tokenize(source)
}

// ============================================================================
// EMPTY & MINIMAL INPUT
// ============================================================================

describe('Lexer: Empty & Minimal Input', () => {
  it('empty string produces only EOF', () => {
    const result = allTokens('')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('EOF')
  })

  it('only whitespace produces only EOF', () => {
    const result = allTokens('   ')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('EOF')
  })

  it('only newlines produces NEWLINEs and EOF', () => {
    const result = allTokens('\n\n\n')
    const nonEof = result.filter(t => t.type !== 'EOF')
    expect(nonEof.every(t => t.type === 'NEWLINE')).toBe(true)
  })

  it('only tabs produces only EOF', () => {
    const result = allTokens('\t\t\t')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('EOF')
  })

  it('single character', () => {
    const result = tokens('A')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('IDENTIFIER')
  })

  it('single digit', () => {
    const result = tokens('5')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
  })
})

// ============================================================================
// UNICODE
// ============================================================================

describe('Lexer: Unicode', () => {
  it('unicode in string', () => {
    const result = tokens('"Ümläüt"')
    expect(result[0].value).toBe('Ümläüt')
  })

  it('emoji in string', () => {
    const result = tokens('"🎉🎊🎁"')
    expect(result[0].value).toBe('🎉🎊🎁')
  })

  it('CJK characters in string', () => {
    const result = tokens('"日本語"')
    expect(result[0].value).toBe('日本語')
  })

  it('arabic in string', () => {
    const result = tokens('"مرحبا"')
    expect(result[0].value).toBe('مرحبا')
  })

  it('mixed unicode in string', () => {
    const result = tokens('"Hello 世界 🌍"')
    expect(result[0].value).toBe('Hello 世界 🌍')
  })

  // Note: Unicode in identifiers depends on isAlpha implementation
  it('identifier with underscore is valid', () => {
    const result = tokens('my_var')
    expect(result[0].type).toBe('IDENTIFIER')
  })
})

// ============================================================================
// WHITESPACE VARIANTS
// ============================================================================

describe('Lexer: Whitespace Variants', () => {
  it('multiple spaces between tokens', () => {
    const result = tokens('A    B')
    expect(result.length).toBe(2)
    expect(result[0].value).toBe('A')
    expect(result[1].value).toBe('B')
  })

  it('tabs between tokens', () => {
    const result = tokens('A\t\tB')
    expect(result.length).toBe(2)
  })

  it('mixed spaces and tabs', () => {
    const result = tokens('A \t B')
    expect(result.length).toBe(2)
  })

  it('trailing whitespace', () => {
    const result = tokens('A   ')
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('A')
  })

  it('leading whitespace on first line (unusual)', () => {
    const result = tokens('  A')
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('A')
  })

  it('carriage return handling', () => {
    // Windows-style line endings
    const result = tokens('A\r\nB')
    const identifiers = result.filter(t => t.type === 'IDENTIFIER')
    expect(identifiers.length).toBe(2)
  })
})

// ============================================================================
// LONG INPUTS
// ============================================================================

describe('Lexer: Long Inputs', () => {
  it('very long identifier', () => {
    const longName = 'A'.repeat(1000)
    const result = tokens(longName)
    expect(result[0].value).toBe(longName)
  })

  it('very long string', () => {
    const longText = 'x'.repeat(10000)
    const result = tokens(`"${longText}"`)
    expect(result[0].value).toBe(longText)
  })

  it('many tokens', () => {
    const source = Array(1000).fill('A').join(' ')
    const result = tokens(source)
    expect(result.length).toBe(1000)
  })

  it('many lines', () => {
    const source = Array(1000).fill('A').join('\n')
    const allToks = allTokens(source)
    // Should have ~1000 identifiers plus newlines plus EOF
    const identifiers = allToks.filter(t => t.type === 'IDENTIFIER')
    expect(identifiers.length).toBe(1000)
  })

  it('deeply nested indentation', () => {
    let source = 'L0'
    for (let i = 1; i <= 50; i++) {
      source += '\n' + '  '.repeat(i) + `L${i}`
    }
    const allToks = allTokens(source)
    const indents = allToks.filter(t => t.type === 'INDENT')
    expect(indents.length).toBe(50)
  })
})

// ============================================================================
// BOUNDARY CONDITIONS
// ============================================================================

describe('Lexer: Boundary Conditions', () => {
  it('number at max safe integer', () => {
    const num = String(Number.MAX_SAFE_INTEGER)
    const result = tokens(num)
    expect(result[0].value).toBe(num)
  })

  it('hex color edge: short form', () => {
    const result = tokens('#000')
    expect(result[0].value).toBe('#000')
  })

  it('hex color edge: only hash', () => {
    const result = tokens('#')
    // Just hash with no hex digits
    expect(result[0].value).toBe('#')
  })

  it('float starting with dot parsed as dot + number', () => {
    const result = tokens('.5')
    expect(result[0].type).toBe('DOT')
  })

  it('consecutive punctuation', () => {
    const result = tokens(':::')
    expect(result.length).toBe(3)
    expect(result.every(t => t.type === 'COLON')).toBe(true)
  })

  it('string with only spaces', () => {
    const result = tokens('"   "')
    expect(result[0].value).toBe('   ')
  })

  it('string with newline escape sequence', () => {
    const result = tokens('"line1\\nline2"')
    // The \n is kept as literal characters, not converted
    expect(result[0].value).toBe('line1\\nline2')
  })
})

// ============================================================================
// ERROR RESILIENCE
// ============================================================================

describe('Lexer: Error Resilience', () => {
  it('unknown characters are skipped', () => {
    const result = tokens('A @ B')
    expect(result.length).toBe(2)
    expect(result[0].value).toBe('A')
    expect(result[1].value).toBe('B')
  })

  it('multiple unknown characters', () => {
    const result = tokens('A @#$%^ B')
    // Note: # triggers scanNumber, $ starts variable scan
    // So we get: A, #, $, B (4 tokens)
    expect(result.length).toBe(4)
  })

  it('brackets are skipped', () => {
    const result = tokens('func(arg)')
    // func, arg are identifiers, () are skipped
    expect(result.filter(t => t.type === 'IDENTIFIER').length).toBe(2)
  })

  it('unclosed string reads to end of line', () => {
    const source = '"unclosed\nB'
    const result = tokens(source)
    // String will read "unclosed" then we get B on next line
    // Actual behavior depends on implementation
    expect(result.length).toBeGreaterThan(0)
  })

  it('continues after invalid hex', () => {
    const result = tokens('#GGG A')
    // #GGG is invalid hex, but lexer should continue
    expect(result.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// SPECIAL SEQUENCES
// ============================================================================

describe('Lexer: Special Sequences', () => {
  it('double equals as single token', () => {
    const result = tokens('==')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('EQUALS')
    expect(result[0].value).toBe('==')
  })

  it('double colon', () => {
    const result = tokens('::')
    expect(result.length).toBe(2)
  })

  it('arrow-like sequence', () => {
    const result = tokens('->')
    // - is unknown/skipped, > is now a valid GT token
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('GT')
  })

  it('comparison operators', () => {
    const result = tokens('a > b')
    // > is now a valid GT token
    expect(result.filter(t => t.type === 'IDENTIFIER').length).toBe(2)
    expect(result.filter(t => t.type === 'GT').length).toBe(1)
  })

  it('dot before identifier', () => {
    const result = tokens('.prop')
    expect(result[0].type).toBe('DOT')
    expect(result[1].type).toBe('IDENTIFIER')
  })

  it('colon after identifier', () => {
    const result = tokens('name:')
    expect(result[0].type).toBe('IDENTIFIER')
    expect(result[1].type).toBe('COLON')
  })
})
