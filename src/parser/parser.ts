/**
 * Mirror Parser
 *
 * Parses tokens into an AST.
 * Property recognition is driven by the schema (src/schema/dsl.ts).
 */

import { Token, TokenType, tokenize } from './lexer'
import type { AST, Program, TokenDefinition, ComponentDefinition, Instance, Property, State, Event, Action, Each, Slot, Expression, Conditional, TokenReference, ParseError, JavaScriptBlock, AnimationDefinition, AnimationKeyframe, AnimationKeyframeProperty, ZagNode, ZagSlotDef, ZagItem, SourcePosition } from './ast'
import {
  PROPERTY_STARTERS,
  BOOLEAN_PROPERTIES,
  LAYOUT_BOOLEANS,
} from '../schema/parser-helpers'
import { isPrimitive } from '../schema/dsl'
import { isZagPrimitive, getZagPrimitive, isZagSlot, isZagItemKeyword, isZagGroupKeyword } from '../schema/zag-primitives'

// JavaScript keywords that signal the start of JS code
const JS_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'class'])

// Add position booleans that are commonly used as align values
// These are NOT in LAYOUT_BOOLEANS to avoid breaking "align top left"
const POSITION_BOOLEANS = new Set([
  'left', 'right', 'top', 'bottom', 'hor-center', 'ver-center',
])

// Combined boolean properties for parsing (includes position booleans)
const ALL_BOOLEAN_PROPERTIES = new Set([
  ...BOOLEAN_PROPERTIES,
  ...POSITION_BOOLEANS,
])

export class Parser {
  private tokens: Token[]
  private pos: number = 0
  private errors: ParseError[] = []
  private source: string
  private nodeIdCounter: number = 0

  constructor(tokens: Token[], source: string = '') {
    this.tokens = tokens
    this.source = source
  }

  private generateNodeId(): string {
    return `def-${++this.nodeIdCounter}`
  }

  parse(): AST {
    const program: Program = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [],
      animations: [],
      instances: [],
      errors: [],
    }

    // Track current section for tokens
    let currentSection: string | undefined = undefined

    while (!this.isAtEnd()) {
      this.skipNewlines()

      if (this.isAtEnd()) break

      // Section headers - track for token grouping
      if (this.check('SECTION')) {
        const sectionToken = this.advance()
        currentSection = sectionToken.value as string
        continue
      }

      // Token definition: name: value (simplified syntax)
      // e.g., primary: #3B82F6 or spacing: 16 or font: "Inter"
      if (this.check('IDENTIFIER') && this.checkNext('COLON') &&
          (this.checkAt(2, 'NUMBER') || this.checkAt(2, 'STRING'))) {
        const token = this.parseTokenDefinition(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Token reference: $name: $other (token referencing another token)
      // e.g., $accent.bg: $primary or $surface.bg: $grey-800
      if (this.check('IDENTIFIER') && this.checkNext('COLON') &&
          this.checkAt(2, 'IDENTIFIER') &&
          this.peekAt(0)?.value.startsWith('$') &&
          this.peekAt(2)?.value.startsWith('$') &&
          (this.checkAt(3, 'NEWLINE') || this.checkAt(3, 'EOF') || this.checkAt(3, 'COMMENT'))) {
        const token = this.parseTokenReference(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Legacy token definition: name: type = value (still supported)
      if (this.check('IDENTIFIER') && this.checkNext('COLON') &&
          this.checkAt(2, 'IDENTIFIER') && this.checkAt(3, 'EQUALS')) {
        const token = this.parseLegacyTokenDefinition(currentSection)
        if (token) program.tokens.push(token)
        continue
      }

      // Each loop: each item in collection
      if (this.check('EACH')) {
        const each = this.parseEach()
        if (each) program.instances.push(each as any) // Each is treated as instance-level
        continue
      }

      // If conditional: if condition
      if (this.check('IF')) {
        const conditional = this.parseConditionalBlock()
        if (conditional) program.instances.push(conditional as any)
        continue
      }

      // JavaScript block: starts with let, const, var, function, class
      if (this.check('IDENTIFIER') && this.isJavaScriptKeyword()) {
        const jsBlock = this.parseJavaScript()
        if (jsBlock) {
          program.javascript = jsBlock
        }
        break  // JavaScript consumes rest of file
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
            program.instances.push(node as any)
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
      charPos += lines[i].length + 1  // +1 for newline
    }
    const actualStartColumn = startToken.column - startToken.value.length
    charPos += actualStartColumn - 1

    // Extract rest of source as JavaScript
    const code = this.source.slice(charPos).trim()

    // Advance to end
    while (!this.isAtEnd()) {
      this.advance()
    }

    return {
      type: 'JavaScript',
      code,
      line: startToken.line,
      column: startToken.column,
    }
  }

  // New simplified syntax: name: value
  private parseTokenDefinition(section?: string): TokenDefinition | null {
    const name = this.advance() // identifier
    this.advance() // :
    const value = this.advance() // value (NUMBER or STRING)

    // Infer type from value
    const tokenType = this.inferTokenType(value.value)

    return {
      type: 'Token',
      name: name.value,
      tokenType,
      value: value.value,
      section,
      line: name.line,
      column: name.column,
    }
  }

  // Token reference: $name: $other (token referencing another token)
  private parseTokenReference(section?: string): TokenDefinition | null {
    const name = this.advance() // identifier (e.g., $accent.bg)
    this.advance() // :
    const value = this.advance() // identifier (e.g., $primary)

    // Infer type from token name suffix
    let tokenType: 'color' | 'size' | 'font' | 'icon' = 'color'
    if (name.value.includes('.pad') || name.value.includes('.gap') || name.value.includes('.margin')) {
      tokenType = 'size'
    } else if (name.value.includes('.rad')) {
      tokenType = 'size'
    } else if (name.value.includes('.font')) {
      tokenType = 'font'
    }

    return {
      type: 'Token',
      name: name.value,
      tokenType,
      value: value.value,
      section,
      line: name.line,
      column: name.column,
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
      value: value.value,
      section,
      line: name.line,
      column: name.column,
    }
  }

  // Parse a route path (e.g., "Home", "admin/users", "pages/settings")
  // Combines identifiers separated by slashes into a single path string
  private parseRoutePath(): string | null {
    if (!this.check('IDENTIFIER')) return null

    let path = this.advance().value  // First identifier

    // Continue while we see SLASH followed by IDENTIFIER
    while (this.check('SLASH') && this.checkNext('IDENTIFIER')) {
      this.advance() // consume SLASH
      path += '/' + this.advance().value  // append next segment
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

  private parseComponentOrInstance(): ComponentDefinition | Instance | Slot | AnimationDefinition | ZagNode | null {
    const name = this.advance()

    // Component definition: Name as primitive:
    // Animation definition: Name as animation:
    if (this.check('AS')) {
      // Peek to see if this is an animation definition
      if (this.checkNext('ANIMATION')) {
        return this.parseAnimationDefinition(name)
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
        return this.parseZagComponent(name, true) // true = already consumed colon
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

    // Parse inline properties
    this.parseInlineProperties(component.properties)

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

    this.parseInlineProperties(component.properties)

    // Skip newline before checking for indented block
    this.skipNewlines()

    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  /**
   * Parse animation definition
   *
   * Syntax:
   * FadeUp as animation: ease-out
   *   0.00 opacity 0, y-offset 20
   *   0.30 opacity 1, y-offset 0
   *   1.00 // end marker (optional)
   *
   * With roles:
   * StaggeredFade as animation: ease-out
   *   roles item1, item2, item3
   *   0.00 item1 opacity 0
   *   0.10 item2 opacity 0
   *   1.00 all opacity 1
   */
  private parseAnimationDefinition(name: Token): AnimationDefinition | null {
    this.advance() // as
    this.advance() // animation

    if (!this.expect('COLON')) {
      this.errors[this.errors.length - 1].hint = 'Add a colon after "animation"'
      this.recoverToNextDefinition()
      return null
    }

    const animation: AnimationDefinition = {
      type: 'Animation',
      name: name.value,
      keyframes: [],
      line: name.line,
      column: name.column,
    }

    // Parse optional easing on the same line: FadeUp as animation: ease-out
    if (this.check('IDENTIFIER') && !this.check('NEWLINE')) {
      animation.easing = this.advance().value
    }

    // Skip to indented block
    this.skipNewlines()

    if (!this.check('INDENT')) {
      this.addError('Animation definition must have an indented body with keyframes')
      return animation
    }

    this.advance() // consume INDENT

    // Parse animation body
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()
      if (this.check('DEDENT') || this.isAtEnd()) break

      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // Parse roles: item1, item2, item3
      if (this.check('IDENTIFIER') && this.current().value === 'roles') {
        this.advance() // consume 'roles'
        animation.roles = []
        while (!this.check('NEWLINE') && !this.isAtEnd()) {
          if (this.check('COMMA')) {
            this.advance()
            continue
          }
          if (this.check('IDENTIFIER')) {
            animation.roles.push(this.advance().value)
          } else {
            break
          }
        }
        continue
      }

      // Parse keyframe: 0.00 property value, property value
      // Keyframes start with a number (time)
      if (this.check('NUMBER')) {
        const keyframe = this.parseAnimationKeyframe()
        if (keyframe) {
          animation.keyframes.push(keyframe)
        }
        continue
      }

      // Skip unknown tokens
      this.advance()
    }

    if (this.check('DEDENT')) this.advance()

    // Calculate duration from last keyframe (if time is > 1.0, treat as ms)
    if (animation.keyframes.length > 0) {
      const lastKeyframe = animation.keyframes[animation.keyframes.length - 1]
      if (lastKeyframe.time > 1.0) {
        // Time is in milliseconds
        animation.duration = lastKeyframe.time
      }
    }

    return animation
  }

  /**
   * Parse a single keyframe line
   *
   * Syntax:
   * 0.00 opacity 0, y-offset 20
   * 0.30 item1 opacity 1
   * 1.00 all opacity 1, y-offset 0
   */
  private parseAnimationKeyframe(): AnimationKeyframe | null {
    // Time value (e.g., 0.00, 0.30, 1.00, or 300 for ms)
    const timeToken = this.advance()
    const time = parseFloat(timeToken.value)

    const keyframe: AnimationKeyframe = {
      time,
      properties: [],
    }

    // Parse properties on this line
    while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.isAtEnd()) {
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      if (this.check('IDENTIFIER')) {
        const prop = this.parseAnimationKeyframeProperty()
        if (prop) {
          keyframe.properties.push(prop)
        }
      } else {
        break
      }
    }

    return keyframe
  }

  /**
   * Parse a keyframe property
   *
   * Syntax:
   * opacity 0
   * y-offset 20
   * item1 opacity 0  (with role target)
   * all scale 1.2    (with 'all' target)
   */
  private parseAnimationKeyframeProperty(): AnimationKeyframeProperty | null {
    if (!this.check('IDENTIFIER')) return null

    const firstToken = this.advance()
    let target: string | undefined
    let propName: string
    let propValue: string | number

    // Check if this is a role target followed by property name
    // e.g., "item1 opacity 0" or "all scale 1.2"
    if (this.check('IDENTIFIER')) {
      // First token is the target, second is the property name
      target = firstToken.value
      propName = this.advance().value

      // Get value
      if (this.check('NUMBER')) {
        propValue = parseFloat(this.advance().value)
      } else if (this.check('STRING')) {
        propValue = this.advance().value
      } else if (this.check('IDENTIFIER')) {
        propValue = this.advance().value
      } else {
        return null
      }
    } else if (this.check('NUMBER') || this.check('STRING')) {
      // First token is the property name, directly followed by value
      propName = firstToken.value

      if (this.check('NUMBER')) {
        propValue = parseFloat(this.advance().value)
      } else {
        propValue = this.advance().value
      }
    } else {
      // No value found
      return null
    }

    return {
      target,
      name: propName,
      value: propValue,
    }
  }

  // Parse component definition without explicit primitive: Name:
  // Defaults to Frame as the base primitive
  private parseComponentDefinitionWithDefaultPrimitive(name: Token): ComponentDefinition | null {
    this.advance() // : (colon)

    const component: ComponentDefinition = {
      type: 'Component',
      name: name.value,
      primitive: 'Frame', // Default primitive
      extends: null,
      properties: [],
      states: [],
      events: [],
      children: [],
      line: name.line,
      column: name.column,
      nodeId: this.generateNodeId(),
    }

    // Parse inline properties
    this.parseInlineProperties(component.properties)

    // Skip newline before checking for indented block
    this.skipNewlines()

    // Parse indented block
    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  private parseInstance(name: Token): Instance | Slot | ZagNode {
    // Special handling for Slot primitive (case-insensitive, using schema)
    // Syntax: Slot "Name", w full, h 100
    // The first string is the slot name, NOT text content
    if (isPrimitive(name.value) && name.value.toLowerCase() === 'slot') {
      return this.parseSlotPrimitive(name)
    }

    // Check if this is a Zag primitive (e.g., Select, Accordion)
    if (isZagPrimitive(name.value)) {
      return this.parseZagComponent(name)
    }

    const instance: Instance = {
      type: 'Instance',
      component: name.value,
      name: null,
      properties: [],
      children: [],
      line: name.line,
      column: name.column,
    }

    // Named instance: Component named instanceName
    if (this.check('NAMED')) {
      this.advance()
      instance.name = this.advance().value
    }

    // Check if this line uses child override syntax (contains semicolon)
    // Syntax: NavItem Icon "home"; Label "Home"
    if (this.hasChildOverrideSyntax()) {
      instance.childOverrides = this.parseChildOverridesFromStart()
    } else {
      // Parse inline properties and content
      this.parseInlineProperties(instance.properties)
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
   * Parse a Zag component (Select, Accordion, etc.)
   *
   * Syntax:
   *   Select placeholder "Choose..."
   *     Trigger:
   *       pad 12, bg #1e1e2e
   *       hover:
   *         bg #2a2a3e
   *     Content:
   *       bg #2a2a3e, rad 8
   *     Item "Option A"
   *     Item "Option B" disabled
   */
  private parseZagComponent(nameToken: Token, colonAlreadyConsumed = false): ZagNode {
    // Consume colon if present and not already consumed
    if (!colonAlreadyConsumed && this.check('COLON')) {
      this.advance()
    }

    const zagPrimitive = getZagPrimitive(nameToken.value)
    const machineType = zagPrimitive?.machine ?? 'unknown'

    const zagNode: ZagNode = {
      type: 'ZagComponent',
      machine: machineType,
      name: nameToken.value,
      properties: [],
      slots: {},
      items: [],
      events: [],
      line: nameToken.line,
      column: nameToken.column,
    }

    // Parse inline properties (e.g., placeholder "Choose...", multiple, disabled)
    this.parseZagInlineProperties(zagNode)

    // Check for colon at end of line - this marks it as a DEFINITION, not an instance
    // Select placeholder "...":  → Definition (not rendered)
    // Select placeholder "..."   → Instance (rendered)
    if (this.check('COLON')) {
      this.advance()
      zagNode.isDefinition = true
    }

    // Skip newline before checking for indented body
    this.skipNewlines()

    // Parse indented body (slots and items)
    if (this.check('INDENT')) {
      this.advance()
      this.parseZagComponentBody(zagNode)
    }

    return zagNode
  }

  /**
   * Parse inline properties specific to Zag components
   */
  private parseZagInlineProperties(zagNode: ZagNode): void {
    const zagPrimitive = getZagPrimitive(zagNode.name)
    const validProps = new Set(zagPrimitive?.props ?? [])

    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.check('COLON') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // Check for Zag-specific properties
      if (this.check('IDENTIFIER')) {
        const propName = this.current().value

        // Boolean Zag properties (e.g., multiple, searchable, clearable, disabled)
        if (validProps.has(propName) && !this.checkNext('STRING') && !this.checkNext('NUMBER')) {
          const token = this.advance()
          zagNode.properties.push({
            type: 'Property',
            name: propName,
            values: [true],
            line: token.line,
            column: token.column,
          })
          continue
        }

        // Zag property with value (e.g., placeholder "Choose...")
        if (validProps.has(propName)) {
          const token = this.advance()
          const values: any[] = []

          // Parse value(s) - stop at COLON (end of Select line), NEWLINE, INDENT, COMMA
          while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('COMMA') && !this.check('COLON') && !this.isAtEnd()) {
            if (this.check('STRING')) {
              values.push(this.advance().value)
            } else if (this.check('NUMBER')) {
              values.push(parseFloat(this.advance().value))
            } else if (this.check('IDENTIFIER') && validProps.has(this.current().value)) {
              // Next property starting
              break
            } else {
              values.push(this.advance().value)
            }
          }

          zagNode.properties.push({
            type: 'Property',
            name: propName,
            values,
            line: token.line,
            column: token.column,
          })
          continue
        }
      }

      // Fall through to regular property parsing
      const properties: Property[] = []
      this.parseInlineProperties(properties)
      zagNode.properties.push(...properties)
      break
    }
  }

  /**
   * Parse the body of a Zag component (slots and items)
   */
  private parseZagComponentBody(zagNode: ZagNode): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()
      if (this.check('DEDENT') || this.isAtEnd()) break

      // IMPORTANT: Check for Item BEFORE slots, because "Item" can be both a slot and an item keyword
      // Item definitions are distinguished by having: Item "Label" or Item value "x"
      // Slot definitions look like: Item: (just keyword + colon)
      if (this.check('IDENTIFIER') && isZagItemKeyword(zagNode.name, this.current().value)) {
        // Check if this looks like an item definition (has string or "value" keyword after)
        const nextToken = this.tokens[this.pos + 1]
        const isItemDefinition = nextToken && (
          nextToken.type === 'STRING' ||
          (nextToken.type === 'IDENTIFIER' && nextToken.value === 'value')
        )

        if (isItemDefinition) {
          const item = this.parseZagItem(zagNode.name)
          if (item) zagNode.items.push(item)
          continue
        }
      }

      // Check for Group definition: Group "Label" or Group label "Label"
      if (this.check('IDENTIFIER') && isZagGroupKeyword(zagNode.name, this.current().value)) {
        const group = this.parseZagGroup(zagNode.name)
        if (group) zagNode.items.push(group)
        continue
      }

      // Check for slot definition: SlotName: or SlotName, props:
      // Slots can have inline properties before the colon (e.g., "Trigger, hor, spread:")
      if (this.check('IDENTIFIER')) {
        const slotName = this.current().value

        // Verify this is a valid slot for this Zag component
        if (isZagSlot(zagNode.name, slotName)) {
          // Look ahead to find if there's a colon on this line
          if (this.hasColonOnLine()) {
            this.advance() // slot name
            // Parse inline properties until we hit the colon
            const properties: Property[] = []
            while (!this.check('COLON') && !this.check('NEWLINE') && !this.isAtEnd()) {
              if (this.check('COMMA')) {
                this.advance()
                continue
              }
              if (this.check('IDENTIFIER')) {
                const prop = this.parseProperty()
                if (prop) properties.push(prop)
              } else {
                this.advance()
              }
            }
            if (this.check('COLON')) {
              this.advance() // consume colon
            }
            const slot = this.parseZagSlot(zagNode.name, slotName, zagNode)
            // Merge parsed properties into slot
            slot.properties = [...properties, ...slot.properties]
            zagNode.slots[slotName] = slot
            continue
          }
        }
      }

      // Check for Zag properties (placeholder, defaultValue, disabled, etc.)
      const zagPrimitive = getZagPrimitive(zagNode.name)
      const validProps = new Set(zagPrimitive?.props ?? [])
      if (this.check('IDENTIFIER') && validProps.has(this.current().value)) {
        const propName = this.current().value
        const token = this.advance()

        // Boolean property (no value following)
        if (this.check('NEWLINE') || this.check('DEDENT') || this.isAtEnd()) {
          zagNode.properties.push({
            type: 'Property',
            name: propName,
            values: [true],
            line: token.line,
            column: token.column,
          })
          continue
        }

        // Property with value(s)
        const values: any[] = []
        while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.isAtEnd()) {
          if (this.check('STRING')) {
            values.push(this.advance().value)
          } else if (this.check('NUMBER')) {
            values.push(parseFloat(this.advance().value))
          } else if (this.check('COMMA')) {
            this.advance()
          } else if (this.check('IDENTIFIER') && validProps.has(this.current().value)) {
            break // Next property
          } else {
            values.push(this.advance().value)
          }
        }

        if (values.length > 0) {
          zagNode.properties.push({
            type: 'Property',
            name: propName,
            values,
            line: token.line,
            column: token.column,
          })
        } else {
          // Boolean if no values parsed
          zagNode.properties.push({
            type: 'Property',
            name: propName,
            values: [true],
            line: token.line,
            column: token.column,
          })
        }
        continue
      }

      // Check for Item definition: Item/Tab/Step "Label" or Item value "val" label "Label"
      if (this.check('IDENTIFIER') && isZagItemKeyword(zagNode.name, this.current().value)) {
        const item = this.parseZagItem(zagNode.name)
        if (item) zagNode.items.push(item)
        continue
      }

      // Check for Group definition: Group "Label" or Group label "Label"
      if (this.check('IDENTIFIER') && isZagGroupKeyword(zagNode.name, this.current().value)) {
        const group = this.parseZagGroup(zagNode.name)
        if (group) zagNode.items.push(group)
        continue
      }

      // Check for events (onclick, onchange, etc.)
      if (this.check('IDENTIFIER') && this.current().value.startsWith('on')) {
        const event = this.parseEvent()
        if (event) zagNode.events.push(event)
        continue
      }

      // Skip unknown tokens
      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  /**
   * Parse a Zag slot definition
   *
   * Syntax:
   *   Trigger:
   *     pad 12, bg #1e1e2e
   *     hover:
   *       bg #2a2a3e
   */
  private parseZagSlot(componentName: string, slotName: string, parentZagNode?: ZagNode): ZagSlotDef {
    const startLine = this.previous()?.line ?? 1
    const startColumn = this.previous()?.column ?? 1

    const slot: ZagSlotDef = {
      name: slotName,
      properties: [],
      states: [],
      children: [],
      sourcePosition: {
        line: startLine,
        column: startColumn,
        endLine: startLine,
        endColumn: startColumn,
      },
    }

    // Parse inline properties after colon
    this.parseInlineProperties(slot.properties)

    // Skip newline before checking for indented body
    this.skipNewlines()

    // Parse indented body (properties, states, children)
    if (this.check('INDENT')) {
      this.advance()
      this.parseZagSlotBody(slot, componentName, parentZagNode)
    }

    return slot
  }

  /**
   * Parse the body of a Zag slot
   */
  private parseZagSlotBody(slot: ZagSlotDef, componentName?: string, parentZagNode?: ZagNode): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()
      if (this.check('DEDENT') || this.isAtEnd()) break

      // State block: hover: or selected:
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const stateName = this.current().value
        // Check if this looks like a state (common state names)
        const stateNames = new Set(['hover', 'focus', 'active', 'disabled', 'selected', 'highlighted', 'open', 'closed'])
        if (stateNames.has(stateName)) {
          const stateToken = this.advance()
          this.advance() // colon

          const state: State = {
            type: 'State',
            name: stateToken.value,
            properties: [],
            childOverrides: [],
            line: stateToken.line,
            column: stateToken.column,
          }

          // Parse inline properties
          this.parseInlineProperties(state.properties)

          // Parse block properties
          this.skipNewlines()
          if (this.check('INDENT')) {
            this.advance()
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              const properties: Property[] = []
              this.parseInlineProperties(properties)
              state.properties.push(...properties)
            }
            if (this.check('DEDENT')) this.advance()
          }

          slot.states.push(state)
          continue
        }
      }

      // Property line
      if (this.check('IDENTIFIER') && PROPERTY_STARTERS.has(this.current().value)) {
        const properties: Property[] = []
        this.parseInlineProperties(properties)
        slot.properties.push(...properties)
        continue
      }

      // Check for Item children - add to parent ZagNode's items
      if (this.check('IDENTIFIER') && componentName && parentZagNode &&
          isZagItemKeyword(componentName, this.current().value)) {
        const item = this.parseZagItem(componentName)
        if (item) parentZagNode.items.push(item)
        continue
      }

      // Check for Group children - add to parent ZagNode's items
      if (this.check('IDENTIFIER') && componentName && parentZagNode &&
          isZagGroupKeyword(componentName, this.current().value)) {
        const group = this.parseZagGroup(componentName)
        if (group) parentZagNode.items.push(group)
        continue
      }

      // Child instance
      if (this.check('IDENTIFIER')) {
        const name = this.advance()
        const child = this.parseInstance(name)
        if (child.type !== 'ZagComponent') {
          slot.children.push(child as Instance | Slot)
        }
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  /**
   * Parse a Zag Item (Item, Tab, Step, Slide, etc.)
   *
   * Syntax:
   *   Item "Option A"
   *   Tab "Home"
   *     Text "Welcome content"
   *   Step "Account" target "#signup-form"
   *   Item value "opt-a" label "Option A" disabled
   */
  private parseZagItem(componentName: string): ZagItem | null {
    const itemToken = this.advance() // 'Item'
    const startLine = itemToken.line
    const startColumn = itemToken.column

    const item: ZagItem = {
      sourcePosition: {
        line: startLine,
        column: startColumn,
        endLine: startLine,
        endColumn: startColumn,
      },
    }

    // Layout properties that can be on items
    const layoutProps = ['ver', 'hor', 'vertical', 'horizontal', 'gap', 'pad', 'spread', 'center', 'g', 'p']

    // Parse item content
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.check('COLON') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // String as label (shorthand)
      if (this.check('STRING') && !item.label) {
        const str = this.advance()
        item.label = str.value
        // Use label as value if no explicit value
        if (!item.value) item.value = str.value
        continue
      }

      // Explicit value: value "val"
      if (this.check('IDENTIFIER') && this.current().value === 'value') {
        this.advance()
        if (this.check('STRING')) {
          item.value = this.advance().value
        }
        continue
      }

      // Explicit label: label "Label"
      if (this.check('IDENTIFIER') && this.current().value === 'label') {
        this.advance()
        if (this.check('STRING')) {
          item.label = this.advance().value
        }
        continue
      }

      // disabled flag
      if (this.check('IDENTIFIER') && this.current().value === 'disabled') {
        this.advance()
        item.disabled = true
        continue
      }

      // target property (for Tour steps): target "#element"
      if (this.check('IDENTIFIER') && this.current().value === 'target') {
        this.advance()
        if (this.check('STRING')) {
          item.target = this.advance().value
        }
        continue
      }

      // icon property: icon "star"
      if (this.check('IDENTIFIER') && this.current().value === 'icon') {
        this.advance()
        if (this.check('STRING')) {
          item.icon = this.advance().value
        }
        continue
      }

      // Layout properties (ver, hor, gap, pad, spread, etc.)
      if (this.check('IDENTIFIER') && layoutProps.includes(this.current().value)) {
        // Initialize properties array if needed
        if (!item.properties) item.properties = []
        const propToken = this.current()
        const propName = this.advance().value
        // Check for value(s)
        const values: (string | number | boolean)[] = []
        while (this.check('NUMBER') || this.check('STRING')) {
          const valToken = this.advance()
          values.push(valToken.type === 'NUMBER' ? Number(valToken.value) : valToken.value)
        }
        // If no values, treat as boolean flag (e.g., "ver" = true)
        if (values.length === 0) values.push(true)
        item.properties.push({ type: 'Property', name: propName, values, line: propToken.line, column: propToken.column })
        continue
      }

      // Unknown, stop parsing properties
      break
    }

    // Check for colon (indicates inline or indented children)
    if (this.check('COLON')) {
      this.advance()
      item.children = []

      // Parse inline children on same line
      // Children are separated by commas followed by capitalized component names
      // e.g., "Box w 8, h 8, bg #fff, Text "label"" - commas between props don't separate children
      while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
        // Skip leading commas
        if (this.check('COMMA')) {
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
            while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
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

            item.children.push(child)
          } else {
            // Lowercase - not a component, stop parsing
            break
          }
        } else {
          break
        }
      }
    }

    // Skip newline
    this.skipNewlines()

    // Check for indented children (custom item content)
    if (this.check('INDENT')) {
      this.advance()
      if (!item.children) item.children = []
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        this.skipNewlines()
        if (this.check('DEDENT') || this.isAtEnd()) break

        if (this.check('IDENTIFIER')) {
          const name = this.advance()
          const child = this.parseInstance(name)
          if (child.type !== 'ZagComponent') {
            item.children.push(child as Instance)
          }
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) this.advance()
    }

    // Update end position
    const prevToken = this.previous()
    if (prevToken) {
      item.sourcePosition.endLine = prevToken.line
      item.sourcePosition.endColumn = prevToken.column
    }

    return item
  }

  /**
   * Parse a Zag Group (container for related items)
   *
   * Syntax:
   *   Group "Fruits"
   *     Item "Apple"
   *     Item "Banana"
   *   Group label "Vegetables"
   *     Item "Carrot"
   *     Item "Tomato"
   */
  private parseZagGroup(componentName: string): ZagItem | null {
    const groupToken = this.advance() // 'Group'
    const startLine = groupToken.line
    const startColumn = groupToken.column

    const group: ZagItem = {
      isGroup: true,
      items: [],
      sourcePosition: {
        line: startLine,
        column: startColumn,
        endLine: startLine,
        endColumn: startColumn,
      },
    }

    // Parse group properties (label)
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // String as label (shorthand): Group "Fruits"
      if (this.check('STRING') && !group.label) {
        const str = this.advance()
        group.label = str.value
        continue
      }

      // Explicit label: label "Fruits"
      if (this.check('IDENTIFIER') && this.current().value === 'label') {
        this.advance()
        if (this.check('STRING')) {
          group.label = this.advance().value
        }
        continue
      }

      break
    }

    // Consume newline
    if (this.check('NEWLINE')) this.advance()

    // Parse indented children (Items)
    if (this.check('INDENT')) {
      this.advance() // consume INDENT

      while (!this.check('DEDENT') && !this.isAtEnd()) {
        this.skipNewlines()
        if (this.check('DEDENT') || this.isAtEnd()) break

        // Check for Item
        if (this.check('IDENTIFIER') && isZagItemKeyword(componentName, this.current().value)) {
          const item = this.parseZagItem(componentName)
          if (item) group.items!.push(item)
          continue
        }

        // Skip unknown tokens
        this.advance()
      }

      if (this.check('DEDENT')) this.advance()
    }

    // Update end position
    const prevToken = this.previous()
    if (prevToken) {
      group.sourcePosition.endLine = prevToken.line
      group.sourcePosition.endColumn = prevToken.column
    }

    return group
  }

  /**
   * Look ahead to check if the current line contains child override syntax (semicolons)
   */
  private hasChildOverrideSyntax(): boolean {
    let ahead = 0
    while (this.pos + ahead < this.tokens.length) {
      const token = this.tokens[this.pos + ahead]
      if (token.type === 'NEWLINE' || token.type === 'INDENT' || token.type === 'EOF') {
        return false
      }
      if (token.type === 'SEMICOLON') {
        return true
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
    while (this.pos + ahead < this.tokens.length) {
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
   * Parse child overrides from the start of the line
   * Syntax: ChildName prop value; ChildName2 prop2 value2
   */
  private parseChildOverridesFromStart(): import('./ast').ChildOverride[] {
    const overrides: import('./ast').ChildOverride[] = []

    // Parse first child override (no leading semicolon)
    if (this.check('IDENTIFIER')) {
      const childName = this.advance()
      const properties: Property[] = []
      this.parseInlineProperties(properties)
      overrides.push({
        childName: childName.value,
        properties,
      })
    }

    // Parse subsequent child overrides (separated by semicolons)
    while (this.check('SEMICOLON')) {
      this.advance() // consume semicolon

      // Skip any whitespace
      if (this.check('NEWLINE') || this.check('INDENT') || this.isAtEnd()) break

      // Expect child name
      if (!this.check('IDENTIFIER')) break

      const childName = this.advance()
      const properties: Property[] = []
      this.parseInlineProperties(properties)

      overrides.push({
        childName: childName.value,
        properties,
      })
    }

    return overrides
  }

  private parseComponentBody(component: ComponentDefinition): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT') || this.isAtEnd()) break

      // Skip commas between properties
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // Data binding: data Collection where condition
      if (this.check('DATA')) {
        const dataToken = this.advance()
        const binding = this.parseDataBindingValues()
        if (binding) {
          const values: any[] = [binding.collection]
          if (binding.filter) {
            values.push({ filter: binding.filter })
          }
          component.properties.push({
            type: 'Property',
            name: 'data',
            values,
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

      // Route: route TargetComponent or route path/to/page
      if (this.check('ROUTE')) {
        this.advance() // consume 'route'
        const routePath = this.parseRoutePath()
        if (routePath) {
          component.route = routePath
        }
        continue
      }

      // Initial state: closed, open (sets initialState)
      const initialStates = new Set(['closed', 'open', 'collapsed', 'expanded'])

      // Boolean properties (use module-level constant including position booleans)
      const booleanProperties = ALL_BOOLEAN_PROPERTIES

      // System states without colon (hover, focus, active, disabled)
      // These are recognized when followed by NEWLINE + INDENT
      const systemStates = new Set(['hover', 'focus', 'active', 'disabled', 'filled'])

      if (this.check('IDENTIFIER') && !this.checkNext('COLON') && !this.checkNext('AS')) {
        const name = this.current().value

        // System state without colon: hover\n  bg #333
        if (systemStates.has(name)) {
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

            // Parse state properties and child overrides
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              if (this.check('IDENTIFIER')) {
                const token = this.current()
                // Check if this is a child override (uppercase identifier = component name)
                if (token && this.isUppercase(token.value)) {
                  const childOverride = this.parseStateChildOverride()
                  if (childOverride) state.childOverrides.push(childOverride)
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

            // Check for block properties
            this.skipNewlines()
            if (this.check('INDENT')) {
              this.advance() // consume INDENT
              while (!this.check('DEDENT') && !this.isAtEnd()) {
                this.skipNewlines()
                if (this.check('DEDENT')) break

                if (this.check('IDENTIFIER')) {
                  const token = this.current()
                  // Check if this is a child override (uppercase identifier = component name)
                  if (token && this.isUppercase(token.value)) {
                    const childOverride = this.parseStateChildOverride()
                    if (childOverride) state.childOverrides.push(childOverride)
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

        // Handle initial state (closed, open, etc.)
        if (initialStates.has(name)) {
          const token = this.advance()
          component.initialState = token.value
          continue
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
          'font', 'cursor', 'align', 'weight',
        ])

        // Property line: identifier followed by values (NUMBER, STRING, IDENTIFIER)
        const next = this.peekAt(1)
        // If next token looks like a value (NUMBER, STRING, or simple IDENTIFIER not starting with uppercase)
        // then it's a property
        if (next && (next.type === 'NUMBER' || next.type === 'STRING' ||
            (next.type === 'IDENTIFIER' && !this.current().value.startsWith('on')))) {
          // Check if it's likely a property (next is value) vs child instance (next is STRING only)
          // Property: pad 16, bg #FFF, col white, font Arial
          // Instance: Button "Click", Text "Hello"
          // Heuristic: if name is lowercase and next is number/identifier, it's a property
          // Exception: known properties like "font" can take PascalCase values
          const isLikelyProperty = name[0] === name[0].toLowerCase() &&
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
          ;(component as any).visibleWhen = visibleWhen
          continue
        }

        // Has children - parse them and set visibleWhen on each
        this.advance() // consume INDENT
        while (!this.isAtEnd() && !this.check('DEDENT')) {
          this.skipNewlines()
          if (this.check('DEDENT') || this.isAtEnd()) break

          // Child component definition: ChildName as primitive:
          if (this.check('IDENTIFIER') && this.checkNext('AS')) {
            const childName = this.advance()
            const child = this.parseComponentDefinition(childName)
            ;(child as any).visibleWhen = visibleWhen
            component.children.push(child as any)
            continue
          }

          // Child instance
          if (this.check('IDENTIFIER')) {
            const name = this.advance()
            const child = this.parseInstance(name)
            if (child.type !== 'ZagComponent') {
              ;(child as any).visibleWhen = visibleWhen
              component.children.push(child as Instance | Slot)
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
        component.children.push(child as any)
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
    const booleanProperties = new Set([
      'focusable', 'hidden', 'visible', 'disabled', 'clip', 'scroll',
    ])

    // Initial states that set initialState
    const initialStates = new Set(['closed', 'open', 'collapsed', 'expanded'])

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
        while (!this.isAtEnd() && !this.check('DEDENT')) {
          this.skipNewlines()
          if (this.check('DEDENT') || this.isAtEnd()) break

          // Child instance (including Zag components)
          if (this.check('IDENTIFIER')) {
            const name = this.advance()
            const child = this.parseInstance(name)
            ;(child as any).visibleWhen = visibleWhen
            if (!instance.children) instance.children = []
            instance.children.push(child as any)
            continue
          }

          this.advance()
        }
        if (this.check('DEDENT')) this.advance()
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
        // Instances can have events via instance.events (but Instance type doesn't have events)
        // For now, skip keys in instances - they should be in component definitions
        // TODO: Consider adding events to Instance type
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

        // Initial state (closed, open)
        if (initialStates.has(name)) {
          const token = this.advance()
          instance.initialState = token.value
          continue
        }

        // Boolean property (focusable, etc.)
        if (booleanProperties.has(name)) {
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

        // Child instance (including Zag components)
        const child = this.parseInstance(this.advance())
        instance.children.push(child as any)
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  /**
   * Parse inline children after a colon on the same line
   * Syntax: Box hor, gap 8: Icon "save", Text "Speichern"
   * Children are separated by commas followed by capitalized component names
   */
  private parseInlineChildren(instance: Instance): void {
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
      // Skip leading commas
      if (this.check('COMMA')) {
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
          while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
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

  private parseInlineProperties(properties: Property[]): void {
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.check('SEMICOLON') && !this.check('COLON') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance()
        continue
      }

      // String content
      if (this.check('STRING')) {
        const str = this.advance()
        properties.push({
          type: 'Property',
          name: 'content',
          values: [str.value],
          line: str.line,
          column: str.column,
        })
        continue
      }

      // Data binding: data Collection where condition
      if (this.check('DATA')) {
        const dataToken = this.advance()
        const binding = this.parseDataBindingValues()
        if (binding) {
          const values: any[] = [binding.collection]
          if (binding.filter) {
            values.push({ filter: binding.filter })
          }
          properties.push({
            type: 'Property',
            name: 'data',
            values,
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
            name: '_route',  // Special prefix to identify route properties
            values: [routePath],
            line: routeToken.line,
            column: routeToken.column,
          })
        }
        continue
      }

      // Property: name value (or boolean property)
      if (this.check('IDENTIFIER')) {
        const identName = this.current().value
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
    const values: (string | number | TokenReference | Conditional)[] = []

    // Collect values, watching for ternary operator (?)
    // JavaScript ternary: condition ? thenValue : elseValue
    const collectedTokens: { type: string; value: string }[] = []

    while (!this.check('COMMA') && !this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
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

        // Expect colon for else
        let elseValue: string | number = ''
        if (this.check('COLON')) {
          this.advance()
          if (this.check('STRING')) {
            elseValue = this.advance().value
          } else if (this.check('NUMBER')) {
            elseValue = this.advance().value
          } else if (this.check('IDENTIFIER')) {
            elseValue = this.advance().value
          }
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

      // Collect comparison and logical operators for conditions
      if (this.check('STRICT_EQUAL') || this.check('STRICT_NOT_EQUAL') ||
          this.check('NOT_EQUAL') || this.check('GT') || this.check('LT') ||
          this.check('GTE') || this.check('LTE') || this.check('AND_AND') ||
          this.check('OR_OR') || this.check('BANG') || this.check('DOT')) {
        collectedTokens.push({ type: this.current().type, value: this.advance().value })
      } else if (this.check('NUMBER')) {
        collectedTokens.push({ type: 'NUMBER', value: this.advance().value })
      } else if (this.check('STRING')) {
        collectedTokens.push({ type: 'STRING', value: `"${this.advance().value}"` })
      } else if (this.check('IDENTIFIER')) {
        const identValue = this.current().value
        // Check if this identifier is a property starter (non-boolean property name)
        // If so, it's the start of a new property - stop collecting here
        // This allows "Box h 300 bg #333" to be parsed as two properties without commas
        //
        // Exception: directional keywords (x, y, left, right, top, bottom, etc.) after
        // spacing/border properties should be values, not new properties
        // e.g., "pad x 20" → pad: [x, 20], not pad + x: [20]
        const isDirectionValue = (
          ['x', 'y', 'left', 'right', 'top', 'bottom', 't', 'b', 'l', 'r', 'hor', 'ver', 'horizontal', 'vertical', 'auto'].includes(identValue) &&
          ['pad', 'padding', 'p', 'margin', 'm', 'bor', 'border'].includes(name.value)
        )
        if (PROPERTY_STARTERS.has(identValue) && !isDirectionValue) {
          break
        }
        // Also check for LAYOUT boolean properties (hor, ver, wrap, spread, etc.)
        // These should start a new property when encountered after values
        // Position booleans (left, right, top, bottom, center) are NOT checked here
        // because they're commonly used as values for "align"
        // We only break if we've already collected at least one value
        // This allows "gap 16 hor" to separate but "align center" to stay together
        if (LAYOUT_BOOLEANS.has(identValue) && collectedTokens.length > 0) {
          break
        }
        collectedTokens.push({ type: 'IDENTIFIER', value: this.advance().value })
      } else {
        break
      }
    }

    // No ternary found - convert collected tokens to values
    // Combine property accesses like user.name into single values
    let i = 0
    while (i < collectedTokens.length) {
      const token = collectedTokens[i]

      if (token.type === 'IDENTIFIER') {
        // Check for property access chain: identifier.identifier.identifier...
        let combined = token.value
        while (i + 2 < collectedTokens.length &&
               collectedTokens[i + 1].type === 'DOT' &&
               collectedTokens[i + 2].type === 'IDENTIFIER') {
          combined += '.' + collectedTokens[i + 2].value
          i += 2
        }
        // If starts with $, it's a token reference
        if (combined.startsWith('$')) {
          values.push({ kind: 'token' as const, name: combined.slice(1) })
        } else {
          values.push(combined)
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

    return {
      type: 'Property',
      name: name.value,
      values,
      line: name.line,
      column: name.column,
    }
  }

  private parseEvent(): Event | null {
    const eventToken = this.advance()
    const eventName = eventToken.value

    const event: Event = {
      type: 'Event',
      name: eventName,
      actions: [],
      line: eventToken.line,
      column: eventToken.column,
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

    // Parse actions
    while (!this.check('NEWLINE') && !this.check('COMMA') && !this.isAtEnd()) {
      if (this.check('IDENTIFIER')) {
        const action = this.parseAction()
        if (action) event.actions.push(action)
      } else {
        break
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

    // Check for target
    if (this.check('IDENTIFIER') && !this.checkNext('COLON')) {
      action.target = this.advance().value
    }

    // For animate action, parse additional arguments (multiple targets, stagger, etc.)
    if (actionToken.value === 'animate') {
      action.args = []
      while (this.check('IDENTIFIER') || this.check('NUMBER')) {
        if (this.check('IDENTIFIER')) {
          const arg = this.advance().value
          // Handle stagger keyword: stagger 100
          if (arg === 'stagger' && this.check('NUMBER')) {
            action.args.push(`stagger${this.advance().value}`)
          } else {
            action.args.push(arg)
          }
        } else if (this.check('NUMBER')) {
          action.args.push(this.advance().value)
        }

        // Skip comma between arguments
        if (this.check('COMMA')) {
          this.advance()
        } else {
          break
        }
      }
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

    // Expect 'in'
    if (!this.check('IN')) return null
    this.advance()

    // Get collection name
    if (!this.check('IDENTIFIER')) return null
    const collection = this.advance().value

    const each: Each = {
      type: 'Each',
      item,
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

    // Parse indented children
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
          if (nestedEach) each.children.push(nestedEach as any)
        } else if (this.check('IF')) {
          const conditional = this.parseConditionalBlock()
          if (conditional) each.children.push(conditional as any)
        } else {
          this.advance()
        }
      }
      if (this.check('DEDENT')) this.advance()
    }

    return each
  }

  // ============================================================================
  // CONDITIONAL PARSING
  // ============================================================================

  private parseConditionalBlock(): any {
    const ifToken = this.advance() // if

    // Parse condition
    const condition = this.parseExpression()

    const conditional = {
      type: 'Conditional',
      condition,
      then: [] as (Instance | Slot)[],
      else: [] as (Instance | Slot)[],
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
          if (each) conditional.then.push(each as any)
        } else if (this.check('IF')) {
          const nested = this.parseConditionalBlock()
          if (nested) conditional.then.push(nested as any)
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
            if (each) conditional.else.push(each as any)
          } else if (this.check('IF')) {
            const nested = this.parseConditionalBlock()
            if (nested) conditional.else.push(nested as any)
          } else {
            this.advance()
          }
        }
        if (this.check('DEDENT')) this.advance()
      }
    }

    return conditional
  }

  private parseExpression(): Expression {
    // Capture everything until NEWLINE, INDENT, or DEDENT as raw JavaScript expression
    let expr = ''
    let parenDepth = 0

    while (!this.isAtEnd()) {
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
      if (parenDepth === 0 && (this.check('NEWLINE') || this.check('INDENT') || this.check('DEDENT'))) {
        break
      }

      // Stop at THEN for inline conditionals
      if (this.check('THEN')) {
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
        if (expr && !expr.endsWith('(') && !expr.endsWith('!') && !expr.endsWith('.') && !expr.endsWith(' ')) {
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
    while (!this.isAtEnd()) {
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
   * Syntax: ChildName property value
   */
  private parseStateChildOverride(): import('./ast').ChildOverride | null {
    if (!this.check('IDENTIFIER')) return null

    const childName = this.advance()
    const properties: Property[] = []

    // Parse properties for this child override (on the same line)
    this.parseInlineProperties(properties)

    return {
      childName: childName.value,
      properties,
    }
  }
}

export function parse(source: string): AST {
  const tokens = tokenize(source)
  return new Parser(tokens, source).parse()
}
