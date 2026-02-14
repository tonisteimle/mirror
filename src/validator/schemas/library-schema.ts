/**
 * Library Schema
 *
 * Schema for library component slot validation.
 * Built from the library registry.
 */

import {
  getLibraryComponent,
  isLibraryComponent,
  LIBRARY_COMPONENT_NAMES,
  LIBRARY_SLOT_NAMES
} from '../../library/registry'
import type { LibraryComponent, SlotDefinition } from '../../library/types'

// ============================================
// Library Component Schema
// ============================================

export interface LibraryComponentSchema {
  name: string
  slots: SlotSchema[]
  requiredSlots: string[]
  optionalSlots: string[]
  multipleSlots: string[]
  actions: string[]
  states: string[]
}

export interface SlotSchema {
  name: string
  required: boolean
  multiple: boolean
}

// ============================================
// Schema Access Functions
// ============================================

/**
 * Get schema for a library component
 */
export function getLibrarySchema(name: string): LibraryComponentSchema | undefined {
  const component = getLibraryComponent(name)
  if (!component) return undefined

  return componentToSchema(component)
}

/**
 * Check if a slot name is valid for a component
 */
export function isValidSlot(componentName: string, slotName: string): boolean {
  const component = getLibraryComponent(componentName)
  if (!component) return false

  return component.slots.some(s => s.name === slotName)
}

/**
 * Get valid slots for a component
 */
export function getValidSlots(componentName: string): string[] {
  const component = getLibraryComponent(componentName)
  if (!component) return []

  return component.slots.map(s => s.name)
}

/**
 * Get required slots for a component
 */
export function getRequiredSlots(componentName: string): string[] {
  const component = getLibraryComponent(componentName)
  if (!component) return []

  return component.slots.filter(s => s.required).map(s => s.name)
}

/**
 * Check if a slot can appear multiple times
 */
export function isMultipleSlot(componentName: string, slotName: string): boolean {
  const component = getLibraryComponent(componentName)
  if (!component) return false

  const slot = component.slots.find(s => s.name === slotName)
  return slot?.multiple ?? false
}

/**
 * Get valid actions for a component
 */
export function getValidActions(componentName: string): string[] {
  const component = getLibraryComponent(componentName)
  if (!component) return []

  return component.actions
}

/**
 * Get valid states for a component
 */
export function getValidStates(componentName: string): string[] {
  const component = getLibraryComponent(componentName)
  if (!component) return []

  return component.defaultStates
}

/**
 * Get all library component names
 */
export function getLibraryComponentNames(): string[] {
  return Array.from(LIBRARY_COMPONENT_NAMES)
}

/**
 * Get all slot names (across all components)
 */
export function getAllSlotNames(): string[] {
  return Array.from(LIBRARY_SLOT_NAMES)
}

/**
 * Check if a name might be a mistyped library component
 */
export function findSimilarLibraryComponent(name: string): string | undefined {
  const nameLower = name.toLowerCase()

  for (const componentName of LIBRARY_COMPONENT_NAMES) {
    if (componentName.toLowerCase() === nameLower) {
      return componentName
    }
  }

  // Simple distance check
  for (const componentName of LIBRARY_COMPONENT_NAMES) {
    if (Math.abs(componentName.length - name.length) <= 2) {
      const diff = levenshteinDistance(name.toLowerCase(), componentName.toLowerCase())
      if (diff <= 2) {
        return componentName
      }
    }
  }

  return undefined
}

/**
 * Check if a name might be a mistyped slot
 */
export function findSimilarSlot(componentName: string, slotName: string): string | undefined {
  const validSlots = getValidSlots(componentName)
  const slotLower = slotName.toLowerCase()

  for (const slot of validSlots) {
    if (slot.toLowerCase() === slotLower) {
      return slot
    }
  }

  for (const slot of validSlots) {
    if (Math.abs(slot.length - slotName.length) <= 2) {
      const diff = levenshteinDistance(slotName.toLowerCase(), slot.toLowerCase())
      if (diff <= 2) {
        return slot
      }
    }
  }

  return undefined
}

// ============================================
// Helper Functions
// ============================================

function componentToSchema(component: LibraryComponent): LibraryComponentSchema {
  return {
    name: component.name,
    slots: component.slots.map(slotToSchema),
    requiredSlots: component.slots.filter(s => s.required).map(s => s.name),
    optionalSlots: component.slots.filter(s => !s.required).map(s => s.name),
    multipleSlots: component.slots.filter(s => s.multiple).map(s => s.name),
    actions: component.actions,
    states: component.defaultStates
  }
}

function slotToSchema(slot: SlotDefinition): SlotSchema {
  return {
    name: slot.name,
    required: slot.required,
    multiple: slot.multiple
  }
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      )
    }
  }

  return d[m][n]
}

// Re-export for convenience
export { isLibraryComponent, LIBRARY_COMPONENT_NAMES, LIBRARY_SLOT_NAMES }
