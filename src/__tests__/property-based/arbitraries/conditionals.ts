/**
 * Conditional Arbitraries for Mirror DSL
 *
 * Generates random if/else blocks and inline conditionals.
 */

import * as fc from 'fast-check'
import {
  componentName,
  hexColor,
  smallPixelValue,
  shortLabel,
  iconName
} from './primitives'

// =============================================================================
// Variable Generators
// =============================================================================

/** Simple boolean variable */
export const booleanVariable = fc.constantFrom(
  '$isLoggedIn', '$isOpen', '$isActive', '$isLoading', '$isValid',
  '$hasError', '$showDetails', '$isExpanded', '$isSelected', '$isDark'
)

/** Comparison expression */
export const comparisonExpr = fc.record({
  left: fc.oneof(
    fc.constantFrom('$count', '$index', '$value', '$age', '$score'),
    fc.integer({ min: 0, max: 100 }).map(String)
  ),
  operator: fc.constantFrom('==', '!=', '>', '<', '>=', '<='),
  right: fc.integer({ min: 0, max: 100 })
}).map(({ left, operator, right }) => `${left} ${operator} ${right}`)

/** Property access variable */
export const propertyAccessVariable = fc.constantFrom(
  '$item.active', '$task.done', '$user.admin', '$post.published',
  '$product.inStock', '$order.completed', '$message.read'
)

/** Any condition expression */
export const anyCondition = fc.oneof(
  booleanVariable,
  comparisonExpr,
  propertyAccessVariable
)

// =============================================================================
// Logical Operators
// =============================================================================

/** Negated condition */
export const negatedCondition = anyCondition.map(cond => `not ${cond}`)

/** AND condition */
export const andCondition = fc.record({
  left: anyCondition,
  right: anyCondition
}).map(({ left, right }) => `${left} and ${right}`)

/** OR condition */
export const orCondition = fc.record({
  left: anyCondition,
  right: anyCondition
}).map(({ left, right }) => `${left} or ${right}`)

/** Complex condition with operators */
export const complexCondition = fc.oneof(
  anyCondition,
  negatedCondition,
  andCondition,
  orCondition
)

// =============================================================================
// Block Conditionals
// =============================================================================

/** Simple if block */
export const simpleIfBlock = fc.record({
  condition: anyCondition,
  component: componentName,
  text: fc.option(shortLabel, { nil: undefined })
}).map(({ condition, component, text }) => {
  const content = text ? `"${text}"` : ''
  return `if ${condition}\n  ${component} ${content}`.trim()
})

/** If/else block */
export const ifElseBlock = fc.record({
  condition: anyCondition,
  ifComponent: componentName,
  ifText: shortLabel,
  elseComponent: componentName,
  elseText: shortLabel
}).map(({ condition, ifComponent, ifText, elseComponent, elseText }) =>
  `if ${condition}\n  ${ifComponent} "${ifText}"\nelse\n  ${elseComponent} "${elseText}"`
)

/** If block with multiple children */
export const ifBlockMultipleChildren = fc.record({
  condition: anyCondition,
  childCount: fc.integer({ min: 2, max: 4 })
}).chain(({ condition, childCount }) =>
  fc.array(componentName, { minLength: childCount, maxLength: childCount })
    .map(components => {
      let code = `if ${condition}\n`
      components.forEach((c, i) => {
        code += `  ${c} "Item ${i + 1}"\n`
      })
      return code.trimEnd()
    })
)

/** Nested if blocks */
export const nestedIfBlocks = fc.record({
  outerCondition: booleanVariable,
  innerCondition: booleanVariable,
  component: componentName
}).map(({ outerCondition, innerCondition, component }) =>
  `if ${outerCondition}\n  if ${innerCondition}\n    ${component} "Nested"`
)

// =============================================================================
// Inline (Property) Conditionals
// =============================================================================

/** Simple inline if/then */
export const simpleInlineConditional = fc.record({
  condition: booleanVariable,
  property: fc.constantFrom('bg', 'col', 'opacity'),
  value: hexColor
}).map(({ condition, property, value }) =>
  `if ${condition} then ${property} ${value}`
)

/** Inline if/then/else */
export const inlineIfThenElse = fc.record({
  condition: booleanVariable,
  property: fc.constantFrom('bg', 'col', 'opacity', 'hidden', 'visible'),
  ifValue: fc.oneof(hexColor, smallPixelValue.map(String)),
  elseValue: fc.oneof(hexColor, smallPixelValue.map(String))
}).map(({ condition, property, ifValue, elseValue }) =>
  `if ${condition} then ${property} ${ifValue} else ${property} ${elseValue}`
)

/** Inline conditional for icon */
export const inlineIconConditional = fc.record({
  condition: booleanVariable,
  ifIcon: iconName,
  elseIcon: iconName
}).map(({ condition, ifIcon, elseIcon }) =>
  `if ${condition} then "${ifIcon}" else "${elseIcon}"`
)

/** Component with inline conditional */
export const componentWithInlineConditional = fc.record({
  component: componentName,
  condition: booleanVariable,
  property: fc.constantFrom('bg', 'col'),
  ifValue: hexColor,
  elseValue: hexColor
}).map(({ component, condition, property, ifValue, elseValue }) =>
  `${component} if ${condition} then ${property} ${ifValue} else ${property} ${elseValue}`
)

// =============================================================================
// Common Patterns
// =============================================================================

/** Login state conditional */
export const loginConditional = fc.record({
  loggedInComponent: fc.constantFrom('Avatar', 'UserMenu', 'Profile'),
  loggedOutComponent: fc.constantFrom('Button', 'Link')
}).map(({ loggedInComponent, loggedOutComponent }) =>
  `if $isLoggedIn\n  ${loggedInComponent} "User"\nelse\n  ${loggedOutComponent} "Login"`
)

/** Loading state conditional */
export const loadingConditional = fc.record({
  loadingComponent: fc.constantFrom('Spinner', 'Skeleton', 'Loading'),
  contentComponent: componentName
}).map(({ loadingComponent, contentComponent }) =>
  `if $isLoading\n  ${loadingComponent}\nelse\n  ${contentComponent} "Content"`
)

/** Empty state conditional */
export const emptyStateConditional = fc.record({
  emptyMessage: shortLabel,
  contentComponent: componentName
}).map(({ emptyMessage, contentComponent }) =>
  `if $items.length == 0\n  Text "${emptyMessage}"\nelse\n  ${contentComponent}`
)

/** Error state conditional */
export const errorConditional = fc.record({
  errorMessage: shortLabel
}).map(({ errorMessage }) =>
  `if $hasError\n  Alert col #EF4444, "${errorMessage}"\nelse\n  Content "Success"`
)

/** Dark mode conditional */
export const darkModeConditional = fc.record({
  lightBg: hexColor,
  darkBg: hexColor
}).map(({ lightBg, darkBg }) =>
  `Box if $isDark then bg ${darkBg} else bg ${lightBg}`
)

// =============================================================================
// Combined Generators
// =============================================================================

/** Any block conditional */
export const anyBlockConditional = fc.oneof(
  simpleIfBlock,
  ifElseBlock,
  ifBlockMultipleChildren,
  nestedIfBlocks
)

/** Any inline conditional */
export const anyInlineConditional = fc.oneof(
  simpleInlineConditional,
  inlineIfThenElse,
  inlineIconConditional,
  componentWithInlineConditional
)

/** Any conditional */
export const anyConditional = fc.oneof(
  anyBlockConditional,
  anyInlineConditional
)

/** Real-world conditional patterns */
export const realWorldConditional = fc.oneof(
  loginConditional,
  loadingConditional,
  emptyStateConditional,
  errorConditional,
  darkModeConditional
)
