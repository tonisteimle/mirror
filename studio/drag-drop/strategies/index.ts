/**
 * Strategies Module
 *
 * Exports all drop strategies and the registry.
 */

// Types
export type { DropStrategy, ChildRect, StrategyRegistry } from './types'

// Strategies
export { FlexWithChildrenStrategy, calculateInsertionLineRect } from './flex-with-children'
export { EmptyFlexStrategy, detectZone, getZoneRect, zoneToDSLProperties } from './empty-flex'
export { PositionedStrategy, getDefaultComponentSize } from './positioned'
export { NonContainerStrategy } from './non-container'
export { SimpleInsideStrategy } from './simple-inside'

// Registry
export { StrategyRegistry, createDefaultRegistry, createWebflowRegistry } from './registry'
