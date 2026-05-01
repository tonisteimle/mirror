/**
 * Parser ops — parse-decls
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
import { Parser } from '../parser'

export function parseTokenDefinition(this: Parser, section?: string): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseTokenDefinitionExtracted(ctx, section))
}

export function parseTokenWithSuffixSingleToken(
  this: Parser,
  section?: string
): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseTokenWithSuffixSingleTokenExtracted(ctx, section))
}

export function parseTokenWithSuffix(this: Parser, section?: string): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseTokenWithSuffixExtracted(ctx, section))
}

export function parseTokenReference(this: Parser, section?: string): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseTokenReferenceExtracted(ctx, section))
}

export function parseLegacyTokenDefinition(this: Parser, section?: string): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseLegacyTokenDefinitionExtracted(ctx, section))
}

/**
 * Parse a schema definition
 *
 * Syntax:
 *   $schema:
 *     title: string, required
 *     assignee: $users
 *     watchers: $users[], max 5
 *     project: $projects, onDelete cascade
 */
export function parseSchema(this: Parser): SchemaDefinition | null {
  return this.withSubParserContext(ctx => parseSchemaExtracted(ctx))
}

/**
 * Parse a single schema field
 *
 * Syntax:
 *   fieldName: type [, constraint1] [, constraint2]
 *
 * Types:
 *   - string, number, boolean (primitives)
 *   - $collection (N:1 relation)
 *   - $collection[] (N:N relation)
 *
 * Constraints:
 *   - required
 *   - max N
 *   - onDelete cascade|nullify|restrict
 */
export function parseSchemaField(this: Parser): SchemaField | null {
  return this.withSubParserContext(ctx => parseSchemaFieldExtracted(ctx))
}

/**
 * Parse custom icon definitions
 *
 * Syntax:
 *   $icons:
 *     hbox: "M3 3h18v18H3z M9 3v18"
 *     vbox: "M3 3h18v18H3z M21 9H3"
 *     grid: "M3 3h8v8H3z M13 3h8v8h-8z"
 */
export function parseIconDefinitions(this: Parser): IconDefinition[] {
  return this.withSubParserContext(ctx => parseIconDefinitionsExtracted(ctx))
}

export function parseDataObject(this: Parser, section?: string): TokenDefinition | null {
  return this.withSubParserContext(ctx => parseDataObjectExtracted(ctx, section))
}

/**
 * Parse a numeric array: [20, 80] → number[]
 * Used for properties like defaultValue in RangeSlider.
 * Stays in parser.ts because it's exposed via ZagParserCallbacks.
 */
export function parseNumericArray(this: Parser): number[] {
  const items: number[] = []
  this.advance() // [

  for (
    let iter = 0;
    !this.isAtEnd() && !this.check('RBRACKET') && iter < Parser.MAX_ITERATIONS;
    iter++
  ) {
    if (this.check('NUMBER')) {
      items.push(parseFloat(this.advance().value))
    } else if (this.check('COMMA')) {
      this.advance()
    } else {
      break
    }
  }

  if (this.check('RBRACKET')) {
    this.advance()
  }

  return items
}

/**
 * Parse a property set (mixin/stylesheet)
 *
 * Syntax:
 *   standardtext: fs 14, col #888, weight 500
 *   cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
 *
 * Property sets are reusable property combinations that can be
 * spread onto elements using $name syntax:
 *   Text "Hello", $standardtext
 *   Frame $cardstyle
 */
export function parsePropertySet(this: Parser, section?: string): TokenDefinition | null {
  const nameToken = this.advance() // name
  const line = nameToken.line
  const column = nameToken.column
  this.advance() // :

  // Remove $ prefix if present (for backwards compatibility)
  let name = nameToken.value
  if (name.startsWith('$')) {
    name = name.slice(1)
  }

  // Parse properties on the same line until NEWLINE or EOF
  const properties: Property[] = []

  for (
    let iter = 0;
    !this.isAtEnd() && !this.check('NEWLINE') && !this.check('EOF') && iter < Parser.MAX_ITERATIONS;
    iter++
  ) {
    // Skip comma separators
    if (this.check('COMMA')) {
      this.advance()
      continue
    }

    // Token reference inside a property-set: `$other` becomes a propset-property
    // so the property-set-expander recursively expands the referenced mixin.
    // E.g. `b: $a, bg #f00` → b has properties [propset(a), bg #f00].
    if (this.check('IDENTIFIER') && this.current().value.startsWith('$')) {
      const refToken = this.advance()
      const refName = refToken.value.slice(1) // strip $
      properties.push({
        type: 'Property',
        name: 'propset',
        values: [{ kind: 'token', name: refName }],
        line: refToken.line,
        column: refToken.column,
      })
      continue
    }

    // Parse next property
    const prop = this.parseProperty()
    if (prop) {
      properties.push(prop)
    } else {
      // Skip unknown token
      this.advance()
    }
  }

  // Skip trailing newline if present
  if (this.check('NEWLINE')) {
    this.advance()
  }

  return {
    type: 'Token',
    name,
    properties,
    section,
    line,
    column,
  }
}
