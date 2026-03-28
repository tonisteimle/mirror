/**
 * Slot IR Transformation Tests
 *
 * Tests for Slot primitive transformation from AST to IR.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/parser'
import { toIR } from '../../src/ir'

describe('Slot IR Transformation', () => {
  describe('basic slot rendering', () => {
    it('transforms Slot primitive to IR node', () => {
      const code = 'Slot "Header"'
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const node = ir.nodes[0]
      expect(node.tag).toBe('div')
      expect(node.primitive).toBe('slot')
    })

    it('sets textContent to slot name', () => {
      const code = 'Slot "Header"'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const textContent = node.properties.find(p => p.name === 'textContent')
      expect(textContent).toBeDefined()
      expect(textContent?.value).toBe('Header')
    })

    it('default slot name is "default"', () => {
      const code = 'Slot'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const textContent = node.properties.find(p => p.name === 'textContent')
      expect(textContent?.value).toBe('default')
    })
  })

  describe('slot with properties', () => {
    it('transforms slot width property', () => {
      const code = 'Slot "Sidebar", w 200'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const widthStyle = node.styles.find(s => s.property === 'width')
      expect(widthStyle).toBeDefined()
      expect(widthStyle?.value).toBe('200px')
    })

    it('transforms slot height property', () => {
      const code = 'Slot "Header", h 60'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const heightStyle = node.styles.find(s => s.property === 'height')
      expect(heightStyle).toBeDefined()
      expect(heightStyle?.value).toBe('60px')
    })

    it('transforms slot with full width', () => {
      const code = 'Slot "Content", w full'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      // 'full' becomes flex grow in flex containers
      const flexStyle = node.styles.find(s => s.property === 'flex')
      expect(flexStyle?.value).toBe('1 1 0%')
    })

    it('transforms multiple slot properties', () => {
      const code = 'Slot "Content", w full, h 300, bg #f0f0f0'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      // 'full' becomes flex grow
      expect(node.styles.find(s => s.property === 'flex')?.value).toBe('1 1 0%')
      expect(node.styles.find(s => s.property === 'height')?.value).toBe('300px')
      expect(node.styles.find(s => s.property === 'background')?.value).toBe('#f0f0f0')
    })
  })

  describe('slot as child', () => {
    it('transforms slot as child of Box', () => {
      const code = `Box ver
  Slot "Header"`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const box = ir.nodes[0]
      expect(box.children).toHaveLength(1)
      expect(box.children[0].primitive).toBe('slot')
    })

    it('transforms multiple slots as children', () => {
      const code = `Box ver
  Slot "Header", h 60
  Slot "Content"
  Slot "Footer", h 40`
      const ast = parse(code)
      const ir = toIR(ast)

      const box = ir.nodes[0]
      expect(box.children).toHaveLength(3)
      expect(box.children[0].primitive).toBe('slot')
      expect(box.children[1].primitive).toBe('slot')
      expect(box.children[2].primitive).toBe('slot')
    })

    it('transforms mixed children (Slot and Instance)', () => {
      const code = `Box ver
  Slot "Header"
  Text "Hello"
  Slot "Footer"`
      const ast = parse(code)
      const ir = toIR(ast)

      const box = ir.nodes[0]
      expect(box.children).toHaveLength(3)
      expect(box.children[0].primitive).toBe('slot')
      expect(box.children[1].tag).toBe('span') // Text renders as span
      expect(box.children[2].primitive).toBe('slot')
    })
  })

  describe('slot in component definition', () => {
    it('transforms slot when component is instantiated', () => {
      // Component definitions only appear in IR when instantiated
      const code = `Card:
  Slot "Header"
  Slot "Content"

Card`
      const ast = parse(code)
      const ir = toIR(ast)

      // The Card instance should have the Slot children
      expect(ir.nodes.length).toBe(1)
      const cardNode = ir.nodes[0]
      expect(cardNode.children.length).toBe(2)
      expect(cardNode.children[0].primitive).toBe('slot')
      expect(cardNode.children[1].primitive).toBe('slot')
    })
  })

  describe('slot source position', () => {
    it('preserves source position in IR', () => {
      const code = 'Slot "Test"'
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.sourcePosition).toBeDefined()
      expect(node.sourcePosition?.line).toBeDefined()
      expect(node.sourcePosition?.column).toBeDefined()
    })
  })

  describe('empty slot rendering', () => {
    it('empty slot gets rendered (not skipped)', () => {
      const code = `Box ver
  Slot "Empty"`
      const ast = parse(code)
      const ir = toIR(ast)

      const box = ir.nodes[0]
      // Empty slot should still be rendered as a child
      expect(box.children).toHaveLength(1)
      expect(box.children[0].primitive).toBe('slot')
    })

    it('slot without name defaults to "default"', () => {
      const code = `Box ver
  Slot`
      const ast = parse(code)
      const ir = toIR(ast)

      const box = ir.nodes[0]
      expect(box.children).toHaveLength(1)
      const slotNode = box.children[0]
      const textContent = slotNode.properties.find(p => p.name === 'textContent')
      expect(textContent?.value).toBe('default')
    })
  })
})
