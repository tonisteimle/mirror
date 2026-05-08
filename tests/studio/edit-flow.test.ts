/**
 * Tests for studio/agent/edit-flow.ts → runEditFlow()
 *
 * Der Orchestrator verbindet Capture → Prompt → Bridge → Parse → Apply →
 * Retry und liefert ein `EditResult`. Pure-async-function: nimmt Source als
 * Input, macht keine Editor-Mutation.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.2 (edit-flow)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createMockTauriBridge, type MockTauriBridge } from '../helpers/mock-tauri-bridge'
import { runEditFlow, type EditFlowAttemptEvent } from '../../studio/agent/edit-flow'
import type { EditCaptureCtx } from '../../studio/agent/edit-prompts'

let bridge: MockTauriBridge
let prevBridge: any

beforeEach(() => {
  bridge = createMockTauriBridge({ useRealCli: false, responseDelay: 5 })
  ;(globalThis as any).window = (globalThis as any).window || {}
  prevBridge = (globalThis as any).window.TauriBridge
  ;(globalThis as any).window.TauriBridge = bridge
})

afterEach(() => {
  ;(globalThis as any).window.TauriBridge = prevBridge
})

const baseCtx = (overrides: Partial<EditCaptureCtx> = {}): EditCaptureCtx => ({
  source: 'Frame gap 12\n  Text "Hello"',
  fileName: 'app.mir',
  cursor: { line: 1, col: 1 },
  selection: null,
  instruction: null,
  diffSinceLastCall: '',
  siblings: {},
  ...overrides,
})

describe('EditFlow — runEditFlow', () => {
  describe('Happy path', () => {
    test('returns status=ready with patched source for a valid patch response', async () => {
      bridge.setMockRawOutput('@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END')
      const result = await runEditFlow(baseCtx())
      // Sharp: full-shape so we lock retries=0 and undefined optionals
      // — a regression that accidentally sets retries=1 on a clean run
      // (off-by-one) would slip past `expect(result.status).toBe('ready')`.
      expect(result).toEqual({
        status: 'ready',
        proposedSource: 'Frame gap 12\n  Text "Hi"',
        retries: 0,
        qualityViolations: { token: [], component: [], redundancy: [] },
      })
    })

    test('applies multiple patches in sequence', async () => {
      const ctx = baseCtx({
        source: 'A\nB\nC',
      })
      bridge.setMockRawOutput(
        ['@@FIND', 'A', '@@REPLACE', 'X', '@@END', '@@FIND', 'C', '@@REPLACE', 'Z', '@@END'].join(
          '\n'
        )
      )
      const result = await runEditFlow(ctx)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('X\nB\nZ')
    })
  })

  describe('Silence is sacred', () => {
    test('returns status=no-change when LLM returns empty output', async () => {
      bridge.setMockRawOutput('')
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('no-change')
      expect(result.proposedSource).toBeUndefined()
    })

    test('returns status=no-change when LLM returns only nachrede', async () => {
      bridge.setMockRawOutput('Der Code ist bereits korrekt.')
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('no-change')
    })
  })

  describe('Parse errors', () => {
    test('returns status=error when response is structurally broken (no @@END)', async () => {
      bridge.setMockRawOutput('@@FIND\nX\n@@REPLACE\nY\n')
      const result = await runEditFlow(baseCtx({ source: 'X' }))
      expect(result.status).toBe('error')
      expect(result.error).toBeTruthy()
    })
  })

  describe('Retry loop', () => {
    test('retries when the first response has a non-unique anchor', async () => {
      const ctx = baseCtx({ source: 'Text "Hello"\nText "Hello"' })

      // First response: ambiguous anchor; second: unique.
      const responses = [
        '@@FIND\nText "Hello"\n@@REPLACE\nText "Hi"\n@@END',
        '@@FIND\nText "Hello"\nText "Hello"\n@@REPLACE\nText "Hi"\nText "Hi"\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, agentType, _path, sessionId) => {
        const out = responses[call++] ?? ''
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: out,
          error: null,
        }
      }

      const result = await runEditFlow(ctx)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Text "Hi"\nText "Hi"')
      expect(result.retries).toBe(1)
    })

    test('retries when an anchor has zero matches', async () => {
      const ctx = baseCtx({ source: 'A\nB\nC' })
      const responses = ['@@FIND\nNOPE\n@@REPLACE\nX\n@@END', '@@FIND\nB\n@@REPLACE\nX\n@@END']
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const result = await runEditFlow(ctx)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('A\nX\nC')
      expect(result.retries).toBe(1)
    })

    test('reports the multi-match error message when retries are exhausted on a non-unique anchor', async () => {
      const ctx = baseCtx({ source: 'X\nX\nX' })
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: '@@FIND\nX\n@@REPLACE\nY\n@@END',
        error: null,
      })
      const result = await runEditFlow(ctx, { maxRetries: 1 })
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/mehrdeutig|3×/)
    })

    test('gives up after maxRetries with status=error', async () => {
      const ctx = baseCtx({ source: 'A\nB\nC' })
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: '@@FIND\nNOPE\n@@REPLACE\nX\n@@END',
        error: null,
      })

      const result = await runEditFlow(ctx, { maxRetries: 2 })
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/anchor|Anker|nicht gefunden|no-match/i)
      expect(result.retries).toBe(2)
    })

    test('truncates long anchors in the final error message preview', async () => {
      const longLine = 'X'.repeat(200)
      const ctx = baseCtx({ source: 'A\nB\nC' })
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: `@@FIND\n${longLine}\n@@REPLACE\nY\n@@END`,
        error: null,
      })

      const result = await runEditFlow(ctx, { maxRetries: 0 })
      expect(result.status).toBe('error')
      // Preview is capped at 60 chars + ellipsis suffix.
      expect(result.error).toMatch(/…/)
      expect(result.error!.length).toBeLessThan(longLine.length)
    })

    test('respects custom maxRetries=0 (no retry, immediate error)', async () => {
      const ctx = baseCtx({ source: 'A' })
      let callCount = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => {
        callCount++
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: '@@FIND\nNOPE\n@@REPLACE\nX\n@@END',
          error: null,
        }
      }

      const result = await runEditFlow(ctx, { maxRetries: 0 })
      expect(result.status).toBe('error')
      expect(callCount).toBe(1)
    })
  })

  describe('Bridge errors', () => {
    test('converts a bridge error to status=error', async () => {
      bridge.setMockError('rate limit exceeded')
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/rate limit/)
    })

    test('stringifies non-Error throws in the error field', async () => {
      bridge.runAgent = async () => {
        // Some legacy code paths reject with bare strings — make sure that
        // path is still reported coherently, not as "[object Object]".
        return Promise.reject('plain-string-rejection')
      }
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toContain('plain-string-rejection')
    })

    test('converts missing-bridge to status=error', async () => {
      ;(globalThis as any).window.TauriBridge = undefined
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/Desktop/i)
    })
  })

  describe('Telemetry — onAttempt', () => {
    test('fires once with kind=success on a clean first attempt', async () => {
      bridge.setMockRawOutput('@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END')
      const events: EditFlowAttemptEvent[] = []
      const result = await runEditFlow(baseCtx(), { onAttempt: e => events.push(e) })
      expect(result.status).toBe('ready')
      expect(events).toEqual([{ attempt: 0, kind: 'success' }])
    })

    test('fires once with kind=no-change when LLM is silent', async () => {
      bridge.setMockRawOutput('')
      const events: EditFlowAttemptEvent[] = []
      await runEditFlow(baseCtx(), { onAttempt: e => events.push(e) })
      expect(events).toEqual([{ attempt: 0, kind: 'no-change' }])
    })

    test('fires apply-failed with willRetry=true then success on a recovered retry', async () => {
      const ctx = baseCtx({ source: 'Text "Hello"\nText "Hello"' })
      const responses = [
        '@@FIND\nText "Hello"\n@@REPLACE\nText "Hi"\n@@END', // ambiguous
        '@@FIND\nText "Hello"\nText "Hello"\n@@REPLACE\nText "Hi"\nText "Hi"\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const events: EditFlowAttemptEvent[] = []
      const result = await runEditFlow(ctx, { onAttempt: e => events.push(e) })
      expect(result.status).toBe('ready')
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        attempt: 0,
        kind: 'apply-failed',
        willRetry: true,
      })
      expect(events[1]).toEqual({ attempt: 1, kind: 'success' })
    })

    test('marks final apply-failed with willRetry=false when retries are exhausted', async () => {
      const ctx = baseCtx({ source: 'A\nB\nC' })
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: '@@FIND\nNOPE\n@@REPLACE\nX\n@@END',
        error: null,
      })

      const events: EditFlowAttemptEvent[] = []
      await runEditFlow(ctx, { maxRetries: 2, onAttempt: e => events.push(e) })

      expect(events).toHaveLength(3)
      expect(events.map(e => (e as { willRetry?: boolean }).willRetry)).toEqual([true, true, false])
      expect(events[2]).toMatchObject({ attempt: 2, kind: 'apply-failed', willRetry: false })
    })

    test('fires kind=parse-error when the response is structurally broken', async () => {
      bridge.setMockRawOutput('@@FIND\nX\n@@REPLACE\nY\n')
      const events: EditFlowAttemptEvent[] = []
      await runEditFlow(baseCtx({ source: 'X' }), { onAttempt: e => events.push(e) })
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ attempt: 0, kind: 'parse-error', willRetry: false })
    })

    test('fires kind=bridge-error when the bridge throws', async () => {
      bridge.setMockError('rate limit exceeded')
      const events: EditFlowAttemptEvent[] = []
      await runEditFlow(baseCtx(), { onAttempt: e => events.push(e) })
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        attempt: 0,
        kind: 'bridge-error',
        willRetry: false,
      })
    })
  })

  describe('Edge-Cases (T4.3)', () => {
    test('empty source returns error without calling the bridge', async () => {
      bridge.runAgent = async () => {
        throw new Error('bridge should not be called for empty source')
      }
      const result = await runEditFlow(baseCtx({ source: '' }))
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/leer/i)
      expect(result.retries).toBe(0)
    })

    test('whitespace-only source is treated as empty', async () => {
      bridge.runAgent = async () => {
        throw new Error('bridge should not be called for whitespace-only source')
      }
      const result = await runEditFlow(baseCtx({ source: '   \n\n  \t' }))
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/leer/i)
    })

    test('source over 100K chars returns error without calling the bridge', async () => {
      bridge.runAgent = async () => {
        throw new Error('bridge should not be called for oversized source')
      }
      const huge = 'A'.repeat(100_001)
      const result = await runEditFlow(baseCtx({ source: huge }))
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/zu gross|splitte/i)
      expect(result.error).toContain('100')
    })

    test('source exactly at the 100K limit still goes through the bridge', async () => {
      bridge.setMockRawOutput('')
      const atLimit = 'A'.repeat(100_000)
      const result = await runEditFlow(baseCtx({ source: atLimit }))
      // No-change because mock returned empty — but importantly NOT
      // an error from the size check.
      expect(result.status).toBe('no-change')
    })

    test('bridge offline (missing window.TauriBridge) → friendly error mentioning ai-bridge', async () => {
      ;(globalThis as any).window.TauriBridge = undefined
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/ai-bridge|Bridge/i)
    })
  })

  describe('Quality-retry (qualityRetry: true)', () => {
    test('runs a 2nd LLM call when ready leaves token-violations and merges in retry result', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg red',
        siblings: tokens,
      })
      // Pass 1: makes a real change (red → #2271C1) that introduces a
      // hardcoded value matching primary.bg → token-violation.
      // Pass 2: switches the hardcoded #2271C1 to the $primary token.
      const responses = [
        '@@FIND\nButton "Save", bg red\n@@REPLACE\nButton "Save", bg #2271C1, col white\n@@END',
        '@@FIND\nButton "Save", bg #2271C1, col white\n@@REPLACE\nButton "Save", bg $primary, col white\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const events: EditFlowAttemptEvent[] = []
      const result = await runEditFlow(ctx, {
        qualityRetry: true,
        onAttempt: e => events.push(e),
      })

      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Button "Save", bg $primary, col white')
      expect(result.qualityRetried).toBe(true)
      expect(result.qualityViolations?.token.length).toBe(0)
      const qrEvent = events.find(e => e.kind === 'quality-retry') as Extract<
        EditFlowAttemptEvent,
        { kind: 'quality-retry' }
      >
      expect(qrEvent).toBeDefined()
      expect(qrEvent.violationsBefore).toBeGreaterThan(0)
      expect(qrEvent.violationsAfter).toBe(0)
      expect(qrEvent.transition).toBe('ready → ready')
    })

    test('upgrades no-change with violations into ready when retry produces a fix', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg #2271C1',
        siblings: tokens,
      })
      // Pass 1: silence (no-change) — but the source already violates
      // the token rule. Pass 2: applies the token substitution.
      const responses = [
        '',
        '@@FIND\nButton "Save", bg #2271C1\n@@REPLACE\nButton "Save", bg $primary\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Button "Save", bg $primary')
      expect(result.qualityRetried).toBe(true)
      expect(result.qualityViolations?.token.length).toBe(0)
    })

    test('skips retry when ready result is already clean', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg red',
        siblings: tokens,
      })
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => {
        call++
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: '@@FIND\nButton "Save", bg red\n@@REPLACE\nButton "Save", bg $primary\n@@END',
          error: null,
        }
      }

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(1)
      expect(result.status).toBe('ready')
      expect(result.qualityRetried).toBeUndefined()
    })

    test('keeps first-pass improvements when retry returns silent no-change', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg red',
        siblings: tokens,
      })
      // Pass 1: improves color but introduces a token-violation.
      // Pass 2: stays silent (LLM gives up). The orchestrator MUST
      // preserve pass-1 source — otherwise the user loses progress.
      const responses = [
        '@@FIND\nButton "Save", bg red\n@@REPLACE\nButton "Save", bg #2271C1\n@@END',
        '',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Button "Save", bg #2271C1')
      expect(result.qualityRetried).toBe(true)
      expect(result.qualityViolations?.token.length).toBe(1)
    })

    test('keeps first result when retry hits a bridge error', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg red',
        siblings: tokens,
      })
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => {
        call++
        if (call === 1) {
          return {
            session_id: sessionId || 'mock',
            success: true,
            output: '@@FIND\nButton "Save", bg red\n@@REPLACE\nButton "Save", bg #2271C1\n@@END',
            error: null,
          }
        }
        return {
          session_id: sessionId || 'mock',
          success: false,
          output: '',
          error: 'rate limit',
        }
      }

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Button "Save", bg #2271C1')
      expect(result.qualityRetried).toBe(true)
      // first-pass violations remain
      expect(result.qualityViolations?.token.length).toBe(1)
    })

    test('default (no qualityRetry option) makes only one LLM call even with violations', async () => {
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg #2271C1',
        siblings: tokens,
      })
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => {
        call++
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: '',
          error: null,
        }
      }

      const result = await runEditFlow(ctx)
      expect(call).toBe(1)
      expect(result.status).toBe('no-change')
      expect(result.qualityRetried).toBeUndefined()
      expect(result.qualityViolations?.token.length).toBe(1)
    })
  })

  describe('Cross-file patches (Multi-File-Roadmap 6b)', () => {
    test('routes through multi-file applier when any patch has @@FILE', async () => {
      bridge.setMockRawOutput(
        [
          '@@FILE tokens.mir',
          '@@FIND',
          'primary.bg: #2271C1',
          '@@REPLACE',
          'primary.bg: #2271C1',
          'accent.bg: #f59e0b',
          '@@END',
          '@@FIND',
          '  Text "Hello"',
          '@@REPLACE',
          '  Text "Hi", col $accent',
          '@@END',
        ].join('\n')
      )
      const result = await runEditFlow(
        baseCtx({
          siblings: { 'tokens.mir': 'primary.bg: #2271C1' },
        })
      )
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Frame gap 12\n  Text "Hi", col $accent')
      expect(result.otherFileChanges).toEqual({
        'tokens.mir': 'primary.bg: #2271C1\naccent.bg: #f59e0b',
      })
    })

    test('omits otherFileChanges when only the active file is patched (single-file path)', async () => {
      bridge.setMockRawOutput('@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END')
      const result = await runEditFlow(
        baseCtx({ siblings: { 'tokens.mir': 'primary.bg: #2271C1' } })
      )
      expect(result.status).toBe('ready')
      expect(result.otherFileChanges).toBeUndefined()
    })

    test('cross-file patch that touches ONLY siblings keeps active source unchanged', async () => {
      bridge.setMockRawOutput(
        [
          '@@FILE tokens.mir',
          '@@FIND',
          'primary.bg: #2271C1',
          '@@REPLACE',
          'primary.bg: #1E5BA8',
          '@@END',
        ].join('\n')
      )
      const ctx = baseCtx({ siblings: { 'tokens.mir': 'primary.bg: #2271C1' } })
      const result = await runEditFlow(ctx)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe(ctx.source) // unchanged
      expect(result.otherFileChanges).toEqual({ 'tokens.mir': 'primary.bg: #1E5BA8' })
    })

    test('rejects @@FILE pointing at a non-existent file as a hard error (no retry)', async () => {
      bridge.setMockRawOutput(
        ['@@FILE phantom.mir', '@@FIND', 'foo', '@@REPLACE', 'bar', '@@END'].join('\n')
      )
      const events: EditFlowAttemptEvent[] = []
      const result = await runEditFlow(baseCtx(), {
        onAttempt: e => events.push(e),
        maxRetries: 3, // would normally retry, but unknown-file shouldn't
      })
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/phantom\.mir/)
      expect(result.error).toMatch(/nicht im Projekt/i)
      expect(events).toHaveLength(1)
      expect(events[0].kind).toBe('unknown-file')
      expect(result.retries).toBe(0)
    })

    test('all-or-nothing: if ANY @@FILE patch misses its anchor, no other-file changes leak through', async () => {
      // First patch valid (tokens.mir), second patch broken (active file).
      // Multi-file applier returns NO updatedFiles → result must be error,
      // tokens.mir must NOT be in any side-effect.
      bridge.setMockRawOutput(
        [
          '@@FILE tokens.mir',
          '@@FIND',
          'primary.bg: #2271C1',
          '@@REPLACE',
          'primary.bg: #1E5BA8',
          '@@END',
          '@@FIND',
          'NotInActiveSource',
          '@@REPLACE',
          'foo',
          '@@END',
        ].join('\n')
      )
      const result = await runEditFlow(
        baseCtx({ siblings: { 'tokens.mir': 'primary.bg: #2271C1' } }),
        { maxRetries: 0 }
      )
      expect(result.status).toBe('error')
      expect(result.otherFileChanges).toBeUndefined()
      expect(result.proposedSource).toBeUndefined()
    })

    test('retry hint surfaces the targetFile so the LLM knows where to look', async () => {
      // First call: cross-file with bad anchor.
      // Second call: a valid single-file patch (LLM "fixed" it).
      const responses = [
        ['@@FILE tokens.mir', '@@FIND', 'BogusAnchor', '@@REPLACE', 'foo', '@@END'].join('\n'),
        '@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })
      const events: EditFlowAttemptEvent[] = []
      const result = await runEditFlow(
        baseCtx({ siblings: { 'tokens.mir': 'primary.bg: #2271C1' } }),
        { maxRetries: 1, onAttempt: e => events.push(e) }
      )
      expect(result.status).toBe('ready')
      expect(events[0].kind).toBe('apply-failed')
      // Hint must carry targetFile so the retry prompt mentions it.
      const failed = events[0] as Extract<EditFlowAttemptEvent, { kind: 'apply-failed' }>
      const hint = failed.hints[0] as { targetFile?: string }
      expect(hint.targetFile).toBe('tokens.mir')
    })
  })

  describe('Cancellation', () => {
    test('rejects with AbortError when signal is pre-aborted', async () => {
      const ctrl = new AbortController()
      ctrl.abort()
      await expect(runEditFlow(baseCtx(), { signal: ctrl.signal })).rejects.toMatchObject({
        name: 'AbortError',
      })
    })

    test('rejects with AbortError when signal aborts mid-call', async () => {
      bridge = createMockTauriBridge({ useRealCli: false, responseDelay: 200 })
      ;(globalThis as any).window.TauriBridge = bridge
      bridge.setMockRawOutput('@@FIND\nA\n@@REPLACE\nB\n@@END')

      const ctrl = new AbortController()
      const promise = runEditFlow(baseCtx({ source: 'A' }), {
        signal: ctrl.signal,
      })
      setTimeout(() => ctrl.abort(), 20)

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })

  // -----------------------------------------------------------------------
  // P2 coverage gaps
  // -----------------------------------------------------------------------

  describe('Default maxRetries', () => {
    test('uses maxRetries=2 by default when option is omitted', async () => {
      // Critical: lock in the documented default. A regression where the
      // default drifts to 0 or 5 would silently change cost and latency.
      const ctx = baseCtx({ source: 'A' })
      let callCount = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => {
        callCount++
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: '@@FIND\nNOPE\n@@REPLACE\nX\n@@END',
          error: null,
        }
      }

      const result = await runEditFlow(ctx) // no maxRetries passed
      expect(result.status).toBe('error')
      // 1 initial + 2 retries = 3 calls total
      expect(callCount).toBe(3)
      expect(result.retries).toBe(2)
    })
  })

  describe('Quality-retry — different violation types', () => {
    test('retry prompt mentions component-violations when present', async () => {
      // First pass produces a hardcoded button matching a component;
      // verify the retry instruction includes the component-violation copy.
      const components = { 'c.com': 'PrimaryBtn as Button: bg #2271C1, col white' }
      const ctx = baseCtx({
        source: 'Button "Save"',
        siblings: components,
      })

      const responses = [
        '@@FIND\nButton "Save"\n@@REPLACE\nButton "Save", bg #2271C1, col white\n@@END',
        '@@FIND\nButton "Save", bg #2271C1, col white\n@@REPLACE\nPrimaryBtn "Save"\n@@END',
      ]
      let call = 0
      const observedPrompts: string[] = []
      bridge.runAgent = async (prompt, _t, _path, sessionId) => {
        observedPrompts.push(prompt)
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: responses[call++] ?? '',
          error: null,
        }
      }

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('PrimaryBtn "Save"')
      // The 2nd prompt must mention the component-violation hint specifically.
      expect(observedPrompts[1]).toContain('Component-Verstösse')
      expect(observedPrompts[1]).toContain('PrimaryBtn')
    })

    test('retry prompt mentions redundancy-violations when present', async () => {
      const ctx = baseCtx({
        source: 'Button "X"',
      })
      const responses = [
        // Pass 1 introduces a duplicate property.
        '@@FIND\nButton "X"\n@@REPLACE\nButton "X", bg red, bg blue\n@@END',
        // Pass 2 cleans it up.
        '@@FIND\nButton "X", bg red, bg blue\n@@REPLACE\nButton "X", bg red\n@@END',
      ]
      let call = 0
      const observedPrompts: string[] = []
      bridge.runAgent = async (prompt, _t, _path, sessionId) => {
        observedPrompts.push(prompt)
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: responses[call++] ?? '',
          error: null,
        }
      }

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Button "X", bg red')
      expect(observedPrompts[1]).toContain('Redundanz-Verstösse')
    })

    test('retry instruction preserves the user instruction with explicit attribution', async () => {
      // When the user gave a specific instruction, the retry must mention
      // it so the LLM doesn't drift away from the original goal.
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg red',
        siblings: tokens,
        instruction: 'Mach den Button blau',
      })

      const responses = [
        '@@FIND\nButton "Save", bg red\n@@REPLACE\nButton "Save", bg #2271C1\n@@END',
        '@@FIND\nButton "Save", bg #2271C1\n@@REPLACE\nButton "Save", bg $primary\n@@END',
      ]
      let call = 0
      const observedPrompts: string[] = []
      bridge.runAgent = async (prompt, _t, _path, sessionId) => {
        observedPrompts.push(prompt)
        return {
          session_id: sessionId || 'mock',
          success: true,
          output: responses[call++] ?? '',
          error: null,
        }
      }

      await runEditFlow(ctx, { qualityRetry: true })
      // The 2nd prompt must contain the instruction-preservation copy.
      expect(observedPrompts[1]).toContain('Ursprüngliche User-Anweisung')
      expect(observedPrompts[1]).toContain('Mach den Button blau')
    })
  })

  describe('Cross-file ↔ single-file path divergence', () => {
    test('a clean single-file response after a cross-file retry uses the single-file path', async () => {
      // First call: cross-file with bad anchor → triggers retry.
      // Second call: pure single-file response → must succeed via the
      // single-file path. Lock in that the orchestrator doesn't get
      // stuck in cross-file mode.
      const responses = [
        ['@@FILE tokens.mir', '@@FIND', 'BogusAnchor', '@@REPLACE', 'foo', '@@END'].join('\n'),
        '@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const result = await runEditFlow(
        baseCtx({ siblings: { 'tokens.mir': 'primary.bg: #2271C1' } }),
        { maxRetries: 1 }
      )
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Frame gap 12\n  Text "Hi"')
      // Single-file path must NOT produce otherFileChanges.
      expect(result.otherFileChanges).toBeUndefined()
    })
  })

  describe('Bridge-error stringification', () => {
    test('non-Error object rejection is JSON-stringified, not "[object Object]"', async () => {
      // errorMessage() detects plain objects and JSON-stringifies them so
      // the structure surfaces in the error UI. The naive String(err)
      // fallback would produce "[object Object]" — useless to the user.
      bridge.runAgent = async () => Promise.reject({ code: 'E_BAD', detail: 'something useful' })
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toContain('something useful')
      expect(result.error).not.toContain('[object Object]')
    })

    test('plain-string rejection (non-Error) is included verbatim in the error message', async () => {
      bridge.runAgent = async () => Promise.reject('rate-limit')
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      expect(result.error).toBe('rate-limit') // not "Error: rate-limit", not stringified
    })

    test('object with a circular reference falls back to String() without throwing', async () => {
      const circular: Record<string, unknown> = { code: 'E_BAD' }
      circular.self = circular
      bridge.runAgent = async () => Promise.reject(circular)
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('error')
      // JSON.stringify throws on circular refs → catch falls back to String().
      // The fallback IS '[object Object]' here — that's the documented worst case.
      expect(result.error).toBe('[object Object]')
    })
  })

  describe('Empty-source guard', () => {
    test('empty source path also reports retries=0 (no calls were made)', async () => {
      const result = await runEditFlow(baseCtx({ source: '' }))
      expect(result.status).toBe('error')
      expect(result.retries).toBe(0)
    })

    test('source-too-large path also reports retries=0', async () => {
      const huge = 'A'.repeat(200_000)
      const result = await runEditFlow(baseCtx({ source: huge }))
      expect(result.status).toBe('error')
      expect(result.retries).toBe(0)
    })
  })

  describe('Telemetry — fine-grained ordering', () => {
    test('quality-retry merges otherFileChanges from both passes (covers merge branch)', async () => {
      // Coverage gap: mergeOtherFileChanges line 463 (spread-merge path).
      // Without this, both first.otherFileChanges and second.other... are
      // always undefined and the merge function returns undefined early.
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg #2271C1',
        siblings: tokens,
      })
      const responses = [
        [
          '@@FILE t.tok',
          '@@FIND',
          'primary.bg: #2271C1',
          '@@REPLACE',
          'primary.bg: #2271C1\naccent.bg: #f00',
          '@@END',
          '@@FIND',
          'Button "Save", bg #2271C1',
          '@@REPLACE',
          'Button "Save", bg #2271C1, col white',
          '@@END',
        ].join('\n'),
        [
          '@@FILE t.tok',
          '@@FIND',
          'primary.bg: #2271C1\naccent.bg: #f00',
          '@@REPLACE',
          'primary.bg: #2271C1\naccent.bg: #f00\nsecondary.bg: #0f0',
          '@@END',
          '@@FIND',
          'Button "Save", bg #2271C1, col white',
          '@@REPLACE',
          'Button "Save", bg $primary, col white',
          '@@END',
        ].join('\n'),
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const result = await runEditFlow(ctx, { qualityRetry: true })
      expect(call).toBe(2)
      expect(result.status).toBe('ready')
      expect(result.qualityRetried).toBe(true)
      // Retry's content overrides pass-1's content for the same file.
      expect(result.otherFileChanges).toBeDefined()
      expect(result.otherFileChanges!['t.tok']).toBe(
        'primary.bg: #2271C1\naccent.bg: #f00\nsecondary.bg: #0f0'
      )
    })

    test('quality-retry event fires AFTER the retry completes, not before', async () => {
      // Lock in event ordering: the user observes events in this order.
      const tokens = { 't.tok': 'primary.bg: #2271C1' }
      const ctx = baseCtx({
        source: 'Button "Save", bg #2271C1',
        siblings: tokens,
      })
      const responses = [
        '',
        '@@FIND\nButton "Save", bg #2271C1\n@@REPLACE\nButton "Save", bg $primary\n@@END',
      ]
      let call = 0
      bridge.runAgent = async (_p, _t, _path, sessionId) => ({
        session_id: sessionId || 'mock',
        success: true,
        output: responses[call++] ?? '',
        error: null,
      })

      const events: EditFlowAttemptEvent[] = []
      await runEditFlow(ctx, { qualityRetry: true, onAttempt: e => events.push(e) })

      // Pass-1 no-change → Pass-2 success → quality-retry meta-event.
      const kinds = events.map(e => e.kind)
      expect(kinds).toEqual(['no-change', 'success', 'quality-retry'])
    })
  })
})
