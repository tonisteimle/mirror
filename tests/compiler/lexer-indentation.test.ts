/**
 * Lexer Indentation Tests
 *
 * Tests INDENT/DEDENT token generation for block structure.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, Token, TokenType } from '../../compiler/parser/lexer'

// Helper: Get structural tokens (INDENT, DEDENT, NEWLINE, EOF)
function structuralTokens(source: string): Token[] {
  return tokenize(source).filter(t =>
    t.type === 'INDENT' || t.type === 'DEDENT' || t.type === 'NEWLINE' || t.type === 'EOF'
  )
}

// Helper: Get all tokens
function allTokens(source: string): Token[] {
  return tokenize(source)
}

// Helper: Count specific token type
function countTokens(source: string, type: TokenType): number {
  return tokenize(source).filter(t => t.type === type).length
}

// ============================================================================
// BASIC INDENTATION
// ============================================================================

describe('Lexer: Basic Indentation', () => {
  it('no indentation produces no INDENT/DEDENT', () => {
    const source = 'Button'
    expect(countTokens(source, 'INDENT')).toBe(0)
    expect(countTokens(source, 'DEDENT')).toBe(0)
  })

  it('single level indent with 2 spaces', () => {
    const source = `Card
  child`
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('single level indent with 4 spaces', () => {
    const source = `Card
    child`
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('single level indent with tab', () => {
    const source = `Card
\tchild`
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('dedent back to base level', () => {
    const source = `Card
  child
Button`
    expect(countTokens(source, 'INDENT')).toBe(1)
    expect(countTokens(source, 'DEDENT')).toBe(1)
  })

  it('multiple levels of indent', () => {
    const source = `Level0
  Level1
    Level2
      Level3`
    expect(countTokens(source, 'INDENT')).toBe(3)
  })

  it('multiple levels of dedent', () => {
    const source = `Level0
  Level1
    Level2
      Level3
Level0Again`
    expect(countTokens(source, 'DEDENT')).toBe(3)
  })

  it('EOF closes all open indents', () => {
    const source = `Level0
  Level1
    Level2`
    // Should have 2 INDENTs and 2 DEDENTs (at EOF)
    expect(countTokens(source, 'INDENT')).toBe(2)
    expect(countTokens(source, 'DEDENT')).toBe(2)
  })
})

// ============================================================================
// INDENT/DEDENT BALANCE
// ============================================================================

describe('Lexer: INDENT/DEDENT Balance', () => {
  it('INDENT count equals DEDENT count (simple)', () => {
    const source = `A
  B
C`
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })

  it('INDENT count equals DEDENT count (nested)', () => {
    const source = `A
  B
    C
      D
    E
  F
G`
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })

  it('INDENT count equals DEDENT count (multiple blocks)', () => {
    const source = `Block1
  Child1
Block2
  Child2
    GrandChild
Block3`
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })

  it('INDENT count equals DEDENT count (deep nesting)', () => {
    const source = `A
  B
    C
      D
        E
          F`
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })
})

// ============================================================================
// EMPTY LINES
// ============================================================================

describe('Lexer: Empty Lines', () => {
  it('empty line between siblings', () => {
    const source = `Card
  Child1

  Child2`
    // Should still have proper structure
    const tokens = allTokens(source)
    const childTokens = tokens.filter(t => t.type === 'IDENTIFIER' && t.value.startsWith('Child'))
    expect(childTokens.length).toBe(2)
  })

  it('empty lines preserve indentation context', () => {
    const source = `Parent
  Child1


  Child2`
    // Both children should be at same level (1 INDENT total)
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('multiple empty lines', () => {
    const source = `A



B`
    // No indent/dedent, just NEWLINEs
    expect(countTokens(source, 'INDENT')).toBe(0)
    expect(countTokens(source, 'DEDENT')).toBe(0)
  })

  it('empty lines at start', () => {
    const source = `

A
  B`
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('empty lines at end', () => {
    const source = `A
  B

`
    // DEDENT should still happen
    expect(countTokens(source, 'DEDENT')).toBe(1)
  })
})

// ============================================================================
// WHITESPACE ONLY LINES
// ============================================================================

describe('Lexer: Whitespace-only Lines', () => {
  it('line with only spaces is treated as empty', () => {
    const source = `A
  B

  C`
    // The whitespace-only line should not affect structure
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('line with only tabs is treated as empty', () => {
    const source = `A
  B
\t\t
  C`
    expect(countTokens(source, 'INDENT')).toBe(1)
  })
})

// ============================================================================
// MIXED INDENTATION
// ============================================================================

describe('Lexer: Mixed Indentation', () => {
  it('tabs treated as 4 spaces', () => {
    const source1 = `A
    B`  // 4 spaces
    const source2 = `A
\tB`  // 1 tab
    // Both should produce same indent level
    expect(countTokens(source1, 'INDENT')).toBe(countTokens(source2, 'INDENT'))
  })

  it('tabs and spaces on different lines', () => {
    const source = `A
  B
\tC`  // 2 spaces, then 1 tab (=4 spaces)
    const tokens = allTokens(source)
    // Should have INDENT for B, then another INDENT for C (4 > 2)
    expect(countTokens(source, 'INDENT')).toBe(2)
  })
})

// ============================================================================
// REALISTIC STRUCTURES
// ============================================================================

describe('Lexer: Realistic Structures', () => {
  it('component with properties block', () => {
    const source = `Card as frame:
  pad 16
  bg surface`
    expect(countTokens(source, 'INDENT')).toBe(1)
    expect(countTokens(source, 'DEDENT')).toBe(1)
  })

  it('component with state block', () => {
    const source = `Button as button:
  pad 8
  hover:
    bg primary`
    expect(countTokens(source, 'INDENT')).toBe(2)
    expect(countTokens(source, 'DEDENT')).toBe(2)
  })

  it('nested components', () => {
    const source = `App
  Header
    Logo
    Nav
  Content
    Main
  Footer`
    // App -> Header (1), Header -> Logo (2), back to Nav (1),
    // back to Content (0->1), Content -> Main (2), back to Footer (1)
    const tokens = allTokens(source)
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })

  it('keys block structure', () => {
    const source = `Dropdown:
  keys
    escape close
    enter select
    arrow-down next`
    expect(countTokens(source, 'INDENT')).toBe(2)
    expect(countTokens(source, 'DEDENT')).toBe(2)
  })

  it('multiple top-level components', () => {
    const source = `Button as button:
  pad 8

Card as frame:
  pad 16

App
  Button "Click"
  Card
    Text "Hello"`
    // Should have balanced indents
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Lexer: Indentation Edge Cases', () => {
  it('very deep nesting (10 levels)', () => {
    let source = 'L0'
    for (let i = 1; i <= 10; i++) {
      source += '\n' + '  '.repeat(i) + `L${i}`
    }
    expect(countTokens(source, 'INDENT')).toBe(10)
    expect(countTokens(source, 'DEDENT')).toBe(10)
  })

  it('single character per line', () => {
    const source = `A
  B
    C
  D
E`
    expect(countTokens(source, 'INDENT')).toBe(countTokens(source, 'DEDENT'))
  })

  it('dedent skips levels', () => {
    const source = `A
  B
    C
      D
E`  // Jump from level 3 back to level 0
    expect(countTokens(source, 'DEDENT')).toBe(3)
  })

  it('consistent indent width maintained', () => {
    const source = `A
  B
  C
  D`
    // All at same level, so just one INDENT
    expect(countTokens(source, 'INDENT')).toBe(1)
  })

  it('re-indent after dedent', () => {
    const source = `A
  B
C
  D`
    expect(countTokens(source, 'INDENT')).toBe(2)
    expect(countTokens(source, 'DEDENT')).toBe(2)
  })
})

// ============================================================================
// NEWLINE HANDLING
// ============================================================================

describe('Lexer: Newline Handling', () => {
  it('produces NEWLINE tokens', () => {
    const source = `A
B
C`
    expect(countTokens(source, 'NEWLINE')).toBeGreaterThan(0)
  })

  it('INDENT comes before NEWLINE in token sequence', () => {
    const source = `A
  B`
    const tokens = allTokens(source)
    const indentIdx = tokens.findIndex(t => t.type === 'INDENT')
    const newlineIdx = tokens.findIndex(t => t.type === 'NEWLINE')
    // Implementation: handleIndentation emits INDENT first, then NEWLINE
    expect(indentIdx).toBeLessThan(newlineIdx)
  })

  it('no trailing NEWLINE at EOF', () => {
    const source = 'A'
    const tokens = allTokens(source)
    const lastNonEof = tokens[tokens.length - 2]
    expect(lastNonEof?.type).not.toBe('NEWLINE')
  })
})
