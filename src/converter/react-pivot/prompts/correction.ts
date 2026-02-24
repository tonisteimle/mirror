/**
 * @module converter/react-pivot/prompts/correction
 * @description Correction prompt for retry attempts when initial generation has errors
 */

/**
 * Categories of errors that can occur in React generation
 */
export type ErrorCategory =
  | 'hardcoded-color'
  | 'invalid-component'
  | 'className-usage'
  | 'hook-usage'
  | 'spread-operator'
  | 'unsupported-property'
  | 'invalid-token-format'
  | 'syntax-error'

/**
 * Error details for correction prompt
 */
export interface CorrectionError {
  category: ErrorCategory
  message: string
  line?: number
  suggestion?: string
}

/**
 * Generates a correction prompt based on the errors found
 */
export function generateCorrectionPrompt(
  originalPrompt: string,
  failedCode: string,
  errors: CorrectionError[]
): string {
  const errorSummary = errors.map(e => formatError(e)).join('\n')
  const suggestions = errors
    .filter(e => e.suggestion)
    .map(e => `- ${e.suggestion}`)
    .join('\n')

  return `## CORRECTION REQUIRED

Your previous output had ${errors.length} error(s) that prevent transformation to Mirror DSL.

### ERRORS FOUND:
${errorSummary}

### FAILED CODE:
\`\`\`jsx
${failedCode}
\`\`\`

${suggestions ? `### SPECIFIC FIXES NEEDED:\n${suggestions}\n` : ''}

### CORRECTION RULES:
${getCorrectRulesForErrors(errors)}

### ORIGINAL REQUEST:
${originalPrompt}

Please generate CORRECTED React/JSX code that fixes ALL the errors above.
Remember: NO hardcoded colors, NO className, NO div/span, ONLY allowed components.
Output ONLY the corrected code.`
}

/**
 * Format a single error for display
 */
function formatError(error: CorrectionError): string {
  const location = error.line ? ` (line ${error.line})` : ''
  return `- **${getCategoryLabel(error.category)}**${location}: ${error.message}`
}

/**
 * Get human-readable label for error category
 */
function getCategoryLabel(category: ErrorCategory): string {
  switch (category) {
    case 'hardcoded-color':
      return 'Hardcoded Color'
    case 'invalid-component':
      return 'Invalid Component'
    case 'className-usage':
      return 'className Usage'
    case 'hook-usage':
      return 'Hook Usage'
    case 'spread-operator':
      return 'Spread Operator'
    case 'unsupported-property':
      return 'Unsupported Property'
    case 'invalid-token-format':
      return 'Invalid Token Format'
    case 'syntax-error':
      return 'Syntax Error'
    default:
      return 'Error'
  }
}

/**
 * Get relevant correction rules based on error categories
 */
function getCorrectRulesForErrors(errors: CorrectionError[]): string {
  const categories = new Set(errors.map(e => e.category))
  const rules: string[] = []

  if (categories.has('hardcoded-color')) {
    rules.push(`
**COLORS - Use ONLY tokens:**
- ❌ #3B82F6, white, black, rgba(...)
- ✅ $primary.bg, $surface.bg, $default.col, $muted.col`)
  }

  if (categories.has('invalid-component')) {
    rules.push(`
**COMPONENTS - Use ONLY allowed:**
- ❌ div, span, button, input, a
- ✅ Box, Row, Col, Text, Button, Input, Link`)
  }

  if (categories.has('className-usage')) {
    rules.push(`
**STYLING - Use ONLY style={{}}:**
- ❌ className="..."
- ✅ style={{ padding: '$md.pad', background: '$surface.bg' }}`)
  }

  if (categories.has('hook-usage')) {
    rules.push(`
**NO HOOKS:**
- ❌ useState, useEffect, useCallback, useMemo
- ✅ Use mirror() for component definitions, actions for interactivity`)
  }

  if (categories.has('spread-operator')) {
    rules.push(`
**NO SPREAD:**
- ❌ {...props}, {...style}
- ✅ Write out all properties explicitly`)
  }

  if (categories.has('invalid-token-format')) {
    rules.push(`
**TOKEN FORMAT:**
- ❌ $primary, $md, primary.bg
- ✅ $primary.bg, $md.pad, $lg.gap (always $name.property)`)
  }

  return rules.length > 0 ? rules.join('\n') : '- Fix all errors listed above'
}

/**
 * Quick correction prompt for common color-only errors
 */
export function generateColorCorrectionPrompt(
  failedCode: string,
  colorMatches: string[]
): string {
  return `## COLOR FIX REQUIRED

Your code contains hardcoded colors that must be replaced with tokens:
${colorMatches.map(c => `- "${c}" → use appropriate token like $primary.bg or $surface.bg`).join('\n')}

Current code:
\`\`\`jsx
${failedCode}
\`\`\`

Replace ALL hardcoded colors with semantic tokens and output the corrected code.
NO hardcoded hex (#xxx), NO color names (white, black), NO rgba().
ONLY use $name.property tokens like $primary.bg, $surface.bg, $default.col.`
}

export default generateCorrectionPrompt
