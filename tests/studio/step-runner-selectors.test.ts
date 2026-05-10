/**
 * Step-Runner structural-selector tests
 *
 * Verifies resolveSelector(sel) handles every variant of the Selector
 * union and produces helpful errors on ambiguity / misses.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { resolveSelector } from '../../studio/test-api/step-runner'

function setupPreview(html: string): void {
  document.body.innerHTML = `<div id="preview">${html}</div>`
}

describe('resolveSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes a bare string through (legacy node-id form)', () => {
    expect(resolveSelector('node-1')).toBe('node-1')
  })

  it('byId returns the id verbatim', () => {
    expect(resolveSelector({ byId: 'node-7' })).toBe('node-7')
  })

  it('byTestId queries the data-test-id attribute', () => {
    setupPreview(
      `<div data-mirror-id="node-1" data-test-id="primary-cta"></div>
       <div data-mirror-id="node-2" data-test-id="secondary"></div>`
    )
    expect(resolveSelector({ byTestId: 'primary-cta' })).toBe('node-1')
    expect(resolveSelector({ byTestId: 'secondary' })).toBe('node-2')
  })

  it('byText matches an element with that exact text', () => {
    setupPreview(
      `<button data-mirror-id="node-1">Save</button>
       <button data-mirror-id="node-2">Cancel</button>`
    )
    expect(resolveSelector({ byText: 'Save' })).toBe('node-1')
    expect(resolveSelector({ byText: 'Cancel' })).toBe('node-2')
  })

  it('byText accepts a RegExp', () => {
    setupPreview(`<span data-mirror-id="node-3">User: alice@example.com</span>`)
    expect(resolveSelector({ byText: /alice@/ })).toBe('node-3')
  })

  it('byTag matches by HTML tag name', () => {
    setupPreview(
      `<button data-mirror-id="node-1">A</button>
       <span data-mirror-id="node-2">B</span>`
    )
    expect(resolveSelector({ byTag: 'span' })).toBe('node-2')
  })

  it('byPath walks data-mirror-name segments', () => {
    setupPreview(
      `<div data-mirror-id="node-1" data-mirror-name="Card">
         <div data-mirror-id="node-2" data-mirror-name="Title">Hello</div>
       </div>`
    )
    expect(resolveSelector({ byPath: 'Card > Title' })).toBe('node-2')
  })

  it('nth disambiguates multi-match', () => {
    setupPreview(
      `<button data-mirror-id="node-1">Click</button>
       <button data-mirror-id="node-2">Click</button>
       <button data-mirror-id="node-3">Click</button>`
    )
    expect(resolveSelector({ byText: 'Click', nth: 0 })).toBe('node-1')
    expect(resolveSelector({ byText: 'Click', nth: 2 })).toBe('node-3')
  })

  it('throws on zero matches with the selector in the message', () => {
    setupPreview(`<div data-mirror-id="node-1">Hello</div>`)
    expect(() => resolveSelector({ byText: 'Goodbye' })).toThrow(/matched 0 elements/)
    expect(() => resolveSelector({ byText: 'Goodbye' })).toThrow(/Goodbye/)
  })

  it('throws on multi-match without nth', () => {
    setupPreview(
      `<button data-mirror-id="node-1">Click</button>
       <button data-mirror-id="node-2">Click</button>`
    )
    expect(() => resolveSelector({ byText: 'Click' })).toThrow(/matched 2 elements; specify nth/)
  })

  it('throws on out-of-range nth', () => {
    setupPreview(
      `<button data-mirror-id="node-1">A</button>
       <button data-mirror-id="node-2">A</button>`
    )
    expect(() => resolveSelector({ byText: 'A', nth: 5 })).toThrow(/out of range/)
  })

  it('byTestId throws when not present', () => {
    setupPreview(`<div data-mirror-id="node-1"></div>`)
    expect(() => resolveSelector({ byTestId: 'missing' })).toThrow(/matched 0 elements/)
  })
})
