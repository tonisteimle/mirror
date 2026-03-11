/**
 * Icon Picker Types
 */

export interface IconDefinition {
  name: string
  path: string           // SVG path data
  category: string
  tags: string[]
  viewBox?: string
}

export interface IconCategory {
  name: string
  label: string
  icons: IconDefinition[]
}

// Common icon categories
export const ICON_CATEGORIES = [
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
