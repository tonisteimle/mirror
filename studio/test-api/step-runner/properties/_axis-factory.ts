/**
 * Factory: axis spacing readers (`pad-x/y`, `mar-x/y`).
 *
 * Generalised across kind ∈ {pad, mar}. `<kind>-x` represents the
 * horizontal pair (left + right); `<kind>-y` the vertical pair (top +
 * bottom). DOM read returns a value only when both axis sides agree —
 * otherwise the axis is "not uniform" and the property is effectively
 * unset.
 *
 * Source resolution order: uniform → multi-value → axis (most specific
 * wins). Multi-value `<kind> N M O P` gives a meaningful axis only when
 * both axis components agree.
 */

import type { PropertyReader, PropertyValue } from './types'

export type Kind = 'pad' | 'mar'
export type Axis = 'x' | 'y'

interface KindInfo {
  prop: 'pad' | 'mar'
  aliases: readonly string[]
  cssPrefix: 'padding' | 'margin'
}

const KIND_INFO: Record<Kind, KindInfo> = {
  pad: { prop: 'pad', aliases: ['pad', 'padding', 'p'], cssPrefix: 'padding' },
  mar: { prop: 'mar', aliases: ['mar', 'margin', 'm'], cssPrefix: 'margin' },
}

interface AxisInfo {
  short: 'x' | 'y'
  /** CSS sides that make up this axis: [first, second]. */
  cssSides: readonly ['Left' | 'Top', 'Right' | 'Bottom']
  /** Multi-value indices in CSS top-right-bottom-left order. */
  multiIdx: readonly [number, number]
}

const AXIS_INFO: Record<Axis, AxisInfo> = {
  x: { short: 'x', cssSides: ['Left', 'Right'], multiIdx: [3, 1] },
  y: { short: 'y', cssSides: ['Top', 'Bottom'], multiIdx: [0, 2] },
}

export function createAxisReader(kind: Kind, axis: Axis): PropertyReader {
  const k = KIND_INFO[kind]
  const a = AXIS_INFO[axis]
  const propName = `${k.prop}-${a.short}`
  const cssKeyA = `${k.cssPrefix}${a.cssSides[0]}` as keyof CSSStyleDeclaration
  const cssKeyB = `${k.cssPrefix}${a.cssSides[1]}` as keyof CSSStyleDeclaration

  return {
    name: propName,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readAxisFromLine(line, k, a)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const s = window.getComputedStyle(el)
      const a1 = pxToInt(s[cssKeyA] as string)
      const b1 = pxToInt(s[cssKeyB] as string)
      if (a1 === null || b1 === null) return null
      if (a1 !== b1) return null
      return String(a1)
    },

    fromPanel(nodeId, ctx): PropertyValue {
      return ctx.api.panel.property.getPropertyValue(propName)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

function readAxisFromLine(line: string, k: KindInfo, a: AxisInfo): PropertyValue {
  let value: string | null = null
  const aliasGroup = k.aliases.join('|')

  // Stage 1: uniform.
  const reUniform = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+(\\d+)\\s*(?=,|$)`)
  const padUniform = line.match(reUniform)
  if (padUniform) value = padUniform[1]

  // Stage 2: multi-value.
  const reMulti = new RegExp(
    `(?:^|[,\\s])(?:${aliasGroup})\\s+(\\d+)\\s+(\\d+)(?:\\s+(\\d+)\\s+(\\d+))?\\s*(?=,|$)`
  )
  const padMulti = line.match(reMulti)
  if (padMulti) {
    const parts = [padMulti[1], padMulti[2], padMulti[3], padMulti[4]]
    if (parts[2] !== undefined && parts[3] !== undefined) {
      // 4-value form: axis is meaningful only when both axis components agree.
      const [iA, iB] = a.multiIdx
      if (parts[iA] === parts[iB]) value = parts[iA]
      else value = null
    } else {
      // 2-value form: vertical N (idx 0), horizontal M (idx 1).
      // pad-y → idx 0; pad-x → idx 1.
      value = a.short === 'y' ? parts[0] : parts[1]
    }
  }

  // Stage 3: explicit axis.
  const reAxis = new RegExp(`(?:^|[,\\s])${k.prop}-${a.short}\\s+(\\d+)\\s*(?=,|$)`)
  const padAxis = line.match(reAxis)
  if (padAxis) value = padAxis[1]

  return value
}

function pxToInt(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
