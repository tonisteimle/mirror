/**
 * Tests for state machine IR generation
 *
 * Verifies that states with triggers are correctly transformed
 * into IRStateMachine structures.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('State Machine IR Generation', () => {
  it('generates no state machine for states without triggers', () => {
    const code = `
Box
  hover:
    bg #333
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    // Should have state styles but no state machine
    expect(node.styles.some(s => s.state === 'hover')).toBe(true)
    expect(node.stateMachine).toBeUndefined()
  })

  it('generates state machine for state with onclick trigger', () => {
    const code = `
Tab
  selected onclick:
    bg #fff
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    // When all states have triggers, initial is 'default' (implicit state)
    expect(node.stateMachine!.initial).toBe('default')
    expect(node.stateMachine!.states['default']).toBeDefined()
    expect(node.stateMachine!.states['default'].styles).toHaveLength(0)
    expect(node.stateMachine!.states['selected']).toBeDefined()
    expect(node.stateMachine!.states['selected'].styles).toHaveLength(1)
    expect(node.stateMachine!.transitions).toHaveLength(1)
    expect(node.stateMachine!.transitions[0]).toMatchObject({
      to: 'selected',
      trigger: 'onclick',
    })
  })

  it('generates state machine with exclusive modifier', () => {
    const code = `
Tab
  selected exclusive onclick:
    bg #fff
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    expect(node.stateMachine!.transitions[0]).toMatchObject({
      to: 'selected',
      trigger: 'onclick',
      modifier: 'exclusive',
    })
  })

  it('generates state machine with toggle modifier', () => {
    const code = `
Dropdown
  open toggle onclick:
    visible
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    expect(node.stateMachine!.transitions[0]).toMatchObject({
      to: 'open',
      trigger: 'onclick',
      modifier: 'toggle',
    })
  })

  it('generates state machine with keyboard trigger', () => {
    const code = `
Modal
  closed onkeydown escape:
    hidden
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    expect(node.stateMachine!.transitions[0]).toMatchObject({
      to: 'closed',
      trigger: 'onkeydown',
      key: 'escape',
    })
  })

  it('generates state machine with multiple states and transitions', () => {
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
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    expect(node.stateMachine!.initial).toBe('closed')

    // Should have both states
    expect(node.stateMachine!.states['closed']).toBeDefined()
    expect(node.stateMachine!.states['open']).toBeDefined()

    // Should have two transitions
    expect(node.stateMachine!.transitions).toHaveLength(2)

    // Verify transitions
    const openTransition = node.stateMachine!.transitions.find(t => t.to === 'open')
    const closeTransition = node.stateMachine!.transitions.find(t => t.to === 'closed')

    expect(openTransition).toMatchObject({
      to: 'open',
      trigger: 'onclick',
    })

    expect(closeTransition).toMatchObject({
      to: 'closed',
      trigger: 'onkeydown',
      key: 'escape',
    })
  })

  it('uses explicit initial modifier for initial state', () => {
    const code = `
Modal
  closed:
    hidden
  open initial onclick:
    visible
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    // Even though 'closed' is first, 'open' has explicit initial modifier
    expect(node.stateMachine!.initial).toBe('open')
    expect(node.stateMachine!.states['open'].isInitial).toBe(true)
  })

  it('combines state styles from same state name', () => {
    const code = `
Button
  active:
    bg #333
  active onclick:
    col #fff
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    // Both styles should be in the same state definition
    expect(node.stateMachine!.states['active'].styles).toHaveLength(2)
  })

  it('generates state machine for when dependency', () => {
    const code = `
Backdrop
  visible when Menu open:
    opacity 0.5
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    expect(node.stateMachine!.transitions).toHaveLength(1)
    expect(node.stateMachine!.transitions[0]).toMatchObject({
      to: 'visible',
      trigger: '',
      when: {
        target: 'Menu',
        state: 'open',
      },
    })
  })

  it('generates state machine for when dependency with or condition', () => {
    const code = `
Backdrop
  visible when Menu open or Sidebar open:
    opacity 0.5
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    const transition = node.stateMachine!.transitions[0]
    expect(transition.when).toBeDefined()
    expect(transition.when!.target).toBe('Menu')
    expect(transition.when!.state).toBe('open')
    expect(transition.when!.condition).toBe('or')
    expect(transition.when!.next).toBeDefined()
    expect(transition.when!.next!.target).toBe('Sidebar')
    expect(transition.when!.next!.state).toBe('open')
  })

  it('generates state machine for when dependency with and condition', () => {
    const code = `
SubmitButton
  enabled when Form valid and User loggedIn:
    opacity 1
`
    const ast = parse(code)
    const ir = toIR(ast)
    const node = ir.nodes[0]

    expect(node.stateMachine).toBeDefined()
    const transition = node.stateMachine!.transitions[0]
    expect(transition.when).toBeDefined()
    expect(transition.when!.target).toBe('Form')
    expect(transition.when!.state).toBe('valid')
    expect(transition.when!.condition).toBe('and')
    expect(transition.when!.next!.target).toBe('User')
    expect(transition.when!.next!.state).toBe('loggedIn')
  })
})
