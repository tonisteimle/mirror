/**
 * Step-Runner compile-mode dispatch tests
 *
 * Verifies the `triggerCompile(code, mode)` helper routes correctly
 * between the synchronous test-mode shortcut and the production
 * `__compileRealNow` hook.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { triggerCompile } from '../../studio/test-api/step-runner/runner'

interface CompileGlobals {
  __compileTestCode?: (code: string) => unknown
  __compileRealNow?: (code?: string) => void
}

const w = window as unknown as CompileGlobals

describe('triggerCompile', () => {
  beforeEach(() => {
    delete w.__compileTestCode
    delete w.__compileRealNow
  })
  afterEach(() => {
    delete w.__compileTestCode
    delete w.__compileRealNow
  })

  it('routes to __compileTestCode in test mode', () => {
    let received = ''
    w.__compileTestCode = (code: string) => {
      received = `test:${code}`
    }
    w.__compileRealNow = () => {
      received = 'real-WRONG'
    }
    expect(triggerCompile('hello', 'test')).toBe(true)
    expect(received).toBe('test:hello')
  })

  it('routes to __compileRealNow in real mode', () => {
    let received = ''
    w.__compileTestCode = () => {
      received = 'test-WRONG'
    }
    w.__compileRealNow = (code?: string) => {
      received = `real:${code ?? '<undef>'}`
    }
    expect(triggerCompile('hi', 'real')).toBe(true)
    expect(received).toBe('real:hi')
  })

  it('falls back to test mode when real hook is missing', () => {
    let received = ''
    w.__compileTestCode = (code: string) => {
      received = `test:${code}`
    }
    expect(triggerCompile('x', 'real')).toBe(true)
    expect(received).toBe('test:x')
  })

  it('returns false when no compile hook is installed', () => {
    expect(triggerCompile('x', 'test')).toBe(false)
    expect(triggerCompile('x', 'real')).toBe(false)
  })
})
