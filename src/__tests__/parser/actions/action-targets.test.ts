/**
 * Parser Tests: Action Targets
 *
 * Tests for action target keywords:
 * - self
 * - next
 * - prev
 * - first
 * - last
 * - first-empty
 * - highlighted
 * - selected
 * - self-and-before
 * - all
 * - none
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction } from '../../test-utils'

describe('Self Target', () => {
  it('toggle self', () => {
    const node = parseOne('Box onclick toggle self')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('self')
  })

  it('hide self', () => {
    const node = parseOne('Alert onclick hide self')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('self')
  })

  it('select self', () => {
    const node = parseOne('Item onclick select self')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('self')
  })
})

describe('Navigation Targets', () => {
  it('highlight next', () => {
    const node = parseOne('Box onkeydown arrow-down: highlight next')
    const action = getAction(node, 'onkeydown')
    expect(action?.target).toBe('next')
  })

  it('highlight prev', () => {
    const node = parseOne('Box onkeydown arrow-up: highlight prev')
    const action = getAction(node, 'onkeydown')
    expect(action?.target).toBe('prev')
  })

  it('focus first', () => {
    const node = parseOne('Dialog onopen focus first')
    const action = getAction(node, 'onopen')
    expect(action?.target).toBe('first')
  })

  it('focus last', () => {
    const node = parseOne('Container onclick focus last')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('last')
  })

  it('focus first-empty', () => {
    const node = parseOne('Form onload focus first-empty')
    const action = getAction(node, 'onload')
    expect(action?.target).toBe('first-empty')
  })
})

describe('Selection State Targets', () => {
  it('select highlighted', () => {
    const node = parseOne('Box onkeydown enter: select highlighted')
    const action = getAction(node, 'onkeydown')
    expect(action?.target).toBe('highlighted')
  })

  it('show selected', () => {
    const node = parseOne('Button onclick show selected')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('selected')
  })
})

describe('Bulk Targets', () => {
  it('select self-and-before', () => {
    const node = parseOne('Star onclick select self-and-before')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('self-and-before')
  })

  it('clear-selection all', () => {
    const node = parseOne('Button onclick clear-selection all')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('all')
  })

  it('deselect all', () => {
    const node = parseOne('Button onclick deselect all')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('all')
  })
})

describe('None Target', () => {
  it('highlight none', () => {
    const node = parseOne('Box onblur highlight none')
    const action = getAction(node, 'onblur')
    expect(action?.target).toBe('none')
  })

  it('select none', () => {
    const node = parseOne('Button onclick select none')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('none')
  })
})

describe('Named Targets', () => {
  it('show named component', () => {
    const node = parseOne('Button onclick show SaveDialog')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('SaveDialog')
  })

  it('focus named input', () => {
    const node = parseOne('Button onclick focus EmailInput')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('EmailInput')
  })

  it('toggle named menu', () => {
    const node = parseOne('Button onclick toggle MainMenu')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('MainMenu')
  })
})

describe('Target in Rating Pattern', () => {
  it('star rating self-and-before', () => {
    const node = parseOne('Star onclick select self-and-before')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('self-and-before')
  })
})
