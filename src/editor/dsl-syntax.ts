import { EditorView, ViewPlugin, Decoration } from '@codemirror/view'
import type { ViewUpdate, DecorationSet } from '@codemirror/view'
import { StateEffect } from '@codemirror/state'
// Note: RangeSetBuilder could be used for performance optimization if needed
import { colors } from '../theme'

// StateEffect to force decoration refresh
export const forceDecorationRefresh = StateEffect.define<null>()

// =============================================================================
// PERFORMANCE: Line-based decoration cache using LRU strategy
// =============================================================================
//
// Design notes:
// - Module-level cache is intentional for sharing across editor instances
// - Bounded at MAX_CACHE_SIZE entries with automatic LRU eviction (20% batch)
// - DSL lines are typically short (<100 chars), so memory per entry is minimal
// - Cache is cleared when the last editor instance is destroyed
// =============================================================================

type LineDecorations = Array<{ from: number; to: number; class: string }>

// Use text directly as key to avoid hash collisions
// DSL lines are typically short, so memory impact is minimal
const lineDecorationCache = new Map<string, LineDecorations>()
const MAX_CACHE_SIZE = 5000

// H5 fix: Use WeakSet instead of counter for HMR safety
// WeakSet automatically removes entries when EditorView is garbage collected
const activeEditors = new WeakSet<EditorView>()

function getCachedLineDecorations(text: string): LineDecorations | null {
  const cached = lineDecorationCache.get(text)
  if (cached) {
    // Move to end for LRU behavior (Map maintains insertion order)
    lineDecorationCache.delete(text)
    lineDecorationCache.set(text, cached)
  }
  return cached ?? null
}

function setCachedLineDecorations(text: string, decorations: LineDecorations): void {
  // Evict oldest entries if cache is too large (LRU)
  if (lineDecorationCache.size >= MAX_CACHE_SIZE) {
    // Delete first 20% of entries (oldest due to Map insertion order)
    const deleteCount = Math.floor(MAX_CACHE_SIZE * 0.2)
    const iterator = lineDecorationCache.keys()
    for (let i = 0; i < deleteCount; i++) {
      const key = iterator.next().value
      if (key) lineDecorationCache.delete(key)
    }
  }
  lineDecorationCache.set(text, decorations)
}

/**
 * Clear the line decoration cache.
 * Call this when the editor content changes externally (e.g., short/long form toggle).
 */
export function clearDecorationCache(): void {
  lineDecorationCache.clear()
}

/**
 * Request a decoration refresh for a specific editor view.
 * This clears the cache and dispatches a StateEffect to force re-rendering.
 */
export function requestDecorationRefresh(view: EditorView): void {
  lineDecorationCache.clear()
  view.dispatch({
    effects: forceDecorationRefresh.of(null)
  })
}

const editorBg = colors.panel
const activeBg = colors.lineActive

// Custom highlight colors for our DSL
export const dslTheme = EditorView.theme({
  '&': {
    backgroundColor: editorBg,
    color: '#D4D4D4',
    fontSize: '10px',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
    lineHeight: '1.4',
    height: '100%',
  },
  '&.cm-editor': {
    backgroundColor: editorBg,
    height: '100%',
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    backgroundColor: editorBg,
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '12px 12px 12px 0',
    caretColor: '#FFFFFF',
    backgroundColor: editorBg,
  },
  '.cm-line': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftColor: '#FFFFFF',
    borderLeftWidth: '2px',
  },
  // Prevent stale cursor artifacts on rapid typing/deletion
  '.cm-cursorLayer': {
    willChange: 'transform',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#264F78 !important',
  },
  '.cm-gutters': {
    backgroundColor: editorBg,
    color: '#6A737D',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px',
  },
  '.cm-activeLine': {
    backgroundColor: activeBg,
  },
  '.cm-activeLineGutter': {
    backgroundColor: activeBg,
  },
  // Custom classes for our DSL - matching documentation colors
  '.dsl-component': { color: '#5ba8f5' },      // Blue - component names (matches docs)
  '.dsl-component-def': { color: '#5ba8f5' },  // Blue - definitions (matches docs)
  '.dsl-property': { color: '#888' },          // Gray - properties
  '.dsl-number': { color: '#b96' },            // Muted orange - numbers
  '.dsl-string': { color: '#a88' },            // Muted pink - strings
  '.dsl-color': { color: '#b96' },             // Muted orange - colors (same as values)
  '.dsl-comment': { color: '#555', fontStyle: 'italic' },  // Dark gray - comments
  '.dsl-modifier': { color: '#88a' },          // Muted blue - modifiers
  '.dsl-direction': { color: '#888' },         // Gray - directions (same as properties)
  '.dsl-token-ref': { color: '#5ba8f5' },      // Blue - token references (matches docs)
  '.dsl-token-def': { color: '#5ba8f5' },      // Blue - token definitions (matches docs)
  '.dsl-keyword': { color: '#2271c1' },        // Dark blue - keywords (matches docs)
  // Doc-mode syntax highlighting
  '.dsl-doc-keyword': { color: '#5ba8f5', fontWeight: '500' },  // text, playground, doc
  '.dsl-multiline-string': { color: '#a88' },   // Multiline string content (same as regular strings)
  '.dsl-multiline-quote': { color: '#555' },    // Single quote delimiters
  '.dsl-doc-token': { color: '#5ba8f5' },       // $h2, $p, $b, etc.
  '.dsl-doc-bracket': { color: '#888' },        // [] brackets in [link](url)
  '.dsl-doc-link-url': { color: '#666', textDecoration: 'underline' },  // (url) in links
  // brace-syntax highlighting (legacy)
  '.dsl-brace': { color: '#888' },              // { } braces
  '.dsl-colon': { color: '#888' },              // : colons
  '.dsl-comma': { color: '#888' },              // , commas
  '.dsl-state-keyword': { color: '#2271c1' },   // state keyword
  // Lint gutter and diagnostics
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'wavy underline #EF4444',
    textUnderlineOffset: '3px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'none',
    textDecoration: 'wavy underline #F59E0B',
    textUnderlineOffset: '3px',
  },
  '.cm-lint-marker-error': {
    content: '"●"',
    color: '#EF4444',
  },
  '.cm-lint-marker-warning': {
    content: '"●"',
    color: '#F59E0B',
  },
  '.cm-gutter-lint': {
    width: '1.2em',
  },
  '.cm-tooltip-lint': {
    backgroundColor: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
  },
  '.cm-diagnostic': {
    padding: '4px 8px',
    marginLeft: '0',
  },
  '.cm-diagnostic-error': {
    borderLeft: '3px solid #EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  '.cm-diagnostic-warning': {
    borderLeft: '3px solid #F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
}, { dark: true })

// Token patterns - using Unicode property escapes for proper umlaut support
// Both short (pad, bg, col) and long (padding, background, color) forms are supported
const PROPERTIES = /^(w|h|width|height|minw|maxw|minh|maxh|min-width|max-width|min-height|max-height|min|max|full|grow|shrink|padding|pad|p|margin|mar|m|hor-l|hor-cen|hor-r|hor-center|ver-t|ver-cen|ver-b|ver-center|hor|ver|gap|g|cen|center|between|spread|wrap|color|col|c|background|bg|boc|border-color|radius|rad|border|bor|text-size|font-size|fs|ts|icon-size|is|icon-weight|iw|icon-color|ic|size|weight|font|line|align|text-align|italic|underline|lowercase|uppercase|truncate|icon|src|alt|fit|shadow|opacity|opa|o|cursor|pointer|z|hidden|visible|disabled|horizontal|vertical|horizontal-left|horizontal-center|horizontal-right|vertical-top|vertical-center|vertical-bottom|left|right|top|bottom|scroll|scroll-ver|scroll-hor|scroll-vertical|scroll-horizontal|scroll-both|clip|grid|stack|stacked|rotate|rot|translate|hover-background|hover-bg|hover-color|hover-col|hover-opacity|hover-opa|hover-border|hover-bor|hover-border-color|hover-boc|hover-radius|hover-rad|hover-scale|material|lucide|fill|solid|dashed|dotted|hug|segments|href|placeholder|escape|enter|tab|space|arrow-up|arrow-down|arrow-left|arrow-right|backspace|delete|home|end|bold|on|off|expanded|collapsed|valid|invalid|default|active|inactive|hover|focus)\b/
const DIRECTIONS = /^([lrud](-[lrud])*|tl|tr|bl|br|top-left|top-right|bottom-left|bottom-right)\b/
const COMPONENT_DEF = /^[\p{Lu}][\p{L}\p{N}_-]*:/u
const COMPONENT_NAME = /^[\p{L}_][\p{L}\p{N}_-]*/u
const NUMBER = /^[0-9]+/
const STRING = /^"[^"]*"/
const COLOR = /^#[0-9a-fA-F]{3,8}/
const COMMENT = /^\/\/.*/
const MODIFIER = /^-[\p{L}][\p{L}\p{N}_-]*/u
const TOKEN_REF = /^\$[\p{L}][\p{L}\p{N}_-]*/u
const TOKEN_DEF = /^:[\p{L}][\p{L}\p{N}_-]*/u
const KEYWORD = /^(from|after|before|state|if|then|else|each|in|data|where|named|as|show|hide|toggle|open|close|page|animate|onclick|onhover|onchange|oninput|onload|onfocus|onblur|onkeydown|onkeyup|debounce|delay|highlight|select|deselect|clear-selection|filter|change|activate|deactivate|deactivate-siblings|toggle-state|assign|to|validate|reset|focus|alert|call|self|next|prev|first|last|first-empty|highlighted|selected|self-and-before|all|none|below|above|fade|scale|slide-up|slide-down|slide-left|slide-right|spin|pulse|bounce)\b/
// Doc-mode patterns
const DOC_KEYWORD = /^(text|playground|doc)\b/
const DOC_TOKEN = /^\$[\p{L}][\p{L}\p{N}_-]*/u
// Note: DOC_BRACKET_OPEN and DOC_BRACKET_CLOSE are handled inline in tokenizeDocContent
const DOC_LINK_URL = /^\([^)]*\)/

interface Token {
  from: number
  to: number
  class: string
}

// PERF: Tokenize line with relative positions (for caching)
function tokenizeLineRelative(line: string): Array<{ from: number; to: number; class: string }> {
  // Check cache first
  const cached = getCachedLineDecorations(line)
  if (cached) return cached

  const tokens: Array<{ from: number; to: number; class: string }> = []
  let pos = 0

  // Skip leading whitespace
  const indentMatch = line.match(/^\s*/)
  if (indentMatch) {
    pos = indentMatch[0].length
  }

  while (pos < line.length) {
    const rest = line.slice(pos)

    // Skip whitespace
    const wsMatch = rest.match(/^\s+/)
    if (wsMatch) {
      pos += wsMatch[0].length
      continue
    }

    // Comment
    const commentMatch = rest.match(COMMENT)
    if (commentMatch) {
      tokens.push({
        from: pos,
        to: pos + commentMatch[0].length,
        class: 'dsl-comment'
      })
      break // Comment consumes rest of line
    }

    // Component definition (starts with uppercase, ends with :)
    const compDefMatch = rest.match(COMPONENT_DEF)
    if (compDefMatch) {
      tokens.push({
        from: pos,
        to: pos + compDefMatch[0].length - 1, // exclude :
        class: 'dsl-component-def'
      })
      pos += compDefMatch[0].length
      continue
    }

    // String
    const stringMatch = rest.match(STRING)
    if (stringMatch) {
      tokens.push({
        from: pos,
        to: pos + stringMatch[0].length,
        class: 'dsl-string'
      })
      pos += stringMatch[0].length
      continue
    }

    // Color (before number to catch #-prefixed values)
    const colorMatch = rest.match(COLOR)
    if (colorMatch) {
      tokens.push({
        from: pos,
        to: pos + colorMatch[0].length,
        class: 'dsl-color'
      })
      pos += colorMatch[0].length
      continue
    }

    // Token definition :name
    const tokenDefMatch = rest.match(TOKEN_DEF)
    if (tokenDefMatch) {
      tokens.push({
        from: pos,
        to: pos + tokenDefMatch[0].length,
        class: 'dsl-token-def'
      })
      pos += tokenDefMatch[0].length
      continue
    }

    // Token reference $name
    const tokenRefMatch = rest.match(TOKEN_REF)
    if (tokenRefMatch) {
      tokens.push({
        from: pos,
        to: pos + tokenRefMatch[0].length,
        class: 'dsl-token-ref'
      })
      pos += tokenRefMatch[0].length
      continue
    }

    // Modifier -name
    const modifierMatch = rest.match(MODIFIER)
    if (modifierMatch) {
      tokens.push({
        from: pos,
        to: pos + modifierMatch[0].length,
        class: 'dsl-modifier'
      })
      pos += modifierMatch[0].length
      continue
    }

    // Number
    const numberMatch = rest.match(NUMBER)
    if (numberMatch) {
      tokens.push({
        from: pos,
        to: pos + numberMatch[0].length,
        class: 'dsl-number'
      })
      pos += numberMatch[0].length
      continue
    }

    // Direction (l, r, u, d) - check before property
    const directionMatch = rest.match(DIRECTIONS)
    if (directionMatch) {
      tokens.push({
        from: pos,
        to: pos + directionMatch[0].length,
        class: 'dsl-direction'
      })
      pos += directionMatch[0].length
      continue
    }

    // Keyword (from, after, before) - check before property and component name
    const keywordMatch = rest.match(KEYWORD)
    if (keywordMatch) {
      tokens.push({
        from: pos,
        to: pos + keywordMatch[0].length,
        class: 'dsl-keyword'
      })
      pos += keywordMatch[0].length
      continue
    }

    // Property - check BEFORE doc-keywords to catch text-size before text
    const propertyMatch = rest.match(PROPERTIES)
    if (propertyMatch) {
      tokens.push({
        from: pos,
        to: pos + propertyMatch[0].length,
        class: 'dsl-property'
      })
      pos += propertyMatch[0].length
      continue
    }

    // Doc-mode keywords (text, playground, doc) - check AFTER properties
    const docKeywordMatch = rest.match(DOC_KEYWORD)
    if (docKeywordMatch) {
      tokens.push({
        from: pos,
        to: pos + docKeywordMatch[0].length,
        class: 'dsl-doc-keyword'
      })
      pos += docKeywordMatch[0].length
      continue
    }

    // Component name (any identifier starting with letter)
    const compNameMatch = rest.match(COMPONENT_NAME)
    if (compNameMatch) {
      tokens.push({
        from: pos,
        to: pos + compNameMatch[0].length,
        class: 'dsl-component'
      })
      pos += compNameMatch[0].length
      continue
    }

    // brace-syntax: Braces (legacy)
    if (rest[0] === '{' || rest[0] === '}') {
      tokens.push({
        from: pos,
        to: pos + 1,
        class: 'dsl-brace'
      })
      pos++
      continue
    }

    // brace-syntax: Colon (inside blocks, after properties)
    if (rest[0] === ':') {
      tokens.push({
        from: pos,
        to: pos + 1,
        class: 'dsl-colon'
      })
      pos++
      continue
    }

    // brace-syntax: Comma
    if (rest[0] === ',') {
      tokens.push({
        from: pos,
        to: pos + 1,
        class: 'dsl-comma'
      })
      pos++
      continue
    }

    // Skip unknown character
    pos++
  }

  // Cache the result
  setCachedLineDecorations(line, tokens)
  return tokens
}

/**
 * Tokenize a line with absolute positions by applying an offset.
 */
function tokenizeLine(line: string, offset: number): Token[] {
  const relativeTokens = tokenizeLineRelative(line)
  return relativeTokens.map(t => ({
    from: t.from + offset,
    to: t.to + offset,
    class: t.class
  }))
}

/**
 * Tokenize content inside a multiline string (doc-mode content)
 * Handles $token (block tokens like $h2, $p) and [text](url) link syntax
 */
function tokenizeDocContent(content: string, contentStart: number): Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < content.length) {
    const rest = content.slice(pos)

    // Doc token: $name (e.g., $h2, $p, $lead)
    const tokenMatch = rest.match(DOC_TOKEN)
    if (tokenMatch) {
      const tokenName = tokenMatch[0]
      tokens.push({
        from: contentStart + pos,
        to: contentStart + pos + tokenName.length,
        class: 'dsl-doc-token'
      })
      pos += tokenName.length

      // Check for bracket content: [text]
      const afterToken = content.slice(pos)
      const bracketMatch = afterToken.match(/^\[([^\]]*)\]/)
      if (bracketMatch) {
        // Opening bracket
        tokens.push({
          from: contentStart + pos,
          to: contentStart + pos + 1,
          class: 'dsl-doc-bracket'
        })
        // Content inside brackets (keep as multiline-string color)
        if (bracketMatch[1].length > 0) {
          tokens.push({
            from: contentStart + pos + 1,
            to: contentStart + pos + 1 + bracketMatch[1].length,
            class: 'dsl-multiline-string'
          })
        }
        // Closing bracket
        tokens.push({
          from: contentStart + pos + bracketMatch[0].length - 1,
          to: contentStart + pos + bracketMatch[0].length,
          class: 'dsl-doc-bracket'
        })
        pos += bracketMatch[0].length

        // Check for link URL: (url)
        const afterBracket = content.slice(pos)
        const urlMatch = afterBracket.match(DOC_LINK_URL)
        if (urlMatch) {
          tokens.push({
            from: contentStart + pos,
            to: contentStart + pos + urlMatch[0].length,
            class: 'dsl-doc-link-url'
          })
          pos += urlMatch[0].length
        }
      }
      continue
    }

    // Skip to next character
    pos++
  }

  return tokens
}

/**
 * Find all multiline strings in the document
 * Returns array of { from, to, contentFrom, contentTo }
 */
function findMultilineStrings(text: string, offset: number): Array<{
  from: number
  to: number
  contentFrom: number
  contentTo: number
}> {
  const strings: Array<{ from: number; to: number; contentFrom: number; contentTo: number }> = []
  let pos = 0

  while (pos < text.length) {
    // Look for opening single quote (not escaped)
    if (text[pos] === "'" && (pos === 0 || text[pos - 1] !== '\\')) {
      const startPos = pos
      pos++ // skip opening quote
      const contentStart = pos

      // Find closing quote
      while (pos < text.length) {
        if (text[pos] === "'" && text[pos - 1] !== '\\') {
          strings.push({
            from: offset + startPos,
            to: offset + pos + 1,
            contentFrom: offset + contentStart,
            contentTo: offset + pos
          })
          pos++ // skip closing quote
          break
        }
        pos++
      }
      continue
    }
    pos++
  }

  return strings
}

// ViewPlugin for syntax highlighting
// Builds decorations synchronously to avoid visible flashing during typing
export const dslHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  private view: EditorView
  private pendingUpdate: number | null = null

  constructor(view: EditorView) {
    this.view = view
    activeEditors.add(view)
    this.decorations = this.buildDecorations(view)
  }

  destroy() {
    if (this.pendingUpdate !== null) {
      cancelAnimationFrame(this.pendingUpdate)
    }
    activeEditors.delete(this.view)
    // Note: WeakSet doesn't have a size property, so we can't detect "last editor".
    // Cache cleanup happens via LRU eviction in setCachedLineDecorations.
    // For explicit cleanup, call clearDecorationCache() externally.
  }

  update(update: ViewUpdate) {
    // Check if we need to force refresh (e.g., after short/long toggle)
    const needsRefresh = update.transactions.some(tr =>
      tr.effects.some(e => e.is(forceDecorationRefresh))
    )

    // Force refresh happens immediately
    if (needsRefresh) {
      if (this.pendingUpdate !== null) {
        cancelAnimationFrame(this.pendingUpdate)
        this.pendingUpdate = null
      }
      this.decorations = this.buildDecorations(update.view)
      return
    }

    // Rebuild decorations immediately on doc/viewport change
    // Keeping old decorations while typing causes issues with stale positions,
    // but clearing them causes visible flashing. Build synchronously instead.
    if (update.docChanged || update.viewportChanged) {
      if (this.pendingUpdate !== null) {
        cancelAnimationFrame(this.pendingUpdate)
        this.pendingUpdate = null
      }
      // Build decorations synchronously to avoid flashing
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const decorations: { from: number; to: number; decoration: Decoration }[] = []

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to)

      // First, find all multiline strings to know which regions to skip
      const multilineStrings = findMultilineStrings(text, from)

      // PERF: Build a sorted array once for binary search - O(1) lookup instead of O(n)
      const sortedRanges = multilineStrings
        .map(ms => ({ from: ms.from, to: ms.to }))
        .sort((a, b) => a.from - b.from)

      // PERF: Binary search to check if position is inside a multiline string
      const isInsideMultiline = (pos: number): boolean => {
        let left = 0, right = sortedRanges.length - 1
        while (left <= right) {
          const mid = (left + right) >> 1
          const range = sortedRanges[mid]
          if (pos >= range.from && pos < range.to) return true
          if (pos < range.from) right = mid - 1
          else left = mid + 1
        }
        return false
      }

      // Highlight multiline strings
      for (const ms of multilineStrings) {
        // Opening quote
        decorations.push({
          from: ms.from,
          to: ms.from + 1,
          decoration: Decoration.mark({ class: 'dsl-multiline-quote' })
        })

        // Content (as base multiline-string color)
        if (ms.contentTo > ms.contentFrom) {
          decorations.push({
            from: ms.contentFrom,
            to: ms.contentTo,
            decoration: Decoration.mark({ class: 'dsl-multiline-string' })
          })

          // Tokenize doc content for additional highlighting
          const content = view.state.doc.sliceString(ms.contentFrom, ms.contentTo)
          const docTokens = tokenizeDocContent(content, ms.contentFrom)
          for (const token of docTokens) {
            decorations.push({
              from: token.from,
              to: token.to,
              decoration: Decoration.mark({ class: token.class })
            })
          }
        }

        // Closing quote
        decorations.push({
          from: ms.to - 1,
          to: ms.to,
          decoration: Decoration.mark({ class: 'dsl-multiline-quote' })
        })
      }

      // PERF: Find ranges overlapping with a line segment efficiently
      const findOverlappingRanges = (lineFrom: number, lineTo: number) => {
        const result: typeof multilineStrings = []
        for (const ms of multilineStrings) {
          if (ms.to <= lineFrom) continue  // Range is before line
          if (ms.from >= lineTo) break     // Ranges are sorted, no more overlaps
          result.push(ms)
        }
        return result
      }

      // Process regular lines (outside multiline strings)
      const lines = text.split('\n')
      let lineStart = from

      for (const line of lines) {
        const lineEnd = lineStart + line.length

        // PERF: Quick check - if line start is inside multiline, check if entire line is contained
        const startInside = isInsideMultiline(lineStart)
        const endInside = isInsideMultiline(lineEnd > lineStart ? lineEnd - 1 : lineEnd)

        // Skip lines entirely inside a multiline string
        if (!(startInside && endInside)) {
          // Find the part of the line that's outside multiline strings
          const overlapping = findOverlappingRanges(lineStart, lineEnd)
          let segmentStart = lineStart

          for (const ms of overlapping) {
            if (ms.from > segmentStart && ms.from < lineEnd) {
              // Tokenize segment before multiline string
              const segment = view.state.doc.sliceString(segmentStart, ms.from)
              const segmentTokens = tokenizeLine(segment, segmentStart)
              for (const token of segmentTokens) {
                decorations.push({
                  from: token.from,
                  to: token.to,
                  decoration: Decoration.mark({ class: token.class })
                })
              }
              segmentStart = ms.to
            }
          }

          // Tokenize remaining segment after last multiline string
          if (segmentStart < lineEnd && !isInsideMultiline(segmentStart)) {
            const segment = view.state.doc.sliceString(segmentStart, lineEnd)
            const segmentTokens = tokenizeLine(segment, segmentStart)
            for (const token of segmentTokens) {
              decorations.push({
                from: token.from,
                to: token.to,
                decoration: Decoration.mark({ class: token.class })
              })
            }
          }
        }

        lineStart += line.length + 1 // +1 for newline
      }
    }

    return Decoration.set(
      decorations
        .sort((a, b) => a.from - b.from)
        .map(d => d.decoration.range(d.from, d.to))
    )
  }
}, {
  decorations: v => v.decorations
})
