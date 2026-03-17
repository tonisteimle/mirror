/**
 * Central Icon System
 *
 * Single source of truth for ALL icons in Mirror Studio.
 * Consolidates icons from multiple previous sources.
 */

// =============================================================================
// LAYOUT ICONS (24x24, stroke-based)
// Used in: Components Panel Layout Presets, Property Panel Layout Mode
// =============================================================================

export const LAYOUT_ICONS = {
  /** Absolute/Free positioning - dashed rect with positioned circles */
  absolute: `<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"></rect><circle cx="8" cy="8" r="2" fill="currentColor"></circle><circle cx="16" cy="14" r="2" fill="currentColor"></circle>`,

  /** Vertical layout (V-Box) - rect with horizontal dividers */
  vbox: `<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M21 9H3"></path><path d="M21 15H3"></path>`,

  /** Horizontal layout (H-Box) - rect with vertical dividers */
  hbox: `<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path><path d="M15 3v18"></path>`,

  /** ZStack - overlapping rectangles */
  zstack: `<rect x="3" y="3" width="14" height="14" rx="2"></rect><rect x="7" y="7" width="14" height="14" rx="2"></rect>`,

  /** Grid layout - 2x2 squares */
  grid: `<rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="3" width="8" height="8" rx="1"></rect><rect x="3" y="13" width="8" height="8" rx="1"></rect><rect x="13" y="13" width="8" height="8" rx="1"></rect>`,

  /** Sidebar layout */
  sidebar: `<rect x="3" y="3" width="18" height="18" rx="1"></rect><rect x="4" y="4" width="4" height="16"></rect>`,

  /** Header/Footer layout */
  headerfooter: `<rect x="3" y="3" width="18" height="18" rx="1"></rect><rect x="4" y="4" width="16" height="3"></rect>`,
} as const

// =============================================================================
// COMPONENT ICONS (24x24, stroke-based)
// Used in: Components Panel Primitives
// =============================================================================

export const COMPONENT_ICONS = {
  /** Box/Container */
  box: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>`,

  /** Button */
  button: `<rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect>`,

  /** Text element */
  text: `<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line>`,

  /** Input field */
  input: `<rect x="3" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="7" y1="12" x2="11" y2="12"></line>`,

  /** Icon element (star) */
  icon: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>`,

  /** Image element */
  image: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>`,

  /** Slot placeholder */
  slot: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="4 2"></rect><line x1="8" y1="12" x2="16" y2="12"></line>`,
} as const

// =============================================================================
// PROPERTY ICONS (14x14)
// Used in: Property Panel controls (padding, borders, shadows, etc.)
// =============================================================================

export const PROPERTY_ICONS: Record<string, string> = {
  // Layout Direction
  horizontal: `<rect x="2" y="6" width="2" height="3" rx="0.5" fill="currentColor"/><rect x="6" y="6" width="2" height="3" rx="0.5" fill="currentColor"/><rect x="10" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>`,
  vertical: `<rect x="6" y="2" width="3" height="2" rx="0.5" fill="currentColor"/><rect x="6" y="6" width="3" height="2" rx="0.5" fill="currentColor"/><rect x="6" y="10" width="3" height="2" rx="0.5" fill="currentColor"/>`,

  // Center & Spread
  center: `<rect x="5" y="5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>`,
  spread: `<rect x="2" y="5" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="10" y="5" width="2" height="4" rx="0.5" fill="currentColor"/><path d="M5 7h4" stroke="currentColor" stroke-width="0.75" stroke-dasharray="1 1"/>`,

  // Wrap
  wrap: `<rect x="2" y="3" width="2" height="2" rx="0.5" fill="currentColor"/><rect x="5.5" y="3" width="2" height="2" rx="0.5" fill="currentColor"/><rect x="9" y="3" width="2" height="2" rx="0.5" fill="currentColor"/><rect x="2" y="9" width="2" height="2" rx="0.5" fill="currentColor"/><rect x="5.5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/><path d="M12 4 L12 7 L3 7" stroke="currentColor" stroke-width="0.75" fill="none" stroke-linecap="round"/>`,

  // Stacked & Grid
  stacked: `<rect x="1" y="1" width="10" height="6" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="3" y="5" width="10" height="6" rx="0.5" fill="currentColor"/>`,
  grid: `<rect x="2" y="2" width="3" height="3" rx="0.5" fill="currentColor"/><rect x="8" y="2" width="3" height="3" rx="0.5" fill="currentColor"/><rect x="2" y="8" width="3" height="3" rx="0.5" fill="currentColor"/><rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor"/>`,

  // Size constraints
  'min-width': `<path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/><path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1"/>`,
  'max-width': `<path d="M5 7 L2 4.5 L2 9.5 Z" fill="currentColor"/><path d="M9 7 L12 4.5 L12 9.5 Z" fill="currentColor"/><line x1="2" y1="7" x2="5" y2="7" stroke="currentColor" stroke-width="1"/><line x1="9" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1"/>`,
  'min-height': `<path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/><path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/><line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1"/>`,
  'max-height': `<path d="M7 5 L4.5 2 L9.5 2 Z" fill="currentColor"/><path d="M7 9 L4.5 12 L9.5 12 Z" fill="currentColor"/><line x1="7" y1="2" x2="7" y2="5" stroke="currentColor" stroke-width="1"/><line x1="7" y1="9" x2="7" y2="12" stroke="currentColor" stroke-width="1"/>`,

  // Layout section icon
  'layout': `<path d="M7 2 L5 4 L6.25 4 L6.25 6.25 L4 6.25 L4 5 L2 7 L4 9 L4 7.75 L6.25 7.75 L6.25 10 L5 10 L7 12 L9 10 L7.75 10 L7.75 7.75 L10 7.75 L10 9 L12 7 L10 5 L10 6.25 L7.75 6.25 L7.75 4 L9 4 L7 2 Z" fill="currentColor"/>`,

  // Padding direction icons
  'pad-v': `<path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/><path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/><line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>`,
  'pad-h': `<path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/><path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>`,
  'pad-t': `<path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/><line x1="7" y1="5" x2="7" y2="12" stroke="currentColor" stroke-width="1.5"/>`,
  'pad-r': `<path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/><line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>`,
  'pad-b': `<path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/><line x1="7" y1="2" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>`,
  'pad-l': `<path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/><line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>`,

  // Border icons
  'border': `<rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  'border-t': `<line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 2 L2 12 L12 12 L12 2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  'border-r': `<line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 2 L2 2 L2 12 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  'border-b': `<line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 12 L2 2 L12 2 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  'border-l': `<line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 2 L12 2 L12 12 L2 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Border styles
  'border-solid': `<line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>`,
  'border-dashed': `<line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>`,
  'border-dotted': `<line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 1.5" stroke-linecap="round"/>`,
  'radius': `<path d="M2 10 L2 5 Q2 2 5 2 L10 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

  // Typography - Text alignment
  'text-left': `<line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'text-center': `<line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2.5" y1="11" x2="11.5" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'text-right': `<line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'text-justify': `<line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // Typography - Text styles
  'italic': `<text x="4" y="11" font-size="10" font-style="italic" font-family="serif" fill="currentColor">I</text>`,
  'underline': `<text x="4" y="10" font-size="9" font-family="sans-serif" fill="currentColor">U</text><line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1"/>`,
  'truncate': `<text x="2" y="9" font-size="8" font-family="sans-serif" fill="currentColor">Ab</text><text x="9" y="9" font-size="8" font-family="sans-serif" fill="currentColor">...</text>`,
  'uppercase': `<text x="2" y="10" font-size="8" font-weight="bold" font-family="sans-serif" fill="currentColor">AA</text>`,
  'lowercase': `<text x="2" y="10" font-size="8" font-family="sans-serif" fill="currentColor">aa</text>`,

  // Visual - Shadow levels
  'shadow-none': `<rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>`,
  'shadow-sm': `<rect x="4" y="4" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.2"/><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>`,
  'shadow-md': `<rect x="5" y="5" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>`,
  'shadow-lg': `<rect x="5" y="5" width="8" height="8" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>`,

  // Visual - Visibility
  'hidden': `<line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'visible': `<ellipse cx="7" cy="7" rx="5" ry="3.5" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>`,
  'disabled': `<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1" fill="none"/><line x1="3.5" y1="10.5" x2="10.5" y2="3.5" stroke="currentColor" stroke-width="1"/>`,
} as const

// =============================================================================
// UI ICONS (24x24, stroke-based)
// Used in: General UI elements
// =============================================================================

export const UI_ICONS = {
  /** Chevron down */
  chevronDown: `<path d="M6 9l6 6 6-6"></path>`,

  /** Chevron right */
  chevronRight: `<path d="M9 6l6 6-6 6"></path>`,

  /** Plus */
  plus: `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,

  /** Close/X */
  close: `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`,

  /** Search */
  search: `<circle cx="11" cy="11" r="6"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>`,

  /** Folder */
  folder: `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>`,

  /** File */
  file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>`,
} as const

// =============================================================================
// TYPES
// =============================================================================

export type LayoutIconName = keyof typeof LAYOUT_ICONS
export type ComponentIconName = keyof typeof COMPONENT_ICONS
export type PropertyIconName = keyof typeof PROPERTY_ICONS
export type UIIconName = keyof typeof UI_ICONS

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get layout icon SVG (24x24, stroke-based)
 */
export function getLayoutIcon(name: LayoutIconName, className?: string): string {
  const classAttr = className ? ` class="${className}"` : ''
  return `<svg${classAttr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LAYOUT_ICONS[name]}</svg>`
}

/**
 * Get component icon SVG (24x24, stroke-based)
 */
export function getComponentIcon(name: ComponentIconName, className?: string): string {
  const classAttr = className ? ` class="${className}"` : ''
  return `<svg${classAttr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COMPONENT_ICONS[name]}</svg>`
}

/**
 * Get property icon SVG (14x14)
 */
export function getPropertyIcon(name: PropertyIconName, className?: string): string {
  const classAttr = className ? ` class="${className}"` : ''
  return `<svg${classAttr} viewBox="0 0 14 14">${PROPERTY_ICONS[name]}</svg>`
}

/**
 * Get UI icon SVG (24x24, stroke-based)
 */
export function getUIIcon(name: UIIconName, className?: string): string {
  const classAttr = className ? ` class="${className}"` : ''
  return `<svg${classAttr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${UI_ICONS[name]}</svg>`
}

// =============================================================================
// BACKWARDS COMPATIBILITY
// =============================================================================

/** @deprecated Use PROPERTY_ICONS instead */
export const PROPERTY_ICON_PATHS = PROPERTY_ICONS

/** @deprecated Use getLayoutIcon instead */
export function getIcon(name: LayoutIconName, className?: string): string {
  return getLayoutIcon(name, className)
}

/** @deprecated Use LAYOUT_ICONS instead */
export const ICONS = LAYOUT_ICONS
