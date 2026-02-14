import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Tabs Pattern', () => {
  it('should parse component with active state', () => {
    const input = `NavTab: pad 8 16
  state active
    bg #3B82F6`
    const result = parse(input)

    // Debug: print actual errors
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors)
    }

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('NavTab')
    expect(tab?.states).toHaveLength(1)
    expect(tab?.states![0].name).toBe('active')
  })

  it('should parse onclick change to state', () => {
    const input = `NavTab: pad 8 16
  onclick change self to active`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('NavTab')
    expect(tab?.eventHandlers).toHaveLength(1)
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('type', 'change')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('toState', 'active')
  })

  it('should parse tab list with keyboard navigation', () => {
    const input = `NavList: hor gap 0
  onkeydown arrow-right highlight next
  onkeydown arrow-left highlight prev`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const navList = result.registry.get('NavList')
    expect(navList?.eventHandlers).toHaveLength(2)
    expect(navList?.eventHandlers![0].modifier).toBe('arrow-right')
    expect(navList?.eventHandlers![1].modifier).toBe('arrow-left')
  })

  // New action tests for activate/deactivate patterns
  it('should parse activate self action', () => {
    const input = `Tab: pad 12
  onclick activate self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('Tab')
    expect(tab?.eventHandlers).toHaveLength(1)
    expect(tab?.eventHandlers![0].event).toBe('onclick')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('type', 'activate')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self')
  })

  it('should parse deactivate-siblings action', () => {
    const input = `Tab: pad 12
  onclick deactivate-siblings`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('Tab')
    expect(tab?.eventHandlers).toHaveLength(1)
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('type', 'deactivate-siblings')
  })

  it('should parse combined activate and deactivate-siblings', () => {
    const input = `Tab: pad 12
  onclick activate self, deactivate-siblings`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('Tab')
    expect(tab?.eventHandlers).toHaveLength(1)
    expect(tab?.eventHandlers![0].actions).toHaveLength(2)
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('type', 'activate')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self')
    expect(tab?.eventHandlers![0].actions[1]).toHaveProperty('type', 'deactivate-siblings')
  })

  it('should parse toggle-state action for accordion', () => {
    const input = `AccordionItem: ver
  Header onclick toggle-state`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const item = result.registry.get('AccordionItem')
    const header = item?.children.find(c => c.name === 'Header')
    expect(header?.eventHandlers).toHaveLength(1)
    expect(header?.eventHandlers![0].actions[0]).toHaveProperty('type', 'toggle-state')
  })

  it('should parse deactivate action', () => {
    const input = `Tab: pad 12
  onclick deactivate self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const tab = result.registry.get('Tab')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('type', 'deactivate')
    expect(tab?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self')
  })

  it('should parse clear-selection action', () => {
    const input = `Button: pad 12
  onclick clear-selection`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const button = result.registry.get('Button')
    expect(button?.eventHandlers![0].actions[0]).toHaveProperty('type', 'clear-selection')
  })

  it('should parse deselect self action', () => {
    const input = `Item: pad 12
  onclick deselect self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const item = result.registry.get('Item')
    expect(item?.eventHandlers![0].actions[0]).toHaveProperty('type', 'deselect')
    expect(item?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self')
  })

  it('should parse validate action', () => {
    const input = `Button: pad 12
  onclick validate Form`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const button = result.registry.get('Button')
    expect(button?.eventHandlers![0].actions[0]).toHaveProperty('type', 'validate')
    expect(button?.eventHandlers![0].actions[0]).toHaveProperty('target', 'Form')
  })

  it('should parse reset action', () => {
    const input = `Button: pad 12
  onclick reset Form`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const button = result.registry.get('Button')
    expect(button?.eventHandlers![0].actions[0]).toHaveProperty('type', 'reset')
    expect(button?.eventHandlers![0].actions[0]).toHaveProperty('target', 'Form')
  })
})
