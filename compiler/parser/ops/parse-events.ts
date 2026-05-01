/**
 * Parser ops — parse-events
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import type { Property, Event, Action } from '../ast'
import { parseProperty as parsePropertyExtracted } from '../property-parser'
import {
  parseEvent as parseEventExtracted,
  parseAction as parseActionExtracted,
  parseImplicitOnclick as parseImplicitOnclickExtracted,
  parseKeysBlock as parseKeysBlockExtracted,
  isImplicitOnclickCandidate as isImplicitOnclickCandidateExtracted,
} from '../event-parser'
import type { Parser } from '../parser'

export function parseProperty(this: Parser): Property | null {
  return this.withSubParserContext(ctx => parsePropertyExtracted(ctx))
}

/**
 * Check if an identifier followed by ( could be an implicit onclick action.
 * Returns true for action names and custom function names.
 * Returns false for property starters, boolean properties, states, keys, and events.
 */
export function isImplicitOnclickCandidate(this: Parser, name: string): boolean {
  return isImplicitOnclickCandidateExtracted(name)
}

/**
 * Parse implicit onclick syntax: toggle(), show(Menu), etc.
 * Multiple actions can be chained: toggle(), show(Panel)
 */
export function parseImplicitOnclick(this: Parser): Event | null {
  return this.withSubParserContext(ctx => parseImplicitOnclickExtracted(ctx))
}

export function parseEvent(this: Parser): Event | null {
  return this.withSubParserContext(ctx => parseEventExtracted(ctx))
}

export function parseAction(this: Parser): Action | null {
  return this.withSubParserContext(ctx => parseActionExtracted(ctx))
}

export function parseKeysBlock(this: Parser, events: Event[]): void {
  this.withSubParserContext(ctx => parseKeysBlockExtracted(ctx, events))
}
