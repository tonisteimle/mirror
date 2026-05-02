/**
 * Each / Conditional / Literal Parser
 *
 * Cohesive cluster around iteration and conditional rendering:
 *
 *   - `parseEach`        — `each item, index in $items where … by … desc:`
 *   - `parseConditional` — `if cond:` / `else:` blocks containing children
 *   - `parseArrayLiteral` / `parseObjectLiteral` — JS-style inline literals
 *     used by `parseEach` (`each x in [1, 2, 3]`) and property values.
 *
 * `parseEach` and `parseConditional` are mutually recursive (each can
 * contain the other plus child instances), so they live together. The
 * literal parsers are pure leaves.
 *
 * Extracted from parser.ts. Callbacks to the main parser are limited to
 * `parseInstance` and the two property-name helpers (`checkNextIsPropertyName`
 * / `advancePropertyName`); recursion stays internal.
 */

import type { Token } from './lexer'
import type { Instance, Slot, ZagNode, Each, ConditionalNode } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { MAX_ITERATIONS } from './ops/limits'
import { parseExpression } from './expression-parser'

const U = ParserUtils

/** Callbacks the each/conditional parsers need from the main parser. */
export interface EachParserCallbacks {
  parseInstance(name: Token): Instance | Slot | ZagNode
  checkNextIsPropertyName(): boolean
  advancePropertyName(): string
}

/* ---------------------------------------------------------------- literals */

/**
 * Parse an inline array literal: ["Apple", "Banana", "Cherry"]
 * Also supports objects: [{ name: "Alice", age: 30 }, { name: "Bob" }]
 * Returns the array as a JavaScript string representation.
 */
export function parseArrayLiteral(ctx: ParserContext): string {
  if (!U.check(ctx, 'LBRACKET')) return '[]'
  U.advance(ctx) // consume [

  const elements: string[] = []

  while (!U.check(ctx, 'RBRACKET') && !U.isAtEnd(ctx)) {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'RBRACKET')) break

    if (U.check(ctx, 'LBRACE')) {
      // Parse object literal: { name: "Alice", age: 30 }
      elements.push(parseObjectLiteral(ctx))
    } else if (U.check(ctx, 'STRING')) {
      const str = U.advance(ctx).value
      elements.push(`"${str}"`)
    } else if (U.check(ctx, 'NUMBER')) {
      elements.push(U.advance(ctx).value)
    } else if (U.check(ctx, 'IDENTIFIER')) {
      const value = U.advance(ctx).value
      // Handle boolean literals
      if (value === 'true' || value === 'false' || value === 'null') {
        elements.push(value)
      } else {
        elements.push(`"${value}"`)
      }
    } else {
      U.advance(ctx) // skip unknown
    }

    // Skip comma between elements
    if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
    }
  }

  if (U.check(ctx, 'RBRACKET')) U.advance(ctx) // consume ]
  return `[${elements.join(', ')}]`
}

/**
 * Parse an inline object literal: { name: "Alice", age: 30 }
 * Returns the object as a JavaScript string representation.
 */
export function parseObjectLiteral(ctx: ParserContext): string {
  if (!U.check(ctx, 'LBRACE')) return '{}'
  U.advance(ctx) // consume {

  const props: string[] = []

  while (!U.check(ctx, 'RBRACE') && !U.isAtEnd(ctx)) {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'RBRACE')) break

    // Parse property name
    if (!U.check(ctx, 'IDENTIFIER')) {
      U.advance(ctx)
      continue
    }
    const key = U.advance(ctx).value

    // Expect colon
    if (U.check(ctx, 'COLON')) {
      U.advance(ctx)
    }

    // Parse property value
    let value: string
    if (U.check(ctx, 'STRING')) {
      value = `"${U.advance(ctx).value}"`
    } else if (U.check(ctx, 'NUMBER')) {
      value = U.advance(ctx).value
    } else if (U.check(ctx, 'IDENTIFIER')) {
      const v = U.advance(ctx).value
      if (v === 'true' || v === 'false' || v === 'null') {
        value = v
      } else {
        value = `"${v}"`
      }
    } else if (U.check(ctx, 'LBRACKET')) {
      value = parseArrayLiteral(ctx)
    } else if (U.check(ctx, 'LBRACE')) {
      value = parseObjectLiteral(ctx)
    } else {
      value = 'null'
      U.advance(ctx)
    }

    props.push(`${key}: ${value}`)

    // Skip comma between properties
    if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
    }
  }

  if (U.check(ctx, 'RBRACE')) U.advance(ctx) // consume }
  return `{ ${props.join(', ')} }`
}

/* ----------------------------------------------------------------- each */

export function parseEach(ctx: ParserContext, callbacks: EachParserCallbacks): Each | null {
  const eachToken = U.advance(ctx) // each

  // Get item variable name
  if (!U.check(ctx, 'IDENTIFIER')) return null
  const item = U.advance(ctx).value

  // Check for optional index variable with comma syntax: each item, index in collection
  let index: string | undefined
  if (U.check(ctx, 'COMMA')) {
    U.advance(ctx) // consume comma
    if (U.check(ctx, 'IDENTIFIER')) {
      index = U.advance(ctx).value
    }
  }

  // Expect 'in'
  if (!U.check(ctx, 'IN')) return null
  U.advance(ctx)

  // Get collection: either identifier or inline array literal
  let collection: string
  if (U.check(ctx, 'LBRACKET')) {
    // Parse inline array literal: ["Apple", "Banana", "Cherry"]
    collection = parseArrayLiteral(ctx)
  } else if (U.check(ctx, 'IDENTIFIER')) {
    collection = U.advance(ctx).value
    // Handle property access for nested loop collections: category.items
    while (U.check(ctx, 'DOT') && callbacks.checkNextIsPropertyName()) {
      U.advance(ctx) // .
      collection += '.' + callbacks.advancePropertyName()
    }
  } else {
    return null
  }

  // Also support legacy syntax: each item in collection with index
  if (!index && U.check(ctx, 'WITH')) {
    U.advance(ctx) // consume 'with'
    if (U.check(ctx, 'IDENTIFIER')) {
      index = U.advance(ctx).value
    }
  }

  const each: Each = {
    type: 'Each',
    item,
    index,
    collection,
    children: [],
    line: eachToken.line,
    column: eachToken.column,
  }

  // Optional filter: where condition
  if (U.check(ctx, 'WHERE')) {
    U.advance(ctx)
    each.filter = parseExpression(ctx)
  }

  // Optional ordering: by field asc/desc
  if (U.check(ctx, 'BY')) {
    U.advance(ctx)
    if (U.check(ctx, 'IDENTIFIER')) {
      each.orderBy = U.advance(ctx).value
      // Check for ascending/descending
      if (U.check(ctx, 'DESC')) {
        U.advance(ctx)
        each.orderDesc = true
      } else if (U.check(ctx, 'ASC')) {
        U.advance(ctx)
        each.orderDesc = false
      }
    }
  }

  // Parse indented children
  // Add loop variables to context so they can be recognized as content
  ctx.loopVariables.add(item)
  if (index) ctx.loopVariables.add(index)

  try {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'INDENT')) {
      U.advance(ctx)
      let iter = 0
      while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS) {
        iter++
        U.skipNewlines(ctx)
        if (U.check(ctx, 'DEDENT')) break

        if (U.check(ctx, 'IDENTIFIER')) {
          const child = callbacks.parseInstance(U.advance(ctx))
          if (child.type !== 'ZagComponent') {
            each.children.push(child as Instance | Slot)
          }
        } else if (U.check(ctx, 'EACH')) {
          const nestedEach = parseEach(ctx, callbacks)
          if (nestedEach) each.children.push(nestedEach)
        } else if (U.check(ctx, 'IF')) {
          const conditional = parseConditionalBlock(ctx, callbacks)
          if (conditional) each.children.push(conditional)
        } else {
          U.advance(ctx)
        }
      }
      if (U.check(ctx, 'DEDENT')) U.advance(ctx)
    }
  } finally {
    // Always remove loop variables from context, even on exception
    ctx.loopVariables.delete(item)
    if (index) ctx.loopVariables.delete(index)
  }

  return each
}

/* ----------------------------------------------------------- conditional */

export function parseConditionalBlock(
  ctx: ParserContext,
  callbacks: EachParserCallbacks
): ConditionalNode {
  const ifToken = U.advance(ctx) // if

  // Parse condition
  const condition = parseExpression(ctx)

  const conditional: ConditionalNode = {
    type: 'Conditional',
    condition,
    then: [],
    else: [],
    line: ifToken.line,
    column: ifToken.column,
  }

  // Parse 'then' block
  U.skipNewlines(ctx)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    let iter = 0
    while (
      !U.check(ctx, 'DEDENT') &&
      !U.check(ctx, 'ELSE') &&
      !U.isAtEnd(ctx) &&
      iter < MAX_ITERATIONS
    ) {
      iter++
      U.skipNewlines(ctx)
      if (U.check(ctx, 'DEDENT') || U.check(ctx, 'ELSE')) break

      if (U.check(ctx, 'IDENTIFIER')) {
        const child = callbacks.parseInstance(U.advance(ctx))
        if (child.type !== 'ZagComponent') {
          conditional.then.push(child as Instance | Slot)
        }
      } else if (U.check(ctx, 'EACH')) {
        const each = parseEach(ctx, callbacks)
        if (each) conditional.then.push(each)
      } else if (U.check(ctx, 'IF')) {
        const nested = parseConditionalBlock(ctx, callbacks)
        if (nested) conditional.then.push(nested)
      } else {
        U.advance(ctx)
      }
    }
    if (U.check(ctx, 'DEDENT')) U.advance(ctx)
  }

  // Parse optional 'else' block
  U.skipNewlines(ctx)
  if (U.check(ctx, 'ELSE')) {
    U.advance(ctx)
    U.skipNewlines(ctx)
    if (U.check(ctx, 'INDENT')) {
      U.advance(ctx)
      let iter = 0
      while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS) {
        iter++
        U.skipNewlines(ctx)
        if (U.check(ctx, 'DEDENT')) break

        if (U.check(ctx, 'IDENTIFIER')) {
          const child = callbacks.parseInstance(U.advance(ctx))
          if (child.type !== 'ZagComponent') {
            conditional.else.push(child as Instance | Slot)
          }
        } else if (U.check(ctx, 'EACH')) {
          const each = parseEach(ctx, callbacks)
          if (each) conditional.else.push(each)
        } else if (U.check(ctx, 'IF')) {
          const nested = parseConditionalBlock(ctx, callbacks)
          if (nested) conditional.else.push(nested)
        } else {
          U.advance(ctx)
        }
      }
      if (U.check(ctx, 'DEDENT')) U.advance(ctx)
    }
  }

  return conditional
}
