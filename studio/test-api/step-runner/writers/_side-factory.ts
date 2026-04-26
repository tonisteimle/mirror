/**
 * Factory: single-side spacing writers (`pad-t/r/b/l`, `mar-t/r/b/l`).
 *
 * Generalised across kind ∈ {pad, mar}. Three input paths each:
 *   toCode    — replaces or appends `<kind>-{side} N`
 *   toPanel   — panel.setProperty('<kind>-{side}', N)
 *   toPreview — enters the spacing mode (P for pad, M for mar) and uses
 *               Option+Arrow{side} (Shift inverts sign) to step the value.
 */

import type { PropertyWriter } from './types'

export type Kind = 'pad' | 'mar'
export type Side = 'top' | 'right' | 'bottom' | 'left'

const GRID_SIZE = 8

interface KindInfo {
  prop: 'pad' | 'mar'
  /** Spacing-mode trigger key. */
  modeKey: 'p' | 'm'
  cssPrefix: 'padding' | 'margin'
}

const KIND_INFO: Record<Kind, KindInfo> = {
  pad: { prop: 'pad', modeKey: 'p', cssPrefix: 'padding' },
  mar: { prop: 'mar', modeKey: 'm', cssPrefix: 'margin' },
}

interface SideInfo {
  short: 't' | 'r' | 'b' | 'l'
  cap: 'Top' | 'Right' | 'Bottom' | 'Left'
  arrowKey: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
}

const SIDE_INFO: Record<Side, SideInfo> = {
  top: { short: 't', cap: 'Top', arrowKey: 'ArrowUp' },
  right: { short: 'r', cap: 'Right', arrowKey: 'ArrowRight' },
  bottom: { short: 'b', cap: 'Bottom', arrowKey: 'ArrowDown' },
  left: { short: 'l', cap: 'Left', arrowKey: 'ArrowLeft' },
}

export function createSideWriter(kind: Kind, side: Side): PropertyWriter {
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
      const current = parsePx(window.getComputedStyle(el)[cssKey])
      if (current === null) throw new Error(`toPreview(${propName}): could not read ${cssKey}`)
      if (current % GRID_SIZE !== 0) {
        throw new Error(
          `toPreview(${propName}): node ${nodeId} starts off-grid (${cssKey}=${current})`
        )
      }

      // Enter spacing mode (P for pad, M for mar)
      await ctx.api.interact.pressKey(k.modeKey)
      await ctx.api.utils.delay(150)

      // Option+Arrow{side} = side + 1 step. Option+Shift+Arrow{side} = side - 1.
      const stepCount = Math.abs(target - current) / GRID_SIZE
      const decreasing = target < current
      for (let i = 0; i < stepCount; i++) {
        await ctx.api.interact.pressKey(s.arrowKey, { alt: true, shift: decreasing })
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
