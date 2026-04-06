/**
 * Property Matrix Definition
 *
 * Central source of truth for Mirror DSL Property → CSS Mapping.
 * This matrix defines what CSS should be generated for each Mirror property.
 *
 * Categories:
 * - sizing: width, height, min/max
 * - spacing: padding, margin, gap
 * - border: border-width, border-radius, border-color
 * - typography: font-size, font-weight, font-style, text-transform
 * - effects: opacity, blur, shadow
 * - transform: rotate, scale, translate
 * - position: absolute, fixed, z-index
 * - visibility: hidden, visible, clip, overflow
 * - scroll: overflow-x, overflow-y
 * - cursor: cursor styles
 * - color: background, color, border-color
 * - icon: icon-specific properties
 */

export interface PropertyTest {
  /** Mirror code to render */
  code: string
  /** Expected CSS properties and values */
  expected: Record<string, string | RegExp>
  /** Optional: selector to find the element (default: first element) */
  selector?: string
}

export interface PropertyCategory {
  /** Category name for test grouping */
  name: string
  /** Description of what this category tests */
  description: string
  /** Individual property tests */
  tests: PropertyTest[]
}

// =============================================================================
// SIZING PROPERTIES
// =============================================================================

export const SIZING: PropertyCategory = {
  name: 'Sizing',
  description: 'Width, height, min/max constraints',
  tests: [
    // Fixed dimensions
    {
      code: 'Frame w 200',
      expected: { width: '200px' },
    },
    {
      code: 'Frame h 100',
      expected: { height: '100px' },
    },
    {
      code: 'Frame w 200, h 100',
      expected: { width: '200px', height: '100px' },
    },
    // Full width/height
    {
      code: 'Frame w full',
      expected: { width: '100%' },
    },
    {
      code: 'Frame h full',
      expected: { height: '100%' },
    },
    // Min/Max constraints
    {
      code: 'Frame minw 100',
      expected: { 'min-width': '100px' },
    },
    {
      code: 'Frame maxw 500',
      expected: { 'max-width': '500px' },
    },
    {
      code: 'Frame minh 50',
      expected: { 'min-height': '50px' },
    },
    {
      code: 'Frame maxh 300',
      expected: { 'max-height': '300px' },
    },
    // Aspect ratio (may use different property names)
    // {
    //   code: 'Frame aspect square',
    //   expected: { 'aspect-ratio': '1' },
    // },
    // {
    //   code: 'Frame aspect video',
    //   expected: { 'aspect-ratio': '16/9' },
    // },
  ],
}

// =============================================================================
// SPACING PROPERTIES
// =============================================================================

export const SPACING: PropertyCategory = {
  name: 'Spacing',
  description: 'Padding, margin, gap',
  tests: [
    // Single value padding
    {
      code: 'Frame pad 12',
      expected: { padding: '12px' },
    },
    // Two value padding (vertical horizontal)
    {
      code: 'Frame pad 12 24',
      expected: {
        'padding-top': '12px',
        'padding-right': '24px',
        'padding-bottom': '12px',
        'padding-left': '24px',
      },
    },
    // Four value padding
    {
      code: 'Frame pad 10 20 30 40',
      expected: {
        'padding-top': '10px',
        'padding-right': '20px',
        'padding-bottom': '30px',
        'padding-left': '40px',
      },
    },
    // Single value margin
    {
      code: 'Frame margin 16',
      expected: { margin: '16px' },
    },
    // Two value margin
    {
      code: 'Frame margin 8 16',
      expected: {
        'margin-top': '8px',
        'margin-right': '16px',
        'margin-bottom': '8px',
        'margin-left': '16px',
      },
    },
    // Gap
    {
      code: 'Frame gap 8',
      expected: { gap: '8px' },
    },
    {
      code: 'Frame gap 12',
      expected: { gap: '12px' },
    },
  ],
}

// =============================================================================
// BORDER PROPERTIES
// =============================================================================

export const BORDER: PropertyCategory = {
  name: 'Border',
  description: 'Border width, radius, color',
  tests: [
    // Border width
    {
      code: 'Frame bor 1',
      expected: { 'border-width': '1px', 'border-style': 'solid' },
    },
    {
      code: 'Frame bor 2',
      expected: { 'border-width': '2px', 'border-style': 'solid' },
    },
    // Border radius
    {
      code: 'Frame rad 8',
      expected: { 'border-radius': '8px' },
    },
    {
      code: 'Frame rad 4',
      expected: { 'border-radius': '4px' },
    },
    {
      code: 'Frame rad 99',
      expected: { 'border-radius': '99px' },
    },
    // Border color
    {
      code: 'Frame bor 1, boc #333',
      expected: {
        'border-width': '1px',
        'border-color': /(#333333|#333|rgb\(51,\s*51,\s*51\))/,
      },
    },
  ],
}

// =============================================================================
// TYPOGRAPHY PROPERTIES
// =============================================================================

export const TYPOGRAPHY: PropertyCategory = {
  name: 'Typography',
  description: 'Font size, weight, style, text transform',
  tests: [
    // Font size
    {
      code: 'Text "T", fs 16',
      expected: { 'font-size': '16px' },
    },
    {
      code: 'Text "T", fs 24',
      expected: { 'font-size': '24px' },
    },
    {
      code: 'Text "T", fs 12',
      expected: { 'font-size': '12px' },
    },
    // Font weight
    {
      code: 'Text "T", weight bold',
      expected: { 'font-weight': /^(bold|700)$/ },
    },
    {
      code: 'Text "T", weight 500',
      expected: { 'font-weight': '500' },
    },
    {
      code: 'Text "T", weight semibold',
      expected: { 'font-weight': '600' },
    },
    // Font style
    {
      code: 'Text "T", italic',
      expected: { 'font-style': 'italic' },
    },
    // Text transform
    {
      code: 'Text "T", uppercase',
      expected: { 'text-transform': 'uppercase' },
    },
    {
      code: 'Text "T", lowercase',
      expected: { 'text-transform': 'lowercase' },
    },
    // Text decoration
    {
      code: 'Text "T", underline',
      expected: { 'text-decoration': /underline/ },
    },
    // Font family
    {
      code: 'Text "T", font mono',
      expected: { 'font-family': /mono/i },
    },
    {
      code: 'Text "T", font sans',
      expected: { 'font-family': /sans/i },
    },
    // Text overflow
    {
      code: 'Text "T", truncate',
      expected: {
        'text-overflow': 'ellipsis',
        'overflow': 'hidden',
        'white-space': 'nowrap',
      },
    },
  ],
}

// =============================================================================
// EFFECT PROPERTIES
// =============================================================================

export const EFFECTS: PropertyCategory = {
  name: 'Effects',
  description: 'Opacity, blur, shadow',
  tests: [
    // Opacity
    {
      code: 'Frame opacity 0.5',
      expected: { opacity: '0.5' },
    },
    {
      code: 'Frame opacity 1',
      expected: { opacity: '1' },
    },
    {
      code: 'Frame opacity 0',
      expected: { opacity: '0' },
    },
    // Blur
    {
      code: 'Frame blur 10',
      expected: { filter: /blur\(10px\)/ },
    },
    // Backdrop blur
    {
      code: 'Frame blur-bg 10',
      expected: { 'backdrop-filter': /blur\(10px\)/ },
    },
    // Shadow
    {
      code: 'Frame shadow sm',
      expected: { 'box-shadow': /.+/ }, // Just verify shadow is set
    },
    {
      code: 'Frame shadow md',
      expected: { 'box-shadow': /.+/ },
    },
    {
      code: 'Frame shadow lg',
      expected: { 'box-shadow': /.+/ },
    },
  ],
}

// =============================================================================
// TRANSFORM PROPERTIES
// =============================================================================

export const TRANSFORM: PropertyCategory = {
  name: 'Transform',
  description: 'Rotate, scale, translate',
  tests: [
    // Rotate
    {
      code: 'Frame rotate 45',
      expected: { transform: /rotate\(45deg\)/ },
    },
    {
      code: 'Frame rotate 90',
      expected: { transform: /rotate\(90deg\)/ },
    },
    // Scale
    {
      code: 'Frame scale 1.2',
      expected: { transform: /scale\(1\.2\)/ },
    },
    {
      code: 'Frame scale 0.5',
      expected: { transform: /scale\(0\.5\)/ },
    },
  ],
}

// =============================================================================
// POSITION PROPERTIES
// =============================================================================

export const POSITION: PropertyCategory = {
  name: 'Position',
  description: 'Position type, z-index, coordinates',
  tests: [
    // Position types
    {
      code: 'Frame absolute',
      expected: { position: 'absolute' },
    },
    {
      code: 'Frame fixed',
      expected: { position: 'fixed' },
    },
    {
      code: 'Frame relative',
      expected: { position: 'relative' },
    },
    // Z-index
    {
      code: 'Frame z 10',
      expected: { 'z-index': '10' },
    },
    {
      code: 'Frame z 100',
      expected: { 'z-index': '100' },
    },
    // Coordinates (in stacked context) - requires runtime positioning
    // {
    //   code: 'Frame stacked\n  Frame x 10, y 20',
    //   expected: { left: '10px', top: '20px' },
    //   selector: '[data-mirror-id]:last-child',
    // },
  ],
}

// =============================================================================
// VISIBILITY PROPERTIES
// =============================================================================

export const VISIBILITY: PropertyCategory = {
  name: 'Visibility',
  description: 'Hidden, visible, clip, overflow',
  tests: [
    // Hidden
    {
      code: 'Frame hidden',
      expected: { display: 'none' },
    },
    // Clip (overflow hidden)
    {
      code: 'Frame clip',
      expected: { overflow: 'hidden' },
    },
  ],
}

// =============================================================================
// SCROLL PROPERTIES
// =============================================================================

export const SCROLL: PropertyCategory = {
  name: 'Scroll',
  description: 'Scrollable areas',
  tests: [
    // Vertical scroll
    {
      code: 'Frame scroll',
      expected: { 'overflow-y': 'auto' },
    },
    // Horizontal scroll
    {
      code: 'Frame scroll-hor',
      expected: { 'overflow-x': 'auto' },
    },
    // Both directions
    {
      code: 'Frame scroll-both',
      expected: { overflow: 'auto' },
    },
  ],
}

// =============================================================================
// CURSOR PROPERTIES
// =============================================================================

export const CURSOR: PropertyCategory = {
  name: 'Cursor',
  description: 'Cursor styles',
  tests: [
    {
      code: 'Frame cursor pointer',
      expected: { cursor: 'pointer' },
    },
    {
      code: 'Frame cursor grab',
      expected: { cursor: 'grab' },
    },
    {
      code: 'Frame cursor move',
      expected: { cursor: 'move' },
    },
    {
      code: 'Frame cursor not-allowed',
      expected: { cursor: 'not-allowed' },
    },
    {
      code: 'Frame cursor text',
      expected: { cursor: 'text' },
    },
  ],
}

// =============================================================================
// COLOR PROPERTIES
// =============================================================================

export const COLOR: PropertyCategory = {
  name: 'Color',
  description: 'Background, text color, gradients',
  tests: [
    // Background colors
    {
      code: 'Frame bg #2563eb',
      expected: { background: /(#2563eb|rgb\(37,\s*99,\s*235\))/ },
    },
    {
      code: 'Frame bg #1a1a1a',
      expected: { background: /(#1a1a1a|rgb\(26,\s*26,\s*26\))/ },
    },
    {
      code: 'Frame bg white',
      expected: { background: /(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))/i },
    },
    {
      code: 'Frame bg black',
      expected: { background: /(black|#000|#000000|rgb\(0,\s*0,\s*0\))/i },
    },
    // Text colors
    {
      code: 'Text "T", col #ffffff',
      expected: { color: /(#ffffff|#fff|rgb\(255,\s*255,\s*255\))/ },
    },
    {
      code: 'Text "T", col white',
      expected: { color: /(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))/i },
    },
    // Gradients
    {
      code: 'Frame bg grad #2563eb #10b981',
      expected: { background: /linear-gradient/ },
    },
    {
      code: 'Frame bg grad-ver #f59e0b #ef4444',
      expected: { background: /linear-gradient/ },
    },
  ],
}

// =============================================================================
// LAYOUT PROPERTIES
// =============================================================================

export const LAYOUT: PropertyCategory = {
  name: 'Layout',
  description: 'Flex direction, alignment, justify',
  tests: [
    // Direction
    {
      code: 'Frame hor',
      expected: {
        display: 'flex',
        'flex-direction': 'row',
        'align-items': 'flex-start', // NOT center!
      },
    },
    {
      code: 'Frame ver',
      expected: {
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'flex-start',
      },
    },
    // Centering
    {
      code: 'Frame center',
      expected: {
        'justify-content': 'center',
        'align-items': 'center',
      },
    },
    {
      code: 'Frame hor, center',
      expected: {
        'flex-direction': 'row',
        'justify-content': 'center',
        'align-items': 'center',
      },
    },
    {
      code: 'Frame hor, ver-center',
      expected: {
        'flex-direction': 'row',
        'align-items': 'center',
      },
    },
    {
      code: 'Frame ver, hor-center',
      expected: {
        'flex-direction': 'column',
        'align-items': 'center',
      },
    },
    // Spread
    {
      code: 'Frame hor, spread',
      expected: {
        'justify-content': 'space-between',
      },
    },
    // 9-position shortcuts
    {
      code: 'Frame tl',
      expected: {
        'justify-content': 'flex-start',
        'align-items': 'flex-start',
      },
    },
    {
      code: 'Frame br',
      expected: {
        'justify-content': 'flex-end',
        'align-items': 'flex-end',
      },
    },
    // Wrap
    {
      code: 'Frame hor, wrap',
      expected: {
        'flex-wrap': 'wrap',
      },
    },
    // Grid
    {
      code: 'Frame grid 12',
      expected: {
        display: 'grid',
        'grid-template-columns': /repeat\(12,/,
      },
    },
    // Stacked - uses CSS positioning, not grid
    // The stacked layout may use different CSS depending on implementation
    // {
    //   code: 'Frame stacked',
    //   expected: {
    //     display: 'grid',
    //     'grid-template-areas': '"stack"',
    //   },
    // },
  ],
}

// =============================================================================
// ICON PROPERTIES
// =============================================================================

export const ICON: PropertyCategory = {
  name: 'Icon',
  description: 'Icon size, color, weight',
  tests: [
    // Icon size
    {
      code: 'Icon "check", is 24',
      expected: { width: '24px', height: '24px' },
    },
    {
      code: 'Icon "check", is 16',
      expected: { width: '16px', height: '16px' },
    },
    // Icon color - applied as CSS color property, SVG uses currentColor
    {
      code: 'Icon "check", ic #2563eb',
      expected: { color: /(#2563eb|rgb\(37,\s*99,\s*235\))/ },
    },
  ],
}

// =============================================================================
// EXPORT ALL CATEGORIES
// =============================================================================

export const ALL_CATEGORIES: PropertyCategory[] = [
  SIZING,
  SPACING,
  BORDER,
  TYPOGRAPHY,
  EFFECTS,
  TRANSFORM,
  POSITION,
  VISIBILITY,
  SCROLL,
  CURSOR,
  COLOR,
  LAYOUT,
  ICON,
]

/**
 * Get total number of property tests
 */
export function getTotalTestCount(): number {
  return ALL_CATEGORIES.reduce((sum, cat) => sum + cat.tests.length, 0)
}
