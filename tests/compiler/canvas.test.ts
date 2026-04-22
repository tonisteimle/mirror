/**
 * Canvas Keyword Tests
 *
 * Tests for the canvas keyword feature:
 * - Canvas defines base styling for the application
 * - Canvas must be the first non-empty line
 * - Canvas properties are applied to root element
 * - Inheritable properties (col, font, fs) flow to children
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { toIR } from '../../compiler/ir/index'
import { generateDOM } from '../../compiler/backends/dom'
import type { IR, IRCanvas } from '../../compiler/ir/types'
import type { CanvasDefinition } from '../../compiler/parser/ast'

/**
 * Helper to find a style value in canvas
 */
function findCanvasStyle(canvas: IRCanvas | undefined, property: string): string | undefined {
  if (!canvas) return undefined
  const matches = canvas.styles.filter(s => s.property === property)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

/**
 * Helper to parse Mirror code to IR
 */
function parseToIR(code: string): IR {
  const ast = parse(code)
  return toIR(ast)
}

describe('Canvas Parser', () => {
  test('parses canvas with single property', () => {
    const ast = parse('canvas bg #1a1a1a')
    expect(ast.canvas).toBeDefined()
    expect(ast.canvas?.type).toBe('Canvas')
    expect(ast.canvas?.properties).toHaveLength(1)
    expect(ast.canvas?.properties[0].name).toBe('bg')
  })

  test('parses canvas with multiple properties', () => {
    const ast = parse('canvas bg #1a1a1a, w 375, h 812, col white')
    expect(ast.canvas).toBeDefined()
    expect(ast.canvas?.properties).toHaveLength(4)

    const propNames = ast.canvas?.properties.map(p => p.name) || []
    expect(propNames).toContain('bg')
    expect(propNames).toContain('w')
    expect(propNames).toContain('h')
    expect(propNames).toContain('col')
  })

  test('canvas is optional', () => {
    const ast = parse('Text "Hello"')
    expect(ast.canvas).toBeUndefined()
  })

  test('canvas must be first non-empty line', () => {
    // Canvas after elements should NOT be parsed as canvas
    const ast = parse(`Text "Hello"
canvas bg #1a1a1a`)
    expect(ast.canvas).toBeUndefined()
  })

  test('canvas with blank lines before', () => {
    const ast = parse(`

canvas bg #1a1a1a

Text "Hello"`)
    expect(ast.canvas).toBeDefined()
    expect(ast.canvas?.properties).toHaveLength(1)
  })

  test('canvas has correct line and column', () => {
    const ast = parse('canvas bg #1a1a1a, w 375')
    expect(ast.canvas?.line).toBe(1)
    // Column is the position where 'canvas' starts (column 1 is first char)
    expect(ast.canvas?.column).toBeGreaterThanOrEqual(1)
  })
})

describe('Canvas IR Transformation', () => {
  test('transforms canvas background to styles', () => {
    const ir = parseToIR('canvas bg #1a1a1a')
    expect(ir.canvas).toBeDefined()
    expect(findCanvasStyle(ir.canvas, 'background')).toBe('#1a1a1a')
  })

  test('transforms canvas width and height', () => {
    const ir = parseToIR('canvas w 375, h 812')
    expect(ir.canvas).toBeDefined()
    expect(findCanvasStyle(ir.canvas, 'width')).toBe('375px')
    expect(findCanvasStyle(ir.canvas, 'height')).toBe('812px')
  })

  test('transforms canvas color', () => {
    const ir = parseToIR('canvas col white')
    expect(ir.canvas).toBeDefined()
    expect(findCanvasStyle(ir.canvas, 'color')).toBe('white')
  })

  test('no canvas in IR when not defined', () => {
    const ir = parseToIR('Text "Hello"')
    expect(ir.canvas).toBeUndefined()
  })

  test('canvas with multiple properties', () => {
    const ir = parseToIR('canvas bg #1a1a1a, w 375, h 812, col white')
    expect(ir.canvas).toBeDefined()
    expect(findCanvasStyle(ir.canvas, 'background')).toBe('#1a1a1a')
    expect(findCanvasStyle(ir.canvas, 'width')).toBe('375px')
    expect(findCanvasStyle(ir.canvas, 'height')).toBe('812px')
    expect(findCanvasStyle(ir.canvas, 'color')).toBe('white')
  })

  test('canvas has source position', () => {
    const ir = parseToIR('canvas bg #1a1a1a')
    expect(ir.canvas?.sourcePosition).toBeDefined()
    expect(ir.canvas?.sourcePosition?.line).toBe(1)
  })
})

describe('Canvas DOM Backend', () => {
  test('applies canvas styles to root', () => {
    const ast = parse('canvas bg #1a1a1a\n\nText "Hello"')
    const output = generateDOM(ast)

    // Should contain Object.assign for canvas styles
    expect(output).toContain('Object.assign(_root.style')
    expect(output).toContain('#1a1a1a')
  })

  test('sets CSS variables for inheritable properties', () => {
    const ast = parse('canvas col white, fs 16\n\nText "Hello"')
    const output = generateDOM(ast)

    // Should set CSS variables for color and font-size
    expect(output).toContain('--mirror-color')
    expect(output).toContain('--mirror-font-size')
  })

  test('no canvas code when canvas not defined', () => {
    const ast = parse('Text "Hello"')
    const output = generateDOM(ast)

    // Should not have Object.assign for canvas styles
    const rootCreation = output.indexOf("_root.dataset.mirrorRoot = 'true'")
    const styleInjection = output.indexOf('const _style')

    // Check that there's no Object.assign between root creation and style injection
    const betweenSection = output.slice(rootCreation, styleInjection)
    expect(betweenSection).not.toContain('Object.assign(_root.style')
  })
})

describe('Canvas with Elements', () => {
  test('canvas followed by elements', () => {
    const ir = parseToIR(`
canvas bg #1a1a1a, col white

Text "Title", fs 24
Button "Click"
`)
    // Canvas should be defined
    expect(ir.canvas).toBeDefined()
    expect(findCanvasStyle(ir.canvas, 'background')).toBe('#1a1a1a')

    // Elements should be parsed normally
    expect(ir.nodes).toHaveLength(2)
  })

  test('canvas does not affect element parsing', () => {
    const ir = parseToIR(`
canvas w 375, h 812

Frame gap 12
  Text "Hello"
  Text "World"
`)
    expect(ir.canvas).toBeDefined()
    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].children).toHaveLength(2)
  })
})

describe('Canvas Property Values', () => {
  test('numeric property values', () => {
    const ir = parseToIR('canvas w 400, h 300, fs 16')
    expect(findCanvasStyle(ir.canvas, 'width')).toBe('400px')
    expect(findCanvasStyle(ir.canvas, 'height')).toBe('300px')
    expect(findCanvasStyle(ir.canvas, 'font-size')).toBe('16px')
  })

  test('color property values', () => {
    const ir = parseToIR('canvas bg #2271C1, col #ffffff')
    expect(findCanvasStyle(ir.canvas, 'background')).toBe('#2271C1')
    expect(findCanvasStyle(ir.canvas, 'color')).toBe('#ffffff')
  })

  test('named color values', () => {
    const ir = parseToIR('canvas bg black, col white')
    expect(findCanvasStyle(ir.canvas, 'background')).toBe('black')
    expect(findCanvasStyle(ir.canvas, 'color')).toBe('white')
  })
})

describe('Canvas Device Presets', () => {
  describe('Parser', () => {
    test('parses canvas mobile', () => {
      const ast = parse('canvas mobile')
      expect(ast.canvas).toBeDefined()
      expect(ast.canvas?.device).toBe('mobile')
      expect(ast.canvas?.properties).toHaveLength(0)
    })

    test('parses canvas tablet', () => {
      const ast = parse('canvas tablet')
      expect(ast.canvas).toBeDefined()
      expect(ast.canvas?.device).toBe('tablet')
    })

    test('parses canvas desktop', () => {
      const ast = parse('canvas desktop')
      expect(ast.canvas).toBeDefined()
      expect(ast.canvas?.device).toBe('desktop')
    })

    test('parses canvas mobile with additional properties', () => {
      const ast = parse('canvas mobile, bg #1a1a1a, col white')
      expect(ast.canvas).toBeDefined()
      expect(ast.canvas?.device).toBe('mobile')
      expect(ast.canvas?.properties).toHaveLength(2)
    })

    test('device preset is case insensitive', () => {
      const ast1 = parse('canvas MOBILE')
      expect(ast1.canvas?.device).toBe('mobile')

      const ast2 = parse('canvas Mobile')
      expect(ast2.canvas?.device).toBe('mobile')
    })
  })

  describe('IR Transformation', () => {
    test('canvas mobile expands to 375x812', () => {
      const ir = parseToIR('canvas mobile')
      expect(findCanvasStyle(ir.canvas, 'width')).toBe('375px')
      expect(findCanvasStyle(ir.canvas, 'height')).toBe('812px')
    })

    test('canvas tablet expands to 768x1024', () => {
      const ir = parseToIR('canvas tablet')
      expect(findCanvasStyle(ir.canvas, 'width')).toBe('768px')
      expect(findCanvasStyle(ir.canvas, 'height')).toBe('1024px')
    })

    test('canvas desktop expands to 1440x900', () => {
      const ir = parseToIR('canvas desktop')
      expect(findCanvasStyle(ir.canvas, 'width')).toBe('1440px')
      expect(findCanvasStyle(ir.canvas, 'height')).toBe('900px')
    })

    test('device preset with additional properties', () => {
      const ir = parseToIR('canvas mobile, bg #1a1a1a, col white')
      expect(findCanvasStyle(ir.canvas, 'width')).toBe('375px')
      expect(findCanvasStyle(ir.canvas, 'height')).toBe('812px')
      expect(findCanvasStyle(ir.canvas, 'background')).toBe('#1a1a1a')
      expect(findCanvasStyle(ir.canvas, 'color')).toBe('white')
    })

    test('explicit w/h override device preset (last wins)', () => {
      const ir = parseToIR('canvas mobile, w 400')
      // Device preset sets width to 375px, then w 400 overrides
      expect(findCanvasStyle(ir.canvas, 'width')).toBe('400px')
      expect(findCanvasStyle(ir.canvas, 'height')).toBe('812px')
    })
  })

  describe('DOM Backend', () => {
    test('applies device preset styles to root', () => {
      const ast = parse('canvas mobile\n\nText "Hello"')
      const output = generateDOM(ast)

      expect(output).toContain('375px')
      expect(output).toContain('812px')
    })
  })
})
