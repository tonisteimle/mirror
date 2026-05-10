/**
 * AST-based token parser — equivalent to `parseTokens` in `./types.ts` but
 * built on top of the canonical compiler parser instead of a regex pass.
 *
 * **Migration target.** The regex parser in `parseTokens` has subtle
 * behaviour around inline-comment stripping, single-segment-set
 * rejection, and chain resolution. Reproducing those in a fresh function
 * lets us run an equivalence test against the existing characterization
 * suite (slice-78-token-picker.test.ts RT-1..RT-4) before we cut over.
 *
 * Tracked in docs/findings.md ("Studio dupliziert Compiler-Pfade" /
 * `parseTokens` migration).
 *
 * Mapping rules (compiler `TokenDefinition` → studio `TokenDefinition`):
 *
 *   - **Name:** prepend `$`. Compiler stores `primary.bg`; studio uses
 *     `$primary.bg` so the picker's `name` matches the source-text
 *     `$ref` syntax.
 *   - **Property-sets:** if the compiler node has `properties`, set
 *     `kind: 'set'` and serialise each Property to a SetProperty
 *     `{ name, value }`. Multi-value properties (`pad 10 20`) join
 *     with single spaces.
 *   - **Single-value:** otherwise `kind: 'single'`, `value` is the
 *     compiler's `value` field stringified.
 *   - **Type inference:** uses the same heuristic as the regex parser
 *     (suffix wins over value heuristic; hex → color, digits → size,
 *     spacing-ish suffix → spacing). The compiler's `tokenType`
 *     field uses a narrower union (`color | size | font | icon`) and
 *     never says `spacing`, so we re-infer from the suffix at this
 *     mapping layer.
 *   - **Chain resolution:** post-pass identical to the regex parser —
 *     follow `$ref` values up to 8 hops, with suffix-aware fallback
 *     (`accent.bg: $primary` → look up `$primary` first, then
 *     `$primary.bg`).
 *
 * Excluded for now (would diverge from the regex parser): data-object
 * tokens (`tasks: ...`) and section-header grouping. Both are
 * compiler-only concepts the regex parser ignores; keeping parity here
 * means the equivalence test stays meaningful.
 */

import { parse } from '../../../compiler/parser'
import type { TokenDefinition as ASTTokenDefinition, Property } from '../../../compiler/parser/ast'
import type { SetProperty, TokenDefinition, TokenType } from './types'

/** Stringify a single Property value — handles compiler's primitive +
 *  TokenReference variants. Loop-var refs and conditionals don't show
 *  up inside token bodies and are stringified as JSON for visibility. */
function stringifyValue(v: Property['values'][number]): string {
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  if (v && typeof v === 'object' && 'kind' in v) {
    const kind = (v as { kind?: string }).kind
    if (kind === 'token') return '$' + (v as { name: string }).name
    if (kind === 'loopVar') return (v as { name: string }).name
  }
  return JSON.stringify(v)
}

/** Convert a compiler Property to a SetProperty for the picker UI.
 *  The `propset` synthetic property the parser emits for `$ref`
 *  references inside a set body is mapped back to a `$name` segment
 *  (matches what the source file looks like). */
function toSetProperty(p: Property): SetProperty {
  if (p.name === 'propset' && p.values.length === 1) {
    const v = p.values[0]
    if (v && typeof v === 'object' && 'kind' in v && (v as { kind?: string }).kind === 'token') {
      return { name: '$' + (v as { name: string }).name, value: '' }
    }
  }
  if (p.values.length === 0) {
    return { name: p.name, value: '' }
  }
  const value = p.values.map(stringifyValue).join(' ')
  return { name: p.name, value }
}

/** Infer the picker's TokenType for a single-value token. Matches the
 *  regex parser's heuristics so the equivalence test stays clean:
 *  prefer suffix-based classification, fall back to value-shape. */
function inferType(name: string, value: string): TokenType {
  // suffix part after the last dot, if any
  const dot = name.lastIndexOf('.')
  const suffix = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''

  if (/^(bg|col|color|fill|boc|background)$/i.test(suffix)) return 'color'
  if (/^(pad|padding|margin|mar|gap|spacing)$/i.test(suffix)) return 'spacing'
  if (/^(w|width|h|height|size|rad|radius)$/i.test(suffix)) return 'size'
  if (/^(font|fs|lh|line)$/i.test(suffix)) return 'font'

  // Suffix didn't help — try value shape.
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return 'color'
  // Chain-ref to a colour-suffixed token: `$primary.bg` → color.
  if (/^\$[\w.-]+\.(bg|col|color|boc)$/i.test(value)) return 'color'
  if (/^\d+$/.test(value)) {
    // Could be spacing or size — match the regex parser's tie-break:
    // unsuffixed numeric tokens fall under 'size'.
    return 'size'
  }
  if (/^\$[\w.-]+\.(pad|gap|margin|mar)$/i.test(value)) return 'spacing'

  return 'other'
}

/** Build a short preview-text for a property-set
 *  (`bg #1a1a1a · pad 16 · …`). Mirrors the regex parser's helper so the
 *  picker preview text is byte-identical. */
function setPreviewValue(properties: SetProperty[]): string {
  const head = properties
    .slice(0, 3)
    .map(p => (p.value ? `${p.name} ${p.value}` : p.name))
    .join(' · ')
  return properties.length > 3 ? `${head} · +${properties.length - 3} more` : head
}

/** Map one compiler token to the studio shape — single, set, or skip.
 *  Returns null for token shapes the regex parser ignores (data-object
 *  tokens with `attributes`/`blocks`). */
function mapOne(t: ASTTokenDefinition): TokenDefinition | null {
  // Data-object tokens (`tasks: ...` with nested attributes) — skip,
  // matches the regex parser which has no concept of them.
  if (t.attributes !== undefined || t.blocks !== undefined) return null

  const name = '$' + t.name
  const dot = t.name.lastIndexOf('.')
  const category = dot > 0 ? t.name.slice(0, dot) : undefined

  // Compiler parses `b: $a` as a property-set with a single synthetic
  // `propset` property pointing at `$a`. The regex parser treats this
  // as a single-value chain reference (kind: 'single', value: '$a').
  // Match that shape so chain-resolution treats it consistently.
  if (
    t.properties &&
    t.properties.length === 1 &&
    t.properties[0].name === 'propset' &&
    t.properties[0].values.length === 1
  ) {
    const v = t.properties[0].values[0]
    if (v && typeof v === 'object' && 'kind' in v && (v as { kind?: string }).kind === 'token') {
      const refName = '$' + (v as { name: string }).name
      return {
        name,
        value: refName,
        type: inferType(t.name, refName),
        kind: 'single',
        ...(category ? { category } : {}),
      }
    }
  }

  // Property-set form (real, multi-property): compiler emits `properties`.
  if (t.properties && t.properties.length > 0) {
    const setProps = t.properties.map(toSetProperty)
    return {
      name,
      value: setPreviewValue(setProps),
      type: 'other',
      kind: 'set',
      properties: setProps,
      ...(category ? { category } : {}),
    }
  }

  // Single-value form.
  if (t.value === undefined) return null
  const value = String(t.value)
  return {
    name,
    value,
    type: inferType(t.name, value),
    kind: 'single',
    ...(category ? { category } : {}),
  }
}

/** Chain-resolution post-pass. Identical to the regex parser's: follow
 *  `$ref` values up to 8 hops, with suffix-aware fallback. */
function resolveChains(tokens: TokenDefinition[]): void {
  const byName = new Map<string, TokenDefinition>()
  for (const t of tokens) byName.set(t.name, t)

  const suffixOf = (n: string): string | undefined => {
    const dot = n.lastIndexOf('.')
    return dot >= 0 ? n.slice(dot + 1) : undefined
  }

  for (const t of tokens) {
    if (t.kind !== 'single' || !t.value.startsWith('$')) continue
    const ownSuffix = suffixOf(t.name)
    let cur = t.value
    for (let hop = 0; hop < 8 && cur.startsWith('$'); hop++) {
      let next = byName.get(cur)
      if (!next && ownSuffix) {
        next = byName.get(`${cur}.${ownSuffix}`)
      }
      if (!next || next === t || next.value === cur) break
      cur = next.value
      if (!cur.startsWith('$')) {
        t.value = cur
        if (t.type === 'other' && /^#[0-9a-f]{3,8}$/i.test(cur)) t.type = 'color'
        break
      }
    }
  }
}

/**
 * Parse token definitions from source code via the compiler AST.
 * Equivalent in behaviour to `parseTokens` in `./types.ts` for the cases
 * exercised by the existing characterization tests.
 */
export function parseTokensViaAST(source: string): TokenDefinition[] {
  let ast
  try {
    ast = parse(source)
  } catch {
    // The regex parser silently skips malformed lines; mirror that here
    // by returning an empty list when the parser bails outright.
    return []
  }

  const tokens: TokenDefinition[] = []
  for (const t of ast.tokens) {
    const mapped = mapOne(t)
    if (mapped) tokens.push(mapped)
  }
  resolveChains(tokens)
  return tokens
}
