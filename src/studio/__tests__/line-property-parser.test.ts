/**
 * Comprehensive Tests for LinePropertyParser
 */

import { describe, it, expect } from 'vitest'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
  isBooleanProperty,
  isMultiValueProperty,
  type ParsedLine,
  type ParsedProperty,
} from '../line-property-parser'

// ===========================================
// PARSE LINE
// ===========================================

describe('parseLine', () => {
  describe('Basic Parsing', () => {
    it('should parse simple component line', () => {
      const result = parseLine('Box pad 10')
      expect(result.componentPart).toBe('Box')
      expect(result.properties.length).toBe(1)
      expect(result.properties[0].name).toBe('pad')
      expect(result.properties[0].value).toBe('10')
    })

    it('should parse component with no properties', () => {
      const result = parseLine('Box')
      expect(result.componentPart).toBe('Box')
      expect(result.properties.length).toBe(0)
    })

    it('should preserve indent', () => {
      const result = parseLine('  Box pad 10')
      expect(result.indent).toBe('  ')
      expect(result.componentPart).toBe('Box')
    })

    it('should preserve tab indent', () => {
      const result = parseLine('\t\tBox pad 10')
      expect(result.indent).toBe('\t\t')
    })

    it('should store original line', () => {
      const line = '  Box pad 10, bg #FFF'
      const result = parseLine(line)
      expect(result.original).toBe(line)
    })
  })

  describe('Multiple Properties', () => {
    it('should parse comma-separated properties', () => {
      const result = parseLine('Box pad 10, bg #FF0000')
      expect(result.properties.length).toBe(2)
      expect(result.properties[0].name).toBe('pad')
      expect(result.properties[0].value).toBe('10')
      expect(result.properties[1].name).toBe('bg')
      expect(result.properties[1].value).toBe('#FF0000')
    })

    it('should parse multiple properties with various values', () => {
      const result = parseLine('Box pad 10, gap 8, rad 4, bg #333')
      expect(result.properties.length).toBe(4)
      expect(result.properties.map(p => p.name)).toEqual(['pad', 'gap', 'rad', 'bg'])
    })

    it('should handle extra whitespace between properties', () => {
      const result = parseLine('Box pad 10,   bg #FFF')
      expect(result.properties.length).toBe(2)
    })
  })

  describe('Property Values', () => {
    it('should parse color values', () => {
      const result = parseLine('Box bg #FF5500')
      expect(result.properties[0].value).toBe('#FF5500')
    })

    it('should parse token values', () => {
      const result = parseLine('Box bg $accent.bg')
      expect(result.properties[0].value).toBe('$accent.bg')
    })

    it('should parse numeric values', () => {
      const result = parseLine('Box pad 16')
      expect(result.properties[0].value).toBe('16')
    })

    it('should parse keyword values', () => {
      const result = parseLine('Box w full')
      expect(result.properties[0].value).toBe('full')
    })

    it('should parse multi-value properties', () => {
      const result = parseLine('Box pad 16 12')
      expect(result.properties[0].value).toBe('16 12')
    })

    it('should parse border value', () => {
      const result = parseLine('Box bor 1')
      expect(result.properties[0].name).toBe('bor')
      expect(result.properties[0].value).toBe('1')
    })
  })

  describe('Boolean Properties', () => {
    it('should parse boolean property', () => {
      const result = parseLine('Box hidden')
      expect(result.properties[0].name).toBe('hidden')
      expect(result.properties[0].isBoolean).toBe(true)
    })

    it('should parse boolean property with other properties', () => {
      const result = parseLine('Box hidden, bg #FFF')
      expect(result.properties[0].name).toBe('hidden')
      expect(result.properties[0].isBoolean).toBe(true)
      expect(result.properties[1].name).toBe('bg')
      expect(result.properties[1].isBoolean).toBe(false)
    })
  })

  describe('Directional Properties', () => {
    it('should parse padding with value', () => {
      const result = parseLine('Box pad 16')
      expect(result.properties[0].name).toBe('pad')
      expect(result.properties[0].value).toBe('16')
    })

    it('should parse margin with value', () => {
      const result = parseLine('Box margin 8')
      expect(result.properties[0].name).toBe('margin')
      expect(result.properties[0].value).toBe('8')
    })

    it('should parse radius with value', () => {
      const result = parseLine('Box rad 8')
      expect(result.properties[0].name).toBe('rad')
      expect(result.properties[0].value).toBe('8')
    })
  })

  describe('Text Content', () => {
    it('should extract quoted text content', () => {
      const result = parseLine('Text "Hello World"')
      expect(result.textContent).toBe('"Hello World"')
    })

    it('should extract single-quoted text content', () => {
      const result = parseLine("Text 'Hello World'")
      expect(result.textContent).toBe("'Hello World'")
    })

    it('should separate properties from text content', () => {
      const result = parseLine('Text pad 10 "Hello"')
      expect(result.properties[0].name).toBe('pad')
      expect(result.textContent).toBe('"Hello"')
    })
  })

  describe('Component Definitions', () => {
    it('should parse component with colon', () => {
      const result = parseLine('MyButton:')
      expect(result.componentPart).toBe('MyButton:')
    })

    it('should parse component as parent', () => {
      const result = parseLine('MyButton as Button:')
      expect(result.componentPart).toBe('MyButton as Button:')
    })

    it('should parse lowercase component', () => {
      const result = parseLine('box pad 10')
      expect(result.componentPart).toBe('box')
    })
  })

  describe('Position Tracking', () => {
    it('should track correct start and end indices', () => {
      const result = parseLine('Box pad 10')
      const prop = result.properties[0]
      expect(prop.startIndex).toBe(4) // After "Box "
      expect(result.original.substring(prop.startIndex, prop.endIndex)).toBe('pad 10')
    })

    it('should track positions for multiple properties', () => {
      const result = parseLine('Box pad 10, bg #FFF')
      expect(result.properties[0].startIndex).toBeLessThan(result.properties[1].startIndex)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty line', () => {
      const result = parseLine('')
      expect(result.componentPart).toBe('')
      expect(result.properties.length).toBe(0)
    })

    it('should handle whitespace-only line', () => {
      const result = parseLine('   ')
      expect(result.indent).toBe('   ')
      expect(result.componentPart).toBe('')
    })

    it('should handle line with only indent and component', () => {
      const result = parseLine('  Box')
      expect(result.indent).toBe('  ')
      expect(result.componentPart).toBe('Box')
      expect(result.properties.length).toBe(0)
    })
  })
})

// ===========================================
// UPDATE PROPERTY IN LINE
// ===========================================

describe('updatePropertyInLine', () => {
  it('should update existing property value', () => {
    const parsed = parseLine('Box pad 10')
    const result = updatePropertyInLine(parsed, 'pad', '20')
    expect(result).toBe('Box pad 20')
  })

  it('should update property using alias', () => {
    const parsed = parseLine('Box padding 10')
    const result = updatePropertyInLine(parsed, 'pad', '20')
    expect(result).toBe('Box padding 20')
  })

  it('should preserve other properties', () => {
    const parsed = parseLine('Box pad 10, bg #FFF')
    const result = updatePropertyInLine(parsed, 'pad', '20')
    expect(result).toContain('bg #FFF')
    expect(result).toContain('pad 20')
  })

  it('should add property if not exists', () => {
    const parsed = parseLine('Box pad 10')
    const result = updatePropertyInLine(parsed, 'bg', '#FFF')
    expect(result).toContain('bg #FFF')
  })

  it('should update color value', () => {
    const parsed = parseLine('Box bg #FF0000')
    const result = updatePropertyInLine(parsed, 'bg', '#00FF00')
    expect(result).toBe('Box bg #00FF00')
  })

  it('should update token value', () => {
    const parsed = parseLine('Box bg $old.token')
    const result = updatePropertyInLine(parsed, 'bg', '$new.token')
    expect(result).toBe('Box bg $new.token')
  })

  it('should handle boolean property update to value', () => {
    const parsed = parseLine('Box hidden')
    const result = updatePropertyInLine(parsed, 'hidden', 'false')
    expect(result).toBe('Box hidden false')
  })
})

// ===========================================
// ADD PROPERTY TO LINE
// ===========================================

describe('addPropertyToLine', () => {
  it('should add property to empty component', () => {
    const parsed = parseLine('Box')
    const result = addPropertyToLine(parsed, 'pad', '10')
    expect(result).toBe('Box pad 10')
  })

  it('should add property with comma to existing properties', () => {
    const parsed = parseLine('Box pad 10')
    const result = addPropertyToLine(parsed, 'bg', '#FFF')
    expect(result).toBe('Box pad 10, bg #FFF')
  })

  it('should add boolean property', () => {
    const parsed = parseLine('Box pad 10')
    const result = addPropertyToLine(parsed, 'hidden', '')
    expect(result).toBe('Box pad 10, hidden')
  })

  it('should add property with true value as boolean', () => {
    const parsed = parseLine('Box pad 10')
    const result = addPropertyToLine(parsed, 'visible', 'true')
    expect(result).toBe('Box pad 10, visible')
  })

  it('should trim trailing whitespace', () => {
    const parsed = parseLine('Box pad 10   ')
    const result = addPropertyToLine(parsed, 'bg', '#FFF')
    expect(result).toBe('Box pad 10, bg #FFF')
  })
})

// ===========================================
// REMOVE PROPERTY FROM LINE
// ===========================================

describe('removePropertyFromLine', () => {
  it('should remove property from line', () => {
    const parsed = parseLine('Box pad 10, bg #FFF')
    const result = removePropertyFromLine(parsed, 'bg')
    expect(result).toBe('Box pad 10')
  })

  it('should remove first property', () => {
    const parsed = parseLine('Box pad 10, bg #FFF')
    const result = removePropertyFromLine(parsed, 'pad')
    expect(result).toContain('bg #FFF')
    expect(result).not.toContain('pad')
  })

  it('should handle removing only property', () => {
    const parsed = parseLine('Box pad 10')
    const result = removePropertyFromLine(parsed, 'pad')
    // Implementation leaves trailing space
    expect(result.trim()).toBe('Box')
  })

  it('should return original if property not found', () => {
    const parsed = parseLine('Box pad 10')
    const result = removePropertyFromLine(parsed, 'nonexistent')
    expect(result).toBe('Box pad 10')
  })

  it('should remove property by alias', () => {
    const parsed = parseLine('Box padding 10, bg #FFF')
    const result = removePropertyFromLine(parsed, 'pad')
    expect(result).not.toContain('padding')
    expect(result).toContain('bg #FFF')
  })
})

// ===========================================
// FIND PROPERTY IN LINE
// ===========================================

describe('findPropertyInLine', () => {
  it('should find property by name', () => {
    const parsed = parseLine('Box pad 10, bg #FFF')
    const prop = findPropertyInLine(parsed, 'pad')
    expect(prop).not.toBeNull()
    expect(prop!.name).toBe('pad')
    expect(prop!.value).toBe('10')
  })

  it('should find property by alias', () => {
    const parsed = parseLine('Box padding 10')
    const prop = findPropertyInLine(parsed, 'pad')
    expect(prop).not.toBeNull()
    expect(prop!.name).toBe('padding')
  })

  it('should return null if not found', () => {
    const parsed = parseLine('Box pad 10')
    const prop = findPropertyInLine(parsed, 'bg')
    expect(prop).toBeNull()
  })

  it('should find boolean property', () => {
    const parsed = parseLine('Box hidden')
    const prop = findPropertyInLine(parsed, 'hidden')
    expect(prop).not.toBeNull()
    expect(prop!.isBoolean).toBe(true)
  })
})

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

describe('getCanonicalName', () => {
  it('should return canonical name for alias', () => {
    expect(getCanonicalName('bg')).toBe('background')
  })

  it('should return canonical name for pad', () => {
    expect(getCanonicalName('pad')).toBe('padding')
  })

  it('should return same name if already canonical', () => {
    expect(getCanonicalName('background')).toBe('background')
  })

  it('should return same name if unknown', () => {
    expect(getCanonicalName('unknown-prop')).toBe('unknown-prop')
  })
})

describe('isSameProperty', () => {
  it('should return true for same property', () => {
    expect(isSameProperty('bg', 'bg')).toBe(true)
  })

  it('should return true for alias and canonical', () => {
    expect(isSameProperty('bg', 'background')).toBe(true)
  })

  it('should return true for different aliases', () => {
    expect(isSameProperty('pad', 'padding')).toBe(true)
  })

  it('should return false for different properties', () => {
    expect(isSameProperty('bg', 'pad')).toBe(false)
  })
})

describe('isBooleanProperty', () => {
  it('should return true for boolean properties', () => {
    expect(isBooleanProperty('hidden')).toBe(true)
    expect(isBooleanProperty('visible')).toBe(true)
  })

  it('should return false for non-boolean properties', () => {
    expect(isBooleanProperty('bg')).toBe(false)
    expect(isBooleanProperty('pad')).toBe(false)
  })
})

describe('isMultiValueProperty', () => {
  it('should return true for spacing properties', () => {
    expect(isMultiValueProperty('pad')).toBe(true)
    expect(isMultiValueProperty('padding')).toBe(true)
  })

  it('should return true for border properties', () => {
    expect(isMultiValueProperty('bor')).toBe(true)
    expect(isMultiValueProperty('border')).toBe(true)
  })

  it('should return false for single-value properties', () => {
    expect(isMultiValueProperty('bg')).toBe(false)
  })
})

// ===========================================
// COMPLEX SCENARIOS
// ===========================================

describe('Complex Scenarios', () => {
  it('should handle full component definition', () => {
    const line = '  PrimaryButton as Button: bg $accent.bg, col #FFF, pad 12 24, rad 8'
    const parsed = parseLine(line)

    expect(parsed.indent).toBe('  ')
    expect(parsed.componentPart).toBe('PrimaryButton as Button:')
    expect(parsed.properties.length).toBe(4)
  })

  it('should handle state-like lines', () => {
    const line = '  state hover bg #FF0000'
    const parsed = parseLine(line)
    // Note: 'state' is parsed as component, 'hover' and 'bg' as properties
    expect(parsed.componentPart).toBe('state')
  })

  it('should roundtrip update correctly', () => {
    const original = 'Box pad 10, bg #FF0000, rad 4'
    const parsed1 = parseLine(original)
    const updated = updatePropertyInLine(parsed1, 'bg', '#00FF00')
    const parsed2 = parseLine(updated)

    expect(findPropertyInLine(parsed2, 'bg')!.value).toBe('#00FF00')
    expect(findPropertyInLine(parsed2, 'pad')!.value).toBe('10')
    expect(findPropertyInLine(parsed2, 'rad')!.value).toBe('4')
  })

  it('should roundtrip add correctly', () => {
    const original = 'Box pad 10'
    const parsed = parseLine(original)
    const withBg = addPropertyToLine(parsed, 'bg', '#FFF')
    const parsed2 = parseLine(withBg)
    const withRad = addPropertyToLine(parsed2, 'rad', '8')

    expect(withRad).toContain('pad 10')
    expect(withRad).toContain('bg #FFF')
    expect(withRad).toContain('rad 8')
  })

  it('should roundtrip remove correctly', () => {
    const original = 'Box pad 10, bg #FFF, rad 8'
    const parsed = parseLine(original)
    const removed = removePropertyFromLine(parsed, 'bg')
    const parsed2 = parseLine(removed)

    expect(findPropertyInLine(parsed2, 'pad')).not.toBeNull()
    expect(findPropertyInLine(parsed2, 'bg')).toBeNull()
    expect(findPropertyInLine(parsed2, 'rad')).not.toBeNull()
  })
})
