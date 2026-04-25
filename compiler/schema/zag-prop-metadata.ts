/**
 * Zag Property Metadata
 *
 * Defines metadata for Zag component behavior properties.
 * Used by PropertyExtractor and UIRenderer to display
 * editable behavior controls in the Property Panel.
 *
 * Only DatePicker remains as a Zag component — all other components
 * are Pure-Mirror templates (studio/panels/components/component-templates.ts).
 */

export type ZagPropType = 'boolean' | 'string' | 'number' | 'enum'

export interface ZagPropMeta {
  type: ZagPropType
  label: string
  description: string
  options?: string[] // for enum
  default?: string | number | boolean
  min?: number // for number
  max?: number // for number
  step?: number // for number
}

/**
 * Metadata registry for all Zag component behavior properties
 */
export const ZAG_PROP_METADATA: Record<string, Record<string, ZagPropMeta>> = {
  DatePicker: {
    selectionMode: {
      type: 'enum',
      label: 'Mode',
      description: 'Selection mode',
      options: ['single', 'multiple', 'range'],
      default: 'single',
    },
    fixedWeeks: {
      type: 'boolean',
      label: 'Fixed Weeks',
      description: 'Always show 6 weeks',
    },
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after selection',
      default: true,
    },
    startOfWeek: {
      type: 'number',
      label: 'Start of Week',
      description: 'First day of week (0=Sun)',
      default: 0,
      min: 0,
      max: 6,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Calendar dropdown placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'],
      default: 'bottom-start',
    },
  },
}

/**
 * Get Zag prop metadata for a component
 */
export function getZagPropMetadata(componentName: string): Record<string, ZagPropMeta> | undefined {
  return ZAG_PROP_METADATA[componentName]
}

/**
 * Check if a component has Zag prop metadata
 */
export function hasZagPropMetadata(componentName: string): boolean {
  return componentName in ZAG_PROP_METADATA
}
