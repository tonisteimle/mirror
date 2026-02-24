/**
 * Intent-based AI Generation
 *
 * Exportiert alle Intent-Funktionen für einfachen Import.
 */

export * from './schema'
export * from './mirror-to-intent'
export * from './intent-to-mirror'
export * from './validator'

// llm-prompt exports
export {
  INTENT_SCHEMA_VERSION,
  INTENT_SYSTEM_PROMPT,
  buildUserPrompt,
  parseIntentResponse,
  parseIntentResponseWithDetails,
  migrateIntent,
} from './llm-prompt'
export type { ParseResult } from './llm-prompt'

// generate.ts exports
export {
  generateWithIntent,
} from './generate'
export type { GenerateOptions, GenerateResult } from './generate'

// generation.ts exports
export {
  generateWithCreate,
  generateWithModify,
  generateIntent,
  splitGeneratedCode,
  createMockLLM,
  createMockPatchLLM,
  createTransformMockLLM,
} from './generation'
export type { LLMCallFn } from './generation'

// prompts.ts exports (skip INTENT_SCHEMA_VERSION - already exported from llm-prompt)
export {
  CREATE_SYSTEM_PROMPT,
  MODIFY_SYSTEM_PROMPT,
  buildCreatePrompt,
  buildModifyPrompt,
  serializeIntentForContext,
  getSimpleCreatePrompt,
  buildMinimalPrompt,
} from './prompts'

// Explicit exports to avoid naming conflicts
export {
  generatePatch,
  applyPatch,
  optimizePatch,
  generateReversePatch,
  mergePartialIntent,
  parseDiffResponse,
  DIFF_MODE_SYSTEM_PROMPT_ADDITION,
  IntentHistory as IntentHistoryClass,
  getGlobalIntentHistory,
  clearGlobalIntentHistory,
} from './diff'
export type { IntentHistoryEntry, PatchOperation, Patch, DiffResponse } from './diff'

export * from './streaming'
export * from './context'

// History module uses functional approach
export {
  createHistory,
  undo,
  redo,
  getCurrentIntent,
  canUndo,
  canRedo,
  getRecentChanges,
  getHistoryContext,
} from './history'
export type { IntentHistory, HistoryEntry } from './history'

export * from './conversation'
export * from './code-context'
