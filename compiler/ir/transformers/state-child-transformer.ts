/**
 * State Child Transformer
 *
 * Functions for transforming state children (Figma Variants pattern).
 * When a state has children, they represent the complete UI for that state.
 */

import type { Instance, Property } from '../../parser/ast'
import type { IRNode, IRStyle, IRProperty } from '../types'
import { getPrimitiveDefaults } from '../../schema/primitives'
import { getHtmlTag } from '../../schema/ir-helpers'
import { convertDefaultsToProperties, mergeProperties } from './property-utils-transformer'

/**
 * Context for state child transformation
 */
export interface StateChildContext {
  generateNodeId: () => string
  transformProperties: (properties: Property[], primitive: string) => IRStyle[]
  /**
   * Extract HTML properties (placeholder, disabled, type, value, …) from the
   * raw property list — same logic as for the top-level pipeline. Optional
   * for backward-compat: if missing, only `content → textContent` is mapped
   * (legacy behavior, loses Input attributes for state-children).
   */
  extractHtmlProperties?: (properties: Property[], primitive: string) => IRProperty[]
}

/**
 * Transform a state child (Instance) to IRNode.
 * Used for state children (like Figma Variants).
 *
 * @param instance The state child instance
 * @param ctx Transformation context
 * @returns IRNode or null if invalid
 */
export function transformStateChild(instance: Instance, ctx: StateChildContext): IRNode | null {
  if (!instance || !instance.component) {
    return null
  }

  // Determine HTML tag
  const primitive = instance.component.toLowerCase()
  const tag = getHtmlTag(primitive)

  // Get primitive defaults and convert to Property format
  const primitiveDefaults = convertDefaultsToProperties(getPrimitiveDefaults(primitive))

  // Merge properties: Primitive Defaults < Instance Properties
  const properties = mergeProperties(primitiveDefaults, instance.properties)

  // Transform to styles
  const styles = ctx.transformProperties(properties, primitive)

  // Create node ID
  const nodeId = ctx.generateNodeId()

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

  // Extract HTML properties (placeholder, disabled, type, value, …) so that
  // state-children spawned by states (e.g. `on: \n  Input placeholder "x"`)
  // carry the same attributes as top-level instances. When the context does
  // not provide an extractor, fall back to the legacy content-only path.
  if (ctx.extractHtmlProperties) {
    node.properties.push(...ctx.extractHtmlProperties(instance.properties, primitive))
  } else {
    const contentProp = instance.properties.find(p => p.name === 'content')
    if (contentProp && contentProp.values.length > 0) {
      node.properties.push({
        name: 'textContent',
        value: String(contentProp.values[0]),
      })
    }
  }

  // Transform children recursively
  if (instance.children && instance.children.length > 0) {
    for (const child of instance.children) {
      const irChild = transformStateChild(child as Instance, ctx)
      if (irChild) {
        node.children.push(irChild)
      }
    }
  }

  return node
}
