/**
 * Property Reader: `pad` (uniform padding, all four sides equal)
 *
 * This is the first property reader, built end-to-end as a reference for the
 * pattern. Other readers (`pad-t`, `mar`, `bg`, …) follow the same shape.
 *
 * Semantics of `pad` specifically — important to get right:
 *   - In code:  matches `pad N` (or aliases `padding N` / `p N`) on the
 *               node's line. Does NOT match `pad-t`, `pad-x`, or multi-value
 *               `pad N M`. Returns null if no uniform-padding declaration
 *               is present.
 *   - In DOM:   reads computed paddingTop/Right/Bottom/Left. Returns the
 *               common value if all four agree, otherwise null (the rendered
 *               state isn't "uniform" anymore, so `pad` is effectively unset).
 *   - In Panel: reads the panel's value for the property name `pad`.
 *
 * Canonical form is the bare integer (`"24"`), no `px`. Null means "not set".
 */

import type { PropertyReader, PropertyValue } from './types'

export const padReader: PropertyReader = {
  name: 'pad',
  aliases: ['padding', 'p'],

  fromCode(nodeId, ctx): PropertyValue {
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    return readUniformPaddingFromLine(line)
  },

  fromDom(nodeId, ctx): PropertyValue {
    const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return null
    const s = window.getComputedStyle(el)
    const top = pxToInt(s.paddingTop)
    const right = pxToInt(s.paddingRight)
    const bottom = pxToInt(s.paddingBottom)
    const left = pxToInt(s.paddingLeft)
    if (top === null) return null
    // Uniform `pad` is only meaningful if all four sides agree.
    if (top !== right || top !== bottom || top !== left) return null
    return String(top)
  },

  fromPanel(nodeId, ctx): PropertyValue {
    // Panel shows the currently-selected element's properties. We assume the
    // caller has selected `nodeId` before this read — same convention as the
    // existing panel API. If not, this returns the value for whichever node
    // is selected, which is itself useful (catches "panel didn't refresh
    // after selection change" bugs).
    return ctx.api.panel.property.getPropertyValue('pad')
  },
}

// =============================================================================
// Helpers — kept local; if a second property needs them, hoist to ./shared.ts
// =============================================================================

/**
 * Match `pad N` (or alias) on the line, but NOT `pad-t N`, `pad-x N`, or
 * multi-value `pad N M [O P]`. Mirror separates properties with commas and
 * may also have leading whitespace; the property is `pad` followed by exactly
 * one positive integer and then either a comma or end-of-line.
 *
 * Aliases handled: `pad`, `padding`, `p` (the `p` alias requires that the
 * previous token boundary is `,` or start-of-line — otherwise it would match
 * the `p` in e.g. `Pop`).
 */
function readUniformPaddingFromLine(line: string): PropertyValue {
  // Mirror property list grammar: ElementName ["text"]?, prop1 v1, prop2 v2…
  // The first property is separated from the element by *whitespace*, not a
  // comma. So accept `^`, `,`, or whitespace as the preceding context.
  // Pattern: (start|comma|whitespace)(name)(ws)(integer)(optional-ws)(comma-or-end)
  const patterns = [
    /(?:^|[,\s])pad\s+(\d+)\s*(?:,|$)/,
    /(?:^|[,\s])padding\s+(\d+)\s*(?:,|$)/,
    /(?:^|[,\s])p\s+(\d+)\s*(?:,|$)/,
  ]
  for (const re of patterns) {
    const m = line.match(re)
    if (m) return m[1]
  }
  return null
}

function pxToInt(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  // Round to int — Mirror's source values are integer pixels.
  return Math.round(parseFloat(m[1]))
}
