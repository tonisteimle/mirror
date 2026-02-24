/**
 * Parser Tests: Overlay Positions
 *
 * Tests for open action positions:
 * - below
 * - above
 * - left
 * - right
 * - center
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction } from '../../test-utils'

describe('Below Position', () => {
  it('parses open below', () => {
    const node = parseOne('Button onclick open Dropdown below')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('below')
  })
})

describe('Above Position', () => {
  it('parses open above', () => {
    const node = parseOne('Button onclick open Tooltip above')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('above')
  })
})

describe('Left Position', () => {
  it('parses open left', () => {
    const node = parseOne('Button onclick open Menu left')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('left')
  })
})

describe('Right Position', () => {
  it('parses open right', () => {
    const node = parseOne('Button onclick open Panel right')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('right')
  })
})

describe('Center Position', () => {
  it('parses open center', () => {
    const node = parseOne('Button onclick open Modal center')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('open')
    expect(action?.position).toBe('center')
  })
})

describe('Position with Different Targets', () => {
  it('dropdown below trigger', () => {
    const node = parseOne('Input onclick open DropdownList below')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('DropdownList')
    expect(action?.position).toBe('below')
  })

  it('tooltip above element', () => {
    const node = parseOne('Icon onhover open HelpTooltip above')
    const action = getAction(node, 'onhover')
    expect(action?.target).toBe('HelpTooltip')
    expect(action?.position).toBe('above')
  })

  it('dialog centered in viewport', () => {
    const node = parseOne('Button onclick open ConfirmDialog center')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('ConfirmDialog')
    expect(action?.position).toBe('center')
  })
})
