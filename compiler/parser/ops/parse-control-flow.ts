/**
 * Parser ops — parse-control-flow
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import { Token, TokenType, tokenize, tokenizeWithErrors, type LexerError } from '../lexer'
import { resolvePositionalArgs } from '../../positional-resolver'
import type {
  AST,
  Program,
  CanvasDefinition,
  TokenDefinition,
  ComponentDefinition,
  Instance,
  Property,
  State,
  Event,
  Action,
  Each,
  Slot,
  Expression,
  Conditional,
  ConditionalNode,
  TokenReference,
  ComputedExpression,
  LoopVarReference,
  ParseError,
  ParseErrorCode,
  JavaScriptBlock,
  AnimationDefinition,
  AnimationKeyframe,
  AnimationKeyframeProperty,
  ZagNode,
  ZagSlotDef,
  ZagItem,
  SourcePosition,
  ChildOverride,
  StateDependency,
  StateAnimation,
  SchemaDefinition,
  SchemaField,
  SchemaType,
  SchemaConstraint,
  IconDefinition,
} from '../ast'
import {
  PROPERTY_STARTERS,
  ALL_BOOLEAN_PROPERTIES,
  KEYBOARD_KEYS,
  STATE_NAMES,
  SYSTEM_STATES,
  STATE_MODIFIERS,
  ACTION_NAMES,
  EVENT_NAMES,
  ANIMATION_PRESETS,
  EASING_FUNCTIONS,
  parseDuration,
  isValidProperty,
} from '../../schema/parser-helpers'
import { isPrimitive, getEvent, isDevicePreset } from '../../schema/dsl'
import { isZagPrimitive } from '../../schema/zag-primitives'
import { logParser as log } from '../../utils/logger'
import {
  isChartPrimitive,
  isChartSlot,
  getChartSlot,
  getChartSlotProperty,
} from '../../schema/chart-primitives'
import type { ChartSlotNode } from '../ast'
import {
  parseZagComponent as parseZagComponentExtracted,
  type ZagParserCallbacks,
} from '../zag-parser'
import { parseAnimationDefinition as parseAnimationDefinitionExtracted } from '../animation-parser'
import type { ParserContext } from '../parser-context'
import {
  parseTokenDefinition as parseTokenDefinitionExtracted,
  parseTokenWithSuffixSingleToken as parseTokenWithSuffixSingleTokenExtracted,
  parseTokenWithSuffix as parseTokenWithSuffixExtracted,
  parseTokenReference as parseTokenReferenceExtracted,
  parseLegacyTokenDefinition as parseLegacyTokenDefinitionExtracted,
} from '../token-parser'
import { isStateBlockStart as isStateBlockStartExtracted } from '../state-detector'
import { parseTernaryExpression as parseTernaryExpressionExtracted } from '../ternary-parser'
import { parseDataObject as parseDataObjectExtracted } from '../data-object-parser'
import { parseProperty as parsePropertyExtracted } from '../property-parser'
import {
  parseInlineProperties as parseInlinePropertiesExtracted,
  type InlinePropertiesCallbacks,
} from '../inline-property-parser'
import {
  parseInstanceBody as parseInstanceBodyExtracted,
  parseComponentBody as parseComponentBodyExtracted,
  type InstanceBodyCallbacks,
  type ComponentBodyCallbacks,
} from '../body-parser'
import { parseExpression as parseExpressionExtracted } from '../expression-parser'
import {
  parseEach as parseEachExtracted,
  parseConditionalBlock as parseConditionalBlockExtracted,
  parseArrayLiteral as parseArrayLiteralExtracted,
  parseObjectLiteral as parseObjectLiteralExtracted,
  type EachParserCallbacks,
} from '../each-parser'
import {
  parseEvent as parseEventExtracted,
  parseAction as parseActionExtracted,
  parseImplicitOnclick as parseImplicitOnclickExtracted,
  parseKeysBlock as parseKeysBlockExtracted,
  isImplicitOnclickCandidate as isImplicitOnclickCandidateExtracted,
} from '../event-parser'
import {
  parseStateChildOverride as parseStateChildOverrideExtracted,
  parseStateChildInstance as parseStateChildInstanceExtracted,
  type StateChildParserCallbacks,
} from '../state-child-parser'
import {
  parseSchema as parseSchemaExtracted,
  parseSchemaField as parseSchemaFieldExtracted,
  parseIconDefinitions as parseIconDefinitionsExtracted,
} from '../declaration-parser'
import { KEYWORD_TOKEN_TYPES } from '../parser-context'
import type { Parser } from '../parser'

export function parseEach(this: Parser): Each | null {
  return this.withSubParserContext(ctx => parseEachExtracted(ctx, this.eachParserCallbacks(ctx)))
}

/**
 * Parse an inline array literal: ["Apple", "Banana", "Cherry"]
 * Also supports objects: [{ name: "Alice", age: 30 }, { name: "Bob" }]
 * Returns the array as a JavaScript string representation.
 */
export function parseArrayLiteral(this: Parser): string {
  return this.withSubParserContext(ctx => parseArrayLiteralExtracted(ctx))
}

/**
 * Parse an inline object literal: { name: "Alice", age: 30 }
 * Returns the object as a JavaScript string representation.
 */
export function parseObjectLiteral(this: Parser): string {
  return this.withSubParserContext(ctx => parseObjectLiteralExtracted(ctx))
}

export function parseConditionalBlock(this: Parser): ConditionalNode {
  return this.withSubParserContext(ctx =>
    parseConditionalBlockExtracted(ctx, this.eachParserCallbacks(ctx))
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
  return isStateBlockStartExtracted({
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
    parseStateChildOverrideExtracted(ctx, this.stateChildParserCallbacks(ctx))
  )
}

/**
 * Parse a child instance within a state block
 * This allows states to have completely different children (like Figma Variants)
 * Syntax: ComponentName "content", property value
 */
export function parseStateChildInstance(this: Parser): Instance | null {
  return this.withSubParserContext(ctx =>
    parseStateChildInstanceExtracted(ctx, this.stateChildParserCallbacks(ctx))
  )
}
