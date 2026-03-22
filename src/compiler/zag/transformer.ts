/**
 * Zag AST to IR Transformer
 *
 * Transforms Zag component AST nodes into IR nodes suitable for
 * code generation and runtime rendering.
 */

import type { ZagNode, ZagSlotDef, ZagItem, Property, State, Event, Instance, Text, Slot } from '../../parser/ast'
import type { IRZagNode, IRSlot, IRItem, IRStyle, IRNode, IREvent, IRAction, SourcePosition } from '../../ir/types'
import { getSlotDefinition, getSlotApiMethod, getSlotElement, isPortaledSlot } from './slots'
import { getZagMachineType } from './detector'
import type { ZagMachineConfig, ZagCompileContext, ParsedSlot, ParsedItem } from './types'

/**
 * Transform a ZagNode AST to IRZagNode
 *
 * @param node Zag component AST node
 * @param context Compilation context
 * @returns IR node for the Zag component
 */
export function transformZagNode(
  node: ZagNode,
  context: ZagCompileContext
): IRZagNode {
  const nodeId = generateId(context)
  const machineType = getZagMachineType(node.name) ?? 'unknown'

  // Build machine configuration from properties
  const machineConfig = buildMachineConfig(node.properties, nodeId)

  // Transform slots
  const slots: Record<string, IRSlot> = {}
  for (const [slotName, slotDef] of Object.entries(node.slots)) {
    slots[slotName] = transformSlot(node.name, slotName, slotDef, context)
  }

  // Transform items
  const items: IRItem[] = node.items.map(item => transformItem(item, context))

  // Transform events
  const events = transformEvents(node.events)

  // Build source position
  const sourcePosition: SourcePosition = {
    line: node.line,
    column: node.column,
    endLine: node.line,
    endColumn: node.column,
  }

  // Build the IRZagNode
  const irNode: IRZagNode = {
    id: nodeId,
    tag: 'div',  // Zag components render as containers
    primitive: node.name.toLowerCase(),
    name: node.name,
    properties: extractHTMLProperties(node.properties),
    styles: [],  // Base styles (component-level)
    events,
    children: [],  // Children are in slots
    isZagComponent: true,
    zagType: machineType,
    slots,
    items,
    machineConfig: machineConfig as unknown as Record<string, unknown>,
    sourcePosition,
  }

  return irNode
}

/**
 * Transform a slot definition to IRSlot
 */
function transformSlot(
  componentName: string,
  slotName: string,
  slot: ZagSlotDef,
  context: ZagCompileContext
): IRSlot {
  // Validate slot name
  const slotDef = getSlotDefinition(componentName, slotName)
  if (!slotDef) {
    console.warn(`Unknown slot "${slotName}" for component "${componentName}"`)
  }

  const apiMethod = getSlotApiMethod(componentName, slotName) ?? `get${slotName}Props`
  const element = getSlotElement(componentName, slotName)
  const portal = isPortaledSlot(componentName, slotName)

  // Transform properties to styles
  const styles = transformProperties(slot.properties)

  // Add state styles
  for (const state of slot.states) {
    const stateStyles = transformStateProperties(state)
    styles.push(...stateStyles)
  }

  // Transform children (filter out Slot types for now)
  const validChildren = slot.children.filter(
    (child): child is Instance | Text => child.type === 'Instance' || child.type === 'Text'
  )
  const children = transformChildren(validChildren, context)

  return {
    name: slotName,
    apiMethod,
    element,
    styles,
    children,
    portal,
    sourcePosition: slot.sourcePosition,
  }
}

/**
 * Transform an item to IRItem
 */
function transformItem(item: ZagItem, context: ZagCompileContext): IRItem {
  // Use label as value if value not provided
  const value = item.value ?? item.label ?? generateItemValue(context)
  const label = item.label ?? item.value ?? value

  const children = item.children
    ? transformChildren(item.children as (Instance | Text)[], context)
    : undefined

  return {
    value,
    label,
    disabled: item.disabled,
    children,
    sourcePosition: item.sourcePosition,
  }
}

/**
 * Build machine configuration from component properties
 */
function buildMachineConfig(properties: Property[], nodeId: string): ZagMachineConfig {
  const config: ZagMachineConfig = {
    id: nodeId,
  }

  for (const prop of properties) {
    switch (prop.name) {
      case 'placeholder':
        config.placeholder = String(prop.values[0] ?? '')
        break
      case 'multiple':
        config.multiple = prop.values.length === 0 || prop.values[0] === true
        break
      case 'searchable':
        config.searchable = prop.values.length === 0 || prop.values[0] === true
        break
      case 'clearable':
        config.clearable = prop.values.length === 0 || prop.values[0] === true
        break
      case 'disabled':
        config.disabled = prop.values.length === 0 || prop.values[0] === true
        break
      case 'value':
        // Single value for single-select, array for multiple
        if (prop.values.length === 1) {
          config.value = String(prop.values[0])
        } else {
          config.value = prop.values.map(v => String(v))
        }
        break
      case 'defaultValue':
        // Single value for single-select, array for multiple
        if (prop.values.length === 1) {
          config.defaultValue = String(prop.values[0])
        } else {
          config.defaultValue = prop.values.map(v => String(v))
        }
        break
    }
  }

  return config
}

/**
 * Transform properties to IRStyle array
 */
function transformProperties(properties: Property[]): IRStyle[] {
  const styles: IRStyle[] = []

  for (const prop of properties) {
    const cssStyles = propertyToCSS(prop)
    styles.push(...cssStyles)
  }

  return styles
}

/**
 * Transform state properties to IRStyle with state attribute
 */
function transformStateProperties(state: State): IRStyle[] {
  const styles: IRStyle[] = []

  for (const prop of state.properties) {
    const cssStyles = propertyToCSS(prop)
    for (const style of cssStyles) {
      styles.push({ ...style, state: state.name })
    }
  }

  return styles
}

/**
 * Convert a property to CSS styles
 *
 * This is a simplified version - the full implementation would use
 * the schema-based conversion from ir-helpers.
 */
function propertyToCSS(prop: Property): IRStyle[] {
  const name = prop.name
  const value = prop.values.join(' ')

  // Map common property names to CSS
  const propertyMap: Record<string, string> = {
    'bg': 'background',
    'background': 'background',
    'col': 'color',
    'color': 'color',
    'pad': 'padding',
    'padding': 'padding',
    'margin': 'margin',
    'm': 'margin',
    'rad': 'border-radius',
    'radius': 'border-radius',
    'bor': 'border',
    'border': 'border',
    'boc': 'border-color',
    'w': 'width',
    'width': 'width',
    'h': 'height',
    'height': 'height',
    'gap': 'gap',
    'fs': 'font-size',
    'font-size': 'font-size',
    'opacity': 'opacity',
    'opa': 'opacity',
  }

  const cssProperty = propertyMap[name]
  if (!cssProperty) return []

  // Format value (add px for numeric values where appropriate)
  const formattedValue = formatCSSValue(cssProperty, value)

  return [{ property: cssProperty, value: formattedValue }]
}

/**
 * Format CSS value (add px units where needed)
 */
function formatCSSValue(property: string, value: string): string {
  const needsPx = [
    'padding', 'margin', 'width', 'height', 'gap',
    'font-size', 'border-radius', 'border-width',
  ]

  if (needsPx.some(p => property.includes(p))) {
    // Add px to numeric values
    return value.split(' ').map(v => {
      if (/^\d+$/.test(v)) return `${v}px`
      return v
    }).join(' ')
  }

  return value
}

/**
 * Transform events to IREvent array
 */
function transformEvents(events: Event[]): IREvent[] {
  return events.map(event => ({
    name: mapEventName(event.name),
    key: event.key,
    actions: event.actions.map(action => ({
      type: action.name,
      target: action.target,
      args: action.args,
    })),
    modifiers: event.modifiers,
  }))
}

/**
 * Map Mirror event names to DOM event names
 */
function mapEventName(name: string): string {
  const eventMap: Record<string, string> = {
    'onclick': 'click',
    'onhover': 'mouseenter',
    'onfocus': 'focus',
    'onblur': 'blur',
    'onchange': 'change',
    'oninput': 'input',
    'onkeydown': 'keydown',
    'onkeyup': 'keyup',
    'onopen': 'open',
    'onclose': 'close',
  }
  return eventMap[name] ?? name.replace(/^on/, '')
}

/**
 * Transform children nodes
 */
function transformChildren(children: (Instance | Text)[], context: ZagCompileContext): IRNode[] {
  const result: IRNode[] = []

  for (const child of children) {
    if (child.type === 'Text') {
      // Handle Text nodes directly
      const text = child as Text
      const textNode: IRNode = {
        id: generateId(context),
        tag: 'span',
        primitive: 'text',
        name: 'Text',
        properties: [{ name: 'textContent', value: text.content }],
        styles: [],
        events: [],
        children: [],
        sourcePosition: {
          line: text.line,
          column: text.column,
          endLine: text.line,
          endColumn: text.column + (text.content?.length ?? 0),
        },
      }
      result.push(textNode)
    } else if (context.transformChild) {
      // Use callback to transform Instance nodes via main IR transformer
      const transformed = context.transformChild(child)
      if (transformed) {
        result.push(transformed)
      }
    }
    // If no callback and not Text, skip the child (logged at compile time)
  }

  return result
}

/**
 * Extract HTML properties from component properties
 */
function extractHTMLProperties(properties: Property[]): Array<{ name: string; value: string | number | boolean }> {
  const htmlProps: Array<{ name: string; value: string | number | boolean }> = []

  for (const prop of properties) {
    if (prop.name === 'content') {
      htmlProps.push({ name: 'textContent', value: prop.values.join(' ') })
    }
    if (prop.name === 'placeholder') {
      htmlProps.push({ name: 'data-placeholder', value: String(prop.values[0] ?? '') })
    }
  }

  return htmlProps
}

/**
 * Generate unique ID for nodes
 */
function generateId(context: ZagCompileContext): string {
  return `zag-${++context.idCounter}`
}

/**
 * Generate unique item value
 */
function generateItemValue(context: ZagCompileContext): string {
  return `item-${++context.idCounter}`
}

/**
 * Create a compilation context
 *
 * @param transformChild Optional callback to transform child nodes
 */
export function createZagCompileContext(
  transformChild?: (child: any) => IRNode | null
): ZagCompileContext {
  return {
    idCounter: 0,
    componentMap: new Map(),
    tokenSet: new Set(),
    includeSourceMap: false,
    transformChild,
  }
}
