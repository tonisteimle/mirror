/**
 * Draft-Mode Orchestrator
 *
 * Strategies for turning a `??` user prompt into final code. The simplest
 * strategy is one Claude call (`single-shot`); richer strategies use multiple
 * calls — a planner first, a validator-loop after, etc.
 *
 * Framework-agnostic: takes deps (generateCode, fixCompileErrors, planDraft,
 * executePlan, checkCompile, spliceCode) so the same code is exercised by
 * production wiring, eval driver, and unit tests.
 *
 * Available modes (registered in MODES at the bottom):
 *
 *   single-shot       — one Claude call. Fastest, current production default.
 *
 *   validator-loop    — generate, then compile-check the result. If errors,
 *                       feed them back to Claude with the broken code and ask
 *                       for a fix. Retry up to maxRetries (default 2).
 *                       Best for: "AI sometimes makes small DSL mistakes" —
 *                       e.g. a typo'd property, a token not prefixed with $,
 *                       a dangling property without comma.
 *
 *   plan-then-execute — first Claude call: plan in 3-5 bullets (which Mirror
 *                       elements, which hierarchy, which tokens, what
 *                       inner-pattern for repetitions). Second Claude call:
 *                       generate code from the plan. Optionally followed by
 *                       a validator-loop pass.
 *                       Best for: complex prompts with structured repetition
 *                       (settings panels, pricing tables) where pattern-
 *                       uniformity matters and the model benefits from
 *                       committing to a structure first.
 *
 * Pick a mode at runtime via `window.__orchestrationMode` (eval / experiments)
 * or pass directly via `orchestrate(mode, ...)`. Production default is
 * 'single-shot' — the richer modes are opt-in for experiments + eval-driven
 * comparison until proven worth the latency.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateInput {
  prompt: string | null
  content: string
  fullSource: string
}

/**
 * The dependencies the orchestrator needs. Each is a small testable function
 * — production binds them to FixerService methods + browser validate(); tests
 * bind them to mocks.
 */
export interface OrchestrationDeps {
  /** Single Claude call: input → Mirror code. */
  generateCode: (input: GenerateInput) => Promise<string>

  /**
   * Single Claude call: input + previously-generated code + compile errors →
   * corrected Mirror code.
   */
  fixCompileErrors: (brokenCode: string, errors: string[], input: GenerateInput) => Promise<string>

  /** Single Claude call: input → text plan (3-5 bullets, no code). */
  planDraft: (input: GenerateInput) => Promise<string>

  /** Single Claude call: input + plan → Mirror code. */
  executePlan: (plan: string, input: GenerateInput) => Promise<string>

  /**
   * Compile-check a candidate full-source string. Returns the list of error
   * messages (empty array = clean). Called locally — no Claude round-trip.
   */
  checkCompile: (sourceWithCode: string) => Promise<string[]>

  /**
   * Splice a generated code block into the original source where the `??`
   * markers were, producing the source we'd compile. Used by validator-loop
   * to know what to compile.
   */
  spliceCode: (code: string, originalFullSource: string) => string
}

export interface OrchestrationOptions {
  /** Max retries in validator-loop (default 2). */
  maxRetries?: number
  /**
   * Whether plan-then-execute should also run a validator-loop pass after
   * executing the plan (default: 1 retry — small fix attempt if plan
   * execution produces broken code).
   */
  validateAfterExecute?: boolean
}

export interface OrchestrationResult {
  /** Final code to splice into the editor. */
  code: string
  /** Total Claude calls made (1 = single-shot, 2+ = something fancier). */
  iterations: number
  /** If a validator-loop was used and didn't reach clean state, the residual errors. */
  finalErrors?: string[]
  /** If a planner was used, the plan text (for inspection / report). */
  plan?: string
  /** Mode that was used. */
  mode: string
}

export type OrchestrationMode = (
  input: GenerateInput,
  deps: OrchestrationDeps,
  opts?: OrchestrationOptions
) => Promise<OrchestrationResult>

// =============================================================================
// MODES
// =============================================================================

/** One Claude call. The default. */
export const singleShot: OrchestrationMode = async (input, deps) => {
  const code = await deps.generateCode(input)
  return { code, iterations: 1, mode: 'single-shot' }
}

/**
 * generate → compile → if errors, fix → compile → ... up to maxRetries.
 * Returns the first compile-clean code, or the last attempt with finalErrors.
 */
export const validatorLoop: OrchestrationMode = async (input, deps, opts) => {
  const max = opts?.maxRetries ?? 2

  let code = await deps.generateCode(input)
  let iterations = 1
  let errors: string[] = []

  for (let i = 0; i < max; i++) {
    errors = await deps.checkCompile(deps.spliceCode(code, input.fullSource))
    if (errors.length === 0) {
      return { code, iterations, mode: 'validator-loop' }
    }
    code = await deps.fixCompileErrors(code, errors, input)
    iterations++
  }

  // Final compile check on the last attempt
  errors = await deps.checkCompile(deps.spliceCode(code, input.fullSource))
  return {
    code,
    iterations,
    mode: 'validator-loop',
    ...(errors.length > 0 ? { finalErrors: errors } : {}),
  }
}

/**
 * plan first (Claude call #1), then execute the plan (call #2). Optionally
 * runs a 1-retry validator-loop on top to catch any obvious mistakes.
 */
export const planThenExecute: OrchestrationMode = async (input, deps, opts) => {
  const plan = await deps.planDraft(input)
  let code = await deps.executePlan(plan, input)
  let iterations = 2

  if (opts?.validateAfterExecute === false) {
    return { code, iterations, plan, mode: 'plan-then-execute' }
  }

  // One validator-loop pass — small safety net if execution produces broken code
  const errors = await deps.checkCompile(deps.spliceCode(code, input.fullSource))
  if (errors.length === 0) {
    return { code, iterations, plan, mode: 'plan-then-execute' }
  }
  code = await deps.fixCompileErrors(code, errors, input)
  iterations++

  const finalErrors = await deps.checkCompile(deps.spliceCode(code, input.fullSource))
  return {
    code,
    iterations,
    plan,
    mode: 'plan-then-execute',
    ...(finalErrors.length > 0 ? { finalErrors } : {}),
  }
}

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Registered orchestration modes. Keep keys stable — referenced from the
 * eval driver (`--mode=NAME`) and from production runtime
 * (`window.__orchestrationMode`).
 */
export const MODES: Record<string, OrchestrationMode> = {
  'single-shot': singleShot,
  'validator-loop': validatorLoop,
  'plan-then-execute': planThenExecute,
}

export function resolveMode(name?: string): OrchestrationMode {
  if (!name || !(name in MODES)) return MODES['single-shot']
  return MODES[name]
}

export function listModes(): string[] {
  return Object.keys(MODES)
}

/**
 * Convenience: run a named mode with the given input + deps.
 */
export async function orchestrate(
  modeName: string,
  input: GenerateInput,
  deps: OrchestrationDeps,
  opts?: OrchestrationOptions
): Promise<OrchestrationResult> {
  const mode = resolveMode(modeName)
  return mode(input, deps, opts)
}
