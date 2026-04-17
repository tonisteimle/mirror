/**
 * Test Fixtures
 *
 * Sample Mirror code for testing the image-to-mirror roundtrip.
 * Organized by complexity level.
 */

import { createTestCase } from './runner'
import type { TestCase } from './types'

// =============================================================================
// Level 1: Basic Primitives
// =============================================================================

export const basicPrimitives: TestCase[] = [
  createTestCase('basic-text', 'Basic Text', `Text "Hello World"`, {
    tags: ['basic', 'text'],
    description: 'Simple text element',
  }),

  createTestCase(
    'basic-button',
    'Basic Button',
    `Button "Click Me", bg #2271C1, col white, pad 12 24, rad 6`,
    { tags: ['basic', 'button'], description: 'Styled button' }
  ),

  createTestCase('basic-frame', 'Basic Frame', `Frame w 200, h 100, bg #1a1a1a, rad 8`, {
    tags: ['basic', 'frame'],
    description: 'Simple frame with size and color',
  }),

  createTestCase('basic-icon', 'Basic Icon', `Icon "check", ic #10b981, is 24`, {
    tags: ['basic', 'icon'],
    description: 'Simple icon',
  }),

  createTestCase(
    'basic-input',
    'Basic Input',
    `Input placeholder "Enter text...", pad 8 12, bor 1, boc #333, rad 4`,
    { tags: ['basic', 'input'], description: 'Input field' }
  ),
]

// =============================================================================
// Level 2: Layout
// =============================================================================

export const layoutTests: TestCase[] = [
  createTestCase(
    'layout-vertical',
    'Vertical Layout',
    `Frame gap 12
  Text "Item 1"
  Text "Item 2"
  Text "Item 3"`,
    { tags: ['layout', 'vertical'], description: 'Vertical stack' }
  ),

  createTestCase(
    'layout-horizontal',
    'Horizontal Layout',
    `Frame hor, gap 12
  Button "A"
  Button "B"
  Button "C"`,
    { tags: ['layout', 'horizontal'], description: 'Horizontal row' }
  ),

  createTestCase(
    'layout-centered',
    'Centered Layout',
    `Frame w 200, h 100, bg #1a1a1a, center
  Text "Centered", col white`,
    { tags: ['layout', 'center'], description: 'Centered content' }
  ),

  createTestCase(
    'layout-spread',
    'Spread Layout',
    `Frame hor, spread, w 300, bg #1a1a1a, pad 16
  Text "Left", col white
  Text "Right", col white`,
    { tags: ['layout', 'spread'], description: 'Space-between layout' }
  ),

  createTestCase(
    'layout-nested',
    'Nested Layout',
    `Frame gap 16, pad 16, bg #0a0a0a
  Frame hor, gap 8
    Text "Row 1A", col white
    Text "Row 1B", col white
  Frame hor, gap 8
    Text "Row 2A", col white
    Text "Row 2B", col white`,
    { tags: ['layout', 'nested'], description: 'Nested frames' }
  ),
]

// =============================================================================
// Level 3: Styling
// =============================================================================

export const stylingTests: TestCase[] = [
  createTestCase(
    'style-colors',
    'Color Variations',
    `Frame gap 8
  Frame w 100, h 40, bg #ef4444
  Frame w 100, h 40, bg #f59e0b
  Frame w 100, h 40, bg #10b981
  Frame w 100, h 40, bg #2271C1`,
    { tags: ['styling', 'colors'], description: 'Different background colors' }
  ),

  createTestCase(
    'style-borders',
    'Border Styles',
    `Frame gap 8
  Frame w 100, h 40, bg #1a1a1a, bor 1, boc #333
  Frame w 100, h 40, bg #1a1a1a, bor 2, boc #2271C1
  Frame w 100, h 40, bg #1a1a1a, rad 8, bor 1, boc #10b981`,
    { tags: ['styling', 'borders'], description: 'Border variations' }
  ),

  createTestCase(
    'style-radius',
    'Radius Variations',
    `Frame hor, gap 8
  Frame w 60, h 60, bg #2271C1, rad 0
  Frame w 60, h 60, bg #2271C1, rad 8
  Frame w 60, h 60, bg #2271C1, rad 16
  Frame w 60, h 60, bg #2271C1, rad 999`,
    { tags: ['styling', 'radius'], description: 'Different border radii' }
  ),

  createTestCase(
    'style-padding',
    'Padding Variations',
    `Frame gap 8
  Frame bg #1a1a1a, pad 8
    Text "Small padding", col white
  Frame bg #1a1a1a, pad 16
    Text "Medium padding", col white
  Frame bg #1a1a1a, pad 24
    Text "Large padding", col white`,
    { tags: ['styling', 'padding'], description: 'Different padding sizes' }
  ),

  createTestCase(
    'style-shadow',
    'Shadow Effects',
    `Frame gap 16, pad 16, bg #f5f5f5
  Frame w 100, h 60, bg white, shadow sm
  Frame w 100, h 60, bg white, shadow md
  Frame w 100, h 60, bg white, shadow lg`,
    { tags: ['styling', 'shadow'], description: 'Shadow variations' }
  ),
]

// =============================================================================
// Level 4: Typography
// =============================================================================

export const typographyTests: TestCase[] = [
  createTestCase(
    'typo-sizes',
    'Font Sizes',
    `Frame gap 8, bg #0a0a0a, pad 16
  Text "Small (12)", col white, fs 12
  Text "Medium (14)", col white, fs 14
  Text "Large (18)", col white, fs 18
  Text "XL (24)", col white, fs 24
  Text "XXL (32)", col white, fs 32`,
    { tags: ['typography', 'sizes'], description: 'Different font sizes' }
  ),

  createTestCase(
    'typo-weights',
    'Font Weights',
    `Frame gap 8, bg #0a0a0a, pad 16
  Text "Light", col white, weight light
  Text "Normal", col white, weight normal
  Text "Medium", col white, weight medium
  Text "Bold", col white, weight bold`,
    { tags: ['typography', 'weights'], description: 'Different font weights' }
  ),

  createTestCase(
    'typo-colors',
    'Text Colors',
    `Frame gap 8, bg #0a0a0a, pad 16
  Text "White", col white
  Text "Gray", col #888
  Text "Blue", col #2271C1
  Text "Green", col #10b981
  Text "Red", col #ef4444`,
    { tags: ['typography', 'colors'], description: 'Different text colors' }
  ),
]

// =============================================================================
// Level 5: Components
// =============================================================================

export const componentTests: TestCase[] = [
  createTestCase(
    'comp-card',
    'Card Component',
    `Frame bg #1a1a1a, pad 16, rad 8, gap 12, w 250
  Text "Card Title", col white, fs 18, weight bold
  Text "This is a description of the card content.", col #888, fs 14
  Button "Action", bg #2271C1, col white, pad 8 16, rad 4`,
    { tags: ['component', 'card'], description: 'Card with title, description, button' }
  ),

  createTestCase(
    'comp-list',
    'List Component',
    `Frame bg #1a1a1a, rad 8, w 200
  Frame hor, pad 12, gap 8, ver-center
    Icon "user", ic #888, is 16
    Text "Profile", col white
  Frame hor, pad 12, gap 8, ver-center
    Icon "settings", ic #888, is 16
    Text "Settings", col white
  Frame hor, pad 12, gap 8, ver-center
    Icon "log-out", ic #888, is 16
    Text "Logout", col white`,
    { tags: ['component', 'list'], description: 'List with icons' }
  ),

  createTestCase(
    'comp-form',
    'Form Component',
    `Frame bg #1a1a1a, pad 20, rad 8, gap 16, w 300
  Text "Login", col white, fs 20, weight bold
  Frame gap 8
    Text "Email", col #888, fs 12
    Input placeholder "you@example.com", pad 10, bor 1, boc #333, rad 4, col white, bg #0a0a0a
  Frame gap 8
    Text "Password", col #888, fs 12
    Input type password, placeholder "••••••••", pad 10, bor 1, boc #333, rad 4, col white, bg #0a0a0a
  Button "Sign In", bg #2271C1, col white, pad 12, rad 6, w full`,
    { tags: ['component', 'form'], description: 'Login form' }
  ),

  createTestCase(
    'comp-nav',
    'Navigation Bar',
    `Frame hor, spread, ver-center, pad 16, bg #1a1a1a, w full
  Text "Logo", col white, fs 18, weight bold
  Frame hor, gap 24
    Text "Home", col white
    Text "About", col #888
    Text "Contact", col #888
  Button "Sign Up", bg #2271C1, col white, pad 8 16, rad 4`,
    { tags: ['component', 'navigation'], description: 'Navigation bar' }
  ),
]

// =============================================================================
// Level 6: Complex Layouts
// =============================================================================

export const complexTests: TestCase[] = [
  createTestCase(
    'complex-dashboard',
    'Dashboard Layout',
    `Frame hor, h full, bg #0a0a0a
  Frame w 200, bg #1a1a1a, pad 16, gap 8
    Text "Dashboard", col white, fs 16, weight bold
    Text "Overview", col white
    Text "Analytics", col #888
    Text "Settings", col #888
  Frame grow, pad 24, gap 16
    Text "Welcome back", col white, fs 24, weight bold
    Frame hor, gap 16
      Frame grow, bg #1a1a1a, pad 16, rad 8
        Text "Users", col #888, fs 12
        Text "1,234", col white, fs 32, weight bold
      Frame grow, bg #1a1a1a, pad 16, rad 8
        Text "Revenue", col #888, fs 12
        Text "$12,345", col white, fs 32, weight bold`,
    { tags: ['complex', 'dashboard'], description: 'Dashboard with sidebar' }
  ),

  createTestCase(
    'complex-grid',
    'Grid Layout',
    `Frame grid 12, gap 8, pad 16, bg #0a0a0a
  Frame w 4, bg #2271C1, pad 16, rad 4
    Text "1/3", col white
  Frame w 4, bg #2271C1, pad 16, rad 4
    Text "1/3", col white
  Frame w 4, bg #2271C1, pad 16, rad 4
    Text "1/3", col white
  Frame w 6, bg #10b981, pad 16, rad 4
    Text "1/2", col white
  Frame w 6, bg #10b981, pad 16, rad 4
    Text "1/2", col white
  Frame w 12, bg #f59e0b, pad 16, rad 4
    Text "Full Width", col white`,
    { tags: ['complex', 'grid'], description: '12-column grid' }
  ),
]

// =============================================================================
// All Fixtures
// =============================================================================

export const allFixtures: TestCase[] = [
  ...basicPrimitives,
  ...layoutTests,
  ...stylingTests,
  ...typographyTests,
  ...componentTests,
  ...complexTests,
]

/**
 * Get fixtures by tag
 */
export function getFixturesByTag(tag: string): TestCase[] {
  return allFixtures.filter(tc => tc.tags?.includes(tag))
}

/**
 * Get fixtures by level
 */
export function getFixturesByLevel(
  level: 'basic' | 'layout' | 'styling' | 'typography' | 'component' | 'complex'
): TestCase[] {
  switch (level) {
    case 'basic':
      return basicPrimitives
    case 'layout':
      return layoutTests
    case 'styling':
      return stylingTests
    case 'typography':
      return typographyTests
    case 'component':
      return componentTests
    case 'complex':
      return complexTests
  }
}
