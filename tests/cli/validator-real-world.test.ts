/**
 * Real-world validator regression tests.
 *
 * Pins the validator's behaviour against actual project examples so any
 * future change that re-introduces false-positive noise (prose-mode
 * regression, schema gap, lexer tightening) shows up immediately as a
 * test failure rather than silently degrading dev UX.
 *
 * The headline number — examples/personas-informatik — is the document
 * that originally surfaced the validator-quality regression: Mirror
 * source the user wrote and intends to keep working with. Going from
 * 1007 errors / 15 warnings → 0/0 (default mode) is the validator-
 * quality SLA encoded as a test.
 */

import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { runValidator } from '../../compiler/validator/cli-runner'

const REPO_ROOT = path.resolve(__dirname, '../..')
const EX_PERSONAS = path.join(REPO_ROOT, 'examples/personas-informatik')

describe('real-world: examples/personas-informatik', () => {
  it('validates clean (0 errors, 0 warnings) in default mode', () => {
    const result = runValidator({ inputs: [EX_PERSONAS] })
    expect(result.totals.errors).toBe(0)
    expect(result.totals.warnings).toBe(0)
    expect(result.exitCode).toBe(0)
  })

  it('discovers all four files in the project', () => {
    const result = runValidator({ inputs: [EX_PERSONAS] })
    // tokens.tok + components.com + app.mir = 3 code files validated
    // (data.data is intentionally empty / data-only — skipped).
    expect(result.totals.files).toBe(3)
  })

  it('cross-file: tokens defined in tokens.tok resolve in components.com', () => {
    const result = runValidator({ inputs: [EX_PERSONAS] })
    expect(result.crossFileErrors.filter(e => e.code === 'undefined-token')).toEqual([])
  })

  it('cross-file: components defined in components.com resolve in app.mir', () => {
    const result = runValidator({ inputs: [EX_PERSONAS] })
    expect(result.crossFileErrors.filter(e => e.code === 'undefined-component')).toEqual([])
  })

  it('prose-mode: app.mir prose bodies do not trigger lex errors', () => {
    const result = runValidator({ inputs: [EX_PERSONAS] })
    // E012 (unexpected character) was the canary for prose-blind parsing
    // of «»—öäü in the persona narrative blocks.
    const allErrors = [
      ...result.fileResults.flatMap(fr => fr.errors),
      ...result.fileResults.flatMap(fr => fr.warnings),
    ]
    expect(allErrors.filter(e => e.code === 'E012')).toEqual([])
  })

  it('--unused surfaces real findings (sanity check it actually runs)', () => {
    const result = runValidator({ inputs: [EX_PERSONAS], reportUnused: true })
    // Several components in components.com aren't yet wired into app.mir.
    const w503 = result.fileResults.flatMap(fr => fr.warnings.filter(w => w.code === 'W503'))
    expect(w503.length).toBeGreaterThan(0)
  })
})
