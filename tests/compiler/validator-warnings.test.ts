/**
 * Validator Coverage-Gap Tests
 *
 * Closes coverage gaps in compiler/validator/validator.ts for code paths that
 * exist and are reachable but were not exercised by existing tests:
 * - VALUE_OUT_OF_RANGE (E105) — numeric property outside declared range
 * - validateEach with Instance children — loop body validation
 *
 * Two intentionally-untested code paths:
 *
 * 1. checkUnusedDefinitions (validator.ts:798-832) is explicitly disabled at
 *    validator.ts:121 ("DISABLED: Unused definitions are allowed"). UNUSED_TOKEN
 *    (W501) and UNUSED_COMPONENT (W503) are dead-by-design.
 *
 * 2. INVALID_TARGET (E301, validator.ts:740-748): the parser does not populate
 *    action.target for arbitrary identifiers like `highlight(notatarget)` —
 *    `next`/`prev`/`first`/`last` are special-cased in the runtime, other names
 *    are treated as element references. The existing E301 test
 *    (validator-error-codes-completeness.test.ts:99) is intentionally toothless
 *    (`expect(x || !x || x).toBe(true)`) acknowledging this gap.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { validate, ERROR_CODES } from '../../compiler/validator/index'
import { clearRulesCache } from '../../compiler/validator/generator'

describe('Validator — Property Range Checks (E105)', () => {
  beforeEach(() => {
    clearRulesCache()
  })

  it('errors when opacity exceeds the upper bound', () => {
    const result = validate('Frame opacity 5')
    const rangeErr = result.errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)
    expect(rangeErr).toBeDefined()
    expect(rangeErr?.message).toContain('opacity')
    expect(rangeErr?.message).toContain('5')
  })

  it('errors when opacity falls below the lower bound', () => {
    const result = validate('Frame opacity -1')
    const rangeErr = result.errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)
    expect(rangeErr).toBeDefined()
    expect(rangeErr?.message).toContain('opacity')
  })

  it('accepts opacity within the declared range', () => {
    const result = validate('Frame opacity 0.5')
    expect(result.errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)).toBeUndefined()
  })

  it('accepts opacity at boundary values (0 and 1)', () => {
    expect(
      validate('Frame opacity 0').errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)
    ).toBeUndefined()
    expect(
      validate('Frame opacity 1').errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)
    ).toBeUndefined()
  })

  it('handles string-encoded numeric values', () => {
    // Covers the `typeof val === 'string'` branch in checkPropertyRanges (line ~976)
    const result = validate('Frame opacity "5"')
    const rangeErr = result.errors.find(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)
    expect(rangeErr).toBeDefined()
  })
})

describe('Validator — Each Loops with Instance children', () => {
  beforeEach(() => {
    clearRulesCache()
  })

  it('validates instances inside an each-loop body', () => {
    // validateEach(each) with child of type 'Instance' (line ~754).
    // An invalid component name inside the loop body should still be reported.
    const source = 'items:\n  a:\n    name: "x"\neach item in $items\n  Buton "$item.name"'
    const result = validate(source)
    const undefErr = result.errors.find(e => e.code === ERROR_CODES.UNDEFINED_COMPONENT)
    expect(undefErr).toBeDefined()
    expect(undefErr?.message).toContain('Buton')
  })
})
