/**
 * Factory: single-side padding readers (`pad-t`, `pad-r`, `pad-b`, `pad-l`).
 *
 * Mirror lets the same logical property be expressed multiple ways:
 *   - `pad-t N`            — most specific
 *   - `pad-y N` (vertical) — covers top + bottom
 *   - `pad-x N` (axis)     — covers left + right
 *   - `pad N`              — uniform, all four sides
 *   - `pad N M`            — vertical N, horizontal M
 *   - `pad N M O P`        — top right bottom left (CSS order)
 *
 * Resolution order (most-specific wins, like CSS): `pad-{side}` >
 * `pad-{axis}` > multi-value `pad` > uniform `pad`. The reader walks the
 * stages and returns the last non-null value.
 *
 * The DOM reader is straightforward — read the computed CSS for the side.
 * The panel reader delegates to the panel's `pad-{side}` lookup.
 */

import type { PropertyReader, PropertyValue } from './types'

export type Side = 'top' | 'right' | 'bottom' | 'left'

interface SideInfo {
  /** Mirror short name (`t` | `r` | `b` | `l`). */
  short: 't' | 'r' | 'b' | 'l'
  /** Computed-style key: `paddingTop` etc. */
  cssProp: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  /** Index in CSS-order multi-value `pad N M O P`. */
  multiIdx: 0 | 1 | 2 | 3
  /** Axis the side belongs to (top/bottom = y, left/right = x). */
  axis: 'x' | 'y'
}

const SIDE_INFO: Record<Side, SideInfo> = {
  top: { short: 't', cssProp: 'paddingTop', multiIdx: 0, axis: 'y' },
  right: { short: 'r', cssProp: 'paddingRight', multiIdx: 1, axis: 'x' },
  bottom: { short: 'b', cssProp: 'paddingBottom', multiIdx: 2, axis: 'y' },
  left: { short: 'l', cssProp: 'paddingLeft', multiIdx: 3, axis: 'x' },
}

export function createSidePadReader(side: Side): PropertyReader {
  const info = SIDE_INFO[side]
  const propName = `pad-${info.short}`
  return {
    name: propName,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readSidePaddingFromLine(line, info)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const v = window.getComputedStyle(el)[info.cssProp]
      const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
      if (!m) return null
      return String(Math.round(parseFloat(m[1])))
    },

    fromPanel(nodeId, ctx): PropertyValue {
      return ctx.api.panel.property.getPropertyValue(propName)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

/**
 * Walk the resolution stages: uniform pad → multi-value pad → axis pad-x/y →
 * specific pad-t/r/b/l. Each stage overrides the previous if matched.
 */
function readSidePaddingFromLine(line: string, info: SideInfo): PropertyValue {
  let value: string | null = null

  // Stage 1: uniform `pad N` (single value).
  const padUniform = line.match(/(?:^|[,\s])(?:pad|padding|p)\s+(\d+)\s*(?=,|$)/)
  if (padUniform) value = padUniform[1]

  // Stage 2: multi-value `pad N M [O P]`. Pick the right index for our side.
  // Convention follows CSS shorthand:
  //   pad N M       → vertical N, horizontal M
  //   pad N M O P   → top right bottom left
  const padMulti = line.match(
    /(?:^|[,\s])(?:pad|padding|p)\s+(\d+)\s+(\d+)(?:\s+(\d+)\s+(\d+))?\s*(?=,|$)/
  )
  if (padMulti) {
    const n = padMulti[1]
    const m = padMulti[2]
    const o = padMulti[3]
    const p = padMulti[4]
    if (o !== undefined && p !== undefined) {
      // 4-value form: top right bottom left
      value = [n, m, o, p][info.multiIdx]
    } else {
      // 2-value form: vertical horizontal
      value = info.axis === 'y' ? n : m
    }
  }

  // Stage 3: axis `pad-x N` or `pad-y N` (overrides uniform/multi).
  const axisRe = new RegExp(`(?:^|[,\\s])pad-${info.axis}\\s+(\\d+)\\s*(?=,|$)`)
  const padAxis = line.match(axisRe)
  if (padAxis) value = padAxis[1]

  // Stage 4: explicit `pad-{side} N` (always wins).
  const sideRe = new RegExp(`(?:^|[,\\s])pad-${info.short}\\s+(\\d+)\\s*(?=,|$)`)
  const padSide = line.match(sideRe)
  if (padSide) value = padSide[1]

  return value
}
