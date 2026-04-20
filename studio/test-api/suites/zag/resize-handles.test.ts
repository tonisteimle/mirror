/**
 * Zag Component Resize Handle Tests
 *
 * Tests that resize handles are positioned correctly around the VISUAL bounds
 * of Zag components, not around their larger container elements.
 *
 * Problem: Zag components often have a root container that is larger than
 * the visible element (e.g., Select trigger vs. dropdown container).
 * Resize handles should match the visible element bounds.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

const TOLERANCE = 20 // Pixel tolerance for position comparisons (accounts for padding/border differences)

interface BoundsInfo {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/**
 * Get the visual bounds of an element (what the user sees)
 */
function getVisualBounds(element: HTMLElement): BoundsInfo {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Get the bounds defined by resize handles
 */
function getHandleBounds(
  handles: Array<{
    position: string
    rect: { left: number; top: number; width: number; height: number }
  }>
): BoundsInfo {
  // Find corner handles to determine bounds
  const nw = handles.find(h => h.position === 'nw')
  const se = handles.find(h => h.position === 'se')
  const ne = handles.find(h => h.position === 'ne')
  const sw = handles.find(h => h.position === 'sw')

  if (!nw || !se || !ne || !sw) {
    throw new Error('Missing corner handles')
  }

  // Handle centers define the element bounds
  const left = nw.rect.left + nw.rect.width / 2
  const top = nw.rect.top + nw.rect.height / 2
  const right = se.rect.left + se.rect.width / 2
  const bottom = se.rect.top + se.rect.height / 2

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

/**
 * Compare visual bounds with handle bounds
 */
function compareBounds(
  visual: BoundsInfo,
  handles: BoundsInfo,
  tolerance: number = TOLERANCE
): { matches: boolean; errors: string[] } {
  const errors: string[] = []

  // Check each edge
  if (Math.abs(visual.left - handles.left) > tolerance) {
    errors.push(
      `Left edge mismatch: visual=${visual.left.toFixed(1)}, handles=${handles.left.toFixed(1)}`
    )
  }
  if (Math.abs(visual.top - handles.top) > tolerance) {
    errors.push(
      `Top edge mismatch: visual=${visual.top.toFixed(1)}, handles=${handles.top.toFixed(1)}`
    )
  }
  if (Math.abs(visual.right - handles.right) > tolerance) {
    errors.push(
      `Right edge mismatch: visual=${visual.right.toFixed(1)}, handles=${handles.right.toFixed(1)}`
    )
  }
  if (Math.abs(visual.bottom - handles.bottom) > tolerance) {
    errors.push(
      `Bottom edge mismatch: visual=${visual.bottom.toFixed(1)}, handles=${handles.bottom.toFixed(1)}`
    )
  }

  // Check dimensions
  if (Math.abs(visual.width - handles.width) > tolerance) {
    errors.push(
      `Width mismatch: visual=${visual.width.toFixed(1)}, handles=${handles.width.toFixed(1)}`
    )
  }
  if (Math.abs(visual.height - handles.height) > tolerance) {
    errors.push(
      `Height mismatch: visual=${visual.height.toFixed(1)}, handles=${handles.height.toFixed(1)}`
    )
  }

  return { matches: errors.length === 0, errors }
}

// =============================================================================
// Select Component Tests
// =============================================================================

export const zagSelectResizeTests: TestCase[] = describe('Zag Select: Resize Handles', [
  testWithSetup(
    'Select handles match trigger visual bounds',
    'Select placeholder "Choose an option..."',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Click to select the component
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Get the component element (handles are around the whole component)
      const selectElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!selectElement) throw new Error('Select element not found')

      // Use the component bounds (not internal trigger) since handles wrap the entire component
      const visualBounds = getVisualBounds(selectElement)

      // Get resize handles
      const handles = api.interact.getResizeHandles()
      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, found ${handles.length}`)
      }

      const handleBounds = getHandleBounds(handles)

      // Compare bounds
      const result = compareBounds(visualBounds, handleBounds)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),

  testWithSetup(
    'Select handles match container bounds (not internal trigger)',
    'Select placeholder "City", w 200',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Get the container element (this is what handles should match)
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!container) throw new Error('Container element not found')

      const containerBounds = getVisualBounds(container)
      const handles = api.interact.getResizeHandles()
      const handleBounds = getHandleBounds(handles)

      // Handles should match container bounds (with tolerance for full-width clamping)
      const FULL_WIDTH_TOLERANCE = 20 // Allow for minInset clamping if element fills container
      const result = compareBounds(containerBounds, handleBounds, FULL_WIDTH_TOLERANCE)
      if (!result.matches) {
        throw new Error(`Resize handles don't match container bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),
])

// =============================================================================
// Checkbox Component Tests
// =============================================================================

export const zagCheckboxResizeTests: TestCase[] = describe('Zag Checkbox: Resize Handles', [
  testWithSetup(
    'Checkbox handles match visual bounds',
    'Checkbox "Accept terms"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const checkboxElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!checkboxElement) throw new Error('Checkbox element not found')

      // For Checkbox, we want the full visible component (checkbox + label)
      const visualBounds = getVisualBounds(checkboxElement)
      const handles = api.interact.getResizeHandles()

      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, found ${handles.length}`)
      }

      const handleBounds = getHandleBounds(handles)

      const result = compareBounds(visualBounds, handleBounds)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),
])

// =============================================================================
// Switch Component Tests
// =============================================================================

export const zagSwitchResizeTests: TestCase[] = describe('Zag Switch: Resize Handles', [
  testWithSetup(
    'Switch handles match visual bounds',
    'Switch "Dark mode"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const switchElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!switchElement) throw new Error('Switch element not found')

      const visualBounds = getVisualBounds(switchElement)
      const handles = api.interact.getResizeHandles()

      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, found ${handles.length}`)
      }

      const handleBounds = getHandleBounds(handles)

      const result = compareBounds(visualBounds, handleBounds)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),
])

// =============================================================================
// Slider Component Tests
// =============================================================================

export const zagSliderResizeTests: TestCase[] = describe('Zag Slider: Resize Handles', [
  testWithSetup(
    'Slider handles match visual bounds',
    'Frame w 300, pad 16\n  Slider value 50, min 0, max 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Click on Slider (node-2, inside Frame node-1)
      await api.interact.click('node-2')
      await api.utils.delay(200)

      const sliderElement = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      if (!sliderElement) throw new Error('Slider element not found')

      const visualBounds = getVisualBounds(sliderElement)
      const handles = api.interact.getResizeHandles()

      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, found ${handles.length}`)
      }

      const handleBounds = getHandleBounds(handles)

      // Slider typically fills its parent width, so allow tolerance for full-width clamping
      const FULL_WIDTH_TOLERANCE = 20
      const result = compareBounds(visualBounds, handleBounds, FULL_WIDTH_TOLERANCE)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),
])

// =============================================================================
// Tabs Component Tests
// =============================================================================

export const zagTabsResizeTests: TestCase[] = describe('Zag Tabs: Resize Handles', [
  testWithSetup(
    'Tabs handles match visual bounds',
    `Tabs defaultValue "home"
  Tab "Home"
    Text "Home content"
  Tab "Profile"
    Text "Profile content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const tabsElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!tabsElement) throw new Error('Tabs element not found')

      const visualBounds = getVisualBounds(tabsElement)
      const handles = api.interact.getResizeHandles()

      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, found ${handles.length}`)
      }

      const handleBounds = getHandleBounds(handles)

      const result = compareBounds(visualBounds, handleBounds)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
      }
    }
  ),
])

// =============================================================================
// Full Width/Height Element Tests (w full / h full with parent padding)
// =============================================================================

export const fullSizeElementResizeTests: TestCase[] = describe(
  'Full Size Elements: Resize Handles',
  [
    testWithSetup(
      'w full element inside parent with padding has handles at element bounds',
      `Frame w 400, h 200, pad 24, bg #1a1a1a
  Frame w full, h 60, bg #2271C1`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Select the inner Frame with w full (node-2)
        await api.interact.click('node-2')
        await api.utils.delay(200)

        const innerElement = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
        if (!innerElement) throw new Error('Inner element not found')

        const visualBounds = getVisualBounds(innerElement)
        const handles = api.interact.getResizeHandles()

        if (handles.length !== 8) {
          throw new Error(`Expected 8 handles, found ${handles.length}`)
        }

        const handleBounds = getHandleBounds(handles)

        // The handles must be positioned at the element's visual bounds
        // NOT at container edge (0) or some other wrong position
        // The element is at x=24 (parent padding) so handles should be there too
        const result = compareBounds(visualBounds, handleBounds, TOLERANCE)
        if (!result.matches) {
          // Add detailed debug info
          const parent = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
          const parentBounds = parent ? getVisualBounds(parent) : null
          throw new Error(
            `Resize handles don't match visual bounds of w full element:\n` +
              `${result.errors.join('\n')}\n\n` +
              `Element bounds: left=${visualBounds.left.toFixed(1)}, top=${visualBounds.top.toFixed(1)}, ` +
              `width=${visualBounds.width.toFixed(1)}, height=${visualBounds.height.toFixed(1)}\n` +
              `Handle bounds: left=${handleBounds.left.toFixed(1)}, top=${handleBounds.top.toFixed(1)}, ` +
              `width=${handleBounds.width.toFixed(1)}, height=${handleBounds.height.toFixed(1)}\n` +
              (parentBounds
                ? `Parent bounds: left=${parentBounds.left.toFixed(1)}, width=${parentBounds.width.toFixed(1)}`
                : '')
          )
        }
      }
    ),

    testWithSetup(
      'h full element inside parent with padding has handles at element bounds',
      `Frame w 300, h 400, pad 32, bg #1a1a1a, hor
  Frame w 80, h full, bg #10b981`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Select the inner Frame with h full (node-2)
        await api.interact.click('node-2')
        await api.utils.delay(200)

        const innerElement = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
        if (!innerElement) throw new Error('Inner element not found')

        const visualBounds = getVisualBounds(innerElement)
        const handles = api.interact.getResizeHandles()

        if (handles.length !== 8) {
          throw new Error(`Expected 8 handles, found ${handles.length}`)
        }

        const handleBounds = getHandleBounds(handles)

        const result = compareBounds(visualBounds, handleBounds, TOLERANCE)
        if (!result.matches) {
          throw new Error(
            `Resize handles don't match visual bounds of h full element:\n` +
              `${result.errors.join('\n')}\n\n` +
              `Element bounds: top=${visualBounds.top.toFixed(1)}, height=${visualBounds.height.toFixed(1)}\n` +
              `Handle bounds: top=${handleBounds.top.toFixed(1)}, height=${handleBounds.height.toFixed(1)}`
          )
        }
      }
    ),

    testWithSetup(
      'w full h full element inside parent with padding has handles at element bounds',
      `Frame w 400, h 300, pad 40, bg #333
  Frame w full, h full, bg #ef4444`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Select the inner Frame with w full h full (node-2)
        await api.interact.click('node-2')
        await api.utils.delay(200)

        const innerElement = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
        if (!innerElement) throw new Error('Inner element not found')

        const visualBounds = getVisualBounds(innerElement)
        const handles = api.interact.getResizeHandles()

        if (handles.length !== 8) {
          throw new Error(`Expected 8 handles, found ${handles.length}`)
        }

        const handleBounds = getHandleBounds(handles)

        const result = compareBounds(visualBounds, handleBounds, TOLERANCE)
        if (!result.matches) {
          throw new Error(
            `Resize handles don't match visual bounds of w full h full element:\n` +
              `${result.errors.join('\n')}`
          )
        }
      }
    ),
  ]
)

// =============================================================================
// Combined Export
// =============================================================================

export const allZagResizeHandleTests: TestCase[] = [
  ...zagSelectResizeTests,
  ...zagCheckboxResizeTests,
  ...zagSwitchResizeTests,
  ...zagSliderResizeTests,
  ...zagTabsResizeTests,
  ...fullSizeElementResizeTests,
]
