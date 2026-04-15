/**
 * Parser Tests: Custom Icons ($icons)
 *
 * Tests for custom icon registry parsing and IR transformation.
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Custom Icons Parsing', () => {
  describe('Basic Icon Definition', () => {
    test('parses single icon definition', () => {
      const code = `$icons:
  hbox: "M3 3h18v18H3z M9 3v18"`
      const ast = parse(code)

      expect(ast.icons).toBeDefined()
      expect(ast.icons.length).toBe(1)
      expect(ast.icons[0].name).toBe('hbox')
      expect(ast.icons[0].path).toBe('M3 3h18v18H3z M9 3v18')
    })

    test('parses multiple icon definitions', () => {
      const code = `$icons:
  hbox: "M3 3h18v18H3z M9 3v18"
  vbox: "M3 3h18v18H3z M21 9H3"
  grid: "M3 3h8v8H3z M13 3h8v8h-8z"`
      const ast = parse(code)

      expect(ast.icons.length).toBe(3)
      expect(ast.icons[0].name).toBe('hbox')
      expect(ast.icons[1].name).toBe('vbox')
      expect(ast.icons[2].name).toBe('grid')
    })

    test('parses empty icons section', () => {
      const code = `$icons:
  `
      const ast = parse(code)

      expect(ast.icons).toBeDefined()
      expect(ast.icons.length).toBe(0)
    })
  })

  describe('Icon Source Position', () => {
    test('icons have line/column info', () => {
      const code = `$icons:
  myicon: "M0 0h24v24H0z"`
      const ast = parse(code)

      expect(ast.icons[0].line).toBeDefined()
      expect(ast.icons[0].column).toBeDefined()
    })
  })

  describe('IR Transformation', () => {
    test('icons are passed through to IR', () => {
      const code = `$icons:
  hbox: "M3 3h18v18H3z"
  vbox: "M3 3h18v18H3z"

Frame
  Icon "hbox", is 24`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.icons).toBeDefined()
      expect(ir.icons.length).toBe(2)
      expect(ir.icons[0].name).toBe('hbox')
      expect(ir.icons[0].path).toBe('M3 3h18v18H3z')
      expect(ir.icons[0].viewBox).toBe('0 0 24 24') // default viewBox
    })
  })

  describe('Icons with UI Elements', () => {
    test('icons can be used alongside normal elements', () => {
      const code = `$icons:
  custom: "M0 0L24 24"

Frame gap 8
  Icon "custom", is 20
  Icon "check", is 20
  Text "Hello"`
      const ast = parse(code)
      const ir = toIR(ast)

      // Should have 1 custom icon
      expect(ir.icons.length).toBe(1)

      // Should have the frame with children
      expect(ir.nodes.length).toBe(1)
      expect(ir.nodes[0].children.length).toBe(3)
    })
  })
})
