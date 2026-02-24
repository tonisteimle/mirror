/**
 * @module converter/react-pivot/validation/test-driven-regeneration
 * @description Test-Driven Regeneration for isolated issue fixing
 *
 * For each issue:
 * 1. Create minimal test case (isolate problematic code)
 * 2. Generate fix for the isolated case
 * 3. Validate the fix works
 * 4. Apply fix to full code
 *
 * This approach increases fix reliability by testing in isolation.
 */

import type { ValidationIssue, ValidationIssueType } from '../types'
import { validateReactCode } from './react-linter'

// =============================================================================
// Types
// =============================================================================

export interface IsolatedTestCase {
  /** Original issue being fixed */
  issue: ValidationIssue
  /** Minimal code snippet containing the issue */
  minimalCode: string
  /** Expected validation result after fix */
  expectedResult: 'valid' | 'reduced-issues'
  /** Context needed to understand the fix */
  context: string
}

export interface FixAttempt {
  /** The isolated test case */
  testCase: IsolatedTestCase
  /** The proposed fix */
  fixedCode: string
  /** Whether the fix passed the test */
  passed: boolean
  /** Issues after fix */
  issuesAfter: ValidationIssue[]
}

export interface TestDrivenFixResult {
  /** Overall success */
  success: boolean
  /** The fixed code */
  fixedCode: string
  /** Individual fix attempts */
  attempts: FixAttempt[]
  /** Issues that couldn't be fixed */
  unfixedIssues: ValidationIssue[]
  /** Metrics */
  metrics: {
    totalIssues: number
    isolatedIssues: number
    fixedIssues: number
    appliedFixes: number
  }
}

export interface TestDrivenOptions {
  /** Maximum attempts per issue */
  maxAttemptsPerIssue?: number
  /** Include detailed context in test cases */
  includeContext?: boolean
  /** LLM fix generator callback */
  fixGenerator?: (testCase: IsolatedTestCase) => Promise<string>
  /** Debug logging */
  debug?: boolean
}

// =============================================================================
// Test Case Extraction
// =============================================================================

/**
 * Extract minimal test case for an issue
 */
export function extractTestCase(
  code: string,
  issue: ValidationIssue
): IsolatedTestCase | null {
  const lines = code.split('\n')
  const issueLine = issue.line ?? 0

  // Get context around the issue (5 lines before and after)
  const contextStart = Math.max(0, issueLine - 5)
  const contextEnd = Math.min(lines.length, issueLine + 5)
  const context = lines.slice(contextStart, contextEnd).join('\n')

  // Create minimal test case based on issue type
  const minimalCode = createMinimalTestCase(code, issue, lines)

  if (!minimalCode) return null

  return {
    issue,
    minimalCode,
    expectedResult: 'valid',
    context,
  }
}

function createMinimalTestCase(
  fullCode: string,
  issue: ValidationIssue,
  lines: string[]
): string | null {
  const issueLine = issue.line ?? 0

  switch (issue.type) {
    case 'HARDCODED_COLOR':
      // Extract just the style object containing the color
      return extractStyleBlock(fullCode, issue.code ?? '')

    case 'INVALID_COMPONENT':
      // Extract the component and its immediate children
      return extractComponentBlock(fullCode, issue.code ?? '', lines, issueLine)

    case 'CLASSNAME_USED':
      // Extract the element with className
      return extractElementWithProp(fullCode, 'className', lines, issueLine)

    case 'UNSUPPORTED_PROP':
      // Extract the style object with the unsupported prop
      return extractStyleBlock(fullCode, issue.code ?? '')

    case 'CUSTOM_HOOK':
      // Extract the hook usage and its surrounding context
      return extractHookUsage(fullCode, issue.code ?? '', lines, issueLine)

    case 'SPREAD_OPERATOR':
      // Extract the component with spread
      return extractSpreadUsage(fullCode, issue.code ?? '', lines, issueLine)

    default:
      // Fall back to extracting the issue line with context
      if (issueLine > 0 && issueLine <= lines.length) {
        const start = Math.max(0, issueLine - 2)
        const end = Math.min(lines.length, issueLine + 2)
        return lines.slice(start, end).join('\n')
      }
      return null
  }
}

function extractStyleBlock(code: string, searchFor: string): string | null {
  // Find style={{ ... }} containing the search term
  const stylePattern = /style\s*=\s*\{\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}/g
  let match

  while ((match = stylePattern.exec(code)) !== null) {
    if (match[0].includes(searchFor) || match[1].includes(searchFor)) {
      // Create minimal test case with just this style
      return `<Box ${match[0]}>\n  Test\n</Box>`
    }
  }

  return null
}

function extractComponentBlock(
  code: string,
  componentName: string,
  lines: string[],
  line: number
): string | null {
  // Extract the full component with opening and closing tags
  const startLine = line - 1 // 0-indexed
  if (startLine < 0 || startLine >= lines.length) return null

  let braceCount = 0
  let foundStart = false
  let endLine = startLine

  // Find the closing of this component
  for (let i = startLine; i < lines.length; i++) {
    const lineContent = lines[i]

    // Count angle brackets for JSX
    for (const char of lineContent) {
      if (char === '<') foundStart = true
      if (foundStart) {
        if (char === '<' && lineContent[lineContent.indexOf(char) + 1] !== '/') {
          braceCount++
        } else if (lineContent.includes('/>')) {
          braceCount = Math.max(0, braceCount - 1)
        } else if (lineContent.includes('</')) {
          braceCount = Math.max(0, braceCount - 1)
        }
      }
    }

    if (foundStart && braceCount === 0) {
      endLine = i
      break
    }

    // Safety limit
    if (i - startLine > 20) {
      endLine = i
      break
    }
  }

  return lines.slice(startLine, endLine + 1).join('\n')
}

function extractElementWithProp(
  code: string,
  propName: string,
  lines: string[],
  line: number
): string | null {
  const startLine = Math.max(0, line - 2)
  const endLine = Math.min(lines.length, line + 2)

  const snippet = lines.slice(startLine, endLine).join('\n')

  // Ensure we have a complete element
  if (snippet.includes('<') && (snippet.includes('/>') || snippet.includes('</'))) {
    return snippet
  }

  // Try to find a complete element
  const pattern = new RegExp(`<\\w+[^>]*${propName}[^>]*(?:/>|>[^<]*</\\w+>)`, 's')
  const match = code.match(pattern)
  return match?.[0] ?? null
}

function extractHookUsage(
  code: string,
  hookName: string,
  lines: string[],
  line: number
): string | null {
  // Hooks typically span one line
  if (line > 0 && line <= lines.length) {
    const hookLine = lines[line - 1]
    // Include surrounding lines for context
    const start = Math.max(0, line - 2)
    const end = Math.min(lines.length, line + 1)
    return lines.slice(start, end).join('\n')
  }
  return null
}

function extractSpreadUsage(
  code: string,
  spreadCode: string,
  lines: string[],
  line: number
): string | null {
  // Extract the component using spread
  return extractComponentBlock(code, spreadCode, lines, line)
}

// =============================================================================
// Fix Generation & Validation
// =============================================================================

/**
 * Generate fix suggestions for a test case
 */
export function generateFixSuggestions(testCase: IsolatedTestCase): string[] {
  const suggestions: string[] = []
  const { issue, minimalCode } = testCase

  switch (issue.type) {
    case 'HARDCODED_COLOR':
      // Suggest token replacements
      suggestions.push(
        minimalCode.replace(/#[0-9A-Fa-f]{3,8}/, '"$primary.bg"'),
        minimalCode.replace(/#[0-9A-Fa-f]{3,8}/, '"$surface.bg"'),
        minimalCode.replace(/#[0-9A-Fa-f]{3,8}/, '"$default.col"')
      )
      break

    case 'INVALID_COMPONENT':
      // Suggest component replacements
      const invalidComp = issue.code?.replace('<', '') ?? 'div'
      const componentMap: Record<string, string> = {
        div: 'Box',
        span: 'Text',
        p: 'Text',
        section: 'Section',
        article: 'Card',
      }
      const replacement = componentMap[invalidComp.toLowerCase()] ?? 'Box'
      suggestions.push(
        minimalCode
          .replace(new RegExp(`<${invalidComp}`, 'gi'), `<${replacement}`)
          .replace(new RegExp(`</${invalidComp}>`, 'gi'), `</${replacement}>`)
      )
      break

    case 'CLASSNAME_USED':
      // Remove className
      suggestions.push(minimalCode.replace(/className\s*=\s*["'][^"']*["']\s*/g, ''))
      break

    case 'SPREAD_OPERATOR':
      // Remove spread
      suggestions.push(minimalCode.replace(/\{\s*\.\.\.\w+\s*\}/g, ''))
      break

    default:
      // Use the suggestion from the issue if available
      if (issue.suggestion) {
        suggestions.push(issue.suggestion)
      }
  }

  return suggestions.filter(s => s !== minimalCode)
}

/**
 * Validate a fix against the test case
 */
export function validateFix(testCase: IsolatedTestCase, fixedCode: string): FixAttempt {
  const validation = validateReactCode(fixedCode)

  // Check if this specific issue type is fixed
  const sameTypeIssues = validation.issues.filter(i => i.type === testCase.issue.type)
  const passed = sameTypeIssues.length === 0

  return {
    testCase,
    fixedCode,
    passed,
    issuesAfter: validation.issues,
  }
}

// =============================================================================
// Fix Application
// =============================================================================

/**
 * Apply a validated fix to the full code
 */
export function applyFixToFullCode(
  fullCode: string,
  testCase: IsolatedTestCase,
  fixedSnippet: string
): string {
  // Try to find and replace the minimal code in the full code
  const { minimalCode, issue } = testCase

  // Normalize whitespace for comparison
  const normalizedOriginal = normalizeWhitespace(minimalCode)
  const fullCodeNormalized = normalizeWhitespace(fullCode)

  // Try direct replacement first
  if (fullCode.includes(minimalCode)) {
    return fullCode.replace(minimalCode, fixedSnippet)
  }

  // Try line-based replacement
  const issueLineIdx = (issue.line ?? 1) - 1
  const lines = fullCode.split('\n')

  if (issueLineIdx >= 0 && issueLineIdx < lines.length) {
    // Find the fix difference
    const originalLines = minimalCode.split('\n')
    const fixedLines = fixedSnippet.split('\n')

    // Apply line-by-line changes
    for (let i = 0; i < originalLines.length && i < fixedLines.length; i++) {
      const originalLine = originalLines[i].trim()
      const fixedLine = fixedLines[i].trim()

      if (originalLine !== fixedLine) {
        // Find this line in full code
        const targetLineIdx = lines.findIndex(l => l.trim() === originalLine)
        if (targetLineIdx !== -1) {
          // Preserve indentation
          const indent = lines[targetLineIdx].match(/^(\s*)/)?.[1] ?? ''
          lines[targetLineIdx] = indent + fixedLine
        }
      }
    }

    return lines.join('\n')
  }

  // Fall back to pattern-based replacement
  return applyPatternBasedFix(fullCode, testCase, fixedSnippet)
}

function normalizeWhitespace(code: string): string {
  return code.replace(/\s+/g, ' ').trim()
}

function applyPatternBasedFix(
  fullCode: string,
  testCase: IsolatedTestCase,
  fixedSnippet: string
): string {
  const { issue } = testCase

  // Use issue-specific patterns
  switch (issue.type) {
    case 'HARDCODED_COLOR':
      // Replace the specific color value
      if (issue.code) {
        // Find what the color was replaced with
        const colorMatch = issue.code.match(/#[0-9A-Fa-f]{3,8}/)
        if (colorMatch) {
          const tokenMatch = fixedSnippet.match(/"\$[\w.-]+"/)?.[0]
          if (tokenMatch) {
            return fullCode.replace(colorMatch[0], tokenMatch)
          }
        }
      }
      break

    case 'INVALID_COMPONENT':
      // Replace component tags
      if (issue.code) {
        const invalidComp = issue.code.replace('<', '')
        const fixedComp = fixedSnippet.match(/<([A-Z]\w*)/)?.[1]
        if (fixedComp) {
          let result = fullCode.replace(
            new RegExp(`<${invalidComp}(\\s|>)`, 'gi'),
            `<${fixedComp}$1`
          )
          result = result.replace(
            new RegExp(`</${invalidComp}>`, 'gi'),
            `</${fixedComp}>`
          )
          return result
        }
      }
      break
  }

  return fullCode
}

// =============================================================================
// Main Test-Driven Regeneration
// =============================================================================

/**
 * Apply test-driven regeneration to fix issues
 */
export async function testDrivenRegenerate(
  code: string,
  options: TestDrivenOptions = {}
): Promise<TestDrivenFixResult> {
  const {
    maxAttemptsPerIssue = 3,
    includeContext = true,
    fixGenerator,
    debug = false,
  } = options

  // Validate to find issues
  const validation = validateReactCode(code)
  const issues = validation.issues

  if (debug) {
    console.log(`[Test-Driven] Starting with ${issues.length} issues`)
  }

  if (issues.length === 0) {
    return {
      success: true,
      fixedCode: code,
      attempts: [],
      unfixedIssues: [],
      metrics: {
        totalIssues: 0,
        isolatedIssues: 0,
        fixedIssues: 0,
        appliedFixes: 0,
      },
    }
  }

  let currentCode = code
  const attempts: FixAttempt[] = []
  const unfixedIssues: ValidationIssue[] = []
  let isolatedCount = 0
  let fixedCount = 0
  let appliedCount = 0

  // Process each issue
  for (const issue of issues) {
    // Extract test case
    const testCase = extractTestCase(currentCode, issue)

    if (!testCase) {
      unfixedIssues.push(issue)
      continue
    }

    isolatedCount++

    if (debug) {
      console.log(`[Test-Driven] Isolated test case for ${issue.type}`)
    }

    // Try to generate and validate fixes
    let fixed = false

    for (let attempt = 0; attempt < maxAttemptsPerIssue && !fixed; attempt++) {
      // Get fix suggestions
      let fixSuggestions: string[]

      if (fixGenerator) {
        // Use LLM to generate fix
        try {
          const llmFix = await fixGenerator(testCase)
          fixSuggestions = [llmFix]
        } catch {
          fixSuggestions = generateFixSuggestions(testCase)
        }
      } else {
        fixSuggestions = generateFixSuggestions(testCase)
      }

      // Try each suggestion
      for (const suggestion of fixSuggestions) {
        const fixAttempt = validateFix(testCase, suggestion)
        attempts.push(fixAttempt)

        if (fixAttempt.passed) {
          // Apply fix to full code
          const newCode = applyFixToFullCode(currentCode, testCase, suggestion)

          // Verify the fix didn't break anything else
          const newValidation = validateReactCode(newCode)
          const prevValidation = validateReactCode(currentCode)

          if (newValidation.issues.length <= prevValidation.issues.length) {
            currentCode = newCode
            fixed = true
            fixedCount++
            appliedCount++

            if (debug) {
              console.log(`[Test-Driven] Fixed ${issue.type}`)
            }
            break
          }
        }
      }
    }

    if (!fixed) {
      unfixedIssues.push(issue)
    }
  }

  // Final validation
  const finalValidation = validateReactCode(currentCode)

  return {
    success: finalValidation.valid,
    fixedCode: currentCode,
    attempts,
    unfixedIssues: finalValidation.issues,
    metrics: {
      totalIssues: issues.length,
      isolatedIssues: isolatedCount,
      fixedIssues: fixedCount,
      appliedFixes: appliedCount,
    },
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick test-driven fix without LLM
 */
export async function quickTestDrivenFix(code: string): Promise<TestDrivenFixResult> {
  return testDrivenRegenerate(code, {
    maxAttemptsPerIssue: 2,
    includeContext: false,
  })
}

/**
 * Get fixable issues analysis
 */
export function analyzeFixability(code: string): {
  totalIssues: number
  isolatable: number
  hasSuggestions: number
  byType: Record<string, { count: number; isolatable: boolean; hasSuggestions: boolean }>
} {
  const validation = validateReactCode(code)
  const issues = validation.issues

  const byType: Record<string, { count: number; isolatable: boolean; hasSuggestions: boolean }> = {}

  let isolatableCount = 0
  let withSuggestions = 0

  for (const issue of issues) {
    // Check if we can isolate
    const testCase = extractTestCase(code, issue)
    const isolatable = testCase !== null

    // Check if we have suggestions
    const suggestions = testCase ? generateFixSuggestions(testCase) : []
    const hasSuggestions = suggestions.length > 0

    if (isolatable) isolatableCount++
    if (hasSuggestions) withSuggestions++

    // Track by type
    if (!byType[issue.type]) {
      byType[issue.type] = { count: 0, isolatable, hasSuggestions }
    }
    byType[issue.type].count++
  }

  return {
    totalIssues: issues.length,
    isolatable: isolatableCount,
    hasSuggestions: withSuggestions,
    byType,
  }
}

export default testDrivenRegenerate
