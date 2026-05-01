/**
 * Mirror Agent — LLM-Edit-Flow public API.
 *
 * Single AI path: Claude Code CLI via Tauri Bridge. Triggered from the
 * editor through `Cmd+Enter` / `Cmd+Shift+Enter` (see `studio/editor/llm-keymap.ts`).
 *
 * @example
 * ```typescript
 * import { runEditFlow } from './agent'
 *
 * const result = await runEditFlow(ctx, { signal, maxRetries: 2 })
 * if (result.status === 'ready') {
 *   // dispatch ghost-diff, etc.
 * }
 * ```
 */

export { runEdit } from './fixer'

export {
  runEditFlow,
  type RunEditFlowOptions,
  type EditResult,
  type EditResultStatus,
  type QualityViolations,
} from './edit-flow'

export {
  checkTokenCompliance,
  checkComponentCompliance,
  checkRedundancyCompliance,
  type TokenViolation,
  type ComponentViolation,
  type RedundancyViolation,
} from './quality-checks'

export { buildEditPrompt, type EditCaptureCtx } from './edit-prompts'

export { parsePatchResponse, type Patch, type ParsedPatchResponse } from './patch-format'

export { applyPatches, type ApplyResult, type RetryHint } from './patch-applier'

export { createChangeTracker, MAX_DIFF_LINES, type ChangeTracker } from './change-tracker'

export { computeLineDiff, formatUnifiedDiff, type DiffHunk } from './source-diff'

export { formatProjectFileSection } from './prompt-utils'

export type { FileType, FileInfo } from './types'
