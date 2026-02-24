/**
 * Correction Prompt Generation
 *
 * Generates prompts for LLM to correct validation errors.
 * Hints and corrections reference Mirror DSL properties from reference.json.
 */

import type { CodeIssue, PromptLanguage } from './types'
import { REFERENCE_VERSION } from '../llm/prompt-generator'

// =============================================================================
// Prompt Templates
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

// =============================================================================
// Prompt Generation
// =============================================================================

/**
 * Generate a correction prompt for the LLM based on validation issues.
 *
 * @param originalCode - The original Mirror code with errors
 * @param issues - List of validation issues
 * @param language - Language for the prompt
 * @returns Formatted prompt for LLM correction
 */
export function generateCorrectionPrompt(
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

  // Check if any errors look like token issues
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

/**
 * Generate a brief summary of issues for display.
 */
export function formatIssueSummary(
  issues: CodeIssue[],
  language: PromptLanguage = 'de'
): string {
  const t = PROMPT_TEMPLATES[language]

  if (issues.length === 0) {
    return language === 'de' ? 'Keine Fehler gefunden.' : 'No errors found.'
  }

  const errors = issues.filter(i => i.type !== 'validation_warning')
  const warnings = issues.filter(i => i.type === 'validation_warning')

  const parts: string[] = []

  if (errors.length > 0) {
    parts.push(language === 'de'
      ? `${errors.length} Fehler`
      : `${errors.length} error${errors.length > 1 ? 's' : ''}`
    )
  }

  if (warnings.length > 0) {
    parts.push(language === 'de'
      ? `${warnings.length} Warnung${warnings.length > 1 ? 'en' : ''}`
      : `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`
    )
  }

  return parts.join(', ')
}

// =============================================================================
// Common Property Corrections (from reference.json)
// =============================================================================

const PROPERTY_CORRECTIONS: Record<string, string> = {
  // CSS to Mirror shorthand
  'background-color': 'bg',
  'background': 'bg',
  'padding': 'pad',
  'margin': 'mar',
  'border-radius': 'rad',
  'border-color': 'boc',
  'font-size': 'fs',
  'text-size': 'fs',
  'icon-size': 'is',
  'opacity': 'o',
  'width': 'w',
  'height': 'h',
  'horizontal': 'hor',
  'vertical': 'ver',
  'color': 'col',
  'flex-direction': 'hor/ver',
  'justify-content': 'spread/center',
  'align-items': 'ver-cen/hor-cen',
}

/**
 * Generate hints based on common error patterns.
 * Uses property corrections from reference.json (Mirror ${REFERENCE_VERSION}).
 */
export function generateErrorHints(
  issues: CodeIssue[],
  language: PromptLanguage = 'de'
): string[] {
  const hints: string[] = []

  // Check for token-related errors
  const hasUnexpectedToken = issues.some(i =>
    i.message.toLowerCase().includes('unexpected token')
  )
  if (hasUnexpectedToken) {
    hints.push(language === 'de'
      ? 'Tokens müssen mit $ beginnen (z.B. $primary statt primary)'
      : 'Tokens must start with $ (e.g., $primary instead of primary)'
    )
  }

  // Check for parsing errors
  const hasParseError = issues.some(i => i.type === 'parse_error')
  if (hasParseError) {
    hints.push(language === 'de'
      ? 'Überprüfe die Syntax: richtige Einrückung, Klammern, Anführungszeichen'
      : 'Check syntax: proper indentation, brackets, quotes'
    )
  }

  // Check for unknown property errors
  const hasUnknownProperty = issues.some(i =>
    i.message.toLowerCase().includes('unknown property') ||
    i.message.toLowerCase().includes('unbekannte eigenschaft')
  )
  if (hasUnknownProperty) {
    hints.push(language === 'de'
      ? `Verwende Mirror Shorthands (Mirror ${REFERENCE_VERSION}): bg, pad, rad, col, fs, w, h, hor, ver`
      : `Use Mirror shorthands (Mirror ${REFERENCE_VERSION}): bg, pad, rad, col, fs, w, h, hor, ver`
    )
  }

  // Check for specific CSS property usage
  for (const issue of issues) {
    const msg = issue.message.toLowerCase()
    for (const [cssName, mirrorName] of Object.entries(PROPERTY_CORRECTIONS)) {
      if (msg.includes(cssName)) {
        hints.push(language === 'de'
          ? `Verwende "${mirrorName}" statt "${cssName}"`
          : `Use "${mirrorName}" instead of "${cssName}"`
        )
        break
      }
    }
  }

  // Remove duplicates
  return [...new Set(hints)]
}
