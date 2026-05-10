/**
 * Parser ops — parse-control-flow
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import type { Instance, Each, ConditionalNode, StateDependency } from '../ast'
import { isStateBlockStart as detectStateBlockStart } from '../state-detector'
import * as EachParser from '../each-parser'
import * as StateChildParser from '../state-child-parser'
import type { Parser } from '../parser'

export function parseEach(this: Parser): Each | null {
  return this.withSubParserContext(ctx => EachParser.parseEach(ctx, this.eachParserCallbacks(ctx)))
}

/**
 * Parse an inline array literal: ["Apple", "Banana", "Cherry"]
 * Also supports objects: [{ name: "Alice", age: 30 }, { name: "Bob" }]
 * Returns the array as a JavaScript string representation.
 */
export function parseArrayLiteral(this: Parser): string {
  return this.withSubParserContext(ctx => EachParser.parseArrayLiteral(ctx))
}

/**
 * Parse an inline object literal: { name: "Alice", age: 30 }
 * Returns the object as a JavaScript string representation.
 */
export function parseObjectLiteral(this: Parser): string {
  return this.withSubParserContext(ctx => EachParser.parseObjectLiteral(ctx))
}

export function parseConditionalBlock(this: Parser): ConditionalNode {
  return this.withSubParserContext(ctx =>
    EachParser.parseConditionalBlock(ctx, this.eachParserCallbacks(ctx))
  )
}

/**
 * Parse a 'when' clause for state dependencies
 * Pattern: Element state [and/or Element state]*
 * Example: Menu open
 * Example: Menu open or Sidebar open
 * Example: Form valid and User loggedIn
 */
export function parseWhenClause(this: Parser): StateDependency {
  // Parse first dependency
  const target = this.advance().value // Element name
  const state = this.advance().value // state name

  const dependency: StateDependency = {
    target,
    state,
  }

  // Check for chained conditions (and/or)
  // Note: 'and'/'or' are tokenized as AND/OR types, not IDENTIFIER
  if (this.check('AND') || this.check('OR')) {
    const condToken = this.advance()
    dependency.condition = condToken.value as 'and' | 'or'
    dependency.next = this.parseWhenClause() // recursive parse
  }

  return dependency
}

export function isStateBlockStart(this: Parser): boolean {
  return detectStateBlockStart({
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  })
}

/**
 * Parse a child override within a state block
 * Syntax: ChildName: property value (note the colon)
 */
export function parseStateChildOverride(this: Parser): import('../ast').ChildOverride | null {
  return this.withSubParserContext(ctx =>
    StateChildParser.parseStateChildOverride(ctx, this.stateChildParserCallbacks(ctx))
  )
}

/**
 * Parse a child instance within a state block
 * This allows states to have completely different children (like Figma Variants)
 * Syntax: ComponentName "content", property value
 */
export function parseStateChildInstance(this: Parser): Instance | null {
  return this.withSubParserContext(ctx =>
    StateChildParser.parseStateChildInstance(ctx, this.stateChildParserCallbacks(ctx))
  )
}
