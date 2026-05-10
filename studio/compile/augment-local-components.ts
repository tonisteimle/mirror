/**
 * Auto-preview helper for local component definitions.
 *
 * When the user is editing a layout file that defines components but
 * doesn't yet instance them all, we synthesize an implicit instance
 * for each uninstanced component so the user sees a preview while
 * developing. The pattern is "type a definition → see the live render
 * without manually adding `MyCard` at the bottom of the file".
 *
 * Two pure helpers, no compiler-bundle dependencies (the caller passes
 * already-parsed ASTs):
 *
 *   - `findUninstancedComponents(full, local)` — returns the names
 *     defined in `local` that are not instanced anywhere in `full`.
 *     Narrows `instances` to the literal `Instance` variant; other
 *     variants (Slot, Each, ConditionalNode) don't have a `component`
 *     field and would otherwise widen to `string | undefined`.
 *
 *   - `appendImplicitInstances(code, names)` — concatenates implicit
 *     `Name` lines after the resolved source with a marker comment
 *     so source-map readers can ignore the synthetic block.
 */

import type { Program, Instance } from '../../compiler/parser/ast'

export function findUninstancedComponents(fullAst: Program, localAst: Program): string[] {
  const localNames = (localAst.components || []).map(c => c.name)
  const instanced = new Set(
    (fullAst.instances || [])
      .filter((i): i is Instance => i.type === 'Instance')
      .map(i => i.component)
  )
  return localNames.filter(name => !instanced.has(name))
}

export function appendImplicitInstances(resolvedCode: string, components: string[]): string {
  if (components.length === 0) return resolvedCode
  return resolvedCode + '\n\n// Auto-preview local components\n' + components.join('\n')
}
