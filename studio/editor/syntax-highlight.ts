/**
 * Mirror DSL Syntax Highlight Extension
 *
 * CodeMirror extension that adds regex-based syntax highlighting for
 * the Mirror DSL: comments, strings, hex colors, numbers, keywords,
 * states, events, properties, actions, components, and bindings.
 *
 * Token classes are styled in studio/styles.css (`.mir-comment`,
 * `.mir-string`, `.mir-hex`, …). This module emits Decoration marks
 * and rebuilds them on every doc/viewport change.
 *
 * Usage:
 *   import { mirrorHighlight } from './syntax-highlight'
 *   EditorView extensions: [...others, mirrorHighlight]
 */

import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

interface TokenPattern {
  regex: RegExp
  class: string
}

const patterns: TokenPattern[] = [
  { regex: /\/\/.*$/gm, class: 'mir-comment' },
  { regex: /"[^"]*"/g, class: 'mir-string' },
  { regex: /#[0-9A-Fa-f]{3,8}\b/g, class: 'mir-hex' },
  { regex: /\b\d+(\.\d+)?(%|px|rem|em)?\b/g, class: 'mir-number' },
  { regex: /\b(as|extends|named|each|in|if|else|where|then|data)\b/g, class: 'mir-keyword' },
  {
    regex: /\b(hover|focus|active|disabled|filled|state|selected|highlighted|on|off)\b/g,
    class: 'mir-state',
  },
  {
    regex: /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|keys)\b/g,
    class: 'mir-event',
  },
  {
    regex:
      /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|min|max|animate|font-size)\b/g,
    class: 'mir-property',
  },
  {
    regex: /\b(show|hide|toggle|select|highlight|activate|deactivate|call|open|close|page)\b/g,
    class: 'mir-action',
  },
  // Component identifiers only in valid component positions, NOT every
  // capitalized word — otherwise data values like `Willkommen` or
  // `Live Preview` inside a table-data block paint blue and look like
  // component calls. Four narrow patterns cover the real call sites:
  //   - Start of an (indented) line: `Frame ...`, `Card`, `Btn "Save"`
  //   - After `as ` (inheritance): `Btn as Button`
  //   - After `name ` (Frame naming): `Frame name HomeView`
  //   - Inside parens (function args): `navigate(WelcomeDetail)`
  { regex: /(?<=^[ \t]*)[A-Z][a-zA-Z0-9_]*/gm, class: 'mir-component' },
  { regex: /(?<=\bas )[A-Z][a-zA-Z0-9_]*/g, class: 'mir-component' },
  { regex: /(?<=\bname )[A-Z][a-zA-Z0-9_]*/g, class: 'mir-component' },
  { regex: /(?<=\()[A-Z][a-zA-Z0-9_]*/g, class: 'mir-component' },
  { regex: /\$[a-zA-Z][a-zA-Z0-9.-]*/g, class: 'mir-binding' },
]

const decorations: Record<string, Decoration> = {}
patterns.forEach(p => {
  decorations[p.class] = Decoration.mark({ class: p.class })
})

interface Match {
  from: number
  to: number
  class: string
}

function tokenize(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()
  const matches: Match[] = []

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        from: match.index,
        to: match.index + match[0].length,
        class: pattern.class,
      })
    }
  }

  // First-match-wins: sort by position and drop overlaps.
  matches.sort((a, b) => a.from - b.from)
  let lastEnd = 0
  for (const m of matches) {
    if (m.from >= lastEnd) {
      builder.add(m.from, m.to, decorations[m.class])
      lastEnd = m.to
    }
  }

  return builder.finish()
}

export const mirrorHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = tokenize(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = tokenize(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)
