/**
 * Factory: axis spacing writers (`pad-x/y`, `mar-x/y`).
 *
 *   toCode    — replaces or appends `<kind>-{axis} N`
 *   toPanel   — panel.setProperty('<kind>-{axis}', N)
 *   toPreview — throws. The spacing-keyboard-mode has no axis shortcut
 *               yet (only individual sides via Option+Arrow{side}).
 */

import type { PropertyWriter } from './types'

export type Kind = 'pad' | 'mar'
export type Axis = 'x' | 'y'

const KIND_PROP: Record<Kind, 'pad' | 'mar'> = { pad: 'pad', mar: 'mar' }

export function createAxisWriter(kind: Kind, axis: Axis): PropertyWriter {
  const propName = `${KIND_PROP[kind]}-${axis}`

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

      const updated = setAxisOnLine(original, propName, value)
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

    async toPreview(_nodeId, _value, _ctx): Promise<void> {
      throw new Error(
        `toPreview(${propName}): no axis shortcut in spacing-keyboard-mode yet. ` +
          `Use via:'code' or via:'panel' for axis spacing.`
      )
    },
  }
}

function setAxisOnLine(line: string, propName: string, value: string): string {
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
