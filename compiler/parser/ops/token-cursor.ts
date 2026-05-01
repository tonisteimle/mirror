/**
 * Parser ops — token-cursor
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
import { Parser, JS_KEYWORDS } from '../parser'

export function generateNodeId(this: Parser): string {
  return `def-${++this.nodeIdCounter}`
}

/**
 * Create a Text instance from a string token.
 */
export function createTextChild(this: Parser, token: Token): Instance {
  return {
    type: 'Instance',
    component: 'Text',
    name: null,
    properties: [
      {
        type: 'Property',
        name: 'content',
        values: [token.value],
        line: token.line,
        column: token.column,
      },
    ],
    children: [],
    states: [],
    events: [],
    line: token.line,
    column: token.column,
  }
}

export function isJavaScriptKeyword(this: Parser): boolean {
  const current = this.current()
  return current && JS_KEYWORDS.has(current.value)
}

export function isBooleanIdentifier(this: Parser, offset: number): boolean {
  const token = this.peekAt(offset)
  if (!token || token.type !== 'IDENTIFIER') return false
  return token.value === 'true' || token.value === 'false'
}

export function skipNewlines(this: Parser): void {
  while (this.check('NEWLINE')) {
    this.advance()
  }
}

export function current(this: Parser): Token {
  return this.tokens[this.pos]
}

export function check(this: Parser, type: TokenType): boolean {
  if (this.isAtEnd()) return false
  return this.current().type === type
}

export function checkNext(this: Parser, type: TokenType): boolean {
  if (this.pos + 1 >= this.tokens.length) return false
  return this.tokens[this.pos + 1].type === type
}

/**
 * Check if the next token can be used as a property name.
 * Includes IDENTIFIER and reserved keywords (KEYWORD_TOKEN_TYPES).
 * Used for property access chains like `card.desc` where `desc` is a keyword.
 */
export function checkNextIsPropertyName(this: Parser): boolean {
  if (this.pos + 1 >= this.tokens.length) return false
  const nextType = this.tokens[this.pos + 1].type
  return nextType === 'IDENTIFIER' || KEYWORD_TOKEN_TYPES.includes(nextType)
}

/**
 * Get the value of the next token if it can be used as a property name.
 * Returns the value for IDENTIFIER or reserved keyword tokens.
 */
export function advancePropertyName(this: Parser): string {
  const token = this.advance()
  // For reserved keywords, the token value is uppercase, but we want the lowercase property name
  if (token.type !== 'IDENTIFIER') {
    return token.type.toLowerCase()
  }
  return token.value
}

export function checkAt(this: Parser, offset: number, type: TokenType): boolean {
  if (this.pos + offset >= this.tokens.length) return false
  return this.tokens[this.pos + offset].type === type
}

export function peekAt(this: Parser, offset: number): Token | null {
  if (this.pos + offset >= this.tokens.length) return null
  return this.tokens[this.pos + offset]
}

export function advance(this: Parser): Token {
  if (!this.isAtEnd()) this.pos++
  return this.tokens[this.pos - 1]
}

export function previous(this: Parser): Token | null {
  if (this.pos === 0) return null
  return this.tokens[this.pos - 1]
}

export function expect(this: Parser, type: TokenType): Token | null {
  if (this.check(type)) return this.advance()
  const code: ParseErrorCode = type === 'COLON' ? 'missing-colon' : 'unexpected-token'
  this.addError(`Expected ${type} but got ${this.current()?.type}`, undefined, code)
  return null
}

export function addError(
  this: Parser,
  message: string,
  hint?: string,
  code?: ParseErrorCode
): void {
  const token = this.current()
  this.errors.push({
    message,
    line: token?.line ?? 0,
    column: token?.column ?? 0,
    hint,
    code,
  })
}

export function recoverToNextDefinition(this: Parser): void {
  // Skip tokens until we find a likely next definition start:
  // - After NEWLINE, check if next token could start a definition
  // - Or end of file
  for (let iter = 0; !this.isAtEnd() && iter < Parser.MAX_ITERATIONS; iter++) {
    if (this.check('NEWLINE')) {
      this.advance()
      // After newline, check if next token could start a new definition
      const next = this.current()
      if (next && (next.type === 'IDENTIFIER' || next.type === 'EACH' || next.type === 'IF')) {
        // Found start of new definition
        return
      }
    } else {
      this.advance()
    }
  }
}

export function isAtEnd(this: Parser): boolean {
  return this.current()?.type === 'EOF'
}

/**
 * Check if a string starts with an uppercase letter (component name convention)
 */
export function isUppercase(this: Parser, str: string): boolean {
  if (!str || str.length === 0) return false
  const firstChar = str.charAt(0)
  return firstChar >= 'A' && firstChar <= 'Z'
}
