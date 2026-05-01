/**
 * Tests for studio/agent/edit-flow.ts → runEditFlow()
 *
 * Der Orchestrator verbindet Capture → Prompt → Bridge → Parse → Apply →
 * Retry und liefert ein `EditResult`. Pure-async-function: nimmt Source als
 * Input, macht keine Editor-Mutation.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.2 (edit-flow)
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
  projectFiles: { tokens: {}, components: {} },
  ...overrides,
})

describe('EditFlow — runEditFlow', () => {
  describe('Happy path', () => {
    test('returns status=ready with patched source for a valid patch response', async () => {
      bridge.setMockRawOutput('@@FIND\n  Text "Hello"\n@@REPLACE\n  Text "Hi"\n@@END')
      const result = await runEditFlow(baseCtx())
      expect(result.status).toBe('ready')
      expect(result.proposedSource).toBe('Frame gap 12\n  Text "Hi"')
      expect(result.error).toBeUndefined()
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
        projectFiles: { tokens, components: {} },
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
        projectFiles: { tokens, components: {} },
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
        projectFiles: { tokens, components: {} },
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
        projectFiles: { tokens, components: {} },
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
        projectFiles: { tokens, components: {} },
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
        projectFiles: { tokens, components: {} },
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
})
