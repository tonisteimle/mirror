/**
 * Factory: axis padding readers (`pad-x`, `pad-y`).
 *
 * `pad-x` represents the **horizontal** pair (left + right). `pad-y` is
 * the **vertical** pair (top + bottom). The reader returns a value only
 * when both sides agree — otherwise the axis is "not uniform" in the
 * rendered output and we report null.
 *
 * Source resolution order (most-specific wins):
 *   1. uniform `pad N`            (both axis sides = N)
 *   2. multi-value `pad N M`      (vertical=N → pad-y; horizontal=M → pad-x)
 *   3. multi-value `pad N M O P`  (top=N bottom=O for pad-y; right=M left=P
 *                                  for pad-x — pad-y meaningful iff N===O,
 *                                  pad-x meaningful iff M===P)
 *   4. axis `pad-x N` / `pad-y N` (always wins for its axis)
 */

import type { PropertyReader, PropertyValue } from './types'

export type Axis = 'x' | 'y'

interface AxisInfo {
  /** Mirror short name (`x` | `y`). */
  short: 'x' | 'y'
  /** Pair of computed-style keys to read for this axis. */
  cssProps: readonly ['paddingLeft' | 'paddingTop', 'paddingRight' | 'paddingBottom']
  /** Pair of multi-value indices (CSS top right bottom left). */
  multiIdx: readonly [number, number]
}

const AXIS_INFO: Record<Axis, AxisInfo> = {
  x: { short: 'x', cssProps: ['paddingLeft', 'paddingRight'], multiIdx: [3, 1] },
  y: { short: 'y', cssProps: ['paddingTop', 'paddingBottom'], multiIdx: [0, 2] },
}

export function createAxisPadReader(axis: Axis): PropertyReader {
  const info = AXIS_INFO[axis]
  const propName = `pad-${info.short}`

  return {
    name: propName,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readAxisPaddingFromLine(line, info)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const s = window.getComputedStyle(el)
      const a = pxToInt(s[info.cssProps[0]])
      const b = pxToInt(s[info.cssProps[1]])
      if (a === null || b === null) return null
      // Axis only makes sense when both sides agree.
      if (a !== b) return null
      return String(a)
    },

    fromPanel(nodeId, ctx): PropertyValue {
      return ctx.api.panel.property.getPropertyValue(propName)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

function readAxisPaddingFromLine(line: string, info: AxisInfo): PropertyValue {
  let value: string | null = null

  // Stage 1: uniform `pad N`.
  const padUniform = line.match(/(?:^|[,\s])(?:pad|padding|p)\s+(\d+)\s*(?=,|$)/)
  if (padUniform) value = padUniform[1]

  // Stage 2: multi-value `pad N M [O P]`.
  const padMulti = line.match(
    /(?:^|[,\s])(?:pad|padding|p)\s+(\d+)\s+(\d+)(?:\s+(\d+)\s+(\d+))?\s*(?=,|$)/
  )
  if (padMulti) {
    const parts = [padMulti[1], padMulti[2], padMulti[3], padMulti[4]]
    const [iA, iB] = info.multiIdx
    if (parts[2] !== undefined && parts[3] !== undefined) {
      // 4-value form: axis is meaningful only if both axis components agree.
      if (parts[iA] === parts[iB]) value = parts[iA]
      else value = null
    } else {
      // 2-value form: vertical N (idx 0), horizontal M (idx 1).
      // pad-y → use idx 0 (vertical); pad-x → use idx 1 (horizontal).
      value = info.short === 'y' ? parts[0] : parts[1]
    }
  }

  // Stage 3: explicit axis declaration.
  const axisRe = new RegExp(`(?:^|[,\\s])pad-${info.short}\\s+(\\d+)\\s*(?=,|$)`)
  const padAxis = line.match(axisRe)
  if (padAxis) value = padAxis[1]

  return value
}

function pxToInt(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
