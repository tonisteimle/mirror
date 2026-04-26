/**
 * Property Reader: `text` — text content of an element.
 *
 * In Mirror, text content is the quoted string immediately after the
 * element name and before the first comma:
 *
 *   Text "Hello"
 *   Button "Save", bg $primary
 *   Icon "circle", is 24
 *
 * The reader returns the raw string (without quotes). All three readout
 * dimensions converge on the same value:
 *   - In code:  parsed from the quoted segment after the element name
 *   - In DOM:   element's .textContent (trimmed)
 *   - In Panel: typically exposed as the `text` field in the panel state
 *
 * Note: complex children (interpolations like `Text "Hello $name"`,
 * multi-line text, etc.) are not handled — those are out of scope for
 * the first iteration.
 */

import type { PropertyReader, PropertyValue } from './types'

export const textReader: PropertyReader = {
  name: 'text',

  fromCode(nodeId, ctx): PropertyValue {
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    // Match the first quoted string on the line. Mirror grammar:
    // `Element "text"[, props...]` — the quoted text comes right after
    // the element name (before any comma).
    const m = line.match(/^\s*\w+\s+"((?:[^"\\]|\\.)*)"/)
    return m ? m[1] : null
  },

  fromDom(nodeId, ctx): PropertyValue {
    const el = ctx.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!el) return null
    // textContent gives the full subtree text. For a leaf Text/Button/Icon
    // this matches the source string exactly. For containers with mixed
    // content this would over-collect — out of scope here.
    const t = el.textContent
    return t === null ? null : t.trim()
  },

  fromPanel(nodeId, ctx): PropertyValue {
    // Studio's panel-api doesn't expose text content via getPropertyValue
    // (it's not stored as a regular property — text is the element's
    // child content). Fall back to source: if the element has a quoted
    // text segment, that IS what the panel's text input would show.
    const raw = ctx.api.panel.property.getPropertyValue('text')
    if (raw !== null) return raw
    const node = ctx.sourceMap.getNodeById(nodeId)
    if (!node) return null
    const line = ctx.source.split('\n')[node.position.line - 1]
    if (!line) return null
    const m = line.match(/^\s*\w+\s+"((?:[^"\\]|\\.)*)"/)
    return m ? m[1] : null
  },
}
