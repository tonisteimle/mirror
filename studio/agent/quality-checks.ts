/**
 * Quality-Checks für Mirror-Code.
 *
 * Operationalisiert die User-Definition von "guter Code":
 *   - korrekt
 *   - token-basiert
 *   - konsequent component-basiert
 *   - redundanz-frei
 *
 * Pure-Funktionen, keine Side-Effects. Eingabe ist immer der Mirror-
 * Source plus optional ein Project-Kontext (Tokens / Components aus
 * anderen Files). Ausgabe sind strukturierte Violations.
 */

import { parse } from '../../compiler/parser/parser'
import type {
  ComponentDefinition,
  Instance,
  Property,
  Slot,
  ZagNode,
  Each,
  ConditionalNode,
  TokenDefinition,
} from '../../compiler/parser/ast'

// =============================================================================
// TOKEN-CHECK
// =============================================================================

export interface TokenViolation {
  line: number
  elementName: string
  propertyName: string
  hardcodedValue: string
  suggestedToken: string // e.g. "$primary"
  reason: 'hardcoded-equals-token' | 'hardcoded-near-token'
}

export interface TokenCheckResult {
  pass: boolean
  violations: TokenViolation[]
  /** Pretty diagnostic for logs. */
  summary: string
}

/**
 * Property-name → Token-suffix mapping.
 *
 * Mirror's token system uses suffixes to disambiguate context:
 *   primary.bg: #2271C1   →  used as  bg $primary
 *   primary.col: white    →  used as  col $primary
 *
 * This is the inverse mapping: given a property `bg`, what token
 * suffixes are eligible matches? In the simple case it's just `.bg`,
 * but some properties accept multiple (e.g. `pad-x` could be served
 * by a `.pad` or `.px` token).
 *
 * Source: CLAUDE.md "Tokens" section + studio/panels/components.
 */
const PROPERTY_TO_TOKEN_SUFFIXES: Record<string, string[]> = {
  bg: ['bg'],
  background: ['bg'],
  col: ['col'],
  c: ['col'],
  color: ['col'],
  boc: ['boc'],
  ic: ['ic', 'col'], // icon color falls back on .col
  pad: ['pad'],
  p: ['pad'],
  padding: ['pad'],
  'pad-x': ['pad', 'px'],
  px: ['pad', 'px'],
  'pad-y': ['pad', 'py'],
  py: ['pad', 'py'],
  'pad-t': ['pad', 'pt'],
  pt: ['pad', 'pt'],
  'pad-r': ['pad', 'pr'],
  pr: ['pad', 'pr'],
  'pad-b': ['pad', 'pb'],
  pb: ['pad', 'pb'],
  'pad-l': ['pad', 'pl'],
  pl: ['pad', 'pl'],
  mar: ['mar'],
  m: ['mar'],
  margin: ['mar'],
  gap: ['gap'],
  g: ['gap'],
  rad: ['rad'],
  radius: ['rad'],
  bor: ['bor'],
  border: ['bor'],
  fs: ['fs'],
  'font-size': ['fs'],
  is: ['is', 'fs'], // icon-size falls back on .fs
  iw: ['iw'],
  w: ['w', 'size'],
  width: ['w', 'size'],
  h: ['h', 'size'],
  height: ['h', 'size'],
  size: ['size', 'w', 'h'],
  font: ['font'],
  line: ['line'],
}

/**
 * Build a lookup table from token-suffix to (token-base-name, value).
 *
 * Tokens look like `primary.bg: #2271C1` — base="primary", suffix="bg".
 * Property-sets without suffix (e.g. `cardstyle: pad 16, ...`) are
 * skipped here — they're a different feature (component-like).
 */
interface AvailableToken {
  baseName: string // "primary"
  fullName: string // "primary.bg"
  suffix: string // "bg"
  value: string // "#2271C1"
}

function collectAvailableTokens(
  sourceTokens: TokenDefinition[],
  projectTokenFiles: Record<string, string>
): AvailableToken[] {
  const all: AvailableToken[] = []

  // Tokens defined in the current source file
  for (const t of sourceTokens) {
    if (t.value === undefined) continue // property-set or data-object
    const dot = t.name.indexOf('.')
    if (dot < 0) continue // no suffix → property-set, skip
    all.push({
      baseName: t.name.slice(0, dot),
      fullName: t.name,
      suffix: t.name.slice(dot + 1),
      value: String(t.value),
    })
  }

  // Tokens from other project files
  for (const [, content] of Object.entries(projectTokenFiles)) {
    const ast = parse(content)
    for (const t of ast.tokens) {
      if (t.value === undefined) continue
      const dot = t.name.indexOf('.')
      if (dot < 0) continue
      all.push({
        baseName: t.name.slice(0, dot),
        fullName: t.name,
        suffix: t.name.slice(dot + 1),
        value: String(t.value),
      })
    }
  }

  return all
}

/**
 * Walk every Instance node (and children) and yield each Property
 * with its parent element name. Skips Token / Component definitions
 * (which are inherently "hardcoded values" — they're the source of
 * truth, not consumers).
 */
type AnyChild = Instance | Slot | ZagNode | Each | ConditionalNode

function* walkInstances(
  nodes: AnyChild[]
): Generator<{ elementName: string; properties: Property[]; line: number }> {
  for (const node of nodes) {
    if (node.type === 'Instance') {
      const inst = node as Instance
      // Skip component definitions (those are mixin sources, not consumers).
      if (!inst.isDefinition) {
        yield {
          elementName: inst.component,
          properties: inst.properties,
          line: inst.line,
        }
      }
      if (inst.children && inst.children.length > 0) {
        yield* walkInstances(inst.children as AnyChild[])
      }
    } else if (node.type === 'Each') {
      const each = node as Each
      if (each.children) yield* walkInstances(each.children as AnyChild[])
    } else if (node.type === 'Conditional') {
      const cond = node as ConditionalNode
      if (cond.then) yield* walkInstances(cond.then as AnyChild[])
      if (cond.else) yield* walkInstances(cond.else as AnyChild[])
    }
    // Slot / ZagComponent: deeper handling deferred — for token-check, the
    // properties inside Zag-nodes also have hardcoded values worth checking,
    // but their structure differs. Not a blocker for the first pass.
  }
}

/**
 * Find tokens that match a given property+value pair.
 *
 * Returns up to N candidates ordered by suffix-specificity (exact-suffix
 * matches before fallbacks).
 */
function findMatchingTokens(
  propertyName: string,
  rawValue: string,
  available: AvailableToken[]
): AvailableToken[] {
  const eligibleSuffixes = PROPERTY_TO_TOKEN_SUFFIXES[propertyName.toLowerCase()] ?? [
    propertyName.toLowerCase(),
  ]

  const matches: AvailableToken[] = []
  // First pass: exact-value match.
  for (const tok of available) {
    if (!eligibleSuffixes.includes(tok.suffix)) continue
    if (tok.value === rawValue) matches.push(tok)
  }
  return matches
}

/**
 * Heuristic: is a value "hardcoded enough" to be considered for
 * token-substitution? We skip:
 *   - $-references (already a token)
 *   - obvious keyword values like "full", "hug", "auto", "bold",
 *     "spread", which are not values you'd tokenize anyway
 *   - empty / missing
 */
function isHardcodedValue(v: unknown): v is string | number {
  if (typeof v === 'number') return true
  if (typeof v !== 'string') return false
  if (v.length === 0) return false
  // Already a token / loop var / computed → not hardcoded.
  if (typeof v === 'object') return false
  return true
}

function isObviousKeyword(v: string): boolean {
  // Common keyword values that aren't candidates for tokenization.
  const KEYWORDS = new Set([
    'full',
    'hug',
    'auto',
    'true',
    'false',
    'bold',
    'medium',
    'normal',
    'light',
    'thin',
    'semibold',
    'black',
    'italic',
    'uppercase',
    'lowercase',
    'underline',
    'truncate',
    'sans',
    'serif',
    'mono',
    'transparent',
    'inherit',
    'pointer',
    'grab',
    'move',
    'text',
    'wait',
    'not-allowed',
    'sm',
    'md',
    'lg',
    'square',
    'video',
  ])
  return KEYWORDS.has(v.toLowerCase())
}

export function checkTokenCompliance(
  source: string,
  projectTokenFiles: Record<string, string> = {}
): TokenCheckResult {
  const ast = parse(source)
  const available = collectAvailableTokens(ast.tokens, projectTokenFiles)

  const violations: TokenViolation[] = []

  if (available.length === 0) {
    return {
      pass: true,
      violations: [],
      summary: 'no tokens available — check skipped',
    }
  }

  for (const { elementName, properties, line } of walkInstances(ast.instances as AnyChild[])) {
    for (const prop of properties) {
      for (const value of prop.values) {
        // Skip non-hardcoded values: token refs, loop vars, conditionals,
        // computed expressions.
        if (typeof value === 'object' && value !== null) continue
        if (!isHardcodedValue(value)) continue
        const sv = String(value)
        if (sv.startsWith('$')) continue // safety net — shouldn't happen post-parse
        if (isObviousKeyword(sv)) continue

        const matches = findMatchingTokens(prop.name, sv, available)
        if (matches.length > 0) {
          // Pick the first match (most specific suffix).
          const tok = matches[0]
          violations.push({
            line: prop.line || line,
            elementName,
            propertyName: prop.name,
            hardcodedValue: sv,
            suggestedToken: `$${tok.baseName}`,
            reason: 'hardcoded-equals-token',
          })
        }
      }
    }
  }

  const summary =
    violations.length === 0
      ? `clean: ${available.length} tokens available, 0 hardcoded duplicates`
      : `${violations.length} violation(s): ${violations
          .map(
            v =>
              `L${v.line} ${v.elementName} ${v.propertyName}=${v.hardcodedValue} → ${v.suggestedToken}`
          )
          .join('; ')}`

  return {
    pass: violations.length === 0,
    violations,
    summary,
  }
}

// =============================================================================
// COMPONENT-CHECK
// =============================================================================

export interface ComponentViolation {
  line: number
  /** Element-Type as written in source (e.g. "Button"). */
  inlineElementType: string
  /** Component that should have been used (e.g. "PrimaryBtn"). */
  suggestedComponent: string
  /** Properties that match — used for explanation. */
  matchedProperties: string[]
  /** Properties on the inline element that go BEYOND the component def. */
  extraProperties: string[]
}

export interface ComponentCheckResult {
  pass: boolean
  violations: ComponentViolation[]
  summary: string
}

interface AvailableComponent {
  name: string
  /**
   * Mirror's parser stores BOTH "real primitive" (Frame/Button/...) and
   * "parent component name" in the `primitive` field — there's no separate
   * `extends`. So `Btn:` → primitive="Frame", `PrimaryBtn as Btn:` →
   * primitive="Btn" (which is itself a component). To walk up the chain,
   * we follow `primitive` until we hit a name that's not in the
   * available-components list.
   */
  primitive: string | null
  properties: Map<string, string>
}

/**
 * Normalise a Property's values into a stable string for comparison.
 *
 * Handles:
 *   - primitives (string/number/bool) → toString
 *   - TokenReference → "$name"
 *   - other compound (Conditional/ComputedExpression/LoopVar) → JSON
 */
function normaliseValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  // TokenReference: { kind: 'token', name: 'primary' }
  if (typeof v === 'object' && (v as { kind?: string }).kind === 'token') {
    return `$${(v as { name: string }).name}`
  }
  // LoopVar: { kind: 'loopVar', name: '...' }
  if (typeof v === 'object' && (v as { kind?: string }).kind === 'loopVar') {
    return `loopVar:${(v as { name: string }).name}`
  }
  return JSON.stringify(v)
}

function propertiesToMap(props: Property[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const p of props) {
    const joined = p.values.map(normaliseValue).join(' ')
    m.set(p.name, joined)
  }
  return m
}

function collectAvailableComponents(
  sourceComponents: ComponentDefinition[],
  projectComponentFiles: Record<string, string>
): AvailableComponent[] {
  const all: AvailableComponent[] = []

  for (const c of sourceComponents) {
    all.push({
      name: c.name,
      primitive: c.primitive,
      properties: propertiesToMap(c.properties),
    })
  }

  for (const [, content] of Object.entries(projectComponentFiles)) {
    const ast = parse(content)
    for (const c of ast.components) {
      all.push({
        name: c.name,
        primitive: c.primitive,
        properties: propertiesToMap(c.properties),
      })
    }
  }

  return all
}

/**
 * Resolve the effective primitive for a component, following the chain
 * of `primitive`-references through other components until we hit a real
 * primitive name (not in the components list) or run out of hops.
 *
 * `Btn:` → primitive="Frame" → "Frame" not a component → return "Frame".
 * `PrimaryBtn as Btn:` → primitive="Btn" → Btn IS a component → recurse
 *   on Btn → "Frame".
 */
function effectivePrimitive(
  comp: AvailableComponent,
  all: AvailableComponent[],
  depth = 0
): string | null {
  if (!comp.primitive) return null
  const parent = all.find(c => c.name === comp.primitive)
  if (parent && depth < 5) return effectivePrimitive(parent, all, depth + 1)
  return comp.primitive
}

/**
 * Merge inherited properties up the `primitive`-chain (when primitive is
 * itself a component). Own props override inherited.
 */
function effectiveProperties(
  comp: AvailableComponent,
  all: AvailableComponent[],
  depth = 0
): Map<string, string> {
  const merged = new Map<string, string>()
  if (comp.primitive && depth < 5) {
    const parent = all.find(c => c.name === comp.primitive)
    if (parent) {
      for (const [k, v] of effectiveProperties(parent, all, depth + 1)) merged.set(k, v)
    }
  }
  for (const [k, v] of comp.properties) merged.set(k, v)
  return merged
}

/**
 * Check whether an inline element with `inlineType` and `inlineProps`
 * could have used `comp` instead.
 *
 * Match conditions (all required):
 *   1. inlineType matches the component's effective primitive (or the
 *      component name itself, in case the user wrote one component
 *      where another is more specific — but skip self-match).
 *   2. ALL of comp's effective properties are present in inlineProps
 *      with matching normalised values.
 *
 * Returns null if no match, otherwise the matched property names.
 */
function matchComponent(
  inlineType: string,
  inlineProps: Map<string, string>,
  comp: AvailableComponent,
  all: AvailableComponent[]
): { matched: string[]; extra: string[] } | null {
  // Don't flag an instance that already uses the component itself.
  if (inlineType === comp.name) return null

  const compPrim = effectivePrimitive(comp, all)
  // Element type must be the underlying primitive (or potentially an
  // ancestor component we extend through). Simplest sound rule: must be
  // the primitive. We don't yet support "user wrote PrimaryBtn but
  // SuperPrimaryBtn extends PrimaryBtn" — that's a downgrade case, not
  // a missed-component case.
  if (compPrim !== inlineType) return null

  const compProps = effectiveProperties(comp, all)
  if (compProps.size === 0) return null // empty component matches anything; skip

  const matched: string[] = []
  for (const [k, v] of compProps) {
    const ev = inlineProps.get(k)
    if (ev === undefined) return null // inline missing a required prop
    if (ev !== v) return null // value mismatch
    matched.push(k)
  }
  const extra: string[] = []
  for (const k of inlineProps.keys()) if (!compProps.has(k)) extra.push(k)
  return { matched, extra }
}

export function checkComponentCompliance(
  source: string,
  projectComponentFiles: Record<string, string> = {}
): ComponentCheckResult {
  const ast = parse(source)
  const available = collectAvailableComponents(ast.components, projectComponentFiles)

  const violations: ComponentViolation[] = []

  if (available.length === 0) {
    return {
      pass: true,
      violations: [],
      summary: 'no components available — check skipped',
    }
  }

  for (const { elementName, properties, line } of walkInstances(ast.instances as AnyChild[])) {
    if (properties.length === 0) continue
    const inlineProps = propertiesToMap(properties)

    // Find the most specific matching component (= largest matched-set).
    let bestMatch: { comp: AvailableComponent; matched: string[]; extra: string[] } | null = null
    for (const comp of available) {
      const m = matchComponent(elementName, inlineProps, comp, available)
      if (!m) continue
      if (!bestMatch || m.matched.length > bestMatch.matched.length) {
        bestMatch = { comp, ...m }
      }
    }

    if (bestMatch) {
      violations.push({
        line,
        inlineElementType: elementName,
        suggestedComponent: bestMatch.comp.name,
        matchedProperties: bestMatch.matched,
        extraProperties: bestMatch.extra,
      })
    }
  }

  const summary =
    violations.length === 0
      ? `clean: ${available.length} component(s) available, 0 inline duplicates`
      : `${violations.length} violation(s): ${violations
          .map(
            v =>
              `L${v.line} ${v.inlineElementType}(${v.matchedProperties.join(',')}) → ${v.suggestedComponent}`
          )
          .join('; ')}`

  return {
    pass: violations.length === 0,
    violations,
    summary,
  }
}

// =============================================================================
// REDUNDANCY-CHECK
// =============================================================================

export type RedundancyKind =
  | 'duplicate-property' // same property name twice on one element
  | 'redundant-wrapper' // Frame with no properties + exactly one child
  | 'inherited-redundant' // re-specifies a value that canvas already inherits

export interface RedundancyViolation {
  line: number
  kind: RedundancyKind
  elementName: string
  detail: string
}

export interface RedundancyCheckResult {
  pass: boolean
  violations: RedundancyViolation[]
  summary: string
}

/**
 * Properties that the canvas inherits to all descendants. Source: CLAUDE.md
 * "Canvas (App-Basis)" — these are the documented inheritable ones.
 */
const CANVAS_INHERITABLE = new Set(['col', 'font', 'fs', 'color'])

function collectCanvasInherited(
  canvas: { properties: Property[] } | undefined
): Map<string, string> {
  const m = new Map<string, string>()
  if (!canvas) return m
  for (const p of canvas.properties) {
    if (CANVAS_INHERITABLE.has(p.name.toLowerCase())) {
      // Normalise the property name (col vs color → "col") so we can
      // compare against descendants regardless of which alias they used.
      const key = p.name.toLowerCase() === 'color' ? 'col' : p.name.toLowerCase()
      const val = p.values.map(v => normaliseValue(v)).join(' ')
      m.set(key, val)
    }
  }
  return m
}

/**
 * Same walker as walkInstances but yields the Instance node itself so
 * the redundancy-check can inspect `children`.
 */
function* walkInstancesFull(nodes: AnyChild[]): Generator<Instance> {
  for (const node of nodes) {
    if (node.type === 'Instance') {
      const inst = node as Instance
      if (!inst.isDefinition) yield inst
      if (inst.children && inst.children.length > 0) {
        yield* walkInstancesFull(inst.children as AnyChild[])
      }
    } else if (node.type === 'Each') {
      const each = node as Each
      if (each.children) yield* walkInstancesFull(each.children as AnyChild[])
    } else if (node.type === 'Conditional') {
      const cond = node as ConditionalNode
      if (cond.then) yield* walkInstancesFull(cond.then as AnyChild[])
      if (cond.else) yield* walkInstancesFull(cond.else as AnyChild[])
    }
  }
}

export function checkRedundancyCompliance(source: string): RedundancyCheckResult {
  const ast = parse(source)
  const violations: RedundancyViolation[] = []

  const inherited = collectCanvasInherited(ast.canvas)

  for (const inst of walkInstancesFull(ast.instances as AnyChild[])) {
    // ─── Klasse A: duplicate-property ─────────────────────────────────
    const seen = new Map<string, number>()
    for (const p of inst.properties) {
      const key = p.name.toLowerCase()
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    for (const [key, count] of seen) {
      if (count > 1) {
        // Skip "content" — it's the synthetic property holding inline
        // text like "Hello" for Text/Button. Won't be duplicated by user
        // intent.
        if (key === 'content') continue
        violations.push({
          line: inst.line,
          kind: 'duplicate-property',
          elementName: inst.component,
          detail: `${key} appears ${count}× on this element`,
        })
      }
    }

    // ─── Klasse B: redundant-wrapper ──────────────────────────────────
    // A Frame (or any container primitive) with NO properties (other
    // than synthetic content) and EXACTLY ONE child has no purpose.
    const propsForLayout = inst.properties.filter(p => p.name !== 'content')
    const hasName = inst.name !== null && inst.name !== undefined
    const childCount = inst.children?.length ?? 0
    if (
      inst.component === 'Frame' &&
      !hasName &&
      propsForLayout.length === 0 &&
      childCount === 1 &&
      !inst.isDefinition
    ) {
      violations.push({
        line: inst.line,
        kind: 'redundant-wrapper',
        elementName: inst.component,
        detail: 'Frame with no properties wrapping a single child — drop the wrapper',
      })
    }

    // ─── Klasse C: inherited-redundant ────────────────────────────────
    // If canvas sets `col white` and a descendant explicitly writes
    // `col white`, that's redundant. Conservative: only flag exact
    // value-match against canvas. If parent Frame has overridden, we
    // don't track that — would require state propagation. Phase 1 ok.
    if (inherited.size > 0) {
      for (const p of inst.properties) {
        const key = p.name.toLowerCase() === 'color' ? 'col' : p.name.toLowerCase()
        if (!CANVAS_INHERITABLE.has(p.name.toLowerCase())) continue
        const inheritedVal = inherited.get(key)
        if (inheritedVal === undefined) continue
        const val = p.values.map(v => normaliseValue(v)).join(' ')
        if (val === inheritedVal) {
          violations.push({
            line: p.line || inst.line,
            kind: 'inherited-redundant',
            elementName: inst.component,
            detail: `${p.name} ${val} is already inherited from canvas`,
          })
        }
      }
    }
  }

  const summary =
    violations.length === 0
      ? 'clean: no redundancy detected'
      : `${violations.length} violation(s): ${violations
          .map(v => `L${v.line} ${v.elementName}/${v.kind}: ${v.detail}`)
          .join('; ')}`

  return {
    pass: violations.length === 0,
    violations,
    summary,
  }
}
