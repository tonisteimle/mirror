/**
 * Self-Healing Module
 *
 * Validates LLM-generated Mirror code and automatically
 * applies fixes for common errors.
 *
 * ## Architecture
 *
 * The self-healing system is organized into phases:
 *
 * 1. **CSS Cleanup** (Phase 0)
 *    - Remove CSS artifacts (transitions, calc, !important)
 *    - Convert CSS syntax to Mirror syntax
 *
 * 2. **Color/Value Fixes** (Phase 1)
 *    - Convert rgba/named colors to hex
 *    - Fix shadow/opacity/border syntax
 *
 * 3. **Token Fixes** (Phase 2)
 *    - Add missing $ prefixes
 *    - Fix token name casing
 *    - Resolve undefined token references
 *
 * 4. **Typo Fixes** (Phase 3)
 *    - Fix event/action name typos
 *    - Convert CSS state names
 *
 * 5. **Structural Fixes** (Phase 4)
 *    - Fix orphaned keywords/values
 *    - Fix definition/usage patterns
 *    - Handle duplicate names
 *
 * ## Usage
 *
 * ```typescript
 * import { validateMirrorCode, applyAllFixes } from './self-healing'
 *
 * // Apply fixes
 * const fixed = applyAllFixes(generatedCode)
 *
 * // Validate
 * const result = validateMirrorCode(fixed)
 * if (result.valid) {
 *   // Use the code
 * } else {
 *   // Handle errors or retry with result.correctionPrompt
 * }
 * ```
 */

// Types
export type {
  ValidationFeedback,
  CodeIssue,
  PromptLanguage,
  SelfHealingOptions,
  SelfHealingResult,
  Fix,
  FixFunction,
  FixPhase,
  FixApplication,
  FixStats,
} from './types'

// Validation
export {
  validateMirrorCode,
  isValidMirrorCode,
  getIssueSummary,
} from './validator'

// Fix Pipeline
export {
  applyAllFixes,
  getAllFixes,
  getFixesForPhase,
  enableTelemetry,
  disableTelemetry,
  getFixStats,
  clearTelemetry,
} from './fix-pipeline'

// Correction Prompts
export {
  generateCorrectionPrompt,
  formatIssueSummary,
  generateErrorHints,
} from './correction-prompt'

// Self-Healing Wrapper
export { withSelfHealing } from './with-self-healing'

// Telemetry (advanced API)
export {
  SelfHealingTelemetry,
  getGlobalTelemetry,
  resetGlobalTelemetry,
  trackFixApplication,
  getRecentFixes,
  type TelemetryConfig,
} from './telemetry'

// Individual Fix Modules (for testing/direct access)
export * from './fixes'
