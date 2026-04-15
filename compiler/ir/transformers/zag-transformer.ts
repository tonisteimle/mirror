/**
 * Zag Transformer
 *
 * Transforms ZagNode AST nodes into IRZagNode representation.
 * Extracted from ir/index.ts for modularity.
 *
 * Handles all Zag-based components (Select, Checkbox, Tabs, Dialog, etc.)
 * with their machine configurations, slots, and items.
 */

import type { Property, ZagNode, ZagSlotDef, ZagItem, Instance, Text, Slot } from '../../parser/ast'
import type { IRNode, IRZagNode, IRSlot, IRItem, IRItemProperty, SourcePosition } from '../types'
import type { TransformerContext, ParentLayoutContext } from './transformer-context'
import { ZAG_PRIMITIVES } from '../../schema/dsl'

// =============================================================================
// Types
// =============================================================================

/** Property value type from AST */
type PropertyValue = string | number | boolean | unknown

/** Child node type that can be transformed */
type TransformableChild = Instance | Text | Slot

/** Extended IRItem with additional properties for SideNav and group items */
interface ExtendedIRItem extends Omit<IRItem, 'items'> {
  /** Item type for identification (e.g., 'group') */
  type?: string
  /** Badge text for navigation items */
  badge?: string
  /** Show arrow indicator */
  arrow?: boolean
  /** Whether this item is a group header */
  isGroup?: boolean
  /** Whether a group can be collapsed */
  collapsible?: boolean
  /** Whether a group starts open */
  defaultOpen?: boolean
  /** Nested items for group items */
  items?: ExtendedIRItem[]
  /** Field name for form items */
  name?: string
  /** Placeholder text for form inputs */
  placeholder?: string
  /** Whether field is multiline (textarea) */
  multiline?: boolean
  /** Display property name */
  display?: string
  /** Filter expression */
  filter?: string
  /** Allow clearing the value */
  allowClear?: boolean
  /** Maximum value */
  max?: number
  /** Required field */
  required?: boolean
  /** Read-only field */
  readOnly?: boolean
}

// ZagTransformerContext is now just TransformerContext (addPropertyPosition added to base)
type ZagTransformerContext = TransformerContext

// =============================================================================
// Machine Config Property Names
// =============================================================================

/**
 * Set of property names that are machine configuration (not styling).
 */
const MACHINE_CONFIG_PROPS = new Set([
  'placeholder',
  'multiple',
  'searchable',
  'clearable',
  'keepOpen',
  'disabled',
  'value',
  'defaultValue',
  'step',
  'allowMouseWheel',
  'clampValueOnBlur',
  'maxTags',
  'allowDuplicate',
  'submitMode',
  'placement',
  'offset',
  'deselectable',
  'orientation',
  'activationMode',
  'loopFocus',
  'checked',
  'defaultChecked',
  'indeterminate',
  'collapsible',
  'collapsed',
  'label',
  'invalid',
  'readOnly',
  'required',
  'name',
  'src',
  'fallback',
  'accept',
  'maxFiles',
  'maxSize',
  'allowOversize',
  'minSize',
  'min',
  'max',
  'count',
  'allowHalf',
  'dir',
  'size',
  'length',
  'blurOnComplete',
  'otp',
  'type',
  'visible',
  'defaultVisible',
  'collection',
  'auto',
  'validateOnBlur',
  'validateOnChange',
  'items',
  'slidesPerView',
  'loop',
  'autoPlay',
  'autoPlayInterval',
  'steps',
  'defaultStep',
  'linear',
  'totalPages',
  'page',
  'defaultPage',
  'siblingCount',
  'data',
  'expandedKeys',
  'defaultExpandedKeys',
  'selectedKeys',
  'defaultSelectedKeys',
  'locale',
  'selectionMode',
  'mode',
  'fixedWeeks',
  'startOfWeek',
  'closeOnSelect',
  'closeIcon',
  'inline',
  'icon',
  'mask',
])

// =============================================================================
// Main Transform Function
// =============================================================================

/**
 * Transform a ZagNode AST node to an IRZagNode.
 */
export function transformZagComponent(
  ctx: ZagTransformerContext,
  zagNode: ZagNode,
  parentLayoutContext?: ParentLayoutContext,
  parentId?: string
): IRNode {
  const nodeId = ctx.generateId()

  // Build machine configuration from properties
  const machineConfig: Record<string, unknown> = {
    id: nodeId,
  }

  // Collect styling properties separately
  const stylingProperties: Property[] = []

  // Extract bind property if present
  let bindValue: string | undefined

  // Process properties
  for (const prop of zagNode.properties || []) {
    // Handle bind property specially - it's not a machine config or styling property
    if (prop.name === 'bind') {
      const values = prop.values as (string | number | boolean)[]
      if (values.length > 0) {
        const rawValue = String(values[0])
        // Remove leading $ if present
        bindValue = rawValue.startsWith('$') ? rawValue.slice(1) : rawValue
      }
      continue
    }
    if (!MACHINE_CONFIG_PROPS.has(prop.name)) {
      stylingProperties.push(prop)
      continue
    }
    processMachineConfigProperty(prop, machineConfig)
  }

  // Transform slots
  const slots = transformSlots(ctx, zagNode)

  // Transform items
  const items = transformItems(ctx, zagNode.items || [])

  // Source position
  const sourcePosition =
    zagNode.line !== undefined
      ? {
          line: zagNode.line,
          column: zagNode.column ?? 0,
          endLine: zagNode.line,
          endColumn: zagNode.column ?? 0,
        }
      : undefined

  // Transform styling properties to CSS styles
  const styles = ctx.transformProperties(stylingProperties, 'div', parentLayoutContext)

  // Create IRZagNode
  const irNode: IRZagNode = {
    id: nodeId,
    tag: 'div',
    primitive: zagNode.name?.toLowerCase() ?? 'select',
    name: zagNode.name,
    properties: [],
    styles,
    events: [],
    children: [],
    isZagComponent: true,
    zagType: (zagNode.name || zagNode.machine || 'select').toLowerCase(),
    slots,
    items,
    machineConfig,
    sourcePosition,
    isDefinition: zagNode.isDefinition ?? false,
    bind: bindValue,
  }

  // Add to source map
  if (ctx.includeSourceMap && sourcePosition && ctx.addToSourceMap) {
    ctx.addToSourceMap(nodeId, zagNode.name || 'Select', sourcePosition, {
      isDefinition: false,
      parentId,
    })

    // Add property positions for inline editing
    if (ctx.addPropertyPosition) {
      for (const prop of zagNode.properties || []) {
        if (prop.line !== undefined && prop.column !== undefined) {
          ctx.addPropertyPosition(nodeId, prop.name, {
            line: prop.line,
            column: prop.column,
            endLine: prop.line,
            endColumn: prop.column,
          })
        }
      }
    }
  }

  return irNode
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Process a machine config property and add it to the config object.
 */
function processMachineConfigProperty(
  prop: Property,
  machineConfig: Record<string, unknown>
): void {
  const values = prop.values as PropertyValue[]

  switch (prop.name) {
    case 'placeholder':
      machineConfig.placeholder = String(values[0] ?? '')
      break
    case 'multiple':
    case 'searchable':
    case 'clearable':
    case 'disabled':
    case 'allowMouseWheel':
    case 'clampValueOnBlur':
    case 'allowDuplicate':
    case 'loopFocus':
    case 'indeterminate':
    case 'collapsible':
    case 'collapsed':
    case 'invalid':
    case 'readOnly':
    case 'required':
    case 'fixedWeeks':
    case 'closeOnSelect':
    case 'closeIcon':
    case 'inline':
    case 'mask':
    case 'otp':
    case 'loop':
    case 'autoPlay':
    case 'linear':
    case 'auto':
    case 'validateOnBlur':
    case 'validateOnChange':
      machineConfig[prop.name] = values.length === 0 || values[0] === true
      break
    case 'checked':
    case 'defaultChecked':
    case 'visible':
    case 'defaultVisible':
      machineConfig[prop.name] = values.length === 0 || values[0] === true
      break
    case 'keepOpen':
      if (values.length === 0 || values[0] === true) {
        machineConfig.closeOnSelect = false
      }
      break
    case 'deselectable':
      machineConfig.deselectable = values.length === 0 || values[0] === true
      break
    case 'value':
    case 'defaultValue': {
      const nonEmptyValues = values.filter(
        (v: PropertyValue) => v !== '' && v !== undefined && v !== null
      )
      if (nonEmptyValues.length === 0) {
        // Skip
      } else if (nonEmptyValues.length === 1) {
        const val = nonEmptyValues[0]
        if (Array.isArray(val)) {
          machineConfig[prop.name] = val
        } else {
          machineConfig[prop.name] = String(val)
        }
      } else {
        machineConfig[prop.name] = nonEmptyValues.map((v: PropertyValue) => String(v))
      }
      break
    }
    case 'step':
    case 'maxTags':
    case 'offset':
    case 'maxFiles':
    case 'maxSize':
    case 'slidesPerView':
    case 'autoPlayInterval':
    case 'defaultStep':
    case 'count':
    case 'totalPages':
    case 'page':
    case 'defaultPage':
    case 'siblingCount':
    case 'length':
    case 'startOfWeek':
      machineConfig[prop.name] = Number(values[0] ?? getDefaultForProp(prop.name))
      break
    case 'orientation':
      machineConfig.orientation = String(values[0] ?? 'horizontal')
      break
    case 'activationMode':
      machineConfig.activationMode = String(values[0] ?? 'automatic')
      break
    case 'submitMode':
      machineConfig.submitMode = String(values[0] ?? 'both')
      break
    case 'placement':
      machineConfig.placement = String(values[0] ?? 'bottom-start')
      break
    case 'label':
    case 'name':
    case 'src':
    case 'fallback':
    case 'accept':
    case 'locale':
    case 'icon':
    case 'type':
      machineConfig[prop.name] = String(values[0] ?? getDefaultForProp(prop.name))
      break
    case 'min':
    case 'max':
      machineConfig[prop.name] = String(values[0] ?? '')
      break
    case 'selectionMode':
    case 'mode':
      machineConfig.selectionMode = String(values[0] ?? 'single')
      break
    case 'collection': {
      const collectionValue = String(values[0] ?? '')
      machineConfig.collection = collectionValue.startsWith('$')
        ? collectionValue.slice(1)
        : collectionValue
      break
    }
    case 'items':
    case 'steps':
    case 'data':
      try {
        machineConfig[prop.name === 'data' ? 'items' : prop.name] = JSON.parse(
          String(values[0] ?? '[]')
        )
      } catch {
        machineConfig[prop.name === 'data' ? 'items' : prop.name] = values
      }
      break
    case 'expandedKeys':
    case 'defaultExpandedKeys':
    case 'selectedKeys':
    case 'defaultSelectedKeys':
      try {
        machineConfig[prop.name.replace('default', '').replace(/^[A-Z]/, c => c.toLowerCase())] =
          JSON.parse(String(values[0] ?? '[]'))
      } catch {
        machineConfig[prop.name.replace('default', '').replace(/^[A-Z]/, c => c.toLowerCase())] =
          values.map(String)
      }
      break
  }
}

/**
 * Get default value for a property.
 */
function getDefaultForProp(name: string): number | string {
  const defaults: Record<string, number | string> = {
    step: 1,
    maxTags: Infinity,
    offset: 4,
    maxFiles: 10,
    maxSize: 10485760,
    slidesPerView: 1,
    autoPlayInterval: 5000,
    defaultStep: 0,
    count: 10,
    totalPages: 10,
    page: 1,
    defaultPage: 1,
    siblingCount: 1,
    length: 4,
    startOfWeek: 0,
    locale: 'en-US',
    icon: 'check',
    type: 'numeric',
    accept: '*',
  }
  return defaults[name] ?? 0
}

/**
 * Transform slots from ZagNode.
 */
function transformSlots(ctx: ZagTransformerContext, zagNode: ZagNode): Record<string, IRSlot> {
  const slots: Record<string, IRSlot> = {}

  // Process defined slots
  for (const [slotName, slotDefUnknown] of Object.entries(zagNode.slots || {})) {
    const slotDef = slotDefUnknown as ZagSlotDef
    const slotChildren = (slotDef.children || []).map((child: TransformableChild) =>
      ctx.transformChild(child)
    )
    slots[slotName] = {
      name: slotName,
      apiMethod: `get${slotName}Props`,
      element: slotName === 'Trigger' ? 'button' : 'div',
      styles: ctx.transformProperties(slotDef.properties || [], 'slot'),
      children: slotChildren,
      portal: slotName === 'Content',
      sourcePosition: slotDef.sourcePosition,
    }
  }

  // Add default slots from primitive definition
  const machineType = zagNode.machine || 'select'
  const primitiveKey = Object.keys(ZAG_PRIMITIVES).find(
    key => ZAG_PRIMITIVES[key].machine === machineType
  )
  const primitiveDef = primitiveKey ? ZAG_PRIMITIVES[primitiveKey] : null

  if (primitiveDef?.slots) {
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

  return slots
}

/**
 * Transform items from ZagNode.
 */
function transformItems(ctx: ZagTransformerContext, items: ZagItem[]): ExtendedIRItem[] {
  const transformItem = (item: ZagItem): ExtendedIRItem => {
    const irItem: ExtendedIRItem = {
      value: item.value ?? item.label ?? '',
      label: item.label ?? item.value ?? '',
      disabled: item.disabled,
      icon: item.icon,
      sourcePosition: item.sourcePosition,
    }

    // Group item properties
    if (item.isGroup) {
      irItem.isGroup = true
      irItem.type = 'group'
      if (item.items && item.items.length > 0) {
        irItem.items = item.items.map(transformItem)
      }
      if (item.collapsible) {
        irItem.collapsible = true
      }
      if (item.defaultOpen !== undefined) {
        irItem.defaultOpen = item.defaultOpen
      }
    }

    // SideNav-specific properties
    if (item.badge) irItem.badge = item.badge
    if (item.arrow) irItem.arrow = true
    if (item.shows) irItem.shows = item.shows
    if (item.showsFrom) irItem.showsFrom = item.showsFrom

    // Form Field-specific properties
    if (item.name) irItem.name = item.name
    if (item.placeholder) irItem.placeholder = item.placeholder
    if (item.multiline) irItem.multiline = true
    if (item.display) irItem.display = item.display
    if (item.filter) irItem.filter = item.filter
    if (item.allowClear) irItem.allowClear = true
    if (item.max !== undefined) irItem.max = item.max
    if (item.required) irItem.required = true
    if (item.readOnly) irItem.readOnly = true

    // Layout properties
    if (item.properties && item.properties.length > 0) {
      irItem.properties = item.properties as unknown as IRItemProperty[]
    }

    // Children
    if (item.children && item.children.length > 0) {
      irItem.children = item.children.map((child: TransformableChild) => ctx.transformChild(child))
    } else if (item.shows) {
      irItem.shows = item.shows
      if (item.showsFrom) {
        irItem.showsFrom = item.showsFrom
      }
    } else if (item.value) {
      irItem.loadFromFile = item.value
    }

    return irItem
  }

  return items.map(transformItem)
}
