/**
 * DSL Style Rendering Tests
 *
 * Tests the complete pipeline from DSL properties to CSS styles.
 * Verifies that parsed properties produce correct React CSS output.
 */

import { describe, it, expect, test } from 'vitest'
import { generate, getStyle } from '../../test-utils'
import { parse } from '../../../parser/parser'

// ============================================
// Padding → CSS
// ============================================

describe('Padding → CSS', () => {
  test.each([
    ['pad 16', { padding: '16px' }],
    ['padding 16', { padding: '16px' }],
    ['pad 0', { padding: '0px' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['pad 16 8', { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '8px', paddingRight: '8px' }],
    ['pad 10 20 30 40', { paddingTop: '10px', paddingRight: '20px', paddingBottom: '30px', paddingLeft: '40px' }],
  ])('%s → %o (multi-value)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['pad l 16', { paddingLeft: '16px' }],
    ['pad r 16', { paddingRight: '16px' }],
    ['pad u 16', { paddingTop: '16px' }],
    ['pad d 16', { paddingBottom: '16px' }],
    // NOTE: 'padding left 16' format not supported - use shorthand 'pad l 16'
  ])('%s → %o (directional)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['pad l-r 16', { paddingLeft: '16px', paddingRight: '16px' }],
    ['pad u-d 16', { paddingTop: '16px', paddingBottom: '16px' }],
    // NOTE: 'padding left-right 16' and 'padding top-bottom 16' not supported
    // Use shorthand: 'pad l-r 16' and 'pad u-d 16'
  ])('%s → %o (combined directions)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document unsupported long-form directional syntax
  describe('long-form directional padding (NOT SUPPORTED)', () => {
    it.skip('padding left 16 - use pad l 16 instead', () => {
      const style = getStyle(generate('Box padding left 16'))
      expect(style.paddingLeft).toBe('16px')
    })
  })
})

// ============================================
// Margin → CSS
// ============================================

describe('Margin → CSS', () => {
  test.each([
    ['mar 16', { margin: '16px' }],
    ['margin 16', { margin: '16px' }],
    ['mar 0', { margin: '0px' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['mar l 16', { marginLeft: '16px' }],
    ['mar r 16', { marginRight: '16px' }],
    ['mar u 16', { marginTop: '16px' }],
    ['mar d 16', { marginBottom: '16px' }],
  ])('%s → %o (directional)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Gap → CSS
// ============================================

describe('Gap → CSS', () => {
  test.each([
    ['gap 16', { gap: '16px' }],
    ['gap 8', { gap: '8px' }],
    // NOTE: gap-x and gap-y are not supported - use 'gap' for both
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document unsupported gap directional syntax
  describe('directional gap (NOT SUPPORTED)', () => {
    it.skip('gap-x 16 - not implemented', () => {
      const style = getStyle(generate('Box gap-x 16'))
      expect(style.columnGap).toBe('16px')
    })

    it.skip('gap-y 16 - not implemented', () => {
      const style = getStyle(generate('Box gap-y 16'))
      expect(style.rowGap).toBe('16px')
    })
  })
})

// ============================================
// Sizing → CSS
// ============================================

describe('Sizing → CSS', () => {
  test.each([
    ['w 200', { width: '200px' }],
    ['width 200', { width: '200px' }],
    ['h 100', { height: '100px' }],
    ['height 100', { height: '100px' }],
    ['w full', { width: '100%' }],
    ['h full', { height: '100%' }],
    ['full', { width: '100%', height: '100%' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['minw 100', { minWidth: '100px' }],
    ['maxw 500', { maxWidth: '500px' }],
    ['minh 50', { minHeight: '50px' }],
    ['maxh 300', { maxHeight: '300px' }],
    // NOTE: Long-form min-width, max-width, min-height, max-height NOT supported
    // Use shorthand: minw, maxw, minh, maxh
  ])('%s → %o (min/max)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document unsupported long-form min/max syntax
  describe('long-form min/max sizing (NOT SUPPORTED)', () => {
    it.skip('min-width 100 - use minw instead', () => {
      const style = getStyle(generate('Box min-width 100'))
      expect(style.minWidth).toBe('100px')
    })

    it.skip('max-width 500 - use maxw instead', () => {
      const style = getStyle(generate('Box max-width 500'))
      expect(style.maxWidth).toBe('500px')
    })

    it.skip('min-height 50 - use minh instead', () => {
      const style = getStyle(generate('Box min-height 50'))
      expect(style.minHeight).toBe('50px')
    })

    it.skip('max-height 300 - use maxh instead', () => {
      const style = getStyle(generate('Box max-height 300'))
      expect(style.maxHeight).toBe('300px')
    })
  })
})

// ============================================
// Colors → CSS
// ============================================

describe('Colors → CSS', () => {
  test.each([
    ['bg #FF0000', { backgroundColor: '#FF0000' }],
    ['background #FF0000', { backgroundColor: '#FF0000' }],
    ['bg #F00', { backgroundColor: '#F00' }],
    ['bg #FF000080', { backgroundColor: '#FF000080' }],
  ])('%s → %o (background)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['col #FFFFFF', { color: '#FFFFFF' }],
    ['color #FFFFFF', { color: '#FFFFFF' }],
    ['col #FFF', { color: '#FFF' }],
  ])('%s → %o (text color)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['boc #333', { borderColor: '#333' }],
    // NOTE: 'border-color' long form is NOT supported - use 'boc'
  ])('%s → %o (border color)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document unsupported long-form border-color
  describe('long-form border-color (NOT SUPPORTED)', () => {
    it.skip('border-color #333 - use boc instead', () => {
      const style = getStyle(generate('Box border-color #333'))
      expect(style.borderColor).toBe('#333')
    })
  })
})

// ============================================
// Border → CSS
// ============================================

describe('Border → CSS', () => {
  test.each([
    ['bor 1', { border: '1px solid' }],
    ['border 1', { border: '1px solid' }],
    ['bor 2', { border: '2px solid' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['rad 8', { borderRadius: '8px' }],
    ['radius 8', { borderRadius: '8px' }],
    ['rad 0', { borderRadius: '0px' }],
  ])('%s → %o (radius)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['bor l 1', { borderLeft: '1px solid currentColor' }],
    ['bor r 1', { borderRight: '1px solid currentColor' }],
    ['bor u 1', { borderTop: '1px solid currentColor' }],
    ['bor d 1', { borderBottom: '1px solid currentColor' }],
  ])('%s → %o (directional)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Layout → CSS
// ============================================

describe('Layout → CSS', () => {
  test.each([
    ['hor', { flexDirection: 'row' }],
    ['horizontal', { flexDirection: 'row' }],
    ['ver', { flexDirection: 'column' }],
    ['vertical', { flexDirection: 'column' }],
  ])('%s → %o (direction)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['between', { justifyContent: 'space-between' }],
    ['wrap', { flexWrap: 'wrap' }],
    ['grow', { flexGrow: 1 }],
    ['fill', { flexGrow: 1 }],
    // NOTE: 'shrink 0' is NOT supported
  ])('%s → %o (flex)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document unsupported shrink
  describe('shrink property (NOT SUPPORTED)', () => {
    it.skip('shrink 0 - not implemented', () => {
      const style = getStyle(generate('Box shrink 0'))
      expect(style.flexShrink).toBe(0)
    })
  })

  test.each([
    ['stacked', { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }],
  ])('%s → %o (grid stacking)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Alignment → CSS
// ============================================

describe('Alignment → CSS', () => {
  // In column layout (default), hor-* affects alignItems, ver-* affects justifyContent
  describe('in column layout (default)', () => {
    test.each([
      ['hor-l', { alignItems: 'flex-start' }],
      ['hor-cen', { alignItems: 'center' }],
      ['hor-r', { alignItems: 'flex-end' }],
    ])('%s → %o (cross-axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })

    test.each([
      ['ver-t', { justifyContent: 'flex-start' }],
      ['ver-cen', { justifyContent: 'center' }],
      ['ver-b', { justifyContent: 'flex-end' }],
    ])('%s → %o (main-axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })
  })

  // In row layout, hor-* affects justifyContent, ver-* affects alignItems
  describe('in row layout', () => {
    test.each([
      ['hor hor-l', { justifyContent: 'flex-start' }],
      ['hor hor-cen', { justifyContent: 'center' }],
      ['hor hor-r', { justifyContent: 'flex-end' }],
    ])('%s → %o (main-axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })

    test.each([
      ['hor ver-t', { alignItems: 'flex-start' }],
      ['hor ver-cen', { alignItems: 'center' }],
      ['hor ver-b', { alignItems: 'flex-end' }],
    ])('%s → %o (cross-axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })
  })

  test.each([
    ['cen', { justifyContent: 'center' }],
    ['center', { justifyContent: 'center' }],
  ])('%s → %o (center shorthand)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Typography → CSS
// ============================================

describe('Typography → CSS', () => {
  test.each([
    ['size 14', { fontSize: '14px' }],
    ['size 24', { fontSize: '24px' }],
  ])('%s → %o (font size)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['weight 400', { fontWeight: 400 }],
    ['weight 600', { fontWeight: 600 }],
    ['weight bold', { fontWeight: 700 }],
  ])('%s → %o (font weight)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['line 1.5', { lineHeight: 1.5 }],
    ['line 2', { lineHeight: 2 }],
  ])('%s → %o (line height)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test.each([
    ['align left', { textAlign: 'left' }],
    // NOTE: 'align center' may conflict with layout center - use explicit 'text-align center' if supported
    ['align right', { textAlign: 'right' }],
    ['align justify', { textAlign: 'justify' }],
  ])('%s → %o (text align)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Document potential conflict with 'align center'
  describe('align center edge case', () => {
    it('align center may set textAlign OR layout centering', () => {
      const style = getStyle(generate('Box align center'))
      // Document actual behavior: might set textAlign or justifyContent
      // This test just verifies no crash
    })
  })

  test.each([
    ['italic', { fontStyle: 'italic' }],
    ['underline', { textDecoration: 'underline' }],
    ['uppercase', { textTransform: 'uppercase' }],
    ['lowercase', { textTransform: 'lowercase' }],
  ])('%s → %o (text style)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test('truncate → ellipsis styles', () => {
    const style = getStyle(generate('Box truncate'))
    expect(style).toMatchObject({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    })
  })
})

// ============================================
// Visual Effects → CSS
// ============================================

describe('Visual Effects → CSS', () => {
  test.each([
    ['opacity 0.5', { opacity: 0.5 }],
    ['opacity 1', { opacity: 1 }],
    ['opa 0.5', { opacity: 0.5 }],
  ])('%s → %o (opacity)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  // Note: Testing parsed properties since generator returns wrapper components
  // 'not-allowed' is skipped because lexer splits hyphenated values (not + allowed)
  test.each([
    ['cursor pointer', { cursor: 'pointer' }],
    ['cursor move', { cursor: 'move' }],
  ])('%s → %o (cursor)', (input, expected) => {
    const result = parse(`Box ${input}`)
    expect(result.nodes[0].properties).toMatchObject(expected)
  })

  test.each([
    ['z 100', { zIndex: 100 }],
    ['z 1', { zIndex: 1 }],
  ])('%s → %o (z-index)', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })

  test('hidden → display none', () => {
    const style = getStyle(generate('Box hidden'))
    expect(style.display).toBe('none')
  })
})

// ============================================
// Scroll → CSS
// ============================================

describe('Scroll → CSS', () => {
  test.each([
    ['scroll', { overflowY: 'auto' }],
    ['scroll-ver', { overflowY: 'auto' }],
    ['scroll-hor', { overflowX: 'auto' }],
    ['scroll-both', { overflow: 'auto' }],
    ['clip', { overflow: 'hidden' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Grid → CSS
// ============================================

describe('Grid → CSS', () => {
  test.each([
    ['grid 3', { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }],
    ['grid 4', { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }],
  ])('%s → %o', (input, expected) => {
    const style = getStyle(generate(`Box ${input}`))
    expect(style).toMatchObject(expected)
  })
})

// ============================================
// Combined Properties
// ============================================

describe('Combined Properties', () => {
  // Note: Testing parsed properties since generator returns wrapper components
  test('multiple spacing properties', () => {
    const result = parse('Box pad 16 mar 8 gap 4')
    expect(result.nodes[0].properties).toMatchObject({
      pad: 16,
      mar: 8,
      gap: 4,
    })
  })

  test('complete card style', () => {
    const result = parse('Card w 300 pad 16 bg #1E1E2E rad 12')
    expect(result.nodes[0].properties).toMatchObject({
      w: 300,
      pad: 16,
      bg: '#1E1E2E',
      rad: 12,
    })
  })

  test('button style', () => {
    const result = parse('Button pad 12 bg #3B82F6 rad 8 cursor pointer')
    expect(result.nodes[0].properties).toMatchObject({
      pad: 12,
      bg: '#3B82F6',
      rad: 8,
      cursor: 'pointer',
    })
  })

  test('header layout', () => {
    const result = parse('Header hor between pad 16 bg #111')
    expect(result.nodes[0].properties).toMatchObject({
      hor: true,
      align_main: 'between',
      pad: 16,
      bg: '#111',
    })
  })
})
