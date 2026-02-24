/**
 * LLM Output Evaluator
 *
 * Evaluates Mirror code output against test case criteria.
 * Uses the parser and validator to perform checks.
 */

import { parse } from '../../../parser/parser'
import { validateCode } from '../../../validator'
import { validate as unifiedValidate } from '../../../validation/pipeline/validate'
import type { ParseResult } from '../../../parser/types'
import type {
  TestCase,
  EvaluationCriteria,
  CheckResult,
  EvaluationResult,
  EvaluatorConfig,
  CheckDefinition,
} from '../schema'
import { passCheck, failCheck, criteriaToChecks, summarizeChecks } from '../schema/evaluation'

// =============================================================================
// Core Evaluator
// =============================================================================

/**
 * Evaluate Mirror code output against test criteria
 */
export function evaluate(
  code: string,
  testCase: TestCase,
  config: EvaluatorConfig = {}
): EvaluationResult {
  const startTime = performance.now()
  const checks: CheckResult[] = []
  const normalized = normalizeCode(code)

  // Convert criteria to check definitions
  const checkDefs = criteriaToChecks(testCase.expect)

  // Parse result (cached for multiple checks)
  let parseResult: ParseResult | null = null
  let parseError: string | null = null
  let parseTimeMs: number | undefined

  // Attempt parsing
  const parseStart = performance.now()
  try {
    parseResult = parse(code)
    parseTimeMs = performance.now() - parseStart
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err)
    parseTimeMs = performance.now() - parseStart
  }

  // Run each check
  for (const checkDef of checkDefs) {
    const result = runCheck(checkDef, code, normalized, parseResult, parseError, testCase.expect)
    checks.push(result)

    // Fail fast if configured
    if (config.failFast && !result.passed) {
      break
    }
  }

  const evaluationTimeMs = performance.now() - startTime

  return {
    caseId: testCase.id,
    passed: checks.every(c => c.passed),
    checks,
    summary: summarizeChecks(checks),
    output: {
      code,
      normalized,
    },
    performance: config.includePerformance ? {
      evaluationTimeMs,
      parseTimeMs,
    } : undefined,
    evaluatedAt: new Date().toISOString(),
  }
}

// =============================================================================
// Individual Check Runners
// =============================================================================

function runCheck(
  def: CheckDefinition,
  code: string,
  normalized: string,
  parseResult: ParseResult | null,
  parseError: string | null,
  criteria: EvaluationCriteria
): CheckResult {
  switch (def.type) {
    case 'parses':
      return checkParses(parseResult, parseError, code)

    case 'validates':
      return checkValidates(code, parseResult)

    case 'renders':
      return checkRenders(parseResult)

    case 'contains-component':
      return checkContainsComponent(parseResult, def.params?.component as string, code)

    case 'contains-property':
      return checkContainsProperty(code, normalized, def.params?.property as string)

    case 'contains-token':
      return checkContainsToken(code, def.params?.token as string)

    case 'contains-text':
      return checkContainsText(code, def.params?.text as string)

    case 'not-contains':
      return checkNotContains(code, def.params?.text as string)

    case 'structure-layout':
      return checkStructureLayout(parseResult, def.params?.layout as string)

    case 'structure-node-count':
      return checkStructureNodeCount(
        parseResult,
        def.params?.min as number | undefined,
        def.params?.max as number | undefined
      )

    case 'structure-depth':
      return checkStructureDepth(
        parseResult,
        def.params?.min as number | undefined,
        def.params?.max as number | undefined
      )

    case 'llm-quality':
      return checkLLMQuality(code)

    default:
      return failCheck(def.name, `Unknown check type: ${def.type}`)
  }
}

// =============================================================================
// Check Implementations
// =============================================================================

function checkParses(
  parseResult: ParseResult | null,
  parseError: string | null,
  code?: string
): CheckResult {
  if (parseError) {
    return failCheck('parses', `Parse error: ${parseError}`)
  }

  if (!parseResult) {
    return failCheck('parses', 'No parse result')
  }

  // Check for real errors (not warnings)
  const realErrors = parseResult.errors?.filter(e => {
    const msg = typeof e === 'string' ? e : (e as { message?: string }).message || String(e)
    return !msg.startsWith('Warning:')
  }) || []

  if (realErrors.length > 0) {
    const errorMsgs = realErrors.map(e =>
      typeof e === 'string' ? e : (e as { message?: string }).message || String(e)
    ).join('; ')
    return failCheck('parses', `Parse errors: ${errorMsgs}`)
  }

  // Check if nodes or templates were created
  const hasNodes = parseResult.nodes && parseResult.nodes.length > 0
  const hasTemplates = parseResult.templates && Object.keys(parseResult.templates).length > 0

  // Check for component definitions in code text (e.g., "Button:" at start of line)
  // The parser doesn't expose definitions in parseResult, but they're valid code
  const hasDefinitions = code ? /^[A-Z][A-Za-z0-9]*:/m.test(code) : false

  if (!hasNodes && !hasTemplates && !hasDefinitions) {
    return failCheck('parses', 'No nodes created')
  }

  if ((hasTemplates || hasDefinitions) && !hasNodes) {
    return passCheck('parses', 'Code parses successfully (definitions only)')
  }

  return passCheck('parses', 'Code parses successfully')
}

function checkValidates(
  code: string,
  parseResult: ParseResult | null
): CheckResult {
  if (!parseResult) {
    return failCheck('validates', 'Cannot validate: no parse result')
  }

  try {
    // Use unified validation with LLM mode for better LLM-specific error detection
    const llmValidation = unifiedValidate(code, { mode: 'llm' })

    // Also run standard validation for comprehensive checking
    const validationResult = validateCode(parseResult, code)

    // Collect all errors from both validation systems
    const llmErrors = llmValidation.diagnostics?.filter(d => d.severity === 'error') || []
    const standardErrors = validationResult.diagnostics?.filter(d => d.severity === 'error') || []

    // Use standard validation result as primary (LLM validation catches different issues)
    if (!validationResult.valid) {
      const errorMsgs = standardErrors.slice(0, 3).map(e => e.message).join('; ')
      return failCheck(
        'validates',
        `Validation errors: ${errorMsgs}${standardErrors.length > 3 ? ` (+${standardErrors.length - 3} more)` : ''}`
      )
    }

    // Report LLM-specific issues as warnings (code still validates but has style issues)
    if (llmErrors.length > 0) {
      const llmIssues = llmErrors.slice(0, 2).map(e => e.message).join('; ')
      return passCheck('validates', `Valid (LLM style issues: ${llmIssues})`)
    }

    return passCheck('validates', 'Code validates successfully')
  } catch (err) {
    return failCheck('validates', `Validation exception: ${err}`)
  }
}

function checkRenders(parseResult: ParseResult | null): CheckResult {
  // TODO: Implement render check with React testing
  // For now, just check if we have nodes to render
  if (!parseResult || !parseResult.nodes || parseResult.nodes.length === 0) {
    return failCheck('renders', 'No nodes to render')
  }

  return passCheck('renders', 'Has renderable nodes (actual render not yet implemented)')
}

function checkContainsComponent(
  parseResult: ParseResult | null,
  component: string,
  code?: string
): CheckResult {
  // First check in parsed nodes
  if (parseResult?.nodes) {
    const found = findComponentInNodes(parseResult.nodes, component)
    if (found) {
      return passCheck(`contains-component:${component}`)
    }
  }

  // Also check for component definitions in templates/definitions
  // (definitions don't create nodes but are valid Mirror code)
  if (parseResult?.templates) {
    for (const template of Object.values(parseResult.templates)) {
      if (template && typeof template === 'object') {
        const templateName = (template as { name?: string }).name
        if (templateName === component) {
          return passCheck(`contains-component:${component}`, 'Found as definition')
        }
      }
    }
  }

  // Check for component definition in code text (e.g., "Button:" at start of line)
  if (code) {
    const definitionPattern = new RegExp(`^${component}:`, 'm')
    if (definitionPattern.test(code)) {
      return passCheck(`contains-component:${component}`, 'Found as definition')
    }

    // Also check for component usage anywhere in the code
    const usagePattern = new RegExp(`\\b${component}\\b`)
    if (usagePattern.test(code)) {
      return passCheck(`contains-component:${component}`, 'Found in code')
    }
  }

  if (!parseResult?.nodes) {
    return failCheck(`contains-component:${component}`, 'No parse result')
  }

  const foundComponents = collectComponentTypes(parseResult.nodes)
  return failCheck(
    `contains-component:${component}`,
    `Component "${component}" not found`,
    component,
    foundComponents.join(', ')
  )
}

function checkContainsProperty(
  code: string,
  normalized: string,
  property: string
): CheckResult {
  // Check for property in code (simple text search for now)
  // This catches both shorthand (bg) and full names (background)
  const patterns = [
    new RegExp(`\\b${property}\\b`),  // Exact match
    new RegExp(`\\b${property}\\s+`), // Property with value
  ]

  for (const pattern of patterns) {
    if (pattern.test(code) || pattern.test(normalized)) {
      return passCheck(`contains-property:${property}`)
    }
  }

  return failCheck(
    `contains-property:${property}`,
    `Property "${property}" not found in code`
  )
}

function checkContainsToken(code: string, token: string): CheckResult {
  // Token should start with $
  const tokenPattern = token.startsWith('$') ? token : `$${token}`

  if (code.includes(tokenPattern)) {
    return passCheck(`contains-token:${token}`)
  }

  // Also check for token definition
  const defPattern = new RegExp(`\\${tokenPattern}\\s*:`)
  if (defPattern.test(code)) {
    return passCheck(`contains-token:${token}`)
  }

  return failCheck(
    `contains-token:${token}`,
    `Token "${tokenPattern}" not found`
  )
}

function checkContainsText(code: string, text: string): CheckResult {
  if (code.includes(text)) {
    return passCheck(`contains-text:"${text}"`)
  }

  // Check case-insensitive
  if (code.toLowerCase().includes(text.toLowerCase())) {
    return passCheck(`contains-text:"${text}"`, 'Found (case-insensitive)')
  }

  return failCheck(
    `contains-text:"${text}"`,
    `Text "${text}" not found`
  )
}

function checkNotContains(code: string, text: string): CheckResult {
  // Case-sensitive check - "button" should not match "Button"
  if (code.includes(text)) {
    return failCheck(
      `not-contains:"${text}"`,
      `Code contains forbidden text: "${text}"`
    )
  }

  return passCheck(`not-contains:"${text}"`)
}

function checkStructureLayout(
  parseResult: ParseResult | null,
  expectedLayout: string
): CheckResult {
  if (!parseResult || !parseResult.nodes || parseResult.nodes.length === 0) {
    return failCheck('structure-layout', 'No nodes to check')
  }

  const rootNode = parseResult.nodes[0]
  const props = rootNode.properties || {}
  const name = rootNode.name || ''

  let actualLayout: string = 'vertical' // Default

  // Check explicit properties
  if (props.hor || props.horizontal) {
    actualLayout = 'horizontal'
  } else if (props.stacked) {
    actualLayout = 'stacked'
  } else if (props.ver || props.vertical) {
    actualLayout = 'vertical'
  }
  // Check component names that imply layout
  else if (name === 'Row' || name === 'HStack') {
    actualLayout = 'horizontal'
  } else if (name === 'Column' || name === 'VStack') {
    actualLayout = 'vertical'
  } else if (name === 'Stack') {
    actualLayout = 'stacked'
  }

  if (actualLayout === expectedLayout) {
    return passCheck('structure-layout')
  }

  return failCheck(
    'structure-layout',
    `Expected ${expectedLayout} layout, got ${actualLayout}`,
    expectedLayout,
    actualLayout
  )
}

function checkStructureNodeCount(
  parseResult: ParseResult | null,
  min?: number,
  max?: number
): CheckResult {
  if (!parseResult || !parseResult.nodes) {
    return failCheck('structure-node-count', 'No nodes to check')
  }

  const count = parseResult.nodes.length

  if (min !== undefined && count < min) {
    return failCheck(
      'structure-node-count',
      `Expected at least ${min} root nodes, got ${count}`,
      `>= ${min}`,
      count
    )
  }

  if (max !== undefined && count > max) {
    return failCheck(
      'structure-node-count',
      `Expected at most ${max} root nodes, got ${count}`,
      `<= ${max}`,
      count
    )
  }

  return passCheck('structure-node-count')
}

function checkStructureDepth(
  parseResult: ParseResult | null,
  min?: number,
  max?: number
): CheckResult {
  if (!parseResult || !parseResult.nodes) {
    return failCheck('structure-depth', 'No nodes to check')
  }

  const depth = calculateMaxDepth(parseResult.nodes)

  if (min !== undefined && depth < min) {
    return failCheck(
      'structure-depth',
      `Expected depth at least ${min}, got ${depth}`,
      `>= ${min}`,
      depth
    )
  }

  if (max !== undefined && depth > max) {
    return failCheck(
      'structure-depth',
      `Expected depth at most ${max}, got ${depth}`,
      `<= ${max}`,
      depth
    )
  }

  return passCheck('structure-depth')
}

/**
 * Check LLM output quality using unified validation
 * Detects common LLM mistakes like px suffixes, colons, markdown blocks
 */
function checkLLMQuality(code: string): CheckResult {
  const llmValidation = unifiedValidate(code, { mode: 'llm' })
  const issues = llmValidation.diagnostics || []

  // Categorize issues by severity
  const errors = issues.filter(d => d.severity === 'error')
  const warnings = issues.filter(d => d.severity === 'warning')

  // Check for critical LLM issues (errors)
  if (errors.length > 0) {
    const errorCodes = errors.map(e => e.code).join(', ')
    const errorMsgs = errors.slice(0, 2).map(e => e.message).join('; ')
    return failCheck(
      'llm-quality',
      `LLM output contains errors (${errorCodes}): ${errorMsgs}`,
      'no LLM errors',
      `${errors.length} errors`
    )
  }

  // Check for style issues (warnings)
  if (warnings.length > 0) {
    const warningCodes = warnings.map(w => w.code).join(', ')
    return passCheck(
      'llm-quality',
      `LLM output has ${warnings.length} style issues (${warningCodes}) - consider improvement`
    )
  }

  return passCheck('llm-quality', 'LLM output is clean')
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .join('\n')
}

function findComponentInNodes(nodes: any[], componentType: string): boolean {
  for (const node of nodes) {
    // Check both name (for component instances) and type (for primitives)
    if (node.name === componentType || node.type === componentType || node.componentType === componentType) {
      return true
    }

    // Check children
    if (node.children && Array.isArray(node.children)) {
      if (findComponentInNodes(node.children, componentType)) {
        return true
      }
    }
  }

  return false
}

function collectComponentTypes(nodes: any[], types: Set<string> = new Set()): string[] {
  for (const node of nodes) {
    if (node.name) types.add(node.name)
    if (node.type) types.add(node.type)
    if (node.componentType) types.add(node.componentType)

    if (node.children && Array.isArray(node.children)) {
      collectComponentTypes(node.children, types)
    }
  }

  return Array.from(types)
}

function calculateMaxDepth(nodes: any[], currentDepth = 1): number {
  let maxDepth = currentDepth

  for (const node of nodes) {
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      const childDepth = calculateMaxDepth(node.children, currentDepth + 1)
      maxDepth = Math.max(maxDepth, childDepth)
    }
  }

  return maxDepth
}

// =============================================================================
// Batch Evaluation
// =============================================================================

/**
 * Evaluate multiple test cases
 */
export function evaluateSuite(
  cases: TestCase[],
  getOutput: (testCase: TestCase) => string,
  config: EvaluatorConfig = {}
): EvaluationResult[] {
  return cases
    .filter(c => !c.skip)
    .map(testCase => {
      const output = getOutput(testCase)
      return evaluate(output, testCase, config)
    })
}

/**
 * Generate a summary report from evaluation results
 */
export function generateReport(results: EvaluationResult[]): string {
  const passed = results.filter(r => r.passed).length
  const failed = results.length - passed
  const passRate = (passed / results.length * 100).toFixed(1)

  let report = `\n${'='.repeat(60)}\n`
  report += `LLM EVALUATION REPORT\n`
  report += `${'='.repeat(60)}\n\n`
  report += `Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Rate: ${passRate}%\n\n`

  // Failed cases
  const failedResults = results.filter(r => !r.passed)
  if (failedResults.length > 0) {
    report += `FAILURES:\n${'-'.repeat(40)}\n`
    for (const result of failedResults) {
      report += `\n[${result.caseId}]\n`
      const failedChecks = result.checks.filter(c => !c.passed)
      for (const check of failedChecks) {
        report += `  ✗ ${check.message}\n`
        if (check.expected !== undefined) {
          report += `    Expected: ${check.expected}\n`
          report += `    Actual:   ${check.actual}\n`
        }
      }
    }
  }

  return report
}
