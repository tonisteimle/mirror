/**
 * State reference syntax tests
 * Tests the ElementName.state: targetState syntax for when dependencies
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { renderMirror } from '../helpers/test-api'

describe('State Reference Syntax', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  it('should parse ElementName.state: targetState syntax', () => {
    const code = `
Btn: pad 12, bg #333
  on:
    bg blue
  onclick: toggle()

Label: col #888
  "Off"
  active:
    col white
    "On"

Frame
  Btn name trigger
  Label
    trigger.on:
      active
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    // Check that the instance state has targetState captured
    const frame = ast.instances.find(i => i.component === 'Frame')
    const label = frame?.children?.find((c: any) => c.component === 'Label')
    const instanceState = (label as any)?.states?.[0]

    expect(instanceState.name).toBe('_trigger_on')
    expect(instanceState.when).toEqual({ target: 'trigger', state: 'on' })
    expect(instanceState.targetState).toBe('active')
  })

  it('should generate correct IR with when dependency transition', () => {
    const code = `
Label: col #888
  "Off"
  active:
    col white
    "On"

Frame
  Button name trigger
    onclick: toggle()
  Label
    trigger.on:
      active
`
    const ast = parse(code)
    const ir = toIR(ast)
    const labelNode = ir.nodes[0]?.children?.find((c: any) => c.name === 'Label')

    // Initial state should be default (not the synthetic _trigger_on)
    expect(labelNode?.stateMachine?.initial).toBe('default')

    // Should have transition to 'active' (not _trigger_on)
    const whenTransition = labelNode?.stateMachine?.transitions?.find(
      (t: any) => t.when
    )
    expect(whenTransition?.to).toBe('active')
    expect(whenTransition?.when).toEqual({ target: 'trigger', state: 'on' })
  })

  it('should trigger state change when dependency changes', async () => {
    const code = `
SearchStatus: col #888, fs 12, name Status
  "Waiting..."
  searching:
    col #2563eb
    "Searching..."

SearchBox: hor, gap 8
  Input placeholder "Search", name SearchInput
    searching:
      bg #252525
    onkeydown enter: toggle()

Frame gap 12
  SearchBox
  SearchStatus
    SearchInput.searching:
      searching
`
    const { api, cleanup: c } = await renderMirror(code)
    cleanup = c

    const input = api.findByName('SearchInput')
    const status = api.findByName('Status')

    // Initial state should be default
    expect(api.getState(input!)).toBe('default')
    expect(api.getState(status!)).toBe('default')
    expect(status?.textContent).toContain('Waiting')

    // Press Enter on input to trigger state change
    api.triggerKey(input!, 'enter')

    // Wait for MutationObserver to fire (it's async)
    await new Promise(resolve => setTimeout(resolve, 10))

    // Both should now be in searching state
    expect(api.getState(input!)).toBe('searching')
    expect(api.getState(status!)).toBe('searching')
    expect(status?.textContent).toContain('Searching')
  })

  it('should transition back when dependency returns to initial state', async () => {
    const code = `
StatusLabel: name Status
  "Default"
  active:
    "Active"

TriggerBtn: name Trigger
  active toggle onclick:
    bg blue

Frame
  TriggerBtn
  StatusLabel
    Trigger.active:
      active
`
    const { api, cleanup: c } = await renderMirror(code)
    cleanup = c

    const trigger = api.findByName('Trigger')
    const status = api.findByName('Status')

    // Initial state
    expect(api.getState(trigger!)).toBe('default')
    expect(api.getState(status!)).toBe('default')

    // First click: trigger becomes active
    api.trigger(trigger!, 'click')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(api.getState(trigger!)).toBe('active')
    expect(api.getState(status!)).toBe('active')

    // Second click: trigger returns to default (toggle)
    api.trigger(trigger!, 'click')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(api.getState(trigger!)).toBe('default')
    expect(api.getState(status!)).toBe('default')
  })
})
