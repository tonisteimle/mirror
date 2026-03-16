/**
 * Drop Strategy Registry
 *
 * Manages registration and selection of layout-specific drop strategies.
 * Strategies are checked in order - first match wins.
 */

import type { LayoutDropStrategy, DropStrategyRegistry, LayoutType } from './types'
import { FlexDropStrategy } from './flex-strategy'
import { AbsoluteDropStrategy } from './absolute-strategy'

/**
 * Default strategy registry implementation
 */
class DropStrategyRegistryImpl implements DropStrategyRegistry {
  private strategies: LayoutDropStrategy[] = []

  /**
   * Register a strategy
   * Strategies are checked in registration order
   */
  register(strategy: LayoutDropStrategy): void {
    // Prevent duplicate registration
    const existing = this.strategies.findIndex(s => s.type === strategy.type)
    if (existing >= 0) {
      this.strategies[existing] = strategy
    } else {
      this.strategies.push(strategy)
    }
  }

  /**
   * Get strategy for an element
   * Returns first matching strategy
   */
  getStrategy(element: HTMLElement): LayoutDropStrategy | null {
    for (const strategy of this.strategies) {
      if (strategy.matches(element)) {
        return strategy
      }
    }
    return null
  }

  /**
   * Get strategy by type
   */
  getStrategyByType(type: LayoutType): LayoutDropStrategy | null {
    return this.strategies.find(s => s.type === type) || null
  }

  /**
   * Get all registered strategies
   */
  getAll(): LayoutDropStrategy[] {
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
 * Create a registry with default strategies
 *
 * Order matters:
 * 1. Absolute - checked first (specific layout marker)
 * 2. Flex - fallback (most common, includes block)
 */
export function createDefaultRegistry(): DropStrategyRegistry {
  const registry = new DropStrategyRegistryImpl()

  // Register in priority order
  registry.register(new AbsoluteDropStrategy())
  registry.register(new FlexDropStrategy())

  return registry
}

/**
 * Create an empty registry
 */
export function createRegistry(): DropStrategyRegistry {
  return new DropStrategyRegistryImpl()
}

/**
 * Singleton default registry
 */
let defaultRegistry: DropStrategyRegistry | null = null

/**
 * Get the default registry (singleton)
 */
export function getDefaultRegistry(): DropStrategyRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultRegistry()
  }
  return defaultRegistry
}

/**
 * Reset the default registry (for testing)
 */
export function resetDefaultRegistry(): void {
  defaultRegistry = null
}
