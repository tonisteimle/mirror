/**
 * usePickerWithSearch Hook
 *
 * Combined hook that provides complete picker functionality:
 * - Search state management
 * - Filtering with usePickerFilter
 * - Keyboard navigation with usePickerBehavior
 * - Reset on open behavior
 * - Selection handling
 *
 * This hook eliminates duplication across ColorPicker, FontPicker, TokenPicker.
 */

import { useState, useEffect, useCallback } from 'react'
import { usePickerBehavior, type UsePickerBehaviorConfig } from './usePickerBehavior'
import { usePickerFilter } from './usePickerFilter'
import { useDebounce } from './useDebounce'

export interface UsePickerWithSearchConfig<T> {
  /** Whether the picker is currently open */
  isOpen: boolean
  /** Callback to close the picker */
  onClose: () => void
  /** All items to display (before filtering) */
  items: T[]
  /** Function to extract searchable fields from an item */
  getSearchableFields: (item: T) => (string | undefined | null)[]
  /** Callback when an item is selected */
  onSelectItem: (item: T) => void
  /** Initial search query (optional) */
  initialQuery?: string
  /** Number of columns for grid navigation (default: 1 for list) */
  columns?: number
  /** Custom key handlers to merge with default handlers */
  customKeyHandlers?: UsePickerBehaviorConfig['customKeyHandlers']
  /** Debounce delay in ms for search (default: 0 = no debounce, recommended: 100-200 for large lists) */
  debounceMs?: number
  /** Whether to auto-focus when opened (default: true). Set to false to keep focus in editor. */
  autoFocus?: boolean
}

export interface UsePickerWithSearchReturn<T> {
  /** Current search query */
  query: string
  /** Set search query */
  setQuery: (query: string) => void
  /** Filtered items based on query */
  filteredItems: T[]
  /** Whether there are any filtered results */
  hasResults: boolean
  /** Whether a search is active */
  isSearching: boolean
  /** Currently selected index */
  selectedIndex: number
  /** Set selected index */
  setSelectedIndex: (index: number | ((prev: number) => number)) => void
  /** Ref for the list element */
  listRef: React.RefObject<HTMLDivElement | null>
  /** Ref for the input element */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Key down handler for the input/list */
  handleKeyDown: (e: React.KeyboardEvent) => void
  /** Handle item selection by index */
  handleSelect: (index: number) => void
  /** Reset selection to initial state */
  resetSelection: () => void
}

export function usePickerWithSearch<T>({
  isOpen,
  onClose,
  items,
  getSearchableFields,
  onSelectItem,
  initialQuery = '',
  columns = 1,
  customKeyHandlers,
  debounceMs = 0,
  autoFocus = true,
}: UsePickerWithSearchConfig<T>): UsePickerWithSearchReturn<T> {
  // Search state
  const [query, setQuery] = useState(initialQuery)

  // Debounce query if configured (for large lists)
  const debouncedQuery = useDebounce(query, debounceMs)
  const effectiveQuery = debounceMs > 0 ? debouncedQuery : query

  // Filter items using the unified filter hook
  const { filteredItems, hasResults, isSearching } = usePickerFilter({
    items,
    query: effectiveQuery,
    getSearchableFields,
  })

  // Handle selection
  const handleSelectByIndex = useCallback(
    (index: number) => {
      const item = filteredItems[index]
      if (item) {
        onSelectItem(item)
        onClose()
      }
    },
    [filteredItems, onSelectItem, onClose]
  )

  // Picker behavior (keyboard navigation, focus management)
  const {
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    resetSelection,
  } = usePickerBehavior({
    isOpen,
    onClose,
    itemCount: filteredItems.length,
    columns,
    onSelect: handleSelectByIndex,
    customKeyHandlers,
    autoFocus,
  })

  // Sync query with external initialQuery (for inline editing where focus stays in editor)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // Reset selection when query changes
  useEffect(() => {
    resetSelection()
  }, [query, resetSelection])

  return {
    query,
    setQuery,
    filteredItems,
    hasResults,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    handleSelect: handleSelectByIndex,
    resetSelection,
  }
}

/**
 * Simplified version for pickers that don't need search.
 * Just provides navigation and selection.
 */
export function usePickerNavigation<T>({
  isOpen,
  onClose,
  items,
  onSelectItem,
  columns = 1,
  customKeyHandlers,
}: Omit<UsePickerWithSearchConfig<T>, 'getSearchableFields' | 'initialQuery'>) {
  const handleSelectByIndex = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) {
        onSelectItem(item)
        onClose()
      }
    },
    [items, onSelectItem, onClose]
  )

  const {
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    resetSelection,
  } = usePickerBehavior({
    isOpen,
    onClose,
    itemCount: items.length,
    columns,
    onSelect: handleSelectByIndex,
    customKeyHandlers,
  })

  return {
    items,
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    handleSelect: handleSelectByIndex,
    resetSelection,
  }
}
