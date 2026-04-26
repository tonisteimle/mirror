/**
 * Factory: simple-number readers (`fs`, `rad`, plus future `w`/`h`/...).
 *
 * "Simple number" = one pixel-valued property, no axis, no sides, no
 * keyword variants. Reader matches `<canonical|alias> N` in source,
 * reads the configured CSS property from DOM, asks the panel by name.
 *
 * For properties that ALSO accept keywords (`w full`, `h hug`) the
 * caller must wrap this factory or write a dedicated reader — this
 * factory only handles the integer-pixel case.
 */

import type { PropertyReader, PropertyValue } from './types'

export interface NumberPropertyConfig {
  /** Canonical Mirror name (e.g. 'fs'). */
  name: string
  /** All accepted aliases including the canonical name (e.g. ['fs', 'font-size']). */
  aliases: readonly string[]
  /** Computed-style key (e.g. 'fontSize'). */
  cssProp: keyof CSSStyleDeclaration
}

export function createNumberReader(config: NumberPropertyConfig): PropertyReader {
  return {
    name: config.name,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readNumberFromLine(line, config.aliases)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const v = window.getComputedStyle(el)[config.cssProp] as string
      const m = v?.match(/^(-?\d+(?:\.\d+)?)px$/)
      if (!m) return null
      return String(Math.round(parseFloat(m[1])))
    },

    fromPanel(nodeId, ctx): PropertyValue {
      return ctx.api.panel.property.getPropertyValue(config.name)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

function readNumberFromLine(line: string, aliases: readonly string[]): PropertyValue {
  const aliasGroup = aliases.map(a => a.replace(/-/g, '\\-')).join('|')
  const re = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+(\\d+)\\s*(?=,|$)`)
  const m = line.match(re)
  return m ? m[1] : null
}
