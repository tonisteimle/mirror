/**
 * Parser Token Definition Tests
 *
 * Tests parsing of design token definitions: name: type = value
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

// ============================================================================
// BASIC TOKEN DEFINITIONS
// ============================================================================

describe('Parser: Token Definitions', () => {
  it('parses color token', () => {
    const ast = parse('primary: color = #3B82F6')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('primary')
    expect(ast.tokens[0].tokenType).toBe('color')
    expect(ast.tokens[0].value).toBe('#3B82F6')
  })

  it('parses size token', () => {
    const ast = parse('sm: size = 4')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('sm')
    expect(ast.tokens[0].tokenType).toBe('size')
    expect(ast.tokens[0].value).toBe('4')
  })

  it('parses font token', () => {
    const ast = parse('body: font = "Inter"')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('body')
    expect(ast.tokens[0].tokenType).toBe('font')
    expect(ast.tokens[0].value).toBe('Inter')
  })

  it('parses icon token', () => {
    const ast = parse('home: icon = "home"')
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('home')
    expect(ast.tokens[0].tokenType).toBe('icon')
    expect(ast.tokens[0].value).toBe('home')
  })

  it('parses multiple tokens', () => {
    const ast = parse(`primary: color = #3B82F6
secondary: color = #64748B
sm: size = 4
lg: size = 16`)
    expect(ast.tokens.length).toBe(4)
    expect(ast.tokens[0].name).toBe('primary')
    expect(ast.tokens[1].name).toBe('secondary')
    expect(ast.tokens[2].name).toBe('sm')
    expect(ast.tokens[3].name).toBe('lg')
  })

  it('parses token with hyphenated name', () => {
    const ast = parse('primary-color: color = #3B82F6')
    expect(ast.tokens[0].name).toBe('primary-color')
  })

  it('parses token with number value', () => {
    const ast = parse('gap: size = 16')
    expect(ast.tokens[0].value).toBe('16')
  })

  it('parses token with string color name', () => {
    const ast = parse('text: color = "blue"')
    expect(ast.tokens[0].value).toBe('blue')
  })

  it('token has correct line/column', () => {
    const ast = parse(`
primary: color = #FFF`)
    expect(ast.tokens[0].line).toBe(2)
  })
})

// ============================================================================
// TOKEN EDGE CASES
// ============================================================================

describe('Parser: Token Edge Cases', () => {
  it('token on first line', () => {
    const ast = parse('x: color = #FFF')
    expect(ast.tokens.length).toBe(1)
  })

  it('token after comment', () => {
    const ast = parse(`// This is a comment
primary: color = #FFF`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.tokens[0].name).toBe('primary')
  })

  it('token after section header', () => {
    const ast = parse(`--- Tokens ---
primary: color = #FFF`)
    expect(ast.tokens.length).toBe(1)
  })

  it('tokens with empty lines between', () => {
    const ast = parse(`a: color = #111

b: color = #222`)
    expect(ast.tokens.length).toBe(2)
  })

  it('token with short hex color', () => {
    const ast = parse('bg: color = #FFF')
    expect(ast.tokens[0].value).toBe('#FFF')
  })

  it('token with 8-digit hex (alpha)', () => {
    const ast = parse('overlay: color = #00000080')
    expect(ast.tokens[0].value).toBe('#00000080')
  })

  it('preserves decimal in size', () => {
    const ast = parse('ratio: size = 1.5')
    expect(ast.tokens[0].value).toBe('1.5')
  })
})

// ============================================================================
// TOKENS MIXED WITH OTHER CONTENT
// ============================================================================

describe('Parser: Tokens with Components', () => {
  it('tokens before components', () => {
    const ast = parse(`primary: color = #3B82F6

Button as button:
  bg primary`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.components.length).toBe(1)
  })

  it('tokens before instances', () => {
    const ast = parse(`text: color = #FFF

Button "Click"`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('multiple sections of tokens and components', () => {
    const ast = parse(`primary: color = #FFF

Card as frame:
  pad 16

secondary: color = #000

Button as button:
  pad 8`)
    expect(ast.tokens.length).toBe(2)
    expect(ast.components.length).toBe(2)
  })
})

// ============================================================================
// SIMPLIFIED TOKEN SYNTAX (Phase 1)
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
    expect(ast.tokens[0].value).toBe('4')
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
    expect(ast.tokens[0].value).toBe('50%')
  })

  it('mixes simplified and legacy syntax', () => {
    const ast = parse(`primary: #3B82F6
text: color = #E4E4E7
sm: 4
md: size = 8`)
    expect(ast.tokens.length).toBe(4)
    expect(ast.tokens[0].name).toBe('primary')
    expect(ast.tokens[1].name).toBe('text')
    expect(ast.tokens[2].name).toBe('sm')
    expect(ast.tokens[3].name).toBe('md')
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
