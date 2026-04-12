/**
 * Mirror IR Generator
 *
 * Transforms AST to Intermediate Representation.
 * Uses schema (src/schema/dsl.ts) for property-to-CSS conversion.
 */

import type {
  AST,
  ComponentDefinition,
  Instance,
  Property,
  State,
  Event,
  Action,
  Each,
  Slot,
  Text,
  ChildOverride,
  AnimationDefinition,
  AnimationKeyframe,
  AnimationKeyframeProperty,
  ZagNode,
  ZagSlotDef,
  ZagItem,
  TableNode,
  TableColumnNode,
  TableSlotNode,
  TableStaticRowNode,
  TableStaticCellNode,
  DataAttribute,
  DataReference,
  DataReferenceArray,
  TokenReference,
  LoopVarReference,
  Conditional as ASTConditional,
  ComputedExpression,
} from '../parser/ast'
import { logIR as log } from '../utils/logger'

/** Property value type from AST - can be literal, token ref, loop var, conditional, or expression */
type PropertyValue = string | number | boolean | TokenReference | LoopVarReference | ASTConditional | ComputedExpression

// ExpressionPart has been moved to transformers/expression-transformer.ts

/** Child node type that can be transformed - matches transformChild parameter */
type TransformableChild = Instance | Text | Slot

/** Conditional block node structure - 'if condition' blocks in Mirror DSL */
interface ConditionalBlock {
  type: 'Conditional'
  condition: string
  then: (Instance | Slot)[]
  else?: (Instance | Slot)[]
  line: number
  column: number
}

// SyntheticSlotDef and SyntheticZagItem moved to transformers/zag-transformer.ts

import {
  isComponent,
  isInstance,
  isZagComponent,
  isSlot,
  isText,
  isEach,
  hasContent,
  isTable,
} from '../parser/ast'
import type { IR, IRNode, IRStyle, IREvent, IRAction, IRProperty, IREach, IRConditional, SourcePosition, PropertySourceMap, IRAnimation, IRAnimationKeyframe, IRAnimationProperty, IRWarning, LayoutType, IRSlot, IRItem, IRItemProperty, IRZagNode, IRStateMachine, IRStateDefinition, IRStateTransition, IRToken, IRTable, IRTableColumn, IRTableStaticRow, IRTableStaticCell, IRDataObject, IRDataValue, IRDataReference, IRDataReferenceArray } from './types'
import { SourceMap, SourceMapBuilder, calculateSourcePosition } from './source-map'
import { getPrimitiveDefaults, type DefaultProperty } from '../schema/primitives'
import {
  schemaPropertyToCSS,
  simplePropertyToCSS,
  PROPERTY_TO_CSS,
  NON_CSS_PROPERTIES,
  ALIGNMENT_PROPERTIES,
  DIRECTION_PROPERTIES,
  DIRECTION_MAP,
  CORNER_MAP,
  BORDER_DIRECTION_MAP,
  PROPERTY_TO_TOKEN_SUFFIX,
  hoverPropertyToCSS,
  mapEventToDom,
  getHtmlTag,
} from '../schema/ir-helpers'
import { findProperty, getEvent, getAction, getState, DSL } from '../schema/dsl'
import { isZagPrimitive, ZAG_PRIMITIVES } from '../schema/zag-primitives'
import { isCompoundPrimitive, getCompoundPrimitive, getCompoundSlotDef, isCompoundSlot } from '../schema/compound-primitives'
import { isChartPrimitive, getChartPrimitive, getChartSlotProperty } from '../schema/chart-primitives'
import { isContainer as isContainerPrimitive, FLEX_DEFAULTS } from '../schema/layout-defaults'
import type { IRChartSlot } from './types'
import { getCanonicalPropertyName, SYSTEM_STATES } from '../schema/parser-helpers'
// Extracted transformers
import { transformTable as transformTableExtracted, humanizeFieldName } from './transformers/table-transformer'
import { transformChart as transformChartExtracted } from './transformers/chart-transformer'
import {
  transformZagComponent as transformZagComponentExtracted,
  buildZagNodeFromInstance as buildZagNodeFromInstanceExtracted,
} from './transformers/zag-transformer'
import type { TransformerContext, ParentLayoutContext } from './transformers/transformer-context'
import {
  type LayoutContext,
  createLayoutContext,
  resolveGridColumns,
  applyAlignmentsToContext,
  generateLayoutStyles,
  applyAbsolutePositioningToChildren,
  applyGridContextToChildren,
} from './transformers/layout-transformer'
import {
  transformDataAttributes,
  transformDataValue,
  transformAnimation,
  convertStateDependency,
  convertStateAnimation,
} from './transformers/data-transformer'
import {
  BUILTIN_STATE_FUNCTIONS,
  transformEvents,
  transformAction,
} from './transformers/event-transformer'
import {
  formatCSSValue,
  parseDirectionalSpacing,
  formatBorderValue,
  booleanPropertyToCSS,
} from './transformers/style-utils-transformer'
import {
  convertDefaultsToProperties,
  determineLayoutType,
  mergeProperties,
  extractValueBinding,
} from './transformers/property-utils-transformer'
import {
  type ExpressionPart,
  buildExpressionString,
} from './transformers/expression-transformer'
import {
  propertyToCSS as propertyToCSSExtracted,
  type PropertyTransformContext,
  type TransformAccumulator,
} from './transformers/property-transformer'
import {
  buildStateMachine as buildStateMachineExtracted,
  type StateMachineTransformContext,
} from './transformers/state-machine-transformer'
import {
  resolveValue as resolveValueExtracted,
  resolveContentValue as resolveContentValueExtracted,
  resolveTokenWithContext as resolveTokenWithContextExtracted,
  extractHTMLProperties as extractHTMLPropertiesExtracted,
} from './transformers/value-resolver'
import {
  mergeStates as mergeStatesExtracted,
  resolveComponent as resolveComponentExtracted,
  type ComponentResolverContext,
} from './transformers/component-resolver'

export type { IR, IRWarning } from './types'
export {
  SourceMap,
  SourceMapBuilder,
  calculateSourcePosition,
  calculatePropertyPosition,
  type NodeMapping,
} from './source-map'

/**
 * Result of IR transformation including source map and warnings
 */
export interface IRResult {
  ir: IR
  sourceMap: SourceMap
  warnings: IRWarning[]
}

/**
 * Transform AST to IR
 * @param ast The AST to transform
 * @param includeSourceMap Whether to build source map (default: false for backward compat)
 */
export function toIR(ast: AST): IR
export function toIR(ast: AST, includeSourceMap: true): IRResult
export function toIR(ast: AST, includeSourceMap?: boolean): IR | IRResult {
  const transformer = new IRTransformer(ast, includeSourceMap || false)
  const ir = transformer.transform()

  if (includeSourceMap) {
    return {
      ir,
      sourceMap: transformer.getSourceMap(),
      warnings: transformer.getWarnings(),
    }
  }

  return ir
}

// BUILTIN_STATE_FUNCTIONS is imported from transformers/event-transformer.ts
// LayoutContext and ParentLayoutContext are imported from transformers/layout-transformer.ts and transformer-context.ts

class IRTransformer {
  private ast: AST
  private componentMap: Map<string, ComponentDefinition> = new Map()
  private tokenSet: Set<string> = new Set()
  private propertySetMap: Map<string, Property[]> = new Map()  // Property sets (tokens with multiple properties)
  private nodeIdCounter = 0
  private includeSourceMap: boolean
  private sourceMapBuilder: SourceMapBuilder
  private warnings: IRWarning[] = []

  constructor(ast: AST, includeSourceMap: boolean = false) {
    this.ast = ast
    this.includeSourceMap = includeSourceMap
    this.sourceMapBuilder = new SourceMapBuilder()

    // Build component lookup map (including nested component definitions)
    for (const comp of ast.components) {
      this.registerComponent(comp)
    }
    // Build token lookup set and property set map
    for (const token of ast.tokens) {
      this.tokenSet.add(token.name)
      // Store property sets (tokens with properties array instead of single value)
      if (token.properties && token.properties.length > 0) {
        this.propertySetMap.set(token.name, token.properties)
      }
    }
  }

  /**
   * Get the built source map
   */
  getSourceMap(): SourceMap {
    return this.sourceMapBuilder.build()
  }

  /**
   * Get validation warnings
   */
  getWarnings(): IRWarning[] {
    return this.warnings
  }

  /**
   * Add a validation warning
   */
  private addWarning(warning: IRWarning): void {
    // Avoid duplicate warnings
    const isDuplicate = this.warnings.some(w =>
      w.type === warning.type &&
      w.message === warning.message &&
      w.property === warning.property
    )
    if (!isDuplicate) {
      this.warnings.push(warning)
    }
  }

  /**
   * Validate a property name against the schema.
   * Returns true if valid, false if unknown. Emits warnings for unknown properties.
   */
  private validateProperty(propName: string, position?: SourcePosition): boolean {
    // Non-CSS properties are always valid
    if (NON_CSS_PROPERTIES.has(propName)) {
      return true
    }

    // For hover- prefix, validate the base property
    if (propName.startsWith('hover-')) {
      const baseProp = propName.replace('hover-', '')
      if (this.isKnownProperty(baseProp)) {
        return true
      }
      this.addWarning({
        type: 'unknown-property',
        message: `Unknown property: '${propName}'`,
        property: propName,
        position,
      })
      return false
    }

    // Use isKnownProperty for the actual check (avoids duplication)
    if (this.isKnownProperty(propName)) {
      return true
    }

    // Unknown property - add warning
    this.addWarning({
      type: 'unknown-property',
      message: `Unknown property: '${propName}'`,
      property: propName,
      position,
    })

    return false
  }

  /**
   * Check if a property is known (without emitting warnings)
   */
  private isKnownProperty(propName: string): boolean {
    if (NON_CSS_PROPERTIES.has(propName)) return true
    if (findProperty(propName)) return true
    if (PROPERTY_TO_CSS[propName]) return true
    return false
  }

  /**
   * Recursively register a component and all its nested component definitions
   * If a component with the same name already exists, merge the definitions
   */
  private registerComponent(comp: ComponentDefinition): void {
    const existing = this.componentMap.get(comp.name)
    if (existing) {
      // Merge: combine properties, states, events, children from both definitions
      // Later definition's non-empty values take precedence
      const merged: ComponentDefinition = {
        ...existing,
        // Merge properties: new properties override, but keep existing ones not in new
        properties: mergeProperties(existing.properties, comp.properties),
        // Merge states
        states: [...existing.states, ...comp.states],
        // Merge events
        events: [...existing.events, ...comp.events],
        // Use children from whichever has them (prefer non-empty)
        children: comp.children.length > 0 ? comp.children : existing.children,
        // Keep primitive from first definition if second doesn't specify
        primitive: comp.primitive || existing.primitive,
        // Keep extends from first definition if second doesn't specify
        extends: comp.extends || existing.extends,
      }
      this.componentMap.set(comp.name, merged)
    } else {
      this.componentMap.set(comp.name, comp)
    }
    // Recursively register nested component definitions
    for (const child of comp.children) {
      if (isComponent(child)) {
        this.registerComponent(child)
      }
    }
  }

  transform(): IR {
    // Transform tokens - both simple values and data objects
    const tokens: IRToken[] = this.ast.tokens
      .filter(t => t.value !== undefined || t.attributes !== undefined)
      .map(t => {
        if (t.value !== undefined) {
          // Simple token with value (string, number, or boolean)
          return {
            name: t.name,
            type: t.tokenType,
            value: t.value as string | number | boolean,
          }
        } else if (t.attributes !== undefined) {
          // Data object with nested attributes
          return {
            name: t.name,
            data: transformDataAttributes(t.attributes),
          }
        }
        // Fallback (shouldn't happen due to filter)
        return { name: t.name, value: '' }
      })

    // Add component definitions to source map (for .com file cursor sync)
    if (this.includeSourceMap) {
      for (const comp of this.ast.components) {
        if (comp.line !== undefined && comp.column !== undefined) {
          const position = calculateSourcePosition(comp.line, comp.column)
          this.sourceMapBuilder.addNode(
            comp.nodeId || `def-${comp.name}`,
            comp.name,
            position,
            {
              isDefinition: true,
            }
          )
        }
      }
    }

    // Transform instances to IR nodes (handle Instance, Slot, ZagComponent, and Table)
    const nodes = this.ast.instances.map(inst => {
      if (isSlot(inst)) {
        return this.transformSlotPrimitive(inst)
      }
      if (isZagComponent(inst)) {
        return this.transformZagComponent(inst)
      }
      if (isTable(inst)) {
        return this.transformTable(inst)
      }
      return this.transformInstance(inst as Instance)
    })

    // Transform animations
    const animations = this.ast.animations.map(anim => transformAnimation(anim))

    return { nodes, tokens, animations }
  }

  // Data and animation transformation functions (transformDataAttributes, transformDataValue,
  // transformAnimation, transformAnimationKeyframe, transformAnimationProperty)
  // have been extracted to transformers/data-transformer.ts

  private generateId(): string {
    return `node-${++this.nodeIdCounter}`
  }

  /**
   * Create a TransformerContext for use with extracted transformers
   */
  private createTransformerContext(): TransformerContext {
    return {
      generateId: () => this.generateId(),
      transformProperties: (props, primitive, parentCtx) => this.transformProperties(props, primitive, parentCtx),
      transformChild: (child, parentId, parentCtx) => this.transformChild(child, parentId, parentCtx),
      includeSourceMap: this.includeSourceMap,
      addToSourceMap: this.includeSourceMap
        ? (nodeId, name, sourcePosition, options) => {
            this.sourceMapBuilder.addNode(nodeId, name, sourcePosition, options)
          }
        : undefined,
      addPropertyPosition: this.includeSourceMap
        ? (nodeId, propertyName, position) => {
            this.sourceMapBuilder.addPropertyPosition(nodeId, propertyName, position)
          }
        : undefined,
    }
  }

  /**
   * Create an empty placeholder node for invalid instances
   */
  private createEmptyNode(instance: { line?: number; column?: number } | null | undefined): IRNode {
    return {
      id: this.generateId(),
      tag: 'div',
      primitive: 'box',
      name: 'Unknown',
      properties: [],
      styles: [],
      events: [],
      children: [],
      sourcePosition: instance?.line ? {
        line: instance.line,
        column: instance.column ?? 0,
        endLine: instance.line,
        endColumn: instance.column ?? 0,
      } : undefined,
    }
  }

  /**
   * Transform a Slot AST node into an IR node (visual placeholder)
   */
  private transformSlotPrimitive(slot: Slot, parentId?: string): IRNode {
    const nodeId = slot.nodeId || this.generateId()

    // Transform slot properties (w, h, etc.) to styles
    const styles: IRNode['styles'] = []
    if (slot.properties) {
      const baseStyles = this.transformProperties(slot.properties, 'slot')
      styles.push(...baseStyles)
    }

    // Source position for SourceMap
    const sourcePosition = slot.line !== undefined && slot.column !== undefined
      ? { line: slot.line, column: slot.column, endLine: slot.line, endColumn: slot.column }
      : undefined

    // Add to source map builder (required for replaceSlot to work)
    if (this.includeSourceMap && sourcePosition) {
      this.sourceMapBuilder.addNode(
        nodeId,
        'Slot',
        sourcePosition,
        {
          isDefinition: false,
          parentId,
        }
      )
    }

    return {
      id: nodeId,
      tag: 'div',
      primitive: 'slot',
      properties: [
        { name: 'textContent', value: slot.name }
      ],
      styles,
      events: [],
      children: [],
      sourcePosition,
    }
  }

  /**
   * Transform a ZagComponent AST node into an IRZagNode
   * Delegates to extracted zag-transformer.ts
   */
  private transformZagComponent(zagNode: ZagNode, parentLayoutContext?: ParentLayoutContext): IRNode {
    const ctx = this.createTransformerContext()
    return transformZagComponentExtracted(ctx, zagNode, parentLayoutContext)
  }

  /**
   * Transform a TableNode to an IRTable
   * Delegates to extracted table-transformer.ts
   */
  private transformTable(table: TableNode): IRTable {
    const ctx = this.createTransformerContext()
    return transformTableExtracted(ctx, table)
  }

  /**
   * Build a synthetic ZagNode from an Instance that inherits from a Zag primitive
   * Delegates to extracted function in zag-transformer.ts
   */
  private buildZagNodeFromInstance(
    instance: Instance,
    resolvedComponent: ComponentDefinition | null,
    primitive: string
  ): ZagNode {
    return buildZagNodeFromInstanceExtracted(instance, resolvedComponent, primitive)
  }

  /**
   * Transform a Chart primitive (Line, Bar, Pie, etc.) into an IRNode
   *
   * Chart primitives create a container div that the runtime fills with a Chart.js canvas.
   * Properties like w, h, colors, title, legend, etc. are passed to the runtime.
   */
  private transformChartPrimitive(
    instance: Instance,
    resolvedComponent: ComponentDefinition | null,
    primitive: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
    const ctx = this.createTransformerContext()
    return transformChartExtracted(
      ctx,
      instance,
      resolvedComponent,
      primitive,
      (base, override) => mergeProperties(base, override),
      parentLayoutContext
    )
  }

  /**
   * Transform a Compound primitive (Shell, etc.) into an IRNode
   *
   * Compound primitives are pre-built layout components with:
   * - Default CSS Grid/Flex styles from the schema
   * - Named slots (Header, Sidebar, Main, Footer) with their own default styles
   * - Nested slots (Logo, Nav, SidebarGroup, etc.)
   */
  private transformCompoundPrimitive(
    instance: Instance,
    parentId?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
    const nodeId = this.generateId()
    const compoundType = instance.compoundType!
    const compoundDef = getCompoundPrimitive(compoundType)

    if (!compoundDef) {
      // Fallback: treat as regular instance
      return this.transformInstance({ ...instance, isCompound: false }, parentId, false, false, parentLayoutContext)
    }

    // Start with default styles from schema
    const styles: IRStyle[] = []
    if (compoundDef.defaultStyles) {
      for (const [prop, value] of Object.entries(compoundDef.defaultStyles)) {
        styles.push({ property: prop, value })
      }
    }

    // Only transform user-specified properties if there are any
    // This prevents transformProperties from adding default flex styles
    if (instance.properties && instance.properties.length > 0) {
      const userStyles = this.transformProperties(instance.properties, 'frame', parentLayoutContext)
      for (const style of userStyles) {
        // Remove existing style with same property (user overrides default)
        const existingIndex = styles.findIndex(s => s.property === style.property && !s.state)
        if (existingIndex !== -1) {
          styles.splice(existingIndex, 1)
        }
        styles.push(style)
      }
    }

    // Transform children as compound slots
    const children: IRNode[] = []
    for (const child of instance.children || []) {
      if (isInstance(child)) {
        const childNode = this.transformCompoundSlot(child, compoundType, nodeId)
        children.push(childNode)
      } else if (isText(child)) {
        children.push(this.createTextNode(child))
      }
    }

    // Track source position
    let sourcePosition: SourcePosition | undefined
    if (this.includeSourceMap) {
      sourcePosition = calculateSourcePosition(instance.line, instance.column)
      this.sourceMapBuilder.addNode(
        nodeId,
        instance.component,
        sourcePosition,
        { isDefinition: instance.isDefinition || false }
      )
    }

    // Extract instanceName from 'name' property if not set via 'named' keyword
    const nameProp = instance.properties?.find(p => p.name === 'name')
    const instanceNameFromProp = nameProp ? resolveValueExtracted(nameProp.values, this.tokenSet) : undefined
    const resolvedInstanceName = instance.name || instanceNameFromProp || undefined

    return {
      id: nodeId,
      tag: 'div',
      primitive: 'compound',
      name: instance.component,
      instanceName: resolvedInstanceName,
      properties: [],
      styles,
      events: [],
      children,
      sourcePosition,
    }
  }

  /**
   * Transform a child of a Compound primitive with slot-specific styles
   */
  private transformCompoundSlot(
    child: Instance,
    compoundType: string,
    parentId: string
  ): IRNode {
    const slotDef = getCompoundSlotDef(compoundType, child.component)
    const compoundDef = getCompoundPrimitive(compoundType)

    // If this is a known slot, apply default styles
    if (slotDef) {
      const nodeId = this.generateId()

      // Start with slot default styles from COMPOUND_SLOT_MAPPINGS
      const styles: IRStyle[] = []
      if (slotDef.styles) {
        for (const [prop, value] of Object.entries(slotDef.styles)) {
          styles.push({ property: prop, value })
        }
      }

      // Also apply slotStyles from the CompoundPrimitiveDef (higher priority)
      // These include grid-area and other layout-specific styles
      if (compoundDef?.slotStyles?.[child.component]) {
        for (const [prop, value] of Object.entries(compoundDef.slotStyles[child.component])) {
          // Override or add
          const existingIndex = styles.findIndex(s => s.property === prop)
          if (existingIndex !== -1) {
            styles[existingIndex].value = value
          } else {
            styles.push({ property: prop, value })
          }
        }
      }

      // Only transform user-specified properties if there are any
      if (child.properties && child.properties.length > 0) {
        const userStyles = this.transformProperties(child.properties, 'frame')
        for (const style of userStyles) {
          const existingIndex = styles.findIndex(s => s.property === style.property && !s.state)
          if (existingIndex !== -1) {
            styles.splice(existingIndex, 1)
          }
          styles.push(style)
        }
      }

      // Transform children recursively (they might also be compound slots)
      const slotChildren: IRNode[] = []
      for (const grandChild of child.children || []) {
        if (isInstance(grandChild)) {
          // Check if grandchild is also a compound slot
          if (isCompoundSlot(compoundType, grandChild.component)) {
            slotChildren.push(this.transformCompoundSlot(grandChild, compoundType, nodeId))
          } else {
            slotChildren.push(this.transformInstance(grandChild, nodeId))
          }
        } else if (isText(grandChild)) {
          slotChildren.push(this.createTextNode(grandChild))
        }
      }

      // Track source position
      let sourcePosition: SourcePosition | undefined
      if (this.includeSourceMap) {
        sourcePosition = calculateSourcePosition(child.line, child.column)
        this.sourceMapBuilder.addNode(
          nodeId,
          child.component,
          sourcePosition,
          { isDefinition: false }
        )
      }

      return {
        id: nodeId,
        tag: slotDef.element,
        primitive: 'compound-slot',
        name: child.component,
        instanceName: child.name || undefined,
        properties: [],
        styles,
        events: transformEvents(child.events || []),
        children: slotChildren,
        sourcePosition,
      }
    }

    // Not a known slot - transform as regular instance
    return this.transformInstance(child, parentId)
  }

  /**
   * Create a text node from a Text AST node
   */
  private createTextNode(text: Text): IRNode {
    const nodeId = this.generateId()
    return {
      id: nodeId,
      tag: 'span',
      primitive: 'text',
      properties: [{ name: 'content', value: text.content }],
      styles: [],
      events: [],
      children: [],
    }
  }

  private transformInstance(
    instance: Instance | Each | any,
    parentId?: string,
    isEachTemplate?: boolean,
    isConditional?: boolean,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
    // Handle Each loops
    if (instance.type === 'Each') {
      return this.transformEach(instance as Each)
    }

    // Handle Conditionals
    if (instance.type === 'Conditional') {
      return this.transformConditional(instance)
    }

    // Guard against missing component name
    if (!instance.component) {
      this.addWarning({
        type: 'invalid-instance',
        message: 'Instance missing component name',
        position: instance.position
      })
      return this.createEmptyNode(instance)
    }

    // Resolve component definition first
    const component = this.componentMap.get(instance.component)
    const resolverCtx: ComponentResolverContext = {
      componentMap: this.componentMap,
      addWarning: (warning) => this.addWarning(warning as IRWarning),
    }
    const resolvedComponent = component ? resolveComponentExtracted(component, resolverCtx) : null

    // Determine primitive for defaults and layout context
    const primitive = resolvedComponent?.primitive || instance.component.toLowerCase()

    // Handle Zag primitives (Select, Accordion, etc.)
    // Check both direct usage (e.g., "Select") and inheritance (e.g., "MySelect as Select:")
    if (isZagPrimitive(instance.component) || isZagPrimitive(primitive)) {
      // Build a synthetic ZagNode from the instance + resolved component
      const zagNode = this.buildZagNodeFromInstance(instance, resolvedComponent, primitive)
      return this.transformZagComponent(zagNode, parentLayoutContext)
    }

    // Handle Chart primitives (Line, Bar, Pie, etc.)
    if (isChartPrimitive(instance.component) || isChartPrimitive(primitive)) {
      return this.transformChartPrimitive(instance, resolvedComponent, primitive, parentLayoutContext)
    }

    // Handle Compound primitives (Shell, etc.)
    if (instance.isCompound && instance.compoundType) {
      return this.transformCompoundPrimitive(instance, parentId, parentLayoutContext)
    }

    // Get primitive defaults and convert to Property format
    const primitiveDefaults = convertDefaultsToProperties(getPrimitiveDefaults(primitive))

    // Determine HTML tag
    const tag = this.getTag(instance.component, resolvedComponent)

    // Merge properties: Primitive Defaults < Component Defaults < Instance Properties
    const properties = mergeProperties(
      primitiveDefaults,
      mergeProperties(
        resolvedComponent?.properties || [],
        instance.properties
      )
    )

    // Transform to styles (with intelligent layout merging)
    // Pass parent layout context for context-aware property handling (e.g., x/y in grid)
    const styles = this.transformProperties(properties, primitive, parentLayoutContext)

    // For root elements (no parent), convert flex-based "full" to explicit 100%
    // This is needed because "w full, h full" becomes flex styles which don't work at root level
    if (!parentId) {
      const hasExplicitWidth = properties.some(p => p.name === 'w' || p.name === 'width')
      const hasExplicitHeight = properties.some(p => p.name === 'h' || p.name === 'height')

      if (hasExplicitWidth || hasExplicitHeight) {
        // Remove flex-based styles and add explicit dimensions
        // BUT keep explicit min-width/min-height values (only remove the automatic '0' values)
        const filteredStyles = styles.filter(s => {
          if (s.property === 'flex') return false
          if (s.property === 'align-self') return false
          // Only remove min-width: 0 / min-height: 0, keep explicit values
          if (s.property === 'min-width' && s.value === '0') return false
          if (s.property === 'min-height' && s.value === '0') return false
          return true
        })
        styles.length = 0
        styles.push(...filteredStyles)

        if (hasExplicitWidth && !styles.some(s => s.property === 'width')) {
          styles.push({ property: 'width', value: '100%' })
        }
        if (hasExplicitHeight && !styles.some(s => s.property === 'height')) {
          styles.push({ property: 'height', value: '100%' })
        }
      }
    }

    // Add state styles from component definition
    const stateStyles = resolvedComponent?.states
      ? this.transformStates(resolvedComponent.states)
      : []

    // Add state styles from instance inline states (e.g., "Frame bg #333 hover: bg light")
    const instanceStateStyles = instance.states?.length
      ? this.transformStates(instance.states)
      : []

    // Transform events from component definition FIRST (needed for state machine check)
    const events = resolvedComponent?.events
      ? transformEvents(resolvedComponent.events)
      : []

    // Transform events from instance inline events (e.g., "Input onkeydown enter: submit")
    const instanceEvents = instance.events?.length
      ? transformEvents(instance.events)
      : []

    // Combine all events to check for state machine functions
    const allEvents = [...events, ...instanceEvents]

    // Build state machine from states with triggers OR if there are state machine events
    const allStates = [
      ...(resolvedComponent?.states || []),
      ...(instance.states || []),
    ]
    const stateMachine = this.buildStateMachine(allStates, allEvents)

    // Extract inline states and events from instance children
    const { inlineStateStyles, inlineEvents, remainingChildren } =
      this.extractInlineStatesAndEvents(instance.children || [])

    // Convert childOverrides to instance children for slot filling
    const childOverrideInstances = this.childOverridesToInstances(instance.childOverrides || [])

    // Generate node ID FIRST so we can pass it to children as their parentId
    const nodeId = this.generateId()

    // Determine layout context for children
    // If this element is a grid container, children get grid context for x/y/w/h
    // For flex containers, track direction so w full / h full can use appropriate strategy
    const isGridContainer = styles.some(s => s.property === 'display' && s.value === 'grid')
    const isAbsoluteContainer = styles.some(s => s.property === 'position' && s.value === 'relative')
    const isHorizontal = properties.some(p => p.name === 'hor' || p.name === 'horizontal')
    let childLayoutContext: ParentLayoutContext | undefined
    if (isGridContainer) {
      // Extract grid columns count if it's a simple repeat(N, 1fr)
      const gridColsStyle = styles.find(s => s.property === 'grid-template-columns')
      let gridColumns: number | undefined
      if (gridColsStyle) {
        const match = gridColsStyle.value.match(/repeat\((\d+),/)
        if (match) {
          gridColumns = parseInt(match[1], 10)
        }
      }
      childLayoutContext = { type: 'grid', gridColumns }
    } else if (isAbsoluteContainer) {
      childLayoutContext = { type: 'absolute' }
    } else {
      // Flex container (default) - track direction for w full / h full
      childLayoutContext = { type: 'flex', flexDirection: isHorizontal ? 'row' : 'column' }
    }

    // Transform children with slot filling (excluding inline states/events)
    // Include both regular children and childOverrides as slot fillers
    // Pass nodeId as parentId so children know their parent in the sourceMap
    const children = this.resolveChildren(
      resolvedComponent?.children || [],
      [...remainingChildren, ...childOverrideInstances],
      nodeId,
      childLayoutContext
    )

    // Merge dropdown features from component definition and instance
    // Instance values override component definition values
    const visibleWhen = instance.visibleWhen || resolvedComponent?.visibleWhen
    const initialState = instance.initialState || resolvedComponent?.initialState
    const selection = instance.selection || resolvedComponent?.selection
    const bind = instance.bind || resolvedComponent?.bind
    const route = instance.route || resolvedComponent?.route

    // If instance specifies an initialState, update the state machine's initial state
    // This allows "Btn on" to start in the "on" state instead of "default"
    if (initialState && stateMachine && stateMachine.states[initialState]) {
      stateMachine.initial = initialState
    }

    // If any state has children (Figma Variants pattern), add element's children as default state children
    // This enables proper swapping when toggling: on -> default should restore original children
    if (stateMachine && children.length > 0) {
      const anyStateHasChildren = Object.values(stateMachine.states).some(s => s.children && s.children.length > 0)
      if (anyStateHasChildren && stateMachine.states['default'] && !stateMachine.states['default'].children) {
        stateMachine.states['default'].children = children
      }
    }

    // If this node has a route, add a click event with navigate action
    if (route) {
      events.push({
        name: 'click',
        actions: [{ type: 'navigate', target: route }]
      })
    }

    // Build source position if tracking is enabled
    let sourcePosition: SourcePosition | undefined
    let propertySourceMaps: PropertySourceMap[] | undefined

    if (this.includeSourceMap) {
      // Calculate source position from instance's AST position
      sourcePosition = calculateSourcePosition(instance.line, instance.column)

      // Track property positions
      propertySourceMaps = []
      for (const prop of instance.properties) {
        const propPosition = calculateSourcePosition(prop.line, prop.column)
        propertySourceMaps.push({
          name: prop.name,
          position: propPosition,
        })
      }

      // Add to source map builder
      this.sourceMapBuilder.addNode(
        nodeId,
        instance.component,
        sourcePosition,
        {
          instanceName: instance.name || undefined,
          isDefinition: false,
          isEachTemplate,
          isConditional,
          parentId,
        }
      )

      // Add property positions to the node mapping
      for (const propMap of propertySourceMaps) {
        this.sourceMapBuilder.addPropertyPosition(nodeId, propMap.name, propMap.position)
      }
    }

    // Apply state childOverrides to children
    // This adds state-conditional styles to matching child nodes
    if (resolvedComponent?.states) {
      this.applyStateChildOverrides(children, resolvedComponent.states)
    }

    // Auto-absolute: If parent has position: relative, all children get position: absolute
    // This also converts flex-based sizing/alignment to CSS position properties
    applyAbsolutePositioningToChildren(children, styles)

    // Grid container: Remove flex-based styles from children
    // In grid, flex: 1 1 0% has no effect - grid cells fill automatically
    applyGridContextToChildren(children, styles)

    // Determine layout type for drop strategy detection
    const layoutType = determineLayoutType(properties)

    // Extract instanceName from 'name' property if not set via 'named' keyword
    // This allows `name MenuBtn` syntax to work for state references like `MenuBtn.open:`
    const nameProp = properties.find(p => p.name === 'name')
    const instanceNameFromProp = nameProp ? resolveValueExtracted(nameProp.values, this.tokenSet) : undefined
    const resolvedInstanceName = instance.name || instanceNameFromProp || undefined

    // Extract valueBinding for two-way data binding (only for input elements)
    const valueBinding = (primitive === 'input' || primitive === 'textarea')
      ? extractValueBinding(properties)
      : undefined

    // Check for keyboard-nav property (enables form keyboard navigation)
    const hasKeyboardNav = properties.some(p => p.name === 'keyboard-nav' || p.name === 'keynav')

    return {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      instanceName: resolvedInstanceName,
      properties: extractHTMLPropertiesExtracted(properties, this.tokenSet, primitive),
      styles: [...styles, ...stateStyles, ...instanceStateStyles, ...inlineStateStyles],
      events: [...events, ...instanceEvents, ...inlineEvents],
      children,
      visibleWhen,
      initialState,
      selection,
      bind,
      route,
      stateMachine,
      sourcePosition,
      propertySourceMaps,
      layoutType,
      isDefinition: instance.isDefinition ?? false,
      valueBinding,
      keyboardNav: hasKeyboardNav || undefined,
    }
  }

  private transformEach(each: Each): IRNode {
    const nodeId = this.generateId()

    // Transform children and fix initialState → textContent for loop variable references
    const template = each.children.map(child => {
      const irNode = this.transformInstance(child, nodeId, true)
      // If a child has initialState matching the loop variable, it's a variable reference
      // Convert it to textContent (e.g., "Text item" should display item's value, not be a state)
      this.fixLoopVariableReferences(irNode, each.item, each.index)
      return irNode
    })

    const eachData: IREach = {
      id: nodeId,
      itemVar: each.item,
      indexVar: each.index,
      collection: each.collection,
      filter: each.filter,
      orderBy: each.orderBy,
      orderDesc: each.orderDesc,
      template,
    }

    // Track source position for each loop
    let sourcePosition: SourcePosition | undefined
    if (this.includeSourceMap) {
      sourcePosition = calculateSourcePosition(each.line, each.column)
      this.sourceMapBuilder.addNode(
        nodeId,
        'Each',
        sourcePosition,
        { isDefinition: false, isEachTemplate: true }
      )
    }

    return {
      id: nodeId,
      tag: 'div',
      name: 'Each',
      properties: [],
      styles: [],
      events: [],
      children: [],
      each: eachData,
      sourcePosition,
    }
  }

  /**
   * Fix loop variable references in each template nodes.
   * When parsing "Text item" inside "each item in ...", the parser incorrectly
   * sets initialState: "item" instead of textContent. This method fixes that
   * by converting initialState matching the loop variable to textContent.
   */
  private fixLoopVariableReferences(node: IRNode, itemVar: string, indexVar?: string): void {
    // Check if this node has initialState matching the item variable
    // Handle both with and without $ prefix (e.g., "task" or "$task")
    if (node.initialState === itemVar || node.initialState === `$${itemVar}`) {
      // Convert to textContent property with $item reference
      node.properties.push({
        name: 'textContent',
        value: `$${itemVar}`,
      })
      delete node.initialState
    }

    // Check if this node has initialState matching the index variable
    if (indexVar && (node.initialState === indexVar || node.initialState === `$${indexVar}`)) {
      // Convert to textContent property with $index reference
      node.properties.push({
        name: 'textContent',
        value: `$${indexVar}`,
      })
      delete node.initialState
    }

    // Also handle dot notation: initialState: "item.name" or "$item.name" → textContent: "$item.name"
    if (node.initialState?.startsWith(`${itemVar}.`) || node.initialState?.startsWith(`$${itemVar}.`)) {
      // Ensure value has $ prefix
      const value = node.initialState.startsWith('$') ? node.initialState : `$${node.initialState}`
      node.properties.push({
        name: 'textContent',
        value,
      })
      delete node.initialState
    }

    // Recursively fix children
    for (const child of node.children) {
      this.fixLoopVariableReferences(child, itemVar, indexVar)
    }
  }

  private transformConditional(cond: ConditionalBlock): IRNode {
    const nodeId = this.generateId()
    const conditionalData: IRConditional = {
      id: nodeId,
      condition: cond.condition,
      then: cond.then.map((child: Instance | Slot) => this.transformInstance(child, nodeId, false, true)),
      else: cond.else?.length
        ? cond.else.map((child: Instance | Slot) => this.transformInstance(child, nodeId, false, true))
        : undefined,
    }

    // Track source position for conditional
    let sourcePosition: SourcePosition | undefined
    if (this.includeSourceMap) {
      sourcePosition = calculateSourcePosition(cond.line, cond.column)
      this.sourceMapBuilder.addNode(
        nodeId,
        'Conditional',
        sourcePosition,
        { isDefinition: false, isConditional: true }
      )
    }

    return {
      id: nodeId,
      tag: 'div',
      name: 'Conditional',
      properties: [],
      styles: [],
      events: [],
      children: [],
      conditional: conditionalData,
      sourcePosition,
    }
  }

  /**
   * Resolve children with slot filling
   *
   * Component slots (Title:, Content:) can be filled by instance children.
   * If instance provides a child matching the slot name, it replaces the slot.
   * Otherwise, the slot's default content is used (or empty if none).
   */
  private resolveChildren(
    componentChildren: (Instance | Slot)[],
    instanceChildren: (Instance | Text | Slot)[],
    parentId?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode[] {
    // If no component children (no slot definitions), just transform instance children directly
    // This preserves the original order for simple containers like Box with mixed children
    if (componentChildren.length === 0) {
      return instanceChildren.map(child => this.transformChild(child, parentId, parentLayoutContext))
    }

    // Build map of instance children by component name (slot fillers)
    const slotFillers = new Map<string, (Instance | Text)[]>()
    const nonSlotChildren: (Instance | Text)[] = []

    for (const child of instanceChildren) {
      if (isInstance(child)) {
        if (!slotFillers.has(child.component)) {
          slotFillers.set(child.component, [])
        }
        slotFillers.get(child.component)!.push(child)
      } else if (isComponent(child)) {
        // Skip Component children - they are template definitions, not actual content
        // They will be processed when we iterate componentChildren
        continue
      } else {
        // Text or other non-slot children
        nonSlotChildren.push(child as Instance | Text)
      }
    }

    const result: IRNode[] = []

    // Identify which Component children are template definitions vs fillable slots
    // If a Component has sibling Instances using it, it's a template (not a slot)
    const templateNames = new Set<string>()
    for (const child of instanceChildren) {
      if (isInstance(child)) {
        templateNames.add(child.component)
      }
    }

    // Build a map of slot definitions by name for quick lookup
    const slotDefsByName = new Map<string, Instance | ComponentDefinition | Slot>()
    for (const slot of componentChildren) {
      if (isInstance(slot)) {
        slotDefsByName.set((slot as Instance).component, slot)
      } else if (isComponent(slot)) {
        slotDefsByName.set((slot as ComponentDefinition).name, slot)
      } else if (isSlot(slot)) {
        slotDefsByName.set((slot as Slot).name, slot)
      }
    }

    // Track which slots have been processed (to handle unused slots at the end)
    const processedSlots = new Set<string>()

    // FIRST: Process instance children in their ORDER (user's intended order)
    // This ensures Icon comes before Title if user wrote Icon first
    for (const instanceChild of instanceChildren) {
      if (!isInstance(instanceChild)) continue

      const childName = instanceChild.component
      const slotDef = slotDefsByName.get(childName)

      if (slotDef && !processedSlots.has(childName)) {
        // This instance child fills a slot - use slot's properties merged with instance
        const slotIsInstance = isInstance(slotDef)
        const slotIsComponent = isComponent(slotDef)

        let slotVisibleWhen: string | undefined
        let slotInitialState: string | undefined
        let slotProperties: Property[] = []

        if (slotIsInstance) {
          const instSlot = slotDef as Instance
          slotVisibleWhen = instSlot.visibleWhen
          slotInitialState = instSlot.initialState
          slotProperties = instSlot.properties || []
        } else if (slotIsComponent) {
          const compSlot = slotDef as ComponentDefinition
          slotVisibleWhen = compSlot.visibleWhen
          slotInitialState = compSlot.initialState
          slotProperties = compSlot.properties || []
        } else if (isSlot(slotDef)) {
          const slotObj = slotDef as Slot
          slotProperties = slotObj.properties || []
        }

        // Skip templates (definitions with sibling instances using them)
        if (slotIsComponent && templateNames.has(childName)) {
          continue
        }

        // Process ALL instances for this slot (there may be multiple)
        const fillers = slotFillers.get(childName) || []
        for (const filler of fillers) {
          const mergedFiller = this.mergeSlotPropertiesIntoFiller(filler, slotProperties)
          const node = this.transformChild(mergedFiller, parentId, parentLayoutContext)
          if (slotVisibleWhen && !node.visibleWhen) {
            node.visibleWhen = slotVisibleWhen
          }
          if (slotInitialState && !node.initialState) {
            node.initialState = slotInitialState
          }
          result.push(node)
        }

        processedSlots.add(childName)
        slotFillers.delete(childName)
      }
    }

    // SECOND: Process remaining slot definitions that weren't filled (defaults)
    // These keep their definition order since user didn't specify an order
    if (componentChildren.length > 0) {
      for (const slot of componentChildren) {
        // Handle both Instance slots (Title:) and Component slots (Title as frame:)
        const slotIsInstance = isInstance(slot)
        const slotIsComponent = isComponent(slot)

        if (slotIsInstance || slotIsComponent) {
          // Explicitly narrow the types for TypeScript
          let slotName: string
          let slotVisibleWhen: string | undefined
          let slotInitialState: string | undefined
          let slotProperties: Property[] = []

          if (slotIsInstance) {
            const instSlot = slot as Instance
            slotName = instSlot.component
            slotVisibleWhen = instSlot.visibleWhen
            slotInitialState = instSlot.initialState
            slotProperties = instSlot.properties || []
          } else {
            const compSlot = slot as ComponentDefinition
            slotName = compSlot.name
            slotVisibleWhen = compSlot.visibleWhen
            slotInitialState = compSlot.initialState
            slotProperties = compSlot.properties || []
          }

          // Skip Component definitions that are templates (have sibling instances using them)
          if (slotIsComponent && templateNames.has(slotName)) {
            // This is a template definition, not a fillable slot - skip it
            // The instances using this template will be processed below
            continue
          }

          // Skip slots already processed in the first pass (user's order)
          if (processedSlots.has(slotName)) {
            continue
          }

          // Check if instance provided content for this slot
          const fillers = slotFillers.get(slotName)
          if (fillers && fillers.length > 0) {
            // Use instance's content instead of slot default
            // Inherit styles and visibility conditions from slot definition
            for (const filler of fillers) {
              // Merge slot properties with filler properties (filler wins on conflict)
              const mergedFiller = this.mergeSlotPropertiesIntoFiller(filler, slotProperties)
              const node = this.transformChild(mergedFiller, parentId, parentLayoutContext)
              // Transfer slot's visibleWhen to filler if slot has one
              if (slotVisibleWhen && !node.visibleWhen) {
                node.visibleWhen = slotVisibleWhen
              }
              if (slotInitialState && !node.initialState) {
                node.initialState = slotInitialState
              }
              result.push(node)
            }
            // Mark as used
            slotFillers.delete(slotName)
          } else {
            // Use slot's default content (the slot definition itself)
            // For Component type, create an instance-like object
            if (slotIsComponent) {
              const compSlot = slot as ComponentDefinition
              const pseudoInstance: Instance = {
                type: 'Instance',
                component: compSlot.name,
                name: null,
                properties: compSlot.properties,
                // Don't pass children here - they come from the component definition
                // via resolveChildren's componentChildren parameter
                children: [],
                line: compSlot.line,
                column: compSlot.column,
                visibleWhen: slotVisibleWhen,
                initialState: slotInitialState,
              }
              result.push(this.transformInstance(pseudoInstance, parentId, false, false, parentLayoutContext))
            } else if (slotIsInstance) {
              result.push(this.transformInstance(slot as Instance, parentId, false, false, parentLayoutContext))
            }
          }
        } else if (isSlot(slot)) {
          // Named slot placeholder - check for filler
          const slotObj = slot as Slot

          // Skip slots already processed in the first pass (user's order)
          if (processedSlots.has(slotObj.name)) {
            continue
          }

          const fillers = slotFillers.get(slotObj.name)
          if (fillers && fillers.length > 0) {
            for (const filler of fillers) {
              // Merge slot properties into filler (slot provides defaults)
              const mergedFiller = this.mergeSlotPropertiesIntoFiller(filler, slotObj.properties || [])
              result.push(this.transformChild(mergedFiller, parentId, parentLayoutContext))
            }
            slotFillers.delete(slotObj.name)
          } else {
            // No filler - render slot as visual placeholder
            result.push(this.transformSlotPrimitive(slotObj, parentId))
          }
        }
      }
    }

    // Add remaining instance children that didn't match any slot
    // (these are additional children, not slot fillers)
    for (const [_name, fillers] of slotFillers) {
      for (const filler of fillers) {
        result.push(this.transformChild(filler, parentId, parentLayoutContext))
      }
    }

    // Add non-slot children (text nodes)
    for (const child of nonSlotChildren) {
      result.push(this.transformChild(child, parentId, parentLayoutContext))
    }

    return result
  }

  /**
   * Convert childOverrides to Instance objects for slot filling
   *
   * childOverrides syntax: NavItem Icon "home"; Label "Home"
   * Each override becomes a pseudo-Instance that fills the corresponding slot
   */
  private childOverridesToInstances(overrides: ChildOverride[]): Instance[] {
    return overrides.map(override => ({
      type: 'Instance' as const,
      component: override.childName,
      name: null,
      properties: override.properties,
      children: [],
      line: override.properties[0]?.line || 0,
      column: override.properties[0]?.column || 0,
    }))
  }

  /**
   * Merge slot properties into a filler element.
   * Slot properties provide defaults, filler properties override them.
   *
   * Example:
   *   Slot definition: Title: fs 16, weight 500, col white
   *   Filler: Title "Hello", col red
   *   Result: fs 16, weight 500, col red (filler's col wins)
   */
  private mergeSlotPropertiesIntoFiller(
    filler: Instance | Text,
    slotProperties: Property[]
  ): Instance | Text {
    // If no slot properties, return filler as-is
    if (slotProperties.length === 0) {
      return filler
    }

    // Text nodes need to be wrapped or converted to Instance
    if (isText(filler) || hasContent(filler)) {
      const text = filler as Text
      // Create an Instance that acts as a styled text container
      return {
        type: 'Instance',
        component: 'Text',
        name: null,
        properties: [...slotProperties, { name: 'content', value: text.content, line: text.line, column: text.column }],
        children: [],
        line: text.line,
        column: text.column,
      } as Instance
    }

    // For Instance fillers, merge properties (filler wins on conflict)
    const fillerInstance = filler as Instance
    const fillerPropNames = new Set(fillerInstance.properties.map(p => p.name))

    // Add slot properties that aren't overridden by filler
    const mergedProperties = [
      ...slotProperties.filter(p => !fillerPropNames.has(p.name)),
      ...fillerInstance.properties,
    ]

    return {
      ...fillerInstance,
      properties: mergedProperties,
    }
  }

  private transformChild(child: Instance | Text | Slot, parentId?: string, parentLayoutContext?: ParentLayoutContext): IRNode {
    if (isSlot(child)) {
      return this.transformSlotPrimitive(child, parentId)
    }
    if (isText(child) || hasContent(child)) {
      const text = child as Text
      return {
        id: this.generateId(),
        tag: 'span',
        name: 'Text',
        properties: [{ name: 'textContent', value: text.content }],
        styles: [],
        events: [],
        children: [],
      }
    }
    // Handle ZagComponent children (e.g., Select: inside a Box)
    if (isZagComponent(child)) {
      return this.transformZagComponent(child, parentLayoutContext)
    }
    // Handle Table children (e.g., Table $tasks inside a Frame)
    if (isTable(child)) {
      return this.transformTable(child)
    }
    return this.transformInstance(child as Instance, parentId, false, false, parentLayoutContext)
  }

  /**
   * Extract inline states and events from instance children.
   *
   * The parser treats inline constructs like:
   * - `state hover bg #333` as a child Instance with component="state"
   * - `onclick toggle` as a child Instance with component="onclick"
   *
   * This method identifies and extracts them, returning:
   * - inlineStateStyles: IRStyle[] with state attribute
   * - inlineEvents: IREvent[]
   * - remainingChildren: actual UI children
   */
  private extractInlineStatesAndEvents(children: (Instance | Text)[]): {
    inlineStateStyles: IRStyle[]
    inlineEvents: IREvent[]
    remainingChildren: (Instance | Text)[]
  } {
    const inlineStateStyles: IRStyle[] = []
    const inlineEvents: IREvent[] = []
    const remainingChildren: (Instance | Text)[] = []

    for (const child of children) {
      // Only process Instance type
      if (!isInstance(child)) {
        remainingChildren.push(child)
        continue
      }

      const inst = child
      const component = inst.component.toLowerCase()

      // Check for inline state: "state hover bg #333"
      if (component === 'state') {
        // First property should be the state name, rest are styles
        const props = inst.properties
        if (props.length > 0) {
          // First value of first property is the state name
          const stateNameProp = props[0]
          const stateName = stateNameProp.name

          // Rest of the properties are the styles for this state
          const stateProps = props.slice(1)
          for (const prop of stateProps) {
            const cssStyles = this.propertyToCSS(prop)
            for (const style of cssStyles) {
              inlineStateStyles.push({ ...style, state: stateName })
            }
          }
        }
        continue
      }

      // Check for inline event: "onclick toggle" or "onhover highlight"
      if (component.startsWith('on')) {
        const eventName = mapEventToDom(component)
        const actions: IRAction[] = []

        // Parse actions from properties
        for (const prop of inst.properties) {
          // Action name is the property name, target is the first value
          actions.push({
            type: prop.name,
            target: prop.values.length > 0 ? String(prop.values[0]) : undefined,
            args: prop.values.slice(1).map(v => String(v)),
          })
        }

        if (actions.length > 0) {
          inlineEvents.push({
            name: eventName,
            actions,
          })
        }
        continue
      }

      // Not a state or event, keep as regular child
      remainingChildren.push(child)
    }

    return { inlineStateStyles, inlineEvents, remainingChildren }
  }

  // resolveComponent and mergeStates have been extracted to transformers/component-resolver.ts

  /**
   * Convert DefaultProperty[] from primitives.ts to Property[] for merging.
   * Defaults have no source position since they're not from user code.
   */
  // convertDefaultsToProperties, determineLayoutType, mergeProperties
  // have been extracted to transformers/property-utils-transformer.ts

  /**
   * Get HTML tag for component
   * Uses schema-based mapping from ir-helpers
   */
  private getTag(componentName: string, resolved: ComponentDefinition | null): string {
    const primitive = resolved?.primitive || componentName.toLowerCase()
    return getHtmlTag(primitive)
  }

  /**
   * Expand property sets in a list of properties.
   * A property set reference looks like: { name: 'content', values: [{ kind: 'token', name: 'cardstyle' }] }
   * If 'cardstyle' is a property set (token with properties), expand it to its properties.
   */
  private expandPropertySets(properties: Property[]): Property[] {
    const expanded: Property[] = []

    for (const prop of properties) {
      // Check if this is a property set reference (propset property from parser)
      // Syntax: Frame $cardstyle → propset: { kind: 'token', name: 'cardstyle' }
      if (prop.name === 'propset' && prop.values.length === 1) {
        const val = prop.values[0]
        if (typeof val === 'object' && val.kind === 'token') {
          const tokenName = val.name
          const propertySet = this.propertySetMap.get(tokenName)
          if (propertySet) {
            // Expand the property set - add all its properties
            expanded.push(...propertySet)
            continue
          }
        }
      }

      // Regular property - keep as is
      expanded.push(prop)
    }

    return expanded
  }

  /**
   * Transform Mirror properties to CSS styles
   *
   * This method uses intelligent layout merging to handle flexbox properties correctly.
   * It collects all layout-related properties first, then generates consistent CSS.
   * It also collects transform properties to combine them into a single transform value.
   */
  private transformProperties(properties: Property[], primitive: string = 'frame', parentLayoutContext?: ParentLayoutContext): IRStyle[] {
    // First, expand any property set references
    const expandedProperties = this.expandPropertySets(properties)

    const styles: IRStyle[] = []
    const layoutContext = createLayoutContext()

    // Transform context to combine multiple transforms
    const transformContext: { transforms: string[] } = { transforms: [] }

    // Check for explicit min/max width/height properties
    // These should NOT be overwritten by automatic min-width: 0 from w full
    const hasExplicitMinWidth = expandedProperties.some(p => p.name === 'minw' || p.name === 'min-width')
    const hasExplicitMinHeight = expandedProperties.some(p => p.name === 'minh' || p.name === 'min-height')
    const hasExplicitMaxWidth = expandedProperties.some(p => p.name === 'maxw' || p.name === 'max-width')
    const hasExplicitMaxHeight = expandedProperties.some(p => p.name === 'maxh' || p.name === 'max-height')

    // Check for explicit width/height properties (for hug-by-default behavior)
    // When no width is set, containers should hug their content (fit-content)
    const hasExplicitWidth = expandedProperties.some(p => p.name === 'w' || p.name === 'width' || p.name === 'size')
    const hasExplicitHeight = expandedProperties.some(p => p.name === 'h' || p.name === 'height' || p.name === 'size')
    layoutContext.hasExplicitWidth = hasExplicitWidth
    layoutContext.hasExplicitHeight = hasExplicitHeight

    // Collect layout values to process together (preserving order for "last wins")
    // This includes both direction (hor/ver) and alignment (9-zone, center, etc.)
    const layoutValues: string[] = []

    // First pass: collect layout properties into context
    for (const prop of expandedProperties) {
      const name = prop.name
      // Boolean property: either [true] or [] (empty values)
      const isBoolean = (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

      // Direction properties - collect for order-aware processing
      if ((name === 'horizontal' || name === 'hor') && isBoolean) {
        layoutValues.push(name)
        continue
      }
      if ((name === 'vertical' || name === 'ver') && isBoolean) {
        layoutValues.push(name)
        continue
      }

      // Alignment properties - collect for context-aware processing
      if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) {
        layoutValues.push(name)
        continue
      }

      // align property with values: align top left, align center
      if (name === 'align' && !isBoolean) {
        for (const val of prop.values) {
          const alignValue = String(val).toLowerCase()
          if (ALIGNMENT_PROPERTIES.has(alignValue)) {
            layoutValues.push(alignValue)
          }
        }
        continue
      }

      // Wrap
      if (name === 'wrap' && isBoolean) {
        layoutContext.flexWrap = 'wrap'
        continue
      }

      // Gap
      if ((name === 'gap' || name === 'g') && !isBoolean) {
        layoutContext.gap = formatCSSValue(name, resolveValueExtracted(prop.values, this.tokenSet, name))
        continue
      }

      // Grid (takes precedence over flex)
      if (name === 'grid') {
        layoutContext.isGrid = true
        layoutContext.gridColumns = resolveGridColumns(prop)
        continue
      }

      // Dense (grid auto-flow dense)
      if (name === 'dense' && isBoolean) {
        // Will be combined with hor/ver direction in generateLayoutStyles
        if (layoutContext.gridAutoFlow) {
          layoutContext.gridAutoFlow = layoutContext.gridAutoFlow + ' dense'
        } else {
          layoutContext.gridAutoFlow = 'dense'
        }
        continue
      }

      // Gap-x (column-gap)
      if ((name === 'gap-x' || name === 'gx') && !isBoolean) {
        layoutContext.columnGap = formatCSSValue(name, resolveValueExtracted(prop.values, this.tokenSet, name))
        continue
      }

      // Gap-y (row-gap)
      if ((name === 'gap-y' || name === 'gy') && !isBoolean) {
        layoutContext.rowGap = formatCSSValue(name, resolveValueExtracted(prop.values, this.tokenSet, name))
        continue
      }

      // Row-height (grid-auto-rows) - only handle in grid context
      // Otherwise let it fall through to schema-based handling
      if ((name === 'row-height' || name === 'rh') && !isBoolean && layoutContext.isGrid) {
        layoutContext.rowHeight = formatCSSValue(name, resolveValueExtracted(prop.values, this.tokenSet, name))
        continue
      }

      // Collect transform properties (rotate, scale, translate)
      if (name === 'rotate' || name === 'rot') {
        const deg = String(prop.values[0])
        transformContext.transforms.push(`rotate(${deg}deg)`)
        continue
      }
      if (name === 'scale') {
        const val = String(prop.values[0])
        transformContext.transforms.push(`scale(${val})`)
        continue
      }
    }

    // Apply collected layout values with order-awareness (last wins)
    applyAlignmentsToContext(layoutValues, layoutContext)

    // Generate layout styles from context (using extracted function)
    const layoutStyles = generateLayoutStyles(layoutContext, primitive)
    styles.push(...layoutStyles)

    // Second pass: process non-layout properties
    // Transform emission moved to AFTER this pass so properties can add to transformContext
    for (const prop of expandedProperties) {
      const name = prop.name
      const isBoolean = (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

      // Skip layout properties (already handled)
      if (DIRECTION_PROPERTIES.has(name) && isBoolean) continue
      if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) continue
      if (name === 'align' && !isBoolean) continue  // align top left → flex alignment
      if (name === 'wrap' && isBoolean) continue
      if ((name === 'gap' || name === 'g') && !isBoolean) continue
      if (name === 'grid') continue
      if (name === 'dense' && isBoolean) continue
      if ((name === 'gap-x' || name === 'gx') && !isBoolean) continue
      if ((name === 'gap-y' || name === 'gy') && !isBoolean) continue
      // Note: row-height is NOT skipped here - it will be handled by propertyToCSS via schema
      // In grid context, generateLayoutStyles handles it; outside grid, schema handles it

      // Skip transform properties (already handled in first pass)
      if (name === 'rotate' || name === 'rot') continue
      if (name === 'scale') continue

      const cssStyles = this.propertyToCSS(prop, primitive, transformContext, parentLayoutContext)
      styles.push(...cssStyles)
    }

    // Generate combined transform AFTER second pass
    // This allows multiple transforms (rotate + scale etc.) to combine
    if (transformContext.transforms.length > 0) {
      styles.push({ property: 'transform', value: transformContext.transforms.join(' ') })
    }

    // Remove automatic min-width: 0 / min-height: 0 if explicit values exist
    // This prevents w full from overwriting explicit minw/minh values
    // The "last wins" rule should only apply to same-source properties, not automatic additions
    if (hasExplicitMinWidth || hasExplicitMinHeight) {
      const filteredStyles = styles.filter(s => {
        if (s.property === 'min-width' && s.value === '0' && hasExplicitMinWidth) return false
        if (s.property === 'min-height' && s.value === '0' && hasExplicitMinHeight) return false
        return true
      })
      return filteredStyles
    }

    return styles
  }

  // Layout functions (applyAlignmentsToContext, generateLayoutStyles, resolveGridColumns)
  // have been extracted to transformers/layout-transformer.ts

  /**
   * Transform states to CSS styles with state attribute
   */
  private transformStates(states: State[]): IRStyle[] {
    const styles: IRStyle[] = []

    // Collect transition info for system states with animation/duration
    const transitionProps: Map<string, { duration: number; easing?: string }> = new Map()

    for (const state of states) {
      for (const prop of state.properties) {
        const cssStyles = this.propertyToCSS(prop)
        for (const style of cssStyles) {
          styles.push({ ...style, state: state.name })

          // Track CSS properties that need transitions for system states
          if (SYSTEM_STATES.has(state.name) && state.animation?.duration) {
            transitionProps.set(style.property, {
              duration: state.animation.duration,
              easing: state.animation.easing,
            })
          }
        }
      }
      // Note: childOverrides are handled separately in applyStateChildOverrides
    }

    // Generate CSS transition property for base element if any system states have animations
    if (transitionProps.size > 0) {
      const transitions: string[] = []
      for (const [prop, { duration, easing }] of transitionProps) {
        const durationMs = duration * 1000
        const easingStr = easing || 'ease'
        transitions.push(`${prop} ${durationMs}ms ${easingStr}`)
      }
      // Add transition style without state (applies to base element)
      styles.push({
        property: 'transition',
        value: transitions.join(', '),
      })
    }

    return styles
  }

  /**
   * Build state machine configuration from states with triggers
   *
   * States with triggers (onclick, onkeydown, etc.) are converted to
   * a state machine with transitions. States without triggers are
   * handled as pure CSS states (hover, focus, etc.)
   *
   * With the new function call syntax (onclick: toggle()), we also build
   * a state machine when there are state machine events (toggle, exclusive)
   * even if states don't have triggers.
   *
   * @param states Array of state definitions from AST
   * @param events Optional array of IR events to check for state machine functions
   * @returns State machine configuration or undefined if no state machine needed
   */
  private buildStateMachine(states: State[], events?: IREvent[]): IRStateMachine | undefined {
    // Create context for the extracted function
    const ctx: StateMachineTransformContext = {
      propertyToCSS: (prop) => this.propertyToCSS(prop),
      transformStateChild: (instance) => this.transformStateChild(instance),
    }
    return buildStateMachineExtracted(states, ctx, events)
  }

  // buildStateMachine implementation extracted to transformers/state-machine-transformer.ts


  // State conversion functions (convertStateDependency, convertStateAnimation)
  // have been extracted to transformers/data-transformer.ts

  /**
   * Apply state childOverrides to children
   *
   * When a state has childOverrides like:
   *   state filled
   *     Value col #fff
   *
   * This adds state-conditional styles to the matching child node.
   */
  private applyStateChildOverrides(children: IRNode[], states: State[]): void {
    for (const state of states) {
      for (const override of state.childOverrides) {
        // Find matching child by name
        const matchingChild = children.find(
          child => child.name === override.childName
        )

        if (matchingChild) {
          // Convert override properties to CSS styles with state condition
          for (const prop of override.properties) {
            const cssStyles = this.propertyToCSS(prop)
            for (const style of cssStyles) {
              matchingChild.styles.push({
                ...style,
                state: state.name,
              })
            }
          }
        }
      }
    }
  }

  /**
   * Convert Mirror property to CSS
   * @param parentLayoutContext - If parent is grid, x/y/w/h generate grid positioning instead of absolute
   */
  private propertyToCSS(prop: Property, primitive: string = 'frame', transformContext?: { transforms: string[] }, parentLayoutContext?: ParentLayoutContext): IRStyle[] {
    // Create context for the extracted function
    const ctx: PropertyTransformContext = {
      resolveValue: (values, propertyName) => resolveValueExtracted(values, this.tokenSet, propertyName),
      validateProperty: (propName, position) => this.validateProperty(propName, position),
    }
    return propertyToCSSExtracted(prop, ctx, primitive, transformContext, parentLayoutContext)
  }

  // propertyToCSS implementation extracted to transformers/property-transformer.ts


  /**
   * Format value for CSS
   */
  // formatCSSValue has been extracted to transformers/style-utils-transformer.ts

  // parseDirectionalSpacing has been extracted to transformers/style-utils-transformer.ts

  // formatBorderValue has been extracted to transformers/style-utils-transformer.ts

  // PROPERTY_TO_TOKEN_SUFFIX has been moved to schema/ir-helpers.ts
  // resolveValue, resolveContentValue, resolveTokenWithContext, extractHTMLProperties
  // have been extracted to transformers/value-resolver.ts

  // extractValueBinding has been extracted to transformers/property-utils-transformer.ts

  // Event transformation functions (transformEvents, transformAction)
  // have been extracted to transformers/event-transformer.ts

  /**
   * Convert boolean property to CSS
   * Uses schema as primary source, with fallback for special cases
   */
  // booleanPropertyToCSS has been extracted to transformers/style-utils-transformer.ts

  /**
   * Transform a state child (Instance) to IRNode
   * Used for state children (like Figma Variants)
   */
  private transformStateChild(instance: Instance): IRNode | null {
    if (!instance || !instance.component) {
      return null
    }

    // Determine HTML tag
    const tag = this.getTag(instance.component, null)

    // Get primitive for defaults
    const primitive = instance.component.toLowerCase()

    // Get primitive defaults and convert to Property format
    const primitiveDefaults = convertDefaultsToProperties(getPrimitiveDefaults(primitive))

    // Merge properties: Primitive Defaults < Instance Properties
    const properties = mergeProperties(primitiveDefaults, instance.properties)

    // Transform to styles
    const styles = this.transformProperties(properties, primitive)

    // Create node ID
    const nodeId = `state-child-${this.nodeIdCounter++}`

    // Create base node
    const node: IRNode = {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      properties: [],
      styles,
      events: [],
      children: [],
    }

    // Add text content if present
    const contentProp = instance.properties.find(p => p.name === 'content')
    if (contentProp && contentProp.values.length > 0) {
      node.properties.push({
        name: 'textContent',
        value: String(contentProp.values[0]),
      })
    }

    // Transform children recursively
    if (instance.children && instance.children.length > 0) {
      for (const child of instance.children) {
        const irChild = this.transformStateChild(child as Instance)
        if (irChild) {
          node.children.push(irChild)
        }
      }
    }

    return node
  }
}
