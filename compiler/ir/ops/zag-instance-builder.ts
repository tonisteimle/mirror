/**
 * IRTransformer ops — zag-instance-builder
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type {
  ComponentDefinition,
  Instance,
  Slot,
  Text,
  ZagNode,
  ZagSlotDef,
  ZagItem,
} from '../../parser/ast'
import type { IRNode } from '../types'
import { ZAG_PRIMITIVES } from '../../schema/zag-primitives'
import { transformZagComponent as transformZagComponentExtracted } from '../transformers/zag-transformer'
import type { ParentLayoutContext } from '../transformers/transformer-context'
import { mergeProperties } from '../transformers/property-utils-transformer'
import type { IRTransformer } from '../index'

export function transformZagComponent(
  this: IRTransformer,
  zagNode: ZagNode,
  parentLayoutContext?: ParentLayoutContext,
  parentId?: string
): IRNode {
  const ctx = this.createTransformerContext()
  return transformZagComponentExtracted(ctx, zagNode, parentLayoutContext, parentId)
}

/**
 * Build a synthetic ZagNode from an Instance that inherits from a Zag primitive
 */
export function buildZagNodeFromInstance(
  this: IRTransformer,
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

  // Helper to check if a child is a slot definition
  const isSlotChild = (childInstance: Instance): boolean => {
    const childName = childInstance.component || ''
    return (
      childInstance.isDefinition ||
      (zagDef?.slots && zagDef.slots.includes(childName.replace(':', '')))
    )
  }

  // Helper to extract slot from child instance
  const extractSlot = (childInstance: Instance): { name: string; slot: ZagSlotDef } | null => {
    const childName = childInstance.component || ''
    if (!isSlotChild(childInstance)) return null

    const slotName = childName.replace(':', '')
    const srcPos = {
      line: childInstance.line,
      column: childInstance.column,
      endLine: childInstance.line,
      endColumn: childInstance.column,
    }
    return {
      name: slotName,
      slot: {
        name: slotName,
        properties: childInstance.properties,
        states: [],
        children: childInstance.children as (Instance | Slot | Text)[],
        sourcePosition: srcPos,
      },
    }
  }

  // First, extract slots from resolvedComponent.children (base component's slot definitions)
  // These define the base styling for slots like Trigger:, Content:
  if (resolvedComponent?.children) {
    for (const child of resolvedComponent.children) {
      if (child.type === 'Instance') {
        const extracted = extractSlot(child as Instance)
        if (extracted) {
          slots[extracted.name] = extracted.slot
        }
      }
    }
  }

  // Then, extract slots and items from instance.children
  // Instance slots override component slots (properties are merged)
  for (const child of instance.children) {
    if (child.type === 'Instance') {
      const childInstance = child as Instance
      const extracted = extractSlot(childInstance)

      if (extracted) {
        // Merge with existing slot if present (instance properties override component)
        const existingSlot = slots[extracted.name]
        if (existingSlot) {
          slots[extracted.name] = {
            ...extracted.slot,
            properties: mergeProperties(existingSlot.properties, extracted.slot.properties),
            children:
              extracted.slot.children.length > 0 ? extracted.slot.children : existingSlot.children,
          }
        } else {
          slots[extracted.name] = extracted.slot
        }
      } else {
        // Treat as item - get text content from first Text child or name
        const childName = childInstance.name || ''
        let label = childName
        const textChild = childInstance.children.find(c => c.type === 'Text') as Text | undefined
        if (textChild) {
          label = textChild.content
        }
        const srcPos = {
          line: childInstance.line,
          column: childInstance.column,
          endLine: childInstance.line,
          endColumn: childInstance.column,
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
