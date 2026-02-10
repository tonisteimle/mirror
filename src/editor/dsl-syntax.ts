import { EditorView, ViewPlugin, Decoration } from '@codemirror/view'
import type { ViewUpdate, DecorationSet } from '@codemirror/view'
import { colors } from '../theme'

const editorBg = colors.panel
const activeBg = colors.lineActive

// Custom highlight colors for our DSL
export const dslTheme = EditorView.theme({
  '&': {
    backgroundColor: editorBg,
    color: '#D4D4D4',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
    lineHeight: '1.4',
  },
  '&.cm-editor': {
    backgroundColor: editorBg,
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    backgroundColor: editorBg,
  },
  '.cm-content': {
    padding: '12px',
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
  // Custom classes for our DSL
  '.dsl-component': { color: '#4EC9B0' },      // Teal - component names
  '.dsl-component-def': { color: '#DCDCAA' },  // Yellow - component definitions
  '.dsl-property': { color: '#9CDCFE' },       // Light blue - properties
  '.dsl-number': { color: '#B5CEA8' },         // Green - numbers
  '.dsl-string': { color: '#CE9178' },         // Orange - strings
  '.dsl-color': { color: '#C586C0' },          // Purple - colors
  '.dsl-comment': { color: '#6A9955', fontStyle: 'italic' },  // Green - comments
  '.dsl-modifier': { color: '#C586C0' },       // Purple - modifiers
  '.dsl-direction': { color: '#569CD6' },      // Blue - directions
  '.dsl-token-ref': { color: '#4FC1FF' },      // Cyan - token references
  '.dsl-token-def': { color: '#4FC1FF' },      // Cyan - token definitions
  '.dsl-keyword': { color: '#C586C0' },        // Purple - keywords (from, after, before)
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

// Token patterns
const PROPERTIES = /^(w|h|minw|maxw|minh|maxh|full|grow|pad|mar|hor-l|hor-cen|hor-r|ver-t|ver-cen|ver-b|hor|ver|gap|cen|between|wrap|col|bg|boc|rad|border|size|weight|font|line|align|italic|underline|lowercase|uppercase|truncate|icon|src|alt|fit|shadow|opacity|cursor|pointer|z)\b/
const DIRECTIONS = /^[lrud](-[lrud])*\b/
const COMPONENT_DEF = /^[A-Z][a-zA-Z0-9_]*:/
const COMPONENT_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*/
const NUMBER = /^[0-9]+/
const STRING = /^"[^"]*"/
const COLOR = /^#[0-9a-fA-F]{3,8}/
const COMMENT = /^\/\/.*/
const MODIFIER = /^-[a-zA-Z][a-zA-Z0-9_-]*/
const TOKEN_REF = /^\$[a-zA-Z][a-zA-Z0-9_]*/
const TOKEN_DEF = /^:[a-zA-Z][a-zA-Z0-9_]*/
const KEYWORD = /^(from|after|before)\b/

interface Token {
  from: number
  to: number
  class: string
}

function tokenizeLine(line: string, lineStart: number): Token[] {
  const tokens: Token[] = []
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
        from: lineStart + pos,
        to: lineStart + pos + commentMatch[0].length,
        class: 'dsl-comment'
      })
      break // Comment consumes rest of line
    }

    // Component definition (starts with uppercase, ends with :)
    const compDefMatch = rest.match(COMPONENT_DEF)
    if (compDefMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + compDefMatch[0].length - 1, // exclude :
        class: 'dsl-component-def'
      })
      pos += compDefMatch[0].length
      continue
    }

    // String
    const stringMatch = rest.match(STRING)
    if (stringMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + stringMatch[0].length,
        class: 'dsl-string'
      })
      pos += stringMatch[0].length
      continue
    }

    // Color (before number to catch #-prefixed values)
    const colorMatch = rest.match(COLOR)
    if (colorMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + colorMatch[0].length,
        class: 'dsl-color'
      })
      pos += colorMatch[0].length
      continue
    }

    // Token definition :name
    const tokenDefMatch = rest.match(TOKEN_DEF)
    if (tokenDefMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + tokenDefMatch[0].length,
        class: 'dsl-token-def'
      })
      pos += tokenDefMatch[0].length
      continue
    }

    // Token reference $name
    const tokenRefMatch = rest.match(TOKEN_REF)
    if (tokenRefMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + tokenRefMatch[0].length,
        class: 'dsl-token-ref'
      })
      pos += tokenRefMatch[0].length
      continue
    }

    // Modifier -name
    const modifierMatch = rest.match(MODIFIER)
    if (modifierMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + modifierMatch[0].length,
        class: 'dsl-modifier'
      })
      pos += modifierMatch[0].length
      continue
    }

    // Number
    const numberMatch = rest.match(NUMBER)
    if (numberMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + numberMatch[0].length,
        class: 'dsl-number'
      })
      pos += numberMatch[0].length
      continue
    }

    // Direction (l, r, u, d) - check before property
    const directionMatch = rest.match(DIRECTIONS)
    if (directionMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + directionMatch[0].length,
        class: 'dsl-direction'
      })
      pos += directionMatch[0].length
      continue
    }

    // Keyword (from, after, before) - check before property and component name
    const keywordMatch = rest.match(KEYWORD)
    if (keywordMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + keywordMatch[0].length,
        class: 'dsl-keyword'
      })
      pos += keywordMatch[0].length
      continue
    }

    // Property
    const propertyMatch = rest.match(PROPERTIES)
    if (propertyMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + propertyMatch[0].length,
        class: 'dsl-property'
      })
      pos += propertyMatch[0].length
      continue
    }

    // Component name (any identifier starting with letter)
    const compNameMatch = rest.match(COMPONENT_NAME)
    if (compNameMatch) {
      tokens.push({
        from: lineStart + pos,
        to: lineStart + pos + compNameMatch[0].length,
        class: 'dsl-component'
      })
      pos += compNameMatch[0].length
      continue
    }

    // Skip unknown character
    pos++
  }

  return tokens
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
      const lines = text.split('\n')
      let lineStart = from

      for (const line of lines) {
        const tokens = tokenizeLine(line, lineStart)
        for (const token of tokens) {
          decorations.push({
            from: token.from,
            to: token.to,
            decoration: Decoration.mark({ class: token.class })
          })
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
