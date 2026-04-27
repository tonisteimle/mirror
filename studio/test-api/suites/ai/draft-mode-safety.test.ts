/**
 * Draft Mode Safety Tests
 *
 * Production-deploy-readiness tests for the `??` AI-assist flow. Where
 * draft-mode-integration.test.ts proves the integration is wired,
 * THIS file proves the wiring is safe under realistic failure modes
 * and the actual production trigger (typing the closing `??`).
 *
 * Coverage targets:
 *   1. Auto-submit on second `??` typed       (the live UX trigger)
 *   2. Splice indent fidelity                  (no mis-indent regressions)
 *   3. Splice race                             (user typing during AI call)
 *   4. State cleanup after splice              (no orphaned draft state)
 *   5. Bridge failure → editor recovery        (timeout, error, missing)
 *   6. Concurrent submits                      (second ?? while first runs)
 */

import { test, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

// =============================================================================
// Test bridge installer — same trick simulateAIGeneration uses, exposed as
// an explicit helper so individual tests can control timing + failure mode.
// =============================================================================

interface BridgeBehavior {
  /** What to return as the AI's code (wrapped in a ```mirror block). */
  code?: string
  /** Throw an error from runAgent (e.g. "rate limit exceeded"). */
  error?: string
  /** Pretend the CLI is missing — checkClaudeCli returns false. */
  missingCli?: boolean
  /** Delay before responding (ms). */
  delayMs?: number
  /** Hook fired on every runAgent call (for race-condition tests). */
  onAgentCalled?: () => void | Promise<void>
}

function installFakeBridge(behavior: BridgeBehavior): () => void {
  const win = window as unknown as { TauriBridge?: unknown }
  const previous = win.TauriBridge
  win.TauriBridge = {
    isTauri: () => true,
    agent: {
      checkClaudeCli: async () => !behavior.missingCli,
      runAgent: async () => {
        if (behavior.onAgentCalled) await behavior.onAgentCalled()
        if (behavior.delayMs) {
          await new Promise(resolve => setTimeout(resolve, behavior.delayMs))
        }
        if (behavior.error) {
          return {
            session_id: 'fake',
            success: false,
            output: '',
            error: behavior.error,
          }
        }
        return {
          session_id: 'fake',
          success: true,
          output: '```mirror\n' + (behavior.code ?? '') + '\n```',
          error: null,
        }
      },
      onAgentOutput: async () => () => {},
    },
  }
  return () => {
    if (previous === undefined) delete win.TauriBridge
    else win.TauriBridge = previous
  }
}

async function settleAfterDispatch(api: TestAPI, ms = 60): Promise<void> {
  await api.utils.delay(ms)
}

// =============================================================================
// 1 — Auto-submit on second ??
// =============================================================================

const autoSubmitTests: TestCase[] = [
  test('Auto-submit fires when user types closing ?? after a prompt', async api => {
    const restore = installFakeBridge({ code: '  Button "Generated"' })
    try {
      // Open block: prompt is set, no closing ?? yet — should NOT submit.
      await api.editor.setCode('Frame\n  ?? add a button\n  ')
      await settleAfterDispatch(api)
      api.assert.ok(api.draftMode.isActive(), 'open block should be detected')

      const before = api.codemirror.getContent()
      api.assert.ok(before.includes('?? add a button'), 'prompt still present')
      api.assert.ok(!before.includes('Button "Generated"'), 'AI not yet fired')

      // User types the closing ??. Production extension's update listener
      // sees the inactive→closed transition and fires handleSubmit.
      await api.editor.setCode('Frame\n  ?? add a button\n  ??')
      // Wait for: (a) the update listener to fire, (b) handleSubmit to
      // resolve via the fake bridge, (c) the splice dispatch to settle.
      await settleAfterDispatch(api, 200)

      const after = api.codemirror.getContent()
      api.assert.ok(
        after.includes('Button "Generated"'),
        `splice should have happened. Editor content:\n${after}`
      )
      api.assert.ok(!after.includes('??'), 'all ?? markers should be cleared')
    } finally {
      restore()
    }
  }),

  test('Auto-submit fires for paste of complete ?? prompt ?? block', async api => {
    const restore = installFakeBridge({ code: '  Text "Pasted"' })
    try {
      // Inactive → closed transition in one step (paste path).
      await api.editor.setCode('Frame\n  ?? generate text\n  ??')
      await settleAfterDispatch(api, 200)

      const after = api.codemirror.getContent()
      api.assert.ok(
        after.includes('Text "Pasted"'),
        `splice should have happened on paste. Editor content:\n${after}`
      )
    } finally {
      restore()
    }
  }),

  test('Auto-submit does NOT fire while block is still open (no closing ??)', async api => {
    const restore = installFakeBridge({ code: '  Button "Should not appear"' })
    try {
      await api.editor.setCode('Frame\n  ?? add something')
      await settleAfterDispatch(api, 200)

      const after = api.codemirror.getContent()
      api.assert.ok(!after.includes('Should not appear'), 'AI must not fire on an open block')
      api.assert.ok(api.draftMode.isActive(), 'draft mode still active')
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// 2 — Splice indent fidelity
// =============================================================================

const indentTests: TestCase[] = [
  test('Splice preserves the marker indentation (2 spaces)', async api => {
    const restore = installFakeBridge({
      code: 'Button "Save"\nButton "Cancel"',
    })
    try {
      await api.editor.setCode('Frame\n  ?? two buttons\n  ??')
      await settleAfterDispatch(api, 200)

      const lines = api.codemirror.getContent().split('\n')
      const saveLine = lines.find(l => l.includes('Button "Save"'))
      const cancelLine = lines.find(l => l.includes('Button "Cancel"'))
      api.assert.ok(saveLine !== undefined, 'Save line should exist')
      api.assert.ok(cancelLine !== undefined, 'Cancel line should exist')
      api.assert.ok(
        saveLine!.startsWith('  Button'),
        `Save line indent should be 2 spaces, got: "${saveLine}"`
      )
      api.assert.ok(
        cancelLine!.startsWith('  Button'),
        `Cancel line indent should be 2 spaces, got: "${cancelLine}"`
      )
    } finally {
      restore()
    }
  }),

  test('Splice preserves deep indentation (6 spaces, nested 3 levels)', async api => {
    const restore = installFakeBridge({ code: 'Text "Deep"' })
    try {
      await api.editor.setCode('Frame\n  Frame\n    Frame\n      ?? add text\n      ??')
      await settleAfterDispatch(api, 200)

      const lines = api.codemirror.getContent().split('\n')
      const deepLine = lines.find(l => l.includes('Text "Deep"'))
      api.assert.ok(deepLine !== undefined, 'Deep text line should exist')
      api.assert.ok(
        deepLine!.startsWith('      Text'),
        `Should have 6-space indent, got: "${deepLine}"`
      )
    } finally {
      restore()
    }
  }),

  test('Splice at root level (zero indent) leaves no leading whitespace', async api => {
    const restore = installFakeBridge({ code: 'Frame\n  Button "Root"' })
    try {
      await api.editor.setCode('?? root level\n??')
      await settleAfterDispatch(api, 200)

      const content = api.codemirror.getContent()
      const lines = content.split('\n').filter(l => l.length > 0)
      api.assert.ok(lines[0] === 'Frame', `First line should be 'Frame', got: "${lines[0]}"`)
      api.assert.ok(
        lines[1] === '  Button "Root"',
        `Second line should preserve the AI's relative indent, got: "${lines[1]}"`
      )
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// 3 — Splice race: user types in editor while AI call is in flight
// =============================================================================

const raceTests: TestCase[] = [
  test('Splice still lands at the original ?? marker after user edits OUTSIDE the block', async api => {
    let agentCalled = false
    const restore = installFakeBridge({
      code: '  Button "Generated"',
      delayMs: 150,
      onAgentCalled: () => {
        agentCalled = true
      },
    })
    try {
      await api.editor.setCode('Frame\n  ?? add button\n  ??\nText "below"')
      await settleAfterDispatch(api, 50)

      // Wait for the agent call to start, then mutate a line OUTSIDE the
      // draft block while the fake bridge sleeps for 150ms.
      const startWait = Date.now()
      while (!agentCalled && Date.now() - startWait < 1000) {
        await api.utils.delay(10)
      }
      api.assert.ok(agentCalled, 'agent should have been called')

      // Mutation: change "Text below" to "Text mutated" (line 4).
      await api.editor.setCode('Frame\n  ?? add button\n  ??\nText "mutated"')
      // Now wait for the splice to complete.
      await settleAfterDispatch(api, 250)

      const after = api.codemirror.getContent()
      // The splice may or may not preserve the user's edit (depends on CM
      // state-field tracking), but the key invariant is: NO orphaned ??
      // markers + the Button is present.
      api.assert.ok(
        after.includes('Button "Generated"'),
        `Button should be in editor after race. Content:\n${after}`
      )
      api.assert.ok(!after.includes('??'), `no ?? marker should remain. Content:\n${after}`)
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// 4 — State cleanup after splice
// =============================================================================

const cleanupTests: TestCase[] = [
  test('Draft state is inactive after a successful splice', async api => {
    const restore = installFakeBridge({ code: 'Button "X"' })
    try {
      await api.editor.setCode('Frame\n  ?? something\n  ??')
      await settleAfterDispatch(api, 200)

      api.assert.ok(!api.draftMode.isActive(), 'draft mode should be cleared after splice')
      const state = api.draftMode.getState()
      api.assert.ok(state.startLine === null, 'startLine should be null')
      api.assert.ok(!state.processing, 'processing should be false')
    } finally {
      restore()
    }
  }),

  test('isProcessing transitions true → false across an AI call', async api => {
    const restore = installFakeBridge({ code: 'Button "OK"', delayMs: 100 })
    try {
      await api.editor.setCode('Frame\n  ?? add button')
      await settleAfterDispatch(api)

      // Trigger via Cmd+Enter (the open-block fallback).
      const submitPromise = api.draftMode.triggerSubmit()
      // Within the delay window, processing should be true.
      await api.utils.delay(40)
      api.assert.ok(api.draftMode.getState().processing, 'processing should be true mid-flight')
      await submitPromise
      await settleAfterDispatch(api, 100)
      api.assert.ok(
        !api.draftMode.getState().processing,
        'processing should be false after completion'
      )
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// 5 — Bridge failure → editor recovery
// =============================================================================

const failureTests: TestCase[] = [
  test('Bridge error keeps the draft block intact + clears processing flag', async api => {
    const restore = installFakeBridge({ error: 'rate limit exceeded' })
    try {
      await api.editor.setCode('Frame\n  ?? boom\n  ??')
      await settleAfterDispatch(api, 200)

      const after = api.codemirror.getContent()
      // The draft block should still be there — user can retry.
      api.assert.ok(
        after.includes('?? boom'),
        `draft prompt should survive error. Content:\n${after}`
      )
      api.assert.ok(
        !api.draftMode.getState().processing,
        'processing flag must be cleared after error'
      )
    } finally {
      restore()
    }
  }),

  test('Missing Claude CLI → draft block intact + processing cleared', async api => {
    const restore = installFakeBridge({ missingCli: true })
    try {
      await api.editor.setCode('Frame\n  ?? need cli\n  ??')
      await settleAfterDispatch(api, 200)

      const after = api.codemirror.getContent()
      api.assert.ok(after.includes('?? need cli'), 'draft prompt should survive')
      api.assert.ok(!api.draftMode.getState().processing, 'processing flag must be cleared')
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// 6 — Concurrent submits
// =============================================================================

const concurrencyTests: TestCase[] = [
  test('Second submit while first is processing is rejected gracefully (no editor lock)', async api => {
    const restore = installFakeBridge({ code: 'Button "First"', delayMs: 200 })
    try {
      await api.editor.setCode('Frame\n  ?? request one')
      await settleAfterDispatch(api)

      // Fire two submits back-to-back. The first triggers the AI; the
      // second sees processing=true and is ignored by handleSubmit
      // (returns true without re-firing).
      const first = api.draftMode.triggerSubmit()
      await api.utils.delay(20)
      const second = await api.draftMode.triggerSubmit()
      api.assert.ok(second === true, 'second triggerSubmit must return without throwing')
      await first
      await settleAfterDispatch(api, 100)

      const after = api.codemirror.getContent()
      api.assert.ok(
        after.includes('Button "First"'),
        `first AI call should still complete. Content:\n${after}`
      )
      api.assert.ok(
        !api.draftMode.getState().processing,
        'processing flag must be cleared after both calls settle'
      )
    } finally {
      restore()
    }
  }),
]

// =============================================================================
// Export
// =============================================================================

const allSafetyTests = [
  ...describe('draftMode.safety.autoSubmit', autoSubmitTests),
  ...describe('draftMode.safety.indent', indentTests),
  ...describe('draftMode.safety.race', raceTests),
  ...describe('draftMode.safety.cleanup', cleanupTests),
  ...describe('draftMode.safety.failure', failureTests),
  ...describe('draftMode.safety.concurrency', concurrencyTests),
]

export const draftModeSafetyTests: TestCase[] = allSafetyTests
