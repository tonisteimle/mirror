/**
 * Property Matrix Tests
 *
 * Automatically validates all Mirror DSL properties against expected CSS output.
 * Uses the property matrix definition as the source of truth.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  renderMirror,
  getElementBaseStyles,
} from '../../../compiler/testing'
import type { RenderContext } from '../../../compiler/testing'
import {
  ALL_CATEGORIES,
  getTotalTestCount,
  type PropertyTest,
  type PropertyCategory,
} from './property-matrix-definition'

// =============================================================================
// JSDOM SETUP
// =============================================================================

let dom: JSDOM
let cleanup: (() => void)[] = []

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
  })

  global.document = dom.window.document
  global.window = dom.window as unknown as Window & typeof globalThis
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
  global.Node = dom.window.Node
  global.getComputedStyle = dom.window.getComputedStyle

  cleanup = []
})

afterEach(() => {
  for (const fn of cleanup) {
    fn()
  }
  cleanup = []
})

function render(code: string): RenderContext {
  const ctx = renderMirror(code, dom.window.document.body)
  cleanup.push(ctx.cleanup)
  return ctx
}

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Find element in render context by selector or default to first element
 */
function findElement(ctx: RenderContext, selector?: string): HTMLElement {
  if (selector) {
    const el = ctx.root.querySelector(selector) as HTMLElement
    if (!el) {
      throw new Error(`Element not found: ${selector}`)
    }
    return el
  }
  // Default: first element with data-mirror-id
  const firstId = ctx.ir.nodes[0]?.id
  if (!firstId) {
    throw new Error('No IR nodes found')
  }
  const el = ctx.elements.get(firstId)
  if (!el) {
    throw new Error(`Element not found for IR node: ${firstId}`)
  }
  return el
}

/**
 * Assert that a style matches expected value (string or RegExp)
 */
function assertStyleMatch(
  actual: string | undefined,
  expected: string | RegExp,
  property: string
): void {
  if (actual === undefined) {
    throw new Error(`Property "${property}" not set (expected: ${expected})`)
  }

  if (typeof expected === 'string') {
    expect(actual).toBe(expected)
  } else {
    expect(actual).toMatch(expected)
  }
}

/**
 * Run a single property test
 */
function runPropertyTest(test: PropertyTest): void {
  const ctx = render(test.code)
  const element = findElement(ctx, test.selector)
  const styles = getElementBaseStyles(element)

  for (const [property, expected] of Object.entries(test.expected)) {
    assertStyleMatch(styles[property], expected, property)
  }
}

// =============================================================================
// GENERATE TESTS FOR EACH CATEGORY
// =============================================================================

describe('Property Matrix Validation', () => {
  // Print summary at start
  it(`should have ${getTotalTestCount()} total property tests defined`, () => {
    const count = getTotalTestCount()
    expect(count).toBeGreaterThan(50) // Sanity check
    console.log(`Property Matrix: ${count} tests across ${ALL_CATEGORIES.length} categories`)
  })

  // Generate tests for each category
  for (const category of ALL_CATEGORIES) {
    describe(category.name, () => {
      for (const test of category.tests) {
        // Create descriptive test name from code
        const testName = test.code.replace(/\n/g, ' → ').trim()

        it(testName, () => {
          runPropertyTest(test)
        })
      }
    })
  }
})

// =============================================================================
// QUICK VALIDATION HELPERS (exported for other tests)
// =============================================================================

/**
 * Quick helper to validate a single Mirror code snippet
 */
export function quickExpectStyles(
  code: string,
  expected: Record<string, string | RegExp>
): void {
  let ctx: RenderContext | null = null
  try {
    // Need to set up JSDOM if not already done
    const tempDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
    })
    const origDocument = global.document
    const origWindow = global.window
    const origHTMLElement = global.HTMLElement
    const origElement = global.Element
    const origNode = global.Node
    const origGetComputedStyle = global.getComputedStyle

    try {
      global.document = tempDom.window.document
      global.window = tempDom.window as unknown as Window & typeof globalThis
      global.HTMLElement = tempDom.window.HTMLElement
      global.Element = tempDom.window.Element
      global.Node = tempDom.window.Node
      global.getComputedStyle = tempDom.window.getComputedStyle

      ctx = renderMirror(code, tempDom.window.document.body)
      const element = findElement(ctx)
      const styles = getElementBaseStyles(element)

      for (const [property, expectedValue] of Object.entries(expected)) {
        assertStyleMatch(styles[property], expectedValue, property)
      }
    } finally {
      global.document = origDocument
      global.window = origWindow
      global.HTMLElement = origHTMLElement
      global.Element = origElement
      global.Node = origNode
      global.getComputedStyle = origGetComputedStyle
    }
  } finally {
    ctx?.cleanup()
  }
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Property Edge Cases', () => {
  describe('Multi-value properties', () => {
    it('pad with 2 values creates asymmetric padding', () => {
      const ctx = render('Frame pad 8 16')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      // Verify all 4 padding values
      expect(styles['padding-top']).toBe('8px')
      expect(styles['padding-right']).toBe('16px')
      expect(styles['padding-bottom']).toBe('8px')
      expect(styles['padding-left']).toBe('16px')
    })

    it('pad with 4 values creates all different padding', () => {
      const ctx = render('Frame pad 1 2 3 4')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['padding-top']).toBe('1px')
      expect(styles['padding-right']).toBe('2px')
      expect(styles['padding-bottom']).toBe('3px')
      expect(styles['padding-left']).toBe('4px')
    })
  })

  describe('Zero values', () => {
    it('pad 0 should set padding to 0', () => {
      const ctx = render('Frame pad 0')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['padding']).toBe('0px')
    })

    it('rad 0 should set border-radius to 0', () => {
      const ctx = render('Frame rad 0')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['border-radius']).toBe('0px')
    })
  })

  describe('Combining properties', () => {
    it('should apply multiple layout properties', () => {
      const ctx = render('Frame hor, gap 12, center')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['display']).toBe('flex')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['gap']).toBe('12px')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('center')
    })

    it('should apply multiple visual properties', () => {
      const ctx = render('Frame bg #111, bor 1, boc #333, rad 8')
      const el = findElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/(#111|rgb\(17,\s*17,\s*17\))/)
      expect(styles['border-width']).toBe('1px')
      expect(styles['border-radius']).toBe('8px')
    })
  })
})
