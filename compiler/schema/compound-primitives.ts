/**
 * Compound Primitives Schema
 *
 * Defines pre-built layout components that combine multiple primitives
 * for rapid prototyping. These are fully customizable and overridable.
 *
 * Unlike Zag primitives (behavior-driven), Compound primitives are
 * layout-driven - they provide structure and default styling.
 */

/**
 * Definition of a Compound primitive component
 */
export interface CompoundPrimitiveDef {
  /** Available slots for composition */
  slots: string[]
  /** Component-specific props */
  props?: string[]
  /** Description for documentation */
  description?: string
  /** Nested slots (slots that contain other slots) */
  nestedSlots?: Record<string, string[]>
  /** Default styles for the root element */
  defaultStyles?: Record<string, string>
  /** Default styles for slots */
  slotStyles?: Record<string, Record<string, string>>
}

/**
 * Slot definition for Compound components
 */
export interface CompoundSlotDef {
  /** Default HTML element */
  element: string
  /** Default styles */
  styles?: Record<string, string>
  /** Whether this slot can contain items */
  itemContainer?: boolean
  /** Item type this slot accepts */
  itemType?: string
}

/**
 * Registry of all Compound primitive components
 */
export const COMPOUND_PRIMITIVES: Record<string, CompoundPrimitiveDef> = {
  /**
   * Table - Data-driven table component
   *
   * Syntax:
   *   Table $collection [where ...] [by ... [desc]] [grouped by ...]
   *
   * Auto-generates columns from data schema with type-specific renderers.
   * Supports selection, sorting, grouping, and aggregations.
   */
  Table: {
    slots: ['Column', 'Header', 'Row', 'Footer', 'Group'],
    props: [
      'select',      // select() or select(multi) - enables row selection
      'pageSize',    // Pagination: number of rows per page
      'infinite',    // Infinite scroll mode
    ],
    description: 'Data-driven table with auto-generated columns from data schema',
    defaultStyles: {
      display: 'flex',
      'flex-direction': 'column',
      background: 'var(--surface, #1a1a1a)',
      'border-radius': '8px',
      overflow: 'hidden',
    },
    slotStyles: {
      Header: {
        display: 'flex',
        background: 'var(--surface-elevated, #252525)',
        padding: '12px',
        'border-bottom': '1px solid var(--border, #333)',
      },
      Row: {
        display: 'flex',
        padding: '12px',
        'border-bottom': '1px solid var(--border-subtle, #222)',
        cursor: 'pointer',
      },
      Footer: {
        display: 'flex',
        padding: '12px',
        background: 'var(--surface-elevated, #252525)',
        'border-top': '1px solid var(--border, #333)',
      },
      Group: {
        display: 'flex',
        'justify-content': 'space-between',
        padding: '12px',
        background: 'var(--surface-elevated, #252525)',
        'border-bottom': '1px solid var(--border, #333)',
      },
    },
  },
}

/**
 * Slot mappings for Compound components
 */
export const COMPOUND_SLOT_MAPPINGS: Record<string, Record<string, CompoundSlotDef>> = {
  Table: {
    Column: {
      element: 'div',
      styles: {
        flex: '1',
        'font-weight': '500',
        color: 'var(--text-muted, #888)',
        'font-size': '11px',
        'text-transform': 'uppercase',
      },
    },
    Header: {
      element: 'div',
      styles: {
        display: 'flex',
        background: 'var(--surface-elevated, #252525)',
        padding: '12px',
        'border-bottom': '1px solid var(--border, #333)',
      },
    },
    Row: {
      element: 'div',
      styles: {
        display: 'flex',
        padding: '12px',
        'border-bottom': '1px solid var(--border-subtle, #222)',
        cursor: 'pointer',
      },
    },
    Footer: {
      element: 'div',
      styles: {
        display: 'flex',
        padding: '12px',
        background: 'var(--surface-elevated, #252525)',
        'border-top': '1px solid var(--border, #333)',
      },
    },
    Group: {
      element: 'div',
      styles: {
        display: 'flex',
        'justify-content': 'space-between',
        padding: '12px',
        background: 'var(--surface-elevated, #252525)',
        'border-bottom': '1px solid var(--border, #333)',
      },
    },
  },
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Check if a component name is a Compound primitive
 */
export function isCompoundPrimitive(name: string): boolean {
  return name in COMPOUND_PRIMITIVES
}

/**
 * Get Compound primitive definition
 */
export function getCompoundPrimitive(name: string): CompoundPrimitiveDef | undefined {
  return COMPOUND_PRIMITIVES[name]
}

/**
 * Get slot mappings for a Compound primitive
 */
export function getCompoundSlotMappings(
  primitiveName: string
): Record<string, CompoundSlotDef> | undefined {
  return COMPOUND_SLOT_MAPPINGS[primitiveName]
}

/**
 * Get slot definition for a specific slot
 */
export function getCompoundSlotDef(
  primitiveName: string,
  slotName: string
): CompoundSlotDef | undefined {
  return COMPOUND_SLOT_MAPPINGS[primitiveName]?.[slotName]
}

/**
 * Check if a name is a valid slot for a Compound primitive
 */
export function isCompoundSlot(primitiveName: string, slotName: string): boolean {
  const primitive = COMPOUND_PRIMITIVES[primitiveName]
  if (!primitive) return false

  // Check direct slots
  if (primitive.slots.includes(slotName)) return true

  // Check nested slots
  if (primitive.nestedSlots) {
    for (const nestedSlots of Object.values(primitive.nestedSlots)) {
      if (nestedSlots.includes(slotName)) return true
    }
  }

  return false
}

/**
 * Get all valid slot names for a Compound primitive (including nested)
 */
export function getAllCompoundSlots(primitiveName: string): string[] {
  const primitive = COMPOUND_PRIMITIVES[primitiveName]
  if (!primitive) return []

  const slots = [...primitive.slots]

  if (primitive.nestedSlots) {
    for (const nestedSlots of Object.values(primitive.nestedSlots)) {
      slots.push(...nestedSlots)
    }
  }

  return [...new Set(slots)] // Remove duplicates
}

/**
 * Get parent slot for a nested slot
 */
export function getParentSlot(primitiveName: string, slotName: string): string | undefined {
  const primitive = COMPOUND_PRIMITIVES[primitiveName]
  if (!primitive?.nestedSlots) return undefined

  for (const [parent, children] of Object.entries(primitive.nestedSlots)) {
    if (children.includes(slotName)) return parent
  }

  return undefined
}

/**
 * Get all Compound primitive names
 */
export function getAllCompoundPrimitives(): string[] {
  return Object.keys(COMPOUND_PRIMITIVES)
}
