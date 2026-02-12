/**
 * usePickerFilter Hook
 *
 * Unified filtering logic for picker components.
 * Provides case-insensitive search across multiple fields.
 */

import { useMemo, useCallback } from 'react'

export interface UsePickerFilterOptions<T> {
  /** Items to filter */
  items: T[]
  /** Current search query */
  query: string
  /** Function to extract searchable fields from an item */
  getSearchableFields: (item: T) => (string | undefined | null)[]
}

export interface UsePickerFilterResult<T> {
  /** Filtered items based on query */
  filteredItems: T[]
  /** Whether there are any results */
  hasResults: boolean
  /** Whether a search is active (query is not empty) */
  isSearching: boolean
}

/**
 * Hook for filtering picker items by search query.
 *
 * @example
 * ```tsx
 * const { filteredItems } = usePickerFilter({
 *   items: allFonts,
 *   query: searchQuery,
 *   getSearchableFields: (font) => [font.name, font.value, font.preview]
 * })
 * ```
 */
export function usePickerFilter<T>({
  items,
  query,
  getSearchableFields,
}: UsePickerFilterOptions<T>): UsePickerFilterResult<T> {
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items

    const queryLower = query.toLowerCase().trim()
    return items.filter(item => {
      const fields = getSearchableFields(item)
      return fields.some(
        field => field && field.toLowerCase().includes(queryLower)
      )
    })
  }, [items, query, getSearchableFields])

  return {
    filteredItems,
    hasResults: filteredItems.length > 0,
    isSearching: query.trim().length > 0,
  }
}

/**
 * Helper to create a stable getSearchableFields function.
 * Use this when passing keys to search on.
 *
 * @example
 * ```tsx
 * const getSearchableFields = useSearchableFields<Font>(['name', 'value'])
 * ```
 */
export function useSearchableFields<T extends Record<string, unknown>>(
  keys: (keyof T)[]
): (item: T) => (string | undefined | null)[] {
  return useCallback(
    (item: T) => keys.map(key => {
      const value = item[key]
      return typeof value === 'string' ? value : null
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...keys]
  )
}
