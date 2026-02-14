import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Segment Primitive', () => {
  it('should parse Segment with length constraint', () => {
    const input = `Segment length 4 type digits`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)

    const segment = result.nodes[0]
    expect(segment.name).toBe('Segment')
    expect(segment.properties.length).toBe(4)
    expect(segment.properties.type).toBe('digits')
  })

  it('should parse Segment with mask property', () => {
    const input = `Segment length 1 type digits mask`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const segment = result.nodes[0]
    expect(segment.properties.mask).toBe(true)
  })

  it('should parse Segment with pattern', () => {
    const input = `Segment length 2 pattern "0[1-9]|1[0-2]"`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const segment = result.nodes[0]
    expect(segment.properties.pattern).toBe('0[1-9]|1[0-2]')
  })

  it('should parse onfill event', () => {
    const input = `Segment length 4 onfill focus next`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const segment = result.nodes[0]
    expect(segment.eventHandlers).toHaveLength(1)
    expect(segment.eventHandlers![0].event).toBe('onfill')
    expect(segment.eventHandlers![0].actions[0]).toHaveProperty('type', 'focus')
    expect(segment.eventHandlers![0].actions[0]).toHaveProperty('target', 'next')
  })

  it('should parse onempty event', () => {
    const input = `Segment length 4 onempty focus prev`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const segment = result.nodes[0]
    expect(segment.eventHandlers).toHaveLength(1)
    expect(segment.eventHandlers![0].event).toBe('onempty')
  })

  it('should parse oncomplete event', () => {
    const input = `PinInput hor gap 8
  Segment length 1 type digits
  Segment length 1 type digits
  oncomplete show Success`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const pinInput = result.nodes[0]
    expect(pinInput.children).toHaveLength(2)
    expect(pinInput.eventHandlers).toHaveLength(1)
    expect(pinInput.eventHandlers![0].event).toBe('oncomplete')
  })

  it('should parse named Segment definition', () => {
    const input = `Segment DigitSegment: length 1 type digits w 48 h 56`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    // Definitions with : go to registry, not nodes
    const template = result.registry.get('DigitSegment')
    expect(template).toBeDefined()
    expect(template!.properties._primitiveType).toBe('Segment')
    expect(template!.properties.length).toBe(1)
  })

  it('should render named Segment instance', () => {
    const input = `Segment DigitSegment: length 1 type digits w 48 h 56

DigitSegment`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    // Instance should be in nodes
    const segment = result.nodes[0]
    expect(segment.name).toBe('DigitSegment')
    expect(segment.properties._primitiveType).toBe('Segment')
    expect(segment.properties.length).toBe(1)
  })

  it('should parse complete PIN input example', () => {
    const input = `PinInput: hor gap 8
  Segment: length 1 type digits w 48 h 56 align center size 24
    onfill focus next
    onempty focus prev

PinInput segments 4`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    // First node is the definition
    const definition = result.nodes[0]
    expect(definition.name).toBe('PinInput')
    expect(definition.children).toHaveLength(1)

    const segment = definition.children[0]
    expect(segment.name).toBe('Segment')
    expect(segment.properties.length).toBe(1)
    expect(segment.eventHandlers).toHaveLength(2)
  })
})
