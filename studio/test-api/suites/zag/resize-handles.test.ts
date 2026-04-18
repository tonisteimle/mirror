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

const TOLERANCE = 10 // Pixel tolerance for position comparisons

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

      // Get the visual trigger element (what user sees)
      const selectElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!selectElement) throw new Error('Select element not found')

      // Find the actual trigger button within the Zag Select
      // The trigger is usually a button with role="combobox" or the first interactive element
      const trigger =
        selectElement.querySelector('[data-part="trigger"]') ||
        selectElement.querySelector('button') ||
        selectElement.querySelector('[role="combobox"]') ||
        selectElement

      const visualBounds = getVisualBounds(trigger as HTMLElement)

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
    'Select handles match element with explicit size',
    'Select placeholder "City", w 200',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const selectElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!selectElement) throw new Error('Select element not found')

      const trigger =
        selectElement.querySelector('[data-part="trigger"]') ||
        selectElement.querySelector('button') ||
        selectElement

      const visualBounds = getVisualBounds(trigger as HTMLElement)
      const handles = api.interact.getResizeHandles()
      const handleBounds = getHandleBounds(handles)

      // Width should be approximately 200px
      if (Math.abs(handleBounds.width - 200) > TOLERANCE) {
        throw new Error(`Handle width should be ~200px, got ${handleBounds.width.toFixed(1)}px`)
      }

      const result = compareBounds(visualBounds, handleBounds)
      if (!result.matches) {
        throw new Error(`Resize handles don't match visual bounds:\n${result.errors.join('\n')}`)
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
    'Slider value 50, min 0, max 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const sliderElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (!sliderElement) throw new Error('Slider element not found')

      const visualBounds = getVisualBounds(sliderElement)
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
// Combined Export
// =============================================================================

export const allZagResizeHandleTests: TestCase[] = [
  ...zagSelectResizeTests,
  ...zagCheckboxResizeTests,
  ...zagSwitchResizeTests,
  ...zagSliderResizeTests,
  ...zagTabsResizeTests,
]
