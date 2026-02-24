/**
 * Behavior Registry Hooks
 *
 * Hooks for accessing the behavior registry.
 * Separated from provider to avoid react-refresh issues.
 */

import { useContext } from 'react'
import type { BehaviorRegistry } from './index'
import { BehaviorRegistryContext } from './behavior-context'
import { getBehaviorHandler } from './behavior-handlers'

/**
 * Hook to use the behavior registry.
 */
export function useBehaviorRegistry(): BehaviorRegistry {
  const context = useContext(BehaviorRegistryContext)

  const emptySet = new Set<string>()

  if (!context) {
    // Return a no-op registry if not in provider
    return {
      getHandler: getBehaviorHandler,
      getState: () => undefined,
      setState: () => {},
      toggle: () => {},
      highlight: () => {},
      highlightNext: () => {},
      highlightPrev: () => {},
      highlightFirst: () => {},
      highlightLast: () => {},
      highlightSelfAndBefore: () => {},
      highlightAll: () => {},
      highlightNone: () => {},
      select: () => {},
      selectHighlighted: () => {},
      selectSelfAndBefore: () => {},
      selectAll: () => {},
      selectNone: () => {},
      filter: () => {},
      deactivateSiblings: () => {},
      getHighlightedItem: () => null,
      getSelectedItem: () => null,
      getHighlightedItems: () => emptySet,
      getSelectedItems: () => emptySet,
      isItemHighlighted: () => false,
      isItemSelected: () => false,
      getFilterQuery: () => '',
      registerContainerItem: () => {},
      unregisterContainerItem: () => {}
    }
  }

  return {
    getHandler: getBehaviorHandler,
    getState: (id: string) => context.states.get(id),
    setState: context.setState,
    toggle: (id: string) => context.toggle(id, ['closed', 'open']),
    highlight: context.highlight,
    highlightNext: context.highlightNext,
    highlightPrev: context.highlightPrev,
    highlightFirst: context.highlightFirst,
    highlightLast: context.highlightLast,
    highlightSelfAndBefore: context.highlightSelfAndBefore,
    highlightAll: context.highlightAll,
    highlightNone: context.highlightNone,
    select: context.select,
    selectHighlighted: context.selectHighlighted,
    selectSelfAndBefore: context.selectSelfAndBefore,
    selectAll: context.selectAll,
    selectNone: context.selectNone,
    filter: context.filter,
    getHighlightedItem: (containerId: string) => context.highlightedItems.get(containerId) || null,
    getSelectedItem: (containerId: string) => context.selectedItems.get(containerId) || null,
    getHighlightedItems: (containerId: string) => context.highlightedItemSets.get(containerId) || emptySet,
    getSelectedItems: (containerId: string) => context.selectedItemSets.get(containerId) || emptySet,
    isItemHighlighted: (itemId: string, containerId: string) => {
      const singleHighlight = context.highlightedItems.get(containerId) === itemId
      const multiHighlight = context.highlightedItemSets.get(containerId)?.has(itemId) || false
      return singleHighlight || multiHighlight
    },
    isItemSelected: (itemId: string, containerId: string) => {
      const singleSelect = context.selectedItems.get(containerId) === itemId
      const multiSelect = context.selectedItemSets.get(containerId)?.has(itemId) || false
      return singleSelect || multiSelect
    },
    getFilterQuery: (containerId: string) => context.filterQueries.get(containerId) || '',
    registerContainerItem: context.registerContainerItem,
    unregisterContainerItem: context.unregisterContainerItem,
    deactivateSiblings: context.deactivateSiblings
  }
}
