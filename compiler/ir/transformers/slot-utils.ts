/**
 * Slot Utility Functions
 *
 * Pure functions for slot filling and child override handling.
 * Extracted from IRTransformer for modularity.
 */

import type {
  ComponentDefinition,
  Instance,
  Slot,
  Text,
  Property,
  ChildOverride,
} from '../../parser/ast'
import { isComponent, isInstance, isSlot, isText, hasContent } from '../../parser/ast'

/**
 * Convert childOverrides to Instance objects for slot filling
 *
 * childOverrides syntax: NavItem Icon "home"; Label "Home"
 * Each override becomes a pseudo-Instance that fills the corresponding slot
 */
export function childOverridesToInstances(overrides: ChildOverride[]): Instance[] {
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
export function mergeSlotPropertiesIntoFiller(
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
    const wrapped: Instance = {
      type: 'Instance',
      component: 'Text',
      name: null,
      properties: [
        ...slotProperties,
        {
          type: 'Property',
          name: 'content',
          values: [text.content],
          line: text.line,
          column: text.column,
        },
      ],
      children: [],
      line: text.line,
      column: text.column,
    }
    return wrapped
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

// A node that carries a slot-like name. Used as the input/output type of the
// recursive walks below; covers every shape the resolver might encounter in a
// componentChildren tree.
type NamedNode = Instance | ComponentDefinition | Slot

// Get the slot name from a NamedNode, regardless of its concrete shape. Used
// by both collectAllSlotNames and substituteNode — extracted so the if/else
// chain doesn't drift between the two walks.
function getSlotName(node: unknown): string | null {
  if (isInstance(node)) return node.component
  if (isComponent(node)) return node.name
  if (isSlot(node)) return node.name
  return null
}

// Get the children array of a NamedNode for recursion. Slot nodes are leaves
// (no children to recurse into). Text/ZagNode children of Instance/Component
// are skipped by callers since they can't host further slots.
function getSlotChildren(node: NamedNode): ReadonlyArray<unknown> {
  if (isSlot(node)) return []
  return (node as Instance | ComponentDefinition).children || []
}

/**
 * Collect every slot name that appears anywhere in a children tree, recursively.
 *
 * Returns a flat Set of names. The caller decides what to do with collisions
 * (auto-fan-out at deep positions, top-level handled separately by Pass 1).
 *
 * Why a flat Set rather than name+path map: callers only need to test
 * `does this filler name match any slot position?` — the actual substitution
 * is done by `applyDeepSubstitutions` which walks the tree itself.
 */
export function collectAllSlotNames(
  children: ReadonlyArray<Instance | ComponentDefinition | Slot | Text>
): Set<string> {
  const names = new Set<string>()
  for (const node of children) {
    const name = getSlotName(node)
    if (!name) continue
    names.add(name)
    for (const child of getSlotChildren(node as NamedNode)) {
      walkSlotNamesInto(child, names)
    }
  }
  return names
}

function walkSlotNamesInto(node: unknown, out: Set<string>): void {
  const name = getSlotName(node)
  if (!name) return
  out.add(name)
  for (const child of getSlotChildren(node as NamedNode)) {
    walkSlotNamesInto(child, out)
  }
}

/**
 * Rewrite a componentChildren tree by substituting slot positions with the
 * provided fillers. Used for deep slot matching: when a use-site filler's name
 * matches a slot deep in the definition tree (not at top level), the filler
 * is injected at that position and the original slot definition is replaced.
 *
 * Why top-level is excluded: Pass 1 in `children-resolver.ts` handles
 * top-level slot fills with full semantics (visibleWhen, initialState,
 * sub-slot fillers). Re-substituting top-level here would bypass that path
 * and lose those features.
 *
 * Why auto-fan-out: when a single filler name matches multiple deep positions,
 * the same filler content lands at each position. This is the documented v1
 * collision strategy (see `docs/concepts/deep-slot-matching.md`). The
 * faustregel for projects is: same name in multiple positions means they have
 * the same role, so filling all with the same content is correct. If the
 * positions truly need different content, they should have different names.
 *
 * Why isSlotFiller is set on substituted nodes: studio tooling
 * (property-panel, inspector) highlights slot fillers by this marker. Pass 1
 * sets it on top-level fillers; symmetry requires the same on deep
 * substitutions. The IR transformer copies this AST flag to IRNode.
 *
 * Performance: untouched branches share references with the input tree —
 * only modified subtrees are shallow-cloned.
 */
export function applyDeepSubstitutions(
  children: ReadonlyArray<Instance | ComponentDefinition | Slot>,
  substitutions: ReadonlyMap<string, Array<Instance | Text>>,
  isTopLevel: boolean = true
): Array<Instance | ComponentDefinition | Slot> {
  if (substitutions.size === 0) return [...children]
  return children.map(child => substituteNode(child, substitutions, isTopLevel))
}

function substituteNode(
  node: NamedNode,
  substitutions: ReadonlyMap<string, Array<Instance | Text>>,
  isTopLevel: boolean
): NamedNode {
  const nodeName = getSlotName(node)

  if (!isTopLevel && nodeName && substitutions.has(nodeName)) {
    // v1 fan-out picks the first filler — multi-filler at the same deep
    // position is intentionally not supported (see docs/concepts/...).
    const filler = substitutions.get(nodeName)![0]
    // All three NamedNode shapes (Instance / ComponentDefinition / Slot)
    // expose `.properties`; only Slot's is optional. Coalesce to [].
    const slotProps = node.properties ?? []
    const merged = mergeSlotPropertiesIntoFiller(filler, slotProps) as Instance
    // Mark for the IR transformer; matches the marker that Pass 1 sets on
    // top-level slot fillers.
    merged.isSlotFiller = true
    return merged
  }

  if (isSlot(node)) return node

  const inst = node as Instance | ComponentDefinition
  const kids = inst.children
  if (!kids || kids.length === 0) return node

  // children of Instance/ComponentDefinition is (Instance | Slot | Text | ZagNode)[]
  // — preserve the union, only recurse into NamedNode subset.
  type ChildArray = (Instance | Slot | Text)[]
  const newKids: ChildArray = []
  let mutated = false
  for (const k of kids as ChildArray) {
    if (isText(k)) {
      newKids.push(k)
      continue
    }
    const replaced = substituteNode(k, substitutions, false) as Instance | Slot
    if (replaced !== k) mutated = true
    newKids.push(replaced)
  }

  if (!mutated) return node
  return { ...inst, children: newKids } as Instance | ComponentDefinition
}
