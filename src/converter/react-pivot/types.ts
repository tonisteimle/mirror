/**
 * @module converter/react-pivot/types
 * @description TypeScript interfaces for the React-Pivot transformation pipeline
 */

// Re-export schema types from experiment for backward compatibility
// These will be gradually migrated to this module
export type {
  MirrorDocument,
  MirrorStyles,
  TokenDefinition,
  TokenReference,
  ComponentDefinition,
  ComponentInstance,
  Action,
  ActionType,
  StateDefinition,
  EventHandlers,
  Conditional,
  Iterator,
  DataBinding,
  InlineConditional,
  SlotDefinition,
  KeyboardKey,
  SystemState,
  BehaviorState,
  PrimitiveComponent,
} from '../../experiment/react-to-mirror/schema'

// =============================================================================
// Pipeline Configuration
// =============================================================================

export interface ReactPivotOptions {
  /** Use Opus model for complex prompts (quality mode) */
  qualityMode?: boolean

  /** Enable SSE streaming for incremental updates */
  streaming?: boolean

  /** Maximum validation retries before failure (default: 2) */
  maxRetries?: number

  /** Log intermediate outputs for debugging */
  debug?: boolean

  /** Existing tokens code to use for context */
  tokensCode?: string

  /** Callbacks for streaming updates */
  callbacks?: ReactPivotCallbacks
}

export interface ReactPivotCallbacks {
  /** Called when generation starts */
  onStart?: () => void

  /** Called with incremental text during streaming */
  onToken?: (token: string) => void

  /** Called when each phase completes */
  onPhaseComplete?: (phase: PipelinePhase, result: PhaseResult) => void

  /** Called on completion */
  onComplete?: (result: ReactPivotResult) => void

  /** Called on error */
  onError?: (error: ReactPivotError) => void
}

export type PipelinePhase =
  | 'context-building'
  | 'react-generation'
  | 'react-validation'
  | 'transformation'
  | 'mirror-validation'

export interface PhaseResult {
  phase: PipelinePhase
  success: boolean
  duration: number
  output?: string
  issues?: ValidationIssue[]
}

// =============================================================================
// Pipeline Result
// =============================================================================

export interface ReactPivotResult {
  /** Whether the transformation succeeded */
  success: boolean

  /** Final Mirror DSL code */
  mirrorCode: string

  /** Debug: Intermediate React code */
  reactCode?: string

  /** Debug: Intermediate schema */
  schema?: import('../../experiment/react-to-mirror/schema').MirrorDocument

  /** Validation issues found during processing */
  issues?: ValidationIssue[]

  /** Whether self-healing was applied */
  healed?: boolean

  /** Performance metrics */
  metrics: PipelineMetrics
}

export interface PipelineMetrics {
  /** Time to first token (ms) */
  timeToFirstToken: number

  /** Total processing time (ms) */
  totalTime: number

  /** Number of validation retries */
  retryCount: number

  /** Phase-specific timings */
  phases?: Record<PipelinePhase, number>
}

// =============================================================================
// Validation
// =============================================================================

export type ValidationIssueType =
  | 'INVALID_COMPONENT'
  | 'UNSUPPORTED_PROP'
  | 'MISSING_TOKEN'
  | 'HARDCODED_COLOR'
  | 'SYNTAX_ERROR'
  | 'INVALID_EVENT'
  | 'INVALID_ACTION'
  | 'INVALID_STATE'
  | 'SPREAD_OPERATOR'
  | 'CLASSNAME_USED'
  | 'CUSTOM_HOOK'

export interface ValidationIssue {
  /** Type of validation issue */
  type: ValidationIssueType

  /** Human-readable error message */
  message: string

  /** Line number in the code (if available) */
  line?: number

  /** Column number in the code (if available) */
  column?: number

  /** The problematic code snippet */
  code?: string

  /** Whether this issue can be auto-fixed */
  fixable: boolean

  /** Suggested fix or replacement */
  suggestion?: string
}

export interface ValidationResult {
  /** Whether the code is valid (no unfixable issues) */
  valid: boolean

  /** All issues found */
  issues: ValidationIssue[]

  /** Code after applying auto-fixes (if any) */
  fixedCode?: string
}

// =============================================================================
// Error Types
// =============================================================================

export interface ReactPivotErrorData {
  message: string
  phase: PipelinePhase
  issues?: ValidationIssue[]
  code?: string
}

export type ReactPivotError = Error & ReactPivotErrorData

export function createReactPivotError(data: ReactPivotErrorData): ReactPivotError {
  const error = new Error(data.message) as ReactPivotError
  error.name = 'ReactPivotError'
  error.phase = data.phase
  error.issues = data.issues
  error.code = data.code
  return error
}

// =============================================================================
// LLM Integration
// =============================================================================

export interface LLMContext {
  /** Token definitions from the editor */
  tokens: string

  /** Component definitions from the editor */
  components: string

  /** Current layout code context */
  layoutCode: string

  /** System prompt for the React generation */
  systemPrompt: string
}

export interface LLMGenerationResult {
  /** Generated code */
  code: string

  /** Raw response from LLM */
  rawResponse?: string

  /** Time to generate (ms) */
  duration: number
}

// =============================================================================
// Self-Healing
// =============================================================================

export interface HealingStrategy {
  /** Issue types this strategy can handle */
  handles: ValidationIssueType[]

  /** Apply the healing transformation */
  apply: (code: string, issue: ValidationIssue) => string | null
}

export interface HealingResult {
  /** Whether healing was successful */
  success: boolean

  /** Healed code (if successful) */
  code?: string

  /** Issues that couldn't be healed */
  remainingIssues: ValidationIssue[]
}
