/**
 * IR Tests: Form Component
 *
 * Tests that Form $collection compiles correctly with:
 * - Collection binding
 * - Field generation
 * - CRUD integration
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'
import {
  isZagPrimitive,
  isZagItemKeyword,
  getZagPrimitive,
  getSlotMappings,
  getSlotDef,
} from '../../compiler/schema/zag-primitives'

describe('IR: Form Component', () => {
  describe('Basic Form Structure', () => {
    it('compiles Form with collection binding', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Field name "description"
`
      const code = compile(input)

      // Should generate a form element (via createElement)
      expect(code).toContain("createElement('form')")
      // Should have collection reference
      expect(code).toContain('tasks')
    })

    it('compiles Form with Actions slot', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save"
    Button "Cancel"
`
      const code = compile(input)

      expect(code).toContain("createElement('form')")
      expect(code).toContain("createElement('button')")
      expect(code).toContain('Save')
      expect(code).toContain('Cancel')
    })
  })

  describe('Field Props', () => {
    it('compiles Field with label', () => {
      const input = `
Form collection "$tasks"
  Field name "title", label "Task Title"
`
      const code = compile(input)

      expect(code).toContain('Task Title')
    })

    it('compiles Field with placeholder', () => {
      const input = `
Form collection "$tasks"
  Field name "description", placeholder "Enter description..."
`
      const code = compile(input)

      expect(code).toContain('Enter description...')
    })
  })

  describe('Form as Zag Component', () => {
    it('is recognized as Zag primitive', () => {
      // Form should be in ZAG_PRIMITIVES
      expect(isZagPrimitive('Form')).toBe(true)
    })

    it('has Field as valid item keyword', () => {
      expect(isZagItemKeyword('Form', 'Field')).toBe(true)
    })

    it('has correct slots', () => {
      const primitive = getZagPrimitive('Form')

      expect(primitive).toBeDefined()
      expect(primitive!.slots).toContain('Field')
      expect(primitive!.slots).toContain('Actions')
    })

    it('has correct machine', () => {
      const primitive = getZagPrimitive('Form')

      expect(primitive!.machine).toBe('form')
    })
  })

  describe('Slot Mappings', () => {
    it('has slot mappings for Form', () => {
      const mappings = getSlotMappings('Form')

      expect(mappings).toBeDefined()
      expect(mappings!.Root).toBeDefined()
      expect(mappings!.Field).toBeDefined()
      expect(mappings!.Actions).toBeDefined()
    })

    it('Field slot is item-bound', () => {
      const fieldSlot = getSlotDef('Form', 'Field')

      expect(fieldSlot?.itemBound).toBe(true)
    })
  })
})
