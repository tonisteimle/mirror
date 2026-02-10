/**
 * Picker-related types for the editor's picker components.
 */

import type { Position, PickerType } from './common'

// Re-export PickerType for backwards compatibility
export type { PickerType }

// Context data specific to each picker type
export interface PickerContext {
  // Color picker
  currentColor?: string

  // Spacing picker
  spacingProperty?: 'pad' | 'mar' | 'gap'

  // Property picker
  propertyQuery?: string
  propertyReplaceRange?: { from: number; to: number } | null

  // Value picker
  valueProperty?: string

  // Token picker
  propertyContext?: string  // Property that triggered token picker (for filtering)

  // Command palette
  commandQuery?: string

  // Generic query (used by command/property picker in usePickerState)
  query?: string
  replaceRange?: { from: number; to: number } | null
}

// State shape for picker management
export interface PickerState {
  active: PickerType | null
  position: Position
  context: PickerContext
}

// Options for inserting values at cursor
export interface InsertOptions {
  // Remove preceding character (e.g., "/" or "$")
  removePrecedingChar?: string
  // Replace a specific range instead of inserting
  replaceRange?: { from: number; to: number }
}

// Re-export Position for convenience
export type { Position }
