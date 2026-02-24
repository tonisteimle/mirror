/**
 * @module converter/react-pivot/integration/adapter
 * @description Adapter to integrate React-Pivot pipeline with nl-translation.ts
 *
 * This adapter provides a seamless integration between the existing
 * nl-translation service and the new React-Pivot transformation pipeline.
 * It includes complexity classification to determine when to use each approach.
 */

import type {
  TranslationResult,
  TranslationCallbacks,
  QualityModeOptions,
} from '../../../services/nl-translation'
import type { ReactPivotOptions } from '../types'
import { executePipeline } from '../pipeline'
import { MirrorCodeIntelligence } from '../../../lib/ai-context'

// =============================================================================
// Complexity Classification
// =============================================================================

/**
 * Keywords that indicate complex UI requiring React-Pivot approach.
 * These patterns typically benefit from the LLM's React knowledge.
 */
const COMPLEX_UI_KEYWORDS = [
  // Forms
  'formular', 'form', 'eingabeformular', 'anmeldeformular', 'loginformular',
  'registrierung', 'checkout', 'kontaktformular',

  // Data displays
  'dashboard', 'tabelle', 'table', 'datatable', 'datenübersicht',
  'liste', 'list', 'übersicht',

  // Complex layouts
  'master-detail', 'split-view', 'sidebar-layout',
  'card-grid', 'grid-layout', 'responsive',

  // Interactive components
  'modal', 'dialog', 'wizard', 'stepper', 'tabs',
  'accordion', 'dropdown', 'menu', 'navigation',

  // Multi-component
  'user-profile', 'profil', 'settings', 'einstellungen',
  'product-card', 'produktkarte', 'pricing',
]

/**
 * Patterns that indicate the prompt describes multiple components
 * working together, which benefits from React-Pivot.
 */
const MULTI_COMPONENT_PATTERNS = [
  /mit\s+\w+\s+und\s+\w+/i,        // "mit X und Y"
  /enthält\s+\d+\s+\w+/i,          // "enthält 3 Karten"
  /\d+\s+(button|input|card)/i,    // "3 buttons"
  /zeigt.*an/i,                    // "zeigt ... an"
  /besteht aus/i,                  // "besteht aus"
  /inklusive/i,                    // "inklusive"
]

/**
 * Determine if a prompt should use the React-Pivot approach.
 *
 * React-Pivot is recommended for:
 * - Complex multi-component UIs
 * - Form-heavy interfaces
 * - Data display components (tables, lists)
 * - Interactive components (modals, dropdowns)
 *
 * Direct translation is better for:
 * - Simple single components
 * - Quick property changes
 * - Text content updates
 */
export function shouldUseReactPivot(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase()

  // Check for complex UI keywords
  const hasComplexKeyword = COMPLEX_UI_KEYWORDS.some(
    keyword => lowerPrompt.includes(keyword)
  )

  if (hasComplexKeyword) {
    return true
  }

  // Check for multi-component patterns
  const hasMultiComponentPattern = MULTI_COMPONENT_PATTERNS.some(
    pattern => pattern.test(prompt)
  )

  if (hasMultiComponentPattern) {
    return true
  }

  // Check for length - longer prompts often describe complex UIs
  if (prompt.length > 100) {
    return true
  }

  // Default to direct translation for simple prompts
  return false
}

// =============================================================================
// Translation Adapter
// =============================================================================

/**
 * Build a context-aware prompt by analyzing the cursor position in existing code.
 * This helps the LLM understand WHERE the new code should fit.
 */
function buildContextAwarePrompt(
  prompt: string,
  context: string[],
  lineIndex: number
): string {
  // Join context lines into full code
  const fullCode = context.join('\n')

  // Use MirrorCodeIntelligence to analyze the code structure
  const intelligence = new MirrorCodeIntelligence(fullCode)
  const cursorContext = intelligence.analyzeCursorContext(lineIndex, 0)

  const parts: string[] = []

  // Add cursor position context
  if (cursorContext.parent) {
    parts.push(`## INSERTION CONTEXT`)
    parts.push(`You are adding content INSIDE a "${cursorContext.parent.name}" component.`)
    if (cursorContext.parent.properties.length > 0) {
      parts.push(`Parent has properties: ${cursorContext.parent.properties.join(', ')}`)
    }
    parts.push(`Indentation level: ${cursorContext.indent} spaces`)
    parts.push('')
  }

  // Show surrounding code for context
  const { linesBefore, linesAfter, currentLine } = cursorContext.surroundings
  if (linesBefore.length > 0 || linesAfter.length > 0) {
    parts.push(`## SURROUNDING CODE`)
    parts.push('```')
    // Show last 5 lines before cursor
    const recentBefore = linesBefore.slice(-5)
    if (recentBefore.length > 0) {
      parts.push(recentBefore.join('\n'))
    }
    // Mark cursor position
    parts.push(`>>> ${currentLine || '[CURSOR - INSERT HERE]'} <<<`)
    // Show next 3 lines after cursor
    const nextAfter = linesAfter.slice(0, 3)
    if (nextAfter.length > 0) {
      parts.push(nextAfter.join('\n'))
    }
    parts.push('```')
    parts.push('')
  }

  // Add the original prompt
  parts.push(`## REQUEST`)
  parts.push(prompt)

  return parts.join('\n')
}

/**
 * Translate using the React-Pivot pipeline.
 * This function matches the signature of translateLine from nl-translation.ts.
 */
export async function translateWithReactPivot(
  lineContent: string,
  context: string[],
  lineIndex: number,
  callbacks: TranslationCallbacks = {},
  tokensCode?: string,
  qualityMode?: QualityModeOptions
): Promise<TranslationResult> {
  const startTime = performance.now()
  let firstTokenTime: number | null = null

  // Build context-aware prompt if we have surrounding code
  const hasContext = context.length > 0 && context.some(line => line.trim().length > 0)
  const contextAwarePrompt = hasContext
    ? buildContextAwarePrompt(lineContent, context, lineIndex)
    : lineContent

  // Build React-Pivot options from the translation parameters
  const options: ReactPivotOptions = {
    qualityMode: qualityMode?.enabled ?? false,
    tokensCode,
    streaming: true,
    debug: false,
    callbacks: {
      onStart: () => {
        // Called when pipeline starts
      },
      onToken: (token: string) => {
        if (firstTokenTime === null) {
          firstTokenTime = performance.now() - startTime
          callbacks.onFirstToken?.(firstTokenTime)
        }
        // For React-Pivot, we don't stream intermediate tokens
        // since we need to transform the full React code
      },
      onPhaseComplete: (phase, result) => {
        // Could emit progress updates here
      },
      onComplete: (result) => {
        // Handled below
      },
      onError: (error) => {
        callbacks.onError?.(error)
      },
    },
  }

  try {
    // Use context-aware prompt for the pipeline
    const result = await executePipeline(contextAwarePrompt, options)

    const totalTime = performance.now() - startTime

    if (!result.success) {
      const error = new Error(
        result.issues?.[0]?.message ?? 'React-Pivot transformation failed'
      )
      callbacks.onError?.(error)

      return {
        code: lineContent, // Return original on failure
        error: error.message,
        timeToFirstToken: firstTokenTime ?? totalTime,
        totalTime,
      }
    }

    // Call onToken with the final result for UI update
    callbacks.onToken?.(result.mirrorCode, result.mirrorCode)

    const translationResult: TranslationResult = {
      code: result.mirrorCode,
      timeToFirstToken: result.metrics.timeToFirstToken,
      totalTime: result.metrics.totalTime,
      // Include any validation issues
      validationIssues: result.issues?.map(issue => ({
        type: issue.fixable ? 'validation_warning' : 'validation_error' as const,
        message: issue.message,
        line: issue.line ?? 0,
        suggestion: issue.suggestion,
      })),
      isValid: !result.issues || result.issues.every(i => i.fixable),
    }

    callbacks.onComplete?.(translationResult)

    return translationResult

  } catch (error) {
    const totalTime = performance.now() - startTime
    const err = error instanceof Error ? error : new Error(String(error))

    callbacks.onError?.(err)

    return {
      code: lineContent,
      error: err.message,
      timeToFirstToken: firstTokenTime ?? totalTime,
      totalTime,
    }
  }
}

/**
 * Smart translation that chooses between direct and React-Pivot approaches.
 *
 * This function can be used as a drop-in replacement for translateLine,
 * automatically choosing the best approach based on prompt complexity.
 */
export async function translateSmart(
  lineContent: string,
  context: string[],
  lineIndex: number,
  callbacks: TranslationCallbacks = {},
  tokensCode?: string,
  qualityMode?: QualityModeOptions
): Promise<TranslationResult> {
  // Decide which approach to use
  const useReactPivot = shouldUseReactPivot(lineContent)

  if (useReactPivot) {
    // Use React-Pivot for complex prompts
    return translateWithReactPivot(
      lineContent,
      context,
      lineIndex,
      callbacks,
      tokensCode,
      qualityMode
    )
  }

  // Fall back to direct translation for simple prompts
  // Import dynamically to avoid circular dependency
  const { translateLine } = await import('../../../services/nl-translation')
  return translateLine(
    lineContent,
    context,
    lineIndex,
    callbacks,
    tokensCode,
    qualityMode
  )
}

// =============================================================================
// Export
// =============================================================================

export default translateWithReactPivot
