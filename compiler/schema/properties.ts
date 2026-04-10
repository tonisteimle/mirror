/**
 * Mirror Property Schema
 *
 * Complete definition of all available properties for the property panel.
 * Each property has: name, aliases, type, category, and optional constraints.
 */

export type PropertyType =
  | 'boolean'      // No value needed (hidden, italic)
  | 'number'       // Numeric value (gap 16, opacity 0.5)
  | 'string'       // String value (font "Inter")
  | 'color'        // Color value (#fff, $token)
  | 'size'         // Size value (100, hug, full, 50%)
  | 'spacing'      // 1-4 values (pad 16, pad 8 16)
  | 'border'       // Border shorthand (1 solid #333)
  | 'enum'         // Fixed options (shadow: sm|md|lg)
  | 'direction'    // Direction modifier (pad left 16)

export interface PropertyDefinition {
  name: string
  aliases: string[]
  type: PropertyType
  category: PropertyCategory
  description: string
  defaultValue?: string | number | boolean
  options?: string[]           // For enum type
  min?: number                 // For number type
  max?: number                 // For number type
  unit?: string                // px, %, etc.
  directions?: string[]        // For directional properties (t, r, b, l, etc.)
}

export type PropertyCategory =
  | 'layout'
  | 'position'
  | 'alignment'
  | 'sizing'
  | 'spacing'
  | 'color'
  | 'border'
  | 'typography'
  | 'icon'
  | 'visual'
  | 'scroll'
  | 'hover'
  | 'content'

/**
 * All Mirror Properties organized by category
 */
export const properties: PropertyDefinition[] = [
  // ============================================
  // LAYOUT
  // ============================================
  {
    name: 'horizontal',
    aliases: ['hor'],
    type: 'boolean',
    category: 'layout',
    description: 'Horizontal layout (flex-direction: row)',
  },
  {
    name: 'vertical',
    aliases: ['ver'],
    type: 'boolean',
    category: 'layout',
    description: 'Vertical layout (flex-direction: column)',
  },
  {
    name: 'center',
    aliases: ['cen'],
    type: 'boolean',
    category: 'alignment',
    description: 'Center on both axes',
  },
  {
    name: 'gap',
    aliases: ['g'],
    type: 'number',
    category: 'layout',
    description: 'Gap between children',
    unit: 'px',
  },
  {
    name: 'spread',
    aliases: [],
    type: 'boolean',
    category: 'layout',
    description: 'Space-between distribution',
  },
  {
    name: 'wrap',
    aliases: [],
    type: 'boolean',
    category: 'layout',
    description: 'Allow flex wrap',
  },
  {
    name: 'stacked',
    aliases: [],
    type: 'boolean',
    category: 'layout',
    description: 'Stack children (z-layers)',
  },
  {
    name: 'grid',
    aliases: [],
    type: 'boolean',
    category: 'layout',
    description: 'Grid layout',
  },

  // ============================================
  // POSITION (Absolute Positioning)
  // ============================================
  {
    name: 'absolute',
    aliases: ['abs'],
    type: 'boolean',
    category: 'position',
    description: 'Absolute positioning (position: absolute)',
  },
  {
    name: 'x',
    aliases: [],
    type: 'number',
    category: 'position',
    description: 'Horizontal position (left)',
    unit: 'px',
  },
  {
    name: 'y',
    aliases: [],
    type: 'number',
    category: 'position',
    description: 'Vertical position (top)',
    unit: 'px',
  },
  // ============================================
  // ALIGNMENT
  // ============================================
  {
    name: 'left',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Align left',
  },
  {
    name: 'right',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Align right',
  },
  {
    name: 'hor-center',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Center horizontally',
  },
  {
    name: 'top',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Align top',
  },
  {
    name: 'bottom',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Align bottom',
  },
  {
    name: 'ver-center',
    aliases: [],
    type: 'boolean',
    category: 'alignment',
    description: 'Center vertically',
  },

  // ============================================
  // SIZING
  // ============================================
  {
    name: 'width',
    aliases: ['w'],
    type: 'size',
    category: 'sizing',
    description: 'Width (px, %, hug, full)',
  },
  {
    name: 'height',
    aliases: ['h'],
    type: 'size',
    category: 'sizing',
    description: 'Height (px, %, hug, full)',
  },
  {
    name: 'size',
    aliases: [],
    type: 'size',
    category: 'sizing',
    description: 'Width and height combined',
  },
  {
    name: 'min-width',
    aliases: ['minw'],
    type: 'number',
    category: 'sizing',
    description: 'Minimum width',
    unit: 'px',
  },
  {
    name: 'max-width',
    aliases: ['maxw'],
    type: 'number',
    category: 'sizing',
    description: 'Maximum width',
    unit: 'px',
  },
  {
    name: 'min-height',
    aliases: ['minh'],
    type: 'number',
    category: 'sizing',
    description: 'Minimum height',
    unit: 'px',
  },
  {
    name: 'max-height',
    aliases: ['maxh'],
    type: 'number',
    category: 'sizing',
    description: 'Maximum height',
    unit: 'px',
  },

  // ============================================
  // SPACING
  // ============================================
  {
    name: 'padding',
    aliases: ['pad', 'p'],
    type: 'spacing',
    category: 'spacing',
    description: 'Inner spacing',
    directions: ['top', 'right', 'bottom', 'left', 't', 'r', 'b', 'l'],
  },
  {
    name: 'margin',
    aliases: ['mar', 'm'],
    type: 'spacing',
    category: 'spacing',
    description: 'Outer spacing',
    directions: ['top', 'right', 'bottom', 'left', 't', 'r', 'b', 'l'],
  },

  // ============================================
  // COLOR
  // ============================================
  {
    name: 'color',
    aliases: ['col', 'c'],
    type: 'color',
    category: 'color',
    description: 'Text color',
  },
  {
    name: 'background',
    aliases: ['bg'],
    type: 'color',
    category: 'color',
    description: 'Background color',
  },
  {
    name: 'border-color',
    aliases: ['boc'],
    type: 'color',
    category: 'color',
    description: 'Border color',
  },

  // ============================================
  // BORDER
  // ============================================
  {
    name: 'border',
    aliases: ['bor'],
    type: 'border',
    category: 'border',
    description: 'Border (width style color)',
    directions: ['top', 'right', 'bottom', 'left', 't', 'r', 'b', 'l'],
  },
  {
    name: 'radius',
    aliases: ['rad'],
    type: 'number',
    category: 'border',
    description: 'Border radius',
    unit: 'px',
    directions: ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'],
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  {
    name: 'font-size',
    aliases: ['fs'],
    type: 'number',
    category: 'typography',
    description: 'Font size',
    unit: 'px',
  },
  {
    name: 'weight',
    aliases: [],
    type: 'enum',
    category: 'typography',
    description: 'Font weight',
    options: ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'bold'],
  },
  {
    name: 'line',
    aliases: [],
    type: 'number',
    category: 'typography',
    description: 'Line height',
  },
  {
    name: 'font',
    aliases: [],
    type: 'string',
    category: 'typography',
    description: 'Font family',
  },
  {
    name: 'text-align',
    aliases: [],
    type: 'enum',
    category: 'typography',
    description: 'Text alignment',
    options: ['left', 'center', 'right', 'justify'],
  },
  {
    name: 'italic',
    aliases: [],
    type: 'boolean',
    category: 'typography',
    description: 'Italic text',
  },
  {
    name: 'underline',
    aliases: [],
    type: 'boolean',
    category: 'typography',
    description: 'Underlined text',
  },
  {
    name: 'truncate',
    aliases: [],
    type: 'boolean',
    category: 'typography',
    description: 'Truncate with ellipsis',
  },
  {
    name: 'uppercase',
    aliases: [],
    type: 'boolean',
    category: 'typography',
    description: 'Uppercase text',
  },
  {
    name: 'lowercase',
    aliases: [],
    type: 'boolean',
    category: 'typography',
    description: 'Lowercase text',
  },

  // ============================================
  // ICON
  // ============================================
  {
    name: 'icon-size',
    aliases: ['is'],
    type: 'number',
    category: 'icon',
    description: 'Icon size',
    unit: 'px',
    defaultValue: 24,
  },
  {
    name: 'icon-weight',
    aliases: ['iw'],
    type: 'number',
    category: 'icon',
    description: 'Icon stroke weight',
    min: 100,
    max: 700,
    defaultValue: 400,
  },
  {
    name: 'icon-color',
    aliases: ['ic'],
    type: 'color',
    category: 'icon',
    description: 'Icon color (overrides color)',
  },
  {
    name: 'fill',
    aliases: [],
    type: 'boolean',
    category: 'icon',
    description: 'Filled icon variant',
  },

  // ============================================
  // VISUAL
  // ============================================
  {
    name: 'opacity',
    aliases: ['o'],
    type: 'number',
    category: 'visual',
    description: 'Opacity',
    min: 0,
    max: 1,
    defaultValue: 1,
  },
  {
    name: 'shadow',
    aliases: [],
    type: 'enum',
    category: 'visual',
    description: 'Box shadow',
    options: ['sm', 'md', 'lg', 'xl', 'none'],
  },
  {
    name: 'cursor',
    aliases: [],
    type: 'enum',
    category: 'visual',
    description: 'Cursor style',
    options: ['pointer', 'default', 'text', 'move', 'not-allowed', 'grab', 'grabbing'],
  },
  {
    name: 'z',
    aliases: [],
    type: 'number',
    category: 'visual',
    description: 'Z-index',
  },
  {
    name: 'hidden',
    aliases: [],
    type: 'boolean',
    category: 'visual',
    description: 'Hidden initially',
  },
  {
    name: 'visible',
    aliases: [],
    type: 'boolean',
    category: 'visual',
    description: 'Visible',
  },
  {
    name: 'disabled',
    aliases: [],
    type: 'boolean',
    category: 'visual',
    description: 'Disabled state',
  },
  {
    name: 'rotate',
    aliases: ['rot'],
    type: 'number',
    category: 'visual',
    description: 'Rotation in degrees',
    unit: 'deg',
  },

  // ============================================
  // SCROLL
  // ============================================
  {
    name: 'scroll',
    aliases: [],
    type: 'boolean',
    category: 'scroll',
    description: 'Vertical scroll',
  },
  {
    name: 'scroll-ver',
    aliases: [],
    type: 'boolean',
    category: 'scroll',
    description: 'Vertical scroll',
  },
  {
    name: 'scroll-hor',
    aliases: [],
    type: 'boolean',
    category: 'scroll',
    description: 'Horizontal scroll',
  },
  {
    name: 'scroll-both',
    aliases: [],
    type: 'boolean',
    category: 'scroll',
    description: 'Both directions scroll',
  },
  {
    name: 'clip',
    aliases: [],
    type: 'boolean',
    category: 'scroll',
    description: 'Overflow hidden',
  },

  // ============================================
  // HOVER
  // ============================================
  {
    name: 'hover-background',
    aliases: ['hover-bg'],
    type: 'color',
    category: 'hover',
    description: 'Background on hover',
  },
  {
    name: 'hover-color',
    aliases: ['hover-col'],
    type: 'color',
    category: 'hover',
    description: 'Text color on hover',
  },
  {
    name: 'hover-opacity',
    aliases: ['hover-opa'],
    type: 'number',
    category: 'hover',
    description: 'Opacity on hover',
    min: 0,
    max: 1,
  },
  {
    name: 'hover-scale',
    aliases: [],
    type: 'number',
    category: 'hover',
    description: 'Scale on hover',
  },
  {
    name: 'hover-border',
    aliases: ['hover-bor'],
    type: 'border',
    category: 'hover',
    description: 'Border on hover',
  },
  {
    name: 'hover-border-color',
    aliases: ['hover-boc'],
    type: 'color',
    category: 'hover',
    description: 'Border color on hover',
  },
  {
    name: 'hover-radius',
    aliases: ['hover-rad'],
    type: 'number',
    category: 'hover',
    description: 'Border radius on hover',
  },

  // ============================================
  // CONTENT (for primitives)
  // ============================================
  {
    name: 'content',
    aliases: [],
    type: 'string',
    category: 'content',
    description: 'Text content',
  },
  {
    name: 'placeholder',
    aliases: [],
    type: 'string',
    category: 'content',
    description: 'Input placeholder',
  },
  {
    name: 'src',
    aliases: [],
    type: 'string',
    category: 'content',
    description: 'Image source URL',
  },
  {
    name: 'href',
    aliases: [],
    type: 'string',
    category: 'content',
    description: 'Link URL',
  },
  {
    name: 'value',
    aliases: [],
    type: 'string',
    category: 'content',
    description: 'Input value',
  },
]

/**
 * Get properties by category
 */
export function getPropertiesByCategory(category: PropertyCategory): PropertyDefinition[] {
  return properties.filter(p => p.category === category)
}

/**
 * Get all categories with their properties
 */
export function getGroupedProperties(): Map<PropertyCategory, PropertyDefinition[]> {
  const grouped = new Map<PropertyCategory, PropertyDefinition[]>()

  for (const prop of properties) {
    const existing = grouped.get(prop.category) || []
    existing.push(prop)
    grouped.set(prop.category, existing)
  }

  return grouped
}

/**
 * Find property by name or alias
 */
export function findProperty(nameOrAlias: string): PropertyDefinition | undefined {
  return properties.find(p =>
    p.name === nameOrAlias || p.aliases.includes(nameOrAlias)
  )
}

/**
 * Category display names (for UI)
 */
export const categoryLabels: Record<PropertyCategory, string> = {
  layout: 'Layout',
  position: 'Position',
  alignment: 'Alignment',
  sizing: 'Size',
  spacing: 'Spacing',
  color: 'Color',
  border: 'Border',
  typography: 'Typography',
  icon: 'Icon',
  visual: 'Visual',
  scroll: 'Scroll',
  hover: 'Hover',
  content: 'Content',
}

/**
 * Category order for display
 */
export const categoryOrder: PropertyCategory[] = [
  'layout',
  'position',
  'alignment',
  'sizing',
  'spacing',
  'color',
  'border',
  'typography',
  'icon',
  'visual',
  'scroll',
  'hover',
  'content',
]
