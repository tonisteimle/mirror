/**
 * Data-driven mapping of DSL properties to their value pickers.
 * Replaces repetitive regex matching in PromptPanel.tsx slashKeymap.
 */

export type PropertyPickerType =
  | 'color'
  | 'font'
  | 'icon'
  | 'spacing'
  | 'value'

export interface PropertyPickerMapping {
  /** Properties that trigger this picker (matched with \b word boundary) */
  properties: string[]
  /** Which picker to open */
  picker: PropertyPickerType
  /** For spacing picker: which property context */
  spacingProperty?: 'pad' | 'mar' | 'gap'
  /** For value picker: which property to show values for */
  valueProperty?: string
}

/**
 * Mapping of DSL properties to their corresponding value pickers.
 * Uses long-form property names (padding, background, border-color).
 * Used by both Space keymap (after property) and Slash keymap (explicit trigger).
 */
export const PROPERTY_PICKER_MAP: PropertyPickerMapping[] = [
  // Color properties: color = text color, background = background color
  {
    properties: ['color', 'background', 'border-color', 'hover-color', 'hover-background', 'hover-border-color'],
    picker: 'color',
  },
  // Font property
  {
    properties: ['font'],
    picker: 'font',
  },
  // Spacing properties
  {
    properties: ['padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom'],
    picker: 'spacing',
    spacingProperty: 'pad',
  },
  {
    properties: ['margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'],
    picker: 'spacing',
    spacingProperty: 'mar',
  },
  {
    properties: ['gap'],
    picker: 'spacing',
    spacingProperty: 'gap',
  },
  // Value picker properties
  {
    properties: ['fit'],
    picker: 'value',
    valueProperty: 'fit',
  },
  {
    properties: ['type'],
    picker: 'value',
    valueProperty: 'type',
  },
  {
    properties: ['size'],
    picker: 'value',
    valueProperty: 'size',
  },
  {
    properties: ['radius'],
    picker: 'value',
    valueProperty: 'radius',
  },
  {
    properties: ['opacity'],
    picker: 'value',
    valueProperty: 'opacity',
  },
  {
    properties: ['line'],
    picker: 'value',
    valueProperty: 'line',
  },
]

/**
 * Find the picker mapping for a given property name.
 * @param property - The DSL property name (e.g., 'col', 'pad', 'font')
 * @returns The picker mapping or undefined if no picker is associated
 */
export function findPickerForProperty(property: string): PropertyPickerMapping | undefined {
  return PROPERTY_PICKER_MAP.find(mapping => mapping.properties.includes(property))
}

/**
 * Match a property at the end of text before cursor.
 * Returns the matched property and its picker mapping.
 */
export function matchPropertyAtEnd(textBefore: string): {
  property: string
  mapping: PropertyPickerMapping
} | null {
  // Match any property followed by optional whitespace at end
  const match = textBefore.match(/\b(\w+(?:-\w+)?)\s*$/)
  if (!match) return null

  const property = match[1]
  const mapping = findPickerForProperty(property)

  if (!mapping) return null

  return { property, mapping }
}

/**
 * Token section mappings for the tokens tab.
 * Maps section comments to appropriate pickers.
 */
export const TOKEN_SECTION_PICKERS: Array<{
  keywords: string[]
  picker: PropertyPickerType
  spacingProperty?: 'pad' | 'mar' | 'gap'
}> = [
  { keywords: ['farben', 'color'], picker: 'color' },
  { keywords: ['schriften', 'font'], picker: 'font' },
  { keywords: ['abstände', 'spacing', 'space'], picker: 'spacing', spacingProperty: 'pad' },
  { keywords: ['radien', 'radius'], picker: 'spacing', spacingProperty: 'pad' },
  { keywords: ['schriftgrössen', 'size'], picker: 'spacing', spacingProperty: 'pad' },
]

/**
 * Find picker for a token section.
 */
export function findPickerForTokenSection(
  sectionName: string
): { picker: PropertyPickerType; spacingProperty?: 'pad' | 'mar' | 'gap' } | null {
  const section = sectionName.toLowerCase()

  for (const mapping of TOKEN_SECTION_PICKERS) {
    if (mapping.keywords.some(keyword => section.includes(keyword))) {
      return { picker: mapping.picker, spacingProperty: mapping.spacingProperty }
    }
  }

  return null
}

/**
 * Regex patterns used in the editor.
 * DSL uses long-form property names (padding, background, border-color).
 * Centralized to avoid duplication.
 */
export const EDITOR_PATTERNS = {
  /** Match hex color in text */
  COLOR: /#[0-9A-Fa-f]{3,8}/g,
  /** Match component name at start of line with optional indent */
  COMPONENT_AT_START: /^(\s*)([A-Z][a-zA-Z0-9]*)$/,
  /** Match PascalCase component name */
  COMPONENT_NAME: /\b([A-Z][a-zA-Z0-9]+)\s*$/,
  /** Match value patterns (number, color, string, token) */
  AFTER_VALUE: /\s(\d+|#[0-9A-Fa-f]{3,8}|"[^"]*"|\$\w+)$/,
  /** Match no-value (boolean) properties at end - long-form names */
  AFTER_NO_VALUE_PROPERTY:
    /\s(horizontal|vertical|wrap|grow|full|scroll|scroll-x|scroll-y|clip|uppercase|truncate|horizontal-left|horizontal-center|horizontal-right|horizontal-between|vertical-top|vertical-center|vertical-bottom|vertical-between|center|between)$/,
  /** Match token definition in tokens tab */
  TOKEN_DEFINITION: /^\$[\w-]+:\s*$/,
  /** Match section comment */
  SECTION_COMMENT: /^\/\/\s*(.+)$/,
} as const

/**
 * Set of all known DSL properties that should trigger pickers.
 * DSL uses long-form property names with hyphens (padding-left, border-color).
 */
export const KNOWN_PROPERTIES = new Set([
  // Color properties: color = text color, background = background color
  'color', 'background', 'border-color',
  'hover-color', 'hover-background', 'hover-border-color',
  // Special pickers
  'font',
  // Spacing
  'padding', 'margin', 'gap',
  'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
  'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  // Value pickers
  'fit', 'type', 'size', 'radius', 'opacity', 'line',
  // Layout (no value picker)
  'horizontal', 'vertical', 'wrap', 'grow', 'shrink',
  // Alignment
  'horizontal-left', 'horizontal-center', 'horizontal-right', 'horizontal-between',
  'vertical-top', 'vertical-center', 'vertical-bottom', 'vertical-between',
  'center',
  // Size
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'full',
  // Overflow
  'scroll', 'scroll-x', 'scroll-y', 'clip',
  // Border
  'border', 'border-left', 'border-right', 'border-top', 'border-bottom',
  // Text
  'uppercase', 'truncate',
  // Image
  'src', 'alt',
  // Hover
  'hover-border',
])
