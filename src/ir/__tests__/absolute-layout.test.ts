/**
 * Absolute Layout Tests
 *
 * Tests for absolute positioning with x/y and stacked containers.
 * - `stacked` = creates stacking context (position: relative)
 * - `abs`/`absolute` = absolutely positioned element (position: absolute)
 * - `x`/`y` = implicitly sets position: absolute
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { toIR } from '../index'

describe('Absolute Layout', () => {
  describe('stacked container', () => {
    it('stacked sets position relative on container', () => {
      const code = 'Box stacked, w 400, h 300'
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const node = ir.nodes[0]
      const positionStyle = node.styles.find(s => s.property === 'position')
      expect(positionStyle).toBeDefined()
      expect(positionStyle?.value).toBe('relative')
    })

    it('stacked works with other layout properties', () => {
      const code = 'Box stacked, w 800, h 600, bg #1a1a1a'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'position')?.value).toBe('relative')
      expect(node.styles.find(s => s.property === 'width')?.value).toBe('800px')
      expect(node.styles.find(s => s.property === 'height')?.value).toBe('600px')
      expect(node.styles.find(s => s.property === 'background')?.value).toBe('#1a1a1a')
    })
  })

  describe('x property', () => {
    it('x sets position absolute and left', () => {
      const code = 'Box x 100'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(node.styles.find(s => s.property === 'left')?.value).toBe('100px')
    })

    it('x works with numeric values', () => {
      const code = 'Box x 250'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'left')?.value).toBe('250px')
    })
  })

  describe('y property', () => {
    it('y sets position absolute and top', () => {
      const code = 'Box y 50'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(node.styles.find(s => s.property === 'top')?.value).toBe('50px')
    })

    it('y works with numeric values', () => {
      const code = 'Box y 120'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'top')?.value).toBe('120px')
    })
  })

  describe('x and y together', () => {
    it('x and y together work correctly', () => {
      const code = 'Box x 100, y 50, w 200, h 150'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(node.styles.find(s => s.property === 'left')?.value).toBe('100px')
      expect(node.styles.find(s => s.property === 'top')?.value).toBe('50px')
      expect(node.styles.find(s => s.property === 'width')?.value).toBe('200px')
      expect(node.styles.find(s => s.property === 'height')?.value).toBe('150px')
    })

    it('x and y work with other styling properties', () => {
      const code = 'Box x 100, y 50, w 200, h 150, bg #3B82F6, rad 8'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'left')?.value).toBe('100px')
      expect(node.styles.find(s => s.property === 'top')?.value).toBe('50px')
      expect(node.styles.find(s => s.property === 'background')?.value).toBe('#3B82F6')
      expect(node.styles.find(s => s.property === 'border-radius')?.value).toBe('8px')
    })
  })

  describe('stacked container with positioned children', () => {
    it('children with x/y are positioned within stacked container', () => {
      const code = `
Canvas: stacked, w 400, h 300
  Box x 50, y 30, w 100, h 80, bg #3B82F6
  Box x 120, y 80, w 100, h 80, bg #10B981

Canvas
`
      const ast = parse(code)
      const ir = toIR(ast)

      // Find Canvas instance (second occurrence is the instance)
      const canvas = ir.nodes[0]
      expect(canvas.name).toBe('Canvas')
      expect(canvas.styles.find(s => s.property === 'position')?.value).toBe('relative')

      // Check children
      expect(canvas.children).toHaveLength(2)

      const box1 = canvas.children[0]
      expect(box1.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(box1.styles.find(s => s.property === 'left')?.value).toBe('50px')
      expect(box1.styles.find(s => s.property === 'top')?.value).toBe('30px')

      const box2 = canvas.children[1]
      expect(box2.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(box2.styles.find(s => s.property === 'left')?.value).toBe('120px')
      expect(box2.styles.find(s => s.property === 'top')?.value).toBe('80px')
    })
  })

  describe('complex components with x/y', () => {
    it('component with internal layout can be positioned with x/y', () => {
      const code = `
InputField: hor, gap 8
  Text "Label"
  Box w 200, h 32, bg #333

Canvas: stacked, w 800, h 600
  InputField x 100, y 50

Canvas
`
      const ast = parse(code)
      const ir = toIR(ast)

      // Find Canvas instance
      const canvas = ir.nodes[0]
      expect(canvas.name).toBe('Canvas')

      // InputField should be positioned
      const inputField = canvas.children[0]
      expect(inputField.name).toBe('InputField')
      expect(inputField.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(inputField.styles.find(s => s.property === 'left')?.value).toBe('100px')
      expect(inputField.styles.find(s => s.property === 'top')?.value).toBe('50px')

      // InputField should also retain its internal layout
      expect(inputField.styles.find(s => s.property === 'flex-direction')?.value).toBe('row')
      expect(inputField.styles.find(s => s.property === 'gap')?.value).toBe('8px')
    })
  })

  describe('z-index with absolute positioning', () => {
    it('z property works with x/y for layering', () => {
      const code = 'Box x 100, y 50, z 10, w 200, h 150'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.styles.find(s => s.property === 'position')?.value).toBe('absolute')
      expect(node.styles.find(s => s.property === 'left')?.value).toBe('100px')
      expect(node.styles.find(s => s.property === 'top')?.value).toBe('50px')
      expect(node.styles.find(s => s.property === 'z-index')?.value).toBe('10')
    })
  })
})
