/**
 * Self-Healing Types
 *
 * Shared type definitions for the self-healing system.
 */

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationFeedback {
  valid: boolean
  issues: CodeIssue[]
  correctionPrompt?: string
}

export interface CodeIssue {
  type: 'parse_error' | 'parse_issue' | 'validation_error' | 'validation_warning'
  line: number
  message: string
  suggestion?: string
}

export type PromptLanguage = 'de' | 'en'

// =============================================================================
// Self-Healing Options
// =============================================================================

export interface SelfHealingOptions {
  /** Maximum correction attempts (default: 2) */
  maxAttempts?: number
  /** Include warnings in feedback (default: false) */
  includeWarnings?: boolean
  /** Custom correction prompt prefix */
  correctionPrefix?: string
  /** Language for correction prompts (default: 'de') */
  language?: PromptLanguage
}

export interface SelfHealingResult {
  code: string
  valid: boolean
  attempts: number
  issues: CodeIssue[]
}

// =============================================================================
// Fix Function Types
// =============================================================================

/**
 * A fix function takes code and returns modified code.
 */
export type FixFunction = (code: string) => string

/**
 * A fix with metadata for tracking.
 */
export interface Fix {
  name: string
  fn: FixFunction
  phase: FixPhase
  description?: string
}

/**
 * Fix phases for ordering.
 */
export type FixPhase =
  | 'css-cleanup'       // Phase 0: Remove CSS artifacts
  | 'color-value'       // Phase 1: Color/value syntax fixes
  | 'token'             // Phase 2: Token fixes
  | 'typo'              // Phase 3: Typo fixes
  | 'structural'        // Phase 4: Structural fixes
  | 'value'             // Phase 5: Value fixes (ranges, duplicates, formatting)

// =============================================================================
// Telemetry Types (re-exported from telemetry module)
// =============================================================================

// Re-export from telemetry module for backward compatibility
export type { FixApplication, FixStats } from './telemetry'
