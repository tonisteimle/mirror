import { describe, it, expect } from 'vitest'
import {
  isLibraryComponent,
  getLibraryComponent,
  getLibraryDefinitions,
  LIBRARY_COMPONENT_NAMES
} from '../library/registry'

describe('Library Registry', () => {
  describe('isLibraryComponent', () => {
    it('should return true for Dropdown', () => {
      expect(isLibraryComponent('Dropdown')).toBe(true)
    })

    it('should return true for Dialog', () => {
      expect(isLibraryComponent('Dialog')).toBe(true)
    })

    it('should return true for Tabs', () => {
      expect(isLibraryComponent('Tabs')).toBe(true)
    })

    it('should return true for Select', () => {
      expect(isLibraryComponent('Select')).toBe(true)
    })

    it('should return true for Tooltip', () => {
      expect(isLibraryComponent('Tooltip')).toBe(true)
    })

    it('should return true for Checkbox', () => {
      expect(isLibraryComponent('Checkbox')).toBe(true)
    })

    it('should return true for Switch', () => {
      expect(isLibraryComponent('Switch')).toBe(true)
    })

    it('should return true for RadioGroup', () => {
      expect(isLibraryComponent('RadioGroup')).toBe(true)
    })

    it('should return true for Accordion', () => {
      expect(isLibraryComponent('Accordion')).toBe(true)
    })

    it('should return true for Toast', () => {
      expect(isLibraryComponent('Toast')).toBe(true)
    })

    it('should return false for custom components', () => {
      expect(isLibraryComponent('MyButton')).toBe(false)
      expect(isLibraryComponent('CustomCard')).toBe(false)
      expect(isLibraryComponent('Box')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isLibraryComponent('')).toBe(false)
    })
  })

  describe('getLibraryComponent', () => {
    it('should return Dropdown component data', () => {
      const dropdown = getLibraryComponent('Dropdown')
      expect(dropdown).toBeDefined()
      expect(dropdown?.name).toBe('Dropdown')
      expect(dropdown?.category).toBe('overlays')
      expect(dropdown?.definitions).toBeDefined()
      expect(dropdown?.layoutExample).toBeDefined()
    })

    it('should return Dialog component data', () => {
      const dialog = getLibraryComponent('Dialog')
      expect(dialog).toBeDefined()
      expect(dialog?.name).toBe('Dialog')
      expect(dialog?.category).toBe('overlays')
    })

    it('should return undefined for unknown components', () => {
      expect(getLibraryComponent('Unknown')).toBeUndefined()
      expect(getLibraryComponent('Box')).toBeUndefined()
    })
  })

  describe('getLibraryDefinitions', () => {
    it('should return definitions for Dropdown', () => {
      const defs = getLibraryDefinitions('Dropdown')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Dropdown')
      expect(defs).toContain('DropdownTrigger')
      expect(defs).toContain('DropdownContent')
      expect(defs).toContain('DropdownItem')
      expect(defs).toContain('DropdownSeparator')
    })

    it('should return definitions for Dialog', () => {
      const defs = getLibraryDefinitions('Dialog')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Dialog')
      expect(defs).toContain('DialogTrigger')
      expect(defs).toContain('DialogContent')
      expect(defs).toContain('DialogTitle')
      expect(defs).toContain('DialogClose')
    })

    it('should return definitions for Tabs', () => {
      const defs = getLibraryDefinitions('Tabs')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Tabs')
      expect(defs).toContain('TabList')
      expect(defs).toContain('Tab')
      expect(defs).toContain('TabPanel')
    })

    it('should return definitions for Select', () => {
      const defs = getLibraryDefinitions('Select')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Select')
      expect(defs).toContain('SelectTrigger')
      expect(defs).toContain('SelectContent')
      expect(defs).toContain('SelectItem')
    })

    it('should return definitions for Checkbox', () => {
      const defs = getLibraryDefinitions('Checkbox')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Checkbox')
      expect(defs).toContain('CheckboxBox')
      expect(defs).toContain('CheckboxLabel')
    })

    it('should return definitions for Switch', () => {
      const defs = getLibraryDefinitions('Switch')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Switch')
      expect(defs).toContain('SwitchThumb')
    })

    it('should return definitions for Accordion', () => {
      const defs = getLibraryDefinitions('Accordion')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Accordion')
      expect(defs).toContain('AccordionItem')
      expect(defs).toContain('AccordionTrigger')
      expect(defs).toContain('AccordionContent')
    })

    it('should return definitions for Toast', () => {
      const defs = getLibraryDefinitions('Toast')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Toast')
      expect(defs).toContain('ToastTitle')
      expect(defs).toContain('ToastDescription')
    })

    it('should return definitions for Progress', () => {
      const defs = getLibraryDefinitions('Progress')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Progress')
      expect(defs).toContain('ProgressIndicator')
    })

    it('should return definitions for Avatar', () => {
      const defs = getLibraryDefinitions('Avatar')
      expect(defs).toBeDefined()
      expect(defs).toContain('// Avatar')
      expect(defs).toContain('AvatarImage')
      expect(defs).toContain('AvatarFallback')
    })

    it('should return undefined for unknown components', () => {
      expect(getLibraryDefinitions('Unknown')).toBeUndefined()
      expect(getLibraryDefinitions('Box')).toBeUndefined()
    })
  })

  describe('LIBRARY_COMPONENT_NAMES', () => {
    it('should contain all library components', () => {
      expect(LIBRARY_COMPONENT_NAMES.has('Dropdown')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Dialog')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Tabs')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Select')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Tooltip')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Popover')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('AlertDialog')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('ContextMenu')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('HoverCard')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Accordion')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Collapsible')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Input')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Switch')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Checkbox')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('RadioGroup')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Slider')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Toast')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Progress')).toBe(true)
      expect(LIBRARY_COMPONENT_NAMES.has('Avatar')).toBe(true)
    })

    it('should have correct number of components', () => {
      expect(LIBRARY_COMPONENT_NAMES.size).toBe(19)
    })
  })
})

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

    // Check format: ComponentName: properties
    const lines = defs!.split('\n').filter(l => l.trim() && !l.startsWith('//'))
    for (const line of lines) {
      expect(line).toMatch(/^[A-Z][a-zA-Z]+:/)
    }
  })

  it('should use prefixed names for sub-components', () => {
    const defs = getLibraryDefinitions('Dropdown')
    // Check that there's no standalone "Trigger:" at line start (without prefix)
    expect(defs).not.toMatch(/^Trigger:/m)
    expect(defs).toContain('DropdownTrigger:') // But "DropdownTrigger"
  })
})

describe('Auto-Import Logic', () => {
  // Simulate the auto-import logic from App.tsx
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
