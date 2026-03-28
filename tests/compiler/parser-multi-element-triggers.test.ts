import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/parser'

describe('Multi-Element Triggers', () => {
  it('parses multi-element trigger with block syntax', () => {
    const code = `
MenuButton
  onclick:
    Menu open
    Backdrop visible
`
    const ast = parse(code)
    const button = ast.instances[0]

    expect(button.events).toHaveLength(1)
    const event = button.events[0]
    expect(event.name).toBe('onclick')
    expect(event.actions).toHaveLength(2)

    // Multi-element triggers use Target action format
    // Menu open → action.name='Menu', action.target='open'
    // (The target is the element name, action is the state to transition to)
    expect(event.actions[0].name).toBe('Menu')
    expect(event.actions[0].target).toBe('open')

    expect(event.actions[1].name).toBe('Backdrop')
    expect(event.actions[1].target).toBe('visible')
  })

  it('parses single action on same line', () => {
    const code = `
Button onclick toggle Menu
`
    const ast = parse(code)
    const button = ast.instances[0]

    expect(button.events).toHaveLength(1)
    const event = button.events[0]
    expect(event.name).toBe('onclick')
    expect(event.actions).toHaveLength(1)
    expect(event.actions[0].name).toBe('toggle')
    expect(event.actions[0].target).toBe('Menu')
  })

  it('parses inline event syntax', () => {
    const code = `
Button
  onclick show Toast
`
    const ast = parse(code)
    const button = ast.instances[0]

    expect(button.events).toHaveLength(1)
    const event = button.events[0]
    expect(event.name).toBe('onclick')
    expect(event.actions).toHaveLength(1)
    expect(event.actions[0].name).toBe('show')
    expect(event.actions[0].target).toBe('Toast')
  })

  it('parses three element triggers', () => {
    const code = `
OpenButton
  onclick:
    Dialog open
    Backdrop visible
    Body scroll-locked
`
    const ast = parse(code)
    const button = ast.instances[0]

    expect(button.events).toHaveLength(1)
    const event = button.events[0]
    expect(event.actions).toHaveLength(3)

    // Multi-element format: Element state → action.name=Element, action.target=state
    expect(event.actions[0].name).toBe('Dialog')
    expect(event.actions[0].target).toBe('open')
    expect(event.actions[1].name).toBe('Backdrop')
    expect(event.actions[1].target).toBe('visible')
    expect(event.actions[2].name).toBe('Body')
    expect(event.actions[2].target).toBe('scroll-locked')
  })
})
