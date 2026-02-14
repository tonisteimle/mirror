/**
 * Library Components Tests
 *
 * Tests for library components: FormField, doc-text, playground, doc
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

// Helper to filter out warnings from errors array
function getErrors(result: ReturnType<typeof parse>) {
  return (result.errors || []).filter(
    (e: string) => !e.startsWith('Warning:')
  )
}

import {
  getAllLibraryComponents,
  getLibraryComponent,
  getLibraryDefinitions,
  isLibraryComponent,
  isLibrarySlot,
  LIBRARY_COMPONENT_NAMES,
  LIBRARY_SLOT_NAMES
} from '../../library/registry'

// =============================================================================
// REGISTRY TESTS
// =============================================================================

describe('Library Registry', () => {
  it('should contain library components', () => {
    const components = getAllLibraryComponents()
    // FormField + 3 doc-mode components
    expect(components.length).toBe(4)
  })

  it('LIBRARY_COMPONENT_NAMES should contain all components', () => {
    expect(LIBRARY_COMPONENT_NAMES.size).toBe(4)
    expect(LIBRARY_COMPONENT_NAMES.has('FormField')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('text')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('playground')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('doc')).toBe(true)
  })

  it('LIBRARY_SLOT_NAMES should contain slots', () => {
    expect(LIBRARY_SLOT_NAMES.size).toBeGreaterThan(0)
    expect(LIBRARY_SLOT_NAMES.has('Label')).toBe(true)
    expect(LIBRARY_SLOT_NAMES.has('Field')).toBe(true)
  })

  describe('isLibraryComponent', () => {
    it('should return true for library components', () => {
      expect(isLibraryComponent('FormField')).toBe(true)
      expect(isLibraryComponent('text')).toBe(true)
      expect(isLibraryComponent('playground')).toBe(true)
      expect(isLibraryComponent('doc')).toBe(true)
    })

    it('should return false for custom components', () => {
      expect(isLibraryComponent('MyButton')).toBe(false)
      expect(isLibraryComponent('CustomCard')).toBe(false)
      expect(isLibraryComponent('Box')).toBe(false)
      expect(isLibraryComponent('Button')).toBe(false)
      expect(isLibraryComponent('Dialog')).toBe(false)
      expect(isLibraryComponent('')).toBe(false)
    })
  })

  describe('getLibraryComponent', () => {
    it('should return component data for FormField', () => {
      const formField = getLibraryComponent('FormField')
      expect(formField).toBeDefined()
      expect(formField?.name).toBe('FormField')
      expect(formField?.category).toBe('form')
    })

    it('should return component data for doc-mode components', () => {
      const text = getLibraryComponent('text')
      expect(text).toBeDefined()
      expect(text?.name).toBe('text')

      const playground = getLibraryComponent('playground')
      expect(playground).toBeDefined()
      expect(playground?.name).toBe('playground')

      const doc = getLibraryComponent('doc')
      expect(doc).toBeDefined()
      expect(doc?.name).toBe('doc')
    })

    it('should return undefined for unknown components', () => {
      expect(getLibraryComponent('Unknown')).toBeUndefined()
      expect(getLibraryComponent('Box')).toBeUndefined()
      expect(getLibraryComponent('Dropdown')).toBeUndefined()
    })
  })

  describe('isLibrarySlot', () => {
    it('should correctly identify FormField slots', () => {
      expect(isLibrarySlot('FormField', 'Label')).toBe(true)
      expect(isLibrarySlot('FormField', 'Field')).toBe(true)
      expect(isLibrarySlot('FormField', 'Hint')).toBe(true)
      expect(isLibrarySlot('FormField', 'Error')).toBe(true)
      expect(isLibrarySlot('FormField', 'InvalidSlot')).toBe(false)
    })
  })

  describe('getLibraryDefinitions', () => {
    it('should return definitions for FormField', () => {
      const defs = getLibraryDefinitions('FormField')
      expect(defs).toBeDefined()
      expect(defs).toContain('FormField')
    })

    it('should return undefined for unknown components', () => {
      expect(getLibraryDefinitions('Unknown')).toBeUndefined()
      expect(getLibraryDefinitions('Dropdown')).toBeUndefined()
    })
  })
})

// =============================================================================
// COMPONENT STRUCTURE TESTS
// =============================================================================

describe('Library Component Structure', () => {
  const components = getAllLibraryComponents()

  it('each component should have name, category, slots', () => {
    for (const component of components) {
      expect(component.name).toBeDefined()
      expect(component.name.length).toBeGreaterThan(0)
      expect(component.category).toBeDefined()
      expect(component.slots).toBeDefined()
      expect(Array.isArray(component.slots)).toBe(true)
    }
  })

  it('each slot should have required properties', () => {
    for (const component of components) {
      for (const slot of component.slots) {
        expect(slot.name).toBeDefined()
        expect(slot.name.length).toBeGreaterThan(0)
        expect(typeof slot.required).toBe('boolean')
        expect(typeof slot.multiple).toBe('boolean')
      }
    }
  })
})

// =============================================================================
// FORM COMPONENTS
// =============================================================================

describe('Form Components', () => {
  it('FormField should have Label, Field, Hint, Error slots', () => {
    const formField = getLibraryComponent('FormField')!
    const slotNames = formField.slots.map(s => s.name)
    expect(slotNames).toContain('Label')
    expect(slotNames).toContain('Field')
    expect(slotNames).toContain('Hint')
    expect(slotNames).toContain('Error')
  })
})

// =============================================================================
// DOC-MODE COMPONENTS
// =============================================================================

describe('Doc-Mode Components', () => {
  it('text component should exist', () => {
    const text = getLibraryComponent('text')
    expect(text).toBeDefined()
    expect(text?.category).toBe('doc')
  })

  it('playground component should exist', () => {
    const playground = getLibraryComponent('playground')
    expect(playground).toBeDefined()
    expect(playground?.category).toBe('doc')
  })

  it('doc component should exist', () => {
    const doc = getLibraryComponent('doc')
    expect(doc).toBeDefined()
    expect(doc?.category).toBe('doc')
  })
})

// =============================================================================
// DSL PARSING TESTS
// =============================================================================

describe('Library Components DSL Parsing', () => {
  it('FormField should parse without errors', () => {
    const result = parse('FormField')
    expect(getErrors(result)).toHaveLength(0)
    expect(result.nodes[0].name).toBe('FormField')
  })

  it('doc-mode components should parse without errors', () => {
    const docResult = parse('doc')
    expect(getErrors(docResult)).toHaveLength(0)

    const textResult = parse('text')
    expect(getErrors(textResult)).toHaveLength(0)

    const playgroundResult = parse('playground')
    expect(getErrors(playgroundResult)).toHaveLength(0)
  })
})

// =============================================================================
// COMPONENT DEFINITIONS PARSING
// =============================================================================

describe('Library Component Definitions', () => {
  const components = getAllLibraryComponents()

  for (const component of components) {
    if (component.definitions) {
      it(`${component.name} definitions should parse without errors`, () => {
        const result = parse(component.definitions!)
        const errors = result.errors.filter(e => !e.startsWith('Warning:'))
        expect(errors).toHaveLength(0)
      })
    }
  }
})

// =============================================================================
// AUTO-IMPORT LOGIC TESTS
// =============================================================================

describe('Auto-Import Logic', () => {
  function detectLibraryComponents(layoutCode: string): Set<string> {
    const componentNames = new Set<string>()
    for (const line of layoutCode.split('\n')) {
      const match = line.match(/^\s*([A-Za-z][a-zA-Z0-9-]*)/)
      if (match) {
        componentNames.add(match[1])
      }
    }
    return componentNames
  }

  function getMissingDefinitions(layoutCode: string, componentsCode: string): string[] {
    const usedComponents = detectLibraryComponents(layoutCode)
    const missing: string[] = []

    for (const name of usedComponents) {
      if (isLibraryComponent(name)) {
        const marker = `// ${name}`
        if (!componentsCode.includes(marker)) {
          const defs = getLibraryDefinitions(name)
          if (defs) {
            missing.push(defs)
          }
        }
      }
    }

    return missing
  }

  it('should detect library components in layout', () => {
    const layout = `FormField
  Label "Email"
  Field type email`

    const detected = detectLibraryComponents(layout)
    expect(detected.has('FormField')).toBe(true)
    expect(detected.has('Label')).toBe(true)
    expect(detected.has('Field')).toBe(true)
  })

  it('should return missing definitions', () => {
    const layout = 'FormField'
    const components = ''

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(1)
  })

  it('should not return definitions if already present', () => {
    const layout = 'FormField'
    const components = '// FormField\nFormFieldLabel: size 14'

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(0)
  })

  it('should ignore non-library components', () => {
    const layout = `MyButton
CustomCard
Box
Button
Dialog`
    const components = ''

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(0)
  })
})
