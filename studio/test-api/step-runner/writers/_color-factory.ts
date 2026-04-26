/**
 * Factory: color writers (`bg`, `col`, `boc`, ...).
 *
 *   toCode    — replaces or appends `<canonical> <value>` (writes the
 *               value as-is — caller decides whether to use hex/named/rgb)
 *   toPanel   — panel.setProperty('<canonical>', value)
 *   toPreview — throws. There's no keyboard shortcut to set a color via
 *               preview-mode; users open the color picker (a panel
 *               operation) or type into the editor.
 */

import type { PropertyWriter } from './types'

export interface ColorWriterConfig {
  /** Canonical Mirror name. */
  name: string
  /** All accepted aliases including the canonical name. */
  aliases: readonly string[]
}

export function createColorWriter(config: ColorWriterConfig): PropertyWriter {
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

      const updated = setColorOnLine(original, config, value)
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
        `toPreview(${config.name}): no preview shortcut for color. ` +
          `Use via:'code' (or via:'panel' with the color picker).`
      )
    },
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Replace any existing `<alias> <color>` declaration (or append). The value
 * pattern matches hex (`#abc`/`#aabbcc`/`#aabbccdd`), named identifier, or
 * `rgb()/rgba()` — the same forms the reader handles.
 */
function setColorOnLine(line: string, config: ColorWriterConfig, value: string): string {
  const aliasGroup = config.aliases.map(a => a.replace(/-/g, '\\-')).join('|')
  // Color value: hex | rgb()/rgba() | identifier
  const valuePattern = `(?:#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|[a-zA-Z]+)`
  const re = new RegExp(`(^|,|\\s)(?:${aliasGroup})\\s+${valuePattern}\\s*(?=,|$)`)
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
