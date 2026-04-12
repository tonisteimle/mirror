/**
 * Compound Primitive Transformer
 *
 * Functions for transforming compound primitives (Shell, etc.).
 * Compound primitives are pre-built layout components with:
 * - Default CSS Grid/Flex styles from the schema
 * - Named slots (Header, Sidebar, Main, Footer) with their own default styles
 * - Nested slots (Logo, Nav, SidebarGroup, etc.)
 */

import type { Instance, Text, Property } from '../../parser/ast'
import { isInstance, isText } from '../../parser/ast'
import type { IRNode, IRStyle, SourcePosition } from '../types'
import type { ParentLayoutContext } from './transformer-context'
import { getCompoundPrimitive, getCompoundSlotDef, isCompoundSlot } from '../../schema/compound-primitives'
import { transformEvents } from './event-transformer'
import { calculateSourcePosition } from '../source-map'
import { resolveValue } from './value-resolver'

/**
 * Context for compound primitive transformation
 */
export interface CompoundTransformContext {
  generateId: () => string
  transformProperties: (properties: Property[], primitive: string, parentLayoutContext?: ParentLayoutContext) => IRStyle[]
  transformInstance: (instance: Instance, parentId?: string, isEachTemplate?: boolean, isConditional?: boolean, parentLayoutContext?: ParentLayoutContext) => IRNode
  createTextNode: (text: Text) => IRNode
  tokenSet: Set<string>
  includeSourceMap: boolean
  addToSourceMap?: (
    nodeId: string,
    name: string,
    sourcePosition: SourcePosition,
    options: { isDefinition: boolean }
  ) => void
}

/**
 * Transform a Compound primitive (Shell, etc.) into an IRNode
 *
 * @param instance The compound primitive instance
 * @param ctx Transformation context
 * @param parentId Optional parent node ID
 * @param parentLayoutContext Optional parent layout context
 * @returns IRNode for the compound primitive
 */
export function transformCompoundPrimitive(
  instance: Instance,
  ctx: CompoundTransformContext,
  parentId?: string,
  parentLayoutContext?: ParentLayoutContext
): IRNode {
  const nodeId = ctx.generateId()
  const compoundType = instance.compoundType!
  const compoundDef = getCompoundPrimitive(compoundType)

  if (!compoundDef) {
    // Fallback: treat as regular instance
    return ctx.transformInstance({ ...instance, isCompound: false }, parentId, false, false, parentLayoutContext)
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
    const userStyles = ctx.transformProperties(instance.properties, 'frame', parentLayoutContext)
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
      const childNode = transformCompoundSlot(child, compoundType, nodeId, ctx)
      children.push(childNode)
    } else if (isText(child)) {
      children.push(ctx.createTextNode(child))
    }
  }

  // Track source position
  let sourcePosition: SourcePosition | undefined
  if (ctx.includeSourceMap && ctx.addToSourceMap) {
    sourcePosition = calculateSourcePosition(instance.line, instance.column)
    ctx.addToSourceMap(
      nodeId,
      instance.component,
      sourcePosition,
      { isDefinition: instance.isDefinition || false }
    )
  }

  // Extract instanceName from 'name' property if not set via 'named' keyword
  const nameProp = instance.properties?.find(p => p.name === 'name')
  const instanceNameFromProp = nameProp ? resolveValue(nameProp.values, ctx.tokenSet) : undefined
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
 *
 * @param child The child instance
 * @param compoundType The compound type name
 * @param parentId The parent node ID
 * @param ctx Transformation context
 * @returns IRNode for the compound slot
 */
export function transformCompoundSlot(
  child: Instance,
  compoundType: string,
  parentId: string,
  ctx: CompoundTransformContext
): IRNode {
  const slotDef = getCompoundSlotDef(compoundType, child.component)
  const compoundDef = getCompoundPrimitive(compoundType)

  // If this is a known slot, apply default styles
  if (slotDef) {
    const nodeId = ctx.generateId()

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
      const userStyles = ctx.transformProperties(child.properties, 'frame')
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
          slotChildren.push(transformCompoundSlot(grandChild, compoundType, nodeId, ctx))
        } else {
          slotChildren.push(ctx.transformInstance(grandChild, nodeId))
        }
      } else if (isText(grandChild)) {
        slotChildren.push(ctx.createTextNode(grandChild))
      }
    }

    // Track source position
    let sourcePosition: SourcePosition | undefined
    if (ctx.includeSourceMap && ctx.addToSourceMap) {
      sourcePosition = calculateSourcePosition(child.line, child.column)
      ctx.addToSourceMap(
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
  return ctx.transformInstance(child, parentId)
}
