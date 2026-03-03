/**
 * Mirror Parser
 *
 * Parses tokens into an AST.
 */

import { Token, TokenType, tokenize } from './lexer'
import type { AST, Program, TokenDefinition, ComponentDefinition, Instance, Property, State, Event, Action } from './ast'

export class Parser {
  private tokens: Token[]
  private pos: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): AST {
    const program: Program = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [],
      instances: [],
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

      // Token definition: name: type = value
      if (this.check('IDENTIFIER') && this.checkNext('COLON') && this.checkAt(2, 'IDENTIFIER')) {
        const token = this.parseTokenDefinition()
        if (token) program.tokens.push(token)
        continue
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

    return program
  }

  private parseTokenDefinition(): TokenDefinition | null {
    const name = this.advance() // identifier
    this.advance() // :
    const tokenType = this.advance() // type

    if (!this.check('EQUALS')) {
      return null
    }
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

    // Instance: Name "content" or Name prop value
    return this.parseInstance(name)
  }

  private parseComponentDefinition(name: Token): ComponentDefinition {
    this.advance() // as
    const primitive = this.advance() // primitive name
    this.expect('COLON')

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

    // Parse indented block
    if (this.check('INDENT')) {
      this.advance()
      this.parseComponentBody(component)
    }

    return component
  }

  private parseComponentInheritance(name: Token): ComponentDefinition {
    this.advance() // extends
    const parent = this.advance() // parent name
    this.expect('COLON')

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

      // State: stateName:
      if (this.check('IDENTIFIER') && this.checkNext('COLON')) {
        const stateName = this.advance()
        this.advance() // :

        // Check if it's a slot (empty) or state
        if (this.check('NEWLINE') || this.check('INDENT')) {
          // Could be slot or state with block
          const state: State = {
            type: 'State',
            name: stateName.value,
            properties: [],
            childOverrides: [],
            line: stateName.line,
            column: stateName.column,
          }

          this.parseInlineProperties(state.properties)

          if (this.check('INDENT')) {
            this.advance()
            // Parse state body
            while (!this.check('DEDENT') && !this.isAtEnd()) {
              this.skipNewlines()
              if (this.check('DEDENT')) break

              // Property or child override
              const prop = this.parseProperty()
              if (prop) state.properties.push(prop)
            }
            if (this.check('DEDENT')) this.advance()
          }

          component.states.push(state)
        } else {
          // Inline state: hover: bg #333
          const state: State = {
            type: 'State',
            name: stateName.value,
            properties: [],
            childOverrides: [],
            line: stateName.line,
            column: stateName.column,
          }
          this.parseInlineProperties(state.properties)
          component.states.push(state)
        }
        continue
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

      // Child component or slot
      if (this.check('IDENTIFIER')) {
        // TODO: parse child
        this.advance()
        continue
      }

      this.advance()
    }

    if (this.check('DEDENT')) this.advance()
  }

  private parseInstanceBody(instance: Instance): void {
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT') || this.isAtEnd()) break

      // Child instance
      if (this.check('IDENTIFIER')) {
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

      break
    }
  }

  private parseProperty(): Property | null {
    if (!this.check('IDENTIFIER')) return null

    const name = this.advance()
    const values: (string | number)[] = []

    // Collect values until comma, newline, or another identifier that looks like a property
    while (!this.check('COMMA') && !this.check('NEWLINE') && !this.check('INDENT') && !this.check('DEDENT') && !this.isAtEnd()) {
      if (this.check('NUMBER')) {
        values.push(this.advance().value)
      } else if (this.check('STRING')) {
        values.push(this.advance().value)
      } else if (this.check('IDENTIFIER')) {
        // Could be a value or next property
        // For now, take it as value
        values.push(this.advance().value)
        break
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

    if (!this.check('INDENT')) return
    this.advance()

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines()

      if (this.check('DEDENT')) break

      // key action
      if (this.check('IDENTIFIER')) {
        const key = this.advance()
        const actions: Action[] = []

        while (!this.check('NEWLINE') && !this.isAtEnd()) {
          if (this.check('IDENTIFIER')) {
            const action = this.parseAction()
            if (action) actions.push(action)
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

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++
    return this.tokens[this.pos - 1]
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) return this.advance()
    throw new Error(`Expected ${type} but got ${this.current()?.type} at line ${this.current()?.line}`)
  }

  private isAtEnd(): boolean {
    return this.current()?.type === 'EOF'
  }
}

export function parse(source: string): AST {
  const tokens = tokenize(source)
  return new Parser(tokens).parse()
}
