/**
 * Factory: uniform spacing writers (`pad`, `mar`).
 *
 *   toCode    — replaces or appends `<canonical> N` (canonicalising any
 *               alias on the line back to `pad` / `mar`)
 *   toPanel   — panel.setProperty('<canonical>', N)
 *   toPreview — enters the spacing mode (P for pad, M for mar) and steps
 *               the value with ArrowUp/ArrowDown until it matches the
 *               target. waitForCompile between presses keeps the
 *               SourceMap fresh (without it, rapid presses drift, see
 *               pad.ts comment for the failure mode).
 */

import type { PropertyWriter } from './types'

export type UniformKind = 'pad' | 'mar'

const GRID_SIZE = 8

interface UniformInfo {
  prop: 'pad' | 'mar'
  aliases: readonly string[]
  /** Spacing-mode trigger key (P for padding, M for margin). */
  modeKey: 'p' | 'm'
  /** Tuple of computed-style keys to verify uniformity. */
  cssProps: readonly [
    'paddingTop' | 'marginTop',
    'paddingRight' | 'marginRight',
    'paddingBottom' | 'marginBottom',
    'paddingLeft' | 'marginLeft',
  ]
}

const UNIFORM_INFO: Record<UniformKind, UniformInfo> = {
  pad: {
    prop: 'pad',
    aliases: ['pad', 'padding', 'p'],
    modeKey: 'p',
    cssProps: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  },
  mar: {
    prop: 'mar',
    aliases: ['mar', 'margin', 'm'],
    modeKey: 'm',
    cssProps: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  },
}

export function createUniformWriter(kind: UniformKind): PropertyWriter {
  const info = UNIFORM_INFO[kind]

  return {
    name: info.prop,

    async toCode(nodeId, value, ctx): Promise<void> {
      const code = ctx.api.editor.getCode()
      const sourceMap = ctx.api.studio.getSourceMap() as {
        getNodeById: (id: string) => { position: { line: number } } | null
      } | null
      if (!sourceMap) throw new Error(`toCode(${info.prop}): SourceMap not available`)
      const node = sourceMap.getNodeById(nodeId)
      if (!node) throw new Error(`toCode(${info.prop}): node ${nodeId} not in SourceMap`)

      const lines = code.split('\n')
      const lineIdx = node.position.line - 1
      const original = lines[lineIdx]
      if (!original) throw new Error(`toCode(${info.prop}): line ${node.position.line} not found`)

      const updated = setUniformOnLine(original, info, value)
      if (updated === original) {
        throw new Error(`toCode(${info.prop}): could not update line: "${original}"`)
      }
      lines[lineIdx] = updated
      await ctx.api.editor.setCode(lines.join('\n'))
    },

    async toPanel(nodeId, value, ctx): Promise<void> {
      await ctx.api.studio.setSelection(nodeId)
      await ctx.api.utils.delay(100)
      const ok = await ctx.api.panel.property.setProperty(info.prop, value)
      if (!ok) throw new Error(`toPanel(${info.prop}): panel.setProperty returned false`)
    },

    async toPreview(nodeId, value, ctx): Promise<void> {
      const target = parseInt(value, 10)
      if (Number.isNaN(target) || target < 0) {
        throw new Error(`toPreview(${info.prop}): invalid target ${value}`)
      }
      if (target % GRID_SIZE !== 0) {
        throw new Error(
          `toPreview(${info.prop}): target ${target} is off-grid (gridSize ${GRID_SIZE}). ` +
            `Use via:'code' or via:'panel' for off-grid values.`
        )
      }

      await ctx.api.studio.setSelection(nodeId)
      await ctx.api.utils.delay(100)

      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) throw new Error(`toPreview(${info.prop}): element ${nodeId} not in DOM`)
      const s = window.getComputedStyle(el)
      const values = info.cssProps.map(p => pxToInt(s[p]))
      const top = values[0]
      if (top === null || !values.every(v => v === top)) {
        throw new Error(
          `toPreview(${info.prop}): node ${nodeId} has non-uniform ${info.prop}; preview path requires uniform start state`
        )
      }
      if (top % GRID_SIZE !== 0) {
        throw new Error(
          `toPreview(${info.prop}): node ${nodeId} starts off-grid (${top}); preview path requires grid-aligned start`
        )
      }

      // Enter spacing mode (P for pad, M for mar)
      await ctx.api.interact.pressKey(info.modeKey)
      await ctx.api.utils.delay(150)

      // Step the value with ArrowUp/ArrowDown.
      const stepCount = Math.abs(target - top) / GRID_SIZE
      const arrow = target > top ? 'ArrowUp' : 'ArrowDown'
      for (let i = 0; i < stepCount; i++) {
        await ctx.api.interact.pressKey(arrow)
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

function setUniformOnLine(line: string, info: UniformInfo, value: string): string {
  // Pattern handles single-value AND multi-value (`pad N M [O P]`) and any
  // alias (pad/padding/p, mar/margin/m). Replacement always writes the
  // canonical name with a single value.
  const aliasGroup = info.aliases.join('|')
  const re = new RegExp(`(^|,|\\s)(?:${aliasGroup})\\s+\\d+(?:\\s+\\d+){0,3}\\s*(?=,|$)`)
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return (
      line.slice(0, m.index) + `${prefix}${info.prop} ${value}` + line.slice(m.index + m[0].length)
    )
  }
  return `${line.replace(/\s+$/, '')}, ${info.prop} ${value}`
}

function pxToInt(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
