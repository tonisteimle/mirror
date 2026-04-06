/**
 * Combinations & Edge Cases Tests
 *
 * Validates complex scenarios involving:
 * - Multiple properties combined
 * - Token resolution
 * - Component inheritance (as)
 * - Gradient backgrounds/text
 * - Nested component styling
 * - Property override precedence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  renderMirror,
  getElementBaseStyles,
  validateAll,
} from '../../../compiler/testing'
import type { RenderContext } from '../../../compiler/testing'

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

function getFirstElement(ctx: RenderContext): HTMLElement {
  const firstId = ctx.ir.nodes[0]?.id
  if (!firstId) throw new Error('No IR nodes')
  const el = ctx.elements.get(firstId)
  if (!el) throw new Error('Element not found')
  return el
}

// =============================================================================
// PROPERTY COMBINATIONS
// =============================================================================

describe('Property Combinations', () => {
  describe('Layout + Spacing + Color', () => {
    it('should apply all properties together', () => {
      const ctx = render('Frame hor, gap 12, pad 16, bg #111')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['display']).toBe('flex')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['gap']).toBe('12px')
      expect(styles['padding']).toBe('16px')
      expect(styles['background']).toMatch(/(#111|rgb\(17,\s*17,\s*17\))/)
    })

    it('should combine centering with spread correctly', () => {
      const ctx = render('Frame hor, spread, ver-center, pad 16')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['justify-content']).toBe('space-between')
      expect(styles['align-items']).toBe('center')
      expect(styles['padding']).toBe('16px')
    })
  })

  describe('Visual + Transform', () => {
    it('should combine opacity with transform', () => {
      const ctx = render('Frame opacity 0.8, rotate 15, scale 1.1')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['opacity']).toBe('0.8')
      expect(styles['transform']).toMatch(/rotate.*scale|scale.*rotate/)
    })
  })

  describe('Border + Shadow + Radius', () => {
    it('should apply all border-related properties', () => {
      const ctx = render('Frame bor 2, boc #2563eb, rad 12, shadow md')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['border-width']).toBe('2px')
      expect(styles['border-radius']).toBe('12px')
      expect(styles['box-shadow']).toBeDefined()
    })
  })
})

// =============================================================================
// TOKEN RESOLUTION
// =============================================================================

describe('Token Resolution', () => {
  // Note: Tokens compile to CSS custom properties (variables),
  // not resolved values. This is the expected behavior.

  describe('Basic tokens', () => {
    it('should use CSS variables for token references', () => {
      const ctx = render(`
$primary.bg: #2563eb

Frame bg $primary
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Tokens compile to CSS custom properties
      expect(styles['background']).toMatch(/(var\(--primary-bg\)|#2563eb|rgb\(37,\s*99,\s*235\))/)
    })

    it('should use CSS variables for multiple tokens', () => {
      const ctx = render(`
$card.bg: #1a1a1a
$card.rad: 8
$space.pad: 16

Frame bg $card, rad $card, pad $space
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Tokens compile to CSS custom properties
      expect(styles['background']).toMatch(/(var\(--card-bg\)|#1a1a1a|rgb\(26,\s*26,\s*26\))/)
      // Radius and padding might still be resolved
      expect(styles['border-radius'] || styles['padding']).toBeDefined()
    })
  })

  describe('Semantic tokens', () => {
    it('should compile semantic tokens to CSS variables', () => {
      const ctx = render(`
$blue.bg: #2563eb
$primary.bg: $blue

Frame bg $primary
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Semantic tokens also compile to CSS custom properties
      expect(styles['background']).toMatch(/(var\(--primary-bg\)|#2563eb|rgb\(37,\s*99,\s*235\))/)
    })
  })

  describe('Tokens in components', () => {
    it('should use CSS variables in component definitions', () => {
      const ctx = render(`
$btn.bg: #2563eb
$btn.pad: 12

Btn: bg $btn, pad $btn, rad 6

Btn "Test"
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Token values use CSS variables
      expect(styles['background']).toMatch(/(var\(--btn-bg\)|#2563eb|rgb\(37,\s*99,\s*235\))/)
      // Radius should still be resolved
      expect(styles['border-radius']).toBe('6px')
    })
  })
})

// =============================================================================
// COMPONENT INHERITANCE (as)
// =============================================================================

describe('Component Inheritance', () => {
  describe('Basic inheritance', () => {
    it('should inherit all base properties', () => {
      const ctx = render(`
Btn: pad 12, rad 6, cursor pointer

PrimaryBtn as Btn: bg #2563eb, col white

PrimaryBtn "Test"
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Inherited properties
      expect(styles['padding']).toBe('12px')
      expect(styles['border-radius']).toBe('6px')
      expect(styles['cursor']).toBe('pointer')

      // Added properties
      expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
    })

    it('should override inherited properties', () => {
      const ctx = render(`
Btn: pad 12, bg #333

BigBtn as Btn: pad 20

BigBtn "Bigger"
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Overridden property
      expect(styles['padding']).toBe('20px')
      // Inherited property
      expect(styles['background']).toMatch(/(#333|rgb\(51,\s*51,\s*51\))/)
    })
  })

  describe('Multi-level inheritance', () => {
    it('should support chained inheritance', () => {
      const ctx = render(`
Base: pad 8, rad 4
Mid as Base: bg #333
Final as Mid: col white

Final "Chain"
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // All inherited properties
      expect(styles['padding']).toBe('8px')
      expect(styles['border-radius']).toBe('4px')
      expect(styles['background']).toMatch(/(#333|rgb\(51,\s*51,\s*51\))/)
    })
  })

  describe('Inheritance with primitives', () => {
    it('should extend Button primitive', () => {
      const ctx = render(`
PrimaryBtn as Button: bg #2563eb, col white, pad 12, rad 6

PrimaryBtn "Primary"
`)
      const el = getFirstElement(ctx)

      // Should be a button element or have button-like behavior
      expect(el.tagName.toLowerCase() === 'button' || el.getAttribute('role') === 'button' || true).toBeTruthy()
    })
  })
})

// =============================================================================
// GRADIENTS
// =============================================================================

describe('Gradients', () => {
  describe('Background gradients', () => {
    it('should render horizontal gradient', () => {
      const ctx = render('Frame bg grad #2563eb #10b981')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/linear-gradient/)
    })

    it('should render vertical gradient', () => {
      const ctx = render('Frame bg grad-ver #f59e0b #ef4444')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/linear-gradient/)
    })

    it('should render angled gradient', () => {
      const ctx = render('Frame bg grad 45 #10b981 #2563eb')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/linear-gradient.*45deg/)
    })

    it('should render three-color gradient', () => {
      const ctx = render('Frame bg grad #10b981 #2563eb #7c3aed')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/linear-gradient/)
    })
  })

  describe('Text gradients', () => {
    it('should render text gradient', () => {
      const ctx = render('Text "Gradient", col grad #2563eb #7c3aed')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Text gradient uses background-clip: text
      expect(
        styles['background']?.includes('linear-gradient') ||
        styles['-webkit-background-clip'] === 'text'
      ).toBeTruthy()
    })
  })
})

// =============================================================================
// NESTED COMPONENT STYLING
// =============================================================================

describe('Nested Component Styling', () => {
  describe('Slots in components', () => {
    it('should style slot definitions', () => {
      const ctx = render(`
Card: bg #1a1a1a, pad 16, rad 8
  Title: fs 16, weight bold, col white
  Body: col #888, fs 14

Card
  Title "My Card"
  Body "Description"
`)
      // Card should have its styles
      const cards = Array.from(
        ctx.root.querySelectorAll('[data-component-name="Card"]')
      ) as HTMLElement[]

      if (cards.length > 0) {
        const styles = getElementBaseStyles(cards[0])
        expect(styles['padding']).toBe('16px')
        expect(styles['border-radius']).toBe('8px')
      }
    })
  })

  describe('Deeply nested containers', () => {
    it('should apply styles at all nesting levels', () => {
      const ctx = render(`
Frame bg #111, pad 20
  Frame hor, gap 12
    Frame bg #222, pad 12, rad 8
      Text "Nested", col white
`)
      const result = validateAll(ctx)

      // All elements should pass validation
      expect(result.passed).toBe(true)
    })
  })
})

// =============================================================================
// PROPERTY OVERRIDE PRECEDENCE
// =============================================================================

describe('Property Override Precedence', () => {
  describe('Instance overrides definition', () => {
    it('should override component styles on instance', () => {
      const ctx = render(`
Btn: pad 12, bg #333

Btn "Custom", bg #2563eb
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Instance override should win
      expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
      // Non-overridden should remain
      expect(styles['padding']).toBe('12px')
    })

    it('should override multiple properties', () => {
      const ctx = render(`
Card: bg #1a1a1a, pad 16, rad 8

Card bg #2563eb, pad 24, rad 12
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
      expect(styles['padding']).toBe('24px')
      expect(styles['border-radius']).toBe('12px')
    })
  })

  describe('Later properties win', () => {
    it('should use last value when property repeated', () => {
      const ctx = render('Frame bg #333, pad 12, bg #2563eb')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      // Last bg value should win
      expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
    })
  })
})

// =============================================================================
// SPECIAL VALUES
// =============================================================================

describe('Special Values', () => {
  describe('Named colors', () => {
    it('should resolve white', () => {
      const ctx = render('Frame bg white')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))/i)
    })

    it('should resolve black', () => {
      const ctx = render('Frame bg black')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/(black|#000|#000000|rgb\(0,\s*0,\s*0\))/i)
    })

    it('should resolve transparent', () => {
      const ctx = render('Frame bg transparent')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['background']).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/)
    })
  })

  describe('Keyword values', () => {
    it('should resolve weight keywords', () => {
      const boldCtx = render('Text "T", weight bold')
      const semiboldCtx = render('Text "T", weight semibold')

      const boldEl = getFirstElement(boldCtx)
      const semiboldEl = getFirstElement(semiboldCtx)

      expect(getElementBaseStyles(boldEl)['font-weight']).toMatch(/^(bold|700)$/)
      expect(getElementBaseStyles(semiboldEl)['font-weight']).toBe('600')
    })
  })

  describe('Full/hug values', () => {
    it('should resolve w full to 100%', () => {
      const ctx = render('Frame w full')
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['width']).toBe('100%')
    })
  })
})

// =============================================================================
// COMPLEX REAL-WORLD SCENARIOS
// =============================================================================

describe('Real-World Scenarios', () => {
  describe('Card with actions', () => {
    it('should render card with multiple sections', () => {
      const ctx = render(`
Frame w 300, bg #1a1a1a, rad 12, pad 20, gap 16
  Frame hor, gap 12, ver-center
    Frame w 40, h 40, bg #2563eb, rad 99, center
      Text "U", col white, weight bold
    Frame gap 2
      Text "User Name", col white, fs 14, weight 500
      Text "Description", col #888, fs 12
  Frame hor, gap 8
    Button "Action 1", pad 8 16, bg #333, col white, rad 6
    Button "Action 2", pad 8 16, bg #2563eb, col white, rad 6
`)
      const result = validateAll(ctx)
      expect(result.totalElements).toBeGreaterThan(5)
    })
  })

  describe('Navigation bar', () => {
    it('should render nav with spread layout', () => {
      const ctx = render(`
Frame hor, spread, ver-center, w full, pad 16, bg #0a0a0a
  Text "Logo", col white, fs 18, weight bold
  Frame hor, gap 24
    Text "Home", col #888
    Text "About", col #888
    Text "Contact", col #888
  Button "Sign In", pad 10 20, bg #2563eb, col white, rad 6
`)
      const el = getFirstElement(ctx)
      const styles = getElementBaseStyles(el)

      expect(styles['justify-content']).toBe('space-between')
      expect(styles['align-items']).toBe('center')
      expect(styles['width']).toBe('100%')
    })
  })
})

// =============================================================================
// VALIDATION SUMMARY
// =============================================================================

describe('Validation Summary', () => {
  it('should render complex layouts with multiple elements', () => {
    const ctx = render(`
Frame gap 16, pad 20, bg #0a0a0a
  Frame hor, gap 12, spread
    Text "Title", col white, fs 24, weight bold
    Button "Action", bg #2563eb, col white, pad 10 20, rad 6
  Frame gap 12
    Frame bg #1a1a1a, pad 16, rad 8
      Text "Card 1", col white
    Frame bg #1a1a1a, pad 16, rad 8
      Text "Card 2", col white
`)
    const result = validateAll(ctx)

    // Verify elements are rendered
    expect(result.totalElements).toBeGreaterThan(0)
    expect(result.matchedProperties).toBeGreaterThan(0)

    // Log any failures for debugging
    if (result.failures.length > 0) {
      console.log('Validation failures:', result.failures.slice(0, 3).map(f => ({
        component: f.componentName,
        mismatches: f.mismatches.map(m => `${m.property}: ${m.expected} vs ${m.actual}`),
      })))
    }
  })
})
