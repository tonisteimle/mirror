/**
 * Iterator Arbitraries for Mirror DSL
 *
 * Generates random each loops and data binding patterns.
 */

import * as fc from 'fast-check'
import {
  componentName,
  anyComponentName,
  hexColor,
  smallPixelValue,
  shortLabel,
  iconName
} from './primitives'

// =============================================================================
// Collection Variables
// =============================================================================

/** Collection variable names */
export const collectionVariable = fc.constantFrom(
  '$items', '$tasks', '$users', '$posts', '$products',
  '$messages', '$notifications', '$comments', '$orders', '$files'
)

/** Iterator variable names */
export const iteratorVariable = fc.constantFrom(
  '$item', '$task', '$user', '$post', '$product',
  '$message', '$notification', '$comment', '$order', '$file'
)

/** Property access on iterator */
export const iteratorPropertyAccess = fc.record({
  iterator: fc.constantFrom('$item', '$task', '$user', '$post'),
  property: fc.constantFrom('title', 'name', 'label', 'text', 'value', 'id', 'done', 'active')
}).map(({ iterator, property }) => `${iterator}.${property}`)

// =============================================================================
// Each Loop Generators
// =============================================================================

/** Simple each loop */
export const simpleEachLoop = fc.record({
  iterator: iteratorVariable,
  collection: collectionVariable,
  component: componentName,
  property: fc.constantFrom('title', 'name', 'label')
}).map(({ iterator, collection, component, property }) =>
  `each ${iterator} in ${collection}\n  ${component} ${iterator}.${property}`
)

/** Each loop with multiple properties */
export const eachLoopMultipleProps = fc.record({
  iterator: iteratorVariable,
  collection: collectionVariable
}).map(({ iterator, collection }) =>
  `each ${iterator} in ${collection}\n  Card pad 12\n    Title ${iterator}.title\n    Description ${iterator}.description`
)

/** Each loop with conditional */
export const eachLoopWithConditional = fc.record({
  iterator: iteratorVariable,
  collection: collectionVariable,
  condition: fc.constantFrom('done', 'active', 'published', 'visible')
}).map(({ iterator, collection, condition }) =>
  `each ${iterator} in ${collection}\n  Item if ${iterator}.${condition} then bg #22C55E else bg #333\n    Text ${iterator}.name`
)

/** Nested each loops */
export const nestedEachLoops = fc.record({
  outerIterator: fc.constant('$category'),
  outerCollection: fc.constant('$categories'),
  innerIterator: fc.constant('$item'),
  innerCollection: fc.constant('$category.items')
}).map(({ outerIterator, outerCollection, innerIterator, innerCollection }) =>
  `each ${outerIterator} in ${outerCollection}\n  Section\n    Title ${outerIterator}.name\n    each ${innerIterator} in ${innerCollection}\n      Item ${innerIterator}.name`
)

// =============================================================================
// Data Binding
// =============================================================================

/** Simple data binding */
export const simpleDataBinding = fc.record({
  component: componentName,
  collection: fc.constantFrom('Tasks', 'Users', 'Posts', 'Items', 'Products')
}).map(({ component, collection }) =>
  `${component} data ${collection}`
)

/** Data binding with filter (where clause) */
export const dataBindingWithFilter = fc.record({
  component: componentName,
  collection: fc.constantFrom('Tasks', 'Posts', 'Items'),
  field: fc.constantFrom('done', 'active', 'published', 'visible'),
  value: fc.constantFrom('true', 'false')
}).map(({ component, collection, field, value }) =>
  `${component} data ${collection} where ${field} == ${value}`
)

/** Data binding with complex filter */
export const dataBindingComplexFilter = fc.record({
  component: componentName,
  collection: fc.constantFrom('Products', 'Orders'),
  field1: fc.constantFrom('price', 'quantity', 'rating'),
  operator: fc.constantFrom('>', '<', '>=', '<='),
  value: fc.integer({ min: 0, max: 100 })
}).map(({ component, collection, field1, operator, value }) =>
  `${component} data ${collection} where ${field1} ${operator} ${value}`
)

// =============================================================================
// Master-Detail Pattern
// =============================================================================

/** Master-detail pattern */
export const masterDetailPattern = fc.record({
  collection: collectionVariable,
  iterator: iteratorVariable,
  selectedVar: fc.constant('$selected')
}).map(({ collection, iterator, selectedVar }) =>
  `${selectedVar}: null\n\nMaster data ${collection.replace('$', '')}\n  Item onclick assign ${selectedVar} to ${iterator}\n    Text ${iterator}.title\n\nDetail if ${selectedVar}\n  Title ${selectedVar}.title\n  Description ${selectedVar}.description`
)

/** Simple master-detail */
export const simpleMasterDetail = fc.record({
  items: fc.constantFrom('Tasks', 'Users', 'Posts')
}).map(({ items }) =>
  `$selected: null\n\nList data ${items}\n  Item onclick assign $selected to $item\n    Text $item.name\n\nDetail if $selected\n  Text $selected.description`
)

// =============================================================================
// List Patterns
// =============================================================================

/** Todo list pattern */
export const todoListPattern = fc.constant(
  `$tasks: [{ title: "Task 1", done: false }, { title: "Task 2", done: true }]

each $task in $tasks
  Item hor, pad 8, gap 12
    Icon if $task.done then "check" else "circle"
    Text $task.title`
)

/** Navigation menu pattern */
export const navMenuPattern = fc.record({
  items: fc.array(
    fc.record({
      icon: iconName,
      label: shortLabel
    }),
    { minLength: 3, maxLength: 6 }
  )
}).map(({ items }) => {
  const itemsJson = items.map(i => `{ icon: "${i.icon}", label: "${i.label}" }`)
  return `$navItems: [${itemsJson.join(', ')}]

Nav ver, gap 4
  each $item in $navItems
    NavItem hor, pad 12, gap 8
      Icon $item.icon
      Text $item.label`
})

/** Card grid pattern */
export const cardGridPattern = fc.record({
  columns: fc.constantFrom(2, 3, 4)
}).map(({ columns }) =>
  `$cards: [{ title: "Card 1" }, { title: "Card 2" }, { title: "Card 3" }]

Grid grid ${columns}, gap 16
  each $card in $cards
    Card pad 16, bg #333, rad 8
      Title $card.title`
)

/** Table rows pattern */
export const tableRowsPattern = fc.constant(
  `$rows: [{ name: "Alice", email: "alice@example.com" }, { name: "Bob", email: "bob@example.com" }]

Table
  each $row in $rows
    TableRow hor, pad 12, gap 24
      Cell $row.name
      Cell $row.email`
)

// =============================================================================
// Index-based Iteration
// =============================================================================

/** Each with index */
export const eachWithIndex = fc.record({
  collection: collectionVariable,
  iterator: iteratorVariable
}).map(({ collection, iterator }) =>
  `each ${iterator}, $index in ${collection}\n  Item\n    Badge $index + 1\n    Text ${iterator}.name`
)

// =============================================================================
// Combined Generators
// =============================================================================

/** Any each loop */
export const anyEachLoop = fc.oneof(
  simpleEachLoop,
  eachLoopMultipleProps,
  eachLoopWithConditional
)

/** Any data binding */
export const anyDataBinding = fc.oneof(
  simpleDataBinding,
  dataBindingWithFilter,
  dataBindingComplexFilter
)

/** Any iterator pattern */
export const anyIteratorPattern = fc.oneof(
  anyEachLoop,
  anyDataBinding,
  masterDetailPattern,
  simpleMasterDetail
)

/** Real-world iterator patterns */
export const realWorldIteratorPattern = fc.oneof(
  todoListPattern,
  navMenuPattern,
  cardGridPattern,
  tableRowsPattern
)
