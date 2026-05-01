/**
 * Property Reader: `gap` (flex/grid gap between children).
 *
 * Single value, no axis or per-side variants. Reader is straightforward.
 *   - In code:  matches `gap N` (also alias `g`)
 *   - In DOM:   reads computed `gap` style — Mirror's gap maps directly
 *               to CSS gap on flex/grid containers
 *   - In Panel: panel.getPropertyValue('gap')
 */

import type { PropertyReader, PropertyValue } from './types'

export const gapReader: PropertyReader = {
  name: 'gap',

  fromCode(nodeId, ctx): PropertyValue {
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    // Match `gap N` or `g N` (alias). The `g` alias must be a complete
    // token — preceded by `^|,|\s` and followed by whitespace + digit.
    const m = line.match(/(?:^|[,\s])(?:gap|g)\s+(\d+)\s*(?=,|$)/)
    return m ? m[1] : null
  },

  fromDom(nodeId, ctx): PropertyValue {
    const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return null
    const v = window.getComputedStyle(el).gap
    if (!v || v === 'normal') return null
    // For flex/grid containers without explicit gap, computed gap is "normal" or "0px".
    const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
    if (!m) return null
    return String(Math.round(parseFloat(m[1])))
  },

  fromPanel(nodeId, ctx): PropertyValue {
    // See _color-factory for rationale: panel UI is per-selection, so
    // for non-selected nodes we fall back to the source path.
    const selectedId = ctx.api.studio.getSelection?.() ?? null
    if (selectedId === nodeId) {
      const raw = ctx.api.panel.property.getPropertyValue('gap')
      if (raw !== null) return raw
    }
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    const m = line.match(/(?:^|[,\s])(?:gap|g)\s+(\d+)\s*(?=,|$)/)
    return m ? m[1] : null
  },
}
