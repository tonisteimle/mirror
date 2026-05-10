/**
 * Parser ops — parse-events
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import type { Property, Event, Action } from '../ast'
import * as PropertyParser from '../property-parser'
import * as EventParser from '../event-parser'
import type { Parser } from '../parser'

export function parseProperty(this: Parser): Property | null {
  return this.withSubParserContext(ctx => PropertyParser.parseProperty(ctx))
}

/**
 * Check if an identifier followed by ( could be an implicit onclick action.
 * Returns true for action names and custom function names.
 * Returns false for property starters, boolean properties, states, keys, and events.
 */
export function isImplicitOnclickCandidate(this: Parser, name: string): boolean {
  return EventParser.isImplicitOnclickCandidate(name)
}

/**
 * Parse implicit onclick syntax: toggle(), show(Menu), etc.
 * Multiple actions can be chained: toggle(), show(Panel)
 */
export function parseImplicitOnclick(this: Parser): Event | null {
  return this.withSubParserContext(ctx => EventParser.parseImplicitOnclick(ctx))
}

export function parseEvent(this: Parser): Event | null {
  return this.withSubParserContext(ctx => EventParser.parseEvent(ctx))
}

export function parseAction(this: Parser): Action | null {
  return this.withSubParserContext(ctx => EventParser.parseAction(ctx))
}

export function parseKeysBlock(this: Parser, events: Event[]): void {
  this.withSubParserContext(ctx => EventParser.parseKeysBlock(ctx, events))
}
