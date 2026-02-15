/**
 * DSL Property Tests
 *
 * Systematic tests for all DSL properties.
 * Tests both parsing and rendering for each property.
 *
 * Categories:
 * - Spacing: padding, margin, gap
 * - Sizing: width, height, min/max, full
 * - Colors: background, color, border-color
 * - Border: border, radius
 * - Layout: horizontal, vertical, between, wrap, grow
 * - Alignment: hor-l, hor-cen, hor-r, ver-t, ver-cen, ver-b, center
 */

import { describe, it, expect } from 'vitest'
import { runSyntaxTests, type SyntaxTest } from '../_infrastructure'
import { generate, getStyle } from '../../test-utils'

// ============================================
// Spacing Properties
// ============================================

describe('Spacing Properties', () => {
  // ------------------------------------
  // Padding
  // ------------------------------------
  runSyntaxTests('padding', [
    // Single value
    {
      name: 'pad with single value',
      input: 'Box pad 16',
      expect: {
        parse: { properties: { pad: 16 } },
        render: { style: { padding: '16px' } }
      }
    },
    {
      name: 'padding (long form) with single value',
      input: 'Box padding 16',
      expect: {
        parse: { properties: { pad: 16 } },
        render: { style: { padding: '16px' } }
      }
    },

    // Two values (vertical horizontal)
    {
      name: 'pad with two values',
      input: 'Box pad 16 8',
      expect: {
        parse: {
          properties: {
            pad_u: 16,
            pad_d: 16,
            pad_l: 8,
            pad_r: 8
          }
        },
        render: {
          style: {
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '8px',
            paddingRight: '8px'
          }
        }
      }
    },

    // Four values (top right bottom left)
    {
      name: 'pad with four values',
      input: 'Box pad 10 20 30 40',
      expect: {
        parse: {
          properties: {
            pad_u: 10,
            pad_r: 20,
            pad_d: 30,
            pad_l: 40
          }
        },
        render: {
          style: {
            paddingTop: '10px',
            paddingRight: '20px',
            paddingBottom: '30px',
            paddingLeft: '40px'
          }
        }
      }
    },

    // Directional padding
    {
      name: 'pad left',
      input: 'Box pad l 16',
      expect: {
        parse: { properties: { pad_l: 16 } },
        render: { style: { paddingLeft: '16px' } }
      }
    },
    {
      name: 'pad right',
      input: 'Box pad r 16',
      expect: {
        parse: { properties: { pad_r: 16 } },
        render: { style: { paddingRight: '16px' } }
      }
    },
    {
      name: 'pad top (u)',
      input: 'Box pad u 16',
      expect: {
        parse: { properties: { pad_u: 16 } },
        render: { style: { paddingTop: '16px' } }
      }
    },
    {
      name: 'pad bottom (d)',
      input: 'Box pad d 16',
      expect: {
        parse: { properties: { pad_d: 16 } },
        render: { style: { paddingBottom: '16px' } }
      }
    },

    // Combined directions
    {
      name: 'pad left-right',
      input: 'Box pad l-r 16',
      expect: {
        parse: { properties: { pad_l: 16, pad_r: 16 } },
        render: {
          style: {
            paddingLeft: '16px',
            paddingRight: '16px'
          }
        }
      }
    },
    {
      name: 'pad top-bottom (u-d)',
      input: 'Box pad u-d 16',
      expect: {
        parse: { properties: { pad_u: 16, pad_d: 16 } },
        render: {
          style: {
            paddingTop: '16px',
            paddingBottom: '16px'
          }
        }
      }
    },

    // Long form directional
    {
      name: 'padding left (long form)',
      input: 'Box padding left 16',
      expect: {
        parse: { properties: { pad_l: 16 } },
        render: { style: { paddingLeft: '16px' } }
      }
    },
    {
      name: 'padding left-right (long form)',
      input: 'Box padding left-right 16',
      expect: {
        parse: { properties: { pad_l: 16, pad_r: 16 } },
        render: {
          style: {
            paddingLeft: '16px',
            paddingRight: '16px'
          }
        }
      }
    },
    {
      name: 'padding top-bottom (long form)',
      input: 'Box padding top-bottom 16',
      expect: {
        parse: { properties: { pad_u: 16, pad_d: 16 } },
        render: {
          style: {
            paddingTop: '16px',
            paddingBottom: '16px'
          }
        }
      }
    },
  ])

  // ------------------------------------
  // Margin
  // ------------------------------------
  runSyntaxTests('margin', [
    // Single value
    {
      name: 'mar with single value',
      input: 'Box mar 16',
      expect: {
        parse: { properties: { mar: 16 } },
        render: { style: { margin: '16px' } }
      }
    },
    {
      name: 'margin (long form) with single value',
      input: 'Box margin 16',
      expect: {
        parse: { properties: { mar: 16 } },
        render: { style: { margin: '16px' } }
      }
    },

    // Two values
    {
      name: 'mar with two values',
      input: 'Box mar 10 20',
      expect: {
        parse: {
          properties: {
            mar_u: 10,
            mar_d: 10,
            mar_l: 20,
            mar_r: 20
          }
        },
        render: {
          style: {
            marginTop: '10px',
            marginBottom: '10px',
            marginLeft: '20px',
            marginRight: '20px'
          }
        }
      }
    },

    // Four values
    {
      name: 'mar with four values',
      input: 'Box mar 10 20 30 40',
      expect: {
        parse: {
          properties: {
            mar_u: 10,
            mar_r: 20,
            mar_d: 30,
            mar_l: 40
          }
        },
        render: {
          style: {
            marginTop: '10px',
            marginRight: '20px',
            marginBottom: '30px',
            marginLeft: '40px'
          }
        }
      }
    },

    // Directional margin
    {
      name: 'mar left',
      input: 'Box mar l 16',
      expect: {
        parse: { properties: { mar_l: 16 } },
        render: { style: { marginLeft: '16px' } }
      }
    },
    {
      name: 'mar right',
      input: 'Box mar r 16',
      expect: {
        parse: { properties: { mar_r: 16 } },
        render: { style: { marginRight: '16px' } }
      }
    },
    {
      name: 'mar top',
      input: 'Box mar u 16',
      expect: {
        parse: { properties: { mar_u: 16 } },
        render: { style: { marginTop: '16px' } }
      }
    },
    {
      name: 'mar bottom',
      input: 'Box mar d 16',
      expect: {
        parse: { properties: { mar_d: 16 } },
        render: { style: { marginBottom: '16px' } }
      }
    },
  ])

  // ------------------------------------
  // Gap
  // ------------------------------------
  runSyntaxTests('gap', [
    {
      name: 'gap with single value',
      input: 'Box gap 16',
      expect: {
        parse: { properties: { gap: 16 } },
        render: { style: { gap: '16px' } }
      }
    },
    {
      name: 'gap-x (column gap)',
      input: 'Box gap-x 16',
      expect: {
        // 'gap-x' is normalized to 'gap-col' during parsing
        parse: { properties: { 'gap-col': 16 } },
        render: { style: { columnGap: '16px' } }
      }
    },
    {
      name: 'gap-y (row gap)',
      input: 'Box gap-y 16',
      expect: {
        // 'gap-y' is normalized to 'gap-row' during parsing
        parse: { properties: { 'gap-row': 16 } },
        render: { style: { rowGap: '16px' } }
      }
    },
  ])
})

// ============================================
// Sizing Properties
// ============================================

describe('Sizing Properties', () => {
  runSyntaxTests('width', [
    {
      name: 'w with pixel value',
      input: 'Box w 200',
      expect: {
        parse: { properties: { w: 200 } },
        render: { style: { width: '200px' } }
      }
    },
    {
      name: 'width (long form)',
      input: 'Box width 200',
      expect: {
        parse: { properties: { w: 200 } },
        render: { style: { width: '200px' } }
      }
    },
    {
      name: 'w full',
      input: 'Box w full',
      expect: {
        parse: { properties: { w: 'full' } },
        render: { style: { width: '100%' } }
      }
    },
  ])

  runSyntaxTests('height', [
    {
      name: 'h with pixel value',
      input: 'Box h 100',
      expect: {
        parse: { properties: { h: 100 } },
        render: { style: { height: '100px' } }
      }
    },
    {
      name: 'height (long form)',
      input: 'Box height 100',
      expect: {
        parse: { properties: { h: 100 } },
        render: { style: { height: '100px' } }
      }
    },
    {
      name: 'h full',
      input: 'Box h full',
      expect: {
        parse: { properties: { h: 'full' } },
        render: { style: { height: '100%' } }
      }
    },
  ])

  runSyntaxTests('min/max sizing', [
    {
      name: 'minw (min-width)',
      input: 'Box minw 100',
      expect: {
        parse: { properties: { minw: 100 } },
        render: { style: { minWidth: '100px' } }
      }
    },
    {
      name: 'min-width (long form)',
      input: 'Box min-width 100',
      expect: {
        parse: { properties: { minw: 100 } },
        render: { style: { minWidth: '100px' } }
      }
    },
    {
      name: 'maxw (max-width)',
      input: 'Box maxw 500',
      expect: {
        parse: { properties: { maxw: 500 } },
        render: { style: { maxWidth: '500px' } }
      }
    },
    {
      name: 'max-width (long form)',
      input: 'Box max-width 500',
      expect: {
        parse: { properties: { maxw: 500 } },
        render: { style: { maxWidth: '500px' } }
      }
    },
    {
      name: 'minh (min-height)',
      input: 'Box minh 50',
      expect: {
        parse: { properties: { minh: 50 } },
        render: { style: { minHeight: '50px' } }
      }
    },
    {
      name: 'maxh (max-height)',
      input: 'Box maxh 300',
      expect: {
        parse: { properties: { maxh: 300 } },
        render: { style: { maxHeight: '300px' } }
      }
    },
  ])

  runSyntaxTests('full sizing', [
    {
      name: 'full (100% both dimensions)',
      input: 'Box full',
      expect: {
        parse: { properties: { full: true } },
        render: {
          style: {
            width: '100%',
            height: '100%'
          }
        }
      }
    },
  ])

  runSyntaxTests('dimension shorthand', [
    {
      name: 'single number = width',
      input: 'Box 200',
      expect: {
        parse: { properties: { w: 200 } },
        render: { style: { width: '200px' } }
      }
    },
    {
      name: 'two numbers = width height',
      input: 'Box 200 100',
      expect: {
        parse: { properties: { w: 200, h: 100 } },
        render: {
          style: {
            width: '200px',
            height: '100px'
          }
        }
      }
    },
  ])
})

// ============================================
// Color Properties
// ============================================

describe('Color Properties', () => {
  runSyntaxTests('background', [
    {
      name: 'bg with hex color',
      input: 'Box bg #FF0000',
      expect: {
        parse: { properties: { bg: '#FF0000' } },
        render: { style: { backgroundColor: '#FF0000' } }
      }
    },
    {
      name: 'background (long form)',
      input: 'Box background #FF0000',
      expect: {
        parse: { properties: { bg: '#FF0000' } },
        render: { style: { backgroundColor: '#FF0000' } }
      }
    },
    {
      name: 'bg with 8-digit hex (alpha)',
      input: 'Box bg #FF000080',
      expect: {
        parse: { properties: { bg: '#FF000080' } },
        render: { style: { backgroundColor: '#FF000080' } }
      }
    },
  ])

  runSyntaxTests('text color', [
    {
      name: 'col with hex color',
      input: 'Box col #FFFFFF',
      expect: {
        parse: { properties: { col: '#FFFFFF' } },
        render: { style: { color: '#FFFFFF' } }
      }
    },
    {
      name: 'color (long form)',
      input: 'Box color #FFFFFF',
      expect: {
        parse: { properties: { col: '#FFFFFF' } },
        render: { style: { color: '#FFFFFF' } }
      }
    },
  ])

  runSyntaxTests('border-color', [
    {
      name: 'boc (border-color)',
      input: 'Box boc #333333',
      expect: {
        parse: { properties: { boc: '#333333' } },
        render: { style: { borderColor: '#333333' } }
      }
    },
    {
      name: 'border-color (long form)',
      input: 'Box border-color #333333',
      expect: {
        parse: { properties: { boc: '#333333' } },
        render: { style: { borderColor: '#333333' } }
      }
    },
  ])
})

// ============================================
// Border Properties
// ============================================

describe('Border Properties', () => {
  runSyntaxTests('border', [
    {
      name: 'bor with width',
      input: 'Box bor 1',
      expect: {
        parse: { properties: { bor: 1 } },
        render: { style: { border: '1px solid' } }
      }
    },
    {
      name: 'border (long form)',
      input: 'Box border 1',
      expect: {
        parse: { properties: { bor: 1 } },
        render: { style: { border: '1px solid' } }
      }
    },
    {
      name: 'bor with width and color',
      input: 'Box bor 1 #333',
      expect: {
        // Border parser stores as separate properties
        parse: { properties: { bor_width: 1, bor_color: '#333', bor: 1 } },
      }
    },
    // Directional borders
    {
      name: 'border left',
      input: 'Box bor l 1',
      expect: {
        parse: { properties: { bor_l: 1 } },
        render: { style: { borderLeft: '1px solid currentColor' } }
      }
    },
    {
      name: 'border bottom',
      input: 'Box bor d 1',
      expect: {
        parse: { properties: { bor_d: 1 } },
        render: { style: { borderBottom: '1px solid currentColor' } }
      }
    },
  ])

  runSyntaxTests('radius', [
    {
      name: 'rad with single value',
      input: 'Box rad 8',
      expect: {
        parse: { properties: { rad: 8 } },
        render: { style: { borderRadius: '8px' } }
      }
    },
    {
      name: 'radius (long form)',
      input: 'Box radius 8',
      expect: {
        parse: { properties: { rad: 8 } },
        render: { style: { borderRadius: '8px' } }
      }
    },
  ])
})

// ============================================
// Layout Properties
// ============================================

describe('Layout Properties', () => {
  runSyntaxTests('direction', [
    {
      name: 'hor (horizontal)',
      input: 'Box hor',
      expect: {
        parse: { properties: { hor: true } },
        render: { style: { flexDirection: 'row' } }
      }
    },
    {
      name: 'horizontal (long form)',
      input: 'Box horizontal',
      expect: {
        parse: { properties: { hor: true } },
        render: { style: { flexDirection: 'row' } }
      }
    },
    {
      name: 'ver (vertical)',
      input: 'Box ver',
      expect: {
        parse: { properties: { ver: true } },
        render: { style: { flexDirection: 'column' } }
      }
    },
    {
      name: 'vertical (long form)',
      input: 'Box vertical',
      expect: {
        parse: { properties: { ver: true } },
        render: { style: { flexDirection: 'column' } }
      }
    },
  ])

  runSyntaxTests('flex layout', [
    {
      name: 'between (space-between)',
      input: 'Box between',
      expect: {
        parse: { properties: { between: true } },
        render: { style: { justifyContent: 'space-between' } }
      }
    },
    {
      name: 'wrap',
      input: 'Box wrap',
      expect: {
        parse: { properties: { wrap: true } },
        render: { style: { flexWrap: 'wrap' } }
      }
    },
    {
      name: 'grow',
      input: 'Box grow',
      expect: {
        parse: { properties: { grow: true } },
        render: { style: { flexGrow: 1 } }
      }
    },
    {
      name: 'fill (alias for grow)',
      input: 'Box fill',
      expect: {
        parse: { properties: { fill: true } },
        render: { style: { flexGrow: 1 } }
      }
    },
    {
      name: 'shrink with value',
      input: 'Box shrink 0',
      expect: {
        parse: { properties: { shrink: 0 } },
        render: { style: { flexShrink: 0 } }
      }
    },
  ])

  runSyntaxTests('stacked layout', [
    {
      name: 'stacked (grid stacking)',
      input: 'Box stacked',
      expect: {
        parse: { properties: { stacked: true } },
        render: {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr'
          }
        }
      }
    },
  ])
})

// ============================================
// Alignment Properties
// ============================================

describe('Alignment Properties', () => {
  runSyntaxTests('horizontal alignment', [
    {
      name: 'hor-l (horizontal left)',
      input: 'Box hor-l',
      expect: {
        parse: { properties: { 'hor-l': true } },
      }
    },
    {
      name: 'horizontal-left (long form)',
      input: 'Box horizontal-left',
      expect: {
        parse: { properties: { 'hor-l': true } },
      }
    },
    {
      name: 'hor-cen (horizontal center)',
      input: 'Box hor-cen',
      expect: {
        parse: { properties: { 'hor-cen': true } },
      }
    },
    {
      name: 'horizontal-center (long form)',
      input: 'Box horizontal-center',
      expect: {
        parse: { properties: { 'hor-cen': true } },
      }
    },
    {
      name: 'hor-r (horizontal right)',
      input: 'Box hor-r',
      expect: {
        parse: { properties: { 'hor-r': true } },
      }
    },
  ])

  runSyntaxTests('vertical alignment', [
    {
      name: 'ver-t (vertical top)',
      input: 'Box ver-t',
      expect: {
        parse: { properties: { 'ver-t': true } },
      }
    },
    {
      name: 'vertical-top (long form)',
      input: 'Box vertical-top',
      expect: {
        parse: { properties: { 'ver-t': true } },
      }
    },
    {
      name: 'ver-cen (vertical center)',
      input: 'Box ver-cen',
      expect: {
        parse: { properties: { 'ver-cen': true } },
      }
    },
    {
      name: 'ver-b (vertical bottom)',
      input: 'Box ver-b',
      expect: {
        parse: { properties: { 'ver-b': true } },
      }
    },
  ])

  runSyntaxTests('center shorthand', [
    {
      name: 'cen (center both axes)',
      input: 'Box cen',
      expect: {
        parse: { properties: { align_main: 'cen' } },
        render: { style: { justifyContent: 'center' } }
      }
    },
    {
      name: 'center (long form)',
      input: 'Box center',
      expect: {
        parse: { properties: { align_main: 'cen' } },
        render: { style: { justifyContent: 'center' } }
      }
    },
  ])
})

// ============================================
// Visual Properties
// ============================================

describe('Visual Properties', () => {
  runSyntaxTests('opacity', [
    {
      name: 'opacity with decimal',
      input: 'Box opacity 0.5',
      expect: {
        // 'opacity' is normalized to 'opa' during parsing
        parse: { properties: { opa: 0.5 } },
        render: { style: { opacity: 0.5 } }
      }
    },
    {
      name: 'opa (shorthand)',
      input: 'Box opa 0.5',
      expect: {
        parse: { properties: { opa: 0.5 } },
        render: { style: { opacity: 0.5 } }
      }
    },
  ])

  runSyntaxTests('cursor', [
    {
      name: 'cursor pointer',
      input: 'Box cursor pointer',
      expect: {
        parse: { properties: { cursor: 'pointer' } },
        render: { style: { cursor: 'pointer' } }
      }
    },
  ])

  runSyntaxTests('z-index', [
    {
      name: 'z with value',
      input: 'Box z 100',
      expect: {
        parse: { properties: { z: 100 } },
        render: { style: { zIndex: 100 } }
      }
    },
  ])

  runSyntaxTests('visibility', [
    {
      name: 'hidden',
      input: 'Box hidden',
      expect: {
        parse: { properties: { hidden: true } },
        render: { style: { display: 'none' } }
      }
    },
  ])
})

// ============================================
// Scroll Properties
// ============================================

describe('Scroll Properties', () => {
  runSyntaxTests('scroll', [
    {
      name: 'scroll (vertical)',
      input: 'Box scroll',
      expect: {
        parse: { properties: { scroll: true } },
        render: { style: { overflowY: 'auto' } }
      }
    },
    {
      name: 'scroll-ver (vertical explicit)',
      input: 'Box scroll-ver',
      expect: {
        parse: { properties: { 'scroll-ver': true } },
        render: { style: { overflowY: 'auto' } }
      }
    },
    {
      name: 'scroll-hor (horizontal)',
      input: 'Box scroll-hor',
      expect: {
        parse: { properties: { 'scroll-hor': true } },
        render: { style: { overflowX: 'auto' } }
      }
    },
    {
      name: 'scroll-both',
      input: 'Box scroll-both',
      expect: {
        parse: { properties: { 'scroll-both': true } },
        render: { style: { overflow: 'auto' } }
      }
    },
    {
      name: 'clip (overflow hidden)',
      input: 'Box clip',
      expect: {
        parse: { properties: { clip: true } },
        render: { style: { overflow: 'hidden' } }
      }
    },
  ])
})

// ============================================
// Typography Properties
// ============================================

describe('Typography Properties', () => {
  runSyntaxTests('font size', [
    {
      name: 'size with pixels',
      input: 'Box size 14',
      expect: {
        parse: { properties: { size: 14 } },
        render: { style: { fontSize: '14px' } }
      }
    },
  ])

  runSyntaxTests('font weight', [
    {
      name: 'weight with number',
      input: 'Box weight 600',
      expect: {
        parse: { properties: { weight: 600 } },
        render: { style: { fontWeight: 600 } }
      }
    },
    {
      name: 'weight bold',
      input: 'Box weight bold',
      expect: {
        // 'bold' is converted to 700 during parsing
        parse: { properties: { weight: 700 } },
        render: { style: { fontWeight: 700 } }
      }
    },
  ])

  runSyntaxTests('line height', [
    {
      name: 'line with multiplier',
      input: 'Box line 1.5',
      expect: {
        parse: { properties: { line: 1.5 } },
        render: { style: { lineHeight: 1.5 } }
      }
    },
  ])

  runSyntaxTests('text alignment', [
    {
      name: 'align center',
      input: 'Box align center',
      expect: {
        // 'center' is normalized to 'cen' during parsing
        parse: { properties: { align: 'cen' } },
        render: { style: { textAlign: 'center' } }
      }
    },
    {
      name: 'align right',
      input: 'Box align right',
      expect: {
        parse: { properties: { align: 'right' } },
        render: { style: { textAlign: 'right' } }
      }
    },
  ])

  runSyntaxTests('text style', [
    {
      name: 'italic',
      input: 'Box italic',
      expect: {
        parse: { properties: { italic: true } },
        render: { style: { fontStyle: 'italic' } }
      }
    },
    {
      name: 'underline',
      input: 'Box underline',
      expect: {
        parse: { properties: { underline: true } },
        render: { style: { textDecoration: 'underline' } }
      }
    },
    {
      name: 'uppercase',
      input: 'Box uppercase',
      expect: {
        parse: { properties: { uppercase: true } },
        render: { style: { textTransform: 'uppercase' } }
      }
    },
    {
      name: 'lowercase',
      input: 'Box lowercase',
      expect: {
        parse: { properties: { lowercase: true } },
        render: { style: { textTransform: 'lowercase' } }
      }
    },
  ])

  runSyntaxTests('truncate', [
    {
      name: 'truncate',
      input: 'Box truncate',
      expect: {
        parse: { properties: { truncate: true } },
        render: {
          style: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }
        }
      }
    },
  ])
})

// ============================================
// Grid Properties
// ============================================

describe('Grid Properties', () => {
  runSyntaxTests('grid', [
    {
      name: 'grid with column count',
      input: 'Box grid 3',
      expect: {
        parse: { properties: { grid: 3 } },
        render: {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)'
          }
        }
      }
    },
  ])
})
