import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Comma-chained actions', () => {
  it('should parse multiple actions separated by comma', () => {
    const input = `Item onclick select self, close Menu "Click me"`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)

    const item = result.nodes[0]
    expect(item.name).toBe('Item')
    expect(item.eventHandlers).toHaveLength(1)

    const handler = item.eventHandlers![0]
    expect(handler.event).toBe('onclick')
    expect(handler.actions).toHaveLength(2)

    const action1 = handler.actions[0]
    expect(action1).toHaveProperty('type', 'select')
    expect(action1).toHaveProperty('target', 'self')

    const action2 = handler.actions[1]
    expect(action2).toHaveProperty('type', 'close')
    expect(action2).toHaveProperty('target', 'Menu')
  })

  it('should parse three comma-chained actions', () => {
    const input = `Trigger onclick toggle A, toggle B, toggle C`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const trigger = result.nodes[0]
    expect(trigger.eventHandlers).toHaveLength(1)

    const handler = trigger.eventHandlers![0]
    expect(handler.actions).toHaveLength(3)

    expect(handler.actions[0]).toHaveProperty('type', 'toggle')
    expect(handler.actions[0]).toHaveProperty('target', 'A')
    expect(handler.actions[1]).toHaveProperty('type', 'toggle')
    expect(handler.actions[1]).toHaveProperty('target', 'B')
    expect(handler.actions[2]).toHaveProperty('type', 'toggle')
    expect(handler.actions[2]).toHaveProperty('target', 'C')
  })

  it('should parse keyboard event with comma-chained actions', () => {
    const input = `Menu onkeydown enter select highlighted, close self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const menu = result.nodes[0]
    const handler = menu.eventHandlers![0]

    expect(handler.event).toBe('onkeydown')
    expect(handler.modifier).toBe('enter')
    expect(handler.actions).toHaveLength(2)
  })
})
