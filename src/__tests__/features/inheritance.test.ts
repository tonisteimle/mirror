import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { parse } from '../../parser/parser'

describe('New inheritance syntax: ComponentName from BaseComponent:', () => {
  it('should tokenize the new syntax correctly', () => {
    const code = 'DangerButton from Button: col #EF4444'
    const tokens = tokenize(code).filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF')

    expect(tokens[0]).toMatchObject({ type: 'COMPONENT_DEF', value: 'DangerButton' })
    expect(tokens[1]).toMatchObject({ type: 'KEYWORD', value: 'from' })
    expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Button' })
    expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'col' })
    expect(tokens[4]).toMatchObject({ type: 'COLOR', value: '#EF4444' })
  })

  it('should parse inheritance and apply base properties', () => {
    const code = `
Button: hor cen gap 8 pad 12 rad 8 col #3B82F6

DangerButton from Button: col #EF4444

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

  it('should still support old syntax for backwards compatibility', () => {
    const code = `
Button: hor cen gap 8

OldStyleButton: from Button col #FF0000
`
    const result = parse(code)

    expect(result.registry.has('OldStyleButton')).toBe(true)
    const oldBtn = result.registry.get('OldStyleButton')!
    expect(oldBtn.properties.hor).toBe(true)
    expect(oldBtn.properties.gap).toBe(8)
    expect(oldBtn.properties.col).toBe('#FF0000')
  })
})
