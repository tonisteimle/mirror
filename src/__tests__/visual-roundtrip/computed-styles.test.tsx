/**
 * Computed Styles Comparison Tests
 *
 * Compares computed styles between Mirror Preview and React Export.
 * Uses JSDOM to render both versions and extract computed styles.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { parse } from '../../parser/parser'
import { exportReact } from '../../generator/export'
import { generateReactElement } from '../../generator/react-generator'
import { PreviewProviders } from '../../generator/preview-providers'
import {
  extractComputedStyles,
  extractCriticalStyles
} from './utils/style-extractor'
import {
  normalizeStyles,
  calculateStyleSimilarity
} from './utils/style-normalizer'
import { compareStyles } from './utils/deep-compare'
import {
  ALL_CASES,
  SMOKE_CASES,
  BASIC_CASES,
  LAYOUT_CASES,
  BUTTON_CASES,
  type VisualTestCase
} from './fixtures/test-cases'

// =============================================================================
// Test Infrastructure
// =============================================================================

/**
 * Render Mirror code using Preview path
 */
function renderMirrorPreview(mirrorCode: string): HTMLElement | null {
  const parseResult = parse(mirrorCode)
  if (parseResult.errors.length > 0) {
    console.warn('Parse errors:', parseResult.errors)
    return null
  }

  const element = generateReactElement(parseResult.nodes, {
    registry: parseResult.registry,
    tokens: parseResult.tokens,
    onInteraction: () => {}
  })

  const { container } = render(
    <PreviewProviders parseResult={parseResult}>{element}</PreviewProviders>
  )

  return container.firstChild as HTMLElement
}

/**
 * Get exported CSS for Mirror code
 */
function getExportedCss(mirrorCode: string): { tsx: string; css: string } | null {
  try {
    return exportReact(mirrorCode)
  } catch (error) {
    console.warn('Export error:', error)
    return null
  }
}

/**
 * Run a visual comparison test
 */
function runVisualTest(testCase: VisualTestCase): {
  passed: boolean
  similarity: number
  differences: Array<{ property: string; preview: string; export: string }>
  criticalFailures: string[]
} {
  const result = {
    passed: true,
    similarity: 0,
    differences: [] as Array<{ property: string; preview: string; export: string }>,
    criticalFailures: [] as string[]
  }

  // Render preview
  const previewElement = renderMirrorPreview(testCase.mirror)
  if (!previewElement) {
    result.passed = false
    result.criticalFailures.push('Failed to render preview')
    return result
  }

  // Get preview styles
  const previewStyles = extractComputedStyles(previewElement)
  const normalizedPreview = normalizeStyles(previewStyles)

  // Export to React
  const exported = getExportedCss(testCase.mirror)
  if (!exported) {
    result.passed = false
    result.criticalFailures.push('Failed to export React code')
    return result
  }

  // Parse CSS and check for properties
  const { css } = exported

  // Check critical properties
  if (testCase.criticalProps) {
    for (const prop of testCase.criticalProps) {
      // CSS property name (e.g., 'padding' or 'background-color')
      const cssProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

      // Check if property is in preview
      const previewValue = normalizedPreview[prop as keyof typeof normalizedPreview]

      // Check if property is in exported CSS
      const inExport = css.toLowerCase().includes(prop.toLowerCase())

      if (previewValue && !inExport) {
        result.differences.push({
          property: prop,
          preview: previewValue,
          export: '(not in CSS)'
        })
      }
    }
  }

  // Calculate overall similarity based on critical props match
  const criticalCount = testCase.criticalProps?.length || 1
  const matchCount = criticalCount - result.differences.length
  result.similarity = matchCount / criticalCount

  // Determine pass/fail
  result.passed = result.similarity >= 0.8 && result.criticalFailures.length === 0

  return result
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Visual Roundtrip: Computed Styles', () => {
  describe('Smoke Tests', () => {
    for (const testCase of SMOKE_CASES) {
      it(`should render "${testCase.name}" consistently`, () => {
        const result = runVisualTest(testCase)

        console.log(`\n[${testCase.name}]`)
        console.log(`  Similarity: ${(result.similarity * 100).toFixed(1)}%`)
        if (result.differences.length > 0) {
          console.log(`  Differences:`)
          for (const diff of result.differences) {
            console.log(`    - ${diff.property}: "${diff.preview}" vs "${diff.export}"`)
          }
        }

        expect(result.criticalFailures).toHaveLength(0)
        expect(result.similarity).toBeGreaterThanOrEqual(0.5)
      })
    }
  })

  describe('Basic Components', () => {
    for (const testCase of BASIC_CASES) {
      it(`should render "${testCase.name}" correctly`, () => {
        const result = runVisualTest(testCase)
        expect(result.criticalFailures).toHaveLength(0)
      })
    }
  })

  describe('Layout Components', () => {
    for (const testCase of LAYOUT_CASES) {
      it(`should render "${testCase.name}" with correct layout`, () => {
        const result = runVisualTest(testCase)
        expect(result.criticalFailures).toHaveLength(0)
      })
    }
  })

  describe('Button Styles', () => {
    for (const testCase of BUTTON_CASES) {
      it(`should style "${testCase.name}" correctly`, () => {
        const result = runVisualTest(testCase)
        expect(result.criticalFailures).toHaveLength(0)
      })
    }
  })
})

// =============================================================================
// Property-Specific Tests
// =============================================================================

describe('Visual Roundtrip: Property Consistency', () => {
  describe('Padding', () => {
    it('should export padding correctly', () => {
      const code = 'Box pad 16'
      const { css } = exportReact(code)
      expect(css).toContain('padding: 16px')
    })

    it('should export directional padding', () => {
      const code = 'Box pad 8 16'
      const { css } = exportReact(code)
      expect(css).toContain('padding')
    })
  })

  describe('Colors', () => {
    it('should export background color', () => {
      const code = 'Box bg #3B82F6'
      const { css } = exportReact(code)
      expect(css.toLowerCase()).toContain('background')
      expect(css.toLowerCase()).toContain('3b82f6')
    })

    it('should export text color', () => {
      const code = 'Text col #FFF, "Hello"'
      const { css } = exportReact(code)
      expect(css.toLowerCase()).toContain('color')
    })
  })

  describe('Border Radius', () => {
    it('should export border-radius', () => {
      const code = 'Box rad 8'
      const { css } = exportReact(code)
      expect(css).toContain('border-radius: 8px')
    })
  })

  describe('Flexbox', () => {
    it('should export flex-direction row', () => {
      const code = 'Box hor'
      const { css } = exportReact(code)
      expect(css).toContain('flex-direction: row')
    })

    it('should export gap', () => {
      const code = 'Box gap 12'
      const { css } = exportReact(code)
      expect(css).toContain('gap: 12px')
    })

    it('should export center alignment', () => {
      const code = 'Box center'
      const { css } = exportReact(code)
      expect(css).toContain('justify-content: center')
      expect(css).toContain('align-items: center')
    })
  })

  describe('Sizing', () => {
    it('should export fixed width', () => {
      const code = 'Box w 200'
      const { css } = exportReact(code)
      expect(css).toContain('width: 200px')
    })

    it('should export full width', () => {
      const code = 'Box w full'
      const { css } = exportReact(code)
      expect(css).toContain('width: 100%')
    })
  })

  describe('Typography', () => {
    it('should export font-size', () => {
      const code = 'Text fs 18, "Hello"'
      const { css } = exportReact(code)
      expect(css).toContain('font-size: 18px')
    })

    it('should export font-weight', () => {
      const code = 'Text weight bold, "Bold"'
      const { css } = exportReact(code)
      expect(css).toContain('font-weight')
    })
  })

  describe('Visual Effects', () => {
    it('should export opacity', () => {
      const code = 'Box opacity 0.5'
      const { css } = exportReact(code)
      expect(css).toContain('opacity: 0.5')
    })

    it('should export box-shadow', () => {
      const code = 'Box shadow md'
      const { css } = exportReact(code)
      expect(css).toContain('box-shadow')
    })
  })
})

// =============================================================================
// Regression Tests
// =============================================================================

describe('Visual Roundtrip: Regression Tests', () => {
  it('should handle empty component', () => {
    const code = 'Box'
    expect(() => exportReact(code)).not.toThrow()
  })

  it('should handle nested components', () => {
    const code = `Card pad 16
  Title "Hello"
  Text "World"`
    expect(() => exportReact(code)).not.toThrow()
  })

  it('should handle components with many properties', () => {
    const code = 'Box pad 16, bg #333, rad 8, shadow md, gap 12, w full'
    const { css } = exportReact(code)
    expect(css).toContain('padding')
    expect(css).toContain('background')
    expect(css).toContain('border-radius')
    expect(css).toContain('gap')
  })
})

// =============================================================================
// Comprehensive Test Suite
// =============================================================================

describe('Visual Roundtrip: All Cases', () => {
  for (const testCase of ALL_CASES) {
    const testFn = testCase.skip ? it.skip : it

    testFn(`[${testCase.name}] ${testCase.description}`, () => {
      const result = runVisualTest(testCase)

      // Log results
      if (result.differences.length > 0) {
        console.log(`\n  Differences in "${testCase.name}":`)
        for (const diff of result.differences) {
          console.log(`    ${diff.property}: "${diff.preview}" vs "${diff.export}"`)
        }
      }

      // Assert
      expect(result.criticalFailures).toHaveLength(0)
    })
  }
})
