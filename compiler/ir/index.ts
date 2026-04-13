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
type PropertyValue =
  | string
  | number
  | boolean
  | TokenReference
  | LoopVarReference
  | ASTConditional
  | ComputedExpression

// ExpressionPart has been moved to transformers/expression-transformer.ts

/** Child node type that can be transformed - matches transformChild parameter */
type TransformableChild = Instance | Text | Slot

// ConditionalBlock has been moved to transformers/control-flow-transformer.ts
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
import type {
  IR,
  IRNode,
  IRStyle,
  IREvent,
  IRAction,
  IRProperty,
  IREach,
  IRConditional,
  SourcePosition,
  PropertySourceMap,
  IRAnimation,
  IRAnimationKeyframe,
  IRAnimationProperty,
  IRWarning,
  LayoutType,
  IRSlot,
  IRItem,
  IRItemProperty,
  IRZagNode,
  IRStateMachine,
  IRStateDefinition,
  IRStateTransition,
  IRToken,
  IRTable,
  IRTableColumn,
  IRTableStaticRow,
  IRTableStaticCell,
  IRDataObject,
  IRDataValue,
  IRDataReference,
  IRDataReferenceArray,
} from './types'
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
import {
  isCompoundPrimitive,
  getCompoundPrimitive,
  getCompoundSlotDef,
  isCompoundSlot,
} from '../schema/compound-primitives'
import {
  isChartPrimitive,
  getChartPrimitive,
  getChartSlotProperty,
} from '../schema/chart-primitives'
import { isContainer as isContainerPrimitive, FLEX_DEFAULTS } from '../schema/layout-defaults'
import type { IRChartSlot } from './types'
import { getCanonicalPropertyName, SYSTEM_STATES } from '../schema/parser-helpers'
// Extracted transformers
import {
  transformTable as transformTableExtracted,
  humanizeFieldName,
} from './transformers/table-transformer'
import { transformChart as transformChartExtracted } from './transformers/chart-transformer'
import { transformZagComponent as transformZagComponentExtracted } from './transformers/zag-transformer'
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
import { type ExpressionPart, buildExpressionString } from './transformers/expression-transformer'
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
import {
  childOverridesToInstances as childOverridesToInstancesExtracted,
  mergeSlotPropertiesIntoFiller as mergeSlotPropertiesIntoFillerExtracted,
} from './transformers/slot-utils'
import { fixLoopVariableReferences as fixLoopVariableReferencesExtracted } from './transformers/loop-utils'
import {
  transformStates as transformStatesExtracted,
  applyStateChildOverrides as applyStateChildOverridesExtracted,
  type StateStylesContext,
  type StateTransformResult,
} from './transformers/state-styles-transformer'
import {
  extractInlineStatesAndEvents as extractInlineStatesAndEventsExtracted,
  type InlineExtractionContext,
} from './transformers/inline-extraction'
import {
  transformEach as transformEachExtracted,
  transformConditional as transformConditionalExtracted,
  type ConditionalBlock,
  type ControlFlowContext,
} from './transformers/control-flow-transformer'
import {
  validateProperty as validatePropertyExtracted,
  isKnownProperty as isKnownPropertyExtracted,
  addWarning as addWarningExtracted,
  type ValidationContext,
} from './transformers/validation'
import { expandPropertySets as expandPropertySetsExtracted } from './transformers/property-set-expander'
import {
  transformCompoundPrimitive as transformCompoundPrimitiveExtracted,
  transformCompoundSlot as transformCompoundSlotExtracted,
  type CompoundTransformContext,
} from './transformers/compound-transformer'
import {
  transformStateChild as transformStateChildExtracted,
  type StateChildContext,
} from './transformers/state-child-transformer'

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
  private propertySetMap: Map<string, Property[]> = new Map() // Property sets (tokens with multiple properties)
  private nodeIdCounter = 0
  private includeSourceMap: boolean
  private sourceMapBuilder: SourceMapBuilder
  private warnings: IRWarning[] = []
  // Custom size-state thresholds from tokens like "compact.max: 300" or "tiny.max: 200"
  private customSizeStates: Map<string, { min?: number; max?: number }> = new Map()
  private customSizeStateNames: Set<string> = new Set()

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
    // Process size-state tokens (e.g., "compact.max: 300", "tiny.min: 100")
    this.processSizeStateTokens()
  }

  /**
   * Process tokens with .min/.max suffix for custom size-state thresholds
   * Examples:
   *   compact.max: 300  → override built-in compact max threshold
   *   tiny.max: 200     → define new "tiny" size-state with max threshold
   */
  private processSizeStateTokens(): void {
    for (const token of this.ast.tokens) {
      if (token.value === undefined || typeof token.value !== 'number') continue

      const match = token.name.match(/^(\w+)\.(min|max)$/)
      if (!match) continue

      const [, stateName, bound] = match
      const existing = this.customSizeStates.get(stateName) || {}

      if (bound === 'min') {
        existing.min = token.value
      } else if (bound === 'max') {
        existing.max = token.value
      }

      this.customSizeStates.set(stateName, existing)
      this.customSizeStateNames.add(stateName)
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
    addWarningExtracted({ warnings: this.warnings }, warning)
  }

  /**
   * Validate a property name against the schema.
   * Returns true if valid, false if unknown. Emits warnings for unknown properties.
   */
  private validateProperty(propName: string, position?: SourcePosition): boolean {
    return validatePropertyExtracted(propName, { warnings: this.warnings }, position)
  }

  /**
   * Check if a property is known (without emitting warnings)
   */
  private isKnownProperty(propName: string): boolean {
    return isKnownPropertyExtracted(propName)
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
          this.sourceMapBuilder.addNode(comp.nodeId || `def-${comp.name}`, comp.name, position, {
            isDefinition: true,
          })
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
      transformProperties: (props, primitive, parentCtx) =>
        this.transformProperties(props, primitive, parentCtx),
      transformChild: (child, parentId, parentCtx) =>
        this.transformChild(child, parentId, parentCtx),
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
      sourcePosition: instance?.line
        ? {
            line: instance.line,
            column: instance.column ?? 0,
            endLine: instance.line,
            endColumn: instance.column ?? 0,
          }
        : undefined,
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
    const sourcePosition =
      slot.line !== undefined && slot.column !== undefined
        ? { line: slot.line, column: slot.column, endLine: slot.line, endColumn: slot.column }
        : undefined

    // Add to source map builder (required for replaceSlot to work)
    if (this.includeSourceMap && sourcePosition) {
      this.sourceMapBuilder.addNode(nodeId, 'Slot', sourcePosition, {
        isDefinition: false,
        parentId,
      })
    }

    return {
      id: nodeId,
      tag: 'div',
      primitive: 'slot',
      properties: [{ name: 'textContent', value: slot.name }],
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
  private transformZagComponent(
    zagNode: ZagNode,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
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
   */
  private buildZagNodeFromInstance(
    instance: Instance,
    resolvedComponent: ComponentDefinition | null,
    primitive: string
  ): ZagNode {
    // Get machine name from ZAG_PRIMITIVES
    const zagDef = ZAG_PRIMITIVES[primitive]
    const machine = zagDef?.machine || primitive.toLowerCase()

    // Merge properties from resolved component and instance
    const allProperties = resolvedComponent
      ? mergeProperties(resolvedComponent.properties, instance.properties)
      : instance.properties

    // Extract slots and items from children
    const slots: Record<string, ZagSlotDef> = {}
    const items: ZagItem[] = []

    for (const child of instance.children) {
      if (child.type === 'Instance') {
        const childInstance = child as Instance
        const childName = childInstance.name || ''
        const srcPos = {
          line: childInstance.line,
          column: childInstance.column,
          endLine: childInstance.line,
          endColumn: childInstance.column,
        }
        // Check if child is a slot definition (ends with :) or known slot name
        if (
          childInstance.isDefinition ||
          (zagDef?.slots && zagDef.slots.includes(childName.replace(':', '')))
        ) {
          const slotName = childName.replace(':', '')
          slots[slotName] = {
            name: slotName,
            properties: childInstance.properties,
            states: [],
            children: childInstance.children as (Instance | Slot | Text)[],
            sourcePosition: srcPos,
          }
        } else {
          // Treat as item - get text content from first Text child or name
          let label = childName
          const textChild = childInstance.children.find(c => c.type === 'Text') as Text | undefined
          if (textChild) {
            label = textChild.content
          }
          items.push({
            value: childName,
            label,
            properties: childInstance.properties,
            children: childInstance.children as (Instance | Text)[],
            sourcePosition: srcPos,
          })
        }
      }
    }

    return {
      type: 'ZagComponent',
      machine,
      name: primitive,
      properties: allProperties,
      slots,
      items,
      events: instance.events || [],
      line: instance.line,
      column: instance.column,
    }
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
   * Delegates to extracted compound-transformer.ts
   */
  private transformCompoundPrimitive(
    instance: Instance,
    parentId?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
    const ctx: CompoundTransformContext = {
      generateId: () => this.generateId(),
      transformProperties: (props, prim, plc) => this.transformProperties(props, prim, plc),
      transformInstance: (inst, pid, isEach, isCond, plc) =>
        this.transformInstance(inst, pid, isEach, isCond, plc),
      createTextNode: text => this.createTextNode(text),
      tokenSet: this.tokenSet,
      includeSourceMap: this.includeSourceMap,
      addToSourceMap: this.includeSourceMap
        ? (nodeId, name, pos, opts) => this.sourceMapBuilder.addNode(nodeId, name, pos, opts)
        : undefined,
    }
    return transformCompoundPrimitiveExtracted(instance, ctx, parentId, parentLayoutContext)
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
        position: instance.position,
      })
      return this.createEmptyNode(instance)
    }

    // Resolve component definition first
    const component = this.componentMap.get(instance.component)
    const resolverCtx: ComponentResolverContext = {
      componentMap: this.componentMap,
      addWarning: warning => this.addWarning(warning as IRWarning),
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
      return this.transformChartPrimitive(
        instance,
        resolvedComponent,
        primitive,
        parentLayoutContext
      )
    }

    // Handle Compound primitives (Shell, etc.)
    if (instance.isCompound && instance.compoundType) {
      return this.transformCompoundPrimitive(instance, parentId, parentLayoutContext)
    }

    // Get primitive defaults and convert to Property format
    const primitiveDefaults = convertDefaultsToProperties(getPrimitiveDefaults(primitive))

    // Determine HTML tag
    const tag = this.getTag(instance.component, resolvedComponent)

    // Expand component references in instance properties BEFORE merging
    // This handles syntax like: Input placeholder "...", InputField
    // where InputField is a component whose properties should be applied
    const expandedInstanceProps = this.expandPropertySets(instance.properties)

    // Merge properties: Primitive Defaults < Component Defaults < Expanded Instance Properties
    const properties = mergeProperties(
      primitiveDefaults,
      mergeProperties(resolvedComponent?.properties || [], expandedInstanceProps)
    )

    // Check if any descendants have w full (recursive check)
    // If so, parent should NOT use fit-content (children need space to expand into)
    // This also checks component references (like InputField) that might bring in w full
    const hasWidthFullInDescendants = (children: any[]): boolean => {
      for (const child of children) {
        // Check direct properties for w full
        if (child.properties) {
          const hasDirectWidthFull = child.properties.some(
            (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] === 'full'
          )
          if (hasDirectWidthFull) return true

          // Check component references used as style mixins (e.g., InputField)
          // These are properties with PascalCase names and empty values
          for (const p of child.properties) {
            if (p.values.length === 0 && p.name.length > 0) {
              const firstChar = p.name[0]
              if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
                // This is a PascalCase property - check if it's a component with w full
                const referencedComponent = this.componentMap.get(p.name)
                if (referencedComponent) {
                  const hasComponentWidthFull = referencedComponent.properties.some(
                    (cp: Property) =>
                      (cp.name === 'w' || cp.name === 'width') && cp.values[0] === 'full'
                  )
                  if (hasComponentWidthFull) return true
                }
              }
            }
          }
        }

        // Check if child's base component has w full (e.g., MyInput as Input: w full)
        if (child.component) {
          const childComponent = this.componentMap.get(child.component)
          if (childComponent) {
            const hasComponentWidthFull = childComponent.properties.some(
              (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] === 'full'
            )
            if (hasComponentWidthFull) return true
          }
        }

        // Recursively check children's children
        if (child.children && child.children.length > 0) {
          // Only recurse if this child doesn't have explicit width (otherwise it constrains its children)
          const childHasExplicitWidth = child.properties?.some(
            (p: Property) => (p.name === 'w' || p.name === 'width') && p.values[0] !== 'full'
          )
          if (!childHasExplicitWidth && hasWidthFullInDescendants(child.children)) {
            return true
          }
        }
      }
      return false
    }

    const childHasWidthFull = hasWidthFullInDescendants(instance.children || [])

    // Transform to styles (with intelligent layout merging)
    // Pass parent layout context for context-aware property handling (e.g., x/y in grid)
    const childrenInfo = childHasWidthFull ? { hasWidthFull: true } : undefined
    const styles = this.transformProperties(
      properties,
      primitive,
      parentLayoutContext,
      childrenInfo
    )

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

    // Create context for state transformation (includes custom size-state thresholds)
    const stateCtx: StateStylesContext = {
      propertyToCSS: prop => this.propertyToCSS(prop),
      customSizeStates: this.customSizeStateNames,
    }

    // Add state styles from component definition
    const stateResult: StateTransformResult = resolvedComponent?.states
      ? transformStatesExtracted(resolvedComponent.states, stateCtx)
      : { styles: [], hasSizeStates: false }

    // Add state styles from instance inline states (e.g., "Frame bg #333 hover: bg light")
    const instanceStateResult: StateTransformResult = instance.states?.length
      ? transformStatesExtracted(instance.states, stateCtx)
      : { styles: [], hasSizeStates: false }

    // Check if this node uses size-states (needs container-type: inline-size)
    const needsContainer = stateResult.hasSizeStates || instanceStateResult.hasSizeStates

    // Transform events from component definition FIRST (needed for state machine check)
    const events = resolvedComponent?.events ? transformEvents(resolvedComponent.events) : []

    // Transform events from instance inline events (e.g., "Input onkeydown enter: submit")
    const instanceEvents = instance.events?.length ? transformEvents(instance.events) : []

    // Combine all events to check for state machine functions
    const allEvents = [...events, ...instanceEvents]

    // Build state machine from states with triggers OR if there are state machine events
    const allStates = [...(resolvedComponent?.states || []), ...(instance.states || [])]
    const stateMachine = this.buildStateMachine(allStates, allEvents)

    // Extract inline states and events from instance children
    const { inlineStateStyles, inlineEvents, remainingChildren } =
      this.extractInlineStatesAndEvents(instance.children || [])

    // Convert childOverrides to instance children for slot filling
    const childOverrideInstances = childOverridesToInstancesExtracted(instance.childOverrides || [])

    // Generate node ID FIRST so we can pass it to children as their parentId
    const nodeId = this.generateId()

    // Determine layout context for children
    // If this element is a grid container, children get grid context for x/y/w/h
    // For flex containers, track direction so w full / h full can use appropriate strategy
    const isGridContainer = styles.some(s => s.property === 'display' && s.value === 'grid')
    const isAbsoluteContainer = styles.some(
      s => s.property === 'position' && s.value === 'relative'
    )
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
      const anyStateHasChildren = Object.values(stateMachine.states).some(
        s => s.children && s.children.length > 0
      )
      if (
        anyStateHasChildren &&
        stateMachine.states['default'] &&
        !stateMachine.states['default'].children
      ) {
        stateMachine.states['default'].children = children
      }
    }

    // If this node has a route, add a click event with navigate action
    if (route) {
      events.push({
        name: 'click',
        actions: [{ type: 'navigate', target: route }],
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
      this.sourceMapBuilder.addNode(nodeId, instance.component, sourcePosition, {
        instanceName: instance.name || undefined,
        isDefinition: false,
        isEachTemplate,
        isConditional,
        parentId,
      })

      // Add property positions to the node mapping
      for (const propMap of propertySourceMaps) {
        this.sourceMapBuilder.addPropertyPosition(nodeId, propMap.name, propMap.position)
      }
    }

    // Apply state childOverrides to children
    // This adds state-conditional styles to matching child nodes
    if (resolvedComponent?.states) {
      applyStateChildOverridesExtracted(children, resolvedComponent.states, stateCtx)
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
    const instanceNameFromProp = nameProp
      ? resolveValueExtracted(nameProp.values, this.tokenSet)
      : undefined
    const resolvedInstanceName = instance.name || instanceNameFromProp || undefined

    // Extract valueBinding for two-way data binding (for input and textarea)
    // Note: Select is a Zag component and handles bind internally via zag-transformer
    // 'bind' property can be used for two-way binding without explicit 'value'
    const primitiveLower = primitive.toLowerCase()
    const isInputElement = primitiveLower === 'input' || primitiveLower === 'textarea'
    let valueBinding = isInputElement ? extractValueBinding(properties) : undefined
    // If no valueBinding from 'value' prop, but 'bind' is set, use 'bind' for two-way binding
    // This allows simplified syntax: `Input bind varName` instead of `Input value $varName, bind varName`
    if (!valueBinding && bind && isInputElement) {
      valueBinding = bind.startsWith('$') ? bind.slice(1) : bind
    }

    // Check for keyboard-nav property (enables form keyboard navigation)
    const hasKeyboardNav = properties.some(p => p.name === 'keyboard-nav' || p.name === 'keynav')

    return {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      instanceName: resolvedInstanceName,
      properties: extractHTMLPropertiesExtracted(properties, this.tokenSet, primitive),
      styles: [
        ...styles,
        ...stateResult.styles,
        ...instanceStateResult.styles,
        ...inlineStateStyles,
      ],
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
      needsContainer: needsContainer || undefined,
    }
  }

  private transformEach(each: Each): IRNode {
    const ctx: ControlFlowContext = {
      generateId: () => this.generateId(),
      transformInstance: (inst, pid, isEach, isCond) =>
        this.transformInstance(inst, pid, isEach, isCond),
      includeSourceMap: this.includeSourceMap,
      addToSourceMap: this.includeSourceMap
        ? (nodeId, name, pos, opts) => this.sourceMapBuilder.addNode(nodeId, name, pos, opts)
        : undefined,
    }
    return transformEachExtracted(each, ctx)
  }

  // fixLoopVariableReferences has been extracted to ./transformers/loop-utils.ts

  private transformConditional(cond: ConditionalBlock): IRNode {
    const ctx: ControlFlowContext = {
      generateId: () => this.generateId(),
      transformInstance: (inst, pid, isEach, isCond) =>
        this.transformInstance(inst, pid, isEach, isCond),
      includeSourceMap: this.includeSourceMap,
      addToSourceMap: this.includeSourceMap
        ? (nodeId, name, pos, opts) => this.sourceMapBuilder.addNode(nodeId, name, pos, opts)
        : undefined,
    }
    return transformConditionalExtracted(cond, ctx)
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
      return instanceChildren.map(child =>
        this.transformChild(child, parentId, parentLayoutContext)
      )
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
          const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(filler, slotProperties)
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
              const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(filler, slotProperties)
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
              result.push(
                this.transformInstance(pseudoInstance, parentId, false, false, parentLayoutContext)
              )
            } else if (slotIsInstance) {
              result.push(
                this.transformInstance(
                  slot as Instance,
                  parentId,
                  false,
                  false,
                  parentLayoutContext
                )
              )
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
              const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(
                filler,
                slotObj.properties || []
              )
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

  // childOverridesToInstances and mergeSlotPropertiesIntoFiller
  // have been extracted to ./transformers/slot-utils.ts

  private transformChild(
    child: Instance | Text | Slot,
    parentId?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode {
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
   * Delegates to extracted inline-extraction.ts
   */
  private extractInlineStatesAndEvents(children: (Instance | Text)[]): {
    inlineStateStyles: IRStyle[]
    inlineEvents: IREvent[]
    remainingChildren: (Instance | Text)[]
  } {
    const ctx: InlineExtractionContext = {
      propertyToCSS: prop => this.propertyToCSS(prop),
    }
    return extractInlineStatesAndEventsExtracted(children, ctx)
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
   * Expand property sets and component style mixins in a list of properties.
   * Delegates to extracted property-set-expander.ts
   */
  private expandPropertySets(properties: Property[]): Property[] {
    return expandPropertySetsExtracted(properties, this.propertySetMap, this.componentMap)
  }

  /**
   * Transform Mirror properties to CSS styles
   *
   * This method uses intelligent layout merging to handle flexbox properties correctly.
   * It collects all layout-related properties first, then generates consistent CSS.
   * It also collects transform properties to combine them into a single transform value.
   */
  private transformProperties(
    properties: Property[],
    primitive: string = 'frame',
    parentLayoutContext?: ParentLayoutContext,
    childrenInfo?: { hasWidthFull?: boolean }
  ): IRStyle[] {
    // First, expand any property set references
    const expandedProperties = this.expandPropertySets(properties)

    const styles: IRStyle[] = []
    const layoutContext = createLayoutContext()

    // Transform context to combine multiple transforms
    const transformContext: { transforms: string[] } = { transforms: [] }

    // Check for explicit min/max width/height properties
    // These should NOT be overwritten by automatic min-width: 0 from w full
    const hasExplicitMinWidth = expandedProperties.some(
      p => p.name === 'minw' || p.name === 'min-width'
    )
    const hasExplicitMinHeight = expandedProperties.some(
      p => p.name === 'minh' || p.name === 'min-height'
    )
    const hasExplicitMaxWidth = expandedProperties.some(
      p => p.name === 'maxw' || p.name === 'max-width'
    )
    const hasExplicitMaxHeight = expandedProperties.some(
      p => p.name === 'maxh' || p.name === 'max-height'
    )

    // Check for explicit width/height properties (for hug-by-default behavior)
    // When no width is set, containers should hug their content (fit-content)
    const hasExplicitWidth = expandedProperties.some(
      p => p.name === 'w' || p.name === 'width' || p.name === 'size'
    )
    const hasExplicitHeight = expandedProperties.some(
      p => p.name === 'h' || p.name === 'height' || p.name === 'size'
    )
    layoutContext.hasExplicitWidth = hasExplicitWidth
    layoutContext.hasExplicitHeight = hasExplicitHeight

    // If children have w full, parent should NOT use fit-content
    if (childrenInfo?.hasWidthFull) {
      layoutContext.childHasWidthFull = true
    }

    // Collect layout values to process together (preserving order for "last wins")
    // This includes both direction (hor/ver) and alignment (9-zone, center, etc.)
    const layoutValues: string[] = []

    // First pass: collect layout properties into context
    for (const prop of expandedProperties) {
      const name = prop.name
      // Boolean property: either [true] or [] (empty values)
      const isBoolean =
        (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

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
        layoutContext.gap = formatCSSValue(
          name,
          resolveValueExtracted(prop.values, this.tokenSet, name)
        )
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
        layoutContext.columnGap = formatCSSValue(
          name,
          resolveValueExtracted(prop.values, this.tokenSet, name)
        )
        continue
      }

      // Gap-y (row-gap)
      if ((name === 'gap-y' || name === 'gy') && !isBoolean) {
        layoutContext.rowGap = formatCSSValue(
          name,
          resolveValueExtracted(prop.values, this.tokenSet, name)
        )
        continue
      }

      // Row-height (grid-auto-rows) - only handle in grid context
      // Otherwise let it fall through to schema-based handling
      if ((name === 'row-height' || name === 'rh') && !isBoolean && layoutContext.isGrid) {
        layoutContext.rowHeight = formatCSSValue(
          name,
          resolveValueExtracted(prop.values, this.tokenSet, name)
        )
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
      const isBoolean =
        (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

      // Skip layout properties (already handled)
      if (DIRECTION_PROPERTIES.has(name) && isBoolean) continue
      if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) continue
      if (name === 'align' && !isBoolean) continue // align top left → flex alignment
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

  // transformStates has been extracted to transformers/state-styles-transformer.ts

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
      propertyToCSS: prop => this.propertyToCSS(prop),
      transformStateChild: instance => this.transformStateChild(instance),
    }
    return buildStateMachineExtracted(states, ctx, events)
  }

  // buildStateMachine implementation extracted to transformers/state-machine-transformer.ts

  // State conversion functions (convertStateDependency, convertStateAnimation)
  // have been extracted to transformers/data-transformer.ts

  // applyStateChildOverrides has been extracted to transformers/state-styles-transformer.ts

  /**
   * Convert Mirror property to CSS
   * @param parentLayoutContext - If parent is grid, x/y/w/h generate grid positioning instead of absolute
   */
  private propertyToCSS(
    prop: Property,
    primitive: string = 'frame',
    transformContext?: { transforms: string[] },
    parentLayoutContext?: ParentLayoutContext
  ): IRStyle[] {
    // Create context for the extracted function
    const ctx: PropertyTransformContext = {
      resolveValue: (values, propertyName) =>
        resolveValueExtracted(values, this.tokenSet, propertyName),
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
   * Delegates to extracted state-child-transformer.ts
   */
  private transformStateChild(instance: Instance): IRNode | null {
    const ctx: StateChildContext = {
      generateNodeId: () => `state-child-${this.nodeIdCounter++}`,
      transformProperties: (props, prim) => this.transformProperties(props, prim),
    }
    return transformStateChildExtracted(instance, ctx)
  }
}
