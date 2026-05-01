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
import { runEditFlow } from '../../studio/agent/edit-flow'
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
