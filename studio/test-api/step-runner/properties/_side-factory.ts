/**
 * Factory: single-side spacing readers (`pad-t/r/b/l`, `mar-t/r/b/l`).
 *
 * Generalised across kind ∈ {pad, mar}. Mirror lets the same logical
 * property be expressed multiple ways (taking pad as example):
 *   - `pad-t N`            — most specific
 *   - `pad-y N` (axis)     — covers top + bottom
 *   - `pad-x N` (axis)     — covers left + right
 *   - `pad N`              — uniform, all four sides
 *   - `pad N M`            — vertical N, horizontal M
 *   - `pad N M O P`        — top right bottom left (CSS order)
 *
 * Resolution order (most-specific wins, like CSS): `<kind>-{side}` >
 * `<kind>-{axis}` > multi-value `<kind>` > uniform `<kind>`. Reader walks
 * the stages and returns the last non-null value.
 */

import type { PropertyReader, PropertyValue } from './types'

export type Kind = 'pad' | 'mar'
export type Side = 'top' | 'right' | 'bottom' | 'left'

interface KindInfo {
  prop: 'pad' | 'mar'
  aliases: readonly string[]
  /** Computed-style prefix used to build per-side keys. */
  cssPrefix: 'padding' | 'margin'
}

const KIND_INFO: Record<Kind, KindInfo> = {
  pad: { prop: 'pad', aliases: ['pad', 'padding', 'p'], cssPrefix: 'padding' },
  mar: { prop: 'mar', aliases: ['mar', 'margin', 'm'], cssPrefix: 'margin' },
}

interface SideInfo {
  short: 't' | 'r' | 'b' | 'l'
  cap: 'Top' | 'Right' | 'Bottom' | 'Left'
  multiIdx: 0 | 1 | 2 | 3
  axis: 'x' | 'y'
}

const SIDE_INFO: Record<Side, SideInfo> = {
  top: { short: 't', cap: 'Top', multiIdx: 0, axis: 'y' },
  right: { short: 'r', cap: 'Right', multiIdx: 1, axis: 'x' },
  bottom: { short: 'b', cap: 'Bottom', multiIdx: 2, axis: 'y' },
  left: { short: 'l', cap: 'Left', multiIdx: 3, axis: 'x' },
}

export function createSideReader(kind: Kind, side: Side): PropertyReader {
  const k = KIND_INFO[kind]
  const s = SIDE_INFO[side]
  const propName = `${k.prop}-${s.short}`
  const cssKey = `${k.cssPrefix}${s.cap}` as
    | 'paddingTop'
    | 'paddingRight'
    | 'paddingBottom'
    | 'paddingLeft'
    | 'marginTop'
    | 'marginRight'
    | 'marginBottom'
    | 'marginLeft'

  return {
    name: propName,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readSideFromLine(line, k, s)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const v = window.getComputedStyle(el)[cssKey]
      const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
      if (!m) return null
      return String(Math.round(parseFloat(m[1])))
    },

    fromPanel(nodeId, ctx): PropertyValue {
      // See _color-factory for rationale: panel UI is per-selection, so
      // for non-selected nodes we fall back to the source path.
      const selectedId = ctx.api.studio.getSelection?.() ?? null
      if (selectedId === nodeId) {
        const raw = ctx.api.panel.property.getPropertyValue(propName)
        if (raw !== null) return raw
      }
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readSideFromLine(line, k, s)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

function readSideFromLine(line: string, k: KindInfo, s: SideInfo): PropertyValue {
  let value: string | null = null
  const aliasGroup = k.aliases.join('|')

  // Stage 1: uniform `<kind> N` (single value).
  const reUniform = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+(\\d+)\\s*(?=,|$)`)
  const padUniform = line.match(reUniform)
  if (padUniform) value = padUniform[1]

  // Stage 2: multi-value `<kind> N M [O P]`. Pick index for our side.
  const reMulti = new RegExp(
    `(?:^|[,\\s])(?:${aliasGroup})\\s+(\\d+)\\s+(\\d+)(?:\\s+(\\d+)\\s+(\\d+))?\\s*(?=,|$)`
  )
  const padMulti = line.match(reMulti)
  if (padMulti) {
    const parts = [padMulti[1], padMulti[2], padMulti[3], padMulti[4]]
    if (parts[2] !== undefined && parts[3] !== undefined) {
      value = parts[s.multiIdx]
    } else {
      // 2-value form: vertical horizontal
      value = s.axis === 'y' ? parts[0] : parts[1]
    }
  }

  // Stage 3: axis `<kind>-x N` or `<kind>-y N`.
  const reAxis = new RegExp(`(?:^|[,\\s])${k.prop}-${s.axis}\\s+(\\d+)\\s*(?=,|$)`)
  const padAxis = line.match(reAxis)
  if (padAxis) value = padAxis[1]

  // Stage 4: explicit side `<kind>-{side} N` (always wins).
  const reSide = new RegExp(`(?:^|[,\\s])${k.prop}-${s.short}\\s+(\\d+)\\s*(?=,|$)`)
  const padSide = line.match(reSide)
  if (padSide) value = padSide[1]

  return value
}
