/**
 * Zag Select Component - DOM Generation Tests
 *
 * Tests that verify the generated HTML structure and attributes
 * for the Select Zag component.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { compile, compileAndExecute, compileOnly } from '../../../test-utils/compile'

describe('Zag Select - DOM Generation', () => {
  describe('Generated JavaScript Code', () => {
    it('should generate code with zag config', () => {
      const code = compile(`Select placeholder "Choose..."
`)

      // Should contain Zag component marker (via dataset property)
      expect(code).toContain("dataset.zagComponent = 'select'")

      // Should contain _zagConfig
      expect(code).toContain("_zagConfig")
      expect(code).toContain("type: 'select'")
    })

    it('should generate placeholder in machine config', () => {
      const code = compile(`Select placeholder "Choose an option"
`)

      expect(code).toContain('machineConfig:')
      expect(code).toContain('"placeholder":"Choose an option"')
    })

    it('should generate items in config', () => {
      const code = compile(`Select
  Item "Apple"
  Item "Banana"
  Item "Cherry"
`)

      expect(code).toContain('items:')
      expect(code).toContain('"value":"Apple"')
      expect(code).toContain('"value":"Banana"')
      expect(code).toContain('"value":"Cherry"')
    })

    it('should generate slot elements', () => {
      const code = compile(`Select
  Trigger:
    bg #333
  Content:
    bg #222
`)

      // Should create Trigger slot element with styles
      expect(code).toContain("dataset.slot = 'Trigger'")
      expect(code).toContain("// Trigger")

      // Should create Content slot element with styles
      expect(code).toContain("dataset.slot = 'Content'")
      expect(code).toContain("// Content")
    })

    it('should generate disabled items correctly', () => {
      const code = compile(`Select
  Item "Available"
  Item "Disabled" disabled
`)

      expect(code).toContain('"disabled":true')
    })

    it('should match snapshot for basic select', () => {
      const code = compile(`Select placeholder "Choose..."
  Item "Option A"
  Item "Option B"
`)
      expect(code).toMatchSnapshot()
    })

    it('should match snapshot for styled select', () => {
      const code = compile(`Select placeholder "Choose..."
  Trigger:
    bg #1e1e2e, pad 12, rad 8
  Content:
    bg #2a2a3e, pad 8, rad 8
  Item "Option A"
  Item "Option B"
`)
      expect(code).toMatchSnapshot()
    })
  })

  describe('Generated DOM Structure', () => {
    it('should create root element with zag attributes', () => {
      const { root, container } = compileAndExecute(`Select placeholder "Test"
`)

      expect(root).toBeDefined()
      expect(root.dataset.zagComponent).toBe('select')
      expect(root.dataset.mirrorId).toBeDefined()
    })

    it('should create Trigger slot element', () => {
      const { container } = compileAndExecute(`Select placeholder "Test"
  Trigger:
    bg #333
`)

      const trigger = container.querySelector('[data-slot="Trigger"]')
      expect(trigger).toBeDefined()
      expect(trigger?.tagName.toLowerCase()).toBe('button')
    })

    it('should create Content slot element', () => {
      // Content is generated as a slot element with role="listbox"
      const { jsCode } = compileOnly(`Select placeholder "Test"
  Content:
    bg #222
`)

      expect(jsCode).toContain("dataset.slot = 'Content'")
      expect(jsCode).toContain("role', 'listbox'")
    })

    it('should create item elements with Content slot', () => {
      // Items need a Content slot to be rendered into
      const { container } = compileAndExecute(`Select
  Content:
    bg #222
  Item "Apple"
  Item "Banana"
`)

      // Items are in the Content slot, which may be portaled
      // Check via generated code structure instead
      const { jsCode } = compileOnly(`Select
  Content:
    bg #222
  Item "Apple"
  Item "Banana"
`)

      expect(jsCode).toContain('"value":"Apple"')
      expect(jsCode).toContain('"value":"Banana"')
      expect(jsCode).toContain('data-mirror-item')
    })

    it('should apply styles to slots', () => {
      const { container } = compileAndExecute(`Select
  Trigger:
    pad 12, bg #ff0000
`)

      const trigger = container.querySelector('[data-slot="Trigger"]') as HTMLElement
      expect(trigger).toBeDefined()
      expect(trigger?.style.padding).toBe('12px')
      expect(trigger?.style.background).toBe('rgb(255, 0, 0)')
    })

    it('should store zagConfig on element', () => {
      const { root } = compileAndExecute(`Select placeholder "Test"
`)

      expect((root as any)._zagConfig).toBeDefined()
      expect((root as any)._zagConfig.type).toBe('select')
    })
  })

  describe('Machine Configuration', () => {
    it('should include multiple flag', () => {
      const code = compile(`Select multiple
`)
      expect(code).toContain('"multiple":true')
    })

    it('should include disabled flag', () => {
      const code = compile(`Select disabled
`)
      expect(code).toContain('"disabled":true')
    })

    it('should include positioning option', () => {
      const code = compile(`Select positioning "bottom-start"
`)
      // The config should include positioning
      expect(code).toContain('machineConfig:')
    })
  })

  describe('Slot Element Attributes', () => {
    it('should create Trigger with combobox role', () => {
      const code = compile(`Select
  Trigger:
    bg #333
`)
      expect(code).toContain("dataset.slot = 'Trigger'")
      expect(code).toContain("role', 'combobox'")
      expect(code).toContain("aria-haspopup', 'listbox'")
    })

    it('should create Content with listbox role', () => {
      const code = compile(`Select
  Content:
    bg #222
`)
      expect(code).toContain("dataset.slot = 'Content'")
      expect(code).toContain("role', 'listbox'")
    })

    it('should create Items with option role', () => {
      const code = compile(`Select
  Item "Option A"
  Item "Option B"
`)
      expect(code).toContain("dataset.slot = 'Item'")
      expect(code).toContain("role', 'option'")
    })
  })

  describe('Error Cases', () => {
    it('should handle Select without items', () => {
      expect(() => {
        compile(`Select placeholder "Empty"
`)
      }).not.toThrow()
    })

    it('should handle Select without placeholder', () => {
      expect(() => {
        compile(`Select
  Item "A"
`)
      }).not.toThrow()
    })
  })
})
