/**
 * Evaluation Result Schema
 *
 * Defines the structure of evaluation results when testing LLM outputs.
 */

import type { TestCase, EvaluationCriteria } from './case'

// =============================================================================
// Individual Check Results
// =============================================================================

/**
 * Result of a single evaluation check
 */
export interface CheckResult {
  /** Name of the check */
  name: string

  /** Did the check pass? */
  passed: boolean

  /** Human-readable message */
  message: string

  /** Expected value (for comparison checks) */
  expected?: unknown

  /** Actual value found */
  actual?: unknown

  /** Additional details */
  details?: Record<string, unknown>
}

// =============================================================================
// Evaluation Result
// =============================================================================

/**
 * Complete evaluation result for a test case
 */
export interface EvaluationResult {
  /** The test case that was evaluated */
  caseId: string

  /** Overall pass/fail */
  passed: boolean

  /** Individual check results */
  checks: CheckResult[]

  /** Summary counts */
  summary: {
    total: number
    passed: number
    failed: number
  }

  /** The output that was evaluated */
  output: {
    /** The Mirror code output */
    code: string

    /** Normalized/trimmed version */
    normalized: string
  }

  /** Performance metrics */
  performance?: {
    /** Time to evaluate in ms */
    evaluationTimeMs: number

    /** Time to parse in ms */
    parseTimeMs?: number

    /** Time to validate in ms */
    validateTimeMs?: number
  }

  /** When the evaluation was run */
  evaluatedAt: string
}

// =============================================================================
// Suite Results
// =============================================================================

/**
 * Aggregated results for a test suite
 */
export interface SuiteResult {
  /** Suite name */
  suiteName: string

  /** Overall pass/fail */
  passed: boolean

  /** Individual case results */
  results: EvaluationResult[]

  /** Summary statistics */
  summary: {
    totalCases: number
    passedCases: number
    failedCases: number
    skippedCases: number
    passRate: number  // 0-1
  }

  /** Breakdown by severity */
  bySeverity: {
    critical: { passed: number; failed: number }
    important: { passed: number; failed: number }
    normal: { passed: number; failed: number }
    'edge-case': { passed: number; failed: number }
  }

  /** When the suite was run */
  runAt: string

  /** Total duration in ms */
  durationMs: number
}

// =============================================================================
// Check Implementations
// =============================================================================

/**
 * Available check types
 */
export type CheckType =
  | 'parses'
  | 'validates'
  | 'renders'
  | 'contains-component'
  | 'contains-property'
  | 'contains-token'
  | 'contains-text'
  | 'not-contains'
  | 'structure-layout'
  | 'structure-depth'
  | 'structure-node-count'
  | 'llm-quality'
  | 'custom'

/**
 * Check definition for runtime execution
 */
export interface CheckDefinition {
  type: CheckType
  name: string
  required: boolean
  params?: Record<string, unknown>
}

// =============================================================================
// Evaluation Configuration
// =============================================================================

/**
 * Configuration for the evaluator
 */
export interface EvaluatorConfig {
  /** Stop on first failure */
  failFast?: boolean

  /** Include performance metrics */
  includePerformance?: boolean

  /** Timeout for render checks (ms) */
  renderTimeout?: number

  /** Custom check implementations */
  customChecks?: Record<string, (output: string, params: unknown) => CheckResult>
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a passing check result
 */
export function passCheck(name: string, message?: string): CheckResult {
  return {
    name,
    passed: true,
    message: message ?? `${name}: OK`,
  }
}

/**
 * Create a failing check result
 */
export function failCheck(
  name: string,
  message: string,
  expected?: unknown,
  actual?: unknown
): CheckResult {
  return {
    name,
    passed: false,
    message,
    expected,
    actual,
  }
}

/**
 * Convert criteria to check definitions
 */
export function criteriaToChecks(criteria: EvaluationCriteria): CheckDefinition[] {
  const checks: CheckDefinition[] = []

  // Parse check (always required if specified)
  if (criteria.parses) {
    checks.push({ type: 'parses', name: 'Parses without errors', required: true })
  }

  // Validate check
  if (criteria.validates) {
    checks.push({ type: 'validates', name: 'Validates without errors', required: true })
  }

  // Render check
  if (criteria.renders) {
    checks.push({ type: 'renders', name: 'Renders without errors', required: true })
  }

  // LLM quality check (uses unified validation with mode: 'llm')
  if (criteria.llmQuality) {
    checks.push({ type: 'llm-quality', name: 'LLM output quality', required: true })
  }

  // Contains checks
  if (criteria.contains) {
    const c = criteria.contains

    if (c.components) {
      for (const comp of c.components) {
        checks.push({
          type: 'contains-component',
          name: `Contains component: ${comp}`,
          required: true,
          params: { component: comp },
        })
      }
    }

    if (c.properties) {
      for (const prop of c.properties) {
        checks.push({
          type: 'contains-property',
          name: `Contains property: ${prop}`,
          required: true,
          params: { property: prop },
        })
      }
    }

    if (c.tokens) {
      for (const token of c.tokens) {
        checks.push({
          type: 'contains-token',
          name: `Contains token: ${token}`,
          required: true,
          params: { token },
        })
      }
    }

    if (c.text) {
      for (const text of c.text) {
        checks.push({
          type: 'contains-text',
          name: `Contains text: "${text}"`,
          required: true,
          params: { text },
        })
      }
    }
  }

  // Not-contains checks
  if (criteria.notContains) {
    for (const text of criteria.notContains) {
      checks.push({
        type: 'not-contains',
        name: `Does not contain: "${text}"`,
        required: true,
        params: { text },
      })
    }
  }

  // Structure checks
  if (criteria.structure) {
    const s = criteria.structure

    if (s.rootLayout) {
      checks.push({
        type: 'structure-layout',
        name: `Root layout is: ${s.rootLayout}`,
        required: true,
        params: { layout: s.rootLayout },
      })
    }

    if (s.minRootNodes !== undefined || s.maxRootNodes !== undefined) {
      checks.push({
        type: 'structure-node-count',
        name: `Root node count in range`,
        required: true,
        params: { min: s.minRootNodes, max: s.maxRootNodes },
      })
    }

    if (s.minDepth !== undefined || s.maxDepth !== undefined) {
      checks.push({
        type: 'structure-depth',
        name: `Nesting depth in range`,
        required: true,
        params: { min: s.minDepth, max: s.maxDepth },
      })
    }
  }

  return checks
}

/**
 * Calculate summary from check results
 */
export function summarizeChecks(checks: CheckResult[]): EvaluationResult['summary'] {
  const passed = checks.filter(c => c.passed).length
  return {
    total: checks.length,
    passed,
    failed: checks.length - passed,
  }
}
