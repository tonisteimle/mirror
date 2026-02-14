import { EditorView, ViewPlugin, Decoration } from '@codemirror/view'
import type { ViewUpdate, DecorationSet } from '@codemirror/view'
// Note: RangeSetBuilder could be used for performance optimization if needed
import { colors } from '../theme'

// =============================================================================
// PERFORMANCE: Line-based decoration cache
// =============================================================================

interface LineCacheEntry {
  text: string
  decorations: Array<{ from: number; to: number; class: string }>
}

// Global cache for line decorations - keyed by line content hash
const lineDecorationCache = new Map<string, LineCacheEntry['decorations']>()
const MAX_CACHE_SIZE = 5000  // Limit cache growth

function getLineHash(text: string): string {
  // Simple but fast hash for line content
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

function getCachedLineDecorations(text: string): LineCacheEntry['decorations'] | null {
  return lineDecorationCache.get(getLineHash(text)) ?? null
}

function setCachedLineDecorations(text: string, decorations: LineCacheEntry['decorations']): void {
  // Evict old entries if cache is too large
  if (lineDecorationCache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(lineDecorationCache.keys()).slice(0, 1000)
    for (const key of keysToDelete) {
      lineDecorationCache.delete(key)
    }
  }
  lineDecorationCache.set(getLineHash(text), decorations)
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
  '.dsl-doc-bracket': { color: '#888' },        // [] brackets in $b[text]
  '.dsl-doc-link-url': { color: '#666', textDecoration: 'underline' },  // (url) in links
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
const PROPERTIES = /^(w|h|minw|maxw|minh|maxh|full|grow|padding|pad|margin|mar|hor-l|hor-cen|hor-r|ver-t|ver-cen|ver-b|hor|ver|gap|cen|between|wrap|color|col|boc|radius|rad|border|size|weight|font|line|align|italic|underline|lowercase|uppercase|truncate|icon|src|alt|fit|shadow|opacity|opa|cursor|pointer|z|hidden|visible)\b/
const DIRECTIONS = /^[lrud](-[lrud])*\b/
const COMPONENT_DEF = /^[\p{Lu}][\p{L}\p{N}_]*:/u
const COMPONENT_NAME = /^[\p{L}_][\p{L}\p{N}_]*/u
const NUMBER = /^[0-9]+/
const STRING = /^"[^"]*"/
const COLOR = /^#[0-9a-fA-F]{3,8}/
const COMMENT = /^\/\/.*/
const MODIFIER = /^-[\p{L}][\p{L}\p{N}_-]*/u
const TOKEN_REF = /^\$[\p{L}][\p{L}\p{N}_-]*/u
const TOKEN_DEF = /^:[\p{L}][\p{L}\p{N}_-]*/u
const KEYWORD = /^(from|after|before)\b/
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

    // Doc-mode keywords (text, playground, doc) - check before property
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

    // Property
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
 * Handles $token, $token[text], $link[text](url) syntax
 */
function tokenizeDocContent(content: string, contentStart: number): Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < content.length) {
    const rest = content.slice(pos)

    // Doc token: $name or $name[text] or $link[text](url)
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
export const dslHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
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
