/**
 * Mirror Primitive Definitions
 *
 * Central definition of all primitives with their default styles.
 * These defaults are applied in the IR transformation and can be
 * overridden by component definitions or instance properties.
 *
 * Hierarchy (later overrides earlier):
 *   Primitive Defaults < Component Definition < Instance Properties
 */

/**
 * A default property value for a primitive.
 * Simplified structure without source position (defaults have no source).
 */
export interface DefaultProperty {
  name: string
  values: (string | number | boolean)[]
}

/**
 * Definition of a primitive element.
 */
export interface PrimitiveDefinition {
  /** HTML tag to render */
  tag: string
  /** Default properties applied to all instances */
  defaults: DefaultProperty[]
  /** Optional description for documentation */
  description?: string
}

/**
 * Design System Constants
 */
const COLORS = {
  bg: '#555',           // Medium gray background
  text: '#e4e4e7',      // Light text
}

const SIZES = {
  controlHeight: 36,    // Unified height for inputs, buttons
  radius: 6,            // Border radius
  font: 15,             // Base font size
  iconSize: 20,         // Icon size
}

/**
 * All primitive definitions.
 * Keys are lowercase primitive names.
 */
export const PRIMITIVES: Record<string, PrimitiveDefinition> = {
  // Container primitives
  box: {
    tag: 'div',
    defaults: [],
    description: 'Generic container, no default styling',
  },

  frame: {
    tag: 'div',
    defaults: [],
    description: 'Alias for box',
  },

  // Interactive primitives
  button: {
    tag: 'button',
    defaults: [
      { name: 'h', values: [SIZES.controlHeight] },
      { name: 'pad', values: [0, 16] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'col', values: [COLORS.text] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'cursor', values: ['pointer'] },
      { name: 'font', values: [SIZES.font] },
    ],
    description: 'Clickable button with default styling',
  },

  input: {
    tag: 'input',
    defaults: [
      { name: 'h', values: [SIZES.controlHeight] },
      { name: 'pad', values: [0, 12] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'col', values: [COLORS.text] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'w', values: [200] },
      { name: 'font', values: [SIZES.font] },
    ],
    description: 'Text input field',
  },

  textarea: {
    tag: 'textarea',
    defaults: [
      { name: 'pad', values: [10, 12] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'col', values: [COLORS.text] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'w', values: [200] },
      { name: 'h', values: [100] },
      { name: 'font', values: [SIZES.font] },
    ],
    description: 'Multi-line text input',
  },

  // Text primitives
  text: {
    tag: 'span',
    defaults: [
      { name: 'font', values: [SIZES.font] },
    ],
    description: 'Text element',
  },

  label: {
    tag: 'label',
    defaults: [
      { name: 'font', values: [SIZES.font] },
    ],
    description: 'Form label element',
  },

  // Media primitives
  image: {
    tag: 'img',
    defaults: [
      { name: 'w', values: [100] },
      { name: 'h', values: [100] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'rad', values: [SIZES.radius] },
    ],
    description: 'Image placeholder',
  },

  img: {
    tag: 'img',
    defaults: [
      { name: 'w', values: [100] },
      { name: 'h', values: [100] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'rad', values: [SIZES.radius] },
    ],
    description: 'Alias for image',
  },

  icon: {
    tag: 'span',
    defaults: [
      { name: 'w', values: [SIZES.iconSize] },
      { name: 'h', values: [SIZES.iconSize] },
    ],
    description: 'Icon element',
  },

  // Structural primitives
  slot: {
    tag: 'div',
    defaults: [],
    description: 'Slot placeholder for component composition',
  },

  divider: {
    tag: 'hr',
    defaults: [
      { name: 'w', values: ['full'] },
      { name: 'h', values: [1] },
      { name: 'bg', values: [COLORS.bg] },
      { name: 'bor', values: [0] },
    ],
    description: 'Horizontal divider line',
  },

  spacer: {
    tag: 'div',
    defaults: [
      { name: 'w', values: ['full'] },
      { name: 'h', values: ['full'] },
    ],
    description: 'Flexible spacer element',
  },
}

/**
 * Get primitive definition by name (case-insensitive).
 */
export function getPrimitive(name: string): PrimitiveDefinition | undefined {
  return PRIMITIVES[name.toLowerCase()]
}

/**
 * Check if a component name is a primitive.
 */
export function isPrimitive(name: string): boolean {
  return name.toLowerCase() in PRIMITIVES
}

/**
 * Get default properties for a primitive.
 * Returns empty array if not a primitive or no defaults.
 */
export function getPrimitiveDefaults(name: string): DefaultProperty[] {
  return PRIMITIVES[name.toLowerCase()]?.defaults || []
}

/**
 * Get HTML tag for a primitive.
 * Returns 'div' as fallback for unknown primitives.
 */
export function getPrimitiveTag(name: string): string {
  return PRIMITIVES[name.toLowerCase()]?.tag || 'div'
}
