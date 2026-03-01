import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { clearDefaultsCache } from '../../library/defaults-loader'

describe('defaults.mirror loading', () => {
  beforeEach(() => {
    clearDefaultsCache()
  })

  it('parser loads defaults and applies them', () => {
    // Defaults are loaded via the parser's internal mechanism
    // We verify this by checking that components get their default properties
    const navResult = parse('Nav')
    const cardResult = parse('Card')
    const formResult = parse('FormGroup')

    // All should have properties from defaults.mirror
    expect(navResult.nodes[0].properties.ver).toBe(true)
    expect(cardResult.nodes[0].properties.bg).toBe('#252525')
    expect(formResult.nodes[0].properties.gap).toBe(8)
  })

  it('Nav gets vertical and gap from defaults', () => {
    const result = parse('Nav')
    const nav = result.nodes[0]
    expect(nav.properties.ver).toBe(true)
    expect(nav.properties.gap).toBe(12)
  })

  it('Card gets styling from defaults', () => {
    const result = parse('Card')
    const card = result.nodes[0]
    expect(card.properties.bg).toBe('#252525')
    expect(card.properties.rad).toBe(12)
    expect(card.properties.gap).toBe(8)
  })

  it('user properties override defaults', () => {
    const result = parse('Card bg #FF0000')
    const card = result.nodes[0]
    expect(card.properties.bg).toBe('#FF0000') // Override
    expect(card.properties.rad).toBe(12) // Keep default
  })

  it('FormGroup has vertical layout with gap', () => {
    const result = parse('FormGroup')
    const formGroup = result.nodes[0]
    expect(formGroup.properties.ver).toBe(true)
    expect(formGroup.properties.gap).toBe(8)
  })
})
