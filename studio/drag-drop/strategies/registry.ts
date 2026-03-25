/**
 * Strategy Registry
 *
 * Manages drop strategies and finds the appropriate one for a target.
 */

import type { DropTarget } from '../types'
import type { DropStrategy, StrategyRegistry as IStrategyRegistry } from './types'

export class StrategyRegistry implements IStrategyRegistry {
  private strategies: DropStrategy[] = []

  /**
   * Register a strategy
   * Strategies are checked in order of registration
   */
  register(strategy: DropStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * Find first matching strategy for target
   */
  findStrategy(target: DropTarget): DropStrategy | null {
    for (const strategy of this.strategies) {
      if (strategy.matches(target)) {
        return strategy
      }
    }
    return null
  }

  /**
   * Get all registered strategies
   */
  getAll(): DropStrategy[] {
    return [...this.strategies]
  }

  /**
   * Clear all strategies
   */
  clear(): void {
    this.strategies = []
  }
}

/**
 * Create a pre-configured registry with all standard strategies
 */
export function createDefaultRegistry(): StrategyRegistry {
  // Import strategies lazily to avoid circular dependencies
  const { FlexWithChildrenStrategy } = require('./flex-with-children')
  const { EmptyFlexStrategy } = require('./empty-flex')
  const { PositionedStrategy } = require('./positioned')
  const { NonContainerStrategy } = require('./non-container')

  const registry = new StrategyRegistry()

  // Order matters: more specific strategies first
  registry.register(new PositionedStrategy())
  registry.register(new FlexWithChildrenStrategy())
  registry.register(new EmptyFlexStrategy())
  registry.register(new NonContainerStrategy())

  return registry
}
