/**
 * State Child Parser
 *
 * Parses two related state-block constructs:
 *
 *   - `parseStateChildOverride` — `ChildName: property value` inside a state
 *     block. Tweaks an existing child of the parent component without
 *     replacing it.
 *   - `parseStateChildInstance` — `ComponentName "content", property value`
 *     inside a state block. Adds a brand-new child for that state, à la
 *     Figma Variants.
 *
 * Both are called from body-parser. They use parseProperty / parseInlineProperties
 * via callbacks since those parsers live in their own modules.
 *
 * Extracted from parser.ts.
 */

import type { Token } from './lexer'
import type { Instance, Property, ChildOverride } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils, MAX_ITERATIONS } from './parser-context'

const U = ParserUtils

/** Callbacks the state-child parsers need from the main parser. */
export interface StateChildParserCallbacks {
  parseProperty(): Property | null
  parseInlineProperties(properties: Property[]): void
  createTextChild(token: Token): Instance
}

/** True when the first character is uppercase A-Z. */
function isUppercase(str: string): boolean {
  if (!str || str.length === 0) return false
  const firstChar = str.charAt(0)
  return firstChar >= 'A' && firstChar <= 'Z'
}

/* --------------------------------------------------------------- override */

/**
 * Parse a child override within a state block.
 * Syntax: `ChildName: property value` (note the colon)
 */
export function parseStateChildOverride(
  ctx: ParserContext,
  callbacks: StateChildParserCallbacks
): ChildOverride | null {
  if (!U.check(ctx, 'IDENTIFIER')) return null

  const childName = U.advance(ctx)

  // Consume the colon if present (new syntax: "Icon: ic white")
  if (U.check(ctx, 'COLON')) {
    U.advance(ctx)
  }

  const properties: Property[] = []

  // Parse properties for this child override (on the same line)
  callbacks.parseInlineProperties(properties)

  return {
    childName: childName.value,
    properties,
  }
}

/* --------------------------------------------------------------- instance */

/**
 * Parse a child instance within a state block.
 * This allows states to have completely different children (like Figma Variants).
 * Syntax: `ComponentName "content", property value`
 */
export function parseStateChildInstance(
  ctx: ParserContext,
  callbacks: StateChildParserCallbacks
): Instance | null {
  if (!U.check(ctx, 'IDENTIFIER')) return null

  const componentToken = U.advance(ctx)

  const instance: Instance = {
    type: 'Instance',
    component: componentToken.value,
    name: null,
    properties: [],
    children: [],
    states: [],
    events: [],
    line: componentToken.line,
    column: componentToken.column,
  }

  // Parse inline content and properties
  let inlineIter = 0
  while (
    !U.check(ctx, 'NEWLINE') &&
    !U.check(ctx, 'DEDENT') &&
    !U.isAtEnd(ctx) &&
    inlineIter < MAX_ITERATIONS
  ) {
    inlineIter++
    // Skip commas
    if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
      continue
    }

    // String content
    if (U.check(ctx, 'STRING')) {
      const str = U.advance(ctx)
      instance.properties.push({
        type: 'Property',
        name: 'content',
        values: [str.value],
        line: str.line,
        column: str.column,
      })
      continue
    }

    // Properties
    if (U.check(ctx, 'IDENTIFIER')) {
      const prop = callbacks.parseProperty()
      if (prop) instance.properties.push(prop)
      continue
    }

    // Numbers (standalone values)
    if (U.check(ctx, 'NUMBER')) {
      U.advance(ctx)
      continue
    }

    break
  }

  // Check for nested children (indented block)
  U.skipNewlines(ctx)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    let blockIter = 0
    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && blockIter < MAX_ITERATIONS) {
      blockIter++
      U.skipNewlines(ctx)
      if (U.check(ctx, 'DEDENT')) break

      // String as Text child
      if (U.check(ctx, 'STRING')) {
        instance.children.push(callbacks.createTextChild(U.advance(ctx)))
        continue
      }

      // Nested component
      if (U.check(ctx, 'IDENTIFIER') && isUppercase(U.current(ctx).value)) {
        const child = parseStateChildInstance(ctx, callbacks)
        if (child) instance.children.push(child)
        continue
      }

      // Properties (lowercase)
      if (U.check(ctx, 'IDENTIFIER')) {
        const prop = callbacks.parseProperty()
        if (prop) instance.properties.push(prop)
        continue
      }

      U.advance(ctx)
    }
    if (U.check(ctx, 'DEDENT')) U.advance(ctx)
  }

  return instance
}
