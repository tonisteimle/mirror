/**
 * Zag Component Detection
 *
 * Utilities for detecting Zag components and their types during parsing/compilation.
 */

import { ZAG_PRIMITIVES, isZagPrimitive as schemaIsZagPrimitive } from '../../schema/zag-primitives'

/**
 * Check if a component name is a Zag primitive
 *
 * @param name Component name (e.g., 'Select', 'Accordion')
 * @returns true if this is a Zag primitive
 */
export function isZagComponent(name: string): boolean {
  return schemaIsZagPrimitive(name)
}

/**
 * Get the Zag machine type for a component
 *
 * @param name Component name (e.g., 'Select')
 * @returns Machine type (e.g., 'select') or undefined if not a Zag component
 */
export function getZagMachineType(name: string): string | undefined {
  const primitive = ZAG_PRIMITIVES[name]
  return primitive?.machine
}

/**
 * Detect if a primitive type string represents a Zag component
 *
 * Used during IR transformation to detect components that need
 * Zag runtime handling.
 *
 * @param primitive Primitive type string
 * @returns Zag machine type or undefined
 */
export function detectPrimitiveType(primitive: string | undefined | null): string | undefined {
  if (!primitive) return undefined

  // Check exact match first (PascalCase)
  if (ZAG_PRIMITIVES[primitive]) {
    return ZAG_PRIMITIVES[primitive].machine
  }

  // Check with capitalized first letter
  const capitalized = primitive.charAt(0).toUpperCase() + primitive.slice(1)
  if (ZAG_PRIMITIVES[capitalized]) {
    return ZAG_PRIMITIVES[capitalized].machine
  }

  return undefined
}

/**
 * Get all valid slot names for a Zag component
 *
 * @param componentName Component name (e.g., 'Select')
 * @returns Array of valid slot names
 */
export function getValidSlots(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.slots ?? []
}

/**
 * Check if a slot name is valid for a Zag component
 *
 * @param componentName Component name (e.g., 'Select')
 * @param slotName Slot name (e.g., 'Trigger', 'Content')
 * @returns true if the slot is valid for this component
 */
export function isValidSlot(componentName: string, slotName: string): boolean {
  const validSlots = getValidSlots(componentName)
  return validSlots.includes(slotName)
}

/**
 * Get all valid props for a Zag component
 *
 * @param componentName Component name (e.g., 'Select')
 * @returns Array of valid prop names
 */
export function getValidProps(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.props ?? []
}

/**
 * Check if a prop name is valid for a Zag component
 *
 * @param componentName Component name (e.g., 'Select')
 * @param propName Property name (e.g., 'placeholder', 'multiple')
 * @returns true if the prop is valid for this component
 */
export function isValidProp(componentName: string, propName: string): boolean {
  const validProps = getValidProps(componentName)
  return validProps.includes(propName)
}

/**
 * Get all valid events for a Zag component
 *
 * @param componentName Component name (e.g., 'Select')
 * @returns Array of valid event names
 */
export function getValidEvents(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.events ?? []
}
