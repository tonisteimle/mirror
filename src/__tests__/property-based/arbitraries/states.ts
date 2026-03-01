/**
 * State Arbitraries for Mirror DSL
 *
 * Generates random system states (hover, focus, active, disabled)
 * and behavior states (highlighted, selected, expanded, etc.)
 */

import * as fc from 'fast-check'
import {
  componentName,
  hexColor,
  smallPixelValue,
  opacityValue
} from './primitives'

// =============================================================================
// System State Blocks
// =============================================================================

/** System state names */
export const systemStateName = fc.constantFrom('hover', 'focus', 'active', 'disabled')

/** Simple hover state block */
export const hoverStateBlock = fc.record({
  bg: fc.option(hexColor, { nil: undefined }),
  col: fc.option(hexColor, { nil: undefined }),
  opacity: fc.option(opacityValue, { nil: undefined }),
  scale: fc.option(fc.double({ min: 0.9, max: 1.2, noNaN: true }), { nil: undefined })
}).map(({ bg, col, opacity, scale }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (col) props.push(`col ${col}`)
  if (opacity !== undefined) props.push(`opacity ${opacity}`)
  if (scale !== undefined) props.push(`scale ${scale.toFixed(2)}`)
  return `hover\n  ${props.join('\n  ')}`
})

/** Focus state block */
export const focusStateBlock = fc.record({
  bor: fc.option(smallPixelValue, { nil: undefined }),
  boc: fc.option(hexColor, { nil: undefined }),
  shadow: fc.option(fc.constantFrom('sm', 'md', 'lg'), { nil: undefined })
}).map(({ bor, boc, shadow }) => {
  const props: string[] = []
  if (bor !== undefined) props.push(`bor ${bor}`)
  if (boc) props.push(`boc ${boc}`)
  if (shadow) props.push(`shadow ${shadow}`)
  return `focus\n  ${props.join('\n  ')}`
})

/** Active (pressed) state block */
export const activeStateBlock = fc.record({
  bg: hexColor,
  scale: fc.option(fc.double({ min: 0.95, max: 0.99, noNaN: true }), { nil: undefined })
}).map(({ bg, scale }) => {
  const props = [`bg ${bg}`]
  if (scale !== undefined) props.push(`scale ${scale.toFixed(2)}`)
  return `active\n  ${props.join('\n  ')}`
})

/** Disabled state block */
export const disabledStateBlock = fc.record({
  opacity: opacityValue,
  cursor: fc.constantFrom('not-allowed', 'default')
}).map(({ opacity, cursor }) =>
  `disabled\n  opacity ${opacity}\n  cursor ${cursor}`
)

/** Any system state block */
export const anySystemStateBlock = fc.oneof(
  hoverStateBlock,
  focusStateBlock,
  activeStateBlock,
  disabledStateBlock
)

// =============================================================================
// Behavior State Blocks
// =============================================================================

/** Behavior state names */
export const behaviorStateName = fc.constantFrom(
  'highlighted', 'selected', 'expanded', 'collapsed',
  'valid', 'invalid', 'active', 'inactive', 'on', 'off', 'default'
)

/** Highlighted state block */
export const highlightedStateBlock = fc.record({
  bg: hexColor,
  col: fc.option(hexColor, { nil: undefined })
}).map(({ bg, col }) => {
  const props = [`bg ${bg}`]
  if (col) props.push(`col ${col}`)
  return `state highlighted\n  ${props.join('\n  ')}`
})

/** Selected state block */
export const selectedStateBlock = fc.record({
  bg: hexColor,
  col: fc.option(hexColor, { nil: undefined }),
  bor: fc.option(smallPixelValue, { nil: undefined })
}).map(({ bg, col, bor }) => {
  const props = [`bg ${bg}`]
  if (col) props.push(`col ${col}`)
  if (bor !== undefined) props.push(`bor ${bor}`)
  return `state selected\n  ${props.join('\n  ')}`
})

/** Expanded/collapsed states (toggle pattern) */
export const expandCollapseStates = fc.record({
  expandedHeight: fc.integer({ min: 100, max: 500 }),
  collapsedHeight: fc.integer({ min: 0, max: 50 })
}).map(({ expandedHeight, collapsedHeight }) =>
  `state expanded\n  height ${expandedHeight}\n  opacity 1\nstate collapsed\n  height ${collapsedHeight}\n  opacity 0`
)

/** Valid/invalid states (form validation) */
export const validInvalidStates = fc.record({
  validColor: hexColor,
  invalidColor: hexColor
}).map(({ validColor, invalidColor }) =>
  `state valid\n  boc ${validColor}\nstate invalid\n  boc ${invalidColor}`
)

/** On/off states (toggle/switch) */
export const onOffStates = fc.record({
  onBg: hexColor,
  offBg: hexColor
}).map(({ onBg, offBg }) =>
  `state on\n  bg ${onBg}\nstate off\n  bg ${offBg}`
)

/** Any behavior state block */
export const anyBehaviorStateBlock = fc.oneof(
  highlightedStateBlock,
  selectedStateBlock,
  expandCollapseStates,
  validInvalidStates,
  onOffStates
)

// =============================================================================
// Selection State Block (for lists)
// =============================================================================

/** Selection state with selected/not-selected */
export const selectionStateBlock = fc.record({
  selectedBg: hexColor,
  selectedCol: fc.option(hexColor, { nil: undefined }),
  notSelectedBg: fc.constantFrom('transparent', '#333', '#444')
}).map(({ selectedBg, selectedCol, notSelectedBg }) => {
  let code = 'state selection\n'
  code += '  selected\n'
  code += `    bg ${selectedBg}\n`
  if (selectedCol) code += `    col ${selectedCol}\n`
  code += '  not-selected\n'
  code += `    bg ${notSelectedBg}`
  return code
})

// =============================================================================
// Component with States
// =============================================================================

/** Button with hover state */
export const buttonWithHover = fc.record({
  baseBg: hexColor,
  hoverBg: hexColor,
  pad: smallPixelValue,
  rad: smallPixelValue
}).map(({ baseBg, hoverBg, pad, rad }) =>
  `Button pad ${pad}, bg ${baseBg}, rad ${rad}\n  hover\n    bg ${hoverBg}`
)

/** Input with focus state */
export const inputWithFocus = fc.record({
  baseBor: smallPixelValue,
  focusBoc: hexColor
}).map(({ baseBor, focusBoc }) =>
  `Input pad 12, bor ${baseBor}\n  focus\n    boc ${focusBoc}\n    shadow sm`
)

/** Card with multiple states */
export const cardWithStates = fc.record({
  baseBg: hexColor,
  hoverBg: hexColor,
  activeBg: hexColor
}).map(({ baseBg, hoverBg, activeBg }) =>
  `Card pad 16, bg ${baseBg}, rad 8\n  hover\n    bg ${hoverBg}\n  active\n    bg ${activeBg}`
)

/** List item with selection states */
export const listItemWithSelection = fc.record({
  baseBg: fc.constantFrom('#333', '#444', 'transparent'),
  highlightedBg: hexColor,
  selectedBg: hexColor
}).map(({ baseBg, highlightedBg, selectedBg }) =>
  `Item pad 12, bg ${baseBg}\n  state highlighted\n    bg ${highlightedBg}\n  state selected\n    bg ${selectedBg}`
)

// =============================================================================
// Inline Hover Properties
// =============================================================================

/** Inline hover-bg property */
export const inlineHoverBg = fc.record({
  name: componentName,
  bg: hexColor,
  hoverBg: hexColor
}).map(({ name, bg, hoverBg }) =>
  `${name} bg ${bg}, hover-bg ${hoverBg}`
)

/** Inline hover properties (multiple) */
export const inlineHoverProps = fc.record({
  name: componentName,
  hoverBg: fc.option(hexColor, { nil: undefined }),
  hoverCol: fc.option(hexColor, { nil: undefined }),
  hoverOpa: fc.option(opacityValue, { nil: undefined }),
  hoverScale: fc.option(fc.double({ min: 1.0, max: 1.2, noNaN: true }), { nil: undefined })
}).map(({ name, hoverBg, hoverCol, hoverOpa, hoverScale }) => {
  const props: string[] = []
  if (hoverBg) props.push(`hover-bg ${hoverBg}`)
  if (hoverCol) props.push(`hover-col ${hoverCol}`)
  if (hoverOpa !== undefined) props.push(`hover-opa ${hoverOpa}`)
  if (hoverScale !== undefined) props.push(`hover-scale ${hoverScale.toFixed(2)}`)
  return `${name} ${props.join(', ')}`
})

// =============================================================================
// Combined Generators
// =============================================================================

/** Any state block (system or behavior) */
export const anyStateBlock = fc.oneof(
  anySystemStateBlock,
  anyBehaviorStateBlock
)

/** Component with any state */
export const componentWithStates = fc.oneof(
  buttonWithHover,
  inputWithFocus,
  cardWithStates,
  listItemWithSelection
)
