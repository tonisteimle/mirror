/**
 * Primitive Defaults Tests
 *
 * Tests that primitives have correct default styling applied,
 * including min-width to prevent elements from shrinking too small.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get computed min-width of an element in pixels
 */
function getMinWidth(element: HTMLElement): number {
  const style = window.getComputedStyle(element)
  const minWidth = style.minWidth
  if (minWidth === 'auto' || minWidth === 'none' || minWidth === '') {
    return 0
  }
  return parseFloat(minWidth) || 0
}

/**
 * Get computed width of an element
 */
function getWidth(element: HTMLElement): number {
  return element.getBoundingClientRect().width
}

/**
 * Get computed height of an element
 */
function getHeight(element: HTMLElement): number {
  return element.getBoundingClientRect().height
}

// =============================================================================
// Button minw Tests - Comprehensive
// =============================================================================

export const buttonMinWidthTests: TestCase[] = describe('Button Min-Width Defaults', [
  // Core minw property test
  testWithSetup(
    'Button has explicit minw CSS property (36px)',
    'Button "OK"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const minWidth = getMinWidth(element)

      // Button should have min-width of 36px (control height)
      if (Math.abs(minWidth - 36) > 2) {
        throw new Error(`Button should have min-width of 36px. Got minWidth=${minWidth}px`)
      }
    }
  ),

  // Single character buttons
  testWithSetup(
    'Button with single character "X" is at least 36px wide',
    'Button "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const width = getWidth(element)
      if (width < 36) {
        throw new Error(`Button "X" should be at least 36px wide. Got width=${width}px`)
      }
    }
  ),

  testWithSetup(
    'Button with emoji "✓" is at least 36px wide',
    'Button "✓"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const width = getWidth(element)
      if (width < 36) {
        throw new Error(`Button "✓" should be at least 36px wide. Got width=${width}px`)
      }
    }
  ),

  // Two character buttons
  testWithSetup('Button with "OK" is at least 36px wide', 'Button "OK"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Button element not found')

    const width = getWidth(element)
    if (width < 36) {
      throw new Error(`Button "OK" should be at least 36px wide. Got width=${width}px`)
    }
  }),

  testWithSetup('Button with "No" is at least 36px wide', 'Button "No"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Button element not found')

    const width = getWidth(element)
    if (width < 36) {
      throw new Error(`Button "No" should be at least 36px wide. Got width=${width}px`)
    }
  }),

  // Long text should grow beyond minw
  testWithSetup(
    'Button with long text grows beyond 36px',
    'Button "This is a very long button text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const width = getWidth(element)
      // Long text should make button much wider than 36px
      if (width <= 100) {
        throw new Error(`Button with long text should be > 100px. Got width=${width}px`)
      }
    }
  ),

  // Button maintains square-ish proportions
  testWithSetup(
    'Button with short text maintains aspect ratio close to square',
    'Button "+"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const width = getWidth(element)
      const height = getHeight(element)

      // With single char, width should be close to height (square-ish)
      // Allow padding to make it slightly wider
      const aspectRatio = width / height
      if (aspectRatio < 0.8 || aspectRatio > 2) {
        throw new Error(
          `Button with "+" should be roughly square. ` +
            `Got width=${width}px, height=${height}px, ratio=${aspectRatio.toFixed(2)}`
        )
      }
    }
  ),

  // minw works with zero padding
  testWithSetup('Button with pad 0 still has minw', 'Button "X", pad 0', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Button element not found')

    const minWidth = getMinWidth(element)
    const width = getWidth(element)

    // Even with no padding, minw should keep button at 36px
    if (minWidth < 36 || width < 36) {
      throw new Error(
        `Button with pad 0 should still have minw 36px. ` +
          `Got minWidth=${minWidth}px, width=${width}px`
      )
    }
  }),

  // Explicit minw override works
  testWithSetup(
    'Button explicit minw 50 overrides default',
    'Button "X", minw 50',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const minWidth = getMinWidth(element)

      if (Math.abs(minWidth - 50) > 2) {
        throw new Error(
          `Button with minw 50 should have min-width of 50px. Got minWidth=${minWidth}px`
        )
      }
    }
  ),

  // Multiple buttons in a row
  testWithSetup(
    'Multiple short buttons all have minw',
    'Frame hor, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      for (let i = 2; i <= 4; i++) {
        const element = document.querySelector(`[data-mirror-id="node-${i}"]`) as HTMLElement
        if (!element) throw new Error(`Button node-${i} not found`)

        const width = getWidth(element)
        if (width < 36) {
          throw new Error(`Button node-${i} should be at least 36px. Got width=${width}px`)
        }
      }
    }
  ),

  // Button in flex container doesn't shrink below minw
  testWithSetup(
    'Button in flex container respects minw',
    'Frame hor, w 100\n  Button "X"\n  Frame grow',
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      const element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      if (!element) throw new Error('Button element not found')

      const width = getWidth(element)
      const minWidth = getMinWidth(element)

      // Even in a constrained flex container, button should maintain minw
      if (width < 36 || minWidth < 36) {
        throw new Error(
          `Button in flex should respect minw. Got width=${width}px, minWidth=${minWidth}px`
        )
      }
    }
  ),
])

// =============================================================================
// Other Primitive Default Tests
// =============================================================================

export const primitiveDefaultsTests: TestCase[] = describe('Primitive Defaults', [
  // Include all button minw tests
  ...buttonMinWidthTests,

  // Button height consistency
  testWithSetup('Button height is 36px (control height)', 'Button "Test"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Button element not found')

    const height = element.getBoundingClientRect().height

    if (Math.abs(height - 36) > 2) {
      throw new Error(`Button should have height ~36px. Got height=${height}px`)
    }
  }),

  testWithSetup('Button has w hug by default', 'Button "Click Me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Button element not found')

    const style = window.getComputedStyle(element)

    // w: hug means width should be fit-content or auto (not 100%)
    const hasHugWidth =
      style.width === 'fit-content' || style.width === 'auto' || !style.width.includes('100%')

    if (!hasHugWidth) {
      throw new Error(`Button should have w: hug (fit-content). Got width=${style.width}`)
    }
  }),

  // Input defaults
  testWithSetup('Input has default width', 'Input', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Input element not found')

    const width = getWidth(element)

    // Input should have default width of 200px
    if (Math.abs(width - 200) > 5) {
      throw new Error(`Input should have default width ~200px. Got width=${width}px`)
    }
  }),

  testWithSetup('Input has default height', 'Input', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Input element not found')

    const height = element.getBoundingClientRect().height

    // Input should have default height of 36px (control height)
    if (Math.abs(height - 36) > 2) {
      throw new Error(`Input should have height ~36px. Got height=${height}px`)
    }
  }),

  // Textarea defaults
  testWithSetup('Textarea has default dimensions', 'Textarea', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Textarea element not found')

    const rect = element.getBoundingClientRect()

    // Textarea should have default width of 200px and height of 100px
    if (Math.abs(rect.width - 200) > 5) {
      throw new Error(`Textarea should have default width ~200px. Got width=${rect.width}px`)
    }
    if (Math.abs(rect.height - 100) > 5) {
      throw new Error(`Textarea should have default height ~100px. Got height=${rect.height}px`)
    }
  }),

  // Icon defaults
  testWithSetup('Icon has default size', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Icon element not found')

    const rect = element.getBoundingClientRect()

    // Icon should have default size of 20x20
    if (Math.abs(rect.width - 20) > 2) {
      throw new Error(`Icon should have default width ~20px. Got width=${rect.width}px`)
    }
    if (Math.abs(rect.height - 20) > 2) {
      throw new Error(`Icon should have default height ~20px. Got height=${rect.height}px`)
    }
  }),

  // Image defaults
  testWithSetup('Image has default dimensions', 'Image', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Image element not found')

    const rect = element.getBoundingClientRect()

    // Image should have default size of 100x100
    if (Math.abs(rect.width - 100) > 5) {
      throw new Error(`Image should have default width ~100px. Got width=${rect.width}px`)
    }
    if (Math.abs(rect.height - 100) > 5) {
      throw new Error(`Image should have default height ~100px. Got height=${rect.height}px`)
    }
  }),

  // Label defaults - should hug content
  testWithSetup('Label has w hug by default', 'Label "Name:"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    if (!element) throw new Error('Label element not found')

    const style = window.getComputedStyle(element)

    // w: hug means width should be fit-content or auto
    const hasHugWidth =
      style.width === 'fit-content' || style.width === 'auto' || !style.width.includes('100%')

    if (!hasHugWidth) {
      throw new Error(`Label should have w: hug. Got width=${style.width}`)
    }
  }),
])
