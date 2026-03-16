/**
 * Tests for Component Line Parser
 */

import { describe, it, expect } from 'vitest'
import {
  extractComponentFromLine,
  findParentDefinition,
  getDefinitionName,
  isInsideDefinition,
} from '../component-line-parser'

describe('extractComponentFromLine', () => {
  describe('valid component lines', () => {
    it('extracts component instance', () => {
      const result = extractComponentFromLine('Button bg #333, pad 8')
      expect(result).toEqual({ name: 'Button', isDefinition: false })
    })

    it('extracts component definition', () => {
      const result = extractComponentFromLine('Card:')
      expect(result).toEqual({ name: 'Card', isDefinition: true })
    })

    it('extracts definition with properties', () => {
      const result = extractComponentFromLine('Button: bg #333, rad 8')
      expect(result).toEqual({ name: 'Button', isDefinition: true })
    })

    it('extracts definition with inheritance', () => {
      const result = extractComponentFromLine('PrimaryButton as Button:')
      expect(result).toEqual({ name: 'PrimaryButton', isDefinition: true })
    })

    it('handles indented components', () => {
      const result = extractComponentFromLine('  Icon ic #FFF')
      expect(result).toEqual({ name: 'Icon', isDefinition: false })
    })

    it('handles component with comma', () => {
      const result = extractComponentFromLine('Text, "Hello"')
      expect(result).toEqual({ name: 'Text', isDefinition: false })
    })
  })

  describe('non-component lines', () => {
    it('returns null for empty lines', () => {
      expect(extractComponentFromLine('')).toBeNull()
      expect(extractComponentFromLine('   ')).toBeNull()
    })

    it('returns null for comments', () => {
      expect(extractComponentFromLine('// This is a comment')).toBeNull()
      expect(extractComponentFromLine('  // Indented comment')).toBeNull()
    })

    it('returns null for token definitions', () => {
      expect(extractComponentFromLine('$primary.bg: #333')).toBeNull()
    })

    it('returns null for section headers', () => {
      expect(extractComponentFromLine('--- Buttons ---')).toBeNull()
    })

    it('returns null for state blocks', () => {
      expect(extractComponentFromLine('state selected')).toBeNull()
      expect(extractComponentFromLine('hover')).toBeNull()
      expect(extractComponentFromLine('focus')).toBeNull()
    })

    it('returns null for event handlers', () => {
      expect(extractComponentFromLine('onclick')).toBeNull()
      expect(extractComponentFromLine('onhover')).toBeNull()
      expect(extractComponentFromLine('onchange')).toBeNull()
    })

    it('returns null for control flow', () => {
      expect(extractComponentFromLine('each item in items')).toBeNull()
      expect(extractComponentFromLine('if condition')).toBeNull()
    })

    it('returns null for action keywords', () => {
      expect(extractComponentFromLine('show modal')).toBeNull()
      expect(extractComponentFromLine('hide overlay')).toBeNull()
    })

    it('returns null for lowercase words', () => {
      expect(extractComponentFromLine('text content')).toBeNull()
    })
  })
})

describe('findParentDefinition', () => {
  // After .trim(), lines are:
  // Line 1: Card:
  // Line 2:   Box pad 8
  // Line 3:     Text "Title"
  // Line 4:     state selected
  // Line 5:       bg #333
  // Line 6:     onclick
  // Line 7:       toggle selected
  // Line 8:   Button "Click"
  // Line 9: (empty)
  // Line 10: AnotherCard:
  // Line 11:   Text "Hello"
  const source = `
Card:
  Box pad 8
    Text "Title"
    state selected
      bg #333
    onclick
      toggle selected
  Button "Click"

AnotherCard:
  Text "Hello"
`.trim()

  it('finds parent for nested component', () => {
    const result = findParentDefinition(source, 2) // "  Box pad 8" line
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Card')
    expect(result?.line).toBe(1)
  })

  it('finds parent for deeply nested component', () => {
    const result = findParentDefinition(source, 3) // "    Text "Title"" line
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Card')
  })

  it('identifies state blocks', () => {
    const result = findParentDefinition(source, 5) // "      bg #333" inside state
    expect(result).not.toBeNull()
    expect(result?.childType).toBe('state')
    expect(result?.childLabel).toBe('state: selected')
  })

  it('identifies event handlers', () => {
    const result = findParentDefinition(source, 7) // "      toggle selected" inside onclick
    expect(result).not.toBeNull()
    expect(result?.childType).toBe('event')
    expect(result?.childLabel).toBe('onclick')
  })

  it('returns null for top-level lines', () => {
    const result = findParentDefinition(source, 1) // "Card:" line
    expect(result).toBeNull()
  })

  it('returns null for definition line', () => {
    const result = findParentDefinition(source, 10) // "AnotherCard:" line (indent 0)
    expect(result).toBeNull()
  })
})

describe('getDefinitionName', () => {
  it('extracts simple definition name', () => {
    expect(getDefinitionName('Button:')).toBe('Button')
  })

  it('extracts definition with properties', () => {
    expect(getDefinitionName('Card: bg #333')).toBe('Card')
  })

  it('extracts definition with inheritance', () => {
    expect(getDefinitionName('PrimaryButton as Button:')).toBe('PrimaryButton')
  })

  it('handles indentation', () => {
    expect(getDefinitionName('  NestedDef:')).toBe('NestedDef')
  })

  it('returns null for non-definitions', () => {
    expect(getDefinitionName('Button bg #333')).toBeNull()
    expect(getDefinitionName('// comment')).toBeNull()
  })
})

describe('isInsideDefinition', () => {
  // After .trim(), lines are:
  // Line 1: Button bg #333
  // Line 2: (empty)
  // Line 3: Card:
  // Line 4:   Text "Hello"
  const source = `
Button bg #333

Card:
  Text "Hello"
`.trim()

  it('returns true for lines inside definition', () => {
    expect(isInsideDefinition(source, 4)).toBe(true) // "  Text "Hello""
  })

  it('returns false for top-level lines', () => {
    expect(isInsideDefinition(source, 1)).toBe(false) // "Button bg #333"
  })

  it('returns false for definition line itself', () => {
    expect(isInsideDefinition(source, 3)).toBe(false) // "Card:"
  })
})
