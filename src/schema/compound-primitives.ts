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
  // ===========================================================================
  // APP LAYOUTS
  // ===========================================================================
  Shell: {
    slots: ['Header', 'Sidebar', 'Main', 'Footer'],
    props: ['sidebarWidth', 'sidebarPosition', 'headerHeight', 'footerHeight'],
    description: 'App shell with header, sidebar, and main content area',
    nestedSlots: {
      Header: ['Logo', 'Nav', 'Actions'],
      Nav: ['NavItem'],
      Sidebar: ['SidebarHeader', 'SidebarGroup', 'SidebarFooter'],
      SidebarGroup: ['SidebarItem'],
    },
    defaultStyles: {
      display: 'grid',
      'grid-template-areas': '"header header" "sidebar main"',
      'grid-template-columns': '240px 1fr',
      'grid-template-rows': '56px 1fr',
      height: '100%',
      width: '100%',
    },
    slotStyles: {
      Header: {
        'grid-area': 'header',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        gap: '8px',
        padding: '0 8px',
        background: '#1a1a1a',
        'border-bottom': '1px solid #222222',
      },
      Sidebar: {
        'grid-area': 'sidebar',
        display: 'flex',
        'flex-direction': 'column',
        background: '#1a1a1a',
        'border-right': '1px solid #222222',
        overflow: 'auto',
      },
      Main: {
        'grid-area': 'main',
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'auto',
        padding: '8px',
      },
      Footer: {
        'grid-area': 'footer',
        display: 'flex',
        'align-items': 'center',
        padding: '0 8px',
        background: '#1a1a1a',
        'border-top': '1px solid #222222',
      },
    },
  },
}

/**
 * Slot mappings for Compound components
 */
export const COMPOUND_SLOT_MAPPINGS: Record<string, Record<string, CompoundSlotDef>> = {
  Shell: {
    // Top-level slots
    Header: {
      element: 'header',
      styles: {
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        gap: '8px',
      },
    },
    Sidebar: {
      element: 'aside',
      styles: {
        display: 'flex',
        'flex-direction': 'column',
      },
    },
    Main: {
      element: 'main',
      styles: {
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'auto',
      },
    },
    Footer: {
      element: 'footer',
      styles: {
        display: 'flex',
        'align-items': 'center',
      },
    },

    // Header nested slots
    Logo: {
      element: 'div',
      styles: {
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
        'font-weight': '600',
        'font-size': '18px',
        color: '#e0e0e0',
      },
    },
    Nav: {
      element: 'nav',
      styles: {
        display: 'flex',
        'align-items': 'center',
        gap: '4px',
      },
      itemContainer: true,
      itemType: 'NavItem',
    },
    NavItem: {
      element: 'a',
      styles: {
        padding: '8px 12px',
        'border-radius': '6px',
        color: '#888888',
        'text-decoration': 'none',
        cursor: 'pointer',
      },
    },
    Actions: {
      element: 'div',
      styles: {
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
      },
    },

    // Sidebar nested slots
    SidebarHeader: {
      element: 'div',
      styles: {
        padding: '8px',
        'font-weight': '600',
        color: '#e0e0e0',
        'border-bottom': '1px solid #222222',
      },
    },
    SidebarGroup: {
      element: 'div',
      styles: {
        padding: '8px',
      },
      itemContainer: true,
      itemType: 'SidebarItem',
    },
    SidebarItem: {
      element: 'a',
      styles: {
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
        padding: '8px 12px',
        'border-radius': '6px',
        color: '#888888',
        'text-decoration': 'none',
        cursor: 'pointer',
      },
    },
    SidebarFooter: {
      element: 'div',
      styles: {
        'margin-top': 'auto',
        padding: '8px',
        'border-top': '1px solid #222222',
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
