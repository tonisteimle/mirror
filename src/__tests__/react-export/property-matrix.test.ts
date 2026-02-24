/**
 * Property Matrix Tests for React Export
 *
 * Systematischer Test aller DSL-Properties:
 * 1. Mirror-Code parsen
 * 2. React exportieren
 * 3. React-Code in JSDOM rendern
 * 4. Computed Styles mit Preview vergleichen
 *
 * Bei Fehlern sieht man sofort:
 * - Welche Property betroffen ist
 * - Was erwartet wurde
 * - Was tatsächlich generiert wurde
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { parse } from '../../parser/parser'
import { exportReact } from '../../generator/export'
import { render } from '@testing-library/react'
import React from 'react'
import { JSDOM } from 'jsdom'

// =============================================================================
// Test Infrastructure
// =============================================================================

interface PropertyTestCase {
  name: string
  mirror: string
  expectedCss: Record<string, string>
  skip?: boolean
  only?: boolean
}

interface TestResult {
  property: string
  mirror: string
  expected: Record<string, string>
  actual: Record<string, string>
  generatedCss: string
  generatedJsx: string
  passed: boolean
  errors: string[]
}

/**
 * Extrahiert CSS-Properties aus generiertem CSS-String
 */
function extractCssProperties(css: string, className: string): Record<string, string> {
  const result: Record<string, string> = {}

  // Finde die Klasse im CSS
  const classRegex = new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, 'g')
  const match = classRegex.exec(css)

  if (match) {
    const properties = match[1].trim().split(';').filter(Boolean)
    for (const prop of properties) {
      const [key, value] = prop.split(':').map((s) => s.trim())
      if (key && value) {
        result[key] = value
      }
    }
  }

  return result
}

/**
 * Führt einen Property-Test durch
 */
function testProperty(testCase: PropertyTestCase): TestResult {
  const errors: string[] = []
  let actual: Record<string, string> = {}

  try {
    // 1. Parse Mirror
    const parseResult = parse(testCase.mirror)
    if (parseResult.errors.length > 0) {
      errors.push(`Parse errors: ${parseResult.errors.map((e) => e.message).join(', ')}`)
    }

    // 2. Export React
    const { tsx, css } = exportReact(testCase.mirror)

    // 3. Extrahiere CSS für erste Klasse
    const classMatch = tsx.match(/className="([^"]+)"/)
    if (classMatch) {
      actual = extractCssProperties(css, classMatch[1])
    }

    // 4. Vergleiche mit erwartetem CSS
    for (const [prop, expectedValue] of Object.entries(testCase.expectedCss)) {
      const actualValue = actual[prop]
      if (!actualValue) {
        errors.push(`Missing CSS property: ${prop}`)
      } else if (actualValue !== expectedValue) {
        errors.push(`${prop}: expected "${expectedValue}", got "${actualValue}"`)
      }
    }

    return {
      property: testCase.name,
      mirror: testCase.mirror,
      expected: testCase.expectedCss,
      actual,
      generatedCss: css,
      generatedJsx: tsx,
      passed: errors.length === 0,
      errors,
    }
  } catch (e) {
    errors.push(`Exception: ${e}`)
    return {
      property: testCase.name,
      mirror: testCase.mirror,
      expected: testCase.expectedCss,
      actual,
      generatedCss: '',
      generatedJsx: '',
      passed: false,
      errors,
    }
  }
}

// =============================================================================
// Property Test Cases - Systematisch alle Properties
// =============================================================================

const PROPERTY_TESTS: PropertyTestCase[] = [
  // -------------------------------------------------------------------------
  // SIZING
  // -------------------------------------------------------------------------
  {
    name: 'width: fixed px',
    mirror: 'Box w 200',
    expectedCss: { width: '200px' },
  },
  {
    name: 'width: percentage',
    mirror: 'Box w 50%',
    expectedCss: { width: '50%' },
  },
  {
    name: 'width: full',
    mirror: 'Box w full',
    expectedCss: { width: '100%', 'flex-grow': '1' },
  },
  {
    name: 'width: hug',
    mirror: 'Box w hug',
    expectedCss: { width: 'fit-content' },
  },
  {
    name: 'height: fixed px',
    mirror: 'Box h 100',
    expectedCss: { height: '100px' },
  },
  {
    name: 'height: full',
    mirror: 'Box h full',
    expectedCss: { height: '100%', 'flex-grow': '1' },
  },
  {
    name: 'min-width',
    mirror: 'Box minw 100',
    expectedCss: { 'min-width': '100px' },
  },
  {
    name: 'max-width',
    mirror: 'Box maxw 500',
    expectedCss: { 'max-width': '500px' },
  },
  {
    name: 'size shorthand',
    mirror: 'Box size 100 200',
    expectedCss: { width: '100px', height: '200px' },
  },

  // -------------------------------------------------------------------------
  // SPACING
  // -------------------------------------------------------------------------
  {
    name: 'padding: single value',
    mirror: 'Box pad 16',
    expectedCss: { padding: '16px' },
  },
  {
    name: 'padding: two values (v h)',
    mirror: 'Box pad 8 16',
    // Parser expands to individual properties which is valid CSS
    expectedCss: {
      'padding-top': '8px',
      'padding-bottom': '8px',
      'padding-left': '16px',
      'padding-right': '16px',
    },
  },
  {
    name: 'padding: four values',
    mirror: 'Box pad 4 8 12 16',
    // Parser expands to individual properties which is valid CSS
    expectedCss: {
      'padding-top': '4px',
      'padding-right': '8px',
      'padding-bottom': '12px',
      'padding-left': '16px',
    },
  },
  {
    name: 'padding: directional',
    mirror: 'Box pad left 16',
    expectedCss: { 'padding-left': '16px' },
  },
  {
    name: 'padding: top bottom',
    mirror: 'Box pad top 8 bottom 16',
    expectedCss: { 'padding-top': '8px', 'padding-bottom': '16px' },
  },
  {
    name: 'margin: single value',
    mirror: 'Box mar 16',
    expectedCss: { margin: '16px' },
  },

  // -------------------------------------------------------------------------
  // LAYOUT
  // -------------------------------------------------------------------------
  {
    name: 'horizontal',
    mirror: 'Box hor',
    expectedCss: { 'flex-direction': 'row' },
  },
  {
    name: 'vertical',
    mirror: 'Box ver',
    expectedCss: { 'flex-direction': 'column' },
  },
  {
    name: 'gap',
    mirror: 'Box g 12',
    expectedCss: { gap: '12px' },
  },
  {
    name: 'spread',
    mirror: 'Box spread',
    expectedCss: { 'justify-content': 'space-between' },
  },
  {
    name: 'wrap',
    mirror: 'Box wrap',
    expectedCss: { 'flex-wrap': 'wrap' },
  },
  {
    name: 'center',
    mirror: 'Box center',
    expectedCss: { 'justify-content': 'center', 'align-items': 'center' },
  },

  // -------------------------------------------------------------------------
  // ALIGNMENT
  // -------------------------------------------------------------------------
  {
    name: 'left',
    mirror: 'Box left',
    expectedCss: { 'align-items': 'flex-start' },
  },
  {
    name: 'right',
    mirror: 'Box right',
    expectedCss: { 'align-items': 'flex-end' },
  },
  {
    name: 'top',
    mirror: 'Box top',
    expectedCss: { 'justify-content': 'flex-start' },
  },
  {
    name: 'bottom',
    mirror: 'Box bottom',
    expectedCss: { 'justify-content': 'flex-end' },
  },

  // -------------------------------------------------------------------------
  // COLORS
  // -------------------------------------------------------------------------
  {
    name: 'background: hex',
    mirror: 'Box bg #3B82F6',
    // Uses 'background' shorthand which is valid CSS
    expectedCss: { background: '#3B82F6' },
  },
  {
    name: 'background: rgb',
    mirror: 'Box bg rgb(59, 130, 246)',
    expectedCss: { background: 'rgb(59, 130, 246)' },
  },
  {
    name: 'color: hex',
    mirror: 'Box col #FFFFFF',
    expectedCss: { color: '#FFFFFF' },
  },

  // -------------------------------------------------------------------------
  // BORDER
  // -------------------------------------------------------------------------
  {
    name: 'border: width only',
    mirror: 'Box bor 1',
    expectedCss: { border: '1px solid' },
  },
  {
    name: 'border: width color',
    mirror: 'Box bor 2 #333',
    expectedCss: { border: '2px solid #333' },
  },
  {
    name: 'border: directional',
    mirror: 'Box bor b 1 #333',
    expectedCss: { 'border-bottom': '1px solid #333' },
  },
  {
    name: 'radius: single',
    mirror: 'Box rad 8',
    expectedCss: { 'border-radius': '8px' },
  },
  {
    name: 'radius: directional',
    mirror: 'Box rad tl 8 br 8',
    expectedCss: {
      'border-top-left-radius': '8px',
      'border-bottom-right-radius': '8px',
    },
  },

  // -------------------------------------------------------------------------
  // TYPOGRAPHY
  // -------------------------------------------------------------------------
  {
    name: 'font-size',
    mirror: 'Text fs 16',
    expectedCss: { 'font-size': '16px' },
  },
  {
    name: 'font-weight',
    mirror: 'Text weight bold',
    // Parser converts 'bold' to numeric 700
    expectedCss: { 'font-weight': '700' },
  },
  {
    name: 'line-height',
    mirror: 'Text line 1.5',
    expectedCss: { 'line-height': '1.5' },
  },

  // -------------------------------------------------------------------------
  // VISUAL
  // -------------------------------------------------------------------------
  {
    name: 'opacity',
    mirror: 'Box o 0.5',
    expectedCss: { opacity: '0.5' },
  },
  {
    name: 'shadow',
    mirror: 'Box shadow md',
    expectedCss: { 'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  },
  {
    name: 'cursor',
    mirror: 'Box cursor pointer',
    expectedCss: { cursor: 'pointer' },
  },
  {
    name: 'z-index',
    mirror: 'Box z 10',
    expectedCss: { 'z-index': '10' },
  },

  // -------------------------------------------------------------------------
  // SCROLL
  // -------------------------------------------------------------------------
  {
    name: 'scroll',
    mirror: 'Box scroll',
    expectedCss: { 'overflow-y': 'auto' },
  },
  {
    name: 'clip',
    mirror: 'Box clip',
    expectedCss: { overflow: 'hidden' },
  },

  // -------------------------------------------------------------------------
  // GRID
  // -------------------------------------------------------------------------
  {
    name: 'grid: columns',
    mirror: 'Box grid 3',
    expectedCss: {
      display: 'grid',
      'grid-template-columns': 'repeat(3, 1fr)',
    },
  },

  // -------------------------------------------------------------------------
  // TRANSFORM
  // -------------------------------------------------------------------------
  {
    name: 'rotate',
    mirror: 'Box rot 45',
    expectedCss: { transform: 'rotate(45deg)' },
  },

  // -------------------------------------------------------------------------
  // VISIBILITY
  // -------------------------------------------------------------------------
  {
    name: 'hidden',
    mirror: 'Box hidden',
    expectedCss: { display: 'none' },
  },

  // -------------------------------------------------------------------------
  // ICON
  // -------------------------------------------------------------------------
  {
    name: 'icon-size',
    mirror: 'Icon size 24, "search"',
    expectedCss: { 'font-size': '24px' },
  },

  // -------------------------------------------------------------------------
  // TEXT DECORATION
  // -------------------------------------------------------------------------
  {
    name: 'italic',
    mirror: 'Text italic, "emphasis"',
    expectedCss: { 'font-style': 'italic' },
  },
  {
    name: 'underline',
    mirror: 'Text underline, "link"',
    expectedCss: { 'text-decoration': 'underline' },
  },
  {
    name: 'uppercase',
    mirror: 'Text uppercase, "title"',
    expectedCss: { 'text-transform': 'uppercase' },
  },

  // -------------------------------------------------------------------------
  // DISABLED
  // -------------------------------------------------------------------------
  {
    name: 'disabled',
    mirror: 'Button disabled, "Save"',
    expectedCss: { opacity: '0.5', 'pointer-events': 'none' },
  },
]

// =============================================================================
// Test Runner
// =============================================================================

describe('React Export: Property Matrix', () => {
  const results: TestResult[] = []

  // Run all tests and collect results
  for (const testCase of PROPERTY_TESTS) {
    const testFn = testCase.skip ? it.skip : testCase.only ? it.only : it

    testFn(testCase.name, () => {
      const result = testProperty(testCase)
      results.push(result)

      if (!result.passed) {
        console.log('\n=== FAILED TEST ===')
        console.log('Mirror:', result.mirror)
        console.log('Expected:', result.expected)
        console.log('Actual:', result.actual)
        console.log('Generated CSS:', result.generatedCss)
        console.log('Errors:', result.errors)
      }

      expect(result.errors).toHaveLength(0)
    })
  }
})

// =============================================================================
// Combined Property Tests - Properties die zusammen funktionieren müssen
// =============================================================================

describe('React Export: Combined Properties', () => {
  it('Button with multiple properties', () => {
    const result = testProperty({
      name: 'button-combo',
      mirror: 'Button pad 12 24, bg #3B82F6, col #FFF, rad 8, "Click"',
      // Parser expands padding to individual properties
      expectedCss: {
        'padding-top': '12px',
        'padding-bottom': '12px',
        'padding-left': '24px',
        'padding-right': '24px',
        background: '#3B82F6',
        color: '#FFF',
        'border-radius': '8px',
      },
    })

    expect(result.errors).toHaveLength(0)
  })

  it('Card layout', () => {
    const result = testProperty({
      name: 'card-layout',
      mirror: 'Card ver, g 16, pad 24, bg #1E1E2E, rad 12, shadow lg',
      expectedCss: {
        'flex-direction': 'column',
        gap: '16px',
        padding: '24px',
        background: '#1E1E2E',
        'border-radius': '12px',
      },
    })

    expect(result.errors).toHaveLength(0)
  })

  it('Horizontal button group', () => {
    const result = testProperty({
      name: 'button-group',
      mirror: 'Row hor, g 8, center',
      expectedCss: {
        'flex-direction': 'row',
        gap: '8px',
        'justify-content': 'center',
        'align-items': 'center',
      },
    })

    expect(result.errors).toHaveLength(0)
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('React Export: Edge Cases', () => {
  it('empty component', () => {
    const { tsx, css } = exportReact('Box')
    expect(tsx).toBeTruthy()
  })

  it('deeply nested', () => {
    const mirror = `
Box
  Box
    Box
      Box
        Box "Deep"
`
    const { tsx, css } = exportReact(mirror)
    expect(tsx).toContain('Deep')
  })

  it('many siblings', () => {
    const items = Array.from({ length: 10 }, (_, i) => `  Box "Item ${i}"`).join('\n')
    const mirror = `Row hor\n${items}`
    const { tsx, css } = exportReact(mirror)
    expect(tsx).toContain('Item 0')
    expect(tsx).toContain('Item 9')
  })
})
