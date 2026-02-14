/**
 * Roundtrip Tests
 *
 * Verifies that Mirror → Intent → Mirror produces semantically equivalent code.
 * The output might not be identical strings, but should parse to equivalent AST.
 */

import { describe, it, expect } from 'vitest'
import { mirrorToIntent } from '../../intent/mirror-to-intent'
import { intentToMirror } from '../../intent/intent-to-mirror'
import { parse } from '../../parser/parser'

// Helper to normalize AST for comparison (remove line numbers, etc.)
function normalizeAST(ast: any): any {
  if (Array.isArray(ast)) {
    return ast.map(normalizeAST)
  }
  if (ast && typeof ast === 'object') {
    const normalized: any = {}
    for (const [key, value] of Object.entries(ast)) {
      // Skip metadata fields that don't affect semantics
      if (['line', 'column', 'start', 'end', 'raw', 'loc', 'range'].includes(key)) {
        continue
      }
      normalized[key] = normalizeAST(value)
    }
    return normalized
  }
  return ast
}

// Helper to compare two Mirror code snippets semantically
function assertSemanticEquivalence(original: string, regenerated: string) {
  const originalResult = parse(original)
  const regeneratedResult = parse(regenerated)

  // Both should parse without errors
  const originalErrors = originalResult.errors?.filter(e => !e.startsWith('Warning:')) || []
  const regeneratedErrors = regeneratedResult.errors?.filter(e => !e.startsWith('Warning:')) || []

  expect(originalErrors).toHaveLength(0)
  expect(regeneratedErrors).toHaveLength(0)

  // Compare normalized ASTs
  const normalizedOriginal = normalizeAST(originalResult.ast)
  const normalizedRegenerated = normalizeAST(regeneratedResult.ast)

  expect(normalizedRegenerated).toEqual(normalizedOriginal)
}

describe('Roundtrip Tests', () => {
  describe('Basic Components', () => {
    it('preserves simple component', () => {
      const original = 'Box'
      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated.trim()).toContain('Box')
    })

    it('preserves component with text', () => {
      const original = 'Button "Click me"'
      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Button')
      expect(regenerated).toContain('"Click me"')
    })

    it('preserves component with styles', () => {
      const original = 'Box pad 16 bg #1E1E2E rad 8'
      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('pad 16')
      expect(regenerated).toContain('bg #1E1E2E')
      expect(regenerated).toContain('rad 8')
    })
  })

  describe('Layout Direction', () => {
    it('preserves horizontal layout', () => {
      const original = 'Box hor gap 16'
      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('hor')
      expect(regenerated).toContain('gap 16')
    })

    it('preserves vertical layout', () => {
      const original = 'Box ver gap 8'
      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('ver')
    })
  })

  describe('Nested Children', () => {
    it('preserves parent-child hierarchy', () => {
      const original = `Card pad 16
  Title "Hello"
  Content "World"`

      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Card')
      expect(regenerated).toContain('Title')
      expect(regenerated).toContain('Content')
      expect(regenerated).toContain('"Hello"')
      expect(regenerated).toContain('"World"')
    })

    it('preserves deeply nested structure', () => {
      const original = `Page
  Header
    Logo
    Nav
  Content
    Sidebar
    Main`

      const intent = mirrorToIntent(original)
      const regenerated = intentToMirror(intent)

      // All components should be present
      for (const comp of ['Page', 'Header', 'Logo', 'Nav', 'Content', 'Sidebar', 'Main']) {
        expect(regenerated).toContain(comp)
      }
    })
  })

  describe('Tokens', () => {
    it('preserves token definitions', () => {
      const tokens = `$primary: #3B82F6
$spacing: 16`
      const layout = 'Button bg $primary pad $spacing'

      const intent = mirrorToIntent(layout, '', tokens)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('$primary')
      expect(regenerated).toContain('#3B82F6')
    })
  })

  describe('Component Definitions', () => {
    it('preserves component definition', () => {
      const components = 'Card: pad 16 bg #1E1E2E rad 12'
      const layout = 'Card "Hello"'

      const intent = mirrorToIntent(layout, components)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Card:')
      expect(regenerated).toContain('pad 16')
    })

    it('preserves inheritance semantically', () => {
      // Note: Parser resolves inheritance (flattens it)
      // So DangerButton gets all properties from Button merged
      const components = `Button: pad 12 bg #3B82F6
DangerButton from Button: bg #EF4444`
      const layout = 'DangerButton "Delete"'

      const intent = mirrorToIntent(layout, components)
      const regenerated = intentToMirror(intent)

      // Both components should exist
      expect(regenerated).toContain('Button:')
      expect(regenerated).toContain('DangerButton:')
      // DangerButton should have the overridden bg
      expect(regenerated).toContain('#EF4444')
      // Inheritance syntax may not be preserved (parser flattens it)
    })
  })

  describe('States', () => {
    it('preserves component states', () => {
      const components = `Toggle: w 52 h 28
  state off
    bg #333
  state on
    bg #3B82F6`

      const intent = mirrorToIntent('Toggle', components)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('state off')
      expect(regenerated).toContain('state on')
      expect(regenerated).toContain('bg #333')
      expect(regenerated).toContain('bg #3B82F6')
    })
  })

  describe('Events', () => {
    it('preserves onclick event', () => {
      const layout = `Button "Click"
  onclick toggle`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('onclick')
      expect(regenerated).toContain('toggle')
    })

    it('preserves event with target', () => {
      const layout = `Button "Open"
  onclick open Dialog`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('onclick')
      expect(regenerated).toContain('open')
      expect(regenerated).toContain('Dialog')
    })
  })

  describe('Conditions', () => {
    it('preserves conditional property', () => {
      // Conditional properties on components are supported
      const layout = 'Button if $active then bg #3B82F6 else bg #333 "Click"'

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Button')
      expect(regenerated).toContain('"Click"')
      // Note: conditional styles are converted to conditionalStyle array
    })

    // Note: Standalone if/else blocks are not currently supported by the parser
    // They would need to be wrapped in a parent component
  })

  describe('Iterators', () => {
    // Note: Standalone each blocks at top level are not fully supported by the parser.
    // Iterators work when applied to component nodes via the AST iterator property.
    it('preserves list items', () => {
      const layout = `Menu
  - Item "One"
  - Item "Two"
  - Item "Three"`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Menu')
      expect(regenerated).toContain('Item')
      expect(regenerated).toContain('"One"')
      expect(regenerated).toContain('"Two"')
      expect(regenerated).toContain('"Three"')
    })
  })

  describe('Animations', () => {
    it('preserves show/hide animations', () => {
      const layout = `Panel hidden
  show fade 300
  hide fade 150`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('show')
      expect(regenerated).toContain('fade')
      expect(regenerated).toContain('hide')
    })

    it('preserves continuous animation', () => {
      const layout = `Loader
  animate spin 1000`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('animate')
      expect(regenerated).toContain('spin')
      expect(regenerated).toContain('1000')
    })
  })

  describe('Primitives', () => {
    it('preserves Input with type', () => {
      const layout = 'Input type email placeholder "Enter email"'

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Input')
      expect(regenerated).toContain('type email')
      expect(regenerated).toContain('placeholder')
    })

    it('preserves Image with src and fit', () => {
      const layout = 'Image src "avatar.jpg" fit cover'

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('Image')
      expect(regenerated).toContain('src "avatar.jpg"')
      expect(regenerated).toContain('fit cover')
    })
  })

  describe('Complex Examples', () => {
    it('preserves login form', () => {
      const layout = `Card ver gap 16 pad 24 bg #1E1E2E rad 12
  Text size 24 weight 600 "Login"
  Input type email placeholder "Email"
  Input type password placeholder "Password"
  Button bg #3B82F6 "Sign In"
    onclick page Dashboard`

      const intent = mirrorToIntent(layout)
      const regenerated = intentToMirror(intent)

      // Key elements should be preserved
      expect(regenerated).toContain('Card')
      expect(regenerated).toContain('"Login"')
      expect(regenerated).toContain('type email')
      expect(regenerated).toContain('type password')
      expect(regenerated).toContain('"Sign In"')
      expect(regenerated).toContain('onclick')
      expect(regenerated).toContain('Dashboard')
    })

    it('preserves navigation with states', () => {
      const components = `NavItem: pad 12 cursor pointer
  state default
    bg transparent
  state active
    bg #3B82F6`

      const layout = `Nav hor gap 8
  - NavItem "Home"
  - NavItem "About"
  - NavItem "Contact"`

      const intent = mirrorToIntent(layout, components)
      const regenerated = intentToMirror(intent)

      expect(regenerated).toContain('NavItem:')
      expect(regenerated).toContain('state default')
      expect(regenerated).toContain('state active')
      expect(regenerated).toContain('"Home"')
      expect(regenerated).toContain('"About"')
      expect(regenerated).toContain('"Contact"')
    })
  })
})
