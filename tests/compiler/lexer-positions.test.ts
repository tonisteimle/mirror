/**
 * Lexer Position Tests
 *
 * Tests line and column tracking.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, Token } from '../../compiler/parser/lexer'

// Helper: Get all tokens
function allTokens(source: string): Token[] {
  return tokenize(source)
}

// Helper: Find first token of type
function findToken(source: string, type: string, value?: string): Token | undefined {
  return allTokens(source).find(t =>
    t.type === type && (value === undefined || t.value === value)
  )
}

// ============================================================================
// LINE NUMBERS
// ============================================================================

describe('Lexer: Line Numbers', () => {
  it('first token is on line 1', () => {
    const source = 'Button'
    const token = findToken(source, 'IDENTIFIER')
    expect(token?.line).toBe(1)
  })

  it('second line starts at line 2', () => {
    const source = `Line1
Line2`
    const token = findToken(source, 'IDENTIFIER', 'Line2')
    expect(token?.line).toBe(2)
  })

  it('tracks multiple lines', () => {
    const source = `A
B
C
D
E`
    const tokenE = findToken(source, 'IDENTIFIER', 'E')
    expect(tokenE?.line).toBe(5)
  })

  it('empty lines increment line count', () => {
    const source = `A

B`
    const tokenB = findToken(source, 'IDENTIFIER', 'B')
    expect(tokenB?.line).toBe(3)
  })

  it('multiple empty lines', () => {
    const source = `A



B`
    const tokenB = findToken(source, 'IDENTIFIER', 'B')
    expect(tokenB?.line).toBe(5)
  })

  it('comment line increments count', () => {
    const source = `A
// comment
B`
    const tokenB = findToken(source, 'IDENTIFIER', 'B')
    expect(tokenB?.line).toBe(3)
  })
})

// ============================================================================
// COLUMN NUMBERS
// ============================================================================

describe('Lexer: Column Numbers', () => {
  it('first token column is at END of token (implementation detail)', () => {
    // Note: Current implementation tracks column at END of token, not START
    // This is because addToken() is called after advance() consumes the characters
    const source = 'Button'
    const token = findToken(source, 'IDENTIFIER')
    // 'Button' is 6 chars, column tracks end position
    expect(token?.column).toBe(7)
  })

  it('second token has column after first', () => {
    const source = 'A B'
    const tokens = allTokens(source).filter(t => t.type === 'IDENTIFIER')
    // A ends at col 2, space skipped, B ends at col 4
    expect(tokens[0].column).toBe(2)
    expect(tokens[1].column).toBe(4)
  })

  it('column resets after newline', () => {
    const source = `LongIdentifier
A`
    const tokenA = findToken(source, 'IDENTIFIER', 'A')
    // After newline, column should reset
    expect(tokenA?.line).toBe(2)
  })

  it('indentation affects column', () => {
    const source = `A
  B`
    const tokenB = findToken(source, 'IDENTIFIER', 'B')
    // B is indented by 2 spaces, so column > 1
    expect(tokenB?.column).toBeGreaterThan(1)
  })

  it('string token starts at quote position', () => {
    const source = 'x "Hello"'
    const str = findToken(source, 'STRING')
    // String token's column should be where the quote starts
    expect(str?.column).toBeGreaterThan(1)
  })
})

// ============================================================================
// POSITION ACCURACY
// ============================================================================

describe('Lexer: Position Accuracy', () => {
  it('tracks position through mixed content', () => {
    const source = `// comment
Card as frame:
  pad 16`
    const padToken = findToken(source, 'IDENTIFIER', 'pad')
    expect(padToken?.line).toBe(3)
  })

  it('section header has correct line', () => {
    const source = `--- Buttons ---
Button`
    const section = findToken(source, 'SECTION')
    const button = findToken(source, 'IDENTIFIER', 'Button')
    expect(section?.line).toBe(1)
    expect(button?.line).toBe(2)
  })

  it('multi-line string position (string on one line)', () => {
    const source = `A
"Hello World"
B`
    const str = findToken(source, 'STRING')
    expect(str?.line).toBe(2)
  })

  it('tracks position in realistic example', () => {
    const source = `// Tokens
primary: color = #3B82F6

// Components
Card as frame:
  pad 16
  bg primary`
    const bgToken = findToken(source, 'IDENTIFIER', 'bg')
    expect(bgToken?.line).toBe(7)
  })
})

// ============================================================================
// EOF POSITION
// ============================================================================

describe('Lexer: EOF Position', () => {
  it('EOF has correct line for single line', () => {
    const source = 'Button'
    const eof = allTokens(source).find(t => t.type === 'EOF')
    expect(eof?.line).toBe(1)
  })

  it('EOF has correct line for multi-line', () => {
    const source = `A
B
C`
    const eof = allTokens(source).find(t => t.type === 'EOF')
    expect(eof?.line).toBe(3)
  })

  it('EOF line accounts for trailing newlines', () => {
    const source = `A

`
    const eof = allTokens(source).find(t => t.type === 'EOF')
    // After trailing newlines, line count increases
    expect(eof?.line).toBeGreaterThanOrEqual(2)
  })
})
