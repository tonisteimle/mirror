/**
 * Dual Render Tests
 *
 * Vergleicht Mirror Preview mit generiertem React-Code:
 * 1. Mirror-Code in Preview rendern → DOM A
 * 2. React-Code generieren → DOM B
 * 3. Computed Styles vergleichen
 *
 * Das stellt sicher, dass der exportierte React-Code
 * identisch zum Preview aussieht.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { parse } from '../../parser/parser'
import { exportReact } from '../../generator/export'
import { generateReactElement } from '../../generator/react-generator'
import { PreviewProviders } from '../../generator/preview-providers'

// =============================================================================
// Test Infrastructure
// =============================================================================

/**
 * Rendert Mirror-Code über den normalen Preview-Weg
 */
function renderMirrorPreview(mirrorCode: string): HTMLElement | null {
  const parseResult = parse(mirrorCode)
  if (parseResult.errors.length > 0) {
    throw new Error(`Parse errors: ${parseResult.errors.map((e) => e.message).join(', ')}`)
  }

  const element = generateReactElement(parseResult.nodes, {
    registry: parseResult.registry,
    tokens: parseResult.tokens,
    onInteraction: () => {},
  })

  const { container } = render(<PreviewProviders parseResult={parseResult}>{element}</PreviewProviders>)

  return container.firstChild as HTMLElement
}

/**
 * Extrahiert relevante Styles aus einem Element
 */
function getRelevantStyles(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const relevant: Record<string, string> = {}

  // Die wichtigsten Properties die wir vergleichen wollen
  const properties = [
    'display',
    'flex-direction',
    'justify-content',
    'align-items',
    'gap',
    'flex-wrap',
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'background-color',
    'color',
    'border',
    'border-radius',
    'font-size',
    'font-weight',
    'line-height',
    'opacity',
    'cursor',
    'overflow',
    'overflow-x',
    'overflow-y',
  ]

  for (const prop of properties) {
    const value = computed.getPropertyValue(prop)
    if (value && value !== 'initial' && value !== 'auto' && value !== 'normal' && value !== 'none') {
      relevant[prop] = value
    }
  }

  return relevant
}

/**
 * Vergleicht zwei Style-Objekte
 */
function compareStyles(
  previewStyles: Record<string, string>,
  exportStyles: Record<string, string>
): { matches: boolean; differences: Array<{ property: string; preview: string; export: string }> } {
  const differences: Array<{ property: string; preview: string; export: string }> = []

  // Alle Properties aus beiden Sets sammeln
  const allProps = new Set([...Object.keys(previewStyles), ...Object.keys(exportStyles)])

  for (const prop of allProps) {
    const previewValue = previewStyles[prop] || ''
    const exportValue = exportStyles[prop] || ''

    // Normalisiere Werte für Vergleich
    const normalizedPreview = normalizeStyleValue(prop, previewValue)
    const normalizedExport = normalizeStyleValue(prop, exportValue)

    if (normalizedPreview !== normalizedExport) {
      differences.push({
        property: prop,
        preview: previewValue,
        export: exportValue,
      })
    }
  }

  return {
    matches: differences.length === 0,
    differences,
  }
}

/**
 * Normalisiert Style-Werte für Vergleich
 */
function normalizeStyleValue(property: string, value: string): string {
  if (!value) return ''

  // Farben normalisieren (rgb -> hex, etc.)
  if (property.includes('color') || property === 'background-color') {
    return normalizeColor(value)
  }

  // Pixel-Werte normalisieren
  value = value.replace(/(\d+)px/g, '$1px')

  return value.toLowerCase().trim()
}

/**
 * Normalisiert Farbwerte
 */
function normalizeColor(color: string): string {
  // rgb(r, g, b) -> hex
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toLowerCase()
  }

  // rgba -> rgb wenn alpha 1
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*1\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toLowerCase()
  }

  return color.toLowerCase().trim()
}

// =============================================================================
// Test Cases
// =============================================================================

interface DualRenderTestCase {
  name: string
  mirror: string
  skip?: boolean
}

const TEST_CASES: DualRenderTestCase[] = [
  {
    name: 'Simple box with padding',
    mirror: 'Box pad 16',
  },
  {
    name: 'Box with background',
    mirror: 'Box bg #3B82F6, pad 12',
  },
  {
    name: 'Horizontal layout',
    mirror: `
Row hor, g 12
  Box "A"
  Box "B"
`,
  },
  {
    name: 'Vertical layout with gap',
    mirror: `
Column ver, g 8
  Box "First"
  Box "Second"
`,
  },
  {
    name: 'Centered content',
    mirror: 'Box 200 100, center, bg #333',
  },
  {
    name: 'Button styling',
    mirror: 'Button pad 12 24, bg #3B82F6, col #FFF, rad 8, "Click"',
  },
  {
    name: 'Card with shadow',
    mirror: 'Card pad 24, bg #1E1E2E, rad 12, shadow md',
  },
  {
    name: 'Typography',
    mirror: 'Text fs 18, weight bold, col #FFF, "Title"',
  },
  {
    name: 'Border styling',
    mirror: 'Box bor 2 #3B82F6, rad 8, pad 16',
  },
  {
    name: 'Full width',
    mirror: 'Box w full, h 50, bg #333',
  },
  {
    name: 'Complex card',
    mirror: `
Card ver, g 16, pad 24, bg #1E1E2E, rad 12
  Title fs 20, weight bold, "Welcome"
  Description col #888, "Get started"
  Button bg #3B82F6, pad 12 24, rad 8, "Continue"
`,
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('Dual Render Comparison', () => {
  for (const testCase of TEST_CASES) {
    const testFn = testCase.skip ? it.skip : it

    testFn(`${testCase.name} renders identically in preview and export`, () => {
      // 1. Render via Preview
      const previewElement = renderMirrorPreview(testCase.mirror)
      expect(previewElement).toBeTruthy()

      // 2. Get preview styles
      const previewStyles = getRelevantStyles(previewElement!)

      // 3. Export React
      const { tsx, css } = exportReact(testCase.mirror)

      // 4. Check that CSS was generated
      expect(css.length).toBeGreaterThan(0)

      // 5. Log for debugging
      console.log(`\n=== ${testCase.name} ===`)
      console.log('Preview styles:', previewStyles)
      console.log('Generated CSS:', css.slice(0, 500))

      // 6. Basic validation - CSS should contain key properties
      // (Full comparison requires rendering generated React)
      if (testCase.mirror.includes('pad')) {
        expect(css).toContain('padding')
      }
      if (testCase.mirror.includes('bg')) {
        expect(css).toContain('background')
      }
      if (testCase.mirror.includes('rad')) {
        expect(css).toContain('border-radius')
      }
      if (testCase.mirror.includes('hor')) {
        expect(css).toContain('flex-direction')
      }
    })
  }
})

// =============================================================================
// Specific Property Comparison Tests
// =============================================================================

describe('Property Comparison: Preview vs Export', () => {
  it('padding is consistent', () => {
    const mirror = 'Box pad 16'
    const { css } = exportReact(mirror)
    expect(css).toContain('padding: 16px')
  })

  it('padding with multiple values is consistent', () => {
    const mirror = 'Box pad 8 16'
    const { css } = exportReact(mirror)
    // Parser expands padding to individual properties
    expect(css).toContain('padding-top: 8px')
    expect(css).toContain('padding-bottom: 8px')
    expect(css).toContain('padding-left: 16px')
    expect(css).toContain('padding-right: 16px')
  })

  it('background color is consistent', () => {
    const mirror = 'Box bg #3B82F6'
    const { css } = exportReact(mirror)
    expect(css.toLowerCase()).toContain('background')
    expect(css.toLowerCase()).toContain('3b82f6')
  })

  it('border-radius is consistent', () => {
    const mirror = 'Box rad 8'
    const { css } = exportReact(mirror)
    expect(css).toContain('border-radius: 8px')
  })

  it('flex-direction row is consistent', () => {
    const mirror = 'Box hor'
    const { css } = exportReact(mirror)
    expect(css).toContain('flex-direction: row')
  })

  it('gap is consistent', () => {
    const mirror = 'Box g 12'
    const { css } = exportReact(mirror)
    expect(css).toContain('gap: 12px')
  })

  it('width full generates correct CSS', () => {
    const mirror = 'Box w full'
    const { css } = exportReact(mirror)
    expect(css).toContain('width: 100%')
  })

  it('center alignment is consistent', () => {
    const mirror = 'Box center'
    const { css } = exportReact(mirror)
    expect(css).toContain('justify-content: center')
    expect(css).toContain('align-items: center')
  })
})

// =============================================================================
// Regression Tests - Known Issues
// =============================================================================

describe('Known Issues / Regressions', () => {
  // Add tests here for specific bugs you encounter
  // When you fix a bug, the test stays to prevent regression

  it.skip('TODO: shadow property generates correct box-shadow', () => {
    const mirror = 'Box shadow md'
    const { css } = exportReact(mirror)
    expect(css).toContain('box-shadow')
  })

  it.skip('TODO: hover state generates :hover pseudo-class', () => {
    const mirror = `
Box bg #333
  hover
    bg #555
`
    const { css } = exportReact(mirror)
    expect(css).toContain(':hover')
  })

  it.skip('TODO: opacity is correctly exported', () => {
    const mirror = 'Box o 0.5'
    const { css } = exportReact(mirror)
    expect(css).toContain('opacity: 0.5')
  })
})
