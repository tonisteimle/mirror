/**
 * AI Self-Healing Module
 *
 * Validates LLM-generated Mirror code and automatically
 * re-prompts for corrections if errors are found.
 */

import { parse } from '../parser/parser'
import { validateCode } from '../validator'
import type { ParseIssue } from '../parser/types'

// =============================================================================
// Types
// =============================================================================

export interface ValidationFeedback {
  valid: boolean
  issues: CodeIssue[]
  correctionPrompt?: string
}

export interface CodeIssue {
  type: 'parse_error' | 'parse_issue' | 'validation_error' | 'validation_warning'
  line: number
  message: string
  suggestion?: string
}

export type PromptLanguage = 'de' | 'en'

export interface SelfHealingOptions {
  /** Maximum correction attempts (default: 2) */
  maxAttempts?: number
  /** Include warnings in feedback (default: false) */
  includeWarnings?: boolean
  /** Custom correction prompt prefix */
  correctionPrefix?: string
  /** Language for correction prompts (default: 'de') */
  language?: PromptLanguage
}

export interface SelfHealingResult {
  code: string
  valid: boolean
  attempts: number
  issues: CodeIssue[]
}

// =============================================================================
// Validation & Feedback
// =============================================================================

/**
 * Extract line number from error message if present.
 * Patterns: "Line 5:", "line 5:", "Zeile 5:"
 */
function extractLineFromError(error: string): number {
  const match = error.match(/(?:Line|line|Zeile)\s+(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

/**
 * Validate Mirror code and generate structured feedback.
 */
export function validateMirrorCode(
  code: string,
  includeWarnings = false,
  language: PromptLanguage = 'de'
): ValidationFeedback {
  const issues: CodeIssue[] = []

  // Parse the code
  const parseResult = parse(code)

  // Collect parse errors with proper line extraction
  parseResult.errors.forEach((error) => {
    const errorStr = typeof error === 'string' ? error : String(error)
    issues.push({
      type: 'parse_error',
      line: extractLineFromError(errorStr),
      message: errorStr
    })
  })

  // Collect parse issues (lexer-level typos)
  parseResult.parseIssues.forEach((issue: ParseIssue) => {
    issues.push({
      type: 'parse_issue',
      line: issue.line + 1,
      message: issue.message,
      suggestion: issue.suggestion
    })
  })

  // Run full validation
  const validation = validateCode(parseResult, code)

  // Collect validation errors
  validation.errors.forEach(error => {
    issues.push({
      type: 'validation_error',
      line: error.location.line + 1,
      message: error.message,
      suggestion: error.suggestions?.[0]?.label
    })
  })

  // Optionally collect warnings
  if (includeWarnings) {
    validation.warnings.forEach(warning => {
      issues.push({
        type: 'validation_warning',
        line: warning.location.line + 1,
        message: warning.message,
        suggestion: warning.suggestions?.[0]?.label
      })
    })
  }

  // Deduplicate issues (same line + message)
  const seen = new Set<string>()
  const uniqueIssues = issues.filter(i => {
    const key = `${i.line}:${i.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by line number
  uniqueIssues.sort((a, b) => a.line - b.line)

  const valid = uniqueIssues.filter(i => i.type !== 'validation_warning').length === 0

  return {
    valid,
    issues: uniqueIssues,
    correctionPrompt: valid ? undefined : generateCorrectionPrompt(code, uniqueIssues, language)
  }
}

// =============================================================================
// Correction Prompt Templates
// =============================================================================

const PROMPT_TEMPLATES = {
  de: {
    intro: 'Der folgende Mirror Code enthält Fehler. Bitte korrigiere sie:',
    errorsHeader: 'FEHLER:',
    linePrefix: 'Zeile',
    codeHeader: 'ORIGINAL CODE:',
    instruction: 'Gib NUR den korrigierten Mirror Code zurück, keine Erklärungen.',
    tokenHint: 'WICHTIG: Tokens müssen IMMER mit $ beginnen - beim Definieren UND Verwenden!\nFalsch: primary: #3B82F6 ... bg primary\nRichtig: $primary: #3B82F6 ... bg $primary'
  },
  en: {
    intro: 'The following Mirror code contains errors. Please fix them:',
    errorsHeader: 'ERRORS:',
    linePrefix: 'Line',
    codeHeader: 'ORIGINAL CODE:',
    instruction: 'Return ONLY the corrected Mirror code, no explanations.',
    tokenHint: 'IMPORTANT: Tokens must ALWAYS start with $ - both when defining AND using!\nWrong: primary: #3B82F6 ... bg primary\nCorrect: $primary: #3B82F6 ... bg $primary'
  }
}

/**
 * Generate a correction prompt for the LLM based on validation issues.
 */
function generateCorrectionPrompt(
  originalCode: string,
  issues: CodeIssue[],
  language: PromptLanguage = 'de'
): string {
  const t = PROMPT_TEMPLATES[language]

  const issueList = issues
    .filter(i => i.type !== 'validation_warning')
    .map(i => {
      let line = `- ${t.linePrefix} ${i.line}: ${i.message}`
      if (i.suggestion) {
        line += ` → ${i.suggestion}`
      }
      return line
    })
    .join('\n')

  // Check if any errors look like token issues (unexpected token that's not a keyword)
  const hasTokenError = issues.some(i =>
    i.message.includes('Unexpected token') &&
    !i.message.includes('"$')
  )
  const tokenHintSection = hasTokenError ? `\n\n${t.tokenHint}` : ''

  return `${t.intro}

${t.errorsHeader}
${issueList}${tokenHintSection}

${t.codeHeader}
\`\`\`
${originalCode}
\`\`\`

${t.instruction}`
}

// =============================================================================
// Self-Healing Integration
// =============================================================================

/**
 * Wrapper for LLM generation with automatic self-healing.
 *
 * @param generateFn - The LLM generation function
 * @param prompt - User prompt
 * @param options - Self-healing options
 * @returns Validated (and potentially corrected) code
 *
 * @example
 * ```typescript
 * import { generateMirrorCode } from './ai'
 * import { withSelfHealing } from './ai-selfhealing'
 *
 * const result = await withSelfHealing(
 *   generateMirrorCode,
 *   "Create a login form",
 *   { maxAttempts: 2 }
 * )
 *
 * if (result.valid) {
 *   console.log("Valid code generated:", result.code)
 * } else {
 *   console.log("Could not generate valid code after", result.attempts, "attempts")
 *   console.log("Issues:", result.issues)
 * }
 * ```
 */
export async function withSelfHealing(
  generateFn: (prompt: string) => Promise<{ code: string }>,
  prompt: string,
  options: SelfHealingOptions = {}
): Promise<SelfHealingResult> {
  const {
    maxAttempts = 2,
    includeWarnings = false,
    correctionPrefix = '',
    language = 'de'
  } = options

  let currentCode = ''
  let attempts = 0
  let lastFeedback: ValidationFeedback = { valid: false, issues: [] }

  // Initial generation
  try {
    const result = await generateFn(prompt)
    currentCode = result.code
    attempts = 1

    // Algorithmic fixes (deterministic, before validation)
    currentCode = applyAllFixes(currentCode)

    // Validate
    lastFeedback = validateMirrorCode(currentCode, includeWarnings, language)

    // If valid, return immediately
    if (lastFeedback.valid) {
      return {
        code: currentCode,
        valid: true,
        attempts,
        issues: lastFeedback.issues
      }
    }

    // Self-healing loop
    while (!lastFeedback.valid && attempts < maxAttempts) {
      const correctionPrompt = correctionPrefix
        ? `${correctionPrefix}\n\n${lastFeedback.correctionPrompt}`
        : lastFeedback.correctionPrompt!

      const correctionResult = await generateFn(correctionPrompt)
      currentCode = correctionResult.code
      attempts++

      // Apply all algorithmic fixes to correction as well
      currentCode = applyAllFixes(currentCode)

      lastFeedback = validateMirrorCode(currentCode, includeWarnings, language)

      if (lastFeedback.valid) {
        return {
          code: currentCode,
          valid: true,
          attempts,
          issues: lastFeedback.issues
        }
      }
    }
  } catch (error) {
    // Generation failed
    return {
      code: currentCode,
      valid: false,
      attempts,
      issues: [{
        type: 'parse_error',
        line: 0,
        message: error instanceof Error ? error.message : String(error)
      }]
    }
  }

  // Return last attempt even if not valid
  return {
    code: currentCode,
    valid: false,
    attempts,
    issues: lastFeedback.issues
  }
}

// =============================================================================
// Algorithmic Token Fixer
// =============================================================================

// Known DSL property names that should never be prefixed with $
const DSL_PROPERTIES = new Set([
  // Layout - long and short forms
  'horizontal', 'hor', 'vertical', 'ver', 'gap', 'between', 'wrap', 'grid', 'stacked', 'grow', 'shrink', 'fill',
  // Alignment
  'horizontal-left', 'horizontal-center', 'horizontal-right',
  'vertical-top', 'vertical-center', 'vertical-bottom',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b', 'cen', 'center',
  // Spacing - long and short forms
  'padding', 'pad', 'p', 'margin', 'mar', 'm',
  'left', 'right', 'top', 'bottom', 'l', 'r', 'u', 'd', 'l-r', 'u-d',
  'left-right', 'top-bottom',
  // Size - long and short forms
  'width', 'height', 'w', 'h',
  'min-width', 'max-width', 'min-height', 'max-height',
  'minw', 'maxw', 'minh', 'maxh', 'full',
  // Color - long and short forms
  'color', 'col', 'c', 'background', 'bg', 'border-color', 'boc',
  // Border - long and short forms
  'border', 'bor', 'radius', 'rad',
  // Typography
  'size', 'weight', 'line', 'font', 'align', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
  // Visual
  'opacity', 'opa', 'o', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled', 'rotate', 'translate',
  // Hover - long and short forms
  'hover-background', 'hover-color', 'hover-border-color', 'hover-border', 'hover-radius', 'hover-opacity', 'hover-scale',
  'hover-bg', 'hover-col', 'hover-boc', 'hover-rad',
  // Scroll
  'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'snap', 'clip', 'scroll-vertical', 'scroll-horizontal',
  // Other
  'icon', 'type', 'placeholder', 'src', 'fit', 'rows', 'named', 'from', 'as', 'shortcut',
  // Events
  'onclick', 'onchange', 'oninput', 'onfocus', 'onblur', 'onhover', 'onkeydown', 'onkeyup', 'onload',
  'onclick-outside', 'debounce', 'delay',
  // Actions
  'toggle', 'show', 'hide', 'open', 'close', 'page', 'assign', 'alert', 'highlight', 'select', 'deselect',
  'clear-selection', 'filter', 'focus', 'activate', 'deactivate', 'deactivate-siblings', 'toggle-state',
  'validate', 'reset', 'change',
  // Targets
  'self', 'next', 'prev', 'first', 'last', 'highlighted', 'selected', 'all', 'none',
  // State
  'state', 'if', 'then', 'else', 'each', 'in', 'to', 'and', 'or', 'not', 'data', 'where',
  // Animations
  'animate', 'fade', 'scale', 'spin', 'pulse', 'bounce', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  // Positions
  'below', 'above',
])

/**
 * Fix missing $ prefix on token references.
 *
 * Common LLM error: defines $primary but uses "bg primary" instead of "bg $primary"
 */
export function fixMissingTokenPrefix(code: string): string {
  // 1. Find all token definitions: $name: value
  const tokenDefPattern = /^\$([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/gm
  const definedTokens = new Set<string>()

  let match
  while ((match = tokenDefPattern.exec(code)) !== null) {
    const tokenName = match[1]
    // Don't add if it's a DSL property name (user shouldn't define tokens with these names anyway)
    if (!DSL_PROPERTIES.has(tokenName)) {
      definedTokens.add(tokenName)
    }
  }

  if (definedTokens.size === 0) return code

  // 2. Replace token references that are missing $
  let result = code
  for (const token of definedTokens) {
    // Only replace if:
    // - Not already prefixed with $
    // - Not followed by : (that's a definition)
    // - Not followed by - (that's part of a compound name like hover-background)
    // - The word is the token name exactly
    const usePattern = new RegExp(
      `(?<!\\$|[a-zA-Z0-9_-])\\b(${token})\\b(?![-a-zA-Z0-9_]|\\s*:)`,
      'g'
    )
    result = result.replace(usePattern, (match, tokenName, offset) => {
      // Don't replace if inside a string
      const before = result.substring(Math.max(0, offset - 50), offset)
      const quoteCount = (before.match(/"/g) || []).length
      if (quoteCount % 2 === 1) return match

      // Don't replace if after 'state' keyword (it's a state name, not a token)
      if (/\bstate\s+$/.test(before)) return match

      return `$${tokenName}`
    })
  }

  return result
}

/**
 * Fix text content on separate line.
 *
 * LLM error:
 *   Button bg #F00
 *     "Click me"
 *
 * Should be:
 *   Button bg #F00 "Click me"
 */
export function fixTextOnSeparateLine(code: string): string {
  // Pattern: line ending without string, followed by indented line with only a string
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    // Check if next line is just an indented string
    if (nextLine && /^\s+".+"$/.test(nextLine) && !line.includes('"')) {
      // Check indentation: next line should be more indented
      const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0

      if (nextIndent > currentIndent) {
        // Merge the string onto this line
        const stringContent = nextLine.trim()
        result.push(line + ' ' + stringContent)
        i++ // Skip the next line
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix dash prefix on single elements (should only be used for list items).
 *
 * LLM error:
 *   - Button "Click"
 *
 * Should be:
 *   Button "Click"
 */
export function fixSingleDashElement(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if line starts with "- " at root level (no indentation)
    if (/^-\s+\w/.test(line)) {
      // Check if there are other dash items nearby (it's a real list)
      const prevLine = lines[i - 1] || ''
      const nextLine = lines[i + 1] || ''
      const hasSiblingDash = /^-\s/.test(prevLine) || /^-\s/.test(nextLine)

      if (!hasSiblingDash) {
        // Remove the dash prefix
        result.push(line.replace(/^-\s+/, ''))
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix semicolon-chained actions.
 *
 * LLM error:
 *   Button onclick show A; hide B
 *
 * Should be converted to events block.
 * Note: This is complex - for now we just warn, don't auto-fix.
 */
export function hasSemicolonChaining(code: string): boolean {
  // Check for pattern: event action; action
  return /on\w+\s+\w+[^;\n]*;\s*\w+/.test(code)
}

/**
 * Fix token names used as property names.
 *
 * LLM error patterns:
 *   state focus
 *     $border-color $primary    // Token used as property name
 *   Box radius 8 $border 1 #333   // $border instead of border
 *
 * Should be:
 *   state focus
 *     border-color $primary     // Property name, then token value
 *   Box radius 8 border 1 #333
 */
export function fixTokenAsProperty(code: string): string {
  // Known property names that might be prefixed with $ by mistake
  const knownProperties = [
    'border-color', 'boc', 'background', 'bg', 'color', 'col',
    'border', 'bor', 'padding', 'pad', 'margin', 'mar',
    'radius', 'rad', 'width', 'w', 'height', 'h',
    'opacity', 'opa', 'gap', 'size', 'weight'
  ]

  let result = code

  // Fix $property when followed by a value that clearly indicates property usage:
  // - number (e.g., $border 1)
  // - #color (e.g., $background #333)
  // - $token (e.g., $border-color $primary)
  // But NOT when followed by a word (which could be a different property)
  for (const prop of knownProperties) {
    // Match $prop followed by space and a number, # or $
    // This avoids false positives like "$border type" where $border is a token value
    const pattern = new RegExp(`\\$${prop}(\\s+)(\\d|#[0-9a-fA-F]|\\$)`, 'g')
    result = result.replace(pattern, `${prop}$1$2`)
  }

  return result
}

/**
 * Fix multiple token definitions on same line.
 *
 * LLM error:
 *   $bg: #1E1E2E $text: #FFFFFF $accent: #3B82F6
 *
 * Should be:
 *   $bg: #1E1E2E
 *   $text: #FFFFFF
 *   $accent: #3B82F6
 */
export function fixTokensOnSameLine(code: string): string {
  // Process line by line
  return code.split('\n').map(line => {
    // Only process lines that have multiple token definitions
    // Pattern: $name: value (followed by space and another $name:)
    if (!/ \$[a-zA-Z_][a-zA-Z0-9_-]*:/.test(line)) return line

    // Split on ` $` but keep the $ with the following token
    const parts = line.split(/(?= \$[a-zA-Z_][a-zA-Z0-9_-]*:)/)
    return parts.map(p => p.trim()).filter(Boolean).join('\n')
  }).join('\n')
}

/**
 * Fix component definition and usage on same line.
 *
 * LLM error:
 *   Card: background #1E1E1E Card color white "Hello World"
 *
 * The LLM wants ONE Card with both properties. Merge into single usage:
 *   Card background #1E1E1E color white "Hello World"
 *
 * Note: Only handles SAME component names. Different components are left
 * for the LLM self-healing loop to fix (too ambiguous to auto-correct).
 */
export function fixDefinitionAndUsageOnSameLine(code: string): string {
  // Pattern: ComponentName: props ComponentName props "text"
  // The second component must be preceded by whitespace (not part of a hex color)
  // and must be at least 2 chars (to avoid matching single letters in hex colors)
  return code.replace(
    /^(\s*)([A-Z][a-zA-Z]+):\s*((?:[a-z][a-zA-Z-]*\s+[^\s]+\s*)+)\s([A-Z][a-zA-Z]+)\s+(.+)$/gm,
    (match, indent, defName, defProps, useName, useRest) => {
      if (defName === useName) {
        // Same component: merge into single usage
        return `${indent}${defName} ${defProps.trim()} ${useRest.trim()}`
      }
      // Different components: leave unchanged for LLM self-healing
      return match
    }
  )
}

/**
 * Fix dimension shorthand in component definitions.
 *
 * LLM error:
 *   Box: 300 100 radius 12
 *   Avatar: 80 80 radius 40
 *   IconBtn: 48 48 radius 24
 *
 * Should be:
 *   Box: width 300 height 100 radius 12
 *   Avatar: width 80 height 80 radius 40
 *   IconBtn: width 48 height 48 radius 24
 *
 * Dimension shorthand (numbers as first arguments) works for component
 * USAGE but not for DEFINITIONS (with colon). This fix expands the
 * shorthand to explicit width/height properties.
 */
export function fixDimensionShorthandInDefinition(code: string): string {
  // Pattern: ComponentName: NUMBER [NUMBER] rest...
  // Captures: indent, name, first number, optional second number, rest of line
  return code.replace(
    /^(\s*)([A-Z][a-zA-Z0-9]*:\s+)(\d+(?:\.\d+)?(?:%)?)\s+(\d+(?:\.\d+)?(?:%)?)\s+(.*)$/gm,
    (match, indent, namePart, num1, num2, rest) => {
      // Check if rest starts with a property keyword (not another number)
      // If rest is empty or starts with a property, expand to width/height
      if (!rest || /^[a-z]/.test(rest)) {
        return `${indent}${namePart}width ${num1} height ${num2} ${rest}`.trimEnd()
      }
      return match
    }
  ).replace(
    // Also handle single dimension: ComponentName: NUMBER propertyName...
    /^(\s*)([A-Z][a-zA-Z0-9]*:\s+)(\d+(?:\.\d+)?(?:%)?)\s+([a-z][a-zA-Z-]*)(.*)$/gm,
    (match, indent, namePart, num, propName, rest) => {
      // Only expand if followed by a property name (not 'px' or similar unit)
      if (propName && !['px', 'em', 'rem', 'vh', 'vw'].includes(propName)) {
        return `${indent}${namePart}width ${num} ${propName}${rest}`
      }
      return match
    }
  )
}

/**
 * Fix duplicate element names by converting to list items.
 *
 * LLM error:
 *   Nav: horizontal gap 8
 *     NavLink "Home"
 *     NavLink "About"
 *     NavLink "Contact"
 *
 * Should be:
 *   Nav: horizontal gap 8
 *     - NavLink "Home"
 *     - NavLink "About"
 *     - NavLink "Contact"
 */
export function fixDuplicateElementNames(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  // Track element names at each indentation level
  const seenAtIndent = new Map<number, Map<string, number[]>>()

  // First pass: find duplicates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch?.[1].length ?? 0

    // Extract component name (starts with capital, not already a list item)
    const componentMatch = line.match(/^(\s*)([A-Z][a-zA-Z]*)(?:\s|$)/)
    if (componentMatch && !line.trim().startsWith('-')) {
      const componentName = componentMatch[2]

      if (!seenAtIndent.has(indent)) {
        seenAtIndent.set(indent, new Map())
      }
      const names = seenAtIndent.get(indent)!

      if (!names.has(componentName)) {
        names.set(componentName, [])
      }
      names.get(componentName)!.push(i)
    }
  }

  // Find which names have duplicates
  const duplicateLines = new Set<number>()
  for (const [, names] of seenAtIndent) {
    for (const [, lineNums] of names) {
      if (lineNums.length > 1) {
        // All instances of duplicates should be list items
        lineNums.forEach(n => duplicateLines.add(n))
      }
    }
  }

  // Second pass: add - prefix to duplicates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (duplicateLines.has(i) && !line.trim().startsWith('-')) {
      // Add - prefix after indentation
      const indentMatch = line.match(/^(\s*)(.*)$/)
      if (indentMatch) {
        result.push(`${indentMatch[1]}- ${indentMatch[2]}`)
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Remove px suffix from numeric values.
 *
 * LLM error:
 *   Box width 200px height 100px
 *
 * Should be:
 *   Box width 200 height 100
 *
 * Note: Preserves px inside strings (e.g., "16px wide")
 */
export function removePxSuffix(code: string): string {
  // Split into string and non-string parts to avoid modifying content inside quotes
  const parts: string[] = []
  let current = ''
  let inString = false

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    if (char === '"' && (i === 0 || code[i - 1] !== '\\')) {
      if (inString) {
        // End of string - push string part as-is
        parts.push(current + char)
        current = ''
        inString = false
      } else {
        // Start of string - push non-string part (will be processed)
        parts.push(current)
        current = char
        inString = true
      }
    } else {
      current += char
    }
  }
  parts.push(current)

  // Process non-string parts to remove px suffix
  return parts.map((part, i) => {
    // Odd indices are string content (between quotes)
    if (i % 2 === 1) return part
    // Remove px from numbers outside strings
    return part.replace(/(\d+)px(?=\s|$|")/g, '$1')
  }).join('')
}

/**
 * Remove colons after property names.
 *
 * LLM error (CSS-style):
 *   Box padding: 16 background: #1E1E1E
 *
 * Should be:
 *   Box padding 16 background #1E1E1E
 */
export function removePropertyColons(code: string): string {
  // Common properties that LLMs might add colons after
  const props = [
    'padding', 'pad', 'p',
    'margin', 'mar', 'm',
    'background', 'bg',
    'color', 'col', 'c',
    'border', 'bor',
    'border-color', 'boc',
    'radius', 'rad',
    'width', 'w',
    'height', 'h',
    'gap', 'g',
    'opacity', 'opa', 'o',
    'size', 'weight', 'font', 'line',
    'icon', 'src', 'fit', 'shadow',
    'min-width', 'max-width', 'min-height', 'max-height',
    'minw', 'maxw', 'minh', 'maxh'
  ]

  let result = code
  for (const prop of props) {
    // Match property followed by colon and optional whitespace, then a value
    // Don't match if it's a component definition (ComponentName:)
    const pattern = new RegExp(`(\\s)(${prop}):\\s*(?=\\S)`, 'gi')
    result = result.replace(pattern, '$1$2 ')
  }

  return result
}

/**
 * Fix opacity values in wrong range (0-100 → 0-1).
 *
 * LLM error:
 *   Box opacity 50
 *
 * Should be:
 *   Box opacity 0.5
 *
 * Only converts values > 1 (assumes they're percentages)
 */
export function fixOpacityRange(code: string): string {
  return code.replace(/\b(opacity|opa|o)\s+(\d+)(?=\s|$)/g, (match, prop, val) => {
    const n = parseInt(val, 10)
    if (n > 1 && n <= 100) {
      // Convert percentage to decimal
      return `${prop} ${(n / 100).toFixed(2).replace(/\.?0+$/, '')}`
    }
    return match
  })
}

/**
 * Convert rgba() to hex color.
 *
 * LLM error:
 *   Box shadow rgba(0, 0, 0, 0.3)
 *   Card background rgba(30, 30, 46, 1)
 *
 * Should be:
 *   Box shadow #0000004D
 *   Card background #1E1E2E
 */
export function convertRgbaToHex(code: string): string {
  return code.replace(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi,
    (match, r, g, b, a) => {
      const red = parseInt(r, 10).toString(16).padStart(2, '0')
      const green = parseInt(g, 10).toString(16).padStart(2, '0')
      const blue = parseInt(b, 10).toString(16).padStart(2, '0')

      if (a !== undefined && parseFloat(a) < 1) {
        const alpha = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0')
        return `#${red}${green}${blue}${alpha}`.toUpperCase()
      }

      return `#${red}${green}${blue}`.toUpperCase()
    }
  )
}

/**
 * Convert named CSS colors to hex.
 *
 * LLM error:
 *   Box color white
 *   Card background black
 *
 * Should be:
 *   Box color #FFFFFF
 *   Card background #000000
 */
const NAMED_COLORS: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  gray: '#808080',
  grey: '#808080',
  orange: '#FFA500',
  pink: '#FFC0CB',
  purple: '#800080',
  transparent: 'transparent',
}

export function convertNamedColorsToHex(code: string): string {
  const colorProps = ['background', 'bg', 'color', 'col', 'c', 'border-color', 'boc']
  let result = code

  for (const prop of colorProps) {
    const pattern = new RegExp(
      `(${prop})\\s+(${Object.keys(NAMED_COLORS).join('|')})(?=\\s|$|")`,
      'gi'
    )
    result = result.replace(pattern, (match, p, colorName) => {
      const hex = NAMED_COLORS[colorName.toLowerCase()]
      return hex ? `${p} ${hex}` : match
    })
  }

  return result
}

/**
 * Fix token names with hyphens that cause lexer issues.
 *
 * LLM error:
 *   $border-color: #333
 *   Box border-color $border-color
 *
 * Should be:
 *   $borderColor: #333
 *   Box border-color $borderColor
 *
 * Note: Property names like border-color are fine, only TOKEN names
 * with hyphens cause issues.
 */
export function fixHyphenatedTokenNames(code: string): string {
  // Find all token definitions with hyphens
  const hyphenatedTokens = new Map<string, string>()
  const defPattern = /\$([a-zA-Z]+(?:-[a-zA-Z]+)+)\s*:/g
  let match

  while ((match = defPattern.exec(code)) !== null) {
    const original = match[1]
    // Convert to camelCase
    const camelCase = original.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    hyphenatedTokens.set(original, camelCase)
  }

  if (hyphenatedTokens.size === 0) return code

  let result = code

  // Replace definitions and usages
  for (const [hyphenated, camelCase] of hyphenatedTokens) {
    // Replace definition: $border-color: → $borderColor:
    result = result.replace(
      new RegExp(`\\$${hyphenated}\\s*:`, 'g'),
      `$${camelCase}:`
    )
    // Replace usages: $border-color → $borderColor
    // But NOT property names like border-color (without $)
    result = result.replace(
      new RegExp(`\\$${hyphenated}(?=\\s|$|")`, 'g'),
      `$${camelCase}`
    )
  }

  return result
}

/**
 * Convert CSS box-shadow syntax to Mirror shadow sizes.
 *
 * LLM error:
 *   Card shadow 0 4px 6px rgba(0, 0, 0, 0.1)
 *   Box shadow 0 2px 4px #00000033
 *
 * Should be:
 *   Card shadow md
 *   Box shadow sm
 *
 * Mapping based on shadow blur radius:
 *   0-3px → sm, 4-8px → md, 9-15px → lg, 16+px → xl
 */
export function convertCssShadowToSize(code: string): string {
  // Pattern: shadow followed by CSS values (numbers, px, colors)
  // Match: shadow 0 4 6 #color or shadow 0 4px 6px rgba(...)
  // Note: px immediately follows digits without spaces, so no \s* before (?:px)?
  return code.replace(
    /\bshadow\s+(\d+)(?:px)?\s+(\d+)(?:px)?\s+(\d+)(?:px)?(?:\s+\d+(?:px)?)?(?:\s+(?:#[0-9A-Fa-f]+|rgba?\([^)]+\)))?/gi,
    (match, x, y, blur) => {
      const blurPx = parseInt(blur, 10)
      if (blurPx <= 3) return 'shadow sm'
      if (blurPx <= 8) return 'shadow md'
      if (blurPx <= 15) return 'shadow lg'
      return 'shadow xl'
    }
  )
}

/**
 * Remove CSS units (em, rem, vh, vw, %) where not supported.
 *
 * LLM error:
 *   Box padding 1rem gap 0.5em
 *   Card width 100%
 *
 * Should be:
 *   Box padding 16 gap 8
 *   Card width full (or width 100%)
 *
 * Note: % is actually supported in Mirror, but em/rem are not.
 */
export function removeUnsupportedUnits(code: string): string {
  let result = code

  // Convert rem to px (assuming 1rem = 16px)
  result = result.replace(/(\d+(?:\.\d+)?)\s*rem(?=\s|$|")/gi, (match, val) => {
    return String(Math.round(parseFloat(val) * 16))
  })

  // Convert em to px (assuming 1em = 16px for simplicity)
  result = result.replace(/(\d+(?:\.\d+)?)\s*em(?=\s|$|")/gi, (match, val) => {
    return String(Math.round(parseFloat(val) * 16))
  })

  // Convert vh/vw to percentage (rough approximation)
  result = result.replace(/(\d+)\s*vh(?=\s|$|")/gi, '$1%')
  result = result.replace(/(\d+)\s*vw(?=\s|$|")/gi, '$1%')

  return result
}

/**
 * Remove CSS calc() expressions - simplify to first number.
 *
 * LLM error:
 *   Box width calc(100% - 32px)
 *
 * Should be:
 *   Box width full (or just remove calc)
 */
export function removeCalcExpressions(code: string): string {
  // Handle nested parentheses by matching balanced parens
  return code.replace(/calc\s*\((?:[^()]+|\([^()]*\))*\)/gi, (match) => {
    // Try to extract the first meaningful value
    const numMatch = match.match(/(\d+)(?:px|%)?/)
    if (numMatch) {
      return numMatch[1]
    }
    return 'full' // fallback
  })
}

/**
 * Fix undefined token references by finding similar defined tokens.
 *
 * LLM error:
 *   $hover: #2563EB
 *   Button hover-bg $hover-background  // $hover-background not defined!
 *
 * Should be:
 *   $hover: #2563EB
 *   Button hover-bg $hover
 */
// Equivalent suffixes in token names (LLM often mixes these)
const TOKEN_SUFFIX_ALIASES: Record<string, string[]> = {
  'background': ['bg', 'color'],
  'bg': ['background', 'color'],
  'color': ['col', 'c'],
  'col': ['color', 'c'],
  'primary': ['accent', 'main'],
  'accent': ['primary', 'secondary'],
}

export function fixUndefinedTokenReferences(code: string): string {
  // 1. Find all defined tokens
  const definedTokens = new Set<string>()
  const defPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g
  let match

  while ((match = defPattern.exec(code)) !== null) {
    definedTokens.add(match[1])
  }

  if (definedTokens.size === 0) return code

  // 2. Find all token usages
  const usagePattern = /\$([a-zA-Z_][a-zA-Z0-9_-]*)(?=\s|$|")/g
  let result = code

  // Create array for iteration
  const tokens = Array.from(definedTokens)

  // 3. For each usage, check if defined. If not, find closest match.
  result = result.replace(usagePattern, (fullMatch, tokenName, offset) => {
    // Check if this is a definition (followed by :)
    const afterMatch = code.substring(offset + fullMatch.length, offset + fullMatch.length + 5)
    if (afterMatch.trim().startsWith(':')) return fullMatch

    // Check if token is defined
    if (definedTokens.has(tokenName)) return fullMatch

    // Don't try to match property names that were incorrectly prefixed with $
    // e.g., $border-color should not be matched to $border
    if (DSL_PROPERTIES.has(tokenName) || DSL_PROPERTIES.has(tokenName.replace(/-/g, ''))) {
      return fullMatch
    }

    // Find closest defined token
    let bestMatch = ''
    let bestScore = 0

    for (const defined of tokens) {
      let score = 0

      // Check exact containment (e.g., "hover" in "hover-background")
      if (tokenName.includes(defined)) {
        // Base part matches - high confidence
        score = defined.length / tokenName.length
        // Boost if defined is a complete prefix
        if (tokenName.startsWith(defined)) {
          score += 0.3
        }
      } else if (defined.includes(tokenName)) {
        score = tokenName.length / defined.length
      }

      // Check for equivalent suffixes (hover-background ↔ hover-bg, hoverBackground ↔ hoverBg)
      for (const [suffix, aliases] of Object.entries(TOKEN_SUFFIX_ALIASES)) {
        // Check lowercase suffix (e.g., tokenName ends with 'background')
        if (tokenName.toLowerCase().endsWith(suffix.toLowerCase())) {
          // Extract base: hoverBackground → hover, hover-background → hover-
          const suffixStart = tokenName.length - suffix.length
          const base = tokenName.slice(0, suffixStart)
          const cleanBase = base.replace(/-$/, '')

          for (const alias of aliases) {
            // Check various naming conventions:
            // hover + bg → hoverbg
            // hover + Bg → hoverBg (camelCase)
            // hover- + bg → hover-bg
            const variations = [
              cleanBase + alias,
              cleanBase + alias.charAt(0).toUpperCase() + alias.slice(1),
              cleanBase + '-' + alias,
            ]
            for (const variant of variations) {
              if (defined.toLowerCase() === variant.toLowerCase()) {
                score = Math.max(score, 0.9) // High confidence for suffix match
              }
            }
          }
          // Also check if just the base is defined: hoverBackground → hover
          if (defined.toLowerCase() === cleanBase.toLowerCase()) {
            score = Math.max(score, 0.85)
          }
        }
      }

      // Check for common prefix
      let commonPrefix = 0
      for (let i = 0; i < Math.min(defined.length, tokenName.length); i++) {
        if (defined[i].toLowerCase() === tokenName[i].toLowerCase()) {
          commonPrefix++
        } else break
      }
      const prefixScore = commonPrefix / Math.max(defined.length, tokenName.length)
      if (prefixScore > 0.5) {
        score = Math.max(score, prefixScore)
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = defined
      }
    }

    // Only replace if we found a good match
    if (bestMatch && bestScore > 0.4) {
      return `$${bestMatch}`
    }

    return fullMatch
  })

  return result
}

/**
 * Fix CSS transition/animation syntax.
 *
 * LLM error:
 *   Button transition all 0.2s ease
 *
 * Should be removed (Mirror handles transitions automatically):
 *   Button
 */
export function removeCssTransitions(code: string): string {
  // Remove transition property entirely
  return code.replace(/\btransition\s+[^"\n]+(?=\s|$|")/gi, '')
}

/**
 * Fix border shorthand with too many values.
 *
 * LLM error:
 *   Box border 1px solid #333
 *
 * Should be:
 *   Box border 1 #333
 *
 * Or:
 *   Box border 1 solid #333 (if style is needed)
 */
export function fixBorderShorthand(code: string): string {
  // Pattern: border N px/solid/dashed/dotted #color
  return code.replace(
    /\bborder\s+(\d+)\s*px\s+(solid|dashed|dotted)\s+(#[0-9A-Fa-f]{3,8})/gi,
    'border $1 $2 $3'
  )
}

/**
 * Remove CSS !important declarations.
 */
export function removeImportant(code: string): string {
  return code.replace(/\s*!important/gi, '')
}

/**
 * Fix CSS "none" values that Mirror doesn't understand.
 *
 * CSS patterns:
 *   border none → border 0
 *   outline none → (removed, Mirror has no outline)
 *   box-shadow none → (removed)
 */
export function fixCssNoneValues(code: string): string {
  // Process line by line to preserve indentation
  return code.split('\n').map(line => {
    // Preserve leading whitespace
    const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? ''
    let content = line.slice(leadingWhitespace.length)

    // border none → border 0
    content = content.replace(/\bborder\s+none\b/gi, 'border 0')

    // outline none → remove entirely
    content = content.replace(/\boutline\s+none\b/gi, '')

    // box-shadow none → remove entirely
    content = content.replace(/\bbox-shadow\s+none\b/gi, '')

    // Clean up any double spaces in content (not indentation)
    content = content.replace(/  +/g, ' ').trim()

    return leadingWhitespace + content
  }).join('\n')
}

/**
 * Fix common event typos.
 */
export function fixEventTypos(code: string): string {
  const eventTypos: Record<string, string> = {
    'onlick': 'onclick',
    'onclck': 'onclick',
    'onclik': 'onclick',
    'onhver': 'onhover',
    'onhovr': 'onhover',
    'onchage': 'onchange',
    'onchnge': 'onchange',
    'oninpt': 'oninput',
    'onfoucs': 'onfocus',
    'onblr': 'onblur',
    'onkeydonw': 'onkeydown',
    'onkeydwn': 'onkeydown',
  }

  let result = code
  for (const [typo, correct] of Object.entries(eventTypos)) {
    result = result.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct)
  }
  return result
}

/**
 * Fix common action typos.
 */
export function fixActionTypos(code: string): string {
  const actionTypos: Record<string, string> = {
    'toogle': 'toggle',
    'togle': 'toggle',
    'shwo': 'show',
    'hdie': 'hide',
    'hidde': 'hide',
    'opne': 'open',
    'clsoe': 'close',
    'chnage': 'change',
    'asign': 'assign',
    'assgin': 'assign',
  }

  let result = code
  for (const [typo, correct] of Object.entries(actionTypos)) {
    result = result.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct)
  }
  return result
}

/**
 * Remove empty lines between token definitions.
 *
 * LLM error:
 *   $primary: #3B82F6
 *
 *   $bg: #1E1E2E
 *
 * Should be:
 *   $primary: #3B82F6
 *   $bg: #1E1E2E
 */
export function removeEmptyLinesBetweenTokens(code: string): string {
  // Remove empty lines that are between two token definitions
  return code.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*:[^\n]+)\n\n+(\$[a-zA-Z_])/g, '$1\n$2')
}

/**
 * Fix property name and value split across lines.
 *
 * LLM error (in state blocks):
 *   state focus
 *     border-color
 *     $primary
 *
 * Should be:
 *   state focus
 *     border-color $primary
 */
export function fixSplitPropertyLines(code: string): string {
  const propertyNames = [
    'border-color', 'boc', 'background', 'bg', 'color', 'col',
    'border', 'bor', 'padding', 'pad', 'margin', 'mar',
    'radius', 'rad', 'width', 'w', 'height', 'h',
    'opacity', 'opa', 'gap', 'size', 'weight', 'font',
    'min-width', 'max-width', 'min-height', 'max-height',
    // Layout keywords
    'vertical', 'ver', 'horizontal', 'hor', 'center', 'cen',
    'between', 'wrap', 'grow', 'fill', 'shrink', 'stacked',
  ]

  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    // Check if current line is just a property name
    const trimmed = line.trim()
    if (nextLine && propertyNames.includes(trimmed)) {
      const nextTrimmed = nextLine.trim()
      // Check if next line is a value (starts with $ or # or is a number)
      if (/^(\$|#|\d)/.test(nextTrimmed)) {
        // Merge the lines
        const indent = line.match(/^(\s*)/)?.[1] ?? ''
        result.push(`${indent}${trimmed} ${nextTrimmed}`)
        i++ // Skip next line
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix border with only color value (missing width).
 *
 * LLM error (in state blocks):
 *   state focus
 *     border $primary     // border needs width, not just color
 *
 * Should be:
 *   state focus
 *     border-color $primary   // Use border-color for color-only
 *
 * Or:
 *   state focus
 *     border 1 $primary      // Add default width
 */
export function fixBorderColorOnly(code: string): string {
  // Pattern: border followed by a color value only ($ or #)
  // This is wrong because border needs a width first
  return code.replace(
    /\bborder\s+(\$[a-zA-Z_][a-zA-Z0-9_]*|#[0-9A-Fa-f]+)(?=\s|$)/g,
    'border-color $1'
  )
}

/**
 * Fix orphaned layout keywords and properties on their own lines.
 *
 * LLM error:
 *   Box
 *     ver
 *     gap 16
 *
 * Should be:
 *   Box ver gap 16
 */
export function fixOrphanedLayoutKeywords(code: string): string {
  const orphanedKeywords = new Set([
    // Layout keywords
    'vertical', 'ver', 'horizontal', 'hor',
    'center', 'cen', 'between', 'wrap',
    'grow', 'fill', 'shrink', 'stacked',
    // Properties that shouldn't be on own line when indented child of component
    'gap', 'padding', 'pad', 'p', 'margin', 'mar', 'm',
    'background', 'bg', 'color', 'col',
    'radius', 'rad', 'border', 'bor',
    'width', 'w', 'height', 'h',
  ])

  const lines = code.split('\n')
  const result: string[] = []

  // Helper to find parent line index (less indented, starts with component)
  const findParentIndex = (currentIndent: number): number => {
    for (let j = result.length - 1; j >= 0; j--) {
      const lineIndent = result[j].match(/^(\s*)/)?.[1].length ?? 0
      if (lineIndent < currentIndent) {
        const firstWord = result[j].trim().split(/\s+/)[0]
        // Parent should be a component (uppercase) or definition
        if (/^[A-Z]/.test(firstWord) || firstWord.endsWith(':')) {
          return j
        }
      }
    }
    return -1
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prevLine = result[result.length - 1]

    // Check if current line starts with an orphaned keyword (with indentation)
    const trimmed = line.trim()
    const firstWord = trimmed.split(/\s+/)[0]

    // Skip if line starts with component name (uppercase) or is a special construct
    if (/^[A-Z]/.test(firstWord) || firstWord.startsWith('$') || firstWord === 'state' ||
        firstWord === 'if' || firstWord === 'else' || firstWord === 'each' ||
        firstWord === 'events' || firstWord.startsWith('-') || firstWord.startsWith('"')) {
      result.push(line)
      continue
    }

    if (prevLine && orphanedKeywords.has(firstWord)) {
      const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      const prevIndent = prevLine.match(/^(\s*)/)?.[1].length ?? 0

      // Don't merge if previous line is a state block
      const prevTrimmed = prevLine.trim()
      const prevFirstWord = prevTrimmed.split(/\s+/)[0]
      if (prevFirstWord === 'state') {
        result.push(line)
        continue
      }

      // If this is more indented than prev line, merge with prev
      if (currentIndent > prevIndent) {
        result[result.length - 1] = prevLine + ' ' + trimmed
        continue
      }

      // If same indent as prev line but prev is inside a state block,
      // find the actual parent component and merge there
      if (currentIndent === prevIndent || currentIndent < prevIndent) {
        const parentIdx = findParentIndex(currentIndent)
        if (parentIdx >= 0) {
          result[parentIdx] = result[parentIdx] + ' ' + trimmed
          continue
        }
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix radius values split across lines (e.g., in state blocks).
 *
 * LLM error:
 *   state focus
 *     border
 *     1
 *     $borderColor
 *
 * Should be:
 *   state focus
 *     border 1 $borderColor
 */
export function fixOrphanedNumbers(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip if not just a number
    if (!/^\d+$/.test(trimmed)) {
      result.push(line)
      continue
    }

    // This is an orphaned number - try to merge with previous property line
    if (result.length > 0) {
      const prevLine = result[result.length - 1]
      const prevTrimmed = prevLine.trim()

      // Check if previous line looks like it needs a value
      // (ends with a property name or already has partial values)
      const propertyPattern = /\b(border|radius|padding|margin|gap|width|height|size|opacity|weight|border-color)$/i
      const partialValuePattern = /(border|radius)\s+\d+$/

      if (propertyPattern.test(prevTrimmed) || partialValuePattern.test(prevTrimmed)) {
        // Merge with previous line
        result[result.length - 1] = prevLine + ' ' + trimmed
        continue
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Apply all algorithmic fixes to generated code.
 */
export function applyAllFixes(code: string): string {
  let result = code

  // Apply fixes in order (order matters!)

  // Phase 0: Clean up CSS artifacts
  result = removeImportant(result)
  result = removeCssTransitions(result)
  result = removeCalcExpressions(result)
  result = fixCssNoneValues(result)

  // Phase 1: Color/value syntax fixes
  result = convertRgbaToHex(result)
  result = convertNamedColorsToHex(result)
  result = convertCssShadowToSize(result)
  result = removePropertyColons(result)
  result = removePxSuffix(result)
  result = removeUnsupportedUnits(result)
  result = fixOpacityRange(result)
  result = fixBorderShorthand(result)
  result = fixBorderColorOnly(result)

  // Phase 2: Token fixes
  result = fixHyphenatedTokenNames(result)
  result = fixTokensOnSameLine(result)
  result = removeEmptyLinesBetweenTokens(result)
  result = fixMissingTokenPrefix(result)
  result = fixUndefinedTokenReferences(result)
  result = fixTokenAsProperty(result)

  // Phase 3: Typo fixes
  result = fixEventTypos(result)
  result = fixActionTypos(result)

  // Phase 4: Structural fixes
  result = fixOrphanedLayoutKeywords(result)
  result = fixSplitPropertyLines(result)
  result = fixOrphanedNumbers(result)
  result = fixDimensionShorthandInDefinition(result)
  result = fixDefinitionAndUsageOnSameLine(result)
  result = fixDuplicateElementNames(result)
  result = fixTextOnSeparateLine(result)
  result = fixSingleDashElement(result)

  return result
}

// =============================================================================
// Quick Validation Helper
// =============================================================================

/**
 * Quick check if code is valid (for UI feedback).
 */
export function isValidMirrorCode(code: string): boolean {
  const feedback = validateMirrorCode(code, false)
  return feedback.valid
}

/**
 * Get a summary of issues for display.
 */
export function getIssueSummary(code: string): string[] {
  const feedback = validateMirrorCode(code, false)
  return feedback.issues.map(i => {
    if (i.suggestion) {
      return `Line ${i.line}: ${i.message} (${i.suggestion})`
    }
    return `Line ${i.line}: ${i.message}`
  })
}
