/**
 * Real-LLM Browser-E2E-Tests für die HTML-first Generation-Pipeline.
 *
 * Diese Tests rufen die ECHTE `claude` CLI über den `ai-bridge`-Server auf
 * und exerzieren den vollständigen Studio-UI-Pfad für Cmd+Alt+Enter:
 *   Cmd+Alt+Enter
 *     → llm-keymap → edit-handler.generateFromPrompt → openPromptField
 *     → User tippt Prompt + Enter → runGenerationFlow
 *     → runGenerationPipeline (Stage 1: HTML, Stage 2: Mirror, Validate)
 *     → fixer.runEdit → window.TauriBridge.agent.runAgent (×2 + retries)
 *     → ai-bridge HTTP server → claude CLI subprocess
 *     → setGhostDiff with full doc replace → Tab → doc replace
 *
 * Diese Tests komplementieren:
 *   - tests/agent/generation-pipeline.test.ts (Logik mit mocked LLM)
 *   - scripts/eval-generation-pipeline.ts (Real-LLM ohne UI)
 * Hier: das UI-Glue (Keybinding, prompt-field, Status-Phasen, ghost-diff,
 * Esc/Tab) gegen den echten LLM.
 *
 * **Voraussetzungen** (vor Test-Start):
 *   1. `npm run ai-bridge` läuft auf Port 3456 (HTTP-Wrapper um claude CLI)
 *   2. `npm run studio` läuft (Test-Runner connected via CDP)
 *   3. `claude` CLI installiert (~/.local/bin/claude oder PATH)
 *
 * Run:
 *   npx tsx tools/test.ts --category=ai.realLlm --filter=Generation --timeout=120000
 *   npm run test:browser:edit-flow-real -- --filter=Generation
 *
 * **Nicht in `allAITests` enthalten** — diese Tests sind sehr langsam
 * (Stage 1 + Stage 2 + ggf. Retries → 30-90 s pro Scenario) und
 * erfordern externe Infra (`claude` CLI). Werden über die Kategorie
 * `ai.realLlm` ausgeführt.
 *
 * **Validierungs-Strategie:**
 * - Strukturelle Asserts gegen den Mirror-Output (kein exakter String-
 *   Vergleich, weil LLM-Output variabel ist).
 * - Status-Phasen-Tracking (thinking → "HTML wird generiert" → "Übersetze
 *   zu Mirror" → "Validiere" → ready).
 * - Ghost-Diff-Aktivierung + Tab-Accept-Pfad.
 * - Edge-Cases (Esc während thinking, Esc auf aktivem Ghost).
 */

import type { TestCase, TestAPI } from '../../types'
import type { EditorView } from '@codemirror/view'
import { describe, testWithSetup } from '../../test-runner'
import { installCliBridgeShim } from '../../cli-bridge-shim'
import { ghostDiffField, isGhostActive } from '../../../editor/ghost-diff'
import { getEditStatusElement } from '../../../editor/edit-status-indicator'

// ============================================================================
// Helpers (mirror the edit-flow-real-llm test structure 1:1)
// ============================================================================

function getView(api: TestAPI): EditorView | null {
  const cm = api.codemirror as { getView?: () => EditorView | null }
  return cm.getView ? cm.getView() : null
}

function ensureShimInstalled(): void {
  installCliBridgeShim({ verbose: false })
}

async function waitUntil(
  predicate: () => boolean,
  timeoutMs = 60_000,
  pollMs = 200,
  label = 'condition'
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return
    await new Promise(r => setTimeout(r, pollMs))
  }
  throw new Error(`Timeout (${timeoutMs}ms) waiting for: ${label}`)
}

function getStatusState(): 'thinking' | 'ready' | 'error' | 'warning' | null {
  const el = getEditStatusElement()
  if (!el) return null
  if (el.classList.contains('cm-llm-status-thinking')) return 'thinking'
  if (el.classList.contains('cm-llm-status-ready')) return 'ready'
  if (el.classList.contains('cm-llm-status-error')) return 'error'
  if (el.classList.contains('cm-llm-status-warning')) return 'warning'
  return null
}

function getStatusText(): string {
  const el = getEditStatusElement()
  return el?.textContent ?? ''
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
 * Wait for the status indicator to leave the `thinking` state. The
 * pipeline's status text rotates through several "thinking" phases (HTML
 * → translate → validate) — they all share the `thinking` CSS class, so
 * we only react to the class flip. Generous timeout because two LLM calls
 * + up to two retries can take 60+ seconds.
 */
async function waitForGenerationFinish(
  timeoutMs = 90_000
): Promise<'ready' | 'error' | 'warning' | null> {
  await waitUntil(() => getStatusState() !== 'thinking', timeoutMs, 300, 'pipeline to finish')
  const s = getStatusState()
  return s === 'thinking' ? null : s
}

/**
 * Submit the prompt-field. The widget submits on Enter; we use the same
 * keyboard event the user would generate.
 */
function submitPrompt(input: HTMLInputElement, instruction: string): void {
  input.value = instruction
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  )
}

// ============================================================================
// Scenarios
// ============================================================================

export const realLlmGenerationTests: TestCase[] = describe(
  'AI · Generation-Pipeline (Cmd+Alt+Enter, real CLI)',
  [
    // ─────────────────────────────────────────────────────────────────────
    // Scenario 1: Empty editor + prompt → pipeline generates Mirror → Tab
    // ─────────────────────────────────────────────────────────────────────
    testWithSetup(
      'happy: empty editor + Cmd+Alt+Enter + prompt → ghost appears → Tab accepts',
      // Fixture has a renderable element so waitForCompile sees data-mirror-id
      // nodes; we wipe to empty AFTER the initial compile settles.
      'canvas mobile\n\nText "placeholder"',
      async (api: TestAPI) => {
        ensureShimInstalled()
        await api.utils.waitForCompile()

        const cm = api.codemirror
        cm.setContent('')
        cm.focus()

        // Sanity: empty doc, no prompt field, no status indicator.
        api.assert.equals(cm.getContent(), '', 'editor is empty')
        api.assert.ok(getPromptInput() === null, 'no prompt field initially')
        api.assert.ok(getStatusState() === null, 'no status indicator initially')

        // Trigger Cmd+Alt+Enter — opens the prompt field with the
        // generation-specific placeholder.
        cm.executeKeyBinding('Mod-Alt-Enter')

        await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')
        const input = getPromptInput()!
        api.assert.ok(input.placeholder.includes('Pipeline'), 'placeholder mentions Pipeline')

        // Submit a small, deterministic prompt. "Login form" — the
        // pipeline's most stable shape.
        submitPrompt(
          input,
          'Eine kleine Login-Form mit Email, Passwort und einem blauen Login-Button'
        )

        // Status flips through thinking phases. We assert observable
        // ones: any "HTML"/"Übersetze" text appears, then status leaves
        // thinking.
        await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
        api.assert.ok(getPromptInput() === null, 'prompt field closed after submit')

        // Optional: catch at least one phase-text update. The pipeline
        // changes the status text from "AI denkt nach…" → "HTML wird
        // generiert…" → "Übersetze HTML zu Mirror…" → "Validiere…". We
        // sample once after a short delay; if we miss it, that's fine —
        // the final state assertion is the contract.
        await new Promise(r => setTimeout(r, 1500))
        const midText = getStatusText()
        api.assert.ok(
          midText.length > 0 && getStatusState() === 'thinking',
          `status indicator showing thinking text mid-flight (got: ${midText})`
        )

        // Wait for the pipeline to finish (Stage 1 + Stage 2 + maybe retries).
        const final = await waitForGenerationFinish()
        api.assert.ok(
          final === 'ready' || final === 'warning',
          `pipeline finished with usable output (got status=${final})`
        )

        // Ghost must be active — full-doc replacement.
        api.assert.ok(getGhostActive(api), 'ghost is active after generation')
        const proposed = getGhostNewSource(api)
        api.assert.ok(proposed !== null && proposed.length > 0, 'proposed source is non-empty')
        // Loose semantic checks against the prompt — login form should
        // have a Button. We don't check specific tokens because the LLM
        // is non-deterministic.
        api.assert.ok(
          /Button/i.test(proposed!),
          `proposed source has a Button (got: ${proposed!.slice(0, 200)})`
        )

        // Doc still empty before Tab.
        api.assert.equals(cm.getContent(), '', 'doc still empty before Tab-accept')

        // Accept.
        cm.executeKeyBinding('Tab')
        await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared after Tab')

        // Doc now has the proposed Mirror.
        api.assert.equals(cm.getContent(), proposed, 'doc matches proposed source after accept')
        api.assert.ok(getStatusState() === null, 'status indicator hidden after accept')
      }
    ),

    // ─────────────────────────────────────────────────────────────────────
    // Scenario 2: Existing Mirror as sketch → pipeline cleans it up
    // ─────────────────────────────────────────────────────────────────────
    testWithSetup(
      'sketch: existing Mirror + prompt → pipeline replaces with cleaned variant',
      // A rough Mirror sketch. The pipeline treats `baseSource` as a
      // sketch when the prompt field opens with non-empty content.
      'canvas mobile\n\nFrame gap 16, pad 24\n  Text "Hi"\n  Button "Click"',
      async (api: TestAPI) => {
        ensureShimInstalled()
        await api.utils.waitForCompile()

        const cm = api.codemirror
        const sourceBefore = cm.getContent()
        cm.focus()
        cm.setCursor(1, 1)

        cm.executeKeyBinding('Mod-Alt-Enter')
        await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')
        const input = getPromptInput()!

        submitPrompt(input, 'Mache es zu einer schöneren Welcome-Card mit Padding und Farbe')

        await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
        const final = await waitForGenerationFinish()
        api.assert.ok(
          final === 'ready' || final === 'warning',
          `pipeline finished (status=${final})`
        )

        api.assert.ok(getGhostActive(api), 'ghost active')
        const proposed = getGhostNewSource(api)
        api.assert.ok(proposed !== null && proposed.length > 0, 'proposed source non-empty')
        // The cleaned Mirror should still be Mirror — at minimum, contain
        // a Frame or Button. We don't assert on specific tokens.
        api.assert.ok(
          /\b(Frame|Button|Text|canvas)\b/.test(proposed!),
          'proposed source uses Mirror primitives'
        )

        // Doc unchanged before Tab.
        api.assert.equals(cm.getContent(), sourceBefore, 'doc untouched before Tab')

        cm.executeKeyBinding('Tab')
        await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared')
        api.assert.equals(cm.getContent(), proposed, 'doc has cleaned Mirror')
      }
    ),

    // ─────────────────────────────────────────────────────────────────────
    // Scenario 3: Esc during thinking aborts the pipeline — doc untouched.
    // ─────────────────────────────────────────────────────────────────────
    testWithSetup(
      'edge: Esc during thinking → pipeline aborted, doc + ghost untouched',
      'canvas mobile\n\nText "placeholder"',
      async (api: TestAPI) => {
        ensureShimInstalled()
        await api.utils.waitForCompile()

        const cm = api.codemirror
        cm.setContent('')
        cm.focus()

        cm.executeKeyBinding('Mod-Alt-Enter')
        await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')
        const input = getPromptInput()!

        submitPrompt(input, 'Drei Pricing-Tiers mit Features und Buttons')

        // Wait for thinking, then Esc immediately — the LLM is in-flight.
        await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
        api.assert.equals(getStatusState(), 'thinking', 'thinking before Esc')

        cm.executeKeyBinding('Escape')

        // Status hides + ghost never activates. Give 3s for the abort to
        // settle (claude subprocess teardown).
        await waitUntil(() => getStatusState() === null, 5000, 100, 'status hides after Esc')
        api.assert.ok(!getGhostActive(api), 'no ghost after cancel')
        api.assert.equals(cm.getContent(), '', 'doc still empty after cancel')

        // Wait an additional 2s to confirm no late ghost from a race.
        await new Promise(r => setTimeout(r, 2000))
        api.assert.ok(!getGhostActive(api), 'no late ghost from race')
        api.assert.equals(cm.getContent(), '', 'doc still empty')
      }
    ),

    // ─────────────────────────────────────────────────────────────────────
    // Scenario 4: Esc on active ghost → ghost cleared, doc untouched
    // ─────────────────────────────────────────────────────────────────────
    testWithSetup(
      'edge: Esc on active ghost → ghost cleared, doc unchanged',
      'canvas mobile\n\nText "placeholder"',
      async (api: TestAPI) => {
        ensureShimInstalled()
        await api.utils.waitForCompile()

        const cm = api.codemirror
        cm.setContent('')
        cm.focus()

        cm.executeKeyBinding('Mod-Alt-Enter')
        await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')
        const input = getPromptInput()!

        submitPrompt(input, 'Ein einfacher Header mit Titel und Untertitel')

        await waitUntil(() => getStatusState() === 'thinking', 2000, 50, 'status=thinking')
        const final = await waitForGenerationFinish()
        api.assert.ok(
          final === 'ready' || final === 'warning',
          `pipeline finished (status=${final})`
        )
        api.assert.ok(getGhostActive(api), 'ghost active after generation')

        cm.executeKeyBinding('Escape')

        await waitUntil(() => !getGhostActive(api), 2000, 50, 'ghost cleared after Esc')
        api.assert.equals(cm.getContent(), '', 'doc still empty after Esc-dismiss')
        api.assert.equals(getStatusState(), null, 'status hidden after Esc-dismiss')
      }
    ),

    // ─────────────────────────────────────────────────────────────────────
    // Scenario 5: prompt-field cancellation (Esc before submitting)
    // ─────────────────────────────────────────────────────────────────────
    testWithSetup(
      'edge: Esc on open prompt field → field closes, no LLM call',
      'canvas mobile\n\nText "placeholder"',
      async (api: TestAPI) => {
        ensureShimInstalled()
        await api.utils.waitForCompile()

        const cm = api.codemirror
        cm.setContent('')
        cm.focus()

        cm.executeKeyBinding('Mod-Alt-Enter')
        await waitUntil(() => getPromptInput() !== null, 2000, 50, 'prompt field appeared')
        const input = getPromptInput()!

        // Esc on the open prompt field cancels without submitting.
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        )

        await waitUntil(() => getPromptInput() === null, 2000, 50, 'prompt field closed')
        api.assert.equals(getStatusState(), null, 'no status indicator')
        api.assert.ok(!getGhostActive(api), 'no ghost')
        api.assert.equals(cm.getContent(), '', 'doc still empty')

        // Confirm no late LLM activity for 2s — no surprise thinking.
        await new Promise(r => setTimeout(r, 2000))
        api.assert.equals(getStatusState(), null, 'still no status indicator')
        api.assert.ok(!getGhostActive(api), 'still no ghost')
      }
    ),
  ]
)
