/**
 * Parser Tests: Selection Actions
 *
 * Tests for selection-related actions:
 * - highlight
 * - select
 * - deselect
 * - clear-selection
 * - filter
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction, getActions } from '../../test-utils'

describe('Highlight Action', () => {
  it('parses highlight with target', () => {
    const node = parseOne('Button onclick highlight Item')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('highlight')
    expect(action?.target).toBe('Item')
  })

  it('parses highlight next', () => {
    const node = parseOne('Box onkeydown arrow-down: highlight next')
    const action = getAction(node, 'onkeydown')
    expect(action?.type).toBe('highlight')
    expect(action?.target).toBe('next')
  })

  it('parses highlight prev', () => {
    const node = parseOne('Box onkeydown arrow-up: highlight prev')
    const action = getAction(node, 'onkeydown')
    expect(action?.type).toBe('highlight')
    expect(action?.target).toBe('prev')
  })

  it('parses highlight first', () => {
    const node = parseOne('Input onfocus highlight first')
    const action = getAction(node, 'onfocus')
    expect(action?.type).toBe('highlight')
    expect(action?.target).toBe('first')
  })
})

describe('Select Action', () => {
  it('parses select with target', () => {
    const node = parseOne('Item onclick select self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('select')
    expect(action?.target).toBe('self')
  })

  it('parses select highlighted', () => {
    const node = parseOne('Box onkeydown enter: select highlighted')
    const action = getAction(node, 'onkeydown')
    expect(action?.type).toBe('select')
    expect(action?.target).toBe('highlighted')
  })

  it('parses select first', () => {
    const node = parseOne('Button onclick select first')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('select')
    expect(action?.target).toBe('first')
  })
})

describe('Deselect Action', () => {
  it('parses deselect self', () => {
    const node = parseOne('Item onclick deselect self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('deselect')
    expect(action?.target).toBe('self')
  })

  it('parses deselect with target', () => {
    const node = parseOne('Button onclick deselect Item')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('deselect')
    expect(action?.target).toBe('Item')
  })
})

describe('Clear Selection Action', () => {
  it('parses clear-selection', () => {
    const node = parseOne('Button onclick clear-selection')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('clear-selection')
  })

  it('parses clear-selection all', () => {
    const node = parseOne('Button onclick clear-selection all')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('clear-selection')
    expect(action?.target).toBe('all')
  })
})

describe('Filter Action', () => {
  it('parses filter with target', () => {
    const node = parseOne('Input oninput filter Results')
    const action = getAction(node, 'oninput')
    expect(action?.type).toBe('filter')
    expect(action?.target).toBe('Results')
  })

  it('parses filter with debounce', () => {
    const node = parseOne('Input oninput debounce 300: filter Results')
    const action = getAction(node, 'oninput')
    expect(action?.type).toBe('filter')
  })
})

describe('Selection Action Chains', () => {
  it('parses select and deselect siblings', () => {
    const node = parseOne('Tab onclick select self, deselect-siblings')
    const actions = getActions(node, 'onclick')
    expect(actions.find((a) => a.type === 'select')).toBeDefined()
  })

  it('parses highlight then select', () => {
    const node = parseOne('Item onhover highlight self, onclick select self')
    const hoverAction = getAction(node, 'onhover')
    const clickAction = getAction(node, 'onclick')
    expect(hoverAction?.type).toBe('highlight')
    expect(clickAction?.type).toBe('select')
  })
})
