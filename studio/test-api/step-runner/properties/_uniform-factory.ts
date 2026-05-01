/**
 * Factory: uniform spacing readers (`pad`, `mar`).
 *
 * "Uniform" means a single value that applies to all four sides. Mirror
 * accepts the canonical (`pad N` / `mar N`) plus aliases (`padding` /
 * `margin` / `p` / `m`).
 *
 *   - In code:  matches `pad N` / `mar N` (single-value form only)
 *   - In DOM:   reads the four computed sides; returns the value if all
 *               agree, otherwise null (the rendered state is not uniform,
 *               so the uniform property is effectively unset).
 *   - In Panel: delegates to the panel's `pad` / `mar` lookup.
 */

import type { PropertyReader, PropertyValue } from './types'

export type UniformKind = 'pad' | 'mar'

interface UniformInfo {
  /** Canonical Mirror property name (e.g. 'pad'). */
  prop: 'pad' | 'mar'
  /** All accepted aliases including the canonical name. */
  aliases: readonly string[]
  /** Tuple of the four computed-style keys, in any order. */
  cssProps: readonly [
    'paddingTop' | 'marginTop',
    'paddingRight' | 'marginRight',
    'paddingBottom' | 'marginBottom',
    'paddingLeft' | 'marginLeft',
  ]
}

const UNIFORM_INFO: Record<UniformKind, UniformInfo> = {
  pad: {
    prop: 'pad',
    aliases: ['pad', 'padding', 'p'],
    cssProps: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  },
  mar: {
    prop: 'mar',
    aliases: ['mar', 'margin', 'm'],
    cssProps: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  },
}

export function createUniformReader(kind: UniformKind): PropertyReader {
  const info = UNIFORM_INFO[kind]
  return {
    name: info.prop,

    fromCode(nodeId, ctx): PropertyValue {
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readUniformFromLine(line, info)
    },

    fromDom(nodeId, ctx): PropertyValue {
      const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) return null
      const s = window.getComputedStyle(el)
      const values = info.cssProps.map(p => pxToInt(s[p]))
      if (values.some(v => v === null)) return null
      const first = values[0] as number
      if (!values.every(v => v === first)) return null
      return String(first)
    },

    fromPanel(nodeId, ctx): PropertyValue {
      // Panel UI state is per-selection. See _color-factory for the
      // full rationale; behaviour is: live panel for the selected node,
      // source-parsed value for others.
      const selectedId = ctx.api.studio.getSelection?.() ?? null
      if (selectedId === nodeId) {
        const raw = ctx.api.panel.property.getPropertyValue(info.prop)
        if (raw !== null) return raw
      }
      const node = ctx.sourceMap.getNodeById(nodeId)
      if (!node) return null
      const line = ctx.source.split('\n')[node.position.line - 1]
      if (!line) return null
      return readUniformFromLine(line, info)
    },
  }
}

// =============================================================================
// Source parsing
// =============================================================================

function readUniformFromLine(line: string, info: UniformInfo): PropertyValue {
  // Match `<alias> N` (single value), preceded by `^`, `,`, or whitespace,
  // followed by `,` or end-of-line. Multi-value forms are not uniform —
  // only return when there's exactly one number.
  for (const alias of info.aliases) {
    const re = new RegExp(`(?:^|[,\\s])${alias}\\s+(\\d+)\\s*(?=,|$)`)
    const m = line.match(re)
    if (m) return m[1]
  }
  return null
}

function pxToInt(v: string): number | null {
  if (!v) return null
  const m = v.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!m) return null
  return Math.round(parseFloat(m[1]))
}
