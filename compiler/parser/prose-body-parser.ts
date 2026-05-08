/**
 * Prose-Body Parser
 *
 * When a Frame (Instance or ComponentDefinition) carries the `prose`
 * property, its indented body is parsed as a Markdown subset instead of
 * normal Mirror syntax. Each non-blank source line is classified and
 * synthesized into a normal Mirror Instance (BodyTxt, DashItem, H2/3/4,
 * OffenePunkt, …) so that downstream IR/codegen sees no prose-specific
 * nodes.
 *
 * Why we read raw source text instead of tokens
 * ---------------------------------------------
 * Inside a prose body the user writes ordinary German prose — umlauts,
 * em-dashes, guillemets — none of which the Mirror lexer accepts as bare
 * tokens. The lexer keeps tokenizing past `unknown-character` errors, but
 * the surviving tokens carry no useful content for prose. So we ignore
 * the tokens entirely, advance the cursor by line numbers, and recover
 * each line's content directly from `ctx.source`.
 *
 * The body's INDENT was consumed by the caller; we consume up to (and
 * including) the matching DEDENT and synthesize children onto the parent.
 *
 * Hierarchy rules (from docs/domain-dsl-roadmap.md "Prosa-Mode"):
 *
 *   1. Prosa ist flach — headings, paragraphs and bullets are siblings,
 *      not parent/child. (Standard Markdown AST shape.)
 *   2. Bullets nest via 2-space indentation (Standard Markdown rule).
 *   3. Echte DOM-Container = normale Mirror-Zeile — within a prose
 *      body, this is currently NOT supported (v1 limitation). To get a
 *      real container, end the prose frame and use a sibling.
 *
 * Paragraph break rule: a blank source line ends a paragraph. Single
 * line breaks within a paragraph are joined with a space (Markdown
 * convention), differing from Mirror's default rule outside of prose.
 */

import type { Token } from './lexer'
import type { Instance, ComponentDefinition, Property } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'

const U = ParserUtils

/* ----------------------------------------------------------- public types */

/**
 * Maps prose constructs to Mirror component names. v1 hardcodes sensible
 * defaults; later the user-declared `prose-style:` block overrides them.
 */
export interface ProseStyleMap {
  paragraph: string
  bullet: string
  bulletText: string
  bulletMark: string
  numbered: string
  numberedText: string
  numberedNum: string
  heading1: string
  heading2: string
  heading3: string
}

export const DEFAULT_PROSE_STYLE: ProseStyleMap = {
  paragraph: 'BodyTxt',
  bullet: 'DashItem',
  bulletText: 'BodyTxtCompact',
  bulletMark: '—',
  numbered: 'OffenePunkt',
  numberedText: 'BodyTxtCompact',
  numberedNum: 'OffeneNum',
  heading1: 'H2',
  heading2: 'H3',
  heading3: 'H4',
}

export interface ProseRange {
  startLine: number
  endLine: number
}

export interface ProseBodyCallbacks {
  /** Allocate a fresh AST node id (parser-class-scoped). */
  generateNodeId(): string
  /** Look up a component definition by name (for prose-style propagation). */
  getComponentDef?(name: string): ComponentDefinition | undefined
  /**
   * Cross-file prose-mode prelude: returns true when `name` is known to
   * be a prose-mode component even though its definition lives in
   * another file (and therefore isn't in the parser's local component
   * registry). Used by the validator's project mode so a component
   * like `Article as Frame: prose` defined in `components.com` still
   * triggers prose-body parsing in `app.mir`.
   */
  isProseComponent?(name: string): boolean
  /** Record a parse error tied to the prose body. */
  reportError(message: string, line: number, column: number): void
}

/* ----------------------------------------------------------- prose detect */

/**
 * Returns true when `properties` carries a `prose` boolean.
 *
 * The inline-property parser (used on element-definition lines like
 * `Article as Frame: gap 18, prose`) stores boolean properties with
 * an empty `values` array. The body-parser path stores them as
 * `[true]`. Both shapes count as "prose is set".
 */
export function hasProseProperty(properties: Property[]): boolean {
  return properties.some(p => p.name === 'prose' && (p.values.length === 0 || p.values[0] === true))
}

/**
 * Get the active prose-style map. v1: returns hardcoded defaults. Later
 * stages will look up a user-declared `prose-style:` token, optionally
 * keyed by the prose mode variant (e.g. `prose dense`).
 */
export function resolveProseStyle(_variant?: string): ProseStyleMap {
  return DEFAULT_PROSE_STYLE
}

/* --------------------------------------------------------------- helpers */

interface ProseLine {
  /** Raw source content, with leading whitespace trimmed. */
  text: string
  /** Indent in spaces (relative to start of line). */
  indent: number
  /** 1-indexed source line number. */
  line: number
}

interface Paragraph {
  kind: 'paragraph'
  text: string
  line: number
  column: number
}

interface Bullet {
  kind: 'bullet'
  text: string
  line: number
  column: number
  indent: number
  children: Bullet[]
}

interface Heading {
  kind: 'heading'
  level: 1 | 2 | 3
  text: string
  line: number
  column: number
}

interface Numbered {
  kind: 'numbered'
  text: string
  number: string
  line: number
  column: number
}

type ProseNode = Paragraph | Bullet | Heading | Numbered

/* -------------------------------------------------------------- entrypoint */

/**
 * Parse a prose body. Cursor is positioned after the parent's INDENT.
 * Consumes tokens up to and including the matching DEDENT, populates
 * `parent.children` with synthesized Instances.
 *
 * Returns the line range of the prose body so callers can filter
 * lexer errors that occurred inside it.
 */
export function parseProseBody(
  ctx: ParserContext,
  parent: Instance | ComponentDefinition,
  callbacks: ProseBodyCallbacks,
  styleVariant?: string
): ProseRange {
  const sourceLines = ctx.source.split('\n')
  const style = resolveProseStyle(styleVariant)

  // Determine the body's base indent from the first non-blank line.
  // This is the indent at which top-level prose lines sit; deeper indents
  // mean nested bullets.
  const startToken = U.current(ctx)
  const startLineNum = startToken?.line ?? 0
  let baseIndent: number | null = null

  // Collect raw prose lines (until matching DEDENT).
  const lines: ProseLine[] = []
  let lastLineSeen = startLineNum
  // INDENT/DEDENT inside the prose body (e.g. for nested bullets) need
  // to balance: we exit when we see a DEDENT at depth 0, not before.
  let depth = 0

  while (!U.isAtEnd(ctx)) {
    const tok = U.current(ctx)
    if (!tok) break

    // Skip NEWLINE tokens; we'll detect blank lines via line-number gaps.
    if (tok.type === 'NEWLINE') {
      U.advance(ctx)
      continue
    }

    // INDENT inside prose body (e.g. for nested bullets) — bumps depth.
    if (tok.type === 'INDENT') {
      depth++
      U.advance(ctx)
      continue
    }

    // DEDENT at depth 0 ends the prose body; deeper DEDENTs balance an
    // earlier INDENT and stay inside.
    if (tok.type === 'DEDENT') {
      if (depth === 0) break
      depth--
      U.advance(ctx)
      continue
    }

    const lineNum = tok.line
    if (lineNum > lastLineSeen + 1) {
      // Blank source line(s) between lastLineSeen and lineNum — emit
      // explicit blank markers so paragraph grouping later sees them.
      for (let l = lastLineSeen + 1; l < lineNum; l++) {
        const raw = sourceLines[l - 1] ?? ''
        if (raw.trim() === '') {
          lines.push({ text: '', indent: 0, line: l })
        }
      }
    }

    const rawLine = sourceLines[lineNum - 1] ?? ''
    if (rawLine.trim() !== '') {
      const indent = rawLine.length - rawLine.trimStart().length
      if (baseIndent === null) baseIndent = indent
      lines.push({ text: rawLine.trimStart(), indent, line: lineNum })
    }
    lastLineSeen = lineNum

    // Skip all tokens belonging to this source line.
    while (
      !U.isAtEnd(ctx) &&
      U.current(ctx) &&
      U.current(ctx).line === lineNum &&
      U.current(ctx).type !== 'INDENT' &&
      U.current(ctx).type !== 'DEDENT' &&
      U.current(ctx).type !== 'NEWLINE'
    ) {
      U.advance(ctx)
    }
  }

  // Consume the closing DEDENT (caller's contract is the same as for
  // parseInstanceBody).
  if (U.check(ctx, 'DEDENT')) U.advance(ctx)

  const endLineNum = lastLineSeen

  // Group raw lines into prose nodes.
  const nodes = groupProseLines(lines, baseIndent ?? 0)

  // Synthesize Instance children for the parent.
  for (const node of nodes) {
    appendNodeToParent(parent, node, style, callbacks)
  }

  return { startLine: startLineNum, endLine: endLineNum }
}

/* ---------------------------------------------------------- line grouping */

function groupProseLines(lines: ProseLine[], baseIndent: number): ProseNode[] {
  const out: ProseNode[] = []
  let paragraphBuffer: ProseLine[] = []

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer
      .map(l => l.text)
      .join(' ')
      .trim()
    if (text) {
      out.push({
        kind: 'paragraph',
        text,
        line: paragraphBuffer[0].line,
        column: paragraphBuffer[0].indent + 1,
      })
    }
    paragraphBuffer = []
  }

  for (const line of lines) {
    // Blank line = paragraph break.
    if (line.text === '') {
      flushParagraph()
      continue
    }

    // Heading (# / ## / ### with mandatory space).
    const heading = line.text.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      out.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
        line: line.line,
        column: line.indent + 1,
      })
      continue
    }

    // Numbered list (digits followed by `. ` and content).
    const numbered = line.text.match(/^(\d+)\.\s+(.+)$/)
    if (numbered) {
      flushParagraph()
      out.push({
        kind: 'numbered',
        number: numbered[1].padStart(2, '0'),
        text: numbered[2].trim(),
        line: line.line,
        column: line.indent + 1,
      })
      continue
    }

    // Bullet (- followed by space and content). Indent-nested bullets
    // are collected into a flat list with `indent` annotated; we nest
    // them in a second pass below.
    const bullet = line.text.match(/^-\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      out.push({
        kind: 'bullet',
        text: bullet[1].trim(),
        line: line.line,
        column: line.indent + 1,
        indent: line.indent - baseIndent,
        children: [],
      })
      continue
    }

    // Otherwise: continuation of paragraph (Markdown rule: single line
    // break = same paragraph). We preserve indent so the first line's
    // position is the paragraph's anchor.
    paragraphBuffer.push(line)
  }

  flushParagraph()

  return nestBullets(out)
}

/**
 * Walk the flat node list and re-parent bullets whose indent is greater
 * than a previous bullet's indent. Headings/paragraphs/numbered always
 * stay flat.
 */
function nestBullets(nodes: ProseNode[]): ProseNode[] {
  const result: ProseNode[] = []
  // Stack of currently-open bullets, with their indent level.
  const stack: Bullet[] = []

  for (const node of nodes) {
    if (node.kind !== 'bullet') {
      stack.length = 0
      result.push(node)
      continue
    }

    while (stack.length > 0 && stack[stack.length - 1].indent >= node.indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(node)
      stack.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
      stack.push(node)
    }
  }

  return result
}

/* --------------------------------------------------------- AST synthesis */

function appendNodeToParent(
  parent: Instance | ComponentDefinition,
  node: ProseNode,
  style: ProseStyleMap,
  callbacks: ProseBodyCallbacks
): void {
  if (!parent.children) parent.children = []

  switch (node.kind) {
    case 'paragraph': {
      parent.children.push(makeTextInstance(style.paragraph, node.text, node.line, node.column))
      return
    }
    case 'heading': {
      const componentName =
        node.level === 1 ? style.heading1 : node.level === 2 ? style.heading2 : style.heading3
      parent.children.push(makeTextInstance(componentName, node.text, node.line, node.column))
      return
    }
    case 'bullet': {
      parent.children.push(makeBulletInstance(node, style, callbacks))
      return
    }
    case 'numbered': {
      parent.children.push(makeNumberedInstance(node, style, callbacks))
      return
    }
  }
}

/**
 * Build an Instance equivalent to `<Component> "<text>"`.
 * The text becomes a `content` property on the Instance (matching how
 * `Btn "Save"` is parsed today — see token-cursor.ts createTextChild).
 */
function makeTextInstance(component: string, text: string, line: number, column: number): Instance {
  return {
    type: 'Instance',
    component,
    name: null,
    properties: [
      {
        type: 'Property',
        name: 'content',
        values: [text],
        line,
        column,
      },
    ],
    children: [],
    states: [],
    events: [],
    line,
    column,
  }
}

function makeBulletInstance(
  bullet: Bullet,
  style: ProseStyleMap,
  callbacks: ProseBodyCallbacks
): Instance {
  // Bullet structure matches the personas-informatik file:
  //   DashItem  : hor, gap 24
  //     DashMarker "—"   ← already inside DashItem definition by convention
  //     <text-component> "<text>"
  // We synthesize:
  //   <bullet>  containing  <bulletText> "<text>" + nested bullets (if any)
  // The marker character is supplied by the bullet component's own
  // definition (`DashItem: hor, gap 24` already includes `DashMarker "—"`).
  const inst: Instance = {
    type: 'Instance',
    component: style.bullet,
    name: null,
    properties: [],
    children: [],
    states: [],
    events: [],
    line: bullet.line,
    column: bullet.column,
  }

  inst.children.push(makeTextInstance(style.bulletText, bullet.text, bullet.line, bullet.column))

  for (const child of bullet.children) {
    inst.children.push(makeBulletInstance(child, style, callbacks))
  }

  return inst
}

function makeNumberedInstance(
  numbered: Numbered,
  style: ProseStyleMap,
  _callbacks: ProseBodyCallbacks
): Instance {
  // Numbered structure (matches OffenePunkt in personas-informatik):
  //   OffenePunkt
  //     OffeneNumCol   ← optional wrapper, the user's component decides
  //       OffeneNum "01"
  //     <text-component> "<text>"
  //
  // For v1 we synthesize a simple two-child shape and let the user's
  // component definition handle layout/wrapping.
  const inst: Instance = {
    type: 'Instance',
    component: style.numbered,
    name: null,
    properties: [],
    children: [],
    states: [],
    events: [],
    line: numbered.line,
    column: numbered.column,
  }

  inst.children.push(
    makeTextInstance(style.numberedNum, numbered.number, numbered.line, numbered.column)
  )
  inst.children.push(
    makeTextInstance(style.numberedText, numbered.text, numbered.line, numbered.column)
  )

  return inst
}

/* ---------------------------------------------------- prose-property check */

/**
 * True when this Instance/Component should have a prose body parsed
 * for it. Checks own properties first; falls back to looking up the
 * component definition (use-site `Article` inherits prose from
 * `Article as Frame: prose`).
 */
export function shouldParseAsProse(
  parent: { component?: string; properties: Property[] },
  callbacks: ProseBodyCallbacks
): boolean {
  if (hasProseProperty(parent.properties)) return true

  const componentName = parent.component
  if (!componentName) return false

  // Local definition wins (most specific).
  if (callbacks.getComponentDef) {
    const def = callbacks.getComponentDef(componentName)
    if (def && hasProseProperty(def.properties)) return true
  }

  // Cross-file prelude fallback: project-mode validation passes a set of
  // component names that are prose-mode in OTHER files. Without this, a
  // prose component defined in `components.com` doesn't trigger prose-
  // mode when parsing `app.mir` standalone.
  if (callbacks.isProseComponent && callbacks.isProseComponent(componentName)) return true

  return false
}

/* ------------------------------------------------------- token (kept for type lock) */

// Re-export for consumers that pull both the parser and the token type
// from this module (mirrors body-parser.ts).
export type { Token }
