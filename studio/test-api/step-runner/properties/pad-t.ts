/**
 * Property Reader: `pad-t` (top side padding only)
 *
 * Mirror has multiple ways to express the top padding:
 *   - `pad-t N`            — top side directly
 *   - `pad N`              — uniform (top = N)
 *   - `pad N M`            — vertical/horizontal (top = N)
 *   - `pad N M O P`        — top right bottom left (top = N)
 *   - `pad-y N`            — vertical pair (top = N)  [not yet handled here]
 *
 * The reader returns the value that the **rendered DOM** would show for
 * the top side. If the source has an explicit `pad-t` it wins; otherwise
 * the top component of `pad` (or `pad-y`) is used. If no padding source
 * declares a top side at all, returns null.
 *
 * For the first scenario we keep the source clean (`Frame pad-t 8`) so
 * the multi-value parsing is exercised but not yet stressed by overrides.
 */

import type { PropertyReader, PropertyValue } from './types'

export const padTReader: PropertyReader = {
  name: 'pad-t',

  fromCode(nodeId, ctx): PropertyValue {
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    return readTopPaddingFromLine(line)
  },

  fromDom(nodeId, ctx): PropertyValue {
    const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return null
    const v = window.getComputedStyle(el).paddingTop
    const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
    if (!m) return null
    return String(Math.round(parseFloat(m[1])))
  },

  fromPanel(nodeId, ctx): PropertyValue {
    return ctx.api.panel.property.getPropertyValue('pad-t')
  },
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the top-side padding value from a Mirror source line.
 * Resolution order (later wins, like CSS): pad / pad-y / pad-t.
 *
 * Returns null if no padding declaration is present at all.
 */
function readTopPaddingFromLine(line: string): PropertyValue {
  let top: string | null = null

  // Stage 1: uniform `pad N` or multi-value `pad N M [O P]`.
  // Top is always the first numeric value.
  const padMatch = line.match(/(?:^|[,\s])(?:pad|padding|p)\s+(\d+)(?:\s+\d+){0,3}\s*(?=,|$)/)
  if (padMatch) top = padMatch[1]

  // Stage 2: `pad-y N` overrides top from uniform pad.
  const padYMatch = line.match(/(?:^|[,\s])pad-y\s+(\d+)\s*(?=,|$)/)
  if (padYMatch) top = padYMatch[1]

  // Stage 3: explicit `pad-t N` always wins.
  const padTMatch = line.match(/(?:^|[,\s])pad-t\s+(\d+)\s*(?=,|$)/)
  if (padTMatch) top = padTMatch[1]

  return top
}
