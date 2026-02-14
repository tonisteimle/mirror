/**
 * Behavior Registry Context
 *
 * Context definition for behavior registry state.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext } from 'react'

// Context for behavior registry state
export interface BehaviorRegistryState {
  states: Map<string, string>
  setState: (id: string, state: string) => void
  toggle: (id: string, availableStates: string[]) => void
  // Behavior state maps
  highlightedItems: Map<string, string>  // containerId -> itemId (single selection)
  selectedItems: Map<string, string>      // containerId -> itemId (single selection)
  highlightedItemSets: Map<string, Set<string>>  // containerId -> Set of itemIds (multi-selection for Rating)
  selectedItemSets: Map<string, Set<string>>      // containerId -> Set of itemIds (multi-selection for Rating)
  filterQueries: Map<string, string>      // containerId -> query
  containerItems: Map<string, string[]>   // containerId -> list of itemIds
  // Behavior actions
  highlight: (itemId: string, containerId: string) => void
  highlightNext: (containerId: string) => void
  highlightPrev: (containerId: string) => void
  highlightFirst: (containerId: string) => void
  highlightLast: (containerId: string) => void
  highlightSelfAndBefore: (itemId: string, containerId: string) => void
  highlightAll: (containerId: string) => void
  highlightNone: (containerId: string) => void
  select: (itemId: string, containerId: string) => void
  selectHighlighted: (containerId: string) => void
  selectSelfAndBefore: (itemId: string, containerId: string) => void
  selectAll: (containerId: string) => void
  selectNone: (containerId: string) => void
  filter: (containerId: string, query: string) => void
  registerContainerItem: (containerId: string, itemId: string) => void
  unregisterContainerItem: (containerId: string, itemId: string) => void
  deactivateSiblings: (itemId: string, containerId: string) => void
}

export const BehaviorRegistryContext = createContext<BehaviorRegistryState | null>(null)
