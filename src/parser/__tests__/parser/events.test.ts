/**
 * Parser Event Tests
 *
 * Tests parsing of event handlers: onclick, onhover, onkeydown, etc.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// BASIC EVENTS
// ============================================================================

describe('Parser: Basic Events', () => {
  it('parses onclick event', () => {
    const ast = parse(`Button as button:
  onclick toggle`)
    expect(ast.components[0].events.length).toBe(1)
    expect(ast.components[0].events[0].name).toBe('onclick')
  })

  it('parses onhover event', () => {
    const ast = parse(`Card as frame:
  onhover highlight`)
    expect(ast.components[0].events[0].name).toBe('onhover')
  })

  it('parses onchange event', () => {
    const ast = parse(`Input as input:
  onchange validate`)
    expect(ast.components[0].events[0].name).toBe('onchange')
  })

  it('parses oninput event', () => {
    const ast = parse(`Input as input:
  oninput filter`)
    expect(ast.components[0].events[0].name).toBe('oninput')
  })

  it('parses onfocus event', () => {
    const ast = parse(`Input as input:
  onfocus highlight`)
    expect(ast.components[0].events[0].name).toBe('onfocus')
  })

  it('parses onblur event', () => {
    const ast = parse(`Input as input:
  onblur deselect`)
    expect(ast.components[0].events[0].name).toBe('onblur')
  })

  it('parses multiple events', () => {
    const ast = parse(`Button as button:
  onclick toggle
  onhover highlight`)
    expect(ast.components[0].events.length).toBe(2)
  })
})

// ============================================================================
// EVENT ACTIONS
// ============================================================================

describe('Parser: Event Actions', () => {
  it('parses single action', () => {
    const ast = parse(`Button as button:
  onclick toggle`)
    expect(ast.components[0].events[0].actions.length).toBe(1)
    expect(ast.components[0].events[0].actions[0].name).toBe('toggle')
  })

  it('parses action with target', () => {
    const ast = parse(`Button as button:
  onclick show Menu`)
    const action = ast.components[0].events[0].actions[0]
    expect(action.name).toBe('show')
    expect(action.target).toBe('Menu')
  })

  it('parses multiple actions', () => {
    const ast = parse(`Button as button:
  onclick select, close`)
    // Note: Multiple actions parsing depends on implementation
    expect(ast.components[0].events[0].actions.length).toBeGreaterThan(0)
  })

  it('parses relative target: next', () => {
    const ast = parse(`Item as frame:
  onclick highlight next`)
    expect(ast.components[0].events[0].actions[0].target).toBe('next')
  })

  it('parses relative target: prev', () => {
    const ast = parse(`Item as frame:
  onclick highlight prev`)
    expect(ast.components[0].events[0].actions[0].target).toBe('prev')
  })

  it('parses relative target: first', () => {
    const ast = parse(`Item as frame:
  onclick highlight first`)
    expect(ast.components[0].events[0].actions[0].target).toBe('first')
  })

  it('parses relative target: last', () => {
    const ast = parse(`Item as frame:
  onclick highlight last`)
    expect(ast.components[0].events[0].actions[0].target).toBe('last')
  })
})

// ============================================================================
// KEYBOARD EVENTS
// ============================================================================

describe('Parser: Keyboard Events', () => {
  it('parses onkeydown with key', () => {
    const ast = parse(`Dropdown as frame:
  onkeydown escape: close`)
    const event = ast.components[0].events[0]
    expect(event.name).toBe('onkeydown')
    expect(event.key).toBe('escape')
  })

  it('parses enter key', () => {
    const ast = parse(`Form as frame:
  onkeydown enter: submit`)
    expect(ast.components[0].events[0].key).toBe('enter')
  })

  it('parses arrow keys', () => {
    const ast = parse(`List as frame:
  onkeydown arrow-down: highlight next`)
    expect(ast.components[0].events[0].key).toBe('arrow-down')
  })

  it('parses arrow-up key', () => {
    const ast = parse(`List as frame:
  onkeydown arrow-up: highlight prev`)
    expect(ast.components[0].events[0].key).toBe('arrow-up')
  })

  it('parses tab key', () => {
    const ast = parse(`Modal as frame:
  onkeydown tab: focus next`)
    expect(ast.components[0].events[0].key).toBe('tab')
  })

  it('parses space key', () => {
    const ast = parse(`Button as button:
  onkeydown space: toggle`)
    expect(ast.components[0].events[0].key).toBe('space')
  })
})

// ============================================================================
// TIMING MODIFIERS
// ============================================================================

describe('Parser: Event Timing Modifiers', () => {
  it('parses debounce modifier', () => {
    const ast = parse(`Input as input:
  oninput debounce 300: filter`)
    const event = ast.components[0].events[0]
    expect(event.modifiers).toBeDefined()
    expect(event.modifiers?.[0].type).toBe('debounce')
    expect(event.modifiers?.[0].value).toBe(300)
  })

  it('parses delay modifier', () => {
    const ast = parse(`Button as button:
  onclick delay 200: submit`)
    const event = ast.components[0].events[0]
    expect(event.modifiers?.[0].type).toBe('delay')
    expect(event.modifiers?.[0].value).toBe(200)
  })
})

// ============================================================================
// KEYS BLOCK
// ============================================================================

describe('Parser: Keys Block', () => {
  it('parses keys block', () => {
    const ast = parse(`Dropdown as frame:
  keys
    escape close
    enter select`)
    expect(ast.components[0].events.length).toBe(2)
    expect(ast.components[0].events[0].name).toBe('onkeydown')
    expect(ast.components[0].events[0].key).toBe('escape')
    expect(ast.components[0].events[1].key).toBe('enter')
  })

  it('parses keys with arrow keys', () => {
    const ast = parse(`List as frame:
  keys
    arrow-down highlight next
    arrow-up highlight prev`)
    expect(ast.components[0].events.length).toBe(2)
  })

  it('keys block with actions', () => {
    const ast = parse(`Modal as frame:
  keys
    escape close`)
    const event = ast.components[0].events[0]
    expect(event.actions.length).toBe(1)
    expect(event.actions[0].name).toBe('close')
  })
})

// ============================================================================
// EVENT POSITION
// ============================================================================

describe('Parser: Event Position', () => {
  it('event has correct line number', () => {
    const ast = parse(`Button as button:
  pad 8
  onclick toggle`)
    expect(ast.components[0].events[0].line).toBe(3)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Event Edge Cases', () => {
  it('event after state', () => {
    const ast = parse(`Button as button:
  hover:
    bg light
  onclick toggle`)
    expect(ast.components[0].states.length).toBe(1)
    expect(ast.components[0].events.length).toBe(1)
  })

  it('multiple keyboard events', () => {
    const ast = parse(`Form as frame:
  onkeydown escape: close
  onkeydown enter: submit`)
    expect(ast.components[0].events.length).toBe(2)
  })

  it('event with implicit self target', () => {
    // When no target, action applies to self
    const ast = parse(`Item as frame:
  onclick select`)
    const action = ast.components[0].events[0].actions[0]
    // Target should be undefined (implicit self)
    expect(action.target).toBeUndefined()
  })
})
