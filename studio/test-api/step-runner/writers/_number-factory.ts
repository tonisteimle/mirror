/**
 * Factory: simple-number writers (`fs`, `rad`, ...).
 *
 *   toCode    — replaces or appends `<canonical> N` (canonicalising any
 *               alias on the line)
 *   toPanel   — panel.setProperty('<canonical>', N)
 *   toPreview — throws by default. Properties that have a preview path
 *               (e.g. spacing keyboard mode for pad/mar/gap) need their
 *               own writer or a custom override; the simple cases like
 *               fs/rad have no shortcut.
 */

import type { PropertyWriter } from './types'

export interface NumberWriterConfig {
  /** Canonical Mirror name. */
  name: string
  /** All accepted aliases including the canonical name. */
  aliases: readonly string[]
}

export function createNumberWriter(config: NumberWriterConfig): PropertyWriter {
  return {
    name: config.name,

    async toCode(nodeId, value, ctx): Promise<void> {
      const code = ctx.api.editor.getCode()
      const sourceMap = ctx.api.studio.getSourceMap() as {
        getNodeById: (id: string) => { position: { line: number } } | null
      } | null
      if (!sourceMap) throw new Error(`toCode(${config.name}): SourceMap not available`)
      const node = sourceMap.getNodeById(nodeId)
      if (!node) throw new Error(`toCode(${config.name}): node ${nodeId} not in SourceMap`)

      const lines = code.split('\n')
      const lineIdx = node.position.line - 1
      const original = lines[lineIdx]
      if (!original) throw new Error(`toCode(${config.name}): line ${node.position.line} not found`)

      const updated = setNumberOnLine(original, config, value)
      if (updated === original) {
        throw new Error(`toCode(${config.name}): could not update line: "${original}"`)
      }
      lines[lineIdx] = updated
      await ctx.api.editor.setCode(lines.join('\n'))
    },

    async toPanel(nodeId, value, ctx): Promise<void> {
      await ctx.api.studio.setSelection(nodeId)
      await ctx.api.utils.delay(100)
      const ok = await ctx.api.panel.property.setProperty(config.name, value)
      if (!ok) throw new Error(`toPanel(${config.name}): panel.setProperty returned false`)
    },

    async toPreview(_nodeId, _value, _ctx): Promise<void> {
      throw new Error(
        `toPreview(${config.name}): no preview shortcut for this property. ` +
          `Use via:'code' or via:'panel'.`
      )
    },
  }
}

// =============================================================================
// Helpers
// =============================================================================

function setNumberOnLine(line: string, config: NumberWriterConfig, value: string): string {
  const aliasGroup = config.aliases.map(a => a.replace(/-/g, '\\-')).join('|')
  const re = new RegExp(`(^|,|\\s)(?:${aliasGroup})\\s+\\d+\\s*(?=,|$)`)
  const m = line.match(re)
  if (m && m.index !== undefined) {
    const prefix = m[1]
    return (
      line.slice(0, m.index) +
      `${prefix}${config.name} ${value}` +
      line.slice(m.index + m[0].length)
    )
  }
  return `${line.replace(/\s+$/, '')}, ${config.name} ${value}`
}
