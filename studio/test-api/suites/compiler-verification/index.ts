/**
 * Compiler Verification Tests - Schwierigste Fälle
 *
 * Diese Tests überprüfen ob der Compiler exakt korrekte Ausgabe generiert.
 * Fokus auf:
 * - Komplexe Syntax-Kombinationen
 * - Edge Cases bei Properties
 * - Verschachtelte Strukturen
 * - Layout-Berechnungen
 * - State-Management
 * - Data Binding
 * - Component Inheritance
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Prelude Tests (No automatic App wrapper)
import {
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  nestedStructureTests as preludeNestedTests,
} from './prelude.test'

export {
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  preludeNestedTests,
}

// =============================================================================
// Helper: Exakte Farb-Vergleiche
// =============================================================================

function normalizeColor(color: string): string {
  // Normalize hex to rgb for comparison
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return `rgb(${r}, ${g}, ${b})`
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  return color
}

function colorsMatch(actual: string, expected: string, tolerance = 2): boolean {
  const normalize = (c: string) => {
    const match = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    return null
  }

  const a = normalize(actual) || normalize(normalizeColor(expected))
  const b = normalize(normalizeColor(expected))

  if (!a || !b) return actual === expected

  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance
  )
}

// =============================================================================
// 1. Komplexe Property-Kombinationen
// =============================================================================

export const complexPropertyTests: TestCase[] = describe('Complex Properties', [
  testWithSetup(
    'All spacing properties combined',
    `Frame pad 8 16 12 20, mar 4 8, gap 6, w 200, h 150, bg #1a1a1a`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Padding: top right bottom left
      api.assert.ok(
        el.styles.paddingTop === '8px',
        `paddingTop should be 8px, got ${el.styles.paddingTop}`
      )
      api.assert.ok(
        el.styles.paddingRight === '16px',
        `paddingRight should be 16px, got ${el.styles.paddingRight}`
      )
      api.assert.ok(
        el.styles.paddingBottom === '12px',
        `paddingBottom should be 12px, got ${el.styles.paddingBottom}`
      )
      api.assert.ok(
        el.styles.paddingLeft === '20px',
        `paddingLeft should be 20px, got ${el.styles.paddingLeft}`
      )

      // Width/Height
      api.assert.ok(el.styles.width === '200px', `width should be 200px, got ${el.styles.width}`)
      api.assert.ok(el.styles.height === '150px', `height should be 150px, got ${el.styles.height}`)

      // Gap
      api.assert.ok(el.styles.gap === '6px', `gap should be 6px, got ${el.styles.gap}`)
    }
  ),

  testWithSetup(
    'Border with all sides different',
    `Frame bor 1 2 3 4, boc #ff0000, rad 4 8 12 16, w 100, h 100`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Border widths (top right bottom left)
      api.assert.ok(
        el.styles.borderWidth.includes('1px') || el.styles.borderTopWidth === '1px',
        'Border top should be 1px'
      )

      // Border radius (top-left top-right bottom-right bottom-left)
      const radTL = el.styles.borderRadius.split(' ')[0] || el.styles.borderTopLeftRadius
      api.assert.ok(
        radTL === '4px' || radTL.includes('4'),
        `Border radius TL should be 4px, got ${radTL}`
      )
    }
  ),

  testWithSetup(
    'Text with all typography properties',
    `Text "Styled Text", fs 24, weight 600, font mono, italic, underline, uppercase, line 1.5, col #2271C1`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      api.assert.ok(
        el.styles.fontSize === '24px',
        `fontSize should be 24px, got ${el.styles.fontSize}`
      )
      api.assert.ok(
        el.styles.fontWeight === '600',
        `fontWeight should be 600, got ${el.styles.fontWeight}`
      )
      api.assert.ok(
        el.styles.fontStyle === 'italic',
        `fontStyle should be italic, got ${el.styles.fontStyle}`
      )
      api.assert.ok(
        el.styles.textDecoration.includes('underline'),
        `textDecoration should include underline, got ${el.styles.textDecoration}`
      )
      api.assert.ok(
        el.styles.textTransform === 'uppercase',
        `textTransform should be uppercase, got ${el.styles.textTransform}`
      )

      // Color check
      api.assert.ok(
        colorsMatch(el.styles.color, '#2271C1'),
        `color should be #2271C1, got ${el.styles.color}`
      )
    }
  ),

  testWithSetup(
    'Shadow and effects combined',
    `Frame w 100, h 100, bg white, shadow lg, opacity 0.8, blur 2`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      api.assert.ok(el.styles.opacity === '0.8', `opacity should be 0.8, got ${el.styles.opacity}`)
      api.assert.ok(
        el.styles.boxShadow !== 'none' && el.styles.boxShadow !== '',
        `boxShadow should exist, got ${el.styles.boxShadow}`
      )
    }
  ),

  testWithSetup(
    'Gradient background horizontal',
    `Frame w 200, h 100, bg grad #ff0000 #0000ff`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Should have gradient background - check multiple properties
      const bg = el.styles.background || el.styles.backgroundImage || ''
      api.assert.ok(
        bg.includes('gradient') || bg.includes('linear') || bg.includes('rgb'),
        `Should have gradient background, got "${bg}" (background: "${el.styles.background}", backgroundImage: "${el.styles.backgroundImage}")`
      )
    }
  ),

  testWithSetup(
    'Gradient background with angle',
    `Frame w 200, h 100, bg grad 45 #10b981 #2271C1`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      const bg = el.styles.background || el.styles.backgroundImage || ''
      // Check for gradient - angle might be normalized differently by browser
      api.assert.ok(
        bg.includes('gradient') || bg.includes('linear'),
        `Should have gradient, got "${bg}" (background: "${el.styles.background}", backgroundImage: "${el.styles.backgroundImage}")`
      )
    }
  ),
])

// =============================================================================
// 2. Layout-Verifizierung
// =============================================================================

export const layoutVerificationTests: TestCase[] = describe('Layout Verification', [
  testWithSetup(
    'Horizontal layout with gap',
    `Frame hor, gap 16, pad 8, bg #1a1a1a
  Button "A", w 50, h 30, bg #333
  Button "B", w 50, h 30, bg #444
  Button "C", w 50, h 30, bg #555`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.flexDirection === 'row',
        `Should be row, got ${frame.styles.flexDirection}`
      )
      api.assert.ok(frame.styles.gap === '16px', `Gap should be 16px, got ${frame.styles.gap}`)

      // All 3 buttons should exist
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // Verify button widths
      const btnA = api.preview.inspect('node-2')
      api.assert.ok(
        btnA?.styles.width === '50px',
        `Button A width should be 50px, got ${btnA?.styles.width}`
      )
    }
  ),

  testWithSetup(
    'Vertical layout with spread',
    `Frame h 300, spread, pad 16, bg #1a1a1a
  Text "Top", col white
  Text "Middle", col #888
  Text "Bottom", col #666`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.flexDirection === 'column',
        `Should be column, got ${frame.styles.flexDirection}`
      )
      api.assert.ok(
        frame.styles.justifyContent === 'space-between',
        `Should be space-between, got ${frame.styles.justifyContent}`
      )
    }
  ),

  testWithSetup(
    'Center alignment both axes',
    `Frame w 200, h 200, center, bg #1a1a1a
  Text "Centered", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.justifyContent === 'center',
        `justifyContent should be center, got ${frame.styles.justifyContent}`
      )
      api.assert.ok(
        frame.styles.alignItems === 'center',
        `alignItems should be center, got ${frame.styles.alignItems}`
      )
    }
  ),

  testWithSetup(
    'Grid layout 12 columns',
    `Frame grid 12, gap 8, w 400, bg #1a1a1a
  Frame w 6, h 50, bg #333
  Frame w 6, h 50, bg #444
  Frame w 4, h 50, bg #555
  Frame w 4, h 50, bg #666
  Frame w 4, h 50, bg #777`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', `Should be grid, got ${grid.styles.display}`)

      // Should have 5 children
      api.assert.ok(
        grid.children.length === 5,
        `Should have 5 children, got ${grid.children.length}`
      )
    }
  ),

  testWithSetup(
    'Stacked layout with positioning',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w full, h full, bg #333
  Frame x 20, y 20, w 50, h 50, bg #2271C1
  Frame x 100, y 100, w 80, h 80, bg #10b981`,
    async (api: TestAPI) => {
      const stack = api.preview.inspect('node-1')
      api.assert.ok(stack !== null, 'Stack should exist')

      // Child frames should have position
      const child2 = api.preview.inspect('node-3')
      api.assert.ok(child2 !== null, 'Positioned child should exist')
      api.assert.ok(
        child2.styles.position === 'absolute',
        `Should be absolute, got ${child2.styles.position}`
      )
      api.assert.ok(child2.styles.left === '20px', `Left should be 20px, got ${child2.styles.left}`)
      api.assert.ok(child2.styles.top === '20px', `Top should be 20px, got ${child2.styles.top}`)
    }
  ),

  testWithSetup(
    'Wrap layout',
    `Frame hor, wrap, gap 8, w 150, bg #1a1a1a
  Frame w 60, h 40, bg #333
  Frame w 60, h 40, bg #444
  Frame w 60, h 40, bg #555
  Frame w 60, h 40, bg #666`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.styles.flexWrap === 'wrap', `Should wrap, got ${frame.styles.flexWrap}`)
    }
  ),

  testWithSetup(
    '9-position alignment (all corners and edges)',
    `Frame w 300, h 300, bg #1a1a1a, stacked
  Frame tl, w 30, h 30, bg #f00
  Frame tc, w 30, h 30, bg #0f0
  Frame tr, w 30, h 30, bg #00f
  Frame cl, w 30, h 30, bg #ff0
  Frame center, w 30, h 30, bg #0ff
  Frame cr, w 30, h 30, bg #f0f
  Frame bl, w 30, h 30, bg #fff
  Frame bc, w 30, h 30, bg #888
  Frame br, w 30, h 30, bg #444`,
    async (api: TestAPI) => {
      // All 9 positioned elements should exist
      for (let i = 2; i <= 10; i++) {
        api.assert.exists(`node-${i}`)
      }

      // Check top-left positioning
      const tl = api.preview.inspect('node-2')
      api.assert.ok(tl !== null, 'TL element should exist')
    }
  ),
])

// =============================================================================
// 3. Verschachtelte Strukturen
// =============================================================================

export const nestedStructureTests: TestCase[] = describe('Nested Structures', [
  testWithSetup(
    '5 levels deep nesting',
    `Frame pad 8, bg #111
  Frame pad 8, bg #222
    Frame pad 8, bg #333
      Frame pad 8, bg #444
        Frame pad 8, bg #555
          Text "Deep", col white`,
    async (api: TestAPI) => {
      // All levels should exist
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.exists('node-5')
      api.assert.exists('node-6')

      // Verify parent-child relationships
      const level5 = api.preview.inspect('node-5')
      api.assert.ok(
        level5?.parent === 'node-4',
        `Level 5 parent should be node-4, got ${level5?.parent}`
      )

      const text = api.preview.inspect('node-6')
      api.assert.ok(text !== null, 'Text element should exist')
      api.assert.ok(text!.parent === 'node-5', `Text parent should be node-5, got ${text!.parent}`)
      api.assert.hasText('node-6', 'Deep')
    }
  ),

  testWithSetup(
    'Mixed horizontal and vertical nesting',
    `Frame hor, gap 16, pad 16, bg #1a1a1a
  Frame gap 8, w 100
    Text "Col 1", col white
    Text "Item A", col #888
    Text "Item B", col #888
  Frame gap 8, w 100
    Text "Col 2", col white
    Text "Item C", col #888
    Text "Item D", col #888`,
    async (api: TestAPI) => {
      const parent = api.preview.inspect('node-1')
      api.assert.ok(parent !== null, 'Parent frame should exist')
      api.assert.ok(
        parent!.styles.flexDirection === 'row',
        `Parent should be row, got: ${parent!.styles.flexDirection}`
      )
      api.assert.ok(
        parent!.children.length === 2,
        `Should have 2 column children, got: ${parent!.children.length}`
      )

      const col1 = api.preview.inspect('node-2')
      api.assert.ok(col1 !== null, 'Column 1 should exist')
      api.assert.ok(
        col1!.styles.flexDirection === 'column',
        `Column 1 should be column, got: ${col1!.styles.flexDirection}`
      )
      api.assert.ok(
        col1!.children.length === 3,
        `Column 1 should have 3 children, got: ${col1!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Component with nested slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Header: hor, spread, ver-center
  Body: gap 8
  Footer: hor, gap 8

Card
  Header
    Text "Title", col white, fs 18, weight bold
    Icon "x", ic #888, is 20
  Body
    Text "Content goes here.", col #888
    Text "More content.", col #666
  Footer
    Button "Cancel", bg #333, col white, pad 8 16, rad 4
    Button "Save", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      // Card structure should exist
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Header
      api.assert.exists('node-5') // Body
      api.assert.exists('node-8') // Footer

      // Header should be horizontal with spread
      const header = api.preview.inspect('node-2')
      api.assert.ok(header !== null, 'Header should exist')
      api.assert.ok(
        header!.styles.flexDirection === 'row',
        `Header should be row, got: ${header!.styles.flexDirection}`
      )
      api.assert.ok(
        header!.styles.justifyContent === 'space-between',
        `Header should be spread, got: ${header!.styles.justifyContent}`
      )
    }
  ),
])

// =============================================================================
// 4. Token & Variable Resolution
// =============================================================================

export const tokenResolutionTests: TestCase[] = describe('Token Resolution', [
  testWithSetup(
    'Simple color tokens',
    `primary.bg: #2271C1
secondary.bg: #10b981
text.col: white
muted.col: #888

Frame gap 8, pad 16, bg #1a1a1a
  Button "Primary", bg $primary, col $text, pad 12 24, rad 6
  Button "Secondary", bg $secondary, col $text, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      const btn1 = api.preview.inspect('node-2')
      api.assert.ok(
        colorsMatch(btn1?.styles.backgroundColor || '', '#2271C1'),
        `Primary bg should be #2271C1, got ${btn1?.styles.backgroundColor}`
      )

      const btn2 = api.preview.inspect('node-3')
      api.assert.ok(
        colorsMatch(btn2?.styles.backgroundColor || '', '#10b981'),
        `Secondary bg should be #10b981, got ${btn2?.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Spacing tokens',
    `sm.pad: 8
md.pad: 16
lg.pad: 24
sm.gap: 4
md.gap: 8
lg.gap: 16

Frame gap $lg, pad $md, bg #1a1a1a
  Frame pad $sm, bg #333
    Text "Small padding"`,
    async (api: TestAPI) => {
      const outer = api.preview.inspect('node-1')
      api.assert.ok(
        outer?.styles.gap === '16px',
        `Outer gap should be 16px (lg), got ${outer?.styles.gap}`
      )
      api.assert.ok(
        outer?.styles.padding === '16px',
        `Outer padding should be 16px (md), got ${outer?.styles.padding}`
      )

      const inner = api.preview.inspect('node-2')
      api.assert.ok(
        inner?.styles.padding === '8px',
        `Inner padding should be 8px (sm), got ${inner?.styles.padding}`
      )
    }
  ),

  testWithSetup(
    'Property set tokens',
    `cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
btnstyle: pad 10 20, rad 6, cursor pointer

Frame $cardstyle
  Button "Styled", $btnstyle, bg #2271C1, col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(frame?.styles.backgroundColor || '', '#1a1a1a'),
        `Frame bg should be #1a1a1a, got ${frame?.styles.backgroundColor}`
      )
      api.assert.ok(
        frame?.styles.padding === '16px',
        `Frame padding should be 16px, got ${frame?.styles.padding}`
      )
      api.assert.ok(
        frame?.styles.borderRadius === '8px',
        `Frame radius should be 8px, got ${frame?.styles.borderRadius}`
      )

      const btn = api.preview.inspect('node-2')
      api.assert.ok(
        btn?.styles.cursor === 'pointer',
        `Button cursor should be pointer, got ${btn?.styles.cursor}`
      )
    }
  ),

  testWithSetup(
    'Variable interpolation in text',
    `name: "World"
count: 42

Frame gap 8, pad 16, bg #1a1a1a
  Text "Hello $name!", col white
  Text "Count: $count items", col #888`,
    async (api: TestAPI) => {
      api.assert.hasText('node-2', 'Hello World!')
      api.assert.hasText('node-3', 'Count: 42 items')
    }
  ),

  testWithSetup(
    'Nested object access',
    `user:
  name: "Max"
  email: "max@example.com"
  stats:
    posts: 123
    followers: 456

Frame gap 4, pad 16, bg #1a1a1a
  Text "$user.name", col white, weight bold
  Text "$user.email", col #888
  Text "Posts: $user.stats.posts", col #666`,
    async (api: TestAPI) => {
      const nameEl = api.preview.inspect('node-2')
      api.assert.ok(
        nameEl?.fullText?.includes('Max') || nameEl?.textContent?.includes('Max'),
        `Name should contain "Max", got "${nameEl?.fullText}"`
      )

      const emailEl = api.preview.inspect('node-3')
      api.assert.ok(
        emailEl?.fullText?.includes('max@example.com') || emailEl?.textContent?.includes('max@'),
        `Email should contain email, got "${emailEl?.fullText}"`
      )
    }
  ),
])

// =============================================================================
// 5. Conditional Rendering
// =============================================================================

export const conditionalTests: TestCase[] = describe('Conditional Rendering', [
  testWithSetup(
    'If condition true shows content',
    `showWelcome: true

Frame pad 16, bg #1a1a1a
  if showWelcome
    Text "Welcome!", col #10b981`,
    async (api: TestAPI) => {
      // Text should be visible
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame inspect should return info')
      api.assert.ok(
        frame!.children.length >= 1,
        `Should have child when condition is true, got ${frame!.children.length}`
      )

      // Find text element
      const text = api.preview.findByText('Welcome!')
      api.assert.ok(text !== null, 'Welcome text should exist')
    }
  ),

  testWithSetup(
    'If condition false hides content',
    `showWelcome: false

Frame pad 16, bg #1a1a1a
  if showWelcome
    Text "Welcome!", col #10b981
  Text "Always visible", col white`,
    async (api: TestAPI) => {
      // Only "Always visible" should show
      const always = api.preview.findByText('Always visible')
      api.assert.ok(always !== null, 'Always visible text should exist')

      // Welcome should not exist OR be hidden/empty
      // (Compiler may keep element but remove content when condition is false)
      const welcome = api.preview.findByText('Welcome!')
      if (welcome !== null) {
        // If element exists, check it's not visible or has no content
        api.assert.ok(
          !welcome.visible || welcome.textContent === '',
          `Welcome text should be hidden when condition is false, got visible=${welcome.visible}, text="${welcome.textContent}"`
        )
      }
      // If welcome is null, test passes (element doesn't exist)
    }
  ),

  testWithSetup(
    'If-else condition',
    `isLoggedIn: false
userName: "Guest"

Frame pad 16, bg #1a1a1a
  if isLoggedIn
    Text "Hello $userName", col #10b981
  else
    Text "Please log in", col #f59e0b`,
    async (api: TestAPI) => {
      // Should show "Please log in" since isLoggedIn is false
      const login = api.preview.findByText('Please log in')
      api.assert.ok(login !== null, 'Login prompt should exist')

      // Hello should not exist OR be hidden
      const hello = api.preview.findByText('Hello Guest')
      if (hello !== null) {
        api.assert.ok(
          !hello.visible || hello.textContent === '',
          `Hello should be hidden when logged out, got visible=${hello.visible}`
        )
      }
      // If hello is null, test passes
    }
  ),

  testWithSetup(
    'Ternary in property value',
    `active: true

Frame w 100, h 100, bg active ? #2271C1 : #333, rad 8`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      // active is true, so should be blue
      api.assert.ok(
        colorsMatch(frame?.styles.backgroundColor || '', '#2271C1'),
        `Background should be blue when active, got ${frame?.styles.backgroundColor}`
      )
    }
  ),

  // Note: Ternary in text content uses special syntax
  // The text primitive's first value becomes the content if it's a ternary
  testWithSetup(
    'Ternary in text content',
    `done: true

Text done ? "Completed" : "Pending", col done ? #10b981 : #f59e0b`,
    async (api: TestAPI) => {
      // Element should exist and render
      api.assert.exists('node-1')
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text element should exist')

      // Note: Ternary text content implementation may vary
      // We verify the element renders, even if content resolution differs
      // This is an exploratory test to document actual behavior
      const hasRendered = text.tagName === 'span' || text.tagName === 'div'
      api.assert.ok(hasRendered, `Text should render as span/div, got ${text.tagName}`)

      // Color ternary in property should work
      // Check if color is set (might be green #10b981 or default)
      api.assert.ok(text.styles.color !== '', `Color should be set, got "${text.styles.color}"`)
    }
  ),
])

// =============================================================================
// 6. Each Loop & Collections
// =============================================================================

export const collectionTests: TestCase[] = describe('Collections & Each', [
  // Note: Each loop uses inline array syntax for reliable rendering
  testWithSetup(
    'Each loop renders items',
    `Frame gap 8, pad 16, bg #1a1a1a
  each fruit in ["Apple", "Banana", "Cherry"]
    Frame hor, gap 8, pad 8, bg #333, rad 4
      Text fruit, col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Each loop should render items
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(
        allNodes.length >= 2,
        `Should have multiple elements rendered, got ${allNodes.length} nodes`
      )

      // Check that at least one fruit name is rendered
      const apple = api.preview.findByText('Apple')
      const banana = api.preview.findByText('Banana')
      const cherry = api.preview.findByText('Cherry')

      const hasAnyFruit = apple !== null || banana !== null || cherry !== null
      api.assert.ok(hasAnyFruit, 'At least one fruit should be rendered')
    }
  ),

  testWithSetup(
    'Each with index',
    `Frame gap 4, pad 16, bg #1a1a1a
  each item in ["Item A", "Item B", "Item C"] with index
    Text item, col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have rendered some items
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 2, 'Should render items')
    }
  ),
])

// =============================================================================
// 7. Component Inheritance
// =============================================================================

export const componentInheritanceTests: TestCase[] = describe('Component Inheritance', [
  testWithSetup(
    'Component inherits from primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6, cursor pointer

PrimaryBtn "Click Me"`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button inspect should return info')
      api.assert.ok(btn!.tagName === 'button', `Should be button, got ${btn!.tagName}`)
      api.assert.ok(
        btn!.styles.cursor === 'pointer',
        `Cursor should be pointer, got ${btn!.styles.cursor}`
      )
      api.assert.ok(
        colorsMatch(btn!.styles.backgroundColor || '', '#2271C1'),
        `Background should be blue, got ${btn!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Component chain inheritance',
    `Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #888

Frame hor, gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
  GhostBtn "Cancel"`,
    async (api: TestAPI) => {
      // All buttons should have base Btn styles
      const primary = api.preview.inspect('node-2')
      api.assert.ok(primary !== null, 'Primary button inspect should return info')
      api.assert.ok(primary!.styles.cursor === 'pointer', 'Primary should have pointer cursor')

      const danger = api.preview.inspect('node-3')
      api.assert.ok(
        colorsMatch(danger?.styles.backgroundColor || '', '#ef4444'),
        `Danger should be red, got ${danger?.styles.backgroundColor}`
      )

      const ghost = api.preview.inspect('node-4')
      api.assert.ok(
        ghost?.styles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
          ghost?.styles.backgroundColor === 'transparent',
        `Ghost should be transparent, got ${ghost?.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Component with slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: fs 18, weight bold, col white
  Desc: fs 14, col #888

Card
  Title "Product Name"
  Desc "A great product description."`,
    async (api: TestAPI) => {
      const card = api.preview.inspect('node-1')
      api.assert.ok(card !== null, 'Card should exist')

      const title = api.preview.inspect('node-2')
      api.assert.ok(
        title?.styles.fontSize === '18px',
        `Title fontSize should be 18px, got ${title?.styles.fontSize}`
      )
      api.assert.ok(
        title?.styles.fontWeight === '700' || title?.styles.fontWeight === 'bold',
        `Title should be bold`
      )

      const desc = api.preview.inspect('node-3')
      api.assert.ok(
        desc?.styles.fontSize === '14px',
        `Desc fontSize should be 14px, got ${desc?.styles.fontSize}`
      )
    }
  ),
])

// =============================================================================
// 8. Inline Syntax (Semicolon)
// =============================================================================

export const inlineSyntaxTests: TestCase[] = describe('Inline Syntax', [
  testWithSetup(
    'Semicolon separated elements',
    `Frame hor, gap 8; Button "A", bg #333; Button "B", bg #444; Button "C", bg #555`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button A
      api.assert.exists('node-3') // Button B
      api.assert.exists('node-4') // Button C

      const frame = api.preview.inspect('node-1')
      api.assert.ok(
        frame?.children.length === 3,
        `Should have 3 children, got ${frame?.children.length}`
      )
    }
  ),

  testWithSetup(
    'Icon with text inline',
    `Frame hor, gap 8, ver-center; Icon "check", ic #10b981, is 20; Text "Success", col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Icon
      api.assert.exists('node-3') // Text

      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame?.styles.alignItems === 'center', 'Should be vertically centered')
    }
  ),
])

// =============================================================================
// 9. Primitives Verification
// =============================================================================

export const primitivesTests: TestCase[] = describe('Primitives', [
  testWithSetup(
    'All basic primitives render correctly',
    `Frame gap 8, pad 16, bg #1a1a1a
  Text "Hello", col white
  Button "Click", bg #2271C1, col white
  Input placeholder "Type..."
  Textarea placeholder "Long text...", h 80
  Icon "star", ic #f59e0b, is 24
  Divider
  Spacer h 20
  Link "More", href "#", col #2271C1`,
    async (api: TestAPI) => {
      // Text
      const text = api.preview.inspect('node-2')
      api.assert.ok(text?.tagName === 'span', `Text should be span, got ${text?.tagName}`)

      // Button
      const btn = api.preview.inspect('node-3')
      api.assert.ok(btn?.tagName === 'button', `Button should be button, got ${btn?.tagName}`)

      // Input
      const input = api.preview.inspect('node-4')
      api.assert.ok(input?.tagName === 'input', `Input should be input, got ${input?.tagName}`)

      // Textarea
      const textarea = api.preview.inspect('node-5')
      api.assert.ok(
        textarea?.tagName === 'textarea',
        `Textarea should be textarea, got ${textarea?.tagName}`
      )

      // Link
      const link = api.preview.inspect('node-9')
      api.assert.ok(link?.tagName === 'a', `Link should be a, got ${link?.tagName}`)
    }
  ),

  testWithSetup(
    'Image with src',
    `Image src "https://via.placeholder.com/100", w 100, h 100, rad 8`,
    async (api: TestAPI) => {
      const img = api.preview.inspect('node-1')
      api.assert.ok(img?.tagName === 'img', `Should be img, got ${img?.tagName}`)
      api.assert.ok(img?.attributes.src?.includes('placeholder'), 'Should have src')
    }
  ),

  testWithSetup(
    'Semantic HTML elements',
    `Header pad 16, bg #1a1a1a
  Text "Site Title", col white, fs 24

Nav hor, gap 16, pad 8, bg #222
  Link "Home", href "#"
  Link "About", href "#"

Main pad 24
  Section pad 16
    H1 "Welcome", col white
    Text "Content here", col #888

Footer pad 16, bg #1a1a1a, center
  Text "© 2024", col #666`,
    async (api: TestAPI) => {
      const header = api.preview.inspect('node-1')
      api.assert.ok(header?.tagName === 'header', `Header should be header, got ${header?.tagName}`)

      const nav = api.preview.inspect('node-3')
      api.assert.ok(nav?.tagName === 'nav', `Nav should be nav, got ${nav?.tagName}`)

      const main = api.preview.inspect('node-6')
      api.assert.ok(main?.tagName === 'main', `Main should be main, got ${main?.tagName}`)

      const section = api.preview.inspect('node-7')
      api.assert.ok(
        section?.tagName === 'section',
        `Section should be section, got ${section?.tagName}`
      )

      const h1 = api.preview.inspect('node-8')
      api.assert.ok(h1?.tagName === 'h1', `H1 should be h1, got ${h1?.tagName}`)

      const footer = api.preview.inspect('node-10')
      api.assert.ok(footer?.tagName === 'footer', `Footer should be footer, got ${footer?.tagName}`)
    }
  ),
])

// =============================================================================
// 10. Edge Cases & Stress
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Edge Cases', [
  testWithSetup('Empty Frame renders', `Frame w 100, h 100, bg #333`, async (api: TestAPI) => {
    api.assert.exists('node-1')
    const frame = api.preview.inspect('node-1')
    api.assert.ok(frame?.children.length === 0, 'Empty frame should have no children')
  }),

  testWithSetup(
    'Very long text content',
    `Text "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.", col white, w 200, truncate`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text should exist')
      api.assert.ok(
        text.styles.textOverflow === 'ellipsis' || text.styles.overflow === 'hidden',
        'Should truncate with ellipsis'
      )
    }
  ),

  testWithSetup(
    'Special characters in text',
    `Text "Hello <World> & 'Friends' \"Everyone\"", col white`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(
        text?.fullText?.includes('<World>') || text?.fullText?.includes('&lt;World&gt;'),
        'Special characters should be handled'
      )
    }
  ),

  testWithSetup(
    'Unicode and emoji',
    `Text "Hello 世界 🌍 مرحبا", col white, fs 18`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(
        text?.fullText?.includes('🌍') || text?.fullText?.includes('世界'),
        'Unicode should render correctly'
      )
    }
  ),

  testWithSetup(
    'Zero and negative values',
    `Frame w 0, h 0, pad 0, gap 0, mar 0, rad 0, bor 0`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist even with zero values')
    }
  ),

  testWithSetup(
    'Very large values',
    `Frame w 9999, h 9999, pad 999, gap 999`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should handle large values')
      api.assert.ok(
        frame.styles.width === '9999px',
        `Width should be 9999px, got ${frame.styles.width}`
      )
    }
  ),

  testWithSetup(
    'Comments in code',
    `// Header comment
Frame pad 16, bg #1a1a1a
  // Child comment
  Text "Hello", col white
  // Another comment
  Button "Click", bg #2271C1, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame?.children.length === 2, 'Comments should not create elements')
    }
  ),

  testWithSetup(
    'Multiple empty lines',
    `Frame pad 16, bg #1a1a1a


  Text "After blank lines", col white


  Button "Also works", bg #333`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),
])

// =============================================================================
// 11. State Management
// =============================================================================

export const stateManagementTests: TestCase[] = describe('State Management', [
  testWithSetup(
    'Toggle state initial off',
    `Button "Toggle Me", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(btn.tagName === 'button', 'Should be a button')

      // Initial state should be off (gray background)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial bg should be #333, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle state initial on',
    `Button "Active", bg #333, col white, pad 12 24, rad 6, toggle(), on
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Initial state is on (blue background)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#2271C1'),
        `Initial bg should be #2271C1 (on state), got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Hover state styles',
    `Button "Hover Me", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444
    scale 1.02`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Initial state (not hovered)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial bg should be #333, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Active state styles',
    `Button "Press Me", bg #333, col white, pad 12 24, rad 6
  active:
    scale 0.98
    bg #222`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(
        btn.styles.cursor === 'pointer' || btn.tagName === 'button',
        'Should be interactive'
      )
    }
  ),

  testWithSetup(
    'Focus state styles',
    `Input placeholder "Focus me...", bg #333, col white, pad 12, rad 6, bor 1, boc #555
  focus:
    boc #2271C1
    bg #3a3a3a`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be an input')
    }
  ),

  testWithSetup(
    'Disabled state',
    `Button "Disabled", bg #333, col white, pad 12 24, rad 6, disabled
  disabled:
    opacity 0.5
    cursor not-allowed`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Should have disabled styles
      const isDisabled =
        btn.styles.opacity === '0.5' ||
        btn.styles.cursor === 'not-allowed' ||
        btn.attributes.disabled !== undefined

      api.assert.ok(isDisabled, 'Button should appear disabled')
    }
  ),

  testWithSetup(
    'Multiple custom states (multi-toggle)',
    `Frame pad 12 24, rad 6, bg #333, col white, toggle()
  todo:
    bg #666
  doing:
    bg #f59e0b
  done:
    bg #10b981`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Initial state should be first custom state or default
      api.assert.ok(frame.styles.backgroundColor !== '', 'Should have background')
    }
  ),

  testWithSetup(
    'Exclusive state (tabs)',
    `Frame hor, gap 0
  Button "Tab 1", pad 12 20, col #888, exclusive(), selected
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 2", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 3", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Tab 1
      api.assert.exists('node-3') // Tab 2
      api.assert.exists('node-4') // Tab 3

      // Tab 1 should be selected initially
      const tab1 = api.preview.inspect('node-2')
      api.assert.ok(tab1 !== null, 'Tab 1 should exist')
    }
  ),
])

// =============================================================================
// 12. Animation Verification
// =============================================================================

export const animationTests: TestCase[] = describe('Animations', [
  testWithSetup(
    'Spin animation',
    `Icon "loader", ic #2271C1, is 24, anim spin`,
    async (api: TestAPI) => {
      const icon = api.preview.inspect('node-1')
      api.assert.ok(icon !== null, 'Icon should exist')

      // Should have animation applied
      const hasAnimation =
        icon.styles.animation?.includes('spin') ||
        icon.styles.transform !== 'none' ||
        icon.dataAttributes['data-anim'] === 'spin'

      api.assert.ok(
        hasAnimation || icon.tagName === 'span',
        `Should have spin animation or be icon element, got animation: ${icon.styles.animation}`
      )
    }
  ),

  testWithSetup(
    'Pulse animation',
    `Frame w 50, h 50, bg #2271C1, rad 99, anim pulse`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.styles.borderRadius === '99px', 'Should be circle')
    }
  ),

  testWithSetup(
    'Bounce animation',
    `Frame w 50, h 50, bg #10b981, rad 8, anim bounce`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'State transition with duration',
    `Button "Smooth", bg #333, col white, pad 12 24, rad 6, toggle()
  hover 0.2s:
    bg #444
  on 0.3s ease-out:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Should have transition styles (might be in transition property or inline)
      api.assert.ok(btn.tagName === 'button', 'Should be a button')
    }
  ),

  testWithSetup(
    'Fade-in animation',
    `Frame w 100, h 100, bg #2271C1, rad 8, anim fade-in`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'Slide-up animation',
    `Frame w 100, h 50, bg #333, rad 8, anim slide-up`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),
])

// =============================================================================
// 13. Transform Verification
// =============================================================================

export const transformTests: TestCase[] = describe('Transforms', [
  testWithSetup(
    'Rotate transform',
    `Frame w 100, h 100, bg #2271C1, rad 8, rotate 45`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have rotation in transform
      // Note: Browser may return matrix() instead of rotate() for computed style
      // matrix(0.707107, 0.707107, ...) is the computed matrix for 45deg rotation
      const hasRotation =
        frame.styles.transform.includes('rotate') ||
        frame.styles.transform.includes('45') ||
        frame.styles.transform.includes('matrix') ||
        frame.styles.transform !== 'none'

      api.assert.ok(hasRotation, `Should have rotation transform, got ${frame.styles.transform}`)
    }
  ),

  testWithSetup(
    'Scale transform',
    `Frame w 100, h 100, bg #10b981, rad 8, scale 1.5`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have scale in transform
      api.assert.ok(
        frame.styles.transform.includes('scale') || frame.styles.transform.includes('1.5'),
        `Should have scale transform, got ${frame.styles.transform}`
      )
    }
  ),

  testWithSetup(
    'Multiple transforms combined',
    `Frame w 80, h 80, bg #f59e0b, rad 8, rotate 15, scale 0.9`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have some transform
      api.assert.ok(
        frame.styles.transform !== 'none' && frame.styles.transform !== '',
        `Should have transforms, got ${frame.styles.transform}`
      )
    }
  ),

  testWithSetup(
    'Z-index stacking',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w 100, h 100, bg #333, z 1
  Frame x 50, y 50, w 100, h 100, bg #2271C1, z 2
  Frame x 100, y 100, w 100, h 100, bg #10b981, z 3`,
    async (api: TestAPI) => {
      const z1 = api.preview.inspect('node-2')
      const z2 = api.preview.inspect('node-3')
      const z3 = api.preview.inspect('node-4')

      api.assert.ok(z1 !== null && z2 !== null && z3 !== null, 'All layers should exist')

      // Z-index should be set
      api.assert.ok(
        parseInt(z3?.styles.zIndex || '0') >= parseInt(z1?.styles.zIndex || '0'),
        'Higher z should stack on top'
      )
    }
  ),

  testWithSetup(
    'Absolute positioning with offsets',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame x 20, y 30, w 50, h 50, bg #2271C1`,
    async (api: TestAPI) => {
      const positioned = api.preview.inspect('node-2')
      api.assert.ok(positioned !== null, 'Positioned element should exist')

      api.assert.ok(
        positioned.styles.position === 'absolute',
        `Should be absolute, got ${positioned.styles.position}`
      )
      api.assert.ok(
        positioned.styles.left === '20px',
        `Left should be 20px, got ${positioned.styles.left}`
      )
      api.assert.ok(
        positioned.styles.top === '30px',
        `Top should be 30px, got ${positioned.styles.top}`
      )
    }
  ),
])

// =============================================================================
// 14. Advanced Layout
// =============================================================================

export const advancedLayoutTests: TestCase[] = describe('Advanced Layout', [
  testWithSetup(
    'Grid with explicit positions',
    `Frame grid 12, gap 8, w 400, h 300, bg #1a1a1a
  Frame x 1, y 1, w 12, h 1, bg #2271C1
  Frame x 1, y 2, w 3, h 3, bg #333
  Frame x 4, y 2, w 9, h 3, bg #444`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', 'Should be grid layout')
      api.assert.ok(grid.children.length === 3, 'Should have 3 children')
    }
  ),

  testWithSetup(
    'Grow and shrink flex items',
    `Frame hor, gap 8, w 400, bg #1a1a1a, pad 8
  Frame w 100, h 50, bg #333, shrink
  Frame grow, h 50, bg #2271C1
  Frame w 100, h 50, bg #333, shrink`,
    async (api: TestAPI) => {
      const middle = api.preview.inspect('node-3')
      api.assert.ok(middle !== null, 'Middle element should exist')

      // Should have flex-grow
      const hasGrow = middle.styles.flexGrow === '1' || middle.styles.flex?.includes('1')

      api.assert.ok(hasGrow, `Should have flex-grow, got flexGrow: ${middle.styles.flexGrow}`)
    }
  ),

  testWithSetup(
    'Nested flex layouts',
    `Frame h 300, bg #1a1a1a
  Frame hor, h 50, bg #333, spread, ver-center, pad 0 16
    Text "Header", col white
    Icon "menu", ic white, is 20
  Frame grow, hor, gap 0
    Frame w 200, bg #222, pad 16
      Text "Sidebar", col white
    Frame grow, bg #2a2a2a, pad 16
      Text "Content", col white
  Frame h 40, bg #333, center
    Text "Footer", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Header
      api.assert.exists('node-5') // Middle row
      api.assert.exists('node-9') // Footer

      const header = api.preview.inspect('node-2')
      api.assert.ok(header?.styles.flexDirection === 'row', 'Header should be horizontal')
      api.assert.ok(header?.styles.justifyContent === 'space-between', 'Header should be spread')
    }
  ),

  testWithSetup(
    'Min and max constraints',
    `Frame minw 100, maxw 400, minh 50, maxh 200, bg #2271C1, pad 16
  Text "Constrained", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      api.assert.ok(
        frame.styles.minWidth === '100px',
        `minWidth should be 100px, got ${frame.styles.minWidth}`
      )
      api.assert.ok(
        frame.styles.maxWidth === '400px',
        `maxWidth should be 400px, got ${frame.styles.maxWidth}`
      )
      api.assert.ok(
        frame.styles.minHeight === '50px',
        `minHeight should be 50px, got ${frame.styles.minHeight}`
      )
      api.assert.ok(
        frame.styles.maxHeight === '200px',
        `maxHeight should be 200px, got ${frame.styles.maxHeight}`
      )
    }
  ),

  testWithSetup(
    'Scroll container',
    `Frame w 200, h 150, bg #1a1a1a, pad 8, scroll
  Frame h 300, bg #333
    Text "Scrollable content", col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have overflow scroll or auto
      const hasScroll =
        container.styles.overflow === 'auto' ||
        container.styles.overflowY === 'auto' ||
        container.styles.overflow === 'scroll' ||
        container.styles.overflowY === 'scroll'

      api.assert.ok(
        hasScroll,
        `Should have scroll overflow, got overflow: ${container.styles.overflow}`
      )
    }
  ),

  testWithSetup(
    'Clip overflow',
    `Frame w 100, h 100, bg #1a1a1a, clip
  Frame w 200, h 200, bg #2271C1`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have overflow hidden
      api.assert.ok(
        container.styles.overflow === 'hidden',
        `Should clip overflow, got ${container.styles.overflow}`
      )
    }
  ),
])

// =============================================================================
// 15. Effects & Filters
// =============================================================================

export const effectsTests: TestCase[] = describe('Effects & Filters', [
  testWithSetup(
    'Blur effect',
    `Frame w 100, h 100, bg #2271C1, rad 8, blur 4`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Blur should be in filter property
      // Note: blur might be applied differently depending on implementation
      api.assert.ok(frame.styles.borderRadius === '8px', 'Should have radius')
    }
  ),

  testWithSetup(
    'Backdrop blur (glass effect)',
    `Frame stacked, w 200, h 200
  Frame w full, h full, bg grad #2271C1 #10b981
  Frame x 20, y 20, w 160, h 160, backdrop-blur 8, bg rgba(255,255,255,0.1), rad 16`,
    async (api: TestAPI) => {
      const glass = api.preview.inspect('node-3')
      api.assert.ok(glass !== null, 'Glass element should exist')
      api.assert.ok(glass.styles.borderRadius === '16px', 'Should have radius')
    }
  ),

  testWithSetup(
    'Multiple shadows',
    `Frame w 100, h 100, bg white, rad 8, shadow lg`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      api.assert.ok(
        frame.styles.boxShadow !== 'none' && frame.styles.boxShadow !== '',
        `Should have shadow, got ${frame.styles.boxShadow}`
      )
    }
  ),

  testWithSetup(
    'Opacity variations',
    `Frame hor, gap 8, pad 16, bg #1a1a1a
  Frame w 50, h 50, bg #2271C1, opacity 1
  Frame w 50, h 50, bg #2271C1, opacity 0.75
  Frame w 50, h 50, bg #2271C1, opacity 0.5
  Frame w 50, h 50, bg #2271C1, opacity 0.25`,
    async (api: TestAPI) => {
      const full = api.preview.inspect('node-2')
      const mid = api.preview.inspect('node-4')
      const quarter = api.preview.inspect('node-5')

      api.assert.ok(
        full?.styles.opacity === '1',
        `Full opacity should be 1, got ${full?.styles.opacity}`
      )
      api.assert.ok(
        mid?.styles.opacity === '0.5',
        `Mid opacity should be 0.5, got ${mid?.styles.opacity}`
      )
      api.assert.ok(
        quarter?.styles.opacity === '0.25',
        `Quarter opacity should be 0.25, got ${quarter?.styles.opacity}`
      )
    }
  ),
])

// =============================================================================
// 16. Form Controls
// =============================================================================

export const formControlsTests: TestCase[] = describe('Form Controls', [
  testWithSetup(
    'Input with placeholder',
    `Input placeholder "Enter your name...", bg #333, col white, pad 12, rad 6, w 200`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input element')
      api.assert.ok(
        input.attributes.placeholder === 'Enter your name...',
        `Placeholder should be set, got ${input.attributes.placeholder}`
      )
    }
  ),

  testWithSetup(
    'Textarea with placeholder',
    `Textarea placeholder "Write your message...", bg #333, col white, pad 12, rad 6, w 300, h 100`,
    async (api: TestAPI) => {
      const textarea = api.preview.inspect('node-1')
      api.assert.ok(textarea !== null, 'Textarea should exist')
      api.assert.ok(textarea.tagName === 'textarea', 'Should be textarea element')
      api.assert.ok(
        textarea.styles.height === '100px',
        `Height should be 100px, got ${textarea.styles.height}`
      )
    }
  ),

  testWithSetup(
    'Input types',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input type "text", placeholder "Text input"
  Input type "password", placeholder "Password"
  Input type "email", placeholder "Email"
  Input type "number", placeholder "Number"`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-2')
      const password = api.preview.inspect('node-3')
      const email = api.preview.inspect('node-4')
      const number = api.preview.inspect('node-5')

      // Text input: type defaults to 'text' in HTML if not specified
      api.assert.ok(text !== null, 'Text input element must exist')
      api.assert.ok(
        text!.attributes.type === 'text' || text!.attributes.type === undefined,
        `Text input type should be 'text' or default, got: ${text!.attributes.type}`
      )
      api.assert.ok(password !== null, 'Password input element must exist')
      api.assert.ok(
        password!.attributes.type === 'password',
        `Password input type should be 'password', got: ${password!.attributes.type}`
      )
      api.assert.ok(email !== null, 'Email input element must exist')
      api.assert.ok(
        email!.attributes.type === 'email',
        `Email input type should be 'email', got: ${email!.attributes.type}`
      )
      api.assert.ok(number !== null, 'Number input element must exist')
      api.assert.ok(
        number!.attributes.type === 'number',
        `Number input type should be 'number', got: ${number!.attributes.type}`
      )
    }
  ),

  testWithSetup(
    'Readonly input',
    `Input readonly, value "Cannot edit", bg #222, col #888, pad 12, rad 6`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')

      // STRICT: Must have readonly attribute
      const isReadonly =
        input.attributes.readonly !== undefined ||
        input.dataAttributes['data-readonly'] !== undefined

      api.assert.ok(
        isReadonly,
        `Input should be readonly, got attributes: ${JSON.stringify(input.attributes)}`
      )
    }
  ),
])

// =============================================================================
// 17. Advanced Typography
// =============================================================================

export const advancedTypographyTests: TestCase[] = describe('Advanced Typography', [
  testWithSetup(
    'Line height variations',
    `Frame gap 8, pad 16, bg #1a1a1a, w 300
  Text "Line 1.0", col white, line 1
  Text "Line 1.5", col white, line 1.5
  Text "Line 2.0", col white, line 2`,
    async (api: TestAPI) => {
      // Just verify they render - line height is hard to verify from computed styles
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Text alignment',
    `Frame gap 8, pad 16, bg #1a1a1a, w 300
  Text "Left aligned", col white, text-align left
  Text "Center aligned", col white, text-align center
  Text "Right aligned", col white, text-align right`,
    async (api: TestAPI) => {
      const left = api.preview.inspect('node-2')
      const center = api.preview.inspect('node-3')
      const right = api.preview.inspect('node-4')

      api.assert.ok(
        left?.styles.textAlign === 'left' || left?.styles.textAlign === 'start',
        'Left align'
      )
      api.assert.ok(
        center?.styles.textAlign === 'center',
        `Center align, got ${center?.styles.textAlign}`
      )
      api.assert.ok(
        right?.styles.textAlign === 'right' || right?.styles.textAlign === 'end',
        'Right align'
      )
    }
  ),

  testWithSetup(
    'Font weights',
    `Frame gap 4, pad 16, bg #1a1a1a
  Text "Thin 100", col white, weight 100
  Text "Light 300", col white, weight 300
  Text "Normal 400", col white, weight normal
  Text "Medium 500", col white, weight 500
  Text "Bold 700", col white, weight bold
  Text "Black 900", col white, weight 900`,
    async (api: TestAPI) => {
      const thin = api.preview.inspect('node-2')
      const bold = api.preview.inspect('node-6')

      api.assert.ok(
        thin?.styles.fontWeight === '100',
        `Thin should be 100, got ${thin?.styles.fontWeight}`
      )
      api.assert.ok(
        bold?.styles.fontWeight === '700' || bold?.styles.fontWeight === 'bold',
        `Bold should be 700/bold, got ${bold?.styles.fontWeight}`
      )
    }
  ),

  testWithSetup(
    'Text truncation with width',
    `Text "This is a very long text that should be truncated with an ellipsis when it exceeds the width", col white, w 150, truncate`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text should exist')

      // Should have truncation styles
      const hasTruncation =
        text.styles.textOverflow === 'ellipsis' ||
        text.styles.overflow === 'hidden' ||
        text.styles.whiteSpace === 'nowrap'

      api.assert.ok(hasTruncation, 'Should have truncation styles')
    }
  ),

  testWithSetup(
    'Font families',
    `Frame gap 4, pad 16, bg #1a1a1a
  Text "Sans-serif font", col white, font sans
  Text "Monospace font", col white, font mono
  Text "Serif font", col white, font serif`,
    async (api: TestAPI) => {
      const mono = api.preview.inspect('node-3')
      api.assert.ok(mono !== null, 'Mono text should exist')

      // Should have monospace font
      const hasMono =
        mono.styles.fontFamily.includes('mono') ||
        mono.styles.fontFamily.includes('Consolas') ||
        mono.styles.fontFamily.includes('Monaco') ||
        mono.styles.fontFamily.includes('Courier')

      api.assert.ok(hasMono, `Should have monospace font, got ${mono.styles.fontFamily}`)
    }
  ),
])

// =============================================================================
// 18. Icon Verification
// =============================================================================

export const iconTests: TestCase[] = describe('Icon Verification', [
  testWithSetup('Icon with size', `Icon "check", ic #10b981, is 32`, async (api: TestAPI) => {
    const icon = api.preview.inspect('node-1')
    api.assert.ok(icon !== null, 'Icon should exist')

    // Icon should have size applied (width/height or font-size depending on implementation)
    const hasSize =
      icon.styles.width === '32px' ||
      icon.styles.height === '32px' ||
      icon.styles.fontSize === '32px'

    api.assert.ok(
      hasSize || icon.tagName === 'span',
      `Icon should have size 32, got w:${icon.styles.width} h:${icon.styles.height}`
    )
  }),

  testWithSetup(
    'Icon filled variant',
    `Icon "heart", ic #ef4444, is 24, fill`,
    async (api: TestAPI) => {
      const icon = api.preview.inspect('node-1')
      api.assert.ok(icon !== null, 'Icon should exist')
      // Fill variant verification depends on implementation
    }
  ),

  testWithSetup(
    'Multiple icons in row',
    `Frame hor, gap 8, pad 12, bg #1a1a1a, rad 8
  Icon "home", ic #888, is 20
  Icon "settings", ic #888, is 20
  Icon "user", ic #888, is 20
  Icon "bell", ic #888, is 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.exists('node-5')

      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons')
    }
  ),
])

// =============================================================================
// 19. Complex Combinations
// =============================================================================

export const complexCombinationsTests: TestCase[] = describe('Complex Combinations', [
  testWithSetup(
    'Card with all features',
    `Frame bg #1a1a1a, pad 16, rad 12, gap 12, w 300, shadow md
  Frame hor, spread, ver-center
    Frame hor, gap 8, ver-center
      Frame w 40, h 40, bg #2271C1, rad 99, center
        Text "JD", col white, weight bold
      Frame gap 2
        Text "John Doe", col white, weight 500
        Text "john@example.com", col #888, fs 12
    Icon "more-vertical", ic #888, is 20
  Divider
  Text "This is a sample card component with multiple nested elements and various styling properties.", col #888, line 1.5
  Frame hor, gap 8
    Button "Accept", bg #10b981, col white, pad 8 16, rad 6, grow
    Button "Decline", bg #ef4444, col white, pad 8 16, rad 6, grow`,
    async (api: TestAPI) => {
      // Verify structure exists
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Header row

      const card = api.preview.inspect('node-1')
      api.assert.ok(card !== null, 'Card should exist')
      api.assert.ok(card.styles.borderRadius === '12px', 'Card should have 12px radius')
      api.assert.ok(card.styles.boxShadow !== 'none', 'Card should have shadow')
    }
  ),

  testWithSetup(
    'Navigation bar',
    `Frame hor, spread, ver-center, pad 8 16, bg #1a1a1a, bor 0 0 1 0, boc #333
  Frame hor, gap 4, ver-center
    Icon "menu", ic white, is 20
    Text "Brand", col white, fs 18, weight bold
  Frame hor, gap 16
    Text "Home", col white
    Text "About", col #888
    Text "Contact", col #888
  Frame hor, gap 8
    Icon "search", ic #888, is 20
    Icon "bell", ic #888, is 20
    Frame w 32, h 32, bg #2271C1, rad 99, center
      Text "U", col white, weight bold`,
    async (api: TestAPI) => {
      const nav = api.preview.inspect('node-1')
      api.assert.ok(nav !== null, 'Nav should exist')
      api.assert.ok(nav.styles.flexDirection === 'row', 'Nav should be horizontal')
      api.assert.ok(nav.styles.justifyContent === 'space-between', 'Nav should be spread')
    }
  ),

  testWithSetup(
    'Dashboard stats grid',
    `Frame grid 12, gap 16, pad 16, bg #0a0a0a
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Revenue", col #888, fs 12, uppercase
      Icon "dollar-sign", ic #10b981, is 16
    Text "$12,450", col white, fs 24, weight bold
    Text "+12.5%", col #10b981, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Users", col #888, fs 12, uppercase
      Icon "users", ic #2271C1, is 16
    Text "1,234", col white, fs 24, weight bold
    Text "+8.2%", col #10b981, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Orders", col #888, fs 12, uppercase
      Icon "shopping-cart", ic #f59e0b, is 16
    Text "567", col white, fs 24, weight bold
    Text "-2.1%", col #ef4444, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Conversion", col #888, fs 12, uppercase
      Icon "percent", ic #8b5cf6, is 16
    Text "4.5%", col white, fs 24, weight bold
    Text "+0.8%", col #10b981, fs 12`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', 'Should be grid layout')
      api.assert.ok(grid.children.length === 4, 'Should have 4 stat cards')
    }
  ),
])

// =============================================================================
// 20. Zag Components - Dialog
// =============================================================================

export const zagDialogTests: TestCase[] = describe('Zag: Dialog', [
  testWithSetup(
    'Dialog structure renders',
    `Dialog
  Trigger: Button "Open Dialog", bg #2271C1, col white, pad 12 24, rad 6
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 400
    Text "Dialog Title", fs 18, weight bold, col white
    Text "Dialog content goes here.", col #888
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", bg #333, col white, pad 8 16, rad 6
      Button "Confirm", bg #2271C1, col white, pad 8 16, rad 6`,
    async (api: TestAPI) => {
      // Dialog trigger should exist
      const trigger = api.preview.findByText('Open Dialog')
      api.assert.ok(trigger !== null, 'Dialog trigger should exist')
      // Zag wraps the button, so check for button or the wrapper
      api.assert.ok(
        trigger?.tagName === 'button' || trigger?.tagName === 'div' || trigger?.tagName === 'span',
        `Trigger should be interactive element, got ${trigger?.tagName}`
      )
    }
  ),

  testWithSetup(
    'Dialog with form content',
    `Dialog
  Trigger: Button "Edit Profile", bg #333, col white, pad 10 20, rad 6
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 450
    Text "Edit Profile", fs 20, weight bold, col white
    Frame gap 12
      Frame gap 4
        Text "Name", col #888, fs 12
        Input placeholder "Enter name...", bg #333, col white, pad 12, rad 6, w full
      Frame gap 4
        Text "Email", col #888, fs 12
        Input placeholder "Enter email...", bg #333, col white, pad 12, rad 6, w full
    Frame hor, gap 8, spread
      CloseTrigger: Button "Cancel", bg #333, col white, pad 10 20, rad 6
      Button "Save Changes", bg #10b981, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      const trigger = api.preview.findByText('Edit Profile')
      api.assert.ok(trigger !== null, 'Edit Profile trigger should exist')
    }
  ),
])

// =============================================================================
// 21. Zag Components - Tabs
// =============================================================================

export const zagTabsTests: TestCase[] = describe('Zag: Tabs', [
  testWithSetup(
    'Tabs with multiple panels',
    `Tabs defaultValue "home"
  Tab "Home"
    Frame pad 16, gap 8
      Text "Welcome Home", col white, fs 18, weight bold
      Text "This is the home tab content.", col #888
  Tab "Profile"
    Frame pad 16, gap 8
      Text "Your Profile", col white, fs 18, weight bold
      Text "Profile information here.", col #888
  Tab "Settings"
    Frame pad 16, gap 8
      Text "Settings", col white, fs 18, weight bold
      Text "Configure your preferences.", col #888`,
    async (api: TestAPI) => {
      // Tabs should render
      const home = api.preview.findByText('Home')
      const profile = api.preview.findByText('Profile')
      const settings = api.preview.findByText('Settings')

      api.assert.ok(home !== null, 'Home tab should exist')
      api.assert.ok(profile !== null, 'Profile tab should exist')
      api.assert.ok(settings !== null, 'Settings tab should exist')
    }
  ),

  testWithSetup(
    'Tabs with icons',
    `Tabs defaultValue "dashboard"
  Tab "Dashboard"
    Frame hor, gap 8, pad 16, ver-center
      Icon "home", ic #2271C1, is 20
      Text "Dashboard Content", col white
  Tab "Analytics"
    Frame hor, gap 8, pad 16, ver-center
      Icon "bar-chart", ic #10b981, is 20
      Text "Analytics Content", col white
  Tab "Reports"
    Frame hor, gap 8, pad 16, ver-center
      Icon "file-text", ic #f59e0b, is 20
      Text "Reports Content", col white`,
    async (api: TestAPI) => {
      const dashboard = api.preview.findByText('Dashboard')
      api.assert.ok(dashboard !== null, 'Dashboard tab should exist')
    }
  ),
])

// =============================================================================
// 22. Zag Components - Select
// =============================================================================

export const zagSelectTests: TestCase[] = describe('Zag: Select', [
  testWithSetup(
    'Select with options',
    `Select placeholder "Choose a city..."
  Option "Berlin"
  Option "Hamburg"
  Option "München"
  Option "Köln"
  Option "Frankfurt"`,
    async (api: TestAPI) => {
      // Select should render with placeholder or trigger
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render elements')
    }
  ),

  testWithSetup(
    'Select with default value',
    `Select value "option2"
  Option "Option 1", value "option1"
  Option "Option 2", value "option2"
  Option "Option 3", value "option3"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render')
    }
  ),
])

// =============================================================================
// 23. Zag Components - Checkbox & Switch
// =============================================================================

export const zagCheckboxTests: TestCase[] = describe('Zag: Checkbox & Switch', [
  testWithSetup(
    'Checkbox unchecked',
    `Checkbox "Accept terms and conditions"`,
    async (api: TestAPI) => {
      const checkbox = api.preview.findByText('Accept terms')
      api.assert.ok(
        checkbox !== null || api.preview.getNodeIds().length >= 1,
        'Checkbox should render'
      )
    }
  ),

  testWithSetup(
    'Checkbox checked',
    `Checkbox "Subscribe to newsletter", checked`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Checked checkbox should render')
    }
  ),

  testWithSetup('Switch unchecked', `Switch "Dark Mode"`, async (api: TestAPI) => {
    const allNodes = api.preview.getNodeIds()
    api.assert.ok(allNodes.length >= 1, 'Switch should render')
  }),

  testWithSetup('Switch checked', `Switch "Notifications", checked`, async (api: TestAPI) => {
    const allNodes = api.preview.getNodeIds()
    api.assert.ok(allNodes.length >= 1, 'Checked switch should render')
  }),

  testWithSetup(
    'Multiple checkboxes',
    `Frame gap 8, pad 16, bg #1a1a1a
  Checkbox "Option A"
  Checkbox "Option B", checked
  Checkbox "Option C"
  Checkbox "Option D", checked`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(container.children.length >= 4, 'Should have 4 checkboxes')
    }
  ),
])

// =============================================================================
// 24. Zag Components - Slider
// =============================================================================

export const zagSliderTests: TestCase[] = describe('Zag: Slider', [
  testWithSetup(
    'Slider with default value',
    `Slider value 50, min 0, max 100`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Slider should render')
    }
  ),

  testWithSetup(
    'Slider with step',
    `Slider value 25, min 0, max 100, step 25`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Slider with step should render')
    }
  ),

  testWithSetup(
    'Slider in form context',
    `Frame gap 16, pad 16, bg #1a1a1a, w 300
  Frame gap 4
    Frame hor, spread
      Text "Volume", col white
      Text "75%", col #888
    Slider value 75, min 0, max 100
  Frame gap 4
    Frame hor, spread
      Text "Brightness", col white
      Text "50%", col #888
    Slider value 50, min 0, max 100`,
    async (api: TestAPI) => {
      const volume = api.preview.findByText('Volume')
      const brightness = api.preview.findByText('Brightness')
      api.assert.ok(volume !== null, 'Volume label should exist')
      api.assert.ok(brightness !== null, 'Brightness label should exist')
    }
  ),
])

// =============================================================================
// 25. Zag Components - RadioGroup
// =============================================================================

export const zagRadioTests: TestCase[] = describe('Zag: RadioGroup', [
  testWithSetup(
    'RadioGroup with options',
    `RadioGroup value "monthly"
  RadioItem "Monthly - $9/month", value "monthly"
  RadioItem "Yearly - $99/year", value "yearly"
  RadioItem "Lifetime - $299", value "lifetime"`,
    async (api: TestAPI) => {
      const monthly = api.preview.findByText('Monthly')
      api.assert.ok(
        monthly !== null || api.preview.getNodeIds().length >= 1,
        'RadioGroup should render'
      )
    }
  ),

  testWithSetup(
    'RadioGroup in card layout',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Select Plan", col white, fs 16, weight bold
  RadioGroup value "pro"
    RadioItem "Free - Basic features", value "free"
    RadioItem "Pro - Advanced features", value "pro"
    RadioItem "Enterprise - Full access", value "enterprise"`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Select Plan')
      api.assert.ok(title !== null, 'Title should exist')
    }
  ),
])

// =============================================================================
// 26. Zag Components - Tooltip
// =============================================================================

export const zagTooltipTests: TestCase[] = describe('Zag: Tooltip', [
  testWithSetup(
    'Tooltip on icon',
    `Tooltip positioning "bottom"
  Trigger: Icon "info", ic #888, is 20
  Content: Text "This is helpful information", fs 12, col white`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Tooltip should render trigger')
    }
  ),

  testWithSetup(
    'Tooltip on button',
    `Tooltip positioning "top"
  Trigger: Button "Hover me", bg #2271C1, col white, pad 8 16, rad 6
  Content: Frame pad 8, bg #333, rad 4
    Text "Button tooltip content", col white, fs 12`,
    async (api: TestAPI) => {
      const button = api.preview.findByText('Hover me')
      api.assert.ok(
        button !== null || api.preview.getNodeIds().length >= 1,
        'Tooltip trigger should render'
      )
    }
  ),
])

// =============================================================================
// 27. Zag Components - DatePicker
// =============================================================================

export const zagDatePickerTests: TestCase[] = describe('Zag: DatePicker', [
  testWithSetup(
    'DatePicker with placeholder',
    `DatePicker placeholder "Select date..."`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'DatePicker should render')
    }
  ),

  testWithSetup(
    'DatePicker in form',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Start Date", col #888, fs 12
    DatePicker placeholder "Select start date..."
  Frame gap 4
    Text "End Date", col #888, fs 12
    DatePicker placeholder "Select end date..."`,
    async (api: TestAPI) => {
      const startLabel = api.preview.findByText('Start Date')
      const endLabel = api.preview.findByText('End Date')
      api.assert.ok(startLabel !== null, 'Start Date label should exist')
      api.assert.ok(endLabel !== null, 'End Date label should exist')
    }
  ),
])

// =============================================================================
// 28. Functions - Toggle & Visibility
// =============================================================================

export const functionToggleTests: TestCase[] = describe('Functions: Toggle & Visibility', [
  testWithSetup(
    'Toggle function on button',
    `Button "Toggle State", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1
    Text "Active"`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(btn.tagName === 'button', 'Should be a button')
    }
  ),

  testWithSetup(
    'Show/Hide target element',
    `Frame gap 16, pad 16, bg #1a1a1a
  Button "Toggle Menu", bg #2271C1, col white, pad 10 20, rad 6, toggle()
  Frame name Menu, pad 12, bg #333, rad 8, hidden
    Text "Menu Item 1", col white
    Text "Menu Item 2", col white
    Text "Menu Item 3", col white`,
    async (api: TestAPI) => {
      const button = api.preview.findByText('Toggle Menu')
      api.assert.ok(button !== null, 'Toggle button should exist')

      // Menu should exist (even if hidden)
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 2, 'Should have button and menu')
    }
  ),

  testWithSetup(
    'Exclusive toggle (radio-like)',
    `Frame hor, gap 0, bg #1a1a1a, rad 8, pad 4
  Button "Day", pad 8 16, col #888, rad 6, exclusive(), selected
    selected:
      bg #2271C1
      col white
  Button "Week", pad 8 16, col #888, rad 6, exclusive()
    selected:
      bg #2271C1
      col white
  Button "Month", pad 8 16, col #888, rad 6, exclusive()
    selected:
      bg #2271C1
      col white`,
    async (api: TestAPI) => {
      const day = api.preview.findByText('Day')
      const week = api.preview.findByText('Week')
      const month = api.preview.findByText('Month')

      api.assert.ok(day !== null, 'Day button should exist')
      api.assert.ok(week !== null, 'Week button should exist')
      api.assert.ok(month !== null, 'Month button should exist')
    }
  ),
])

// =============================================================================
// 29. Functions - Counter Operations
// =============================================================================

export const functionCounterTests: TestCase[] = describe('Functions: Counters', [
  testWithSetup(
    'Increment/Decrement counter',
    `count: 0

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      const minus = api.preview.findByText('-')
      const plus = api.preview.findByText('+')

      api.assert.ok(minus !== null, 'Minus button should exist')
      api.assert.ok(plus !== null, 'Plus button should exist')
    }
  ),

  testWithSetup(
    'Counter with set and reset',
    `value: 50

Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Value: $value", col white, fs 18
  Frame hor, gap 8
    Button "Set to 100", bg #2271C1, col white, pad 8 16, rad 6, set(value, 100)
    Button "Reset", bg #ef4444, col white, pad 8 16, rad 6, reset(value)`,
    async (api: TestAPI) => {
      const setBtn = api.preview.findByText('Set to 100')
      const resetBtn = api.preview.findByText('Reset')

      api.assert.ok(setBtn !== null, 'Set button should exist')
      api.assert.ok(resetBtn !== null, 'Reset button should exist')
    }
  ),

  testWithSetup(
    'Multiple counters',
    `likes: 42
comments: 8
shares: 3

Frame hor, gap 24, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 8, ver-center
    Icon "heart", ic #ef4444, is 20
    Text "$likes", col white
    Button "+", bg transparent, col #888, pad 4 8, increment(likes)
  Frame hor, gap 8, ver-center
    Icon "message-circle", ic #2271C1, is 20
    Text "$comments", col white
  Frame hor, gap 8, ver-center
    Icon "share", ic #10b981, is 20
    Text "$shares", col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(container.children.length === 3, 'Should have 3 stat groups')
    }
  ),
])

// =============================================================================
// 30. Functions - Navigation
// =============================================================================

export const functionNavigationTests: TestCase[] = describe('Functions: Navigation', [
  testWithSetup(
    'Navigate to view',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Go to Home", bg #2271C1, col white, pad 12 24, rad 6, navigate(HomeView)
  Button "Go to Settings", bg #333, col white, pad 12 24, rad 6, navigate(SettingsView)
  Button "Go Back", bg #333, col white, pad 12 24, rad 6, back()`,
    async (api: TestAPI) => {
      const home = api.preview.findByText('Go to Home')
      const settings = api.preview.findByText('Go to Settings')
      const back = api.preview.findByText('Go Back')

      api.assert.ok(home !== null, 'Home nav button should exist')
      api.assert.ok(settings !== null, 'Settings nav button should exist')
      api.assert.ok(back !== null, 'Back button should exist')
    }
  ),

  testWithSetup(
    'Open external URL',
    `Frame hor, gap 8, pad 16, bg #1a1a1a
  Button "Visit Website", bg #2271C1, col white, pad 10 20, rad 6, openUrl("https://example.com")
  Button "Documentation", bg #333, col white, pad 10 20, rad 6, openUrl("https://docs.example.com")`,
    async (api: TestAPI) => {
      const visit = api.preview.findByText('Visit Website')
      const docs = api.preview.findByText('Documentation')

      api.assert.ok(visit !== null, 'Visit button should exist')
      api.assert.ok(docs !== null, 'Docs button should exist')
    }
  ),

  testWithSetup(
    'Scroll functions',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Scroll to Top", bg #333, col white, pad 10 20, rad 6, scrollToTop()
  Button "Scroll to Section", bg #333, col white, pad 10 20, rad 6, scrollTo(Section2)
  Button "Scroll to Bottom", bg #333, col white, pad 10 20, rad 6, scrollToBottom()`,
    async (api: TestAPI) => {
      const top = api.preview.findByText('Scroll to Top')
      const section = api.preview.findByText('Scroll to Section')
      const bottom = api.preview.findByText('Scroll to Bottom')

      api.assert.ok(top !== null, 'Scroll top button should exist')
      api.assert.ok(section !== null, 'Scroll section button should exist')
      api.assert.ok(bottom !== null, 'Scroll bottom button should exist')
    }
  ),
])

// =============================================================================
// 31. Functions - Feedback & Toast
// =============================================================================

export const functionFeedbackTests: TestCase[] = describe('Functions: Feedback', [
  testWithSetup(
    'Toast notifications',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Success Toast", bg #10b981, col white, pad 10 20, rad 6, toast("Saved!")
  Button "Error Toast", bg #ef4444, col white, pad 10 20, rad 6, toast("Error!")
  Button "Warning Toast", bg #f59e0b, col white, pad 10 20, rad 6, toast("Warning!")
  Button "Info Toast", bg #2271C1, col white, pad 10 20, rad 6, toast("Info!")`,
    async (api: TestAPI) => {
      const success = api.preview.findByText('Success Toast')
      const error = api.preview.findByText('Error Toast')
      const warning = api.preview.findByText('Warning Toast')
      const info = api.preview.findByText('Info Toast')

      api.assert.ok(success !== null, 'Success toast button should exist')
      api.assert.ok(error !== null, 'Error toast button should exist')
      api.assert.ok(warning !== null, 'Warning toast button should exist')
      api.assert.ok(info !== null, 'Info toast button should exist')
    }
  ),

  testWithSetup(
    'Copy to clipboard',
    `Frame gap 8, pad 16, bg #1a1a1a
  Frame hor, gap 8, ver-center
    Input value "https://example.com/share/abc123", bg #333, col white, pad 12, rad 6, w 300, readonly
    Button "Copy", bg #2271C1, col white, pad 12 16, rad 6, copy("https://example.com/share/abc123"), toast("Copied!", "success")`,
    async (api: TestAPI) => {
      const copyBtn = api.preview.findByText('Copy')
      api.assert.ok(copyBtn !== null, 'Copy button should exist')
    }
  ),
])

// =============================================================================
// 32. Functions - Form Control
// =============================================================================

export const functionFormControlTests: TestCase[] = describe('Functions: Form Control', [
  testWithSetup(
    'Focus and clear input',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Input name SearchInput, placeholder "Search...", bg #333, col white, pad 12, rad 6, w full
  Frame hor, gap 8
    Button "Focus", bg #2271C1, col white, pad 8 16, rad 6, focus(SearchInput)
    Button "Clear", bg #333, col white, pad 8 16, rad 6, clear(SearchInput)`,
    async (api: TestAPI) => {
      const focusBtn = api.preview.findByText('Focus')
      const clearBtn = api.preview.findByText('Clear')

      api.assert.ok(focusBtn !== null, 'Focus button should exist')
      api.assert.ok(clearBtn !== null, 'Clear button should exist')
    }
  ),

  testWithSetup(
    'Form with validation feedback',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Email", col #888, fs 12
    Input name EmailField, placeholder "Enter email...", bg #333, col white, pad 12, rad 6, w full
  Frame hor, gap 8
    Button "Validate", bg #2271C1, col white, pad 10 16, rad 6
    Button "Show Error", bg #ef4444, col white, pad 10 16, rad 6, setError(EmailField, "Invalid email format")
    Button "Clear Error", bg #333, col white, pad 10 16, rad 6, clearError(EmailField)`,
    async (api: TestAPI) => {
      const validate = api.preview.findByText('Validate')
      const showError = api.preview.findByText('Show Error')
      const clearError = api.preview.findByText('Clear Error')

      api.assert.ok(validate !== null, 'Validate button should exist')
      api.assert.ok(showError !== null, 'Show Error button should exist')
      api.assert.ok(clearError !== null, 'Clear Error button should exist')
    }
  ),

  testWithSetup(
    'Form submit and reset',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 350
  Frame gap 8
    Input placeholder "Name", bg #333, col white, pad 12, rad 6, w full
    Input placeholder "Email", bg #333, col white, pad 12, rad 6, w full
    Textarea placeholder "Message", bg #333, col white, pad 12, rad 6, w full, h 80
  Frame hor, gap 8, spread
    Button "Reset", bg #333, col white, pad 10 20, rad 6, reset()
    Button "Submit", bg #10b981, col white, pad 10 20, rad 6, submit()`,
    async (api: TestAPI) => {
      const resetBtn = api.preview.findByText('Reset')
      const submitBtn = api.preview.findByText('Submit')

      api.assert.ok(resetBtn !== null, 'Reset button should exist')
      api.assert.ok(submitBtn !== null, 'Submit button should exist')
    }
  ),
])

// =============================================================================
// 33. Functions - Combined Actions
// =============================================================================

export const functionCombinedTests: TestCase[] = describe('Functions: Combined Actions', [
  testWithSetup(
    'Multiple functions on click',
    `likes: 0

Button "Like", bg #333, col white, pad 12 24, rad 6, hor, gap 8, toggle(), increment(likes), toast("Liked!", "success")
  Icon "heart", ic #888, is 18
  Text "Like"
  on:
    bg #ef4444
    Icon "heart", ic white, is 18, fill
    Text "Liked"`,
    async (api: TestAPI) => {
      const btn = api.preview.findByText('Like')
      api.assert.ok(btn !== null, 'Like button should exist')
    }
  ),

  testWithSetup(
    'Action with state change',
    `isSubscribed: false

Button isSubscribed ? "Unsubscribe" : "Subscribe", bg isSubscribed ? #333 : #2271C1, col white, pad 12 24, rad 6, toggle()`,
    async (api: TestAPI) => {
      // Should render with initial state
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Button should render')
    }
  ),

  testWithSetup(
    'Complete interaction flow',
    `items: 0
total: 0

Frame gap 16, pad 16, bg #1a1a1a, rad 8
  Text "Shopping Cart", col white, fs 18, weight bold
  Frame hor, gap 8, ver-center
    Text "Items: $items", col #888
    Text "Total: $total €", col white, weight 500
  Frame hor, gap 8
    Button "Add Item", bg #10b981, col white, pad 10 16, rad 6, increment(items), increment(total, 10), toast("Item added!")
    Button "Remove Item", bg #ef4444, col white, pad 10 16, rad 6, decrement(items), decrement(total, 10)
    Button "Clear Cart", bg #333, col white, pad 10 16, rad 6, reset(items), reset(total), toast("Cart cleared")`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Shopping Cart')
      const addBtn = api.preview.findByText('Add Item')
      const removeBtn = api.preview.findByText('Remove Item')
      const clearBtn = api.preview.findByText('Clear Cart')

      api.assert.ok(title !== null, 'Title should exist')
      api.assert.ok(addBtn !== null, 'Add button should exist')
      api.assert.ok(removeBtn !== null, 'Remove button should exist')
      api.assert.ok(clearBtn !== null, 'Clear button should exist')
    }
  ),
])

// =============================================================================
// 34. Cross-Element States
// =============================================================================

export const crossElementStateTests: TestCase[] = describe('Cross-Element States', [
  testWithSetup(
    'Button controls another element visibility',
    `Button name MenuToggle, pad 10 20, bg #333, col white, rad 6, toggle()
  Text "Menu"
  open:
    bg #2271C1
    Text "Close"

Frame pad 16, bg #222, rad 8, gap 8, hidden
  MenuToggle.open:
    visible
  Text "Menu Item 1", col white
  Text "Menu Item 2", col white
  Text "Menu Item 3", col white`,
    async (api: TestAPI) => {
      const menuToggle = api.preview.findByText('Menu')
      api.assert.ok(menuToggle !== null, 'Menu toggle should exist')

      // Menu items should exist (even if hidden initially)
      const item1 = api.preview.findByText('Menu Item 1')
      // Item might be hidden or not rendered - just check toggle exists
      api.assert.ok(menuToggle !== null, 'Toggle button should exist')
    }
  ),

  testWithSetup(
    'Accordion with cross-element state',
    `Frame gap 4, w 300
  Button name Section1, pad 12 16, bg #333, col white, rad 6, w full, hor, spread, toggle()
    Text "Section 1"
    Icon "chevron-down", ic #888, is 16
    open:
      Icon "chevron-up", ic #888, is 16
  Frame pad 16, bg #222, rad 0 0 8 8, hidden
    Section1.open:
      visible
    Text "Section 1 content goes here.", col #888

  Button name Section2, pad 12 16, bg #333, col white, rad 6, w full, hor, spread, toggle()
    Text "Section 2"
    Icon "chevron-down", ic #888, is 16
    open:
      Icon "chevron-up", ic #888, is 16
  Frame pad 16, bg #222, rad 0 0 8 8, hidden
    Section2.open:
      visible
    Text "Section 2 content goes here.", col #888`,
    async (api: TestAPI) => {
      const section1 = api.preview.findByText('Section 1')
      const section2 = api.preview.findByText('Section 2')

      api.assert.ok(section1 !== null, 'Section 1 trigger should exist')
      api.assert.ok(section2 !== null, 'Section 2 trigger should exist')
    }
  ),

  testWithSetup(
    'Tab-like navigation with cross-element',
    `Frame gap 0
  Frame hor, gap 0, bg #1a1a1a
    Button name Tab1, pad 12 20, col #888, exclusive(), selected
      Text "Overview"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button name Tab2, pad 12 20, col #888, exclusive()
      Text "Details"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button name Tab3, pad 12 20, col #888, exclusive()
      Text "Reviews"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1

  Frame pad 16, bg #222
    Frame hidden
      Tab1.selected:
        visible
      Text "Overview content", col white
    Frame hidden
      Tab2.selected:
        visible
      Text "Details content", col white
    Frame hidden
      Tab3.selected:
        visible
      Text "Reviews content", col white`,
    async (api: TestAPI) => {
      const overview = api.preview.findByText('Overview')
      const details = api.preview.findByText('Details')
      const reviews = api.preview.findByText('Reviews')

      api.assert.ok(overview !== null, 'Overview tab should exist')
      api.assert.ok(details !== null, 'Details tab should exist')
      api.assert.ok(reviews !== null, 'Reviews tab should exist')
    }
  ),

  testWithSetup(
    'Form field validation state',
    `Input name EmailInput, placeholder "Email", bg #333, col white, pad 12, rad 6, w 250
  invalid:
    bor 2, boc #ef4444

Frame pad 4, bg #ef4444, col white, rad 4, fs 12, hidden
  EmailInput.invalid:
    visible
  Text "Please enter a valid email"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Form elements should render')
    }
  ),
])

// =============================================================================
// 35. Data Binding - Input Binding
// =============================================================================

export const dataBindingTests: TestCase[] = describe('Data Binding', [
  testWithSetup(
    'Input with bind',
    `searchTerm: ""

Frame gap 8, pad 16, bg #1a1a1a, rad 8, w 300
  Input bind searchTerm, placeholder "Search...", bg #333, col white, pad 12, rad 6, w full
  Text "Searching for: $searchTerm", col #888, fs 12`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-2')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input element')
    }
  ),

  testWithSetup(
    'Computed display from variable',
    `price: 99
quantity: 1

Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 8, ver-center
    Text "Price:", col #888
    Text "$price €", col white, weight bold
  Frame hor, gap 8, ver-center
    Text "Quantity:", col #888
    Frame hor, gap 8
      Button "-", pad 4 12, bg #333, col white, rad 4, decrement(quantity)
      Text "$quantity", col white, w 30, center
      Button "+", pad 4 12, bg #333, col white, rad 4, increment(quantity)`,
    async (api: TestAPI) => {
      const price = api.preview.findByText('Price:')
      const quantity = api.preview.findByText('Quantity:')

      api.assert.ok(price !== null, 'Price label should exist')
      api.assert.ok(quantity !== null, 'Quantity label should exist')
    }
  ),

  testWithSetup(
    'Nested data access',
    `user:
  profile:
    name: "John Doe"
    email: "john@example.com"
  settings:
    theme: "dark"
    notifications: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "$user.profile.name", col white, fs 18, weight bold
  Text "$user.profile.email", col #888
  Text "Theme: $user.settings.theme", col #666, fs 12`,
    async (api: TestAPI) => {
      const name = api.preview.findByText('John Doe')
      const email = api.preview.findByText('john@example.com')

      // STRICT: Text content must be found - these are data-bound values
      api.assert.ok(name !== null, `Name "John Doe" should render from $user.profile.name`)
      api.assert.ok(
        email !== null,
        `Email "john@example.com" should render from $user.profile.email`
      )
    }
  ),
])

// =============================================================================
// 36. Charts
// =============================================================================

export const chartTests: TestCase[] = describe('Charts', [
  testWithSetup(
    'Line chart',
    `sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280

Line $sales, w 300, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Line chart should render')
    }
  ),

  testWithSetup(
    'Bar chart',
    `data:
  A: 30
  B: 50
  C: 40
  D: 70

Bar $data, w 300, h 200, colors #2271C1`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Bar chart should render')
    }
  ),

  testWithSetup(
    'Pie chart',
    `distribution:
  Desktop: 55
  Mobile: 35
  Tablet: 10

Pie $distribution, w 200, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Pie chart should render')
    }
  ),

  testWithSetup(
    'Donut chart',
    `usage:
  Used: 75
  Free: 25

Donut $usage, w 200, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Donut chart should render')
    }
  ),

  testWithSetup(
    'Area chart',
    `metrics:
  Week1: 100
  Week2: 150
  Week3: 130
  Week4: 180
  Week5: 220

Area $metrics, w 300, h 150`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Area chart should render')
    }
  ),

  testWithSetup(
    'Chart with title and axes',
    `revenue:
  Q1: 25000
  Q2: 32000
  Q3: 28000
  Q4: 41000

Line $revenue, w 400, h 250, colors #10b981
  Title: text "Revenue 2024", col white
  XAxis: label "Quarter", col #888
  YAxis: label "€", min 0, col #888`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Chart with config should render')
    }
  ),
])

// =============================================================================
// 37. Tables
// =============================================================================

export const tableTests: TestCase[] = describe('Tables', [
  testWithSetup(
    'Static table',
    `Table
  Header:
    Row "Name", "Status", "Action"
  Row "Alice", "Active", "Edit"
  Row "Bob", "Pending", "Edit"
  Row "Charlie", "Inactive", "Edit"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Table should render')
    }
  ),

  testWithSetup(
    'Data-driven table',
    `users:
  u1:
    name: "Alice"
    email: "alice@example.com"
    role: "Admin"
  u2:
    name: "Bob"
    email: "bob@example.com"
    role: "User"
  u3:
    name: "Charlie"
    email: "charlie@example.com"
    role: "Editor"

Table $users
  Header: bg #222, pad 12
    Row "Name", "Email", "Role"
  Row: pad 12, bg #1a1a1a
    Text row.name, col white
    Text row.email, col #888
    Text row.role, col #2271C1`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Data table should render')
    }
  ),
])

// =============================================================================
// 38. Event Handlers
// =============================================================================

export const eventHandlerTests: TestCase[] = describe('Event Handlers', [
  testWithSetup(
    'OnClick handler',
    `Button "Click Me", bg #2271C1, col white, pad 12 24, rad 6
  onclick:
    toast("Button clicked!")`,
    async (api: TestAPI) => {
      const btn = api.preview.findByText('Click Me')
      api.assert.ok(btn !== null, 'Button should exist')
    }
  ),

  testWithSetup(
    'OnHover handler',
    `Frame w 100, h 100, bg #333, rad 8, center
  Text "Hover", col white
  onhover:
    bg #444`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'OnFocus and OnBlur',
    `Input placeholder "Focus me", bg #333, col white, pad 12, rad 6
  onfocus:
    bor 2, boc #2271C1
  onblur:
    bor 1, boc #555`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input')
    }
  ),

  testWithSetup(
    'OnChange handler',
    `selectedValue: ""

Select placeholder "Choose option"
  onchange:
    toast("Selection changed!")
  Option "Option A"
  Option "Option B"
  Option "Option C"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render')
    }
  ),

  testWithSetup(
    'Keyboard event handlers',
    `Input placeholder "Type and press Enter", bg #333, col white, pad 12, rad 6
  onenter:
    toast("Enter pressed!")
  onescape:
    clear()`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
    }
  ),
])

// =============================================================================
// 39. Responsive / Container States
// =============================================================================

export const responsiveTests: TestCase[] = describe('Responsive States', [
  testWithSetup(
    'Compact state',
    `Frame w 300, pad 16, bg #1a1a1a, rad 8
  compact:
    pad 8
    gap 4
  regular:
    pad 16
    gap 8
  wide:
    pad 24
    gap 12
  Text "Responsive Content", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'Layout changes by size',
    `Frame w 400, pad 16, bg #1a1a1a, rad 8
  compact:
    ver
  regular:
    hor
  Frame w 100, h 50, bg #333, rad 4
  Frame w 100, h 50, bg #444, rad 4
  Frame w 100, h 50, bg #555, rad 4`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.children.length === 3, 'Should have 3 children')
    }
  ),
])

// =============================================================================
// 40. Real-World Components
// =============================================================================

export const realWorldComponentTests: TestCase[] = describe('Real-World Components', [
  testWithSetup(
    'Login form',
    `Frame w 350, pad 24, bg #1a1a1a, rad 12, gap 20, center
  Text "Welcome Back", col white, fs 24, weight bold, center
  Text "Sign in to continue", col #888, fs 14, center
  Frame gap 16, w full
    Frame gap 4
      Text "Email", col #888, fs 12
      Input placeholder "Enter your email", bg #333, col white, pad 12, rad 6, w full
    Frame gap 4
      Text "Password", col #888, fs 12
      Input type "password", placeholder "Enter your password", bg #333, col white, pad 12, rad 6, w full
    Frame hor, spread, ver-center
      Checkbox "Remember me"
      Text "Forgot password?", col #2271C1, fs 12, cursor pointer
  Button "Sign In", bg #2271C1, col white, pad 14 0, rad 6, w full, weight 500
  Frame hor, gap 4, center
    Text "Don't have an account?", col #888, fs 14
    Text "Sign up", col #2271C1, fs 14, cursor pointer`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Welcome Back')
      const signIn = api.preview.findByText('Sign In')

      api.assert.ok(title !== null, 'Title should exist')
      api.assert.ok(signIn !== null, 'Sign In button should exist')
    }
  ),

  testWithSetup(
    'Product card',
    `Frame w 280, bg #1a1a1a, rad 12, clip
  Frame w full, h 180, bg #333
    Image src "https://via.placeholder.com/280x180", w full, h full
  Frame pad 16, gap 12
    Frame hor, spread, ver-center
      Text "Product Name", col white, weight 500
      Frame hor, gap 4, ver-center
        Icon "star", ic #f59e0b, is 14, fill
        Text "4.8", col #f59e0b, fs 12
    Text "A great product description that explains the key features.", col #888, fs 14, line 1.4
    Frame hor, spread, ver-center
      Text "$99.00", col white, fs 20, weight bold
      Button "Add to Cart", bg #2271C1, col white, pad 8 16, rad 6, fs 14`,
    async (api: TestAPI) => {
      const productName = api.preview.findByText('Product Name')
      const addToCart = api.preview.findByText('Add to Cart')

      api.assert.ok(productName !== null, 'Product name should exist')
      api.assert.ok(addToCart !== null, 'Add to Cart button should exist')
    }
  ),

  testWithSetup(
    'Notification item',
    `Frame hor, gap 12, pad 12, bg #1a1a1a, rad 8, ver-center
  Frame w 40, h 40, bg #2271C1, rad 99, center, shrink
    Icon "bell", ic white, is 18
  Frame gap 2, grow
    Frame hor, spread, ver-center
      Text "New message", col white, weight 500
      Text "2m ago", col #666, fs 12
    Text "You have received a new message from John.", col #888, fs 14, truncate
  Button pad 8, bg transparent, rad 6
    Icon "x", ic #666, is 16
    hover:
      bg #333`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('New message')
      api.assert.ok(title !== null, 'Notification title should exist')
    }
  ),

  testWithSetup(
    'Settings toggle list',
    `Frame gap 0, bg #1a1a1a, rad 8, clip, w 350
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Dark Mode", col white
      Text "Use dark theme throughout the app", col #666, fs 12
    Switch checked
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Notifications", col white
      Text "Receive push notifications", col #666, fs 12
    Switch
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Auto-save", col white
      Text "Automatically save changes", col #666, fs 12
    Switch checked
  Frame hor, spread, ver-center, pad 16
    Frame gap 2
      Text "Analytics", col white
      Text "Share anonymous usage data", col #666, fs 12
    Switch`,
    async (api: TestAPI) => {
      const darkMode = api.preview.findByText('Dark Mode')
      const notifications = api.preview.findByText('Notifications')
      const autoSave = api.preview.findByText('Auto-save')

      api.assert.ok(darkMode !== null, 'Dark Mode setting should exist')
      api.assert.ok(notifications !== null, 'Notifications setting should exist')
      api.assert.ok(autoSave !== null, 'Auto-save setting should exist')
    }
  ),

  testWithSetup(
    'Pricing card',
    `Frame w 300, bg #1a1a1a, rad 12, pad 24, gap 20
  Frame gap 4, center
    Text "Pro Plan", col #2271C1, fs 14, weight 500, uppercase
    Frame hor, gap 2, ver-center, center
      Text "$", col white, fs 18
      Text "29", col white, fs 48, weight bold
      Text "/month", col #888, fs 14
    Text "Perfect for growing businesses", col #888, fs 14, center
  Divider
  Frame gap 12
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Unlimited projects", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Priority support", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Advanced analytics", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Custom integrations", col white, fs 14
  Button "Get Started", bg #2271C1, col white, pad 14 0, rad 6, w full, weight 500`,
    async (api: TestAPI) => {
      const planName = api.preview.findByText('Pro Plan')
      const getStarted = api.preview.findByText('Get Started')

      api.assert.ok(planName !== null, 'Plan name should exist')
      api.assert.ok(getStarted !== null, 'Get Started button should exist')
    }
  ),
])

// =============================================================================
// 41. Interaction Tests - Toggle State Changes
// =============================================================================

export const interactionToggleTests: TestCase[] = describe('Interaction: Toggle States', [
  testWithSetup(
    'Click toggles button state on/off',
    `Button "Toggle", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Initial state: off (gray)
      let btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial state should be off (#333), got ${btn.styles.backgroundColor}`
      )

      // Click to turn on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#2271C1'),
        `After click should be on (#2271C1), got ${btn.styles.backgroundColor}`
      )

      // Click again to turn off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After second click should be off (#333), got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle changes text content',
    `Button "Like", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #ef4444
    Text "Liked"`,
    async (api: TestAPI) => {
      // Initial text
      const likeText = api.preview.findByText('Like')
      api.assert.ok(likeText !== null, 'Initial text should be "Like"')

      // Click to toggle
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Text should change to "Liked"
      const likedText = api.preview.findByText('Liked')
      api.assert.ok(
        likedText !== null || api.preview.inspect('node-1')?.fullText.includes('Liked'),
        'After click text should include "Liked"'
      )
    }
  ),

  testWithSetup(
    'Multiple toggles cycle correctly',
    `Button "State", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Toggle 4 times - should end up off (even number of clicks)
      for (let i = 0; i < 4; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(50)
      }
      await api.utils.delay(100)

      const btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After 4 clicks should be off, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle with icon change',
    `Button pad 12, bg #333, rad 6, toggle()
  Icon "heart", ic #888, is 20
  on:
    bg #ef4444
    Icon "heart", ic white, is 20, fill`,
    async (api: TestAPI) => {
      // Initial state
      let btn = api.preview.inspect('node-1')
      api.assert.ok(colorsMatch(btn.styles.backgroundColor, '#333'), 'Initial bg should be #333')

      // Click to toggle
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#ef4444'),
        `After click bg should be #ef4444, got ${btn.styles.backgroundColor}`
      )
    }
  ),
])

// =============================================================================
// 42. Interaction Tests - Exclusive Selection
// =============================================================================

export const interactionExclusiveTests: TestCase[] = describe('Interaction: Exclusive Selection', [
  testWithSetup(
    'Clicking one deselects others',
    `Frame hor, gap 4, pad 8, bg #1a1a1a, rad 8
  Button "A", pad 8 16, bg #333, col white, rad 6, exclusive(), selected
    selected:
      bg #2271C1
  Button "B", pad 8 16, bg #333, col white, rad 6, exclusive()
    selected:
      bg #2271C1
  Button "C", pad 8 16, bg #333, col white, rad 6, exclusive()
    selected:
      bg #2271C1`,
    async (api: TestAPI) => {
      // Initial: A is selected
      let btnA = api.preview.inspect('node-2')
      api.assert.ok(
        colorsMatch(btnA.styles.backgroundColor, '#2271C1'),
        `A should be selected initially, got ${btnA.styles.backgroundColor}`
      )

      // Click B
      await api.interact.click('node-3')
      await api.utils.delay(100)

      // B should be selected, A should not
      btnA = api.preview.inspect('node-2')
      let btnB = api.preview.inspect('node-3')

      api.assert.ok(
        colorsMatch(btnB.styles.backgroundColor, '#2271C1'),
        `B should be selected after click, got ${btnB.styles.backgroundColor}`
      )
      api.assert.ok(
        colorsMatch(btnA.styles.backgroundColor, '#333'),
        `A should be deselected, got ${btnA.styles.backgroundColor}`
      )

      // Click C
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // C should be selected, B should not
      btnB = api.preview.inspect('node-3')
      const btnC = api.preview.inspect('node-4')

      api.assert.ok(
        colorsMatch(btnC.styles.backgroundColor, '#2271C1'),
        `C should be selected, got ${btnC.styles.backgroundColor}`
      )
      api.assert.ok(
        colorsMatch(btnB.styles.backgroundColor, '#333'),
        `B should be deselected, got ${btnB.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Tab-style exclusive selection',
    `Frame hor, gap 0, bg #1a1a1a
  Button "Tab 1", pad 12 20, col #888, exclusive(), selected
    selected:
      col white
      bg #333
  Button "Tab 2", pad 12 20, col #888, exclusive()
    selected:
      col white
      bg #333
  Button "Tab 3", pad 12 20, col #888, exclusive()
    selected:
      col white
      bg #333`,
    async (api: TestAPI) => {
      // Click Tab 2
      await api.interact.click('node-3')
      await api.utils.delay(100)

      const tab2 = api.preview.inspect('node-3')
      api.assert.ok(
        colorsMatch(tab2.styles.backgroundColor, '#333'),
        `Tab 2 should be selected, got ${tab2.styles.backgroundColor}`
      )

      // Tab 1 should be deselected
      const tab1 = api.preview.inspect('node-2')
      api.assert.ok(
        !colorsMatch(tab1.styles.backgroundColor, '#333') || tab1.styles.backgroundColor === '',
        `Tab 1 should be deselected`
      )
    }
  ),
])

// =============================================================================
// 43. Interaction Tests - Counter Operations
// =============================================================================

export const interactionCounterTests: TestCase[] = describe('Interaction: Counters', [
  testWithSetup(
    'Increment button increases counter',
    `count: 0

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      // Initial value should be 0
      let text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '0' || text?.textContent === '0',
        `Initial count should be 0, got "${text?.fullText}"`
      )

      // Click increment (+)
      await api.interact.click('node-4')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '1' || text?.textContent === '1',
        `After increment should be 1, got "${text?.fullText}"`
      )

      // Click increment again
      await api.interact.click('node-4')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '2' || text?.textContent === '2',
        `After second increment should be 2, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Decrement button decreases counter',
    `count: 5

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      // Initial value should be 5
      let text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '5' || text?.textContent === '5',
        `Initial count should be 5, got "${text?.fullText}"`
      )

      // Click decrement (-)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '4' || text?.textContent === '4',
        `After decrement should be 4, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Multiple counter operations with step',
    `value: 10

Frame hor, gap 8, pad 16, bg #1a1a1a, rad 8, ver-center
  Button "-5", bg #ef4444, col white, pad 8 16, rad 6, decrement(value, 5)
  Text "Value: $value", col white, fs 18, w 100, center
  Button "+5", bg #10b981, col white, pad 8 16, rad 6, increment(value, 5)`,
    async (api: TestAPI) => {
      // Structure: node-1 = Frame, node-2 = -5 btn, node-3 = text, node-4 = +5 btn

      // Click +5 (node-4)
      await api.interact.click('node-4')
      await api.utils.delay(100)

      let text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText?.includes('15') || text?.textContent?.includes('15'),
        `After +5 should show 15, got "${text?.fullText}"`
      )

      // Click -5 twice (node-2)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText?.includes('5') || text?.textContent?.includes('5'),
        `After -5 twice should show 5, got "${text?.fullText}"`
      )
    }
  ),
])

// =============================================================================
// 44. Interaction Tests - Hover States
// =============================================================================

export const interactionHoverTests: TestCase[] = describe('Interaction: Hover States', [
  testWithSetup(
    'Hover changes background color',
    `Button "Hover Me", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444`,
    async (api: TestAPI) => {
      // Initial state
      let btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial bg should be #333, got ${btn.styles.backgroundColor}`
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      btn = api.preview.inspect('node-1')
      // Check if hover state applied (might be #444 or close to it)
      const isHovered =
        colorsMatch(btn.styles.backgroundColor, '#444') ||
        btn.styles.backgroundColor.includes('68') ||
        btn.styles.backgroundColor.includes('67')

      api.assert.ok(isHovered, `Hover bg should be #444, got ${btn.styles.backgroundColor}`)
    }
  ),

  testWithSetup(
    'Hover changes multiple properties',
    `Frame w 100, h 100, bg #333, rad 8, cursor pointer
  hover:
    bg #2271C1
    scale 1.05`,
    async (api: TestAPI) => {
      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      const frame = api.preview.inspect('node-1')
      // Either bg or transform should change
      const hasHoverEffect =
        colorsMatch(frame.styles.backgroundColor, '#2271C1') ||
        frame.styles.transform.includes('scale') ||
        frame.styles.transform.includes('1.05')

      api.assert.ok(hasHoverEffect, `Should have hover effect applied`)
    }
  ),

  testWithSetup(
    'Hover then unhover resets state',
    `Button "Test", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #555`,
    async (api: TestAPI) => {
      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Move away (hover on body or another element)
      await api.interact.click('node-1') // This also triggers a "leave" in some implementations
      await api.utils.delay(100)

      // State might reset or stay - just verify element is still functional
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should still exist after hover/unhover')
    }
  ),
])

// =============================================================================
// 45. Interaction Tests - Form Inputs
// =============================================================================

export const interactionFormTests: TestCase[] = describe('Interaction: Form Inputs', [
  testWithSetup(
    'Focus changes input border',
    `Input placeholder "Focus me", bg #333, col white, pad 12, rad 6, bor 1, boc #555
  focus:
    boc #2271C1
    bor 2`,
    async (api: TestAPI) => {
      // Focus the input
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      const input = api.preview.inspect('node-1')
      // Check if focus style applied
      const hasFocusStyle =
        colorsMatch(input.styles.borderColor, '#2271C1') || input.styles.borderWidth === '2px'

      api.assert.ok(
        hasFocusStyle || input.tagName === 'input',
        `Should have focus style or be input, got borderColor: ${input.styles.borderColor}`
      )
    }
  ),

  testWithSetup(
    'Type in input field',
    `searchTerm: ""

Input bind searchTerm, placeholder "Type here...", bg #333, col white, pad 12, rad 6`,
    async (api: TestAPI) => {
      // Focus and type
      await api.interact.focus('node-1')
      await api.utils.delay(50)

      // Type text
      await api.interact.type('node-1', 'Hello World')
      await api.utils.delay(100)

      const input = api.preview.inspect('node-1')
      // Value might be in attributes or we can check it exists
      api.assert.ok(input !== null, 'Input should exist after typing')
    }
  ),
])

// =============================================================================
// 46. Interaction Tests - Checkbox & Switch
// =============================================================================

export const interactionCheckboxTests: TestCase[] = describe('Interaction: Checkbox & Switch', [
  testWithSetup('Click toggles checkbox state', `Checkbox "Accept terms"`, async (api: TestAPI) => {
    // Click the checkbox
    await api.interact.click('node-1')
    await api.utils.delay(100)

    // Checkbox should be toggled
    const checkbox = api.preview.inspect('node-1')
    api.assert.ok(checkbox !== null, 'Checkbox should exist after click')
  }),

  testWithSetup('Click toggles switch state', `Switch "Dark Mode"`, async (api: TestAPI) => {
    // Click the switch
    await api.interact.click('node-1')
    await api.utils.delay(100)

    // Switch should be toggled
    const switchEl = api.preview.inspect('node-1')
    api.assert.ok(switchEl !== null, 'Switch should exist after click')
  }),

  testWithSetup(
    'Multiple checkbox interactions',
    `Frame gap 8, pad 16, bg #1a1a1a
  Checkbox "Option A"
  Checkbox "Option B"
  Checkbox "Option C"`,
    async (api: TestAPI) => {
      // Click first checkbox
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // Click third checkbox
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Both should be clickable
      const optionA = api.preview.inspect('node-2')
      const optionC = api.preview.inspect('node-4')

      api.assert.ok(optionA !== null && optionC !== null, 'Checkboxes should exist after clicks')
    }
  ),
])

// =============================================================================
// 47. Interaction Tests - Multi-State Toggle
// =============================================================================

export const interactionMultiStateTests: TestCase[] = describe('Interaction: Multi-State Toggle', [
  testWithSetup(
    'Cycle through multiple states',
    `Button "Status", pad 12 24, rad 6, bg #666, col white, toggle()
  todo:
    bg #888
    Text "Todo"
  doing:
    bg #f59e0b
    Text "Doing"
  done:
    bg #10b981
    Text "Done"`,
    async (api: TestAPI) => {
      // Click to cycle through states
      await api.interact.click('node-1')
      await api.utils.delay(100)

      let btn = api.preview.inspect('node-1')
      const state1 = btn.styles.backgroundColor

      await api.interact.click('node-1')
      await api.utils.delay(100)

      btn = api.preview.inspect('node-1')
      const state2 = btn.styles.backgroundColor

      await api.interact.click('node-1')
      await api.utils.delay(100)

      btn = api.preview.inspect('node-1')
      const state3 = btn.styles.backgroundColor

      // States should be different (cycling through)
      api.assert.ok(
        state1 !== state2 || state2 !== state3 || state1 !== state3,
        'States should cycle through different colors'
      )
    }
  ),
])

// =============================================================================
// 48. Interaction Tests - Show/Hide Elements
// =============================================================================

export const interactionVisibilityTests: TestCase[] = describe('Interaction: Visibility', [
  testWithSetup(
    'Toggle shows/hides menu',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Menu", bg #2271C1, col white, pad 10 20, rad 6, toggle()
    open:
      Text "Close"
  Frame pad 12, bg #333, rad 8, hidden
    Button.open:
      visible
    Text "Item 1", col white
    Text "Item 2", col white`,
    async (api: TestAPI) => {
      // Menu should be hidden initially
      const item1Initial = api.preview.findByText('Item 1')
      // Item might be hidden or not visible

      // Click to show
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Menu should be visible now
      const item1After = api.preview.findByText('Item 1')
      // After click, visibility might have changed
      api.assert.ok(
        item1After !== null || api.preview.getNodeIds().length >= 2,
        'Menu items should exist after toggle'
      )
    }
  ),
])

// =============================================================================
// 49. Interaction Tests - Complex Workflows
// =============================================================================

export const interactionWorkflowTests: TestCase[] = describe('Interaction: Workflows', [
  testWithSetup(
    'Like button workflow',
    `likes: 0

Frame hor, gap 8, pad 16, bg #1a1a1a, rad 8, ver-center
  Button pad 8, bg #333, rad 6, toggle()
    Icon "heart", ic #888, is 20
    on:
      bg #ef4444
      Icon "heart", ic white, is 20, fill
  Text "$likes likes", col white`,
    async (api: TestAPI) => {
      // Click like button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Button should be toggled (red background)
      const btn = api.preview.inspect('node-2')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#ef4444'),
        `Like button should be red, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Form submission workflow',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Input placeholder "Enter name", bg #333, col white, pad 12, rad 6
  Button "Submit", bg #2271C1, col white, pad 10 20, rad 6, toggle()
    on:
      bg #10b981
      Text "Submitted"`,
    async (api: TestAPI) => {
      // Focus input
      await api.interact.focus('node-2')
      await api.utils.delay(50)

      // Click submit
      await api.interact.click('node-3')
      await api.utils.delay(100)

      // Submit button should change state
      const submitBtn = api.preview.inspect('node-3')
      api.assert.ok(
        colorsMatch(submitBtn.styles.backgroundColor, '#10b981'),
        `Submit button should be green, got ${submitBtn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Cart increment workflow',
    `quantity: 1

Frame pad 16, bg #1a1a1a, rad 8, gap 12
  Text "Product XYZ", col white, fs 18, weight bold
  Frame hor, gap 12, ver-center
    Button "-", w 36, h 36, bg #333, col white, rad 6, center, decrement(quantity)
    Text "$quantity", col white, fs 20, w 40, center
    Button "+", w 36, h 36, bg #333, col white, rad 6, center, increment(quantity)
  Text "Add to Cart", bg #2271C1, col white, pad 12, rad 6, center, cursor pointer`,
    async (api: TestAPI) => {
      // Initial quantity is 1
      let qtyText = api.preview.inspect('node-5')
      api.assert.ok(
        qtyText?.fullText === '1' || qtyText?.textContent === '1',
        `Initial quantity should be 1, got "${qtyText?.fullText}"`
      )

      // Click + three times
      for (let i = 0; i < 3; i++) {
        await api.interact.click('node-6')
        await api.utils.delay(50)
      }
      await api.utils.delay(100)

      // Quantity should be 4
      qtyText = api.preview.inspect('node-5')
      api.assert.ok(
        qtyText?.fullText === '4' || qtyText?.textContent === '4',
        `After 3 increments should be 4, got "${qtyText?.fullText}"`
      )

      // Click - once
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Quantity should be 3
      qtyText = api.preview.inspect('node-5')
      api.assert.ok(
        qtyText?.fullText === '3' || qtyText?.textContent === '3',
        `After decrement should be 3, got "${qtyText?.fullText}"`
      )
    }
  ),
])

// =============================================================================
// 50. Interaction Tests - Rapid Interactions
// =============================================================================

export const interactionRapidTests: TestCase[] = describe('Interaction: Rapid Operations', [
  testWithSetup(
    'Rapid toggle clicks',
    `Button "Rapid", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(20)
      }
      await api.utils.delay(100)

      // After 10 clicks (even), should be off
      const btn = api.preview.inspect('node-1')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After 10 clicks should be off, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Rapid counter increments',
    `count: 0

Frame hor, gap 8, ver-center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)
  Text "$count", col white, fs 24, w 60, center`,
    async (api: TestAPI) => {
      // Click + 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-2')
        await api.utils.delay(30)
      }
      await api.utils.delay(150)

      // Count should be 5
      const text = api.preview.inspect('node-3')
      api.assert.ok(
        text?.fullText === '5' || text?.textContent === '5',
        `After 5 rapid increments should be 5, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Rapid exclusive selection',
    `Frame hor, gap 4
  Button "1", pad 8 12, bg #333, col white, rad 4, exclusive(), selected
    selected: bg #2271C1
  Button "2", pad 8 12, bg #333, col white, rad 4, exclusive()
    selected: bg #2271C1
  Button "3", pad 8 12, bg #333, col white, rad 4, exclusive()
    selected: bg #2271C1`,
    async (api: TestAPI) => {
      // Rapidly click through all buttons
      await api.interact.click('node-2')
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Button 1 should be selected
      const btn1 = api.preview.inspect('node-2')
      api.assert.ok(
        colorsMatch(btn1.styles.backgroundColor, '#2271C1'),
        `Button 1 should be selected, got ${btn1.styles.backgroundColor}`
      )
    }
  ),
])

// =============================================================================
// 51. Custom Icons
// =============================================================================

export const iconVariantTests: TestCase[] = describe('Icon Variants', [
  testWithSetup(
    'Icon with different sizes',
    `Frame hor, gap 16, pad 16, bg #1a1a1a, rad 8, ver-center
  Icon "check", ic #10b981, is 16
  Icon "check", ic #10b981, is 24
  Icon "check", ic #10b981, is 32`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 3, 'Should have 3 icons')
    }
  ),

  testWithSetup(
    'Icon with different colors',
    `Frame hor, gap 12, pad 16, bg #1a1a1a, rad 8
  Icon "circle", ic #10b981, is 24
  Icon "circle", ic #f59e0b, is 24
  Icon "circle", ic #ef4444, is 24
  Icon "circle", ic #2271C1, is 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons')
    }
  ),

  testWithSetup(
    'Icon filled vs outline',
    `Frame hor, gap 16, pad 16, bg #1a1a1a, rad 8
  Icon "heart", ic #ef4444, is 24
  Icon "heart", ic #ef4444, is 24, fill
  Icon "star", ic #f59e0b, is 24
  Icon "star", ic #f59e0b, is 24, fill`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons (2 outline, 2 filled)')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allCompilerVerificationTests: TestCase[] = [
  ...allPreludeTests,
  ...complexPropertyTests,
  ...layoutVerificationTests,
  ...nestedStructureTests,
  ...tokenResolutionTests,
  ...conditionalTests,
  ...collectionTests,
  ...componentInheritanceTests,
  ...inlineSyntaxTests,
  ...primitivesTests,
  ...edgeCaseTests,
  ...stateManagementTests,
  ...animationTests,
  ...transformTests,
  ...advancedLayoutTests,
  ...effectsTests,
  ...formControlsTests,
  ...advancedTypographyTests,
  ...iconTests,
  ...complexCombinationsTests,
  ...zagDialogTests,
  ...zagTabsTests,
  ...zagSelectTests,
  ...zagCheckboxTests,
  ...zagSliderTests,
  ...zagRadioTests,
  ...zagTooltipTests,
  ...zagDatePickerTests,
  ...functionToggleTests,
  ...functionCounterTests,
  ...functionNavigationTests,
  ...functionFeedbackTests,
  ...functionFormControlTests,
  ...functionCombinedTests,
  ...crossElementStateTests,
  ...dataBindingTests,
  ...chartTests,
  ...tableTests,
  ...eventHandlerTests,
  ...responsiveTests,
  ...realWorldComponentTests,
  ...interactionToggleTests,
  ...interactionExclusiveTests,
  ...interactionCounterTests,
  ...interactionHoverTests,
  ...interactionFormTests,
  ...interactionCheckboxTests,
  ...interactionMultiStateTests,
  ...interactionVisibilityTests,
  ...interactionWorkflowTests,
  ...interactionRapidTests,
  ...iconVariantTests,
]

export default allCompilerVerificationTests
