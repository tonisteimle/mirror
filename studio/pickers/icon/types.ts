/**
 * Icon Picker Types
 */

export interface IconDefinition {
  name: string
  path: string           // SVG path data (legacy, empty for Lucide)
  category: string
  tags: string[]
  viewBox?: string
  /** SVG inner content (paths, rects, circles, etc.) */
  svg?: string
  /** Icon style: 'stroke' (Lucide default) */
  style?: 'stroke'
}

export interface IconCategory {
  name: string
  label: string
  icons: IconDefinition[]
}

// Common icon categories
export const ICON_CATEGORIES = [
  'layout',
  'navigation',
  'action',
  'content',
  'communication',
  'media',
  'social',
  'device',
  'file',
  'editor',
  'hardware',
  'image',
  'maps',
  'notification',
  'toggle',
] as const

export type IconCategoryName = typeof ICON_CATEGORIES[number]
