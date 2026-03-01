/**
 * Visual Roundtrip Test Cases
 *
 * Mirror code samples for visual comparison testing.
 */

export interface VisualTestCase {
  name: string
  mirror: string
  description: string
  criticalProps?: string[]  // Properties that must match exactly
  skip?: boolean
}

/**
 * Basic component test cases
 */
export const BASIC_CASES: VisualTestCase[] = [
  {
    name: 'Simple box with padding',
    mirror: 'Box pad 16',
    description: 'Tests basic padding application',
    criticalProps: ['padding']
  },
  {
    name: 'Box with background',
    mirror: 'Box bg #3B82F6, pad 12',
    description: 'Tests background color and padding',
    criticalProps: ['background-color', 'padding']
  },
  {
    name: 'Box with border radius',
    mirror: 'Box bg #333, pad 16, rad 8',
    description: 'Tests border-radius application',
    criticalProps: ['border-radius']
  },
  {
    name: 'Box with multiple properties',
    mirror: 'Box pad 24, bg #1E1E2E, rad 12, shadow md',
    description: 'Tests multiple visual properties',
    criticalProps: ['padding', 'background-color', 'border-radius', 'box-shadow']
  }
]

/**
 * Layout test cases
 */
export const LAYOUT_CASES: VisualTestCase[] = [
  {
    name: 'Horizontal layout',
    mirror: `Row hor, gap 12
  Box pad 8, bg #333, "A"
  Box pad 8, bg #333, "B"`,
    description: 'Tests flex-direction row and gap',
    criticalProps: ['flex-direction', 'gap']
  },
  {
    name: 'Vertical layout with gap',
    mirror: `Column ver, gap 8
  Box "First"
  Box "Second"`,
    description: 'Tests flex-direction column and gap',
    criticalProps: ['flex-direction', 'gap']
  },
  {
    name: 'Centered content',
    mirror: 'Box 200 100, center, bg #333',
    description: 'Tests centering (justify-content, align-items)',
    criticalProps: ['justify-content', 'align-items']
  },
  {
    name: 'Spread layout',
    mirror: `Row hor, spread
  Box "Left"
  Box "Right"`,
    description: 'Tests space-between distribution',
    criticalProps: ['justify-content']
  }
]

/**
 * Typography test cases
 */
export const TYPOGRAPHY_CASES: VisualTestCase[] = [
  {
    name: 'Font size',
    mirror: 'Text fs 24, "Large Text"',
    description: 'Tests font-size application',
    criticalProps: ['font-size']
  },
  {
    name: 'Font weight bold',
    mirror: 'Text weight bold, "Bold Text"',
    description: 'Tests font-weight application',
    criticalProps: ['font-weight']
  },
  {
    name: 'Text color',
    mirror: 'Text col #3B82F6, "Blue Text"',
    description: 'Tests text color',
    criticalProps: ['color']
  },
  {
    name: 'Combined typography',
    mirror: 'Text fs 20, weight bold, col #22C55E, "Styled"',
    description: 'Tests multiple text properties',
    criticalProps: ['font-size', 'font-weight', 'color']
  }
]

/**
 * Sizing test cases
 */
export const SIZING_CASES: VisualTestCase[] = [
  {
    name: 'Fixed width',
    mirror: 'Box w 200, h 100, bg #333',
    description: 'Tests fixed dimensions',
    criticalProps: ['width', 'height']
  },
  {
    name: 'Full width',
    mirror: 'Box w full, h 50, bg #333',
    description: 'Tests 100% width',
    criticalProps: ['width']
  },
  {
    name: 'Min/max constraints',
    mirror: 'Box minw 100, maxw 500, bg #333, pad 16',
    description: 'Tests min/max constraints',
    criticalProps: ['min-width', 'max-width']
  }
]

/**
 * Button styling test cases
 */
export const BUTTON_CASES: VisualTestCase[] = [
  {
    name: 'Primary button',
    mirror: 'Button pad 12 24, bg #3B82F6, col #FFF, rad 8, "Click"',
    description: 'Tests button styling',
    criticalProps: ['padding', 'background-color', 'color', 'border-radius']
  },
  {
    name: 'Outline button',
    mirror: 'Button pad 12 24, bor 1 #3B82F6, col #3B82F6, rad 8, bg transparent, "Outline"',
    description: 'Tests border styling',
    criticalProps: ['border-width', 'border-color', 'background-color']
  },
  {
    name: 'Ghost button',
    mirror: 'Button pad 12 24, bg transparent, col #3B82F6, "Ghost"',
    description: 'Tests transparent background',
    criticalProps: ['background-color', 'color']
  }
]

/**
 * Card component test cases
 */
export const CARD_CASES: VisualTestCase[] = [
  {
    name: 'Simple card',
    mirror: `Card pad 24, bg #1E1E2E, rad 12
  Title fs 18, weight bold, "Card Title"
  Description col #888, "Card description text"`,
    description: 'Tests card with children',
    criticalProps: ['padding', 'background-color', 'border-radius']
  },
  {
    name: 'Card with shadow',
    mirror: 'Card pad 24, bg #1E1E2E, rad 12, shadow lg',
    description: 'Tests box-shadow',
    criticalProps: ['box-shadow']
  },
  {
    name: 'Card with border',
    mirror: 'Card pad 24, bg #1E1E2E, rad 12, bor 1 #333',
    description: 'Tests border styling',
    criticalProps: ['border-width', 'border-color']
  }
]

/**
 * Visual property test cases
 */
export const VISUAL_CASES: VisualTestCase[] = [
  {
    name: 'Opacity',
    mirror: 'Box bg #3B82F6, pad 16, opacity 0.5',
    description: 'Tests opacity application',
    criticalProps: ['opacity']
  },
  {
    name: 'Cursor pointer',
    mirror: 'Box pad 16, bg #333, cursor pointer, "Clickable"',
    description: 'Tests cursor styling',
    criticalProps: ['cursor']
  },
  {
    name: 'Overflow scroll',
    mirror: 'Box h 100, scroll, bg #333, pad 8',
    description: 'Tests overflow behavior',
    criticalProps: ['overflow', 'overflow-y']
  }
]

/**
 * Complex component test cases
 */
export const COMPLEX_CASES: VisualTestCase[] = [
  {
    name: 'Navigation item',
    mirror: `Item hor, gap 12, pad 12, rad 8, bg #333
  Icon "home"
  Text "Dashboard"`,
    description: 'Tests navigation item layout',
    criticalProps: ['flex-direction', 'gap', 'padding', 'border-radius']
  },
  {
    name: 'Form input',
    mirror: 'Input pad 12, bg #1E1E2E, bor 1 #333, rad 6, col #FFF, "Placeholder"',
    description: 'Tests input styling',
    criticalProps: ['padding', 'background-color', 'border-width', 'border-color', 'border-radius']
  },
  {
    name: 'Badge',
    mirror: 'Badge pad 4 8, bg #22C55E, col #FFF, rad 9999, fs 12, "New"',
    description: 'Tests pill-shaped badge',
    criticalProps: ['padding', 'background-color', 'color', 'border-radius', 'font-size']
  }
]

/**
 * All test cases combined
 */
export const ALL_CASES: VisualTestCase[] = [
  ...BASIC_CASES,
  ...LAYOUT_CASES,
  ...TYPOGRAPHY_CASES,
  ...SIZING_CASES,
  ...BUTTON_CASES,
  ...CARD_CASES,
  ...VISUAL_CASES,
  ...COMPLEX_CASES
]

/**
 * Quick smoke test cases (subset for fast testing)
 */
export const SMOKE_CASES: VisualTestCase[] = [
  BASIC_CASES[0],   // Simple padding
  LAYOUT_CASES[0],  // Horizontal layout
  BUTTON_CASES[0],  // Primary button
  CARD_CASES[0]     // Simple card
]
