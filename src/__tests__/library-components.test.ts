/**
 * Library Components Tests
 * Tests für alle Library-Komponenten: Dropdown, Dialog, Tabs, etc.
 * Prüft Registry-Funktionen und Komponenten-Struktur.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import {
  getAllLibraryComponents,
  getLibraryComponent,
  isLibraryComponent,
  isLibrarySlot,
  LIBRARY_COMPONENT_NAMES,
  LIBRARY_SLOT_NAMES
} from '../library/registry'

// ============================================================================
// REGISTRY TESTS
// ============================================================================

describe('Library Registry', () => {
  it('sollte alle 19 Library-Komponenten enthalten', () => {
    const components = getAllLibraryComponents()
    expect(components.length).toBe(19)
  })

  it('LIBRARY_COMPONENT_NAMES sollte alle Komponenten enthalten', () => {
    expect(LIBRARY_COMPONENT_NAMES.size).toBe(19)
    expect(LIBRARY_COMPONENT_NAMES.has('Dialog')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('Dropdown')).toBe(true)
    expect(LIBRARY_COMPONENT_NAMES.has('Tabs')).toBe(true)
  })

  it('LIBRARY_SLOT_NAMES sollte Slots enthalten', () => {
    expect(LIBRARY_SLOT_NAMES.size).toBeGreaterThan(0)
    expect(LIBRARY_SLOT_NAMES.has('Trigger')).toBe(true)
    expect(LIBRARY_SLOT_NAMES.has('Content')).toBe(true)
  })

  it('getLibraryComponent sollte Komponenten zurückgeben', () => {
    const dialog = getLibraryComponent('Dialog')
    expect(dialog).toBeDefined()
    expect(dialog?.name).toBe('Dialog')
    expect(dialog?.category).toBe('overlays')
  })

  it('isLibraryComponent sollte korrekt prüfen', () => {
    expect(isLibraryComponent('Dialog')).toBe(true)
    expect(isLibraryComponent('Dropdown')).toBe(true)
    expect(isLibraryComponent('NotAComponent')).toBe(false)
  })

  it('isLibrarySlot sollte korrekt prüfen', () => {
    expect(isLibrarySlot('Dialog', 'Trigger')).toBe(true)
    expect(isLibrarySlot('Dialog', 'Content')).toBe(true)
    expect(isLibrarySlot('Dialog', 'InvalidSlot')).toBe(false)
  })
})

// ============================================================================
// COMPONENT STRUCTURE TESTS
// ============================================================================

describe('Library Component Struktur', () => {
  const components = getAllLibraryComponents()

  it('jede Komponente sollte name, category, slots haben', () => {
    for (const component of components) {
      expect(component.name).toBeDefined()
      expect(component.name.length).toBeGreaterThan(0)
      expect(component.category).toBeDefined()
      expect(component.slots).toBeDefined()
      expect(Array.isArray(component.slots)).toBe(true)
    }
  })

  it('jeder Slot sollte name haben', () => {
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

// ============================================================================
// OVERLAY COMPONENTS
// ============================================================================

describe('Overlay Komponenten', () => {
  describe('Dropdown', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const dropdown = getLibraryComponent('Dropdown')!
      const slotNames = dropdown.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })

    it('sollte closed und open States haben', () => {
      const dropdown = getLibraryComponent('Dropdown')!
      expect(dropdown.defaultStates).toContain('closed')
      expect(dropdown.defaultStates).toContain('open')
    })
  })

  describe('Dialog', () => {
    it('sollte alle erforderlichen Slots haben', () => {
      const dialog = getLibraryComponent('Dialog')!
      const slotNames = dialog.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
      expect(slotNames).toContain('Title')
      expect(slotNames).toContain('Close')
    })

    it('sollte open, close, toggle Actions haben', () => {
      const dialog = getLibraryComponent('Dialog')!
      expect(dialog.actions).toContain('open')
      expect(dialog.actions).toContain('close')
      expect(dialog.actions).toContain('toggle')
    })
  })

  describe('Tooltip', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const tooltip = getLibraryComponent('Tooltip')!
      const slotNames = tooltip.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })
  })

  describe('Popover', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const popover = getLibraryComponent('Popover')!
      const slotNames = popover.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })
  })

  describe('ContextMenu', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const contextMenu = getLibraryComponent('ContextMenu')!
      const slotNames = contextMenu.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })
  })

  describe('HoverCard', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const hoverCard = getLibraryComponent('HoverCard')!
      const slotNames = hoverCard.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })
  })

  describe('AlertDialog', () => {
    it('sollte Title und Description Slots haben', () => {
      const alertDialog = getLibraryComponent('AlertDialog')!
      const slotNames = alertDialog.slots.map(s => s.name)
      expect(slotNames).toContain('Title')
      expect(slotNames).toContain('Description')
    })
  })
})

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================

describe('Navigation Komponenten', () => {
  describe('Tabs', () => {
    it('sollte List, Tab, Panel Slots haben', () => {
      const tabs = getLibraryComponent('Tabs')!
      const slotNames = tabs.slots.map(s => s.name)
      expect(slotNames).toContain('List')
      expect(slotNames).toContain('Tab')
      expect(slotNames).toContain('Panel')
    })
  })

  describe('Accordion', () => {
    it('sollte Item, Trigger, Content Slots haben', () => {
      const accordion = getLibraryComponent('Accordion')!
      const slotNames = accordion.slots.map(s => s.name)
      expect(slotNames).toContain('Item')
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })

    it('sollte collapsed und expanded States haben', () => {
      const accordion = getLibraryComponent('Accordion')!
      expect(accordion.defaultStates).toContain('collapsed')
      expect(accordion.defaultStates).toContain('expanded')
    })
  })

  describe('Collapsible', () => {
    it('sollte Trigger und Content Slots haben', () => {
      const collapsible = getLibraryComponent('Collapsible')!
      const slotNames = collapsible.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
    })
  })
})

// ============================================================================
// FORM COMPONENTS
// ============================================================================

describe('Form Komponenten', () => {
  describe('Input', () => {
    it('sollte Label und Field Slots haben', () => {
      const input = getLibraryComponent('Input')!
      const slotNames = input.slots.map(s => s.name)
      expect(slotNames).toContain('Label')
      expect(slotNames).toContain('Field')
    })
  })

  describe('Select', () => {
    it('sollte Trigger, Content, Item Slots haben', () => {
      const select = getLibraryComponent('Select')!
      const slotNames = select.slots.map(s => s.name)
      expect(slotNames).toContain('Trigger')
      expect(slotNames).toContain('Content')
      expect(slotNames).toContain('Item')
    })
  })

  describe('Checkbox', () => {
    it('sollte Indicator Slot haben', () => {
      const checkbox = getLibraryComponent('Checkbox')!
      const slotNames = checkbox.slots.map(s => s.name)
      expect(slotNames).toContain('Indicator')
    })

    it('sollte unchecked und checked States haben', () => {
      const checkbox = getLibraryComponent('Checkbox')!
      expect(checkbox.defaultStates).toContain('unchecked')
      expect(checkbox.defaultStates).toContain('checked')
    })
  })

  describe('Switch', () => {
    it('sollte Thumb Slot haben', () => {
      const switchComp = getLibraryComponent('Switch')!
      const slotNames = switchComp.slots.map(s => s.name)
      expect(slotNames).toContain('Thumb')
    })

    it('sollte off und on States haben', () => {
      const switchComp = getLibraryComponent('Switch')!
      expect(switchComp.defaultStates).toContain('off')
      expect(switchComp.defaultStates).toContain('on')
    })
  })

  describe('RadioGroup', () => {
    it('sollte Item und Radio Slots haben', () => {
      const radioGroup = getLibraryComponent('RadioGroup')!
      const slotNames = radioGroup.slots.map(s => s.name)
      expect(slotNames).toContain('Item')
      expect(slotNames).toContain('Radio')
    })
  })

  describe('Slider', () => {
    it('sollte Track und Thumb Slots haben', () => {
      const slider = getLibraryComponent('Slider')!
      const slotNames = slider.slots.map(s => s.name)
      expect(slotNames).toContain('Track')
      expect(slotNames).toContain('Thumb')
    })
  })
})

// ============================================================================
// FEEDBACK COMPONENTS
// ============================================================================

describe('Feedback Komponenten', () => {
  describe('Toast', () => {
    it('sollte Title, Description, Close Slots haben', () => {
      const toast = getLibraryComponent('Toast')!
      const slotNames = toast.slots.map(s => s.name)
      expect(slotNames).toContain('Title')
      expect(slotNames).toContain('Description')
      expect(slotNames).toContain('Close')
    })
  })

  describe('Progress', () => {
    it('sollte Indicator Slot haben', () => {
      const progress = getLibraryComponent('Progress')!
      const slotNames = progress.slots.map(s => s.name)
      expect(slotNames).toContain('Indicator')
    })
  })

  describe('Avatar', () => {
    it('sollte Image und Fallback Slots haben', () => {
      const avatar = getLibraryComponent('Avatar')!
      const slotNames = avatar.slots.map(s => s.name)
      expect(slotNames).toContain('Image')
      expect(slotNames).toContain('Fallback')
    })
  })
})

// ============================================================================
// COMPONENT PARSING TESTS - Einfache DSL-Strukturen
// ============================================================================

describe('Library Components DSL Parsing', () => {
  it('Dropdown wird geparst', () => {
    const result = parse('Dropdown')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Dropdown')
  })

  it('Dialog wird geparst', () => {
    const result = parse('Dialog')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Dialog')
  })

  it('Tabs wird geparst', () => {
    const result = parse('Tabs')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Tabs')
  })

  it('Accordion wird geparst', () => {
    const result = parse('Accordion')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Accordion')
  })

  it('Input wird geparst', () => {
    const result = parse('Input')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Input')
  })

  it('Checkbox wird geparst', () => {
    const result = parse('Checkbox')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Checkbox')
  })

  it('Switch wird geparst', () => {
    const result = parse('Switch')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Switch')
  })

  it('Toast wird geparst', () => {
    const result = parse('Toast')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Toast')
  })

  it('Progress wird geparst', () => {
    const result = parse('Progress')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Progress')
  })

  it('Avatar wird geparst', () => {
    const result = parse('Avatar')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Avatar')
  })

  it('Select wird geparst', () => {
    const result = parse('Select')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Select')
  })

  it('Slider wird geparst', () => {
    const result = parse('Slider')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Slider')
  })

  it('Tooltip wird geparst', () => {
    const result = parse('Tooltip')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Tooltip')
  })

  it('Popover wird geparst', () => {
    const result = parse('Popover')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Popover')
  })

  it('ContextMenu wird geparst', () => {
    const result = parse('ContextMenu')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('ContextMenu')
  })

  it('HoverCard wird geparst', () => {
    const result = parse('HoverCard')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('HoverCard')
  })

  it('AlertDialog wird geparst', () => {
    const result = parse('AlertDialog')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('AlertDialog')
  })

  it('Collapsible wird geparst', () => {
    const result = parse('Collapsible')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Collapsible')
  })

  it('RadioGroup wird geparst', () => {
    const result = parse('RadioGroup')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].name).toBe('RadioGroup')
  })
})

// ============================================================================
// COMPONENT DEFINITIONS TESTS - Prüft dass definitions korrekt parsen
// ============================================================================

describe('Library Component Definitions', () => {
  const components = getAllLibraryComponents()

  for (const component of components) {
    if (component.definitions) {
      it(`${component.name} definitions sollten fehlerfrei parsen`, () => {
        const result = parse(component.definitions!)
        expect(result.errors).toHaveLength(0)
      })
    }
  }
})
