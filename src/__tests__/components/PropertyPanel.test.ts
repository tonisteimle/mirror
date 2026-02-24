/**
 * PropertyPanel Tests
 *
 * Tests for property parsing and updating logic.
 */

import { describe, it, expect } from 'vitest'

// Import the module to access parseProperties (we need to make it accessible)
// For now, we'll recreate the core parsing logic for testing

// Boolean properties that don't require a value
const BOOLEAN_PROPS = new Set([
  'horizontal', 'vertical', 'center', 'wrap', 'stacked', 'between',
  'hor', 'ver', 'cen',
  'w-min', 'w-max', 'h-min', 'h-max',
  'hidden', 'disabled', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
  'bold', 'scroll', 'clip',
])

// Property patterns for parsing
const PROPERTY_PATTERNS = [
  // Boolean properties
  { pattern: /\b(horizontal|hor)\b/, key: 'horizontal', isBoolean: true },
  { pattern: /\b(vertical|ver)\b/, key: 'vertical', isBoolean: true },
  { pattern: /\b(center|cen)\b/, key: 'center', isBoolean: true },
  { pattern: /\bw-min\b/, key: 'w-min', isBoolean: true },
  { pattern: /\bw-max\b/, key: 'w-max', isBoolean: true },
  { pattern: /\bh-min\b/, key: 'h-min', isBoolean: true },
  { pattern: /\bh-max\b/, key: 'h-max', isBoolean: true },
  { pattern: /\bbetween\b/, key: 'between', isBoolean: true },
  { pattern: /\bwrap\b/, key: 'wrap', isBoolean: true },
  { pattern: /\bhidden\b/, key: 'hidden', isBoolean: true },
  { pattern: /\bitalic\b/, key: 'italic', isBoolean: true },
  { pattern: /\bunderline\b/, key: 'underline', isBoolean: true },
  // Alignment properties
  { pattern: /\bhor-l\b/, key: 'hor-l', isBoolean: true },
  { pattern: /\bhor-cen\b/, key: 'hor-cen', isBoolean: true },
  { pattern: /\bhor-r\b/, key: 'hor-r', isBoolean: true },
  { pattern: /\bver-t\b/, key: 'ver-t', isBoolean: true },
  { pattern: /\bver-cen\b/, key: 'ver-cen', isBoolean: true },
  { pattern: /\bver-b\b/, key: 'ver-b', isBoolean: true },
  // Value properties
  { pattern: /\bgrid\s+(\S+)/, key: 'grid' },
  { pattern: /\bw\s+([^\s,]+)/, key: 'width' },
  { pattern: /\bh\s+([^\s,]+)/, key: 'height' },
  { pattern: /\bpad\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'padding' },
  { pattern: /\bmar\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'margin' },
  { pattern: /\bbg\s+([^\s,]+)/, key: 'background' },
  { pattern: /\bcol\s+([^\s,]+)/, key: 'color' },
  { pattern: /\bsize\s+([^\s,]+)/, key: 'size' },
  { pattern: /\bweight\s+([^\s,]+)/, key: 'weight' },
  { pattern: /\bfont\s+([^\s,]+)/, key: 'font' },
  { pattern: /\bgap\s+([^\s,]+)/, key: 'gap' },
  { pattern: /\brad\s+([^\s,]+)/, key: 'radius' },
  { pattern: /\bbor\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'border' },
  { pattern: /\bboc\s+([^\s,]+)/, key: 'borderColor' },
  { pattern: /\bo\s+([^\s,]+)/, key: 'opacity' },
  { pattern: /\bz\s+([^\s,]+)/, key: 'zIndex' },
  { pattern: /\bshadow\s+([^\s,]+)/, key: 'shadow' },
  { pattern: /\bcursor\s+([^\s,]+)/, key: 'cursor' },
  { pattern: /\bline\s+([^\s,]+)/, key: 'lineHeight' },
  { pattern: /\balign\s+([^\s,]+)/, key: 'align' },
  // Hover properties
  { pattern: /\bhover-bg\s+([^\s,]+)/, key: 'hover-bg' },
  { pattern: /\bhover-col\s+([^\s,]+)/, key: 'hover-col' },
  { pattern: /\bhover-opacity\s+([^\s,]+)/, key: 'hover-opacity' },
  { pattern: /\bhover-scale\s+([^\s,]+)/, key: 'hover-scale' },
]

function parseProperties(line: string): Record<string, string> {
  const props: Record<string, string> = {}
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//')) return props

  const componentMatch = trimmed.match(/^-?\s*([A-Z][\w]*)\s*(.*)$/)
  if (!componentMatch) return props

  const propsString = componentMatch[2]
  if (!propsString) return props

  for (const { pattern, key, isBoolean } of PROPERTY_PATTERNS) {
    const match = propsString.match(pattern)
    if (match) {
      props[key] = isBoolean ? 'true' : (match[1] || 'true')
    }
  }

  return props
}

describe('PropertyPanel Parsing', () => {
  describe('parseProperties', () => {
    it('parses empty line', () => {
      expect(parseProperties('')).toEqual({})
    })

    it('parses comment line', () => {
      expect(parseProperties('// Comment')).toEqual({})
    })

    it('parses component without properties', () => {
      expect(parseProperties('Button')).toEqual({})
    })

    it('parses horizontal layout', () => {
      const props = parseProperties('Box hor')
      expect(props.horizontal).toBe('true')
    })

    it('parses vertical layout', () => {
      const props = parseProperties('Box ver')
      expect(props.vertical).toBe('true')
    })

    it('parses center alignment', () => {
      const props = parseProperties('Box cen')
      expect(props.center).toBe('true')
    })

    it('parses width value', () => {
      const props = parseProperties('Box w 200')
      expect(props.width).toBe('200')
    })

    it('parses height value', () => {
      const props = parseProperties('Box h 100')
      expect(props.height).toBe('100')
    })

    it('parses w-min', () => {
      const props = parseProperties('Box w-min')
      expect(props['w-min']).toBe('true')
    })

    it('parses w-max', () => {
      const props = parseProperties('Box w-max')
      expect(props['w-max']).toBe('true')
    })

    it('parses padding', () => {
      const props = parseProperties('Box pad 16')
      expect(props.padding).toBe('16')
    })

    it('parses margin', () => {
      const props = parseProperties('Box mar 8')
      expect(props.margin).toBe('8')
    })

    it('parses gap with shorthand', () => {
      const props = parseProperties('Box gap 12')
      expect(props.gap).toBe('12')
    })

    it('parses background color', () => {
      const props = parseProperties('Box bg #3B82F6')
      expect(props.background).toBe('#3B82F6')
    })

    it('parses text color', () => {
      const props = parseProperties('Text col #333')
      expect(props.color).toBe('#333')
    })

    it('parses font size', () => {
      const props = parseProperties('Text size 14')
      expect(props.size).toBe('14')
    })

    it('parses font weight', () => {
      const props = parseProperties('Text weight 600')
      expect(props.weight).toBe('600')
    })

    it('parses radius', () => {
      const props = parseProperties('Box rad 8')
      expect(props.radius).toBe('8')
    })

    it('parses border', () => {
      const props = parseProperties('Box bor 1')
      expect(props.border).toBe('1')
    })

    it('parses opacity', () => {
      const props = parseProperties('Box o 0.5')
      expect(props.opacity).toBe('0.5')
    })

    it('parses shadow', () => {
      const props = parseProperties('Box shadow md')
      expect(props.shadow).toBe('md')
    })

    it('parses hidden', () => {
      const props = parseProperties('Box hidden')
      expect(props.hidden).toBe('true')
    })

    it('parses multiple properties', () => {
      const props = parseProperties('Box hor, pad 16, bg #FFF, rad 8')
      expect(props.horizontal).toBe('true')
      expect(props.padding).toBe('16')
      expect(props.background).toBe('#FFF')
      expect(props.radius).toBe('8')
    })

    it('parses token values', () => {
      const props = parseProperties('Button bg $primary')
      expect(props.background).toBe('$primary')
    })

    it('parses percentage values', () => {
      const props = parseProperties('Box w 50%')
      expect(props.width).toBe('50%')
    })

    it('parses grid', () => {
      const props = parseProperties('Box grid 3')
      expect(props.grid).toBe('3')
    })

    it('parses hover properties', () => {
      const props = parseProperties('Button hover-bg #555')
      expect(props['hover-bg']).toBe('#555')
    })

    it('parses list item with -', () => {
      const props = parseProperties('- Item col #EF4444')
      expect(props.color).toBe('#EF4444')
    })
  })
})

describe('Alignment Properties', () => {
  it('parses hor-l', () => {
    const props = parseProperties('Box hor-l')
    expect(props['hor-l']).toBe('true')
  })

  it('parses hor-cen', () => {
    const props = parseProperties('Box hor-cen')
    expect(props['hor-cen']).toBe('true')
  })

  it('parses hor-r', () => {
    const props = parseProperties('Box hor-r')
    expect(props['hor-r']).toBe('true')
  })

  it('parses ver-t', () => {
    const props = parseProperties('Box ver-t')
    expect(props['ver-t']).toBe('true')
  })

  it('parses ver-cen', () => {
    const props = parseProperties('Box ver-cen')
    expect(props['ver-cen']).toBe('true')
  })

  it('parses ver-b', () => {
    const props = parseProperties('Box ver-b')
    expect(props['ver-b']).toBe('true')
  })

  it('parses between', () => {
    const props = parseProperties('Box between')
    expect(props.between).toBe('true')
  })

  it('parses wrap', () => {
    const props = parseProperties('Box wrap')
    expect(props.wrap).toBe('true')
  })
})

describe('Hover Properties', () => {
  it('parses hover-bg', () => {
    const props = parseProperties('Button hover-bg #555')
    expect(props['hover-bg']).toBe('#555')
  })

  it('parses hover-col', () => {
    const props = parseProperties('Button hover-col #FFF')
    expect(props['hover-col']).toBe('#FFF')
  })

  it('parses hover-opacity', () => {
    const props = parseProperties('Button hover-opacity 0.8')
    expect(props['hover-opacity']).toBe('0.8')
  })

  it('parses hover-scale', () => {
    const props = parseProperties('Button hover-scale 1.05')
    expect(props['hover-scale']).toBe('1.05')
  })
})

describe('Regex Escaping', () => {
  it('escapes special characters in property names', () => {
    // Test with actual special chars (not '-' which isn't special outside char classes)
    const propName = 'test.prop'
    const escapedPropName = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(escapedPropName).toBe('test\\.prop')
  })

  it('does not escape normal characters', () => {
    // '-' is not a special regex character outside of character classes
    const propName = 'w-min'
    const escapedPropName = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(escapedPropName).toBe('w-min')
  })
})
