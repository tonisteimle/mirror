/**
 * Mirror Parser
 *
 * Parses tokens into an AST.
 */

import { Token, TokenType, tokenize } from './lexer'
import type { AST, Program, TokenDefinition, ComponentDefinition, Instance, Property, State, Event, Action, Each, Expression, Conditional, ParseError, JavaScriptBlock } from './ast'

// JavaScript keywords that signal the start of JS code
const JS_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'class'])

export class Parser {
  private tokens: Token[]
  private pos: number = 0
  private errors: ParseError[] = []
  private source: string

  constructor(tokens: Token[], source: string = '') {
    this.tokens = tokens
    this.source = source
  }

  parse(): AST {
    const program: Program = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [],
      instances: [],
      errors: [],
    }

    while (!this.isAtEnd()) {
      this.skipNewlines()

      if (this.isAtEnd()) break

      // Section headers
      if (this.check('SECTION')) {
        this.advance() // Skip section for now
        continue
      }

      // Import
      if (this.check('IMPORT')) {
        this.parseImport()
        continue
      }

      // Token definition: name: value (simplified syntax)
      // e.g., primary: #3B82F6 or spacing: 16 or font: "Inter"
      if (this.check('IDENTIFIER') && this.checkNext('COLON') &&
          (this.checkAt(2, 'NUMBER') || this.checkAt(2, 'STRING'))) {
        const token = this.parseTokenDefinition()
        if (token) program.tokens.push(token)
        continue
      }

      // Legacy token definition: name: type = value (still supported)
      if (this.check('IDENTIFIER') && this.checkNext('COLON') &&
          this.checkAt(2, 'IDENTIFIER') && this.checkAt(3, 'EQUALS')) {
        const token = this.parseLegacyTokenDefinition()
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

      // Component or Instance
      if (this.check('IDENTIFIER')) {
        const node = this.parseComponentOrInstance()
        if (node) {
          if (node.type === 'Component') {
            program.components.push(node as ComponentDefinition)
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
  private parseTokenDefinition(): TokenDefinition | null {
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
      line: name.line,
      column: name.column,
    }
  }

  // Legacy syntax: name: type = value (backwards compatible)
  private parseLegacyTokenDefinition(): TokenDefinition | null {
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
      line: name.line,
      column: name.column,
    }
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

  private parseComponentOrInstance(): ComponentDefinition | Instance | null {
    const name = this.advance()

    // Component definition: Name as primitive:
    if (this.check('AS')) {
      return this.parseComponentDefinition(name)
    }

    // Component inheritance: Name extends Parent:
    if (this.check('EXTENDS')) {
      return this.parseComponentInheritance(name)
    }

    // Component definition without explicit primitive: Name:
    // Defaults to Frame as the base primitive
    if (this.check('COLON')) {
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

  private parseInstance(name: Token): Instance {
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

    // Parse inline properties and content
    this.parseInlineProperties(instance.properties)

    // Skip newline before checking for indented children
    this.skipNewlines()

    // Parse indented children
    if (this.check('INDENT')) {
      this.advance()
      this.parseInstanceBody(instance)
    }

    return instance
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

      // Initial state: closed, open (sets initialState)
      const initialStates = new Set(['closed', 'open', 'collapsed', 'expanded'])

      // Boolean properties (no value needed)
      const booleanProperties = new Set([
        'horizontal', 'hor', 'vertical', 'ver', 'center', 'cen',
        'spread', 'wrap', 'stacked', 'hidden', 'visible', 'disabled',
        'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'clip',
        'truncate', 'italic', 'underline', 'uppercase', 'lowercase',
        'left', 'right', 'top', 'bottom', 'hor-center', 'ver-center',
        'focusable',  // Makes element focusable for keyboard events
      ])

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

            // Parse state properties
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

            component.states.push(state)
            continue
          } else {
            // Not a state block, restore position
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

      // Visibility condition: if (state) without children = visibleWhen
      if (this.check('IF')) {
        const savedPos = this.pos
        this.advance() // consume IF
        const condition = this.parseExpression()
        this.skipNewlines()

        // If NOT followed by INDENT, it's a visibility condition
        if (!this.check('INDENT')) {
          // Extract state name from condition like "(open)" → "open"
          const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
          if (match) {
            (component as any).visibleWhen = match[1]
          } else {
            (component as any).visibleWhen = condition
          }
          continue
        } else {
          // Has children - restore and let it be parsed as conditional block
          this.pos = savedPos
          // Fall through to child instance parsing which will handle it
        }
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
        component.children.push(child)
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

      // Visibility condition: if (state) without children = visibleWhen
      if (this.check('IF')) {
        const savedPos = this.pos
        this.advance() // consume IF
        const condition = this.parseExpression()
        this.skipNewlines()

        // If NOT followed by INDENT, it's a visibility condition
        if (!this.check('INDENT')) {
          // Extract state name from condition like "(open)" → "open"
          const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
          if (match) {
            instance.visibleWhen = match[1]
          } else {
            instance.visibleWhen = condition
          }
          continue
        } else {
          // Has children - restore position
          this.pos = savedPos
        }
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

        // Child instance
        const child = this.parseInstance(this.advance())
        instance.children.push(child)
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  private parseInlineProperties(properties: Property[]): void {
    while (!this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
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

      // Property: name value
      if (this.check('IDENTIFIER')) {
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
    const values: (string | number | Conditional)[] = []

    // Check for inline conditional: if condition then value else value
    if (this.check('IF')) {
      const conditional = this.parseInlineConditional()
      if (conditional) {
        values.push(conditional)
        return {
          type: 'Property',
          name: name.value,
          values,
          line: name.line,
          column: name.column,
        }
      }
    }

    // Collect values until comma, newline, or end of context
    while (!this.check('COMMA') && !this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
      if (this.check('NUMBER')) {
        values.push(this.advance().value)
      } else if (this.check('STRING')) {
        values.push(this.advance().value)
      } else if (this.check('IDENTIFIER')) {
        // Take identifier as value and continue collecting
        values.push(this.advance().value)
      } else {
        break
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

  private parseInlineConditional(): Conditional | null {
    if (!this.check('IF')) return null
    this.advance() // if

    // Parse condition
    const condition = this.parseExpression()

    // Expect 'then'
    if (!this.check('THEN')) return null
    this.advance()

    // Parse then value
    let thenValue: string | number = ''
    if (this.check('STRING')) {
      thenValue = this.advance().value
    } else if (this.check('NUMBER')) {
      thenValue = parseFloat(this.advance().value)
    } else if (this.check('IDENTIFIER')) {
      thenValue = this.advance().value
    }

    // Expect 'else'
    let elseValue: string | number = ''
    if (this.check('ELSE')) {
      this.advance()
      if (this.check('STRING')) {
        elseValue = this.advance().value
      } else if (this.check('NUMBER')) {
        elseValue = parseFloat(this.advance().value)
      } else if (this.check('IDENTIFIER')) {
        elseValue = this.advance().value
      }
    }

    return {
      kind: 'conditional',
      condition,
      then: thenValue,
      else: elseValue,
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

  private parseImport(): void {
    this.advance() // import
    if (this.check('STRING')) {
      this.advance() // filename
    }
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
          each.children.push(child)
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
      then: [] as Instance[],
      else: [] as Instance[],
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
          conditional.then.push(child)
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
            conditional.else.push(child)
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
}

export function parse(source: string): AST {
  const tokens = tokenize(source)
  return new Parser(tokens, source).parse()
}
