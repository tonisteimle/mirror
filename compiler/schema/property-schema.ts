/**
 * Mirror Property Schema (SCHEMA)
 *
 * Property-by-property CSS-emission schema. Each entry maps a Mirror
 * property name (e.g. `bg`, `pad`, `hor`) to its category, accepted
 * value types, and the CSS output rules.
 *
 * Single source of truth — extracted from `dsl.ts` to keep that file
 * focused on the higher-level DSL constant (keywords, primitives,
 * events, actions, states) and helper functions.
 */

import type { PropertyDef } from './dsl'

// ============================================================================
// Properties Schema
// ============================================================================

export const SCHEMA: Record<string, PropertyDef> = {
  // ---------------------------------------------------------------------------
  // SIZING
  // ---------------------------------------------------------------------------

  width: {
    name: 'width',
    aliases: ['w'],
    category: 'sizing',
    description: 'Element width',

    keywords: {
      full: {
        description: 'Fill available space in flex container',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-width', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box w full',
      },
      hug: {
        description: 'Fit content (fit-content)',
        css: [{ property: 'width', value: 'fit-content' }],
        example: 'Box w hug',
      },
    },

    numeric: {
      description: 'Fixed width in pixels',
      unit: 'px',
      css: n => [{ property: 'width', value: `${n}px` }],
      example: 'Box w 200',
    },

    token: true,
  },

  height: {
    name: 'height',
    aliases: ['h'],
    category: 'sizing',
    description: 'Element height',

    keywords: {
      full: {
        description: 'Fill available space in flex container',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-height', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box h full',
      },
      hug: {
        description: 'Fit content (fit-content)',
        css: [{ property: 'height', value: 'fit-content' }],
        example: 'Box h hug',
      },
    },

    numeric: {
      description: 'Fixed height in pixels',
      unit: 'px',
      css: n => [{ property: 'height', value: `${n}px` }],
      example: 'Box h 200',
    },

    token: true,
  },

  size: {
    name: 'size',
    aliases: [],
    category: 'sizing',
    description: 'Width and height (square) or font-size for text',

    keywords: {
      full: {
        description: 'Fill available space',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-width', value: '0' },
          { property: 'min-height', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box size full',
      },
      hug: {
        description: 'Fit content',
        css: [
          { property: 'width', value: 'fit-content' },
          { property: 'height', value: 'fit-content' },
        ],
        example: 'Box size hug',
      },
    },

    numeric: {
      description: 'Square size in pixels (or font-size for text)',
      unit: 'px',
      css: n => [
        { property: 'width', value: `${n}px` },
        { property: 'height', value: `${n}px` },
      ],
      example: 'Box size 100',
    },

    token: true,
  },

  device: {
    name: 'device',
    aliases: [],
    category: 'sizing',
    description: 'Device size preset: mobile (375×812), tablet (768×1024), desktop (1440×900)',

    keywords: {
      mobile: {
        description: 'Mobile device size (375×812)',
        css: [
          { property: 'width', value: '375px' },
          { property: 'height', value: '812px' },
        ],
        example: 'Frame device mobile',
      },
      tablet: {
        description: 'Tablet device size (768×1024)',
        css: [
          { property: 'width', value: '768px' },
          { property: 'height', value: '1024px' },
        ],
        example: 'Frame device tablet',
      },
      desktop: {
        description: 'Desktop device size (1440×900)',
        css: [
          { property: 'width', value: '1440px' },
          { property: 'height', value: '900px' },
        ],
        example: 'Frame device desktop',
      },
    },
  },

  'min-width': {
    name: 'min-width',
    aliases: ['minw'],
    category: 'sizing',
    description: 'Minimum width',

    numeric: {
      description: 'Minimum width in pixels',
      unit: 'px',
      css: n => [{ property: 'min-width', value: `${n}px` }],
      example: 'Box minw 100',
    },

    token: true,
  },

  'max-width': {
    name: 'max-width',
    aliases: ['maxw'],
    category: 'sizing',
    description: 'Maximum width',

    numeric: {
      description: 'Maximum width in pixels',
      unit: 'px',
      css: n => [{ property: 'max-width', value: `${n}px` }],
      example: 'Box maxw 500',
    },

    token: true,
  },

  'min-height': {
    name: 'min-height',
    aliases: ['minh'],
    category: 'sizing',
    description: 'Minimum height',

    numeric: {
      description: 'Minimum height in pixels',
      unit: 'px',
      css: n => [{ property: 'min-height', value: `${n}px` }],
      example: 'Box minh 50',
    },

    token: true,
  },

  'max-height': {
    name: 'max-height',
    aliases: ['maxh'],
    category: 'sizing',
    description: 'Maximum height',

    numeric: {
      description: 'Maximum height in pixels',
      unit: 'px',
      css: n => [{ property: 'max-height', value: `${n}px` }],
      example: 'Box maxh 300',
    },

    token: true,
  },

  aspect: {
    name: 'aspect',
    aliases: [],
    category: 'sizing',
    description: 'Aspect ratio',

    keywords: {
      square: {
        description: '1:1 aspect ratio',
        css: [{ property: 'aspect-ratio', value: '1' }],
        example: 'Box aspect square',
      },
      video: {
        description: '16:9 aspect ratio',
        css: [{ property: 'aspect-ratio', value: '16/9' }],
        example: 'Box aspect video',
      },
    },

    numeric: {
      description: 'Custom aspect ratio (e.g., 16/9)',
      css: n => [{ property: 'aspect-ratio', value: String(n) }],
      example: 'Box aspect 4/3',
    },
  },

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------

  horizontal: {
    name: 'horizontal',
    aliases: ['hor'],
    category: 'layout',
    description: 'Horizontal layout (flex-direction: row)',

    keywords: {
      _standalone: {
        description: 'Children arranged horizontally',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'row' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box hor',
      },
    },
  },

  vertical: {
    name: 'vertical',
    aliases: ['ver'],
    category: 'layout',
    description: 'Vertical layout (flex-direction: column)',

    keywords: {
      _standalone: {
        description: 'Children arranged vertically (default for frame)',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
        ],
        example: 'Box ver',
      },
    },
  },

  gap: {
    name: 'gap',
    aliases: ['g'],
    category: 'layout',
    description: 'Gap between children',

    numeric: {
      description: 'Gap in pixels',
      unit: 'px',
      css: n => [{ property: 'gap', value: `${n}px` }],
      example: 'Box gap 16',
    },

    token: true,
  },

  center: {
    name: 'center',
    aliases: ['cen'],
    category: 'layout',
    description: 'Center children horizontally and vertically',

    keywords: {
      _standalone: {
        description: 'Center children on both axes',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box center',
      },
    },
  },

  spread: {
    name: 'spread',
    aliases: [],
    category: 'layout',
    description: 'Spread children with space between',

    keywords: {
      _standalone: {
        description: 'Space-between distribution',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'space-between' },
        ],
        example: 'Box spread',
      },
    },
  },

  // ===========================================================================
  // 9-Zone Alignment Properties
  // ===========================================================================

  'top-left': {
    name: 'top-left',
    aliases: ['tl'],
    category: 'layout',
    description: 'Align children to top-left',

    keywords: {
      _standalone: {
        description: 'Align to top-left corner',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
          { property: 'align-items', value: 'flex-start' },
        ],
        example: 'Box top-left',
      },
    },
  },

  'top-center': {
    name: 'top-center',
    aliases: ['tc'],
    category: 'layout',
    description: 'Align children to top-center',

    keywords: {
      _standalone: {
        description: 'Align to top-center',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box top-center',
      },
    },
  },

  'top-right': {
    name: 'top-right',
    aliases: ['tr'],
    category: 'layout',
    description: 'Align children to top-right',

    keywords: {
      _standalone: {
        description: 'Align to top-right corner',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
          { property: 'align-items', value: 'flex-end' },
        ],
        example: 'Box top-right',
      },
    },
  },

  'center-left': {
    name: 'center-left',
    aliases: ['cl'],
    category: 'layout',
    description: 'Align children to center-left',

    keywords: {
      _standalone: {
        description: 'Align to center-left',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'flex-start' },
        ],
        example: 'Box center-left',
      },
    },
  },

  'center-right': {
    name: 'center-right',
    aliases: ['cr'],
    category: 'layout',
    description: 'Align children to center-right',

    keywords: {
      _standalone: {
        description: 'Align to center-right',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'flex-end' },
        ],
        example: 'Box center-right',
      },
    },
  },

  'bottom-left': {
    name: 'bottom-left',
    aliases: ['bl'],
    category: 'layout',
    description: 'Align children to bottom-left',

    keywords: {
      _standalone: {
        description: 'Align to bottom-left corner',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
          { property: 'align-items', value: 'flex-start' },
        ],
        example: 'Box bottom-left',
      },
    },
  },

  'bottom-center': {
    name: 'bottom-center',
    aliases: ['bc'],
    category: 'layout',
    description: 'Align children to bottom-center',

    keywords: {
      _standalone: {
        description: 'Align to bottom-center',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box bottom-center',
      },
    },
  },

  'bottom-right': {
    name: 'bottom-right',
    aliases: ['br'],
    category: 'layout',
    description: 'Align children to bottom-right',

    keywords: {
      _standalone: {
        description: 'Align to bottom-right corner',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
          { property: 'align-items', value: 'flex-end' },
        ],
        example: 'Box bottom-right',
      },
    },
  },

  wrap: {
    name: 'wrap',
    aliases: [],
    category: 'layout',
    description: 'Allow flex items to wrap',

    keywords: {
      _standalone: {
        description: 'Enable flex wrapping',
        css: [{ property: 'flex-wrap', value: 'wrap' }],
        example: 'Box wrap',
      },
    },
  },

  stacked: {
    name: 'stacked',
    aliases: [],
    category: 'layout',
    description: 'Stack children on top of each other - children can use x/y for positioning',

    keywords: {
      _standalone: {
        description: 'Children stacked on z-axis, positioned with x/y coordinates',
        css: [{ property: 'position', value: 'relative' }],
        example: 'Frame stacked, w 200, h 150',
      },
    },
  },

  grid: {
    name: 'grid',
    aliases: [],
    category: 'layout',
    description: 'CSS Grid layout',

    keywords: {
      auto: {
        description: 'Auto-fill grid with minmax',
        css: [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: 'repeat(auto-fill, minmax(250px, 1fr))' },
        ],
        example: 'Box grid auto 250',
      },
    },

    numeric: {
      description: 'Number of equal columns',
      css: n => [
        { property: 'display', value: 'grid' },
        { property: 'grid-template-columns', value: `repeat(${n}, 1fr)` },
      ],
      example: 'Box grid 3',
    },
  },

  dense: {
    name: 'dense',
    aliases: [],
    category: 'layout',
    description: 'Dense packing mode for CSS Grid',

    keywords: {
      _standalone: {
        description: 'Enable dense auto-placement in grid',
        css: [], // Handled in layout context, not standalone CSS
        example: 'Box grid 3 dense',
      },
    },
  },

  'gap-x': {
    name: 'gap-x',
    aliases: ['gx'],
    category: 'layout',
    description: 'Horizontal gap between grid/flex items (column-gap)',

    numeric: {
      description: 'Column gap in pixels',
      unit: 'px',
      css: n => [{ property: 'column-gap', value: `${n}px` }],
      example: 'Box grid 3 gap-x 16',
    },

    token: true,
  },

  'gap-y': {
    name: 'gap-y',
    aliases: ['gy'],
    category: 'layout',
    description: 'Vertical gap between grid/flex items (row-gap)',

    numeric: {
      description: 'Row gap in pixels',
      unit: 'px',
      css: n => [{ property: 'row-gap', value: `${n}px` }],
      example: 'Box grid 3 gap-y 24',
    },

    token: true,
  },

  'row-height': {
    name: 'row-height',
    aliases: ['rh'],
    category: 'layout',
    description: 'Height of auto-generated grid rows',

    numeric: {
      description: 'Row height in pixels',
      unit: 'px',
      css: n => [{ property: 'grid-auto-rows', value: `${n}px` }],
      example: 'Box grid 3 row-height 100',
    },

    token: true,
  },

  grow: {
    name: 'grow',
    aliases: [],
    category: 'layout',
    description: 'Flex grow - allow element to expand and fill available space',

    keywords: {
      _standalone: {
        description: 'Allow element to grow to fill available space',
        css: [{ property: 'flex-grow', value: '1' }],
        example: 'Text "Hello", grow',
      },
    },
  },

  shrink: {
    name: 'shrink',
    aliases: [],
    category: 'layout',
    description: 'Allow flex shrink - element can shrink below its preferred size',

    keywords: {
      _standalone: {
        description: 'Allow element to shrink when space is limited',
        css: [{ property: 'flex-shrink', value: '1' }],
        example: 'Box w 200, shrink',
      },
    },
  },

  align: {
    name: 'align',
    aliases: [],
    category: 'layout',
    description: 'Alignment of children',

    keywords: {
      top: {
        description: 'Align to top',
        css: [{ property: 'justify-content', value: 'flex-start' }],
      },
      bottom: {
        description: 'Align to bottom',
        css: [{ property: 'justify-content', value: 'flex-end' }],
      },
      left: {
        description: 'Align to left',
        css: [{ property: 'align-items', value: 'flex-start' }],
      },
      right: {
        description: 'Align to right',
        css: [{ property: 'align-items', value: 'flex-end' }],
      },
      center: {
        description: 'Align to center',
        css: [
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'center' },
        ],
      },
    },
  },

  // Alignment booleans
  left: {
    name: 'left',
    aliases: [],
    category: 'layout',
    description: 'Align children to left',

    keywords: {
      _standalone: {
        description: 'Left alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-start' },
        ],
        example: 'Box left',
      },
    },
  },

  right: {
    name: 'right',
    aliases: [],
    category: 'layout',
    description: 'Align children to right',

    keywords: {
      _standalone: {
        description: 'Right alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-end' },
        ],
        example: 'Box right',
      },
    },
  },

  top: {
    name: 'top',
    aliases: [],
    category: 'layout',
    description: 'Align children to top',

    keywords: {
      _standalone: {
        description: 'Top alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
        ],
        example: 'Box top',
      },
    },
  },

  bottom: {
    name: 'bottom',
    aliases: [],
    category: 'layout',
    description: 'Align children to bottom',

    keywords: {
      _standalone: {
        description: 'Bottom alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
        ],
        example: 'Box bottom',
      },
    },
  },

  'hor-center': {
    name: 'hor-center',
    aliases: [],
    category: 'layout',
    description: 'Center children horizontally',

    keywords: {
      _standalone: {
        description: 'Horizontal center alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box hor-center',
      },
    },
  },

  'ver-center': {
    name: 'ver-center',
    aliases: [],
    category: 'layout',
    description: 'Center children vertically',

    keywords: {
      _standalone: {
        description: 'Vertical center alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'center' },
        ],
        example: 'Box ver-center',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SPACING
  // ---------------------------------------------------------------------------

  padding: {
    name: 'padding',
    aliases: ['pad', 'p'],
    category: 'spacing',
    description: 'Inner spacing',

    numeric: {
      description: 'Padding in pixels (all sides)',
      unit: 'px',
      css: n => [{ property: 'padding', value: `${n}px` }],
      example: 'Box pad 16',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `padding-${dir}`, value: val }],
    },

    token: true,
  },

  margin: {
    name: 'margin',
    aliases: ['mar', 'm'],
    category: 'spacing',
    description: 'Outer spacing',

    numeric: {
      description: 'Margin in pixels (all sides)',
      unit: 'px',
      css: n => [{ property: 'margin', value: `${n}px` }],
      example: 'Box margin 16',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `margin-${dir}`, value: val }],
    },

    token: true,
  },

  // Directional spacing shortcuts
  'pad-x': {
    name: 'pad-x',
    aliases: ['px'],
    category: 'spacing',
    description: 'Horizontal padding (left + right)',
    numeric: {
      description: 'Horizontal padding in pixels',
      unit: 'px',
      css: n => [
        { property: 'padding-left', value: `${n}px` },
        { property: 'padding-right', value: `${n}px` },
      ],
      example: 'Box pad-x 16',
    },
    token: true,
  },

  'pad-y': {
    name: 'pad-y',
    aliases: ['py'],
    category: 'spacing',
    description: 'Vertical padding (top + bottom)',
    numeric: {
      description: 'Vertical padding in pixels',
      unit: 'px',
      css: n => [
        { property: 'padding-top', value: `${n}px` },
        { property: 'padding-bottom', value: `${n}px` },
      ],
      example: 'Box pad-y 16',
    },
    token: true,
  },

  // Individual side paddings
  'pad-t': {
    name: 'pad-t',
    aliases: ['pt'],
    category: 'spacing',
    description: 'Top padding',
    numeric: {
      description: 'Top padding in pixels',
      unit: 'px',
      css: n => [{ property: 'padding-top', value: `${n}px` }],
      example: 'Box pad-t 16',
    },
    token: true,
  },

  'pad-r': {
    name: 'pad-r',
    aliases: ['pr'],
    category: 'spacing',
    description: 'Right padding',
    numeric: {
      description: 'Right padding in pixels',
      unit: 'px',
      css: n => [{ property: 'padding-right', value: `${n}px` }],
      example: 'Box pad-r 16',
    },
    token: true,
  },

  'pad-b': {
    name: 'pad-b',
    aliases: ['pb'],
    category: 'spacing',
    description: 'Bottom padding',
    numeric: {
      description: 'Bottom padding in pixels',
      unit: 'px',
      css: n => [{ property: 'padding-bottom', value: `${n}px` }],
      example: 'Box pad-b 16',
    },
    token: true,
  },

  'pad-l': {
    name: 'pad-l',
    aliases: ['pl'],
    category: 'spacing',
    description: 'Left padding',
    numeric: {
      description: 'Left padding in pixels',
      unit: 'px',
      css: n => [{ property: 'padding-left', value: `${n}px` }],
      example: 'Box pad-l 16',
    },
    token: true,
  },

  'mar-x': {
    name: 'mar-x',
    aliases: ['mx'],
    category: 'spacing',
    description: 'Horizontal margin (left + right)',
    numeric: {
      description: 'Horizontal margin in pixels',
      unit: 'px',
      css: n => [
        { property: 'margin-left', value: `${n}px` },
        { property: 'margin-right', value: `${n}px` },
      ],
      example: 'Box mar-x 16',
    },
    token: true,
  },

  'mar-y': {
    name: 'mar-y',
    aliases: ['my'],
    category: 'spacing',
    description: 'Vertical margin (top + bottom)',
    numeric: {
      description: 'Vertical margin in pixels',
      unit: 'px',
      css: n => [
        { property: 'margin-top', value: `${n}px` },
        { property: 'margin-bottom', value: `${n}px` },
      ],
      example: 'Box mar-y 16',
    },
    token: true,
  },

  // Individual side margins
  'mar-t': {
    name: 'mar-t',
    aliases: ['mt'],
    category: 'spacing',
    description: 'Top margin',
    numeric: {
      description: 'Top margin in pixels',
      unit: 'px',
      css: n => [{ property: 'margin-top', value: `${n}px` }],
      example: 'Box mar-t 16',
    },
    token: true,
  },

  'mar-r': {
    name: 'mar-r',
    aliases: ['mr'],
    category: 'spacing',
    description: 'Right margin',
    numeric: {
      description: 'Right margin in pixels',
      unit: 'px',
      css: n => [{ property: 'margin-right', value: `${n}px` }],
      example: 'Box mar-r 16',
    },
    token: true,
  },

  'mar-b': {
    name: 'mar-b',
    aliases: ['mb'],
    category: 'spacing',
    description: 'Bottom margin',
    numeric: {
      description: 'Bottom margin in pixels',
      unit: 'px',
      css: n => [{ property: 'margin-bottom', value: `${n}px` }],
      example: 'Box mar-b 16',
    },
    token: true,
  },

  'mar-l': {
    name: 'mar-l',
    aliases: ['ml'],
    category: 'spacing',
    description: 'Left margin',
    numeric: {
      description: 'Left margin in pixels',
      unit: 'px',
      css: n => [{ property: 'margin-left', value: `${n}px` }],
      example: 'Box mar-l 16',
    },
    token: true,
  },

  // ---------------------------------------------------------------------------
  // COLOR
  // ---------------------------------------------------------------------------

  background: {
    name: 'background',
    aliases: ['bg'],
    category: 'color',
    description: 'Background color or gradient (grad #a #b, grad-ver #a #b, grad N #a #b)',

    color: {
      description: 'Hex color or token',
      css: c => [{ property: 'background', value: c }],
    },

    token: true,
    // Note: Gradients (grad, grad-ver, grad N) are handled in IR, not schema
  },

  color: {
    name: 'color',
    aliases: ['col', 'c'],
    category: 'color',
    description: 'Text color or gradient (grad #a #b, grad-ver #a #b)',

    color: {
      description: 'Hex color or token',
      css: c => [{ property: 'color', value: c }],
    },

    token: true,
    // Note: Text gradients (grad, grad-ver) are handled in IR with background-clip workaround
  },

  'border-color': {
    name: 'border-color',
    aliases: ['boc'],
    category: 'color',
    description: 'Border color',

    color: {
      description: 'Hex color or token',
      css: c => [{ property: 'border-color', value: c }],
    },

    token: true,
  },

  // ---------------------------------------------------------------------------
  // BORDER
  // ---------------------------------------------------------------------------

  border: {
    name: 'border',
    aliases: ['bor'],
    category: 'border',
    description: 'Border (width, style, color)',

    numeric: {
      description: 'Border width in pixels',
      unit: 'px',
      // Bug #29 fix: emit `border-width` + `border-style` separately rather
      // than the `border` shorthand. The shorthand resets ALL border-*
      // properties (including border-color), which would override a
      // previously-emitted `border-color: var(--token-boc)` from a token
      // suffix-resolution. Separate properties layer correctly with the
      // existing color rule.
      css: n => [
        { property: 'border-width', value: `${n}px` },
        { property: 'border-style', value: 'solid' },
      ],
      example: 'Box bor 1 #333',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `border-${dir}`, value: val }],
    },

    token: true,
  },

  // Directional border shortcuts
  'border-top': {
    name: 'border-top',
    aliases: ['bor-t', 'bort'],
    category: 'border',
    description: 'Top border',
    numeric: {
      description: 'Top border width in pixels',
      unit: 'px',
      css: n => [{ property: 'border-top', value: `${n}px solid currentColor` }],
      example: 'Box border-top 1',
    },
    token: true,
  },

  'border-bottom': {
    name: 'border-bottom',
    aliases: ['bor-b', 'borb'],
    category: 'border',
    description: 'Bottom border',
    numeric: {
      description: 'Bottom border width in pixels',
      unit: 'px',
      css: n => [{ property: 'border-bottom', value: `${n}px solid currentColor` }],
      example: 'Box border-bottom 1',
    },
    token: true,
  },

  'border-left': {
    name: 'border-left',
    aliases: ['bor-l', 'borl'],
    category: 'border',
    description: 'Left border',
    numeric: {
      description: 'Left border width in pixels',
      unit: 'px',
      css: n => [{ property: 'border-left', value: `${n}px solid currentColor` }],
      example: 'Box border-left 1',
    },
    token: true,
  },

  'border-right': {
    name: 'border-right',
    aliases: ['bor-r', 'borr'],
    category: 'border',
    description: 'Right border',
    numeric: {
      description: 'Right border width in pixels',
      unit: 'px',
      css: n => [{ property: 'border-right', value: `${n}px solid currentColor` }],
      example: 'Box border-right 1',
    },
    token: true,
  },

  radius: {
    name: 'radius',
    aliases: ['rad'],
    category: 'border',
    description: 'Border radius',

    numeric: {
      description: 'Radius in pixels',
      unit: 'px',
      css: n => [{ property: 'border-radius', value: `${n}px` }],
      example: 'Box rad 8',
    },

    directional: {
      directions: ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'],
      css: (dir, val) => {
        const mapping: Record<string, string[]> = {
          tl: ['border-top-left-radius'],
          tr: ['border-top-right-radius'],
          bl: ['border-bottom-left-radius'],
          br: ['border-bottom-right-radius'],
          t: ['border-top-left-radius', 'border-top-right-radius'],
          b: ['border-bottom-left-radius', 'border-bottom-right-radius'],
          l: ['border-top-left-radius', 'border-bottom-left-radius'],
          r: ['border-top-right-radius', 'border-bottom-right-radius'],
        }
        const props = mapping[dir] || []
        return props.map(p => ({ property: p, value: val }))
      },
    },

    token: true,
  },

  // ---------------------------------------------------------------------------
  // TYPOGRAPHY
  // ---------------------------------------------------------------------------

  'font-size': {
    name: 'font-size',
    aliases: ['fs'],
    category: 'typography',
    description: 'Font size',

    numeric: {
      description: 'Font size in pixels',
      unit: 'px',
      css: n => [{ property: 'font-size', value: `${n}px` }],
      example: 'Text fs 16',
    },

    token: true,
  },

  weight: {
    name: 'weight',
    aliases: [],
    category: 'typography',
    description: 'Font weight',

    keywords: {
      thin: { description: 'Font weight 100', css: [{ property: 'font-weight', value: '100' }] },
      light: { description: 'Font weight 300', css: [{ property: 'font-weight', value: '300' }] },
      normal: { description: 'Font weight 400', css: [{ property: 'font-weight', value: '400' }] },
      medium: { description: 'Font weight 500', css: [{ property: 'font-weight', value: '500' }] },
      semibold: {
        description: 'Font weight 600',
        css: [{ property: 'font-weight', value: '600' }],
      },
      bold: { description: 'Font weight 700', css: [{ property: 'font-weight', value: '700' }] },
      black: { description: 'Font weight 900', css: [{ property: 'font-weight', value: '900' }] },
    },

    numeric: {
      description: 'Font weight (100-900)',
      unit: '', // unitless
      css: n => [{ property: 'font-weight', value: String(n) }],
      example: 'Text weight 600',
    },
  },

  line: {
    name: 'line',
    aliases: [],
    category: 'typography',
    description: 'Line height',

    numeric: {
      description: 'Line height (unitless or pixels)',
      css: n => [{ property: 'line-height', value: n > 10 ? `${n}px` : String(n) }],
      example: 'Text line 1.5',
    },

    token: true,
  },

  font: {
    name: 'font',
    aliases: [],
    category: 'typography',
    description: 'Font family',

    keywords: {
      sans: {
        description: 'Sans-serif font stack',
        css: [{ property: 'font-family', value: 'system-ui, sans-serif' }],
      },
      serif: {
        description: 'Serif font stack',
        css: [{ property: 'font-family', value: 'Georgia, serif' }],
      },
      mono: {
        description: 'Monospace font stack',
        css: [{ property: 'font-family', value: 'ui-monospace, monospace' }],
      },
      roboto: {
        description: 'Roboto font',
        css: [{ property: 'font-family', value: 'Roboto, system-ui, sans-serif' }],
      },
    },

    token: true,
  },

  'text-align': {
    name: 'text-align',
    aliases: [],
    category: 'typography',
    description: 'Text alignment',

    keywords: {
      left: { description: 'Left align', css: [{ property: 'text-align', value: 'left' }] },
      center: { description: 'Center align', css: [{ property: 'text-align', value: 'center' }] },
      right: { description: 'Right align', css: [{ property: 'text-align', value: 'right' }] },
      justify: { description: 'Justify text', css: [{ property: 'text-align', value: 'justify' }] },
    },
  },

  italic: {
    name: 'italic',
    aliases: [],
    category: 'typography',
    description: 'Italic text',

    keywords: {
      _standalone: {
        description: 'Apply italic style',
        css: [{ property: 'font-style', value: 'italic' }],
        example: 'Text italic',
      },
    },
  },

  underline: {
    name: 'underline',
    aliases: [],
    category: 'typography',
    description: 'Underlined text',

    keywords: {
      _standalone: {
        description: 'Apply underline',
        css: [{ property: 'text-decoration', value: 'underline' }],
        example: 'Text underline',
      },
    },
  },

  uppercase: {
    name: 'uppercase',
    aliases: [],
    category: 'typography',
    description: 'Uppercase text',

    keywords: {
      _standalone: {
        description: 'Transform to uppercase',
        css: [{ property: 'text-transform', value: 'uppercase' }],
        example: 'Text uppercase',
      },
    },
  },

  lowercase: {
    name: 'lowercase',
    aliases: [],
    category: 'typography',
    description: 'Lowercase text',

    keywords: {
      _standalone: {
        description: 'Transform to lowercase',
        css: [{ property: 'text-transform', value: 'lowercase' }],
        example: 'Text lowercase',
      },
    },
  },

  truncate: {
    name: 'truncate',
    aliases: [],
    category: 'typography',
    description: 'Truncate text with ellipsis',

    keywords: {
      _standalone: {
        description: 'Truncate overflowing text',
        css: [
          { property: 'overflow', value: 'hidden' },
          { property: 'text-overflow', value: 'ellipsis' },
          { property: 'white-space', value: 'nowrap' },
        ],
        example: 'Text truncate',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // POSITION
  // ---------------------------------------------------------------------------

  x: {
    name: 'x',
    aliases: [],
    category: 'transform',
    description: 'X offset using translateX transform',

    numeric: {
      description: 'X offset in pixels',
      unit: 'px',
      css: n => [{ property: 'transform', value: `translateX(${n}px)` }],
      example: 'Box x 100',
    },
  },

  y: {
    name: 'y',
    aliases: [],
    category: 'transform',
    description: 'Y offset using translateY transform',

    numeric: {
      description: 'Y offset in pixels',
      unit: 'px',
      css: n => [{ property: 'transform', value: `translateY(${n}px)` }],
      example: 'Box y 50',
    },
  },

  z: {
    name: 'z',
    aliases: [],
    category: 'position',
    description: 'Z-index (stacking order)',

    numeric: {
      description: 'Z-index value',
      unit: '', // unitless
      css: n => [{ property: 'z-index', value: String(n) }],
      example: 'Box z 10',
    },
  },

  absolute: {
    name: 'absolute',
    aliases: ['abs'],
    category: 'position',
    description: 'Absolute positioning',

    keywords: {
      _standalone: {
        description: 'Position absolute',
        css: [{ property: 'position', value: 'absolute' }],
        example: 'Box absolute',
      },
    },
  },

  fixed: {
    name: 'fixed',
    aliases: [],
    category: 'position',
    description: 'Fixed positioning',

    keywords: {
      _standalone: {
        description: 'Position fixed',
        css: [{ property: 'position', value: 'fixed' }],
        example: 'Box fixed',
      },
    },
  },

  relative: {
    name: 'relative',
    aliases: [],
    category: 'position',
    description: 'Relative positioning',

    keywords: {
      _standalone: {
        description: 'Position relative',
        css: [{ property: 'position', value: 'relative' }],
        example: 'Box relative',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // TRANSFORM
  // ---------------------------------------------------------------------------

  rotate: {
    name: 'rotate',
    aliases: ['rot'],
    category: 'transform',
    description: 'Rotate element',

    numeric: {
      description: 'Rotation in degrees',
      unit: 'deg',
      css: n => [{ property: 'transform', value: `rotate(${n}deg)` }],
      example: 'Box rotate 45',
    },
  },

  scale: {
    name: 'scale',
    aliases: [],
    category: 'transform',
    description: 'Scale element',

    numeric: {
      description: 'Scale factor',
      css: n => [{ property: 'transform', value: `scale(${n})` }],
      example: 'Box scale 1.2',
    },
  },

  // ---------------------------------------------------------------------------
  // EFFECT
  // ---------------------------------------------------------------------------

  opacity: {
    name: 'opacity',
    aliases: ['o', 'opa'],
    category: 'effect',
    description: 'Element opacity',

    numeric: {
      description: 'Opacity (0-1)',
      unit: '', // unitless
      css: n => [{ property: 'opacity', value: String(n) }],
      example: 'Box opacity 0.5',
    },
  },

  shadow: {
    name: 'shadow',
    aliases: [],
    category: 'effect',
    description: 'Box shadow',

    keywords: {
      sm: {
        description: 'Small shadow',
        css: [{ property: 'box-shadow', value: '0 1px 2px rgba(0,0,0,0.05)' }],
        example: 'Box shadow sm',
      },
      md: {
        description: 'Medium shadow',
        css: [{ property: 'box-shadow', value: '0 4px 6px rgba(0,0,0,0.1)' }],
        example: 'Box shadow md',
      },
      lg: {
        description: 'Large shadow',
        css: [{ property: 'box-shadow', value: '0 10px 15px rgba(0,0,0,0.1)' }],
        example: 'Box shadow lg',
      },
    },
  },

  cursor: {
    name: 'cursor',
    aliases: [],
    category: 'effect',
    description: 'Mouse cursor style',

    keywords: {
      pointer: { description: 'Pointer cursor', css: [{ property: 'cursor', value: 'pointer' }] },
      grab: { description: 'Grab cursor', css: [{ property: 'cursor', value: 'grab' }] },
      move: { description: 'Move cursor', css: [{ property: 'cursor', value: 'move' }] },
      text: { description: 'Text cursor', css: [{ property: 'cursor', value: 'text' }] },
      wait: { description: 'Wait cursor', css: [{ property: 'cursor', value: 'wait' }] },
      'not-allowed': {
        description: 'Not allowed cursor',
        css: [{ property: 'cursor', value: 'not-allowed' }],
      },
    },
  },

  blur: {
    name: 'blur',
    aliases: [],
    category: 'effect',
    description: 'Blur filter',

    numeric: {
      description: 'Blur radius in pixels',
      unit: 'px',
      css: n => [{ property: 'filter', value: `blur(${n}px)` }],
      example: 'Box blur 5',
    },
  },

  'backdrop-blur': {
    name: 'backdrop-blur',
    aliases: ['blur-bg'],
    category: 'effect',
    description: 'Backdrop blur filter',

    numeric: {
      description: 'Blur radius in pixels',
      unit: 'px',
      css: n => [{ property: 'backdrop-filter', value: `blur(${n}px)` }],
      example: 'Box backdrop-blur 10',
    },
  },

  hidden: {
    name: 'hidden',
    aliases: [],
    category: 'effect',
    description: 'Hide element',

    keywords: {
      _standalone: {
        description: 'Display none',
        css: [{ property: 'display', value: 'none' }],
        example: 'Box hidden',
      },
    },
  },

  visible: {
    name: 'visible',
    aliases: [],
    category: 'effect',
    description: 'Show element (removes display:none)',

    keywords: {
      _standalone: {
        description: 'Remove display:none, restore original layout',
        css: [{ property: 'display', value: '' }],
        example: 'Box visible',
      },
    },
  },

  disabled: {
    name: 'disabled',
    aliases: [],
    category: 'effect',
    description: 'Disable element',

    keywords: {
      _standalone: {
        description: 'Disable interactions',
        css: [
          { property: 'pointer-events', value: 'none' },
          { property: 'opacity', value: '0.5' },
        ],
        example: 'Button disabled',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SCROLL
  // ---------------------------------------------------------------------------

  scroll: {
    name: 'scroll',
    aliases: ['scroll-ver'],
    category: 'effect',
    description: 'Enable vertical scrolling',

    keywords: {
      _standalone: {
        description: 'Overflow-y auto',
        css: [{ property: 'overflow-y', value: 'auto' }],
        example: 'Box scroll',
      },
    },
  },

  'scroll-hor': {
    name: 'scroll-hor',
    aliases: [],
    category: 'effect',
    description: 'Enable horizontal scrolling',

    keywords: {
      _standalone: {
        description: 'Overflow-x auto',
        css: [{ property: 'overflow-x', value: 'auto' }],
        example: 'Box scroll-hor',
      },
    },
  },

  'scroll-both': {
    name: 'scroll-both',
    aliases: [],
    category: 'effect',
    description: 'Enable scrolling in both directions',

    keywords: {
      _standalone: {
        description: 'Overflow auto',
        css: [{ property: 'overflow', value: 'auto' }],
        example: 'Box scroll-both',
      },
    },
  },

  clip: {
    name: 'clip',
    aliases: [],
    category: 'effect',
    description: 'Clip overflow content',

    keywords: {
      _standalone: {
        description: 'Overflow hidden',
        css: [{ property: 'overflow', value: 'hidden' }],
        example: 'Box clip',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // CONTENT (HTML attributes, not CSS)
  // ---------------------------------------------------------------------------

  content: {
    name: 'content',
    aliases: [],
    category: 'content',
    description: 'Text content for elements',

    // Content is handled specially - not CSS
    keywords: {},
  },

  href: {
    name: 'href',
    aliases: [],
    category: 'content',
    description: 'Link URL for anchor elements',

    keywords: {},
  },

  src: {
    name: 'src',
    aliases: [],
    category: 'content',
    description: 'Source URL for images',

    keywords: {},
  },

  placeholder: {
    name: 'placeholder',
    aliases: [],
    category: 'content',
    description: 'Placeholder text for inputs',

    keywords: {},
  },

  mask: {
    name: 'mask',
    aliases: [],
    category: 'input',
    description: 'Input mask pattern. # = digit, A = letter, * = alphanumeric, others = literal',

    keywords: {},
  },

  // ---------------------------------------------------------------------------
  // INPUT (Form element attributes)
  // ---------------------------------------------------------------------------

  focusable: {
    name: 'focusable',
    aliases: [],
    category: 'input',
    description: 'Make element focusable',

    keywords: {
      _standalone: {
        description: 'Element can receive focus',
        css: [], // Sets tabindex, not CSS
        example: 'Box focusable',
      },
    },
  },

  editable: {
    name: 'editable',
    aliases: [],
    category: 'input',
    description: 'Make text element inline-editable',

    keywords: {
      _standalone: {
        description: 'Element text can be edited inline',
        css: [], // Sets data-editable, not CSS
        example: 'Text item.name, editable',
      },
    },
  },

  'keyboard-nav': {
    name: 'keyboard-nav',
    aliases: ['keynav'],
    category: 'input',
    description: 'Enable keyboard navigation for form container',

    keywords: {
      _standalone: {
        description: 'Enter moves to next field, Escape blurs, Tab cycles through fields',
        css: [], // Runtime behavior, not CSS
        example: 'Frame keyboard-nav',
      },
    },
  },

  'loop-focus': {
    name: 'loop-focus',
    aliases: ['loopfocus'],
    category: 'input',
    description: 'Enable focus looping for highlight navigation',

    keywords: {
      _standalone: {
        description: 'Arrow keys wrap around at start/end of list',
        css: [], // Runtime behavior, not CSS
        example: 'Frame loop-focus',
      },
    },
  },

  typeahead: {
    name: 'typeahead',
    aliases: [],
    category: 'input',
    description: 'Enable typeahead for list navigation',

    keywords: {
      _standalone: {
        description: 'Typing characters jumps to matching item',
        css: [], // Runtime behavior, not CSS
        example: 'Frame typeahead',
      },
    },
  },

  'trigger-text': {
    name: 'trigger-text',
    aliases: ['triggertext'],
    category: 'input',
    description: 'Update trigger text when selection changes',

    keywords: {
      _standalone: {
        description: 'Trigger element shows the selected option text',
        css: [], // Runtime behavior, not CSS
        example: 'Frame trigger-text',
      },
    },
  },

  readonly: {
    name: 'readonly',
    aliases: [],
    category: 'input',
    description: 'Make input readonly',

    keywords: {
      _standalone: {
        description: 'Input is readonly',
        css: [], // Sets attribute, not CSS
        example: 'Input readonly',
      },
    },
  },

  type: {
    name: 'type',
    aliases: [],
    category: 'input',
    description: 'Input type (text, password, email, number, etc.)',

    keywords: {}, // Accepts any string value
  },

  name: {
    name: 'name',
    aliases: [],
    category: 'input',
    description: 'Form element name attribute',

    keywords: {}, // Accepts any string value
  },

  value: {
    name: 'value',
    aliases: [],
    category: 'input',
    description: 'Form element value',

    keywords: {}, // Accepts any value
  },

  checked: {
    name: 'checked',
    aliases: [],
    category: 'input',
    description: 'Checkbox/radio checked state',

    keywords: {
      _standalone: {
        description: 'Element is checked',
        css: [], // Sets attribute, not CSS
        example: 'Checkbox checked',
      },
    },
  },

  min: {
    name: 'min',
    aliases: [],
    category: 'input',
    description: 'Minimum numeric value (Slider, Input number)',

    keywords: {}, // Accepts any number
  },

  max: {
    name: 'max',
    aliases: [],
    category: 'input',
    description: 'Maximum numeric value (Slider, Input number)',

    keywords: {}, // Accepts any number
  },

  step: {
    name: 'step',
    aliases: [],
    category: 'input',
    description: 'Step increment (Slider, Input number)',

    keywords: {}, // Accepts any number
  },

  text: {
    name: 'text',
    aliases: [],
    category: 'content',
    description: 'Text content (alternative to content property)',

    keywords: {}, // Accepts any string value
  },

  // ---------------------------------------------------------------------------
  // ICON
  // ---------------------------------------------------------------------------

  'icon-size': {
    name: 'icon-size',
    aliases: ['is'],
    category: 'icon',
    description: 'Icon size',

    numeric: {
      description: 'Icon size in pixels',
      unit: 'px',
      css: n => [
        { property: 'font-size', value: `${n}px` },
        { property: 'width', value: `${n}px` },
        { property: 'height', value: `${n}px` },
      ],
      example: 'Icon icon-size 24',
    },

    token: true,
  },

  'icon-color': {
    name: 'icon-color',
    aliases: ['ic'],
    category: 'icon',
    description: 'Icon color',

    color: {
      description: 'Icon color',
      css: c => [{ property: 'color', value: c }],
    },

    token: true,
  },

  'icon-weight': {
    name: 'icon-weight',
    aliases: ['iw'],
    category: 'icon',
    description: 'Icon stroke weight',

    numeric: {
      description: 'Icon weight (100-900)',
      unit: '',
      css: n => [{ property: 'font-weight', value: String(n) }],
      example: 'Icon icon-weight 300',
    },
  },

  fill: {
    name: 'fill',
    aliases: [],
    category: 'icon',
    description: 'Filled icon variant',

    keywords: {
      _standalone: {
        description: 'Use filled icon variant',
        css: [], // Sets data attribute
        example: 'Icon fill',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // ANIMATION
  // ---------------------------------------------------------------------------

  animation: {
    name: 'animation',
    aliases: ['anim'],
    category: 'animation',
    description: 'Animation preset or custom animation',

    keywords: {
      'fade-in': { description: 'Fade in animation', css: [] },
      'fade-out': { description: 'Fade out animation', css: [] },
      'slide-in': { description: 'Slide in animation', css: [] },
      'slide-out': { description: 'Slide out animation', css: [] },
      'slide-up': { description: 'Slide up animation', css: [] },
      'slide-down': { description: 'Slide down animation', css: [] },
      'slide-left': { description: 'Slide left animation', css: [] },
      'slide-right': { description: 'Slide right animation', css: [] },
      'scale-in': { description: 'Scale in animation', css: [] },
      'scale-out': { description: 'Scale out animation', css: [] },
      bounce: { description: 'Bounce animation', css: [] },
      pulse: { description: 'Pulse animation', css: [] },
      shake: { description: 'Shake animation', css: [] },
      spin: { description: 'Spin animation', css: [] },
      'reveal-up': { description: 'Scroll reveal - slide up', css: [] },
      'reveal-scale': { description: 'Scroll reveal - scale in', css: [] },
      'reveal-fade': { description: 'Scroll reveal - fade in', css: [] },
    },
  },

  'x-offset': {
    name: 'x-offset',
    aliases: [],
    category: 'transform',
    description: 'X offset using translateX (animatable)',

    numeric: {
      description: 'X offset in pixels',
      unit: 'px',
      css: n => [{ property: 'transform', value: `translateX(${n}px)` }],
      example: 'Box x-offset 10',
    },
  },

  'y-offset': {
    name: 'y-offset',
    aliases: [],
    category: 'transform',
    description: 'Y offset using translateY (animatable)',

    numeric: {
      description: 'Y offset in pixels',
      unit: 'px',
      css: n => [{ property: 'transform', value: `translateY(${n}px)` }],
      example: 'Box y-offset 10',
    },
  },

  // ---------------------------------------------------------------------------
  // STATE VARIANTS (hover-*, focus-*, etc.)
  // ---------------------------------------------------------------------------

  'hover-bg': {
    name: 'hover-bg',
    aliases: ['hover-background'],
    category: 'state-variant',
    description: 'Background color on hover',

    color: {
      description: 'Background color on hover',
      css: c => [{ property: 'background', value: c }],
    },

    token: true,
  },

  'hover-col': {
    name: 'hover-col',
    aliases: ['hover-color', 'hover-c'],
    category: 'state-variant',
    description: 'Text color on hover',

    color: {
      description: 'Text color on hover',
      css: c => [{ property: 'color', value: c }],
    },

    token: true,
  },

  'hover-opacity': {
    name: 'hover-opacity',
    aliases: ['hover-opa', 'hover-o'],
    category: 'state-variant',
    description: 'Opacity on hover',

    numeric: {
      description: 'Opacity on hover (0-1)',
      unit: '',
      css: n => [{ property: 'opacity', value: String(n) }],
      example: 'Button hover-opacity 0.8',
    },
  },

  'hover-scale': {
    name: 'hover-scale',
    aliases: [],
    category: 'state-variant',
    description: 'Scale on hover',

    numeric: {
      description: 'Scale factor on hover',
      css: n => [{ property: 'transform', value: `scale(${n})` }],
      example: 'Button hover-scale 1.05',
    },
  },

  'hover-border': {
    name: 'hover-border',
    aliases: ['hover-bor'],
    category: 'state-variant',
    description: 'Border on hover',

    numeric: {
      description: 'Border width on hover',
      unit: 'px',
      css: n => [{ property: 'border-width', value: `${n}px` }],
      example: 'Button hover-border 2',
    },
  },

  'hover-border-color': {
    name: 'hover-border-color',
    aliases: ['hover-boc'],
    category: 'state-variant',
    description: 'Border color on hover',

    color: {
      description: 'Border color on hover',
      css: c => [{ property: 'border-color', value: c }],
    },

    token: true,
  },

  'hover-radius': {
    name: 'hover-radius',
    aliases: ['hover-rad'],
    category: 'state-variant',
    description: 'Border radius on hover',

    numeric: {
      description: 'Border radius on hover',
      unit: 'px',
      css: n => [{ property: 'border-radius', value: `${n}px` }],
      example: 'Button hover-radius 8',
    },
  },
}
