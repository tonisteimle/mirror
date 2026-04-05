/**
 * Style Validation Tests
 *
 * Tests that validate UI elements render exactly as expected.
 * Uses the new testing infrastructure to compare IR expectations with DOM reality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  renderMirror,
  validateAll,
  validateById,
  assertValid,
  formatReport,
  getElementBaseStyles,
  getIRNodeById,
  getAllIRNodes,
} from '../../../compiler/testing'
import type { RenderContext, ValidationResult } from '../../../compiler/testing'

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

  // Set up global environment
  global.document = dom.window.document
  global.window = dom.window as unknown as Window & typeof globalThis
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
  global.Node = dom.window.Node
  global.getComputedStyle = dom.window.getComputedStyle

  cleanup = []
})

afterEach(() => {
  // Run all cleanup functions
  for (const fn of cleanup) {
    fn()
  }
  cleanup = []
})

/**
 * Helper to render and track cleanup
 */
function render(code: string): RenderContext {
  const ctx = renderMirror(code, dom.window.document.body)
  cleanup.push(ctx.cleanup)
  return ctx
}

// =============================================================================
// BASIC VALIDATION TESTS
// =============================================================================

describe('Style Validation Infrastructure', () => {
  describe('Basic Rendering', () => {
    it('should render Mirror code and create elements', () => {
      const ctx = render('Frame bg #2563eb')

      expect(ctx.root).toBeDefined()
      expect(ctx.elements.size).toBeGreaterThan(0)
      expect(ctx.ir.nodes.length).toBeGreaterThan(0)
    })

    it('should attach data-mirror-id attributes', () => {
      const ctx = render('Frame bg #2563eb')

      const firstNode = ctx.ir.nodes[0]
      const element = ctx.elements.get(firstNode.id)

      expect(element).toBeDefined()
      expect(element?.getAttribute('data-mirror-id')).toBe(firstNode.id)
    })

    it('should store _baseStyles on elements', () => {
      const ctx = render('Frame bg #2563eb, pad 12')

      const firstNode = ctx.ir.nodes[0]
      const element = ctx.elements.get(firstNode.id)!
      const baseStyles = getElementBaseStyles(element)

      // Colors may be in hex or rgb format depending on environment
      expect(baseStyles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
      expect(baseStyles['padding']).toBe('12px')
    })
  })

  describe('IR Node Access', () => {
    it('should find IR node by ID', () => {
      const ctx = render('Frame bg #2563eb')

      const firstNode = ctx.ir.nodes[0]
      const found = getIRNodeById(ctx.ir, firstNode.id)

      expect(found).toBe(firstNode)
    })

    it('should get all IR nodes including children', () => {
      const ctx = render(`
Frame bg #111
  Frame bg #222
    Text "Hello"
`)

      const allNodes = getAllIRNodes(ctx.ir)

      // Should have Frame > Frame > Text
      expect(allNodes.length).toBe(3)
    })
  })
})

// =============================================================================
// LAYOUT DEFAULTS VALIDATION
// =============================================================================

describe('Layout Defaults Validation', () => {
  describe('Frame hor', () => {
    it('should have flex-direction: row', () => {
      const ctx = render('Frame hor')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['flex-direction']).toBe('row')
    })

    it('should have align-items: flex-start (NOT center)', () => {
      const ctx = render('Frame hor')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      // This is the critical test - hor should NOT auto-center
      expect(styles['align-items']).toBe('flex-start')
    })

    it('should have display: flex', () => {
      const ctx = render('Frame hor')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['display']).toBe('flex')
    })
  })

  describe('Frame ver', () => {
    it('should have flex-direction: column', () => {
      const ctx = render('Frame ver')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['flex-direction']).toBe('column')
    })

    it('should have align-items: flex-start', () => {
      const ctx = render('Frame ver')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['align-items']).toBe('flex-start')
    })
  })

  describe('Symmetry: hor and ver should have same align-items', () => {
    it('Frame hor and Frame ver should both default to flex-start', () => {
      const ctxHor = render('Frame hor')
      const ctxVer = render('Frame ver')

      const nodeHor = ctxHor.ir.nodes[0]
      const nodeVer = ctxVer.ir.nodes[0]

      const elementHor = ctxHor.elements.get(nodeHor.id)!
      const elementVer = ctxVer.elements.get(nodeVer.id)!

      const stylesHor = getElementBaseStyles(elementHor)
      const stylesVer = getElementBaseStyles(elementVer)

      // CRITICAL: Both should be flex-start
      expect(stylesHor['align-items']).toBe('flex-start')
      expect(stylesVer['align-items']).toBe('flex-start')
      expect(stylesHor['align-items']).toBe(stylesVer['align-items'])
    })
  })

  describe('Explicit centering', () => {
    it('Frame hor, center should center both axes', () => {
      const ctx = render('Frame hor, center')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('center')
    })

    it('Frame hor, ver-center should only center vertically', () => {
      const ctx = render('Frame hor, ver-center')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      // Should NOT have justify-content: center
      expect(styles['justify-content']).not.toBe('center')
      // SHOULD have align-items: center
      expect(styles['align-items']).toBe('center')
    })

    it('Frame ver, hor-center should only center horizontally', () => {
      const ctx = render('Frame ver, hor-center')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      // In column layout, horizontal centering is align-items
      expect(styles['align-items']).toBe('center')
    })
  })
})

// =============================================================================
// FULL VALIDATION TESTS
// =============================================================================

describe('Full Validation API', () => {
  describe('validateAll()', () => {
    it('should pass when styles match', () => {
      const ctx = render('Frame bg #2563eb, pad 12')

      const result = validateAll(ctx)

      expect(result.passed).toBe(true)
      expect(result.failedElements).toBe(0)
    })

    it('should report element counts', () => {
      const ctx = render(`
Frame bg #111
  Frame bg #222
  Frame bg #333
`)

      const result = validateAll(ctx)

      expect(result.totalElements).toBeGreaterThan(0)
    })
  })

  describe('validateById()', () => {
    it('should validate a specific element', () => {
      const ctx = render('Frame bg #2563eb, pad 12')

      const nodeId = ctx.ir.nodes[0].id
      const result = validateById(ctx, nodeId)

      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe(nodeId)
      expect(result!.passed).toBe(true)
    })

    it('should return null for non-existent node ID', () => {
      const ctx = render('Frame bg #2563eb')

      const result = validateById(ctx, 'non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('formatReport()', () => {
    it('should generate a human-readable report', () => {
      const ctx = render('Frame bg #2563eb, pad 12')
      const result = validateAll(ctx)
      const report = formatReport(result)

      expect(report).toContain('STYLE VALIDATION REPORT')
      expect(report).toContain('PASSED')
    })
  })
})

// =============================================================================
// STYLE PROPERTY TESTS
// =============================================================================

describe('Style Property Validation', () => {
  describe('Colors', () => {
    it('should validate background color', () => {
      const ctx = render('Frame bg #2563eb')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      // Colors may be in hex or rgb format depending on environment
      expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
    })

    it('should validate text color', () => {
      const ctx = render('Text "Hello", col #ffffff')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      // Colors may be in hex or rgb format depending on environment
      expect(styles['color']).toMatch(/(#ffffff|rgb\(255,\s*255,\s*255\))/)
    })
  })

  describe('Spacing', () => {
    it('should validate padding', () => {
      const ctx = render('Frame pad 12')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['padding']).toBe('12px')
    })

    it('should validate gap', () => {
      const ctx = render('Frame gap 16')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['gap']).toBe('16px')
    })
  })

  describe('Dimensions', () => {
    it('should validate width', () => {
      const ctx = render('Frame w 200')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['width']).toBe('200px')
    })

    it('should validate height', () => {
      const ctx = render('Frame h 100')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['height']).toBe('100px')
    })

    it('should validate border-radius', () => {
      const ctx = render('Frame rad 8')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['border-radius']).toBe('8px')
    })
  })
})

// =============================================================================
// COMPLEX LAYOUT TESTS
// =============================================================================

describe('Complex Layout Validation', () => {
  describe('Nested containers', () => {
    it('should validate parent and children independently', () => {
      const ctx = render(`
Frame bg #111, pad 16
  Frame hor, gap 12
    Text "A"
    Text "B"
`)

      const result = validateAll(ctx)

      // All elements should pass
      expect(result.passed).toBe(true)
      // Should have multiple elements
      expect(result.totalElements).toBeGreaterThan(1)
    })
  })

  describe('Spread layout', () => {
    it('should validate Frame hor, spread', () => {
      const ctx = render('Frame hor, spread')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['justify-content']).toBe('space-between')
    })

    it('should validate Frame hor, spread, ver-center', () => {
      const ctx = render('Frame hor, spread, ver-center')

      const node = ctx.ir.nodes[0]
      const element = ctx.elements.get(node.id)!
      const styles = getElementBaseStyles(element)

      expect(styles['justify-content']).toBe('space-between')
      expect(styles['align-items']).toBe('center')
    })
  })
})
