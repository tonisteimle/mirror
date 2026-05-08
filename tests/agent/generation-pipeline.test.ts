/**
 * Unit tests for the HTML-first generation pipeline orchestrator.
 *
 *   userPrompt | sketch
 *        ↓
 *    [stage 1] runEdit(html-prompt)        → HTML
 *        ↓
 *    [stage 2] runEdit(translation-prompt) → Mirror
 *        ↓
 *    [stage 3] validate(mirror)
 *        ↓ (errors → retry stage 2 with retryContext, up to maxRetries)
 *
 * The pipeline must be deterministic in everything except the LLM call
 * itself. We mock `runEdit` so the test controls every stage's output
 * and asserts on:
 *
 *  - happy-path success
 *  - empty-input rejection (neither userPrompt nor sketch)
 *  - sketch-only path (sketch primary, no userPrompt fallthrough required)
 *  - HTML stage error (network / bridge / claude crash)
 *  - HTML stage empty-output (LLM produced fences-only or whitespace)
 *  - Translation stage error
 *  - Translation stage empty-output
 *  - Validator-fail → retry → success (retry-context wires errors back in)
 *  - Validator-fail repeat → exhaust retries → status:warning + raw mirror
 *  - Validator-crash → status:warning with empty validationErrors
 *  - Pre-flight nested-state detector blocks before validator (parser hang)
 *  - Code-fence stripping on both HTML and Mirror output
 *  - W500 (undefined token) elevation to blocking, but not bogus $48,217 refs
 *  - AbortSignal in stage 1 / stage 2 / between retries
 *  - Telemetry onStep events fire in the documented order with durations
 *  - Sibling files & TranslationContext propagate to stage 2 prompt
 *
 * The mock for `runEdit` lives in this file (not in a shared helper) on
 * purpose — pipeline tests are sensitive to call-order and prompt-content
 * routing, and a generic queue would obscure those assertions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  runGenerationPipeline,
  type GenerationPipelineStepEvent,
} from '../../studio/agent/generation-pipeline'

// =============================================================================
// runEdit mock — call-order based, with per-prompt routing
// =============================================================================
//
// The pipeline calls `runEdit` once for HTML (stage 1), then once or more
// for translation (stage 2 + retries). The mock script is a list of
// `Step` entries; each entry decides what to do for the next call. We
// keep both per-call inspection (the captured prompts) and ordering
// guarantees so tests can assert "the second call's prompt mentions
// the validator error from the first translation".

interface Step {
  /** What the call should resolve / reject with. */
  outcome: { kind: 'resolve'; value: string } | { kind: 'reject'; error: Error } | { kind: 'abort' }
  /** Synthetic delay before resolving — lets us test signal-mid-call. */
  delayMs?: number
}

const fixture = {
  capturedPrompts: [] as string[],
  capturedSignals: [] as (AbortSignal | undefined)[],
  steps: [] as Step[],
  index: 0,
}

vi.mock('../../studio/agent/fixer', () => ({
  runEdit: vi.fn(async (prompt: string, signal?: AbortSignal): Promise<string> => {
    fixture.capturedPrompts.push(prompt)
    fixture.capturedSignals.push(signal)
    const step = fixture.steps[fixture.index]
    fixture.index += 1
    if (!step) {
      throw new Error(
        `runEdit mock: no step configured for call #${fixture.index} ` +
          `(captured ${fixture.capturedPrompts.length} prompts so far). ` +
          `Add another fixture.steps entry.`
      )
    }

    if (step.outcome.kind === 'abort') {
      // Simulate the AbortSignal firing during the call.
      if (signal) {
        return new Promise((_, reject) => {
          if (signal.aborted) {
            reject(makeAbortError())
            return
          }
          signal.addEventListener('abort', () => reject(makeAbortError()), { once: true })
        })
      }
      throw makeAbortError()
    }

    if (step.delayMs) await new Promise(r => setTimeout(r, step.delayMs))

    if (step.outcome.kind === 'reject') {
      throw step.outcome.error
    }
    return step.outcome.value
  }),
}))

function makeAbortError(): Error {
  return new DOMException('Aborted', 'AbortError')
}

function resetFixture(): void {
  fixture.capturedPrompts = []
  fixture.capturedSignals = []
  fixture.steps = []
  fixture.index = 0
}

function script(...steps: Step[]): void {
  fixture.steps = steps
  fixture.index = 0
}

function ok(value: string, delayMs?: number): Step {
  return { outcome: { kind: 'resolve', value }, delayMs }
}

function fail(message: string): Step {
  return { outcome: { kind: 'reject', error: new Error(message) } }
}

function abort(): Step {
  return { outcome: { kind: 'abort' } }
}

beforeEach(() => {
  resetFixture()
})

// =============================================================================
// Fixtures: representative HTML and Mirror outputs
// =============================================================================

const VALID_HTML = `<!doctype html>
<html><head><style>:root { --primary: #2271C1; }</style></head>
<body><div class="card">Hello</div></body></html>`

const VALID_MIRROR = `// Tokens
primary.bg: #2271C1

// Layout
Frame pad 16
  Text "Hello", col $primary`

const INVALID_MIRROR_BAD_TOKEN = `Frame pad 16, bg $undefined_token
  Text "Hello"`

const INVALID_MIRROR_NESTED_STATE = `Frame pad 16
  hover:
    on:
      bg #f00`

// =============================================================================
// Happy path
// =============================================================================

describe('runGenerationPipeline — happy path', () => {
  it('returns success with mirror, html, and 0 retries when stage 2 validates first try', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A welcome card' })

    expect(result.status).toBe('success')
    expect(result.mirror).toBe(VALID_MIRROR)
    expect(result.html).toBe(VALID_HTML)
    expect(result.translationRetries).toBe(0)
    expect(result.validationErrors).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('threads userPrompt through stage 1', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))
    await runGenerationPipeline({ userPrompt: 'A login form with email and password' })
    expect(fixture.capturedPrompts[0]).toContain('A login form with email and password')
  })

  it('threads HTML, context, and siblings through stage 2', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    await runGenerationPipeline({
      userPrompt: 'A widget',
      context: { type: 'Stat card', purpose: 'Show monthly revenue' },
      siblings: { 'tokens.tok': 'accent.bg: #2271C1' },
    })

    const stage2Prompt = fixture.capturedPrompts[1]
    expect(stage2Prompt).toContain(VALID_HTML)
    expect(stage2Prompt).toContain('Stat card')
    expect(stage2Prompt).toContain('Show monthly revenue')
    expect(stage2Prompt).toContain('accent.bg: #2271C1')
  })
})

// =============================================================================
// Sketch-only path
// =============================================================================

describe('runGenerationPipeline — sketch input', () => {
  it('handles sketch-only input (no userPrompt) and surfaces sketch in stage 1', async () => {
    const sketch = 'Card pad 24\n  Title "Hello"\n  Btn "Action"'
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ sketch })

    expect(result.status).toBe('success')
    expect(fixture.capturedPrompts[0]).toContain(sketch)
    expect(fixture.capturedPrompts[0]).toMatch(/designer's interpreter/i)
  })

  it('handles sketch + userPrompt — sketch primary, prompt as additional notes', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    await runGenerationPipeline({
      sketch: 'Card "Hello"',
      userPrompt: 'Linear-style notification',
    })

    const stage1 = fixture.capturedPrompts[0]
    expect(stage1).toMatch(/Designer's sketch/)
    expect(stage1).toContain('Card "Hello"')
    expect(stage1).toMatch(/Additional notes/)
    expect(stage1).toContain('Linear-style notification')
  })
})

// =============================================================================
// Empty-input rejection
// =============================================================================

describe('runGenerationPipeline — input validation', () => {
  it('returns status:error when neither userPrompt nor sketch is provided', async () => {
    const result = await runGenerationPipeline({})
    expect(result.status).toBe('error')
    expect(result.error).toMatch(/userPrompt oder sketch muss gesetzt sein/)
    // No LLM calls should fire on input rejection
    expect(fixture.capturedPrompts).toHaveLength(0)
  })
})

// =============================================================================
// HTML stage failures
// =============================================================================

describe('runGenerationPipeline — stage 1 (HTML) failure modes', () => {
  it('returns status:error when runEdit throws in stage 1', async () => {
    script(fail('claude crashed'))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/HTML-Generation fehlgeschlagen.*claude crashed/)
    expect(result.html).toBeUndefined()
    expect(result.mirror).toBeUndefined()
  })

  it('returns status:error when stage 1 produces empty output', async () => {
    script(ok(''))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/leeren Output/i)
  })

  it('returns status:error when stage 1 produces only whitespace', async () => {
    script(ok('   \n\n\t  '))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/leeren Output/i)
  })

  it('returns status:error when stage 1 produces only an empty fence (```html\\n```)', async () => {
    // Defensive: the LLM occasionally returns an empty fenced block. The
    // strip should leave nothing, and the pipeline must catch that as
    // empty rather than passing "" to stage 2.
    script(ok('```html\n```'))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/leeren Output/i)
  })
})

// =============================================================================
// Translation stage failures
// =============================================================================

describe('runGenerationPipeline — stage 2 (Translation) failure modes', () => {
  it('returns status:error when runEdit throws in stage 2 (preserves HTML)', async () => {
    script(ok(VALID_HTML), fail('translator crashed'))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/Translation fehlgeschlagen.*translator crashed/)
    expect(result.html).toBe(VALID_HTML)
    expect(result.translationRetries).toBe(0)
  })

  it('returns status:error when stage 2 produces empty output (preserves HTML)', async () => {
    script(ok(VALID_HTML), ok(''))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/Translation lieferte leeren Output/)
    expect(result.html).toBe(VALID_HTML)
  })
})

// =============================================================================
// Code-fence stripping
// =============================================================================

describe('runGenerationPipeline — code-fence stripping', () => {
  it('strips ```html ... ``` wrapping from stage 1 output', async () => {
    const wrapped = '```html\n' + VALID_HTML + '\n```'
    script(ok(wrapped), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.html).toBe(VALID_HTML)
    // Stage 2 prompt must contain the stripped HTML, not the fenced wrapper
    expect(fixture.capturedPrompts[1]).toContain(VALID_HTML)
    // The stripped HTML should appear inside the prompt's html fence;
    // there should be no nested ```html\n```html\n... pattern
    expect(fixture.capturedPrompts[1]).not.toMatch(/```html\n```html/)
  })

  it('strips ```mirror ... ``` wrapping from stage 2 output', async () => {
    const wrapped = '```mirror\n' + VALID_MIRROR + '\n```'
    script(ok(VALID_HTML), ok(wrapped))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.mirror).toBe(VALID_MIRROR)
  })

  it('strips bare ``` ... ``` wrapping (no language hint)', async () => {
    script(ok('```\n' + VALID_HTML + '\n```'), ok('```\n' + VALID_MIRROR + '\n```'))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.html).toBe(VALID_HTML)
    expect(result.mirror).toBe(VALID_MIRROR)
  })

  it('leaves unfenced output untouched', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.html).toBe(VALID_HTML)
    expect(result.mirror).toBe(VALID_MIRROR)
  })
})

// =============================================================================
// Validator retry loop
// =============================================================================

describe('runGenerationPipeline — validator retry loop', () => {
  it('retries stage 2 once and succeeds on the second attempt', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.mirror).toBe(VALID_MIRROR)
    expect(result.translationRetries).toBe(1)
    expect(fixture.capturedPrompts).toHaveLength(3)
  })

  it('embeds the previous Mirror + validator errors in the retry prompt', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN), ok(VALID_MIRROR))

    await runGenerationPipeline({ userPrompt: 'A card' })

    const retryPrompt = fixture.capturedPrompts[2]
    expect(retryPrompt).toContain('## Previous attempt')
    expect(retryPrompt).toContain(INVALID_MIRROR_BAD_TOKEN)
    // The undefined-token validator error gets surfaced (not the exact
    // wording, but the token-name identifier).
    expect(retryPrompt).toMatch(/undefined_token/)
  })

  it('exhausts retries (default 2) and returns status:warning with the last mirror + errors', async () => {
    script(
      ok(VALID_HTML),
      ok(INVALID_MIRROR_BAD_TOKEN),
      ok(INVALID_MIRROR_BAD_TOKEN),
      ok(INVALID_MIRROR_BAD_TOKEN)
    )

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('warning')
    expect(result.mirror).toBe(INVALID_MIRROR_BAD_TOKEN)
    expect(result.translationRetries).toBe(2)
    expect(result.validationErrors).toBeDefined()
    expect(result.validationErrors!.length).toBeGreaterThan(0)
  })

  it('honors maxTranslationRetries=0 — single attempt, no retry on fail', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN))

    const result = await runGenerationPipeline(
      { userPrompt: 'A card' },
      { maxTranslationRetries: 0 }
    )

    expect(result.status).toBe('warning')
    expect(result.translationRetries).toBe(0)
    expect(fixture.capturedPrompts).toHaveLength(2)
  })

  it('honors maxTranslationRetries=1 — exactly one retry', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN), ok(INVALID_MIRROR_BAD_TOKEN))

    const result = await runGenerationPipeline(
      { userPrompt: 'A card' },
      { maxTranslationRetries: 1 }
    )

    expect(result.status).toBe('warning')
    expect(result.translationRetries).toBe(1)
    expect(fixture.capturedPrompts).toHaveLength(3)
  })

  it('only retries the translator — stage 1 always runs exactly once', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN), ok(VALID_MIRROR))

    await runGenerationPipeline({ userPrompt: 'A card' })

    // Stage-1 prompts are addressed to "UI designer" (or "interpreter"
    // for sketch); stage-2 prompts to "translating". One must occur once.
    const stage1Prompts = fixture.capturedPrompts.filter(p =>
      /UI designer|designer's interpreter/.test(p)
    )
    expect(stage1Prompts).toHaveLength(1)
  })
})

// =============================================================================
// Pre-flight nested-state detector
// =============================================================================

describe('runGenerationPipeline — pre-flight nested-state detector', () => {
  it('flags nested state blocks BEFORE the validator runs (parser hang guard)', async () => {
    script(
      ok(VALID_HTML),
      ok(INVALID_MIRROR_NESTED_STATE),
      ok(INVALID_MIRROR_NESTED_STATE),
      ok(INVALID_MIRROR_NESTED_STATE)
    )

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('warning')
    expect(result.validationErrors).toBeDefined()
    const codes = result.validationErrors!.map(e => e.code)
    expect(codes).toContain('PIPELINE_NESTED_STATE')
  })

  it('lets the LLM repair a nested-state issue (retry succeeds)', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_NESTED_STATE), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.translationRetries).toBe(1)
    // The retry prompt should include the nested-state error code
    expect(fixture.capturedPrompts[2]).toMatch(/PIPELINE_NESTED_STATE/)
  })
})

// =============================================================================
// W500 (undefined-token) elevation + $-substring filtering
// =============================================================================

describe('runGenerationPipeline — W500 elevation', () => {
  it('treats undefined real token-refs (`$missing`) as blocking', async () => {
    // Validator emits W500 (warning). Pipeline elevates it to error so
    // the retry kicks in — a missing token at runtime is a real bug.
    script(ok(VALID_HTML), ok('Frame bg $no_such_token\n  Text "X"'), ok(VALID_MIRROR))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.translationRetries).toBe(1)
  })

  it('does NOT elevate `$N`-shaped substrings inside string literals (e.g. "$48,217")', async () => {
    // The lexer occasionally surfaces `$48,217` as a token-ref from
    // inside a quoted string. That's a spurious warning — pipeline
    // filters it so we don't burn retries on phantom errors.
    const mirrorWithDollarLiteral = `Frame pad 16
  Text "Revenue: $48,217"
  Text "Profit: $1.2M"`

    script(ok(VALID_HTML), ok(mirrorWithDollarLiteral))

    const result = await runGenerationPipeline({ userPrompt: 'A card' })

    expect(result.status).toBe('success')
    expect(result.translationRetries).toBe(0)
    expect(result.mirror).toBe(mirrorWithDollarLiteral)
  })
})

// =============================================================================
// AbortSignal propagation
// =============================================================================

describe('runGenerationPipeline — abort handling', () => {
  it('rejects mid-stage-1 when the AbortSignal fires', async () => {
    script(abort())
    const ctrl = new AbortController()
    const promise = runGenerationPipeline({ userPrompt: 'A card' }, { signal: ctrl.signal })
    ctrl.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects mid-stage-2 when the AbortSignal fires', async () => {
    script(ok(VALID_HTML), abort())
    const ctrl = new AbortController()
    const promise = runGenerationPipeline({ userPrompt: 'A card' }, { signal: ctrl.signal })
    // Give stage 1 a tick to resolve, then abort during stage 2
    await new Promise(r => setTimeout(r, 5))
    ctrl.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('forwards the AbortSignal to runEdit (so the bridge can cancel the claude subprocess)', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))
    const ctrl = new AbortController()
    await runGenerationPipeline({ userPrompt: 'A card' }, { signal: ctrl.signal })
    // Both calls should have received the signal
    expect(fixture.capturedSignals[0]).toBe(ctrl.signal)
    expect(fixture.capturedSignals[1]).toBe(ctrl.signal)
  })
})

// =============================================================================
// Telemetry (onStep events)
// =============================================================================

describe('runGenerationPipeline — telemetry', () => {
  it('emits html-start → html-done → translate-start → translate-done → validate on success', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))

    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })

    const kinds = events.map(e => e.kind)
    expect(kinds).toEqual([
      'html-start',
      'html-done',
      'translate-start',
      'translate-done',
      'validate',
    ])
  })

  it('emits a validate event with valid:true and errorCount:0 on first-try success', async () => {
    script(ok(VALID_HTML), ok(VALID_MIRROR))
    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })
    const validate = events.find(e => e.kind === 'validate')
    expect(validate).toMatchObject({ kind: 'validate', valid: true, errorCount: 0 })
  })

  it('emits a validate event with valid:false on the failing attempt, then valid:true on retry success', async () => {
    script(ok(VALID_HTML), ok(INVALID_MIRROR_BAD_TOKEN), ok(VALID_MIRROR))

    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })

    const validates = events.filter(e => e.kind === 'validate') as Extract<
      GenerationPipelineStepEvent,
      { kind: 'validate' }
    >[]
    expect(validates).toHaveLength(2)
    expect(validates[0]).toMatchObject({ valid: false, attempt: 0 })
    expect(validates[1]).toMatchObject({ valid: true, attempt: 1 })
  })

  it('emits an error event with phase:html when stage 1 throws', async () => {
    script(fail('boom'))
    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })
    const error = events.find(e => e.kind === 'error')
    expect(error).toMatchObject({ kind: 'error', phase: 'html', message: 'boom' })
  })

  it('emits an error event with phase:translate when stage 2 throws', async () => {
    script(ok(VALID_HTML), fail('boom'))
    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })
    const error = events.find(e => e.kind === 'error')
    expect(error).toMatchObject({ kind: 'error', phase: 'translate', message: 'boom' })
  })

  it('reports duration on html-done and translate-done (non-negative number)', async () => {
    script(ok(VALID_HTML, 5), ok(VALID_MIRROR, 5))
    const events: GenerationPipelineStepEvent[] = []
    await runGenerationPipeline({ userPrompt: 'A card' }, { onStep: e => events.push(e) })
    const htmlDone = events.find(e => e.kind === 'html-done') as Extract<
      GenerationPipelineStepEvent,
      { kind: 'html-done' }
    >
    const translateDone = events.find(e => e.kind === 'translate-done') as Extract<
      GenerationPipelineStepEvent,
      { kind: 'translate-done' }
    >
    expect(htmlDone.durationMs).toBeGreaterThanOrEqual(0)
    expect(translateDone.durationMs).toBeGreaterThanOrEqual(0)
  })
})
