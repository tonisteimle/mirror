/**
 * @module converter/react-pivot/validation/healing
 * @description Self-healing strategies for React code validation issues
 *
 * Applies automatic corrections to fixable issues in the generated React code.
 */

import type {
  ValidationIssue,
  HealingStrategy,
  HealingResult,
  ValidationIssueType,
} from '../types'
import { ALLOWED_COMPONENTS } from '../spec'

// =============================================================================
// Healing Strategies
// =============================================================================

const strategies: HealingStrategy[] = [
  // Strategy: Replace unknown components with closest match
  {
    handles: ['INVALID_COMPONENT'],
    apply: (code: string, issue: ValidationIssue): string | null => {
      if (!issue.code) return null

      const componentName = issue.code.replace('<', '')
      const suggestion = extractSuggestion(issue.suggestion)

      if (!suggestion) return null

      // Replace opening tags
      const openTagRegex = new RegExp(`<${componentName}(?=[\\s>/])`, 'g')
      let result = code.replace(openTagRegex, `<${suggestion}`)

      // Replace closing tags
      const closeTagRegex = new RegExp(`</${componentName}>`, 'g')
      result = result.replace(closeTagRegex, `</${suggestion}>`)

      return result
    },
  },

  // Strategy: Remove spread operators
  {
    handles: ['SPREAD_OPERATOR'],
    apply: (code: string, issue: ValidationIssue): string | null => {
      if (!issue.code) return null
      return code.replace(issue.code, '')
    },
  },

  // Strategy: Convert unsupported properties to supported ones
  {
    handles: ['UNSUPPORTED_PROP'],
    apply: (code: string, issue: ValidationIssue): string | null => {
      if (!issue.code || !issue.suggestion) return null

      // Only handle simple property removals for now
      if (issue.suggestion.includes('remove')) {
        // Remove the property and its value
        const propName = issue.code.replace(':', '')
        // Match: propName: value, or propName: value } or propName: 'value'
        const propRegex = new RegExp(
          `${propName}\\s*:\\s*(?:'[^']*'|"[^"]*"|[^,}]+)\\s*,?`,
          'g'
        )
        return code.replace(propRegex, '')
      }

      return null
    },
  },
]

// =============================================================================
// Main Healing Function
// =============================================================================

export function healReactCode(code: string, issues: ValidationIssue[]): HealingResult {
  let healedCode = code
  const remainingIssues: ValidationIssue[] = []

  // Sort issues by position (reverse order) to avoid offset issues when modifying
  const sortedIssues = [...issues].sort((a, b) => {
    const posA = a.line ?? Infinity
    const posB = b.line ?? Infinity
    return posB - posA
  })

  for (const issue of sortedIssues) {
    if (!issue.fixable) {
      remainingIssues.push(issue)
      continue
    }

    // Find a strategy that can handle this issue
    const strategy = strategies.find(s => s.handles.includes(issue.type))

    if (!strategy) {
      remainingIssues.push(issue)
      continue
    }

    // Try to apply the healing
    const healed = strategy.apply(healedCode, issue)

    if (healed !== null) {
      healedCode = healed
    } else {
      remainingIssues.push(issue)
    }
  }

  return {
    success: remainingIssues.length === 0,
    code: healedCode !== code ? healedCode : undefined,
    remainingIssues,
  }
}

// =============================================================================
// Correction Prompt Generation
// =============================================================================

/**
 * Generate a correction prompt for issues that can't be auto-healed.
 * This will be sent back to the LLM for a retry.
 */
export function generateCorrectionPrompt(
  originalPrompt: string,
  failedCode: string,
  issues: ValidationIssue[]
): string {
  const issueList = issues
    .map(issue => {
      let line = `- ${issue.message}`
      if (issue.code) {
        line += ` (found: \`${issue.code}\`)`
      }
      if (issue.suggestion) {
        line += ` → ${issue.suggestion}`
      }
      return line
    })
    .join('\n')

  return `Your previous React code had validation issues. Please fix them and regenerate.

## Issues Found:
${issueList}

## Previous Code (with problems):
\`\`\`jsx
${failedCode}
\`\`\`

## Requirements Reminder:
1. Use ONLY allowed components: ${ALLOWED_COMPONENTS.slice(0, 10).join(', ')}, ...
2. Use $tokens for ALL colors (e.g., $primary.bg, $surface.bg) - NO hardcoded hex colors
3. Use style={{}} for styling - NOT className
4. Use semantic components (Card, Panel, Button) - NOT div/span
5. NO React hooks (useState, useEffect, etc.)
6. NO spread operators ({...props})

## Original Request:
${originalPrompt}

Please output ONLY the corrected React/JSX code.`
}

// =============================================================================
// Helpers
// =============================================================================

function extractSuggestion(suggestion: string | undefined): string | null {
  if (!suggestion) return null

  // Match: Use "ComponentName" instead
  const match = suggestion.match(/Use "(\w+)"/)
  return match?.[1] ?? null
}

// =============================================================================
// Export
// =============================================================================

export default healReactCode
