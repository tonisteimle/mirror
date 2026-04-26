/**
 * Property Writer: `pad-t` (top side padding only)
 *
 * Sub-increment 3.1: only `toCode` is implemented. Panel and preview paths
 * come in 3.2 / 3.3.
 *
 * `toCode` semantics (first iteration):
 *   - If line has `pad-t N` already → replace it
 *   - Else → append `, pad-t N` to the line
 *   - Does NOT try to interact with an existing `pad N` (uniform) declaration.
 *     If both end up on the line, that's the user's (or other writer's)
 *     concern — Mirror parses both and the more-specific `pad-t` wins for
 *     the top side, which is what the test asserts via `props.pad-t`.
 */

import type { PropertyWriter } from './types'

export const padTWriter: PropertyWriter = {
  name: 'pad-t',

  async toCode(nodeId, value, ctx): Promise<void> {
    const code = ctx.api.editor.getCode()
    const sourceMap = ctx.api.studio.getSourceMap() as {
      getNodeById: (id: string) => { position: { line: number } } | null
    } | null
    if (!sourceMap) throw new Error('toCode(pad-t): SourceMap not available')
    const node = sourceMap.getNodeById(nodeId)
    if (!node) throw new Error(`toCode(pad-t): node ${nodeId} not in SourceMap`)

    const lines = code.split('\n')
    const lineIdx = node.position.line - 1
    const original = lines[lineIdx]
    if (!original) throw new Error(`toCode(pad-t): line ${node.position.line} not found`)

    const updated = setPadTOnLine(original, value)
    if (updated === original) {
      throw new Error(`toCode(pad-t): could not insert pad-t ${value} into line: "${original}"`)
    }
    lines[lineIdx] = updated
    await ctx.api.editor.setCode(lines.join('\n'))
  },

  async toPanel(nodeId, value, ctx): Promise<void> {
    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)
    const ok = await ctx.api.panel.property.setProperty('pad-t', value)
    if (!ok) throw new Error(`toPanel(pad-t): panel.setProperty returned false`)
  },

  async toPreview(nodeId, value, ctx): Promise<void> {
    const target = parseInt(value, 10)
    if (Number.isNaN(target) || target < 0) {
      throw new Error(`toPreview(pad-t): invalid target ${value}`)
    }
    if (target % GRID_SIZE !== 0) {
      throw new Error(
        `toPreview(pad-t): target ${target} is off-grid (gridSize ${GRID_SIZE}). ` +
          `Use via:'code' or via:'panel' for off-grid values.`
      )
    }

    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)

    const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) throw new Error(`toPreview(pad-t): element ${nodeId} not in DOM`)
    const top = parsePx(window.getComputedStyle(el).paddingTop)
    if (top === null) throw new Error(`toPreview(pad-t): could not read paddingTop`)
    if (top % GRID_SIZE !== 0) {
      throw new Error(
        `toPreview(pad-t): node ${nodeId} starts off-grid (top=${top}); preview path requires grid-aligned start`
      )
    }

    // Enter padding mode
    await ctx.api.interact.pressKey('p')
    await ctx.api.utils.delay(150)

    // Option+ArrowUp = top + 1 step. Option+Shift+ArrowUp = top - 1 step.
    // (The arrow direction *is* the side; Shift inverts the sign.) See
    // docs/concepts/spacing-keyboard-mode.md for the full table.
    const stepCount = Math.abs(target - top) / GRID_SIZE
    const decreasing = target < top
    for (let i = 0; i < stepCount; i++) {
      await ctx.api.interact.pressKey('ArrowUp', { alt: true, shift: decreasing })
      await ctx.api.utils.waitForCompile()
    }

    await ctx.api.interact.pressKey('Escape')
    await ctx.api.utils.delay(150)
  },
}

const GRID_SIZE = 8

function parsePx(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}

// =============================================================================
// Helpers
// =============================================================================

function setPadTOnLine(line: string, value: string): string {
  // Replace existing `pad-t N` declaration if present.
  const re = /(^|,|\s)pad-t\s+\d+\s*(?=,|$)/
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return line.slice(0, m.index) + `${prefix}pad-t ${value}` + line.slice(m.index + m[0].length)
  }

  // No existing pad-t — append at end of line.
  return `${line.replace(/\s+$/, '')}, pad-t ${value}`
}
