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
 * Create a Webflow-style registry
 *
 * No absolute positioning, no 9-zone system.
 * Just: insert between siblings OR insert inside container.
 */
export function createWebflowRegistry(): StrategyRegistry {
  const { FlexWithChildrenStrategy } = require('./flex-with-children')
  const { SimpleInsideStrategy } = require('./simple-inside')
  const { NonContainerStrategy } = require('./non-container')

  const registry = new StrategyRegistry()

  // Order matters:
  // 1. FlexWithChildren - containers with children (insert between siblings)
  // 2. SimpleInside - empty containers (insert as child)
  // 3. NonContainer - leaf elements (insert before/after as sibling)
  registry.register(new FlexWithChildrenStrategy())
  registry.register(new SimpleInsideStrategy())
  registry.register(new NonContainerStrategy())

  return registry
}
