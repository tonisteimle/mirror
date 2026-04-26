/**
 * Property Writer: `gap`
 *
 *   toCode    — replaces or appends `gap N`
 *   toPanel   — panel.setProperty('gap', N)
 *   toPreview — enters gap mode (G key), then ArrowUp/Down (gridSize-
 *               stepped) until the value matches.
 */

import type { PropertyWriter } from './types'

const GRID_SIZE = 8

export const gapWriter: PropertyWriter = {
  name: 'gap',

  async toCode(nodeId, value, ctx): Promise<void> {
    const code = ctx.api.editor.getCode()
    const sourceMap = ctx.api.studio.getSourceMap() as {
      getNodeById: (id: string) => { position: { line: number } } | null
    } | null
    if (!sourceMap) throw new Error('toCode(gap): SourceMap not available')
    const node = sourceMap.getNodeById(nodeId)
    if (!node) throw new Error(`toCode(gap): node ${nodeId} not in SourceMap`)

    const lines = code.split('\n')
    const lineIdx = node.position.line - 1
    const original = lines[lineIdx]
    if (!original) throw new Error(`toCode(gap): line ${node.position.line} not found`)

    const updated = setGapOnLine(original, value)
    if (updated === original) {
      throw new Error(`toCode(gap): could not update line: "${original}"`)
    }
    lines[lineIdx] = updated
    await ctx.api.editor.setCode(lines.join('\n'))
  },

  async toPanel(nodeId, value, ctx): Promise<void> {
    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)
    const ok = await ctx.api.panel.property.setProperty('gap', value)
    if (!ok) throw new Error(`toPanel(gap): panel.setProperty returned false`)
  },

  async toPreview(nodeId, value, ctx): Promise<void> {
    const target = parseInt(value, 10)
    if (Number.isNaN(target) || target < 0) {
      throw new Error(`toPreview(gap): invalid target ${value}`)
    }
    if (target % GRID_SIZE !== 0) {
      throw new Error(
        `toPreview(gap): target ${target} is off-grid (gridSize ${GRID_SIZE}). ` +
          `Use via:'code' or via:'panel' for off-grid values.`
      )
    }

    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)

    const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) throw new Error(`toPreview(gap): element ${nodeId} not in DOM`)
    const current = parsePx(window.getComputedStyle(el).gap)
    if (current === null) throw new Error(`toPreview(gap): could not read computed gap`)
    if (current % GRID_SIZE !== 0) {
      throw new Error(`toPreview(gap): node ${nodeId} starts off-grid (gap=${current})`)
    }

    // Enter gap mode (G — same key that toggles gap-handles)
    await ctx.api.interact.pressKey('g')
    await ctx.api.utils.delay(150)

    const stepCount = Math.abs(target - current) / GRID_SIZE
    const arrow = target > current ? 'ArrowUp' : 'ArrowDown'
    for (let i = 0; i < stepCount; i++) {
      await ctx.api.interact.pressKey(arrow)
      await ctx.api.utils.waitForCompile()
    }

    await ctx.api.interact.pressKey('Escape')
    await ctx.api.utils.delay(150)
  },
}

// =============================================================================
// Helpers
// =============================================================================

function setGapOnLine(line: string, value: string): string {
  const re = /(^|,|\s)(?:gap|g)\s+\d+\s*(?=,|$)/
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return line.slice(0, m.index) + `${prefix}gap ${value}` + line.slice(m.index + m[0].length)
  }
  return `${line.replace(/\s+$/, '')}, gap ${value}`
}

function parsePx(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
