/**
 * Tests for studio/agent/fixer.ts → runEdit()
 *
 * `runEdit(prompt, signal)` ist die neue Bridge-Methode des Edit-Flows.
 * Sie ist eine schmale Schicht über `window.TauriBridge.agent.runAgent`,
 * mit AbortSignal-Support und einheitlichem Fehler-Verhalten.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (fixer.runEdit)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createMockTauriBridge, type MockTauriBridge } from '../_infra/mock-tauri-bridge'
import { runEdit } from '../../studio/agent/fixer'

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

describe('Fixer — runEdit', () => {
  test('returns the bridge raw output on success (byte-exact)', async () => {
    const expected = '@@FIND\nButton "Save"\n@@REPLACE\nButton "Save", bg blue\n@@END'
    bridge.setMockRawOutput(expected)
    const result = await runEdit('test prompt')
    // Sharp: byte-exact equality. The fixer must NOT trim, normalize, or
    // re-wrap the output — downstream parser depends on it being verbatim.
    expect(result).toBe(expected)
  })

  test('passes prompt, "edit" agentType, empty projectPath, and null sessionId to bridge', async () => {
    let observedPrompt = ''
    let observedAgentType = ''
    let observedProjectPath: string | undefined
    let observedSessionId: string | null | undefined
    const original = bridge.runAgent.bind(bridge)
    bridge.runAgent = async (prompt, agentType, projectPath, sessionId) => {
      observedPrompt = prompt
      observedAgentType = agentType
      observedProjectPath = projectPath
      observedSessionId = sessionId
      return original(prompt, agentType, projectPath, sessionId)
    }

    bridge.setMockRawOutput('ok')
    await runEdit('hello world')

    expect(observedPrompt).toBe('hello world')
    // Sharp: agentType MUST be exactly 'edit' — backend routing depends on it.
    expect(observedAgentType).toBe('edit')
    // Sharp: projectPath empty (the fixer is stateless, no project context).
    expect(observedProjectPath).toBe('')
    // Sharp: sessionId null (no session reuse).
    expect(observedSessionId).toBeNull()
  })

  test('throws on bridge error', async () => {
    bridge.setMockError('rate limit exceeded')
    await expect(runEdit('test prompt')).rejects.toThrow(/rate limit/)
  })

  test('throws a default-message error when the bridge reports failure with no error string', async () => {
    bridge.runAgent = async (_p, _t, _path, sessionId) => ({
      session_id: sessionId || 'mock',
      success: false,
      output: '',
      error: null,
    })
    await expect(runEdit('test prompt')).rejects.toThrow(/Claude CLI Fehler/)
  })

  test('throws when window.TauriBridge is not available, with ai-bridge hint (T4.3)', async () => {
    ;(globalThis as any).window.TauriBridge = undefined
    await expect(runEdit('test prompt')).rejects.toThrow(/ai-bridge/i)
  })

  test('throws when claude CLI is not installed', async () => {
    // override checkClaudeCli to return false
    bridge.checkClaudeCli = async () => false
    await expect(runEdit('test prompt')).rejects.toThrow(/Claude CLI nicht/i)
  })

  test('rejects immediately when signal is already aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(runEdit('test prompt', ctrl.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  test('propagates bridge errors even when a signal is provided', async () => {
    bridge.setMockError('quota exhausted')
    const ctrl = new AbortController()
    await expect(runEdit('test prompt', ctrl.signal)).rejects.toThrow(/quota/)
  })

  test('propagates a rejected runAgent promise when a signal is provided', async () => {
    bridge.runAgent = async () => {
      throw new Error('network down')
    }
    const ctrl = new AbortController()
    await expect(runEdit('test prompt', ctrl.signal)).rejects.toThrow(/network/)
  })

  test('resolves normally when signal is set but never aborts', async () => {
    bridge.setMockRawOutput('@@FIND\nA\n@@REPLACE\nB\n@@END')
    const ctrl = new AbortController()
    const result = await runEdit('test prompt', ctrl.signal)
    expect(result).toContain('@@FIND')
  })

  test('rejects with AbortError when signal aborts during the call', async () => {
    bridge = createMockTauriBridge({ useRealCli: false, responseDelay: 200 })
    ;(globalThis as any).window.TauriBridge = bridge
    bridge.setMockRawOutput('whatever')

    const ctrl = new AbortController()
    const promise = runEdit('test prompt', ctrl.signal)

    // Abort while the call is in flight (it uses ~200ms delay).
    setTimeout(() => ctrl.abort(), 20)

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  // -----------------------------------------------------------------------
  // P2 coverage gaps
  // -----------------------------------------------------------------------

  test('throws when isTauri() returns false (e.g. plain browser without bridge wired)', async () => {
    // The bridge object exists but reports it's not in a Tauri context.
    // Should still throw the ai-bridge hint, NOT crash from a missing API.
    bridge.isTauri = () => false
    await expect(runEdit('test prompt')).rejects.toThrow(/ai-bridge/i)
  })

  test('does not call runAgent when bridge is missing (short-circuit)', async () => {
    let callCount = 0
    bridge.runAgent = async () => {
      callCount++
      return { session_id: 'x', success: true, output: '', error: null }
    }
    ;(globalThis as any).window.TauriBridge = undefined

    await expect(runEdit('test prompt')).rejects.toThrow()
    expect(callCount).toBe(0)
  })

  test('does not call runAgent when claude CLI check fails (short-circuit)', async () => {
    let callCount = 0
    bridge.checkClaudeCli = async () => false
    bridge.runAgent = async () => {
      callCount++
      return { session_id: 'x', success: true, output: '', error: null }
    }

    await expect(runEdit('test prompt')).rejects.toThrow(/Claude CLI nicht/i)
    expect(callCount).toBe(0)
  })

  test('AbortError has the standard DOMException shape (name + message)', async () => {
    // Lock in DOMException semantics — downstream uses `err.name` to
    // distinguish abort from other errors. A switch to plain Error would
    // silently break that branch.
    const ctrl = new AbortController()
    ctrl.abort()
    try {
      await runEdit('test prompt', ctrl.signal)
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException)
      expect((err as DOMException).name).toBe('AbortError')
      expect((err as DOMException).message).toBe('Aborted')
    }
  })

  test('returns empty output when bridge succeeds with empty string', async () => {
    // Edge: an empty success is valid (the LLM may produce no patches).
    // The fixer must return '' verbatim rather than treat it as a failure.
    bridge.setMockRawOutput('')
    const result = await runEdit('test prompt')
    expect(result).toBe('')
  })

  test('preserves trailing newlines and whitespace in raw output', async () => {
    // The parser is whitespace-sensitive in @@FIND/@@REPLACE blocks.
    // A regression that trims output would silently break patches that
    // depend on a trailing newline.
    const raw = '@@FIND\n  text\n@@REPLACE\n  REPLACED\n@@END\n\n'
    bridge.setMockRawOutput(raw)
    const result = await runEdit('test prompt')
    expect(result).toBe(raw) // byte-exact, including trailing \n\n
  })

  test('preserves multi-byte unicode in output', async () => {
    // Mirror DSL allows German umlauts and emoji in strings — the bridge
    // path must not corrupt them.
    const raw = '@@FIND\nText "Größe"\n@@REPLACE\nText "Grösse 🎯"\n@@END'
    bridge.setMockRawOutput(raw)
    const result = await runEdit('test prompt')
    expect(result).toBe(raw)
  })

  test('AbortError after pre-check reject still reports AbortError, not the pre-check error', async () => {
    // Subtle ordering: signal aborts already-aborted check happens first.
    // Even if checkClaudeCli would also fail, the abort wins.
    bridge.checkClaudeCli = async () => false
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(runEdit('test prompt', ctrl.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  test('error from bridge with a non-empty error string surfaces verbatim', async () => {
    // Lock in that the error message is passed through, not wrapped.
    bridge.runAgent = async (_p, _t, _path, sessionId) => ({
      session_id: sessionId || 'mock',
      success: false,
      output: '',
      error: 'CLI killed by SIGTERM at line 42',
    })
    await expect(runEdit('test prompt')).rejects.toThrow('CLI killed by SIGTERM at line 42')
  })
})
