import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Rating Pattern', () => {
  it('should parse highlight self-and-before action', () => {
    const input = `Star: pad 8
  onhover highlight self-and-before`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const star = result.registry.get('Star')
    expect(star?.eventHandlers).toHaveLength(1)
    expect(star?.eventHandlers![0].actions[0]).toHaveProperty('type', 'highlight')
    expect(star?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self-and-before')
  })

  it('should parse select self-and-before action', () => {
    const input = `Star: pad 8
  onclick select self-and-before`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const star = result.registry.get('Star')
    expect(star?.eventHandlers).toHaveLength(1)
    expect(star?.eventHandlers![0].actions[0]).toHaveProperty('type', 'select')
    expect(star?.eventHandlers![0].actions[0]).toHaveProperty('target', 'self-and-before')
  })

  it('should parse highlight none action for clearing', () => {
    const input = `RatingContainer: hor gap 4
  onhover highlight none`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const container = result.registry.get('RatingContainer')
    expect(container?.eventHandlers).toHaveLength(1)
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('type', 'highlight')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('target', 'none')
  })

  it('should parse highlight all action', () => {
    const input = `RatingContainer: hor gap 4
  onclick highlight all`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const container = result.registry.get('RatingContainer')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('type', 'highlight')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('target', 'all')
  })

  it('should parse select all action', () => {
    const input = `RatingContainer: hor gap 4
  onclick select all`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const container = result.registry.get('RatingContainer')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('type', 'select')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('target', 'all')
  })

  it('should parse select none action for clearing', () => {
    const input = `RatingContainer: hor gap 4
  onclick select none`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const container = result.registry.get('RatingContainer')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('type', 'select')
    expect(container?.eventHandlers![0].actions[0]).toHaveProperty('target', 'none')
  })

  it('should parse complete rating pattern with highlight and select', () => {
    const input = `Star: pad 8 icon "star"
  state highlight
    col #FBBF24
  state select
    col #F59E0B
  onhover highlight self-and-before
  onclick select self-and-before

RatingContainer: hor gap 4
  - Star
  - Star
  - Star
  - Star
  - Star`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const star = result.registry.get('Star')
    expect(star?.states).toHaveLength(2)
    expect(star?.states![0].name).toBe('highlight')
    expect(star?.states![1].name).toBe('select')
    expect(star?.eventHandlers).toHaveLength(2)
  })
})
