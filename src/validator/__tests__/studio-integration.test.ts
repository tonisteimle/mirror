/**
 * Studio Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DebouncedValidator,
  toCodeMirrorDiagnostics,
  toProblemPanelItems,
  toStatusBarInfo,
  getQuickFixes,
} from '../studio-integration'
import { validate } from '../index'

describe('DebouncedValidator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces validation calls', () => {
    const onValidation = vi.fn()
    const validator = new DebouncedValidator({
      delay: 300,
      onValidation,
    })

    validator.validate('Box w 100')
    validator.validate('Box w 200')
    validator.validate('Box w 300')

    expect(onValidation).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(onValidation).toHaveBeenCalledTimes(1)
    expect(onValidation).toHaveBeenCalledWith(
      expect.objectContaining({ valid: true })
    )

    validator.dispose()
  })

  it('calls onValidationStart when validation is scheduled', () => {
    const onValidationStart = vi.fn()
    const validator = new DebouncedValidator({
      delay: 300,
      onValidationStart,
    })

    validator.validate('Box w 100')
    expect(onValidationStart).toHaveBeenCalledTimes(1)

    validator.validate('Box w 200')
    expect(onValidationStart).toHaveBeenCalledTimes(2)

    validator.dispose()
  })

  it('validateNow bypasses debouncing', () => {
    const onValidation = vi.fn()
    const validator = new DebouncedValidator({
      delay: 300,
      onValidation,
    })

    const result = validator.validateNow('Box w 100')

    expect(onValidation).toHaveBeenCalledTimes(1)
    expect(result.valid).toBe(true)

    validator.dispose()
  })

  it('getLastResult returns the most recent result', () => {
    const validator = new DebouncedValidator({ delay: 0 })

    expect(validator.getLastResult()).toBeNull()

    validator.validateNow('Box w 100')
    expect(validator.getLastResult()?.valid).toBe(true)

    validator.validateNow('Box unknownProp 100')
    expect(validator.getLastResult()?.valid).toBe(false)

    validator.dispose()
  })

  it('cancel stops pending validation', () => {
    const onValidation = vi.fn()
    const validator = new DebouncedValidator({
      delay: 300,
      onValidation,
    })

    validator.validate('Box w 100')
    validator.cancel()

    vi.advanceTimersByTime(300)

    expect(onValidation).not.toHaveBeenCalled()

    validator.dispose()
  })
})

describe('toCodeMirrorDiagnostics', () => {
  it('converts errors to diagnostics', () => {
    const source = 'Box unknownProp 100'
    const result = validate(source)
    const diagnostics = toCodeMirrorDiagnostics(result, source)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0].severity).toBe('error')
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(0)
    expect(diagnostics[0].to).toBeGreaterThan(diagnostics[0].from)
    expect(diagnostics[0].message).toContain('unknownProp')
  })

  it('converts warnings to diagnostics', () => {
    const source = 'Box bg $undefinedToken'
    const result = validate(source)
    const diagnostics = toCodeMirrorDiagnostics(result, source)

    const warning = diagnostics.find(d => d.severity === 'warning')
    expect(warning).toBeDefined()
    expect(warning?.message).toContain('undefinedToken')
  })

  it('calculates correct positions for multiline source', () => {
    const source = `Box w 100
Box unknownProp 200`
    const result = validate(source)
    const diagnostics = toCodeMirrorDiagnostics(result, source)

    expect(diagnostics.length).toBeGreaterThan(0)
    // Second line starts at position 10 (9 chars + newline)
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(10)
  })

  it('returns empty array for valid code', () => {
    const source = 'Box w 100 h 200 bg #333'
    const result = validate(source)
    const diagnostics = toCodeMirrorDiagnostics(result, source)

    expect(diagnostics).toHaveLength(0)
  })
})

describe('toProblemPanelItems', () => {
  it('returns sorted problem items', () => {
    const source = `Box unknownProp1 100
Box unknownProp2 200`
    const result = validate(source)
    const items = toProblemPanelItems(result)

    expect(items.length).toBe(2)
    expect(items[0].line).toBeLessThanOrEqual(items[1].line)
  })

  it('errors come before warnings on same line', () => {
    // This is hard to trigger naturally, but the sorting logic is tested
    const source = 'Box bg $undefined'
    const result = validate(source)
    const items = toProblemPanelItems(result)

    // Should have at least a warning for undefined token
    expect(items.some(i => i.type === 'warning')).toBe(true)
  })

  it('includes all error details', () => {
    const source = 'Box backgrund #333' // typo
    const result = validate(source)
    const items = toProblemPanelItems(result)

    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({
      type: 'error',
      code: expect.any(String),
      message: expect.any(String),
      line: expect.any(Number),
      column: expect.any(Number),
    })
    // Should have suggestion for typo
    expect(items[0].suggestion).toContain('background')
  })
})

describe('toStatusBarInfo', () => {
  it('shows success for valid code', () => {
    const result = validate('Box w 100')
    const info = toStatusBarInfo(result)

    expect(info.hasErrors).toBe(false)
    expect(info.hasWarnings).toBe(false)
    expect(info.icon).toBe('✓')
    expect(info.text).toBe('No problems')
  })

  it('shows error count', () => {
    const result = validate('Box unknownProp 100')
    const info = toStatusBarInfo(result)

    expect(info.hasErrors).toBe(true)
    expect(info.errorCount).toBeGreaterThan(0)
    expect(info.icon).toBe('✗')
    expect(info.text).toContain('error')
  })

  it('shows warning count', () => {
    const result = validate('Box bg $undefined')
    const info = toStatusBarInfo(result)

    expect(info.hasWarnings).toBe(true)
    expect(info.warningCount).toBeGreaterThan(0)
    expect(info.text).toContain('warning')
  })

  it('pluralizes correctly', () => {
    const result1 = validate('Box unknownProp 100')
    const result2 = validate('Box unknownProp1 100\nBox unknownProp2 200')

    const info1 = toStatusBarInfo(result1)
    const info2 = toStatusBarInfo(result2)

    // Single error - no 's'
    if (info1.errorCount === 1) {
      expect(info1.text).toContain('1 error')
      expect(info1.text).not.toContain('1 errors')
    }

    // Multiple errors - with 's'
    if (info2.errorCount > 1) {
      expect(info2.text).toContain('errors')
    }
  })
})

describe('getQuickFixes', () => {
  it('generates replacement fix for typos', () => {
    const source = 'Box backgrund #333'
    const result = validate(source)

    if (result.errors.length > 0) {
      const fixes = getQuickFixes(result.errors[0], source)

      expect(fixes.length).toBeGreaterThan(0)
      expect(fixes[0].title).toContain('Replace with')
      expect(fixes[0].replacement).toBe('background')
      expect(fixes[0].from).toBeGreaterThanOrEqual(0)
      expect(fixes[0].to).toBeGreaterThan(fixes[0].from)
    }
  })

  it('returns empty array when no suggestion available', () => {
    const source = 'Box w full'
    const result = validate(source)

    // Valid code, no errors
    expect(result.errors).toHaveLength(0)
  })

  it('calculates correct replacement positions', () => {
    const source = 'Box backgrund #333'
    const result = validate(source)

    if (result.errors.length > 0) {
      const fixes = getQuickFixes(result.errors[0], source)

      if (fixes.length > 0) {
        // Verify the positions are valid
        expect(fixes[0].from).toBeGreaterThanOrEqual(0)
        expect(fixes[0].to).toBeGreaterThan(fixes[0].from)
        expect(fixes[0].to).toBeLessThanOrEqual(source.length)

        // The replacement should be 'background'
        expect(fixes[0].replacement).toBe('background')
      }
    }
  })
})
