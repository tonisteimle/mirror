/**
 * Mirror Parser
 *
 * Parses tokens into an AST.
 * Property recognition is driven by the schema (src/schema/dsl.ts).
 */

import { Token, TokenType, tokenize, tokenizeWithErrors, type LexerError } from './lexer'
import { resolvePositionalArgs } from '../positional-resolver'
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
} from './ast'
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
} from '../schema/parser-helpers'
import { isPrimitive, getEvent, isDevicePreset } from '../schema/dsl'
import { isZagPrimitive } from '../schema/zag-primitives'
import { logParser as log } from '../utils/logger'
import {
  isChartPrimitive,
  isChartSlot,
  getChartSlot,
  getChartSlotProperty,
} from '../schema/chart-primitives'
import type { ChartSlotNode } from './ast'
import {
  parseZagComponent as parseZagComponentExtracted,
  type ZagParserCallbacks,
} from './zag-parser'
import { parseAnimationDefinition as parseAnimationDefinitionExtracted } from './animation-parser'
import type { ParserContext } from './parser-context'
import {
  parseTokenDefinition as parseTokenDefinitionExtracted,
  parseTokenWithSuffixSingleToken as parseTokenWithSuffixSingleTokenExtracted,
  parseTokenWithSuffix as parseTokenWithSuffixExtracted,
  parseTokenReference as parseTokenReferenceExtracted,
  parseLegacyTokenDefinition as parseLegacyTokenDefinitionExtracted,
} from './token-parser'
import { isStateBlockStart as isStateBlockStartExtracted } from './state-detector'
import { parseTernaryExpression as parseTernaryExpressionExtracted } from './ternary-parser'
import { parseDataObject as parseDataObjectExtracted } from './data-object-parser'
import { parseProperty as parsePropertyExtracted } from './property-parser'
import {
  parseInlineProperties as parseInlinePropertiesExtracted,
  type InlinePropertiesCallbacks,
} from './inline-property-parser'
import {
  parseInstanceBody as parseInstanceBodyExtracted,
  parseComponentBody as parseComponentBodyExtracted,
  type InstanceBodyCallbacks,
  type ComponentBodyCallbacks,
} from './body-parser'
import { parseExpression as parseExpressionExtracted } from './expression-parser'
import {
  parseEach as parseEachExtracted,
  parseConditionalBlock as parseConditionalBlockExtracted,
  parseArrayLiteral as parseArrayLiteralExtracted,
  parseObjectLiteral as parseObjectLiteralExtracted,
  type EachParserCallbacks,
} from './each-parser'
import {
  parseEvent as parseEventExtracted,
  parseAction as parseActionExtracted,
  parseImplicitOnclick as parseImplicitOnclickExtracted,
  parseKeysBlock as parseKeysBlockExtracted,
  isImplicitOnclickCandidate as isImplicitOnclickCandidateExtracted,
} from './event-parser'
import {
  parseStateChildOverride as parseStateChildOverrideExtracted,
  parseStateChildInstance as parseStateChildInstanceExtracted,
  type StateChildParserCallbacks,
} from './state-child-parser'
import {
  parseSchema as parseSchemaExtracted,
  parseSchemaField as parseSchemaFieldExtracted,
  parseIconDefinitions as parseIconDefinitionsExtracted,
} from './declaration-parser'
import { KEYWORD_TOKEN_TYPES } from './parser-context'

/** Property value type - union of all possible values in Property.values (includes number[] for array props like slider defaultValue) */
type PropertyValue =
  | string
  | number
  | boolean
  | number[]
  | TokenReference
  | LoopVarReference
  | Conditional
  | ComputedExpression

// JavaScript keywords that signal the start of JS code
export const JS_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'class'])

// Note: KEYBOARD_KEYS and STATE_NAMES are now imported from parser-helpers.ts
// They are derived from the schema (dsl.ts) to ensure consistency.

import * as token_cursor from './ops/token-cursor'
import * as parse_decls from './ops/parse-decls'
import * as parse_blocks from './ops/parse-blocks'
import * as parse_events from './ops/parse-events'
import * as parse_control_flow from './ops/parse-control-flow'
import * as parse_expr from './ops/parse-expr'
import * as parse_misc from './ops/parse-misc'

export class Parser {
  tokens: Token[]
  pos: number = 0
  errors: ParseError[] = []
  source: string
  nodeIdCounter: number = 0
  /**
   * Stack of loop variable names from enclosing each loops.
   * Used to recognize loop variable references like `user.name` as content
   * rather than properties.
   */
  loopVariables: Set<string> = new Set()

  /**
   * Maximum iterations for while loops to prevent infinite loops.
   * This is a safety measure - real code should never hit this limit.
   */
  static readonly MAX_ITERATIONS = 100000

  /**
   * Maximum lookahead distance for line-based scans.
   * Prevents DoS from malformed input with very long lines.
   */
  static readonly MAX_LOOKAHEAD = 1000

  /**
   * Maximum depth for condition chains (and/or).
   * Prevents infinite loops in cross-element state conditions.
   */
  static readonly MAX_CONDITION_DEPTH = 100

  constructor(tokens: Token[], source: string = '') {
    this.tokens = tokens
    this.source = source
  }

  // === Bound ops methods (extracted to ./ops/*.ts) ===
  // token-cursor.ts
  generateNodeId = token_cursor.generateNodeId
  createTextChild = token_cursor.createTextChild
  isJavaScriptKeyword = token_cursor.isJavaScriptKeyword
  isBooleanIdentifier = token_cursor.isBooleanIdentifier
  skipNewlines = token_cursor.skipNewlines
  current = token_cursor.current
  check = token_cursor.check
  checkNext = token_cursor.checkNext
  checkNextIsPropertyName = token_cursor.checkNextIsPropertyName
  advancePropertyName = token_cursor.advancePropertyName
  checkAt = token_cursor.checkAt
  peekAt = token_cursor.peekAt
  advance = token_cursor.advance
  previous = token_cursor.previous
  expect = token_cursor.expect
  addError = token_cursor.addError
  recoverToNextDefinition = token_cursor.recoverToNextDefinition
  isAtEnd = token_cursor.isAtEnd
  isUppercase = token_cursor.isUppercase
  // parse-decls.ts
  parseTokenDefinition = parse_decls.parseTokenDefinition
  parseTokenWithSuffixSingleToken = parse_decls.parseTokenWithSuffixSingleToken
  parseTokenWithSuffix = parse_decls.parseTokenWithSuffix
  parseTokenReference = parse_decls.parseTokenReference
  parseLegacyTokenDefinition = parse_decls.parseLegacyTokenDefinition
  parseSchema = parse_decls.parseSchema
  parseSchemaField = parse_decls.parseSchemaField
  parseIconDefinitions = parse_decls.parseIconDefinitions
  parseDataObject = parse_decls.parseDataObject
  parseNumericArray = parse_decls.parseNumericArray
  parsePropertySet = parse_decls.parsePropertySet
  // parse-blocks.ts
  parseComponentOrInstance = parse_blocks.parseComponentOrInstance
  parseComponentDefinition = parse_blocks.parseComponentDefinition
  parseComponentInheritance = parse_blocks.parseComponentInheritance
  parseComponentDefinitionWithDefaultPrimitive =
    parse_blocks.parseComponentDefinitionWithDefaultPrimitive
  parseInstance = parse_blocks.parseInstance
  parseSlotPrimitive = parse_blocks.parseSlotPrimitive
  hasInlineChildSyntax = parse_blocks.hasInlineChildSyntax
  hasColonOnLine = parse_blocks.hasColonOnLine
  parseInlineChildrenAfterSemicolon = parse_blocks.parseInlineChildrenAfterSemicolon
  parseInlineChild = parse_blocks.parseInlineChild
  parseComponentBody = parse_blocks.parseComponentBody
  parseInstanceBody = parse_blocks.parseInstanceBody
  parseChartSlot = parse_blocks.parseChartSlot
  parseInlineChildren = parse_blocks.parseInlineChildren
  parseInlineProperties = parse_blocks.parseInlineProperties
  parseDataBindingValues = parse_blocks.parseDataBindingValues
  // parse-events.ts
  parseProperty = parse_events.parseProperty
  isImplicitOnclickCandidate = parse_events.isImplicitOnclickCandidate
  parseImplicitOnclick = parse_events.parseImplicitOnclick
  parseEvent = parse_events.parseEvent
  parseAction = parse_events.parseAction
  parseKeysBlock = parse_events.parseKeysBlock
  // parse-control-flow.ts
  parseEach = parse_control_flow.parseEach
  parseArrayLiteral = parse_control_flow.parseArrayLiteral
  parseObjectLiteral = parse_control_flow.parseObjectLiteral
  parseConditionalBlock = parse_control_flow.parseConditionalBlock
  parseWhenClause = parse_control_flow.parseWhenClause
  isStateBlockStart = parse_control_flow.isStateBlockStart
  parseStateChildOverride = parse_control_flow.parseStateChildOverride
  parseStateChildInstance = parse_control_flow.parseStateChildInstance
  // parse-expr.ts
  collectExpressionOperand = parse_expr.collectExpressionOperand
  collectSubExpression = parse_expr.collectSubExpression
  parseExpression = parse_expr.parseExpression
  // parse-misc.ts
  parseJavaScript = parse_misc.parseJavaScript
  withSubParserContext = parse_misc.withSubParserContext
  stateChildParserCallbacks = parse_misc.stateChildParserCallbacks
  eachParserCallbacks = parse_misc.eachParserCallbacks
  parseRoutePath = parse_misc.parseRoutePath
  parseBindPath = parse_misc.parseBindPath
  parseSelectionVar = parse_misc.parseSelectionVar
  parseRouteClause = parse_misc.parseRouteClause
  parseZagComponentWithContext = parse_misc.parseZagComponentWithContext
  parseAnimationDefinitionWithContext = parse_misc.parseAnimationDefinitionWithContext
  parseCanvas = parse_misc.parseCanvas

  parse(): AST {
    const program: Program = {
      type: 'Program',
      line: 1,
      column: 1,
      imports: [],
      tokens: [],
      components: [],
      animations: [],
      instances: [],
      icons: [],
      errors: [],
    }

    // Check for canvas at start (must be first non-empty line)
    this.skipNewlines()
    if (this.check('CANVAS')) {
      program.canvas = this.parseCanvas()
    }

    // Track current section for tokens
    let currentSection: string | undefined = undefined

    let iterations = 0
    while (!this.isAtEnd() && iterations++ < Parser.MAX_ITERATIONS) {
      this.skipNewlines()

      if (this.isAtEnd()) break

      // Section headers - track for token grouping
      if (this.check('SECTION')) {
        const sectionToken = this.advance()
        currentSection = sectionToken.value as string
        continue
      }

      // Use statement: use filename (imports components from another file)
      // e.g., use components → imports from components.mirror
      if (this.check('USE')) {
        this.advance() // consume 'use'
        if (this.check('IDENTIFIER')) {
          const filename = this.advance().value
          program.imports.push(filename)
        }
        continue
      }

      // Token definition: name: value (simplified syntax)
      // e.g., primary: #5BA8F5 or spacing: 16 or font: "Inter" or loggedIn: true
      // Also handles legacy: $name: value (without .)
      // Note: Excludes names with . which are handled by other rules
      // Boolean values (true/false) are IDENTIFIER tokens
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        !this.peekAt(0)?.value.includes('.') &&
        (this.checkAt(2, 'NUMBER') || this.checkAt(2, 'STRING') || this.isBooleanIdentifier(2))
      ) {
        const token = this.parseTokenDefinition(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Token definition with suffix (single token): name.suffix: value
      // e.g., primary.bg: #2271C1 or card.rad: 12 or btn.col: white
      // The lexer combines name.suffix into one IDENTIFIER token
      // Note: No $ prefix at definition - $ is only used when referencing
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.peekAt(0)?.value.includes('.') &&
        !this.peekAt(0)?.value.startsWith('$') &&
        (this.checkAt(2, 'NUMBER') || this.checkAt(2, 'STRING') || this.checkAt(2, 'IDENTIFIER'))
      ) {
        const token = this.parseTokenWithSuffixSingleToken(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Token definition with suffix (legacy: separate tokens): name.suffix: value
      // This handles cases where lexer might produce separate tokens
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('DOT') &&
        !this.peekAt(0)?.value.startsWith('$') &&
        this.checkAt(2, 'IDENTIFIER') &&
        this.checkAt(3, 'COLON') &&
        (this.checkAt(4, 'NUMBER') || this.checkAt(4, 'STRING') || this.checkAt(4, 'IDENTIFIER'))
      ) {
        const token = this.parseTokenWithSuffix(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Token reference: name.suffix: $other (token referencing another token)
      // e.g., accent.bg: $primary or surface.bg: $grey-800
      // Left side has no $, right side has $ (it's a reference)
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.checkAt(2, 'IDENTIFIER') &&
        this.peekAt(0)?.value.includes('.') &&
        !this.peekAt(0)?.value.startsWith('$') &&
        this.peekAt(2)?.value.startsWith('$') &&
        (this.checkAt(3, 'NEWLINE') || this.checkAt(3, 'EOF') || this.checkAt(3, 'COMMENT'))
      ) {
        const token = this.parseTokenReference(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Legacy token definition with $ prefix (still supported for backwards compatibility)
      // e.g., $primary.bg: #2271C1
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.peekAt(0)?.value.startsWith('$') &&
        this.peekAt(0)?.value.includes('.') &&
        (this.checkAt(2, 'NUMBER') || this.checkAt(2, 'STRING') || this.checkAt(2, 'IDENTIFIER'))
      ) {
        const token = this.parseTokenWithSuffixSingleToken(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Legacy token reference with $ on both sides
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.checkAt(2, 'IDENTIFIER') &&
        this.peekAt(0)?.value.startsWith('$') &&
        this.peekAt(2)?.value.startsWith('$') &&
        (this.checkAt(3, 'NEWLINE') || this.checkAt(3, 'EOF') || this.checkAt(3, 'COMMENT'))
      ) {
        const token = this.parseTokenReference(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Schema definition: $schema: (with or without fields)
      // Must be checked BEFORE data object since $schema is a special case
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.peekAt(0)?.value === '$schema'
      ) {
        const schema = this.parseSchema()
        if (schema) program.schema = schema
        continue
      }

      // Custom icons definition: $icons:
      // Must be checked BEFORE data object since $icons is a special case
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.peekAt(0)?.value === '$icons'
      ) {
        const icons = this.parseIconDefinitions()
        if (icons.length > 0) {
          if (!program.icons) program.icons = []
          program.icons.push(...icons)
        }
        continue
      }

      // Data object OR Property Set definition
      // Both start with: name: (lowercase IDENTIFIER without .)
      //
      // Data object: name: followed by INDENT
      //   user:
      //     name: "Max"
      //
      // Property Set (mixin): name: followed by properties on same line
      //   standardtext: fs 14, col #888, weight 500
      //
      // Note: No $ prefix at definition - $ is only used when referencing
      // Important: Names with . are regular tokens, not data objects or property sets
      // e.g., $primary.bg: #2271C1 is a token, not a data object
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const name = this.peekAt(0)?.value
        // Strip $ prefix for checking - the name after $ must not contain .
        const nameWithoutDollar = name?.startsWith('$') ? name.slice(1) : name
        const hasNoDot = !nameWithoutDollar?.includes('.')
        const isLowercase =
          nameWithoutDollar &&
          nameWithoutDollar[0] === nameWithoutDollar[0].toLowerCase() &&
          hasNoDot

        if (isLowercase) {
          // Look ahead past COLON to determine type
          // Use MAX_LOOKAHEAD to prevent DoS on malformed input
          let lookAhead = 2
          while (
            (this.checkAt(lookAhead, 'NEWLINE') || this.checkAt(lookAhead, 'COMMENT')) &&
            lookAhead < Parser.MAX_LOOKAHEAD
          ) {
            lookAhead++
          }

          if (this.checkAt(lookAhead, 'INDENT')) {
            // Data object: has INDENT → nested attributes
            const dataObj = this.parseDataObject(currentSection)
            if (dataObj) program.tokens.push(dataObj)
            continue
          }

          // Check for Property Set: name: propertyName value, ...
          // Property Set has a valid property name after the colon (not followed by another colon or equals)
          // Note: If position 3 is EQUALS, it's legacy syntax: name: type = value
          // The first item after `:` may also be a `$other` propset-reference
          // (`b: $a, bg #f00`), so we accept identifiers starting with $ here.
          const afterColon = this.peekAt(2)?.value
          const afterColonIsRef = !!afterColon && afterColon.startsWith('$')
          if (
            afterColon &&
            (isValidProperty(afterColon) || afterColonIsRef) &&
            !this.checkAt(3, 'COLON') &&
            !this.checkAt(3, 'EQUALS') &&
            // For $-ref form, only treat as property-set if the line continues
            // beyond the single ref (otherwise it's a token-reference like
            // `accent.bg: $primary` which the earlier branch handles).
            !(
              afterColonIsRef &&
              (this.checkAt(3, 'NEWLINE') || this.checkAt(3, 'EOF') || this.checkAt(3, 'COMMENT'))
            )
          ) {
            const propSet = this.parsePropertySet(currentSection)
            if (propSet) program.tokens.push(propSet)
            continue
          }
        }
      }

      // Legacy token definition: name: type = value (still supported)
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        this.checkAt(2, 'IDENTIFIER') &&
        this.checkAt(3, 'EQUALS')
      ) {
        const token = this.parseLegacyTokenDefinition(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Each loop: each item in collection
      if (this.check('EACH')) {
        const each = this.parseEach()
        if (each) program.instances.push(each)
        continue
      }

      // If conditional: if condition
      if (this.check('IF')) {
        const conditional = this.parseConditionalBlock()
        if (conditional) program.instances.push(conditional)
        continue
      }

      // JavaScript block: starts with let, const, var, function, class
      if (this.check('IDENTIFIER') && this.isJavaScriptKeyword()) {
        const jsBlock = this.parseJavaScript()
        if (jsBlock) {
          program.javascript = jsBlock
        }
        break // JavaScript consumes rest of file
      }

      // Component, Animation, Instance, or ZagComponent
      if (this.check('IDENTIFIER')) {
        const node = this.parseComponentOrInstance()
        if (node) {
          if (node.type === 'Component') {
            program.components.push(node as ComponentDefinition)
          } else if (node.type === 'Animation') {
            program.animations.push(node as AnimationDefinition)
          } else if (node.type === 'ZagComponent') {
            // ZagNode is treated as an instance for now
            program.instances.push(node as ZagNode)
          } else {
            program.instances.push(node as Instance)
          }
        }
        continue
      }

      // Skip unknown — but if the current token is an IDENTIFIER followed by COLON
      // that didn't match any of the definition patterns above, surface an error so
      // the user gets feedback instead of a silently swallowed input (e.g. `name:`
      // with no value).
      const skipped = this.current()
      if (skipped && skipped.type === 'IDENTIFIER' && this.checkNext('COLON')) {
        this.addError(
          `Unrecognized definition: '${skipped.value}:' has no value or body`,
          `Provide a token value, component definition, or property set after ':'`,
          'unrecognized-definition'
        )
      }
      this.advance()
    }

    program.errors = this.errors
    return program
  }

  // Check if current identifier is a JavaScript keyword

  // Check if token at offset is a boolean identifier (true/false)

  // Parse JavaScript block (rest of file)

  // Five token-definition variants — implementations live in token-parser.ts.
  // Wrappers below delegate via a shared ParserContext so this class doesn't
  // need to know the parsing details.

  /**
   * Parse a data object definition
   *
   * Syntax (new - without $):
   *   post:
   *     title: "Mein Artikel"
   *     author: "Max"
   *
   * Syntax (legacy - with $, still supported):
   *   $post:
   *     title: "Mein Artikel"
   */
  // Implementation in data-object-parser.ts. Recurses into parseDataAttribute,
  // parseDataArray, parseDataReference, parseDataBlock — all extracted along
  // with parseDataObject, so the wrapper here is the only entry point left.

  // Parse a route path (e.g., "Home", "admin/users", "pages/settings")
  // Combines identifiers separated by slashes into a single path string

  // Parse component definition without explicit primitive: Name:
  // Defaults to Frame as the base primitive

  // Implementation in inline-property-parser.ts. Uses callbacks for the
  // parser-level methods that haven't been extracted yet (parseEvent,
  // parseRoutePath, parseDataBindingValues, parseImplicitOnclick, etc.).

  // Implementation in property-parser.ts. Single delegation — no callbacks
  // needed because parseProperty is a leaf (only calls ternary-parser, which
  // also takes a ParserContext directly).

  // ============================================================================
  // EACH LOOP PARSING
  // ============================================================================

  // ============================================================================
  // CONDITIONAL PARSING
  // ============================================================================

  // Helpers

  /**
   * Look ahead to determine if current STATE_NAME starts a state block.
   * Valid patterns:
   *   selected:                              → +1 is COLON
   *   selected onclick:                      → +1 is event, +2 is COLON
   *   selected exclusive onclick:            → +1 is modifier, +2 is event, +3 is COLON
   *   selected onkeydown escape:             → +1 is event, +2 is key, +3 is COLON
   *   selected toggle onkeydown escape:      → +1 is modifier, +2 is event, +3 is key, +4 is COLON
   *   visible when Menu open:                → +1 is 'when', +2 is Element, +3 is state, +4 is COLON
   *   visible when Menu open or Sidebar open: → with conditions
   */
  // Implementation lives in state-detector.ts. Pure read-only lookahead —
  // we just construct a minimal context (no errors mutation possible).
}

export function parse(source: string): AST {
  // Pre-parse: expand positional shorthand (e.g. `Button hug, 32, #333`)
  // to explicit property syntax. See docs/archive/concepts/positional-args.md.
  const expanded = resolvePositionalArgs(source)
  const tokens = tokenize(expanded)
  return new Parser(tokens, expanded).parse()
}

/**
 * Parse with full diagnostics — collects both lexer and parser errors.
 * Used by `validator/` which surfaces lexer errors (unclosed strings, bad
 * indentation) separately from parser errors. Standard callers should use
 * `parse()`; only reach for this when you need lexer-level diagnostics.
 */
export function parseWithDiagnostics(source: string): { ast: AST; lexerErrors: LexerError[] } {
  const expanded = resolvePositionalArgs(source)
  const lexerResult = tokenizeWithErrors(expanded)
  const ast = new Parser(lexerResult.tokens, expanded).parse()
  return { ast, lexerErrors: lexerResult.errors }
}
