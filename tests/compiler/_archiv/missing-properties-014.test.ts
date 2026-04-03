/**
 * Missing Properties 014: Fehlende Property-Tests
 *
 * Hypothesen - diese Properties könnten nicht funktionieren:
 * - shadow sm/md/lg
 * - blur / backdrop-blur
 * - cursor types
 * - scroll properties
 * - grid layout
 * - truncate
 * - typography (italic, underline, uppercase)
 */

import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'

describe('Missing Properties', () => {

  function getStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // 1. Shadow
  // ============================================================
  describe('Shadow', () => {

    test('shadow sm', () => {
      const ir = toIR(parse(`Frame shadow sm`))
      const node = ir.nodes[0]
      const shadow = getStyle(node, 'box-shadow')
      console.log('shadow sm:', shadow)
      expect(shadow).toBeDefined()
    })

    test('shadow md', () => {
      const ir = toIR(parse(`Frame shadow md`))
      const node = ir.nodes[0]
      const shadow = getStyle(node, 'box-shadow')
      console.log('shadow md:', shadow)
      expect(shadow).toBeDefined()
    })

    test('shadow lg', () => {
      const ir = toIR(parse(`Frame shadow lg`))
      const node = ir.nodes[0]
      const shadow = getStyle(node, 'box-shadow')
      console.log('shadow lg:', shadow)
      expect(shadow).toBeDefined()
    })

  })

  // ============================================================
  // 2. Blur
  // ============================================================
  describe('Blur', () => {

    test('blur N', () => {
      const ir = toIR(parse(`Frame blur 10`))
      const node = ir.nodes[0]
      const filter = getStyle(node, 'filter')
      console.log('blur filter:', filter)
      expect(filter).toContain('blur')
    })

    test('backdrop-blur N', () => {
      const ir = toIR(parse(`Frame backdrop-blur 10`))
      const node = ir.nodes[0]
      const backdropFilter = getStyle(node, 'backdrop-filter')
      console.log('backdrop-blur:', backdropFilter)
      expect(backdropFilter).toContain('blur')
    })

    test('blur-bg alias', () => {
      const ir = toIR(parse(`Frame blur-bg 10`))
      const node = ir.nodes[0]
      const backdropFilter = getStyle(node, 'backdrop-filter')
      console.log('blur-bg:', backdropFilter)
      expect(backdropFilter).toContain('blur')
    })

  })

  // ============================================================
  // 3. Cursor
  // ============================================================
  describe('Cursor', () => {

    test('cursor pointer', () => {
      const ir = toIR(parse(`Frame cursor pointer`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'cursor')).toBe('pointer')
    })

    test('cursor grab', () => {
      const ir = toIR(parse(`Frame cursor grab`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'cursor')).toBe('grab')
    })

    test('cursor move', () => {
      const ir = toIR(parse(`Frame cursor move`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'cursor')).toBe('move')
    })

    test('cursor not-allowed', () => {
      const ir = toIR(parse(`Frame cursor not-allowed`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'cursor')).toBe('not-allowed')
    })

  })

  // ============================================================
  // 4. Scroll
  // ============================================================
  describe('Scroll', () => {

    test('scroll (vertical)', () => {
      const ir = toIR(parse(`Frame scroll`))
      const node = ir.nodes[0]
      const overflowY = getStyle(node, 'overflow-y')
      console.log('scroll overflow-y:', overflowY)
      expect(overflowY).toBe('auto')
    })

    test('scroll-hor', () => {
      const ir = toIR(parse(`Frame scroll-hor`))
      const node = ir.nodes[0]
      const overflowX = getStyle(node, 'overflow-x')
      console.log('scroll-hor overflow-x:', overflowX)
      expect(overflowX).toBe('auto')
    })

    test('scroll-both', () => {
      const ir = toIR(parse(`Frame scroll-both`))
      const node = ir.nodes[0]
      const overflow = getStyle(node, 'overflow')
      console.log('scroll-both overflow:', overflow)
      expect(overflow).toBe('auto')
    })

    test('clip', () => {
      const ir = toIR(parse(`Frame clip`))
      const node = ir.nodes[0]
      const overflow = getStyle(node, 'overflow')
      console.log('clip overflow:', overflow)
      expect(overflow).toBe('hidden')
    })

  })

  // ============================================================
  // 5. Grid
  // ============================================================
  describe('Grid', () => {

    test('grid N (columns)', () => {
      const ir = toIR(parse(`Frame grid 3`))
      const node = ir.nodes[0]
      const display = getStyle(node, 'display')
      const gridCols = getStyle(node, 'grid-template-columns')
      console.log('grid 3:', { display, gridCols })
      expect(display).toBe('grid')
      expect(gridCols).toContain('1fr')
    })

    test('grid auto', () => {
      const ir = toIR(parse(`Frame grid auto`))
      const node = ir.nodes[0]
      const display = getStyle(node, 'display')
      console.log('grid auto display:', display)
      expect(display).toBe('grid')
    })

    test('grid + gap', () => {
      const ir = toIR(parse(`Frame grid 2 gap 10`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'display')).toBe('grid')
      expect(getStyle(node, 'gap')).toBe('10px')
    })

  })

  // ============================================================
  // 6. Typography
  // ============================================================
  describe('Typography', () => {

    test('truncate', () => {
      const ir = toIR(parse(`Text truncate "Long text..."`))
      const node = ir.nodes[0]
      const overflow = getStyle(node, 'overflow')
      const textOverflow = getStyle(node, 'text-overflow')
      const whiteSpace = getStyle(node, 'white-space')
      console.log('truncate:', { overflow, textOverflow, whiteSpace })
      expect(textOverflow).toBe('ellipsis')
    })

    test('italic', () => {
      const ir = toIR(parse(`Text italic "Hello"`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'font-style')).toBe('italic')
    })

    test('underline', () => {
      const ir = toIR(parse(`Text underline "Hello"`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'text-decoration')).toBe('underline')
    })

    test('uppercase', () => {
      const ir = toIR(parse(`Text uppercase "Hello"`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'text-transform')).toBe('uppercase')
    })

    test('lowercase', () => {
      const ir = toIR(parse(`Text lowercase "Hello"`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'text-transform')).toBe('lowercase')
    })

  })

  // ============================================================
  // 7. Opacity
  // ============================================================
  describe('Opacity', () => {

    test('opacity N', () => {
      const ir = toIR(parse(`Frame opacity 0.5`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'opacity')).toBe('0.5')
    })

    test('o alias', () => {
      const ir = toIR(parse(`Frame o 0.5`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'opacity')).toBe('0.5')
    })

    test('opa alias', () => {
      const ir = toIR(parse(`Frame opa 0.5`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'opacity')).toBe('0.5')
    })

  })

  // ============================================================
  // 8. Visibility
  // ============================================================
  describe('Visibility', () => {

    test('hidden', () => {
      const ir = toIR(parse(`Frame hidden`))
      const node = ir.nodes[0]
      const display = getStyle(node, 'display')
      const visibility = getStyle(node, 'visibility')
      console.log('hidden:', { display, visibility })
      // Könnte display: none ODER visibility: hidden sein
      expect(display === 'none' || visibility === 'hidden').toBe(true)
    })

    test('visible', () => {
      // visible removes display:none (sets display: ''), not visibility
      const ir = toIR(parse(`Frame visible`))
      const node = ir.nodes[0]
      const display = getStyle(node, 'display')
      console.log('visible display:', display)
      // visible removes display:none, so display should be '' or undefined (not 'none')
      expect(display).not.toBe('none')
    })

    test('disabled', () => {
      const ir = toIR(parse(`Button disabled`))
      const node = ir.nodes[0]
      // disabled sollte ein Attribut setzen, nicht nur Style
      console.log('disabled node:', node.attributes)
    })

  })

  // ============================================================
  // 9. Transform
  // ============================================================
  describe('Transform', () => {

    test('rotate N', () => {
      const ir = toIR(parse(`Frame rotate 45`))
      const node = ir.nodes[0]
      const transform = getStyle(node, 'transform')
      console.log('rotate:', transform)
      expect(transform).toContain('rotate')
    })

    test('scale N', () => {
      const ir = toIR(parse(`Frame scale 1.5`))
      const node = ir.nodes[0]
      const transform = getStyle(node, 'transform')
      console.log('scale:', transform)
      expect(transform).toContain('scale')
    })

    test('translate N', () => {
      const ir = toIR(parse(`Frame translate 10`))
      const node = ir.nodes[0]
      const transform = getStyle(node, 'transform')
      console.log('translate:', transform)
      expect(transform).toContain('translate')
    })

  })

  // ============================================================
  // 10. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('shadow + blur + opacity', () => {
      const ir = toIR(parse(`Frame shadow md blur 5 opacity 0.8`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'box-shadow')).toBeDefined()
      expect(getStyle(node, 'filter')).toContain('blur')
      expect(getStyle(node, 'opacity')).toBe('0.8')
    })

    test('grid + scroll + gap', () => {
      const ir = toIR(parse(`Frame grid 3 scroll gap 10`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'display')).toBe('grid')
      expect(getStyle(node, 'gap')).toBe('10px')
    })

    test('truncate + uppercase', () => {
      const ir = toIR(parse(`Text truncate uppercase "Hello"`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'text-overflow')).toBe('ellipsis')
      expect(getStyle(node, 'text-transform')).toBe('uppercase')
    })

  })

})
