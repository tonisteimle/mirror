/**
 * Mirror Error Hierarchy
 *
 * Structured error types for consistent error handling across the codebase.
 * Each error type has:
 * - Unique error code for i18n and tracking
 * - Context-specific metadata
 * - Type guard for safe error checking
 */

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
  // Parser errors (1xxx)
  PARSE_INVALID_SYNTAX: 'PARSE_1001',
  PARSE_INVALID_TOKEN: 'PARSE_1002',
  PARSE_CIRCULAR_REFERENCE: 'PARSE_1003',
  PARSE_UNDEFINED_COMPONENT: 'PARSE_1004',
  PARSE_UNDEFINED_TOKEN: 'PARSE_1005',
  PARSE_INVALID_PROPERTY: 'PARSE_1006',
  PARSE_MAX_DEPTH_EXCEEDED: 'PARSE_1007',

  // Generator errors (2xxx)
  GEN_INVALID_NODE: 'GEN_2001',
  GEN_MISSING_COMPONENT: 'GEN_2002',
  GEN_RENDER_FAILED: 'GEN_2003',

  // AI/LLM errors (3xxx)
  AI_NO_API_KEY: 'AI_3001',
  AI_RATE_LIMITED: 'AI_3002',
  AI_REQUEST_TIMEOUT: 'AI_3003',
  AI_INVALID_RESPONSE: 'AI_3004',
  AI_PROMPT_INJECTION: 'AI_3005',
  AI_GENERATION_FAILED: 'AI_3006',

  // Validation errors (4xxx)
  VAL_INVALID_CODE: 'VAL_4001',
  VAL_SCHEMA_MISMATCH: 'VAL_4002',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// =============================================================================
// Base Error
// =============================================================================

export interface MirrorErrorContext {
  /** Source line number (1-indexed) */
  line?: number
  /** Source column number (1-indexed) */
  column?: number
  /** Relevant code snippet */
  code?: string
  /** Additional context */
  details?: Record<string, unknown>
}

/**
 * Base error class for all Mirror errors.
 */
export class MirrorError extends Error {
  readonly code: ErrorCode
  readonly context: MirrorErrorContext
  readonly isMirrorError = true

  constructor(
    message: string,
    code: ErrorCode,
    context: MirrorErrorContext = {}
  ) {
    super(message)
    this.name = 'MirrorError'
    this.code = code
    this.context = context
  }

  /** Format error for display */
  format(): string {
    const parts = [this.message]
    if (this.context.line) {
      parts.push(`at line ${this.context.line}`)
    }
    if (this.context.code) {
      parts.push(`\n  ${this.context.code}`)
    }
    return parts.join(' ')
  }
}

// =============================================================================
// Parser Errors
// =============================================================================

/**
 * Error during parsing phase.
 */
export class ParserError extends MirrorError {
  readonly isParserError = true

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.PARSE_INVALID_SYNTAX,
    context: MirrorErrorContext = {}
  ) {
    super(message, code, context)
    this.name = 'ParserError'
  }
}

/**
 * Circular reference detected in token or component definitions.
 */
export class CircularReferenceError extends ParserError {
  readonly chain: string[]

  constructor(chain: string[], context: MirrorErrorContext = {}) {
    super(
      `Circular reference detected: ${chain.join(' → ')}`,
      ErrorCodes.PARSE_CIRCULAR_REFERENCE,
      context
    )
    this.name = 'CircularReferenceError'
    this.chain = chain
  }
}

/**
 * Reference to undefined component or token.
 */
export class UndefinedReferenceError extends ParserError {
  readonly reference: string
  readonly referenceType: 'component' | 'token'

  constructor(
    reference: string,
    type: 'component' | 'token',
    context: MirrorErrorContext = {}
  ) {
    super(
      `Undefined ${type}: ${reference}`,
      type === 'component'
        ? ErrorCodes.PARSE_UNDEFINED_COMPONENT
        : ErrorCodes.PARSE_UNDEFINED_TOKEN,
      context
    )
    this.name = 'UndefinedReferenceError'
    this.reference = reference
    this.referenceType = type
  }
}

// =============================================================================
// Generator Errors
// =============================================================================

/**
 * Error during code generation phase.
 */
export class GeneratorError extends MirrorError {
  readonly isGeneratorError = true

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.GEN_RENDER_FAILED,
    context: MirrorErrorContext = {}
  ) {
    super(message, code, context)
    this.name = 'GeneratorError'
  }
}

// =============================================================================
// AI/LLM Errors
// =============================================================================

/**
 * Error during AI/LLM operations.
 */
export class AIError extends MirrorError {
  readonly isAIError = true

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.AI_GENERATION_FAILED,
    context: MirrorErrorContext = {}
  ) {
    super(message, code, context)
    this.name = 'AIError'
  }
}

/**
 * API rate limit exceeded.
 */
export class RateLimitError extends AIError {
  readonly retryAfter: number
  readonly isRateLimitError = true

  constructor(message: string, retryAfter: number) {
    super(message, ErrorCodes.AI_RATE_LIMITED, { details: { retryAfter } })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Request timeout.
 */
export class TimeoutError extends AIError {
  readonly timeoutMs: number

  constructor(message: string, timeoutMs: number) {
    super(message, ErrorCodes.AI_REQUEST_TIMEOUT, { details: { timeoutMs } })
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * No API key configured.
 */
export class NoApiKeyError extends AIError {
  constructor() {
    super('No API key configured', ErrorCodes.AI_NO_API_KEY)
    this.name = 'NoApiKeyError'
  }
}

// =============================================================================
// Type Guards
// =============================================================================

export function isMirrorError(error: unknown): error is MirrorError {
  return error instanceof Error && 'isMirrorError' in error
}

export function isParserError(error: unknown): error is ParserError {
  return error instanceof Error && 'isParserError' in error
}

export function isGeneratorError(error: unknown): error is GeneratorError {
  return error instanceof Error && 'isGeneratorError' in error
}

export function isAIError(error: unknown): error is AIError {
  return error instanceof Error && 'isAIError' in error
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof Error && 'isRateLimitError' in error
}

// =============================================================================
// Error Collection
// =============================================================================

export interface CollectedError {
  error: MirrorError
  recoverable: boolean
}

/**
 * Collects errors during parsing/generation for batch reporting.
 */
export class ErrorCollector {
  private errors: CollectedError[] = []

  /** Add a recoverable error (processing can continue) */
  addWarning(error: MirrorError): void {
    this.errors.push({ error, recoverable: true })
  }

  /** Add a fatal error (processing should stop) */
  addError(error: MirrorError): void {
    this.errors.push({ error, recoverable: false })
  }

  /** Check if there are any fatal errors */
  hasFatalErrors(): boolean {
    return this.errors.some(e => !e.recoverable)
  }

  /** Get all errors */
  getErrors(): CollectedError[] {
    return [...this.errors]
  }

  /** Get only warnings */
  getWarnings(): MirrorError[] {
    return this.errors.filter(e => e.recoverable).map(e => e.error)
  }

  /** Get only fatal errors */
  getFatalErrors(): MirrorError[] {
    return this.errors.filter(e => !e.recoverable).map(e => e.error)
  }

  /** Clear all errors */
  clear(): void {
    this.errors = []
  }

  /** Check if empty */
  isEmpty(): boolean {
    return this.errors.length === 0
  }

  /** Format all errors for display */
  format(): string {
    return this.errors.map(e => e.error.format()).join('\n')
  }
}
