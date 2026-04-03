/**
 * Tests for state blocks with triggers and modifiers
 *
 * New interaction model syntax:
 *   state [modifier] [trigger]:
 *     properties
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('State blocks with triggers', () => {
  it('parses simple state block (existing syntax)', () => {
    const code = `
Box
  selected:
    bg #fff
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('selected')
    expect(instance.states![0].trigger).toBeUndefined()
    expect(instance.states![0].modifier).toBeUndefined()
  })

  it('parses state with onclick trigger', () => {
    const code = `
Box
  selected onclick:
    bg #fff
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('selected')
    expect(instance.states![0].trigger).toBe('onclick')
    expect(instance.states![0].modifier).toBeUndefined()
  })

  it('parses state with exclusive modifier and onclick trigger', () => {
    const code = `
Tab
  selected exclusive onclick:
    bg #fff
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('selected')
    expect(instance.states![0].trigger).toBe('onclick')
    expect(instance.states![0].modifier).toBe('exclusive')
  })

  it('parses state with toggle modifier', () => {
    const code = `
Dropdown
  open toggle onclick:
    visible
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('open')
    expect(instance.states![0].trigger).toBe('onclick')
    expect(instance.states![0].modifier).toBe('toggle')
  })

  it('parses state with onkeydown escape trigger', () => {
    const code = `
Modal
  closed onkeydown escape:
    hidden
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('closed')
    expect(instance.states![0].trigger).toBe('onkeydown escape')
    expect(instance.states![0].modifier).toBeUndefined()
  })

  it('parses state with toggle modifier and keyboard trigger', () => {
    const code = `
Sidebar
  open toggle onkeydown escape:
    x 0
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('open')
    expect(instance.states![0].trigger).toBe('onkeydown escape')
    expect(instance.states![0].modifier).toBe('toggle')
  })

  it('parses multiple states with different triggers', () => {
    const code = `
Dropdown
  closed:
    hidden
  open onclick:
    visible
  closed onkeydown escape:
    hidden
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(3)

    expect(instance.states![0].name).toBe('closed')
    expect(instance.states![0].trigger).toBeUndefined()

    expect(instance.states![1].name).toBe('open')
    expect(instance.states![1].trigger).toBe('onclick')

    expect(instance.states![2].name).toBe('closed')
    expect(instance.states![2].trigger).toBe('onkeydown escape')
  })

  it('parses state with initial modifier', () => {
    const code = `
Modal
  open initial onclick:
    visible
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('open')
    expect(instance.states![0].trigger).toBe('onclick')
    expect(instance.states![0].modifier).toBe('initial')
  })

  it('parses hover state (system state, no trigger needed)', () => {
    const code = `
Button
  hover:
    bg #333
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('hover')
    expect(instance.states![0].trigger).toBeUndefined()
  })

  it('parses state block with inline properties after colon', () => {
    const code = `
Tab
  selected exclusive onclick: bg #fff, col #000
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('selected')
    expect(instance.states![0].trigger).toBe('onclick')
    expect(instance.states![0].modifier).toBe('exclusive')
    expect(instance.states![0].properties).toHaveLength(2)
  })
})

describe('State blocks with when dependencies', () => {
  it('parses simple when clause', () => {
    const code = `
Backdrop
  visible when Menu open:
    opacity 0.5
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].name).toBe('visible')
    expect(instance.states![0].when).toBeDefined()
    expect(instance.states![0].when!.target).toBe('Menu')
    expect(instance.states![0].when!.state).toBe('open')
  })

  it('parses when clause with or condition', () => {
    const code = `
Backdrop
  visible when Menu open or Sidebar open:
    opacity 0.5
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].when).toBeDefined()
    expect(instance.states![0].when!.target).toBe('Menu')
    expect(instance.states![0].when!.state).toBe('open')
    expect(instance.states![0].when!.condition).toBe('or')
    expect(instance.states![0].when!.next).toBeDefined()
    expect(instance.states![0].when!.next!.target).toBe('Sidebar')
    expect(instance.states![0].when!.next!.state).toBe('open')
  })

  it('parses when clause with and condition', () => {
    const code = `
SubmitButton
  enabled when Form valid and User loggedIn:
    opacity 1
`
    const ast = parse(code)
    const instance = ast.instances[0]
    expect(instance.states).toHaveLength(1)
    expect(instance.states![0].when).toBeDefined()
    expect(instance.states![0].when!.target).toBe('Form')
    expect(instance.states![0].when!.state).toBe('valid')
    expect(instance.states![0].when!.condition).toBe('and')
    expect(instance.states![0].when!.next!.target).toBe('User')
    expect(instance.states![0].when!.next!.state).toBe('loggedIn')
  })

  it('parses when with multiple chained conditions', () => {
    const code = `
Panel
  visible when A open or B open or C open:
    opacity 1
`
    const ast = parse(code)
    const instance = ast.instances[0]
    const when = instance.states![0].when!
    expect(when.target).toBe('A')
    expect(when.condition).toBe('or')
    expect(when.next!.target).toBe('B')
    expect(when.next!.condition).toBe('or')
    expect(when.next!.next!.target).toBe('C')
    expect(when.next!.next!.state).toBe('open')
  })
})
