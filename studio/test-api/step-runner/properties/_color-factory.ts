/**
 * Factory: color readers (`bg`, `col`, `boc`, ...).
 *
 * Color values appear in three forms across the readout dimensions:
 *   - In code:  hex / named / rgb() — whatever the user wrote
 *   - In DOM:   always rgb()/rgba() (computed style)
 *   - In Panel: typically the source form (whatever was written)
 *
 * The reader normalises every read to a canonical lowercase `#rrggbb`
 * (or `#rrggbbaa` if alpha < 1). The runner then compares the three
 * normalised values to the expected value (also normalised). A
 * declaration like `expect.props: { 'node-1': { bg: 'white' } }` will
 * accept any equivalent representation in any dimension.
 */

import type { PropertyReader, PropertyValue } from './types'
import { normalizeColor } from './_color'

export interface ColorPropertyConfig {
  /** Canonical Mirror name (e.g. 'bg'). */
  name: string
  /** All accepted aliases including the canonical name. */
  aliases: readonly string[]
  /** Computed-style key (e.g. 'backgroundColor'). */
  cssProp: keyof CSSStyleDeclaration
}

export function createColorReader(config: ColorPropertyConfig): PropertyReader {
  return {
    name: config.name,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      const raw = readColorFromLine(line, config.aliases)
      if (raw === null) return null
      return normalizeColor(raw)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const v = window.getComputedStyle(el)[config.cssProp] as string
      return normalizeColor(v)
    },

    fromPanel(nodeId, ctx): PropertyValue {
      const raw = ctx.api.panel.property.getPropertyValue(config.name)
      if (raw === null) return null
      return normalizeColor(raw)
    },

    // Apply to the expected value too, so tests can write `bg: 'white'`
    // against a DOM that reports `rgb(255, 255, 255)`.
    normalize(value): PropertyValue {
      if (value === null) return null
      return normalizeColor(value)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

/**
 * Extract a raw color value (still un-normalised) following one of the
 * configured aliases on the line.
 *
 * Color value forms recognised in source:
 *   - `#abc`, `#aabbcc`, `#aabbccdd` (hex, with optional alpha)
 *   - named colors (single word starting with a letter)
 *   - `rgb(...)` / `rgba(...)`
 *
 * Tokens (`$primary`) and gradients (`grad ...`) are deliberately not
 * handled here — those would return null from normalizeColor anyway.
 */
function readColorFromLine(line: string, aliases: readonly string[]): string | null {
  const aliasGroup = aliases.map(a => a.replace(/-/g, '\\-')).join('|')

  // Hex form (most common)
  const reHex = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+(#[0-9a-fA-F]{3,8})\\s*(?=,|$)`)
  const hexMatch = line.match(reHex)
  if (hexMatch) return hexMatch[1]

  // rgb()/rgba()
  const reRgb = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+(rgba?\\([^)]+\\))\\s*(?=,|$)`)
  const rgbMatch = line.match(reRgb)
  if (rgbMatch) return rgbMatch[1]

  // Named color (single identifier)
  const reNamed = new RegExp(`(?:^|[,\\s])(?:${aliasGroup})\\s+([a-zA-Z]+)\\s*(?=,|$)`)
  const namedMatch = line.match(reNamed)
  if (namedMatch) return namedMatch[1]

  return null
}
