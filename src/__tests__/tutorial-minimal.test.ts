/**
 * Minimal Tutorial Test - to find what works and what doesn't
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Tutorial Minimal Tests', () => {
  it('basic tokens work', () => {
    const code = `$bg-app: #0A0A0F
$primary: #3B82F6
$space-sm: 8

Box col $bg-app pad $space-sm`

    const result = parse(code)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    console.log('Errors:', result.errors)
    expect(errors).toHaveLength(0)
    console.log('Tokens:', Array.from(result.tokens.entries()))
    // Tokens are stored without $ prefix
    expect(result.tokens.get('bg-app')).toBe('#0A0A0F')
  })

  it('component definitions work', () => {
    const code = `NavItem: hor gap 10 ver-cen pad 10 12 rad 8

NavItem "Test"`

    const result = parse(code)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    console.log('Errors:', result.errors)
    expect(errors).toHaveLength(0)
    expect(result.registry.has('NavItem')).toBe(true)
  })

  it('inline if-then-else works', () => {
    const code = `$active: true

Box pad 12 if $active then col #FF0000 else col #0000FF`

    const result = parse(code)
    console.log('Errors:', result.errors)
    console.log('Box properties:', JSON.stringify(result.nodes[0]?.properties))
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })

  it('onclick assign works - on new line', () => {
    const code = `$count: 0

Button "Click"
  onclick assign $count to $count + 1`

    const result = parse(code)
    console.log('Errors:', result.errors)
    console.log('Button eventHandlers:', result.nodes[0]?.eventHandlers)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
    expect(result.nodes[0].eventHandlers).toHaveLength(1)
  })

  it('each loop works', () => {
    const code = `List ver
  each $item in $items
    Card $item.name`

    const result = parse(code)
    console.log('Errors:', result.errors)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })

  it('block if works', () => {
    const code = `$visible: true

Box ver
  if $visible
    Text "Hello"`

    const result = parse(code)
    console.log('Errors:', result.errors)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })

  it('if not works', () => {
    const code = `$collapsed: false

Box ver
  if not $collapsed
    Text "Visible"`

    const result = parse(code)
    console.log('Errors:', result.errors)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })

  it('nested component with slot children works', () => {
    const code = `StatCard: ver gap 8 pad 20
  Label: size 13
  Value: size 28 weight 600

StatCard
  Label "Projects"
  Value "12"`

    const result = parse(code)
    console.log('Errors:', result.errors)
    const errors = result.errors.filter(e => typeof e === 'object' || !e.startsWith('Warning:'))
    expect(errors).toHaveLength(0)
  })
})
