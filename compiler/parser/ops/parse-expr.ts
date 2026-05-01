/**
 * Parser ops — parse-expr
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

/**
 * Collect the next operand in an expression, handling parenthesized sub-expressions.
 * For example: "Summe: €" + ($count * $price)
 * When called after the +, this collects everything inside the parentheses as a single sub-expression.
 *
 * Returns the operand and any additional operators/parts found (for nested expressions).
 */
export function collectExpressionOperand(
  this: Parser,
  parts: ComputedExpression['parts'],
  operators: string[]
): void {
  // Handle parenthesized sub-expression
  if (this.check('LPAREN')) {
    parts.push(this.advance().value) // (

    // Collect sub-expression inside parentheses
    this.collectSubExpression(parts, operators)

    // Expect closing paren
    if (this.check('RPAREN')) {
      parts.push(this.advance().value)
    }
    return
  }

  // Simple operand (not parenthesized)
  if (this.check('STRING')) {
    parts.push(this.advance().value)
  } else if (this.check('NUMBER')) {
    parts.push(parseFloat(this.advance().value))
  } else if (this.check('IDENTIFIER')) {
    let combined = this.advance().value
    while (this.check('DOT') && this.checkNextIsPropertyName()) {
      this.advance() // .
      combined += '.' + this.advancePropertyName()
    }
    // Handle array indexing: user.name[0]
    while (this.check('LBRACKET')) {
      this.advance() // [
      if (this.check('NUMBER')) {
        combined += '[' + this.advance().value + ']'
      }
      if (this.check('RBRACKET')) {
        this.advance() // ]
      }
    }
    // Handle method call arguments: $users.sum(hours), $items.sum(data.stats.value)
    if (this.check('LPAREN')) {
      this.advance() // consume (
      const args: string[] = []
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        if (this.check('IDENTIFIER') || this.check('DATA')) {
          // Collect full path: data.stats.value (DATA token) or item.name (IDENTIFIER)
          let argPath = this.advance().value
          while (this.check('DOT')) {
            this.advance() // consume .
            if (this.check('IDENTIFIER') || this.check('DATA')) {
              argPath += '.' + this.advance().value
            } else {
              break
            }
          }
          args.push(argPath)
        } else if (this.check('COMMA')) {
          this.advance() // skip comma
        } else {
          break
        }
      }
      if (this.check('RPAREN')) {
        this.advance() // consume )
      }
      combined += '(' + args.join(', ') + ')'
    }
    if (combined.startsWith('$')) {
      parts.push({ kind: 'token' as const, name: combined.slice(1) })
    } else {
      // Bare identifier (e.g., product.price) - treat as loop variable reference
      parts.push({ kind: 'loopVar' as const, name: combined })
    }
  }
}

/**
 * Collect a sub-expression inside parentheses.
 * Handles: operand operator operand operator ...
 */
export function collectSubExpression(
  this: Parser,
  parts: ComputedExpression['parts'],
  operators: string[]
): void {
  // Get first operand
  if (this.check('STRING')) {
    parts.push(this.advance().value)
  } else if (this.check('NUMBER')) {
    parts.push(parseFloat(this.advance().value))
  } else if (this.check('IDENTIFIER')) {
    let combined = this.advance().value
    while (this.check('DOT') && this.checkNextIsPropertyName()) {
      this.advance()
      combined += '.' + this.advancePropertyName()
    }
    // Handle array indexing: user.name[0]
    while (this.check('LBRACKET')) {
      this.advance() // [
      if (this.check('NUMBER')) {
        combined += '[' + this.advance().value + ']'
      }
      if (this.check('RBRACKET')) {
        this.advance() // ]
      }
    }
    if (combined.startsWith('$')) {
      parts.push({ kind: 'token' as const, name: combined.slice(1) })
    } else {
      // Bare identifier - treat as loop variable reference
      parts.push({ kind: 'loopVar' as const, name: combined })
    }
  } else if (this.check('LPAREN')) {
    // Nested parentheses
    parts.push(this.advance().value)
    this.collectSubExpression(parts, operators)
    if (this.check('RPAREN')) {
      parts.push(this.advance().value)
    }
  }

  // Collect operator and next operand pairs
  while (this.check('PLUS') || this.check('MINUS') || this.check('STAR') || this.check('SLASH')) {
    operators.push(this.advance().value)

    // Get next operand
    if (this.check('STRING')) {
      parts.push(this.advance().value)
    } else if (this.check('NUMBER')) {
      parts.push(parseFloat(this.advance().value))
    } else if (this.check('IDENTIFIER')) {
      let combined = this.advance().value
      while (this.check('DOT') && this.checkNextIsPropertyName()) {
        this.advance()
        combined += '.' + this.advancePropertyName()
      }
      // Handle array indexing: user.name[0]
      while (this.check('LBRACKET')) {
        this.advance() // [
        if (this.check('NUMBER')) {
          combined += '[' + this.advance().value + ']'
        }
        if (this.check('RBRACKET')) {
          this.advance() // ]
        }
      }
      if (combined.startsWith('$')) {
        parts.push({ kind: 'token' as const, name: combined.slice(1) })
      } else {
        // Bare identifier - treat as loop variable reference
        parts.push({ kind: 'loopVar' as const, name: combined })
      }
    } else if (this.check('LPAREN')) {
      // Nested parentheses
      parts.push(this.advance().value)
      this.collectSubExpression(parts, operators)
      if (this.check('RPAREN')) {
        parts.push(this.advance().value)
      }
    } else {
      break
    }
  }
}

export function parseExpression(this: Parser): Expression {
  return this.withSubParserContext(ctx => parseExpressionExtracted(ctx))
}
