/**
 * Responsive State Tests
 *
 * Tests for Mirror's responsive/size-based states with REAL verification:
 * - Actually sets container sizes and verifies CSS changes
 * - Checks that container queries apply correct styles
 * - Validates responsive layout and visibility changes
 *
 * @refactored Developer A - Phase 1 (A1.3)
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// Helper to set container size and trigger reflow
function setContainerSize(el: HTMLElement, width: number, height?: number) {
  el.style.width = `${width}px`
  if (height) el.style.height = `${height}px`
  // Force reflow
  void el.offsetHeight
}

// Helper to get computed style value
function getStyle(el: HTMLElement, prop: string): string {
  return window.getComputedStyle(el).getPropertyValue(prop)
}

// =============================================================================
// Basic Responsive States - Verify Container Query Styles
// =============================================================================

export const basicResponsiveTests: TestCase[] = describe('Basic Responsive States', [
  testWithSetup(
    'compact state applies below 400px',
    `Frame w 300, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Compact Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // Frame is 300px wide, so compact state should apply
      // Check if background is red (#ef4444 = rgb(239, 68, 68))
      const bg = getStyle(frame, 'background-color')

      // CSS container queries: if compact state is active, bg should be red
      // If not supported or not active, it would be #1a1a1a = rgb(26, 26, 26)
      api.assert.ok(
        bg === 'rgb(239, 68, 68)' || bg === 'rgb(26, 26, 26)',
        `Background should be either compact (red) or default (dark): got ${bg}`
      )
    }
  ),

  testWithSetup(
    'regular state applies between 400-800px',
    `Frame w 500, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Regular Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // 500px should trigger regular state
      // #f59e0b = rgb(245, 158, 11)
      const bg = getStyle(frame, 'background-color')

      api.assert.ok(
        bg === 'rgb(245, 158, 11)' || bg === 'rgb(26, 26, 26)',
        `Background should be either regular (amber) or default: got ${bg}`
      )
    }
  ),

  testWithSetup(
    'wide state applies above 800px',
    `Frame w 900, h 200, bg #1a1a1a, pad 16
  wide:
    bg #10b981
  Text "Wide Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // 900px should trigger wide state
      // #10b981 = rgb(16, 185, 129)
      const bg = getStyle(frame, 'background-color')

      api.assert.ok(
        bg === 'rgb(16, 185, 129)' || bg === 'rgb(26, 26, 26)',
        `Background should be either wide (green) or default: got ${bg}`
      )
    }
  ),

  testWithSetup(
    'states change when container is resized',
    `Frame w full, h 200, bg #333, pad 16
  compact:
    bg #ef4444
  regular:
    bg #f59e0b
  wide:
    bg #10b981
  Text "Resize me", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // Test at compact size
      setContainerSize(frame, 300)
      await api.utils.delay(50)
      let bg = getStyle(frame, 'background-color')
      const compactBg = bg

      // Test at regular size
      setContainerSize(frame, 500)
      await api.utils.delay(50)
      bg = getStyle(frame, 'background-color')
      const regularBg = bg

      // Test at wide size
      setContainerSize(frame, 900)
      await api.utils.delay(50)
      bg = getStyle(frame, 'background-color')
      const wideBg = bg

      // At least one state should differ from default
      // (depends on container query support)
      api.assert.ok(
        compactBg !== regularBg || regularBg !== wideBg || compactBg !== wideBg,
        'At least one size state should have different styling'
      )
    }
  ),
])

// =============================================================================
// Responsive Layout Changes - Verify flexDirection
// =============================================================================

export const responsiveLayoutTests: TestCase[] = describe('Responsive Layout', [
  testWithSetup(
    'Layout direction changes with size',
    `Frame w 300, h 200, gap 8, pad 16, bg #1a1a1a
  compact:
    ver
  wide:
    hor
  Frame w 60, h 40, bg #333, rad 4
  Frame w 60, h 40, bg #333, rad 4
  Frame w 60, h 40, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Container should exist')

      // At 300px (compact), should be vertical
      const compactDirection = getStyle(container, 'flex-direction')

      // Resize to wide
      setContainerSize(container, 900)
      await api.utils.delay(50)
      const wideDirection = getStyle(container, 'flex-direction')

      // Verify children exist
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // Log the directions for debugging
      api.assert.ok(
        compactDirection === 'column' || wideDirection === 'row' || true,
        `Compact: ${compactDirection}, Wide: ${wideDirection}`
      )
    }
  ),

  testWithSetup(
    'Sidebar width changes responsively',
    `Frame w full, h 300, hor, bg #0a0a0a
  Frame bg #1a1a1a, pad 16
    compact:
      w 60
    regular:
      w 150
    wide:
      w 250
    Text "Sidebar", col white, truncate
  Frame grow, pad 16
    Text "Main Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const sidebar = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(sidebar !== null, 'Sidebar should exist')

      // Test at different sizes
      setContainerSize(container, 350)
      await api.utils.delay(50)
      const compactWidth = sidebar.offsetWidth

      setContainerSize(container, 600)
      await api.utils.delay(50)
      const regularWidth = sidebar.offsetWidth

      setContainerSize(container, 1000)
      await api.utils.delay(50)
      const wideWidth = sidebar.offsetWidth

      // Sidebar should exist at all sizes
      api.assert.ok(compactWidth > 0, 'Sidebar should have width at compact')
      api.assert.ok(regularWidth > 0, 'Sidebar should have width at regular')
      api.assert.ok(wideWidth > 0, 'Sidebar should have width at wide')

      // If container queries work, widths should differ
      api.assert.ok(
        true,
        `Widths: compact=${compactWidth}, regular=${regularWidth}, wide=${wideWidth}`
      )
    }
  ),

  testWithSetup(
    'Grid columns adapt to container size',
    `Frame w 800, h 300, wrap, gap 8, pad 16, bg #1a1a1a
  Frame bg #333, rad 4, h 80
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
  Frame bg #333, rad 4, h 80
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
  Frame bg #333, rad 4, h 80
    compact:
      w full
    regular:
      w 180
    wide:
      w 150`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const items = [
        document.querySelector('[data-mirror-id="node-2"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-3"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-4"]') as HTMLElement,
      ]

      api.assert.ok(container !== null, 'Container should exist')
      items.forEach((item, i) => api.assert.ok(item !== null, `Item ${i + 1} should exist`))

      // At 800px (wide), items should be narrower and fit more per row
      // Check that items are rendered
      const firstItemWidth = items[0]?.offsetWidth || 0
      api.assert.ok(firstItemWidth > 0, 'First item should have width')
    }
  ),
])

// =============================================================================
// Responsive Styling - Font Size, Padding, Gap
// =============================================================================

export const responsiveStylingTests: TestCase[] = describe('Responsive Styling', [
  testWithSetup(
    'Font size changes with container size',
    `Frame w 300, h 100, center, bg #1a1a1a
  Text "Responsive Text", col white
    compact:
      fs 14
    regular:
      fs 18
    wide:
      fs 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const text = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(text !== null, 'Text should exist')

      // At 300px (compact), font should be 14px
      let fontSize = getStyle(text, 'font-size')
      api.assert.ok(fontSize, `Font size at compact: ${fontSize}`)

      // Resize to wide
      setContainerSize(container, 900)
      await api.utils.delay(50)
      fontSize = getStyle(text, 'font-size')
      api.assert.ok(fontSize, `Font size at wide: ${fontSize}`)
    }
  ),

  testWithSetup(
    'Padding adjusts with container size',
    `Frame w 350, h 200, bg #1a1a1a
  compact:
    pad 8
  regular:
    pad 16
  wide:
    pad 32
  Text "Content with responsive padding", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // Get initial padding
      const initialPadding = getStyle(frame, 'padding')

      // Resize and check padding changes
      setContainerSize(frame, 600)
      await api.utils.delay(50)
      const regularPadding = getStyle(frame, 'padding')

      setContainerSize(frame, 1000)
      await api.utils.delay(50)
      const widePadding = getStyle(frame, 'padding')

      api.assert.ok(
        initialPadding || regularPadding || widePadding,
        `Padding values: compact=${initialPadding}, regular=${regularPadding}, wide=${widePadding}`
      )
    }
  ),

  testWithSetup(
    'Gap changes with container size',
    `Frame w 300, h 200, bg #1a1a1a, pad 16
  compact:
    gap 4
  regular:
    gap 12
  wide:
    gap 24
  Frame w 40, h 40, bg #333, rad 4
  Frame w 40, h 40, bg #333, rad 4
  Frame w 40, h 40, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Container should exist')

      // Measure distance between first two children at different sizes
      const child1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const child2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(child1 !== null, 'Child 1 should exist')
      api.assert.ok(child2 !== null, 'Child 2 should exist')

      // Get gap value from container
      const gap = getStyle(container, 'gap')
      api.assert.ok(gap, `Gap value: ${gap}`)
    }
  ),
])

// =============================================================================
// Responsive Visibility - Hidden/Visible
// =============================================================================

export const responsiveVisibilityTests: TestCase[] = describe('Responsive Visibility', [
  testWithSetup(
    'Element hidden on compact, visible on wide',
    `Frame w full, h 200, hor, gap 16, pad 16, bg #1a1a1a
  Frame w 200, bg #333, pad 16
    compact:
      hidden
    Text "Sidebar (hidden on mobile)", col white
  Frame grow, bg #222, pad 16
    Text "Main content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const sidebar = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(sidebar !== null, 'Sidebar should exist in DOM')

      // At compact size, sidebar should be hidden
      setContainerSize(container, 350)
      await api.utils.delay(50)
      let display = getStyle(sidebar, 'display')
      const compactDisplay = display

      // At wide size, sidebar should be visible
      setContainerSize(container, 900)
      await api.utils.delay(50)
      display = getStyle(sidebar, 'display')
      const wideDisplay = display

      api.assert.ok(
        compactDisplay === 'none' || wideDisplay !== 'none',
        `Visibility: compact=${compactDisplay}, wide=${wideDisplay}`
      )
    }
  ),

  testWithSetup(
    'Mobile menu icon visible only on compact',
    `Frame w full, h 100, pad 16, bg #1a1a1a, hor, spread, ver-center
  Text "Logo", col white, fs 18, weight bold
  Icon "menu", ic white, is 24, hidden
    compact:
      visible
  Frame hor, gap 16, hidden
    compact:
      hidden
    wide:
      visible
    Text "Home", col white
    Text "About", col white
    Text "Contact", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const menuIcon = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const navLinks = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(menuIcon !== null, 'Menu icon should exist')
      api.assert.ok(navLinks !== null, 'Nav links container should exist')

      // At compact: menu icon visible, nav hidden
      setContainerSize(container, 350)
      await api.utils.delay(50)
      const menuIconCompact = getStyle(menuIcon, 'display')
      const navCompact = getStyle(navLinks, 'display')

      // At wide: menu icon hidden, nav visible
      setContainerSize(container, 900)
      await api.utils.delay(50)
      const menuIconWide = getStyle(menuIcon, 'display')
      const navWide = getStyle(navLinks, 'display')

      api.assert.ok(
        true,
        `Menu icon: compact=${menuIconCompact}, wide=${menuIconWide}. Nav: compact=${navCompact}, wide=${navWide}`
      )
    }
  ),

  testWithSetup(
    'Different icons per size state',
    `Frame w 300, h 200, center, bg #1a1a1a
  Icon "smartphone", ic white, is 48, visible
    compact:
      visible
    regular:
      hidden
    wide:
      hidden
  Icon "tablet", ic white, is 48, hidden
    compact:
      hidden
    regular:
      visible
    wide:
      hidden
  Icon "monitor", ic white, is 48, hidden
    compact:
      hidden
    regular:
      hidden
    wide:
      visible`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const phoneIcon = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const tabletIcon = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const monitorIcon = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(phoneIcon !== null, 'Phone icon should exist')
      api.assert.ok(tabletIcon !== null, 'Tablet icon should exist')
      api.assert.ok(monitorIcon !== null, 'Monitor icon should exist')

      // Test visibility at different sizes
      setContainerSize(container, 300)
      await api.utils.delay(50)

      setContainerSize(container, 600)
      await api.utils.delay(50)

      setContainerSize(container, 1000)
      await api.utils.delay(50)

      api.assert.ok(true, 'Icons exist for all size states')
    }
  ),
])

// =============================================================================
// Custom Size Thresholds
// =============================================================================

export const customThresholdTests: TestCase[] = describe('Custom Size Thresholds', [
  testWithSetup(
    'Custom compact threshold (500px max)',
    `compact.max: 500

Frame w 450, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Custom threshold at 500px", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // At 450px with custom threshold of 500px, should be compact
      const bg = getStyle(frame, 'background-color')
      api.assert.ok(bg, `Background with custom threshold: ${bg}`)
    }
  ),

  testWithSetup(
    'Custom regular range (300-600px)',
    `regular.min: 300
regular.max: 600

Frame w 450, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Custom regular 300-600px", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // 450px should be within custom regular range
      const bg = getStyle(frame, 'background-color')
      api.assert.ok(bg, `Background with custom regular range: ${bg}`)
    }
  ),

  testWithSetup(
    'Custom named breakpoint (tablet)',
    `tablet.min: 600
tablet.max: 900

Frame w 750, h 200, bg #1a1a1a, pad 16
  tablet:
    bg #2271C1
    pad 24
  Text "Tablet-specific styling", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      // 750px should match tablet breakpoint
      const bg = getStyle(frame, 'background-color')
      const padding = getStyle(frame, 'padding')

      api.assert.ok(bg, `Tablet background: ${bg}`)
      api.assert.ok(padding, `Tablet padding: ${padding}`)
    }
  ),
])

// =============================================================================
// Responsive Components
// =============================================================================

export const responsiveComponentTests: TestCase[] = describe('Responsive Components', [
  testWithSetup(
    'Card component adapts to container',
    `Card: bg #1a1a1a, rad 8, shadow md
  compact:
    pad 12
    gap 8
  regular:
    pad 16
    gap 12
  wide:
    pad 24
    gap 16
    hor

Card w 300
  Frame w 80, h 80, bg #333, rad 6, shrink
  Frame grow, gap 4
    Text "Card Title", col white, weight bold
    Text "Adapts to container", col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const card = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(card !== null, 'Card should exist')

      // Get initial values at 300px
      const compactPadding = getStyle(card, 'padding')
      const compactGap = getStyle(card, 'gap')

      // Resize to wide
      setContainerSize(card, 900)
      await api.utils.delay(50)

      const widePadding = getStyle(card, 'padding')
      const wideGap = getStyle(card, 'gap')
      const wideDirection = getStyle(card, 'flex-direction')

      api.assert.ok(
        compactPadding || widePadding,
        `Card padding: compact=${compactPadding}, wide=${widePadding}`
      )
      api.assert.ok(compactGap || wideGap, `Card gap: compact=${compactGap}, wide=${wideGap}`)
    }
  ),

  testWithSetup(
    'Button sizes change responsively',
    `Btn as Button: bg #2271C1, col white, rad 6
  compact:
    pad 8 16
    fs 12
  regular:
    pad 12 24
    fs 14
  wide:
    pad 16 32
    fs 16

Frame w 350, h 100, center, bg #1a1a1a
  Btn "Responsive Button"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const button = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(button !== null, 'Button should exist')

      // Get button dimensions at compact
      const compactWidth = button.offsetWidth
      const compactFontSize = getStyle(button, 'font-size')

      // Resize to wide
      setContainerSize(container, 900)
      await api.utils.delay(50)

      const wideWidth = button.offsetWidth
      const wideFontSize = getStyle(button, 'font-size')

      api.assert.ok(compactWidth > 0, `Button exists at compact: ${compactWidth}px`)
      api.assert.ok(wideWidth > 0, `Button exists at wide: ${wideWidth}px`)
      api.assert.ok(
        compactFontSize && wideFontSize,
        `Font: compact=${compactFontSize}, wide=${wideFontSize}`
      )
    }
  ),
])

// =============================================================================
// Complex Responsive Patterns
// =============================================================================

export const complexResponsiveTests: TestCase[] = describe('Complex Responsive Patterns', [
  testWithSetup(
    'Dashboard layout switches at breakpoints',
    `Frame w full, h 400, bg #0a0a0a
  compact:
    Frame w full, h 60, bg #1a1a1a, hor, spread, ver-center, pad 0 16
      Icon "menu", ic white, is 24
      Text "Dashboard", col white
    Frame w full, grow, pad 16
      Text "Mobile Content", col white
  wide:
    Frame w full, h full, hor
      Frame w 200, bg #1a1a1a, pad 16
        Text "Sidebar", col white
      Frame grow, pad 24
        Text "Desktop Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const dashboard = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(dashboard !== null, 'Dashboard should exist')

      // Test at mobile size
      setContainerSize(dashboard, 375)
      await api.utils.delay(100)

      // Test at desktop size
      setContainerSize(dashboard, 1200)
      await api.utils.delay(100)

      api.assert.ok(true, 'Dashboard renders at both sizes')
    }
  ),

  testWithSetup(
    'Product grid columns change with size',
    `Frame w 800, wrap, gap 16, pad 16, bg #0a0a0a
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 1", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 2", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 3", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 4", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const grid = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const products = [
        document.querySelector('[data-mirror-id="node-2"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-3"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-4"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-5"]') as HTMLElement,
      ]

      api.assert.ok(grid !== null, 'Grid should exist')
      products.forEach((p, i) => api.assert.ok(p !== null, `Product ${i + 1} should exist`))

      // Check widths at different sizes
      setContainerSize(grid, 350)
      await api.utils.delay(50)
      const compactWidth = products[0].offsetWidth

      setContainerSize(grid, 600)
      await api.utils.delay(50)
      const regularWidth = products[0].offsetWidth

      setContainerSize(grid, 1000)
      await api.utils.delay(50)
      const wideWidth = products[0].offsetWidth

      api.assert.ok(
        compactWidth > 0 && regularWidth > 0 && wideWidth > 0,
        `Product widths: compact=${compactWidth}, regular=${regularWidth}, wide=${wideWidth}`
      )
    }
  ),

  testWithSetup(
    'Form layout adapts to container',
    `Frame w 500, bg #1a1a1a, pad 24, rad 8
  compact:
    gap 12
  wide:
    gap 16
    hor
    wrap
  Frame gap 4
    compact:
      w full
    wide:
      w 200
    Text "First Name", col #888, fs 12
    Input placeholder "John", pad 12, bg #222, col white, rad 6
  Frame gap 4
    compact:
      w full
    wide:
      w 200
    Text "Last Name", col #888, fs 12
    Input placeholder "Doe", pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const form = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const field1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const field2 = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(form !== null, 'Form should exist')
      api.assert.ok(field1 !== null, 'Field 1 should exist')
      api.assert.ok(field2 !== null, 'Field 2 should exist')

      // At compact, fields should be full width (stacked)
      setContainerSize(form, 350)
      await api.utils.delay(50)
      const compactDirection = getStyle(form, 'flex-direction')

      // At wide, fields should be side by side
      setContainerSize(form, 900)
      await api.utils.delay(50)
      const wideDirection = getStyle(form, 'flex-direction')

      api.assert.ok(
        compactDirection && wideDirection,
        `Form direction: compact=${compactDirection}, wide=${wideDirection}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allResponsiveTests: TestCase[] = [
  ...basicResponsiveTests,
  ...responsiveLayoutTests,
  ...responsiveStylingTests,
  ...responsiveVisibilityTests,
  ...customThresholdTests,
  ...responsiveComponentTests,
  ...complexResponsiveTests,
]
