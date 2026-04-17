/**
 * Mirror Primitive Definitions
 *
 * Default styles for primitives, applied in IR transformation.
 * Primitive names and HTML tags come from the schema (src/schema/dsl.ts).
 *
 * Hierarchy (later overrides earlier):
 *   Primitive Defaults < Component Definition < Instance Properties
 */

import { DSL, isPrimitive as schemaIsPrimitive, getPrimitiveDef } from './dsl'

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
 *
 * Note: Background colors are now controlled via CSS (mirror-defaults.css)
 * to allow proper theming with CSS custom properties.
 */
const SIZES = {
  controlHeight: 36, // Unified height for inputs, buttons
  radius: 6, // Border radius
  iconSize: 20, // Icon size
  // Note: font size is inherited from App, not set per-primitive
}

/**
 * All primitive definitions.
 * Keys are lowercase primitive names.
 */
export const PRIMITIVES: Record<string, PrimitiveDefinition> = {
  // App container (root element)
  app: {
    tag: 'div',
    defaults: [
      { name: 'w', values: ['full'] },
      { name: 'h', values: ['full'] },
      { name: 'font', values: ['roboto'] },
      { name: 'fs', values: [14] },
    ],
    description: 'Root application container, full width and height by default',
  },

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
      { name: 'w', values: ['hug'] },
      { name: 'h', values: [SIZES.controlHeight] },
      { name: 'pad', values: [0, 16] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'cursor', values: ['pointer'] },
      // bg, col via CSS (mirror-defaults.css)
    ],
    description: 'Clickable button with default styling',
  },

  input: {
    tag: 'input',
    defaults: [
      { name: 'h', values: [SIZES.controlHeight] },
      { name: 'pad', values: [0, 12] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'w', values: [200] },
      // bg, col via CSS (mirror-defaults.css)
    ],
    description: 'Text input field',
  },

  textarea: {
    tag: 'textarea',
    defaults: [
      { name: 'pad', values: [10, 12] },
      { name: 'rad', values: [SIZES.radius] },
      { name: 'bor', values: [0] },
      { name: 'w', values: [200] },
      { name: 'h', values: [100] },
      // bg, col via CSS (mirror-defaults.css)
    ],
    description: 'Multi-line text input',
  },

  // Text primitives
  text: {
    tag: 'span',
    defaults: [
      // font inherited from parent (App)
    ],
    description: 'Text element',
  },

  label: {
    tag: 'label',
    defaults: [
      { name: 'w', values: ['hug'] },
      // font inherited from parent (App)
    ],
    description: 'Form label element',
  },

  link: {
    tag: 'a',
    defaults: [
      { name: 'w', values: ['hug'] },
      { name: 'cursor', values: ['pointer'] },
    ],
    description: 'Anchor link element',
  },

  // Media primitives
  image: {
    tag: 'img',
    defaults: [
      { name: 'w', values: [100] },
      { name: 'h', values: [100] },
      { name: 'rad', values: [SIZES.radius] },
      // bg via CSS (mirror-defaults.css)
    ],
    description: 'Image placeholder',
  },

  img: {
    tag: 'img',
    defaults: [
      { name: 'w', values: [100] },
      { name: 'h', values: [100] },
      { name: 'rad', values: [SIZES.radius] },
      // bg via CSS (mirror-defaults.css)
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
      { name: 'bor', values: [0] },
      // bg via CSS (mirror-defaults.css)
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

  // Headings - should hug content width
  h1: {
    tag: 'h1',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 1',
  },

  h2: {
    tag: 'h2',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 2',
  },

  h3: {
    tag: 'h3',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 3',
  },

  h4: {
    tag: 'h4',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 4',
  },

  h5: {
    tag: 'h5',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 5',
  },

  h6: {
    tag: 'h6',
    defaults: [{ name: 'w', values: ['hug'] }],
    description: 'Heading level 6',
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
 * Delegates to the schema for the source of truth.
 */
export function isPrimitive(name: string): boolean {
  // Use schema as source of truth, but also check local PRIMITIVES for defaults
  return schemaIsPrimitive(name) || name.toLowerCase() in PRIMITIVES
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
 * Uses schema as source of truth, falls back to local definition or 'div'.
 */
export function getPrimitiveTag(name: string): string {
  // First check schema
  const schemaDef = getPrimitiveDef(name)
  if (schemaDef) return schemaDef.html

  // Then check local definition
  return PRIMITIVES[name.toLowerCase()]?.tag || 'div'
}
