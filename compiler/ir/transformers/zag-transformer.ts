/**
 * Zag Transformer
 *
 * Transforms ZagNode AST nodes into IRZagNode representation.
 * Extracted from ir/index.ts for modularity.
 *
 * Handles all Zag-based components (Select, Checkbox, Tabs, Dialog, etc.)
 * with their machine configurations, slots, and items.
 */

import type { Property, ZagNode, ZagSlotDef, Instance, Text, Slot } from '../../parser/ast'
import type { IRNode, IRZagNode, IRSlot, SourcePosition } from '../types'
import type { TransformerContext, ParentLayoutContext } from './transformer-context'
import { ZAG_PRIMITIVES } from '../../schema/dsl'

// =============================================================================
// Types
// =============================================================================

/** Property value type from AST */
type PropertyValue = string | number | boolean | unknown

/** Child node type that can be transformed */
type TransformableChild = Instance | Text | Slot

// ZagTransformerContext is now just TransformerContext (addPropertyPosition added to base)
type ZagTransformerContext = TransformerContext

// =============================================================================
// Machine Config Property Names
// =============================================================================

/**
 * Set of property names that are machine configuration (not styling) for
 * DatePicker — the only remaining Zag component after the 2026-04-25 cleanup.
 */
const MACHINE_CONFIG_PROPS = new Set([
  'placeholder',
  'value',
  'defaultValue',
  'disabled',
  'readOnly',
  'min',
  'max',
  'locale',
  'selectionMode',
  'fixedWeeks',
  'startOfWeek',
  'closeOnSelect',
  'positioning',
  'name',
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

  // DatePicker has no items — transformItems was dead code and is removed.
  const items: never[] = []

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

  // Only DatePicker schema-properties remain after the Zag-Cleanup. All other
  // case-arms (multiple/searchable/clearable/keepOpen/orientation/activationMode/
  // submitMode/placement/items/steps/data/checked/visible/etc.) were dead code
  // and were removed.
  switch (prop.name) {
    case 'placeholder':
      machineConfig.placeholder = String(values[0] ?? '')
      break
    case 'disabled':
    case 'readOnly':
    case 'fixedWeeks':
    case 'closeOnSelect':
      machineConfig[prop.name] = values.length === 0 || values[0] === true
      break
    case 'value':
    case 'defaultValue': {
      const nonEmptyValues = values.filter(
        (v: PropertyValue) => v !== '' && v !== undefined && v !== null
      )
      if (nonEmptyValues.length === 0) break
      if (nonEmptyValues.length === 1) {
        const val = nonEmptyValues[0]
        machineConfig[prop.name] = Array.isArray(val) ? val : String(val)
      } else {
        machineConfig[prop.name] = nonEmptyValues.map((v: PropertyValue) => String(v))
      }
      break
    }
    case 'startOfWeek':
      machineConfig[prop.name] = Number(values[0] ?? 0)
      break
    case 'positioning':
      machineConfig.positioning = String(values[0] ?? 'bottom-start')
      break
    case 'name':
    case 'locale':
      machineConfig[prop.name] = String(values[0] ?? '')
      break
    case 'min':
    case 'max':
      machineConfig[prop.name] = String(values[0] ?? '')
      break
    case 'selectionMode':
      machineConfig.selectionMode = String(values[0] ?? 'single')
      break
  }
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

// transformItems and ExtendedIRItem were removed: DatePicker has no items.
