/**
 * Integration test: pos containers should use absolute positioning during drag
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse, toIR, generateDOM } from '../../index'
import { detectLayout, isAbsoluteLayoutContainer } from '../../studio/utils/layout-detection'
import { createDefaultRegistry } from '../../studio/drop-strategies'

describe('pos container drag & drop', () => {
  it('should generate data-layout="absolute" for pos containers', () => {
    const source = `Box pos w 400, h 300, bg #f0f0f0`

    // Parse
    const ast = parse(source)
    expect(ast.instances).toHaveLength(1)
    expect(ast.instances[0].properties.some(p => p.name === 'pos')).toBe(true)

    // Transform to IR
    const { ir } = toIR(ast, true)
    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].layoutType).toBe('absolute')

    // Generate DOM code
    const code = generateDOM(ast)
    expect(code).toContain('dataset.layout = \'absolute\'')
    expect(code).not.toContain('dataset.layout = \'pos\'')
  })

  it('should execute generated code and set correct attributes', () => {
    const source = `Box pos w 400, h 300`

    const code = generateDOM(parse(source))

    // Execute the generated code
    const module = { exports: {} }
    const func = new Function('module', 'exports', code + '\nreturn createUI;')
    const createUI = func(module, module.exports)

    const ui = createUI()
    document.body.appendChild(ui.root)

    // Find the Box element
    const box = ui.root.querySelector('[data-mirror-name="Box"]') as HTMLElement
    expect(box).toBeTruthy()
    expect(box.dataset.layout).toBe('absolute')
    expect(box.style.position).toBe('relative')
  })

  it('should be detected as absolute container by layout detection', () => {
    const source = `Box pos w 400, h 300`
    const code = generateDOM(parse(source))

    const module = { exports: {} }
    const func = new Function('module', 'exports', code + '\nreturn createUI;')
    const createUI = func(module, module.exports)

    const ui = createUI()
    document.body.appendChild(ui.root)

    const box = ui.root.querySelector('[data-mirror-name="Box"]') as HTMLElement

    const layout = detectLayout(box)
    expect(layout.type).toBe('absolute')
    expect(isAbsoluteLayoutContainer(box)).toBe(true)
  })

  it('should use AbsoluteDropStrategy for pos containers', () => {
    const source = `Box pos w 400, h 300`
    const code = generateDOM(parse(source))

    const module = { exports: {} }
    const func = new Function('module', 'exports', code + '\nreturn createUI;')
    const createUI = func(module, module.exports)

    const ui = createUI()
    document.body.appendChild(ui.root)

    const box = ui.root.querySelector('[data-mirror-name="Box"]') as HTMLElement

    const registry = createDefaultRegistry()
    const strategy = registry.getStrategy(box)

    expect(strategy).toBeDefined()
    expect(strategy.type).toBe('absolute')
  })
})
