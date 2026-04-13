/**
 * Icon Data - Lucide icons for layout and common patterns
 *
 * Icon definitions are stored in icons.json for better separation.
 * This module provides the data and utility functions.
 */

import type { IconDefinition } from './types'
import iconsData from './icons.json'

// Import icons from JSON (adds empty path field for compatibility)
export const ICONS: IconDefinition[] = iconsData.map(icon => ({
  ...icon,
  path: '',
  style: icon.style as 'stroke' | 'fill',
}))

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): IconDefinition[] {
  return ICONS.filter(icon => icon.category === category)
}

/**
 * Search icons by name or tags
 */
export function searchIcons(query: string): IconDefinition[] {
  const q = query.toLowerCase()
  return ICONS.filter(
    icon =>
      icon.name.toLowerCase().includes(q) || icon.tags.some(tag => tag.toLowerCase().includes(q))
  )
}

/**
 * Get all categories with icon counts
 */
export function getCategories(): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const icon of ICONS) {
    counts.set(icon.category, (counts.get(icon.category) || 0) + 1)
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
}
