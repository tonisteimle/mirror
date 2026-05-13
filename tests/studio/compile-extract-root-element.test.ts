/**
 * @vitest-environment jsdom
 *
 * QP tests for studio/compile/extract-root-element.ts
 *
 * Pure helper extracted from app.ts:compile() render-pipe. Collapses
 * the three executeMirrorJS-return-shapes (Element / { root: Element }
 * / nullish) into a single Element|null.
 */

import { describe, it, expect } from 'vitest'
import { extractRootElement } from '../../studio/compile/extract-root-element'

describe('extractRootElement', () => {
  it('returns the element when ui is an Element', () => {
    const el = document.createElement('div')
    expect(extractRootElement(el)).toBe(el)
  })

  it('returns ui.root when wrapped in { root: Element }', () => {
    const el = document.createElement('section')
    expect(extractRootElement({ root: el })).toBe(el)
  })

  it('returns null for null', () => {
    expect(extractRootElement(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(extractRootElement(undefined)).toBeNull()
  })

  it('returns null when ui.root is not an Element', () => {
    expect(extractRootElement({ root: 'not-an-element' })).toBeNull()
    expect(extractRootElement({ root: null })).toBeNull()
    expect(extractRootElement({ root: 42 })).toBeNull()
  })

  it('returns null when ui has no root and is not an Element', () => {
    expect(extractRootElement({})).toBeNull()
    expect(extractRootElement({ foo: 'bar' })).toBeNull()
  })

  it('ignores non-root properties even on an Element', () => {
    const el = document.createElement('span')
    const ui = el as Element & { root?: unknown }
    ui.root = 'shouldnt-matter'
    // Element-first check wins — root property is irrelevant.
    expect(extractRootElement(ui)).toBe(el)
  })
})
