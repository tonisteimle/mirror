/**
 * Zag Select Component Tests
 *
 * Tests for parsing, IR transformation, and schema validation
 * of the Select Zag component.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser'
import { toIR } from '../../../ir'
import { isZagPrimitive, getZagPrimitive, isZagSlot, ZAG_PRIMITIVES } from '../../../schema/zag-primitives'

describe('Zag Select Component', () => {
  describe('Schema', () => {
    it('should recognize Select as a Zag primitive', () => {
      expect(isZagPrimitive('Select')).toBe(true)
    })

    it('should not recognize Box as a Zag primitive', () => {
      expect(isZagPrimitive('Box')).toBe(false)
    })

    it('should have correct machine type', () => {
      const def = getZagPrimitive('Select')
      expect(def?.machine).toBe('select')
    })

    it('should define expected slots', () => {
      const def = getZagPrimitive('Select')
      expect(def?.slots).toContain('Trigger')
      expect(def?.slots).toContain('Content')
      expect(def?.slots).toContain('Item')
    })

    it('should define expected props', () => {
      const def = getZagPrimitive('Select')
      expect(def?.props).toContain('placeholder')
      expect(def?.props).toContain('multiple')
      expect(def?.props).toContain('disabled')
    })

    it('should validate slot names', () => {
      expect(isZagSlot('Select', 'Trigger')).toBe(true)
      expect(isZagSlot('Select', 'Content')).toBe(true)
      expect(isZagSlot('Select', 'InvalidSlot')).toBe(false)
    })
  })

  describe('Parser', () => {
    it('should parse basic Select component', () => {
      const code = `Select placeholder "Choose..."
`
      const ast = parse(code)

      expect(ast.instances).toHaveLength(1)
      const select = ast.instances[0] as any
      expect(select.type).toBe('ZagComponent')
      expect(select.name).toBe('Select')
      expect(select.machine).toBe('select')
    })

    it('should parse Select with placeholder property', () => {
      const code = `Select placeholder "Choose an option"
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      expect(select.properties).toHaveLength(1)
      expect(select.properties[0].name).toBe('placeholder')
      expect(select.properties[0].values[0]).toBe('Choose an option')
    })

    it('should parse Select with multiple boolean prop', () => {
      const code = `Select multiple
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      const multipleProp = select.properties.find((p: any) => p.name === 'multiple')
      expect(multipleProp).toBeDefined()
      expect(multipleProp.values[0]).toBe(true)
    })

    it('should parse Select with Trigger slot', () => {
      const code = `Select placeholder "Choose..."
  Trigger:
    pad 12, bg #1e1e2e
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      expect(select.slots.Trigger).toBeDefined()
      expect(select.slots.Trigger.name).toBe('Trigger')
      expect(select.slots.Trigger.properties.length).toBeGreaterThan(0)
    })

    it('should parse Select with Items', () => {
      const code = `Select placeholder "Choose..."
  Item "Option A"
  Item "Option B"
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      expect(select.items).toHaveLength(2)
      expect(select.items[0].label).toBe('Option A')
      expect(select.items[1].label).toBe('Option B')
    })

    it('should parse Item with disabled flag', () => {
      const code = `Select
  Item "Option A" disabled
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      expect(select.items[0].disabled).toBe(true)
    })

    it('should parse slot with state block', () => {
      const code = `Select
  Trigger:
    bg #1e1e2e
    hover:
      bg #2a2a3e
`
      const ast = parse(code)

      const select = ast.instances[0] as any
      const trigger = select.slots.Trigger
      expect(trigger.states).toHaveLength(1)
      expect(trigger.states[0].name).toBe('hover')
      expect(trigger.states[0].properties.length).toBeGreaterThan(0)
    })
  })

  describe('IR Transformation', () => {
    it('should transform Select to IRZagNode', () => {
      const code = `Select placeholder "Choose..."
`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const node = ir.nodes[0] as any
      expect(node.isZagComponent).toBe(true)
      expect(node.zagType).toBe('select')
    })

    it('should include machineConfig from properties', () => {
      const code = `Select placeholder "Choose..." disabled
`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.placeholder).toBe('Choose...')
      expect(node.machineConfig.disabled).toBe(true)
    })

    it('should transform slots to IRSlot', () => {
      const code = `Select
  Trigger:
    pad 12
`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.slots.Trigger).toBeDefined()
      expect(node.slots.Trigger.apiMethod).toBe('getTriggerProps')
      expect(node.slots.Trigger.element).toBe('button')
    })

    it('should transform items to IRItem', () => {
      const code = `Select
  Item "Option A"
  Item "Option B"
`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.items).toHaveLength(2)
      expect(node.items[0].value).toBe('Option A')
      expect(node.items[0].label).toBe('Option A')
    })

    it('should include sourcePosition for SourceMap', () => {
      const code = `Select placeholder "Choose..."
`
      const ast = parse(code)
      const result = toIR(ast, true)

      const node = result.ir.nodes[0] as any
      expect(node.sourcePosition).toBeDefined()
      expect(node.sourcePosition.line).toBe(1)
    })
  })
})
