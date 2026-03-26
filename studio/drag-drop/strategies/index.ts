/**
 * Strategies Module
 *
 * Webflow-style drop strategies and registry.
 */

// Types
export type { DropStrategy, ChildRect, StrategyRegistry } from './types'

// Strategies
export { FlexWithChildrenStrategy, calculateInsertionLineRect } from './flex-with-children'
export { NonContainerStrategy } from './non-container'
export { SimpleInsideStrategy } from './simple-inside'

// Registry
export { StrategyRegistry, createWebflowRegistry } from './registry'
