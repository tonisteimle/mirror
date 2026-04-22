/**
 * Input Mask IR and Code Generation Tests
 *
 * Tests that mask property is correctly parsed, transformed to IR, and emitted.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

describe('Input Mask IR', () => {
  it('parses mask property', () => {
    const code = 'Input mask "###.####.####.##"'
    const ast = parse(code)
    expect(ast.instances).toHaveLength(1)

    const instance = ast.instances[0]
    const maskProp = instance.properties.find(p => p.name === 'mask')
    expect(maskProp).toBeDefined()
    expect(maskProp?.values[0]).toBe('###.####.####.##')
  })

  it('transforms mask to IR', () => {
    const code = 'Input mask "###.####.####.##"'
    const ast = parse(code)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].mask).toBe('###.####.####.##')
  })

  it('emits mask setup code', () => {
    const code = 'Input mask "###.####.####.##"'
    const ast = parse(code)
    const output = generateDOM(ast, { runtime: false })

    expect(output).toContain('_runtime.applyMask')
    expect(output).toContain('###.####.####.##')
  })

  it('emits mask with value binding', () => {
    const code = `
ahv: ""
Input mask "###.####.####.##", bind ahv
`
    const ast = parse(code)
    const output = generateDOM(ast, { runtime: false })

    expect(output).toContain('_runtime.applyMask')
    expect(output).toContain('_runtime.formatWithMask')
    expect(output).toContain('_runtime.getMaskRawValue')
  })

  it('does not emit mask for inputs without mask property', () => {
    const code = 'Input placeholder "Enter text"'
    const ast = parse(code)
    const output = generateDOM(ast, { runtime: false })

    // Check that the specific mask setup call is not present for this input
    // (the runtime itself contains applyMask as a function definition)
    expect(output).not.toContain('_runtime.applyMask(node_')
    expect(output).not.toContain('// Input mask:')
  })
})
