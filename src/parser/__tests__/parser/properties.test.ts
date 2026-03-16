/**
 * Parser Property Tests
 *
 * Tests parsing of component properties
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// BASIC PROPERTIES
// ============================================================================

describe('Parser: Basic Properties', () => {
  it('parses single value property', () => {
    const ast = parse('Card as frame: pad 16')
    expect(ast.components[0].properties[0].name).toBe('pad')
    expect(ast.components[0].properties[0].values).toContain('16')
  })

  it('parses property with identifier value', () => {
    const ast = parse('Card as frame: bg primary')
    expect(ast.components[0].properties[0].name).toBe('bg')
    expect(ast.components[0].properties[0].values).toContain('primary')
  })

  it('parses property with hex color', () => {
    const ast = parse('Card as frame: bg #3B82F6')
    expect(ast.components[0].properties[0].values).toContain('#3B82F6')
  })

  it('parses property with string value', () => {
    const ast = parse('Card as frame: font "Inter"')
    expect(ast.components[0].properties[0].values).toContain('Inter')
  })
})

// ============================================================================
// MULTI-VALUE PROPERTIES
// ============================================================================

describe('Parser: Multi-Value Properties', () => {
  it('parses two-value property (pad 8 16)', () => {
    const ast = parse('Card as frame: pad 8 16')
    const prop = ast.components[0].properties[0]
    expect(prop.values.length).toBe(2)
    expect(prop.values).toContain('8')
    expect(prop.values).toContain('16')
  })

  it('parses four-value property (pad 8 16 8 16)', () => {
    const ast = parse('Card as frame: pad 8 16 8 16')
    const prop = ast.components[0].properties[0]
    expect(prop.values.length).toBe(4)
  })

  it('parses border with width and color', () => {
    const ast = parse('Card as frame: bor 1 #333')
    const prop = ast.components[0].properties[0]
    expect(prop.name).toBe('bor')
    expect(prop.values.length).toBe(2)
  })
})

// ============================================================================
// MULTIPLE PROPERTIES
// ============================================================================

describe('Parser: Multiple Properties', () => {
  it('parses comma-separated properties', () => {
    const ast = parse('Card as frame: pad 16, bg surface, rad 8')
    expect(ast.components[0].properties.length).toBe(3)
    expect(ast.components[0].properties[0].name).toBe('pad')
    expect(ast.components[0].properties[1].name).toBe('bg')
    expect(ast.components[0].properties[2].name).toBe('rad')
  })

  it('parses many properties', () => {
    const ast = parse('Button as button: pad 8, bg primary, col white, rad 4, cursor pointer')
    expect(ast.components[0].properties.length).toBe(5)
  })
})

// ============================================================================
// STRING CONTENT AS PROPERTY
// ============================================================================

describe('Parser: String Content', () => {
  it('string becomes content property', () => {
    const ast = parse('Button as button: "Click"')
    const content = ast.components[0].properties.find(p => p.name === 'content')
    expect(content).toBeDefined()
    expect(content?.values[0]).toBe('Click')
  })

  it('string content with other properties', () => {
    const ast = parse('Button as button: "Click", pad 8')
    expect(ast.components[0].properties.length).toBe(2)
  })

  it('string content first', () => {
    const ast = parse('Button as button: "Click", bg blue')
    const content = ast.components[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Click')
  })

  it('string content last', () => {
    const ast = parse('Button as button: pad 8, "Click"')
    const content = ast.components[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Click')
  })

  it('empty string content', () => {
    const ast = parse('Text as text: ""')
    const content = ast.components[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('')
  })
})

// ============================================================================
// PROPERTY POSITION
// ============================================================================

describe('Parser: Property Position', () => {
  it('property has line number', () => {
    const ast = parse('Card as frame: pad 16')
    expect(ast.components[0].properties[0].line).toBe(1)
  })

  it('property has column number', () => {
    const ast = parse('Card as frame: pad 16')
    expect(ast.components[0].properties[0].column).toBeGreaterThan(0)
  })
})

// ============================================================================
// INSTANCE PROPERTIES
// ============================================================================

describe('Parser: Instance Properties', () => {
  it('parses instance with property', () => {
    const ast = parse('Button pad 8')
    expect(ast.instances[0].properties.length).toBe(1)
  })

  it('parses instance with multiple properties', () => {
    const ast = parse('Button pad 8, bg primary, col white')
    expect(ast.instances[0].properties.length).toBe(3)
  })

  it('parses instance with content', () => {
    const ast = parse('Button "Click"')
    const content = ast.instances[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Click')
  })

  it('parses instance with content and properties', () => {
    const ast = parse('Button "Click", pad 8')
    expect(ast.instances[0].properties.length).toBe(2)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Property Edge Cases', () => {
  it('property with hyphenated name', () => {
    const ast = parse('Card as frame: font-size 14')
    expect(ast.components[0].properties[0].name).toBe('font-size')
  })

  it('property with underscore name', () => {
    const ast = parse('Card as frame: min_width 100')
    expect(ast.components[0].properties[0].name).toBe('min_width')
  })

  it('property value with hyphen (color name)', () => {
    const ast = parse('Card as frame: bg blue-500')
    expect(ast.components[0].properties[0].values).toContain('blue-500')
  })

  it('float value', () => {
    const ast = parse('Card as frame: opacity 0.5')
    expect(ast.components[0].properties[0].values).toContain('0.5')
  })

  it('zero value', () => {
    const ast = parse('Card as frame: margin 0')
    expect(ast.components[0].properties[0].values).toContain('0')
  })

  it('large number value', () => {
    const ast = parse('Card as frame: width 1920')
    expect(ast.components[0].properties[0].values).toContain('1920')
  })
})

// ============================================================================
// FLAG PROPERTIES
// ============================================================================

describe('Parser: Flag Properties', () => {
  // Flag properties are properties without values (e.g., hidden, disabled)

  it('parses flag property', () => {
    const ast = parse('Card as frame: hidden')
    expect(ast.components[0].properties[0].name).toBe('hidden')
    // Boolean properties have values: [true] to indicate the flag is set
    expect(ast.components[0].properties[0].values).toEqual([true])
  })

  it('parses flag with other properties', () => {
    const ast = parse('Card as frame: pad 8, hidden, bg surface')
    expect(ast.components[0].properties.length).toBe(3)
    const hidden = ast.components[0].properties.find(p => p.name === 'hidden')
    expect(hidden).toBeDefined()
  })

  it('parses layout flags', () => {
    const ast = parse('Row as frame: hor, center')
    expect(ast.components[0].properties.length).toBe(2)
  })
})
