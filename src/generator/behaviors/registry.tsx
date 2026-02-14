/**
 * Behavior Registry Provider
 *
 * Provides behavior registry context for state management.
 */

import { useState, useCallback, useMemo } from 'react'
import { BehaviorRegistryContext } from './behavior-context'

// Provider component
export function BehaviorRegistryProvider({ children }: { children: React.ReactNode }) {
  const [states, setStates] = useState<Map<string, string>>(() => new Map())
  const [highlightedItems, setHighlightedItems] = useState<Map<string, string>>(() => new Map())
  const [selectedItems, setSelectedItems] = useState<Map<string, string>>(() => new Map())
  // Multi-item selection (for Rating pattern)
  const [highlightedItemSets, setHighlightedItemSets] = useState<Map<string, Set<string>>>(() => new Map())
  const [selectedItemSets, setSelectedItemSets] = useState<Map<string, Set<string>>>(() => new Map())
  const [filterQueries, setFilterQueries] = useState<Map<string, string>>(() => new Map())
  const [containerItems, setContainerItems] = useState<Map<string, string[]>>(() => new Map())

  const setState = useCallback((id: string, state: string) => {
    setStates(prev => {
      const next = new Map(prev)
      next.set(id, state)
      return next
    })
  }, [])

  const toggle = useCallback((id: string, availableStates: string[]) => {
    if (availableStates.length < 2) return

    setStates(prev => {
      const currentState = prev.get(id)
      const next = new Map(prev)

      // If no state set yet, set to 'open' (second state)
      // This handles hidden elements: first toggle shows them
      // For visible elements: first toggle marks them as "toggled on" (no visual change)
      if (currentState === undefined) {
        next.set(id, availableStates[1]) // 'open'
      } else {
        // Toggle between states
        const currentIndex = availableStates.indexOf(currentState)
        const nextIndex = (currentIndex + 1) % availableStates.length
        next.set(id, availableStates[nextIndex])
      }

      return next
    })
  }, [])

  // Behavior: Highlight an item in a container
  const highlight = useCallback((itemId: string, containerId: string) => {
    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, itemId)
      return next
    })
  }, [])

  // Behavior: Highlight next item in container
  const highlightNext = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    if (items.length === 0) return

    const currentHighlighted = highlightedItems.get(containerId)
    const currentIndex = currentHighlighted ? items.indexOf(currentHighlighted) : -1
    const nextIndex = Math.min(currentIndex + 1, items.length - 1)

    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, items[nextIndex])
      return next
    })
  }, [containerItems, highlightedItems])

  // Behavior: Highlight previous item in container
  const highlightPrev = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    if (items.length === 0) return

    const currentHighlighted = highlightedItems.get(containerId)
    const currentIndex = currentHighlighted ? items.indexOf(currentHighlighted) : items.length
    const prevIndex = Math.max(currentIndex - 1, 0)

    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, items[prevIndex])
      return next
    })
  }, [containerItems, highlightedItems])

  // Behavior: Highlight first item in container
  const highlightFirst = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    if (items.length === 0) return

    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, items[0])
      return next
    })
  }, [containerItems])

  // Behavior: Highlight last item in container
  const highlightLast = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    if (items.length === 0) return

    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, items[items.length - 1])
      return next
    })
  }, [containerItems])

  // Behavior: Select an item in a container
  const select = useCallback((itemId: string, containerId: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      next.set(containerId, itemId)
      return next
    })
  }, [])

  // Behavior: Select the currently highlighted item
  const selectHighlighted = useCallback((containerId: string) => {
    const highlightedId = highlightedItems.get(containerId)
    if (highlightedId) {
      setSelectedItems(prev => {
        const next = new Map(prev)
        next.set(containerId, highlightedId)
        return next
      })
    }
  }, [highlightedItems])

  // Behavior: Highlight self and all items before (Rating pattern)
  const highlightSelfAndBefore = useCallback((itemId: string, containerId: string) => {
    const items = containerItems.get(containerId) || []
    const itemIndex = items.indexOf(itemId)
    if (itemIndex === -1) return

    const itemsToHighlight = new Set(items.slice(0, itemIndex + 1))
    setHighlightedItemSets(prev => {
      const next = new Map(prev)
      next.set(containerId, itemsToHighlight)
      return next
    })
  }, [containerItems])

  // Behavior: Highlight all items in container
  const highlightAll = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    setHighlightedItemSets(prev => {
      const next = new Map(prev)
      next.set(containerId, new Set(items))
      return next
    })
  }, [containerItems])

  // Behavior: Clear all highlights in container
  const highlightNone = useCallback((containerId: string) => {
    setHighlightedItems(prev => {
      const next = new Map(prev)
      next.delete(containerId)
      return next
    })
    setHighlightedItemSets(prev => {
      const next = new Map(prev)
      next.delete(containerId)
      return next
    })
  }, [])

  // Behavior: Select self and all items before (Rating pattern)
  const selectSelfAndBefore = useCallback((itemId: string, containerId: string) => {
    const items = containerItems.get(containerId) || []
    const itemIndex = items.indexOf(itemId)
    if (itemIndex === -1) return

    const itemsToSelect = new Set(items.slice(0, itemIndex + 1))
    setSelectedItemSets(prev => {
      const next = new Map(prev)
      next.set(containerId, itemsToSelect)
      return next
    })
  }, [containerItems])

  // Behavior: Select all items in container
  const selectAll = useCallback((containerId: string) => {
    const items = containerItems.get(containerId) || []
    setSelectedItemSets(prev => {
      const next = new Map(prev)
      next.set(containerId, new Set(items))
      return next
    })
  }, [containerItems])

  // Behavior: Clear all selections in container
  const selectNone = useCallback((containerId: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      next.delete(containerId)
      return next
    })
    setSelectedItemSets(prev => {
      const next = new Map(prev)
      next.delete(containerId)
      return next
    })
  }, [])

  // Behavior: Filter items in a container
  const filter = useCallback((containerId: string, query: string) => {
    setFilterQueries(prev => {
      const next = new Map(prev)
      next.set(containerId, query)
      return next
    })
  }, [])

  // Register an item as belonging to a container
  const registerContainerItem = useCallback((containerId: string, itemId: string) => {
    setContainerItems(prev => {
      const items = prev.get(containerId) || []
      // Return same reference if item already registered (prevents re-renders)
      if (items.includes(itemId)) {
        return prev
      }
      const next = new Map(prev)
      next.set(containerId, [...items, itemId])
      return next
    })
  }, [])

  // Unregister an item from a container (for cleanup on unmount)
  const unregisterContainerItem = useCallback((containerId: string, itemId: string) => {
    setContainerItems(prev => {
      const items = prev.get(containerId)
      if (!items) return prev
      const filtered = items.filter(id => id !== itemId)
      const next = new Map(prev)
      if (filtered.length === 0) {
        next.delete(containerId)
      } else {
        next.set(containerId, filtered)
      }
      return next
    })
  }, [])

  // Deactivate all siblings (other items in same container except self)
  const deactivateSiblings = useCallback((itemId: string, containerId: string) => {
    const items = containerItems.get(containerId) || []

    setStates(prev => {
      const next = new Map(prev)
      for (const id of items) {
        if (id !== itemId) {
          next.set(id, 'inactive')
        }
      }
      return next
    })
  }, [containerItems])

  const value = useMemo(() => ({
    states,
    setState,
    toggle,
    highlightedItems,
    selectedItems,
    highlightedItemSets,
    selectedItemSets,
    filterQueries,
    containerItems,
    highlight,
    highlightNext,
    highlightPrev,
    highlightFirst,
    highlightLast,
    highlightSelfAndBefore,
    highlightAll,
    highlightNone,
    select,
    selectHighlighted,
    selectSelfAndBefore,
    selectAll,
    selectNone,
    filter,
    registerContainerItem,
    unregisterContainerItem,
    deactivateSiblings
  }), [states, setState, toggle, highlightedItems, selectedItems, highlightedItemSets, selectedItemSets, filterQueries, containerItems,
      highlight, highlightNext, highlightPrev, highlightFirst, highlightLast, highlightSelfAndBefore, highlightAll, highlightNone,
      select, selectHighlighted, selectSelfAndBefore, selectAll, selectNone, filter, registerContainerItem, unregisterContainerItem, deactivateSiblings])

  return (
    <BehaviorRegistryContext.Provider value={value}>
      {children}
    </BehaviorRegistryContext.Provider>
  )
}
