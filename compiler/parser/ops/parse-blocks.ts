/**
 * Parser ops — parse-blocks
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

export function parseComponentOrInstance(
  this: Parser
): ComponentDefinition | Instance | Slot | AnimationDefinition | ZagNode | null {
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

export function parseComponentDefinition(this: Parser, name: Token): ComponentDefinition | null {
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

export function parseComponentInheritance(this: Parser, name: Token): ComponentDefinition | null {
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

export function parseComponentDefinitionWithDefaultPrimitive(
  this: Parser,
  name: Token
): ComponentDefinition | null {
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

export function parseInstance(this: Parser, name: Token): Instance | Slot | ZagNode {
  // Special handling for Slot primitive (case-insensitive, using schema)
  // Syntax: Slot "Name", w full, h 100
  // The first string is the slot name, NOT text content
  if (isPrimitive(name.value) && name.value.toLowerCase() === 'slot') {
    return this.parseSlotPrimitive(name)
  }

  // Check if this is a Zag primitive (e.g., Select, Accordion)
  if (isZagPrimitive(name.value)) {
    return this.parseZagComponentWithContext(name)
  }

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
export function parseSlotPrimitive(this: Parser, slotToken: Token): Slot {
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
 * Look ahead to check if the current line contains inline child syntax (semicolons)
 * Inline child syntax: Frame bg #333; Text "Hello"; Button "OK"
 * Property syntax: Frame bg #f00; w 100 (NOT inline child)
 * Difference: Inline children have PascalCase names after semicolon
 */
export function hasInlineChildSyntax(this: Parser): boolean {
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
export function hasColonOnLine(this: Parser): boolean {
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
export function parseInlineChildrenAfterSemicolon(this: Parser, parent: Instance): void {
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
export function parseInlineChild(this: Parser, parent: Instance): void {
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

export function parseComponentBody(this: Parser, component: ComponentDefinition): void {
  const ctx: ParserContext = {
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  }

  const callbacks: ComponentBodyCallbacks = {
    parseExpression: () => {
      this.pos = ctx.pos
      const result = this.parseExpression()
      ctx.pos = this.pos
      return result
    },
    parseInstance: token => {
      this.pos = ctx.pos
      const result = this.parseInstance(token)
      ctx.pos = this.pos
      return result
    },
    parseInstanceBody: instance => {
      this.pos = ctx.pos
      this.parseInstanceBody(instance)
      ctx.pos = this.pos
    },
    parseSelectionVar: () => {
      this.pos = ctx.pos
      const result = this.parseSelectionVar()
      ctx.pos = this.pos
      return result
    },
    parseBindPath: () => {
      this.pos = ctx.pos
      const result = this.parseBindPath()
      ctx.pos = this.pos
      return result
    },
    parseRouteClause: () => {
      this.pos = ctx.pos
      const result = this.parseRouteClause()
      ctx.pos = this.pos
      return result
    },
    parseEvent: () => {
      this.pos = ctx.pos
      const result = this.parseEvent()
      ctx.pos = this.pos
      return result
    },
    parseProperty: () => {
      this.pos = ctx.pos
      const result = this.parseProperty()
      ctx.pos = this.pos
      return result
    },
    parseInlineProperties: (properties, events, options) => {
      this.pos = ctx.pos
      this.parseInlineProperties(properties, events, options)
      ctx.pos = this.pos
    },
    parseStateChildOverride: () => {
      this.pos = ctx.pos
      const result = this.parseStateChildOverride()
      ctx.pos = this.pos
      return result
    },
    parseStateChildInstance: () => {
      this.pos = ctx.pos
      const result = this.parseStateChildInstance()
      ctx.pos = this.pos
      return result
    },
    parseDataBindingValues: () => {
      this.pos = ctx.pos
      const result = this.parseDataBindingValues()
      ctx.pos = this.pos
      return result
    },
    parseKeysBlock: events => {
      this.pos = ctx.pos
      this.parseKeysBlock(events)
      ctx.pos = this.pos
    },
    parseComponentDefinition: name => {
      this.pos = ctx.pos
      const result = this.parseComponentDefinition(name)
      ctx.pos = this.pos
      return result
    },
    parseImplicitOnclick: () => {
      this.pos = ctx.pos
      const result = this.parseImplicitOnclick()
      ctx.pos = this.pos
      return result
    },
    isImplicitOnclickCandidate: name => this.isImplicitOnclickCandidate(name),
    createTextChild: token => this.createTextChild(token),
    peekAt: offset => {
      this.pos = ctx.pos
      const result = this.peekAt(offset)
      ctx.pos = this.pos
      return result
    },
  }

  parseComponentBodyExtracted(ctx, component, callbacks)
  this.pos = ctx.pos
  this.errors = ctx.errors
}

export function parseInstanceBody(this: Parser, instance: Instance): void {
  const ctx: ParserContext = {
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  }

  const callbacks: InstanceBodyCallbacks = {
    parseExpression: () => {
      this.pos = ctx.pos
      const result = this.parseExpression()
      ctx.pos = this.pos
      return result
    },
    parseInstance: token => {
      this.pos = ctx.pos
      const result = this.parseInstance(token)
      ctx.pos = this.pos
      return result
    },
    parseEach: () => {
      this.pos = ctx.pos
      const result = this.parseEach()
      ctx.pos = this.pos
      return result
    },
    parseSelectionVar: () => {
      this.pos = ctx.pos
      const result = this.parseSelectionVar()
      ctx.pos = this.pos
      return result
    },
    parseBindPath: () => {
      this.pos = ctx.pos
      const result = this.parseBindPath()
      ctx.pos = this.pos
      return result
    },
    parseRouteClause: () => {
      this.pos = ctx.pos
      const result = this.parseRouteClause()
      ctx.pos = this.pos
      return result
    },
    parseEvent: () => {
      this.pos = ctx.pos
      const result = this.parseEvent()
      ctx.pos = this.pos
      return result
    },
    parseInlineProperties: (properties, events, options) => {
      this.pos = ctx.pos
      this.parseInlineProperties(properties, events, options)
      ctx.pos = this.pos
    },
    parseWhenClause: () => {
      this.pos = ctx.pos
      const result = this.parseWhenClause()
      ctx.pos = this.pos
      return result
    },
    parseStateChildOverride: () => {
      this.pos = ctx.pos
      const result = this.parseStateChildOverride()
      ctx.pos = this.pos
      return result
    },
    parseStateChildInstance: () => {
      this.pos = ctx.pos
      const result = this.parseStateChildInstance()
      ctx.pos = this.pos
      return result
    },
    parseChartSlot: token => {
      this.pos = ctx.pos
      const result = this.parseChartSlot(token)
      ctx.pos = this.pos
      return result
    },
    createTextChild: token => this.createTextChild(token),
  }

  parseInstanceBodyExtracted(ctx, instance, callbacks)
  this.pos = ctx.pos
  this.errors = ctx.errors
}

/**
 * Parse a chart slot definition
 * Syntax: XAxis: col #888, label "Month", fs 12
 */
export function parseChartSlot(this: Parser, slotToken: Token): ChartSlotNode | null {
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
export function parseInlineChildren(this: Parser, instance: Instance): void {
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

export function parseInlineProperties(
  this: Parser,
  properties: Property[],
  events?: Event[],
  options?: { stopAtSemicolon?: boolean }
): void {
  this.withSubParserContext(ctx => {
    const callbacks: InlinePropertiesCallbacks = {
      collectExpressionOperand: (parts, operators) => {
        this.pos = ctx.pos
        this.collectExpressionOperand(parts, operators)
        ctx.pos = this.pos
      },
      parseDataBindingValues: () => {
        this.pos = ctx.pos
        const result = this.parseDataBindingValues()
        ctx.pos = this.pos
        return result
      },
      parseRoutePath: () => {
        this.pos = ctx.pos
        const result = this.parseRoutePath()
        ctx.pos = this.pos
        return result
      },
      isImplicitOnclickCandidate: name => this.isImplicitOnclickCandidate(name),
      parseImplicitOnclick: () => {
        this.pos = ctx.pos
        const result = this.parseImplicitOnclick()
        ctx.pos = this.pos
        return result
      },
      parseEvent: () => {
        this.pos = ctx.pos
        const result = this.parseEvent()
        ctx.pos = this.pos
        return result
      },
      checkNextIsPropertyName: () => {
        this.pos = ctx.pos
        return this.checkNextIsPropertyName()
      },
      advancePropertyName: () => {
        this.pos = ctx.pos
        const result = this.advancePropertyName()
        ctx.pos = this.pos
        return result
      },
    }
    parseInlinePropertiesExtracted(ctx, properties, callbacks, events, options)
  })
}

export function parseDataBindingValues(
  this: Parser
): { collection: string; filter?: Expression } | null {
  if (!this.check('IDENTIFIER')) return null
  const collection = this.advance().value

  let filter: Expression | undefined
  if (this.check('WHERE')) {
    this.advance()
    filter = this.parseExpression()
  }

  return { collection, filter }
}
