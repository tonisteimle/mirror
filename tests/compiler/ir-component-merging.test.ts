/**
 * Tests for component definition merging
 *
 * When a component is defined multiple times, the definitions should be merged:
 * - Properties from both definitions
 * - Children from the definition that has them
 * - States and events combined
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

// Helper to get styles from first node
function getNodeStyles(code: string) {
  const ast = parse(code)
  const ir = toIR(ast)
  return ir.nodes[0]?.styles || []
}

// Helper to find style by property name
function findStyle(styles: any[], prop: string) {
  return styles.find(s => s.property === prop)
}

describe('IR: Component Definition Merging', () => {

  describe('Split definition (styles + children separately)', () => {
    it('merges styles from first definition with children from second', () => {
      const code = `
Rect300: w 300, h 300, bg #333
Rect50: w 50, h 50, bg #666

Rect300:
  Rect50
  Rect50

Rect300
`
      const ast = parse(code)
      const ir = toIR(ast)
      const node = ir.nodes[0]

      // Should have styles from first definition
      expect(findStyle(node.styles, 'width')?.value).toBe('300px')
      expect(findStyle(node.styles, 'height')?.value).toBe('300px')
      expect(findStyle(node.styles, 'background')?.value).toBe('#333')

      // Should have children from second definition
      expect(node.children).toHaveLength(2)
      expect(node.children[0].name).toBe('Rect50')
    })

    it('applies flex container styles to Frame with children', () => {
      const code = `
Container: w 400, h 400
Child: w 50, h 50

Container:
  Child
  Child

Container
`
      const ast = parse(code)
      const ir = toIR(ast)
      const node = ir.nodes[0]

      // Frame should have flex styles
      expect(findStyle(node.styles, 'display')?.value).toBe('flex')
      expect(findStyle(node.styles, 'flex-direction')?.value).toBe('column')
    })
  })

  describe('h full in merged component', () => {
    it('child with h full gets flex:1 and min-height:0', () => {
      const code = `
Rect300: w 300, h 300
Rect50: w 50, h 50

Rect300:
  Rect50
  Rect50 h full

Rect300
`
      const ast = parse(code)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const fullChild = node.children[1]

      // h full child should have flex styles
      expect(findStyle(fullChild.styles, 'flex')?.value).toBe('1 1 0%')
      expect(findStyle(fullChild.styles, 'min-height')?.value).toBe('0')

      // h full should replace the h 50 from definition
      expect(findStyle(fullChild.styles, 'height')).toBeUndefined()
    })

    it('parent is flex container for h full to work', () => {
      const code = `
Rect300: w 300, h 300
Rect50: w 50, h 50

Rect300:
  Rect50
  Rect50 h full

Rect300
`
      const ast = parse(code)
      const ir = toIR(ast)
      const parent = ir.nodes[0]

      // Parent should be a flex container
      expect(findStyle(parent.styles, 'display')?.value).toBe('flex')
      expect(findStyle(parent.styles, 'flex-direction')?.value).toBe('column')

      // Parent should have explicit height for flex children to fill
      expect(findStyle(parent.styles, 'height')?.value).toBe('300px')
    })
  })

  describe('w full in horizontal container', () => {
    it('w full works in horizontal layout', () => {
      const code = `
Row: w 400, h 100, hor
Item: w 50, h 50

Row:
  Item
  Item w full

Row
`
      const ast = parse(code)
      const ir = toIR(ast)
      const parent = ir.nodes[0]
      const fullChild = parent.children[1]

      // Parent should be row direction
      expect(findStyle(parent.styles, 'flex-direction')?.value).toBe('row')

      // w full child should have flex styles
      expect(findStyle(fullChild.styles, 'flex')?.value).toBe('1 1 0%')
      expect(findStyle(fullChild.styles, 'min-width')?.value).toBe('0')
    })
  })

  describe('Multiple full children', () => {
    it('multiple h full children share remaining space', () => {
      const code = `
Container: w 300, h 300
Fixed: w 50, h 50
Flex: w 50, h 50

Container:
  Fixed
  Flex h full
  Flex h full

Container
`
      const ast = parse(code)
      const ir = toIR(ast)
      const parent = ir.nodes[0]

      // First child is fixed
      expect(findStyle(parent.children[0].styles, 'height')?.value).toBe('50px')

      // Second and third children should both have flex
      expect(findStyle(parent.children[1].styles, 'flex')?.value).toBe('1 1 0%')
      expect(findStyle(parent.children[2].styles, 'flex')?.value).toBe('1 1 0%')
    })
  })

  describe('Property override in second definition', () => {
    it('second definition can override properties', () => {
      const code = `
Box: w 100, bg #111

Box: bg #222

Box
`
      const ast = parse(code)
      const ir = toIR(ast)
      const node = ir.nodes[0]

      // w from first definition should be kept
      expect(findStyle(node.styles, 'width')?.value).toBe('100px')

      // bg from second definition should override
      expect(findStyle(node.styles, 'background')?.value).toBe('#222')
    })
  })
})

describe('IR: Frame Primitives and Flex', () => {

  it('Frame primitive gets flex styles automatically when it has children', () => {
    const code = `
Container:
  Box "child"

Container
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(findStyle(node.styles, 'display')?.value).toBe('flex')
    expect(findStyle(node.styles, 'flex-direction')?.value).toBe('column')
  })

  it('horizontal direction sets flex-direction row', () => {
    const code = `
Row: hor
  Box "a"
  Box "b"

Row
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(findStyle(node.styles, 'display')?.value).toBe('flex')
    expect(findStyle(node.styles, 'flex-direction')?.value).toBe('row')
  })
})
