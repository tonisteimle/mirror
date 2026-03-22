/**
 * Zag Primitives Schema
 *
 * Defines Zag-based behavior components that provide complex interactions
 * like Select, Accordion, Dialog, etc. using Zag.js state machines.
 *
 * These primitives extend the base Mirror DSL with behavior-driven components
 * that automatically handle accessibility, keyboard navigation, and state management.
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
  /**
   * Select - Dropdown selection component
   *
   * Usage:
   *   Select placeholder "Choose..."
   *     Trigger:
   *       pad 12, bg #1e1e2e
   *     Content:
   *       bg #2a2a3e, rad 8
   *     Item "Option A"
   *     Item "Option B"
   */
  Select: {
    machine: 'select',
    slots: [
      'Trigger',      // Button that opens the select
      'Content',      // Dropdown content container (portaled)
      'Item',         // Individual option item
      'ItemIndicator', // Checkmark indicator for selected item
      'Group',        // Group of items with label
      'GroupLabel',   // Label for a group of items
      'Input',        // Search input for searchable select
      'Empty',        // Shown when no items match search
      'Pill',         // Tag for multi-select selected items
      'PillRemove',   // Remove button for pills
      'ClearButton',  // Clear all selections
    ],
    props: [
      'placeholder',  // Placeholder text
      'multiple',     // Allow multiple selections
      'searchable',   // Enable search/filter
      'clearable',    // Show clear button
      'disabled',     // Disable the select
      'value',        // Controlled value
      'defaultValue', // Default value (uncontrolled)
    ],
    events: [
      'onchange',     // Fired when selection changes
      'onopen',       // Fired when dropdown opens
      'onclose',      // Fired when dropdown closes
    ],
    description: 'Dropdown select with keyboard navigation and accessibility',
  },
}

/**
 * Slot mappings for Zag components
 * Maps slot names to their Zag API methods and element types
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
}

/**
 * State mappings from Mirror state syntax to Zag data attributes
 *
 * These map Mirror's state syntax (e.g., hover:, selected:) to
 * Zag's data attribute selectors for CSS styling
 */
export const STATE_MAPPINGS: Record<string, string> = {
  // Selection states
  'hover:': '[data-highlighted]',
  'selected:': '[data-state="checked"]',
  'highlighted:': '[data-highlighted]',
  'checked:': '[data-state="checked"]',

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
  'expanded:': '[data-state="open"]',
  'collapsed:': '[data-state="closed"]',

  // Validity states
  'valid:': '[data-valid]',
  'invalid:': '[data-invalid]',

  // Loading states
  'loading:': '[data-loading]',

  // Placement states (for positioned elements)
  'top:': '[data-placement^="top"]',
  'bottom:': '[data-placement^="bottom"]',
  'left:': '[data-placement^="left"]',
  'right:': '[data-placement^="right"]',
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
