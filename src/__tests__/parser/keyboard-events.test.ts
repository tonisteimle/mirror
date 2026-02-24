import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Keyboard Events', () => {
  it('should parse onkeydown with escape modifier', () => {
    const input = `Dropdown: ver pad 8
  onkeydown escape close self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const dropdown = result.registry.get('Dropdown')
    expect(dropdown?.eventHandlers).toHaveLength(1)
    expect(dropdown?.eventHandlers![0].event).toBe('onkeydown')
    expect(dropdown?.eventHandlers![0].key).toBe('escape')
  })

  it('should parse onkeydown with arrow-down modifier', () => {
    const input = `Menu: ver pad 8
  onkeydown arrow-down highlight next`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const menu = result.registry.get('Menu')
    expect(menu?.eventHandlers).toHaveLength(1)
    expect(menu?.eventHandlers![0].event).toBe('onkeydown')
    expect(menu?.eventHandlers![0].key).toBe('arrow-down')
    expect(menu?.eventHandlers![0].actions[0]).toHaveProperty('type', 'highlight')
    expect(menu?.eventHandlers![0].actions[0]).toHaveProperty('target', 'next')
  })

  it('should parse onkeydown with enter modifier', () => {
    const input = `Dropdown: ver pad 8
  onkeydown enter select highlighted`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const dropdown = result.registry.get('Dropdown')
    expect(dropdown?.eventHandlers).toHaveLength(1)
    expect(dropdown?.eventHandlers![0].event).toBe('onkeydown')
    expect(dropdown?.eventHandlers![0].key).toBe('enter')
    expect(dropdown?.eventHandlers![0].actions[0]).toHaveProperty('type', 'select')
    expect(dropdown?.eventHandlers![0].actions[0]).toHaveProperty('target', 'highlighted')
  })

  it('should parse multiple keyboard events', () => {
    const input = `Menu: ver pad 8
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown escape close self
  onkeydown enter select highlighted`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const menu = result.registry.get('Menu')
    expect(menu?.eventHandlers).toHaveLength(4)
    expect(menu?.eventHandlers![0].key).toBe('arrow-down')
    expect(menu?.eventHandlers![1].key).toBe('arrow-up')
    expect(menu?.eventHandlers![2].key).toBe('escape')
    expect(menu?.eventHandlers![3].key).toBe('enter')
  })

  it('should parse centralized keyboard events', () => {
    const input = `Menu: ver pad 8
  Item: pad 8 12

Menu

events
  Menu onkeydown escape
    close self
  Menu onkeydown arrow-down
    highlight next`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    expect(result.centralizedEvents).toHaveLength(2)
    expect(result.centralizedEvents[0].event).toBe('onkeydown')
    expect(result.centralizedEvents[0].key).toBe('escape')
    expect(result.centralizedEvents[1].event).toBe('onkeydown')
    expect(result.centralizedEvents[1].key).toBe('arrow-down')
  })

  it('should parse home and end modifiers', () => {
    const input = `List: ver
  onkeydown home highlight first
  onkeydown end highlight last`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const list = result.registry.get('List')
    expect(list?.eventHandlers).toHaveLength(2)
    expect(list?.eventHandlers![0].key).toBe('home')
    expect(list?.eventHandlers![0].actions[0]).toHaveProperty('target', 'first')
    expect(list?.eventHandlers![1].key).toBe('end')
    expect(list?.eventHandlers![1].actions[0]).toHaveProperty('target', 'last')
  })
})
