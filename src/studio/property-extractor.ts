/**
 * PropertyExtractor - Extracts properties from AST for selected elements
 *
 * Reads properties for a selected element, resolving:
 * - Instance properties
 * - Component definition properties
 * - Inherited properties from parent components
 * - All available properties (from schema)
 */

import type { AST, ComponentDefinition, Instance, Property } from '../parser/ast'
import type { SourceMap, NodeMapping } from './source-map'
import {
  properties as allPropertyDefinitions,
  type PropertyDefinition,
  type PropertyCategory as SchemaCategory,
  categoryOrder,
  categoryLabels,
} from '../schema/properties'

/**
 * Property types for UI rendering
 */
export type PropertyType =
  | 'color'
  | 'size'
  | 'spacing'
  | 'boolean'
  | 'text'
  | 'number'
  | 'select'
  | 'unknown'

/**
 * Extracted property with metadata
 */
export interface ExtractedProperty {
  name: string
  value: string
  type: PropertyType
  source: 'instance' | 'component' | 'inherited' | 'available'
  line: number
  column: number
  isToken: boolean
  tokenName?: string
  hasValue: boolean           // Whether the property has a value set
  description?: string        // Property description from schema
  options?: string[]          // For select/enum properties
}

/**
 * Property category for grouping in UI
 */
export interface PropertyCategory {
  name: string
  label: string
  properties: ExtractedProperty[]
}

/**
 * Extracted element info
 */
export interface ExtractedElement {
  nodeId: string
  componentName: string
  instanceName?: string
  isDefinition: boolean
  isTemplateInstance: boolean  // Element from each loop
  templateId?: string          // Original template ID if isTemplateInstance
  categories: PropertyCategory[]
  allProperties: ExtractedProperty[]
  /** If true, shows all available properties (not just set ones) */
  showAllProperties?: boolean
}

/**
 * Property name to type mapping
 */
const PROPERTY_TYPES: Record<string, PropertyType> = {
  // Colors
  color: 'color',
  col: 'color',
  c: 'color',
  background: 'color',
  bg: 'color',
  'border-color': 'color',
  boc: 'color',
  'hover-bg': 'color',
  'hover-col': 'color',
  'hover-boc': 'color',

  // Sizes
  width: 'size',
  w: 'size',
  height: 'size',
  h: 'size',
  'min-width': 'size',
  minw: 'size',
  'max-width': 'size',
  maxw: 'size',
  'min-height': 'size',
  minh: 'size',
  'max-height': 'size',
  maxh: 'size',
  'font-size': 'size',
  fs: 'size',
  size: 'size',

  // Spacing
  padding: 'spacing',
  pad: 'spacing',
  p: 'spacing',
  margin: 'spacing',
  m: 'spacing',
  gap: 'spacing',
  g: 'spacing',

  // Numbers
  opacity: 'number',
  o: 'number',
  z: 'number',
  weight: 'number',
  line: 'number',
  radius: 'number',
  rad: 'number',
  border: 'number',
  bor: 'number',
  x: 'number',
  y: 'number',

  // Booleans
  horizontal: 'boolean',
  hor: 'boolean',
  vertical: 'boolean',
  ver: 'boolean',
  center: 'boolean',
  cen: 'boolean',
  spread: 'boolean',
  wrap: 'boolean',
  stacked: 'boolean',
  pos: 'boolean',
  positioned: 'boolean',
  grid: 'boolean',
  abs: 'boolean',
  absolute: 'boolean',
  hidden: 'boolean',
  visible: 'boolean',
  disabled: 'boolean',
  italic: 'boolean',
  underline: 'boolean',
  truncate: 'boolean',
  uppercase: 'boolean',
  lowercase: 'boolean',

  // Text
  content: 'text',
  placeholder: 'text',
  href: 'text',
  src: 'text',
  font: 'text',

  // Select
  cursor: 'select',
  shadow: 'select',
  'text-align': 'select',
}

/**
 * Property categories for UI grouping
 */
const CATEGORY_MAP: Record<string, string> = {
  // Layout
  horizontal: 'layout',
  hor: 'layout',
  vertical: 'layout',
  ver: 'layout',
  spread: 'layout',
  wrap: 'layout',
  stacked: 'layout',
  pos: 'layout',
  positioned: 'layout',
  grid: 'layout',
  gap: 'layout',
  g: 'layout',

  // Position (Absolute)
  abs: 'position',
  absolute: 'position',
  x: 'position',
  y: 'position',

  // Alignment
  center: 'alignment',
  cen: 'alignment',
  left: 'alignment',
  right: 'alignment',
  'hor-center': 'alignment',
  top: 'alignment',
  bottom: 'alignment',
  'ver-center': 'alignment',

  // Sizing (matches schema category 'sizing')
  width: 'sizing',
  w: 'sizing',
  height: 'sizing',
  h: 'sizing',
  'min-width': 'sizing',
  minw: 'sizing',
  'max-width': 'sizing',
  maxw: 'sizing',
  'min-height': 'sizing',
  minh: 'sizing',
  'max-height': 'sizing',
  maxh: 'sizing',
  size: 'sizing',

  // Spacing
  padding: 'spacing',
  pad: 'spacing',
  p: 'spacing',
  margin: 'spacing',
  m: 'spacing',

  // Color (matches schema category 'color')
  color: 'color',
  col: 'color',
  c: 'color',
  background: 'color',
  bg: 'color',
  'border-color': 'color',
  boc: 'color',

  // Border
  border: 'border',
  bor: 'border',
  radius: 'border',
  rad: 'border',

  // Typography
  'font-size': 'typography',
  fs: 'typography',
  weight: 'typography',
  line: 'typography',
  font: 'typography',
  'text-align': 'typography',
  italic: 'typography',
  underline: 'typography',
  truncate: 'typography',
  uppercase: 'typography',
  lowercase: 'typography',

  // Visual
  opacity: 'visual',
  o: 'visual',
  shadow: 'visual',
  cursor: 'visual',
  z: 'visual',
}

const CATEGORY_LABELS: Record<string, string> = {
  layout: 'Layout',
  position: 'Position',
  alignment: 'Alignment',
  sizing: 'Size',
  spacing: 'Spacing',
  color: 'Color',
  border: 'Border',
  typography: 'Typography',
  visual: 'Visual',
  hover: 'Hover',
  other: 'Other',
}

/**
 * Component-specific categories - which property categories are relevant for each primitive
 */
const COMPONENT_CATEGORIES: Record<string, string[]> = {
  // Text: typography-focused, no layout properties
  text: ['typography', 'color', 'spacing', 'sizing', 'visual', 'hover'],

  // Icon: similar to text but with icon category
  icon: ['icon', 'color', 'sizing', 'spacing', 'visual', 'hover'],

  // Box/Frame: full layout capabilities
  box: ['layout', 'position', 'alignment', 'sizing', 'spacing', 'color', 'border', 'visual', 'scroll', 'hover'],
  frame: ['layout', 'position', 'alignment', 'sizing', 'spacing', 'color', 'border', 'visual', 'scroll', 'hover'],

  // Slot: placeholder, sizing and spacing
  slot: ['sizing', 'spacing', 'color', 'border', 'visual'],

  // Input: form element
  input: ['typography', 'color', 'sizing', 'spacing', 'border', 'visual', 'hover'],

  // Button: like text but with more visual
  button: ['typography', 'color', 'sizing', 'spacing', 'border', 'visual', 'hover'],

  // Image: sizing focused
  image: ['sizing', 'spacing', 'border', 'visual', 'hover'],
  img: ['sizing', 'spacing', 'border', 'visual', 'hover'],

  // Default: show all
  default: ['layout', 'position', 'alignment', 'sizing', 'spacing', 'color', 'border', 'typography', 'icon', 'visual', 'scroll', 'hover'],
}

/**
 * Get relevant categories for a component type
 */
function getComponentCategories(componentName: string): string[] {
  const primitive = componentName.toLowerCase()
  return COMPONENT_CATEGORIES[primitive] || COMPONENT_CATEGORIES['default']
}

/**
 * PropertyExtractor class
 */
export class PropertyExtractor {
  private ast: AST
  private sourceMap: SourceMap
  private componentMap: Map<string, ComponentDefinition> = new Map()
  private showAllProperties: boolean = true

  constructor(ast: AST, sourceMap: SourceMap, options?: { showAllProperties?: boolean }) {
    this.ast = ast
    this.sourceMap = sourceMap
    this.showAllProperties = options?.showAllProperties ?? true

    // Build component lookup
    for (const comp of ast.components) {
      this.componentMap.set(comp.name, comp)
    }
  }

  /**
   * Set whether to show all available properties or only set ones
   */
  setShowAllProperties(show: boolean): void {
    this.showAllProperties = show
  }

  /**
   * Get all properties for a node
   */
  getProperties(nodeId: string): ExtractedElement | null {
    // Check if this is a template instance (e.g., node-5[2])
    const isTemplateInstance = this.sourceMap.isTemplateInstance(nodeId)
    const templateId = isTemplateInstance ? this.sourceMap.getTemplateId(nodeId) : undefined

    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      console.warn(`[PropertyExtractor] Node not found in SourceMap: ${nodeId}`)
      return null
    }

    // Find the AST node (instance or component definition)
    const astNode = this.findAstNode(nodeMapping)
    if (!astNode) {
      console.warn(`[PropertyExtractor] AST node not found for: ${nodeId} at line ${nodeMapping.position.line}`)
      return null
    }

    // Extract properties
    const allProperties: ExtractedProperty[] = []

    // Instance properties
    if ('properties' in astNode) {
      for (const prop of astNode.properties) {
        allProperties.push(this.extractProperty(prop, 'instance'))
      }
    }

    // Component definition properties (if applicable)
    if (!nodeMapping.isDefinition) {
      const componentDef = this.componentMap.get(nodeMapping.componentName)
      if (componentDef) {
        const inheritedProps = this.getInheritedProperties(componentDef)
        for (const prop of inheritedProps) {
          // Skip if already defined in instance
          if (!allProperties.some(p => p.name === prop.name)) {
            allProperties.push(prop)
          }
        }
      }
    }

    // Add all available properties from schema (if enabled)
    if (this.showAllProperties) {
      this.addAvailableProperties(allProperties, nodeMapping.componentName)
    }

    // Group into categories
    const categories = this.showAllProperties
      ? this.categorizeAllProperties(allProperties)
      : this.categorizeProperties(allProperties)

    return {
      nodeId,
      componentName: nodeMapping.componentName,
      instanceName: nodeMapping.instanceName,
      isDefinition: nodeMapping.isDefinition,
      isTemplateInstance,
      templateId,
      categories,
      allProperties,
      showAllProperties: this.showAllProperties,
    }
  }

  /**
   * Get properties for a component definition by name
   * Used when clicking on a component definition line in the editor
   */
  getPropertiesForComponentDefinition(componentName: string): ExtractedElement | null {
    const componentDef = this.componentMap.get(componentName)
    if (!componentDef) {
      console.warn(`[PropertyExtractor] Component definition not found: ${componentName}`)
      return null
    }

    // Extract properties from the component definition
    const allProperties: ExtractedProperty[] = []

    // Component's own properties
    for (const prop of componentDef.properties) {
      allProperties.push(this.extractProperty(prop, 'component'))
    }

    // Inherited properties
    const inheritedProps = this.getInheritedProperties(componentDef)
    for (const prop of inheritedProps) {
      // Skip if already defined in component
      if (!allProperties.some(p => p.name === prop.name)) {
        allProperties.push(prop)
      }
    }

    // Add all available properties from schema (if enabled)
    if (this.showAllProperties) {
      this.addAvailableProperties(allProperties, componentName)
    }

    // Group into categories
    const categories = this.showAllProperties
      ? this.categorizeAllProperties(allProperties)
      : this.categorizeProperties(allProperties)

    return {
      nodeId: componentDef.nodeId || `def-${componentName}`,
      componentName: componentName,
      instanceName: undefined,
      isDefinition: true,
      isTemplateInstance: false,
      templateId: undefined,
      categories,
      allProperties,
      showAllProperties: this.showAllProperties,
    }
  }

  /**
   * Add all available properties from schema (not already set)
   * Filters based on component type to show only relevant properties
   */
  private addAvailableProperties(existingProps: ExtractedProperty[], componentName: string): void {
    const existingNames = new Set(existingProps.map(p => p.name))

    // Get relevant categories for this component type
    const relevantCategories = getComponentCategories(componentName)

    // Also track aliases
    for (const prop of existingProps) {
      const def = allPropertyDefinitions.find(d =>
        d.name === prop.name || d.aliases.includes(prop.name)
      )
      if (def) {
        existingNames.add(def.name)
        def.aliases.forEach(a => existingNames.add(a))
      }
    }

    for (const propDef of allPropertyDefinitions) {
      // Skip if already exists (including aliases)
      if (existingNames.has(propDef.name)) continue

      // Skip if category is not relevant for this component
      if (!relevantCategories.includes(propDef.category)) continue

      // Create empty property placeholder
      existingProps.push({
        name: propDef.name,
        value: '',
        type: this.schemaTypeToPropertyType(propDef.type),
        source: 'available',
        line: 0,
        column: 0,
        isToken: false,
        hasValue: false,
        description: propDef.description,
        options: propDef.options,
      })
    }
  }

  /**
   * Convert schema type to PropertyType
   */
  private schemaTypeToPropertyType(type: string): PropertyType {
    switch (type) {
      case 'color': return 'color'
      case 'number': return 'number'
      case 'size': return 'size'
      case 'spacing': return 'spacing'
      case 'boolean': return 'boolean'
      case 'string': return 'text'
      case 'enum': return 'select'
      case 'border': return 'number'
      default: return 'unknown'
    }
  }

  /**
   * Categorize properties using schema categories (for all properties mode)
   */
  private categorizeAllProperties(properties: ExtractedProperty[]): PropertyCategory[] {
    const categoryMap = new Map<string, ExtractedProperty[]>()

    for (const prop of properties) {
      // Find category from schema
      const schemaProp = allPropertyDefinitions.find(d =>
        d.name === prop.name || d.aliases.includes(prop.name)
      )
      const category = schemaProp?.category || 'other'

      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(prop)
    }

    // Convert to array using schema category order
    const categories: PropertyCategory[] = []

    for (const catName of categoryOrder) {
      const props = categoryMap.get(catName)
      if (props && props.length > 0) {
        // Sort: properties with values first
        props.sort((a, b) => {
          if (a.hasValue !== false && b.hasValue === false) return -1
          if (a.hasValue === false && b.hasValue !== false) return 1
          return 0
        })

        categories.push({
          name: catName,
          label: categoryLabels[catName] || catName,
          properties: props,
        })
      }
    }

    // Add 'other' category if exists
    const otherProps = categoryMap.get('other')
    if (otherProps && otherProps.length > 0) {
      categories.push({
        name: 'other',
        label: 'Other',
        properties: otherProps,
      })
    }

    return categories
  }

  /**
   * Get a specific property value
   */
  getProperty(nodeId: string, propName: string): ExtractedProperty | null {
    const element = this.getProperties(nodeId)
    if (!element) return null

    return element.allProperties.find(p => p.name === propName) || null
  }

  /**
   * Find AST node from source map mapping
   */
  private findAstNode(mapping: NodeMapping): Instance | ComponentDefinition | null {
    // Search in instances
    for (const inst of this.ast.instances) {
      const found = this.findInInstance(inst, mapping)
      if (found) return found
    }

    // Search in component definitions
    if (mapping.isDefinition) {
      return this.componentMap.get(mapping.componentName) || null
    }

    return null
  }

  /**
   * Recursively find an instance matching the mapping
   */
  private findInInstance(inst: Instance | any, mapping: NodeMapping): Instance | null {
    // Check if this instance matches
    if (inst.line === mapping.position.line && inst.column === mapping.position.column) {
      return inst as Instance
    }

    // Search children
    if (inst.children) {
      for (const child of inst.children) {
        if (child.type === 'Instance') {
          const found = this.findInInstance(child, mapping)
          if (found) return found
        }
      }
    }

    return null
  }

  /**
   * Get inherited properties from component chain
   */
  private getInheritedProperties(comp: ComponentDefinition): ExtractedProperty[] {
    const props: ExtractedProperty[] = []

    // Get parent properties first
    if (comp.extends) {
      const parent = this.componentMap.get(comp.extends)
      if (parent) {
        props.push(...this.getInheritedProperties(parent))
      }
    }

    // Add this component's properties
    for (const prop of comp.properties) {
      const extracted = this.extractProperty(prop, comp.extends ? 'inherited' : 'component')
      // Override parent properties with same name
      const existingIndex = props.findIndex(p => p.name === extracted.name)
      if (existingIndex >= 0) {
        props[existingIndex] = extracted
      } else {
        props.push(extracted)
      }
    }

    return props
  }

  /**
   * Extract a property with full metadata
   */
  private extractProperty(
    prop: Property,
    source: 'instance' | 'component' | 'inherited'
  ): ExtractedProperty {
    // Resolve value
    let value = ''
    let isToken = false
    let tokenName: string | undefined

    if (prop.values.length === 0) {
      // Boolean property
      value = 'true'
    } else if (prop.values.length === 1) {
      const val = prop.values[0]
      if (typeof val === 'object' && 'kind' in val && val.kind === 'token') {
        isToken = true
        tokenName = val.name
        value = `$${val.name}`
      } else {
        value = String(val)
      }
    } else {
      // Multiple values
      value = prop.values
        .map(v => {
          if (typeof v === 'object' && 'kind' in v && v.kind === 'token') {
            return `$${v.name}`
          }
          return String(v)
        })
        .join(' ')

      // Check if any value is a token
      for (const v of prop.values) {
        if (typeof v === 'object' && 'kind' in v && v.kind === 'token') {
          isToken = true
          tokenName = v.name
          break
        }
      }
    }

    // Get description and options from schema
    const schemaProp = allPropertyDefinitions.find(d =>
      d.name === prop.name || d.aliases.includes(prop.name)
    )

    return {
      name: prop.name,
      value,
      type: this.getPropertyType(prop.name),
      source,
      line: prop.line,
      column: prop.column,
      isToken,
      tokenName,
      hasValue: true,
      description: schemaProp?.description,
      options: schemaProp?.options,
    }
  }

  /**
   * Get the type of a property
   */
  private getPropertyType(name: string): PropertyType {
    return PROPERTY_TYPES[name] || 'unknown'
  }

  /**
   * Group properties into categories
   */
  private categorizeProperties(properties: ExtractedProperty[]): PropertyCategory[] {
    const categoryMap = new Map<string, ExtractedProperty[]>()

    for (const prop of properties) {
      const category = CATEGORY_MAP[prop.name] || 'other'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(prop)
    }

    // Convert to array with labels (matches schema categoryOrder)
    const categories: PropertyCategory[] = []
    const order = ['layout', 'position', 'alignment', 'sizing', 'spacing', 'color', 'border', 'typography', 'visual', 'hover', 'other']

    for (const name of order) {
      const props = categoryMap.get(name)
      if (props && props.length > 0) {
        categories.push({
          name,
          label: CATEGORY_LABELS[name] || name,
          properties: props,
        })
      }
    }

    return categories
  }

  /**
   * Update the AST reference
   */
  updateAST(ast: AST): void {
    this.ast = ast
    this.componentMap.clear()
    for (const comp of ast.components) {
      this.componentMap.set(comp.name, comp)
    }
  }

  /**
   * Update the source map reference
   */
  updateSourceMap(sourceMap: SourceMap): void {
    this.sourceMap = sourceMap
  }
}

/**
 * Create a PropertyExtractor
 */
export function createPropertyExtractor(ast: AST, sourceMap: SourceMap): PropertyExtractor {
  return new PropertyExtractor(ast, sourceMap)
}
