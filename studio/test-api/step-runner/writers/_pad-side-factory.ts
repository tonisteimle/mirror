/**
 * Factory: single-side padding writers (`pad-t`, `pad-r`, `pad-b`, `pad-l`).
 *
 *   toCode    — replaces or appends `pad-{side} N` on the line. Does not
 *               try to interact with existing uniform/multi-value `pad`.
 *   toPanel   — selects the node, then writes via panel.setProperty.
 *   toPreview — enters padding-mode (P), then uses Option+Arrow{side}
 *               (Shift inverts sign) to step the value. Each press is
 *               waited-for-compile to keep the SourceMap fresh.
 */

import type { PropertyWriter } from './types'

export type Side = 'top' | 'right' | 'bottom' | 'left'

const GRID_SIZE = 8

interface SideInfo {
  short: 't' | 'r' | 'b' | 'l'
  cssProp: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  /** Arrow key whose direction matches the side in spacing-keyboard-mode. */
  arrowKey: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
}

const SIDE_INFO: Record<Side, SideInfo> = {
  top: { short: 't', cssProp: 'paddingTop', arrowKey: 'ArrowUp' },
  right: { short: 'r', cssProp: 'paddingRight', arrowKey: 'ArrowRight' },
  bottom: { short: 'b', cssProp: 'paddingBottom', arrowKey: 'ArrowDown' },
  left: { short: 'l', cssProp: 'paddingLeft', arrowKey: 'ArrowLeft' },
}

export function createSidePadWriter(side: Side): PropertyWriter {
  const info = SIDE_INFO[side]
  const propName = `pad-${info.short}`

  return {
    name: propName,

    async toCode(nodeId, value, ctx): Promise<void> {
      const code = ctx.api.editor.getCode()
      const sourceMap = ctx.api.studio.getSourceMap() as {
        getNodeById: (id: string) => { position: { line: number } } | null
      } | null
      if (!sourceMap) throw new Error(`toCode(${propName}): SourceMap not available`)
      const node = sourceMap.getNodeById(nodeId)
      if (!node) throw new Error(`toCode(${propName}): node ${nodeId} not in SourceMap`)

      const lines = code.split('\n')
      const lineIdx = node.position.line - 1
      const original = lines[lineIdx]
      if (!original) throw new Error(`toCode(${propName}): line ${node.position.line} not found`)

      const updated = setSideOnLine(original, propName, value)
      if (updated === original) {
        throw new Error(`toCode(${propName}): could not update line: "${original}"`)
      }
      lines[lineIdx] = updated
      await ctx.api.editor.setCode(lines.join('\n'))
    },

    async toPanel(nodeId, value, ctx): Promise<void> {
      await ctx.api.studio.setSelection(nodeId)
      await ctx.api.utils.delay(100)
      const ok = await ctx.api.panel.property.setProperty(propName, value)
      if (!ok) throw new Error(`toPanel(${propName}): panel.setProperty returned false`)
    },

    async toPreview(nodeId, value, ctx): Promise<void> {
      const target = parseInt(value, 10)
      if (Number.isNaN(target) || target < 0) {
        throw new Error(`toPreview(${propName}): invalid target ${value}`)
      }
      if (target % GRID_SIZE !== 0) {
        throw new Error(
          `toPreview(${propName}): target ${target} is off-grid (gridSize ${GRID_SIZE}). ` +
            `Use via:'code' or via:'panel' for off-grid values.`
        )
      }

      await ctx.api.studio.setSelection(nodeId)
      await ctx.api.utils.delay(100)

      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) throw new Error(`toPreview(${propName}): element ${nodeId} not in DOM`)
      const current = parsePx(window.getComputedStyle(el)[info.cssProp])
      if (current === null)
        throw new Error(`toPreview(${propName}): could not read ${info.cssProp}`)
      if (current % GRID_SIZE !== 0) {
        throw new Error(
          `toPreview(${propName}): node ${nodeId} starts off-grid (${info.cssProp}=${current})`
        )
      }

      // Enter padding mode
      await ctx.api.interact.pressKey('p')
      await ctx.api.utils.delay(150)

      // Option+Arrow{side} = side + 1 step. Option+Shift+Arrow{side} = side - 1.
      // Direction is "more padding" by default; Shift inverts.
      const stepCount = Math.abs(target - current) / GRID_SIZE
      const decreasing = target < current
      for (let i = 0; i < stepCount; i++) {
        await ctx.api.interact.pressKey(info.arrowKey, { alt: true, shift: decreasing })
        await ctx.api.utils.waitForCompile()
      }

      await ctx.api.interact.pressKey('Escape')
      await ctx.api.utils.delay(150)
    },
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Set `pad-{short} N` on a Mirror line. Replaces an existing
 * `pad-{short} M` declaration or appends one. Does not touch uniform `pad`
 * or other side properties — overrides interact at the Mirror parser level
 * (specific-side wins for that side, leaving the others untouched).
 */
function setSideOnLine(line: string, propName: string, value: string): string {
  const escaped = propName.replace(/-/g, '\\-')
  const re = new RegExp(`(^|,|\\s)${escaped}\\s+\\d+\\s*(?=,|$)`)
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return (
      line.slice(0, m.index) + `${prefix}${propName} ${value}` + line.slice(m.index + m[0].length)
    )
  }
  return `${line.replace(/\s+$/, '')}, ${propName} ${value}`
}

function parsePx(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
