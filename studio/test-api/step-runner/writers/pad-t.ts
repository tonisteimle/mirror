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

  async toPreview(_nodeId, _value, _ctx): Promise<void> {
    throw new Error('toPreview(pad-t): not implemented yet (sub-increment 3.3)')
  },
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
