/**
 * Zag Primitives Schema (Minimal)
 *
 * Only DatePicker remains as a Zag component - all others are now Pure Mirror.
 */

/**
 * Definition of a Zag primitive component
 */
export interface ZagPrimitiveDef {
  /** Zag machine name (e.g., 'select', 'accordion') */
  machine: string
  /** Available slots for composition (e.g., ['Trigger', 'Content', 'Item']) */
  slots: string[]
  /** Component-specific props (e.g., ['placeholder', 'multiple']) */
  props: string[]
  /** Component-specific events (e.g., ['onchange', 'onopen']) */
  events?: string[]
  /** Description for documentation */
  description?: string
  /** Pattern type for syntax handling */
  pattern?:
    | 'slots-only'
    | 'simple-items'
    | 'content-items'
    | 'repeating-items'
    | 'complex-nested'
    | 'nav-items'
  /** Item keywords for this component (e.g., ['Tab'] for Tabs, ['Step'] for Steps). Default is ['Item'] */
  itemKeywords?: string[]
  /** Group keywords for this component (e.g., ['NavGroup'] for SideNav). Default is ['Group'] */
  groupKeywords?: string[]
  /** Item-specific props (e.g., ['icon', 'disabled', 'value']) */
  itemProps?: string[]
}

/**
 * Slot definition for Zag components
 */
export interface ZagSlotDef {
  /** API method to get props (e.g., 'getTriggerProps') */
  api: string
  /** Default HTML element (e.g., 'button', 'div') */
  element: string
  /** Whether this slot should be portaled */
  portal?: boolean
  /** Whether this slot is bound to an item (for lists) */
  itemBound?: boolean
}

/**
 * Registry of all Zag primitive components
 */
export const ZAG_PRIMITIVES: Record<string, ZagPrimitiveDef> = {
  // ===========================================================================
  // DATE & TIME (Only Zag component remaining)
  // ===========================================================================
  DatePicker: {
    machine: 'date-picker',
    slots: [
      'Root',
      'Label',
      'Control',
      'Input',
      'Trigger',
      'Positioner',
      'Content',
      'ViewControl',
      'PrevTrigger',
      'NextTrigger',
      'ViewTrigger',
      'RangeText',
      'Table',
      'TableHead',
      'TableRow',
      'TableHeader',
      'TableBody',
      'TableCell',
      'TableCellTrigger',
      'MonthSelect',
      'YearSelect',
      'ClearTrigger',
      'PresetTrigger',
    ],
    props: [
      'value',
      'defaultValue',
      'disabled',
      'readOnly',
      'min',
      'max',
      'locale',
      'selectionMode',
      'fixedWeeks',
      'startOfWeek',
      'closeOnSelect',
      'positioning',
    ],
    events: ['onchange', 'onopen', 'onclose', 'onviewchange'],
    description: 'Date picker calendar',
    pattern: 'complex-nested',
    // DatePicker has no Items or Groups — default `['Item']` would otherwise
    // route stray `Item ...` lines through parseZagItem (dead code path).
    itemKeywords: [],
  },
}

/**
 * Slot mappings for Zag components
 */
export const SLOT_MAPPINGS: Record<string, Record<string, ZagSlotDef>> = {
  DatePicker: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    ViewControl: { api: 'getViewControlProps', element: 'div' },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    ViewTrigger: { api: 'getViewTriggerProps', element: 'button' },
    RangeText: { api: 'getRangeTextProps', element: 'span' },
    Table: { api: 'getTableProps', element: 'table' },
    TableHead: { api: 'getTableHeadProps', element: 'thead' },
    TableRow: { api: 'getTableRowProps', element: 'tr' },
    TableHeader: { api: 'getTableHeaderProps', element: 'th' },
    TableBody: { api: 'getTableBodyProps', element: 'tbody' },
    TableCell: { api: 'getTableCellProps', element: 'td', itemBound: true },
    TableCellTrigger: { api: 'getTableCellTriggerProps', element: 'button', itemBound: true },
    MonthSelect: { api: 'getMonthSelectProps', element: 'select' },
    YearSelect: { api: 'getYearSelectProps', element: 'select' },
    ClearTrigger: { api: 'getClearTriggerProps', element: 'button' },
    PresetTrigger: { api: 'getPresetTriggerProps', element: 'button', itemBound: true },
  },
}

/**
 * Check if a component name is a Zag primitive
 */
export function isZagPrimitive(name: string): boolean {
  return name in ZAG_PRIMITIVES
}

/**
 * Get Zag primitive definition
 */
export function getZagPrimitive(name: string): ZagPrimitiveDef | undefined {
  return ZAG_PRIMITIVES[name]
}

/**
 * Get slot mappings for a Zag primitive
 */
export function getSlotMappings(primitiveName: string): Record<string, ZagSlotDef> | undefined {
  return SLOT_MAPPINGS[primitiveName]
}

/**
 * Get slot definition for a specific slot
 */
export function getSlotDef(primitiveName: string, slotName: string): ZagSlotDef | undefined {
  return SLOT_MAPPINGS[primitiveName]?.[slotName]
}

/**
 * Check if a name is a valid slot for a Zag primitive
 */
export function isZagSlot(primitiveName: string, slotName: string): boolean {
  const primitive = ZAG_PRIMITIVES[primitiveName]
  return primitive?.slots.includes(slotName) ?? false
}
