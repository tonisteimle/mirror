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
} from '../parser/ast'
import {
  isComponent,
  isInstance,
  isZagComponent,
  isSlot,
  isText,
  isEach,
  hasContent,
} from '../parser/ast'
import type { IR, IRNode, IRStyle, IREvent, IRAction, IRProperty, IREach, IRConditional, SourcePosition, PropertySourceMap, IRAnimation, IRAnimationKeyframe, IRAnimationProperty, IRWarning, LayoutType, IRSlot, IRItem, IRStateMachine, IRStateDefinition, IRStateTransition } from './types'
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
import { isZagPrimitive, ZAG_PRIMITIVES } from '../schema/zag-primitives'
import { isCompoundPrimitive, getCompoundPrimitive, getCompoundSlotDef, isCompoundSlot } from '../schema/compound-primitives'
import { getCanonicalPropertyName } from '../schema/parser-helpers'

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
}

/**
 * Parent layout context passed to children for context-aware property handling
 * In grid context, x/y/w/h become grid positioning instead of absolute positioning
 */
interface ParentLayoutContext {
  type: 'flex' | 'grid' | 'absolute' | null
  gridColumns?: number
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
    // Transform tokens
    const tokens = this.ast.tokens.map(t => ({
      name: t.name,
      type: t.tokenType,
      value: t.value,
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

    // Transform instances to IR nodes (handle Instance, Slot, and ZagComponent)
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
  private transformZagComponent(zagNode: any): IRNode {
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
      'indeterminate', 'collapsible', 'label', 'invalid', 'readOnly', 'required',
      'name', 'src', 'fallback', 'accept', 'maxFiles', 'maxSize', 'allowOversize',
      'minSize', 'min', 'max', 'count', 'allowHalf', 'dir', 'size', 'length',
      'blurOnComplete', 'otp', 'type', 'visible', 'defaultVisible',
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
        // Recursively transform group items
        if (item.items && item.items.length > 0) {
          irItem.items = item.items.map(transformItem)
        }
      }
      // Include properties if present (layout props like ver, gap, pad)
      if (item.properties && item.properties.length > 0) {
        irItem.properties = item.properties
      }
      // Include children if present (custom content like Icon, Text)
      if (item.children && item.children.length > 0) {
        irItem.children = item.children.map((child: any) => this.transformChild(child))
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
    const styles = this.transformProperties(stylingProperties, 'div')

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
      // Check if child is an Item
      else if (child.type === 'Instance' && child.component === 'Item') {
        const labelProp = child.properties?.find((p: Property) => p.name === 'text' || p.values?.[0])
        // Get label from text property, or from first Text child, or empty string
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
        const disabledProp = child.properties?.find((p: Property) => p.name === 'disabled')
        items.push({
          value: label,
          label: label,
          disabled: disabledProp ? true : false,
          sourcePosition: child.line !== undefined
            ? {
                line: child.line,
                column: child.column ?? 0
              }
            : undefined
        })
      }
      // Check for slot-like Instance children (named slots like "Trigger:", "Content:")
      else if (child.type === 'Instance' && (child.component === 'Trigger' || child.component === 'Content')) {
        slots[child.component] = {
          properties: child.properties || [],
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

    return {
      id: nodeId,
      tag: 'div',
      primitive: 'compound',
      name: instance.component,
      instanceName: instance.name || undefined,
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
      return this.transformZagComponent(zagNode)
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

    // Build state machine from states with triggers (interaction model)
    const allStates = [
      ...(resolvedComponent?.states || []),
      ...(instance.states || []),
    ]
    const stateMachine = this.buildStateMachine(allStates)

    // Transform events from component definition
    const events = resolvedComponent?.events
      ? this.transformEvents(resolvedComponent.events)
      : []

    // Transform events from instance inline events (e.g., "Input onkeydown enter: submit")
    const instanceEvents = instance.events?.length
      ? this.transformEvents(instance.events)
      : []

    // Extract inline states and events from instance children
    const { inlineStateStyles, inlineEvents, remainingChildren } =
      this.extractInlineStatesAndEvents(instance.children || [])

    // Convert childOverrides to instance children for slot filling
    const childOverrideInstances = this.childOverridesToInstances(instance.childOverrides || [])

    // Generate node ID FIRST so we can pass it to children as their parentId
    const nodeId = this.generateId()

    // Determine layout context for children
    // If this element is a grid container, children get grid context for x/y/w/h
    const isGridContainer = styles.some(s => s.property === 'display' && s.value === 'grid')
    const isAbsoluteContainer = styles.some(s => s.property === 'position' && s.value === 'relative')
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
        // flex: 1 1 0% doesn't work for absolute positioned elements
        const hasFlex = child.styles.some(s => s.property === 'flex' && s.value === '1 1 0%')
        if (hasFlex) {
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

    return {
      id: nodeId,
      tag,
      primitive,
      name: instance.component,
      instanceName: instance.name || undefined,
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
    }
  }

  private transformEach(each: Each): IRNode {
    const nodeId = this.generateId()
    const eachData: IREach = {
      id: nodeId,
      itemVar: each.item,
      collection: each.collection,
      filter: each.filter,
      template: each.children.map(child => this.transformInstance(child, nodeId, true)),
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

    // Process component's slot children
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

          if (slotIsInstance) {
            const instSlot = slot as Instance
            slotName = instSlot.component
            slotVisibleWhen = instSlot.visibleWhen
            slotInitialState = instSlot.initialState
          } else {
            const compSlot = slot as ComponentDefinition
            slotName = compSlot.name
            slotVisibleWhen = compSlot.visibleWhen
            slotInitialState = compSlot.initialState
          }

          // Skip Component definitions that are templates (have sibling instances using them)
          if (slotIsComponent && templateNames.has(slotName)) {
            // This is a template definition, not a fillable slot - skip it
            // The instances using this template will be processed below
            continue
          }

          // Check if instance provided content for this slot
          const fillers = slotFillers.get(slotName)
          if (fillers && fillers.length > 0) {
            // Use instance's content instead of slot default
            // But inherit visibility conditions from slot definition
            for (const filler of fillers) {
              const node = this.transformChild(filler, parentId, parentLayoutContext)
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
          const fillers = slotFillers.get(slotObj.name)
          if (fillers && fillers.length > 0) {
            for (const filler of fillers) {
              result.push(this.transformChild(filler, parentId, parentLayoutContext))
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
      return this.transformZagComponent(child)
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
    // Transform emission moved to AFTER this pass so pin-center-x etc. can add to transformContext
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
    // This allows pin-center-x + rotate to combine their transforms
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

        // 9-zone properties: set direction + alignment (direction overrides previous)
        case 'top-left':
        case 'tl':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-start'
          ctx.alignItems = 'flex-start'
          break
        case 'top-center':
        case 'tc':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-start'
          ctx.alignItems = 'center'
          break
        case 'top-right':
        case 'tr':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-start'
          ctx.alignItems = 'flex-end'
          break
        case 'center-left':
        case 'cl':
          ctx.direction = 'column'
          ctx.justifyContent = 'center'
          ctx.alignItems = 'flex-start'
          break
        case 'center-right':
        case 'cr':
          ctx.direction = 'column'
          ctx.justifyContent = 'center'
          ctx.alignItems = 'flex-end'
          break
        case 'bottom-left':
        case 'bl':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-end'
          ctx.alignItems = 'flex-start'
          break
        case 'bottom-center':
        case 'bc':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-end'
          ctx.alignItems = 'center'
          break
        case 'bottom-right':
        case 'br':
          ctx.direction = 'column'
          ctx.justifyContent = 'flex-end'
          ctx.alignItems = 'flex-end'
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
    const nonContainerPrimitives = new Set([
      'text', 'span', 'input', 'textarea', 'button', 'img', 'image', 'icon',
      'label', 'link', 'a', 'option', 'divider', 'hr', 'spacer', 'h1', 'h2',
      'h3', 'h4', 'h5', 'h6', 'checkbox', 'radio', 'slot', 'zagslot'
    ])
    const isContainer = !nonContainerPrimitives.has(primitiveLower)
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
        // Default for vertical layouts: left-aligned (flex-start)
        ctx.alignItems = 'flex-start'
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
   * @param states Array of state definitions from AST
   * @returns State machine configuration or undefined if no triggered states
   */
  private buildStateMachine(states: State[]): IRStateMachine | undefined {
    // Filter states that have triggers or when dependencies (these form the state machine)
    const interactiveStates = states.filter(s => s.trigger || s.when)

    if (interactiveStates.length === 0) {
      return undefined
    }

    // Build state definitions
    const stateDefinitions: Record<string, IRStateDefinition> = {}
    const transitions: IRStateTransition[] = []

    // First pass: collect all unique state names and their styles
    for (const state of states) {
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
        const transition: IRStateTransition = {
          to: state.name,
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
    // Priority: 1. explicit 'initial' modifier, 2. first state defined
    let initial = Object.keys(stateDefinitions)[0]
    for (const [name, def] of Object.entries(stateDefinitions)) {
      if (def.isInitial) {
        initial = name
        break
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
      // This allows pin-center-x + rotate to combine their transforms
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
    // Absolute positioning: x → left (default)
    if (name === 'x') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
        return [{ property: 'grid-column-start', value: String(numVal) }]
      }
      // Default: absolute positioning
      const val = typeof values[0] === 'number' ? `${values[0]}px` : String(values[0])
      const px = /^-?\d+$/.test(val) ? `${val}px` : val
      return [
        { property: 'position', value: 'absolute' },
        { property: 'left', value: px },
      ]
    }

    // Grid positioning: y → grid-row-start (when parent is grid)
    // Absolute positioning: y → top (default)
    if (name === 'y') {
      const numVal = typeof values[0] === 'number' ? values[0] : parseInt(String(values[0]), 10)
      if (parentLayoutContext?.type === 'grid' && !isNaN(numVal)) {
        return [{ property: 'grid-row-start', value: String(numVal) }]
      }
      // Default: absolute positioning
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

    // Try schema-based conversion FIRST - handles pin-left, pin-right, etc.
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

    // Handle width/height special values
    // 'full' means fill remaining space in flex container
    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'full') {
      const isWidth = name === 'width' || name === 'w'
      // Use flex: 1 1 0% for proper flex fill behavior
      // Do NOT set explicit width/height: 100% as that would ignore parent padding
      // align-self: stretch ensures cross-axis fill even when parent has center alignment
      return [
        { property: 'flex', value: '1 1 0%' },
        // min-width/height: 0 allows shrinking below content size
        { property: isWidth ? 'min-width' : 'min-height', value: '0' },
        // Ensure cross-axis stretch even if parent has align-items: center
        { property: 'align-self', value: 'stretch' },
      ]
    }

    if ((name === 'width' || name === 'w' || name === 'height' || name === 'h') && value === 'hug') {
      return [{ property: name === 'width' || name === 'w' ? 'width' : 'height', value: 'fit-content' }]
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
          const resolvedName = this.resolveTokenWithContext(tokenName, propertyName)
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = resolvedName.replace(/\./g, '-')
          return `var(--${cssVarName})`
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
   * Try to resolve a short token name using property context
   * e.g., 'md' with property 'pad' -> 'md.pad' if '$m.pad' exists in tokens
   */
  private resolveTokenWithContext(tokenName: string, propertyName?: string): string {
    // If token already exists as-is, use it
    if (this.tokenSet.has('$' + tokenName)) {
      return tokenName
    }

    // Try to add property-specific suffix
    if (propertyName) {
      const suffix = IRTransformer.PROPERTY_TO_TOKEN_SUFFIX[propertyName]
      if (suffix) {
        const extendedName = tokenName + suffix
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
        htmlProps.push({ name: 'textContent', value: this.resolveValue(prop.values) })
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
        htmlProps.push({ name: 'value', value: this.resolveValue(prop.values) })
      }
      if (prop.name === 'checked') {
        htmlProps.push({ name: 'checked', value: true })
      }
      if (prop.name === 'hidden') {
        htmlProps.push({ name: 'hidden', value: true })
      }
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
      if (prop.name === 'material') {
        htmlProps.push({ name: 'data-icon-material', value: true })
      }
      // Focusable - makes element keyboard-focusable
      if (prop.name === 'focusable') {
        htmlProps.push({ name: 'tabindex', value: '0' })
      }
    }

    return htmlProps
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
    return {
      type: action.name,
      target: action.target,
      args: action.args,
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
}
