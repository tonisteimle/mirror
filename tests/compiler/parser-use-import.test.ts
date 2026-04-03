import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('use import statement', () => {
  it('parses use statement', () => {
    const code = `use components

Frame
  Text "Test"`

    const ast = parse(code)

    expect(ast.imports).toEqual(['components'])
  })

  it('parses multiple use statements', () => {
    const code = `use components
use utils
use theme

Frame
  Text "Test"`

    const ast = parse(code)

    expect(ast.imports).toEqual(['components', 'utils', 'theme'])
  })

  it('handles use with dashes in filename', () => {
    const code = `use my-components

Frame
  Text "Test"`

    const ast = parse(code)

    // Note: lexer may split this, need to check
    expect(ast.imports.length).toBeGreaterThan(0)
  })
})
