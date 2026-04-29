/**
 * Data Object Parser
 *
 * Parses Mirror's inline data-object syntax (the `name:` + indented block
 * inside a `.mirror` file — distinct from `.data` files, which are handled
 * by data-parser.ts).
 *
 *   post:
 *     title: "First Post"
 *     author: "Anna"
 *     tags: [draft, featured]
 *     ref: $authors.anna
 *     desc: "Reserved keyword used as key — supported"
 *     @body
 *       Markdown content here.
 *       Multiple lines, **bold**, etc.
 *
 * Supports:
 * - Nested attribute objects (recursion through parseDataAttribute)
 * - String / number / boolean / array values
 * - Single and comma-separated `$collection.entry` references
 * - External references `@filename`
 * - Reserved-keyword keys (`desc`, `if`, etc.) via the shared
 *   KEYWORD_TOKEN_TYPES set
 * - Markdown blocks (`@blockname` + indented content)
 *
 * Extracted from parser.ts (Phase 5 — fourth incremental cut).
 */

import type { Token } from './lexer'
import type {
  TokenDefinition,
  DataAttribute,
  DataBlock,
  DataReference,
  DataReferenceArray,
} from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils, MAX_ITERATIONS, KEYWORD_TOKEN_TYPES } from './parser-context'

const U = ParserUtils

/* ------------------------------------------------------------------ helpers */

/**
 * Whether the current token can be used as an identifier or attribute key.
 * Includes IDENTIFIER and the reserved keywords listed in KEYWORD_TOKEN_TYPES
 * (so `desc:` and `if:` work as data-attribute keys).
 */
function checkIsIdentifierOrKeyword(ctx: ParserContext): boolean {
  if (U.isAtEnd(ctx)) return false
  const type = U.current(ctx).type
  return type === 'IDENTIFIER' || KEYWORD_TOKEN_TYPES.includes(type)
}

/**
 * Consume the current identifier-or-keyword token and return its key name.
 * For reserved keywords, returns the lowercased token type (so `DESC` →
 * `desc` matches the surface syntax).
 */
function advanceIdentifierOrKeyword(ctx: ParserContext): string {
  const token = U.advance(ctx)
  return token.type === 'IDENTIFIER' ? token.value : token.type.toLowerCase()
}

/** Skip NEWLINE tokens (helper used in many places below). */
function skipNewlines(ctx: ParserContext): void {
  while (U.check(ctx, 'NEWLINE')) U.advance(ctx)
}

/* ----------------------------------------------------- main entry: object */

export function parseDataObject(ctx: ParserContext, section?: string): TokenDefinition | null {
  const nameToken = U.advance(ctx) // `post` or `$post`
  U.advance(ctx) // :

  const name = nameToken.value.startsWith('$') ? nameToken.value.slice(1) : nameToken.value

  skipNewlines(ctx)
  if (!U.check(ctx, 'INDENT')) return null
  U.advance(ctx) // INDENT

  // INDENT is often followed by NEWLINE — eat it.
  if (U.check(ctx, 'NEWLINE')) U.advance(ctx)

  const attributes: DataAttribute[] = []
  const blocks: DataBlock[] = []

  for (let iter = 0; !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS; iter++) {
    skipNewlines(ctx)
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Markdown block: @blockname
    if (U.check(ctx, 'AT') && U.checkNext(ctx, 'IDENTIFIER')) {
      const block = parseDataBlock(ctx)
      if (block) blocks.push(block)
      continue
    }

    // Attribute: key: value (key may be a reserved keyword)
    if (checkIsIdentifierOrKeyword(ctx) && U.checkNext(ctx, 'COLON')) {
      const attr = parseDataAttribute(ctx)
      if (attr) attributes.push(attr)
      continue
    }

    // Simple list item: `name` on a line with no colon (`colors:\n  rot\n  grün`)
    if (
      checkIsIdentifierOrKeyword(ctx) &&
      (U.checkNext(ctx, 'NEWLINE') || U.checkNext(ctx, 'DEDENT') || U.peekAt(ctx, 1) === null)
    ) {
      const key = advanceIdentifierOrKeyword(ctx)
      const line = ctx.tokens[ctx.pos - 1].line
      attributes.push({ key, value: key, line })
      continue
    }

    // Unknown content — skip one token.
    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)

  return {
    type: 'Token',
    name,
    attributes,
    blocks,
    section,
    line: nameToken.line,
    column: nameToken.column,
  }
}

/* ------------------------------------------------------- attribute (recursive) */

export function parseDataAttribute(ctx: ParserContext): DataAttribute | null {
  const key = advanceIdentifierOrKeyword(ctx)
  const line = ctx.tokens[ctx.pos - 1].line
  U.advance(ctx) // :

  // Look past any NEWLINEs to detect a nested object (NEWLINE+ INDENT).
  let lookAhead = 0
  while (U.checkAt(ctx, lookAhead, 'NEWLINE')) lookAhead++

  if (U.checkAt(ctx, lookAhead, 'INDENT')) {
    skipNewlines(ctx)
    U.advance(ctx) // INDENT

    const children: DataAttribute[] = []
    for (
      let iter = 0;
      !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS;
      iter++
    ) {
      skipNewlines(ctx)
      if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

      if (checkIsIdentifierOrKeyword(ctx) && U.checkNext(ctx, 'COLON')) {
        const nestedAttr = parseDataAttribute(ctx)
        if (nestedAttr) children.push(nestedAttr)
        continue
      }
      U.advance(ctx)
    }

    if (U.check(ctx, 'DEDENT')) U.advance(ctx)
    return { key, children, line }
  }

  // Otherwise: simple value.
  return { key, value: parseAttributeValue(ctx), line }
}

/**
 * Parse the right-hand side of `key: value` for the simple-value case.
 * Returns string / number / boolean / string[] / DataReference / DataReferenceArray.
 */
function parseAttributeValue(
  ctx: ParserContext
): string | number | boolean | string[] | DataReference | DataReferenceArray {
  if (U.check(ctx, 'STRING')) {
    return U.advance(ctx).value
  }

  if (U.check(ctx, 'NUMBER')) {
    const numToken = U.advance(ctx)
    if (numToken.value.startsWith('#')) return numToken.value
    const num = parseFloat(numToken.value)
    return isNaN(num) ? numToken.value : num
  }

  if (U.check(ctx, 'AT')) {
    U.advance(ctx) // @
    return U.check(ctx, 'IDENTIFIER') ? '@' + U.advance(ctx).value : '@'
  }

  if (U.check(ctx, 'IDENTIFIER')) {
    const identValue = U.advance(ctx).value
    if (identValue === 'true') return true
    if (identValue === 'false') return false

    // Reference (or comma-separated reference list): `$collection.entry`
    if (identValue.startsWith('$') && identValue.includes('.')) {
      const ref = parseDataReference(identValue)
      if (!ref) return identValue
      return collectAdditionalReferences(ctx, ref)
    }
    return identValue
  }

  if (U.check(ctx, 'LBRACKET')) {
    return parseDataArray(ctx)
  }

  return ''
}

/**
 * After the first `$col.entry` reference, look for `, $other.entry, ...` and
 * collect them. Returns either a single DataReference or a DataReferenceArray.
 */
function collectAdditionalReferences(
  ctx: ParserContext,
  first: DataReference
): DataReference | DataReferenceArray {
  const refs: DataReference[] = [first]

  while (U.check(ctx, 'COMMA')) {
    const savedPos = ctx.pos
    U.advance(ctx) // ,

    if (!U.check(ctx, 'IDENTIFIER')) {
      ctx.pos = savedPos
      break
    }
    const nextIdent = U.current(ctx).value
    if (!(nextIdent.startsWith('$') && nextIdent.includes('.'))) {
      ctx.pos = savedPos
      break
    }
    U.advance(ctx) // identifier
    const nextRef = parseDataReference(nextIdent)
    if (nextRef) refs.push(nextRef)
  }

  return refs.length === 1 ? refs[0] : { kind: 'referenceArray', references: refs }
}

/* --------------------------------------------------------------- arrays */

/**
 * Parse a string array: `[a, b, c]` → `string[]`.
 * Items can be STRING, IDENTIFIER, or NUMBER (all kept as strings).
 */
export function parseDataArray(ctx: ParserContext): string[] {
  const items: string[] = []
  U.advance(ctx) // [

  for (
    let iter = 0;
    !U.isAtEnd(ctx) && !U.check(ctx, 'RBRACKET') && iter < MAX_ITERATIONS;
    iter++
  ) {
    if (U.check(ctx, 'STRING') || U.check(ctx, 'IDENTIFIER') || U.check(ctx, 'NUMBER')) {
      items.push(U.advance(ctx).value)
    } else if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
    } else {
      break
    }
  }

  if (U.check(ctx, 'RBRACKET')) U.advance(ctx)
  return items
}

/* ---------------------------------------------------------- references */

/**
 * Parse a `$collection.entry` reference string into a DataReference.
 * Returns null if format is invalid (no dot, or empty collection/entry).
 */
export function parseDataReference(value: string): DataReference | null {
  const withoutDollar = value.slice(1) // strip leading $
  const dotIndex = withoutDollar.indexOf('.')
  if (dotIndex === -1) return null

  const collection = withoutDollar.slice(0, dotIndex)
  const entry = withoutDollar.slice(dotIndex + 1)
  if (!collection || !entry) return null

  return { kind: 'reference', collection, entry }
}

/* --------------------------------------------------------- markdown blocks */

/**
 * Parse a markdown block: `@blockname` + indented content.
 * Reconstructs the original line content from tokens with smart spacing
 * (no space before `,` `:` `)` `]` `*` `.`, no space after `(` `[` `*` `@`).
 */
export function parseDataBlock(ctx: ParserContext): DataBlock | null {
  U.advance(ctx) // @
  const nameToken = U.advance(ctx) // blockname
  const blockName = nameToken.value
  const line = nameToken.line

  skipNewlines(ctx)

  if (!U.check(ctx, 'INDENT')) {
    return { name: blockName, content: '', line }
  }
  U.advance(ctx) // INDENT

  const noSpaceBefore = new Set(['STAR', 'DOT', 'COMMA', 'COLON', 'RPAREN', 'RBRACKET'])
  const noSpaceAfter = new Set(['STAR', 'LPAREN', 'LBRACKET', 'AT'])
  const contentLines: string[] = []

  for (
    let outerIter = 0;
    !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && outerIter < MAX_ITERATIONS;
    outerIter++
  ) {
    if (U.check(ctx, 'NEWLINE')) {
      contentLines.push('')
      U.advance(ctx)
      continue
    }

    // Collect tokens for this line.
    const lineTokens: Token[] = []
    for (
      let innerIter = 0;
      !U.isAtEnd(ctx) &&
      !U.check(ctx, 'NEWLINE') &&
      !U.check(ctx, 'DEDENT') &&
      innerIter < MAX_ITERATIONS;
      innerIter++
    ) {
      lineTokens.push(U.advance(ctx))
    }

    // Reconstruct line with smart spacing.
    let lineContent = ''
    for (let i = 0; i < lineTokens.length; i++) {
      const token = lineTokens[i]
      const prevToken = i > 0 ? lineTokens[i - 1] : null

      const needSpace =
        lineContent.length > 0 &&
        !lineContent.endsWith(' ') &&
        !noSpaceBefore.has(token.type) &&
        (prevToken ? !noSpaceAfter.has(prevToken.type) : true)

      if (needSpace) lineContent += ' '
      lineContent += token.value
    }

    if (lineContent) contentLines.push(lineContent)

    if (U.check(ctx, 'NEWLINE')) U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)

  // Trim trailing empty lines.
  while (contentLines.length > 0 && contentLines[contentLines.length - 1] === '') {
    contentLines.pop()
  }

  return { name: blockName, content: contentLines.join('\n'), line }
}
