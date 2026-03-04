/**
 * Parser Import Tests
 *
 * Tests parsing of import statements
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// BASIC IMPORT SYNTAX
// ============================================================================

describe('Parser: Basic Import', () => {
  it('parses import with string path', () => {
    // Import is currently skipped by parser (consumed but not stored in AST)
    const ast = parse('import "components"')
    // No error thrown = valid syntax
    expect(ast.type).toBe('Program')
  })

  it('parses import with file extension', () => {
    const ast = parse('import "styles.mirror"')
    expect(ast.type).toBe('Program')
  })

  it('parses import with path', () => {
    const ast = parse('import "lib/tokens"')
    expect(ast.type).toBe('Program')
  })

  it('parses import with relative path', () => {
    const ast = parse('import "./components/buttons"')
    expect(ast.type).toBe('Program')
  })

  it('parses import with parent path', () => {
    const ast = parse('import "../shared/tokens"')
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// MULTIPLE IMPORTS
// ============================================================================

describe('Parser: Multiple Imports', () => {
  it('parses multiple imports', () => {
    const ast = parse(`import "tokens"
import "components"
import "utils"`)
    expect(ast.type).toBe('Program')
  })

  it('parses imports with blank lines between', () => {
    const ast = parse(`import "tokens"

import "components"`)
    expect(ast.type).toBe('Program')
  })

  it('parses imports followed by content', () => {
    const ast = parse(`import "tokens"

Card as frame:
  pad 16`)
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('Card')
  })
})

// ============================================================================
// IMPORT POSITION
// ============================================================================

describe('Parser: Import Position', () => {
  it('imports at start of document', () => {
    const ast = parse(`import "tokens"
Button as button:`)
    expect(ast.components.length).toBe(1)
  })

  it('imports after comments', () => {
    const ast = parse(`// My app
import "tokens"`)
    expect(ast.type).toBe('Program')
  })

  it('imports after blank lines', () => {
    const ast = parse(`

import "tokens"`)
    expect(ast.type).toBe('Program')
  })
})

// ============================================================================
// IMPORT EDGE CASES
// ============================================================================

describe('Parser: Import Edge Cases', () => {
  it('import with empty string', () => {
    const ast = parse('import ""')
    expect(ast.type).toBe('Program')
  })

  it('import with special characters in path', () => {
    const ast = parse('import "my-lib/components_v2"')
    expect(ast.type).toBe('Program')
  })

  it('import keyword not at start of line still works', () => {
    // Note: This is testing current behavior - import anywhere on line
    const ast = parse('  import "tokens"')
    expect(ast.type).toBe('Program')
  })
})
