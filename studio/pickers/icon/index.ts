/**
 * Icon Picker — public surface (barrel)
 *
 * Supports both built-in Material icons and Lucide icons from CDN.
 * Implementation lives in picker.ts / icon-data.ts. This file is a thin re-export.
 */

export { ICONS, searchIcons, getIconsByCategory, getCategories } from './icon-data'
export type { IconDefinition, IconCategory, IconCategoryName } from './types'

export {
  IconPicker,
  createIconPicker,
  getGlobalIconPicker,
  setGlobalIconPickerCallback,
  type IconPickerConfig,
  type LucideIcon,
} from './picker'
