/**
 * Mirror IR Generator
 *
 * Transforms AST to Intermediate Representation.
 * Uses schema (src/schema/dsl.ts) for property-to-CSS conversion.
 */

import type {
  AST,
  CanvasDefinition,
  ComponentDefinition,
  Instance,
  Property,
  IconDefinition,
} from '../parser/ast'

import { isComponent, isZagComponent, isSlot } from '../parser/ast'
import type { IR, IRCanvas, IRStyle, IRWarning, IRToken } from './types'
import { SourceMap, SourceMapBuilder, calculateSourcePosition } from './source-map'
import { simplePropertyToCSS } from '../schema/ir-helpers'
import { getDevicePreset } from '../schema/dsl'
// Extracted transformers
import type { TransformerContext } from './transformers/transformer-context'
import { transformDataAttributes, transformAnimation } from './transformers/data-transformer'
import { mergeProperties } from './transformers/property-utils-transformer'
import { addWarning as addWarningExtracted } from './transformers/validation'

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

import * as instance_ops from './ops/instance-ops'
import * as children_resolver from './ops/children-resolver'
import * as zag_instance_builder from './ops/zag-instance-builder'
import * as properties_ops from './ops/properties-ops'
import * as text_node_builder from './ops/text-node-builder'
import * as state_builder from './ops/state-builder'

export class IRTransformer {
  ast: AST
  componentMap: Map<string, ComponentDefinition> = new Map()
  tokenSet: Set<string> = new Set()
  propertySetMap: Map<string, Property[]> = new Map() // Property sets (tokens with multiple properties)
  nodeIdCounter = 0
  stateChildCounter = 0 // Separate counter for state children to avoid shifting main node IDs
  includeSourceMap: boolean
  sourceMapBuilder: SourceMapBuilder
  warnings: IRWarning[] = []
  // Custom size-state thresholds from tokens like "compact.max: 300" or "tiny.max: 200"
  customSizeStates: Map<string, { min?: number; max?: number }> = new Map()
  customSizeStateNames: Set<string> = new Set()
  // Cycle detection: stack of component names currently being instantiated
  // (Bug #21). When a component references itself in its body, we'd recurse
  // infinitely. Detect via stack-membership and bail with a warning.
  componentInstantiationStack: string[] = []

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

  // === Bound ops methods (extracted to ./ops/*.ts) ===
  // instance-ops.ts
  createEmptyNode = instance_ops.createEmptyNode
  transformSlotPrimitive = instance_ops.transformSlotPrimitive
  transformChartPrimitive = instance_ops.transformChartPrimitive
  transformInstance = instance_ops.transformInstance
  transformEach = instance_ops.transformEach
  transformConditional = instance_ops.transformConditional
  transformChild = instance_ops.transformChild
  extractInlineStatesAndEvents = instance_ops.extractInlineStatesAndEvents
  // children-resolver.ts
  resolveChildren = children_resolver.resolveChildren
  // zag-instance-builder.ts
  transformZagComponent = zag_instance_builder.transformZagComponent
  buildZagNodeFromInstance = zag_instance_builder.buildZagNodeFromInstance
  // properties-ops.ts
  validateProperty = properties_ops.validateProperty
  isKnownProperty = properties_ops.isKnownProperty
  getTag = properties_ops.getTag
  expandPropertySets = properties_ops.expandPropertySets
  transformProperties = properties_ops.transformProperties
  propertyToCSS = properties_ops.propertyToCSS
  // text-node-builder.ts
  createTextNode = text_node_builder.createTextNode
  // state-builder.ts
  buildStateMachine = state_builder.buildStateMachine
  transformStateChild = state_builder.transformStateChild

  /**
   * Process tokens with .min/.max suffix for custom size-state thresholds
   * Examples:
   *   compact.max: 300  → override built-in compact max threshold
   *   tiny.max: 200     → define new "tiny" size-state with max threshold
   */
  processSizeStateTokens(): void {
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
  addWarning(warning: IRWarning): void {
    addWarningExtracted({ warnings: this.warnings }, warning)
  }

  /**
   * Recursively register a component and all its nested component definitions
   * If a component with the same name already exists, merge the definitions
   */
  registerComponent(comp: ComponentDefinition): void {
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
      return this.transformInstance(inst as Instance)
    })

    // Transform animations
    const animations = this.ast.animations.map(anim => transformAnimation(anim))

    // Transform custom icons
    const icons = (this.ast.icons || []).map((icon: IconDefinition) => ({
      name: icon.name,
      path: icon.path,
      viewBox: icon.viewBox || '0 0 24 24',
    }))

    // Transform canvas
    const canvas = this.ast.canvas ? this.transformCanvas(this.ast.canvas) : undefined

    return { canvas, nodes, tokens, animations, icons }
  }

  /**
   * Transform canvas definition to IR
   * Converts properties to CSS styles for root element
   */
  transformCanvas(canvas: CanvasDefinition): IRCanvas {
    const styles: IRStyle[] = []

    // Apply device preset if specified (sourced from schema)
    if (canvas.device) {
      const preset = getDevicePreset(canvas.device)
      if (preset) {
        styles.push({ property: 'width', value: `${preset.width}px` })
        styles.push({ property: 'height', value: `${preset.height}px` })
      }
    }

    // Apply explicit properties (can override device preset)
    for (const prop of canvas.properties) {
      const propName = prop.name.toLowerCase()
      const value = prop.values[0]

      // Use existing property transformation logic
      if (typeof value === 'string' || typeof value === 'number') {
        const result = simplePropertyToCSS(propName, String(value))
        if (result.handled) {
          styles.push(...result.styles)
        }
      }
    }

    return {
      styles,
      sourcePosition: calculateSourcePosition(canvas.line, canvas.column),
    }
  }

  generateId(): string {
    return `node-${++this.nodeIdCounter}`
  }

  /**
   * Create a TransformerContext for use with extracted transformers
   */
  createTransformerContext(): TransformerContext {
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
}
