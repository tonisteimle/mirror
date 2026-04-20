/**
 * Style Emitter Module
 *
 * CSS generation for Mirror DOM backend.
 * Handles tokens, animations, system states, and size states.
 */

import type { IRNode, IRStyle, IRToken } from '../../ir/types'
import { generateTheme, isThemeToken } from '../../schema/theme-generator'
import { getSizeStateThresholds, SIZE_STATES } from '../../schema/parser-helpers'
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

const ANIMATION_KEYFRAMES = [
  // fade-in / fade-out
  '@keyframes mirror-fade-in { from { opacity: 0; } to { opacity: 1; } }',
  '@keyframes mirror-fade-out { from { opacity: 1; } to { opacity: 0; } }',

  // slide-in / slide-out (horizontal default)
  '@keyframes mirror-slide-in { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',
  '@keyframes mirror-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-20px); opacity: 0; } }',

  // slide-up / slide-down (vertical)
  '@keyframes mirror-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  '@keyframes mirror-slide-down { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',

  // slide-left / slide-right (horizontal explicit)
  '@keyframes mirror-slide-left { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',
  '@keyframes mirror-slide-right { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',

  // scale-in / scale-out
  '@keyframes mirror-scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }',
  '@keyframes mirror-scale-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }',

  // bounce
  '@keyframes mirror-bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }',

  // pulse
  '@keyframes mirror-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }',

  // shake
  '@keyframes mirror-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }',

  // spin
  '@keyframes mirror-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',

  // reveal animations (for scroll-triggered or entry)
  '@keyframes mirror-reveal-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  '@keyframes mirror-reveal-scale { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }',
  '@keyframes mirror-reveal-fade { from { opacity: 0; } to { opacity: 1; } }',
]

/**
 * Emit animation keyframes
 */
function emitAnimationKeyframes(ctx: StyleEmitterContext): void {
  ctx.emit('')
  ctx.emit('/* Animation Keyframes */')
  for (const keyframe of ANIMATION_KEYFRAMES) {
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

const SYSTEM_STATES = ['hover', 'focus', 'active', 'disabled']

/**
 * Emit CSS for a single node's system states
 */
function emitNodeStateCSS(ctx: StyleEmitterContext, node: IRNode): void {
  const stateStyles = node.styles.filter(s => s.state && SYSTEM_STATES.includes(s.state))

  if (stateStyles.length > 0) {
    const byState = groupByState(stateStyles)

    for (const [state, styles] of Object.entries(byState)) {
      const pseudoClass = state === 'disabled' ? '[disabled]' : `:${state}`
      ctx.emit('')
      ctx.emit(`[data-mirror-id^="${node.id}"]${pseudoClass} {`)
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
  return getSizeStateThresholds(sizeState)
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
 * Emit CSS for a single node's size states
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

/**
 * Check if token needs px unit
 */
function needsPxUnit(tokenName: string): boolean {
  return /\.(pad|gap|rad|radius|margin|size|fs|w|h|is)$/.test(tokenName)
}

/**
 * Convert token name to CSS variable name
 */
function tokenToCSSVarName(tokenName: string): string {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  return name.replace(/\./g, '-')
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

  for (const token of customTokens) {
    if (token.value === undefined) continue

    let value = ctx.resolveTokenValueWithContext(token.value, token.name)
    const cssVarName = tokenToCSSVarName(token.name)

    if (needsPxUnit(token.name)) {
      if (typeof value === 'number') {
        value = `${value}px`
      } else if (typeof value === 'string' && /^\d+$/.test(value)) {
        value = `${value}px`
      }
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

  const themeTokens = astTokens.filter(t => {
    const name = t.name.startsWith('$') ? t.name.slice(1) : t.name
    return isThemeToken(name)
  })

  if (themeTokens.length === 0) return

  const theme = generateTheme(themeTokens)
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
  ctx.emit('.mirror-root {')
  ctx.emit(
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"
  )
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
}
