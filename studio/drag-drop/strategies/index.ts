/**
 * Strategies Module
 *
 * Webflow-style drop strategies and registry.
 */

// Types (exclude StrategyRegistry - exported from registry as class)
export type { DropStrategy, ChildRect, StrategyRegistry as IStrategyRegistry } from './types'

// Strategies
export { FlexWithChildrenStrategy } from './flex-with-children'
export { NonContainerStrategy } from './non-container'
export { SimpleInsideStrategy } from './simple-inside'

// Registry
export { StrategyRegistry, createWebflowRegistry } from './registry'
