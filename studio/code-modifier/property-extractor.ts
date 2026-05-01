/**
 * PropertyExtractor - Extracts properties from AST for selected elements
 *
 * Reads properties for a selected element, resolving:
 * - Instance properties
 * - Component definition properties
 * - Inherited properties from parent components
 * - All available properties (from schema)
 */

import type {
  AST,
  ComponentDefinition,
  Instance,
  Property,
  ZagNode,
  Event,
  Action,
} from '../../compiler/parser/ast'
import type { SourceMap, NodeMapping } from '../../compiler/ir/source-map'
import {
  properties as allPropertyDefinitions,
  type PropertyDefinition,
  type PropertyCategory as SchemaCategory,
  categoryOrder,
  categoryLabels,
} from '../../compiler/schema/properties'
import { isZagPrimitive } from '../../compiler/schema/zag-primitives'
import { logPropertyExtractor as log } from '../../compiler/utils/logger'
import {
  getZagPropMetadata,
  hasZagPropMetadata,
  type ZagPropMeta,
} from '../../compiler/schema/zag-prop-metadata'

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
  hasValue: boolean // Whether the property has a value set
  description?: string // Property description from schema
  options?: string[] // For select/enum properties
  category?: string // Override category (e.g., 'behavior' for Zag props)
  label?: string // Human-readable label (e.g., "Close on Select")
  min?: number // For number validation/slider
  max?: number // For number validation/slider
  step?: number // For slider step
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
 * Extracted interaction (toggle, exclusive, select)
 */
export interface ExtractedInteraction {
  name: 'toggle' | 'exclusive' | 'select'
  arguments?: string[]
  line: number
  column: number
}

/**
 * Extracted action within an event
 */
export interface ExtractedAction {
  name: string // 'toggle', 'show', 'hide', 'navigate', etc.
  target?: string // target element name
  arguments?: string[]
  isFunctionCall: boolean // true for toggle(), false for legacy syntax
  line: number
  column: number
}

/**
 * Extracted event with its actions
 */
export interface ExtractedEvent {
  name: string // 'onclick', 'onhover', 'onkeydown', etc.
  key?: string // for keyboard events (e.g., 'enter', 'escape')
  actions: ExtractedAction[]
  line: number
  column: number
}

/**
 * Extracted element info
 */
export interface ExtractedElement {
  nodeId: string
  componentName: string
  instanceName?: string
  isDefinition: boolean
  isTemplateInstance: boolean // Element from each loop
  templateId?: string // Original template ID if isTemplateInstance
  categories: PropertyCategory[]
  allProperties: ExtractedProperty[]
  /** If true, shows all available properties (not just set ones) */
  showAllProperties?: boolean
  /** Interactions (toggle, exclusive, select) */
  interactions: ExtractedInteraction[]
  /** Events (onclick, onhover, etc.) with their actions */
  events: ExtractedEvent[]
}

/**
 * Convert a schema PropertyType (boolean/number/string/color/size/spacing/
 * border/enum/direction) to the UI PropertyType (boolean/number/text/color/
 * size/spacing/select). Direction collapses to size; border collapses to
 * number. The string-to-text rename is the only renaming, the rest are
 * 1:1 or coerced for UI rendering.
 */
function schemaTypeToUIType(type: string): PropertyType {
  switch (type) {
    case 'color':
      return 'color'
    case 'size':
    case 'direction':
      return 'size'
    case 'spacing':
      return 'spacing'
    case 'boolean':
      return 'boolean'
    case 'number':
    case 'border':
      return 'number'
    case 'string':
      return 'text'
    case 'enum':
      return 'select'
    default:
      return 'unknown'
  }
}

/**
 * UI-only PropertyType overrides — properties whose schema type
 * (input shape) differs from the UI grouping that the property panel
 * should render. Schema is the source of truth; this map exists only
 * because a few properties (gap) are technically a single number but
 * the panel groups them visually with spacing controls.
 */
const PROPERTY_TYPE_UI_OVERRIDES: Record<string, PropertyType> = {
  gap: 'spacing',
  g: 'spacing',
}

/**
 * Property name → UI PropertyType. Derived from the schema (single source
 * of truth in `compiler/schema/properties.ts`). Each schema property
 * registers under its canonical name and every alias.
 */
const PROPERTY_TYPES: Record<string, PropertyType> = (() => {
  const map: Record<string, PropertyType> = {}
  for (const def of allPropertyDefinitions) {
    const ui = schemaTypeToUIType(def.type)
    map[def.name] = ui
    for (const alias of def.aliases) map[alias] = ui
  }
  for (const [name, override] of Object.entries(PROPERTY_TYPE_UI_OVERRIDES)) {
    map[name] = override
  }
  return map
})()

/**
 * Property name → category for UI grouping. Derived from the schema
 * (single source of truth in `compiler/schema/properties.ts`). Each
 * schema property registers under its canonical name and every alias.
 */
const CATEGORY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const def of allPropertyDefinitions) {
    map[def.name] = def.category
    for (const alias of def.aliases) map[alias] = def.category
  }
  return map
})()

/** Category name for Zag behavior properties */
const BEHAVIOR_CATEGORY = 'behavior' as const

/**
 * UI labels for category groups. Schema-derived labels (Layout, Color,
 * Typography, …) come from `categoryLabels` in the schema; the two
 * extras (`behavior` for Zag props, `other` for un-categorised) are
 * UI-only.
 */
const CATEGORY_LABELS: Record<string, string> = {
  ...categoryLabels,
  [BEHAVIOR_CATEGORY]: 'Behavior',
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
  box: [
    'layout',
    'position',
    'alignment',
    'sizing',
    'spacing',
    'color',
    'border',
    'visual',
    'scroll',
    'hover',
  ],
  frame: [
    'layout',
    'position',
    'alignment',
    'sizing',
    'spacing',
    'color',
    'border',
    'visual',
    'scroll',
    'hover',
  ],

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
  default: [
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
  ],
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
      log.warn('Node not found in SourceMap:', nodeId)
      return null
    }

    // Find the AST node (instance or component definition)
    const astNode = this.findAstNode(nodeMapping)
    if (!astNode) {
      log.warn('AST node not found for:', nodeId, 'at line', nodeMapping.position.line)
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

    // Add behavior props for components with metadata (Zag primitives, Pure Mirror components)
    if (
      isZagPrimitive(nodeMapping.componentName) ||
      astNode.type === 'ZagComponent' ||
      hasZagPropMetadata(nodeMapping.componentName)
    ) {
      const behaviorProps = this.extractZagBehaviorProps(
        nodeMapping.componentName,
        astNode as Instance | ZagNode
      )
      allProperties.push(...behaviorProps)
    }

    // Group into categories
    const categories = this.showAllProperties
      ? this.categorizeAllProperties(allProperties)
      : this.categorizeProperties(allProperties)

    // Extract interactions and events
    const interactions = this.extractInteractions(astNode as Instance | ComponentDefinition)
    const events = this.extractEvents(astNode as Instance | ComponentDefinition)

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
      interactions,
      events,
    }
  }

  /**
   * Get properties for a component definition by name
   * Used when clicking on a component definition line in the editor
   */
  getPropertiesForComponentDefinition(componentName: string): ExtractedElement | null {
    const componentDef = this.componentMap.get(componentName)
    if (!componentDef) {
      log.warn('Component definition not found:', componentName)
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

    // Add behavior props for components with metadata (Zag primitives, Pure Mirror components)
    if (isZagPrimitive(componentName) || hasZagPropMetadata(componentName)) {
      const behaviorProps = this.extractZagBehaviorPropsFromDef(componentName, componentDef)
      allProperties.push(...behaviorProps)
    }

    // Group into categories
    const categories = this.showAllProperties
      ? this.categorizeAllProperties(allProperties)
      : this.categorizeProperties(allProperties)

    // Extract interactions and events
    const interactions = this.extractInteractions(componentDef)
    const events = this.extractEvents(componentDef)

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
      interactions,
      events,
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
      const def = allPropertyDefinitions.find(
        d => d.name === prop.name || d.aliases.includes(prop.name)
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
   * Convert schema PropertyType to UI PropertyType — delegates to the
   * module-level `schemaTypeToUIType` so PROPERTY_TYPES (derived map)
   * and per-call conversion stay in lockstep.
   */
  private schemaTypeToPropertyType(type: string): PropertyType {
    return schemaTypeToUIType(type)
  }

  /**
   * Categorize properties using schema categories (for all properties mode)
   */
  private categorizeAllProperties(properties: ExtractedProperty[]): PropertyCategory[] {
    const categoryMap = new Map<string, ExtractedProperty[]>()

    for (const prop of properties) {
      // Use prop.category if set, otherwise look up in schema
      let category = prop.category
      if (!category) {
        const schemaProp = allPropertyDefinitions.find(
          d => d.name === prop.name || d.aliases.includes(prop.name)
        )
        category = schemaProp?.category || 'other'
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(prop)
    }

    // Convert to array using schema category order (behavior FIRST for Zag components)
    const categories: PropertyCategory[] = []
    const extendedOrder = [BEHAVIOR_CATEGORY, ...categoryOrder]

    for (const catName of extendedOrder) {
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
          label:
            CATEGORY_LABELS[catName] ||
            (categoryLabels as Record<string, string>)[catName] ||
            catName,
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
  private findAstNode(mapping: NodeMapping): Instance | ComponentDefinition | ZagNode | null {
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
   * Recursively find an instance or ZagNode matching the mapping
   */
  private findInInstance(
    inst: Instance | ZagNode | any,
    mapping: NodeMapping
  ): Instance | ZagNode | null {
    // Check if this is a ZagComponent at top level
    if (inst.type === 'ZagComponent') {
      if (inst.line === mapping.position.line && inst.column === mapping.position.column) {
        return inst as ZagNode
      }
      // ZagComponents don't have nested children to search
      return null
    }

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
        } else if (child.type === 'ZagComponent') {
          // Check if this ZagNode matches
          if (child.line === mapping.position.line && child.column === mapping.position.column) {
            return child as ZagNode
          }
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
    const schemaProp = allPropertyDefinitions.find(
      d => d.name === prop.name || d.aliases.includes(prop.name)
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
      // Use prop.category if set (e.g., for Zag behavior props), otherwise lookup in CATEGORY_MAP
      const category = prop.category || CATEGORY_MAP[prop.name] || 'other'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(prop)
    }

    // Convert to array with labels (behavior FIRST for Zag components)
    const categories: PropertyCategory[] = []
    const order = [
      BEHAVIOR_CATEGORY,
      'layout',
      'position',
      'alignment',
      'sizing',
      'spacing',
      'color',
      'border',
      'typography',
      'visual',
      'hover',
      'other',
    ]

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

  /**
   * Extract Zag behavior properties from an instance or ZagNode
   */
  private extractZagBehaviorProps(
    componentName: string,
    astNode: Instance | ZagNode
  ): ExtractedProperty[] {
    return this.extractZagBehaviorPropsGeneric(componentName, astNode.properties, 'instance')
  }

  /**
   * Extract Zag behavior properties from a component definition
   */
  private extractZagBehaviorPropsFromDef(
    componentName: string,
    componentDef: ComponentDefinition
  ): ExtractedProperty[] {
    return this.extractZagBehaviorPropsGeneric(componentName, componentDef.properties, 'component')
  }

  /**
   * Generic extraction of Zag behavior properties
   */
  private extractZagBehaviorPropsGeneric(
    componentName: string,
    properties: Property[],
    sourceType: 'instance' | 'component'
  ): ExtractedProperty[] {
    const metadata = getZagPropMetadata(componentName)
    if (!metadata) return []

    // Build a map of current property values for dependency checking
    const currentValues = new Map<string, string | boolean>()
    for (const prop of properties) {
      if (prop.values.length === 0) {
        currentValues.set(prop.name, true)
      } else {
        currentValues.set(prop.name, String(prop.values[0]))
      }
    }

    // Get hidden properties based on dependencies
    const hiddenProps = this.getHiddenBehaviorProps(componentName, currentValues)

    const props: ExtractedProperty[] = []

    for (const [propName, meta] of Object.entries(metadata)) {
      // Skip hidden properties
      if (hiddenProps.has(propName)) continue

      const astProp = properties.find(p => p.name === propName)

      props.push({
        name: propName,
        value: astProp
          ? this.getPropertyValueString(astProp)
          : meta.default !== undefined
            ? String(meta.default)
            : '',
        type: this.zagTypeToPropertyType(meta.type),
        source: astProp ? sourceType : 'available',
        line: astProp?.line ?? 0,
        column: astProp?.column ?? 0,
        isToken: false,
        hasValue: !!astProp,
        description: meta.description,
        options: meta.options,
        category: BEHAVIOR_CATEGORY,
        label: meta.label,
        min: meta.min,
        max: meta.max,
        step: meta.step,
      })
    }

    return props
  }

  /**
   * Determine which behavior properties should be hidden based on current values
   * Handles mutually exclusive and dependent properties
   */
  private getHiddenBehaviorProps(
    componentName: string,
    currentValues: Map<string, string | boolean>
  ): Set<string> {
    const hidden = new Set<string>()

    // Select-specific rules
    if (componentName === 'Select' || componentName === 'Combobox' || componentName === 'Listbox') {
      const isMultiple =
        currentValues.get('multiple') === true || currentValues.get('multiple') === 'true'

      if (isMultiple) {
        // When multiple is true, these don't apply
        hidden.add('closeOnSelect') // Dropdown should stay open for multiple selection
        hidden.add('deselectable') // Always deselectable in multiple mode
      }

      // open vs defaultOpen: show only one
      const hasOpen = currentValues.has('open')
      const hasDefaultOpen = currentValues.has('defaultOpen')

      if (hasOpen) {
        hidden.add('defaultOpen') // Controlled mode - defaultOpen irrelevant
      } else if (hasDefaultOpen) {
        hidden.add('open') // Uncontrolled mode - open would override
      }
    }

    // Accordion-specific rules
    if (componentName === 'Accordion') {
      const isMultiple =
        currentValues.get('multiple') === true || currentValues.get('multiple') === 'true'

      if (isMultiple) {
        hidden.add('collapsible') // Always collapsible in multiple mode
      }
    }

    // Dialog/Popover open state rules
    if (componentName === 'Dialog' || componentName === 'Popover' || componentName === 'Tooltip') {
      const hasOpen = currentValues.has('open')
      const hasDefaultOpen = currentValues.has('defaultOpen')

      if (hasOpen) {
        hidden.add('defaultOpen')
      } else if (hasDefaultOpen) {
        hidden.add('open')
      }
    }

    return hidden
  }

  /**
   * Extract interactions (toggle, exclusive, select) from an AST node
   * Interactions can come from:
   * 1. Events with function call actions (e.g., onclick toggle())
   * 2. Direct function call properties (e.g., toggle() as property)
   */
  private extractInteractions(node: Instance | ComponentDefinition): ExtractedInteraction[] {
    const interactions: ExtractedInteraction[] = []
    const interactionNames = new Set(['toggle', 'exclusive', 'select'])

    // Check events for interaction function calls
    const events = 'events' in node ? node.events || [] : []
    for (const event of events) {
      for (const action of event.actions) {
        if (action.isFunctionCall && interactionNames.has(action.name)) {
          interactions.push({
            name: action.name as 'toggle' | 'exclusive' | 'select',
            arguments: action.args,
            line: action.line,
            column: action.column,
          })
        }
      }
    }

    // Check for direct interaction function calls in properties
    // These are parsed as properties with no value but have special names
    // The parser might also put them in a special location
    if ('properties' in node) {
      for (const prop of node.properties) {
        // Check if property name looks like a function call (e.g., "toggle()")
        const match = prop.name.match(/^(toggle|exclusive|select)\(\)$/)
        if (match) {
          interactions.push({
            name: match[1] as 'toggle' | 'exclusive' | 'select',
            arguments: prop.values.map(v => String(v)),
            line: prop.line,
            column: prop.column,
          })
        }
      }
    }

    return interactions
  }

  /**
   * Extract events from an AST node
   */
  private extractEvents(node: Instance | ComponentDefinition): ExtractedEvent[] {
    const events: Event[] = 'events' in node ? node.events || [] : []
    return events.map(event => ({
      name: event.name,
      key: event.key,
      line: event.line,
      column: event.column,
      actions: event.actions.map(action => ({
        name: action.name,
        target: action.target,
        arguments: action.args,
        isFunctionCall: action.isFunctionCall ?? false,
        line: action.line,
        column: action.column,
      })),
    }))
  }

  /**
   * Get string value from a property
   */
  private getPropertyValueString(prop: Property): string {
    if (prop.values.length === 0) {
      return 'true'
    }
    if (prop.values.length === 1) {
      const val = prop.values[0]
      if (typeof val === 'object' && 'kind' in val && val.kind === 'token') {
        return `$${val.name}`
      }
      return String(val)
    }
    return prop.values
      .map(v => {
        if (typeof v === 'object' && 'kind' in v && v.kind === 'token') {
          return `$${v.name}`
        }
        return String(v)
      })
      .join(' ')
  }

  /**
   * Convert Zag prop type to PropertyType
   */
  private zagTypeToPropertyType(type: ZagPropMeta['type']): PropertyType {
    switch (type) {
      case 'boolean':
        return 'boolean'
      case 'number':
        return 'number'
      case 'enum':
        return 'select'
      case 'string':
        return 'text'
      default:
        return 'unknown'
    }
  }
}

/**
 * Create a PropertyExtractor
 */
export function createPropertyExtractor(ast: AST, sourceMap: SourceMap): PropertyExtractor {
  return new PropertyExtractor(ast, sourceMap)
}
