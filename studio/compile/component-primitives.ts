/**
 * Component-primitive map builder for the icon-trigger pipeline.
 *
 * The editor's icon-trigger needs to know which underlying primitive a
 * user-defined component renders as (e.g. `Btn as Button` → primitive
 * `button`). At compile-time we rebuild that map from the parsed AST
 * so the trigger sees the current component set.
 *
 * Pure helper: given `ast.components` and a target Map, clear+repopulate
 * the map and return it. Caller decides what to do with the map (typically
 * passes it back to the trigger manager).
 *
 * Convention matches the legacy inline block in app.ts: a component with
 * an explicit `primitive` keeps that value (lower-/mixed-case is left to
 * the parser); without one, the component's own `name` lowercased is
 * used as the primitive — this is the IR's fallback and the trigger
 * pipeline expects it.
 */

import type { ComponentDefinition } from '../../compiler/parser/ast'

export type ComponentPrimitivesMap = Map<string, string>

export function buildComponentPrimitives(
  components: ComponentDefinition[],
  target: ComponentPrimitivesMap
): ComponentPrimitivesMap {
  target.clear()
  for (const comp of components) {
    const primitive = comp.primitive || comp.name.toLowerCase()
    target.set(comp.name, primitive)
  }
  return target
}
