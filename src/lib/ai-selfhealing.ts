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

      // Algorithmic fix: add missing $ to token references
      currentCode = fixMissingTokenPrefix(currentCode)

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
  // Layout
  'hor', 'ver', 'gap', 'between', 'wrap', 'grid', 'stacked', 'grow', 'shrink', 'fill',
  // Alignment
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b', 'cen',
  // Spacing
  'pad', 'mar', 'l', 'r', 'u', 'd', 'l-r', 'u-d',
  // Size
  'w', 'h', 'minw', 'maxw', 'minh', 'maxh', 'full',
  // Color
  'col', 'bg', 'boc',
  // Border
  'bor', 'rad',
  // Typography
  'size', 'weight', 'line', 'font', 'align', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
  // Visual
  'opacity', 'opa', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled',
  // Hover
  'hover-bg', 'hover-col', 'hover-boc', 'hover-opacity', 'hover-scale', 'hover-rad',
  // Scroll
  'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'snap', 'clip',
  // Other
  'icon', 'type', 'placeholder', 'src', 'fit', 'rows', 'named', 'from', 'as',
  // Events
  'onclick', 'onchange', 'oninput', 'onfocus', 'onblur', 'onhover', 'onkeydown', 'onkeyup', 'onload',
  // Actions
  'toggle', 'show', 'hide', 'open', 'close', 'page', 'assign',
  // State
  'state', 'if', 'then', 'else', 'each', 'in', 'to', 'and', 'or', 'not',
  // Animations
  'animate', 'fade', 'scale', 'spin', 'pulse', 'bounce',
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
    // - The word is the token name exactly
    const usePattern = new RegExp(
      `(?<!\\$|[a-zA-Z0-9_-])\\b(${token})\\b(?!\\s*:)`,
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
 * Should be:
 *   Card: background #1E1E1E
 *   Card color white "Hello World"
 */
export function fixDefinitionAndUsageOnSameLine(code: string): string {
  // Pattern: ComponentName: props ComponentName props
  // Match definition followed by same component name without colon
  return code.replace(
    /^(\s*)([A-Z][a-zA-Z]*:\s*(?:[a-z][a-zA-Z-]*\s+[^\n$"]+?\s+)+)([A-Z][a-zA-Z]*(?:\s+[^:\n]+))/gm,
    (match, indent, definition, usage) => {
      // Only split if the component names match
      const defName = definition.match(/^([A-Z][a-zA-Z]*):/)?.[1]
      const useName = usage.match(/^([A-Z][a-zA-Z]*)/)?.[1]
      if (defName === useName) {
        return `${indent}${definition.trim()}\n${indent}${usage.trim()}`
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
 * Apply all algorithmic fixes to generated code.
 */
export function applyAllFixes(code: string): string {
  let result = code

  // Apply fixes in order (order matters!)

  // Phase 1: Color/value syntax fixes
  result = convertRgbaToHex(result)
  result = convertNamedColorsToHex(result)
  result = removePropertyColons(result)
  result = removePxSuffix(result)
  result = fixOpacityRange(result)

  // Phase 2: Token fixes
  result = fixHyphenatedTokenNames(result)
  result = fixTokensOnSameLine(result)
  result = fixMissingTokenPrefix(result)
  result = fixTokenAsProperty(result)

  // Phase 3: Structural fixes
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
