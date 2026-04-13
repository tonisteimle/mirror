/**
 * Mirror Parser
 *
 * Parses tokens into an AST.
 * Property recognition is driven by the schema (src/schema/dsl.ts).
 */

import { Token, TokenType, tokenize } from './lexer'
import type {
  AST,
  Program,
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
  DataAttribute,
  DataBlock,
  SchemaDefinition,
  SchemaField,
  SchemaType,
  SchemaConstraint,
  TableNode,
  TableColumnNode,
  TableSlotNode,
  TableStaticRowNode,
  TableStaticCellNode,
  DataReference,
  DataReferenceArray,
} from './ast'
import {
  PROPERTY_STARTERS,
  BOOLEAN_PROPERTIES,
  LAYOUT_BOOLEANS,
  ALL_BOOLEAN_PROPERTIES,
  KEYBOARD_KEYS,
  STATE_NAMES,
  SYSTEM_STATES,
  STATE_MODIFIERS,
  DIRECTIONAL_PROPERTIES,
  DIRECTION_KEYWORDS,
  isDirectionForProperty,
  ACTION_NAMES,
  EVENT_NAMES,
  ANIMATION_PRESETS,
  EASING_FUNCTIONS,
  parseDuration,
  isValidProperty,
} from '../schema/parser-helpers'
import { isPrimitive, getEvent } from '../schema/dsl'
import {
  isZagPrimitive,
  getZagPrimitive,
  isZagSlot,
  isZagItemKeyword,
  isZagGroupKeyword,
} from '../schema/zag-primitives'
import { isCompoundPrimitive, isCompoundSlot } from '../schema/compound-primitives'
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
const JS_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'class'])

// Note: KEYBOARD_KEYS and STATE_NAMES are now imported from parser-helpers.ts
// They are derived from the schema (dsl.ts) to ensure consistency.

export class Parser {
  private tokens: Token[]
  private pos: number = 0
  private errors: ParseError[] = []
  private source: string
  private nodeIdCounter: number = 0
  /**
   * Stack of loop variable names from enclosing each loops.
   * Used to recognize loop variable references like `user.name` as content
   * rather than properties.
   */
  private loopVariables: Set<string> = new Set()

  /**
   * Maximum iterations for while loops to prevent infinite loops.
   * This is a safety measure - real code should never hit this limit.
   */
  private static readonly MAX_ITERATIONS = 100000

  /**
   * Maximum lookahead distance for line-based scans.
   * Prevents DoS from malformed input with very long lines.
   */
  private static readonly MAX_LOOKAHEAD = 1000

  /**
   * Maximum depth for condition chains (and/or).
   * Prevents infinite loops in cross-element state conditions.
   */
  private static readonly MAX_CONDITION_DEPTH = 100

  constructor(tokens: Token[], source: string = '') {
    this.tokens = tokens
    this.source = source
  }

  private generateNodeId(): string {
    return `def-${++this.nodeIdCounter}`
  }

  /**
   * Report an iteration limit error - indicates a likely bug in the parser.
   */
  private reportIterationLimit(context: string): void {
    const token = this.peekAt(0)
    this.errors.push({
      message: `Parser iteration limit exceeded in ${context}. This is likely a bug.`,
      line: token?.line ?? 0,
      column: token?.column ?? 0,
    })
  }

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
      errors: [],
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
          const afterColon = this.peekAt(2)?.value
          if (
            afterColon &&
            isValidProperty(afterColon) &&
            !this.checkAt(3, 'COLON') &&
            !this.checkAt(3, 'EQUALS')
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

      // Skip unknown
      this.advance()
    }

    program.errors = this.errors
    return program
  }

  // Check if current identifier is a JavaScript keyword
  private isJavaScriptKeyword(): boolean {
    const current = this.current()
    return current && JS_KEYWORDS.has(current.value)
  }

  // Check if token at offset is a boolean identifier (true/false)
  private isBooleanIdentifier(offset: number): boolean {
    const token = this.peekAt(offset)
    if (!token || token.type !== 'IDENTIFIER') return false
    return token.value === 'true' || token.value === 'false'
  }

  // Parse JavaScript block (rest of file)
  private parseJavaScript(): JavaScriptBlock | null {
    const startToken = this.current()
    if (!startToken || !this.source) return null

    // Find position in source from line/column
    // Note: The lexer's column points to the END of the token, not the start
    // So we subtract the token's length to get the actual start column
    const lines = this.source.split('\n')
    let charPos = 0

    for (let i = 0; i < startToken.line - 1; i++) {
      charPos += lines[i].length + 1 // +1 for newline
    }
    const actualStartColumn = startToken.column - startToken.value.length
    charPos += actualStartColumn - 1

    // Extract rest of source as JavaScript
    const code = this.source.slice(charPos).trim()

    // Advance to end
    for (let i = 0; !this.isAtEnd() && i < Parser.MAX_ITERATIONS; i++) {
      this.advance()
    }

    return {
      type: 'JavaScript',
      code,
      line: startToken.line,
      column: startToken.column,
    }
  }

  /**
   * Convert a token value to the proper type (number or string)
   * NUMBER tokens should become actual numbers for arithmetic operations
   */
  private parseTokenValue(token: Token): string | number | boolean {
    if (token.type === 'NUMBER') {
      // Check if it's a hex color (starts with #)
      if (token.value.startsWith('#')) {
        return token.value // Keep colors as strings
      }
      // Parse as number
      const num = parseFloat(token.value)
      return isNaN(num) ? token.value : num
    }
    // Handle boolean identifiers
    if (token.type === 'IDENTIFIER' && (token.value === 'true' || token.value === 'false')) {
      return token.value === 'true'
    }
    return token.value
  }

  // New simplified syntax: name: value (supports NUMBER, STRING, or boolean IDENTIFIER)
  private parseTokenDefinition(section?: string): TokenDefinition | null {
    const name = this.advance() // identifier
    this.advance() // :
    const value = this.advance() // value (NUMBER, STRING, or true/false)

    // Infer type from value
    const tokenType = this.inferTokenType(value.value)

    return {
      type: 'Token',
      name: name.value,
      tokenType,
      value: this.parseTokenValue(value),
      section,
      line: name.line,
      column: name.column,
    }
  }

  // Token with suffix (single token from lexer): name.suffix: value
  // e.g., primary.bg: #2271C1 or card.rad: 12 or btn.col: white
  // Also supports legacy syntax: $primary.bg: #2271C1
  // The name is stored WITHOUT $ - $ is only used when referencing
  private parseTokenWithSuffixSingleToken(section?: string): TokenDefinition | null {
    const nameToken = this.advance() // primary.bg or $primary.bg (single token)
    this.advance() // :
    const value = this.advance() // value (NUMBER, STRING, or IDENTIFIER like "white")

    // Remove $ prefix if present (for backwards compatibility)
    let fullName = nameToken.value
    if (fullName.startsWith('$')) {
      fullName = fullName.slice(1)
    }

    // Extract suffix from name (e.g., "bg" from "primary.bg")
    const dotIndex = fullName.lastIndexOf('.')
    const suffix = dotIndex > 0 ? fullName.slice(dotIndex + 1) : ''

    // Infer type from suffix
    let tokenType: 'color' | 'size' | 'font' | 'icon' = 'color'
    if (suffix === 'pad' || suffix === 'gap' || suffix === 'margin' || suffix === 'rad') {
      tokenType = 'size'
    } else if (suffix === 'font') {
      tokenType = 'font'
    }

    return {
      type: 'Token',
      name: fullName,
      tokenType,
      value: this.parseTokenValue(value),
      section,
      line: nameToken.line,
      column: nameToken.column,
    }
  }

  // Token with suffix (legacy: separate tokens): name.suffix: value
  // e.g., primary.bg: #2271C1 or $primary.bg: #2271C1
  private parseTokenWithSuffix(section?: string): TokenDefinition | null {
    const baseName = this.advance() // primary or $primary
    this.advance() // .
    const suffix = this.advance() // bg
    this.advance() // :
    const value = this.advance() // value (NUMBER or STRING)

    // Remove $ prefix if present (for backwards compatibility)
    let baseNameValue = baseName.value
    if (baseNameValue.startsWith('$')) {
      baseNameValue = baseNameValue.slice(1)
    }

    // Combine name with suffix: primary.bg
    const fullName = `${baseNameValue}.${suffix.value}`

    // Infer type from suffix
    let tokenType: 'color' | 'size' | 'font' | 'icon' = 'color'
    if (
      suffix.value === 'pad' ||
      suffix.value === 'gap' ||
      suffix.value === 'margin' ||
      suffix.value === 'rad'
    ) {
      tokenType = 'size'
    } else if (suffix.value === 'font') {
      tokenType = 'font'
    }

    return {
      type: 'Token',
      name: fullName,
      tokenType,
      value: this.parseTokenValue(value),
      section,
      line: baseName.line,
      column: baseName.column,
    }
  }

  // Token reference: name.suffix: $other (token referencing another token)
  // e.g., accent.bg: $primary or $accent.bg: $primary (legacy)
  // Left side stored WITHOUT $, right side keeps $ (it's a reference)
  private parseTokenReference(section?: string): TokenDefinition | null {
    const nameToken = this.advance() // identifier (e.g., accent.bg or $accent.bg)
    this.advance() // :
    const value = this.advance() // identifier (e.g., $primary)

    // Remove $ prefix from name if present (for backwards compatibility)
    let name = nameToken.value
    if (name.startsWith('$')) {
      name = name.slice(1)
    }

    // Infer type from token name suffix
    let tokenType: 'color' | 'size' | 'font' | 'icon' = 'color'
    if (name.includes('.pad') || name.includes('.gap') || name.includes('.margin')) {
      tokenType = 'size'
    } else if (name.includes('.rad')) {
      tokenType = 'size'
    } else if (name.includes('.font')) {
      tokenType = 'font'
    }

    return {
      type: 'Token',
      name: name,
      tokenType,
      value: value.value,
      section,
      line: nameToken.line,
      column: nameToken.column,
    }
  }

  // Legacy syntax: name: type = value (backwards compatible)
  private parseLegacyTokenDefinition(section?: string): TokenDefinition | null {
    const name = this.advance() // identifier
    this.advance() // :
    const tokenType = this.advance() // type
    this.advance() // =
    const value = this.advance() // value

    return {
      type: 'Token',
      name: name.value,
      tokenType: tokenType.value as 'color' | 'size' | 'font' | 'icon',
      value: this.parseTokenValue(value),
      section,
      line: name.line,
      column: name.column,
    }
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
  private parseSchema(): SchemaDefinition | null {
    const startToken = this.advance() // $schema
    this.advance() // :

    // Skip newlines if any, then expect INDENT
    while (this.check('NEWLINE')) {
      this.advance()
    }
    if (!this.check('INDENT')) {
      return {
        fields: [],
        line: startToken.line,
        column: startToken.column,
      }
    }
    this.advance() // consume INDENT

    // Skip the NEWLINE that often follows INDENT
    if (this.check('NEWLINE')) {
      this.advance()
    }

    const fields: SchemaField[] = []

    // Parse fields until DEDENT
    for (
      let iter = 0;
      !this.isAtEnd() && !this.check('DEDENT') && iter < Parser.MAX_ITERATIONS;
      iter++
    ) {
      this.skipNewlines()
      if (this.check('DEDENT') || this.isAtEnd()) break

      // Check for field definition: fieldName: type [, constraints...]
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const field = this.parseSchemaField()
        if (field) fields.push(field)
        continue
      }

      // Unknown content - skip
      this.advance()
    }

    // Consume DEDENT
    if (this.check('DEDENT')) {
      this.advance()
    }

    return {
      fields,
      line: startToken.line,
      column: startToken.column,
    }
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
  private parseSchemaField(): SchemaField | null {
    const nameToken = this.advance() // fieldName
    const line = nameToken.line
    this.advance() // :

    // Parse type
    let fieldType: SchemaType

    if (this.check('IDENTIFIER')) {
      const typeToken = this.advance()
      const typeValue = typeToken.value

      // Check for relation type ($users, $projects, etc.)
      if (typeValue.startsWith('$')) {
        // Check for array notation: $users[]
        let isArray = false
        if (this.check('LBRACKET') && this.checkNext('RBRACKET')) {
          this.advance() // [
          this.advance() // ]
          isArray = true
        }
        fieldType = { kind: 'relation', target: typeValue, isArray }
      } else {
        // Primitive type: string, number, boolean
        const primitiveType = typeValue as 'string' | 'number' | 'boolean'
        if (!['string', 'number', 'boolean'].includes(primitiveType)) {
          // Unknown type, default to string
          fieldType = { kind: 'primitive', type: 'string' }
        } else {
          fieldType = { kind: 'primitive', type: primitiveType }
        }
      }
    } else {
      // No type specified, default to string
      fieldType = { kind: 'primitive', type: 'string' }
    }

    // Parse constraints
    const constraints: SchemaConstraint[] = []

    while (this.check('COMMA')) {
      this.advance() // consume ,

      if (this.check('IDENTIFIER')) {
        const constraintToken = this.advance()
        const constraintName = constraintToken.value

        if (constraintName === 'required') {
          constraints.push({ kind: 'required' })
        } else if (constraintName === 'max' && this.check('NUMBER')) {
          const maxValue = parseInt(this.advance().value, 10)
          constraints.push({ kind: 'max', value: maxValue })
        } else if (constraintName === 'onDelete' && this.check('IDENTIFIER')) {
          const actionToken = this.advance()
          const action = actionToken.value as 'cascade' | 'nullify' | 'restrict'
          if (['cascade', 'nullify', 'restrict'].includes(action)) {
            constraints.push({ kind: 'onDelete', action })
          }
        }
      }
    }

    return {
      name: nameToken.value,
      type: fieldType,
      constraints,
      line,
    }
  }

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
  private parseDataObject(section?: string): TokenDefinition | null {
    const nameToken = this.advance() // post or $post
    this.advance() // :

    // Remove $ prefix if present (for backwards compatibility)
    // The name is stored without $ - $ is only used when referencing
    let name = nameToken.value
    if (name.startsWith('$')) {
      name = name.slice(1)
    }

    // Skip newlines if any, then expect INDENT
    while (this.check('NEWLINE')) {
      this.advance()
    }
    if (!this.check('INDENT')) {
      return null
    }
    this.advance() // consume INDENT

    // Skip the NEWLINE that often follows INDENT
    if (this.check('NEWLINE')) {
      this.advance()
    }

    const attributes: DataAttribute[] = []
    const blocks: DataBlock[] = []

    // Parse attributes and blocks until DEDENT
    for (
      let iter = 0;
      !this.isAtEnd() && !this.check('DEDENT') && iter < Parser.MAX_ITERATIONS;
      iter++
    ) {
      this.skipNewlines()
      if (this.check('DEDENT') || this.isAtEnd()) break

      // Check for markdown block: @blockname (AT followed by IDENTIFIER)
      if (this.check('AT') && this.checkNext('IDENTIFIER')) {
        const block = this.parseDataBlock()
        if (block) blocks.push(block)
        continue
      }

      // Check for attribute: key: value
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const attr = this.parseDataAttribute()
        if (attr) attributes.push(attr)
        continue
      }

      // Check for simple list item: identifier without colon
      // e.g., colors: \n  rot \n  grün \n  blau
      if (
        this.check('IDENTIFIER') &&
        (this.checkNext('NEWLINE') || this.checkNext('DEDENT') || this.peekAt(1) === undefined)
      ) {
        const token = this.advance()
        attributes.push({
          key: token.value,
          value: token.value, // key IS the value for simple list items
          line: token.line,
        })
        continue
      }

      // Unknown content - skip
      this.advance()
    }

    // Consume DEDENT
    if (this.check('DEDENT')) {
      this.advance()
    }

    return {
      type: 'Token',
      name: name,
      attributes,
      blocks,
      section,
      line: nameToken.line,
      column: nameToken.column,
    }
  }

  /**
   * Parse a single data attribute: key: value
   *
   * Can be nested:
   *   steps:
   *     planning:
   *       title: "Sprint Planning"
   */
  private parseDataAttribute(): DataAttribute | null {
    const keyToken = this.advance() // key
    const line = keyToken.line
    this.advance() // :

    // Check for nested object: NEWLINE followed by INDENT
    // Look ahead past any newlines to check for INDENT
    let lookAhead = 0
    while (this.checkAt(lookAhead, 'NEWLINE')) {
      lookAhead++
    }

    if (this.checkAt(lookAhead, 'INDENT')) {
      // Skip newlines
      while (this.check('NEWLINE')) {
        this.advance()
      }
      // Consume INDENT
      this.advance()

      // Parse nested attributes recursively
      const children: DataAttribute[] = []

      for (
        let iter = 0;
        !this.isAtEnd() && !this.check('DEDENT') && iter < Parser.MAX_ITERATIONS;
        iter++
      ) {
        this.skipNewlines()
        if (this.check('DEDENT') || this.isAtEnd()) break

        // Check for nested attribute: key: ...
        if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
          const nestedAttr = this.parseDataAttribute()
          if (nestedAttr) children.push(nestedAttr)
          continue
        }

        // Skip unknown content
        this.advance()
      }

      // Consume DEDENT
      if (this.check('DEDENT')) {
        this.advance()
      }

      return {
        key: keyToken.value,
        children,
        line,
      }
    }

    // Parse simple value - can be string, number, boolean, array, reference, or external reference
    let value: string | number | boolean | string[] | DataReference | DataReferenceArray

    if (this.check('STRING')) {
      value = this.advance().value
    } else if (this.check('NUMBER')) {
      const numToken = this.advance()
      // Keep hex colors as strings
      if (numToken.value.startsWith('#')) {
        value = numToken.value
      } else {
        const num = parseFloat(numToken.value)
        value = isNaN(num) ? numToken.value : num
      }
    } else if (this.check('AT')) {
      // External reference: @filename
      this.advance() // consume @
      if (this.check('IDENTIFIER')) {
        value = '@' + this.advance().value
      } else {
        value = '@'
      }
    } else if (this.check('IDENTIFIER')) {
      const identValue = this.advance().value
      // Check for boolean
      if (identValue === 'true') {
        value = true
      } else if (identValue === 'false') {
        value = false
      } else if (identValue.startsWith('$') && identValue.includes('.')) {
        // Reference: $collection.entry
        const ref = this.parseDataReference(identValue)
        if (ref) {
          // Check for multiple references (comma-separated)
          const refs: DataReference[] = [ref]
          while (this.check('COMMA')) {
            const savedPos = this.pos
            this.advance() // consume comma
            if (this.check('IDENTIFIER')) {
              const nextIdent = this.current().value
              if (nextIdent.startsWith('$') && nextIdent.includes('.')) {
                this.advance() // consume identifier
                const nextRef = this.parseDataReference(nextIdent)
                if (nextRef) {
                  refs.push(nextRef)
                }
              } else {
                // Not a reference, revert
                this.pos = savedPos
                break
              }
            } else {
              // Not an identifier, revert
              this.pos = savedPos
              break
            }
          }
          if (refs.length === 1) {
            value = refs[0]
          } else {
            value = { kind: 'referenceArray' as const, references: refs }
          }
        } else {
          value = identValue
        }
      } else {
        value = identValue
      }
    } else if (this.check('LBRACKET')) {
      // Array: [a, b, c]
      value = this.parseDataArray()
    } else {
      // Unknown value type
      value = ''
    }

    return {
      key: keyToken.value,
      value,
      line,
    }
  }

  /**
   * Parse a data array: [a, b, c]
   */
  private parseDataArray(): string[] {
    const items: string[] = []
    this.advance() // [

    for (
      let iter = 0;
      !this.isAtEnd() && !this.check('RBRACKET') && iter < Parser.MAX_ITERATIONS;
      iter++
    ) {
      if (this.check('STRING')) {
        items.push(this.advance().value)
      } else if (this.check('IDENTIFIER')) {
        items.push(this.advance().value)
      } else if (this.check('NUMBER')) {
        items.push(this.advance().value)
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
   * Parse a numeric array: [20, 80] → number[]
   * Used for properties like defaultValue in RangeSlider
   */
  private parseNumericArray(): number[] {
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
   * Parse a data reference from string: $collection.entry
   * Returns DataReference or null if invalid format
   */
  private parseDataReference(value: string): DataReference | null {
    // Remove $ prefix
    const withoutDollar = value.slice(1)
    const dotIndex = withoutDollar.indexOf('.')
    if (dotIndex === -1) {
      return null
    }
    const collection = withoutDollar.slice(0, dotIndex)
    const entry = withoutDollar.slice(dotIndex + 1)
    if (!collection || !entry) {
      return null
    }
    return {
      kind: 'reference',
      collection,
      entry,
    }
  }

  /**
   * Parse a markdown block: @blockname followed by indented content
   *
   * Markdown content is reconstructed from tokens, trying to preserve formatting.
   * For special characters like ** or *, we avoid adding unnecessary spaces.
   */
  private parseDataBlock(): DataBlock | null {
    this.advance() // @ (AT token)
    const nameToken = this.advance() // blockname (IDENTIFIER)
    const blockName = nameToken.value
    const line = nameToken.line

    this.skipNewlines()

    // Check for indent (block content)
    if (!this.check('INDENT')) {
      // No content - empty block
      return {
        name: blockName,
        content: '',
        line,
      }
    }

    this.advance() // consume INDENT

    // Collect all content lines until DEDENT
    const contentLines: string[] = []

    // Token types that should not have space before them
    const noSpaceBefore = new Set(['STAR', 'DOT', 'COMMA', 'COLON', 'RPAREN', 'RBRACKET'])
    // Token types that should not have space after them
    const noSpaceAfter = new Set(['STAR', 'LPAREN', 'LBRACKET', 'AT'])

    for (
      let outerIter = 0;
      !this.isAtEnd() && !this.check('DEDENT') && outerIter < Parser.MAX_ITERATIONS;
      outerIter++
    ) {
      if (this.check('NEWLINE')) {
        contentLines.push('')
        this.advance()
        continue
      }

      // Collect all tokens on this line as raw content
      const lineTokens: { type: string; value: string }[] = []
      for (
        let innerIter = 0;
        !this.isAtEnd() &&
        !this.check('NEWLINE') &&
        !this.check('DEDENT') &&
        innerIter < Parser.MAX_ITERATIONS;
        innerIter++
      ) {
        const token = this.advance()
        lineTokens.push({ type: token.type, value: token.value })
      }

      // Reconstruct line with smart spacing
      let lineContent = ''
      for (let i = 0; i < lineTokens.length; i++) {
        const token = lineTokens[i]
        const prevToken = i > 0 ? lineTokens[i - 1] : null

        // Determine if we need a space before this token
        const needSpace =
          lineContent.length > 0 &&
          !lineContent.endsWith(' ') &&
          !noSpaceBefore.has(token.type) &&
          (prevToken ? !noSpaceAfter.has(prevToken.type) : true)

        if (needSpace) {
          lineContent += ' '
        }
        lineContent += token.value
      }

      if (lineContent) {
        contentLines.push(lineContent)
      }

      // Consume newline if present
      if (this.check('NEWLINE')) {
        this.advance()
      }
    }

    // Consume DEDENT
    if (this.check('DEDENT')) {
      this.advance()
    }

    // Remove trailing empty lines
    while (contentLines.length > 0 && contentLines[contentLines.length - 1] === '') {
      contentLines.pop()
    }

    return {
      name: blockName,
      content: contentLines.join('\n'),
      line,
    }
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
  private parsePropertySet(section?: string): TokenDefinition | null {
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
      !this.isAtEnd() &&
      !this.check('NEWLINE') &&
      !this.check('EOF') &&
      iter < Parser.MAX_ITERATIONS;
      iter++
    ) {
      // Skip comma separators
      if (this.check('COMMA')) {
        this.advance()
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

  // Parse a route path (e.g., "Home", "admin/users", "pages/settings")
  // Combines identifiers separated by slashes into a single path string
  private parseRoutePath(): string | null {
    if (!this.check('IDENTIFIER')) return null

    let path = this.advance().value // First identifier

    // Continue while we see SLASH followed by IDENTIFIER
    while (this.check('SLASH') && this.checkNext('IDENTIFIER')) {
      this.advance() // consume SLASH
      path += '/' + this.advance().value // append next segment
    }

    return path
  }

  // Infer token type from value
  private inferTokenType(value: string | number): 'color' | 'size' | 'font' | 'icon' | undefined {
    const str = String(value)

    // Color: starts with # (hex)
    if (str.startsWith('#')) {
      return 'color'
    }

    // Size: pure number or number with unit
    if (/^\d+(%|px|rem|em)?$/.test(str)) {
      return 'size'
    }

    // Font: quoted string (already unquoted by lexer)
    // If it's a string that's not a color or size, assume font
    if (typeof value === 'string' && !str.startsWith('#') && !/^\d/.test(str)) {
      return 'font'
    }

    return undefined
  }

  private parseComponentOrInstance():
    | ComponentDefinition
    | Instance
    | Slot
    | AnimationDefinition
    | ZagNode
    | TableNode
    | null {
    const name = this.advance()

    // Component definition: Name as primitive:
    // Animation definition: Name as animation:
    if (this.check('AS')) {
      // Peek to see if this is an animation definition
      // 'animation' is now a regular IDENTIFIER (not a keyword)
      const nextToken = this.peekAt(1)
      if (nextToken && nextToken.type === 'IDENTIFIER' && nextToken.value === 'animation') {
        return this.parseAnimationDefinitionWithContext(name)
      }
      return this.parseComponentDefinition(name)
    }

    // Component inheritance: Name extends Parent:
    if (this.check('EXTENDS')) {
      return this.parseComponentInheritance(name)
    }

    // Component definition without explicit primitive: Name:
    // Defaults to Frame as the base primitive
    // BUT if the name is a Zag primitive (Select, Accordion, etc.), treat it as an instance
    if (this.check('COLON')) {
      if (isZagPrimitive(name.value)) {
        // Consume the colon and parse as Zag component
        this.advance() // consume ':'
        return this.parseZagComponentWithContext(name, true) // true = already consumed colon
      }
      return this.parseComponentDefinitionWithDefaultPrimitive(name)
    }

    // Instance: Name "content" or Name prop value
    return this.parseInstance(name)
  }

  private parseComponentDefinition(name: Token): ComponentDefinition | null {
    this.advance() // as
    const primitive = this.advance() // primitive name

    if (!this.expect('COLON')) {
      // Add hint for common error
      this.errors[this.errors.length - 1].hint = `Add a colon after "${primitive.value}"`
      this.recoverToNextDefinition()
      return null
    }

    const component: ComponentDefinition = {
      type: 'Component',
      name: name.value,
      primitive: primitive.value,
      extends: null,
      properties: [],
      states: [],
      events: [],
      children: [],
      line: name.line,
      column: name.column,
      nodeId: this.generateNodeId(),
    }

    // Parse inline properties (including implicit onclick events)
    this.parseInlineProperties(component.properties, component.events)

    // Extract bind from properties if present (bind varName on same line as definition)
    const bindIndex = component.properties.findIndex(p => p.name === 'bind')
    if (bindIndex >= 0) {
      const bindProp = component.properties[bindIndex]
      if (bindProp.values[0]) {
        component.bind = String(bindProp.values[0])
      }
      component.properties.splice(bindIndex, 1)
    }

    // Skip newline before checking for indented block
    this.skipNewlines()

    // Parse indented block
    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  private parseComponentInheritance(name: Token): ComponentDefinition | null {
    this.advance() // extends
    const parent = this.advance() // parent name

    if (!this.expect('COLON')) {
      // Add hint for common error
      this.errors[this.errors.length - 1].hint = `Add a colon after "${parent.value}"`
      this.recoverToNextDefinition()
      return null
    }

    const component: ComponentDefinition = {
      type: 'Component',
      name: name.value,
      primitive: null,
      extends: parent.value,
      properties: [],
      states: [],
      events: [],
      children: [],
      line: name.line,
      column: name.column,
      nodeId: this.generateNodeId(),
    }

    this.parseInlineProperties(component.properties, component.events)

    // Extract bind from properties if present (bind varName on same line as definition)
    const bindIndex = component.properties.findIndex(p => p.name === 'bind')
    if (bindIndex >= 0) {
      const bindProp = component.properties[bindIndex]
      if (bindProp.values[0]) {
        component.bind = String(bindProp.values[0])
      }
      component.properties.splice(bindIndex, 1)
    }

    // Skip newline before checking for indented block
    this.skipNewlines()

    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  // Parse component definition without explicit primitive: Name:
  // Defaults to Frame as the base primitive
  private parseComponentDefinitionWithDefaultPrimitive(name: Token): ComponentDefinition | null {
    this.advance() // : (colon)

    // Check if the next token is a primitive name (e.g., "Row: Frame hor, gap 8")
    // If so, use it as the actual primitive instead of defaulting to Frame
    let primitive = 'Frame' // Default primitive
    if (this.check('IDENTIFIER') && isPrimitive(this.current().value)) {
      primitive = this.advance().value
    }

    const component: ComponentDefinition = {
      type: 'Component',
      name: name.value,
      primitive,
      extends: null,
      properties: [],
      states: [],
      events: [],
      children: [],
      line: name.line,
      column: name.column,
      nodeId: this.generateNodeId(),
    }

    // Parse inline properties (including implicit onclick events)
    this.parseInlineProperties(component.properties, component.events)

    // Extract bind from properties if present (bind varName on same line as definition)
    const bindIndex = component.properties.findIndex(p => p.name === 'bind')
    if (bindIndex >= 0) {
      const bindProp = component.properties[bindIndex]
      if (bindProp.values[0]) {
        component.bind = String(bindProp.values[0])
      }
      component.properties.splice(bindIndex, 1)
    }

    // Skip newline before checking for indented block
    this.skipNewlines()

    // Parse indented block
    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  private parseInstance(name: Token): Instance | Slot | ZagNode | TableNode {
    // Special handling for Slot primitive (case-insensitive, using schema)
    // Syntax: Slot "Name", w full, h 100
    // The first string is the slot name, NOT text content
    if (isPrimitive(name.value) && name.value.toLowerCase() === 'slot') {
      return this.parseSlotPrimitive(name)
    }

    // Special handling for Table primitive
    // Syntax: Table $collection [where ...] [by ... [desc]] [grouped by ...]
    if (name.value === 'Table') {
      return this.parseTable(name)
    }

    // Check if this is a Zag primitive (e.g., Select, Accordion)
    if (isZagPrimitive(name.value)) {
      return this.parseZagComponentWithContext(name)
    }

    // Check if this is a Compound primitive (e.g., Shell)
    const isCompound = isCompoundPrimitive(name.value)

    const instance: Instance = {
      type: 'Instance',
      component: name.value,
      name: null,
      properties: [],
      children: [],
      states: [],
      events: [],
      line: name.line,
      column: name.column,
      ...(isCompound && { isCompound: true, compoundType: name.value }),
    }

    // Named instance: Component named instanceName
    if (this.check('NAMED')) {
      this.advance()
      instance.name = this.advance().value
    }

    // Alternative name syntax: Component name InstanceName "Text"
    // This allows: Button name MenuBtn "Menü", pad 10 20
    // Instead of:  Button "Menü", name MenuBtn, pad 10 20
    if (this.check('IDENTIFIER') && this.current().value === 'name') {
      const nextToken = this.peekAt(1)
      // Only consume if followed by an identifier (the name value)
      if (nextToken?.type === 'IDENTIFIER') {
        this.advance() // consume 'name'
        instance.name = this.advance().value // consume the actual name
      }
    }

    // Check if this line uses inline child syntax (contains semicolon followed by PascalCase)
    // Syntax: Frame bg #333; Text "Hello"; Button "OK"
    // → Frame with Text and Button as children
    if (this.hasInlineChildSyntax()) {
      this.parseInlineChildrenAfterSemicolon(instance)
    } else {
      // Parse inline properties, events, and content
      this.parseInlineProperties(instance.properties, instance.events)
    }

    // Extract bind from properties if present (bind varName on same line)
    const bindIndex = instance.properties.findIndex(p => p.name === 'bind')
    if (bindIndex >= 0) {
      const bindProp = instance.properties[bindIndex]
      if (bindProp.values[0]) {
        instance.bind = String(bindProp.values[0])
      }
      instance.properties.splice(bindIndex, 1)
    }

    // Check for inline states: "Frame bg #333 hover: bg light"
    // parseInlineProperties stops at lowercase identifier + COLON
    // Exception: keyboard keys like "enter:" are NOT states
    while (this.check('IDENTIFIER') && this.checkNext('COLON')) {
      const name = this.current().value
      const isLikelyState = name[0] === name[0].toLowerCase() && !KEYBOARD_KEYS.has(name)
      if (!isLikelyState) break

      const stateName = this.advance()
      this.advance() // consume :

      const state: State = {
        type: 'State',
        name: stateName.value,
        properties: [],
        childOverrides: [],
        line: stateName.line,
        column: stateName.column,
      }

      // Parse inline state properties
      // Pass instance.events to allow event handlers within state blocks
      this.parseInlineProperties(state.properties, instance.events)
      if (!instance.states) instance.states = []
      instance.states.push(state)
    }

    // Check for colon at end of properties
    // Two cases:
    // 1. Colon + NEWLINE → Definition (not rendered): Box pad 8:
    // 2. Colon + tokens → Instance with inline children: Box pad 8: Icon "save"
    if (this.check('COLON')) {
      this.advance()
      // Check if followed by NEWLINE (definition) or tokens (inline children)
      if (this.check('NEWLINE') || this.check('INDENT') || this.isAtEnd()) {
        instance.isDefinition = true
      } else {
        this.parseInlineChildren(instance)
      }
    }

    // Extract _route property and move to instance.route
    const routeIndex = instance.properties.findIndex(p => p.name === '_route')
    if (routeIndex !== -1) {
      const routeProp = instance.properties[routeIndex]
      instance.route = String(routeProp.values[0])
      instance.properties.splice(routeIndex, 1)
    }

    // Extract initial state from properties
    // A property with empty values and lowercase name that isn't a known property/keyword is an initial state
    // Example: Button "Click" selected → "selected" becomes initialState
    const initialStateIndex = instance.properties.findIndex(p => {
      const name = p.name
      return (
        p.values.length === 0 &&
        name[0] === name[0].toLowerCase() &&
        !PROPERTY_STARTERS.has(name) &&
        !ALL_BOOLEAN_PROPERTIES.has(name) &&
        !EVENT_NAMES.has(name) &&
        !STATE_MODIFIERS.has(name) &&
        name !== 'when' &&
        name !== 'as' &&
        name !== 'content'
      )
    })
    if (initialStateIndex !== -1) {
      const stateProp = instance.properties[initialStateIndex]
      instance.initialState = stateProp.name
      instance.properties.splice(initialStateIndex, 1)
    }

    // Skip newline before checking for indented children
    this.skipNewlines()

    // Parse indented children
    if (this.check('INDENT')) {
      this.advance()
      this.parseInstanceBody(instance)
    }

    return instance
  }

  /**
   * Parse Slot primitive
   * Syntax: Slot "Name", w full, h 100
   *
   * The first string after "Slot" is the slot name/label, NOT text content.
   * This is different from regular components where strings are text content.
   */
  private parseSlotPrimitive(slotToken: Token): Slot {
    // Expect a string for the slot name
    let slotName = 'default'
    if (this.check('STRING')) {
      slotName = this.advance().value
    }

    // Parse any additional properties (w, h, etc.)
    const properties: Property[] = []
    this.parseInlineProperties(properties)

    const slot: Slot = {
      type: 'Slot',
      name: slotName,
      line: slotToken.line,
      column: slotToken.column,
      properties: properties.length > 0 ? properties : undefined,
    }

    return slot
  }

  /**
   * Parse a Table component
   *
   * Syntax:
   *   Table $collection [where expression] [by field [desc]] [grouped by field]
   *   Table $tasks where done == false by priority desc, select()
   *     Column titel, w 250
   *     Column effort, suffix "h", sum
   *     Header:
   *       ...custom header
   */
  private parseTable(nameToken: Token): TableNode {
    const table: TableNode = {
      type: 'Table',
      properties: [],
      columns: [],
      line: nameToken.line,
      column: nameToken.column,
    }

    // Parse data source: $collection (parsed as IDENTIFIER starting with $)
    // Data source is optional - manual tables don't have one
    if (this.check('IDENTIFIER') && this.current().value.startsWith('$')) {
      table.dataSource = this.advance().value
      // Parse optional clauses: where, by, grouped by (only for data-driven tables)
      this.parseTableClauses(table)
    }

    // Parse inline properties (select, pageSize, etc.)
    const events: Event[] = []
    this.parseInlineProperties(table.properties, events)

    // Convert select() event to selectionMode property
    // select() appears as an event with action 'select'
    for (const event of events) {
      for (const action of event.actions) {
        if (action.name === 'select') {
          // Check if multi: select(multi)
          const isMulti = action.args?.some(arg => typeof arg === 'string' && arg === 'multi')
          table.properties.push({
            type: 'Property',
            name: 'selectionMode',
            values: [isMulti ? 'multi' : 'single'],
            line: event.line,
            column: event.column,
          })
        }
      }
    }

    // Extract stickyHeader flag from properties
    const stickyHeaderProp = table.properties.find(p => p.name === 'stickyHeader')
    if (stickyHeaderProp) {
      table.stickyHeader = true
      // Remove from properties array (it's a direct flag, not a style property)
      table.properties = table.properties.filter(p => p.name !== 'stickyHeader')
    }

    // Parse children (Column, Header:, Row:, Footer:, Group:)
    if (this.check('INDENT')) {
      this.advance()
      this.parseTableBody(table)
    }

    return table
  }

  /**
   * Parse Table clauses: where, by, grouped by
   * Note: where, by, desc, grouped are reserved keywords with their own token types
   */
  private parseTableClauses(table: TableNode): void {
    for (let iter = 0; !this.isAtEnd() && iter < Parser.MAX_ITERATIONS; iter++) {
      // Check for 'where' clause (token type WHERE)
      if (this.check('WHERE')) {
        this.advance()
        table.filter = this.parseTableExpression()
      }
      // Check for 'by' clause (token type BY)
      else if (this.check('BY')) {
        this.advance()
        if (this.check('IDENTIFIER')) {
          table.orderBy = this.advance().value
          // Check for desc (token type DESC)
          if (this.check('DESC')) {
            this.advance()
            table.orderDesc = true
          }
        }
      }
      // Check for 'grouped by' clause (token type GROUPED)
      else if (this.check('GROUPED')) {
        this.advance()
        // Expect "by" after "grouped"
        if (this.check('BY')) {
          this.advance()
          if (this.check('IDENTIFIER')) {
            table.groupBy = this.advance().value
          }
        }
      }
      // Not a clause keyword, stop parsing clauses
      else {
        break
      }
    }
  }

  /**
   * Parse a table expression (for where clause)
   * Collects tokens until we hit a clause keyword or comma
   * Note: by, grouped are reserved keywords with their own token types (BY, GROUPED)
   */
  private parseTableExpression(): string {
    const parts: string[] = []
    const comparisonTokens = new Set([
      'EQUALS',
      'GT',
      'LT',
      'GTE',
      'LTE',
      'NOT_EQUAL',
      'STRICT_EQUAL',
      'STRICT_NOT_EQUAL',
      'AND_AND',
      'OR_OR',
      'BANG',
    ])

    // Safety guard to prevent infinite loops
    let lastPos = this.pos
    const maxIterations = 1000 // Reasonable limit for expression parsing

    for (
      let i = 0;
      i < maxIterations &&
      !this.isAtEnd() &&
      !this.check('COMMA') &&
      !this.check('NEWLINE') &&
      !this.check('INDENT');
      i++
    ) {
      const token = this.current()

      // Stop at clause keywords (these have their own token types)
      if (token.type === 'BY' || token.type === 'GROUPED') {
        break
      }

      // Handle token reference ($variable)
      if (token.type === 'IDENTIFIER' && token.value.startsWith('$')) {
        parts.push(`$get("${token.value.slice(1)}")`)
      } else if (token.type === 'STRING') {
        parts.push(`"${token.value}"`)
      } else if (comparisonTokens.has(token.type)) {
        // Map token types to JavaScript operators
        const opMap: Record<string, string> = {
          EQUALS: '==',
          GT: '>',
          LT: '<',
          GTE: '>=',
          LTE: '<=',
          NOT_EQUAL: '!=',
          STRICT_EQUAL: '===',
          STRICT_NOT_EQUAL: '!==',
          AND_AND: '&&',
          OR_OR: '||',
          BANG: '!',
        }
        parts.push(opMap[token.type] || token.value)
      } else if (token.type === 'OR') {
        // Convert 'or' keyword to '||'
        parts.push('||')
      } else if (token.type === 'AND') {
        // Convert 'and' keyword to '&&'
        parts.push('&&')
      } else {
        parts.push(token.value)
      }

      this.advance()

      // Verify progress to prevent infinite loop
      if (this.pos === lastPos) {
        log.warn('parseTableExpression: no progress made, breaking to prevent infinite loop')
        break
      }
      lastPos = this.pos
    }

    return parts.join(' ')
  }

  /**
   * Parse Table body (columns, slots, and static rows)
   */
  private parseTableBody(table: TableNode): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      // Skip newlines
      if (this.check('NEWLINE')) {
        this.advance()
        continue
      }

      if (this.check('IDENTIFIER')) {
        const name = this.current().value

        if (name === 'Column') {
          this.advance()
          const column = this.parseTableColumn()
          table.columns.push(column)
        } else if (name === 'Header' && this.checkNext('COLON')) {
          this.advance() // Header
          this.advance() // :
          table.headerSlot = this.parseTableSlot('Header')
        } else if (name === 'Row' && this.checkNext('COLON')) {
          // Row: slot for data-driven tables
          this.advance() // Row
          this.advance() // :
          table.rowSlot = this.parseTableSlot('Row')
        } else if (name === 'RowOdd' && this.checkNext('COLON')) {
          // RowOdd: slot for zebra striping (odd rows)
          this.advance() // RowOdd
          this.advance() // :
          table.rowOddSlot = this.parseTableSlot('RowOdd')
        } else if (name === 'RowEven' && this.checkNext('COLON')) {
          // RowEven: slot for zebra striping (even rows)
          this.advance() // RowEven
          this.advance() // :
          table.rowEvenSlot = this.parseTableSlot('RowEven')
        } else if (name === 'Row' && !this.checkNext('COLON')) {
          // Row without colon = static row for manual tables
          this.advance() // Row
          const staticRow = this.parseTableStaticRow()
          if (!table.staticRows) table.staticRows = []
          table.staticRows.push(staticRow)
        } else if (name === 'Footer' && this.checkNext('COLON')) {
          this.advance() // Footer
          this.advance() // :
          table.footerSlot = this.parseTableSlot('Footer')
        } else if (name === 'Group' && this.checkNext('COLON')) {
          this.advance() // Group
          this.advance() // :
          table.groupSlot = this.parseTableSlot('Group')
        } else if (name === 'SortIcon' && this.checkNext('COLON')) {
          this.advance() // SortIcon
          this.advance() // :
          table.sortIconSlot = this.parseTableSlot('SortIcon')
        } else if (name === 'SortAsc' && this.checkNext('COLON')) {
          this.advance() // SortAsc
          this.advance() // :
          table.sortAscSlot = this.parseTableSlot('SortAsc')
        } else if (name === 'SortDesc' && this.checkNext('COLON')) {
          this.advance() // SortDesc
          this.advance() // :
          table.sortDescSlot = this.parseTableSlot('SortDesc')
        } else if (name === 'Paginator' && this.checkNext('COLON')) {
          this.advance() // Paginator
          this.advance() // :
          table.paginatorSlot = this.parseTablePaginatorSlot()
        } else {
          // Unknown, skip
          this.advance()
        }
      } else {
        this.advance()
      }
    }

    // Consume DEDENT
    if (this.check('DEDENT')) {
      this.advance()
    }
  }

  /**
   * Parse Paginator: slot with sub-slots (Prev:, Next:, PageInfo:)
   */
  private parseTablePaginatorSlot(): TableSlotNode {
    const startToken = this.previous()
    const slot: TableSlotNode = {
      name: 'Paginator',
      properties: [],
      children: [],
      sourcePosition: {
        line: startToken?.line ?? 0,
        column: startToken?.column ?? 0,
        endLine: startToken?.line ?? 0,
        endColumn: startToken?.column ?? 0,
      },
    }

    // Parse inline properties
    this.parseInlineProperties(slot.properties)

    // Check for 'table' in case we need to access parent node to store sub-slots
    // For now, we just parse the slot normally and handle sub-slots inside

    if (this.check('INDENT')) {
      this.advance()
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        if (this.check('NEWLINE')) {
          this.advance()
          continue
        }

        if (this.check('IDENTIFIER')) {
          const subName = this.current().value

          if (subName === 'Prev' && this.checkNext('COLON')) {
            this.advance() // Prev
            this.advance() // :
            // Store in slot's children with a marker
            slot.prevSlot = this.parseTableSlot('Prev')
          } else if (subName === 'Next' && this.checkNext('COLON')) {
            this.advance() // Next
            this.advance() // :
            slot.nextSlot = this.parseTableSlot('Next')
          } else if (subName === 'PageInfo' && this.checkNext('COLON')) {
            this.advance() // PageInfo
            this.advance() // :
            slot.pageInfoSlot = this.parseTableSlot('PageInfo')
          } else {
            // Regular child element
            const child = this.parseInstance(this.advance())
            if (child.type !== 'ZagComponent' && child.type !== 'Table') {
              slot.children.push(child as Instance | Slot)
            }
          }
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) {
        this.advance()
      }
    }

    return slot
  }

  /**
   * Parse a static Row for manual tables
   *
   * Syntax:
   *   Row "Cell1", "Cell2", "Cell3"
   *   Row
   *     Text "Content"
   *     Frame ...
   */
  private parseTableStaticRow(): TableStaticRowNode {
    const startToken = this.previous()
    const row: TableStaticRowNode = {
      type: 'TableStaticRow',
      cells: [],
      properties: [],
      line: startToken?.line ?? 0,
      column: startToken?.column ?? 0,
    }

    // Parse inline cells (strings separated by commas)
    // Row "Name", "Age", "Email"
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.isAtEnd()) {
      if (this.check('STRING')) {
        const token = this.advance()
        row.cells.push({
          type: 'TableStaticCell',
          text: token.value,
          properties: [],
          line: token.line,
          column: token.column,
        })
      } else if (this.check('NUMBER')) {
        const token = this.advance()
        row.cells.push({
          type: 'TableStaticCell',
          text: String(token.value),
          properties: [],
          line: token.line,
          column: token.column,
        })
      } else if (this.check('COMMA')) {
        this.advance()
      } else if (this.check('IDENTIFIER')) {
        // Could be a property like bg, pad, etc.
        // For now, skip unknown identifiers in inline position
        break
      } else {
        break
      }
    }

    // Skip newline
    if (this.check('NEWLINE')) {
      this.advance()
    }

    // Parse child content (indented block)
    if (this.check('INDENT')) {
      this.advance()
      // If we had inline cells, children are additional content
      // If no inline cells, children become the cell content
      const children: (Instance | Slot)[] = []

      while (!this.check('DEDENT') && !this.isAtEnd()) {
        if (this.check('NEWLINE')) {
          this.advance()
          continue
        }

        if (this.check('IDENTIFIER')) {
          const child = this.parseInstance(this.advance())
          // Only accept Instance and Slot in static cells (not Table/Zag)
          if (child && (child.type === 'Instance' || child.type === 'Slot')) {
            children.push(child)
          }
        } else {
          this.advance()
        }
      }

      // If we have children but no cells, wrap children in a single cell
      if (row.cells.length === 0 && children.length > 0) {
        row.cells.push({
          type: 'TableStaticCell',
          children,
          properties: [],
          line: startToken?.line ?? 0,
          column: startToken?.column ?? 0,
        })
      } else if (children.length > 0) {
        // Add children to the last cell or create new cell
        const lastCell = row.cells[row.cells.length - 1]
        if (lastCell && !lastCell.children) {
          lastCell.children = children
        }
      }

      if (this.check('DEDENT')) {
        this.advance()
      }
    }

    return row
  }

  /**
   * Parse a Column definition
   *
   * Syntax:
   *   Column fieldName [, w N] [, suffix "str"] [, sortable] [, sum|avg|count]
   *   Column "Custom Label"
   *     Cell:
   *       ...custom cell template
   */
  private parseTableColumn(): TableColumnNode {
    const startToken = this.previous()
    const column: TableColumnNode = {
      type: 'TableColumn',
      field: '',
      line: startToken?.line ?? 0,
      column: startToken?.column ?? 0,
    }

    // Column-config properties (not style properties)
    const columnConfigProps = new Set([
      'w',
      'width',
      'prefix',
      'suffix',
      'align',
      'sortable',
      'desc',
      'filterable',
      'hidden',
      'sum',
      'avg',
      'count',
    ])

    // Field name or custom label
    if (this.check('STRING')) {
      column.label = this.advance().value
      column.field = column.label.toLowerCase().replace(/\s+/g, '_')
    } else if (this.check('IDENTIFIER')) {
      column.field = this.advance().value
    }

    // Parse column properties
    while (this.check('COMMA')) {
      this.advance() // consume comma

      if (this.check('IDENTIFIER')) {
        const propName = this.advance().value

        // Check if this is a column-config property
        if (columnConfigProps.has(propName)) {
          switch (propName) {
            case 'w':
            case 'width':
              if (this.check('NUMBER')) {
                column.width = parseInt(this.advance().value, 10)
              }
              break
            case 'prefix':
              if (this.check('STRING')) {
                column.prefix = this.advance().value
              }
              break
            case 'suffix':
              if (this.check('STRING')) {
                column.suffix = this.advance().value
              }
              break
            case 'align':
              if (this.check('IDENTIFIER')) {
                const alignValue = this.advance().value
                if (alignValue === 'left' || alignValue === 'right' || alignValue === 'center') {
                  column.align = alignValue
                }
              }
              break
            case 'sortable':
              column.sortable = true
              break
            case 'desc':
              column.sortDesc = true
              break
            case 'filterable':
              column.filterable = true
              break
            case 'hidden':
              column.hidden = true
              break
            case 'sum':
              column.aggregation = 'sum'
              break
            case 'avg':
              column.aggregation = 'avg'
              break
            case 'count':
              column.aggregation = 'count'
              break
          }
        } else {
          // Style property - collect for cell styling
          if (!column.cellProperties) column.cellProperties = []
          const prevToken = this.previous()
          const prop: Property = {
            type: 'Property',
            name: propName,
            values: [],
            line: prevToken?.line ?? 0,
            column: prevToken?.column ?? 0,
          }
          // Collect value(s) for this property
          while (
            !this.check('COMMA') &&
            !this.check('NEWLINE') &&
            !this.check('INDENT') &&
            !this.isAtEnd()
          ) {
            const token = this.advance()
            if (token.type === 'NUMBER') {
              // Hex colors like #333 come as NUMBER tokens - keep as string
              if (token.value.startsWith('#')) {
                prop.values.push(token.value)
              } else {
                prop.values.push(parseFloat(token.value))
              }
            } else if (token.type === 'STRING') {
              prop.values.push(token.value)
            } else if (token.type === 'IDENTIFIER') {
              // Check if it's a color (#hex)
              if (token.value.startsWith('#')) {
                prop.values.push(token.value)
              } else {
                prop.values.push(token.value)
              }
            } else {
              break
            }
          }
          column.cellProperties.push(prop)
        }
      }
    }

    // Check for Cell: slot (custom cell template)
    if (this.check('INDENT')) {
      this.advance()
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        if (this.check('NEWLINE')) {
          this.advance()
          continue
        }

        if (
          this.check('IDENTIFIER') &&
          this.current().value === 'Cell' &&
          this.checkNext('COLON')
        ) {
          this.advance() // Cell
          this.advance() // :
          column.customCell = this.parseTableCellSlot()
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) {
        this.advance()
      }
    }

    return column
  }

  /**
   * Parse a Table slot (Header:, Row:, Footer:, Group:)
   */
  private parseTableSlot(slotName: string): TableSlotNode {
    const startToken = this.previous()
    const slot: TableSlotNode = {
      name: slotName,
      properties: [],
      children: [],
      sourcePosition: {
        line: startToken?.line ?? 0,
        column: startToken?.column ?? 0,
        endLine: startToken?.line ?? 0,
        endColumn: startToken?.column ?? 0,
      },
    }

    // Parse inline properties
    this.parseInlineProperties(slot.properties)

    // For Row: slot, add 'row' and 'index' as loop variables
    // so that row.field references are detected as loop variable references
    const isRowSlot = slotName === 'Row'
    if (isRowSlot) {
      this.loopVariables.add('row')
      this.loopVariables.add('index')
    }

    // Parse children - use try-finally to guarantee loop variable cleanup
    try {
      if (this.check('INDENT')) {
        this.advance()
        while (!this.check('DEDENT') && !this.isAtEnd()) {
          if (this.check('NEWLINE')) {
            this.advance()
            continue
          }

          if (this.check('IDENTIFIER')) {
            const name = this.current().value

            // Special case: Row without colon inside Header or Footer slot = static row
            if (
              (slotName === 'Header' || slotName === 'Footer') &&
              name === 'Row' &&
              !this.checkNext('COLON')
            ) {
              this.advance() // Row
              slot.staticRow = this.parseTableStaticRow()
            } else {
              const child = this.parseInstance(this.advance())
              if (child.type !== 'ZagComponent') {
                slot.children.push(child as Instance | Slot)
              }
            }
          } else {
            this.advance()
          }
        }
        if (this.check('DEDENT')) {
          this.advance()
        }
      }
    } finally {
      // Clean up loop variables for Row: slot - guaranteed to run
      if (isRowSlot) {
        this.loopVariables.delete('row')
        this.loopVariables.delete('index')
      }
    }

    return slot
  }

  /**
   * Parse a custom Cell template
   */
  private parseTableCellSlot(): (Instance | Slot)[] {
    const children: (Instance | Slot)[] = []

    // Parse inline content first
    if (this.check('IDENTIFIER')) {
      const child = this.parseInstance(this.advance())
      if (child.type !== 'ZagComponent') {
        children.push(child as Instance | Slot)
      }
    }

    // Parse indented children
    if (this.check('INDENT')) {
      this.advance()
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        if (this.check('NEWLINE')) {
          this.advance()
          continue
        }

        if (this.check('IDENTIFIER')) {
          const child = this.parseInstance(this.advance())
          if (child.type !== 'ZagComponent') {
            children.push(child as Instance | Slot)
          }
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) {
        this.advance()
      }
    }

    return children
  }

  /**
   * Wrapper method that calls the extracted Zag parser.
   * Creates context and callbacks for the modular parser.
   */
  private parseZagComponentWithContext(nameToken: Token, colonAlreadyConsumed = false): ZagNode {
    const ctx: ParserContext = {
      tokens: this.tokens,
      source: this.source,
      loopVariables: this.loopVariables,
      pos: this.pos,
      errors: this.errors,
    }

    const callbacks: ZagParserCallbacks = {
      parseInlineProperties: (properties, events) => {
        this.pos = ctx.pos
        this.parseInlineProperties(properties, events)
        ctx.pos = this.pos
      },
      parseProperty: () => {
        this.pos = ctx.pos
        const result = this.parseProperty()
        ctx.pos = this.pos
        return result
      },
      parseNumericArray: () => {
        this.pos = ctx.pos
        const result = this.parseNumericArray()
        ctx.pos = this.pos
        return result
      },
      parseEvent: () => {
        this.pos = ctx.pos
        const result = this.parseEvent()
        ctx.pos = this.pos
        return result
      },
      parseInstance: token => {
        this.pos = ctx.pos
        const result = this.parseInstance(token)
        ctx.pos = this.pos
        return result
      },
      skipNewlines: () => {
        this.pos = ctx.pos
        this.skipNewlines()
        ctx.pos = this.pos
      },
      previous: () => {
        this.pos = ctx.pos
        const result = this.previous()
        ctx.pos = this.pos
        return result
      },
      hasColonOnLine: () => {
        this.pos = ctx.pos
        const result = this.hasColonOnLine()
        ctx.pos = this.pos
        return result
      },
    }

    const result = parseZagComponentExtracted(ctx, nameToken, callbacks, colonAlreadyConsumed)
    this.pos = ctx.pos
    this.errors = ctx.errors
    return result
  }

  /**
   * Wrapper method that calls the extracted Animation parser.
   * Creates context for the modular parser.
   */
  private parseAnimationDefinitionWithContext(nameToken: Token): AnimationDefinition | null {
    const ctx: ParserContext = {
      tokens: this.tokens,
      source: this.source,
      loopVariables: this.loopVariables,
      pos: this.pos,
      errors: this.errors,
    }

    const result = parseAnimationDefinitionExtracted(ctx, nameToken)
    this.pos = ctx.pos
    this.errors = ctx.errors
    return result
  }

  /**
   * Look ahead to check if the current line contains inline child syntax (semicolons)
   * Inline child syntax: Frame bg #333; Text "Hello"; Button "OK"
   * Property syntax: Frame bg #f00; w 100 (NOT inline child)
   * Difference: Inline children have PascalCase names after semicolon
   */
  private hasInlineChildSyntax(): boolean {
    let ahead = 0
    // Use MAX_LOOKAHEAD to prevent DoS on malformed input with very long lines
    while (this.pos + ahead < this.tokens.length && ahead < Parser.MAX_LOOKAHEAD) {
      const token = this.tokens[this.pos + ahead]
      if (token.type === 'NEWLINE' || token.type === 'INDENT' || token.type === 'EOF') {
        return false
      }
      if (token.type === 'SEMICOLON') {
        // Check what follows the semicolon
        const nextToken = this.tokens[this.pos + ahead + 1]
        if (nextToken && nextToken.type === 'IDENTIFIER') {
          // If next token is PascalCase (starts with uppercase), it's an inline child
          // If lowercase, it's just a property separator
          const firstChar = nextToken.value[0]
          return firstChar === firstChar.toUpperCase()
        }
        return false
      }
      ahead++
    }
    return false
  }

  /**
   * Look ahead to check if there's a colon on the current line
   * Used for slot detection: "Trigger, hor, spread:" has colon at the end
   */
  private hasColonOnLine(): boolean {
    let ahead = 0
    // Use MAX_LOOKAHEAD to prevent DoS on malformed input with very long lines
    while (this.pos + ahead < this.tokens.length && ahead < Parser.MAX_LOOKAHEAD) {
      const token = this.tokens[this.pos + ahead]
      if (token.type === 'NEWLINE' || token.type === 'INDENT' || token.type === 'EOF') {
        return false
      }
      if (token.type === 'COLON') {
        return true
      }
      ahead++
    }
    return false
  }

  /**
   * Parse inline children with semicolon syntax
   *
   * Two patterns:
   * 1. All children: NavItem Icon "home"; Label "Home"
   *    → First token is PascalCase, ALL elements are children
   * 2. Properties then children: Frame bg #333; Text "Hello"
   *    → First token is lowercase, properties before ;, children after ;
   */
  private parseInlineChildrenAfterSemicolon(parent: Instance): void {
    // Check if the first token is PascalCase (all children mode) or lowercase (properties mode)
    const firstToken = this.current()
    const firstIsPascalCase =
      firstToken?.type === 'IDENTIFIER' && firstToken.value[0] === firstToken.value[0].toUpperCase()

    if (firstIsPascalCase) {
      // All elements are children (e.g., NavItem Icon "home"; Label "Home")
      this.parseInlineChild(parent)

      // Parse remaining children after semicolons
      while (this.check('SEMICOLON')) {
        this.advance() // consume semicolon
        if (this.check('NEWLINE') || this.check('INDENT') || this.isAtEnd()) break
        if (!this.check('IDENTIFIER')) break
        this.parseInlineChild(parent)
      }
    } else {
      // First part is properties, children come after semicolons
      // (e.g., Frame bg #333; Text "Hello")
      this.parseInlineProperties(parent.properties, parent.events, { stopAtSemicolon: true })

      // Parse child elements (after semicolons)
      while (this.check('SEMICOLON')) {
        this.advance() // consume semicolon
        if (this.check('NEWLINE') || this.check('INDENT') || this.isAtEnd()) break
        if (!this.check('IDENTIFIER')) break
        this.parseInlineChild(parent)
      }
    }
  }

  /**
   * Parse a single inline child element and add it to parent
   */
  private parseInlineChild(parent: Instance): void {
    const childName = this.advance()

    // Create child instance
    const child: Instance = {
      type: 'Instance',
      component: childName.value,
      name: null,
      properties: [],
      children: [],
      states: [],
      events: [],
      line: childName.line,
      column: childName.column,
      nodeId: this.generateNodeId(),
    }

    // Parse child's properties (until next semicolon or newline)
    this.parseInlineProperties(child.properties, child.events, { stopAtSemicolon: true })

    parent.children.push(child)
  }

  private parseComponentBody(component: ComponentDefinition): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT') || this.isAtEnd()) break

      // Skip commas between properties
      if (this.check('COMMA') || this.check('SEMICOLON')) {
        this.advance()
        continue
      }

      // Data binding: data Collection where condition
      if (this.check('DATA')) {
        const dataToken = this.advance()
        const binding = this.parseDataBindingValues()
        if (binding) {
          // Data binding values have special structure (collection + optional filter)
          const values: unknown[] = [binding.collection]
          if (binding.filter) {
            values.push({ filter: binding.filter })
          }
          component.properties.push({
            type: 'Property',
            name: 'data',
            values: values as Property['values'],
            line: dataToken.line,
            column: dataToken.column,
          })
        }
        continue
      }

      // Selection binding: selection $variable
      if (this.check('SELECTION')) {
        this.advance() // consume 'selection'
        if (this.check('IDENTIFIER')) {
          const varToken = this.advance()
          component.selection = varToken.value
        }
        continue
      }

      // Bind: bind varName (track active exclusive() child content)
      if (this.check('BIND')) {
        this.advance() // consume 'bind'
        if (this.check('IDENTIFIER')) {
          const varToken = this.advance()
          component.bind = varToken.value
        }
        continue
      }

      // Route: route TargetComponent or route path/to/page
      if (this.check('ROUTE')) {
        this.advance() // consume 'route'
        const routePath = this.parseRoutePath()
        if (routePath) {
          component.route = routePath
        }
        continue
      }

      // Note: SYSTEM_STATES is imported from parser-helpers.ts
      // It is derived from the schema (dsl.ts) to ensure consistency.

      // Initial state keywords: closed, open, collapsed, expanded
      // These set the component's initial state when used as standalone properties
      const INITIAL_STATE_KEYWORDS = new Set(['closed', 'open', 'collapsed', 'expanded'])
      if (this.check('IDENTIFIER') && INITIAL_STATE_KEYWORDS.has(this.current().value)) {
        // Check that this is not followed by a colon (which would make it a state block)
        if (!this.isStateBlockStart()) {
          component.initialState = this.advance().value
          continue
        }
      }

      // Boolean properties (use module-level constant including position booleans)
      const booleanProperties = ALL_BOOLEAN_PROPERTIES

      // State block with trigger: selected onclick: or selected toggle onclick:
      // Use isStateBlockStart() to detect complex state patterns
      if (this.check('IDENTIFIER') && this.isStateBlockStart()) {
        const stateToken = this.advance()

        let modifier: 'exclusive' | 'toggle' | 'initial' | undefined
        let trigger: string | undefined

        // Check for modifier (exclusive, toggle, initial)
        if (this.check('IDENTIFIER') && STATE_MODIFIERS.has(this.current().value)) {
          modifier = this.advance().value as 'exclusive' | 'toggle' | 'initial'
        }

        // Check for trigger (event name like onclick, onhover, onkeydown)
        if (this.check('IDENTIFIER') && EVENT_NAMES.has(this.current().value)) {
          const eventToken = this.advance()
          trigger = eventToken.value

          // Check for key (for onkeydown, onkeyup)
          if ((trigger === 'onkeydown' || trigger === 'onkeyup') && this.check('IDENTIFIER')) {
            const keyToken = this.current()
            if (KEYBOARD_KEYS.has(keyToken.value)) {
              trigger += ' ' + this.advance().value
            }
          }
        }

        // Parse animation config BEFORE colon
        let animation: StateAnimation | undefined
        if (this.check('NUMBER')) {
          const numToken = this.current()
          const duration = parseDuration(numToken.value)
          if (duration !== undefined) {
            this.advance()
            animation = { duration }
            if (this.check('IDENTIFIER') && EASING_FUNCTIONS.has(this.current().value)) {
              animation.easing = this.advance().value
            }
          }
        }

        this.advance() // consume colon

        // Check for animation preset AFTER colon on same line
        if (this.check('IDENTIFIER') && !this.check('NEWLINE') && !this.check('INDENT')) {
          const presetToken = this.current()
          if (ANIMATION_PRESETS.has(presetToken.value)) {
            const preset = this.advance().value
            if (!animation) {
              animation = { preset }
            } else {
              animation.preset = preset
            }
          }
        }

        const state: State = {
          type: 'State',
          name: stateToken.value,
          modifier,
          trigger,
          animation,
          properties: [],
          childOverrides: [],
          line: stateToken.line,
          column: stateToken.column,
        }

        // Parse inline state properties
        this.parseInlineProperties(state.properties)

        // Parse block properties, children, and child overrides (indented)
        this.skipNewlines()
        if (this.check('INDENT')) {
          this.advance()
          while (!this.check('DEDENT') && !this.isAtEnd()) {
            this.skipNewlines()
            if (this.check('DEDENT')) break

            // Handle string content as Text child
            if (this.check('STRING')) {
              const str = this.advance()
              const textChild: Instance = {
                type: 'Instance',
                component: 'Text',
                name: null,
                properties: [
                  {
                    type: 'Property',
                    name: 'content',
                    values: [str.value],
                    line: str.line,
                    column: str.column,
                  },
                ],
                children: [],
                states: [],
                events: [],
                line: str.line,
                column: str.column,
              }
              if (!state.children) state.children = []
              state.children.push(textChild)
              continue
            }

            if (this.check('IDENTIFIER')) {
              const propName = this.current().value

              // Check for child overrides or children (capitalized names)
              if (propName[0] === propName[0].toUpperCase()) {
                // Distinguish between:
                // 1. ChildOverride: Name followed by COLON (Icon: ic white)
                // 2. State child: primitive followed by STRING or properties (Icon "plus", Frame hor)
                // 3. ChildOverride: unknown name (not primitive)
                //
                // Priority: COLON check first - if Name: then always childOverride
                if (this.checkNext('COLON')) {
                  // Name followed by COLON is always a childOverride
                  const childOverride = this.parseStateChildOverride()
                  if (childOverride) state.childOverrides.push(childOverride)
                } else if (isPrimitive(propName)) {
                  // Primitive without colon - this is a new state child
                  const child = this.parseStateChildInstance()
                  if (child) {
                    if (!state.children) state.children = []
                    state.children.push(child)
                  }
                } else {
                  // Unknown capitalized name without colon - treat as property override
                  const childOverride = this.parseStateChildOverride()
                  if (childOverride) state.childOverrides.push(childOverride)
                }
              } else {
                this.parseInlineProperties(state.properties)
              }
            } else {
              this.advance()
            }
          }
          if (this.check('DEDENT')) this.advance()
        }

        component.states.push(state)
        continue
      }

      if (this.check('IDENTIFIER') && !this.checkNext('COLON') && !this.checkNext('AS')) {
        const name = this.current().value

        // System state without colon: hover\n  bg #333
        if (SYSTEM_STATES.has(name)) {
          // Check if followed by newline and indent (block state)
          const savedPos = this.pos
          const stateToken = this.advance()
          this.skipNewlines()

          if (this.check('INDENT')) {
            // It's a state block
            this.advance() // consume INDENT

            const state: State = {
              type: 'State',
              name: stateToken.value,
              properties: [],
              childOverrides: [],
              line: stateToken.line,
              column: stateToken.column,
            }

            // Parse state properties, child overrides, and state children
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              // Handle string content as Text child
              if (this.check('STRING')) {
                const str = this.advance()
                const textChild: Instance = {
                  type: 'Instance',
                  component: 'Text',
                  name: null,
                  properties: [
                    {
                      type: 'Property',
                      name: 'content',
                      values: [str.value],
                      line: str.line,
                      column: str.column,
                    },
                  ],
                  children: [],
                  states: [],
                  events: [],
                  line: str.line,
                  column: str.column,
                }
                if (!state.children) state.children = []
                state.children.push(textChild)
                continue
              }

              if (this.check('IDENTIFIER')) {
                const token = this.current()
                // Check if this is uppercase (component/child)
                if (token && this.isUppercase(token.value)) {
                  // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                  // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                  if (this.checkNext('STRING')) {
                    // This is a new child instance with content
                    const child = this.parseStateChildInstance()
                    if (child) {
                      if (!state.children) state.children = []
                      state.children.push(child)
                    }
                  } else {
                    // This is a childOverride (slot or property override)
                    const childOverride = this.parseStateChildOverride()
                    if (childOverride) state.childOverrides.push(childOverride)
                  }
                } else {
                  const prop = this.parseProperty()
                  if (prop) state.properties.push(prop)
                }
              } else {
                this.advance()
              }
            }
            if (this.check('DEDENT')) this.advance()

            component.states.push(state)
            continue
          } else {
            // Not a state block, restore position
            this.pos = savedPos
          }
        }

        // Behavior state with "state" keyword: state highlighted\n  bg #333
        // or inline: state highlighted bg #333
        if (name === 'state') {
          const savedPos = this.pos
          this.advance() // consume 'state'

          if (this.check('IDENTIFIER')) {
            const stateNameToken = this.advance()

            const state: State = {
              type: 'State',
              name: stateNameToken.value,
              properties: [],
              childOverrides: [],
              line: stateNameToken.line,
              column: stateNameToken.column,
            }

            // Check for inline properties: state highlighted bg #333
            if (this.check('IDENTIFIER') || this.check('NUMBER') || this.check('STRING')) {
              this.parseInlineProperties(state.properties)
            }

            // Check for block properties, children, and child overrides
            this.skipNewlines()
            if (this.check('INDENT')) {
              this.advance() // consume INDENT
              while (!this.check('DEDENT') && !this.isAtEnd()) {
                this.skipNewlines()
                if (this.check('DEDENT')) break

                // Handle string content as Text child
                if (this.check('STRING')) {
                  const str = this.advance()
                  const textChild: Instance = {
                    type: 'Instance',
                    component: 'Text',
                    name: null,
                    properties: [
                      {
                        type: 'Property',
                        name: 'content',
                        values: [str.value],
                        line: str.line,
                        column: str.column,
                      },
                    ],
                    children: [],
                    states: [],
                    events: [],
                    line: str.line,
                    column: str.column,
                  }
                  if (!state.children) state.children = []
                  state.children.push(textChild)
                  continue
                }

                if (this.check('IDENTIFIER')) {
                  const token = this.current()
                  // Check if this is uppercase (component/child)
                  if (token && this.isUppercase(token.value)) {
                    // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                    // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                    if (this.checkNext('STRING')) {
                      // This is a new child instance with content
                      const child = this.parseStateChildInstance()
                      if (child) {
                        if (!state.children) state.children = []
                        state.children.push(child)
                      }
                    } else {
                      // This is a childOverride (slot or property override)
                      const childOverride = this.parseStateChildOverride()
                      if (childOverride) state.childOverrides.push(childOverride)
                    }
                  } else {
                    const prop = this.parseProperty()
                    if (prop) state.properties.push(prop)
                  }
                } else {
                  this.advance()
                }
              }
              if (this.check('DEDENT')) this.advance()
            }

            component.states.push(state)
            continue
          } else {
            // Not a valid state, restore position
            this.pos = savedPos
          }
        }

        // Handle boolean properties (no value)
        if (booleanProperties.has(name)) {
          const token = this.advance()
          component.properties.push({
            type: 'Property',
            name: token.value,
            values: [true],
            line: token.line,
            column: token.column,
          })
          continue
        }

        // Known properties that take any identifier value (including PascalCase like "Arial")
        const propertiesWithAnyValue = new Set([
          'font',
          'cursor',
          'align',
          'weight',
          'animation',
          'anim',
        ])

        // Property line: identifier followed by values (NUMBER, STRING, IDENTIFIER)
        const next = this.peekAt(1)
        // If next token looks like a value (NUMBER, STRING, or simple IDENTIFIER not starting with uppercase)
        // then it's a property
        if (
          next &&
          (next.type === 'NUMBER' ||
            next.type === 'STRING' ||
            (next.type === 'IDENTIFIER' && !this.current().value.startsWith('on')))
        ) {
          // Check if it's likely a property (next is value) vs child instance (next is STRING only)
          // Property: pad 16, bg #FFF, col white, font Arial
          // Instance: Button "Click", Text "Hello"
          // Heuristic: if name is lowercase and next is number/identifier, it's a property
          // Exception: known properties like "font" can take PascalCase values
          const isLikelyProperty =
            name[0] === name[0].toLowerCase() &&
            (next.type === 'NUMBER' ||
              propertiesWithAnyValue.has(name) ||
              (next.type === 'IDENTIFIER' && next.value[0] === next.value[0].toLowerCase()))

          if (isLikelyProperty) {
            const prop = this.parseProperty()
            if (prop) component.properties.push(prop)
            continue
          }
        }
      }

      // Event with colon: onclick: action
      // Events are "on" + event name (onclick, onhover, etc.)
      // NOT just "on" or "off" which are state names
      const isEventName = (name: string) =>
        name.startsWith('on') && name.length > 2 && name !== 'on'
      if (
        this.check('IDENTIFIER') &&
        this.checkNext('COLON') &&
        isEventName(this.current().value)
      ) {
        const event = this.parseEvent()
        if (event) component.events.push(event)
        continue
      }

      // State or Slot: Name:
      // States are lowercase (hover, focus, active, selected, on, off, etc.)
      // Slots are capitalized (Title, Content, Header, etc.)
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const name = this.current().value
        const isLikelyState = name[0] === name[0].toLowerCase()

        if (isLikelyState) {
          // Parse as state
          const stateName = this.advance()
          this.advance() // :

          const state: State = {
            type: 'State',
            name: stateName.value,
            properties: [],
            childOverrides: [],
            line: stateName.line,
            column: stateName.column,
          }

          // Inline state properties
          this.parseInlineProperties(state.properties)

          // Block state properties
          this.skipNewlines()
          if (this.check('INDENT')) {
            this.advance()
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              if (this.check('IDENTIFIER')) {
                const prop = this.parseProperty()
                if (prop) state.properties.push(prop)
              } else {
                this.advance()
              }
            }
            if (this.check('DEDENT')) this.advance()
          }

          component.states.push(state)
          continue
        } else {
          // Capitalized name - likely a slot: Title:
          const slotName = this.advance()
          this.advance() // :

          const slot: Instance = {
            type: 'Instance',
            component: slotName.value,
            name: null,
            properties: [],
            children: [],
            line: slotName.line,
            column: slotName.column,
          }

          this.parseInlineProperties(slot.properties)
          this.skipNewlines()
          if (this.check('INDENT')) {
            this.advance()
            this.parseInstanceBody(slot)
          }

          component.children.push(slot)
          continue
        }
      }

      // Event: onclick action
      if (this.check('IDENTIFIER') && this.current().value.startsWith('on')) {
        const event = this.parseEvent()
        if (event) component.events.push(event)
        continue
      }

      // Keys block
      if (this.check('KEYS')) {
        this.parseKeysBlock(component.events)
        continue
      }

      // Visibility condition: if (state) with or without children
      if (this.check('IF')) {
        this.advance() // consume IF
        const condition = this.parseExpression()
        this.skipNewlines()

        // Extract state name from condition like "(open)" → "open"
        const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
        const visibleWhen = match ? match[1] : condition

        // If NOT followed by INDENT, it's a visibility condition for current component
        if (!this.check('INDENT')) {
          component.visibleWhen = visibleWhen
          continue
        }

        // Has children - parse them and set visibleWhen on each
        this.advance() // consume INDENT
        for (
          let iter = 0;
          !this.isAtEnd() && !this.check('DEDENT') && iter < Parser.MAX_ITERATIONS;
          iter++
        ) {
          this.skipNewlines()
          if (this.check('DEDENT') || this.isAtEnd()) break

          // Child component definition: ChildName as primitive:
          if (this.check('IDENTIFIER') && this.checkNext('AS')) {
            const childName = this.advance()
            const child = this.parseComponentDefinition(childName)
            if (child) {
              child.visibleWhen = visibleWhen
              // ComponentDefinition children are treated as Instances in this context
              component.children.push(child as unknown as Instance)
            }
            continue
          }

          // Child instance
          if (this.check('IDENTIFIER')) {
            const name = this.advance()
            const child = this.parseInstance(name)
            if (child.type === 'Instance') {
              child.visibleWhen = visibleWhen
              component.children.push(child)
            } else if (child.type === 'Slot') {
              component.children.push(child)
            }
            continue
          }

          this.advance()
        }
        if (this.check('DEDENT')) this.advance()
        continue
      }

      // Child component definition: ChildName as primitive:
      if (this.check('IDENTIFIER') && this.checkNext('AS')) {
        const childName = this.advance()
        const child = this.parseComponentDefinition(childName)
        if (child) {
          // ComponentDefinition children are treated as Instances in this context
          component.children.push(child as unknown as Instance)
        }
        continue
      }

      // String content as Text child (for component definitions)
      if (this.check('STRING')) {
        const str = this.advance()
        const textChild: Instance = {
          type: 'Instance',
          component: 'Text',
          name: null,
          properties: [
            {
              type: 'Property',
              name: 'content',
              values: [str.value],
              line: str.line,
              column: str.column,
            },
          ],
          children: [],
          states: [],
          events: [],
          line: str.line,
          column: str.column,
        }
        component.children.push(textChild)
        continue
      }

      // Child instance (without COLON - those are handled above as slots/states)
      if (this.check('IDENTIFIER')) {
        const name = this.advance()
        const child = this.parseInstance(name)
        if (child.type !== 'ZagComponent') {
          component.children.push(child as Instance | Slot)
        }
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  private parseInstanceBody(instance: Instance): void {
    // Boolean properties that can appear in instance body
    // Using module-level constant (derived from schema via parser-helpers.ts)
    const booleanProperties = ALL_BOOLEAN_PROPERTIES

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT') || this.isAtEnd()) break

      // Visibility condition: if (state) with or without children
      if (this.check('IF')) {
        this.advance() // consume IF
        const condition = this.parseExpression()
        this.skipNewlines()

        // Extract state name from condition like "(open)" → "open"
        const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
        const visibleWhen = match ? match[1] : condition

        // If NOT followed by INDENT, it's a visibility condition for current instance
        if (!this.check('INDENT')) {
          instance.visibleWhen = visibleWhen
          continue
        }

        // Has children - parse them and set visibleWhen on each
        this.advance() // consume INDENT
        for (
          let iter = 0;
          !this.isAtEnd() && !this.check('DEDENT') && iter < Parser.MAX_ITERATIONS;
          iter++
        ) {
          this.skipNewlines()
          if (this.check('DEDENT') || this.isAtEnd()) break

          // Child instance (including Zag components)
          if (this.check('IDENTIFIER')) {
            const name = this.advance()
            const child = this.parseInstance(name)
            if (child.type === 'Instance') {
              child.visibleWhen = visibleWhen
            }
            if (!instance.children) instance.children = []
            if (child.type === 'Instance' || child.type === 'Slot') {
              instance.children.push(child)
            } else if (child.type === 'ZagComponent') {
              instance.children.push(child as ZagNode)
            }
            continue
          }

          this.advance()
        }
        if (this.check('DEDENT')) this.advance()
        continue
      }

      // Each loop: each item in collection
      // Note: Each is treated as a special child type (not standard Instance.children)
      if (this.check('EACH')) {
        const each = this.parseEach()
        if (each) {
          if (!instance.children) instance.children = []
          // Each loops are handled specially in IR transformation
          instance.children.push(each as unknown as Instance)
        }
        continue
      }

      // Selection binding: selection $variable
      if (this.check('SELECTION')) {
        this.advance() // consume 'selection'
        if (this.check('IDENTIFIER')) {
          const varToken = this.advance()
          instance.selection = varToken.value
        }
        continue
      }

      // Bind: bind varName (track active exclusive() child content)
      if (this.check('BIND')) {
        this.advance() // consume 'bind'
        if (this.check('IDENTIFIER')) {
          const varToken = this.advance()
          instance.bind = varToken.value
        }
        continue
      }

      // Route: route TargetComponent or route path/to/page
      if (this.check('ROUTE')) {
        this.advance() // consume 'route'
        const routePath = this.parseRoutePath()
        if (routePath) {
          instance.route = routePath
        }
        continue
      }

      // Keys block
      if (this.check('KEYS')) {
        // Note: Instances skip keys blocks - keyboard events are defined in component definitions
        // This is intentional: instances inherit behavior from their components
        this.advance()
        this.skipNewlines()
        if (this.check('INDENT')) {
          this.advance()
          while (!this.check('DEDENT') && !this.isAtEnd()) {
            this.skipNewlines()
            if (this.check('DEDENT')) break
            this.advance()
          }
          if (this.check('DEDENT')) this.advance()
        }
        continue
      }

      // Check for identifier-based parsing
      if (this.check('IDENTIFIER')) {
        const name = this.current().value

        // Event block: onclick: or inline event: onclick action
        // Must check BEFORE state block handling
        if (EVENT_NAMES.has(name)) {
          if (!instance.events) instance.events = []
          const event = this.parseEvent()
          if (event) instance.events.push(event)
          continue
        }

        // Boolean property (focusable, etc.)
        // Skip if it looks like a state block (visible when X open:)
        if (booleanProperties.has(name) && !this.isStateBlockStart()) {
          const token = this.advance()
          instance.properties.push({
            type: 'Property',
            name: token.value,
            values: [true],
            line: token.line,
            column: token.column,
          })
          continue
        }

        // Property line (lowercase identifier that is a known property)
        if (PROPERTY_STARTERS.has(name)) {
          this.parseInlineProperties(instance.properties)
          continue
        }

        // State block: hover: or selected: or selected onclick: or visible when Menu open:
        // Also handles external state reference: MenuBtn.open:
        // Allow ANY identifier as state name if followed by state block pattern (when, modifier, trigger)
        if (this.isStateBlockStart()) {
          const stateToken = this.advance()

          let modifier: 'exclusive' | 'toggle' | 'initial' | undefined
          let trigger: string | undefined
          let when: StateDependency | undefined

          // Check for external state reference: ElementName.state:
          // Pattern: we already consumed ElementName, now check for DOT IDENTIFIER COLON
          let externalStateName: string | undefined
          if (this.check('DOT')) {
            this.advance() // consume DOT
            if (this.check('IDENTIFIER')) {
              const externalState = this.advance().value
              // Create a 'when' dependency pointing to the external element's state
              when = {
                target: stateToken.value, // The element name (e.g., MenuBtn)
                state: externalState, // The state name (e.g., open)
              }
              // Use a synthetic state name for this block (e.g., "_MenuBtn_open")
              externalStateName = `_${stateToken.value}_${externalState}`
            }
          }

          // Check for modifier (exclusive, toggle, initial)
          if (this.check('IDENTIFIER') && STATE_MODIFIERS.has(this.current().value)) {
            modifier = this.advance().value as 'exclusive' | 'toggle' | 'initial'
          }

          // Check for 'when' dependency (legacy syntax, now prefer ElementName.state:)
          if (this.check('IDENTIFIER') && this.current().value === 'when') {
            this.advance() // consume 'when'
            when = this.parseWhenClause()
          }

          // Check for trigger (event name like onclick, onhover, onkeydown)
          if (this.check('IDENTIFIER') && EVENT_NAMES.has(this.current().value)) {
            const eventToken = this.advance()
            trigger = eventToken.value

            // Check for key (for onkeydown, onkeyup)
            if ((trigger === 'onkeydown' || trigger === 'onkeyup') && this.check('IDENTIFIER')) {
              const keyToken = this.current()
              if (KEYBOARD_KEYS.has(keyToken.value)) {
                trigger += ' ' + this.advance().value
              }
            }
          }

          // Parse animation config BEFORE colon
          // Syntax: selected onclick 0.2s ease-out:
          let animation: StateAnimation | undefined

          // Check for duration (e.g., 0.2s, 200ms)
          if (this.check('NUMBER') && !this.check('COLON')) {
            const numToken = this.current()
            const duration = parseDuration(numToken.value)
            if (duration !== undefined) {
              this.advance()
              animation = { duration }

              // Check for easing after duration (e.g., ease-out)
              if (this.check('IDENTIFIER') && !this.check('COLON')) {
                const easingToken = this.current()
                if (EASING_FUNCTIONS.has(easingToken.value)) {
                  animation.easing = this.advance().value
                }
              }
            }
          }

          this.advance() // consume colon

          // Check for animation preset AFTER colon on same line
          // Syntax: selected onclick: bounce
          if (this.check('IDENTIFIER') && !this.check('NEWLINE') && !this.check('INDENT')) {
            const presetToken = this.current()
            if (ANIMATION_PRESETS.has(presetToken.value)) {
              const preset = this.advance().value
              if (!animation) {
                animation = { preset }
              } else {
                animation.preset = preset
              }
            }
          }

          const state: State = {
            type: 'State',
            name: externalStateName || stateToken.value,
            modifier,
            trigger,
            when,
            animation,
            properties: [],
            childOverrides: [],
            line: stateToken.line,
            column: stateToken.column,
          }

          // Parse inline state properties
          this.parseInlineProperties(state.properties, instance.events)

          // Parse block properties (indented)
          this.skipNewlines()
          if (this.check('INDENT')) {
            this.advance()
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              // Parse properties on each line
              if (this.check('IDENTIFIER')) {
                const propName = this.current().value

                // Check for enter:/exit: animation pseudo-properties
                if ((propName === 'enter' || propName === 'exit') && this.checkNext('COLON')) {
                  const animType = this.advance().value as 'enter' | 'exit'
                  this.advance() // consume colon

                  // Parse animation value: preset, duration, easing
                  const anim: StateAnimation = {}

                  // Check for preset (e.g., slide-in, fade-out)
                  if (this.check('IDENTIFIER')) {
                    const token = this.current()
                    if (ANIMATION_PRESETS.has(token.value)) {
                      anim.preset = this.advance().value
                    }
                  }

                  // Check for duration (e.g., 0.2s)
                  if (this.check('NUMBER')) {
                    const duration = parseDuration(this.current().value)
                    if (duration !== undefined) {
                      this.advance()
                      anim.duration = duration
                    }
                  }

                  // Check for easing (e.g., ease-out)
                  if (this.check('IDENTIFIER')) {
                    const token = this.current()
                    if (EASING_FUNCTIONS.has(token.value)) {
                      anim.easing = this.advance().value
                    }
                  }

                  state[animType] = anim
                  continue
                }

                // Check for child overrides or children (capitalized names)
                if (propName[0] === propName[0].toUpperCase()) {
                  // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                  // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                  if (this.checkNext('STRING')) {
                    // This is a new child instance with content
                    const child = this.parseStateChildInstance()
                    if (child) {
                      if (!state.children) state.children = []
                      state.children.push(child)
                    }
                  } else {
                    // This is a childOverride (slot or property override)
                    const childOverride = this.parseStateChildOverride()
                    if (childOverride) state.childOverrides.push(childOverride)
                  }
                } else {
                  // Check if this is a target state reference for 'when' dependencies
                  // Syntax: SearchInput.searching:
                  //           searching        ← this is the target state
                  // But NOT if it's a known property like 'visible', 'hidden', etc.
                  if (
                    state.when &&
                    !state.targetState &&
                    propName[0] === propName[0].toLowerCase() &&
                    !ALL_BOOLEAN_PROPERTIES.has(propName) &&
                    (this.checkNext('NEWLINE') || this.checkNext('DEDENT') || this.isAtEnd())
                  ) {
                    // This is a target state reference
                    state.targetState = this.advance().value
                  } else {
                    // Regular property
                    this.parseInlineProperties(state.properties)
                  }
                }
              } else if (this.check('STRING')) {
                // Handle string content as Text child
                const str = this.advance()
                const textChild: Instance = {
                  type: 'Instance',
                  component: 'Text',
                  name: null,
                  properties: [
                    {
                      type: 'Property',
                      name: 'content',
                      values: [str.value],
                      line: str.line,
                      column: str.column,
                    },
                  ],
                  children: [],
                  states: [],
                  events: [],
                  line: str.line,
                  column: str.column,
                }
                if (!state.children) state.children = []
                state.children.push(textChild)
              } else {
                // Skip any other tokens to prevent infinite loops
                this.advance()
              }
            }
            if (this.check('DEDENT')) this.advance()
          }

          if (!instance.states) instance.states = []
          instance.states.push(state)
          continue
        }

        // Token reference as property set: $cardstyle applies styles from the token
        // For text content, use quotes: "$firstName" or "Hello $firstName"
        if (name.startsWith('$')) {
          const token = this.advance()
          instance.properties.push({
            type: 'Property',
            name: 'propset', // Property set reference, expanded in IR
            values: [{ kind: 'token' as const, name: token.value.slice(1) }],
            line: token.line,
            column: token.column,
          })
          continue
        }

        // Initial state: any lowercase identifier that isn't a known keyword
        // This allows setting states defined in components: Button selected, Dialog closed
        // Must be lowercase (PascalCase = child component) and not a known property/event/modifier
        if (
          name[0] === name[0].toLowerCase() &&
          !EVENT_NAMES.has(name) &&
          !booleanProperties.has(name) &&
          !PROPERTY_STARTERS.has(name) &&
          !STATE_MODIFIERS.has(name) &&
          name !== 'when' &&
          name !== 'as'
        ) {
          const token = this.advance()
          instance.initialState = token.value
          continue
        }

        // Chart slot: XAxis:, YAxis:, Legend:, etc.
        // Only parse if this is a chart primitive and the identifier is a valid chart slot
        const isChartSlotSyntax =
          isChartSlot(name) && this.checkNext('COLON') && isChartPrimitive(instance.component)

        if (isChartSlotSyntax) {
          const slotToken = this.advance() // consume slot name
          this.advance() // consume :

          const chartSlot = this.parseChartSlot(slotToken)
          if (chartSlot) {
            if (!instance.chartSlots) instance.chartSlots = {}
            instance.chartSlots[chartSlot.name] = chartSlot
          }
          continue
        }

        // Child instance (including Zag components)
        const child = this.parseInstance(this.advance())
        if (child.type === 'Instance' || child.type === 'Slot') {
          instance.children.push(child)
        } else if (child.type === 'ZagComponent') {
          instance.children.push(child as ZagNode)
        }
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  /**
   * Parse a chart slot definition
   * Syntax: XAxis: col #888, label "Month", fs 12
   */
  private parseChartSlot(slotToken: Token): ChartSlotNode | null {
    const slotName = slotToken.value
    const slotDef = getChartSlot(slotName)
    if (!slotDef) return null

    const properties: Property[] = []

    // Parse inline properties on the same line
    this.parseInlineProperties(properties)

    return {
      name: slotName,
      properties,
      sourcePosition: {
        line: slotToken.line,
        column: slotToken.column,
        endLine: slotToken.line,
        endColumn: slotToken.column + slotName.length,
      },
    }
  }

  /**
   * Parse inline children after a colon on the same line
   * Syntax: Box hor, gap 8: Icon "save", Text "Speichern"
   * Children are separated by commas followed by capitalized component names
   */
  private parseInlineChildren(instance: Instance): void {
    while (
      !this.check('NEWLINE') &&
      !this.check('INDENT') &&
      !this.check('DEDENT') &&
      !this.isAtEnd()
    ) {
      // Skip leading commas
      if (this.check('COMMA') || this.check('SEMICOLON')) {
        this.advance()
        continue
      }

      // Check if this looks like a component (capitalized identifier)
      if (this.check('IDENTIFIER')) {
        const name = this.current().value
        const isComponent = name.charAt(0) === name.charAt(0).toUpperCase()

        if (isComponent) {
          const childName = this.advance()

          // Create child instance
          const child: Instance = {
            type: 'Instance',
            component: childName.value,
            name: null,
            properties: [],
            children: [],
            line: childName.line,
            column: childName.column,
          }

          // Parse child's properties until we hit a comma followed by another component
          while (
            !this.check('NEWLINE') &&
            !this.check('INDENT') &&
            !this.check('DEDENT') &&
            !this.isAtEnd()
          ) {
            // Check for comma - if followed by capitalized identifier, it's a new child
            if (this.check('COMMA')) {
              const nextToken = this.tokens[this.pos + 1]
              if (nextToken && nextToken.type === 'IDENTIFIER') {
                const nextName = nextToken.value
                const isNextComponent = nextName.charAt(0) === nextName.charAt(0).toUpperCase()
                if (isNextComponent) {
                  // This comma separates children - break to outer loop
                  break
                }
              }
              // Comma between properties - skip it and continue
              this.advance()
              continue
            }

            // String content
            if (this.check('STRING')) {
              const str = this.advance()
              child.properties.push({
                type: 'Property',
                name: 'content',
                values: [str.value],
                line: str.line,
                column: str.column,
              })
              continue
            }

            // Property (lowercase identifier)
            if (this.check('IDENTIFIER')) {
              const prop = this.parseProperty()
              if (prop) child.properties.push(prop)
              continue
            }

            break
          }

          instance.children.push(child)
        } else {
          // Lowercase - not a component, stop parsing
          break
        }
      } else {
        break
      }
    }
  }

  private parseInlineProperties(
    properties: Property[],
    events?: Event[],
    options?: { stopAtSemicolon?: boolean }
  ): void {
    const stopAtSemicolon = options?.stopAtSemicolon ?? false
    while (
      !this.check('NEWLINE') &&
      !this.check('INDENT') &&
      !this.check('DEDENT') &&
      !this.check('COLON') &&
      !this.isAtEnd()
    ) {
      // Skip commas (and semicolons unless stopAtSemicolon is true)
      if (this.check('COMMA')) {
        this.advance()
        continue
      }
      if (this.check('SEMICOLON')) {
        if (stopAtSemicolon) break
        this.advance()
        continue
      }

      // String content - check for concatenation with + operator
      if (this.check('STRING')) {
        const str = this.advance()
        const startLine = str.line
        const startColumn = str.column

        // Check if followed by + for expression
        if (this.check('PLUS')) {
          // Build a computed expression, handling parentheses properly
          const parts: ComputedExpression['parts'] = [str.value]
          const operators: string[] = []

          while (
            this.check('PLUS') ||
            this.check('MINUS') ||
            this.check('STAR') ||
            this.check('SLASH')
          ) {
            operators.push(this.advance().value)

            // Get the next operand (may be a parenthesized sub-expression)
            this.collectExpressionOperand(parts, operators)
          }

          const expr: ComputedExpression = { kind: 'expression', parts, operators }
          properties.push({
            type: 'Property',
            name: 'content',
            values: [expr],
            line: startLine,
            column: startColumn,
          })
        } else {
          // Simple string content
          properties.push({
            type: 'Property',
            name: 'content',
            values: [str.value],
            line: startLine,
            column: startColumn,
          })
        }
        continue
      }

      // Data binding: data Collection where condition
      if (this.check('DATA')) {
        const dataToken = this.advance()
        const binding = this.parseDataBindingValues()
        if (binding) {
          // Data binding values have special structure (collection + optional filter)
          const values: unknown[] = [binding.collection]
          if (binding.filter) {
            values.push({ filter: binding.filter })
          }
          properties.push({
            type: 'Property',
            name: 'data',
            values: values as Property['values'],
            line: dataToken.line,
            column: dataToken.column,
          })
        }
        continue
      }

      // Route: route TargetComponent or route path/to/page (stored as property, moved to instance.route later)
      if (this.check('ROUTE')) {
        const routeToken = this.advance()
        const routePath = this.parseRoutePath()
        if (routePath) {
          properties.push({
            type: 'Property',
            name: '_route', // Special prefix to identify route properties
            values: [routePath],
            line: routeToken.line,
            column: routeToken.column,
          })
        }
        continue
      }

      // Bind: bind varName - track active exclusive() child content in a variable
      if (this.check('BIND')) {
        const bindToken = this.advance()
        // Get the variable name (could be an identifier or $token)
        if (this.check('IDENTIFIER')) {
          const varName = this.advance()
          properties.push({
            type: 'Property',
            name: 'bind',
            values: [varName.value],
            line: bindToken.line,
            column: bindToken.column,
          })
        }
        continue
      }

      // Token reference as property set: Frame $cardstyle applies styles
      // Also handles expressions like: Text $count + " items" (computed expression)
      // For text content, use quotes: Text "$firstName" or Text "Hello $firstName"
      if (this.check('IDENTIFIER') && this.current().value.startsWith('$')) {
        const token = this.advance()
        const startLine = token.line
        const startColumn = token.column
        let tokenName = token.value.slice(1) // Remove leading $

        // Handle method call arguments immediately after identifier: $users.sum(hours), $users.sum(data.stats.value)
        // The lexer combines $users.sum into a single IDENTIFIER, so check for LPAREN here
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
          tokenName += '(' + args.join(', ') + ')'
        }

        // Handle property access: $item.name → item.name
        // Also handles method calls: $users.sum(hours), $tasks.avg(priority)
        while (this.check('DOT')) {
          this.advance() // consume .
          if (this.check('IDENTIFIER')) {
            tokenName += '.' + this.advance().value
            // Check for method call arguments: .sum(hours), .sum(data.stats.value)
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
              tokenName += '(' + args.join(', ') + ')'
            }
          }
        }

        const tokenRef: TokenReference = { kind: 'token', name: tokenName }

        // Check if followed by + for expression
        if (
          this.check('PLUS') ||
          this.check('MINUS') ||
          this.check('STAR') ||
          this.check('SLASH')
        ) {
          // Build a computed expression, handling parentheses properly
          const parts: ComputedExpression['parts'] = [tokenRef]
          const operators: string[] = []

          while (
            this.check('PLUS') ||
            this.check('MINUS') ||
            this.check('STAR') ||
            this.check('SLASH')
          ) {
            operators.push(this.advance().value)

            // Get the next operand (may be a parenthesized sub-expression)
            this.collectExpressionOperand(parts, operators)
          }

          const expr: ComputedExpression = { kind: 'expression', parts, operators }
          properties.push({
            type: 'Property',
            name: 'content',
            values: [expr],
            line: startLine,
            column: startColumn,
          })
        } else {
          // Simple token reference → property set (styles)
          // For text content, use quotes: "$token" or "text with $token"
          properties.push({
            type: 'Property',
            name: 'propset',
            values: [tokenRef],
            line: startLine,
            column: startColumn,
          })
        }
        continue
      }

      // Property: name value (or boolean property)
      if (this.check('IDENTIFIER')) {
        const identName = this.current().value

        // Check if this is a loop variable reference (e.g., user.name, item, index)
        // Loop variables should be treated as content, not as property names
        if (this.loopVariables.has(identName)) {
          const token = this.advance()
          const startLine = token.line
          const startColumn = token.column
          let varAccess = identName

          // Handle property access: user.name, item.nested.value
          while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
            this.advance() // .
            varAccess += '.' + this.advance().value
          }

          // Handle array indexing: user.name[0], items[1]
          while (this.check('LBRACKET')) {
            this.advance() // [
            if (this.check('NUMBER')) {
              varAccess += '[' + this.advance().value + ']'
            }
            if (this.check('RBRACKET')) {
              this.advance() // ]
            }
          }

          // Check if followed by + for expression (e.g., index + 1)
          if (
            this.check('PLUS') ||
            this.check('MINUS') ||
            this.check('STAR') ||
            this.check('SLASH')
          ) {
            const loopVarRef = { kind: 'loopVar' as const, name: varAccess }
            const parts: ComputedExpression['parts'] = [loopVarRef]
            const operators: string[] = []

            while (
              this.check('PLUS') ||
              this.check('MINUS') ||
              this.check('STAR') ||
              this.check('SLASH')
            ) {
              operators.push(this.advance().value)
              this.collectExpressionOperand(parts, operators)
            }

            const expr: ComputedExpression = { kind: 'expression', parts, operators }
            properties.push({
              type: 'Property',
              name: 'content',
              values: [expr],
              line: startLine,
              column: startColumn,
            })
          } else {
            // Simple loop variable reference as content
            const loopVarRef = { kind: 'loopVar' as const, name: varAccess }
            properties.push({
              type: 'Property',
              name: 'content',
              values: [loopVarRef],
              line: startLine,
              column: startColumn,
            })
          }
          continue
        }

        // Check for implicit onclick: toggle(), show(Menu), save()
        // Identifier followed by ( that's not a known property starter
        if (events && this.checkNext('LPAREN') && this.isImplicitOnclickCandidate(identName)) {
          const implicitEvent = this.parseImplicitOnclick()
          if (implicitEvent) {
            events.push(implicitEvent)
            continue
          }
        }

        // Check for inline event syntax: "onkeydown enter: submit"
        // Must be an actual event name (onclick, onhover, etc.), not just anything starting with "on"
        // "on" by itself is a state name, not an event
        if (EVENT_NAMES.has(identName) && events) {
          const event = this.parseEvent()
          if (event) events.push(event)
          continue
        }

        // Check for inline state syntax: "hover: bg light"
        // State names are lowercase (hover, focus, active, selected, etc.)
        // Exception: keyboard keys like "enter:" are NOT states
        if (
          this.checkNext('COLON') &&
          identName[0] === identName[0].toLowerCase() &&
          !KEYBOARD_KEYS.has(identName)
        ) {
          // This is an inline state - stop here, let parseInstanceBody handle it
          break
        }

        // Check for boolean properties first - they don't take values
        if (ALL_BOOLEAN_PROPERTIES.has(identName)) {
          const token = this.advance()
          properties.push({
            type: 'Property',
            name: token.value,
            values: [true],
            line: token.line,
            column: token.column,
          })
          continue
        }
        const prop = this.parseProperty()
        if (prop) properties.push(prop)
        continue
      }

      // Number (might be standalone value)
      if (this.check('NUMBER')) {
        this.advance()
        continue
      }

      // Skip any other tokens to prevent infinite loops
      // (COLON, EQUALS, etc. that appear unexpectedly)
      this.advance()
    }
  }

  private parseDataBindingValues(): { collection: string; filter?: Expression } | null {
    if (!this.check('IDENTIFIER')) return null
    const collection = this.advance().value

    let filter: Expression | undefined
    if (this.check('WHERE')) {
      this.advance()
      filter = this.parseExpression()
    }

    return { collection, filter }
  }

  private parseProperty(): Property | null {
    if (!this.check('IDENTIFIER')) return null

    const name = this.advance()
    const values: (
      | string
      | number
      | boolean
      | TokenReference
      | LoopVarReference
      | Conditional
      | ComputedExpression
    )[] = []

    // Collect values, watching for ternary operator (?)
    // JavaScript ternary: condition ? thenValue : elseValue
    const collectedTokens: { type: string; value: string }[] = []

    while (
      !this.check('COMMA') &&
      !this.check('SEMICOLON') &&
      !this.check('NEWLINE') &&
      !this.check('INDENT') &&
      !this.check('DEDENT') &&
      !this.isAtEnd()
    ) {
      // Check for ternary operator
      if (this.check('QUESTION')) {
        this.advance() // consume ?

        // Everything collected so far is the condition
        // Build condition string, combining property accesses (user.name → user.name)
        let condition = ''

        // If collected tokens start with DOT, include the property name (it's actually part of the condition)
        // e.g., `Icon task.done ? "check" : "circle"` - task is parsed as property name but is really part of condition
        const startsWithDot = collectedTokens.length > 0 && collectedTokens[0].type === 'DOT'
        if (startsWithDot) {
          condition = name.value
        }

        for (let j = 0; j < collectedTokens.length; j++) {
          const t = collectedTokens[j]
          // Don't add space before DOT or after DOT
          if (t.type === 'DOT') {
            condition += '.'
          } else if (j > 0 && collectedTokens[j - 1].type !== 'DOT' && t.type !== 'DOT') {
            condition += ' ' + t.value
          } else if (condition && !condition.endsWith('.')) {
            condition += ' ' + t.value
          } else {
            condition += t.value
          }
        }

        // Parse then value
        let thenValue: string | number = ''
        if (this.check('STRING')) {
          thenValue = this.advance().value
        } else if (this.check('NUMBER')) {
          thenValue = this.advance().value
        } else if (this.check('IDENTIFIER')) {
          thenValue = this.advance().value
        }

        // Expect colon for else - collect the entire else expression including nested ternaries
        let elseValue: string | number = ''
        if (this.check('COLON')) {
          this.advance()
          // Collect the entire else part, which might be a nested ternary
          // e.g., $a === "B" ? #222 : #333
          const elseTokens: string[] = []
          while (
            !this.check('COMMA') &&
            !this.check('SEMICOLON') &&
            !this.check('NEWLINE') &&
            !this.check('INDENT') &&
            !this.check('DEDENT') &&
            !this.isAtEnd()
          ) {
            // Check for inline state syntax: "hover:" - stop collecting
            if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
              const identValue = this.current().value
              if (identValue[0] === identValue[0].toLowerCase() && !KEYBOARD_KEYS.has(identValue)) {
                break
              }
            }

            const token = this.current()
            if (token.type === 'STRING') {
              // Keep raw string value - quotes are added during IR/codegen if needed
              elseTokens.push(this.advance().value)
            } else if (token.type === 'DOT') {
              elseTokens.push(this.advance().value)
            } else if (token.type === 'QUESTION') {
              elseTokens.push(' ? ')
              this.advance()
            } else if (token.type === 'COLON') {
              elseTokens.push(' : ')
              this.advance()
            } else if (token.type === 'STRICT_EQUAL') {
              elseTokens.push(' === ')
              this.advance()
            } else if (token.type === 'STRICT_NOT_EQUAL') {
              elseTokens.push(' !== ')
              this.advance()
            } else if (token.type === 'NOT_EQUAL') {
              elseTokens.push(' != ')
              this.advance()
            } else if (
              token.type === 'GT' ||
              token.type === 'LT' ||
              token.type === 'GTE' ||
              token.type === 'LTE'
            ) {
              elseTokens.push(` ${this.advance().value} `)
            } else {
              // Add space before token if needed (except after DOT)
              if (elseTokens.length > 0 && elseTokens[elseTokens.length - 1] !== '.') {
                elseTokens.push(' ')
              }
              elseTokens.push(this.advance().value)
            }
          }
          elseValue = elseTokens.join('').trim()
        }

        values.push({
          kind: 'conditional',
          condition,
          then: thenValue,
          else: elseValue,
        })

        // If the condition started with a dot, the "property name" was actually part of the expression
        // So use 'content' as the implicit property name (like Icon "search" → content: "search")
        const propertyName = startsWithDot ? 'content' : name.value

        return {
          type: 'Property',
          name: propertyName,
          values,
          line: name.line,
          column: name.column,
        }
      }

      // Collect comparison, logical, and arithmetic operators for expressions
      // Also collect parentheses for grouping: ($a + $b) * $c
      if (
        this.check('STRICT_EQUAL') ||
        this.check('STRICT_NOT_EQUAL') ||
        this.check('NOT_EQUAL') ||
        this.check('GT') ||
        this.check('LT') ||
        this.check('GTE') ||
        this.check('LTE') ||
        this.check('AND_AND') ||
        this.check('OR_OR') ||
        this.check('BANG') ||
        this.check('DOT') ||
        this.check('PLUS') ||
        this.check('MINUS') ||
        this.check('STAR') ||
        this.check('SLASH') ||
        this.check('LPAREN') ||
        this.check('RPAREN')
      ) {
        collectedTokens.push({ type: this.current().type, value: this.advance().value })
      } else if (this.check('NUMBER')) {
        collectedTokens.push({ type: 'NUMBER', value: this.advance().value })
      } else if (this.check('STRING')) {
        // Keep raw string value - quotes are added during IR/codegen if needed
        collectedTokens.push({ type: 'STRING', value: this.advance().value })
      } else if (this.check('IDENTIFIER')) {
        const identValue = this.current().value

        // Check for inline state syntax: "hover:" - stop collecting values
        // This allows "Frame bg #333 hover: bg light" to work
        // Exception: keyboard keys like "enter:" are NOT states
        if (
          this.checkNext('COLON') &&
          identValue[0] === identValue[0].toLowerCase() &&
          !KEYBOARD_KEYS.has(identValue)
        ) {
          break
        }

        // Check if this identifier is a property starter (non-boolean property name)
        // If so, it's the start of a new property - stop collecting here
        // This allows "Box h 300 bg #333" to be parsed as two properties without commas
        //
        // Exception: directional keywords (x, y, left, right, top, bottom, etc.) after
        // spacing/border properties should be values, not new properties
        // e.g., "pad x 20" → pad: [x, 20], not pad + x: [20]
        // Uses schema-derived direction checking from parser-helpers.ts
        //
        // Exception: If the previous token was a DOT, this is a property access continuation
        // e.g., "value row.c" → row.c is a single property access, not row + color property
        // This is critical for loop variables like row.title, row.status, etc.
        const isDirectionValue =
          DIRECTIONAL_PROPERTIES.has(name.value) && isDirectionForProperty(name.value, identValue)
        const prevToken = collectedTokens[collectedTokens.length - 1]
        const isPropertyAccess = prevToken && prevToken.type === 'DOT'
        if (PROPERTY_STARTERS.has(identValue) && !isDirectionValue && !isPropertyAccess) {
          break
        }
        // Also check for LAYOUT boolean properties (hor, ver, wrap, spread, etc.)
        // These should start a new property when encountered after values
        // Position booleans (left, right, top, bottom, center) are NOT checked here
        // because they're commonly used as values for "align"
        // We only break if we've already collected at least one value
        // This allows "gap 16 hor" to separate but "align center" to stay together
        // Exception: If the previous token was a DOT, this is a property access (e.g., row.hor)
        if (LAYOUT_BOOLEANS.has(identValue) && collectedTokens.length > 0 && !isPropertyAccess) {
          break
        }

        // Check for function call syntax: rgba(...), rgb(...), hsl(...), etc.
        // Look ahead to see if next token is LPAREN
        const funcIdent = this.advance()
        if (this.check('LPAREN')) {
          let funcValue = funcIdent.value + this.advance().value // identifier + (
          let parenDepth = 1
          let parenIterations = 0
          // Consume everything until matching RPAREN
          // Use MAX_LOOKAHEAD to prevent DoS on malformed input with unmatched parens
          while (parenDepth > 0 && !this.isAtEnd() && parenIterations++ < Parser.MAX_LOOKAHEAD) {
            if (this.check('LPAREN')) {
              parenDepth++
            } else if (this.check('RPAREN')) {
              parenDepth--
            }
            const token = this.advance()
            // Add space only before numbers/identifiers if previous wasn't punctuation
            if (funcValue.endsWith(',')) {
              funcValue += token.value
            } else {
              funcValue += token.value
            }
          }
          collectedTokens.push({ type: 'IDENTIFIER', value: funcValue })
        } else {
          collectedTokens.push({ type: 'IDENTIFIER', value: funcIdent.value })
        }
      } else {
        break
      }
    }

    // No ternary found - convert collected tokens to values
    // Check if we have arithmetic operators - if so, build a ComputedExpression
    const hasArithmeticOperators = collectedTokens.some(
      t => t.type === 'PLUS' || t.type === 'MINUS' || t.type === 'STAR' || t.type === 'SLASH'
    )

    if (hasArithmeticOperators) {
      // Build a ComputedExpression
      const parts: ComputedExpression['parts'] = []
      const operators: string[] = []

      let i = 0
      while (i < collectedTokens.length) {
        const token = collectedTokens[i]

        if (
          token.type === 'PLUS' ||
          token.type === 'MINUS' ||
          token.type === 'STAR' ||
          token.type === 'SLASH'
        ) {
          operators.push(token.value)
        } else if (token.type === 'LPAREN' || token.type === 'RPAREN') {
          // Track parentheses in parts as special strings
          parts.push(token.value)
        } else if (token.type === 'IDENTIFIER') {
          // Check for property access chain: identifier.identifier.identifier...
          let combined = token.value
          while (
            i + 2 < collectedTokens.length &&
            collectedTokens[i + 1].type === 'DOT' &&
            collectedTokens[i + 2].type === 'IDENTIFIER'
          ) {
            combined += '.' + collectedTokens[i + 2].value
            i += 2
          }
          // If starts with $, it's a token reference
          if (combined.startsWith('$')) {
            parts.push({ kind: 'token' as const, name: combined.slice(1) })
          } else {
            // Check if this is a loop variable reference (e.g., row.title, item.name)
            const firstPart = combined.split('.')[0]
            if (this.loopVariables.has(firstPart)) {
              parts.push({ kind: 'loopVar' as const, name: combined })
            } else {
              parts.push(combined)
            }
          }
        } else if (token.type === 'STRING') {
          parts.push(token.value.replace(/^"|"$/g, ''))
        } else if (token.type === 'NUMBER') {
          parts.push(parseFloat(token.value))
        }
        i++
      }

      const expr: ComputedExpression = {
        kind: 'expression',
        parts,
        operators,
      }
      values.push(expr)
    } else {
      // No arithmetic - simple values
      // Combine property accesses like user.name into single values
      let i = 0
      while (i < collectedTokens.length) {
        const token = collectedTokens[i]

        if (token.type === 'IDENTIFIER') {
          // Check for property access chain: identifier.identifier.identifier...
          let combined = token.value
          while (
            i + 2 < collectedTokens.length &&
            collectedTokens[i + 1].type === 'DOT' &&
            collectedTokens[i + 2].type === 'IDENTIFIER'
          ) {
            combined += '.' + collectedTokens[i + 2].value
            i += 2
          }
          // If starts with $, it's a token reference
          if (combined.startsWith('$')) {
            values.push({ kind: 'token' as const, name: combined.slice(1) })
          } else {
            // Check if this is a loop variable reference (e.g., row.title, item.name)
            const firstPart = combined.split('.')[0]
            if (this.loopVariables.has(firstPart)) {
              values.push({ kind: 'loopVar' as const, name: combined })
            } else {
              values.push(combined)
            }
          }
        } else if (token.type === 'STRING') {
          // Remove quotes we added for condition building
          values.push(token.value.replace(/^"|"$/g, ''))
        } else if (token.type !== 'DOT') {
          // Push non-DOT tokens (DOTs are handled in the chain above)
          values.push(token.value)
        }
        i++
      }
    }

    return {
      type: 'Property',
      name: name.value,
      values,
      line: name.line,
      column: name.column,
    }
  }

  /**
   * Check if an identifier followed by ( could be an implicit onclick action.
   * Returns true for action names and custom function names.
   * Returns false for property starters, boolean properties, states, keys, and events.
   */
  private isImplicitOnclickCandidate(name: string): boolean {
    // Known actions are always candidates
    if (ACTION_NAMES.has(name)) return true
    // Exclude known property starters
    if (PROPERTY_STARTERS.has(name)) return false
    // Exclude boolean properties
    if (ALL_BOOLEAN_PROPERTIES.has(name)) return false
    // Exclude state names
    if (STATE_NAMES.has(name)) return false
    // Exclude keyboard keys
    if (KEYBOARD_KEYS.has(name)) return false
    // Exclude event names
    if (EVENT_NAMES.has(name)) return false
    // Custom function names are allowed
    return true
  }

  /**
   * Parse implicit onclick syntax: toggle(), show(Menu), etc.
   * Multiple actions can be chained: toggle(), show(Panel)
   */
  private parseImplicitOnclick(): Event | null {
    const startToken = this.current()
    const actions: Action[] = []

    // Parse first action
    const firstAction = this.parseAction()
    if (!firstAction) return null
    actions.push(firstAction)

    // Parse additional actions separated by commas: toggle(), show(Panel)
    while (this.check('COMMA')) {
      // Look ahead to see if next is a function call
      const nextToken = this.peekAt(1)
      const afterThat = this.peekAt(2)

      if (!nextToken || nextToken.type !== 'IDENTIFIER') break
      if (!afterThat || afterThat.type !== 'LPAREN') break

      const nextIdent = nextToken.value
      if (!this.isImplicitOnclickCandidate(nextIdent)) break

      this.advance() // consume comma
      const nextAction = this.parseAction()
      if (nextAction) {
        actions.push(nextAction)
      } else {
        break
      }
    }

    return {
      type: 'Event',
      name: 'onclick',
      actions,
      line: startToken.line,
      column: startToken.column,
    }
  }

  private parseEvent(): Event | null {
    const eventToken = this.advance()
    let eventName = eventToken.value
    let eventKey: string | undefined = undefined

    // Expand keyboard shorthands: onkeyenter → onkeydown + key: 'enter'
    const eventDef = getEvent(eventName)
    if (eventDef?.key) {
      eventKey = eventDef.key
      eventName = 'on' + eventDef.dom // e.g., 'onkeydown'
    }

    const event: Event = {
      type: 'Event',
      name: eventName,
      key: eventKey,
      actions: [],
      line: eventToken.line,
      column: eventToken.column,
    }

    // Handle onclick: syntax (colon directly after event name)
    if (this.check('COLON')) {
      this.advance() // consume the colon
    }

    // Check for key modifier: onkeydown escape:
    if (this.check('IDENTIFIER')) {
      const next = this.current()
      if (this.checkNext('COLON')) {
        event.key = next.value
        this.advance() // key
        this.advance() // :
      }
    }

    // Check for timing modifiers
    if (this.check('IDENTIFIER')) {
      const mod = this.current().value
      if (mod === 'debounce' || mod === 'delay') {
        this.advance()
        const time = this.advance()
        event.modifiers = [{ type: mod, value: parseInt(time.value) }]

        if (this.check('COLON')) {
          this.advance()
        }
      }
    }

    // Parse inline actions
    while (
      !this.check('NEWLINE') &&
      !this.check('COMMA') &&
      !this.check('SEMICOLON') &&
      !this.isAtEnd()
    ) {
      if (this.check('IDENTIFIER')) {
        const action = this.parseAction()
        if (action) event.actions.push(action)
      } else {
        break
      }
    }

    // Parse block actions (multi-line)
    // onclick:
    //   Menu open
    //   Backdrop visible
    //
    // IMPORTANT: Only skip newlines if followed by INDENT (block actions).
    // If followed by same-level content (another sibling), we must NOT consume
    // the NEWLINE, as it's the separator between siblings.
    //
    // Example that should NOT consume NEWLINE:
    //   Button "A", onenter toggle()
    //   Button "B", onescape toggle()   ← NEWLINE before this is a sibling separator
    if (this.check('NEWLINE') && this.peekAt(1)?.type === 'INDENT') {
      this.skipNewlines()
    }
    if (this.check('INDENT')) {
      // Don't consume INDENT if it's followed by a state block pattern (e.g., "on:", "hover:")
      // This happens when an inline event like "onenter toggle()" is followed by a state block
      // Example:
      //   Button "A", onenter toggle()
      //     on:          ← This is a state block, not event actions
      //       bg red
      // Token sequence: INDENT NEWLINE IDENTIFIER COLON
      // We need to skip NEWLINE when checking
      let offset = 1
      while (this.peekAt(offset)?.type === 'NEWLINE') {
        offset++
      }
      const afterIndent = this.peekAt(offset) // first non-NEWLINE after INDENT
      const afterIndent2 = this.peekAt(offset + 1) // token after that
      if (afterIndent?.type === 'IDENTIFIER' && afterIndent2?.type === 'COLON') {
        const name = afterIndent.value
        // State names are lowercase and not event names
        if (name[0] === name[0].toLowerCase() && !EVENT_NAMES.has(name)) {
          // This is a state block - don't consume the INDENT, let parseInstanceBody handle it
          return event
        }
      }

      this.advance() // consume INDENT
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        this.skipNewlines()
        if (this.check('DEDENT')) break

        // Parse Element state on each line
        if (this.check('IDENTIFIER')) {
          const action = this.parseAction()
          if (action) event.actions.push(action)
        } else {
          // Skip any other tokens to prevent infinite loops
          this.advance()
        }

        this.skipNewlines()
      }
      if (this.check('DEDENT')) {
        this.advance() // consume DEDENT
      }
    }

    return event
  }

  private parseAction(): Action | null {
    const actionToken = this.advance()

    const action: Action = {
      type: 'Action',
      name: actionToken.value,
      line: actionToken.line,
      column: actionToken.column,
    }

    // Function call syntax required: actionName(arg1, arg2, ...)
    // Examples: toggle(), cycle(a, b, c), show(Menu), animate(FadeIn)
    if (this.check('LPAREN')) {
      this.advance() // consume '('
      action.args = []
      action.isFunctionCall = true

      while (!this.check('RPAREN') && !this.isAtEnd()) {
        // Parse argument (identifier, string, or number)
        if (this.check('IDENTIFIER')) {
          action.args.push(this.advance().value)
        } else if (this.check('STRING')) {
          action.args.push(this.advance().value)
        } else if (this.check('NUMBER')) {
          action.args.push(this.advance().value)
        }

        // Comma between args
        if (this.check('COMMA')) {
          this.advance()
        } else if (!this.check('RPAREN')) {
          break
        }
      }

      if (this.check('RPAREN')) {
        this.advance() // consume ')'
      }

      return action
    }

    // Multi-element trigger: ElementName state (e.g., Menu open, Backdrop visible)
    // This is NOT a function call - it sets state on another element
    if (this.check('IDENTIFIER') && !this.checkNext('COLON')) {
      action.target = this.advance().value
    }

    return action
  }

  private parseKeysBlock(events: Event[]): void {
    this.advance() // keys

    // Skip to next line if no immediate INDENT
    this.skipNewlines()

    if (!this.check('INDENT')) return
    this.advance()

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT')) break

      // key action
      if (this.check('IDENTIFIER')) {
        const key = this.advance()
        const actions: Action[] = []

        // Skip optional colon after key
        if (this.check('COLON')) {
          this.advance()
        }

        while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.isAtEnd()) {
          if (this.check('IDENTIFIER')) {
            const action = this.parseAction()
            if (action) actions.push(action)
          } else if (this.check('COMMA')) {
            this.advance()
          } else {
            break
          }
        }

        events.push({
          type: 'Event',
          name: 'onkeydown',
          key: key.value,
          actions,
          line: key.line,
          column: key.column,
        })
      } else {
        this.advance()
      }
    }

    if (this.check('DEDENT')) this.advance()
  }

  // ============================================================================
  // EACH LOOP PARSING
  // ============================================================================

  private parseEach(): Each | null {
    const eachToken = this.advance() // each

    // Get item variable name
    if (!this.check('IDENTIFIER')) return null
    const item = this.advance().value

    // Check for optional index variable with comma syntax: each item, index in collection
    let index: string | undefined
    if (this.check('COMMA')) {
      this.advance() // consume comma
      if (this.check('IDENTIFIER')) {
        index = this.advance().value
      }
    }

    // Expect 'in'
    if (!this.check('IN')) return null
    this.advance()

    // Get collection: either identifier or inline array literal
    let collection: string
    if (this.check('LBRACKET')) {
      // Parse inline array literal: ["Apple", "Banana", "Cherry"]
      collection = this.parseArrayLiteral()
    } else if (this.check('IDENTIFIER')) {
      collection = this.advance().value
      // Handle property access for nested loop collections: category.items
      while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
        this.advance() // .
        collection += '.' + this.advance().value
      }
    } else {
      return null
    }

    // Also support legacy syntax: each item in collection with index
    if (!index && this.check('WITH')) {
      this.advance() // consume 'with'
      if (this.check('IDENTIFIER')) {
        index = this.advance().value
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
    if (this.check('WHERE')) {
      this.advance()
      each.filter = this.parseExpression()
    }

    // Optional ordering: by field asc/desc
    if (this.check('BY')) {
      this.advance()
      if (this.check('IDENTIFIER')) {
        each.orderBy = this.advance().value
        // Check for ascending/descending
        if (this.check('DESC')) {
          this.advance()
          each.orderDesc = true
        } else if (this.check('ASC')) {
          this.advance()
          each.orderDesc = false
        }
      }
    }

    // Parse indented children
    // Add loop variables to context so they can be recognized as content
    this.loopVariables.add(item)
    if (index) this.loopVariables.add(index)

    try {
      this.skipNewlines()
      if (this.check('INDENT')) {
        this.advance()
        while (!this.check('DEDENT') && !this.isAtEnd()) {
          this.skipNewlines()
          if (this.check('DEDENT')) break

          if (this.check('IDENTIFIER')) {
            const child = this.parseInstance(this.advance())
            if (child.type !== 'ZagComponent') {
              each.children.push(child as Instance | Slot)
            }
          } else if (this.check('EACH')) {
            const nestedEach = this.parseEach()
            if (nestedEach) each.children.push(nestedEach)
          } else if (this.check('IF')) {
            const conditional = this.parseConditionalBlock()
            if (conditional) each.children.push(conditional)
          } else {
            this.advance()
          }
        }
        if (this.check('DEDENT')) this.advance()
      }
    } finally {
      // Always remove loop variables from context, even on exception
      this.loopVariables.delete(item)
      if (index) this.loopVariables.delete(index)
    }

    return each
  }

  /**
   * Parse an inline array literal: ["Apple", "Banana", "Cherry"]
   * Also supports objects: [{ name: "Alice", age: 30 }, { name: "Bob" }]
   * Returns the array as a JavaScript string representation.
   */
  private parseArrayLiteral(): string {
    if (!this.check('LBRACKET')) return '[]'
    this.advance() // consume [

    const elements: string[] = []

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      this.skipNewlines()
      if (this.check('RBRACKET')) break

      if (this.check('LBRACE')) {
        // Parse object literal: { name: "Alice", age: 30 }
        elements.push(this.parseObjectLiteral())
      } else if (this.check('STRING')) {
        const str = this.advance().value
        elements.push(`"${str}"`)
      } else if (this.check('NUMBER')) {
        elements.push(this.advance().value)
      } else if (this.check('IDENTIFIER')) {
        const value = this.advance().value
        // Handle boolean literals
        if (value === 'true' || value === 'false' || value === 'null') {
          elements.push(value)
        } else {
          elements.push(`"${value}"`)
        }
      } else {
        this.advance() // skip unknown
      }

      // Skip comma between elements
      if (this.check('COMMA')) {
        this.advance()
      }
    }

    if (this.check('RBRACKET')) this.advance() // consume ]
    return `[${elements.join(', ')}]`
  }

  /**
   * Parse an inline object literal: { name: "Alice", age: 30 }
   * Returns the object as a JavaScript string representation.
   */
  private parseObjectLiteral(): string {
    if (!this.check('LBRACE')) return '{}'
    this.advance() // consume {

    const props: string[] = []

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines()
      if (this.check('RBRACE')) break

      // Parse property name
      if (!this.check('IDENTIFIER')) {
        this.advance()
        continue
      }
      const key = this.advance().value

      // Expect colon
      if (this.check('COLON')) {
        this.advance()
      }

      // Parse property value
      let value: string
      if (this.check('STRING')) {
        value = `"${this.advance().value}"`
      } else if (this.check('NUMBER')) {
        value = this.advance().value
      } else if (this.check('IDENTIFIER')) {
        const v = this.advance().value
        if (v === 'true' || v === 'false' || v === 'null') {
          value = v
        } else {
          value = `"${v}"`
        }
      } else if (this.check('LBRACKET')) {
        value = this.parseArrayLiteral()
      } else if (this.check('LBRACE')) {
        value = this.parseObjectLiteral()
      } else {
        value = 'null'
        this.advance()
      }

      props.push(`${key}: ${value}`)

      // Skip comma between properties
      if (this.check('COMMA')) {
        this.advance()
      }
    }

    if (this.check('RBRACE')) this.advance() // consume }
    return `{ ${props.join(', ')} }`
  }

  // ============================================================================
  // CONDITIONAL PARSING
  // ============================================================================

  private parseConditionalBlock(): ConditionalNode {
    const ifToken = this.advance() // if

    // Parse condition
    const condition = this.parseExpression()

    const conditional: ConditionalNode = {
      type: 'Conditional',
      condition,
      then: [],
      else: [],
      line: ifToken.line,
      column: ifToken.column,
    }

    // Parse 'then' block
    this.skipNewlines()
    if (this.check('INDENT')) {
      this.advance()
      while (!this.check('DEDENT') && !this.check('ELSE') && !this.isAtEnd()) {
        this.skipNewlines()
        if (this.check('DEDENT') || this.check('ELSE')) break

        if (this.check('IDENTIFIER')) {
          const child = this.parseInstance(this.advance())
          if (child.type !== 'ZagComponent') {
            conditional.then.push(child as Instance | Slot)
          }
        } else if (this.check('EACH')) {
          const each = this.parseEach()
          if (each) conditional.then.push(each)
        } else if (this.check('IF')) {
          const nested = this.parseConditionalBlock()
          if (nested) conditional.then.push(nested)
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) this.advance()
    }

    // Parse optional 'else' block
    this.skipNewlines()
    if (this.check('ELSE')) {
      this.advance()
      this.skipNewlines()
      if (this.check('INDENT')) {
        this.advance()
        while (!this.check('DEDENT') && !this.isAtEnd()) {
          this.skipNewlines()
          if (this.check('DEDENT')) break

          if (this.check('IDENTIFIER')) {
            const child = this.parseInstance(this.advance())
            if (child.type !== 'ZagComponent') {
              conditional.else.push(child as Instance | Slot)
            }
          } else if (this.check('EACH')) {
            const each = this.parseEach()
            if (each) conditional.else.push(each)
          } else if (this.check('IF')) {
            const nested = this.parseConditionalBlock()
            if (nested) conditional.else.push(nested)
          } else {
            this.advance()
          }
        }
        if (this.check('DEDENT')) this.advance()
      }
    }

    return conditional
  }

  /**
   * Collect the next operand in an expression, handling parenthesized sub-expressions.
   * For example: "Summe: €" + ($count * $price)
   * When called after the +, this collects everything inside the parentheses as a single sub-expression.
   *
   * Returns the operand and any additional operators/parts found (for nested expressions).
   */
  private collectExpressionOperand(parts: ComputedExpression['parts'], operators: string[]): void {
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
      while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
        this.advance() // .
        combined += '.' + this.advance().value
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
  private collectSubExpression(parts: ComputedExpression['parts'], operators: string[]): void {
    // Get first operand
    if (this.check('STRING')) {
      parts.push(this.advance().value)
    } else if (this.check('NUMBER')) {
      parts.push(parseFloat(this.advance().value))
    } else if (this.check('IDENTIFIER')) {
      let combined = this.advance().value
      while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
        this.advance()
        combined += '.' + this.advance().value
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
        while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
          this.advance()
          combined += '.' + this.advance().value
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

  private parseExpression(): Expression {
    // Capture everything until NEWLINE, INDENT, or DEDENT as raw JavaScript expression
    let expr = ''
    let parenDepth = 0

    for (let iter = 0; !this.isAtEnd() && iter < Parser.MAX_ITERATIONS; iter++) {
      // Track parentheses depth
      if (this.check('LPAREN')) {
        parenDepth++
        // Add space before ( if needed (but not after . or !)
        if (expr && !expr.endsWith('(') && !expr.endsWith('.') && !expr.endsWith(' ')) {
          expr += ' '
        }
        expr += '('
        this.advance()
        continue
      }
      if (this.check('RPAREN')) {
        if (parenDepth > 0) {
          parenDepth--
          expr += ')'
          this.advance()
          continue
        }
        // Unmatched ) - stop
        break
      }

      // Stop at newline/indent when not inside parentheses
      if (
        parenDepth === 0 &&
        (this.check('NEWLINE') || this.check('INDENT') || this.check('DEDENT'))
      ) {
        break
      }

      // Stop at THEN for inline conditionals
      if (this.check('THEN')) {
        break
      }

      // Stop at BY for each loop ordering (each item in $items where x == y by field)
      if (this.check('BY')) {
        break
      }

      // Append token value with appropriate spacing
      const token = this.advance()

      // No space before/after DOT
      if (token.type === 'DOT') {
        expr += '.'
        continue
      }

      // BANG (!) - add space before if needed, no space after
      if (token.type === 'BANG') {
        if (expr && !expr.endsWith('(') && !expr.endsWith(' ')) {
          expr += ' '
        }
        expr += '!'
        continue
      }

      if (token.type === 'STRING') {
        if (expr && !expr.endsWith('(') && !expr.endsWith('!') && !expr.endsWith('.')) {
          expr += ' '
        }
        expr += `"${token.value}"`
      } else {
        // Add space before token if needed
        if (
          expr &&
          !expr.endsWith('(') &&
          !expr.endsWith('!') &&
          !expr.endsWith('.') &&
          !expr.endsWith(' ')
        ) {
          expr += ' '
        }
        expr += token.value
      }
    }

    return expr.trim()
  }

  // ============================================================================
  // DATA BINDING PARSING
  // ============================================================================

  private parseDataBinding(): { collection: string; filter?: Expression } | null {
    this.advance() // data

    if (!this.check('IDENTIFIER')) return null
    const collection = this.advance().value

    let filter: Expression | undefined
    if (this.check('WHERE')) {
      this.advance()
      filter = this.parseExpression()
    }

    return { collection, filter }
  }

  // Helpers

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance()
    }
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.current().type === type
  }

  private checkNext(type: TokenType): boolean {
    if (this.pos + 1 >= this.tokens.length) return false
    return this.tokens[this.pos + 1].type === type
  }

  /**
   * Parse a 'when' clause for state dependencies
   * Pattern: Element state [and/or Element state]*
   * Example: Menu open
   * Example: Menu open or Sidebar open
   * Example: Form valid and User loggedIn
   */
  private parseWhenClause(): StateDependency {
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
  private isStateBlockStart(): boolean {
    let offset = 1

    // Check for modifier (exclusive, toggle, initial)
    const token1 = this.peekAt(offset)
    // IMPORTANT: If the current identifier is an event name (onclick, onhover, etc.)
    // and followed by COLON, this is an EVENT not a state block
    // Events are parsed separately via parseEvent()
    const currentName = this.current()?.value || ''
    if (token1?.type === 'COLON') {
      // Event names should NOT be treated as state blocks
      if (EVENT_NAMES.has(currentName)) return false
      // Slot definitions start with uppercase (Placeholder:, Value:, Header:)
      // State names start with lowercase (selected:, hover:, open:)
      const isLikelyState = currentName[0] === currentName[0].toLowerCase()
      if (!isLikelyState) return false
      return true
    }

    // Check for duration directly after state name (no trigger required)
    // Enables: hover 0.2s: or hover 0.3s ease-out:
    if (token1?.type === 'NUMBER') {
      const val = token1.value
      if (val.endsWith('s') || val.endsWith('ms')) {
        let durationOffset = 2
        // Check for optional easing after duration
        const easingToken = this.peekAt(durationOffset)
        if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
          durationOffset++
        }
        const colonToken = this.peekAt(durationOffset)
        if (colonToken?.type === 'COLON') {
          // Verify this is a valid state name (lowercase, not an event)
          const isLikelyState =
            currentName[0] === currentName[0].toLowerCase() && !EVENT_NAMES.has(currentName)
          return isLikelyState
        }
      }
    }

    // Check for external state reference: ElementName.state:
    // Pattern: IDENTIFIER DOT IDENTIFIER COLON (e.g., MenuBtn.open:)
    if (token1?.type === 'DOT') {
      const token2 = this.peekAt(2)
      const token3 = this.peekAt(3)
      if (token2?.type === 'IDENTIFIER' && token3?.type === 'COLON') {
        return true
      }
    }

    if (token1?.type === 'IDENTIFIER' && STATE_MODIFIERS.has(token1.value)) {
      offset++
    }

    // Check for 'when' keyword (dependency pattern)
    const tokenWhen = this.peekAt(offset)
    if (tokenWhen?.type === 'IDENTIFIER' && tokenWhen.value === 'when') {
      // Skip through the when clause to find the colon
      // Pattern: when Element state [and/or Element state]* :
      offset++ // skip 'when'

      // Must have at least one Element + state pair
      const targetToken = this.peekAt(offset)
      if (targetToken?.type !== 'IDENTIFIER') return false
      offset++ // skip Element name

      const stateToken = this.peekAt(offset)
      if (stateToken?.type !== 'IDENTIFIER') return false
      offset++ // skip state name

      // Check for additional conditions (and/or)
      // Use MAX_CONDITION_DEPTH to prevent infinite loops on malformed input
      let conditionDepth = 0
      while (conditionDepth++ < Parser.MAX_CONDITION_DEPTH) {
        const condToken = this.peekAt(offset)
        if (condToken?.type === 'COLON') return true
        // Note: 'and'/'or' are tokenized as AND/OR types, not IDENTIFIER
        if (condToken?.type === 'AND' || condToken?.type === 'OR') {
          offset++ // skip and/or
          offset++ // skip Element name
          offset++ // skip state name
        } else {
          break
        }
      }

      // Check for animation duration after when clause
      // Syntax: visible when Menu open 0.3s:
      const tokenAfterWhen = this.peekAt(offset)
      if (tokenAfterWhen?.type === 'NUMBER') {
        const val = tokenAfterWhen.value
        if (val.endsWith('s') || val.endsWith('ms')) {
          offset++
          // Check for easing
          const easingToken = this.peekAt(offset)
          if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
            offset++
          }
        }
      }

      const finalToken = this.peekAt(offset)
      return finalToken?.type === 'COLON'
    }

    // Check for event name (onclick, onhover, onkeydown, etc.)
    const token2 = this.peekAt(offset)
    if (token2?.type === 'COLON') return true
    if (token2?.type === 'IDENTIFIER' && EVENT_NAMES.has(token2.value)) {
      offset++
      // Check for keyboard key (for onkeydown, onkeyup)
      if (token2.value === 'onkeydown' || token2.value === 'onkeyup') {
        const token3 = this.peekAt(offset)
        if (token3?.type === 'IDENTIFIER' && KEYBOARD_KEYS.has(token3.value)) {
          offset++
        }
      }
    }

    // Check for animation config (duration and/or easing) after trigger
    // Syntax: selected onclick 0.2s ease-out:
    const tokenAfterTrigger = this.peekAt(offset)
    if (tokenAfterTrigger?.type === 'NUMBER') {
      // Duration token (e.g., 0.2s, 200ms)
      const val = tokenAfterTrigger.value
      if (val.endsWith('s') || val.endsWith('ms')) {
        offset++
        // Check for easing after duration
        const easingToken = this.peekAt(offset)
        if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
          offset++
        }
      }
    }

    // Final check: must end with COLON
    const finalToken = this.peekAt(offset)
    return finalToken?.type === 'COLON'
  }

  private checkAt(offset: number, type: TokenType): boolean {
    if (this.pos + offset >= this.tokens.length) return false
    return this.tokens[this.pos + offset].type === type
  }

  private peekAt(offset: number): Token | null {
    if (this.pos + offset >= this.tokens.length) return null
    return this.tokens[this.pos + offset]
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++
    return this.tokens[this.pos - 1]
  }

  private previous(): Token | null {
    if (this.pos === 0) return null
    return this.tokens[this.pos - 1]
  }

  private expect(type: TokenType): Token | null {
    if (this.check(type)) return this.advance()
    this.addError(`Expected ${type} but got ${this.current()?.type}`)
    return null
  }

  private addError(message: string, hint?: string): void {
    const token = this.current()
    this.errors.push({
      message,
      line: token?.line ?? 0,
      column: token?.column ?? 0,
      hint,
    })
  }

  private recoverToNextDefinition(): void {
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

  private isAtEnd(): boolean {
    return this.current()?.type === 'EOF'
  }

  /**
   * Check if a string starts with an uppercase letter (component name convention)
   */
  private isUppercase(str: string): boolean {
    if (!str || str.length === 0) return false
    const firstChar = str.charAt(0)
    return firstChar >= 'A' && firstChar <= 'Z'
  }

  /**
   * Parse a child override within a state block
   * Syntax: ChildName: property value (note the colon)
   */
  private parseStateChildOverride(): import('./ast').ChildOverride | null {
    if (!this.check('IDENTIFIER')) return null

    const childName = this.advance()

    // Consume the colon if present (new syntax: "Icon: ic white")
    if (this.check('COLON')) {
      this.advance()
    }

    const properties: Property[] = []

    // Parse properties for this child override (on the same line)
    this.parseInlineProperties(properties)

    return {
      childName: childName.value,
      properties,
    }
  }

  /**
   * Parse a child instance within a state block
   * This allows states to have completely different children (like Figma Variants)
   * Syntax: ComponentName "content", property value
   */
  private parseStateChildInstance(): Instance | null {
    if (!this.check('IDENTIFIER')) return null

    const componentToken = this.advance()

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
    while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // String content
      if (this.check('STRING')) {
        const str = this.advance()
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
      if (this.check('IDENTIFIER')) {
        const prop = this.parseProperty()
        if (prop) instance.properties.push(prop)
        continue
      }

      // Numbers (standalone values)
      if (this.check('NUMBER')) {
        this.advance()
        continue
      }

      break
    }

    // Check for nested children (indented block)
    this.skipNewlines()
    if (this.check('INDENT')) {
      this.advance()
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        this.skipNewlines()
        if (this.check('DEDENT')) break

        // String as Text child
        if (this.check('STRING')) {
          const str = this.advance()
          const textChild: Instance = {
            type: 'Instance',
            component: 'Text',
            name: null,
            properties: [
              {
                type: 'Property',
                name: 'content',
                values: [str.value],
                line: str.line,
                column: str.column,
              },
            ],
            children: [],
            states: [],
            events: [],
            line: str.line,
            column: str.column,
          }
          instance.children.push(textChild)
          continue
        }

        // Nested component
        if (this.check('IDENTIFIER') && this.isUppercase(this.current().value)) {
          const child = this.parseStateChildInstance()
          if (child) instance.children.push(child)
          continue
        }

        // Properties (lowercase)
        if (this.check('IDENTIFIER')) {
          const prop = this.parseProperty()
          if (prop) instance.properties.push(prop)
          continue
        }

        this.advance()
      }
      if (this.check('DEDENT')) this.advance()
    }

    return instance
  }
}

export function parse(source: string): AST {
  const tokens = tokenize(source)
  return new Parser(tokens, source).parse()
}
