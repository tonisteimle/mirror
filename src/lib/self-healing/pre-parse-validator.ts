/**
 * Pre-Parse Validator
 *
 * Validates Mirror code BEFORE the parser normalizes it.
 * This catches semantic errors that the parser would silently fix.
 *
 * The parser does smart normalization like:
 * - Icon size 20 → icon-size 20
 * - Text size 14 → font-size 14
 *
 * But we want to catch these for LLM feedback, so they learn correct syntax.
 */

import type { CodeIssue } from './types'

// =============================================================================
// Component-Property Rules
// =============================================================================

interface ComponentRule {
  /** Regex to match component name (e.g., /^Icon$/i) */
  componentPattern: RegExp
  /** Forbidden property patterns with suggestions */
  forbidden: Array<{
    pattern: RegExp
    property: string
    replacement: string
    message: string
  }>
}

const COMPONENT_RULES: ComponentRule[] = [
  {
    componentPattern: /^Icon$/i,
    forbidden: [
      {
        // Match 'size' but NOT 'icon-size' (negative lookbehind)
        pattern: /(?<!icon-)(?<!font-)\bsize\s+(\d+)/,
        property: 'size',
        replacement: 'icon-size',
        message: 'Für Icons verwende "icon-size" statt "size"',
      },
      {
        pattern: /\bfont-size\s+(\d+)/,
        property: 'font-size',
        replacement: 'icon-size',
        message: 'Für Icons verwende "icon-size" statt "font-size"',
      },
      {
        // Match 'weight' but NOT 'icon-weight' or 'font-weight'
        pattern: /(?<!icon-)(?<!font-)\bweight\s+(\d+)/,
        property: 'weight',
        replacement: 'icon-weight',
        message: 'Für Icons verwende "icon-weight" statt "weight"',
      },
      {
        pattern: /\bfont-weight\s+(\d+)/,
        property: 'font-weight',
        replacement: 'icon-weight',
        message: 'Für Icons verwende "icon-weight" statt "font-weight"',
      },
    ],
  },
  {
    componentPattern: /^Text$|^Label$|^Title$|^Heading$/i,
    forbidden: [
      {
        pattern: /\bicon-size\s+(\d+)/,
        property: 'icon-size',
        replacement: 'font-size',
        message: 'Text verwendet "font-size", nicht "icon-size"',
      },
      {
        pattern: /\bicon-color\s+(#[\da-fA-F]+|\$\S+)/,
        property: 'icon-color',
        replacement: 'color',
        message: 'Text verwendet "color", nicht "icon-color"',
      },
    ],
  },
]

// =============================================================================
// Pre-Parse Validation
// =============================================================================

/**
 * Validate code before parsing to catch semantic errors that parser would normalize.
 */
export function preParsValidate(code: string): CodeIssue[] {
  const issues: CodeIssue[] = []
  const lines = code.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Find component name at start of line (with optional indentation)
    const componentMatch = trimmed.match(/^([A-Z][a-zA-Z0-9-]*)(?:\s|:|$)/)
    if (!componentMatch) continue

    const componentName = componentMatch[1]

    // Check against rules
    for (const rule of COMPONENT_RULES) {
      if (!rule.componentPattern.test(componentName)) continue

      // Check forbidden properties
      for (const forbidden of rule.forbidden) {
        const match = trimmed.match(forbidden.pattern)
        if (match) {
          issues.push({
            type: 'schema_error',
            line: lineNum + 1,
            message: forbidden.message,
            suggestion: `Verwende "${forbidden.replacement}"`,
            autoFix: {
              replacement: forbidden.replacement,
              description: `Ersetze "${forbidden.property}" mit "${forbidden.replacement}"`,
            },
          })
        }
      }
    }
  }

  return issues
}

/**
 * Check if a line contains a forbidden property for its component
 */
export function hasForbiddenProperty(line: string): boolean {
  const issues = preParsValidate(line)
  return issues.length > 0
}
