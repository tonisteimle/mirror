/**
 * Orchestrator Tests
 *
 * Tests the three orchestration modes (single-shot, validator-loop,
 * plan-then-execute) with mocked deps so the behavior is independent of any
 * real Claude/compiler. Verifies retry logic, plan-then-code chaining,
 * iteration counts, and finalErrors propagation.
 *
 * Real end-to-end behavior is exercised by scripts/eval-ai-draft.ts against
 * the live CLI — these tests pin the orchestration logic itself.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import {
  singleShot,
  validatorLoop,
  planThenExecute,
  orchestrate,
  resolveMode,
  listModes,
  MODES,
  type GenerateInput,
  type OrchestrationDeps,
} from '../../studio/agent/orchestrator'

// ============================================
// MOCK DEPS BUILDER
// ============================================

interface MockOptions {
  /** Sequence of code outputs from generateCode (cycles if more calls than entries) */
  generateOutputs?: string[]
  /** Sequence of code outputs from fixCompileErrors */
  fixOutputs?: string[]
  /** Sequence of plan outputs */
  planOutputs?: string[]
  /** Sequence of code outputs from executePlan */
  executeOutputs?: string[]
  /**
   * Sequence of compile-error arrays. Index N = errors after the Nth check.
   * `[]` = clean, `['error 1']` = one error, etc.
   */
  compileResults?: string[][]
  /** Splice strategy (default: just return code) */
  spliceStrategy?: (code: string, source: string) => string
}

interface MockTrace {
  generateCalls: GenerateInput[]
  fixCalls: { brokenCode: string; errors: string[]; input: GenerateInput }[]
  planCalls: GenerateInput[]
  executeCalls: { plan: string; input: GenerateInput }[]
  compileCalls: string[]
}

function makeMockDeps(opts: MockOptions = {}): { deps: OrchestrationDeps; trace: MockTrace } {
  const trace: MockTrace = {
    generateCalls: [],
    fixCalls: [],
    planCalls: [],
    executeCalls: [],
    compileCalls: [],
  }
  let genIdx = 0,
    fixIdx = 0,
    planIdx = 0,
    execIdx = 0,
    compIdx = 0

  const next = <T>(arr: T[] | undefined, idx: number, fallback: T): { val: T; nextIdx: number } => {
    if (!arr || arr.length === 0) return { val: fallback, nextIdx: idx }
    return { val: arr[Math.min(idx, arr.length - 1)], nextIdx: idx + 1 }
  }

  const deps: OrchestrationDeps = {
    generateCode: async input => {
      trace.generateCalls.push(input)
      const r = next(opts.generateOutputs, genIdx, 'GeneratedDefault')
      genIdx = r.nextIdx
      return r.val
    },
    fixCompileErrors: async (brokenCode, errors, input) => {
      trace.fixCalls.push({ brokenCode, errors, input })
      const r = next(opts.fixOutputs, fixIdx, 'FixedDefault')
      fixIdx = r.nextIdx
      return r.val
    },
    planDraft: async input => {
      trace.planCalls.push(input)
      const r = next(opts.planOutputs, planIdx, '- step 1\n- step 2')
      planIdx = r.nextIdx
      return r.val
    },
    executePlan: async (plan, input) => {
      trace.executeCalls.push({ plan, input })
      const r = next(opts.executeOutputs, execIdx, 'ExecutedDefault')
      execIdx = r.nextIdx
      return r.val
    },
    checkCompile: async sourceWithCode => {
      trace.compileCalls.push(sourceWithCode)
      const r = next<string[]>(opts.compileResults, compIdx, [])
      compIdx = r.nextIdx
      return r.val
    },
    spliceCode: opts.spliceStrategy ?? ((code, source) => `${source}\n${code}`),
  }
  return { deps, trace }
}

const sampleInput: GenerateInput = {
  prompt: 'a button',
  content: '',
  fullSource: 'canvas mobile\n\n??\n??',
}

// ============================================
// SINGLE-SHOT
// ============================================

describe('singleShot mode', () => {
  test('makes exactly one generateCode call', async () => {
    const { deps, trace } = makeMockDeps({ generateOutputs: ['Button "OK"'] })
    const result = await singleShot(sampleInput, deps)

    expect(result.code).toBe('Button "OK"')
    expect(result.iterations).toBe(1)
    expect(result.mode).toBe('single-shot')
    expect(trace.generateCalls).toHaveLength(1)
    expect(trace.generateCalls[0]).toEqual(sampleInput)
    expect(trace.fixCalls).toHaveLength(0)
    expect(trace.compileCalls).toHaveLength(0)
  })

  test('does not call any compile-check or fix path', async () => {
    const { deps, trace } = makeMockDeps()
    await singleShot(sampleInput, deps)
    expect(trace.compileCalls).toHaveLength(0)
    expect(trace.fixCalls).toHaveLength(0)
    expect(trace.planCalls).toHaveLength(0)
    expect(trace.executeCalls).toHaveLength(0)
  })
})

// ============================================
// VALIDATOR-LOOP
// ============================================

describe('validatorLoop mode', () => {
  test('returns immediately when first generation compiles clean', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['CleanCode'],
      compileResults: [[]], // first check: 0 errors
    })
    const result = await validatorLoop(sampleInput, deps)

    expect(result.code).toBe('CleanCode')
    expect(result.iterations).toBe(1)
    expect(result.finalErrors).toBeUndefined()
    expect(trace.generateCalls).toHaveLength(1)
    expect(trace.fixCalls).toHaveLength(0)
    expect(trace.compileCalls).toHaveLength(1)
  })

  test('retries once when first generation has errors, then succeeds', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['BrokenCode'],
      fixOutputs: ['FixedCode'],
      compileResults: [['typo: foo'], []], // first check fails, fix succeeds
    })
    const result = await validatorLoop(sampleInput, deps)

    expect(result.code).toBe('FixedCode')
    expect(result.iterations).toBe(2)
    expect(result.finalErrors).toBeUndefined()
    expect(trace.fixCalls).toHaveLength(1)
    expect(trace.fixCalls[0].brokenCode).toBe('BrokenCode')
    expect(trace.fixCalls[0].errors).toEqual(['typo: foo'])
    expect(trace.compileCalls).toHaveLength(2)
  })

  test('respects maxRetries — stops after limit even if still broken', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['Broken1'],
      fixOutputs: ['Broken2', 'Broken3', 'Broken4'],
      compileResults: [['err1'], ['err2'], ['err3'], ['err4']], // every attempt fails
    })
    const result = await validatorLoop(sampleInput, deps, { maxRetries: 2 })

    // 2 retries means 1 generateCode + 2 fixCompileErrors = 3 iterations
    expect(result.iterations).toBe(3)
    expect(result.code).toBe('Broken3') // last fix output
    expect(result.finalErrors).toEqual(['err3'])
    expect(trace.generateCalls).toHaveLength(1)
    expect(trace.fixCalls).toHaveLength(2)
  })

  test('default maxRetries is 2', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['B1'],
      fixOutputs: ['B2', 'B3', 'B4'],
      compileResults: [['e'], ['e'], ['e'], ['e']],
    })
    const result = await validatorLoop(sampleInput, deps)
    expect(result.iterations).toBe(3) // 1 + 2 retries
    expect(trace.fixCalls).toHaveLength(2)
  })

  test('feeds the spliced source (not just code) to the compile check', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['MyCode'],
      compileResults: [[]],
      spliceStrategy: (code, source) => `${source}\nWITH:${code}`,
    })
    await validatorLoop(sampleInput, deps)
    expect(trace.compileCalls[0]).toBe(`${sampleInput.fullSource}\nWITH:MyCode`)
  })
})

// ============================================
// PLAN-THEN-EXECUTE
// ============================================

describe('planThenExecute mode', () => {
  test('plans first, then executes — no validation if validateAfterExecute=false', async () => {
    const { deps, trace } = makeMockDeps({
      planOutputs: ['- use Button\n- one element'],
      executeOutputs: ['Button "OK"'],
    })
    const result = await planThenExecute(sampleInput, deps, { validateAfterExecute: false })

    expect(result.code).toBe('Button "OK"')
    expect(result.iterations).toBe(2)
    expect(result.plan).toBe('- use Button\n- one element')
    expect(trace.planCalls).toHaveLength(1)
    expect(trace.executeCalls).toHaveLength(1)
    expect(trace.executeCalls[0].plan).toBe('- use Button\n- one element')
    expect(trace.compileCalls).toHaveLength(0)
  })

  test('plan + execute + validation pass when execute compiles clean (default)', async () => {
    const { deps, trace } = makeMockDeps({
      planOutputs: ['plan-text'],
      executeOutputs: ['CleanCode'],
      compileResults: [[]], // execute output is clean
    })
    const result = await planThenExecute(sampleInput, deps)

    expect(result.code).toBe('CleanCode')
    expect(result.iterations).toBe(2)
    expect(result.plan).toBe('plan-text')
    expect(result.finalErrors).toBeUndefined()
    expect(trace.compileCalls).toHaveLength(1)
    expect(trace.fixCalls).toHaveLength(0)
  })

  test('plan + execute + fix when execute is broken (default validateAfterExecute=true)', async () => {
    const { deps, trace } = makeMockDeps({
      planOutputs: ['plan-text'],
      executeOutputs: ['BrokenCode'],
      fixOutputs: ['FixedCode'],
      compileResults: [['error from execute'], []], // execute fails, fix succeeds
    })
    const result = await planThenExecute(sampleInput, deps)

    expect(result.code).toBe('FixedCode')
    expect(result.iterations).toBe(3) // plan + execute + fix
    expect(result.plan).toBe('plan-text')
    expect(result.finalErrors).toBeUndefined()
    expect(trace.fixCalls).toHaveLength(1)
    expect(trace.fixCalls[0].brokenCode).toBe('BrokenCode')
    expect(trace.fixCalls[0].errors).toEqual(['error from execute'])
  })

  test('returns finalErrors when even the fix fails', async () => {
    const { deps, trace } = makeMockDeps({
      planOutputs: ['plan'],
      executeOutputs: ['Broken1'],
      fixOutputs: ['Broken2'],
      compileResults: [['err1'], ['err2']], // both fail
    })
    const result = await planThenExecute(sampleInput, deps)

    expect(result.iterations).toBe(3)
    expect(result.finalErrors).toEqual(['err2'])
    expect(result.code).toBe('Broken2') // last attempt anyway
  })
})

// ============================================
// REGISTRY + DISPATCH
// ============================================

describe('mode registry', () => {
  test('all three modes are registered', () => {
    expect(listModes()).toEqual(['single-shot', 'validator-loop', 'plan-then-execute'])
    expect(MODES['single-shot']).toBe(singleShot)
    expect(MODES['validator-loop']).toBe(validatorLoop)
    expect(MODES['plan-then-execute']).toBe(planThenExecute)
  })

  test('resolveMode falls back to single-shot for unknown names', () => {
    expect(resolveMode('made-up-mode')).toBe(singleShot)
    expect(resolveMode(undefined)).toBe(singleShot)
    expect(resolveMode('')).toBe(singleShot)
  })

  test('resolveMode returns the right mode for known names', () => {
    expect(resolveMode('single-shot')).toBe(singleShot)
    expect(resolveMode('validator-loop')).toBe(validatorLoop)
    expect(resolveMode('plan-then-execute')).toBe(planThenExecute)
  })

  test('orchestrate() dispatches to the right mode', async () => {
    const { deps, trace } = makeMockDeps({
      generateOutputs: ['shot-result'],
      planOutputs: ['plan'],
      executeOutputs: ['exec-result'],
      compileResults: [[]],
    })

    const r1 = await orchestrate('single-shot', sampleInput, deps)
    expect(r1.mode).toBe('single-shot')
    expect(r1.code).toBe('shot-result')

    const r2 = await orchestrate('plan-then-execute', sampleInput, deps)
    expect(r2.mode).toBe('plan-then-execute')
    expect(r2.code).toBe('exec-result')
    expect(r2.plan).toBe('plan')
  })
})
