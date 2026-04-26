/**
 * Property Writer: `weight` (font-weight).
 *
 * Accepts both numbers and keywords; writes whatever the test provided
 * verbatim. Round-trip through the reader's normaliser handles
 * equivalence (e.g. `weight bold` written → DOM reports `700` →
 * normaliser maps both to `700`).
 */

import type { PropertyWriter } from './types'

export const weightWriter: PropertyWriter = {
  name: 'weight',

  async toCode(nodeId, value, ctx): Promise<void> {
    const code = ctx.api.editor.getCode()
    const sourceMap = ctx.api.studio.getSourceMap() as {
      getNodeById: (id: string) => { position: { line: number } } | null
    } | null
    if (!sourceMap) throw new Error('toCode(weight): SourceMap not available')
    const node = sourceMap.getNodeById(nodeId)
    if (!node) throw new Error(`toCode(weight): node ${nodeId} not in SourceMap`)

    const lines = code.split('\n')
    const lineIdx = node.position.line - 1
    const original = lines[lineIdx]
    if (!original) throw new Error(`toCode(weight): line ${node.position.line} not found`)

    const updated = setWeightOnLine(original, value)
    if (updated === original) {
      throw new Error(`toCode(weight): could not update line: "${original}"`)
    }
    lines[lineIdx] = updated
    await ctx.api.editor.setCode(lines.join('\n'))
  },

  async toPanel(nodeId, value, ctx): Promise<void> {
    await ctx.api.studio.setSelection(nodeId)
    await ctx.api.utils.delay(100)
    const ok = await ctx.api.panel.property.setProperty('weight', value)
    if (!ok) throw new Error('toPanel(weight): panel.setProperty returned false')
  },

  async toPreview(_nodeId, _value, _ctx): Promise<void> {
    throw new Error('toPreview(weight): no preview shortcut for font-weight.')
  },
}

function setWeightOnLine(line: string, value: string): string {
  // Value can be number or keyword; match both.
  const re = /(^|,|\s)weight\s+\w+\s*(?=,|$)/
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return line.slice(0, m.index) + `${prefix}weight ${value}` + line.slice(m.index + m[0].length)
  }
  return `${line.replace(/\s+$/, '')}, weight ${value}`
}
