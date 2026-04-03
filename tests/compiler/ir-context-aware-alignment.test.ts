/**
 * Tests for context-aware alignment
 *
 * The `center` keyword should be interpreted based on context:
 * - `top center` → top + horizontal center
 * - `left center` → left + vertical center
 * - `center` alone → center both axes
 *
 * Also tests that `align` keyword is optional:
 * - `Box top left` should work same as `Box align top left`
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

// Helper to get styles from first child or first node
function getStyles(code: string) {
  const ast = parse(code)
  const ir = toIR(ast)
  if (ir.nodes.length === 0) return []
  const node = ir.nodes[0]
  // If it's a component definition, get child styles
  if (node.children && node.children.length > 0) {
    return node.children[0].styles
  }
  return node.styles
}

// Helper to find style by property name
function findStyle(styles: any[], prop: string) {
  return styles.find(s => s.property === prop)
}

describe('IR: Context-Aware Center', () => {

  describe('top center', () => {
    it('generates vertical start + horizontal center for top center', () => {
      const styles = getStyles(`
Container:
  Box top center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column direction: top → justify-content: flex-start, center → align-items: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-start')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })

    it('works with align keyword: align top center', () => {
      const styles = getStyles(`
Container:
  Box align top center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-start')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })
  })

  describe('bottom center', () => {
    it('generates vertical end + horizontal center for bottom center', () => {
      const styles = getStyles(`
Container:
  Box bottom center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column direction: bottom → justify-content: flex-end, center → align-items: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-end')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })
  })

  describe('left center', () => {
    it('generates horizontal start + vertical center for left center', () => {
      const styles = getStyles(`
Container:
  Box left center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column direction: left → align-items: flex-start, center → justify-content: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('center')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-start')
    })
  })

  describe('right center', () => {
    it('generates horizontal end + vertical center for right center', () => {
      const styles = getStyles(`
Container:
  Box right center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column direction: right → align-items: flex-end, center → justify-content: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('center')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-end')
    })
  })

  describe('center alone', () => {
    it('generates center on both axes', () => {
      const styles = getStyles(`
Container:
  Box center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      expect(justify).toBeDefined()
      expect(justify.value).toBe('center')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })
  })

  describe('explicit hor-center and ver-center still work', () => {
    it('top hor-center works same as top center', () => {
      const styles = getStyles(`
Container:
  Box top hor-center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-start')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })

    it('left ver-center works same as left center', () => {
      const styles = getStyles(`
Container:
  Box left ver-center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      expect(justify).toBeDefined()
      expect(justify.value).toBe('center')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-start')
    })
  })
})

describe('IR: Align Keyword Optional', () => {

  describe('top left without align keyword', () => {
    it('parses top left as two boolean properties', () => {
      const styles = getStyles(`
Container:
  Box top left

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column: top → justify-content: flex-start, left → align-items: flex-start
      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-start')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-start')
    })

    it('works same as align top left', () => {
      const withoutAlign = getStyles(`
Container:
  Box top left

Container
`)
      const withAlign = getStyles(`
Container:
  Box align top left

Container
`)

      const j1 = findStyle(withoutAlign, 'justify-content')
      const j2 = findStyle(withAlign, 'justify-content')
      const a1 = findStyle(withoutAlign, 'align-items')
      const a2 = findStyle(withAlign, 'align-items')

      expect(j1.value).toBe(j2.value)
      expect(a1.value).toBe(a2.value)
    })
  })

  describe('bottom right without align keyword', () => {
    it('parses bottom right as two boolean properties', () => {
      const styles = getStyles(`
Container:
  Box bottom right

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In column: bottom → justify-content: flex-end, right → align-items: flex-end
      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-end')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-end')
    })
  })

  describe('spread without align keyword', () => {
    it('spread works as boolean property', () => {
      const styles = getStyles(`
Container:
  Box spread

Container
`)
      const justify = findStyle(styles, 'justify-content')

      expect(justify).toBeDefined()
      expect(justify.value).toBe('space-between')
    })
  })
})

describe('IR: Horizontal Layout Direction', () => {

  describe('top center in horizontal layout', () => {
    it('generates correct alignment in hor layout', () => {
      const styles = getStyles(`
Container:
  Box hor top center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In row direction: top → align-items: flex-start, center → justify-content: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('center')
      expect(align).toBeDefined()
      expect(align.value).toBe('flex-start')
    })
  })

  describe('left center in horizontal layout', () => {
    it('generates correct alignment in hor layout', () => {
      const styles = getStyles(`
Container:
  Box hor left center

Container
`)
      const justify = findStyle(styles, 'justify-content')
      const align = findStyle(styles, 'align-items')

      // In row direction: left → justify-content: flex-start, center → align-items: center
      expect(justify).toBeDefined()
      expect(justify.value).toBe('flex-start')
      expect(align).toBeDefined()
      expect(align.value).toBe('center')
    })
  })
})
