/**
 * Drag & Drop Constants
 *
 * Shared constants used across the drag-drop system.
 */

// ============================================
// Default Component Sizes
// ============================================

/**
 * Default sizes for components when dragged from the palette.
 * Used to create appropriately-sized ghost elements during drag operations.
 */
export const DEFAULT_COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  Frame: { width: 100, height: 100 },
  Text: { width: 100, height: 24 },
  Button: { width: 100, height: 40 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 80 },
  Icon: { width: 24, height: 24 },
  Image: { width: 100, height: 100 },
  default: { width: 100, height: 40 },
}

/**
 * Get the default size for a component by name.
 * Falls back to 'default' size if component is not in the lookup table.
 */
export function getDefaultComponentSize(componentName: string): { width: number; height: number } {
  return DEFAULT_COMPONENT_SIZES[componentName] || DEFAULT_COMPONENT_SIZES.default
}
