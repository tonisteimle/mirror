/**
 * Property Reader: `weight` (font-weight).
 *
 * `weight` is a number-with-keyword-aliases property. Source can be:
 *   - a number 100..900 (`weight 500`)
 *   - a keyword (`weight bold`, `weight normal`, ...)
 * The DOM always reports a number string ("400", "700", ...).
 *
 * The reader normalises everything to a number string via a small
 * keyword→number map, so tests can assert `weight: 'bold'` and match
 * any equivalent representation (`'700'`, `'bold'`) anywhere.
 */

import type { PropertyReader, PropertyValue } from './types'

const KEYWORD_TO_NUMBER: Record<string, string> = {
  thin: '100',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
}

function normalizeWeight(value: PropertyValue): PropertyValue {
  if (value === null) return null
  const v = value.trim().toLowerCase()
  if (KEYWORD_TO_NUMBER[v]) return KEYWORD_TO_NUMBER[v]
  if (/^\d+$/.test(v)) return v
  return null
}

export const weightReader: PropertyReader = {
  name: 'weight',

  fromCode(nodeId, ctx): PropertyValue {
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    // Match `weight <token>` where token is a number or one of the keywords.
    const m = line.match(/(?:^|[,\s])weight\s+(\w+)\s*(?=,|$)/)
    if (!m) return null
    return normalizeWeight(m[1])
  },

  fromDom(nodeId, ctx): PropertyValue {
    const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return null
    const v = window.getComputedStyle(el).fontWeight
    return normalizeWeight(v)
  },

  fromPanel(nodeId, ctx): PropertyValue {
    return normalizeWeight(ctx.api.panel.property.getPropertyValue('weight'))
  },

  normalize(value): PropertyValue {
    return normalizeWeight(value)
  },
}
