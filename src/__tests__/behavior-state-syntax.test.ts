import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Behavior State Syntax', () => {
  it('parses highlight state block', () => {
    const input = `Item: pad 12 16
  highlight
    bg #3B82F6`
    const result = parse(input)

    const template = result.registry.get('Item')
    expect(template).toBeDefined()
    expect(template?.states).toHaveLength(1)
    expect(template?.states?.[0].name).toBe('highlight')
    expect(template?.states?.[0].properties.bg).toBe('#3B82F6')
  })

  it('parses select state block', () => {
    const input = `Item: pad 12 16
  select
    bg #2563EB
    col white`
    const result = parse(input)

    const template = result.registry.get('Item')
    expect(template?.states).toHaveLength(1)
    expect(template?.states?.[0].name).toBe('select')
    expect(template?.states?.[0].properties.bg).toBe('#2563EB')
  })

  it('parses both highlight and select states', () => {
    const input = `Item: pad 12 16
  highlight
    bg #3B82F6
  select
    bg #2563EB`
    const result = parse(input)

    const template = result.registry.get('Item')
    expect(template?.states).toHaveLength(2)
    expect(template?.states?.[0].name).toBe('highlight')
    expect(template?.states?.[1].name).toBe('select')
  })

  it('parses Menu with highlight action and state', () => {
    const input = `Menu: ver bg #1E1E2E pad 8
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  Item: pad 12 16
    highlight
      bg #3B82F6

Menu
  - "Dashboard"
  - "Profile"`
    const result = parse(input)

    // Check Menu template has events
    const menuTemplate = result.registry.get('Menu')
    expect(menuTemplate?.eventHandlers).toHaveLength(2)
    expect(menuTemplate?.eventHandlers?.[0].actions[0]).toMatchObject({
      type: 'highlight',
      target: 'next'
    })

    // Check Item template has highlight state
    const itemTemplate = result.registry.get('Menu.Item')
    expect(itemTemplate?.states).toHaveLength(1)
    expect(itemTemplate?.states?.[0].name).toBe('highlight')

    // Check rendered Menu instance
    expect(result.nodes).toHaveLength(1)
    const menu = result.nodes[0]
    expect(menu.eventHandlers).toHaveLength(2)

    // Check items have highlight state inherited
    const items = menu.children.filter(c => c.name === 'Item')
    expect(items).toHaveLength(3) // template + 2 bare strings
    items.forEach(item => {
      expect(item.states?.find(s => s.name === 'highlight')).toBeDefined()
    })
  })

  it('does not confuse highlight action with highlight state block', () => {
    const input = `Menu:
  onkeydown arrow-down highlight next`
    const result = parse(input)

    const template = result.registry.get('Menu')
    // Should have event handler, not state
    expect(template?.eventHandlers).toHaveLength(1)
    expect(template?.states).toBeUndefined()
  })
})
