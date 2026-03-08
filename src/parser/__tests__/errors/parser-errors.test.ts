/**
 * Parser Error Tests
 *
 * Tests parser behavior with invalid or malformed input.
 * Note: Some edge cases cause the parser to hang (infinite loop).
 * These are marked as .skip or .todo for future fix.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// MISSING COLONS (collects errors instead of throwing)
// ============================================================================

describe('Parser Errors: Missing Colons', () => {
  it('collects error on missing colon after "as"', () => {
    const ast = parse('Card as frame')
    expect(ast.errors.length).toBe(1)
    expect(ast.errors[0].message).toContain('Expected COLON')
  })

  it('collects error on missing colon after "extends"', () => {
    const ast = parse('DangerButton extends Button')
    expect(ast.errors.length).toBe(1)
    expect(ast.errors[0].message).toContain('Expected COLON')
  })

  it('parses component with colon correctly', () => {
    const ast = parse('Card as frame:')
    expect(ast.components.length).toBe(1)
    expect(ast.errors.length).toBe(0)
  })
})

// ============================================================================
// INCOMPLETE DEFINITIONS (collects errors)
// ============================================================================

describe('Parser Errors: Incomplete Definitions', () => {
  it('handles missing primitive after "as"', () => {
    const ast = parse('Card as:')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('handles missing parent after "extends"', () => {
    const ast = parse('DangerButton extends:')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('handles "as" at end of file', () => {
    const ast = parse('Card as')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('handles "extends" at end of file', () => {
    const ast = parse('DangerButton extends')
    expect(ast.errors.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// INVALID TOKEN DEFINITIONS
// ============================================================================

describe('Parser Errors: Invalid Token Definitions', () => {
  it('handles token without equals', () => {
    // 'primary: color #FFF' - missing =
    const ast = parse('primary: color #FFF')
    expect(ast.type).toBe('Program')
  })

  it('handles token without value', () => {
    // 'primary: color =' - missing value after =
    const ast = parse('primary: color =')
    expect(ast.type).toBe('Program')
  })

  it('handles token with only name', () => {
    // 'primary:' - parsed as slot/state in component body
    const ast = parse('primary:')
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// INDENTATION ERRORS
// ============================================================================

describe('Parser Errors: Indentation', () => {
  it('handles unexpected indent', () => {
    const ast = parse(`  IndentedFirst`)
    expect(ast.type).toBe('Program')
  })

  it('handles nested indentation', () => {
    const input = `Card as frame:
  pad 16
    bg blue`
    const ast = parse(input)
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// PROPERTY ERRORS
// ============================================================================

describe('Parser Errors: Property Errors', () => {
  it('handles property with only name', () => {
    const ast = parse('Card as frame: pad')
    expect(ast.components[0].properties[0].name).toBe('pad')
  })

  it('handles multiple commas', () => {
    const ast = parse('Card as frame: pad 8,, bg blue')
    expect(ast.components[0].properties.length).toBeGreaterThan(0)
  })

  it('handles trailing comma', () => {
    const ast = parse('Card as frame: pad 8,')
    expect(ast.components[0].properties.length).toBe(1)
  })

  it('handles leading comma', () => {
    const ast = parse('Card as frame: , pad 8')
    expect(ast.components[0].properties.length).toBe(1)
  })
})

// ============================================================================
// EMPTY CONSTRUCTS
// ============================================================================

describe('Parser Errors: Empty Constructs', () => {
  it('handles empty component body', () => {
    const ast = parse(`Card as frame:
`)
    expect(ast.components.length).toBe(1)
  })

  it('handles empty state body', () => {
    const ast = parse(`Card as frame:
  hover:`)
    expect(ast.components[0].states.length).toBe(1)
  })

  it('handles empty keys block', () => {
    const ast = parse(`Card as frame:
  keys`)
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// UNEXPECTED TOKENS
// ============================================================================

describe('Parser Errors: Unexpected Tokens', () => {
  it('handles stray colon', () => {
    const ast = parse(': Card')
    expect(ast.type).toBe('Program')
  })

  it('handles stray equals', () => {
    const ast = parse('= value')
    expect(ast.type).toBe('Program')
  })

  it('handles stray comma', () => {
    const ast = parse(', Card')
    expect(ast.type).toBe('Program')
  })

  it('handles number at top level', () => {
    const ast = parse('123')
    expect(ast.type).toBe('Program')
  })

  it('handles string at top level', () => {
    const ast = parse('"Hello"')
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// EVENT ERRORS
// ============================================================================

describe('Parser Errors: Event Errors', () => {
  it('handles event without action', () => {
    const ast = parse(`Card as frame:
  onclick`)
    expect(ast.components[0].events.length).toBe(1)
    expect(ast.components[0].events[0].actions.length).toBe(0)
  })

  it('handles keyboard event without key', () => {
    const ast = parse(`Card as frame:
  onkeydown`)
    expect(ast.components[0].events.length).toBe(1)
  })
})

// ============================================================================
// NAMED INSTANCE ERRORS
// ============================================================================

describe('Parser Errors: Named Instance Errors', () => {
  it('handles "named" without name', () => {
    // Parser doesn't throw but may parse incomplete
    const ast = parse('Button named')
    expect(ast.type).toBe('Program')
  })

  it('handles "named" with number', () => {
    const ast = parse('Button named 123')
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// COMPLEX SCENARIOS
// ============================================================================

describe('Parser Errors: Complex Scenarios', () => {
  it('handles unknown chars in component body', () => {
    const ast = parse(`
Card as frame:
  @ invalid
  pad 16
`)
    expect(ast.components.length).toBe(1)
  })

  it('handles error then valid content', () => {
    const ast = parse(`
@ error
Card as frame:
  pad 16
`)
    expect(ast.components.length).toBe(1)
  })
})
