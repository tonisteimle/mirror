/**
 * Parser Token Definition Tests
 *
 * Tests parsing of design token definitions in their canonical syntaxes:
 *   primary: #2271C1                — type inferred from value
 *   primary.bg: #2271C1             — typed via suffix
 *   accent.bg: $primary             — token-to-token reference
 *
 * The legacy `name: type = value` syntax was removed in Slice 24, Phase C.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

// ============================================================================
// SIMPLIFIED TOKEN SYNTAX (type inferred from value)
// ============================================================================

describe('Parser: Simplified Token Syntax', () => {
  it('parses color token without type', () => {
    const ast = parse('primary: #3B82F6')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('primary')
    expect(ast.tokens[0].tokenType).toBe('color')
    expect(ast.tokens[0].value).toBe('#3B82F6')
  })

  it('parses size token without type', () => {
    const ast = parse('sm: 4')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('sm')
    expect(ast.tokens[0].tokenType).toBe('size')
    expect(ast.tokens[0].value).toBe(4)
  })

  it('parses font token without type', () => {
    const ast = parse('body: "Inter"')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('body')
    expect(ast.tokens[0].tokenType).toBe('font')
    expect(ast.tokens[0].value).toBe('Inter')
  })

  it('parses multiple simplified tokens', () => {
    const ast = parse(`primary: #3B82F6
danger: #EF4444
sm: 4
lg: 16`)
    expect(ast.tokens.length).toBe(4)
    expect(ast.tokens[0].tokenType).toBe('color')
    expect(ast.tokens[1].tokenType).toBe('color')
    expect(ast.tokens[2].tokenType).toBe('size')
    expect(ast.tokens[3].tokenType).toBe('size')
  })

  it('parses percentage values as size', () => {
    const ast = parse('half: 50%')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('half')
    expect(ast.tokens[0].tokenType).toBe('size')
    expect(ast.tokens[0].value).toBe(50)
  })

  it('simplified tokens work with components', () => {
    const ast = parse(`primary: #3B82F6
sm: 4

Button as button:
  pad sm, bg primary`)
    expect(ast.tokens.length).toBe(2)
    expect(ast.components.length).toBe(1)
  })
})

// ============================================================================
// EDGE CASES (canonical syntax)
// ============================================================================

describe('Parser: Token Edge Cases', () => {
  it('token on first line', () => {
    const ast = parse('x: #FFF')
    expect(ast.tokens.length).toBe(1)
  })

  it('token after comment', () => {
    const ast = parse(`// This is a comment
primary: #FFF`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('primary')
  })

  it('token after section header', () => {
    const ast = parse(`--- Tokens ---
primary: #FFF`)
    expect(ast.tokens.length).toBe(1)
  })

  it('tokens with empty lines between', () => {
    const ast = parse(`a: #111

b: #222`)
    expect(ast.tokens.length).toBe(2)
  })

  it('token with short hex color', () => {
    const ast = parse('bg: #FFF')
    expect(ast.tokens[0].value).toBe('#FFF')
  })

  it('token with 8-digit hex (alpha)', () => {
    const ast = parse('overlay: #00000080')
    expect(ast.tokens[0].value).toBe('#00000080')
  })

  it('preserves decimal in size', () => {
    const ast = parse('ratio: 1.5')
    expect(ast.tokens[0].value).toBe(1.5)
  })

  it('parses token with hyphenated name', () => {
    const ast = parse('primary-color: #3B82F6')
    expect(ast.tokens[0].name).toBe('primary-color')
  })

  it('token has correct line/column', () => {
    const ast = parse(`
primary: #FFF`)
    expect(ast.tokens[0].line).toBe(2)
  })
})

// ============================================================================
// TOKENS MIXED WITH OTHER CONTENT
// ============================================================================

describe('Parser: Tokens with Components', () => {
  it('tokens before components', () => {
    const ast = parse(`primary: #3B82F6

Button as button:
  bg primary`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.components.length).toBe(1)
  })

  it('tokens before instances', () => {
    const ast = parse(`text: #FFF

Button "Click"`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('multiple sections of tokens and components', () => {
    const ast = parse(`primary: #FFF

Card as frame:
  pad 16

secondary: #000

Button as button:
  pad 8`)
    expect(ast.tokens.length).toBe(2)
    expect(ast.components.length).toBe(2)
  })
})

// ============================================================================
// SUFFIX TOKEN SYNTAX (typed via suffix)
// ============================================================================

describe('Parser: Suffix Token Syntax', () => {
  it('parses suffix-typed color token', () => {
    const ast = parse('primary.bg: #2271C1')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('primary.bg')
    expect(ast.tokens[0].tokenType).toBe('color')
    expect(ast.tokens[0].value).toBe('#2271C1')
  })

  it('parses suffix-typed size token', () => {
    const ast = parse('btn.pad: 12')
    expect(ast.tokens[0].tokenType).toBe('size')
    expect(ast.tokens[0].value).toBe(12)
  })

  it('parses multi-value size token', () => {
    const ast = parse('btn.pad: 10 16')
    expect(ast.tokens[0].name).toBe('btn.pad')
    expect(ast.tokens[0].value).toBe('10 16')
  })

  it('parses token reference (chain)', () => {
    const ast = parse(`primary.bg: #2271C1
accent.bg: $primary`)
    expect(ast.tokens.length).toBe(2)
    expect(ast.tokens[1].name).toBe('accent.bg')
    expect(ast.tokens[1].value).toBe('$primary')
  })
})
