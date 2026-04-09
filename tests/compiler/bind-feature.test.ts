/**
 * Tests for the `bind` feature
 *
 * `bind varName` on a container tracks the text content of the active
 * exclusive() child element in a variable.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

describe('bind feature', () => {
  describe('parser', () => {
    it('parses bind keyword on component definition', () => {
      const code = `
Options: Frame bind city
  Option "Berlin"
`
      const ast = parse(code)
      const component = ast.components.find(c => c.name === 'Options')
      expect(component?.bind).toBe('city')
    })

    it('parses bind keyword on instance', () => {
      const code = `
Frame bind selectedValue
  Text "A"
`
      const ast = parse(code)
      const instance = ast.instances[0]
      expect(instance?.bind).toBe('selectedValue')
    })
  })

  describe('IR transformation', () => {
    it('passes bind through to IR', () => {
      const code = `
Frame bind city
  Text "Berlin"
`
      const ast = parse(code)
      const ir = toIR(ast)
      // IR has nodes array, not root.children
      expect(ir.nodes[0]?.bind).toBe('city')
    })
  })

  describe('code generation', () => {
    it('generates data-bind attribute', () => {
      const code = `
Frame bind city
  Text "Berlin"
`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain("dataset.bind = 'city'")
    })
  })

  describe('dropdown example', () => {
    it('compiles complete dropdown with bind', () => {
      const code = `
Dropdown: Frame w 200, stacked, bind value
  Trigger: Button pad 12, bg #1a1a1a, col white, toggle()
    Text $value || "Auswählen..."
  Options: Frame y 44, hidden
    Trigger.open:
      visible
  Option: Frame pad 10, col #888, exclusive()
    on:
      col white

Dropdown
  Option "Berlin"
  Option "Hamburg"
  Option "München"
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const dropdown = ast.components.find(c => c.name === 'Dropdown')
      expect(dropdown?.bind).toBe('value')

      const output = generateDOM(ast)

      expect(output).toContain("dataset.bind = 'value'")
    })
  })
})
