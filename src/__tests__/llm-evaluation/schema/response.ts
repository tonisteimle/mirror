/**
 * Response Fixture Schema
 *
 * Defines the structure for recorded LLM responses.
 * These fixtures enable deterministic testing without live API calls.
 */

// =============================================================================
// Response Metadata
// =============================================================================

/**
 * Information about the LLM call
 */
export interface ResponseMetadata {
  /** When this response was recorded */
  recordedAt: string  // ISO 8601

  /** Which model generated this response */
  model: string

  /** Model version/identifier from API */
  modelVersion?: string

  /** Total tokens used (if available) */
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }

  /** Response latency in milliseconds */
  latencyMs?: number

  /** Whether streaming was used */
  streaming: boolean

  /** Any additional API response metadata */
  apiMetadata?: Record<string, unknown>
}

// =============================================================================
// Response Content
// =============================================================================

/**
 * The actual response from the LLM
 */
export interface ResponseContent {
  /** Raw response text from the API */
  raw: string

  /** Processed/cleaned response (after markdown removal, etc.) */
  processed: string

  /** Whether processing made changes */
  wasProcessed: boolean

  /** Processing steps applied */
  processingSteps?: string[]
}

/**
 * Validation results for the response
 */
export interface ResponseValidation {
  /** Did the response parse successfully? */
  parses: boolean

  /** Parse errors if any */
  parseErrors?: string[]

  /** Did the response validate? */
  validates: boolean

  /** Validation issues if any */
  validationIssues?: Array<{
    line: number
    message: string
    severity: 'error' | 'warning'
  }>

  /** Components found in the output */
  componentsFound?: string[]

  /** Properties found in the output */
  propertiesFound?: string[]

  /** Tokens referenced in the output */
  tokensReferenced?: string[]
}

// =============================================================================
// Response Fixture
// =============================================================================

/**
 * A recorded LLM response fixture
 */
export interface ResponseFixture {
  /** Links to the test case ID */
  caseId: string

  /** Fixture version (for migration) */
  fixtureVersion: '1.0'

  /** Recording metadata */
  metadata: ResponseMetadata

  /** The response content */
  response: ResponseContent

  /** Validation results at recording time */
  validation: ResponseValidation

  /** Manual review status */
  review: {
    /** Has this fixture been manually reviewed? */
    reviewed: boolean

    /** Who reviewed it */
    reviewedBy?: string

    /** When it was reviewed */
    reviewedAt?: string

    /** Review notes */
    notes?: string

    /** Is this response considered a "golden" example? */
    isGolden?: boolean
  }
}

// =============================================================================
// Fixture Collection
// =============================================================================

/**
 * A collection of response fixtures for a test suite
 */
export interface FixtureCollection {
  /** Suite this collection belongs to */
  suiteId: string

  /** Collection version */
  version: string

  /** When the collection was last updated */
  updatedAt: string

  /** Fixtures indexed by case ID */
  fixtures: Record<string, ResponseFixture>
}

// =============================================================================
// Recording Options
// =============================================================================

/**
 * Options for recording new fixtures
 */
export interface RecordingOptions {
  /** Overwrite existing fixtures */
  overwrite?: boolean

  /** Only record if fixture doesn't exist */
  skipExisting?: boolean

  /** Automatically validate after recording */
  autoValidate?: boolean

  /** Mark as reviewed automatically (for batch operations) */
  autoReview?: boolean

  /** Add custom notes to all recordings */
  notes?: string
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a new response fixture
 */
export function createResponseFixture(
  caseId: string,
  raw: string,
  model: string,
  options: {
    processed?: string
    streaming?: boolean
    latencyMs?: number
  } = {}
): ResponseFixture {
  const processed = options.processed ?? raw
  const wasProcessed = processed !== raw

  return {
    caseId,
    fixtureVersion: '1.0',
    metadata: {
      recordedAt: new Date().toISOString(),
      model,
      streaming: options.streaming ?? false,
      latencyMs: options.latencyMs,
    },
    response: {
      raw,
      processed,
      wasProcessed,
    },
    validation: {
      parses: false,  // Will be filled by validator
      validates: false,
    },
    review: {
      reviewed: false,
    },
  }
}

/**
 * Get fixture file path for a case
 */
export function getFixturePath(pipeline: string, caseId: string): string {
  return `fixtures/${pipeline}/responses/${caseId}.json`
}
