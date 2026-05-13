/**
 * Style Emitter Module
 *
 * CSS generation for Mirror DOM backend.
 * Handles tokens, animations, system states, and size states.
 */

import type { IRNode, IRStyle, IRToken } from '../../ir/types'
import { ANIMATION_KEYFRAMES_CSS } from '../animations'
import { generateTheme, isThemeToken } from '../../schema/theme-generator'
import {
  getSizeStateThresholds,
  SYSTEM_STATES as SCHEMA_SYSTEM_STATES,
} from '../../schema/parser-helpers'
import {
  needsPxUnit as needsPxUnitFromSchema,
  tokenToCSSVarName as tokenToCSSVarNameFromSchema,
  stripDollar,
  getSuffix,
} from '../../schema/token-suffixes'
import type { TokenDefinition } from '../../parser/ast'

// ============================================
// TYPES
// ============================================

export interface StyleEmitterContext {
  emit: (line: string) => void
  emitRaw: (line: string) => void
  getIndent: () => number
  setIndent: (level: number) => void
  indentIn: () => void
  indentOut: () => void
  resolveTokenValueWithContext: (
    value: string | number | boolean,
    targetName: string
  ) => string | number | boolean
  getTokenMap: () => Map<string, string | number | boolean>
  getIRTokens: () => IRToken[]
  getIRNodes: () => IRNode[]
  getASTTokens: () => TokenDefinition[]
}

// ============================================
// ANIMATION KEYFRAMES
// ============================================

/**
 * Emit animation keyframes. The keyframe set is shared across backends —
 * see `compiler/backends/animations.ts`.
 */
function emitAnimationKeyframes(ctx: StyleEmitterContext): void {
  ctx.emit('')
  ctx.emit('/* Animation Keyframes */')
  for (const keyframe of ANIMATION_KEYFRAMES_CSS) {
    ctx.emit(keyframe)
  }
}

// ============================================
// STATE HELPERS
// ============================================

/**
 * Group styles by state name
 */
function groupByState(styles: IRStyle[]): Record<string, IRStyle[]> {
  const result: Record<string, IRStyle[]> = {}
  for (const style of styles) {
    const state = style.state || 'default'
    if (!result[state]) result[state] = []
    result[state].push(style)
  }
  return result
}

/**
 * Group styles by size-state
 */
function groupBySizeState(styles: IRStyle[]): Record<string, IRStyle[]> {
  const result: Record<string, IRStyle[]> = {}
  for (const style of styles) {
    const sizeState = style.sizeState || 'default'
    if (!result[sizeState]) result[sizeState] = []
    result[sizeState].push(style)
  }
  return result
}

// ============================================
// SYSTEM STATE CSS
// ============================================

// Schema is the single source of truth (compiler/schema/dsl.ts → states with
// system: true). Hardcoding here would silently drop new system-states added
// to the schema (Slice 26 audit found exactly this drift).
const SYSTEM_STATES = SCHEMA_SYSTEM_STATES

// Selector-form per state. CSS distinguishes three concepts:
//   - pseudo-class  → `:hover`, `:focus`, `:focus-visible`, `:checked`, ...
//   - attribute     → `[disabled]` (matches the HTML attribute, not :disabled
//                     pseudo-class — gives Mirror authors symmetry with how
//                     forms handle the disabled attribute)
//   - pseudo-element → `::placeholder` (styles a sub-part of the element)
const ATTRIBUTE_STATES = new Set(['disabled'])
const PSEUDO_ELEMENT_STATES = new Set(['placeholder'])

// `:hover`, `:focus`, `:active` don't fire reliably under headless Chrome /
// jsdom, so the runtime sets `data-{state}="true"` programmatically and we
// emit a paired attribute selector. Passive states (visited, checked,
// structural) don't need this — they're either browser-history (visited),
// form-state (checked), or layout-derived (first/last/empty).
const PROGRAMMATIC_FALLBACK_STATES = new Set(['hover', 'focus', 'active'])

/**
 * Build the CSS selectors for a given system-state on a given node.
 * Returns one or two selectors (joined by `,` when emitting).
 */
function selectorsForSystemState(nodeId: string, state: string): string[] {
  const base = `[data-mirror-id="${nodeId}"]`

  if (PSEUDO_ELEMENT_STATES.has(state)) {
    return [`${base}::${state}`]
  }
  if (ATTRIBUTE_STATES.has(state)) {
    return [`${base}[${state}]`]
  }

  const primary = `${base}:${state}`
  if (PROGRAMMATIC_FALLBACK_STATES.has(state)) {
    return [primary, `${base}[data-${state}="true"]`]
  }
  return [primary]
}

/**
 * Emit CSS for a single node's system states
 */
function emitNodeStateCSS(ctx: StyleEmitterContext, node: IRNode): void {
  const stateStyles = node.styles.filter(s => s.state && SYSTEM_STATES.has(s.state))

  if (stateStyles.length > 0) {
    const byState = groupByState(stateStyles)

    for (const [state, styles] of Object.entries(byState)) {
      const selectors = selectorsForSystemState(node.id, state)
      ctx.emit('')
      for (let i = 0; i < selectors.length - 1; i++) {
        ctx.emit(`${selectors[i]},`)
      }
      ctx.emit(`${selectors[selectors.length - 1]} {`)
      ctx.indentIn()
      for (const style of styles) {
        ctx.emit(`${style.property}: ${style.value} !important;`)
      }
      ctx.indentOut()
      ctx.emit('}')
    }
  }

  emitChildrenStateCSS(ctx, node)
}

/**
 * Emit CSS for children and template nodes
 */
function emitChildrenStateCSS(ctx: StyleEmitterContext, node: IRNode): void {
  for (const child of node.children) {
    emitNodeStateCSS(ctx, child)
  }

  if (node.each?.template) {
    for (const templateNode of node.each.template) {
      emitNodeStateCSS(ctx, templateNode)
    }
  }
}

/**
 * Emit CSS for all system states
 */
function emitSystemStateCSS(ctx: StyleEmitterContext): void {
  for (const node of ctx.getIRNodes()) {
    emitNodeStateCSS(ctx, node)
  }
}

// ============================================
// SIZE STATE CSS
// ============================================

/**
 * Get resolved thresholds for a size-state
 */
function getResolvedSizeStateThresholds(
  ctx: StyleEmitterContext,
  sizeState: string
): { min?: number; max?: number } {
  const tokenMap = ctx.getTokenMap()
  const customMin = tokenMap.get(`${sizeState}.min`),
    customMax = tokenMap.get(`${sizeState}.max`)
  if (customMin !== undefined || customMax !== undefined) {
    return {
      min: customMin !== undefined ? Number(customMin) : undefined,
      max: customMax !== undefined ? Number(customMax) : undefined,
    }
  }
  return getSizeStateThresholds(sizeState) ?? {}
}

/**
 * Build a CSS container query condition
 */
function buildContainerQuery(ctx: StyleEmitterContext, sizeState: string): string | null {
  const thresholds = getResolvedSizeStateThresholds(ctx, sizeState)
  if (!thresholds.min && !thresholds.max) return null

  const parts: string[] = []
  if (thresholds.min !== undefined) {
    parts.push(`(min-width: ${thresholds.min}px)`)
  }
  if (thresholds.max !== undefined) {
    parts.push(`(max-width: ${thresholds.max}px)`)
  }

  return parts.join(' and ')
}

/**
 * Emit CSS for a single node's size states.
 *
 * KNOWN BUG: the `[data-mirror-id^="${node.id}"]` selector targets the
 * same element that owns `container-type: inline-size` (emitted by
 * `node-emitter.ts:emitContainerType`). Per CSS spec, `@container`
 * matches container-ancestors, not self — so the rule never fires.
 * Fix-Pfad steht in `docs/refactoring/container-queries.md` (Lane A:
 * synthetic outer-wrapper). React- and Framework-Backend drop
 * `sizeState` styles silently (differential-test lücke).
 */
function emitNodeSizeStateCSS(ctx: StyleEmitterContext, node: IRNode): void {
  const sizeStateStyles = node.styles.filter(s => s.sizeState)

  if (sizeStateStyles.length > 0) {
    const bySizeState = groupBySizeState(sizeStateStyles)

    for (const [sizeState, styles] of Object.entries(bySizeState)) {
      const query = buildContainerQuery(ctx, sizeState)
      if (!query) continue

      ctx.emit('')
      ctx.emit(`/* Size-state: ${sizeState} */`)
      ctx.emit(`@container ${query} {`)
      ctx.indentIn()
      ctx.emit(`[data-mirror-id^="${node.id}"] {`)
      ctx.indentIn()
      for (const style of styles) {
        ctx.emit(`${style.property}: ${style.value} !important;`)
      }
      ctx.indentOut()
      ctx.emit('}')
      ctx.indentOut()
      ctx.emit('}')
    }
  }

  emitChildrenSizeStateCSS(ctx, node)
}

/**
 * Emit CSS for children and template nodes
 */
function emitChildrenSizeStateCSS(ctx: StyleEmitterContext, node: IRNode): void {
  for (const child of node.children) {
    emitNodeSizeStateCSS(ctx, child)
  }

  if (node.each?.template) {
    for (const templateNode of node.each.template) {
      emitNodeSizeStateCSS(ctx, templateNode)
    }
  }
}

/**
 * Emit CSS for all size states
 */
function emitSizeStateCSS(ctx: StyleEmitterContext): void {
  for (const node of ctx.getIRNodes()) {
    emitNodeSizeStateCSS(ctx, node)
  }
}

// ============================================
// TOKEN CSS
// ============================================

// needsPxUnit and tokenToCSSVarName are imported from the schema (single
// source of truth for token-suffix knowledge). Kept as local aliases so the
// rest of this module reads as before.
const needsPxUnit = needsPxUnitFromSchema
const tokenToCSSVarName = tokenToCSSVarNameFromSchema

/**
 * Resolve a chain reference (`accent.bg: $primary`) to the canonical source
 * token name, so the emitter can emit `var(--source-name)`.
 *
 * Resolution rules:
 *  1. Direct match: `tokenMap.has(rawValue)` (e.g., `primary`)
 *  2. With target's suffix: `tokenMap.has(rawValue + targetSuffix)`
 *     (e.g., `primary` + `.bg` → `primary.bg`)
 *
 * Returns the canonical source name, or `null` if no match exists. Cycles
 * are tolerated by CSS itself (cascading `var()` resolution); we only need
 * to find the first hop.
 */
function resolveTokenChainName(
  rawValue: string,
  targetName: string,
  tokenMap: Map<string, string | number | boolean>
): string | null {
  if (tokenMap.has(rawValue)) return rawValue

  const targetSuffix = getSuffix(targetName)
  if (targetSuffix) {
    const withSuffix = rawValue + targetSuffix
    if (tokenMap.has(withSuffix)) return withSuffix
  }

  return null
}

/**
 * Emit custom user tokens
 */
function emitCustomTokens(ctx: StyleEmitterContext): void {
  const irTokens = ctx.getIRTokens()

  const customTokens = irTokens.filter(t => {
    if (t.value === undefined) return false
    const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
    return !isThemeToken(name)
  })

  if (customTokens.length === 0) return

  ctx.emit('/* User Tokens */')
  ctx.emit(':host, :root {')
  ctx.indentIn()

  const tokenMap = ctx.getTokenMap()

  for (const token of customTokens) {
    if (token.value === undefined) continue

    const cssVarName = tokenToCSSVarName(token.name)

    // Chain reference: `accent.bg: $primary` → emit `--accent-bg: var(--primary-bg);`
    // The CSS cascade resolves the chain at render time, preserving designer
    // intent (theme overrides at the root token propagate downstream).
    if (typeof token.value === 'string' && token.value.startsWith('$')) {
      const sourceName = resolveTokenChainName(stripDollar(token.value), token.name, tokenMap)
      if (sourceName === null) {
        // Source token not found — skip emission rather than write broken CSS
        // (literal `$name`). Validator (W500) is the user-facing diagnostic.
        continue
      }
      ctx.emit(`--${cssVarName}: var(--${tokenToCSSVarName(sourceName)});`)
      continue
    }

    let value: string | number | boolean = token.value
    if (needsPxUnit(token.name)) {
      if (typeof value === 'number') {
        value = `${value}px`
      } else if (typeof value === 'string') {
        // Single integer (`"16"`) → `"16px"`; multi-value shorthand
        // (`"10 16"` from `btn.pad: 10 16`) → `"10px 16px"`. Each numeric
        // segment gets its own unit; non-numeric segments (like CSS keywords
        // or already-suffixed values) are left alone.
        value = value
          .split(/\s+/)
          .map(part => (/^\d+(\.\d+)?$/.test(part) ? `${part}px` : part))
          .join(' ')
      }
    }

    // SECURITY: the entire CSS block is wrapped in a JS template literal
    // (`_style.textContent = \`...\``). Any `${...}` in a user-provided token
    // value would otherwise become a live JS interpolation at runtime.
    // Escape `${` to `\${` so it survives as literal CSS text.
    if (typeof value === 'string') {
      value = value.replace(/\$\{/g, '\\${')
    }

    ctx.emit(`--${cssVarName}: ${value};`)
  }

  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

/**
 * Emit theme tokens (for Zag components)
 */
function emitThemeTokens(ctx: StyleEmitterContext): void {
  const astTokens = ctx.getASTTokens()

  const hasThemeTokens = astTokens.some(t => {
    const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
    return isThemeToken(name)
  })

  if (!hasThemeTokens) return

  // Pass ALL user tokens, not just theme-tokens. Otherwise chain references
  // (e.g., `accent.bg: $primary` where `primary.bg` is a custom token)
  // can't resolve — generateTheme needs the full name-space to follow chains.
  const theme = generateTheme(astTokens)
  ctx.emitRaw(theme.css)
  ctx.emit('')
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Emit all styles (tokens, animations, states)
 */
export function emitStyles(ctx: StyleEmitterContext): void {
  ctx.emit('// Inject CSS styles')
  ctx.emit("const _style = document.createElement('style')")
  ctx.emit('_style.textContent = `')

  emitThemeTokens(ctx)
  emitCustomTokens(ctx)

  // Base reset
  // `position: relative` makes the canvas root the containing block for
  // any descendants positioned with `abs, x 0, y 0, w full, h full`
  // (overlays, dialogs). Without it, abs walks up to the viewport and
  // mis-anchors whenever the canvas is smaller than the viewport (Studio
  // mobile preview, standalone HTML in a wider browser).
  ctx.emit('.mirror-root {')
  ctx.emit(
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"
  )
  ctx.emit('  position: relative;')
  ctx.emit('}')
  ctx.emit('.mirror-root * {')
  ctx.emit('  box-sizing: border-box;')
  ctx.emit('}')

  emitAnimationKeyframes(ctx)
  emitSystemStateCSS(ctx)
  emitSizeStateCSS(ctx)

  ctx.emit('`')
  ctx.emit('_root.appendChild(_style)')
  ctx.emit('')

  // Add focus/blur event delegation for headless browser support
  // In headless Chrome, :focus doesn't work, so we use data-focus attribute
  ctx.emit('// Focus state management for headless browser support')
  ctx.emit('_root.addEventListener("focusin", e => {')
  ctx.emit('  const target = e.target')
  ctx.emit('  if (target.dataset?.mirrorId) {')
  ctx.emit('    target.setAttribute("data-focus", "true")')
  ctx.emit('  }')
  ctx.emit('})')
  ctx.emit('_root.addEventListener("focusout", e => {')
  ctx.emit('  const target = e.target')
  ctx.emit('  if (target.dataset?.mirrorId) {')
  ctx.emit('    target.removeAttribute("data-focus")')
  ctx.emit('  }')
  ctx.emit('})')
  ctx.emit('')
}
