/**
 * @module library/layout-defaults
 * @description Smart Layout Defaults für strukturelle Komponenten
 *
 * Hierarchische Komponenten mit kontextsensitiven Slots.
 * Ermöglicht rein strukturelle UI-Beschreibung ohne explizites Styling.
 *
 * Beispiel:
 *   Table
 *     Header "Name" "Email"    → automatisch hor, weight 600, bg, pad
 *     Row "John" "john@..."    → automatisch hor, pad, border
 *
 * User-Properties überschreiben immer die Defaults:
 *   Table
 *     Header bg #FF0000        → nur bg anders, rest bleibt
 */

import type { DSLProperties } from '../types/dsl-properties'

// ============================================
// Types
// ============================================

export interface LayoutSlot {
  defaults: DSLProperties
}

export interface LayoutComponent {
  defaults: DSLProperties
  slots?: Record<string, LayoutSlot>
}

// ============================================
// Layout Component Definitions
// ============================================

export const LAYOUT_COMPONENTS: Record<string, LayoutComponent> = {
  // ============================================
  // PAGE STRUCTURE
  // ============================================

  'App': {
    defaults: {
      ver: true,
      w: 'max',
      h: 'max',
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          between: true,
          pad_u: 12,
          pad_d: 12,
          pad_l: 16,
          pad_r: 16,
          h: 56,
        }
      },
      'Main': {
        defaults: {
          hor: true,
          w: 'max',
          h: 'max',
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          align_main: 'cen',
          pad_u: 12,
          pad_d: 12,
          pad_l: 16,
          pad_r: 16,
          h: 48,
        }
      }
    }
  },

  'Page': {
    defaults: {
      ver: true,
      w: 'max',
      h: 'max',
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          between: true,
          pad_u: 12,
          pad_d: 12,
          pad_l: 16,
          pad_r: 16,
          h: 56,
        }
      },
      'Main': {
        defaults: {
          hor: true,
          w: 'max',
          h: 'max',
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          align_main: 'cen',
          pad_u: 12,
          pad_d: 12,
          pad_l: 16,
          pad_r: 16,
          h: 48,
        }
      }
    }
  },

  // ============================================
  // MAIN CONTENT AREA
  // ============================================

  'Main': {
    defaults: {
      hor: true,
      w: 'max',
      h: 'max',
    },
    slots: {
      'Sidebar': {
        defaults: {
          ver: true,
          gap: 16,
          pad: 16,
          w: 240,
          h: 'max',
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 16,
          pad: 24,
          w: 'max',
          h: 'max',
          scroll: true,
        }
      },
      'LeftPanel': {
        defaults: {
          ver: true,
          gap: 16,
          pad: 16,
          w: 240,
          h: 'max',
        }
      },
      'RightPanel': {
        defaults: {
          ver: true,
          gap: 16,
          pad: 16,
          w: 280,
          h: 'max',
        }
      }
    }
  },

  // ============================================
  // HEADER
  // ============================================

  'Header': {
    defaults: {
      hor: true,
      align_cross: 'cen',
      between: true,
      pad_u: 12,
      pad_d: 12,
      pad_l: 16,
      pad_r: 16,
      h: 56,
    },
    slots: {
      'Logo': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
        }
      },
      'Nav': {
        defaults: {
          hor: true,
          gap: 4,
        }
      },
      'Actions': {
        defaults: {
          hor: true,
          gap: 8,
          align_cross: 'cen',
        }
      }
    }
  },

  // ============================================
  // SIDEBAR
  // ============================================

  'Sidebar': {
    defaults: {
      ver: true,
      gap: 16,
      pad: 16,
      w: 240,
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
          pad_d: 8,
        }
      },
      'Menu': {
        defaults: {
          ver: true,
          gap: 2,
        }
      },
      'Footer': {
        defaults: {
          ver: true,
          gap: 8,
          pad_u: 8,
        }
      }
    }
  },

  // ============================================
  // CONTENT
  // ============================================

  'Content': {
    defaults: {
      ver: true,
      gap: 16,
      pad: 16,
      w: 'max',
      scroll: true,
    }
  },

  // ============================================
  // TABLE (Grid-based rows)
  // ============================================

  'Table': {
    defaults: {
      ver: true,
      w: 'max',
      gap: 2,
    },
    slots: {
      'Header': {
        defaults: {
          _gridRow: true,  // Marker for auto-grid row (equal columns)
          align_cross: 'cen',
          weight: 600,
          bg: '#252525',
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
        }
      },
      'Row': {
        defaults: {
          _gridRow: true,  // Marker for auto-grid row (equal columns)
          align_cross: 'cen',
          bg: '#1E1E1E',
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
        }
      },
      'Cell': {
        defaults: {
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
        }
      },
      'Footer': {
        defaults: {
          _gridRow: true,
          align_cross: 'cen',
          bg: '#252525',
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
        }
      }
    }
  },

  // ============================================
  // CARD
  // ============================================

  'Card': {
    defaults: {
      ver: true,
      gap: 8,
      pad: 16,
      bg: '#252525',
      rad: 12,
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          between: true,
          align_cross: 'cen',
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 8,
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          gap: 8,
          align_cross: 'cen',
          pad_u: 8,
        }
      },
      'Image': {
        defaults: {
          w: 'max',
          rad: 8,
        }
      }
    }
  },

  // ============================================
  // FORM
  // ============================================

  'Form': {
    defaults: {
      ver: true,
      gap: 16,
    },
    slots: {
      'Field': {
        defaults: {
          ver: true,
          gap: 4,
        }
      },
      'Row': {
        defaults: {
          hor: true,
          gap: 16,
        }
      },
      'Section': {
        defaults: {
          ver: true,
          gap: 12,
          pad_u: 8,
        }
      },
      'Actions': {
        defaults: {
          hor: true,
          gap: 8,
          align_main: 'r',
          pad_u: 8,
        }
      }
    }
  },

  // ============================================
  // LIST
  // ============================================

  'List': {
    defaults: {
      ver: true,
      gap: 4,
    },
    slots: {
      'Item': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
        }
      },
      'Header': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          pad_u: 8,
          pad_d: 8,
          weight: 600,
        }
      },
      'Divider': {
        defaults: {
          h: 1,
          w: 'max',
          bg: '#333',
        }
      }
    }
  },

  // ============================================
  // MENU / NAV
  // ============================================

  'Menu': {
    defaults: {
      ver: true,
      gap: 2,
    },
    slots: {
      'Item': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
          rad: 6,
          cursor: 'pointer',
        }
      },
      'Group': {
        defaults: {
          ver: true,
          gap: 2,
          pad_u: 8,
        }
      },
      'Label': {
        defaults: {
          pad_l: 12,
          pad_u: 8,
          pad_d: 4,
          size: 12,
          weight: 600,
          opacity: 0.6,
          uppercase: true,
        }
      },
      'Divider': {
        defaults: {
          h: 1,
          w: 'max',
          bg: '#333',
          mar_u: 4,
          mar_d: 4,
        }
      }
    }
  },

  'Nav': {
    defaults: {
      hor: true,
      gap: 4,
    },
    slots: {
      'Item': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
          pad_u: 8,
          pad_d: 8,
          pad_l: 12,
          pad_r: 12,
          rad: 6,
          cursor: 'pointer',
        }
      }
    }
  },

  // ============================================
  // TABS
  // ============================================

  'Tabs': {
    defaults: {
      ver: true,
      gap: 0,
    },
    slots: {
      'List': {
        defaults: {
          hor: true,
          gap: 4,
          bor_d: 1,
          boc: '#333',
        }
      },
      'Tab': {
        defaults: {
          hor: true,
          align_cross: 'cen',
          gap: 8,
          pad_u: 8,
          pad_d: 8,
          pad_l: 16,
          pad_r: 16,
          cursor: 'pointer',
        }
      },
      'Content': {
        defaults: {
          ver: true,
          pad: 16,
        }
      },
      'Panel': {
        defaults: {
          ver: true,
          gap: 8,
        }
      }
    }
  },

  // ============================================
  // TOOLBAR
  // ============================================

  'Toolbar': {
    defaults: {
      hor: true,
      align_cross: 'cen',
      gap: 8,
      pad: 8,
    },
    slots: {
      'Group': {
        defaults: {
          hor: true,
          gap: 4,
        }
      },
      'Divider': {
        defaults: {
          w: 1,
          h: 24,
          bg: '#333',
          mar_l: 4,
          mar_r: 4,
        }
      }
    }
  },

  // ============================================
  // DIALOG / MODAL
  // ============================================

  'Dialog': {
    defaults: {
      ver: true,
      gap: 16,
      pad: 24,
      bg: '#1A1A1A',
      rad: 12,
      shadow: 'lg',
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          between: true,
          align_cross: 'cen',
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 12,
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          gap: 8,
          align_main: 'r',
          pad_u: 8,
        }
      }
    }
  },

  'Modal': {
    defaults: {
      ver: true,
      gap: 16,
      pad: 24,
      bg: '#1A1A1A',
      rad: 12,
      shadow: 'lg',
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          between: true,
          align_cross: 'cen',
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 12,
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          gap: 8,
          align_main: 'r',
          pad_u: 8,
        }
      }
    }
  },

  // ============================================
  // PANEL / SECTION
  // ============================================

  'Panel': {
    defaults: {
      ver: true,
      gap: 12,
      pad: 16,
      bg: '#1A1A1A',
      rad: 8,
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          between: true,
          align_cross: 'cen',
          pad_d: 8,
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 8,
        }
      },
      'Footer': {
        defaults: {
          hor: true,
          gap: 8,
          pad_u: 8,
        }
      }
    }
  },

  'Section': {
    defaults: {
      ver: true,
      gap: 16,
    },
    slots: {
      'Header': {
        defaults: {
          hor: true,
          between: true,
          align_cross: 'cen',
          pad_d: 8,
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 8,
        }
      }
    }
  },

  // ============================================
  // ALERT / TOAST
  // ============================================

  'Alert': {
    defaults: {
      hor: true,
      align_cross: 'cen',
      gap: 12,
      pad: 12,
      rad: 8,
    },
    slots: {
      'Icon': {
        defaults: {
          w: 20,
          h: 20,
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 4,
          w: 'max',
        }
      },
      'Actions': {
        defaults: {
          hor: true,
          gap: 8,
        }
      }
    }
  },

  'Toast': {
    defaults: {
      hor: true,
      align_cross: 'cen',
      gap: 12,
      pad: 12,
      bg: '#1A1A1A',
      rad: 8,
      shadow: 'md',
    },
    slots: {
      'Icon': {
        defaults: {
          w: 20,
          h: 20,
        }
      },
      'Content': {
        defaults: {
          ver: true,
          gap: 4,
          w: 'max',
        }
      },
      'Close': {
        defaults: {
          cursor: 'pointer',
          opacity: 0.6,
        }
      }
    }
  },

  // ============================================
  // STANDALONE COMPONENTS (ohne Slots)
  // ============================================

  'Footer': {
    defaults: {
      hor: true,
      align_cross: 'cen',
      align_main: 'cen',
      pad_u: 12,
      pad_d: 12,
      pad_l: 16,
      pad_r: 16,
      h: 48,
    }
  },

  'Badge': {
    defaults: {
      hor: true,
      align_main: 'cen',
      align_cross: 'cen',
      pad_u: 2,
      pad_d: 2,
      pad_l: 8,
      pad_r: 8,
      rad: 999,
      size: 12,
    }
  },

  'Avatar': {
    defaults: {
      w: 40,
      h: 40,
      rad: 999,
      bg: '#555',
      hor: true,
      align_main: 'cen',
      align_cross: 'cen',
    }
  },

  'Divider': {
    defaults: {
      h: 1,
      w: 'max',
      bg: '#333',
    }
  },

  'Spacer': {
    defaults: {
      w: 'max',
      h: 'max',
    }
  },

  'Stack': {
    defaults: {
      ver: true,
      gap: 8,
    }
  },

  'HStack': {
    defaults: {
      hor: true,
      gap: 8,
    }
  },

  'VStack': {
    defaults: {
      ver: true,
      gap: 8,
    }
  },

  'Center': {
    defaults: {
      hor: true,
      align_main: 'cen',
      align_cross: 'cen',
      w: 'max',
      h: 'max',
    }
  },

  'ButtonGroup': {
    defaults: {
      hor: true,
      gap: 8,
    }
  },

  'InputGroup': {
    defaults: {
      ver: true,
      gap: 4,
    }
  },

  'FormField': {
    defaults: {
      ver: true,
      gap: 4,
    }
  },
}

// ============================================
// Lookup Functions
// ============================================

// Set of all component names for quick lookup
export const LAYOUT_COMPONENT_NAMES = new Set(Object.keys(LAYOUT_COMPONENTS))

/**
 * Check if a component name has layout defaults
 */
export function hasLayoutDefaults(name: string): boolean {
  return LAYOUT_COMPONENT_NAMES.has(name)
}

/**
 * Get layout component definition
 */
export function getLayoutComponent(name: string): LayoutComponent | undefined {
  return LAYOUT_COMPONENTS[name]
}

/**
 * Get layout defaults for a component (without slot context)
 */
export function getLayoutDefaults(name: string): DSLProperties | undefined {
  return LAYOUT_COMPONENTS[name]?.defaults
}

/**
 * Check if a component has a specific slot
 */
export function hasLayoutSlot(parentName: string, slotName: string): boolean {
  const parent = LAYOUT_COMPONENTS[parentName]
  return parent?.slots?.[slotName] !== undefined
}

/**
 * Get slot defaults for a component within a parent context
 */
export function getSlotDefaults(parentName: string, slotName: string): DSLProperties | undefined {
  const parent = LAYOUT_COMPONENTS[parentName]
  return parent?.slots?.[slotName]?.defaults
}

/**
 * Apply layout defaults to a node.
 * Considers parent context for slot-based defaults.
 * User-specified properties take precedence.
 */
export function applyLayoutDefaultsToNode(
  name: string,
  parentName: string | undefined,
  userProps: DSLProperties
): DSLProperties {
  // First check if this is a slot of the parent
  if (parentName) {
    const slotDefaults = getSlotDefaults(parentName, name)
    if (slotDefaults) {
      return { ...slotDefaults, ...userProps }
    }
  }

  // Otherwise check for standalone component defaults
  const componentDefaults = getLayoutDefaults(name)
  if (componentDefaults) {
    return { ...componentDefaults, ...userProps }
  }

  return userProps
}
