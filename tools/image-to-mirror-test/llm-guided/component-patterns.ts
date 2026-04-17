/**
 * Component Pattern Recognition
 *
 * Maps semantic component types to Mirror code patterns
 * and provides fallback generation when pixel data is incomplete.
 */

import type { MergedElement, ComponentType, SemanticElement } from './schema'

// =============================================================================
// Component Pattern Definitions
// =============================================================================

export interface ComponentPattern {
  /** Default properties for this component type */
  defaults: Partial<MergedElement>
  /** Required child types/roles */
  expectedChildren?: string[]
  /** Code generation hints */
  codeHints: {
    primitive: string
    requiredProps?: string[]
    optionalProps?: string[]
  }
}

/**
 * Pattern definitions for common UI components
 */
export const COMPONENT_PATTERNS: Partial<Record<ComponentType, ComponentPattern>> = {
  Button: {
    defaults: {
      borderRadius: 6,
      padding: { top: 10, right: 20, bottom: 10, left: 20 },
    },
    codeHints: {
      primitive: 'Button',
      requiredProps: ['text'],
      optionalProps: ['bg', 'col', 'rad', 'pad'],
    },
  },

  IconButton: {
    defaults: {
      borderRadius: 6,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    expectedChildren: ['Icon'],
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['center'],
      optionalProps: ['bg', 'rad', 'w', 'h'],
    },
  },

  Input: {
    defaults: {
      borderRadius: 4,
      borderWidth: 1,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
    },
    codeHints: {
      primitive: 'Input',
      optionalProps: ['placeholder', 'bg', 'bor', 'boc', 'rad'],
    },
  },

  Card: {
    defaults: {
      borderRadius: 12,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  Dialog: {
    defaults: {
      borderRadius: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      gap: 16,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['center'],
      optionalProps: ['bg', 'rad', 'pad', 'gap', 'w'],
    },
  },

  Header: {
    defaults: {
      layout: 'horizontal',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor'],
      optionalProps: ['bg', 'pad', 'spread', 'ver-center'],
    },
  },

  Navigation: {
    defaults: {
      layout: 'vertical',
      gap: 4,
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'pad', 'gap'],
    },
  },

  Sidebar: {
    defaults: {
      layout: 'vertical',
      gap: 8,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['w', 'bg', 'pad', 'gap'],
    },
  },

  Form: {
    defaults: {
      layout: 'vertical',
      gap: 16,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  FormField: {
    defaults: {
      layout: 'vertical',
      gap: 4,
    },
    expectedChildren: ['Text', 'Input'],
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['gap'],
    },
  },

  Table: {
    defaults: {
      layout: 'vertical',
      gap: 0,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['gap 0'],
      optionalProps: ['bg', 'rad', 'clip'],
    },
  },

  Tabs: {
    defaults: {
      layout: 'vertical',
    },
    expectedChildren: ['TabBar', 'TabContent'],
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad'],
    },
  },

  Checkbox: {
    defaults: {
      borderRadius: 4,
      borderWidth: 1,
    },
    codeHints: {
      primitive: 'Checkbox',
      optionalProps: ['checked'],
    },
  },

  Switch: {
    defaults: {
      borderRadius: 12,
    },
    codeHints: {
      primitive: 'Switch',
      optionalProps: ['checked'],
    },
  },

  Select: {
    defaults: {
      borderRadius: 4,
      borderWidth: 1,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
    },
    codeHints: {
      primitive: 'Select',
      optionalProps: ['placeholder'],
    },
  },

  Icon: {
    defaults: {},
    codeHints: {
      primitive: 'Icon',
      requiredProps: ['name'],
      optionalProps: ['ic', 'is'],
    },
  },

  Text: {
    defaults: {},
    codeHints: {
      primitive: 'Text',
      requiredProps: ['content'],
      optionalProps: ['col', 'fs', 'weight'],
    },
  },

  Divider: {
    defaults: {
      backgroundColor: '#333333',
    },
    codeHints: {
      primitive: 'Divider',
      optionalProps: ['bg'],
    },
  },

  Container: {
    defaults: {},
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['hor', 'gap', 'pad', 'bg', 'rad'],
    },
  },

  // Additional UI Components

  Avatar: {
    defaults: {
      borderRadius: 99, // Full circle
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['center', 'rad 99'],
      optionalProps: ['w', 'h', 'bg'],
    },
  },

  Badge: {
    defaults: {
      borderRadius: 4,
      padding: { top: 4, right: 8, bottom: 4, left: 8 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad'],
    },
  },

  Toast: {
    defaults: {
      borderRadius: 12,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 12,
      layout: 'horizontal',
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor'],
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  Stepper: {
    defaults: {
      layout: 'horizontal',
      gap: 0,
    },
    expectedChildren: ['Step', 'Connector'],
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 0'],
      optionalProps: ['bg', 'pad'],
    },
  },

  Step: {
    defaults: {
      gap: 4,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['center', 'gap 4'],
    },
  },

  SearchBar: {
    defaults: {
      borderRadius: 8,
      layout: 'horizontal',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor'],
      optionalProps: ['bg', 'rad'],
    },
  },

  Breadcrumb: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8', 'ver-center'],
    },
  },

  ActionBar: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      borderRadius: 12,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor'],
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  EmptyState: {
    defaults: {
      gap: 16,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['center', 'gap 16'],
      optionalProps: ['bg', 'rad', 'pad'],
    },
  },

  MetricCard: {
    defaults: {
      borderRadius: 12,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  PricingCard: {
    defaults: {
      borderRadius: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      gap: 20,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  ChatMessage: {
    defaults: {
      layout: 'horizontal',
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 12'],
      optionalProps: ['bg', 'pad'],
    },
  },

  Bubble: {
    defaults: {
      borderRadius: 12,
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
      gap: 4,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  NavItem: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
      borderRadius: 6,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8'],
      optionalProps: ['bg', 'rad', 'pad'],
    },
  },

  ToggleRow: {
    defaults: {
      layout: 'horizontal',
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'spread', 'ver-center'],
      optionalProps: ['gap', 'pad'],
    },
  },

  TabBar: {
    defaults: {
      layout: 'horizontal',
      gap: 0,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 0'],
    },
  },

  Tab: {
    defaults: {
      padding: { top: 16, right: 24, bottom: 16, left: 24 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad'],
    },
  },

  TabContent: {
    defaults: {
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  FeatureList: {
    defaults: {
      gap: 12,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['gap 12'],
    },
  },

  Feature: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8', 'ver-center'],
    },
  },

  StatCard: {
    defaults: {
      borderRadius: 8,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 4,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  ProfileCard: {
    defaults: {
      borderRadius: 12,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      layout: 'horizontal',
      gap: 16,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor'],
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  TagGroup: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8', 'wrap'],
    },
  },

  Tag: {
    defaults: {
      borderRadius: 4,
      padding: { top: 6, right: 12, bottom: 6, left: 12 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad'],
    },
  },

  Separator: {
    defaults: {},
    codeHints: {
      primitive: 'Divider',
      optionalProps: ['bg'],
    },
  },

  Connector: {
    defaults: {},
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['w', 'h', 'bg'],
    },
  },

  Price: {
    defaults: {
      layout: 'horizontal',
      gap: 4,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 4', 'ver-center'],
    },
  },

  UserInfo: {
    defaults: {
      gap: 2,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['gap 2'],
    },
  },

  ButtonGroup: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8'],
    },
  },

  Dropdown: {
    defaults: {
      layout: 'horizontal',
      gap: 8,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'gap 8', 'center'],
    },
  },

  Link: {
    defaults: {},
    codeHints: {
      primitive: 'Link',
      optionalProps: ['col'],
    },
  },

  TableRow: {
    defaults: {
      layout: 'horizontal',
      padding: { top: 12, right: 16, bottom: 12, left: 16 },
    },
    codeHints: {
      primitive: 'Frame',
      requiredProps: ['hor', 'ver-center'],
      optionalProps: ['bg', 'pad'],
    },
  },

  SettingsPanel: {
    defaults: {
      borderRadius: 12,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      gap: 16,
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'rad', 'pad', 'gap'],
    },
  },

  Dashboard: {
    defaults: {
      gap: 16,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
    },
    codeHints: {
      primitive: 'Frame',
      optionalProps: ['bg', 'pad', 'gap'],
    },
  },
}

// =============================================================================
// Pattern Application
// =============================================================================

/**
 * Apply component pattern defaults to an element
 * Only fills in missing values, doesn't override existing ones
 */
export function applyComponentPattern(
  element: MergedElement,
  componentType?: ComponentType
): MergedElement {
  const type = componentType || element.type
  const pattern = COMPONENT_PATTERNS[type]

  if (!pattern) {
    return element
  }

  const enhanced = { ...element }

  // Apply defaults only for missing values
  const defaults = pattern.defaults

  if (defaults.borderRadius && !enhanced.borderRadius) {
    enhanced.borderRadius = defaults.borderRadius
  }

  if (defaults.padding && !enhanced.padding) {
    enhanced.padding = defaults.padding
  }

  if (defaults.gap && !enhanced.gap) {
    enhanced.gap = defaults.gap
  }

  if (defaults.layout && !enhanced.layout) {
    enhanced.layout = defaults.layout
  }

  if (defaults.borderWidth && !enhanced.borderWidth) {
    enhanced.borderWidth = defaults.borderWidth
  }

  if (defaults.backgroundColor && !enhanced.backgroundColor) {
    enhanced.backgroundColor = defaults.backgroundColor
  }

  return enhanced
}

/**
 * Get the primitive type for code generation
 */
export function getPrimitiveForType(type: ComponentType): string {
  const pattern = COMPONENT_PATTERNS[type]
  return pattern?.codeHints.primitive || 'Frame'
}

// =============================================================================
// Fallback Generation
// =============================================================================

/**
 * Generate Mirror code from semantic structure when pixel data is missing
 * Uses component patterns to fill in reasonable defaults
 */
export function generateFallbackCode(semantic: SemanticElement, indent = 0): string {
  const prefix = '  '.repeat(indent)
  const props: string[] = []

  // Get pattern for this component type
  const pattern = COMPONENT_PATTERNS[semantic.type]
  const primitive = pattern?.codeHints.primitive || 'Frame'

  // Add text content
  if (semantic.text) {
    if (primitive === 'Text' || primitive === 'Button') {
      props.push(`"${semantic.text}"`)
    }
  }

  // Add icon name
  if (semantic.iconName) {
    if (primitive === 'Icon') {
      props.push(`"${semantic.iconName}"`)
    }
  }

  // Add placeholder
  if (semantic.placeholder) {
    props.push(`placeholder "${semantic.placeholder}"`)
  }

  // Layout
  if (semantic.layout === 'horizontal') {
    props.push('hor')
  }
  if (semantic.layout === 'stacked') {
    props.push('stacked')
  }
  if (semantic.layout === 'grid') {
    props.push('grid')
  }

  // Gap from pattern defaults
  if (pattern?.defaults.gap) {
    props.push(`gap ${pattern.defaults.gap}`)
  }

  // Alignment
  if (semantic.alignment) {
    const alignments = Array.isArray(semantic.alignment) ? semantic.alignment : [semantic.alignment]
    props.push(...alignments)
  }

  // Grow/shrink
  if (semantic.grow) props.push('grow')
  if (semantic.shrink) props.push('shrink')

  // Pattern defaults for visual properties
  if (pattern?.defaults.borderRadius) {
    props.push(`rad ${pattern.defaults.borderRadius}`)
  }
  if (pattern?.defaults.padding) {
    const { top, right } = pattern.defaults.padding
    if (top === right) {
      props.push(`pad ${top}`)
    } else {
      props.push(`pad ${top} ${right}`)
    }
  }

  // Build line
  const line =
    props.length > 0 ? `${prefix}${primitive} ${props.join(', ')}` : `${prefix}${primitive}`

  const lines = [line]

  // Generate children
  if (semantic.children) {
    for (const child of semantic.children) {
      lines.push(generateFallbackCode(child, indent + 1))
    }
  }

  return lines.join('\n')
}

// =============================================================================
// Structure Matching
// =============================================================================

/**
 * Score how well a pixel element matches a semantic element
 * Higher score = better match
 */
export function calculateMatchScore(pixel: MergedElement, semantic: SemanticElement): number {
  let score = 0

  // Type match
  if (pixel.type === semantic.type) {
    score += 10
  }

  // Text match
  if (pixel.text && semantic.text) {
    if (
      pixel.text.toLowerCase().includes(semantic.text.toLowerCase()) ||
      semantic.text.toLowerCase().includes(pixel.text.toLowerCase())
    ) {
      score += 5
    }
  }

  // Layout match
  if (pixel.layout === semantic.layout) {
    score += 3
  }

  // Children count similarity
  const pixelChildCount = pixel.children?.length || 0
  const semanticChildCount = semantic.children?.length || 0
  if (pixelChildCount === semanticChildCount) {
    score += 2
  } else if (Math.abs(pixelChildCount - semanticChildCount) <= 1) {
    score += 1
  }

  return score
}

/**
 * Find the best matching pixel element for a semantic element
 * Uses scoring to handle structure mismatches
 */
export function findBestMatch(
  semantic: SemanticElement,
  pixelCandidates: MergedElement[]
): MergedElement | null {
  if (pixelCandidates.length === 0) return null

  let bestMatch: MergedElement | null = null
  let bestScore = -1

  for (const pixel of pixelCandidates) {
    const score = calculateMatchScore(pixel, semantic)
    if (score > bestScore) {
      bestScore = score
      bestMatch = pixel
    }
  }

  return bestMatch
}

/**
 * Recursively find all descendants of an element
 */
export function getAllDescendants(element: MergedElement): MergedElement[] {
  const descendants: MergedElement[] = []

  if (element.children) {
    for (const child of element.children) {
      descendants.push(child)
      descendants.push(...getAllDescendants(child))
    }
  }

  return descendants
}

// =============================================================================
// Component Type Detection
// =============================================================================

/**
 * Infer component type from visual properties when semantic type is generic
 */
export function inferComponentType(element: MergedElement): ComponentType {
  // Already has a specific type
  if (element.type && element.type !== 'Container') {
    return element.type
  }

  // Button-like: small, rounded, colored background, centered text
  if (
    element.borderRadius &&
    element.backgroundColor &&
    element.padding &&
    !element.children?.length
  ) {
    return 'Button'
  }

  // Input-like: has border, no background or light background
  if (element.borderWidth && element.borderColor && !element.backgroundColor) {
    return 'Input'
  }

  // Card-like: rounded, padded, has children
  if (
    element.borderRadius &&
    element.borderRadius >= 8 &&
    element.padding &&
    element.children?.length
  ) {
    return 'Card'
  }

  // Icon-like: small square, no text
  if (
    element.bounds.width &&
    element.bounds.height &&
    element.bounds.width <= 32 &&
    element.bounds.height <= 32 &&
    !element.text
  ) {
    return 'Icon'
  }

  // Text-like: has text content, no significant styling
  if (element.text && !element.backgroundColor && !element.borderRadius) {
    return 'Text'
  }

  // Default
  return 'Container'
}

// =============================================================================
// Role-based Styling Hints
// =============================================================================

export interface RoleStyling {
  suggestedColor?: string
  suggestedBackground?: string
  suggestedFontSize?: number
  suggestedFontWeight?: string
}

// =============================================================================
// Component Definition Generation
// =============================================================================

export interface ComponentDefinition {
  name: string
  baseType: string
  properties: string[]
  slots?: string[]
}

/**
 * Analyze structure and extract potential component definitions
 * that can be reused across the design
 */
export function extractComponentDefinitions(
  element: MergedElement,
  existingDefs: Map<string, ComponentDefinition> = new Map()
): ComponentDefinition[] {
  const definitions: ComponentDefinition[] = []

  // Check if this element could be a reusable component
  const defCandidate = analyzeForDefinition(element)
  if (defCandidate && !existingDefs.has(defCandidate.name)) {
    definitions.push(defCandidate)
    existingDefs.set(defCandidate.name, defCandidate)
  }

  // Recursively check children
  if (element.children) {
    for (const child of element.children) {
      definitions.push(...extractComponentDefinitions(child, existingDefs))
    }
  }

  return definitions
}

/**
 * Analyze an element to see if it should be extracted as a component definition
 */
function analyzeForDefinition(element: MergedElement): ComponentDefinition | null {
  // Skip simple text elements
  if (element.type === 'Text' || element.type === 'Icon') {
    return null
  }

  // Check if this is a known component pattern worth extracting
  const worthExtracting = [
    'Button',
    'Card',
    'Badge',
    'Avatar',
    'NavItem',
    'Tab',
    'Toast',
    'Dialog',
    'Input',
    'FormField',
    'Tag',
  ]

  if (!worthExtracting.includes(element.type as string)) {
    return null
  }

  // Build property list
  const props: string[] = []

  if (element.layout === 'horizontal') props.push('hor')
  if (element.gap) props.push(`gap ${element.gap}`)
  if (element.backgroundColor) props.push(`bg ${element.backgroundColor}`)
  if (element.borderRadius) props.push(`rad ${element.borderRadius}`)
  if (element.padding) {
    const { top, right } = element.padding
    if (top === right) {
      props.push(`pad ${top}`)
    } else {
      props.push(`pad ${top} ${right}`)
    }
  }
  if (element.borderWidth) {
    props.push(`bor ${element.borderWidth}`)
    if (element.borderColor) props.push(`boc ${element.borderColor}`)
  }

  // Only create definition if there are meaningful properties
  if (props.length < 2) {
    return null
  }

  // Generate component name
  const name = generateComponentName(element)

  return {
    name,
    baseType: getPrimitiveForType(element.type as ComponentType),
    properties: props,
  }
}

/**
 * Generate a meaningful component name from element type and properties
 */
function generateComponentName(element: MergedElement): string {
  const base = element.type || 'Component'

  // Add role modifier if present
  if (element.role) {
    const roleCapitalized = element.role.charAt(0).toUpperCase() + element.role.slice(1)
    return `${roleCapitalized}${base}`
  }

  return base as string
}

/**
 * Generate Mirror component definition code
 */
export function generateComponentDefinitionCode(defs: ComponentDefinition[]): string {
  if (defs.length === 0) return ''

  const lines: string[] = ['// Komponenten-Definitionen', '']

  for (const def of defs) {
    const propsStr = def.properties.join(', ')
    if (def.baseType === 'Frame') {
      lines.push(`${def.name}: ${propsStr}`)
    } else {
      lines.push(`${def.name} as ${def.baseType}: ${propsStr}`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

// =============================================================================
// Hierarchy Recognition
// =============================================================================

export interface HierarchyLevel {
  type: 'root' | 'section' | 'card' | 'list' | 'list-item' | 'group' | 'content'
  depth: number
  element: MergedElement
  children: HierarchyLevel[]
}

/**
 * Detect semantic nesting levels in the structure
 * Identifies: Card-in-Card, Section containers, List items, Header/Footer
 */
export function detectHierarchy(element: MergedElement, depth = 0): HierarchyLevel {
  const type = classifyHierarchyLevel(element, depth)

  const children: HierarchyLevel[] = []
  if (element.children) {
    for (const child of element.children) {
      children.push(detectHierarchy(child, depth + 1))
    }
  }

  return { type, depth, element, children }
}

/**
 * Classify an element's role in the hierarchy
 */
function classifyHierarchyLevel(element: MergedElement, depth: number): HierarchyLevel['type'] {
  if (depth === 0) return 'root'

  // Check if it's a card (has bg, radius, padding, children)
  const isCard = Boolean(
    element.backgroundColor &&
    element.borderRadius &&
    element.borderRadius > 0 &&
    element.padding &&
    element.children?.length
  )
  if (isCard) return 'card'

  // Check if it's a section (large container with gap, multiple children)
  const isSection = Boolean(
    element.gap && element.children && element.children.length >= 2 && !element.borderRadius
  )
  if (isSection) return 'section'

  // Check if it's a list (horizontal/vertical with uniform children)
  const isList = Boolean(
    element.gap &&
    element.children &&
    element.children.length >= 2 &&
    areChildrenUniform(element.children)
  )
  if (isList) return 'list'

  // Check if it's a list item (similar structure to siblings)
  if (element.type === 'ListItem' || element.role === 'item') return 'list-item'

  // Check if it's a group (horizontal with mixed content)
  if (element.layout === 'horizontal' && element.children?.length) return 'group'

  return 'content'
}

/**
 * Check if children have uniform structure (suggesting a list)
 */
function areChildrenUniform(children: MergedElement[]): boolean {
  if (children.length < 2) return false

  // Compare first two children for structural similarity
  const first = children[0]
  const second = children[1]

  // Same type
  if (first.type !== second.type) return false

  // Similar number of children
  const childDiff = Math.abs((first.children?.length || 0) - (second.children?.length || 0))
  if (childDiff > 1) return false

  // Similar layout
  if (first.layout !== second.layout) return false

  return true
}

/**
 * Mark nested cards to preserve hierarchy
 */
export function markNestedCards(element: MergedElement, insideCard = false): void {
  const isCard = Boolean(
    element.backgroundColor && element.borderRadius && element.borderRadius > 0 && element.padding
  )

  if (isCard && insideCard) {
    // Mark as nested card - should not be flattened
    element.role = element.role || 'nested-card'
  }

  if (element.children) {
    for (const child of element.children) {
      markNestedCards(child, isCard || insideCard)
    }
  }
}

// =============================================================================
// Component Variant Detection
// =============================================================================

export interface ComponentVariant {
  baseName: string
  variants: {
    name: string
    properties: string[]
    differingProps: string[]
  }[]
}

/**
 * Detect component variants (e.g., PrimaryButton, SecondaryButton)
 */
export function detectComponentVariants(definitions: ComponentDefinition[]): ComponentVariant[] {
  const variants: ComponentVariant[] = []
  const processed = new Set<string>()

  // Group by base type
  const byBaseType = new Map<string, ComponentDefinition[]>()
  for (const def of definitions) {
    const existing = byBaseType.get(def.baseType) || []
    existing.push(def)
    byBaseType.set(def.baseType, existing)
  }

  // Find variants within each base type
  for (const [baseType, defs] of byBaseType) {
    if (defs.length < 2) continue

    // Compare properties to find variants
    const groups = groupSimilarComponents(defs)

    for (const group of groups) {
      if (group.length < 2) continue

      const baseName = findCommonBaseName(group)
      const variantGroup: ComponentVariant = {
        baseName,
        variants: [],
      }

      // Find common properties
      const commonProps = findCommonProperties(group)

      for (const def of group) {
        if (processed.has(def.name)) continue
        processed.add(def.name)

        const differingProps = def.properties.filter(p => !commonProps.includes(p))

        variantGroup.variants.push({
          name: def.name,
          properties: def.properties,
          differingProps,
        })
      }

      if (variantGroup.variants.length >= 2) {
        variants.push(variantGroup)
      }
    }
  }

  return variants
}

/**
 * Group components with similar structure
 */
function groupSimilarComponents(defs: ComponentDefinition[]): ComponentDefinition[][] {
  const groups: ComponentDefinition[][] = []
  const used = new Set<number>()

  for (let i = 0; i < defs.length; i++) {
    if (used.has(i)) continue

    const group = [defs[i]]
    used.add(i)

    for (let j = i + 1; j < defs.length; j++) {
      if (used.has(j)) continue

      if (areSimilarComponents(defs[i], defs[j])) {
        group.push(defs[j])
        used.add(j)
      }
    }

    groups.push(group)
  }

  return groups
}

/**
 * Check if two components are similar (same structure, different colors/sizes)
 */
function areSimilarComponents(a: ComponentDefinition, b: ComponentDefinition): boolean {
  if (a.baseType !== b.baseType) return false

  // Count non-color/non-size properties
  const structuralProps = (props: string[]) =>
    props.filter(
      p =>
        !p.startsWith('bg ') &&
        !p.startsWith('col ') &&
        !p.startsWith('boc ') &&
        !p.startsWith('fs ')
    )

  const aStruct = structuralProps(a.properties)
  const bStruct = structuralProps(b.properties)

  // Similar if 50% or more structural props match
  const matching = aStruct.filter(p => bStruct.includes(p))
  const similarity = matching.length / Math.max(aStruct.length, bStruct.length, 1)

  return similarity >= 0.5
}

/**
 * Find common base name for variants
 */
function findCommonBaseName(defs: ComponentDefinition[]): string {
  if (defs.length === 0) return 'Component'

  // Try to find common prefix
  const names = defs.map(d => d.name)
  let commonPrefix = names[0]

  for (const name of names.slice(1)) {
    while (!name.startsWith(commonPrefix) && commonPrefix.length > 0) {
      commonPrefix = commonPrefix.slice(0, -1)
    }
  }

  // If no common prefix, use base type
  if (commonPrefix.length < 3) {
    return defs[0].baseType
  }

  return commonPrefix
}

/**
 * Find properties common to all variants
 */
function findCommonProperties(defs: ComponentDefinition[]): string[] {
  if (defs.length === 0) return []

  return defs[0].properties.filter(prop => defs.every(d => d.properties.includes(prop)))
}

/**
 * Generate Mirror code with base component and variants
 */
export function generateVariantCode(variant: ComponentVariant): string {
  const lines: string[] = []

  // Find common properties
  const commonProps = variant.variants[0].properties.filter(p =>
    variant.variants.every(v => v.properties.includes(p))
  )

  // Generate base component
  if (commonProps.length > 0) {
    lines.push(`${variant.baseName}: ${commonProps.join(', ')}`)

    // Generate variants that extend base
    for (const v of variant.variants) {
      const extraProps = v.differingProps.join(', ')
      if (extraProps) {
        lines.push(`${v.name} as ${variant.baseName}: ${extraProps}`)
      }
    }
  }

  return lines.join('\n')
}

// =============================================================================
// Role-based Styling
// =============================================================================

/**
 * Get styling hints based on element role
 */
export function getStylingForRole(role?: string): RoleStyling {
  if (!role) return {}

  switch (role) {
    // Text roles
    case 'heading':
      return { suggestedFontSize: 18, suggestedFontWeight: 'bold' }
    case 'subheading':
      return { suggestedFontSize: 16, suggestedFontWeight: '500' }
    case 'title':
      return { suggestedFontSize: 16, suggestedFontWeight: '500' }
    case 'description':
    case 'body':
    case 'message':
      return { suggestedFontSize: 14, suggestedColor: '#888888' }
    case 'label':
      return { suggestedFontSize: 12, suggestedColor: '#888888' }
    case 'caption':
    case 'timestamp':
      return { suggestedFontSize: 12, suggestedColor: '#666666' }
    case 'value':
    case 'metric':
      return { suggestedFontSize: 24, suggestedFontWeight: 'bold' }
    case 'name':
      return { suggestedFontSize: 14, suggestedFontWeight: '500' }
    case 'email':
    case 'role':
      return { suggestedFontSize: 12, suggestedColor: '#888888' }
    case 'current':
      return { suggestedFontSize: 14, suggestedColor: '#888888' }
    case 'plan':
      return { suggestedFontSize: 14, suggestedFontWeight: '500', suggestedColor: '#2271C1' }
    case 'comparison':
      return { suggestedFontSize: 11, suggestedColor: '#666666' }

    // Button roles
    case 'action':
    case 'submit':
    case 'primary':
    case 'cta':
      return { suggestedBackground: '#2271C1', suggestedColor: '#ffffff' }
    case 'cancel':
    case 'secondary':
      return { suggestedBackground: '#333333', suggestedColor: '#ffffff' }
    case 'danger':
      return { suggestedBackground: '#ef4444', suggestedColor: '#ffffff' }
    case 'close':
    case 'actions':
      return { suggestedColor: '#666666' }

    // Navigation roles
    case 'navigation':
    case 'link':
      return { suggestedFontSize: 14, suggestedColor: '#2271C1' }
    case 'active':
      return { suggestedBackground: '#2271C1', suggestedColor: '#ffffff' }

    // Status roles
    case 'status':
      return { suggestedFontSize: 10, suggestedColor: '#ffffff' }
    case 'trend':
      return { suggestedFontSize: 11 }
    case 'completed':
      return { suggestedBackground: '#10b981', suggestedColor: '#ffffff' }
    case 'pending':
      return { suggestedBackground: '#f59e0b', suggestedColor: '#ffffff' }

    // Special roles
    case 'profile':
    case 'bot':
      return { suggestedBackground: '#2271C1', suggestedColor: '#ffffff' }
    case 'illustration':
      return { suggestedColor: '#666666' }
    case 'search':
      return { suggestedColor: '#888888' }
    case 'filter':
      return { suggestedColor: '#888888', suggestedFontSize: 14 }

    default:
      return {}
  }
}
