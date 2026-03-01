/**
 * Property-Based Testing Arbitraries for Mirror DSL
 *
 * Barrel export for all arbitrary generators.
 */

// Primitives (basic value generators)
export * from './primitives'

// Components (definitions, instances, nesting)
export * from './components'

// Inheritance (Child: Parent patterns)
export * from './inheritance'

// States (system states, behavior states)
export * from './states'

// Events (event handlers, actions)
export * from './events'

// Conditionals (if/else blocks, inline conditionals)
export * from './conditionals'

// Iterators (each loops, data binding)
export * from './iterators'

// Animations (show/hide, continuous animations)
export * from './animations'

// Grid (grid layouts)
export * from './grid'

// Edge cases (unicode, extreme values, malformed input)
export * from './edge-cases'

// Re-export fast-check
export { fc } from 'fast-check'
