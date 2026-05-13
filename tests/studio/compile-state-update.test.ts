/**
 * QP tests for studio/compile/compile-state-update.ts
 *
 * Pure helper extracted from app.ts:compile() — the state-set payload
 * builder. Pins the production vs test-mode divergence: production
 * recomputes preludeLineOffset from the resolved code, test-mode
 * carries the value through and forces isWrappedWithApp = false.
 */

import { describe, it, expect } from 'vitest'
import { computeCompileStateUpdate } from '../../studio/compile/compile-state-update'

describe('computeCompileStateUpdate', () => {
  describe('production mode', () => {
    it('recomputes preludeLineOffset from resolvedCode', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'line1\nline2\nline3\nFrame',
        preludeOffset: 18, // char index where the prelude ends (after "line3\n")
        preludeLineOffset: 99, // input is wrong — should be replaced
        isWrappedWithApp: true,
        testMode: false,
      })

      // preludeOffset 18 lands in line 4 (0-based: 3), so preludeLineOffset = 3
      expect(result.newPreludeLineOffset).toBe(3)
      expect(result.payload.preludeLineOffset).toBe(3)
      expect(result.payload.preludeLineOffset).not.toBe(99)
    })

    it('carries isWrappedWithApp through', () => {
      const wrapped = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 0,
        preludeLineOffset: 0,
        isWrappedWithApp: true,
        testMode: false,
      })
      expect(wrapped.payload.isWrappedWithApp).toBe(true)

      const unwrapped = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 0,
        preludeLineOffset: 0,
        isWrappedWithApp: false,
        testMode: false,
      })
      expect(unwrapped.payload.isWrappedWithApp).toBe(false)
    })

    it('does not push sync offset', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 0,
        preludeLineOffset: 0,
        isWrappedWithApp: false,
        testMode: false,
      })
      expect(result.pushSyncOffset).toBe(false)
    })

    it('preserves resolvedSource and preludeOffset', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'tokens\n\nFrame',
        preludeOffset: 8,
        preludeLineOffset: 0,
        isWrappedWithApp: false,
        testMode: false,
      })
      expect(result.payload.resolvedSource).toBe('tokens\n\nFrame')
      expect(result.payload.preludeOffset).toBe(8)
    })
  })

  describe('test mode', () => {
    it('carries preludeLineOffset through (does not recompute)', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'line1\nline2\nFrame',
        preludeOffset: 12,
        preludeLineOffset: 2,
        isWrappedWithApp: true, // would-be wrapping, but test mode forces false
        testMode: true,
      })
      expect(result.newPreludeLineOffset).toBe(2)
      expect(result.payload.preludeLineOffset).toBe(2)
    })

    it('forces isWrappedWithApp to false', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 0,
        preludeLineOffset: 0,
        isWrappedWithApp: true,
        testMode: true,
      })
      expect(result.payload.isWrappedWithApp).toBe(false)
    })

    it('pushes sync offset', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 0,
        preludeLineOffset: 5,
        isWrappedWithApp: false,
        testMode: true,
      })
      expect(result.pushSyncOffset).toBe(true)
    })

    it('preserves resolvedSource and preludeOffset', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'Frame',
        preludeOffset: 42,
        preludeLineOffset: 3,
        isWrappedWithApp: false,
        testMode: true,
      })
      expect(result.payload.resolvedSource).toBe('Frame')
      expect(result.payload.preludeOffset).toBe(42)
    })
  })

  describe('edge cases', () => {
    it('handles empty resolvedCode in production', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: '',
        preludeOffset: 0,
        preludeLineOffset: 0,
        isWrappedWithApp: false,
        testMode: false,
      })
      expect(result.newPreludeLineOffset).toBe(0)
      expect(result.pushSyncOffset).toBe(false)
    })

    it('handles preludeOffset 0 (no prelude) in production', () => {
      const result = computeCompileStateUpdate({
        resolvedCode: 'Frame\nText',
        preludeOffset: 0,
        preludeLineOffset: 99,
        isWrappedWithApp: false,
        testMode: false,
      })
      expect(result.newPreludeLineOffset).toBe(0)
    })
  })
})
