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
  ZagSlotDef,
  ZagItem,
  TableNode,
  TableColumnNode,
  TableSlotNode,
} from '../parser/ast'
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
import type { IR, IRNode, IRStyle, IREvent, IRAction, IRProperty, IREach, IRConditional, SourcePosition, PropertySourceMap, IRAnimation, IRAnimationKeyframe, IRAnimationProperty, IRWarning, LayoutType, IRSlot, IRItem, IRStateMachine, IRStateDefinition, IRStateTransition, IRToken, IRTable, IRTableColumn } from './types'
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
  hoverPropertyToCSS,
  mapEventToDom,
  getHtmlTag,
} from '../schema/ir-helpers'
import { findProperty, getEvent, getAction, getState, DSL } from '../schema/dsl'
import { isZagPrimitive, ZAG_PRIMITIVES, getItemKeywords, getZagPrimitive } from '../schema/zag-primitives'
import { isCompoundPrimitive, getCompoundPrimitive, getCompoundSlotDef, isCompoundSlot } from '../schema/compound-primitives'
import { getCanonicalPropertyName, SYSTEM_STATES } from '../schema/parser-helpers'
import {
  isContainer as isContainerPrimitive,
  FLEX_DEFAULTS,
} from '../schema/layout-defaults'

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

/**
 * Built-in state functions that are handled by the runtime
 * These functions operate on the element's state machine
 */
const BUILTIN_STATE_FUNCTIONS = new Set(['toggle', 'cycle', 'exclusive'])  // cycle is alias for toggle

/**
 * Layout properties that affect flex container behavior
 */
interface LayoutContext {
  direction: 'row' | 'column' | null
  justifyContent: string | null
  alignItems: string | null
  flexWrap: string | null
  gap: string | null
  isGrid: boolean
  gridColumns: string | null
  gridAutoFlow: string | null      // 'row' | 'column' | 'dense' | 'row dense' | 'column dense'
  columnGap: string | null         // For gap-x/gx
  rowGap: string | null            // For gap-y/gy
  rowHeight: string | null         // For row-height/rh (grid-auto-rows)
  // Internal alignment tracking (before direction-based mapping)
  _hAlign?: 'start' | 'end' | 'center'
  _vAlign?: 'start' | 'end' | 'center'
  // Track if width/height were explicitly set (for hug-by-default behavior)
  hasExplicitWidth?: boolean
  hasExplicitHeight?: boolean
}

/**
 * Parent layout context passed to children for context-aware property handling
 * In grid context, x/y/w/h become grid positioning instead of absolute positioning
 * In flex context, direction determines how w full / h full behave
 */
interface ParentLayoutContext {
  type: 'flex' | 'grid' | 'absolute' | null
  gridColumns?: number
  flexDirection?: 'row' | 'column'  // For w full / h full: determines main vs cross axis
}

class IRTransformer {
  private ast: AST
  private componentMap: Map<string, ComponentDefinition> = new Map()
  private tokenSet: Set<string> = new Set()
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
    // Build token lookup set
    for (const token of ast.tokens) {
      this.tokenSet.add(token.name)
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
   * Returns true if valid, false if unknown.
   */
  private validateProperty(propName: string, position?: SourcePosition): boolean {
    // Check non-CSS properties (HTML attributes, animation props)
    if (NON_CSS_PROPERTIES.has(propName)) {
      return true
    }

    // Check hover- prefix properties
    if (propName.startsWith('hover-')) {
      const baseProp = propName.replace('hover-', '')
      // Check if base property is valid (without emitting warning for base)
      if (this.isKnownProperty(baseProp)) {
        return true
      }
      // Emit warning with the full hover-* property name
      this.addWarning({
        type: 'unknown-property',
        message: `Unknown property: '${propName}'`,
        property: propName,
        position,
      })
      return false
    }

    // Check schema
    if (findProperty(propName)) {
      return true
    }

    // Check PROPERTY_TO_CSS mapping (includes some aliases not in schema)
    if (PROPERTY_TO_CSS[propName]) {
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
        properties: this.mergeProperties(existing.properties, comp.properties),
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
    // Transform tokens (filter out data objects without values)
    const tokens: IRToken[] = this.ast.tokens
      .filter(t => t.value !== undefined)
      .map(t => ({
        name: t.name,
        type: t.tokenType,
        value: t.value as string | number,
      }))

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
    const animations = this.ast.animations.map(anim => this.transformAnimation(anim))

    return { nodes, tokens, animations }
  }

  /**
   * Transform an animation definition from AST to IR
   */
  private transformAnimation(anim: AnimationDefinition): IRAnimation {
    return {
      name: anim.name,
      easing: anim.easing || 'ease',
      duration: anim.duration,
      roles: anim.roles,
      keyframes: anim.keyframes.map(kf => this.transformAnimationKeyframe(kf)),
    }
  }

  /**
   * Transform an animation keyframe from AST to IR
   */
  private transformAnimationKeyframe(kf: AnimationKeyframe): IRAnimationKeyframe {
    return {
      time: kf.time,
      properties: kf.properties.map(prop => this.transformAnimationProperty(prop)),
    }
  }

  /**
   * Transform an animation property from AST to IR
   *
   * Maps Mirror property names to CSS properties and formats values.
   */
  private transformAnimationProperty(prop: AnimationKeyframeProperty): IRAnimationProperty {
    // Map Mirror property names to CSS properties
    const propertyMap: Record<string, string> = {
      'opacity': 'opacity',
      'y-offset': 'transform',
      'x-offset': 'transform',
      'scale': 'transform',
      'rotate': 'transform',
      'background': 'background',
      'bg': 'background',
      'color': 'color',
      'col': 'color',
      'width': 'width',
      'height': 'height',
      'border-radius': 'border-radius',
      'rad': 'border-radius',
    }

    const cssProperty = propertyMap[prop.name] || prop.name
    let cssValue = String(prop.value)

    // Format transform values
    if (prop.name === 'y-offset') {
      cssValue = `translateY(${prop.value}px)`
    } else if (prop.name === 'x-offset') {
      cssValue = `translateX(${prop.value}px)`
    } else if (prop.name === 'scale') {
      cssValue = `scale(${prop.value})`
    } else if (prop.name === 'rotate') {
      cssValue = `rotate(${prop.value}deg)`
    } else if (['width', 'height', 'border-radius', 'rad'].includes(prop.name) && typeof prop.value === 'number') {
      cssValue = `${prop.value}px`
    }

    return {
      target: prop.target,
      property: cssProperty,
      value: cssValue,
      easing: prop.easing,
    }
  }

  private generateId(): string {
    return `node-${++this.nodeIdCounter}`
  }

  /**
   * Create an empty placeholder node for invalid instances
   */
  private createEmptyNode(instance: any): IRNode {
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
   */
  private transformZagComponent(zagNode: any, parentLayoutContext?: ParentLayoutContext): IRNode {
    const nodeId = this.generateId()

    // Build machine configuration from properties
    const machineConfig: Record<string, unknown> = {
      id: nodeId,
    }

    // Collect styling properties separately (w, h, bg, pad, etc.)
    const stylingProperties: Property[] = []

    // Machine config property names (not styling)
    const machineConfigProps = new Set([
      'placeholder', 'multiple', 'searchable', 'clearable', 'keepOpen', 'disabled',
      'value', 'defaultValue', 'step', 'allowMouseWheel', 'clampValueOnBlur',
      'maxTags', 'allowDuplicate', 'submitMode', 'placement', 'offset', 'deselectable',
      'orientation', 'activationMode', 'loopFocus', 'checked', 'defaultChecked',
      'indeterminate', 'collapsible', 'collapsed', 'label', 'invalid', 'readOnly', 'required',
      'name', 'src', 'fallback', 'accept', 'maxFiles', 'maxSize', 'allowOversize',
      'minSize', 'min', 'max', 'count', 'allowHalf', 'dir', 'size', 'length',
      'blurOnComplete', 'otp', 'type', 'visible', 'defaultVisible',
      // Form-specific props
      'collection', 'auto', 'validateOnBlur', 'validateOnChange',
    ])

    for (const prop of zagNode.properties || []) {
      // Check if this is a styling property (not a machine config property)
      if (!machineConfigProps.has(prop.name)) {
        stylingProperties.push(prop)
        continue
      }

      switch (prop.name) {
        case 'placeholder':
          machineConfig.placeholder = String(prop.values[0] ?? '')
          break
        case 'multiple':
          machineConfig.multiple = prop.values.length === 0 || prop.values[0] === true
          break
        case 'searchable':
          machineConfig.searchable = prop.values.length === 0 || prop.values[0] === true
          break
        case 'clearable':
          machineConfig.clearable = prop.values.length === 0 || prop.values[0] === true
          break
        case 'keepOpen':
          // keepOpen inverts closeOnSelect - if keepOpen is set, closeOnSelect should be false
          if (prop.values.length === 0 || prop.values[0] === true) {
            machineConfig.closeOnSelect = false
          }
          break
        case 'disabled':
          machineConfig.disabled = prop.values.length === 0 || prop.values[0] === true
          break
        case 'value':
        case 'defaultValue':
          // Filter out empty values (can occur in nested components)
          const nonEmptyValues = prop.values.filter((v: any) => v !== '' && v !== undefined && v !== null)
          if (nonEmptyValues.length === 0) {
            // No valid values, skip
          } else if (nonEmptyValues.length === 1) {
            machineConfig[prop.name] = String(nonEmptyValues[0])
          } else {
            machineConfig[prop.name] = nonEmptyValues.map((v: any) => String(v))
          }
          break
        // NumberInput-specific props
        case 'step':
          machineConfig.step = Number(prop.values[0] ?? 1)
          break
        case 'allowMouseWheel':
          machineConfig.allowMouseWheel = prop.values.length === 0 || prop.values[0] === true
          break
        case 'clampValueOnBlur':
          machineConfig.clampValueOnBlur = prop.values.length === 0 || prop.values[0] === true
          break
        // TagsInput-specific props
        case 'maxTags':
          machineConfig.maxTags = Number(prop.values[0] ?? Infinity)
          break
        case 'allowDuplicate':
          machineConfig.allowDuplicate = prop.values.length === 0 || prop.values[0] === true
          break
        // Editable-specific props
        case 'submitMode':
          machineConfig.submitMode = String(prop.values[0] ?? 'both')
          break
        case 'placement':
          machineConfig.placement = String(prop.values[0] ?? 'bottom-start')
          break
        case 'offset':
          machineConfig.offset = Number(prop.values[0] ?? 4)
          break
        case 'deselectable':
          machineConfig.deselectable = prop.values.length === 0 || prop.values[0] === true
          break
        // Tabs-specific props
        case 'orientation':
          machineConfig.orientation = String(prop.values[0] ?? 'horizontal')
          break
        case 'activationMode':
          machineConfig.activationMode = String(prop.values[0] ?? 'automatic')
          break
        case 'loopFocus':
          machineConfig.loopFocus = prop.values.length === 0 || prop.values[0] === true
          break
        // Checkbox/Switch-specific props
        case 'checked':
        case 'defaultChecked':
          machineConfig[prop.name] = prop.values.length === 0 || prop.values[0] === true
          break
        case 'indeterminate':
          machineConfig.indeterminate = prop.values.length === 0 || prop.values[0] === true
          break
        // Accordion-specific props
        case 'collapsible':
          machineConfig.collapsible = prop.values.length === 0 || prop.values[0] === true
          break
        // SideNav-specific props
        case 'collapsed':
          machineConfig.collapsed = prop.values.length === 0 || prop.values[0] === true
          break
        case 'label':
          machineConfig.label = String(prop.values[0] ?? '')
          break
        case 'invalid':
          machineConfig.invalid = prop.values.length === 0 || prop.values[0] === true
          break
        case 'readOnly':
          machineConfig.readOnly = prop.values.length === 0 || prop.values[0] === true
          break
        case 'required':
          machineConfig.required = prop.values.length === 0 || prop.values[0] === true
          break
        case 'name':
          machineConfig.name = String(prop.values[0] ?? '')
          break
        // Avatar-specific props
        case 'src':
          machineConfig.src = String(prop.values[0] ?? '')
          break
        case 'fallback':
          machineConfig.fallback = String(prop.values[0] ?? '')
          break
        // FileUpload-specific props
        case 'accept':
          machineConfig.accept = String(prop.values[0] ?? '*')
          break
        case 'maxFiles':
          machineConfig.maxFiles = Number(prop.values[0] ?? 10)
          break
        case 'maxSize':
          machineConfig.maxSize = Number(prop.values[0] ?? 10485760)
          break
        // Carousel-specific props
        case 'items':
          // Items can be passed as JSON array
          try {
            machineConfig.items = JSON.parse(String(prop.values[0] ?? '[]'))
          } catch {
            machineConfig.items = prop.values
          }
          break
        case 'slidesPerView':
          machineConfig.slidesPerView = Number(prop.values[0] ?? 1)
          break
        case 'loop':
          machineConfig.loop = prop.values.length === 0 || prop.values[0] === true
          break
        case 'autoPlay':
          machineConfig.autoPlay = prop.values.length === 0 || prop.values[0] === true
          break
        case 'autoPlayInterval':
          machineConfig.autoPlayInterval = Number(prop.values[0] ?? 5000)
          break
        // Steps-specific props
        case 'steps':
          // Steps can be passed as JSON array
          try {
            machineConfig.steps = JSON.parse(String(prop.values[0] ?? '[]'))
          } catch {
            machineConfig.steps = prop.values
          }
          break
        case 'defaultStep':
          machineConfig.defaultStep = Number(prop.values[0] ?? 0)
          break
        case 'linear':
          machineConfig.linear = prop.values.length === 0 || prop.values[0] === true
          break
        // Pagination-specific props
        case 'count':
        case 'totalPages':
          machineConfig.count = Number(prop.values[0] ?? 10)
          break
        case 'page':
        case 'defaultPage':
          machineConfig.page = Number(prop.values[0] ?? 1)
          break
        case 'siblingCount':
          machineConfig.siblingCount = Number(prop.values[0] ?? 1)
          break
        // TreeView-specific props
        case 'data':
          // 'data' alias for tree items (items is handled above)
          try {
            machineConfig.items = JSON.parse(String(prop.values[0] ?? '[]'))
          } catch {
            machineConfig.items = prop.values
          }
          break
        case 'expandedKeys':
        case 'defaultExpandedKeys':
          try {
            machineConfig.expandedKeys = JSON.parse(String(prop.values[0] ?? '[]'))
          } catch {
            machineConfig.expandedKeys = prop.values.map(String)
          }
          break
        case 'selectedKeys':
        case 'defaultSelectedKeys':
          try {
            machineConfig.selectedKeys = JSON.parse(String(prop.values[0] ?? '[]'))
          } catch {
            machineConfig.selectedKeys = prop.values.map(String)
          }
          break
        // DatePicker-specific props
        case 'min':
        case 'max':
          machineConfig[prop.name] = String(prop.values[0] ?? '')
          break
        case 'locale':
          machineConfig.locale = String(prop.values[0] ?? 'en-US')
          break
        case 'selectionMode':
        case 'mode':
          // Allow 'mode' as alias for 'selectionMode'
          machineConfig.selectionMode = String(prop.values[0] ?? 'single')
          break
        case 'fixedWeeks':
          machineConfig.fixedWeeks = prop.values.length === 0 || prop.values[0] === true
          break
        case 'startOfWeek':
          machineConfig.startOfWeek = Number(prop.values[0] ?? 0)
          break
        case 'closeOnSelect':
          machineConfig.closeOnSelect = prop.values.length === 0 || prop.values[0] === true
          break
        case 'inline':
          machineConfig.inline = prop.values.length === 0 || prop.values[0] === true
          break
        // Listbox-specific props
        case 'icon':
          machineConfig.icon = String(prop.values[0] ?? 'check')
          break
        // PinInput-specific props
        case 'length':
          machineConfig.length = Number(prop.values[0] ?? 4)
          break
        case 'mask':
          machineConfig.mask = prop.values.length === 0 || prop.values[0] === true
          break
        case 'otp':
          machineConfig.otp = prop.values.length === 0 || prop.values[0] === true
          break
        case 'type':
          machineConfig.type = String(prop.values[0] ?? 'numeric')
          break
        // PasswordInput-specific props
        case 'visible':
        case 'defaultVisible':
          machineConfig[prop.name] = prop.values.length === 0 || prop.values[0] === true
          break
        // Form-specific props
        case 'collection':
          // Remove $ prefix if present for the collection name
          const collectionValue = String(prop.values[0] ?? '')
          machineConfig.collection = collectionValue.startsWith('$') ? collectionValue.slice(1) : collectionValue
          break
        case 'auto':
          machineConfig.auto = prop.values.length === 0 || prop.values[0] === true
          break
        case 'validateOnBlur':
          machineConfig.validateOnBlur = prop.values.length === 0 || prop.values[0] === true
          break
        case 'validateOnChange':
          machineConfig.validateOnChange = prop.values.length === 0 || prop.values[0] === true
          break
      }
    }

    // Transform slots based on the component type
    const slots: Record<string, IRSlot> = {}

    // Process defined slots
    for (const [slotName, slotDefUnknown] of Object.entries(zagNode.slots || {})) {
      const slotDef = slotDefUnknown as ZagSlotDef
      // Transform slot children if present
      const slotChildren = (slotDef.children || []).map((child: any) => this.transformChild(child))
      slots[slotName] = {
        name: slotName,
        apiMethod: `get${slotName}Props`,
        element: slotName === 'Trigger' ? 'button' : 'div',
        styles: this.transformProperties(slotDef.properties || [], 'slot'),
        children: slotChildren,
        portal: slotName === 'Content',
        sourcePosition: slotDef.sourcePosition,
      }
    }

    // Add default slots based on the component type from ZAG_PRIMITIVES
    const machineType = zagNode.machine || 'select'
    const primitiveKey = Object.keys(ZAG_PRIMITIVES).find(
      key => ZAG_PRIMITIVES[key].machine === machineType
    )
    const primitiveDef = primitiveKey ? ZAG_PRIMITIVES[primitiveKey] : null

    if (primitiveDef?.slots) {
      // Add default slots from the primitive definition
      for (const slotName of primitiveDef.slots) {
        if (!slots[slotName]) {
          slots[slotName] = {
            name: slotName,
            apiMethod: `get${slotName}Props`,
            element: slotName === 'Trigger' ? 'button' : 'div',
            styles: [],
            children: [],
            portal: slotName === 'Content' || slotName === 'Positioner',
          }
        }
      }
    } else {
      // Fallback for Select-like components
      if (!slots['Trigger']) {
        slots['Trigger'] = {
          name: 'Trigger',
          apiMethod: 'getTriggerProps',
          element: 'button',
          styles: [],
          children: [],
          portal: false,
        }
      }
      if (!slots['Content']) {
        slots['Content'] = {
          name: 'Content',
          apiMethod: 'getContentProps',
          element: 'div',
          styles: [],
          children: [],
          portal: true,
        }
      }
    }

    // Transform items (including children for custom item content)
    const transformItem = (item: ZagItem): any => {
      const irItem: any = {
        value: item.value ?? item.label ?? '',
        label: item.label ?? item.value ?? '',
        disabled: item.disabled,
        icon: item.icon,
        sourcePosition: item.sourcePosition,
      }
      // Include isGroup flag for groups
      if (item.isGroup) {
        irItem.isGroup = true
        irItem.type = 'group'  // For identifying group items
        // Recursively transform group items
        if (item.items && item.items.length > 0) {
          irItem.items = item.items.map(transformItem)
        }
        // Include collapsible flag for groups
        if (item.collapsible) {
          irItem.collapsible = true
        }
        // Include defaultOpen flag for groups
        if (item.defaultOpen !== undefined) {
          irItem.defaultOpen = item.defaultOpen
        }
      }
      // SideNav-specific item properties
      if (item.badge) {
        irItem.badge = item.badge
      }
      if (item.arrow) {
        irItem.arrow = true
      }
      if (item.shows) {
        irItem.shows = item.shows
      }
      // Form Field-specific item properties
      if (item.name) {
        irItem.name = item.name
      }
      if (item.placeholder) {
        irItem.placeholder = item.placeholder
      }
      if (item.multiline) {
        irItem.multiline = true
      }
      if (item.display) {
        irItem.display = item.display
      }
      if (item.filter) {
        irItem.filter = item.filter
      }
      if (item.allowClear) {
        irItem.allowClear = true
      }
      if (item.max !== undefined) {
        irItem.max = item.max
      }
      if (item.required) {
        irItem.required = true
      }
      if (item.readOnly) {
        irItem.readOnly = true
      }
      // Include properties if present (layout props like ver, gap, pad)
      if (item.properties && item.properties.length > 0) {
        irItem.properties = item.properties
      }
      // Include children if present (custom content like Icon, Text)
      if (item.children && item.children.length > 0) {
        irItem.children = item.children.map((child: any) => this.transformChild(child))
      } else if (irItem.value) {
        // No children but has value → load content from file
        // e.g., Tab "Home", value "home" → loads home.mirror
        irItem.loadFromFile = irItem.value
      }
      return irItem
    }
    const items = (zagNode.items || []).map(transformItem)

    // Source position
    const sourcePosition = zagNode.line !== undefined
      ? {
          line: zagNode.line,
          column: zagNode.column ?? 0,
          endLine: zagNode.line,
          endColumn: zagNode.column ?? 0,
        }
      : undefined

    // Transform styling properties to CSS styles
    const styles = this.transformProperties(stylingProperties, 'div', parentLayoutContext)

    // Create IRZagNode
    const irNode: any = {
      id: nodeId,
      tag: 'div',
      primitive: zagNode.name?.toLowerCase() ?? 'select',
      name: zagNode.name,
      properties: [],
      styles,
      events: [],
      children: [],
      isZagComponent: true,
      // Use component name for routing (e.g., 'segmentedcontrol') not machine name (e.g., 'radio-group')
      // This allows components sharing the same machine to have distinct routing
      zagType: (zagNode.name || zagNode.machine || 'select').toLowerCase(),
      slots,
      items,
      machineConfig,
      sourcePosition,
      isDefinition: zagNode.isDefinition ?? false,
    }

    // Add to source map builder for selection support in Studio
    if (this.includeSourceMap && sourcePosition) {
      this.sourceMapBuilder.addNode(
        nodeId,
        zagNode.name || 'Select',
        sourcePosition,
        {
          isDefinition: false,
        }
      )

      // Add property positions for inline editing
      for (const prop of zagNode.properties || []) {
        if (prop.line !== undefined && prop.column !== undefined) {
          this.sourceMapBuilder.addPropertyPosition(nodeId, prop.name, {
            line: prop.line,
            column: prop.column,
            endLine: prop.line,
            endColumn: prop.column,
          })
        }
      }
    }

    return irNode
  }

  /**
   * Transform a TableNode to an IRTable
   *
   * Handles:
   * - Data source reference ($collection)
   * - Query clauses (where, by, grouped by)
   * - Column definitions (inferred + overrides)
   * - Slots (Header, Row, Footer, Group)
   * - Selection mode
   */
  private transformTable(table: TableNode): IRTable {
    const nodeId = this.generateId()

    // Extract selection mode from properties
    const selectionModeProp = table.properties.find(p => p.name === 'selectionMode')
    const selectionMode = selectionModeProp?.values[0] as 'single' | 'multi' | undefined

    // Transform column definitions
    const columns: IRTableColumn[] = (table.columns || []).map(col => this.transformTableColumn(col))

    // If no columns defined, they will be inferred at runtime from data schema
    // The backend will handle this

    // Transform slots to IRNode arrays
    const headerSlot = table.headerSlot
      ? this.transformTableSlotChildren(table.headerSlot)
      : undefined
    const rowSlot = table.rowSlot
      ? this.transformTableSlotChildren(table.rowSlot)
      : undefined
    const footerSlot = table.footerSlot
      ? this.transformTableSlotChildren(table.footerSlot)
      : undefined
    const groupSlot = table.groupSlot
      ? this.transformTableSlotChildren(table.groupSlot)
      : undefined

    // Build source position
    const sourcePosition: SourcePosition = {
      line: table.line ?? 0,
      column: table.column ?? 0,
      endLine: table.line ?? 0,
      endColumn: table.column ?? 0,
    }

    // Create the IRTable node
    const irTable: IRTable = {
      id: nodeId,
      tag: 'div',
      primitive: 'table',
      name: 'Table',
      isTableComponent: true,
      dataSource: table.dataSource.startsWith('$')
        ? table.dataSource.slice(1)  // Remove $ prefix
        : table.dataSource,
      filter: table.filter,
      orderBy: table.orderBy,
      orderDesc: table.orderDesc,
      groupBy: table.groupBy,
      columns,
      selectionMode,
      headerSlot,
      rowSlot,
      footerSlot,
      groupSlot,
      properties: [],
      styles: [],
      events: [],
      children: [],
      sourcePosition,
    }

    // Add to source map for selection support in Studio
    if (this.includeSourceMap && sourcePosition) {
      this.sourceMapBuilder.addNode(
        nodeId,
        'Table',
        sourcePosition,
        { isDefinition: false }
      )
    }

    return irTable
  }

  /**
   * Transform a TableColumnNode to an IRTableColumn
   */
  private transformTableColumn(col: TableColumnNode): IRTableColumn {
    return {
      field: col.field,
      label: col.label ?? this.humanizeFieldName(col.field),
      width: col.width,
      prefix: col.prefix,
      suffix: col.suffix,
      align: col.align as 'left' | 'right' | 'center' | undefined,
      sortable: col.sortable,
      filterable: col.filterable,
      hidden: col.hidden,
      aggregation: col.aggregation as 'sum' | 'avg' | 'count' | undefined,
      inferredType: 'string',  // Default, will be overridden at runtime
      customCell: col.customCell
        ? col.customCell.map(child => this.transformChild(child as any))
        : undefined,
    }
  }

  /**
   * Transform table slot children to IRNode array
   */
  private transformTableSlotChildren(slot: TableSlotNode): IRNode[] {
    return (slot.children || []).map(child => this.transformChild(child as any))
  }

  /**
   * Convert a field name to a human-readable label
   * e.g., "firstName" -> "First Name", "user_id" -> "User Id"
   */
  private humanizeFieldName(field: string): string {
    return field
      // Insert space before uppercase letters
      .replace(/([A-Z])/g, ' $1')
      // Replace underscores and hyphens with spaces
      .replace(/[_-]/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, c => c.toUpperCase())
      // Trim and normalize spaces
      .trim()
      .replace(/\s+/g, ' ')
  }

  /**
   * Build a synthetic ZagNode from an Instance that inherits from a Zag primitive
   * This allows component definitions like "MySelect as Select:" to work correctly
   */
  private buildZagNodeFromInstance(
    instance: Instance,
    resolvedComponent: ComponentDefinition | null,
    primitive: string
  ): any {
    // Merge properties from instance and component definition
    const properties = this.mergeProperties(
      resolvedComponent?.properties || [],
      instance.properties
    )

    // Extract slots from component children
    const slots: Record<string, any> = {}
    const items: any[] = []

    // Process children from both component definition and instance
    const allChildren = [
      ...(resolvedComponent?.children || []),
      ...(instance.children || [])
    ]

    // Get valid item keywords for this primitive (e.g., ['Field'] for Form, ['Tab'] for Tabs)
    const itemKeywords = getItemKeywords(primitive.charAt(0).toUpperCase() + primitive.slice(1))
    const zagDef = getZagPrimitive(primitive.charAt(0).toUpperCase() + primitive.slice(1))
    const itemProps = zagDef?.itemProps || []

    for (const child of allChildren) {
      if (!child) continue

      // Check if child is a Slot definition (e.g., "Trigger:", "Content:")
      if (child.type === 'Slot' || (child.type === 'Instance' && child.component?.endsWith(':'))) {
        const slotName = child.type === 'Slot'
          ? child.name
          : child.component.replace(':', '')
        slots[slotName] = {
          properties: child.properties || [],
          sourcePosition: child.line !== undefined
            ? { line: child.line, column: child.column ?? 0 }
            : undefined
        }
      }
      // Check if child is an Item (using itemKeywords for the primitive)
      else if (child.type === 'Instance' && itemKeywords.includes(child.component)) {
        // Extract all item properties based on itemProps from primitive definition
        const itemData: Record<string, unknown> = {}

        // Extract label from text property or child Text element
        const labelProp = child.properties?.find((p: Property) => p.name === 'text' || p.name === 'label')
        let label = ''
        if (labelProp?.values?.[0]) {
          label = String(labelProp.values[0])
        } else {
          // Look for a Text child to get content
          const textChild = child.children?.find(c => c.type === 'Text')
          if (textChild && textChild.type === 'Text') {
            label = textChild.content
          }
        }
        itemData.label = label
        itemData.value = label

        // Extract all item-specific properties (name, placeholder, multiline, etc.)
        for (const propName of itemProps) {
          const prop = child.properties?.find((p: Property) => p.name === propName)
          if (prop) {
            // Handle boolean properties
            if (prop.values === undefined || prop.values.length === 0) {
              itemData[propName] = true
            } else {
              itemData[propName] = prop.values[0]
            }
          }
        }

        // Check for disabled property
        const disabledProp = child.properties?.find((p: Property) => p.name === 'disabled')
        itemData.disabled = disabledProp ? true : false

        itemData.sourcePosition = child.line !== undefined
          ? { line: child.line, column: child.column ?? 0 }
          : undefined

        items.push(itemData)
      }
      // Check for slot-like Instance children (named slots like "Trigger:", "Content:")
      else if (child.type === 'Instance' && (child.component === 'Trigger' || child.component === 'Content')) {
        slots[child.component] = {
          properties: child.properties || [],
          children: child.children || [],
          sourcePosition: child.line !== undefined
            ? { line: child.line, column: child.column ?? 0 }
            : undefined
        }
      }
    }

    // If no slots defined, add default slots based on the primitive type
    // This allows simple definitions like "MySelect as Select: Item "A""
    if (Object.keys(slots).length === 0) {
      // Find the matching ZAG_PRIMITIVES key (case-insensitive)
      const primitiveKey = Object.keys(ZAG_PRIMITIVES).find(
        key => key.toLowerCase() === primitive.toLowerCase()
      )
      const primitiveDef = primitiveKey ? ZAG_PRIMITIVES[primitiveKey] : null
      if (primitiveDef?.slots) {
        // Add first two slots as defaults (typically Root + main content)
        const defaultSlots = primitiveDef.slots.slice(0, 2)
        for (const slotName of defaultSlots) {
          slots[slotName] = { properties: [] }
        }
      } else {
        // Fallback for Select-like components
        slots['Trigger'] = { properties: [] }
        slots['Content'] = { properties: [] }
      }
    }

    // Build the synthetic ZagNode
    return {
      type: 'ZagComponent',
      name: primitive.charAt(0).toUpperCase() + primitive.slice(1), // Capitalize
      machine: primitive.toLowerCase(),
      properties,
      slots,
      items,
      line: instance.line,
      column: instance.column,
    }
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
    const instanceNameFromProp = nameProp ? this.resolveValue(nameProp.values) : undefined
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
        events: this.transformEvents(child.events || []),
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
      console.warn('Instance missing component name:', instance)
      return this.createEmptyNode(instance)
    }

    // Resolve component definition first
    const component = this.componentMap.get(instance.component)
    const resolvedComponent = component ? this.resolveComponent(component) : null

    // Determine primitive for defaults and layout context
    const primitive = resolvedComponent?.primitive || instance.component.toLowerCase()

    // Handle Zag primitives (Select, Accordion, etc.)
    // Check both direct usage (e.g., "Select") and inheritance (e.g., "MySelect as Select:")
    if (isZagPrimitive(instance.component) || isZagPrimitive(primitive)) {
      // Build a synthetic ZagNode from the instance + resolved component
      const zagNode = this.buildZagNodeFromInstance(instance, resolvedComponent, primitive)
      return this.transformZagComponent(zagNode, parentLayoutContext)
    }

    // Handle Compound primitives (Shell, etc.)
    if (instance.isCompound && instance.compoundType) {
      return this.transformCompoundPrimitive(instance, parentId, parentLayoutContext)
    }

    // Get primitive defaults and convert to Property format
    const primitiveDefaults = this.convertDefaultsToProperties(getPrimitiveDefaults(primitive))

    // Determine HTML tag
    const tag = this.getTag(instance.component, resolvedComponent)

    // Merge properties: Primitive Defaults < Component Defaults < Instance Properties
    const properties = this.mergeProperties(
      primitiveDefaults,
      this.mergeProperties(
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
      ? this.transformEvents(resolvedComponent.events)
      : []

    // Transform events from instance inline events (e.g., "Input onkeydown enter: submit")
    const instanceEvents = instance.events?.length
      ? this.transformEvents(instance.events)
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
    const isRelativeContainer = styles.some(s => s.property === 'position' && s.value === 'relative')
    if (isRelativeContainer) {
      for (const child of children) {
        // Only add if child doesn't already have position set
        const hasPosition = child.styles.some(s => s.property === 'position')
        if (!hasPosition) {
          child.styles.push({ property: 'position', value: 'absolute' })
        }

        // Convert flex-based "full" to percentage-based sizing for absolute elements
        // flex: 1 1 0% and align-self: stretch don't work for absolute positioned elements
        const hasFlex = child.styles.some(s => s.property === 'flex' && s.value === '1 1 0%')
        const hasStretch = child.styles.some(s => s.property === 'align-self' && s.value === 'stretch')
        if (hasFlex || hasStretch) {
          // Detect which dimension had "full" by checking min-width/min-height: 0
          const hasMinWidth0 = child.styles.some(s => s.property === 'min-width' && s.value === '0')
          const hasMinHeight0 = child.styles.some(s => s.property === 'min-height' && s.value === '0')

          // Remove flex-related styles, but keep explicit min-width/min-height values
          const filteredStyles = child.styles.filter(s => {
            if (s.property === 'flex') return false
            if (s.property === 'align-self') return false
            // Only remove min-width: 0 / min-height: 0, keep explicit values
            if (s.property === 'min-width' && s.value === '0') return false
            if (s.property === 'min-height' && s.value === '0') return false
            return true
          })
          child.styles.length = 0
          child.styles.push(...filteredStyles)

          // Add percentage-based sizing
          if (hasMinWidth0) child.styles.push({ property: 'width', value: '100%' })
          if (hasMinHeight0) child.styles.push({ property: 'height', value: '100%' })
        }

        // Convert flex-based alignment to CSS position properties for stacked containers
        // This enables: `bottom, left` → position at bottom-left corner
        const justifyContent = child.styles.find(s => s.property === 'justify-content')?.value
        const alignItems = child.styles.find(s => s.property === 'align-items')?.value
        const flexDirection = child.styles.find(s => s.property === 'flex-direction')?.value

        // Only apply position-based offsets when using column direction (default)
        // In column layout: justify-content controls vertical, align-items controls horizontal
        if (flexDirection === 'column' || !flexDirection) {
          // Vertical positioning (justify-content)
          const hasTop = child.styles.some(s => s.property === 'top')
          const hasBottom = child.styles.some(s => s.property === 'bottom')
          if (!hasTop && !hasBottom) {
            if (justifyContent === 'flex-end') {
              child.styles.push({ property: 'bottom', value: '0' })
            } else if (justifyContent === 'flex-start') {
              child.styles.push({ property: 'top', value: '0' })
            } else if (justifyContent === 'center') {
              // Center vertically using top: 50% and transform
              child.styles.push({ property: 'top', value: '50%' })
              const hasTransform = child.styles.some(s => s.property === 'transform')
              if (!hasTransform) {
                child.styles.push({ property: 'transform', value: 'translateY(-50%)' })
              }
            }
          }

          // Horizontal positioning (align-items)
          const hasLeft = child.styles.some(s => s.property === 'left')
          const hasRight = child.styles.some(s => s.property === 'right')
          if (!hasLeft && !hasRight) {
            if (alignItems === 'flex-start') {
              child.styles.push({ property: 'left', value: '0' })
            } else if (alignItems === 'flex-end') {
              child.styles.push({ property: 'right', value: '0' })
            } else if (alignItems === 'center') {
              // Center horizontally using left: 50% and transform
              child.styles.push({ property: 'left', value: '50%' })
              const existingTransform = child.styles.find(s => s.property === 'transform')
              if (existingTransform) {
                // Combine with existing translateY if present
                if (existingTransform.value === 'translateY(-50%)') {
                  existingTransform.value = 'translate(-50%, -50%)'
                }
              } else {
                child.styles.push({ property: 'transform', value: 'translateX(-50%)' })
              }
            }
          }
        }
      }
    }

    // Grid container: Remove flex-based styles from children
    // In grid, flex: 1 1 0% has no effect - grid cells fill automatically
    // (reusing isGridContainer from earlier layout context detection)
    if (isGridContainer) {
      for (const child of children) {
        const hasFlex = child.styles.some(s => s.property === 'flex' && s.value === '1 1 0%')
        if (hasFlex) {
          // Remove flex-related styles (they don't work in grid context)
          // But keep explicit min-width/min-height values
          const filteredStyles = child.styles.filter(s => {
            if (s.property === 'flex') return false
            if (s.property === 'align-self') return false
            // Only remove min-width: 0 / min-height: 0, keep explicit values
            if (s.property === 'min-width' && s.value === '0') return false
            if (s.property === 'min-height' && s.value === '0') return false
            return true
          })
          child.styles.length = 0
          child.styles.push(...filteredStyles)
          // No need to add width/height - grid cells fill their area automatically
        }
      }
    }

    // Determine layout type for drop strategy detection
    const layoutType = this.determineLayoutType(properties)

    // Extract instanceName from 'name' property if not set via 'named' keyword
    // This allows `name MenuBtn` syntax to work for state references like `MenuBtn.open:`
    const nameProp = properties.find(p => p.name === 'name')
    const instanceNameFromProp = nameProp ? this.resolveValue(nameProp.values) : undefined
    const resolvedInstanceName = instance.name || instanceNameFromProp || undefined

    // Extract valueBinding for two-way data binding (only for input elements)
    const valueBinding = (primitive === 'input' || primitive === 'textarea')
      ? this.extractValueBinding(properties)
      : undefined

    return {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      instanceName: resolvedInstanceName,
      properties: this.extractHTMLProperties(properties, primitive),
      styles: [...styles, ...stateStyles, ...instanceStateStyles, ...inlineStateStyles],
      events: [...events, ...instanceEvents, ...inlineEvents],
      children,
      visibleWhen,
      initialState,
      selection,
      route,
      stateMachine,
      sourcePosition,
      propertySourceMaps,
      layoutType,
      isDefinition: instance.isDefinition ?? false,
      valueBinding,
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

  private transformConditional(cond: any): IRNode {
    const nodeId = this.generateId()
    const conditionalData: IRConditional = {
      id: nodeId,
      condition: cond.condition,
      then: cond.then.map((child: any) => this.transformInstance(child, nodeId, false, true)),
      else: cond.else?.length > 0
        ? cond.else.map((child: any) => this.transformInstance(child, nodeId, false, true))
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
        const eventName = this.mapEventName(component)
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

  /**
   * Resolve component inheritance chain
   *
   * Supports two syntaxes:
   * - `Extended extends Base:` → component.extends = 'Base'
   * - `Extended as Base:` → component.primitive = 'Base' (if Base is a component)
   */
  private resolveComponent(component: ComponentDefinition): ComponentDefinition {
    // Determine the parent - either from explicit extends or from primitive if it's a component name
    let parentName = component.extends
    let inheritFromPrimitive = false

    // If no explicit extends, check if primitive is actually a component name
    if (!parentName && component.primitive) {
      const primitiveAsComponent = this.componentMap.get(component.primitive)
      if (primitiveAsComponent) {
        parentName = component.primitive
        inheritFromPrimitive = true
      }
    }

    if (!parentName) {
      return component
    }

    const parent = this.componentMap.get(parentName)
    if (!parent) {
      return component
    }

    const resolvedParent = this.resolveComponent(parent)

    // Merge parent + child (child overrides)
    return {
      ...component,
      // If we inherited via primitive name, use the parent's actual primitive
      primitive: inheritFromPrimitive ? resolvedParent.primitive : (component.primitive || resolvedParent.primitive),
      properties: this.mergeProperties(resolvedParent.properties, component.properties),
      states: this.mergeStates(resolvedParent.states, component.states),
      events: [...resolvedParent.events, ...component.events],
      children: [...resolvedParent.children, ...component.children],
    }
  }

  /**
   * Merge states (child state properties override parent state properties for same state name)
   *
   * Example:
   * - Parent: hover: bg #f00
   * - Child: hover: bg #00f
   * - Result: hover: bg #00f (child wins)
   *
   * But if parent has focus: and child has hover:, both are kept.
   */
  private mergeStates(parentStates: State[], childStates: State[]): State[] {
    // Create a map of state name -> merged state
    const stateMap = new Map<string, State>()

    // Add parent states first
    for (const state of parentStates) {
      stateMap.set(state.name, { ...state })
    }

    // Merge child states (child properties override parent)
    for (const state of childStates) {
      const existing = stateMap.get(state.name)
      if (existing) {
        // Merge properties: child overrides parent
        stateMap.set(state.name, {
          ...state,
          properties: this.mergeProperties(existing.properties, state.properties),
          childOverrides: [...(existing.childOverrides || []), ...(state.childOverrides || [])],
        })
      } else {
        stateMap.set(state.name, { ...state })
      }
    }

    return Array.from(stateMap.values())
  }

  /**
   * Convert DefaultProperty[] from primitives.ts to Property[] for merging.
   * Defaults have no source position since they're not from user code.
   */
  private convertDefaultsToProperties(defaults: DefaultProperty[]): Property[] {
    return defaults.map(def => ({
      type: 'Property' as const,
      name: def.name,
      values: def.values,
      line: 0,
      column: 0,
    }))
  }

  /**
   * Determine layoutType from properties.
   * Used by drop strategies to determine whether to use absolute positioning.
   *
   * Priority: absolute > grid > flex (if multiple layout properties are present)
   */
  private determineLayoutType(properties: Property[]): LayoutType | undefined {
    let hasAbsolute = false
    let hasGrid = false
    let hasFlex = false

    for (const prop of properties) {
      const name = prop.name.toLowerCase()

      // Absolute layout properties
      if (name === 'pos' || name === 'positioned' || name === 'stacked') {
        hasAbsolute = true
      }

      // Grid layout
      if (name === 'grid') {
        hasGrid = true
      }

      // Flex layout properties
      if (name === 'hor' || name === 'horizontal' || name === 'ver' || name === 'vertical') {
        hasFlex = true
      }
    }

    // Priority: absolute > grid > flex
    if (hasAbsolute) return 'absolute'
    if (hasGrid) return 'grid'
    if (hasFlex) return 'flex'

    return undefined
  }

  /**
   * Merge properties (later values override earlier)
   *
   * For directional properties (pad, margin, rad, bor), the key includes direction.
   * This allows multiple directional values to coexist:
   * - pad left 10 → key: "pad:left"
   * - pad right 20 → key: "pad:right"
   * - pad 10 → key: "pad" (overwrites all directional pads)
   */
  private mergeProperties(base: Property[], overrides: Property[]): Property[] {
    const map = new Map<string, Property>()

    const getPropertyKey = (prop: Property): string => {
      // Normalize alias to canonical name (e.g., 'bg' -> 'background')
      // This ensures that 'bg #f00 background #00f' treats them as the same property
      const name = getCanonicalPropertyName(prop.name)
      const values = prop.values

      // Check if this is a directional property (use canonical names)
      const directionalProps = ['padding', 'margin', 'radius', 'border']
      const directions = ['left', 'right', 'top', 'bottom', 'down', 'l', 'r', 't', 'b', 'x', 'y',
        'horizontal', 'vertical', 'hor', 'ver', 'tl', 'tr', 'bl', 'br']

      if (directionalProps.includes(name) && values.length >= 2) {
        const firstVal = String(values[0]).toLowerCase()
        if (directions.includes(firstVal)) {
          // Include all direction tokens in the key
          const dirs: string[] = []
          for (const v of values) {
            const val = String(v).toLowerCase()
            if (directions.includes(val)) {
              dirs.push(val)
            } else {
              break
            }
          }
          return `${name}:${dirs.join(':')}`
        }
      }

      return name
    }

    for (const prop of base) {
      map.set(getPropertyKey(prop), prop)
    }
    for (const prop of overrides) {
      map.set(getPropertyKey(prop), prop)
    }
    return Array.from(map.values())
  }

  /**
   * Get HTML tag for component
   * Uses schema-based mapping from ir-helpers
   */
  private getTag(componentName: string, resolved: ComponentDefinition | null): string {
    const primitive = resolved?.primitive || componentName.toLowerCase()
    return getHtmlTag(primitive)
  }

  /**
   * Transform Mirror properties to CSS styles
   *
   * This method uses intelligent layout merging to handle flexbox properties correctly.
   * It collects all layout-related properties first, then generates consistent CSS.
   * It also collects transform properties to combine them into a single transform value.
   */
  private transformProperties(properties: Property[], primitive: string = 'frame', parentLayoutContext?: ParentLayoutContext): IRStyle[] {
    const styles: IRStyle[] = []
    const layoutContext: LayoutContext = {
      direction: null,
      justifyContent: null,
      alignItems: null,
      flexWrap: null,
      gap: null,
      isGrid: false,
      gridColumns: null,
      gridAutoFlow: null,
      columnGap: null,
      rowGap: null,
      rowHeight: null,
    }

    // Transform context to combine multiple transforms
    const transformContext: { transforms: string[] } = { transforms: [] }

    // Check for explicit min/max width/height properties
    // These should NOT be overwritten by automatic min-width: 0 from w full
    const hasExplicitMinWidth = properties.some(p => p.name === 'minw' || p.name === 'min-width')
    const hasExplicitMinHeight = properties.some(p => p.name === 'minh' || p.name === 'min-height')
    const hasExplicitMaxWidth = properties.some(p => p.name === 'maxw' || p.name === 'max-width')
    const hasExplicitMaxHeight = properties.some(p => p.name === 'maxh' || p.name === 'max-height')

    // Check for explicit width/height properties (for hug-by-default behavior)
    // When no width is set, containers should hug their content (fit-content)
    const hasExplicitWidth = properties.some(p => p.name === 'w' || p.name === 'width' || p.name === 'size')
    const hasExplicitHeight = properties.some(p => p.name === 'h' || p.name === 'height' || p.name === 'size')
    layoutContext.hasExplicitWidth = hasExplicitWidth
    layoutContext.hasExplicitHeight = hasExplicitHeight

    // Collect layout values to process together (preserving order for "last wins")
    // This includes both direction (hor/ver) and alignment (9-zone, center, etc.)
    const layoutValues: string[] = []

    // First pass: collect layout properties into context
    for (const prop of properties) {
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
        layoutContext.gap = this.formatCSSValue(name, this.resolveValue(prop.values, name))
        continue
      }

      // Grid (takes precedence over flex)
      if (name === 'grid') {
        layoutContext.isGrid = true
        layoutContext.gridColumns = this.resolveGridColumns(prop)
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
        layoutContext.columnGap = this.formatCSSValue(name, this.resolveValue(prop.values, name))
        continue
      }

      // Gap-y (row-gap)
      if ((name === 'gap-y' || name === 'gy') && !isBoolean) {
        layoutContext.rowGap = this.formatCSSValue(name, this.resolveValue(prop.values, name))
        continue
      }

      // Row-height (grid-auto-rows) - only handle in grid context
      // Otherwise let it fall through to schema-based handling
      if ((name === 'row-height' || name === 'rh') && !isBoolean && layoutContext.isGrid) {
        layoutContext.rowHeight = this.formatCSSValue(name, this.resolveValue(prop.values, name))
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
      if (name === 'translate') {
        const x = String(prop.values[0])
        const y = prop.values.length >= 2 ? String(prop.values[1]) : '0'
        const xPx = /^-?\d+$/.test(x) ? `${x}px` : x
        const yPx = /^-?\d+$/.test(y) ? `${y}px` : y
        transformContext.transforms.push(`translate(${xPx}, ${yPx})`)
        continue
      }
    }

    // Apply collected layout values with order-awareness (last wins)
    this.applyAlignmentsToContext(layoutValues, layoutContext)

    // Generate layout styles from context
    const layoutStyles = this.generateLayoutStyles(layoutContext, primitive)
    styles.push(...layoutStyles)

    // Second pass: process non-layout properties
    // Transform emission moved to AFTER this pass so properties can add to transformContext
    for (const prop of properties) {
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
      if (name === 'translate') continue

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

  /**
   * Apply layout values to context with order-awareness (last wins)
   *
   * Key insights:
   * - hor/ver and 9-zone properties all affect direction
   * - The LAST one in source order wins for direction
   * - `center` meaning depends on context (top/bottom vs left/right)
   */
  private applyAlignmentsToContext(values: string[], ctx: LayoutContext): void {
    if (values.length === 0) return

    // Check which dimensions are explicitly set (for context-aware center)
    const hasVertical = values.some(v => ['top', 'bottom', 'ver-center'].includes(v))
    const hasHorizontal = values.some(v => ['left', 'right', 'hor-center'].includes(v))

    // Check if explicit direction (hor/ver) is specified - this takes precedence over 9-zone properties
    const hasExplicitDirection = values.some(v => ['hor', 'horizontal', 'ver', 'vertical'].includes(v))

    for (const name of values) {
      switch (name) {
        // Direction properties - in grid context, affects grid-auto-flow instead
        case 'horizontal':
        case 'hor':
          if (ctx.isGrid) {
            // In grid, hor sets grid-auto-flow: row (or combines with dense)
            const currentFlow = ctx.gridAutoFlow
            if (currentFlow === 'dense' || currentFlow === 'column dense') {
              ctx.gridAutoFlow = 'row dense'
            } else {
              ctx.gridAutoFlow = 'row'
            }
          } else {
            ctx.direction = 'row'
          }
          break
        case 'vertical':
        case 'ver':
          if (ctx.isGrid) {
            // In grid, ver sets grid-auto-flow: column (or combines with dense)
            const currentFlow = ctx.gridAutoFlow
            if (currentFlow === 'dense' || currentFlow === 'row dense') {
              ctx.gridAutoFlow = 'column dense'
            } else {
              ctx.gridAutoFlow = 'column'
            }
          } else {
            ctx.direction = 'column'
          }
          break

        // 9-zone properties: set alignment using _hAlign/_vAlign for direction-aware mapping
        // Direction is only set if no explicit hor/ver is specified
        // This allows "Frame hor, cl" to remain horizontal with vertical centering
        case 'top-left':
        case 'tl':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'start'
          ctx._hAlign = 'start'
          break
        case 'top-center':
        case 'tc':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'start'
          ctx._hAlign = 'center'
          break
        case 'top-right':
        case 'tr':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'start'
          ctx._hAlign = 'end'
          break
        case 'center-left':
        case 'cl':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'center'
          ctx._hAlign = 'start'
          break
        case 'center-right':
        case 'cr':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'center'
          ctx._hAlign = 'end'
          break
        case 'bottom-left':
        case 'bl':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'end'
          ctx._hAlign = 'start'
          break
        case 'bottom-center':
        case 'bc':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'end'
          ctx._hAlign = 'center'
          break
        case 'bottom-right':
        case 'br':
          if (!hasExplicitDirection) ctx.direction = 'column'
          ctx._vAlign = 'end'
          ctx._hAlign = 'end'
          break

        // Original alignment properties
        case 'center':
        case 'cen':
          if (hasVertical && !hasHorizontal) {
            // With top/bottom → center means horizontal center
            ctx._hAlign = 'center'
          } else if (hasHorizontal && !hasVertical) {
            // With left/right → center means vertical center
            ctx._vAlign = 'center'
          } else {
            // Alone or with both → center both
            ctx.justifyContent = 'center'
            ctx.alignItems = 'center'
          }
          break
        case 'spread':
          ctx.justifyContent = 'space-between'
          break
        case 'left':
          ctx._hAlign = 'start'
          break
        case 'right':
          ctx._hAlign = 'end'
          break
        case 'hor-center':
          ctx._hAlign = 'center'
          break
        case 'top':
          ctx._vAlign = 'start'
          break
        case 'bottom':
          ctx._vAlign = 'end'
          break
        case 'ver-center':
          ctx._vAlign = 'center'
          break
      }
    }
  }

  /**
   * Generate final layout styles from context
   *
   * Key insight: In flexbox, alignment properties mean different CSS depending on direction.
   * - In column: left/right → align-items, top/bottom → justify-content
   * - In row: left/right → justify-content, top/bottom → align-items
   */
  private generateLayoutStyles(ctx: LayoutContext, primitive: string): IRStyle[] {
    const styles: IRStyle[] = []

    // Grid takes precedence
    if (ctx.isGrid) {
      styles.push({ property: 'display', value: 'grid' })
      if (ctx.gridColumns) {
        styles.push({ property: 'grid-template-columns', value: ctx.gridColumns })
      }
      if (ctx.gridAutoFlow) {
        styles.push({ property: 'grid-auto-flow', value: ctx.gridAutoFlow })
      }
      if (ctx.rowHeight) {
        styles.push({ property: 'grid-auto-rows', value: ctx.rowHeight })
      }
      // Handle gaps: specific gaps take precedence over general gap
      if (ctx.columnGap) {
        styles.push({ property: 'column-gap', value: ctx.columnGap })
      }
      if (ctx.rowGap) {
        styles.push({ property: 'row-gap', value: ctx.rowGap })
      }
      // Use general gap only if no specific gaps are set
      if (ctx.gap && !ctx.columnGap && !ctx.rowGap) {
        styles.push({ property: 'gap', value: ctx.gap })
      }
      return styles
    }

    // Determine final direction
    // Non-container primitives should NOT get default flex layout
    const primitiveLower = primitive?.toLowerCase() || ''
    const isContainer = isContainerPrimitive(primitiveLower)
    const direction = ctx.direction || (isContainer ? 'column' : null)

    // If no layout properties were set and not a container, skip flex styles
    const hasLayoutProps = direction || ctx.justifyContent || ctx.alignItems ||
                          ctx._hAlign || ctx._vAlign || ctx.flexWrap

    if (!hasLayoutProps && !isContainer) {
      if (ctx.gap) {
        // Gap without flex context - just return gap
        styles.push({ property: 'gap', value: ctx.gap })
      }
      return styles
    }

    // Add flex display
    styles.push({ property: 'display', value: 'flex' })

    // Add direction (default column for containers)
    const finalDirection = direction || 'column'
    styles.push({ property: 'flex-direction', value: finalDirection })

    // Hug content by default: elements should fit their content unless explicit width is set
    // This prevents the common "everything is full-width" problem in flex layouts
    if (!ctx.hasExplicitWidth) {
      styles.push({ property: 'width', value: 'fit-content' })
    }

    // Map horizontal/vertical alignment to justify-content/align-items based on direction
    const hAlign = ctx._hAlign
    const vAlign = ctx._vAlign

    const alignValue = (align: 'start' | 'end' | 'center'): string => {
      if (align === 'start') return 'flex-start'
      if (align === 'end') return 'flex-end'
      return 'center'
    }

    if (finalDirection === 'column') {
      // Column: horizontal → align-items, vertical → justify-content
      if (hAlign) {
        ctx.alignItems = alignValue(hAlign)
      } else if (!ctx.alignItems) {
        // SYMMETRIC: Both column and row default to flex-start
        ctx.alignItems = FLEX_DEFAULTS.column.alignItems
      }
      if (vAlign) {
        ctx.justifyContent = alignValue(vAlign)
      }
    } else {
      // Row: horizontal → justify-content, vertical → align-items
      if (hAlign) {
        ctx.justifyContent = alignValue(hAlign)
      }
      if (vAlign) {
        ctx.alignItems = alignValue(vAlign)
      } else if (!ctx.alignItems) {
        // SYMMETRIC: Both column and row default to flex-start
        // Use `center` explicitly for vertical centering in horizontal layouts
        ctx.alignItems = FLEX_DEFAULTS.row.alignItems
      }
    }

    // Add justify-content if set
    if (ctx.justifyContent) {
      styles.push({ property: 'justify-content', value: ctx.justifyContent })
    }

    // Add align-items if set
    if (ctx.alignItems) {
      styles.push({ property: 'align-items', value: ctx.alignItems })
    }

    // Add flex-wrap
    if (ctx.flexWrap) {
      styles.push({ property: 'flex-wrap', value: ctx.flexWrap })
    }

    // Add gaps (gap-x and gap-y work in flex too)
    if (ctx.columnGap) {
      styles.push({ property: 'column-gap', value: ctx.columnGap })
    }
    if (ctx.rowGap) {
      styles.push({ property: 'row-gap', value: ctx.rowGap })
    }
    // Use general gap only if no specific gaps are set
    if (ctx.gap && !ctx.columnGap && !ctx.rowGap) {
      styles.push({ property: 'gap', value: ctx.gap })
    }

    return styles
  }

  /**
   * Resolve grid column specification
   */
  private resolveGridColumns(prop: Property): string | null {
    const values = prop.values

    // grid 3 → repeat(3, 1fr)
    if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
      return `repeat(${values[0]}, 1fr)`
    }

    // grid auto 250 → auto-fill, minmax(250px, 1fr)
    if (values.length === 2 && values[0] === 'auto') {
      const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1]
      return `repeat(auto-fill, minmax(${minWidth}, 1fr))`
    }

    // grid 30% 70% → explicit columns
    if (values.length >= 2) {
      return values.map(v => {
        const str = String(v)
        if (/^\d+$/.test(str)) return `${str}px`
        if (str.endsWith('%')) return str
        return str
      }).join(' ')
    }

    return null
  }

  /**
   * Transform states to CSS styles with state attribute
   */
  private transformStates(states: State[]): IRStyle[] {
    const styles: IRStyle[] = []

    for (const state of states) {
      for (const prop of state.properties) {
        const cssStyles = this.propertyToCSS(prop)
        for (const style of cssStyles) {
          styles.push({ ...style, state: state.name })
        }
      }
      // Note: childOverrides are handled separately in applyStateChildOverrides
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
    // Filter states that have triggers or when dependencies (these form the state machine)
    const interactiveStates = states.filter(s => s.trigger || s.when)

    // Filter custom states for state machine:
    // 1. States NOT in SYSTEM_STATES (like "on", "open", "loading"), OR
    // 2. States in SYSTEM_STATES but used as custom states (have properties defined)
    //    e.g., "active: bg #2563eb" is a custom state, not CSS :active pseudo-class
    const customStates = states.filter(s =>
      !SYSTEM_STATES.has(s.name) ||
      (s.properties && s.properties.length > 0)
    )

    // Check if any event has a state machine function (toggle, exclusive)
    const hasStateMachineEvents = events?.some(e =>
      e.actions?.some(a => a.isBuiltinStateFunction)
    ) ?? false

    // Build state machine if:
    // 1. There are interactive states (with triggers), OR
    // 2. There are custom states AND state machine events
    if (interactiveStates.length === 0 && !(customStates.length > 0 && hasStateMachineEvents)) {
      return undefined
    }

    // Build state definitions
    const stateDefinitions: Record<string, IRStateDefinition> = {}
    const transitions: IRStateTransition[] = []

    // First pass: collect all unique state names and their styles
    for (const state of states) {
      // Skip creating state definition for synthetic 'when' states that have a targetState
      // These are just transition triggers, not actual states to render
      if (state.when && state.targetState && state.name.startsWith('_')) {
        continue
      }

      if (!stateDefinitions[state.name]) {
        stateDefinitions[state.name] = {
          name: state.name,
          styles: [],
          isInitial: state.modifier === 'initial',
        }
      }

      // Add styles to the state definition
      for (const prop of state.properties) {
        const cssStyles = this.propertyToCSS(prop)
        for (const style of cssStyles) {
          stateDefinitions[state.name].styles.push(style)
        }
      }

      // Add children to state definition (like Figma Variants)
      if (state.children && state.children.length > 0) {
        const stateChildren: IRNode[] = []
        for (const child of state.children) {
          // Only transform Instance children (skip Slots for now)
          if (child.type === 'Instance') {
            const irChild = this.transformStateChild(child as Instance)
            if (irChild) {
              stateChildren.push(irChild)
            }
          }
        }
        if (stateChildren.length > 0) {
          stateDefinitions[state.name].children = stateChildren
        }
      }

      // Add enter/exit animations to state definition
      if (state.enter) {
        stateDefinitions[state.name].enter = this.convertStateAnimation(state.enter)
      }
      if (state.exit) {
        stateDefinitions[state.name].exit = this.convertStateAnimation(state.exit)
      }
    }

    // Second pass: create transitions from interactive states
    for (const state of interactiveStates) {
      // Handle trigger-based transitions
      if (state.trigger) {
        // Parse trigger (e.g., "onclick", "onkeydown escape")
        const triggerParts = state.trigger.split(' ')
        const trigger = triggerParts[0]
        const key = triggerParts[1] // for keyboard events

        const transition: IRStateTransition = {
          to: state.name,
          trigger,
          modifier: state.modifier,
          key,
        }

        // Add animation to transition if present
        if (state.animation) {
          transition.animation = this.convertStateAnimation(state.animation)
        }

        transitions.push(transition)
      }

      // Handle 'when' dependency transitions
      if (state.when) {
        // Use targetState if specified (e.g., SearchInput.searching: searching)
        // Otherwise fall back to the synthetic state name
        const targetState = state.targetState || state.name
        const transition: IRStateTransition = {
          to: targetState,
          trigger: '', // No trigger, it's dependency-based
          modifier: state.modifier,
          when: this.convertStateDependency(state.when),
        }

        // Add animation to transition if present
        if (state.animation) {
          transition.animation = this.convertStateAnimation(state.animation)
        }

        transitions.push(transition)
      }
    }

    // Determine initial state
    // Priority:
    // 1. explicit 'initial' modifier
    // 2. OLD syntax: state without trigger when other states have triggers
    // 3. NEW syntax (function calls): 'default'
    let initial: string | undefined

    // Check for explicit 'initial' modifier
    for (const [name, def] of Object.entries(stateDefinitions)) {
      if (def.isInitial) {
        initial = name
        break
      }
    }

    // If no explicit initial, check for OLD syntax pattern:
    // Some states have explicit triggers, some don't → one without trigger is initial
    // This does NOT apply when interactive states only have 'when' dependencies
    const statesWithExplicitTriggers = states.filter(s => s.trigger && !SYSTEM_STATES.has(s.name))
    if (!initial && statesWithExplicitTriggers.length > 0) {
      const statesWithoutTriggers = states.filter(s => !s.trigger && !s.when && !SYSTEM_STATES.has(s.name))
      if (statesWithoutTriggers.length > 0) {
        initial = statesWithoutTriggers[0].name
      }
    }

    // If still no initial, determine based on number of custom states:
    // - If states have no triggers: use 'default' (transitions controlled by events like cycle())
    // - If some states have triggers: use OLD syntax logic
    if (!initial) {
      // Get custom states (non-system states, excluding synthetic 'when' states)
      // Synthetic 'when' states start with '_' and have a 'when' dependency
      const syntheticStateNames = new Set(
        states.filter(s => s.when && s.name.startsWith('_')).map(s => s.name)
      )
      const customStateNames = Object.keys(stateDefinitions).filter(
        s => s !== 'default' && !syntheticStateNames.has(s)
      )

      // Check if any custom state has a trigger attached
      // If none do, transitions are controlled by events (cycle(), toggle(), etc.)
      // and initial state should be 'default'
      const anyStateHasTrigger = states.some(s =>
        !SYSTEM_STATES.has(s.name) && !syntheticStateNames.has(s.name) && s.trigger
      )

      if (customStateNames.length >= 2 && anyStateHasTrigger) {
        // Multi-state with triggers: start in first defined state (cycle behavior)
        // Use states array to preserve definition order
        const firstCustomState = states.find(s =>
          !SYSTEM_STATES.has(s.name) && !syntheticStateNames.has(s.name)
        )
        initial = firstCustomState?.name || customStateNames[0]
      } else {
        // Single state, no states, or states controlled by events: use 'default'
        initial = 'default'
      }

      // Create default state if it doesn't exist (needed for binary toggle)
      if (!stateDefinitions['default']) {
        stateDefinitions['default'] = {
          name: 'default',
          styles: [], // No styles - uses base element styles
          isInitial: initial === 'default',
        }
      }
    }

    return {
      initial,
      states: stateDefinitions,
      transitions,
    }
  }

  /**
   * Convert AST StateDependency to IR IRStateDependency
   */
  private convertStateDependency(dep: import('../parser/ast').StateDependency): import('./types').IRStateDependency {
    const result: import('./types').IRStateDependency = {
      target: dep.target,
      state: dep.state,
    }

    if (dep.condition) {
      result.condition = dep.condition
    }

    if (dep.next) {
      result.next = this.convertStateDependency(dep.next)
    }

    return result
  }

  /**
   * Convert AST StateAnimation to IR IRStateAnimation
   */
  private convertStateAnimation(anim: import('../parser/ast').StateAnimation): import('./types').IRStateAnimation {
    const result: import('./types').IRStateAnimation = {}

    if (anim.preset) {
      result.preset = anim.preset
    }
    if (anim.duration !== undefined) {
      result.duration = anim.duration
    }
    if (anim.easing) {
      result.easing = anim.easing
    }
    if (anim.delay !== undefined) {
      result.delay = anim.delay
    }

    return result
  }

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
    const name = prop.name
    const value = this.resolveValue(prop.values, name)
    const values = prop.values

    // Validate property against schema
    this.validateProperty(name, {
      line: prop.line,
      column: prop.column,
      endLine: prop.line,
      endColumn: prop.column,
    })

    // Handle boolean properties (value is true OR empty values array)
    if ((prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0) {
      const styles = this.booleanPropertyToCSS(name)

      // If transformContext exists, extract transform values and add to context
      // This allows multiple transforms (rotate + scale etc.) to combine
      if (transformContext) {
        const nonTransformStyles: IRStyle[] = []
        for (const style of styles) {
          if (style.property === 'transform') {
            // Add to transform context for combining with other transforms
            transformContext.transforms.push(style.value)
          } else {
            nonTransformStyles.push(style)
          }
        }
        return nonTransformStyles
      }

      return styles
    }

    // Handle gradient syntax: bg grad #color1 #color2, col grad #color1 #color2
    // Supports: grad, grad-ver, grad N (angle), and multiple colors
    if ((name === 'background' || name === 'bg' || name === 'color' || name === 'col' || name === 'c') &&
        values.length >= 2 &&
        (String(values[0]) === 'grad' || String(values[0]).startsWith('grad-'))) {

      const gradType = String(values[0])
      const isTextGradient = name === 'color' || name === 'col' || name === 'c'

      // Determine angle based on gradient type
      let angle = '90deg' // default: horizontal (left to right)
      let colorStartIndex = 1

      if (gradType === 'grad-ver') {
        angle = '180deg' // vertical (top to bottom)
      } else if (gradType === 'grad') {
        // Check if second value is an angle (number)
        const possibleAngle = String(values[1])
        if (/^\d+$/.test(possibleAngle)) {
          angle = `${possibleAngle}deg`
          colorStartIndex = 2
        }
      }

      // Collect colors (remaining values)
      const colors = values.slice(colorStartIndex).map(v => String(v))

      if (colors.length < 2) {
        // Not enough colors, skip gradient processing
        return []
      }

      const gradientValue = `linear-gradient(${angle}, ${colors.join(', ')})`

      if (isTextGradient) {
        // Text gradient requires background-clip workaround
        return [
          { property: 'background', value: gradientValue },
          { property: '-webkit-background-clip', value: 'text' },
          { property: 'background-clip', value: 'text' },
          { property: 'color', value: 'transparent' },
        ]
      } else {
        // Background gradient
        return [{ property: 'background', value: gradientValue }]
      }
    }

    // Handle size property - context-dependent
    // For text: size = font-size
    // For icon: size = width/height (icons are sized via dimensions)
    // For frame/box: size = width/height
    if (name === 'size') {
      // Text primitives: size means font-size
      if (primitive === 'text') {
        const val = String(values[0])
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return [{ property: 'font-size', value: px }]
      }

      // Icon primitives: size means width/height (square)
      if (primitive === 'icon') {
        const val = String(values[0])
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return [
          { property: 'width', value: px },
          { property: 'height', value: px },
        ]
      }

      // Box/Frame primitives: size means width/height
      if (values.length === 1) {
        const val = String(values[0])
        if (val === 'hug') {
          return [
            { property: 'width', value: 'fit-content' },
            { property: 'height', value: 'fit-content' },
          ]
        }
        if (val === 'full') {
          // Use flex: 1 1 0% for proper flex fill - no explicit width/height
          // as those would override flexbox behavior and ignore parent padding
          // align-self: stretch ensures cross-axis fill even when parent has center alignment
          return [
            { property: 'flex', value: '1 1 0%' },
            { property: 'min-width', value: '0' },
            { property: 'min-height', value: '0' },
            { property: 'align-self', value: 'stretch' },
          ]
        }
        // Single value = square
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return [
          { property: 'width', value: px },
          { property: 'height', value: px },
        ]
      }
      if (values.length >= 2) {
        const w = String(values[0])
        const h = String(values[1])
        return [
          { property: 'width', value: /^\d+$/.test(w) ? `${w}px` : w },
          { property: 'height', value: /^\d+$/.test(h) ? `${h}px` : h },
        ]
      }
    }

    // Handle directional padding: pad left 20, pad top 8 bottom 24, pad x 16, pad left right 8
    if ((name === 'pad' || name === 'padding' || name === 'p') && values.length >= 2) {
      const directions = ['left', 'right', 'top', 'bottom', 'down', 'l', 'r', 't', 'b', 'x', 'y', 'horizontal', 'vertical', 'hor', 'ver']
      if (directions.includes(String(values[0]))) {
        return this.parseDirectionalSpacing('padding', values)
      }
      // Multi-value shorthand: pad 16 24 → padding: 16px 24px
      // Check if all values are numeric (not directions)
      const allNumeric = values.every(v => /^-?\d+(\.\d+)?(%|px)?$/.test(String(v)))
      if (allNumeric && values.length <= 4) {
        const paddingValue = values.map(v => {
          const str = String(v)
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        }).join(' ')
        return [{ property: 'padding', value: paddingValue }]
      }
    }

    // Handle directional margin: margin left 8, margin top 16 bottom 24, margin x 16
    if ((name === 'margin' || name === 'm') && values.length >= 2) {
      const directions = ['left', 'right', 'top', 'bottom', 'down', 'l', 'r', 't', 'b', 'x', 'y', 'horizontal', 'vertical', 'hor', 'ver']
      if (directions.includes(String(values[0]))) {
        return this.parseDirectionalSpacing('margin', values)
      }
      // Multi-value shorthand: margin 16 24 → margin: 16px 24px
      const allNumeric = values.every(v => /^-?\d+(\.\d+)?(%|px|auto)?$/.test(String(v)))
      if (allNumeric && values.length <= 4) {
        const marginValue = values.map(v => {
          const str = String(v)
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        }).join(' ')
        return [{ property: 'margin', value: marginValue }]
      }
    }

    // Handle directional border: bor t 1 #333, bor left right 1 #333, bor x 2 #666
    // Uses BORDER_DIRECTION_MAP from schema/ir-helpers.ts
    if ((name === 'bor' || name === 'border') && values.length >= 2) {
      const firstVal = String(values[0])
      if (BORDER_DIRECTION_MAP[firstVal]) {
        // Collect all direction tokens
        const borderDirs: string[] = []
        let i = 0
        while (i < values.length && BORDER_DIRECTION_MAP[String(values[i])]) {
          borderDirs.push(...BORDER_DIRECTION_MAP[String(values[i])])
          i++
        }
        // Rest are the border values (width, style, color)
        const restValues = values.slice(i)
        const borderValue = this.formatBorderValue(restValues)
        // Apply to all directions (deduplicated), with 'border-' prefix
        const uniqueDirs = [...new Set(borderDirs)]
        return uniqueDirs.map(dir => ({ property: `border-${dir}`, value: borderValue }))
      }
      // Non-directional multi-value border: bor 1 #333 → border: 1px solid #333
      const borderValue = this.formatBorderValue(values)
      return [{ property: 'border', value: borderValue }]
    }

    // Handle corner-specific radius: rad tl 8, rad t 8, rad 8 8 0 0
    // Uses CORNER_MAP from schema/ir-helpers.ts
    if ((name === 'rad' || name === 'radius') && values.length >= 1) {
      const cornerMap: Record<string, string[]> = {
        'tl': ['border-top-left-radius'],
        'tr': ['border-top-right-radius'],
        'bl': ['border-bottom-left-radius'],
        'br': ['border-bottom-right-radius'],
        't': ['border-top-left-radius', 'border-top-right-radius'],
        'b': ['border-bottom-left-radius', 'border-bottom-right-radius'],
        'l': ['border-top-left-radius', 'border-bottom-left-radius'],
        'r': ['border-top-right-radius', 'border-bottom-right-radius'],
      }
      const firstVal = String(values[0])
      if (cornerMap[firstVal] && values.length >= 2) {
        const props = cornerMap[firstVal]
        const val = String(values[1])
        const px = /^\d+$/.test(val) ? `${val}px` : val
        return props.map(p => ({ property: p, value: px }))
      }
      // Multi-value radius shorthand: rad 8 16 → border-radius: 8px 16px
      if (values.length >= 2 && values.every(v => /^-?\d+(\.\d+)?(%|px)?$/.test(String(v)))) {
        const radiusValue = values.map(v => {
          const str = String(v)
          if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`
          return str
        }).join(' ')
        return [{ property: 'border-radius', value: radiusValue }]
      }
    }

    // Grid positioning: x → grid-column-start (when parent is grid)
    // Absolute positioning: x → left + position: absolute (default)
    if (name === 'x') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
        return [{ property: 'grid-column-start', value: String(numVal) }]
      }
      // Default: position absolute + left
      const val = typeof values[0] === 'number' ? `${values[0]}px` : String(values[0])
      const px = /^-?\d+$/.test(val) ? `${val}px` : val
      return [
        { property: 'position', value: 'absolute' },
        { property: 'left', value: px },
      ]
    }

    // Grid positioning: y → grid-row-start (when parent is grid)
    // Absolute positioning: y → top + position: absolute (default)
    if (name === 'y') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
        return [{ property: 'grid-row-start', value: String(numVal) }]
      }
      // Default: position absolute + top
      const val = typeof values[0] === 'number' ? `${values[0]}px` : String(values[0])
      const px = /^-?\d+$/.test(val) ? `${val}px` : val
      return [
        { property: 'position', value: 'absolute' },
        { property: 'top', value: px },
      ]
    }

    // Grid span: w (numeric) → grid-column: span N (when parent is grid)
    if ((name === 'w' || name === 'width') && parentLayoutContext?.type === 'grid') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (!isNaN(numVal) && numVal > 0) {
        // In grid context, numeric w means column span
        return [{ property: 'grid-column', value: `span ${numVal}` }]
      }
      // If not numeric, fall through to default handling (hug, full, etc.)
    }

    // Grid span: h (numeric) → grid-row: span N (when parent is grid)
    if ((name === 'h' || name === 'height') && parentLayoutContext?.type === 'grid') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (!isNaN(numVal) && numVal > 0) {
        // In grid context, numeric h means row span
        return [{ property: 'grid-row', value: `span ${numVal}` }]
      }
      // If not numeric, fall through to default handling (hug, full, etc.)
    }

    // Handle rotate: rotate 45 (fallback for states)
    if (name === 'rotate' || name === 'rot') {
      const deg = String(values[0])
      return [{ property: 'transform', value: `rotate(${deg}deg)` }]
    }

    // Handle scale: scale 1.2 (fallback for states)
    if (name === 'scale') {
      const val = String(values[0])
      return [{ property: 'transform', value: `scale(${val})` }]
    }

    // Handle translate: translate 10 20 (fallback for states)
    if (name === 'translate') {
      const x = String(values[0])
      const y = values.length >= 2 ? String(values[1]) : '0'
      const xPx = /^-?\d+$/.test(x) ? `${x}px` : x
      const yPx = /^-?\d+$/.test(y) ? `${y}px` : y
      return [{ property: 'transform', value: `translate(${xPx}, ${yPx})` }]
    }

    // Handle aspect ratio: aspect 16/9, aspect 1, aspect 4/3, aspect square, aspect video
    if (name === 'aspect') {
      const val = String(values[0])
      // Map keywords to their values
      const aspectKeywords: Record<string, string> = {
        square: '1',
        video: '16/9',
      }
      const resolvedVal = aspectKeywords[val] ?? val
      return [{ property: 'aspect-ratio', value: resolvedVal }]
    }

    // Handle backdrop-blur: backdrop-blur 10
    if (name === 'backdrop-blur' || name === 'blur-bg') {
      const val = String(values[0])
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return [{ property: 'backdrop-filter', value: `blur(${px})` }]
    }

    // Handle filter blur: blur 5
    if (name === 'blur') {
      const val = String(values[0])
      const px = /^\d+$/.test(val) ? `${val}px` : val
      return [{ property: 'filter', value: `blur(${px})` }]
    }

    // Handle animation property: animation fade-in, anim bounce
    if (name === 'animation' || name === 'anim') {
      const animName = String(values[0])
      // Map animation keywords to CSS animation values
      const animationMap: Record<string, string> = {
        'fade-in': 'mirror-fade-in 0.3s ease forwards',
        'fade-out': 'mirror-fade-out 0.3s ease forwards',
        'slide-in': 'mirror-slide-in 0.3s ease forwards',
        'slide-out': 'mirror-slide-out 0.3s ease forwards',
        'scale-in': 'mirror-scale-in 0.3s ease forwards',
        'scale-out': 'mirror-scale-out 0.3s ease forwards',
        'bounce': 'mirror-bounce 0.5s ease infinite',
        'pulse': 'mirror-pulse 1s ease infinite',
        'shake': 'mirror-shake 0.5s ease',
        'spin': 'mirror-spin 1s linear infinite',
      }
      const animValue = animationMap[animName] || animName
      return [{ property: 'animation', value: animValue }]
    }

    // Handle inline hover properties: hover-bg, hover-col, etc.
    // Uses hoverPropertyToCSS from schema/ir-helpers.ts
    if (name.startsWith('hover-')) {
      const hoverResult = hoverPropertyToCSS(name, value)
      if (hoverResult.handled) {
        return hoverResult.styles
      }
      // Fallback for unknown hover properties
      const baseProp = name.replace('hover-', '')
      const cssValue = this.formatCSSValue(baseProp, value)
      return [{ property: baseProp, value: cssValue, state: 'hover' }]
    }

    // Handle special cases FIRST (before the early return check)
    // These are layout/positioning properties that need special CSS mapping
    if (name === 'horizontal' || name === 'hor') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'row' },
      ]
    }

    if (name === 'vertical' || name === 'ver') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'align-items', value: 'flex-start' },
      ]
    }

    if (name === 'center' || name === 'cen') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'justify-content', value: 'center' },
        { property: 'align-items', value: 'center' },
      ]
    }

    if (name === 'spread') {
      return [
        { property: 'display', value: 'flex' },
        { property: 'justify-content', value: 'space-between' },
      ]
    }

    if (name === 'wrap') {
      return [{ property: 'flex-wrap', value: 'wrap' }]
    }

    if (name === 'pos' || name === 'position' || name === 'positioned' || name === 'stacked') {
      return [{ property: 'position', value: 'relative' }]
    }

    if (name === 'scroll' || name === 'scroll-ver') {
      return [{ property: 'overflow-y', value: 'auto' }]
    }

    if (name === 'scroll-hor') {
      return [{ property: 'overflow-x', value: 'auto' }]
    }

    if (name === 'scroll-both') {
      return [{ property: 'overflow', value: 'auto' }]
    }

    // Handle width/height 'full' - use flex: 1 1 0% only when dimension matches flex direction
    // This ensures w full works in hor containers, h full works in ver containers
    // For cross-axis (h full in hor, w full in ver), use align-self: stretch instead
    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'full') {
      const isWidth = name === 'width' || name === 'w'
      const isHorizontalFlex = parentLayoutContext?.type === 'flex' && parentLayoutContext?.flexDirection === 'row'
      const isVerticalFlex = parentLayoutContext?.type === 'flex' && parentLayoutContext?.flexDirection === 'column'

      // Check if this 'full' is on the main axis of the flex container
      const isMainAxis = (isWidth && isHorizontalFlex) || (!isWidth && isVerticalFlex)

      if (isMainAxis) {
        // Main axis: use flex: 1 1 0% to fill available space
        return [
          { property: 'flex', value: '1 1 0%' },
          { property: isWidth ? 'min-width' : 'min-height', value: '0' },
        ]
      } else {
        // Cross axis: use align-self: stretch to fill without affecting main axis sizing
        return [
          { property: 'align-self', value: 'stretch' },
          { property: isWidth ? 'min-width' : 'min-height', value: '0' },
        ]
      }
    }

    // Handle width/height 'hug' before schema
    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'hug') {
      return [{ property: name === 'width' || name === 'w' ? 'width' : 'height', value: 'fit-content' }]
    }

    // Handle numeric width/height in flex containers - prevent shrinking
    // Value can be number or numeric string from parser
    const isNumericValue = typeof value === 'number' ||
                           (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))
    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') &&
        isNumericValue && parentLayoutContext?.type === 'flex') {
      const isWidth = name === 'width' || name === 'w'
      const cssValue = this.formatCSSValue(name, String(value))
      return [
        { property: isWidth ? 'width' : 'height', value: cssValue },
        { property: 'flex-shrink', value: '0' },
      ]
    }

    // Try schema-based conversion FIRST - handles schema-defined properties
    // This must come before the PROPERTY_TO_CSS check to support schema-defined properties
    const schemaResult = simplePropertyToCSS(name, value)
    if (schemaResult.handled) {
      return schemaResult.styles
    }

    // Use centralized property mapping from schema
    const cssProperty = PROPERTY_TO_CSS[name]

    if (!cssProperty) {
      // Skip non-CSS properties (content, data, etc.)
      return []
    }

    if (name === 'clip') {
      return [{ property: 'overflow', value: 'hidden' }]
    }

    // Handle grid
    if (name === 'grid') {
      const values = prop.values

      // grid 3 → repeat(3, 1fr)
      if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: `repeat(${values[0]}, 1fr)` },
        ]
      }

      // grid auto 250 → auto-fill, minmax(250px, 1fr)
      if (values.length === 2 && values[0] === 'auto') {
        const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1]
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: `repeat(auto-fill, minmax(${minWidth}, 1fr))` },
        ]
      }

      // grid 30% 70% → explicit columns
      if (values.length >= 2) {
        const columns = values.map(v => {
          const str = String(v)
          if (/^\d+$/.test(str)) return `${str}px`
          if (str.endsWith('%')) return str
          return str
        }).join(' ')
        return [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: columns },
        ]
      }

      return [{ property: 'display', value: 'grid' }]
    }

    // Handle shadow presets - fallback for custom values
    if (name === 'shadow') {
      // Schema was already tried above, this is just the fallback
      return [{ property: 'box-shadow', value: value }]
    }

    // Fallback: direct mapping with formatting
    if (cssProperty) {
      const cssValue = this.formatCSSValue(name, value)
      return [{ property: cssProperty as string, value: cssValue }]
    }

    return []
  }

  /**
   * Format value for CSS
   */
  private formatCSSValue(property: string, value: string): string {
    // Properties that need px units for numeric values
    const needsPx = [
      'padding', 'pad', 'p',
      'margin', 'm',
      'gap', 'g',
      'gap-x', 'gx', 'gap-y', 'gy',
      'row-height', 'rh',
      'width', 'w', 'height', 'h',
      'min-width', 'minw', 'max-width', 'maxw',
      'min-height', 'minh', 'max-height', 'maxh',
      'font-size', 'fs',
      'radius', 'rad',
      'border-radius',
      'border', 'bor',
    ]

    if (needsPx.includes(property)) {
      // Handle multi-value properties (e.g., "8 16" → "8px 16px")
      return value.split(' ').map(v => {
        if (/^\d+$/.test(v)) {
          return `${v}px`
        }
        return v
      }).join(' ')
    }

    return value
  }

  /**
   * Parse directional spacing (padding/margin)
   * Uses DIRECTION_MAP from schema/ir-helpers.ts
   * Supports:
   * - pad left 20                    → padding-left: 20px
   * - pad top 8 bottom 24            → padding-top: 8px, padding-bottom: 24px
   * - pad left right 8               → padding-left: 8px, padding-right: 8px
   * - margin top bottom left 4       → margin-top/bottom/left: 4px
   * - pad x 16                       → padding-left: 16px, padding-right: 16px
   * - pad y 8                        → padding-top: 8px, padding-bottom: 8px
   */
  private parseDirectionalSpacing(property: string, values: any[]): IRStyle[] {
    const styles: IRStyle[] = []

    let i = 0
    while (i < values.length) {
      const val = String(values[i])

      // Check if this is a direction (using centralized DIRECTION_MAP)
      if (DIRECTION_MAP[val]) {
        // Collect all consecutive directions
        const directions: string[] = []
        while (i < values.length && DIRECTION_MAP[String(values[i])]) {
          directions.push(...DIRECTION_MAP[String(values[i])])
          i++
        }

        // Next value should be the actual value
        if (i < values.length) {
          const numVal = String(values[i])
          const px = /^-?\d+$/.test(numVal) ? `${numVal}px` : numVal

          // Apply value to all collected directions (deduplicated)
          const uniqueDirs = [...new Set(directions)]
          for (const dir of uniqueDirs) {
            styles.push({ property: `${property}-${dir}`, value: px })
          }
          i++
        }
      } else {
        i++
      }
    }
    return styles
  }

  /**
   * Format border value: 1 #333 → 1px solid #333, 2 dashed #666 → 2px dashed #666
   */
  private formatBorderValue(values: any[]): string {
    const parts: string[] = []
    let hasStyle = false
    const styles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none']

    for (const v of values) {
      const str = String(v)
      if (/^\d+$/.test(str)) {
        parts.push(`${str}px`)
      } else if (styles.includes(str)) {
        hasStyle = true
        parts.push(str)
      } else {
        parts.push(str)
      }
    }

    // If no explicit style, add 'solid' after width
    if (!hasStyle && parts.length > 0 && parts[0].endsWith('px')) {
      parts.splice(1, 0, 'solid')
    }

    return parts.join(' ')
  }

  /**
   * Map from property name to token suffix for auto-completion
   * e.g., pad $md -> $m.pad if $m.pad exists
   */
  private static PROPERTY_TO_TOKEN_SUFFIX: Record<string, string> = {
    // Spacing
    'pad': '.pad', 'padding': '.pad', 'p': '.pad',
    'margin': '.margin', 'm': '.margin',
    'gap': '.gap', 'g': '.gap',
    // Sizing
    'rad': '.rad', 'radius': '.rad',
    // Colors
    'bg': '.bg', 'background': '.bg',
    'col': '.col', 'color': '.col', 'c': '.col',
    'boc': '.boc', 'border-color': '.boc',
    // Typography
    'fs': '.fs', 'font-size': '.fs',
    // Effects
    'shadow': '.shadow',
  }

  /**
   * Resolve property values to string
   * @param values The property values to resolve
   * @param propertyName Optional property name for context-aware token resolution
   */
  private resolveValue(values: any[], propertyName?: string): string {
    return values
      .map(v => {
        // Explicit token reference object
        if (typeof v === 'object' && v.kind === 'token') {
          const tokenName = v.name
          // Check if this is a known design token
          // Try direct match first (e.g., 'primary'), then with $ prefix (e.g., '$size')
          if (this.tokenSet.has(tokenName)) {
            const resolvedName = this.resolveTokenWithContext(tokenName, propertyName)
            // Convert dots to hyphens for valid CSS variable name
            const cssVarName = resolvedName.replace(/\./g, '-')
            return `var(--${cssVarName})`
          }
          // Check with $ prefix (e.g., token defined as '$size: 100', used as 'w $size')
          if (this.tokenSet.has('$' + tokenName)) {
            // Convert dots to hyphens for valid CSS variable name
            const cssVarName = tokenName.replace(/\./g, '-')
            return `var(--${cssVarName})`
          }
          // Try context-based resolution (e.g., 'primary' + '.bg' -> '$primary.bg')
          if (propertyName) {
            const suffix = IRTransformer.PROPERTY_TO_TOKEN_SUFFIX[propertyName]
            if (suffix) {
              const extendedName = tokenName + suffix
              const withDollar = '$' + extendedName
              if (this.tokenSet.has(extendedName) || this.tokenSet.has(withDollar)) {
                // Convert dots to hyphens for valid CSS variable name
                const cssVarName = extendedName.replace(/\./g, '-')
                return `var(--${cssVarName})`
              }
            }
          }
          // Not a known token - likely a loop variable reference (e.g., user.name from each loop)
          // Preserve as $name format for runtime interpolation
          return `$${tokenName}`
        }
        // String that matches a token name
        if (typeof v === 'string' && this.tokenSet.has(v)) {
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = v.replace(/\./g, '-')
          return `var(--${cssVarName})`
        }
        return String(v)
      })
      .join(' ')
  }

  /**
   * Resolve content values (textContent) - preserves $-variable references
   * Unlike resolveValue which converts to CSS variables, this keeps $name format
   * for runtime resolution via $get()
   */
  private resolveContentValue(values: any[]): string {
    return values
      .map(v => {
        // Computed expression - build JavaScript expression string
        if (typeof v === 'object' && v.kind === 'expression') {
          return this.buildExpressionString(v.parts, v.operators)
        }
        // Explicit token reference object - preserve as $name for runtime
        if (typeof v === 'object' && v.kind === 'token') {
          return `$${v.name}`
        }
        // Loop variable reference - preserve with special marker for backend
        if (typeof v === 'object' && v.kind === 'loopVar') {
          return `__loopVar:${v.name}`
        }
        // String that starts with $ - preserve as-is
        if (typeof v === 'string' && v.startsWith('$')) {
          return v
        }
        return String(v)
      })
      .join(' ')
  }

  /**
   * Build a JavaScript expression string from parts and operators
   * e.g., ["Hello ", {kind:'token', name:'name'}] + ["+"] → "Hello " + $name
   *
   * Parts may include parentheses for grouping. Operators are placed between
   * actual operands (not between a paren and an operand).
   *
   * For: parts = ["Summe: €", "(", {count}, {price}, ")"], operators = ["+", "*"]
   * Output: "Summe: €" + ($count * $price)
   */
  private buildExpressionString(parts: any[], operators: string[]): string {
    const result: string[] = []
    let opIndex = 0

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const prev = i > 0 ? parts[i - 1] : null
      const isOpenParen = typeof part === 'string' && part === '('
      const isCloseParen = typeof part === 'string' && part === ')'
      const prevIsOpenParen = typeof prev === 'string' && prev === '('

      // Add operator before this part (if needed)
      // We add an operator when:
      // - There's a previous part
      // - The previous part is NOT an opening paren
      // - This part is NOT a closing paren
      if (i > 0 && !prevIsOpenParen && !isCloseParen && opIndex < operators.length) {
        result.push(` ${operators[opIndex++]} `)
      }

      // Add the part
      if (typeof part === 'object' && part.kind === 'token') {
        result.push(`$${part.name}`)
      } else if (typeof part === 'object' && part.kind === 'loopVar') {
        // Loop variable reference - use special marker for backend
        result.push(`__loopVar:${part.name}`)
      } else if (typeof part === 'string') {
        if (part === '(' || part === ')') {
          result.push(part)
        } else {
          result.push(`"${part}"`)
        }
      } else if (typeof part === 'number') {
        result.push(String(part))
      } else {
        result.push(String(part))
      }
    }

    return result.join('')
  }

  /**
   * Try to resolve a short token name using property context
   * e.g., 'primary' with property 'bg' -> 'primary.bg' if '$primary.bg' exists in tokens
   */
  private resolveTokenWithContext(tokenName: string, propertyName?: string): string {
    // If token already exists as-is (e.g., 'primary'), use it
    if (this.tokenSet.has(tokenName)) {
      return tokenName
    }

    // Try to add property-specific suffix
    // e.g., 'primary' + '.bg' = 'primary.bg' if '$primary.bg' exists
    if (propertyName) {
      const suffix = IRTransformer.PROPERTY_TO_TOKEN_SUFFIX[propertyName]
      if (suffix) {
        const extendedName = tokenName + suffix
        // Check both with and without $ prefix
        if (this.tokenSet.has(extendedName)) {
          return extendedName
        }
        // Check with $ prefix (e.g., '$primary.bg')
        if (this.tokenSet.has('$' + extendedName)) {
          return extendedName
        }
      }
    }

    // Fall back to original name
    return tokenName
  }

  /**
   * Extract HTML properties (non-CSS)
   */
  private extractHTMLProperties(properties: Property[], primitive?: string): IRProperty[] {
    const htmlProps: IRProperty[] = []

    // Auto-set type for checkbox/radio primitives
    if (primitive === 'checkbox') {
      htmlProps.push({ name: 'type', value: 'checkbox' })
    } else if (primitive === 'radio') {
      htmlProps.push({ name: 'type', value: 'radio' })
    }

    // Default icon size (can be overridden via icon-size or is property)
    if (primitive === 'icon') {
      const hasIconSize = properties.some(p => p.name === 'icon-size' || p.name === 'is')
      if (!hasIconSize) {
        htmlProps.push({ name: 'data-icon-size', value: '16' })
      }
    }

    for (const prop of properties) {
      if (prop.name === 'content') {
        htmlProps.push({ name: 'textContent', value: this.resolveContentValue(prop.values) })
      }
      if (prop.name === 'href') {
        htmlProps.push({ name: 'href', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'src') {
        htmlProps.push({ name: 'src', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'placeholder') {
        htmlProps.push({ name: 'placeholder', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'disabled') {
        htmlProps.push({ name: 'disabled', value: true })
      }
      if (prop.name === 'readonly') {
        htmlProps.push({ name: 'readonly', value: true })
      }
      if (prop.name === 'type') {
        htmlProps.push({ name: 'type', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'name') {
        htmlProps.push({ name: 'name', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'value') {
        // For value properties, use resolveContentValue to preserve $-references for two-way binding
        // This allows Input value $user.name to become a bidirectional binding
        htmlProps.push({ name: 'value', value: this.resolveContentValue(prop.values) })
      }
      if (prop.name === 'checked') {
        htmlProps.push({ name: 'checked', value: true })
      }
      // Note: 'hidden' is handled as CSS (display: none) not HTML attribute
      // This allows state transitions with 'visible' to properly show the element
      // Icon properties - pass through as data attributes for runtime handling
      if (prop.name === 'icon-size' || prop.name === 'is') {
        htmlProps.push({ name: 'data-icon-size', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'icon-color' || prop.name === 'ic') {
        htmlProps.push({ name: 'data-icon-color', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'icon-weight' || prop.name === 'iw') {
        htmlProps.push({ name: 'data-icon-weight', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'fill') {
        htmlProps.push({ name: 'data-icon-fill', value: true })
      }
      // Focusable - makes element keyboard-focusable
      if (prop.name === 'focusable') {
        htmlProps.push({ name: 'tabindex', value: '0' })
      }
    }

    return htmlProps
  }

  /**
   * Extract valueBinding path from properties for two-way data binding.
   * Returns the token path if value property contains a token reference.
   * E.g., Input value $user.name → "user.name"
   */
  private extractValueBinding(properties: Property[]): string | undefined {
    const valueProp = properties.find(p => p.name === 'value')
    if (!valueProp || !valueProp.values || valueProp.values.length === 0) {
      return undefined
    }

    const firstValue = valueProp.values[0]

    // Check for explicit token reference object
    if (typeof firstValue === 'object' && firstValue.kind === 'token') {
      return firstValue.name as string
    }

    // Check for string starting with $ (e.g., "$user.name")
    if (typeof firstValue === 'string' && firstValue.startsWith('$') && /^\$[a-zA-Z_]/.test(firstValue)) {
      return firstValue.slice(1) // Remove $ prefix
    }

    return undefined
  }

  /**
   * Transform events to IR
   */
  private transformEvents(events: Event[]): IREvent[] {
    return events.map(event => ({
      name: this.mapEventName(event.name),
      key: event.key,
      actions: event.actions.map(action => this.transformAction(action)),
      modifiers: event.modifiers,
    }))
  }

  /**
   * Map Mirror event names to DOM event names
   * Uses schema-based mapping from ir-helpers
   */
  private mapEventName(name: string): string {
    return mapEventToDom(name)
  }

  /**
   * Transform action to IR
   */
  private transformAction(action: Action): IRAction {
    const isBuiltin = BUILTIN_STATE_FUNCTIONS.has(action.name)

    return {
      type: action.name,
      target: action.target,
      args: action.args,
      isFunctionCall: action.isFunctionCall,
      isBuiltinStateFunction: action.isFunctionCall && isBuiltin,
    }
  }

  /**
   * Convert boolean property to CSS
   * Uses schema as primary source, with fallback for special cases
   */
  private booleanPropertyToCSS(name: string): IRStyle[] {
    // Try schema first
    const schemaResult = schemaPropertyToCSS(name, [true])
    if (schemaResult.handled && schemaResult.styles.length > 0) {
      return schemaResult.styles
    }

    // Fallback for properties not fully in schema or with special handling
    switch (name) {
      // Alignment: Using column layout defaults (frame default)
      // In column: left/right → align-items, top/bottom → justify-content
      // IMPORTANT: Must also set display: flex and flex-direction: column for alignment to work
      case 'left':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-start' },
        ]
      case 'right':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-end' },
        ]
      case 'top':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
        ]
      case 'bottom':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
        ]
      case 'hor-center':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'center' },
        ]
      case 'ver-center':
        return [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'center' },
        ]
      // Position container (absolute layout)
      case 'pos':
      case 'position':
      case 'positioned':
      case 'stacked':
        return [{ property: 'position', value: 'relative' }]
      default:
        return []
    }
  }

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
    const primitiveDefaults = this.convertDefaultsToProperties(getPrimitiveDefaults(primitive))

    // Merge properties: Primitive Defaults < Instance Properties
    const properties = this.mergeProperties(primitiveDefaults, instance.properties)

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
