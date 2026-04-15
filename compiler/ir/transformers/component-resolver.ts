/**
 * Component Resolution Functions
 *
 * Pure functions for resolving component inheritance and merging states.
 * Extracted from IRTransformer for modularity.
 */

import type { State, Property, ComponentDefinition, SourcePosition } from '../../parser/ast'
import { mergeProperties } from './property-utils-transformer'

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
export function mergeStates(parentStates: State[], childStates: State[]): State[] {
  // Create a map of state name -> merged state
  const stateMap = new Map<string, State>()

  // Add parent states first (with null-check for state name)
  for (const state of parentStates) {
    if (!state.name) {
      // Skip states without names
      continue
    }
    stateMap.set(state.name, { ...state })
  }

  // Merge child states (child properties override parent)
  for (const state of childStates) {
    if (!state.name) {
      // Skip states without names
      continue
    }
    const existing = stateMap.get(state.name)
    if (existing) {
      // Merge properties: child overrides parent
      stateMap.set(state.name, {
        ...state,
        properties: mergeProperties(existing.properties, state.properties),
        childOverrides: [...(existing.childOverrides || []), ...(state.childOverrides || [])],
      })
    } else {
      stateMap.set(state.name, { ...state })
    }
  }

  return Array.from(stateMap.values())
}

/**
 * Context for component resolution (needed for warnings and component lookup)
 */
export interface ComponentResolverContext {
  componentMap: Map<string, ComponentDefinition>
  addWarning?: (warning: { type: string; message: string; position?: SourcePosition }) => void
}

/**
 * Resolve component inheritance chain
 *
 * Supports two syntaxes:
 * - `Extended extends Base:` → component.extends = 'Base'
 * - `Extended as Base:` → component.primitive = 'Base' (if Base is a component)
 *
 * @param component - The component to resolve
 * @param ctx - Context with componentMap and optional warning callback
 * @param visited - Set of component names already visited (for cycle detection)
 */
export function resolveComponent(
  component: ComponentDefinition,
  ctx: ComponentResolverContext,
  visited: Set<string> = new Set()
): ComponentDefinition {
  // Circular reference detection
  if (visited.has(component.name)) {
    if (ctx.addWarning) {
      ctx.addWarning({
        type: 'circular-inheritance',
        message: `Circular component inheritance detected: ${[...visited, component.name].join(' → ')}`,
        position: {
          line: component.line ?? 0,
          column: component.column ?? 0,
          endLine: component.line ?? 0,
          endColumn: component.column ?? 0
        }
      })
    }
    return component // Return unresolved to prevent infinite recursion
  }
  visited.add(component.name)

  // Determine the parent - either from explicit extends or from primitive if it's a component name
  let parentName = component.extends
  let inheritFromPrimitive = false

  // If no explicit extends, check if primitive is actually a component name
  if (!parentName && component.primitive) {
    const primitiveAsComponent = ctx.componentMap.get(component.primitive)
    if (primitiveAsComponent) {
      parentName = component.primitive
      inheritFromPrimitive = true
    }
  }

  if (!parentName) {
    return component
  }

  const parent = ctx.componentMap.get(parentName)
  if (!parent) {
    return component
  }

  // Pass the visited set to detect cycles in the inheritance chain
  const resolvedParent = resolveComponent(parent, ctx, visited)

  // Merge parent + child (child overrides)
  return {
    ...component,
    // If we inherited via primitive name, use the parent's actual primitive
    primitive: inheritFromPrimitive ? resolvedParent.primitive : (component.primitive || resolvedParent.primitive),
    properties: mergeProperties(resolvedParent.properties, component.properties),
    states: mergeStates(resolvedParent.states, component.states),
    events: [...resolvedParent.events, ...component.events],
    children: [...resolvedParent.children, ...component.children],
    // Merge slots for Zag components (child slots override parent)
    slots: mergeSlots(resolvedParent.slots, component.slots),
  }
}

/**
 * Merge parent and child slots (child overrides parent)
 */
function mergeSlots(
  parentSlots: Record<string, any> | undefined,
  childSlots: Record<string, any> | undefined
): Record<string, any> | undefined {
  if (!parentSlots && !childSlots) return undefined
  if (!parentSlots) return childSlots
  if (!childSlots) return parentSlots

  const merged: Record<string, any> = { ...parentSlots }
  for (const [slotName, childSlot] of Object.entries(childSlots)) {
    if (merged[slotName]) {
      // Merge slot properties (child overrides parent)
      merged[slotName] = {
        ...merged[slotName],
        ...childSlot,
        properties: mergeProperties(merged[slotName].properties || [], childSlot.properties || []),
      }
    } else {
      merged[slotName] = childSlot
    }
  }
  return merged
}
