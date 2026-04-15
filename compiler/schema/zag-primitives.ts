/**
 * Zag Primitives Schema (Reduced)
 *
 * Contains only the Zag components used in the Mirror Tutorial:
 * - Forms: Checkbox, Switch, RadioGroup, Slider, Select, DatePicker
 * - Navigation: Tabs, SideNav
 * - Overlays: Dialog, Tooltip
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
  // SELECTION
  // ===========================================================================
  Select: {
    machine: 'select',
    slots: [
      'Trigger',
      'Content',
      'Item',
      'ItemIndicator',
      'Group',
      'GroupLabel',
      'Input',
      'Empty',
      'Pill',
      'PillRemove',
      'ClearButton',
    ],
    props: [
      'value',
      'defaultValue',
      'placeholder',
      'multiple',
      'disabled',
      'readOnly',
      'required',
      'invalid',
      'loopFocus',
      'deselectable',
      'closeOnSelect',
      'typeahead',
      'open',
      'defaultOpen',
      'highlightedValue',
      'defaultHighlightedValue',
      'positioning',
      'name',
      'form',
      'composite',
      'searchable',
      'clearable',
      'keepOpen',
      'icon',
    ],
    events: ['onchange', 'onopen', 'onclose', 'onhighlightchange', 'onselect'],
    description: 'Dropdown select with keyboard navigation',
    pattern: 'simple-items',
    itemKeywords: ['Item', 'Option'],
    itemProps: ['icon', 'disabled', 'value'],
  },

  // ===========================================================================
  // FORM CONTROLS
  // ===========================================================================
  Checkbox: {
    machine: 'checkbox',
    slots: ['Root', 'Control', 'Label', 'Indicator', 'HiddenInput'],
    props: [
      'checked',
      'defaultChecked',
      'disabled',
      'required',
      'name',
      'value',
      'indeterminate',
      'invalid',
      'readOnly',
      'icon',
      'label',
    ],
    events: ['onchange'],
    description: 'Checkbox with label',
    pattern: 'slots-only',
  },

  Switch: {
    machine: 'switch',
    slots: ['Track', 'Thumb', 'Label'],
    props: [
      'checked',
      'defaultChecked',
      'disabled',
      'required',
      'name',
      'invalid',
      'readOnly',
      'label',
    ],
    events: ['onchange'],
    description: 'Toggle switch',
    pattern: 'slots-only',
  },

  RadioGroup: {
    machine: 'radio-group',
    slots: ['Root', 'Item', 'ItemControl', 'ItemText', 'ItemHiddenInput', 'Label', 'Indicator'],
    props: [
      'value',
      'defaultValue',
      'disabled',
      'name',
      'orientation',
      'invalid',
      'readOnly',
      'required',
    ],
    events: ['onchange'],
    description: 'Radio button group',
    pattern: 'repeating-items',
    itemKeywords: ['RadioItem', 'Radio', 'Item', 'Option'],
    itemProps: ['disabled', 'value'],
  },

  Slider: {
    machine: 'slider',
    slots: [
      'Root',
      'Track',
      'Range',
      'Thumb',
      'Label',
      'ValueText',
      'MarkerGroup',
      'Marker',
      'HiddenInput',
    ],
    props: [
      'value',
      'defaultValue',
      'min',
      'max',
      'step',
      'disabled',
      'orientation',
      'minStepsBetweenThumbs',
      'invalid',
      'readOnly',
      'name',
      'origin',
    ],
    events: ['onchange', 'onchangeend'],
    description: 'Range slider',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // DATE & TIME
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
  },

  // ===========================================================================
  // OVERLAYS
  // ===========================================================================
  Dialog: {
    machine: 'dialog',
    slots: ['Trigger', 'Backdrop', 'Positioner', 'Content', 'Title', 'Description', 'CloseTrigger'],
    props: [
      'open',
      'defaultOpen',
      'modal',
      'preventScroll',
      'closeOnOutsideClick',
      'closeOnEscape',
      'closeIcon',
      'role',
      'trapFocus',
      'restoreFocus',
    ],
    events: ['onopen', 'onclose'],
    description: 'Modal dialog',
    pattern: 'slots-only',
  },

  Tooltip: {
    machine: 'tooltip',
    slots: ['Trigger', 'Positioner', 'Content', 'Arrow'],
    props: [
      'open',
      'defaultOpen',
      'openDelay',
      'closeDelay',
      'placement',
      'disabled',
      'closeOnClick',
      'closeOnPointerDown',
      'interactive',
      'closeOnScroll',
      'positioning',
    ],
    events: ['onopen', 'onclose'],
    description: 'Hover tooltip',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  Tabs: {
    machine: 'tabs',
    slots: ['Root', 'List', 'Trigger', 'Content', 'Indicator'],
    props: ['value', 'defaultValue', 'orientation', 'activationMode', 'loopFocus', 'deselectable'],
    events: ['onchange'],
    description: 'Tabbed navigation',
    pattern: 'content-items',
    itemKeywords: ['Tab', 'Item'],
    itemProps: ['value', 'disabled', 'shows', 'showsFrom'],
  },

  SideNav: {
    machine: 'sidenav',
    slots: [
      'Root',
      'Header',
      'Footer',
      'ItemList',
      'Item',
      'ItemIcon',
      'ItemLabel',
      'ItemBadge',
      'ItemArrow',
      'Group',
      'GroupLabel',
      'GroupArrow',
      'GroupContent',
    ],
    props: ['value', 'defaultValue', 'collapsed'],
    events: ['onchange'],
    description: 'Sidebar navigation',
    pattern: 'nav-items',
    itemKeywords: ['NavItem'],
    groupKeywords: ['NavGroup'],
    itemProps: ['value', 'icon', 'badge', 'arrow', 'shows', 'disabled'],
  },
}

/**
 * Slot mappings for Zag components
 */
export const SLOT_MAPPINGS: Record<string, Record<string, ZagSlotDef>> = {
  Select: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Content: { api: 'getContentProps', element: 'div', portal: true },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
    Group: { api: 'getGroupProps', element: 'div' },
    GroupLabel: { api: 'getLabelProps', element: 'span' },
    Input: { api: 'getInputProps', element: 'input' },
    Empty: { api: 'getEmptyProps', element: 'div' },
    Pill: { api: 'getPillProps', element: 'span', itemBound: true },
    PillRemove: { api: 'getPillRemoveProps', element: 'button', itemBound: true },
    ClearButton: { api: 'getClearButtonProps', element: 'button' },
  },

  Checkbox: {
    Root: { api: 'getRootProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'span' },
    Indicator: { api: 'getIndicatorProps', element: 'span' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  Switch: {
    Track: { api: 'getControlProps', element: 'span' },
    Thumb: { api: 'getThumbProps', element: 'span' },
    Label: { api: 'getLabelProps', element: 'span' },
  },

  RadioGroup: {
    Root: { api: 'getRootProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'label', itemBound: true },
    ItemControl: { api: 'getItemControlProps', element: 'div', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
    ItemHiddenInput: { api: 'getItemHiddenInputProps', element: 'input', itemBound: true },
    Label: { api: 'getLabelProps', element: 'span' },
    Indicator: { api: 'getIndicatorProps', element: 'span' },
  },

  Slider: {
    Root: { api: 'getRootProps', element: 'div' },
    Track: { api: 'getTrackProps', element: 'div' },
    Range: { api: 'getRangeProps', element: 'div' },
    Thumb: { api: 'getThumbProps', element: 'div', itemBound: true },
    Label: { api: 'getLabelProps', element: 'label' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
    MarkerGroup: { api: 'getMarkerGroupProps', element: 'div' },
    Marker: { api: 'getMarkerProps', element: 'span', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

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

  Dialog: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Backdrop: { api: 'getBackdropProps', element: 'div', portal: true },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Title: { api: 'getTitleProps', element: 'h2' },
    Description: { api: 'getDescriptionProps', element: 'p' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
  },

  Tooltip: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Arrow: { api: 'getArrowProps', element: 'div' },
  },

  Tabs: {
    Root: { api: 'getRootProps', element: 'div' },
    List: { api: 'getListProps', element: 'div' },
    Trigger: { api: 'getTriggerProps', element: 'button', itemBound: true },
    Content: { api: 'getContentProps', element: 'div', itemBound: true },
    Indicator: { api: 'getIndicatorProps', element: 'div' },
  },

  SideNav: {
    Root: { api: 'getRootProps', element: 'nav' },
    Header: { api: 'getHeaderProps', element: 'div' },
    Footer: { api: 'getFooterProps', element: 'div' },
    ItemList: { api: 'getItemListProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'a', itemBound: true },
    ItemIcon: { api: 'getItemIconProps', element: 'span', itemBound: true },
    ItemLabel: { api: 'getItemLabelProps', element: 'span', itemBound: true },
    ItemBadge: { api: 'getItemBadgeProps', element: 'span', itemBound: true },
    ItemArrow: { api: 'getItemArrowProps', element: 'span', itemBound: true },
    Group: { api: 'getGroupProps', element: 'div', itemBound: true },
    GroupLabel: { api: 'getGroupLabelProps', element: 'div', itemBound: true },
    GroupArrow: { api: 'getGroupArrowProps', element: 'span', itemBound: true },
    GroupContent: { api: 'getGroupContentProps', element: 'div', itemBound: true },
  },
}

/**
 * State mappings from Mirror state syntax to Zag data attributes
 */
export const STATE_MAPPINGS: Record<string, string> = {
  // Selection states
  'hover:': '[data-highlighted]',
  'selected:': '[data-state="checked"]',
  'highlighted:': '[data-highlighted]',
  'checked:': '[data-state="checked"]',
  'unchecked:': '[data-state="unchecked"]',

  // Interactive states
  'disabled:': '[data-disabled]',
  'focus:': '[data-focus]',
  'focus-visible:': '[data-focus-visible]',
  'active:': '[data-active]',
  'pressed:': '[data-pressed]',
  'readonly:': '[data-readonly]',

  // Open/close states
  'open:': '[data-state="open"]',
  'closed:': '[data-state="closed"]',

  // Validity states
  'valid:': '[data-valid]',
  'invalid:': '[data-invalid]',

  // Placement states (for positioned elements)
  'top:': '[data-placement^="top"]',
  'bottom:': '[data-placement^="bottom"]',
  'left:': '[data-placement^="left"]',
  'right:': '[data-placement^="right"]',
}

/**
 * Slot aliases for designer-friendly naming
 */
export const SLOT_ALIASES: Record<string, Record<string, string>> = {
  Select: {
    Dropdown: 'Content',
    Arrow: 'Indicator',
    Check: 'ItemIndicator',
    Value: 'ValueText',
    Tags: 'TagGroup',
    Search: 'Input',
    Clear: 'ClearButton',
  },
  Tabs: {
    Tab: 'Trigger',
    Panel: 'Content',
  },
  Dialog: {
    Overlay: 'Backdrop',
    Modal: 'Content',
    Close: 'CloseTrigger',
  },
  Tooltip: {
    Popup: 'Content',
  },
}

/**
 * Resolve a slot alias to its canonical Zag slot name
 */
export function resolveSlotAlias(primitiveName: string, slotName: string): string {
  const aliases = SLOT_ALIASES[primitiveName]
  if (aliases && aliases[slotName]) {
    return aliases[slotName]
  }
  return slotName
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

/**
 * Get CSS selector for a Mirror state
 */
export function getStateSelector(mirrorState: string): string | undefined {
  return STATE_MAPPINGS[mirrorState]
}

/**
 * Get all Zag primitive names
 */
export function getAllZagPrimitives(): string[] {
  return Object.keys(ZAG_PRIMITIVES)
}

/**
 * Get Zag primitives by pattern type
 */
export function getZagPrimitivesByPattern(pattern: ZagPrimitiveDef['pattern']): string[] {
  return Object.entries(ZAG_PRIMITIVES)
    .filter(([_, def]) => def.pattern === pattern)
    .map(([name]) => name)
}

/**
 * Get valid item keywords for a Zag component
 */
export function getItemKeywords(primitiveName: string): string[] {
  const primitive = ZAG_PRIMITIVES[primitiveName]
  return primitive?.itemKeywords ?? ['Item']
}

/**
 * Check if a keyword is a valid item keyword for a Zag component
 */
export function isZagItemKeyword(primitiveName: string, keyword: string): boolean {
  const keywords = getItemKeywords(primitiveName)
  return keywords.includes(keyword)
}

/**
 * Check if a keyword is a valid group keyword for a Zag component
 */
export function isZagGroupKeyword(primitiveName: string, keyword: string): boolean {
  const primitivesDef = ZAG_PRIMITIVES[primitiveName]
  if (!primitivesDef) return false
  if (primitivesDef.groupKeywords && primitivesDef.groupKeywords.includes(keyword)) {
    return true
  }
  return primitivesDef.slots.includes('Group') && keyword === 'Group'
}
