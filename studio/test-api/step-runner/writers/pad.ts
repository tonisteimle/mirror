/**
 * Property Writer: `pad` (uniform padding)
 *
 * Three input paths, same semantic outcome — the property `pad` on the
 * given node is set to the given integer value.
 *
 *   toCode    — replaces or inserts `pad N` on the node's source line
 *   toPanel   — selects the node, then writes via panel.setProperty('pad', N)
 *   toPreview — selects the node, enters padding-mode (P), steps the value
 *               with ArrowUp/ArrowDown until it matches the target, exits
 *               with Esc. Uses the spacing-keyboard-mode (gridSize-stepped)
 *               which is the keyboard direct-manipulation path.
 *
 * The preview path requires that the target value lies on the snap grid —
 * if not, the writer throws (we cannot land on an off-grid value via grid-
 * stepped arrows). The runner can pick a grid-aligned value, or use a
 * different `via` for off-grid tests.
 */

import type { PropertyWriter } from './types'

const GRID_SIZE = 8 // matches handleSnapSettings DEFAULT_HANDLE_SNAP.gridSize

export const padWriter: PropertyWriter = {
  name: 'pad',

  async toCode(nodeId, value, ctx): Promise<void> {
    const code = ctx.api.editor.getCode()
    const sourceMap = ctx.api.studio.getSourceMap() as {
      getNodeById: (id: string) => { position: { line: number } } | null
    } | null
    if (!sourceMap) throw new Error('toCode(pad): SourceMap not available')
    const node = sourceMap.getNodeById(nodeId)
    if (!node) throw new Error(`toCode(pad): node ${nodeId} not in SourceMap`)

    const lines = code.split('\n')
    const lineIdx = node.position.line - 1
    const original = lines[lineIdx]
    if (!original) throw new Error(`toCode(pad): line ${node.position.line} not found`)

    const updated = setPadOnLine(original, value)
    if (updated === original) {
      throw new Error(`toCode(pad): could not insert pad ${value} into line: "${original}"`)
    }
    lines[lineIdx] = updated
    await ctx.api.editor.setCode(lines.join('\n'))
  },

  async toPanel(nodeId, value, ctx): Promise<void> {
    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)
    const ok = await ctx.api.panel.property.setProperty('pad', value)
    if (!ok) throw new Error(`toPanel(pad): panel.setProperty returned false`)
  },

  async toPreview(nodeId, value, ctx): Promise<void> {
    const target = parseInt(value, 10)
    if (Number.isNaN(target) || target < 0) {
      throw new Error(`toPreview(pad): invalid target ${value}`)
    }
    if (target % GRID_SIZE !== 0) {
      throw new Error(
        `toPreview(pad): target ${target} is off-grid (gridSize ${GRID_SIZE}). ` +
          `Use via:'code' or via:'panel' for off-grid values, or pick a grid-aligned target.`
      )
    }

    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)

    // Read current uniform padding from the rendered DOM. If sides differ,
    // we can't predict how many keystrokes the spacing-mode "all" arrow will
    // take, so refuse rather than guess.
    const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) throw new Error(`toPreview(pad): element ${nodeId} not in DOM`)
    const s = window.getComputedStyle(el)
    const top = parsePx(s.paddingTop)
    if (
      top === null ||
      top !== parsePx(s.paddingRight) ||
      top !== parsePx(s.paddingBottom) ||
      top !== parsePx(s.paddingLeft)
    ) {
      throw new Error(
        `toPreview(pad): node ${nodeId} has non-uniform padding; preview path requires uniform start state`
      )
    }
    if (top % GRID_SIZE !== 0) {
      throw new Error(
        `toPreview(pad): node ${nodeId} starts off-grid (${top}); preview path requires grid-aligned start`
      )
    }

    // Enter padding mode
    await ctx.api.interact.pressKey('p')
    await ctx.api.utils.delay(150)

    // Step the value with ArrowUp/ArrowDown.
    //
    // NOTE: Each arrow press fires a SetPropertyCommand whose CodeModifier
    // uses positions from the current SourceMap. Without waiting for the
    // recompile between presses, the SourceMap stays stale and the next
    // press writes at the wrong offset (e.g. `pad 8` → `pad 16` → `pad 166`
    // instead of `pad 24`). waitForCompile here is therefore not optional.
    const stepCount = Math.abs(target - top) / GRID_SIZE
    const arrow = target > top ? 'ArrowUp' : 'ArrowDown'
    for (let i = 0; i < stepCount; i++) {
      await ctx.api.interact.pressKey(arrow)
      await ctx.api.utils.waitForCompile()
    }

    // Exit padding mode (commits the coalesced session as one undo entry)
    await ctx.api.interact.pressKey('Escape')
    await ctx.api.utils.delay(150)
  },
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Set `pad N` on a Mirror line. If the line already has `pad <something>`,
 * replace it. If not, append `, pad N` to the property list. Handles aliases
 * (`padding`, `p`) by replacing them with the canonical `pad`.
 *
 * Limitations of this first version:
 *   - Does not handle multi-value pad (`pad 12 24` becomes `pad N`)
 *   - Does not preserve trailing comments
 *   - Operates only on the leaf line of the node, not multi-line continuations
 *
 * If the line has no comma-separated property list yet (just an element name
 * + maybe text content), the writer appends with a leading comma after the
 * text content.
 */
function setPadOnLine(line: string, value: string): string {
  // Mirror property list grammar:
  //   ElementName ["text"]?, prop1 v1, prop2 v2, ...
  // The first property is separated from the element by *whitespace*, not a
  // comma. Subsequent properties are comma-separated. So when matching `pad`
  // we accept a preceding `^`, `,`, or whitespace.
  //
  // Pattern handles `pad N`, `pad N M`, `pad N M O P` (multi-value forms)
  // and aliases `padding` / `p`. The replacement always uses the canonical
  // `pad N` (single value).
  const re = /(^|,|\s)(?:pad|padding|p)\s+\d+(?:\s+\d+){0,3}\s*(?=,|$)/
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return line.slice(0, m.index) + `${prefix}pad ${value}` + line.slice(m.index + m[0].length)
  }

  // No existing pad — append at end of line.
  return `${line.replace(/\s+$/, '')}, pad ${value}`
}

function parsePx(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
