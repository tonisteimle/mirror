/**
 * Icon Picker Types
 */

export interface IconDefinition {
  name: string
  path: string           // SVG path data (for fill-based icons)
  category: string
  tags: string[]
  viewBox?: string
  /** For stroke-based icons (like Lucide): complete SVG inner content */
  svg?: string
  /** Icon style: 'fill' (default, Material) or 'stroke' (Lucide) */
  style?: 'fill' | 'stroke'
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
