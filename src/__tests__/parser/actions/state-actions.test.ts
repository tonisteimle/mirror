/**
 * Parser Tests: State Actions
 *
 * Tests for state-changing actions:
 * - change
 * - activate
 * - deactivate
 * - deactivate-siblings
 * - toggle-state
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction, getActions } from '../../test-utils'

describe('Change Action', () => {
  it('parses change self to state', () => {
    const node = parseOne('Button onclick change self to active')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('change')
    expect(action?.target).toBe('self')
    expect(action?.value || action?.toState).toBe('active')
  })

  it('parses change with named target', () => {
    const node = parseOne('Button onclick change Panel to expanded')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('change')
    expect(action?.target).toBe('Panel')
  })
})

describe('Activate Action', () => {
  it('parses activate self', () => {
    const node = parseOne('Tab onclick activate self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('activate')
    expect(action?.target).toBe('self')
  })

  it('parses activate with target', () => {
    const node = parseOne('Button onclick activate Panel')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('activate')
    expect(action?.target).toBe('Panel')
  })
})

describe('Deactivate Action', () => {
  it('parses deactivate self', () => {
    const node = parseOne('Button onclick deactivate self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('deactivate')
    expect(action?.target).toBe('self')
  })

  it('parses deactivate with target', () => {
    const node = parseOne('Button onclick deactivate OtherTab')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('deactivate')
    expect(action?.target).toBe('OtherTab')
  })
})

describe('Deactivate Siblings Action', () => {
  it('parses deactivate-siblings', () => {
    const node = parseOne('Tab onclick deactivate-siblings')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('deactivate-siblings')
  })

  it('combines activate self with deactivate-siblings', () => {
    const node = parseOne('Tab onclick activate self, deactivate-siblings')
    const actions = getActions(node, 'onclick')
    expect(actions.find((a) => a.type === 'activate')).toBeDefined()
    expect(actions.find((a) => a.type === 'deactivate-siblings')).toBeDefined()
  })
})

describe('Toggle State Action', () => {
  it('parses toggle-state', () => {
    const node = parseOne('Button onclick toggle-state')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle-state')
  })

  it('parses toggle-state with target', () => {
    const node = parseOne('Button onclick toggle-state Menu')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle-state')
    expect(action?.target).toBe('Menu')
  })
})

describe('State Action Combinations', () => {
  it('tab switching pattern', () => {
    const node = parseOne('Tab onclick activate self, deactivate-siblings')
    const actions = getActions(node, 'onclick')
    expect(actions.length).toBeGreaterThanOrEqual(2)
  })

  it('accordion pattern', () => {
    const node = parseOne('AccordionItem onclick toggle-state self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle-state')
    expect(action?.target).toBe('self')
  })
})
