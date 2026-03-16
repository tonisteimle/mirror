/**
 * Drop Strategies Module
 *
 * Provides layout-specific drop behavior for drag-and-drop operations.
 *
 * Architecture:
 * - Each layout type (flex, absolute, grid) has its own strategy
 * - Strategies implement LayoutDropStrategy interface
 * - Registry manages strategy selection based on element type
 * - DropZoneCalculator uses registry to delegate to appropriate strategy
 *
 * Usage:
 * ```typescript
 * import { getDefaultRegistry } from './drop-strategies'
 *
 * const registry = getDefaultRegistry()
 * const strategy = registry.getStrategy(element)
 * if (strategy) {
 *   const result = strategy.calculateDropZone(element, context)
 * }
 * ```
 */

// Types
export type {
  LayoutType,
  DropContext,
  StrategyDropResult,
  FlexDropResult,
  AbsoluteDropResult,
  GridDropResult,
  LayoutDropResult,
  IndicatorConfig,
  LayoutDropStrategy,
  DropStrategyRegistry,
} from './types'

// Strategies
export {
  FlexDropStrategy,
  createFlexDropStrategy,
} from './flex-strategy'

export {
  AbsoluteDropStrategy,
  createAbsoluteDropStrategy,
  type AbsoluteStrategyOptions,
} from './absolute-strategy'

// Registry
export {
  createDefaultRegistry,
  createRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
} from './registry'
