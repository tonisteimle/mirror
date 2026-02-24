/**
 * @module converter/react-pivot/validation
 * @description React code validation and self-healing for the React-Pivot pipeline
 */

export { validateReactCode } from './react-linter'
export { healReactCode, generateCorrectionPrompt } from './healing'
export {
  incrementalHeal,
  quickIncrementalHeal,
  fullIncrementalHeal,
  previewIncrementalHealing,
} from './incremental-healing'
export type {
  IncrementalHealingResult,
  IncrementalHealingOptions,
  HealingPhase,
  PhaseResult,
} from './incremental-healing'
export { analyzeLLMErrors, detectErrorPatterns } from './llm-error-patterns'
export type { LLMErrorAnalysis, LLMModel } from './llm-error-patterns'
export {
  testDrivenRegenerate,
  quickTestDrivenFix,
  analyzeFixability,
  extractTestCase,
  validateFix,
  applyFixToFullCode,
} from './test-driven-regeneration'
export type {
  TestDrivenFixResult,
  TestDrivenOptions,
  IsolatedTestCase,
  FixAttempt,
} from './test-driven-regeneration'
