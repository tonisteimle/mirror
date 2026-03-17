/**
 * Error Tests: Undefined References
 *
 * Tests for undefined component and token references.
 */

import { describe, it, expect } from 'vitest'
import { parseOnly } from '../../test-utils'

describe('Undefined References', () => {
  it('parses component instantiation', () => {
    // Parser creates AST nodes even for undefined components
    // Validation happens at a later stage
    const ast = parseOnly('UndefinedComponent')
    expect(ast).toBeDefined()
    expect(ast.instances).toBeDefined()
  })

  it('parses inheritance declaration', () => {
    // Parser creates AST nodes for inheritance
    const ast = parseOnly('MyButton as UndefinedParent:')
    expect(ast).toBeDefined()
    expect(ast.components).toBeDefined()
  })

  it('parses token reference', () => {
    // Token references are parsed without error
    const ast = parseOnly(`Box as frame:
  bg $undefinedToken

Box`)
    expect(ast).toBeDefined()
    expect(ast.errors.length).toBe(0)
  })

  it('parses multiple component instantiations', () => {
    const ast = parseOnly(`
Unknown1
Unknown2
Unknown3
`)
    // Parser creates instances for each component use
    expect(ast).toBeDefined()
    expect(ast.instances.length).toBeGreaterThan(0)
  })
})
