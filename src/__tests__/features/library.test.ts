/**
 * Library Components Tests
 *
 * Tests for all library components: Dropdown, Dialog, Tabs, etc.
 * Merged from: library-components.test.ts + library-auto-import.test.ts
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
  it('should contain all library components', () => {
    const components = getAllLibraryComponents()
    // There are currently 35 library components including new Radix additions
    expect(components.length).toBeGreaterThanOrEqual(35)
  })

  it('LIBRARY_COMPONENT_NAMES should contain all components', () => {
    expect(LIBRARY_COMPONENT_NAMES.size).toBeGreaterThanOrEqual(35)
    expect(LIBRARY_COMPONENT_NAMES.has('Dialog')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('Dropdown')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('Tabs')).toBe(true)
  })

  it('LIBRARY_SLOT_NAMES should contain slots', () => {
    expect(LIBRARY_SLOT_NAMES.size).toBeGreaterThan(0)
    expect(LIBRARY_SLOT_NAMES.has('Trigger')).toBe(true)
    expect(LIBRARY_SLOT_NAMES.has('Content')).toBe(true)
  })

  describe('isLibraryComponent', () => {
    it('should return true for library components', () => {
      expect(isLibraryComponent('Dropdown')).toBe(true)
      expect(isLibraryComponent('Dialog')).toBe(true)
      expect(isLibraryComponent('Tabs')).toBe(true)
      expect(isLibraryComponent('Select')).toBe(true)
      expect(isLibraryComponent('Tooltip')).toBe(true)
      expect(isLibraryComponent('Checkbox')).toBe(true)
      expect(isLibraryComponent('Switch')).toBe(true)
      expect(isLibraryComponent('RadioGroup')).toBe(true)
      expect(isLibraryComponent('Accordion')).toBe(true)
      expect(isLibraryComponent('Toast')).toBe(true)
    })

    it('should return false for custom components', () => {
      expect(isLibraryComponent('MyButton')).toBe(false)
      expect(isLibraryComponent('CustomCard')).toBe(false)
      expect(isLibraryComponent('Box')).toBe(false)
      expect(isLibraryComponent('')).toBe(false)
    })
  })

  describe('getLibraryComponent', () => {
    it('should return component data', () => {
      const dropdown = getLibraryComponent('Dropdown')
      expect(dropdown).toBeDefined()
      expect(dropdown?.name).toBe('Dropdown')
      expect(dropdown?.category).toBe('overlays')
      expect(dropdown?.definitions).toBeDefined()
      expect(dropdown?.layoutExample).toBeDefined()

      const dialog = getLibraryComponent('Dialog')
      expect(dialog?.name).toBe('Dialog')
      expect(dialog?.category).toBe('overlays')
    })

    it('should return undefined for unknown components', () => {
      expect(getLibraryComponent('Unknown')).toBeUndefined()
      expect(getLibraryComponent('Box')).toBeUndefined()
    })
  })

  describe('isLibrarySlot', () => {
    it('should correctly identify slots', () => {
      expect(isLibrarySlot('Dialog', 'Trigger')).toBe(true)
      expect(isLibrarySlot('Dialog', 'Content')).toBe(true)
      expect(isLibrarySlot('Dialog', 'InvalidSlot')).toBe(false)
    })
  })

  describe('getLibraryDefinitions', () => {
    const testCases = [
      { name: 'Dropdown', contains: ['DropdownTrigger', 'DropdownContent', 'DropdownItem', 'DropdownSeparator'] },
      { name: 'Dialog', contains: ['DialogTrigger', 'DialogContent', 'DialogTitle', 'DialogClose'] },
      { name: 'Tabs', contains: ['Tabs', 'Tab', 'TabContent'] },
      { name: 'Select', contains: ['SelectTrigger', 'SelectOptions', 'SelectOption'] },
      { name: 'Checkbox', contains: ['CheckboxBox', 'CheckboxLabel'] },
      { name: 'Switch', contains: ['SwitchThumb'] },
      { name: 'Accordion', contains: ['AccordionItem', 'AccordionTrigger', 'AccordionContent'] },
      { name: 'Toast', contains: ['ToastTitle', 'ToastDescription'] },
      { name: 'Progress', contains: ['ProgressIndicator'] },
      { name: 'Avatar', contains: ['AvatarImage', 'AvatarFallback'] },
    ]

    for (const { name, contains } of testCases) {
      it(`should return definitions for ${name}`, () => {
        const defs = getLibraryDefinitions(name)
        expect(defs).toBeDefined()
        // Some definitions use "// Name" others use "// Name Components"
        expect(defs!.startsWith(`// ${name}`)).toBe(true)
        for (const item of contains) {
          expect(defs).toContain(item)
        }
      })
    }

    it('should return undefined for unknown components', () => {
      expect(getLibraryDefinitions('Unknown')).toBeUndefined()
      expect(getLibraryDefinitions('Box')).toBeUndefined()
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
// OVERLAY COMPONENTS
// =============================================================================

describe('Overlay Components', () => {
  it('Dropdown should have Trigger and Content slots', () => {
    const dropdown = getLibraryComponent('Dropdown')!
    const slotNames = dropdown.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
    expect(dropdown.defaultStates).toContain('closed')
    expect(dropdown.defaultStates).toContain('open')
  })

  it('Dialog should have all required slots', () => {
    const dialog = getLibraryComponent('Dialog')!
    const slotNames = dialog.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
    expect(slotNames).toContain('Title')
    expect(slotNames).toContain('Close')
    expect(dialog.actions).toContain('open')
    expect(dialog.actions).toContain('close')
    expect(dialog.actions).toContain('toggle')
  })

  it('Tooltip should have Trigger and Content slots', () => {
    const tooltip = getLibraryComponent('Tooltip')!
    const slotNames = tooltip.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
  })

  it('Popover should have Trigger and Content slots', () => {
    const popover = getLibraryComponent('Popover')!
    const slotNames = popover.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
  })

  it('ContextMenu should have Trigger and Content slots', () => {
    const contextMenu = getLibraryComponent('ContextMenu')!
    const slotNames = contextMenu.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
  })

  it('HoverCard should have Trigger and Content slots', () => {
    const hoverCard = getLibraryComponent('HoverCard')!
    const slotNames = hoverCard.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
  })

  it('AlertDialog should have Title and Description slots', () => {
    const alertDialog = getLibraryComponent('AlertDialog')!
    const slotNames = alertDialog.slots.map(s => s.name)
    expect(slotNames).toContain('Title')
    expect(slotNames).toContain('Description')
  })
})

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

describe('Navigation Components', () => {
  it('Tabs should have Tabs, Tab, TabContent slots', () => {
    const tabs = getLibraryComponent('Tabs')!
    const slotNames = tabs.slots.map(s => s.name)
    expect(slotNames).toContain('Tabs')
    expect(slotNames).toContain('Tab')
    expect(slotNames).toContain('TabContent')
  })

  it('Accordion should have Item, Trigger, Content slots', () => {
    const accordion = getLibraryComponent('Accordion')!
    const slotNames = accordion.slots.map(s => s.name)
    expect(slotNames).toContain('Item')
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
    expect(accordion.defaultStates).toContain('collapsed')
    expect(accordion.defaultStates).toContain('expanded')
  })

  it('Collapsible should have Trigger and Content slots', () => {
    const collapsible = getLibraryComponent('Collapsible')!
    const slotNames = collapsible.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Content')
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

  it('Select should have Trigger, Options, Option slots', () => {
    const select = getLibraryComponent('Select')!
    const slotNames = select.slots.map(s => s.name)
    expect(slotNames).toContain('Trigger')
    expect(slotNames).toContain('Options')
    expect(slotNames).toContain('Option')
  })

  it('Checkbox should have Indicator slot and states', () => {
    const checkbox = getLibraryComponent('Checkbox')!
    const slotNames = checkbox.slots.map(s => s.name)
    expect(slotNames).toContain('Indicator')
    expect(checkbox.defaultStates).toContain('unchecked')
    expect(checkbox.defaultStates).toContain('checked')
  })

  it('Switch should have Thumb slot and states', () => {
    const switchComp = getLibraryComponent('Switch')!
    const slotNames = switchComp.slots.map(s => s.name)
    expect(slotNames).toContain('Thumb')
    expect(switchComp.defaultStates).toContain('off')
    expect(switchComp.defaultStates).toContain('on')
  })

  it('RadioGroup should have Item and Radio slots', () => {
    const radioGroup = getLibraryComponent('RadioGroup')!
    const slotNames = radioGroup.slots.map(s => s.name)
    expect(slotNames).toContain('Item')
    expect(slotNames).toContain('Radio')
  })

  it('Slider should have Track and Thumb slots', () => {
    const slider = getLibraryComponent('Slider')!
    const slotNames = slider.slots.map(s => s.name)
    expect(slotNames).toContain('Track')
    expect(slotNames).toContain('Thumb')
  })
})

// =============================================================================
// FEEDBACK COMPONENTS
// =============================================================================

describe('Feedback Components', () => {
  it('Toast should have Title, Description, Close slots', () => {
    const toast = getLibraryComponent('Toast')!
    const slotNames = toast.slots.map(s => s.name)
    expect(slotNames).toContain('Title')
    expect(slotNames).toContain('Description')
    expect(slotNames).toContain('Close')
  })

  it('Progress should have Indicator slot', () => {
    const progress = getLibraryComponent('Progress')!
    const slotNames = progress.slots.map(s => s.name)
    expect(slotNames).toContain('Indicator')
  })

  it('Avatar should have Image and Fallback slots', () => {
    const avatar = getLibraryComponent('Avatar')!
    const slotNames = avatar.slots.map(s => s.name)
    expect(slotNames).toContain('Image')
    expect(slotNames).toContain('Fallback')
  })
})

// =============================================================================
// DSL PARSING TESTS
// =============================================================================

describe('Library Components DSL Parsing', () => {
  const libraryComponents = [
    'Dropdown', 'Dialog', 'Tabs', 'Accordion', 'Input', 'Checkbox',
    'Switch', 'Toast', 'Progress', 'Avatar', 'Select', 'Slider',
    'Tooltip', 'Popover', 'ContextMenu', 'HoverCard', 'AlertDialog',
    'Collapsible', 'RadioGroup'
  ]

  for (const name of libraryComponents) {
    it(`${name} should parse without errors`, () => {
      const result = parse(name)
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].name).toBe(name)
    })
  }
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
// DEFINITION FORMAT TESTS
// =============================================================================

describe('Library Component Definitions Format', () => {
  it('should have comment header with component name', () => {
    const components = [
      'Dropdown', 'Dialog', 'Tabs', 'Select', 'Tooltip', 'Checkbox',
      'Switch', 'Accordion', 'Toast', 'Progress', 'Avatar'
    ]

    for (const name of components) {
      const defs = getLibraryDefinitions(name)
      expect(defs).toContain(`// ${name}`)
    }
  })

  it('should have properly formatted definitions', () => {
    const defs = getLibraryDefinitions('Dropdown')
    expect(defs).toBeDefined()

    const lines = defs!.split('\n').filter(l => l.trim() && !l.startsWith('//'))
    for (const line of lines) {
      expect(line).toMatch(/^[A-Z][a-zA-Z]+:/)
    }
  })

  it('should use prefixed names for sub-components', () => {
    const defs = getLibraryDefinitions('Dropdown')
    expect(defs).not.toMatch(/^Trigger:/m)
    expect(defs).toContain('DropdownTrigger:')
  })
})

// =============================================================================
// AUTO-IMPORT LOGIC TESTS
// =============================================================================

describe('Auto-Import Logic', () => {
  function detectLibraryComponents(layoutCode: string): Set<string> {
    const componentNames = new Set<string>()
    for (const line of layoutCode.split('\n')) {
      const match = line.match(/^\s*([A-Z][a-zA-Z0-9]*)/)
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
    const layout = `Dropdown
  DropdownTrigger
    "Options"
  DropdownContent
    DropdownItem "Profile"`

    const detected = detectLibraryComponents(layout)
    expect(detected.has('Dropdown')).toBe(true)
    expect(detected.has('DropdownTrigger')).toBe(true)
    expect(detected.has('DropdownContent')).toBe(true)
    expect(detected.has('DropdownItem')).toBe(true)
  })

  it('should return missing definitions', () => {
    const layout = 'Dropdown'
    const components = ''

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(1)
    expect(missing[0]).toContain('// Dropdown')
  })

  it('should not return definitions if already present', () => {
    const layout = 'Dropdown'
    const components = '// Dropdown\nDropdownTrigger: hor'

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(0)
  })

  it('should handle multiple library components', () => {
    const layout = `Dialog
Dropdown`
    const components = ''

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(2)
    expect(missing.some(d => d.includes('// Dialog'))).toBe(true)
    expect(missing.some(d => d.includes('// Dropdown'))).toBe(true)
  })

  it('should ignore non-library components', () => {
    const layout = `MyButton
CustomCard
Box`
    const components = ''

    const missing = getMissingDefinitions(layout, components)
    expect(missing.length).toBe(0)
  })
})
