/**
 * @module converter/react-pivot/pipeline/retry-strategy
 * @description Intelligent retry strategy for React-Pivot pipeline
 *
 * Implements a multi-phase retry approach:
 * 1. Fast pass with hints
 * 2. Quality mode escalation
 * 3. Selective regeneration
 */

import type { ValidationIssue, ValidationIssueType } from '../types'
import { analyzeLLMErrors, type LLMErrorAnalysis, type LLMModel } from '../validation/llm-error-patterns'

// =============================================================================
// Types
// =============================================================================

export interface RetryDecision {
  /** Should retry? */
  shouldRetry: boolean

  /** Should escalate to quality mode? */
  escalateToQuality: boolean

  /** Specific hints for the retry prompt */
  hints: string[]

  /** Focus areas for regeneration */
  focusAreas: FocusArea[]

  /** Reason for the decision */
  reason: string

  /** LLM-specific analysis (if code was provided) */
  llmAnalysis?: LLMErrorAnalysis
}

export type FocusArea =
  | 'colors'        // Focus on token usage for colors
  | 'components'    // Focus on allowed components
  | 'structure'     // Focus on component hierarchy
  | 'events'        // Focus on event handling
  | 'styling'       // Focus on style properties

export interface RetryContext {
  /** Original prompt */
  prompt: string

  /** Number of attempts so far */
  attemptCount: number

  /** Maximum attempts allowed */
  maxAttempts: number

  /** Issues from current attempt */
  issues: ValidationIssue[]

  /** Issues from all previous attempts */
  previousIssues: ValidationIssue[][]

  /** Whether currently in quality mode */
  isQualityMode: boolean

  /** The failed code (for LLM pattern analysis) */
  failedCode?: string
}

// =============================================================================
// Error Analysis
// =============================================================================

/**
 * Categorize issues by their root cause
 */
function categorizeIssues(issues: ValidationIssue[]): Map<FocusArea, ValidationIssue[]> {
  const categories = new Map<FocusArea, ValidationIssue[]>()

  for (const issue of issues) {
    const area = mapIssueToFocusArea(issue.type)
    if (!categories.has(area)) {
      categories.set(area, [])
    }
    categories.get(area)!.push(issue)
  }

  return categories
}

function mapIssueToFocusArea(type: ValidationIssueType): FocusArea {
  switch (type) {
    case 'HARDCODED_COLOR':
    case 'MISSING_TOKEN':
    case 'INVALID_TOKEN':
      return 'colors'

    case 'INVALID_COMPONENT':
      return 'components'

    case 'UNSUPPORTED_PROP':
    case 'CLASSNAME_USED':
      return 'styling'

    case 'INVALID_EVENT':
    case 'INVALID_ACTION':
    case 'CUSTOM_HOOK':
      return 'events'

    default:
      return 'structure'
  }
}

/**
 * Check if issues are persistent (same type appearing in multiple attempts)
 */
function findPersistentIssues(
  currentIssues: ValidationIssue[],
  previousIssues: ValidationIssue[][]
): ValidationIssue[] {
  const currentTypes = new Set(currentIssues.map(i => i.type))
  const previousTypes = new Set(previousIssues.flat().map(i => i.type))

  return currentIssues.filter(issue => previousTypes.has(issue.type))
}

// =============================================================================
// Retry Decision Logic
// =============================================================================

/**
 * Determine the best retry strategy based on current context
 */
export function decideRetryStrategy(context: RetryContext): RetryDecision {
  const { attemptCount, maxAttempts, issues, previousIssues, isQualityMode, failedCode } = context

  // No retry if max attempts reached
  if (attemptCount >= maxAttempts) {
    return {
      shouldRetry: false,
      escalateToQuality: false,
      hints: [],
      focusAreas: [],
      reason: 'Maximum retry attempts reached',
    }
  }

  // No retry if no issues
  if (issues.length === 0) {
    return {
      shouldRetry: false,
      escalateToQuality: false,
      hints: [],
      focusAreas: [],
      reason: 'No issues to fix',
    }
  }

  // Categorize issues
  const categorized = categorizeIssues(issues)
  const focusAreas = Array.from(categorized.keys())
  const persistentIssues = findPersistentIssues(issues, previousIssues)

  // Run LLM-specific error analysis if code is provided
  let llmAnalysis: LLMErrorAnalysis | undefined
  if (failedCode) {
    llmAnalysis = analyzeLLMErrors(failedCode, issues)
  }

  // Generate hints based on issues and LLM patterns
  const baseHints = generateHints(issues, categorized)
  const llmHints = llmAnalysis?.hints ?? []
  const llmPromptMods = llmAnalysis?.promptModifications ?? []

  // Combine hints, prioritizing LLM-specific ones
  const hints = [...new Set([...llmHints, ...llmPromptMods, ...baseHints])]

  // Decide on quality mode escalation
  // More aggressive escalation if LLM analysis shows strong patterns
  const hasStrongLLMPatterns = llmAnalysis?.patterns.some(p => p.confidence > 0.7) ?? false

  const shouldEscalate =
    !isQualityMode && (
      // Escalate if same issues persist
      persistentIssues.length > 0 ||
      // Escalate if multiple focus areas have issues
      focusAreas.length >= 3 ||
      // Escalate if many issues
      issues.length >= 5 ||
      // Escalate on second retry
      attemptCount >= 1 ||
      // Escalate if strong LLM error patterns detected
      hasStrongLLMPatterns
    )

  return {
    shouldRetry: true,
    escalateToQuality: shouldEscalate,
    hints,
    focusAreas,
    reason: shouldEscalate
      ? `Escalating to quality mode: ${persistentIssues.length} persistent issues` +
        (hasStrongLLMPatterns ? `, strong ${llmAnalysis?.likelyModel ?? 'unknown'} patterns detected` : '')
      : `Retrying with ${hints.length} hints`,
    llmAnalysis,
  }
}

// =============================================================================
// Hint Generation
// =============================================================================

function generateHints(
  issues: ValidationIssue[],
  categorized: Map<FocusArea, ValidationIssue[]>
): string[] {
  const hints: string[] = []

  // Color-related hints
  if (categorized.has('colors')) {
    const colorIssues = categorized.get('colors')!
    const colorCount = colorIssues.length

    hints.push(
      `CRITICAL: You have ${colorCount} color error(s). ` +
      `ALL colors MUST use $token.property format (e.g., $primary.bg, $surface.bg). ` +
      `NEVER use hex (#xxx), rgb(), or named colors (white, black).`
    )

    // Add specific color fixes
    const hexColors = colorIssues.filter(i => i.code?.includes('#'))
    if (hexColors.length > 0) {
      hints.push(
        `Replace these hex colors: ${hexColors.map(i => i.code).join(', ')} → ` +
        `Use $primary.bg, $surface.bg, $danger.bg, etc.`
      )
    }
  }

  // Component-related hints
  if (categorized.has('components')) {
    const componentIssues = categorized.get('components')!
    const badComponents = componentIssues.map(i => i.code?.replace('<', '')).filter(Boolean)

    hints.push(
      `Component errors: ${badComponents.join(', ')} are not allowed. ` +
      `Use only: Box, Row, Col, Text, Title, Button, Input, Card, etc.`
    )
  }

  // Styling-related hints
  if (categorized.has('styling')) {
    hints.push(
      `Styling errors found. Use style={{}} with supported properties only. ` +
      `NO className, NO Tailwind classes.`
    )
  }

  // Events-related hints
  if (categorized.has('events')) {
    hints.push(
      `Event handling errors. Use onClick={{ action: 'toggle' }} style actions. ` +
      `NO React hooks (useState, useEffect).`
    )
  }

  return hints
}

// =============================================================================
// Correction Prompt Generation
// =============================================================================

/**
 * Generate an enhanced correction prompt based on retry decision
 */
export function generateEnhancedCorrectionPrompt(
  originalPrompt: string,
  failedCode: string,
  decision: RetryDecision
): string {
  const parts: string[] = []

  // Header
  parts.push('## CORRECTION REQUIRED - PLEASE FIX ALL ERRORS')

  // Urgent hints first
  if (decision.hints.length > 0) {
    parts.push('\n### CRITICAL FIXES NEEDED:')
    decision.hints.forEach((hint, i) => {
      parts.push(`${i + 1}. ${hint}`)
    })
  }

  // Focus areas
  if (decision.focusAreas.length > 0) {
    parts.push('\n### FOCUS AREAS:')
    parts.push(`Pay special attention to: ${decision.focusAreas.join(', ')}`)
  }

  // Original code reference
  parts.push('\n### FAILED CODE (DO NOT REPEAT THESE MISTAKES):')
  parts.push('```jsx')
  parts.push(failedCode.substring(0, 1500)) // Limit length
  if (failedCode.length > 1500) {
    parts.push('// ... (truncated)')
  }
  parts.push('```')

  // Quality mode specific instructions
  if (decision.escalateToQuality) {
    parts.push('\n### QUALITY MODE INSTRUCTIONS:')
    parts.push('- Take your time to generate correct code')
    parts.push('- Double-check ALL colors use $token.property format')
    parts.push('- Verify ALL components are from the allowed list')
    parts.push('- Review the full specification before outputting')
  }

  // Original request
  parts.push('\n### ORIGINAL REQUEST:')
  parts.push(originalPrompt)

  parts.push('\nGenerate CORRECTED React/JSX code that fixes ALL errors. Output ONLY the code.')

  return parts.join('\n')
}

// =============================================================================
// Retry Loop Helper
// =============================================================================

/**
 * Wraps retry logic for easier integration
 */
export interface RetryResult<T> {
  success: boolean
  result?: T
  attempts: number
  finalDecision: RetryDecision
}

export async function withIntelligentRetry<T>(
  operation: (attempt: number, isQualityMode: boolean, hints: string[]) => Promise<{
    success: boolean
    result?: T
    issues: ValidationIssue[]
  }>,
  options: {
    maxAttempts?: number
    initialQualityMode?: boolean
  } = {}
): Promise<RetryResult<T>> {
  const { maxAttempts = 3, initialQualityMode = false } = options

  let attemptCount = 0
  let isQualityMode = initialQualityMode
  const previousIssues: ValidationIssue[][] = []
  let finalDecision: RetryDecision = {
    shouldRetry: false,
    escalateToQuality: false,
    hints: [],
    focusAreas: [],
    reason: 'Not started',
  }

  while (attemptCount < maxAttempts) {
    const { success, result, issues } = await operation(
      attemptCount,
      isQualityMode,
      finalDecision.hints
    )

    if (success && result !== undefined) {
      return {
        success: true,
        result,
        attempts: attemptCount + 1,
        finalDecision,
      }
    }

    // Decide on retry
    finalDecision = decideRetryStrategy({
      prompt: '',
      attemptCount,
      maxAttempts,
      issues,
      previousIssues,
      isQualityMode,
    })

    if (!finalDecision.shouldRetry) {
      break
    }

    // Update state for next attempt
    previousIssues.push(issues)
    isQualityMode = isQualityMode || finalDecision.escalateToQuality
    attemptCount++
  }

  return {
    success: false,
    attempts: attemptCount + 1,
    finalDecision,
  }
}

export default decideRetryStrategy
