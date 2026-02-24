/**
 * Parser Tests: Visibility Actions
 *
 * Tests for visibility-related actions:
 * - toggle
 * - show
 * - hide
 * - open
 * - close
 * - page
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction, getActions } from '../../test-utils'

describe('Toggle Action', () => {
  it('parses simple toggle', () => {
    const node = parseOne('Button onclick toggle')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle')
  })

  it('parses toggle with target', () => {
    const node = parseOne('Button onclick toggle Menu')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle')
    expect(action?.target).toBe('Menu')
  })

  it('parses toggle self', () => {
    const node = parseOne('Box onclick toggle self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('toggle')
    expect(action?.target).toBe('self')
  })
})

describe('Show Action', () => {
  it('parses show with target', () => {
    const node = parseOne('Button onclick show Panel')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('show')
    expect(action?.target).toBe('Panel')
  })

  it('parses show with named target', () => {
    const node = parseOne('Button onclick show SaveDialog')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('show')
    expect(action?.target).toBe('SaveDialog')
  })
})

describe('Hide Action', () => {
  it('parses hide with target', () => {
    const node = parseOne('Button onclick hide Modal')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('hide')
    expect(action?.target).toBe('Modal')
  })

  it('parses hide self', () => {
    const node = parseOne('Alert onclick hide self')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('hide')
    expect(action?.target).toBe('self')
  })
})

describe('Open Action', () => {
  it('parses open with target', () => {
    const node = parseOne('Button onclick open Dialog')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.target).toBe('Dialog')
  })

  it('parses open with position', () => {
    const node = parseOne('Button onclick open Dropdown below')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.target).toBe('Dropdown')
    expect(action?.position).toBe('below')
  })

  it('parses open center', () => {
    const node = parseOne('Button onclick open Modal center')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('center')
  })
})

describe('Close Action', () => {
  it('parses close', () => {
    const node = parseOne('Button onclick close')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('close')
  })

  it('parses close with target', () => {
    const node = parseOne('Button onclick close Modal')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('close')
    expect(action?.target).toBe('Modal')
  })
})

describe('Page Action', () => {
  it('parses page navigation', () => {
    const node = parseOne('Button onclick page Settings')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('page')
    expect(action?.target).toBe('Settings')
  })

  it('parses page with different pages', () => {
    const cases = ['Home', 'Profile', 'Settings', 'Dashboard']
    cases.forEach((pageName) => {
      const node = parseOne(`Button onclick page ${pageName}`)
      const action = getAction(node, 'onclick')
      expect(action?.target).toBe(pageName)
    })
  })
})

describe('Multiple Visibility Actions', () => {
  it('parses show and hide together', () => {
    const node = parseOne('Button onclick show Panel, hide Other')
    const actions = getActions(node, 'onclick')
    expect(actions.length).toBeGreaterThanOrEqual(2)
    expect(actions.find((a) => a.type === 'show')).toBeDefined()
    expect(actions.find((a) => a.type === 'hide')).toBeDefined()
  })

  it('parses toggle and page', () => {
    const node = parseOne('Button onclick toggle Menu, page Home')
    const actions = getActions(node, 'onclick')
    expect(actions.find((a) => a.type === 'toggle')).toBeDefined()
    expect(actions.find((a) => a.type === 'page')).toBeDefined()
  })
})
