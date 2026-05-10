/**
 * Mirror Primitive Definitions
 *
 * Default styles for primitives, applied in IR transformation.
 * Primitive names and HTML tags come from the schema (src/schema/dsl.ts).
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
 *
 * Note: Background colors are now controlled via CSS (mirror-defaults.css)
 * to allow proper theming with CSS custom properties.
 */
const SIZES = {
  controlHeight: 36, // Unified height for inputs, buttons
  radius: 6, // Border radius
  iconSize: 24, // Icon size — Slice 50 V-1 canonical (matches CLAUDE.md DSL doc)
  // Note: font size is inherited from App, not set per-primitive
}

/**
 * Slice 50 V-1: Single source of truth for Icon defaults.
 *
 * Pre-Slice-50 hatte 7 unterschiedliche Default-Quellen für `is`/`iw`:
 * - properties.ts default `icon-size: 24`
 * - primitives.ts `SIZES.iconSize: 20` (jetzt 24)
 * - value-resolver.ts:276 `data-icon-size: '16'` (hardcoded)
 * - icons.ts:166 runtime fallback `'16'`
 * - icons.ts:168 weight fallback `'2'`
 * - state-machine-emitter.ts + emit-loops.ts `|| '16'`
 * - mirror-runtime.ts:1212 `?? 24`
 *
 * Mit ICON_DEFAULTS lesen alle aus einer Quelle. Pick-Begründung:
 * - size=24: CLAUDE.md DSL doc canonical, properties.ts canonical
 * - weight=2: Lucide stroke-width canonical (NICHT 400 — das war
 *   Copy-Paste vom font-weight-Schema)
 * - color='currentColor': inheritance-friendly, matches CSS color
 * - fill=false: outline-Variante ist Lucide-Standard
 */
export const ICON_DEFAULTS = {
  size: 24,
  weight: 2,
  color: 'currentColor',
  fill: false,
} as const

export function getIconDefault<K extends keyof typeof ICON_DEFAULTS>(
  key: K
): (typeof ICON_DEFAULTS)[K] {
  return ICON_DEFAULTS[key]
}

/**
 * All primitive definitions.
 * Keys are lowercase primitive names.
 */
export const PRIMITIVES: Record<string, PrimitiveDefinition> = {
  // Container primitives
  // (Frame is canonical in dsl.ts; Box is its alias. Both share the same
  //  empty defaults — listed twice because primitive lookup happens by
  //  lowercased instance name without alias resolution.)
  frame: {
    tag: 'div',
    defaults: [],
    description: 'Generic container, no default styling',
  },

  box: {
    tag: 'div',
    defaults: [],
    description: 'Alias for frame',
  },

  // Interactive primitives
  button: {
    tag: 'button',
    defaults: [
      { name: 'w', values: ['hug'] },
      { name: 'h', values: [SIZES.controlHeight] },
      { name: 'minw', values: [SIZES.controlHeight] }, // Prevent buttons from being too narrow
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
      // Slice 50 V-1: w/h match ICON_DEFAULTS.size so the span and the
      // SVG-inside size identically. Pre-fix had span=20px, SVG=16px,
      // schema-doc=24px — three different sizes for the same icon.
      { name: 'w', values: [ICON_DEFAULTS.size] },
      { name: 'h', values: [ICON_DEFAULTS.size] },
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
 * Get default properties for a primitive.
 * Returns empty array if not a primitive or no defaults.
 */
export function getPrimitiveDefaults(name: string): DefaultProperty[] {
  return PRIMITIVES[name.toLowerCase()]?.defaults || []
}
