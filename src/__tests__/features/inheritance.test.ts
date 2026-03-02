import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { parse } from '../../parser/parser'

describe('Inheritance syntax: ComponentName as BaseComponent:', () => {
  it('should tokenize the as syntax correctly', () => {
    const code = 'DangerButton as Button: col #EF4444'
    const tokens = tokenize(code).filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF')

    // Lexer produces COMPONENT_NAME for first, then as keyword, then COMPONENT_DEF for the base (because of following colon)
    expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'DangerButton' })
    expect(tokens[1]).toMatchObject({ type: 'KEYWORD', value: 'as' })
    expect(tokens[2]).toMatchObject({ type: 'COMPONENT_DEF', value: 'Button' })
    // Properties follow
    expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'col' })
    expect(tokens[4]).toMatchObject({ type: 'COLOR', value: '#EF4444' })
  })

  it('should parse inheritance and apply base properties', () => {
    const code = `
Button: hor cen gap 8 pad 12 rad 8 col #3B82F6

DangerButton as Button: col #EF4444

DangerButton
`
    const result = parse(code)

    // Check registry has both components
    expect(result.registry.has('Button')).toBe(true)
    expect(result.registry.has('DangerButton')).toBe(true)

    // Check DangerButton inherited from Button but overrides col
    const dangerBtn = result.registry.get('DangerButton')!
    expect(dangerBtn.properties.hor).toBe(true)
    expect(dangerBtn.properties.gap).toBe(8)
    expect(dangerBtn.properties.pad).toBe(12)
    expect(dangerBtn.properties.rad).toBe(8)
    expect(dangerBtn.properties.col).toBe('#EF4444') // Overridden
  })

  it('should support as syntax for primitives', () => {
    const code = `
Email as Input: pad 12, col #333
`
    const result = parse(code)

    expect(result.registry.has('Email')).toBe(true)
    const email = result.registry.get('Email')!
    expect(email.properties._primitiveType).toBe('Input')
    expect(email.properties.pad).toBe(12)
    expect(email.properties.col).toBe('#333')
  })

  it('should support as syntax for custom components', () => {
    const code = `
BaseText: col #999 pad 8

Label as BaseText: col #333
`
    const result = parse(code)

    expect(result.registry.has('BaseText')).toBe(true)
    expect(result.registry.has('Label')).toBe(true)

    const label = result.registry.get('Label')!
    // Should inherit pad from BaseText
    expect(label.properties.pad).toBe(8)
    // Should override col
    expect(label.properties.col).toBe('#333')
  })
})
