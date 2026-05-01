/**
 * Tests for studio/agent/fixer.ts → runEdit()
 *
 * `runEdit(prompt, signal)` ist die neue Bridge-Methode des Edit-Flows.
 * Sie ist eine schmale Schicht über `window.TauriBridge.agent.runAgent`,
 * mit AbortSignal-Support und einheitlichem Fehler-Verhalten.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (fixer.runEdit)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createMockTauriBridge, type MockTauriBridge } from '../helpers/mock-tauri-bridge'
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
  test('returns the bridge raw output on success', async () => {
    bridge.setMockRawOutput('@@FIND\nButton "Save"\n@@REPLACE\nButton "Save", bg blue\n@@END')
    const result = await runEdit('test prompt')
    expect(result).toContain('@@FIND')
    expect(result).toContain('Button "Save", bg blue')
  })

  test('passes the prompt and "edit" agentType to the bridge', async () => {
    let observedPrompt = ''
    let observedAgentType = ''
    const original = bridge.runAgent.bind(bridge)
    bridge.runAgent = async (prompt, agentType, projectPath, sessionId) => {
      observedPrompt = prompt
      observedAgentType = agentType
      return original(prompt, agentType, projectPath, sessionId)
    }

    bridge.setMockRawOutput('ok')
    await runEdit('hello world')

    expect(observedPrompt).toBe('hello world')
    expect(observedAgentType).toBe('edit')
  })

  test('throws on bridge error', async () => {
    bridge.setMockError('rate limit exceeded')
    await expect(runEdit('test prompt')).rejects.toThrow(/rate limit/)
  })

  test('throws when window.TauriBridge is not available', async () => {
    ;(globalThis as any).window.TauriBridge = undefined
    await expect(runEdit('test prompt')).rejects.toThrow(/Desktop/i)
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
})
