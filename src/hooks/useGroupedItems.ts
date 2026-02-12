/**
 * useGroupedItems Hook
 *
 * Groups items by category and assigns stable flat indices.
 * Used for keyboard navigation in grouped picker lists.
 */

import { useMemo } from 'react'

export interface GroupedItems<T> {
  category: string
  items: Array<T & { flatIndex: number }>
}

export interface UseGroupedItemsConfig<T> {
  /** Items to group */
  items: T[]
  /** Function to get the category of an item */
  getCategory: (item: T) => string
  /** Ordered list of categories (items are grouped in this order) */
  categories: string[]
}

export interface UseGroupedItemsReturn<T> {
  /** Items grouped by category with flatIndex */
  groupedItems: GroupedItems<T>[]
  /** Total count of items across all groups */
  totalCount: number
}

/**
 * Groups items by category and assigns flat indices for keyboard navigation.
 *
 * @example
 * ```tsx
 * const { groupedItems } = useGroupedItems({
 *   items: filteredFonts,
 *   getCategory: (font) => font.category,
 *   categories: ['Sans-Serif', 'Serif', 'Monospace'],
 * })
 * ```
 */
export function useGroupedItems<T>({
  items,
  getCategory,
  categories,
}: UseGroupedItemsConfig<T>): UseGroupedItemsReturn<T> {
  const groupedItems = useMemo(() => {
    const result: GroupedItems<T>[] = []
    let flatIndex = 0

    for (const category of categories) {
      const categoryItems = items.filter(item => getCategory(item) === category)
      if (categoryItems.length > 0) {
        result.push({
          category,
          items: categoryItems.map(item => ({ ...item, flatIndex: flatIndex++ })),
        })
      }
    }

    return result
  }, [items, getCategory, categories])

  const totalCount = useMemo(
    () => groupedItems.reduce((sum, group) => sum + group.items.length, 0),
    [groupedItems]
  )

  return { groupedItems, totalCount }
}
