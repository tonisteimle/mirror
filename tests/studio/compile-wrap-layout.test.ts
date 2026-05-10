/**
 * wrapLayoutForCompile — pure-function tests.
 *
 * Pin behavior of the App-wrap decision so future compile()
 * decompositions can refactor with confidence.
 */

import { describe, it, expect } from 'vitest'
import {
  wrapLayoutForCompile,
  prependPrelude,
  preludeLineOffset,
} from '../../studio/compile/wrap-layout'

describe('wrapLayoutForCompile — implicit App-wrap', () => {
  it('wraps bare user code in App and indents children', () => {
    const r = wrapLayoutForCompile('Frame bg #fff\n  Text "Hi"', 'app.mir', null)
    expect(r.isWrappedWithApp).toBe(true)
    expect(r.resolvedCode).toBe('App\n  Frame bg #fff\n    Text "Hi"')
    // 'App' = 3 chars + '\n' = 1 char → user code starts at offset 4.
    expect(r.preludeOffset).toBe(4)
  })

  it('wraps and prepends prelude with file separator', () => {
    const r = wrapLayoutForCompile('Frame bg #fff', 'app.mir', 'primary.bg: #2271C1')
    expect(r.isWrappedWithApp).toBe(true)
    expect(r.resolvedCode).toContain('primary.bg: #2271C1')
    expect(r.resolvedCode).toContain('// === app.mir ===')
    expect(r.resolvedCode).toContain('App\n  Frame bg #fff')
    // preludeOffset includes prelude + separator + 'App' + '\n'.
    const prelude = 'primary.bg: #2271C1'
    const sep = '\n\n// === app.mir ===\n'
    expect(r.preludeOffset).toBe(prelude.length + sep.length + 'App'.length + 1)
  })

  it('preserves blank lines without indenting them', () => {
    const r = wrapLayoutForCompile('Frame\n\nText "Hi"', 'app.mir', null)
    expect(r.resolvedCode).toBe('App\n  Frame\n\n  Text "Hi"')
  })
})

describe('wrapLayoutForCompile — explicit (no wrap)', () => {
  it('does not wrap when code starts with App', () => {
    const r = wrapLayoutForCompile('App\n  Text "Hi"', 'app.mir', null)
    expect(r.isWrappedWithApp).toBe(false)
    expect(r.resolvedCode).toBe('App\n  Text "Hi"')
    expect(r.preludeOffset).toBe(0)
  })

  it('does not wrap when code defines a root component', () => {
    const r = wrapLayoutForCompile('Card:\n  bg #fff\n\nCard', 'app.mir', null)
    expect(r.isWrappedWithApp).toBe(false)
    expect(r.resolvedCode).toBe('Card:\n  bg #fff\n\nCard')
    expect(r.preludeOffset).toBe(0)
  })

  it('detects root defs even with leading whitespace inside the line', () => {
    // Root: capital + colon at column 0. Leading-space lines never count.
    const r = wrapLayoutForCompile('  Card:\n    bg #fff', 'app.mir', null)
    // Indented "Card:" is NOT a root definition → wraps as normal layout.
    expect(r.isWrappedWithApp).toBe(true)
  })

  it('does not wrap state blocks (lowercase + colon)', () => {
    // `hover:` is a state block, not a component def. Code with only state-
    // like names should still wrap.
    const r = wrapLayoutForCompile('Frame\n  hover:\n    bg #fff', 'app.mir', null)
    expect(r.isWrappedWithApp).toBe(true)
  })

  it('prepends prelude when not wrapping', () => {
    const r = wrapLayoutForCompile('App\n  Text "Hi"', 'app.mir', 'primary.bg: #fff')
    expect(r.isWrappedWithApp).toBe(false)
    expect(r.resolvedCode).toContain('primary.bg: #fff')
    expect(r.resolvedCode).toContain('// === app.mir ===')
    expect(r.resolvedCode).toContain('App\n  Text "Hi"')
    const prelude = 'primary.bg: #fff'
    const sep = '\n\n// === app.mir ===\n'
    expect(r.preludeOffset).toBe(prelude.length + sep.length)
  })
})

describe('prependPrelude — used by test mode + skip-wrap branch', () => {
  it('returns code unchanged with offset 0 when prelude is null', () => {
    const r = prependPrelude('Frame', 'app.mir', null)
    expect(r.resolvedCode).toBe('Frame')
    expect(r.preludeOffset).toBe(0)
  })

  it('joins prelude + separator + code', () => {
    const r = prependPrelude('Frame', 'app.mir', 'primary.bg: #fff')
    const expected = 'primary.bg: #fff\n\n// === app.mir ===\nFrame'
    expect(r.resolvedCode).toBe(expected)
    expect(r.preludeOffset).toBe('primary.bg: #fff'.length + '\n\n// === app.mir ===\n'.length)
  })
})

describe('preludeLineOffset', () => {
  it('returns 0 when offset is 0', () => {
    expect(preludeLineOffset('App\n  Frame', 0)).toBe(0)
  })

  it('counts newlines up to the offset', () => {
    const code = 'a\nb\nc\nFrame'
    // Offset just before "Frame": 3 newlines consumed.
    const offset = code.indexOf('Frame')
    expect(preludeLineOffset(code, offset)).toBe(3)
  })

  it('treats a trailing newline at the offset as one line', () => {
    expect(preludeLineOffset('a\n', 2)).toBe(1)
  })
})
