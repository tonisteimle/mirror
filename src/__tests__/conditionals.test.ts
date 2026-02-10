import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import { tokenize } from '../parser/lexer'

describe('V3: Conditionals and Iterators', () => {
  describe('Lexer', () => {
    it('should tokenize dot-notation in TOKEN_REF', () => {
      const tokens = tokenize('$user.avatar')
      const tokenRef = tokens.find(t => t.type === 'TOKEN_REF')
      expect(tokenRef).toBeDefined()
      expect(tokenRef?.value).toBe('user.avatar')
    })

    it('should tokenize ARITHMETIC operators', () => {
      const tokens = tokenize('$count + 1')
      const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
      expect(arithmetic).toBeDefined()
      expect(arithmetic?.value).toBe('+')
    })

    it('should tokenize each and in as CONTROL', () => {
      const tokens = tokenize('each $item in $items')
      const controls = tokens.filter(t => t.type === 'CONTROL')
      expect(controls.length).toBe(2)
      expect(controls[0].value).toBe('each')
      expect(controls[1].value).toBe('in')
    })

    it('should tokenize minus as ARITHMETIC when followed by number', () => {
      const tokens = tokenize('$count - 1')
      const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
      expect(arithmetic).toBeDefined()
      expect(arithmetic?.value).toBe('-')
    })

    it('should tokenize minus as MODIFIER when followed by letter', () => {
      const tokens = tokenize('-primary')
      const modifier = tokens.find(t => t.type === 'MODIFIER')
      expect(modifier).toBeDefined()
      expect(modifier?.value).toBe('-primary')
    })
  })

  describe('Parser - Conditionals', () => {
    it('should parse if with condition', () => {
      const code = `Box
  if $isLoggedIn
    Avatar`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const box = result.nodes[0]
      expect(box.children).toHaveLength(1)

      const conditional = box.children[0]
      expect(conditional.name).toBe('_conditional')
      expect(conditional.condition).toBeDefined()
      expect(conditional.condition?.type).toBe('var')
      expect(conditional.condition?.name).toBe('isLoggedIn')
      expect(conditional.children).toHaveLength(1)
      expect(conditional.children[0].name).toBe('Avatar')
    })

    it('should parse if/else', () => {
      const code = `Box
  if $isLoggedIn
    Avatar
  else
    Button`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const box = result.nodes[0]
      const conditional = box.children[0]
      expect(conditional.name).toBe('_conditional')
      expect(conditional.children).toHaveLength(1)
      expect(conditional.children[0].name).toBe('Avatar')
      expect(conditional.elseChildren).toBeDefined()
      expect(conditional.elseChildren).toHaveLength(1)
      expect(conditional.elseChildren?.[0].name).toBe('Button')
    })

    it('should parse if with not condition', () => {
      const code = `Box
  if not $isLoggedIn
    Button`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const conditional = result.nodes[0].children[0]
      expect(conditional.condition?.type).toBe('not')
      expect(conditional.condition?.operand?.type).toBe('var')
      expect(conditional.condition?.operand?.name).toBe('isLoggedIn')
    })
  })

  describe('Parser - Iterators', () => {
    it('should parse each loop', () => {
      const code = `List
  each $item in $items
    Item`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const list = result.nodes[0]
      expect(list.children).toHaveLength(1)

      const iterator = list.children[0]
      expect(iterator.name).toBe('_iterator')
      expect(iterator.iteration).toBeDefined()
      expect(iterator.iteration?.itemVar).toBe('item')
      expect(iterator.iteration?.collectionVar).toBe('items')
      expect(iterator.children).toHaveLength(1)
      expect(iterator.children[0].name).toBe('Item')
    })

    it('should parse each with nested property access', () => {
      const code = `List
  each $item in $data.items
    Item`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const iterator = result.nodes[0].children[0]
      expect(iterator.iteration?.collectionVar).toBe('data')
      expect(iterator.iteration?.collectionPath).toEqual(['data', 'items'])
    })
  })

  describe('Parser - Expressions', () => {
    it('should parse assign action with expression', () => {
      const code = `Button
  onclick assign $count to $count + 1`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.eventHandlers).toHaveLength(1)

      const handler = button.eventHandlers?.[0]
      expect(handler?.actions).toHaveLength(1)

      const action = handler?.actions[0]
      expect(action).not.toHaveProperty('condition')
      expect((action as any).type).toBe('assign')
      expect((action as any).target).toBe('count')

      const value = (action as any).value
      expect(value.type).toBe('binary')
      expect(value.operator).toBe('+')
      expect(value.left.type).toBe('variable')
      expect(value.left.name).toBe('count')
      expect(value.right.type).toBe('literal')
      expect(value.right.value).toBe(1)
    })

    it('should parse property access in condition', () => {
      const code = `Box
  if $user.isLoggedIn
    Avatar`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const conditional = result.nodes[0].children[0]
      expect(conditional.condition?.type).toBe('var')
      expect(conditional.condition?.name).toBe('user.isLoggedIn')
    })
  })

  describe('Component Property References', () => {
    it('should resolve Component.property reference', () => {
      const code = `Card: rad 16 pad 20 col #2A2A3E
Button rad Card.rad col Card.col`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      // Card definition doesn't produce a node, only Button does
      const button = result.nodes[0]
      expect(button.name).toBe('Button')
      expect(button.properties.rad).toBe(16)
      expect(button.properties.col).toBe('#2A2A3E')
    })

    it('should resolve numeric component property reference', () => {
      const code = `Header: h 64
Content h $Header.h`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const content = result.nodes[0]
      expect(content.properties.h).toBe(64)
    })
  })

  describe('Conditional Properties', () => {
    it('should parse if/else for properties', () => {
      const code = `Button pad 12
  if $isActive
    col #3B82F6
  else
    col #6B7280`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.name).toBe('Button')
      expect(button.properties.pad).toBe(12)
      expect(button.conditionalProperties).toBeDefined()
      expect(button.conditionalProperties).toHaveLength(1)

      const condProp = button.conditionalProperties![0]
      expect(condProp.condition.type).toBe('var')
      expect(condProp.condition.name).toBe('isActive')
      expect(condProp.thenProperties.col).toBe('#3B82F6')
      expect(condProp.elseProperties?.col).toBe('#6B7280')
    })

    it('should parse multiple conditional property blocks', () => {
      const code = `Card
  if $isSelected
    col #3B82F6
  if $isHovered
    shadow 8`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const card = result.nodes[0]
      expect(card.conditionalProperties).toHaveLength(2)
      expect(card.conditionalProperties![0].thenProperties.col).toBe('#3B82F6')
      expect(card.conditionalProperties![1].thenProperties.shadow).toBe(8)
    })
  })

  describe('Integration', () => {
    it('should parse complex example with if/else, each, and events', () => {
      const code = `Box
  if $isLoggedIn
    Text "Welcome"
    Avatar
  else
    Button
      "Login"

  List
    each $item in $items
      Item
        "{$item.name}"`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const box = result.nodes[0]
      expect(box.children).toHaveLength(2)

      // Conditional
      const conditional = box.children[0]
      expect(conditional.name).toBe('_conditional')
      expect(conditional.children).toHaveLength(2) // Text and Avatar
      expect(conditional.elseChildren).toHaveLength(1) // Button

      // List with iterator
      const list = box.children[1]
      expect(list.name).toBe('List')
      expect(list.children).toHaveLength(1)

      const iterator = list.children[0]
      expect(iterator.name).toBe('_iterator')
      expect(iterator.iteration?.itemVar).toBe('item')
    })
  })

  describe('Event Access ($event)', () => {
    it('should parse $event.value in assign action', () => {
      const code = `Input
  onchange assign $inputValue to $event.value`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const input = result.nodes[0]
      expect(input.eventHandlers).toHaveLength(1)

      const handler = input.eventHandlers?.[0]
      expect(handler?.event).toBe('onchange')
      expect(handler?.actions).toHaveLength(1)

      const action = handler?.actions[0] as any
      expect(action.type).toBe('assign')
      expect(action.target).toBe('inputValue')

      const value = action.value
      expect(value.type).toBe('property_access')
      expect(value.path).toEqual(['event', 'value'])
    })

    it('should parse $event.clientX in assign action', () => {
      const code = `Button
  onclick assign $mouseX to $event.clientX`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const action = result.nodes[0].eventHandlers?.[0]?.actions[0] as any
      expect(action.value.type).toBe('property_access')
      expect(action.value.path).toEqual(['event', 'clientX'])
    })

    it('should parse $event.key in onkeydown', () => {
      const code = `Input
  onkeydown assign $lastKey to $event.key`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const handler = result.nodes[0].eventHandlers?.[0]
      expect(handler?.event).toBe('onkeydown')
    })
  })
})
