/**
 * Zag Slot Mappings
 *
 * Maps Zag component slots to their Zag API methods and HTML elements.
 * Re-exports from schema for use in the compiler.
 */

import {
  SLOT_MAPPINGS as SCHEMA_SLOT_MAPPINGS,
  getSlotDef as schemaGetSlotDef,
  type ZagSlotDef,
} from '../../schema/zag-primitives'

// Re-export the slot mappings from schema
export { SCHEMA_SLOT_MAPPINGS as SLOT_MAPPINGS }
export type { ZagSlotDef }

/**
 * Get slot definition for a specific slot
 *
 * @param primitiveName Zag component name (e.g., 'Select')
 * @param slotName Slot name (e.g., 'Trigger', 'Content')
 * @returns Slot definition or undefined
 */
export function getSlotDefinition(primitiveName: string, slotName: string): ZagSlotDef | undefined {
  return schemaGetSlotDef(primitiveName, slotName)
}

/**
 * Get the API method for a slot
 *
 * @param primitiveName Zag component name
 * @param slotName Slot name
 * @returns API method name (e.g., 'getTriggerProps') or undefined
 */
export function getSlotApiMethod(primitiveName: string, slotName: string): string | undefined {
  const def = getSlotDefinition(primitiveName, slotName)
  return def?.api
}

/**
 * Get the HTML element for a slot
 *
 * @param primitiveName Zag component name
 * @param slotName Slot name
 * @returns HTML element name (e.g., 'button', 'div') or 'div' as default
 */
export function getSlotElement(primitiveName: string, slotName: string): string {
  const def = getSlotDefinition(primitiveName, slotName)
  return def?.element ?? 'div'
}

/**
 * Check if a slot should be portaled
 *
 * Portaled slots are rendered outside their parent's DOM hierarchy,
 * typically to avoid clipping/overflow issues with dropdowns.
 *
 * @param primitiveName Zag component name
 * @param slotName Slot name
 * @returns true if the slot should be portaled
 */
export function isPortaledSlot(primitiveName: string, slotName: string): boolean {
  const def = getSlotDefinition(primitiveName, slotName)
  return def?.portal ?? false
}

/**
 * Check if a slot is bound to items
 *
 * Item-bound slots need to be rendered for each item in the list
 * (e.g., Item, ItemIndicator for Select component).
 *
 * @param primitiveName Zag component name
 * @param slotName Slot name
 * @returns true if the slot is item-bound
 */
export function isItemBoundSlot(primitiveName: string, slotName: string): boolean {
  const def = getSlotDefinition(primitiveName, slotName)
  return def?.itemBound ?? false
}

/**
 * Get all slot definitions for a component
 *
 * @param primitiveName Zag component name
 * @returns Record of slot name to definition
 */
export function getAllSlotDefinitions(primitiveName: string): Record<string, ZagSlotDef> {
  return SCHEMA_SLOT_MAPPINGS[primitiveName] ?? {}
}
