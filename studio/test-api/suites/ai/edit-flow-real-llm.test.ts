/**
 * Real-LLM Browser-E2E-Tests für den LLM-Edit-Flow.
 *
 * Diese Tests rufen die ECHTE `claude` CLI über den `ai-bridge`-Server auf
 * und exerzieren den vollständigen Studio-UI-Pfad:
 *   Cmd+Enter / Cmd+Shift+Enter
 *     → llm-keymap → edit-handler → runEditFlow
 *     → fixer.runEdit → window.TauriBridge.agent.runAgent
 *     → ai-bridge HTTP server → claude CLI subprocess
 *     → patch-format.parse → patch-applier.apply
 *     → setGhostDiffEffect → ghostDiffField
 *     → Tab → doc replace
 *
 * **Voraussetzungen** (vor Test-Start):
 *   1. `npm run ai-bridge` läuft auf Port 3456 (HTTP-Wrapper um claude CLI)
 *   2. `npm run studio` läuft (Test-Runner connected via CDP)
 *   3. `claude` CLI installiert (~/.local/bin/claude oder PATH)
 *
 * Run:
 *   npm run test:browser:edit-flow-real
 *   npx tsx tools/test.ts --filter="real-LLM" --headed --timeout=60000
 *
 * **Nicht in `allAITests` enthalten** — diese Tests sind langsam (5-15s
 * pro Scenario LLM-Latenz) und erfordern externe Infra (`claude` CLI).
 * Werden über die separate Kategorie `ai.realLlm` ausgeführt.
 *
 * **Validierungs-Strategie:**
 * - Semantik-Checks gegen finalen Source (kein exakter String-Vergleich,
 *   weil LLM-Output variabel ist).
 * - UI-State-Asserts (Status-Indicator-DOM, Ghost-Diff-Field).
 * - Edge-Cases (Esc, Direct-Edit) testen Verhalten, nicht LLM-Inhalt.
 */

import type { TestCase, TestAPI } from '../../types'
import type { EditorView } from '@codemirror/view'
import { describe, testWithSetup } from '../../test-runner'
import { installCliBridgeShim } from '../../cli-bridge-shim'
import { ghostDiffField, isGhostActive } from '../../../editor/ghost-diff'
import { getEditStatusElement } from '../../../editor/edit-status-indicator'

/**
 * The public TestAPI types `codemirror` as the slim `CodeMirrorAPI` (no
 * direct view access), but the runtime object is a `CodeMirrorTestAPI`
 * with `getView()`. Tests in this file need view access to inspect
 * the ghost-diff StateField, so we narrow via this helper.
 */
function getView(api: TestAPI): EditorView | null {
  const cm = api.codemirror as { getView?: () => EditorView | null }
  return cm.getView ? cm.getView() : null
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Idempotent shim install. Each test calls this — the shim replaces
 * `window.TauriBridge` with the HTTP-forwarding stub. If already
 * installed, this is a no-op overwrite (cheap).
 */
function ensureShimInstalled(): void {
  installCliBridgeShim({ verbose: false })
}

/** Poll until predicate is true or timeout. Throws on timeout. */
async function waitUntil(
  predicate: () => boolean,
  timeoutMs = 30_000,
  pollMs = 100,
  label = 'condition'
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return
    await new Promise(r => setTimeout(r, pollMs))
  }
  throw new Error(`Timeout (${timeoutMs}ms) waiting for: ${label}`)
}

function getStatusState(): 'thinking' | 'ready' | 'error' | null {
  const el = getEditStatusElement()
  if (!el) return null
  if (el.classList.contains('cm-llm-status-thinking')) return 'thinking'
  if (el.classList.contains('cm-llm-status-ready')) return 'ready'
  if (el.classList.contains('cm-llm-status-error')) return 'error'
  return null
}

function getGhostActive(api: TestAPI): boolean {
  const view = getView(api)
  if (!view) return false
  return isGhostActive(view.state)
}

function getGhostNewSource(api: TestAPI): string | null {
  const view = getView(api)
  if (!view) return null
  const state = view.state.field(ghostDiffField)
  return state.active ? state.newSource : null
}

function getPromptInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('.cm-llm-prompt-field .cm-llm-prompt-input')
}

/**
 * Wait for `getStatusState()` to leave the `thinking` state. Returns the
 * final state ('ready', 'error', or null=hidden). Generous timeout because
 * real LLM calls take 5-15s.
 */
async function waitForLlmFinish(timeoutMs = 30_000): Promise<'ready' | 'error' | null> {
  await waitUntil(
    () => {
      const s = getStatusState()
      return s !== 'thinking'
    },
    timeoutMs,
    200,
    'LLM call to finish'
  )
  const s = getStatusState()
  return s === 'thinking' ? null : s
}

// ============================================================================
// Scenarios
// ============================================================================

export const realLlmEditFlowTests: TestCase[] = describe('AI · LLM-Edit-Flow (real CLI)', [
  // ───────────────────────────────────────────────────────────────────────
  // Scenario 1: Mode 1 happy-path — typo fix, accept via Tab
  // ───────────────────────────────────────────────────────────────────────
  testWithSetup(
    'mode 1: Cmd+Enter on typo → ghost appears → Tab accepts',
    'canvas mobile, bg #1a1a1a\n\nButton "Speihern", bg #2271C1, col white',
    async (api: TestAPI) => {
      ensureShimInstalled()
      await api.utils.waitForCompile()

      const cm = api.codemirror
      cm.focus()
      cm.setCursor(3, 1)

      // Sanity: source has the typo, no ghost yet, no status indicator.
      api.assert.ok(cm.getContent().includes('Speihern'), 'source has typo before edit')
      api.assert.ok(!getGhostActive(api), 'no ghost before edit')
      api.assert.ok(getStatusState() === null, 'no status indicator before edit')

      // Trigger Mode 1.
      cm.executeKeyBinding('Mod-Enter')

      // Status indicator should flip to "thinking" within a tick.
      await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
      api.assert.equals(getStatusState(), 'thinking', 'status is thinking during LLM call')

      // Wait for ghost to appear (LLM responds within ~3-15s).
      await waitUntil(() => getGhostActive(api), 30_000, 200, 'ghost active')
      api.assert.ok(getGhostActive(api), 'ghost active after LLM response')
      api.assert.equals(getStatusState(), 'ready', 'status flipped to ready')

      // The proposed source should fix "Speihern" → "Speichern".
      const proposed = getGhostNewSource(api)
      api.assert.ok(proposed !== null, 'ghost has newSource')
      api.assert.ok(proposed!.includes('Speichern'), 'proposed source contains Speichern')
      api.assert.ok(!proposed!.includes('Speihern'), 'proposed source dropped typo')

      // Doc itself is still the original (ghost is preview, not commit).
      api.assert.ok(cm.getContent().includes('Speihern'), 'doc unchanged before Tab')

      // Accept via Tab.
      cm.executeKeyBinding('Tab')
      await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared after Tab')

      // Doc is now the proposed source.
      api.assert.ok(cm.getContent().includes('Speichern'), 'doc has fix after Tab')
      api.assert.ok(!cm.getContent().includes('Speihern'), 'doc dropped typo after Tab')
      api.assert.ok(getStatusState() === null, 'status indicator hidden after accept')
    }
  ),

  // ───────────────────────────────────────────────────────────────────────
  // Scenario 2: Mode 1 no-change — clean idiomatic code stays untouched
  // ───────────────────────────────────────────────────────────────────────
  testWithSetup(
    'mode 1: Cmd+Enter on clean code → no-change → no ghost shown',
    'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12\n  Text "Hello", col white, fs 18\n  Button "OK", bg #2271C1, col white, pad 10 20, rad 6',
    async (api: TestAPI) => {
      ensureShimInstalled()
      await api.utils.waitForCompile()

      const cm = api.codemirror
      cm.focus()
      cm.setCursor(1, 1)

      const sourceBefore = cm.getContent()
      cm.executeKeyBinding('Mod-Enter')

      await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')

      const finalStatus = await waitForLlmFinish()

      // For clean code the LLM should return no patches. The flow then
      // hides the status indicator and never activates the ghost.
      api.assert.ok(!getGhostActive(api), 'no ghost after no-change response')
      api.assert.ok(finalStatus === null, 'status hides on no-change (no banner kept open)')
      api.assert.equals(cm.getContent(), sourceBefore, 'doc untouched on no-change')
    }
  ),

  // ───────────────────────────────────────────────────────────────────────
  // Scenario 3: Mode 2 — selection bounds the edit
  // ───────────────────────────────────────────────────────────────────────
  testWithSetup(
    'mode 2: Cmd+Enter with selection → only selection-area patches',
    'canvas mobile\n\nFrame gap 12\n  Button "Save", bg #2271C1\n  Button "Cancel", bg #333',
    async (api: TestAPI) => {
      ensureShimInstalled()
      await api.utils.waitForCompile()

      const cm = api.codemirror
      cm.focus()
      // Select the Save line (line 4). Use editor selectLines via api.editor.
      api.editor.selectLines(4, 4)

      cm.executeKeyBinding('Mod-Enter')
      await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')

      const finalStatus = await waitForLlmFinish()

      // Either: ghost appeared with a proposal (selection-bounded) OR the
      // LLM returned no-change. Both are valid. The hard invariant is:
      // the Cancel line MUST survive, because it's outside the selection.
      if (finalStatus === 'ready') {
        api.assert.ok(getGhostActive(api), 'ghost active when status=ready')
        const proposed = getGhostNewSource(api)
        api.assert.ok(
          proposed!.includes('Button "Cancel"'),
          'Cancel button still in proposed source'
        )
        cm.executeKeyBinding('Tab')
        await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared')
        api.assert.ok(cm.getContent().includes('Button "Cancel"'), 'Cancel survived after accept')
      } else {
        api.assert.ok(finalStatus === null, 'no-change → status hidden')
        api.assert.ok(cm.getContent().includes('Button "Cancel"'), 'Cancel survived (no-change)')
      }
    }
  ),

  // ───────────────────────────────────────────────────────────────────────
  // Scenario 4: Mode 3 — Cmd+Shift+Enter opens prompt-field, instruction submitted
  // ───────────────────────────────────────────────────────────────────────
  testWithSetup(
    'mode 3: Cmd+Shift+Enter → prompt-field → instruction → ghost matches intent',
    'canvas mobile\n\nText "Headline", fs 24, col white',
    async (api: TestAPI) => {
      ensureShimInstalled()
      await api.utils.waitForCompile()

      const cm = api.codemirror
      cm.focus()
      cm.setCursor(1, 1)

      // No prompt field before trigger.
      api.assert.ok(getPromptInput() === null, 'no prompt field before Cmd+Shift+Enter')

      cm.executeKeyBinding('Mod-Shift-Enter')

      await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')

      const input = getPromptInput()!
      api.assert.ok(input !== null, 'prompt field is open')

      // Type the instruction and submit via Enter.
      input.value = 'Mache den Text fett (weight bold)'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )

      // Prompt field closes immediately on submit; status flips to thinking.
      await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
      api.assert.ok(getPromptInput() === null, 'prompt field closed after submit')

      const finalStatus = await waitForLlmFinish()
      api.assert.equals(finalStatus, 'ready', 'LLM produced an edit')
      api.assert.ok(getGhostActive(api), 'ghost active')

      const proposed = getGhostNewSource(api)
      api.assert.ok(
        proposed!.includes('weight bold'),
        `proposed source has weight bold (got: ${proposed!.slice(0, 120)})`
      )

      cm.executeKeyBinding('Tab')
      await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared')
      api.assert.ok(cm.getContent().includes('weight bold'), 'doc has weight bold after accept')
    }
  ),
])
