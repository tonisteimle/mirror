/**
 * Fixer Draft-Mode Integration Tests
 *
 * Tests `FixerService.generateDraftCode()` — the AI path triggered by the
 * `??` marker in the editor. Unlike `fix()` / `quickFix()` which return
 * multi-file FixerResponse JSON, `generateDraftCode` returns a single
 * code string ready to splice into the editor at the draft block position.
 *
 * The test uses `MockTauriBridge` (with `mockRawOutput`) so we exercise the
 * real fixer code without hitting Claude CLI.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createMockTauriBridge, MockTauriBridge } from '../helpers/mock-tauri-bridge'
import { createFixer, FixerService } from '../../studio/agent/fixer'

// ============================================
// HELPERS
// ============================================

function makeFixer(): { fixer: FixerService; bridge: MockTauriBridge; cleanup: () => void } {
  const bridge = createMockTauriBridge({ useRealCli: false, responseDelay: 5 })
  ;(globalThis as any).window = (globalThis as any).window || {}
  ;(globalThis as any).window.TauriBridge = bridge

  const files = { 'app.mir': 'Frame\n  Text "before"' }
  const fixer = createFixer({
    getFiles: () => Object.entries(files).map(([name, code]) => ({ name, type: 'layout', code })),
    getCurrentFile: () => 'app.mir',
    getEditorContent: () => files['app.mir'],
    getCursor: () => ({ line: 1, column: 1, offset: 0 }),
    getSelection: () => null,
    getFileContent: f => files[f as keyof typeof files] ?? null,
    saveFile: async (f, c) => {
      ;(files as any)[f] = c
    },
    createFile: async (f, c) => {
      ;(files as any)[f] = c
    },
    updateEditor: c => {
      files['app.mir'] = c
    },
    refreshFileTree: () => {},
  })

  return {
    fixer,
    bridge,
    cleanup: () => {
      delete (globalThis as any).window.TauriBridge
    },
  }
}

// ============================================
// TESTS
// ============================================

describe('FixerService.generateDraftCode', () => {
  let fixer: FixerService
  let bridge: MockTauriBridge
  let cleanup: () => void

  beforeEach(() => {
    ;({ fixer, bridge, cleanup } = makeFixer())
  })

  afterEach(() => {
    cleanup()
  })

  describe('Code-Block Extraction', () => {
    test('extracts code from ```mirror fenced block', async () => {
      bridge.setMockRawOutput('```mirror\nButton "Klick"\n```')
      const code = await fixer.generateDraftCode('add a button', '', 'Frame')
      expect(code).toBe('Button "Klick"')
    })

    test('extracts code from generic ``` block (no language tag)', async () => {
      bridge.setMockRawOutput('Hier ist dein Code:\n```\nText "Hi"\n```\nFertig.')
      const code = await fixer.generateDraftCode(null, '', '')
      expect(code).toBe('Text "Hi"')
    })

    test('extracts code from ```mir block (alternate language tag)', async () => {
      bridge.setMockRawOutput('```mir\nFrame gap 8\n  Button "A"\n  Button "B"\n```')
      const code = await fixer.generateDraftCode('two buttons', '', 'Frame')
      expect(code).toBe('Frame gap 8\n  Button "A"\n  Button "B"')
    })

    test('falls back to raw text when no code block but content looks like Mirror', async () => {
      bridge.setMockRawOutput('Frame hor, gap 12\n  Text "Hello"')
      const code = await fixer.generateDraftCode('layout', '', '')
      expect(code).toBe('Frame hor, gap 12\n  Text "Hello"')
    })

    test('falls back when first token is `canvas` (lowercase top-level)', async () => {
      bridge.setMockRawOutput('canvas mobile\nFrame\n  Text "App"')
      const code = await fixer.generateDraftCode(null, '', '')
      expect(code).toContain('canvas mobile')
    })
  })

  describe('Error Handling', () => {
    test('throws when AI returns prose with no code', async () => {
      bridge.setMockRawOutput('Ich kann das leider nicht erzeugen.')
      await expect(fixer.generateDraftCode('do impossible thing', '', '')).rejects.toThrow(
        /Keine Code-Antwort/
      )
    })

    test('throws when AI returns empty string', async () => {
      bridge.setMockRawOutput('')
      await expect(fixer.generateDraftCode('anything', '', '')).rejects.toThrow(
        /Keine Code-Antwort/
      )
    })

    test('throws when CLI signals failure', async () => {
      bridge.setMockError('Claude CLI exit code 1')
      await expect(fixer.generateDraftCode('foo', '', '')).rejects.toThrow(/Claude CLI/)
    })

    test('throws when no Tauri bridge present', async () => {
      cleanup() // remove window.TauriBridge
      await expect(fixer.generateDraftCode('foo', '', '')).rejects.toThrow(/Desktop/)
    })

    test('blocks concurrent calls (isProcessing guard)', async () => {
      bridge.setMockRawOutput('```mirror\nButton "A"\n```')
      const first = fixer.generateDraftCode('a', '', '')
      // Second call while first still pending → reject immediately
      await expect(fixer.generateDraftCode('b', '', '')).rejects.toThrow(/bereits aktiv/)
      // First call still resolves cleanly
      await expect(first).resolves.toBe('Button "A"')
    })

    test('isProcessing is false after error (cleanup happens)', async () => {
      bridge.setMockError('boom')
      await expect(fixer.generateDraftCode('foo', '', '')).rejects.toThrow()
      expect(fixer.isBusy()).toBe(false)
    })

    test('isProcessing is false after success (cleanup happens)', async () => {
      bridge.setMockRawOutput('```mirror\nButton "OK"\n```')
      await fixer.generateDraftCode('foo', '', '')
      expect(fixer.isBusy()).toBe(false)
    })
  })

  describe('Prompt Construction', () => {
    /**
     * Spy on `bridge.runAgent` (the underlying class method) — not
     * `bridge.agent.runAgent`, which is a getter returning a fresh subobject
     * each access, so spy overrides on it don't stick.
     */
    function spyOnRunAgent(): {
      calls: Array<{ prompt: string; agentType: string; sessionId: string | null | undefined }>
    } {
      const calls: Array<{
        prompt: string
        agentType: string
        sessionId: string | null | undefined
      }> = []
      const orig = bridge.runAgent.bind(bridge)
      ;(bridge as any).runAgent = async (
        prompt: string,
        agentType: string,
        projectPath: string,
        sessionId?: string | null
      ) => {
        calls.push({ prompt, agentType, sessionId })
        return orig(prompt, agentType, projectPath, sessionId)
      }
      return { calls }
    }

    test('includes user prompt in the AI request when provided', async () => {
      const spy = spyOnRunAgent()
      bridge.setMockRawOutput('```mirror\nButton\n```')

      await fixer.generateDraftCode('add a primary button', '', 'Frame')

      expect(spy.calls).toHaveLength(1)
      expect(spy.calls[0].prompt).toContain('add a primary button')
      expect(spy.calls[0].prompt).toContain('Mirror DSL')
      expect(spy.calls[0].prompt).toContain('??') // mentions the marker
    })

    test('includes draft content when present', async () => {
      const spy = spyOnRunAgent()
      bridge.setMockRawOutput('```mirror\nButton "fixed"\n```')

      await fixer.generateDraftCode('fix this', 'Btn "broken"', 'Frame\n  Btn "broken"')

      expect(spy.calls[0].prompt).toContain('Btn "broken"')
    })

    test('handles null prompt with empty content (pure generation)', async () => {
      bridge.setMockRawOutput('```mirror\nFrame gap 8\n```')
      const code = await fixer.generateDraftCode(null, '', 'canvas mobile')
      expect(code).toBe('Frame gap 8')
    })

    test('passes "draft" as agentType to the bridge', async () => {
      const spy = spyOnRunAgent()
      bridge.setMockRawOutput('```mirror\nFrame\n```')

      await fixer.generateDraftCode('foo', '', '')

      expect(spy.calls[0].agentType).toBe('draft')
    })
  })

  describe('Session Continuity', () => {
    function spyOnRunAgent(): { sessionIds: (string | null | undefined)[] } {
      const sessionIds: (string | null | undefined)[] = []
      const orig = bridge.runAgent.bind(bridge)
      ;(bridge as any).runAgent = async (
        prompt: string,
        agentType: string,
        projectPath: string,
        sessionId?: string | null
      ) => {
        sessionIds.push(sessionId)
        return orig(prompt, agentType, projectPath, sessionId)
      }
      return { sessionIds }
    }

    test('reuses session id across consecutive calls', async () => {
      const spy = spyOnRunAgent()
      bridge.setMockRawOutput('```mirror\nA\n```')

      await fixer.generateDraftCode('1', '', '')
      await fixer.generateDraftCode('2', '', '')

      // First call: fresh fixer → sessionId is null. Second call: bridge returned a session id.
      expect(spy.sessionIds[0]).toBeNull()
      expect(spy.sessionIds[1]).toBe('mock-session-1')
    })

    test('clearSession() resets session id back to null', async () => {
      bridge.setMockRawOutput('```mirror\nA\n```')
      await fixer.generateDraftCode('1', '', '')

      fixer.clearSession()
      const spy = spyOnRunAgent()
      bridge.setMockRawOutput('```mirror\nB\n```')
      await fixer.generateDraftCode('2', '', '')

      expect(spy.sessionIds[0]).toBeNull()
    })
  })
})
