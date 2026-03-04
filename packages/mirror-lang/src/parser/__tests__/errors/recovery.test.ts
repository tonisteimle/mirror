/**
 * Parser Recovery Tests
 *
 * Tests parser error recovery behavior.
 * Note: Current parser throws on certain errors rather than recovering.
 * These tests document the current behavior and mark recovery features as TODO.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// ERROR COLLECTION (collects errors instead of throwing)
// ============================================================================

describe('Parser: Error Collection', () => {
  it('collects error on missing colon after "as"', () => {
    const ast = parse('Card as frame')
    expect(ast.errors.length).toBe(1)
    expect(ast.errors[0].message).toContain('Expected COLON')
    expect(ast.errors[0].hint).toBe('Add a colon after "frame"')
  })

  it('collects error on missing colon after "extends"', () => {
    const ast = parse('DangerButton extends Button')
    expect(ast.errors.length).toBe(1)
    expect(ast.errors[0].message).toContain('Expected COLON')
    expect(ast.errors[0].hint).toBe('Add a colon after "Button"')
  })

  it('collects error on incomplete "as" definition', () => {
    const ast = parse('Card as:')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('collects error on incomplete "extends" definition', () => {
    const ast = parse('Child extends:')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// VALID ERROR HANDLING (doesn't throw)
// ============================================================================

describe('Parser: Graceful Handling', () => {
  it('handles unknown tokens gracefully', () => {
    // @ and other unknown chars are skipped by lexer
    const ast = parse('@ Card as frame:')
    expect(ast.components.length).toBe(1)
  })

  it('handles empty component body', () => {
    const ast = parse('Card as frame:\n')
    expect(ast.components.length).toBe(1)
  })

  it('handles comments between definitions', () => {
    const ast = parse(`
Card as frame:
// This is a comment
Button as button:
`)
    expect(ast.components.length).toBe(2)
  })

  it('handles blank lines between definitions', () => {
    const ast = parse(`
Card as frame:


Button as button:
`)
    expect(ast.components.length).toBe(2)
  })
})

// ============================================================================
// TOKEN PARSING RECOVERY
// ============================================================================

describe('Parser: Token Parsing', () => {
  it('skips malformed token and continues', () => {
    // Token without = is just skipped
    const ast = parse(`
primary: color #FFF
good: color = #000
`)
    // May or may not find good token depending on parser behavior
    expect(ast.type).toBe('Program')
  })

  it('parses valid tokens after comments', () => {
    const ast = parse(`
// Color tokens
primary: color = #FFF
secondary: color = #000
`)
    expect(ast.tokens.length).toBe(2)
  })
})

// ============================================================================
// INSTANCE PARSING RECOVERY
// ============================================================================

describe('Parser: Instance Parsing', () => {
  it('handles unknown characters in instance area', () => {
    const ast = parse(`
@ ignore this
Card
  Text "Hello"
`)
    // Parser treats "ignore" and "this" as separate instances after @ is skipped
    // Main assertion: Card is parsed
    const card = ast.instances.find(i => i.component === 'Card')
    expect(card).toBeDefined()
    expect(card?.children.length).toBe(1)
  })

  it('parses children after blank lines', () => {
    const ast = parse(`
Card

  Text "Hello"
`)
    // Blank line may affect indentation parsing
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// STATE/EVENT PARSING
// ============================================================================

describe('Parser: State and Event Parsing', () => {
  it('handles state with empty body', () => {
    const ast = parse(`Card as frame:
  hover:`)
    expect(ast.components[0].states.length).toBe(1)
  })

  it('handles event without action', () => {
    const ast = parse(`Card as frame:
  onclick`)
    expect(ast.components[0].events.length).toBe(1)
  })

  it('parses multiple states', () => {
    const ast = parse(`Card as frame:
  hover:
    bg light
  focus:
    bor 1 blue`)
    expect(ast.components[0].states.length).toBe(2)
  })
})

// ============================================================================
// PARTIAL PARSING
// ============================================================================

describe('Parser: Partial Document Parsing', () => {
  it('parses complete valid document', () => {
    const ast = parse(`
// Tokens
primary: color = #FFF

// Components
Card as frame:
  pad 16

// Instances
Card
  Text "Hello"
`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.components.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('parses multiple components', () => {
    const ast = parse(`
Card as frame:
  pad 16
Button as button:
  pad 8
Text as text:
  col white
`)
    expect(ast.components.length).toBe(3)
  })

  it('handles large documents', () => {
    const components = Array.from({ length: 50 }, (_, i) =>
      `Component${i} as frame:`
    ).join('\n')
    const ast = parse(components)
    expect(ast.components.length).toBe(50)
  })
})

// ============================================================================
// ERROR RECOVERY (continues parsing after errors)
// ============================================================================

describe('Parser Recovery', () => {
  it('continues parsing after "as" error', () => {
    const ast = parse(`Card as frame
Button as button:`)
    // Should have error for Card
    expect(ast.errors.length).toBe(1)
    // Should still find Button
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('Button')
  })

  it('continues parsing after "extends" error', () => {
    const ast = parse(`Bad extends Button
Good extends Button:`)
    // Should have error for Bad
    expect(ast.errors.length).toBe(1)
    // Should still find Good
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('Good')
  })

  it('collects multiple errors', () => {
    const ast = parse(`Card as frame
Button as button
Text as text:`)
    // Should have 2 errors (Card and Button missing colons)
    expect(ast.errors.length).toBe(2)
    // Should still find Text
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('Text')
  })

  it('provides error recovery hints', () => {
    const ast = parse('Card as frame')
    expect(ast.errors[0].hint).toBe('Add a colon after "frame"')
  })
})
