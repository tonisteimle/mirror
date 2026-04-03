/**
 * Layout Matrix Definition
 *
 * Single source of truth for all layout combinations and their expected CSS output.
 * Used by layout-matrix.test.ts to generate comprehensive tests.
 *
 * Reference: docs/concepts/layout-css-matrix.md
 */

// =============================================================================
// DIMENSION DEFINITIONS
// =============================================================================

/**
 * All possible values for each layout dimension.
 * Used for pairwise test generation.
 */
export const LAYOUT_DIMENSIONS = {
  /**
   * Layout mode determines the container type
   */
  layoutMode: [
    'default',    // flex column
    'hor',        // flex row
    'ver',        // flex column (explicit)
    'grid 12',    // CSS grid with 12 columns
    'grid 3',     // CSS grid with 3 columns
    'stacked',    // position: relative container
  ],

  /**
   * Alignment determines how children are positioned within the container
   */
  alignment: [
    'none',       // default (flex-start)
    'center',     // center both axes
    'spread',     // space-between
    'tl',         // top-left
    'tc',         // top-center
    'tr',         // top-right
    'cl',         // center-left
    'cr',         // center-right
    'bl',         // bottom-left
    'bc',         // bottom-center
    'br',         // bottom-right
  ],

  /**
   * Width sizing
   */
  widthType: [
    'none',       // no width specified
    'w 100',      // fixed pixel width
    'w hug',      // fit-content
    'w full',     // flex: 1 or 100%
  ],

  /**
   * Height sizing
   */
  heightType: [
    'none',       // no height specified
    'h 100',      // fixed pixel height
    'h hug',      // fit-content
    'h full',     // flex: 1 or 100%
  ],

  /**
   * Spacing properties
   */
  spacing: [
    'none',       // no spacing
    'gap 12',     // gap between children
    'pad 16',     // padding
    'gap 12, pad 16', // both
  ],

  /**
   * Additional flex properties
   */
  flexBehavior: [
    'none',
    'wrap',       // flex-wrap: wrap
    'shrink',     // flex-shrink: 1
  ],
} as const

// =============================================================================
// EXPECTED CSS MAPPINGS
// =============================================================================

/**
 * Maps Mirror code to expected CSS output.
 * Key is the Mirror code, value is the expected CSS properties.
 */
export const EXPECTED_CSS: Record<string, Record<string, string>> = {
  // Direction defaults
  'Frame': {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
  },
  'Frame hor': {
    'display': 'flex',
    'flex-direction': 'row',
    'align-items': 'flex-start',
  },
  'Frame ver': {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
  },

  // Sizing
  'Frame w 200': {
    'width': '200px',
  },
  'Frame h 100': {
    'height': '100px',
  },
  'Frame w 200, h 100': {
    'width': '200px',
    'height': '100px',
  },
  'Frame w hug': {
    'width': 'fit-content',
  },
  'Frame h hug': {
    'height': 'fit-content',
  },

  // Alignment - center
  'Frame center': {
    'display': 'flex',
    'justify-content': 'center',
    'align-items': 'center',
  },
  'Frame hor, center': {
    'display': 'flex',
    'flex-direction': 'row',
    'justify-content': 'center',
    'align-items': 'center',
  },

  // Alignment - spread
  'Frame spread': {
    'display': 'flex',
    'justify-content': 'space-between',
  },
  'Frame hor, spread': {
    'display': 'flex',
    'flex-direction': 'row',
    'justify-content': 'space-between',
  },
  'Frame ver, spread': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'space-between',
  },

  // 9-zone alignment
  'Frame tl': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-start',
    'align-items': 'flex-start',
  },
  'Frame tc': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-start',
    'align-items': 'center',
  },
  'Frame tr': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-start',
    'align-items': 'flex-end',
  },
  'Frame cl': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'center',
    'align-items': 'flex-start',
  },
  'Frame cr': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'center',
    'align-items': 'flex-end',
  },
  'Frame bl': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-end',
    'align-items': 'flex-start',
  },
  'Frame bc': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-end',
    'align-items': 'center',
  },
  'Frame br': {
    'display': 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-end',
    'align-items': 'flex-end',
  },

  // Spacing
  'Frame gap 12': {
    'gap': '12px',
  },
  'Frame pad 16': {
    'padding': '16px',
  },
  'Frame pad 12 24': {
    'padding': '12px 24px',
  },
  'Frame pad 8 12 16 20': {
    'padding': '8px 12px 16px 20px',
  },
  'Frame gap 12, pad 16': {
    'gap': '12px',
    'padding': '16px',
  },

  // Flex behavior
  'Frame wrap': {
    'flex-wrap': 'wrap',
  },
  'Frame hor, wrap': {
    'flex-direction': 'row',
    'flex-wrap': 'wrap',
  },
  'Frame shrink': {
    'flex-shrink': '1',
  },

  // Combined properties
  'Frame hor, gap 12, pad 16': {
    'flex-direction': 'row',
    'gap': '12px',
    'padding': '16px',
  },
  'Frame hor, center, gap 12': {
    'flex-direction': 'row',
    'justify-content': 'center',
    'align-items': 'center',
    'gap': '12px',
  },
  'Frame hor, spread, gap 12': {
    'flex-direction': 'row',
    'justify-content': 'space-between',
    'gap': '12px',
  },
  'Frame center, gap 12': {
    'justify-content': 'center',
    'align-items': 'center',
    'gap': '12px',
  },

  // Grid
  'Frame grid 12': {
    'display': 'grid',
    'grid-template-columns': 'repeat(12, 1fr)',
  },
  'Frame grid 3': {
    'display': 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
  },
  'Frame grid 12, gap 16': {
    'display': 'grid',
    'grid-template-columns': 'repeat(12, 1fr)',
    'gap': '16px',
  },
  'Frame grid 3, gap-x 16': {
    'display': 'grid',
    'column-gap': '16px',
  },
  'Frame grid 3, gap-y 24': {
    'display': 'grid',
    'row-gap': '24px',
  },
  'Frame grid 3, row-height 100': {
    'display': 'grid',
    'grid-auto-rows': '100px',
  },
  'Frame grid 3, hor': {
    'display': 'grid',
    'grid-auto-flow': 'row',
  },
  'Frame grid 3, ver': {
    'display': 'grid',
    'grid-auto-flow': 'column',
  },
  'Frame grid 3, dense': {
    'display': 'grid',
  },

  // Stacked
  'Frame stacked': {
    'position': 'relative',
  },
  'Frame stacked, w 400, h 300': {
    'position': 'relative',
    'width': '400px',
    'height': '300px',
  },
}

// =============================================================================
// CHILD-IN-PARENT MATRIX
// =============================================================================

/**
 * How child properties transform based on parent context.
 * Format: [parentCode, childCode, expectedChildCSS]
 */
export const CHILD_IN_PARENT_MATRIX: Array<{
  parent: string
  child: string
  expectedCSS: Record<string, string>
  description?: string
}> = [
  // Fixed width in flex context
  {
    parent: 'Frame',
    child: 'Frame w 100',
    expectedCSS: { 'width': '100px', 'flex-shrink': '0' },
    description: 'Fixed width child in vertical flex gets flex-shrink: 0',
  },
  {
    parent: 'Frame hor',
    child: 'Frame w 100',
    expectedCSS: { 'width': '100px', 'flex-shrink': '0' },
    description: 'Fixed width child in horizontal flex gets flex-shrink: 0',
  },

  // w full in flex context - behavior depends on parent axis
  // In column parent (cross-axis): align-self: stretch
  // In row parent (main-axis): flex: 1 1 0%
  {
    parent: 'Frame w 400',
    child: 'Frame w full',
    expectedCSS: { 'min-width': '0', 'align-self': 'stretch' },
    description: 'w full child in vertical parent gets stretch (cross-axis)',
  },
  {
    parent: 'Frame hor, w 400',
    child: 'Frame w full',
    expectedCSS: { 'flex': '1 1 0%', 'min-width': '0' },
    description: 'w full child in horizontal parent gets flex (main-axis)',
  },

  // h full in flex context
  // In column parent (main-axis): flex: 1 1 0%
  {
    parent: 'Frame h 400',
    child: 'Frame h full',
    expectedCSS: { 'flex': '1 1 0%', 'min-height': '0' },
    description: 'h full child in vertical parent gets flex (main-axis)',
  },

  // Grid children
  {
    parent: 'Frame grid 12',
    child: 'Frame w 4',
    expectedCSS: { 'grid-column': 'span 4' },
    description: 'w in grid child is column span',
  },
  {
    parent: 'Frame grid 12',
    child: 'Frame h 2',
    expectedCSS: { 'grid-row': 'span 2' },
    description: 'h in grid child is row span',
  },
  {
    parent: 'Frame grid 12',
    child: 'Frame x 2',
    expectedCSS: { 'grid-column-start': '2' },
    description: 'x in grid child is column position',
  },
  {
    parent: 'Frame grid 12',
    child: 'Frame y 3',
    expectedCSS: { 'grid-row-start': '3' },
    description: 'y in grid child is row position',
  },
  {
    parent: 'Frame grid 12',
    child: 'Frame x 2, y 3, w 4, h 2',
    expectedCSS: {
      'grid-column-start': '2',
      'grid-row-start': '3',
      'grid-column': 'span 4',
      'grid-row': 'span 2',
    },
    description: 'Combined grid positioning',
  },

  // Stacked children
  {
    parent: 'Frame stacked, w 400, h 300',
    child: 'Frame x 50, y 30',
    expectedCSS: { 'position': 'absolute', 'left': '50px', 'top': '30px' },
    description: 'x/y in stacked child is absolute positioning',
  },
  {
    parent: 'Frame stacked, w 200, h 150',
    child: 'Frame w full, h full',
    expectedCSS: { 'position': 'absolute', 'width': '100%', 'height': '100%' },
    description: 'w/h full in stacked child fills container',
  },
  {
    parent: 'Frame stacked, w 200, h 150',
    child: 'Frame bottom',
    expectedCSS: { 'position': 'absolute', 'bottom': '0' },
    description: 'bottom directive positions at bottom',
  },
  {
    parent: 'Frame stacked, w 200, h 150',
    child: 'Frame top, left',
    expectedCSS: { 'position': 'absolute', 'top': '0', 'left': '0' },
    description: 'top, left directives position at top-left',
  },
  {
    parent: 'Frame stacked, w 200, h 150',
    child: 'Frame bottom, right',
    expectedCSS: { 'position': 'absolute', 'bottom': '0', 'right': '0' },
    description: 'bottom, right directives position at bottom-right',
  },
  {
    parent: 'Frame stacked, w 200, h 150',
    child: 'Frame center',
    expectedCSS: { 'position': 'absolute', 'top': '50%', 'left': '50%', 'transform': 'translate(-50%, -50%)' },
    description: 'center in stacked child centers with transform',
  },
  {
    parent: 'Frame stacked',
    child: 'Frame x 100, y 50, z 10',
    expectedCSS: { 'position': 'absolute', 'left': '100px', 'top': '50px', 'z-index': '10' },
    description: 'z property sets z-index',
  },

  // x/y outside grid (backward compatibility)
  {
    parent: 'Frame pos',
    child: 'Frame x 50',
    expectedCSS: { 'position': 'absolute', 'left': '50px' },
    description: 'x outside grid is absolute left',
  },
  {
    parent: 'Frame pos',
    child: 'Frame y 100',
    expectedCSS: { 'position': 'absolute', 'top': '100px' },
    description: 'y outside grid is absolute top',
  },

  // Sidebar pattern (fix + flex + fix)
  {
    parent: 'Frame hor, w 400',
    child: 'Frame w 60',
    expectedCSS: { 'width': '60px', 'flex-shrink': '0' },
    description: 'Fixed sidebar in horizontal layout',
  },
]

// =============================================================================
// CONFLICT RESOLUTION RULES
// =============================================================================

/**
 * Tests for property conflicts where last value should win.
 */
export const CONFLICT_TESTS: Array<{
  code: string
  expectedCSS: Record<string, string>
  description: string
}> = [
  {
    code: 'Frame hor, ver',
    expectedCSS: { 'flex-direction': 'column' },
    description: 'ver after hor: ver wins',
  },
  {
    code: 'Frame ver, hor',
    expectedCSS: { 'flex-direction': 'row' },
    description: 'hor after ver: hor wins',
  },
  {
    code: 'Frame center, spread',
    expectedCSS: { 'justify-content': 'space-between' },
    description: 'spread after center: spread wins for justify-content',
  },
  {
    code: 'Frame w 100, w 200',
    expectedCSS: { 'width': '200px' },
    description: 'Last width wins',
  },
]

// =============================================================================
// EDGE CASES
// =============================================================================

/**
 * Edge case tests for unusual but valid inputs.
 */
export const EDGE_CASE_TESTS: Array<{
  code: string
  expectedCSS: Record<string, string>
  description: string
}> = [
  {
    code: 'Frame',
    expectedCSS: { 'display': 'flex', 'flex-direction': 'column' },
    description: 'Empty Frame has default flex column layout',
  },
  {
    code: 'Frame w 0',
    expectedCSS: { 'width': '0px' },
    description: 'Zero width is valid',
  },
  {
    code: 'Frame gap 0',
    expectedCSS: { 'gap': '0px' },
    description: 'Zero gap is valid',
  },
]

// =============================================================================
// COMPLETE COMBINATION MATRIX (for pairwise generation)
// =============================================================================

/**
 * All valid combinations of layout properties.
 * Used to generate pairwise tests.
 */
export interface LayoutCombination {
  layoutMode: (typeof LAYOUT_DIMENSIONS.layoutMode)[number]
  alignment: (typeof LAYOUT_DIMENSIONS.alignment)[number]
  widthType: (typeof LAYOUT_DIMENSIONS.widthType)[number]
  heightType: (typeof LAYOUT_DIMENSIONS.heightType)[number]
  spacing: (typeof LAYOUT_DIMENSIONS.spacing)[number]
  flexBehavior: (typeof LAYOUT_DIMENSIONS.flexBehavior)[number]
}

/**
 * Build Mirror code from a combination.
 */
export function buildMirrorCode(combo: Partial<LayoutCombination>): string {
  const parts: string[] = ['Frame']

  if (combo.layoutMode && combo.layoutMode !== 'default') {
    parts.push(combo.layoutMode)
  }
  if (combo.alignment && combo.alignment !== 'none') {
    parts.push(combo.alignment)
  }
  if (combo.widthType && combo.widthType !== 'none') {
    parts.push(combo.widthType)
  }
  if (combo.heightType && combo.heightType !== 'none') {
    parts.push(combo.heightType)
  }
  if (combo.spacing && combo.spacing !== 'none') {
    parts.push(combo.spacing)
  }
  if (combo.flexBehavior && combo.flexBehavior !== 'none') {
    parts.push(combo.flexBehavior)
  }

  return parts.join(', ')
}

/**
 * Lookup expected CSS for a combination.
 * Returns merged CSS from all applicable rules.
 */
export function lookupExpectedCSS(code: string): Record<string, string> {
  // First check for exact match
  if (EXPECTED_CSS[code]) {
    return { ...EXPECTED_CSS[code] }
  }

  // Otherwise build from components
  const result: Record<string, string> = {}

  // Base flex defaults
  result['display'] = 'flex'
  result['flex-direction'] = 'column'
  result['align-items'] = 'flex-start'

  // Parse properties from code
  const parts = code.replace('Frame', '').trim().split(/,\s*/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Direction
    if (trimmed === 'hor') {
      result['flex-direction'] = 'row'
    } else if (trimmed === 'ver') {
      result['flex-direction'] = 'column'
    }

    // Grid
    else if (trimmed.startsWith('grid ')) {
      result['display'] = 'grid'
      const cols = trimmed.replace('grid ', '')
      if (cols.startsWith('auto ')) {
        const size = cols.replace('auto ', '')
        result['grid-template-columns'] = `repeat(auto-fill, minmax(${size}px, 1fr))`
      } else {
        result['grid-template-columns'] = `repeat(${cols}, 1fr)`
      }
      delete result['flex-direction']
      delete result['align-items']
    }

    // Stacked
    else if (trimmed === 'stacked') {
      result['position'] = 'relative'
    }

    // Alignment
    else if (trimmed === 'center') {
      result['justify-content'] = 'center'
      result['align-items'] = 'center'
    } else if (trimmed === 'spread') {
      result['justify-content'] = 'space-between'
    } else if (trimmed === 'tl') {
      result['justify-content'] = 'flex-start'
      result['align-items'] = 'flex-start'
    } else if (trimmed === 'tc') {
      result['justify-content'] = 'flex-start'
      result['align-items'] = 'center'
    } else if (trimmed === 'tr') {
      result['justify-content'] = 'flex-start'
      result['align-items'] = 'flex-end'
    } else if (trimmed === 'cl') {
      result['justify-content'] = 'center'
      result['align-items'] = 'flex-start'
    } else if (trimmed === 'cr') {
      result['justify-content'] = 'center'
      result['align-items'] = 'flex-end'
    } else if (trimmed === 'bl') {
      result['justify-content'] = 'flex-end'
      result['align-items'] = 'flex-start'
    } else if (trimmed === 'bc') {
      result['justify-content'] = 'flex-end'
      result['align-items'] = 'center'
    } else if (trimmed === 'br') {
      result['justify-content'] = 'flex-end'
      result['align-items'] = 'flex-end'
    }

    // Sizing
    else if (trimmed.match(/^w \d+$/)) {
      const value = trimmed.replace('w ', '')
      result['width'] = `${value}px`
    } else if (trimmed.match(/^h \d+$/)) {
      const value = trimmed.replace('h ', '')
      result['height'] = `${value}px`
    } else if (trimmed === 'w hug') {
      result['width'] = 'fit-content'
    } else if (trimmed === 'h hug') {
      result['height'] = 'fit-content'
    }

    // Spacing
    else if (trimmed.match(/^gap \d+$/)) {
      const value = trimmed.replace('gap ', '')
      result['gap'] = `${value}px`
    } else if (trimmed.match(/^pad \d+$/)) {
      const value = trimmed.replace('pad ', '')
      result['padding'] = `${value}px`
    } else if (trimmed.match(/^gap-x \d+$/)) {
      const value = trimmed.replace('gap-x ', '')
      result['column-gap'] = `${value}px`
    } else if (trimmed.match(/^gap-y \d+$/)) {
      const value = trimmed.replace('gap-y ', '')
      result['row-gap'] = `${value}px`
    } else if (trimmed.match(/^row-height \d+$/)) {
      const value = trimmed.replace('row-height ', '')
      result['grid-auto-rows'] = `${value}px`
    }

    // Flex behavior
    else if (trimmed === 'wrap') {
      result['flex-wrap'] = 'wrap'
    } else if (trimmed === 'shrink') {
      result['flex-shrink'] = '1'
    } else if (trimmed === 'dense') {
      if (result['grid-auto-flow']) {
        result['grid-auto-flow'] += ' dense'
      } else {
        result['grid-auto-flow'] = 'dense'
      }
    }
  }

  return result
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a combination is valid (some combinations don't make sense).
 */
export function isValidCombination(combo: Partial<LayoutCombination>): boolean {
  // Grid with flex-specific properties is questionable but not invalid
  // stacked with 9-zone alignment is valid (uses absolute positioning)

  // Invalid: wrap/shrink with grid or stacked
  if ((combo.layoutMode === 'grid 12' || combo.layoutMode === 'grid 3' || combo.layoutMode === 'stacked') &&
      (combo.flexBehavior === 'wrap' || combo.flexBehavior === 'shrink')) {
    return false
  }

  // Invalid: spread in grid (no meaning)
  if ((combo.layoutMode === 'grid 12' || combo.layoutMode === 'grid 3') && combo.alignment === 'spread') {
    return false
  }

  // Invalid: hor + 9-zone (conceptually incompatible - 9-zone implies column)
  const nineZoneAlignments = ['tl', 'tc', 'tr', 'cl', 'cr', 'bl', 'bc', 'br']
  if (combo.layoutMode === 'hor' && combo.alignment && nineZoneAlignments.includes(combo.alignment)) {
    return false
  }

  return true
}

/**
 * Get all test categories for documentation/reporting.
 */
export function getTestCategories(): Array<{
  name: string
  description: string
  testCount: number
}> {
  return [
    { name: 'Direction', description: 'Flex direction tests (hor, ver, default)', testCount: 3 },
    { name: 'Sizing', description: 'Width/height with px, hug, full', testCount: 20 },
    { name: 'Alignment', description: 'center, spread, 9-zone positions', testCount: 15 },
    { name: 'Spacing', description: 'gap, pad, gap-x, gap-y', testCount: 10 },
    { name: 'Grid', description: 'CSS Grid specific tests', testCount: 35 },
    { name: 'Stacked', description: 'Absolute positioning tests', testCount: 25 },
    { name: 'Parent-Child', description: 'Context-aware child styling', testCount: 30 },
    { name: 'Conflicts', description: 'Property conflict resolution', testCount: 10 },
    { name: 'Edge Cases', description: 'Unusual but valid inputs', testCount: 15 },
    { name: 'Pairwise', description: 'Generated pairwise combinations', testCount: 350 },
  ]
}
