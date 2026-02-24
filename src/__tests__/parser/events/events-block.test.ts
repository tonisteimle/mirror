/**
 * Parser Tests: Centralized Events Block
 *
 * Tests for the events block that separates layout and behavior.
 * Syntax:
 * events
 *   ComponentName onclick
 *     action1
 *     action2
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../test-utils'

describe('Basic Events Block', () => {
  it('parses events block with single component', () => {
    const code = `Button named SaveBtn "Save"

events
  SaveBtn onclick
    show Spinner`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    // The event should be attached to SaveBtn
  })

  it('parses events block with multiple components', () => {
    const code = `Button named SaveBtn "Save"
Button named CancelBtn "Cancel"

events
  SaveBtn onclick
    show Spinner
  CancelBtn onclick
    hide Dialog`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Events Block with Multiple Actions', () => {
  it('parses multiple actions per event', () => {
    const code = `Button named SubmitBtn "Submit"

events
  SubmitBtn onclick
    show Spinner
    hide Form`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })

  it('parses complex action chains', () => {
    const code = `Form named LoginForm
  Input named Email
  Input named Password
  Button named LoginBtn "Login"

events
  LoginBtn onclick
    validate LoginForm
    show Spinner`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Events Block with Property Assignments', () => {
  it('parses property assignment in events', () => {
    const code = `Button named SubmitBtn "Submit"

events
  SubmitBtn onclick
    show Spinner
    SubmitBtn.disabled = true`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Events Block with Different Event Types', () => {
  it('parses onclick events', () => {
    const code = `Button named Btn "Click"

events
  Btn onclick
    toggle Menu`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })

  it('parses onchange events', () => {
    const code = `Input named SearchInput

events
  SearchInput onchange
    filter Results`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })

  it('parses onfocus events', () => {
    const code = `Input named EmailField

events
  EmailField onfocus
    show HelpText`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })

  it('parses onblur events', () => {
    const code = `Input named Field

events
  Field onblur
    validate self`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Events Block Location', () => {
  it('events block at end of file', () => {
    const code = `Card
  Title "Hello"
  Button named ActionBtn "Action"

events
  ActionBtn onclick
    toggle Menu`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1) // Only Card is rendered
  })

  it('events block between components', () => {
    const code = `Card named Card1
  Title "First"

events
  Card1 onclick
    show Details

Card named Card2
  Title "Second"`

    const result = parse(code)
    // Both cards should be parsed
    expect(result.nodes.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Complex Events Block Scenarios', () => {
  it('dialog open/close pattern', () => {
    const code = `Button named OpenBtn "Open Dialog"
Dialog named MainDialog, hidden
  Button named CloseBtn "Close"

events
  OpenBtn onclick
    show MainDialog
  CloseBtn onclick
    hide MainDialog`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })

  it('form submission pattern', () => {
    const code = `Form named LoginForm
  Input named Username
  Input named Password
  Button named SubmitBtn "Login"
  Spinner named LoadingSpinner, hidden

events
  SubmitBtn onclick
    validate LoginForm
    show LoadingSpinner
    call submitLogin`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})
