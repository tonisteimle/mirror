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
])
