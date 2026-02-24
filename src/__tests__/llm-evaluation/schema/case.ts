/**
 * Test Case Schema for LLM Evaluation
 *
 * Defines the structure of test cases that evaluate LLM-generated Mirror code.
 * Each case specifies an input prompt and the criteria for evaluating the output.
 */

// =============================================================================
// Pipeline Types
// =============================================================================

/**
 * The LLM pipelines that can be tested
 */
export type Pipeline =
  | 'nl-translation'    // Natural language line translation
  | 'js-builder'        // JavaScript Builder API generation
  | 'generation'        // Full Mirror code generation
  | 'intent'            // Intent-based modification
  | 'self-healing'      // Error correction
  | 'syntax-correction' // Typo and syntax error correction
  | 'react-pivot'       // LLM → React → Mirror transformation

// =============================================================================
// Input Definitions
// =============================================================================

/**
 * Context provided alongside the prompt
 */
export interface InputContext {
  /** Design tokens available (Mirror token syntax) */
  tokens?: string

  /** Existing code for context-aware generation */
  existingCode?: string

  /** Surrounding lines for NL translation */
  surroundingLines?: string[]

  /** Current line index for NL translation */
  lineIndex?: number

  /** Quality mode flag */
  qualityMode?: boolean
}

/**
 * The input for a test case
 */
export interface TestInput {
  /** The user prompt or line to translate */
  prompt: string

  /** Optional context */
  context?: InputContext
}

// =============================================================================
// Evaluation Criteria
// =============================================================================

/**
 * Structural expectations for the output
 */
export interface ContainsExpectation {
  /** Component types that must be present (e.g., ["Button", "Card"]) */
  components?: string[]

  /** Properties that must be used (e.g., ["bg", "pad", "rad"]) */
  properties?: string[]

  /** Tokens that must be referenced (e.g., ["$primary"]) */
  tokens?: string[]

  /** Text content that must appear */
  text?: string[]
}

/**
 * Structural requirements for the output
 */
export interface StructureExpectation {
  /** Expected layout direction at root level */
  rootLayout?: 'horizontal' | 'vertical' | 'stacked'

  /** Minimum number of root-level nodes */
  minRootNodes?: number

  /** Maximum number of root-level nodes */
  maxRootNodes?: number

  /** Minimum depth of nesting */
  minDepth?: number

  /** Maximum depth of nesting */
  maxDepth?: number
}

/**
 * Complete evaluation criteria for a test case
 */
export interface EvaluationCriteria {
  /**
   * Must parse without errors
   * @default true
   */
  parses: boolean

  /**
   * Must validate without errors (warnings allowed)
   * @default true
   */
  validates?: boolean

  /**
   * Must render without React errors
   * @default false (expensive check)
   */
  renders?: boolean

  /**
   * Check LLM output quality (px suffixes, colons, markdown blocks)
   * Uses unified validation with mode: 'llm'
   * @default false
   */
  llmQuality?: boolean

  /**
   * Elements that must be present in the output
   */
  contains?: ContainsExpectation

  /**
   * Elements that must NOT be present (error indicators)
   */
  notContains?: string[]

  /**
   * Structural requirements
   */
  structure?: StructureExpectation

  /**
   * Custom validation function (serialized as string for JSON storage)
   * Will be eval'd at runtime - use with caution
   */
  customValidator?: string
}

// =============================================================================
// Test Case Definition
// =============================================================================

/**
 * Severity level for test cases
 */
export type Severity = 'critical' | 'important' | 'normal' | 'edge-case'

/**
 * A complete test case for LLM evaluation
 */
export interface TestCase {
  /** Unique identifier (kebab-case) */
  id: string

  /** Human-readable description */
  description: string

  /** Which pipeline this tests */
  pipeline: Pipeline

  /** Severity/importance of this case */
  severity: Severity

  /** The input prompt and context */
  input: TestInput

  /** Evaluation criteria */
  expect: EvaluationCriteria

  /** Tags for filtering (e.g., ["button", "layout", "tokens"]) */
  tags?: string[]

  /** Whether this case is currently skipped */
  skip?: boolean

  /** Reason for skipping */
  skipReason?: string
}

// =============================================================================
// Test Suite Definition
// =============================================================================

/**
 * A collection of related test cases
 */
export interface TestSuite {
  /** Suite name */
  name: string

  /** Suite description */
  description: string

  /** Pipeline this suite tests */
  pipeline: Pipeline

  /** Version of the suite format */
  version: string

  /** The test cases */
  cases: TestCase[]
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a test case with sensible defaults
 */
export function createTestCase(
  partial: Partial<TestCase> & Pick<TestCase, 'id' | 'description' | 'pipeline' | 'input'>
): TestCase {
  return {
    severity: 'normal',
    expect: {
      parses: true,
      validates: true,
      notContains: ['undefined', 'error', 'Error'],
    },
    ...partial,
  }
}

/**
 * Create an NL translation test case
 */
export function createNLCase(
  id: string,
  prompt: string,
  expect: Partial<EvaluationCriteria> & { contains?: ContainsExpectation }
): TestCase {
  return createTestCase({
    id,
    description: prompt,
    pipeline: 'nl-translation',
    input: { prompt },
    expect: {
      parses: true,
      validates: true,
      ...expect,
    },
  })
}

/**
 * Create a generation test case
 */
export function createGenerationCase(
  id: string,
  description: string,
  prompt: string,
  expect: Partial<EvaluationCriteria>
): TestCase {
  return createTestCase({
    id,
    description,
    pipeline: 'generation',
    input: { prompt },
    expect: {
      parses: true,
      validates: true,
      ...expect,
    },
  })
}
