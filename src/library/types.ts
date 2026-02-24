// Library Component Types

import type { DSLProperties } from '../types/dsl-properties'

export interface SlotDefinition {
  name: string           // e.g., "Trigger", "Content", "Item"
  required: boolean
  multiple: boolean      // Item can appear multiple times
  defaultProps: DSLProperties
  aliases?: string[]     // Alternative names, e.g., "Option" for "Item"
}

export interface LibraryComponent {
  name: string           // e.g., "Dropdown"
  category: string       // e.g., "overlays"
  description: string
  slots: SlotDefinition[]
  defaultStates: string[]  // e.g., ["open", "closed"]
  actions: string[]        // e.g., ["open", "close", "toggle"]
  definitions: string      // Component definitions for Components tab
  layoutExample: string    // Clean layout structure for Layout tab
  example?: string         // Legacy: full inline example (deprecated)
}

export type LibraryCategory =
  | 'overlays'      // Dropdown, Popover, Tooltip, Dialog
  | 'navigation'    // Tabs, Accordion
  | 'form'          // Select
  | 'feedback'      // Toast, Alert

export interface LibraryCategoryInfo {
  id: LibraryCategory
  name: string
  description: string
}

export const LIBRARY_CATEGORIES: LibraryCategoryInfo[] = [
  {
    id: 'overlays',
    name: 'Overlays',
    description: 'Dropdown menus, popovers, tooltips, and modals'
  },
  {
    id: 'navigation',
    name: 'Navigation',
    description: 'Tabs and accordions for organizing content'
  },
  {
    id: 'form',
    name: 'Form',
    description: 'Form elements like select dropdowns'
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'Toasts, alerts, and notifications'
  }
]
