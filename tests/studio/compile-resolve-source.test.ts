/**
 * resolveCompileSource — pure-function tests.
 *
 * Pin the four-branch decision (testMode × fileType) plus the Branch 4
 * passthrough contract (undefined offsets → caller leaves closure vars
 * alone).
 */

import { describe, it, expect } from 'vitest'
import { resolveCompileSource } from '../../studio/compile/resolve-compile-source'

describe('resolveCompileSource', () => {
  describe('Branch 1 — testMode + layout', () => {
    it('prepends prelude + separator, no App-wrap', () => {
      const r = resolveCompileSource({
        compileCode: 'Frame bg red',
        compileFile: 'app.mir',
        fileType: 'layout',
        prelude: 'primary.bg: #2271C1',
        testMode: true,
      })
      expect(r.resolvedCode).toContain('primary.bg: #2271C1')
      expect(r.resolvedCode).toContain('// === app.mir ===')
      expect(r.resolvedCode).toContain('Frame bg red')
      expect(r.resolvedCode).not.toMatch(/^App\n/)
      expect(r.preludeOffset).toBeGreaterThan(0)
      expect(r.preludeLineOffset).toBeGreaterThan(0)
      expect(r.isWrappedWithApp).toBeUndefined()
    })

    it('handles null prelude (offset = 0)', () => {
      const r = resolveCompileSource({
        compileCode: 'Frame bg red',
        compileFile: 'app.mir',
        fileType: 'layout',
        prelude: null,
        testMode: true,
      })
      expect(r.resolvedCode).toBe('Frame bg red')
      expect(r.preludeOffset).toBe(0)
      expect(r.preludeLineOffset).toBe(0)
    })
  })

  describe('Branch 2 — testMode + non-layout', () => {
    it('returns code as-is with zero offsets', () => {
      const r = resolveCompileSource({
        compileCode: 'primary.bg: #2271C1',
        compileFile: 'tokens.tok',
        fileType: 'tokens',
        prelude: 'should-be-ignored',
        testMode: true,
      })
      expect(r.resolvedCode).toBe('primary.bg: #2271C1')
      expect(r.preludeOffset).toBe(0)
      expect(r.preludeLineOffset).toBe(0)
      expect(r.isWrappedWithApp).toBeUndefined()
    })
  })

  describe('Branch 3 — !testMode + layout', () => {
    it('wraps in App when user did not start with App', () => {
      const r = resolveCompileSource({
        compileCode: 'Frame bg red',
        compileFile: 'app.mir',
        fileType: 'layout',
        prelude: null,
        testMode: false,
      })
      // wrapLayoutForCompile inserts App-root for implicit-App layouts.
      expect(r.resolvedCode).toMatch(/^App\n/)
      expect(r.isWrappedWithApp).toBe(true)
      expect(r.preludeOffset).toBeGreaterThanOrEqual(0)
      // Branch 3 leaves preludeLineOffset to the caller's state-update block.
      expect(r.preludeLineOffset).toBeUndefined()
    })

    it('does not wrap when user code already starts with App', () => {
      const r = resolveCompileSource({
        compileCode: 'App\n  Frame bg red',
        compileFile: 'app.mir',
        fileType: 'layout',
        prelude: null,
        testMode: false,
      })
      expect(r.isWrappedWithApp).toBe(false)
    })

    it('prepends prelude when present', () => {
      const r = resolveCompileSource({
        compileCode: 'Frame bg $primary',
        compileFile: 'app.mir',
        fileType: 'layout',
        prelude: 'primary.bg: #2271C1',
        testMode: false,
      })
      expect(r.resolvedCode).toContain('primary.bg: #2271C1')
      expect(r.resolvedCode).toContain('Frame bg $primary')
    })
  })

  describe('Branch 4 — !testMode + non-layout (passthrough)', () => {
    it('returns only resolvedCode; all offset/wrap fields are undefined', () => {
      const r = resolveCompileSource({
        compileCode: 'primary.bg: #2271C1',
        compileFile: 'tokens.tok',
        fileType: 'tokens',
        prelude: null,
        testMode: false,
      })
      expect(r.resolvedCode).toBe('primary.bg: #2271C1')
      expect(r.preludeOffset).toBeUndefined()
      expect(r.preludeLineOffset).toBeUndefined()
      expect(r.isWrappedWithApp).toBeUndefined()
    })

    it('ignores prelude in passthrough mode', () => {
      const r = resolveCompileSource({
        compileCode: 'primary.bg: #2271C1',
        compileFile: 'tokens.tok',
        fileType: 'tokens',
        prelude: 'ignored.bg: red',
        testMode: false,
      })
      expect(r.resolvedCode).toBe('primary.bg: #2271C1')
    })
  })
})
