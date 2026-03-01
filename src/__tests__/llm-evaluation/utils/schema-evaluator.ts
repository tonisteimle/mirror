/**
 * Schema-Based LLM Output Evaluator
 *
 * Uses the DSL schema and normalizer to perform semantic comparison
 * of Mirror code outputs, handling short/long form equivalence.
 */

import {
  normalize,
  compare,
  areEquivalent,
  extractProperties,
  type ExtractedProperty,
} from '../../../dsl/normalizer'
import {
  validate as validateSchema,
  getErrors,
  getWarnings,
  type ValidationIssue,
} from '../../../dsl/schema-validator'
import {
  getPropertyDefinitionByAnyName,
  normalizePropertyName,
  getAllPropertyNames,
} from '../../../dsl/dsl-schema'

// =============================================================================
// TYPES
// =============================================================================

export interface SemanticComparisonResult {
  isEquivalent: boolean
  normalizedExpected: string
  normalizedActual: string
  differences: PropertyDifference[]
  score: number // 0-100
  details: string
}

export interface PropertyDifference {
  type: 'missing' | 'extra' | 'value-mismatch' | 'format-only'
  property: string
  expected?: string | number | boolean
  actual?: string | number | boolean
  severity: 'error' | 'warning' | 'info'
}

export interface SchemaValidationResult {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  score: number // 0-100
}

export interface ComprehensiveEvaluation {
  semanticComparison?: SemanticComparisonResult
  schemaValidation: SchemaValidationResult
  overallScore: number
  passed: boolean
  summary: string
}

// =============================================================================
// SEMANTIC COMPARISON
// =============================================================================

/**
 * Compare two Mirror DSL code snippets semantically
 *
 * This handles short/long form equivalence:
 * - `pad 12` is equivalent to `padding 12`
 * - `bg #333` is equivalent to `background #333`
 * - `rad tl 8` is equivalent to `radius top-left 8`
 */
export function semanticCompare(
  expected: string,
  actual: string
): SemanticComparisonResult {
  const comparison = compare(expected, actual)
  const expectedProps = extractAllProperties(expected)
  const actualProps = extractAllProperties(actual)

  const differences: PropertyDifference[] = []

  // Find missing properties (in expected but not in actual)
  for (const [key, expProp] of expectedProps) {
    const actProp = actualProps.get(key)
    if (!actProp) {
      differences.push({
        type: 'missing',
        property: key,
        expected: formatPropertyValue(expProp),
        severity: 'error',
      })
    } else if (!valuesAreEquivalent(expProp.value, actProp.value)) {
      differences.push({
        type: 'value-mismatch',
        property: key,
        expected: formatPropertyValue(expProp),
        actual: formatPropertyValue(actProp),
        severity: 'error',
      })
    }
  }

  // Find extra properties (in actual but not in expected)
  for (const [key, actProp] of actualProps) {
    if (!expectedProps.has(key)) {
      differences.push({
        type: 'extra',
        property: key,
        actual: formatPropertyValue(actProp),
        severity: 'warning', // Extra properties are warnings, not errors
      })
    }
  }

  // Calculate score
  const totalProperties = Math.max(expectedProps.size, actualProps.size)
  const errorCount = differences.filter((d) => d.severity === 'error').length
  const warningCount = differences.filter((d) => d.severity === 'warning').length

  let score = 100
  if (totalProperties > 0) {
    score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5))
  }

  // Generate details message
  const details = generateComparisonDetails(differences, comparison.isEquivalent)

  return {
    isEquivalent: comparison.isEquivalent,
    normalizedExpected: comparison.normalizedExpected,
    normalizedActual: comparison.normalizedActual,
    differences,
    score,
    details,
  }
}

/**
 * Extract all properties from code into a normalized map
 */
function extractAllProperties(code: string): Map<string, ExtractedProperty> {
  const map = new Map<string, ExtractedProperty>()
  const lines = code.split('\n')

  for (const line of lines) {
    const props = extractProperties(line)
    for (const prop of props) {
      // Create a unique key including direction/corner
      let key = prop.name
      if (prop.direction) key += `_${prop.direction}`
      if (prop.corner) key += `_${prop.corner}`
      map.set(key, prop)
    }
  }

  return map
}

/**
 * Format a property value for display
 */
function formatPropertyValue(prop: ExtractedProperty): string {
  let result = `${prop.name}`
  if (prop.direction) result += ` ${prop.direction}`
  if (prop.corner) result += ` ${prop.corner}`
  result += ` ${prop.value}`
  return result
}

/**
 * Check if two values are semantically equivalent
 */
function valuesAreEquivalent(v1: unknown, v2: unknown): boolean {
  // Direct equality
  if (v1 === v2) return true

  // Number comparison (handles string "12" vs number 12)
  if (typeof v1 === 'number' || typeof v2 === 'number') {
    const n1 = typeof v1 === 'string' ? parseFloat(v1) : v1
    const n2 = typeof v2 === 'string' ? parseFloat(v2) : v2
    if (typeof n1 === 'number' && typeof n2 === 'number') {
      return Math.abs(n1 - n2) < 0.001
    }
  }

  // Color comparison (normalize hex formats)
  if (typeof v1 === 'string' && typeof v2 === 'string') {
    // Normalize hex colors to lowercase
    if (v1.startsWith('#') && v2.startsWith('#')) {
      return v1.toLowerCase() === v2.toLowerCase()
    }
  }

  return false
}

/**
 * Generate a human-readable comparison details message
 */
function generateComparisonDetails(
  differences: PropertyDifference[],
  isEquivalent: boolean
): string {
  if (isEquivalent) {
    return 'Code is semantically equivalent'
  }

  const errors = differences.filter((d) => d.severity === 'error')
  const warnings = differences.filter((d) => d.severity === 'warning')

  const parts: string[] = []

  if (errors.length > 0) {
    parts.push(`${errors.length} error(s)`)
    for (const err of errors.slice(0, 3)) {
      if (err.type === 'missing') {
        parts.push(`  - Missing: ${err.property} = ${err.expected}`)
      } else if (err.type === 'value-mismatch') {
        parts.push(`  - Mismatch: ${err.property} expected ${err.expected}, got ${err.actual}`)
      }
    }
  }

  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning(s)`)
    for (const warn of warnings.slice(0, 2)) {
      if (warn.type === 'extra') {
        parts.push(`  - Extra: ${warn.property} = ${warn.actual}`)
      }
    }
  }

  return parts.join('\n')
}

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validate code against the DSL schema
 */
export function validateAgainstSchema(code: string): SchemaValidationResult {
  const result = validateSchema(code)
  const errors = result.issues.filter((i) => i.type === 'error')
  const warnings = result.issues.filter((i) => i.type === 'warning')

  // Calculate score
  let score = 100
  score -= errors.length * 20
  score -= warnings.length * 5
  score = Math.max(0, score)

  return {
    valid: result.valid,
    errors,
    warnings,
    score,
  }
}

// =============================================================================
// COMPREHENSIVE EVALUATION
// =============================================================================

/**
 * Perform comprehensive evaluation of LLM output
 *
 * @param actual - The LLM-generated code
 * @param expected - Optional expected code for comparison
 * @returns Comprehensive evaluation result
 */
export function evaluateComprehensive(
  actual: string,
  expected?: string
): ComprehensiveEvaluation {
  // Schema validation
  const schemaValidation = validateAgainstSchema(actual)

  // Semantic comparison (if expected is provided)
  let semanticComparison: SemanticComparisonResult | undefined
  if (expected) {
    semanticComparison = semanticCompare(expected, actual)
  }

  // Calculate overall score
  let overallScore: number
  if (semanticComparison) {
    // Weighted average: 60% semantic, 40% schema
    overallScore = semanticComparison.score * 0.6 + schemaValidation.score * 0.4
  } else {
    overallScore = schemaValidation.score
  }

  // Determine pass/fail
  const passed =
    schemaValidation.valid &&
    (semanticComparison ? semanticComparison.score >= 80 : true)

  // Generate summary
  const summary = generateSummary(schemaValidation, semanticComparison, passed)

  return {
    semanticComparison,
    schemaValidation,
    overallScore: Math.round(overallScore),
    passed,
    summary,
  }
}

/**
 * Generate a summary message for the evaluation
 */
function generateSummary(
  schemaValidation: SchemaValidationResult,
  semanticComparison: SemanticComparisonResult | undefined,
  passed: boolean
): string {
  const parts: string[] = []

  // Schema validation status
  if (schemaValidation.valid) {
    parts.push('Schema: VALID')
  } else {
    parts.push(`Schema: INVALID (${schemaValidation.errors.length} errors)`)
  }

  // Semantic comparison status
  if (semanticComparison) {
    if (semanticComparison.isEquivalent) {
      parts.push('Comparison: EQUIVALENT')
    } else {
      const diffCount = semanticComparison.differences.filter(
        (d) => d.severity === 'error'
      ).length
      parts.push(`Comparison: ${diffCount} differences`)
    }
  }

  // Overall status
  parts.push(`Result: ${passed ? 'PASSED' : 'FAILED'}`)

  return parts.join(' | ')
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Normalize code to canonical form
 *
 * This is the main entry point for normalizing LLM output.
 */
export function normalizeCode(code: string): string {
  return normalize(code)
}

/**
 * Check if two code snippets are semantically equivalent
 */
export function codeIsEquivalent(code1: string, code2: string): boolean {
  return areEquivalent(code1, code2)
}

/**
 * Get the canonical (long) form of a property name
 */
export function canonicalPropertyName(name: string): string {
  return normalizePropertyName(name)
}

/**
 * Check if a property name is valid according to the schema
 */
export function isValidPropertyName(name: string): boolean {
  return getPropertyDefinitionByAnyName(name) !== undefined
}

/**
 * Get all valid property names from the schema
 */
export function getSchemaPropertyNames(): string[] {
  return getAllPropertyNames()
}

// =============================================================================
// BATCH EVALUATION
// =============================================================================

export interface BatchEvaluationItem {
  id: string
  actual: string
  expected?: string
}

export interface BatchEvaluationResult {
  items: Array<{
    id: string
    evaluation: ComprehensiveEvaluation
  }>
  summary: BatchSummary
}

export interface BatchSummary {
  total: number
  passed: number
  failed: number
  passRate: number
  averageScore: number
}

/**
 * Evaluate a batch of LLM outputs
 */
export function evaluateBatch(items: BatchEvaluationItem[]): BatchEvaluationResult {
  const results = items.map((item) => ({
    id: item.id,
    evaluation: evaluateComprehensive(item.actual, item.expected),
  }))

  const passed = results.filter((r) => r.evaluation.passed).length
  const totalScore = results.reduce((sum, r) => sum + r.evaluation.overallScore, 0)

  return {
    items: results,
    summary: {
      total: items.length,
      passed,
      failed: items.length - passed,
      passRate: items.length > 0 ? (passed / items.length) * 100 : 0,
      averageScore: items.length > 0 ? totalScore / items.length : 0,
    },
  }
}

/**
 * Generate a report from batch evaluation results
 */
export function generateBatchReport(results: BatchEvaluationResult): string {
  const { summary, items } = results
  let report = ''

  report += '=' .repeat(60) + '\n'
  report += 'SCHEMA-BASED LLM EVALUATION REPORT\n'
  report += '=' .repeat(60) + '\n\n'

  report += `Total: ${summary.total}\n`
  report += `Passed: ${summary.passed}\n`
  report += `Failed: ${summary.failed}\n`
  report += `Pass Rate: ${summary.passRate.toFixed(1)}%\n`
  report += `Average Score: ${summary.averageScore.toFixed(1)}\n\n`

  // Failed items
  const failed = items.filter((i) => !i.evaluation.passed)
  if (failed.length > 0) {
    report += 'FAILURES:\n'
    report += '-'.repeat(40) + '\n'

    for (const item of failed) {
      report += `\n[${item.id}]\n`
      report += `  Score: ${item.evaluation.overallScore}\n`
      report += `  ${item.evaluation.summary}\n`

      // Show schema errors
      if (item.evaluation.schemaValidation.errors.length > 0) {
        report += '  Schema Errors:\n'
        for (const err of item.evaluation.schemaValidation.errors.slice(0, 3)) {
          report += `    - ${err.message}\n`
        }
      }

      // Show semantic differences
      if (item.evaluation.semanticComparison?.differences.length) {
        const errors = item.evaluation.semanticComparison.differences.filter(
          (d) => d.severity === 'error'
        )
        if (errors.length > 0) {
          report += '  Differences:\n'
          for (const diff of errors.slice(0, 3)) {
            report += `    - ${diff.type}: ${diff.property}\n`
          }
        }
      }
    }
  }

  return report
}
