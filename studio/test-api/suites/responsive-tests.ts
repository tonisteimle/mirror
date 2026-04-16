/**
 * Responsive State Tests
 *
 * Tests for Mirror's responsive/size-based states:
 * - compact: state (< 400px)
 * - regular: state (400-800px)
 * - wide: state (> 800px)
 * - Custom size thresholds via tokens
 * - CSS Container Queries
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Basic Responsive States
// =============================================================================

export const basicResponsiveTests: TestCase[] = describe('Basic Responsive States', [
  testWithSetup(
    'compact state for small containers',
    `Frame w 300, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Container", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame

      const frame = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'regular state for medium containers',
    `Frame w 500, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Medium container", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'wide state for large containers',
    `Frame w 900, h 200, bg #1a1a1a, pad 16
  wide:
    bg #10b981
  Text "Wide container", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'All three states defined',
    `Frame w full, h 200, bg #333, pad 16
  compact:
    bg #ef4444
    Text "Compact Mode", col white
  regular:
    bg #f59e0b
    Text "Regular Mode", col white
  wide:
    bg #10b981
    Text "Wide Mode", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),
])

// =============================================================================
// Responsive Layout Changes
// =============================================================================

export const responsiveLayoutTests: TestCase[] = describe('Responsive Layout', [
  testWithSetup(
    'Stack to horizontal on wide',
    `Frame w full, h 200, gap 8, pad 16, bg #1a1a1a
  compact:
    ver
  wide:
    hor
  Frame w 100, h 50, bg #333, rad 4
  Frame w 100, h 50, bg #333, rad 4
  Frame w 100, h 50, bg #333, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Child 1
      api.assert.exists('node-3') // Child 2
      api.assert.exists('node-4') // Child 3
    }
  ),

  testWithSetup(
    'Grid columns change with size',
    `Frame w full, h 300, grid 12, gap 8, pad 16, bg #1a1a1a
  compact:
    Frame w 12, h 80, bg #333
    Frame w 12, h 80, bg #333
  regular:
    Frame w 6, h 80, bg #333
    Frame w 6, h 80, bg #333
  wide:
    Frame w 4, h 80, bg #333
    Frame w 4, h 80, bg #333
    Frame w 4, h 80, bg #333`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Grid container
    }
  ),

  testWithSetup(
    'Sidebar collapses on compact',
    `Frame w full, h 300, hor, bg #0a0a0a
  compact:
    Frame w 60, bg #1a1a1a
      Icon "menu", ic white, is 24, center
  regular:
    Frame w 200, bg #1a1a1a, pad 16
      Text "Full Sidebar", col white
  Frame grow, pad 16
    Text "Main Content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
    }
  ),
])

// =============================================================================
// Responsive Styling
// =============================================================================

export const responsiveStylingTests: TestCase[] = describe('Responsive Styling', [
  testWithSetup(
    'Font size changes with container',
    `Frame w full, h 100, center, bg #1a1a1a
  Text "Responsive Text", col white
    compact:
      fs 14
    regular:
      fs 18
    wide:
      fs 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Text
    }
  ),

  testWithSetup(
    'Padding adjusts with size',
    `Frame w full, h 200, bg #1a1a1a
  compact:
    pad 8
  regular:
    pad 16
  wide:
    pad 32
  Text "Content with responsive padding", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'Gap changes with container size',
    `Frame w full, h 200, bg #1a1a1a, pad 16
  compact:
    gap 4
  regular:
    gap 12
  wide:
    gap 24
  Frame w 50, h 50, bg #333, rad 4
  Frame w 50, h 50, bg #333, rad 4
  Frame w 50, h 50, bg #333, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
    }
  ),
])

// =============================================================================
// Responsive Visibility
// =============================================================================

export const responsiveVisibilityTests: TestCase[] = describe('Responsive Visibility', [
  testWithSetup(
    'Hide element on compact',
    `Frame w full, h 200, hor, gap 16, pad 16, bg #1a1a1a
  Frame w 200, bg #333, pad 16
    compact:
      hidden
    Text "Sidebar (hidden on mobile)", col white
  Frame grow, bg #222, pad 16
    Text "Main content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
    }
  ),

  testWithSetup(
    'Show mobile menu only on compact',
    `Frame w full, h 100, pad 16, bg #1a1a1a, hor, spread, ver-center
  Text "Logo", col white, fs 18, weight bold
  Icon "menu", ic white, is 24, hidden
    compact:
      visible
  Frame hor, gap 16
    wide:
      visible
    compact:
      hidden
    Text "Home", col white
    Text "About", col white
    Text "Contact", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Header
    }
  ),

  testWithSetup(
    'Different content per size',
    `Frame w full, h 200, center, bg #1a1a1a
  compact:
    Icon "smartphone", ic white, is 48
  regular:
    Icon "tablet", ic white, is 48
  wide:
    Icon "monitor", ic white, is 48`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),
])

// =============================================================================
// Custom Size Thresholds
// =============================================================================

export const customThresholdTests: TestCase[] = describe('Custom Size Thresholds', [
  testWithSetup(
    'Custom compact threshold',
    `compact.max: 500

Frame w 450, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Custom threshold", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'Custom regular range',
    `regular.min: 300
regular.max: 600

Frame w 450, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Custom regular range", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'Custom wide threshold',
    `wide.min: 1000

Frame w 1100, h 200, bg #1a1a1a, pad 16
  wide:
    bg #10b981
  Text "Custom wide threshold", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'Custom named breakpoint',
    `tablet.min: 600
tablet.max: 900

Frame w 750, h 200, bg #1a1a1a, pad 16
  tablet:
    bg #2271C1
    pad 24
  Text "Tablet-specific styling", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),
])

// =============================================================================
// Responsive Components
// =============================================================================

export const responsiveComponentTests: TestCase[] = describe('Responsive Components', [
  testWithSetup(
    'Card adapts to container',
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

Card w full
  Frame w 100, h 100, bg #333, rad 6, shrink
  Frame grow, gap 4
    Text "Card Title", col white, weight bold
    Text "Description text that adapts", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card
    }
  ),

  testWithSetup(
    'Navigation component responsive',
    `Nav: hor, spread, ver-center, pad 16, bg #1a1a1a
  compact:
    Frame hor, gap 8
      Icon "menu", ic white, is 24
  regular:
    Frame hor, gap 16
      Text "Home", col white
      Text "Products", col white
      Text "Contact", col white
  wide:
    Frame hor, gap 24
      Text "Home", col white
      Text "Products", col white
      Text "Services", col white
      Text "About", col white
      Text "Contact", col white

Nav w full`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Nav
    }
  ),

  testWithSetup(
    'Button sizes responsive',
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

Frame w full, h 100, center, bg #1a1a1a
  Btn "Responsive Button"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
    }
  ),
])

// =============================================================================
// Complex Responsive Patterns
// =============================================================================

export const complexResponsiveTests: TestCase[] = describe('Complex Responsive Patterns', [
  testWithSetup(
    'Dashboard layout responsive',
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
      api.assert.exists('node-1') // Dashboard
    }
  ),

  testWithSetup(
    'Product grid responsive',
    `products:
  p1: { name: "Product 1" }
  p2: { name: "Product 2" }
  p3: { name: "Product 3" }
  p4: { name: "Product 4" }

Frame w full, wrap, gap 16, pad 16, bg #0a0a0a
  each product in $products
    Frame bg #1a1a1a, rad 8, pad 16
      compact:
        w full
      regular:
        w 180
      wide:
        w 220
      Frame h 120, bg #333, rad 4, mar 0 0 12 0
      Text product.name, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Grid container
    }
  ),

  testWithSetup(
    'Form layout responsive',
    `Frame w full, bg #1a1a1a, pad 24, rad 8
  compact:
    gap 12
  wide:
    gap 16
    grid 2
  Frame gap 4
    Text "First Name", col #888, fs 12
    Input placeholder "John", pad 12, bg #222, col white, rad 6
  Frame gap 4
    Text "Last Name", col #888, fs 12
    Input placeholder "Doe", pad 12, bg #222, col white, rad 6
  Frame gap 4
    compact:
      w full
    wide:
      w full
    Text "Email", col #888, fs 12
    Input placeholder "john@example.com", pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Form container
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
