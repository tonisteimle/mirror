/**
 * Common types shared across the application.
 */

import { TABS, PICKERS, AUTOCOMPLETE_MODES } from '../constants'

// Tab types for editor navigation (derived from constants)
export type TabType = typeof TABS[keyof typeof TABS]

// Validation-specific subset (for type compatibility)
export type ValidationTabType = 'components' | 'layout' | 'tokens'

// Picker types (derived from constants)
export type PickerType = typeof PICKERS[keyof typeof PICKERS]

// Autocomplete mode (derived from constants)
export type AutocompleteMode = typeof AUTOCOMPLETE_MODES[keyof typeof AUTOCOMPLETE_MODES]

// Generic position interface
export interface Position {
  x: number
  y: number
}
