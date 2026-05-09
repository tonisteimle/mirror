/**
 * Property Set Expander
 *
 * A property-set reference looks like
 *   { name: 'propset', values: [{ kind: 'token', name: 'cardstyle' }] }
 * (Parser-internal form for `Frame $cardstyle`.) When `cardstyle` is a
 * defined property-set, its constituent properties replace the `propset:`
 * marker on the consuming element.
 *
 * Recursion: a property-set may reference other property-sets in its body
 * (`b: $a, bg #f00`). Expansion is depth-first with a visited-stack so
 * cycles terminate cleanly. Direct self-references and N-cycles produce
 * the empty expansion at the cycle point — the surrounding properties
 * still apply.
 *
 * Unresolved propset refs:
 *   - On a content-bearing primitive (Text/Button/Label/Link/H1–H6) the
 *     reference is rewritten to a `content` property, preserving the
 *     bare-form variable substitution `Text $name`. The runtime data-
 *     binder picks up the `$name` and fills the textContent at mount.
 *   - On any other primitive (Frame, Section, Article, …) the reference
 *     is dropped silently. The validator surfaces W500 in the same pass,
 *     so the compiler stays fail-soft. Without this gate, Frame would
 *     receive innerHTML — the wrong DSL semantics for a layout container.
 *
 * Also handles component references as style mixins:
 *   Syntax: Input placeholder "...", InputField
 *   If 'InputField' is a component, its top-level properties spread into
 *   the instance. Component-mixin expansion is one-level by design — the
 *   component remains a structural unit, not a transitive style bag.
 */

import type { Property, ComponentDefinition } from '../../parser/ast'

/**
 * Primitives that carry text content as their first-class slot. For these,
 * an unresolved `Text $name`-style reference is rewritten to `content` so
 * the runtime data-binder can fill the textContent.
 */
const CONTENT_BEARING_PRIMITIVES = new Set([
  'text',
  'button',
  'label',
  'link',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
])

/**
 * Expand property-sets and component style-mixins in a list of properties.
 *
 * @param properties      Array of properties to expand
 * @param propertySetMap  Map of property-set names to their constituent properties
 * @param componentMap    Optional map of component names to their definitions (for style mixins)
 * @param primitive       Lower-case primitive name of the consuming element. Gates
 *                        the unresolved-ref content-fallback (Text/Button/… get
 *                        the rewrite; Frame/… drop silently).
 * @param visited         Internal — set of property-set names currently being expanded;
 *                        used for cycle detection during recursion. Callers should
 *                        omit it.
 */
export function expandPropertySets(
  properties: Property[],
  propertySetMap: Map<string, Property[]>,
  componentMap?: Map<string, ComponentDefinition>,
  primitive?: string,
  visited: Set<string> = new Set()
): Property[] {
  const expanded: Property[] = []
  const isContentBearing = !!primitive && CONTENT_BEARING_PRIMITIVES.has(primitive.toLowerCase())

  for (const prop of properties) {
    // Property-set reference: `Frame $cardstyle` parsed as
    // `propset:{kind:'token', name:'cardstyle'}`.
    if (prop.name === 'propset' && prop.values.length === 1) {
      const val = prop.values[0]
      if (typeof val === 'object' && val !== null && 'kind' in val && val.kind === 'token') {
        const tokenName = (val as { kind: 'token'; name: string }).name

        // Cycle break — already on the expansion stack. Skip silently;
        // the surrounding properties continue to apply.
        if (visited.has(tokenName)) continue

        const propertySet = propertySetMap.get(tokenName)
        if (propertySet) {
          // Recurse: the set's body may itself reference other sets.
          // Push the current name onto the stack, expand, pop.
          visited.add(tokenName)
          const inner = expandPropertySets(
            propertySet,
            propertySetMap,
            componentMap,
            primitive,
            visited
          )
          visited.delete(tokenName)
          expanded.push(...inner)
          continue
        }

        // Unresolved reference. Two paths:
        //   - Content-bearing primitive → rewrite as `content` so the
        //     runtime substitutes the variable at mount (`Text $name`
        //     bare-form, Bug #22).
        //   - Other primitive (Frame, Section, …) → drop silently;
        //     validator W500 surfaces the missing token in the same pass.
        if (isContentBearing) {
          expanded.push({
            ...prop,
            name: 'content',
            values: [`$${tokenName}`],
          })
        }
        continue
      }
    }

    // Component reference used as a style-mixin: `Input placeholder "x", Field`.
    // A property with a PascalCase name and zero values that matches a known
    // component. One-level expansion only — components are structural units,
    // not transitive style bags.
    if (componentMap && prop.values.length === 0) {
      const name = prop.name
      if (
        name.length > 0 &&
        name[0] === name[0].toUpperCase() &&
        name[0] !== name[0].toLowerCase()
      ) {
        const component = componentMap.get(name)
        if (component && component.properties.length > 0) {
          expanded.push(...component.properties)
          continue
        }
      }
    }

    // Regular property — keep as-is.
    expanded.push(prop)
  }

  return expanded
}
