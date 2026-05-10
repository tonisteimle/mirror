/**
 * React backend — Attributes cluster (Slice 3 of react-backend-decomp).
 *
 * Translates Mirror properties into JSX attribute strings:
 *
 *   generateMirrorAttributes   — emit `data-component`/`data-mirror-name`/
 *                                `data-state` (Mirror introspection attrs)
 *   generateHtmlAttributes     — pass-through props that map to HTML
 *                                attrs (`placeholder`, `href`, `type`,
 *                                `min`/`max`/`step`, …). Resolves
 *                                `$name` interpolations and computed
 *                                expressions through the text-cluster
 *                                emitters.
 *   generateBindAttribute      — `Input bind <token>` → `defaultValue=
 *                                {tokens["<token>"]} data-bind="<token>"`,
 *                                or `defaultChecked` for checkbox/radio.
 *   dataAttributesToJSObject   — convert parsed YAML/data blocks to a JS
 *                                object literal string for the `tokens`
 *                                emit.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type {
  Instance,
  Property,
  TokenDefinition,
  ComputedExpression,
  LoopVarReference,
  DataAttribute,
} from '../../../parser/ast'
import { expressionPartsToJS, interpolateStringForJSX } from './text'

/**
 * Set of property names that map directly to HTML attributes in JSX
 * (and the corresponding JSX prop names — React uses some camelCase
 * variants like className, htmlFor — but for these we map 1:1).
 */
const HTML_ATTR_PROPS: Record<string, string> = {
  placeholder: 'placeholder',
  type: 'type',
  href: 'href',
  src: 'src',
  alt: 'alt',
  name: 'name',
  value: 'defaultValue', // React uses defaultValue for uncontrolled inputs
  disabled: 'disabled',
  checked: 'defaultChecked',
  readonly: 'readOnly',
  // Numeric input attributes — `Input type number, min 0, max 100, step 5`
  // dropped these silently from React output before. DOM emits them as
  // setAttribute calls; React just needs them in HTML_ATTR_PROPS so
  // generateHtmlAttributes picks them up.
  min: 'min',
  max: 'max',
  step: 'step',
  // Input mask — DOM applies a runtime mask handler; React has no
  // runtime so we surface as `data-mask` so a future runtime layer
  // can read it without re-parsing. Same shape as `data-bind`.
  mask: 'data-mask',
}

/**
 * Emit the Mirror data-* attributes the DOM backend writes via `dataset.*`:
 *
 *   - `data-component` — original component name (`Frame`, `Btn`, …). Lets
 *     studio tooling and the property-panel resolve user components.
 *   - `data-mirror-name` — instance name (`Frame name MyFrame`) when set,
 *     otherwise the component name. Used by `setState`/cross-element refs.
 *   - `data-state` — initial state (`Btn "X", on` → `data-state="on"`).
 *
 * `data-mirror-id` is omitted for now — React doesn't have stable per-render
 * ids without `useId()`, and the DOM backend's id (`node-1`) is generated
 * per emit. Adding it requires the same useRef plumbing as the element-
 * registry (Phase B.4); skip until then.
 */
export function generateMirrorAttributes(instance: Instance): string {
  const attrs: string[] = []
  attrs.push(`data-component=${JSON.stringify(instance.component)}`)
  const finalName = instance.name ?? instance.component
  attrs.push(`data-mirror-name=${JSON.stringify(finalName)}`)
  if (instance.initialState) {
    attrs.push(`data-state=${JSON.stringify(instance.initialState)}`)
  }
  return ' ' + attrs.join(' ')
}

export function generateHtmlAttributes(
  properties: Property[],
  tokens: TokenDefinition[] = [],
  loopVars: ReadonlySet<string> | undefined = undefined
): string {
  const attrs: string[] = []
  for (const prop of properties) {
    const jsxName = HTML_ATTR_PROPS[prop.name]
    if (!jsxName) continue
    if (prop.values.length === 0) {
      // Standalone flag — boolean attribute (e.g. `disabled`)
      attrs.push(jsxName)
      continue
    }
    const v = prop.values[0]
    if (typeof v === 'boolean') {
      if (v) attrs.push(jsxName)
    } else if (typeof v === 'string' || typeof v === 'number') {
      // Mirror string attributes can carry `$name` interpolations
      // (`href "/items/$id"`). Resolve to a JSX expression so the
      // output isn't a literal `"$id"`.
      if (typeof v === 'string' && v.includes('$')) {
        const interp = interpolateStringForJSX(v, tokens, loopVars)
        // interpolateStringForJSX returns either `{...}` or a quoted
        // string. Strip outer braces for direct attribute use.
        const code = interp.startsWith('{') ? interp.slice(1, -1) : interp
        attrs.push(`${jsxName}={${code}}`)
      } else {
        attrs.push(`${jsxName}=${JSON.stringify(String(v))}`)
      }
    } else if (v && typeof v === 'object' && 'kind' in v) {
      // Computed expression on an HTML attribute (`href "/items/" + id`,
      // `placeholder "Hi " + name`). Pre-2026-05-10 the React backend
      // dropped these silently because the attribute emitter only
      // accepted string/number/boolean. Emit a JSX expression so the
      // attribute reflects the runtime value.
      const kind = (v as { kind: string }).kind
      if (kind === 'expression') {
        const code = expressionPartsToJS(v as ComputedExpression, tokens, loopVars)
        attrs.push(`${jsxName}={${code}}`)
      } else if (kind === 'loopVar') {
        const ref = v as LoopVarReference
        const head = ref.name.includes('.') ? ref.name.slice(0, ref.name.indexOf('.')) : ref.name
        const isLoopScoped = loopVars?.has(head) ?? false
        attrs.push(
          isLoopScoped
            ? `${jsxName}={${ref.name}}`
            : `${jsxName}={tokens[${JSON.stringify(head)}]${ref.name.slice(head.length).replace(/\./g, '?.')}}`
        )
      }
    }
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

/**
 * `Input bind name` lives on the AST as `instance.bind` rather than as
 * a property (the parser stores it directly). Emit `defaultValue` from
 * the matching token so the initial data lands in the input, plus the
 * `data-bind` attribute that the DOM backend uses for two-way wiring —
 * any future React runtime can read it the same way. `Input bind X` on
 * a checkbox-type input maps to `defaultChecked` instead.
 */
export function generateBindAttribute(instance: Instance, allProps: Property[]): string {
  const bind = (instance as Instance & { bind?: string }).bind
  if (!bind) return ''
  // Detect checkbox/radio so we use `defaultChecked` instead of `defaultValue`.
  const typeProp = allProps.find(p => p.name === 'type')
  const typeVal = typeProp?.values[0]
  const isBooleanInput = typeVal === 'checkbox' || typeVal === 'radio'
  const valueAttr = isBooleanInput ? 'defaultChecked' : 'defaultValue'
  // Drop the leading `$` if the parser preserved it (it shouldn't, but be safe).
  const tokenKey = bind.startsWith('$') ? bind.slice(1) : bind
  return ` ${valueAttr}={tokens[${JSON.stringify(tokenKey)}]} data-bind=${JSON.stringify(tokenKey)}`
}

/**
 * Convert a parsed data block (`tasks:\n  t1:\n    title: "A"`) to a JS
 * object literal string. Used by the React tokens emit so `each task in
 * $tasks` can iterate `Object.values(tokens.tasks)` at render time.
 */
export function dataAttributesToJSObject(attrs: DataAttribute[]): string {
  if (attrs.length === 0) return '{}'
  const entries = attrs.map(attr => {
    const key = JSON.stringify(attr.key)
    if (attr.children && attr.children.length > 0) {
      return `${key}: ${dataAttributesToJSObject(attr.children)}`
    }
    return `${key}: ${JSON.stringify(attr.value ?? null)}`
  })
  return `{ ${entries.join(', ')} }`
}
