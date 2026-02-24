/**
 * LLM Context Formatter
 *
 * Formats code context for LLM prompts.
 * Part of Enhanced LLM Integration (Increment 22).
 */

import { analyzeContext } from '../analysis/context-analyzer'
import type { CodeContext } from '../analysis/context-analyzer'
import { summarizeContext, formatSummaryForLLM } from '../context/context-summarizer'
import { detectPatterns } from '../context/pattern-matcher'
import type { PatternAnalysis } from '../context/pattern-matcher'
import { unifiedValidate } from '../../validation'
import type { ValidationResult } from '../../validation/core'

/**
 * Formatted context for LLM
 */
export interface FormattedLLMContext {
  systemContext: string
  codeContext: string
  constraints: string[]
  suggestions: string[]
  metadata: ContextMetadata
}

/**
 * Context metadata
 */
export interface ContextMetadata {
  tokenEstimate: number
  hasTokens: boolean
  hasDefinitions: boolean
  hasLayout: boolean
  patternType?: string
  errorCount: number
}

/**
 * Formatting options
 */
export interface FormatOptions {
  includeTokens?: boolean
  includeDefinitions?: boolean
  includeLayout?: boolean
  includePatterns?: boolean
  includeValidation?: boolean
  maxTokens?: number
  language?: 'de' | 'en'
}

const DEFAULT_OPTIONS: Required<FormatOptions> = {
  includeTokens: true,
  includeDefinitions: true,
  includeLayout: true,
  includePatterns: true,
  includeValidation: true,
  maxTokens: 2000,
  language: 'de'
}

/**
 * Formats code context for LLM generation
 */
export function formatContextForLLM(
  code: string,
  options?: FormatOptions
): FormattedLLMContext {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const context = analyzeContext(code)
  const summary = summarizeContext(context)
  const patterns = opts.includePatterns ? detectPatterns(context) : undefined
  const validation = opts.includeValidation ? unifiedValidate(code, { mode: 'live' }) : undefined

  const systemContext = buildSystemContext(context, patterns, opts)
  const codeContext = buildCodeContext(context, opts)
  const constraints = buildConstraints(context, validation, opts)
  const suggestions = buildSuggestions(context, patterns, opts)

  const metadata = buildMetadata(context, patterns, validation)

  return {
    systemContext,
    codeContext,
    constraints,
    suggestions,
    metadata
  }
}

/**
 * Builds system context string
 */
function buildSystemContext(
  context: CodeContext,
  patterns: PatternAnalysis | undefined,
  opts: Required<FormatOptions>
): string {
  const lines: string[] = []

  // Build naming conventions from the context
  const namingConventions: string[] = []
  if (context.naming?.componentPrefixes?.length > 0) {
    namingConventions.push(`Prefix: ${context.naming.componentPrefixes[0]}`)
  }
  if (context.naming?.componentStyle) {
    namingConventions.push(context.naming.componentStyle)
  }
  if (context.naming?.tokenStyle && context.naming.tokenStyle !== 'mixed') {
    namingConventions.push(`Token: ${context.naming.tokenStyle}`)
  }

  if (opts.language === 'de') {
    lines.push('Du generierst Mirror DSL Code.')

    if (patterns?.primaryPattern) {
      lines.push(`Erkanntes UI-Pattern: ${patterns.primaryPattern}`)
    }

    if (context.layout.pattern && context.layout.pattern !== 'unknown') {
      lines.push(`Layout-Struktur: ${context.layout.pattern}`)
    }

    if (namingConventions.length > 0) {
      lines.push(`Namenskonventionen: ${namingConventions.join(', ')}`)
    }
  } else {
    lines.push('You are generating Mirror DSL code.')

    if (patterns?.primaryPattern) {
      lines.push(`Detected UI pattern: ${patterns.primaryPattern}`)
    }

    if (context.layout.pattern && context.layout.pattern !== 'unknown') {
      lines.push(`Layout structure: ${context.layout.pattern}`)
    }

    if (namingConventions.length > 0) {
      lines.push(`Naming conventions: ${namingConventions.join(', ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Builds code context string
 */
function buildCodeContext(
  context: CodeContext,
  opts: Required<FormatOptions>
): string {
  const sections: string[] = []

  // Tokens section
  if (opts.includeTokens && context.tokens.all.length > 0) {
    const tokenSection = formatTokensSection(context, opts)
    if (tokenSection) sections.push(tokenSection)
  }

  // Definitions section
  if (opts.includeDefinitions && context.components.definitions.length > 0) {
    const defSection = formatDefinitionsSection(context, opts)
    if (defSection) sections.push(defSection)
  }

  // Layout section
  if (opts.includeLayout && context.layout.analysis.root) {
    const layoutSection = formatLayoutSection(context, opts)
    if (layoutSection) sections.push(layoutSection)
  }

  return sections.join('\n\n')
}

/**
 * Formats tokens section
 */
function formatTokensSection(
  context: CodeContext,
  opts: Required<FormatOptions>
): string {
  const lines: string[] = []
  const header = opts.language === 'de' ? 'Verfügbare Tokens:' : 'Available tokens:'
  lines.push(header)

  // Group by type - access through categorized
  // Token names already include the $ prefix
  const categorized = context.tokens.categorized

  if (categorized.colors.length > 0) {
    const colorLabel = opts.language === 'de' ? 'Farben' : 'Colors'
    lines.push(`  ${colorLabel}: ${categorized.colors.map(t => t.name).join(', ')}`)
  }

  if (categorized.spacing.length > 0) {
    const spacingLabel = opts.language === 'de' ? 'Abstände' : 'Spacing'
    lines.push(`  ${spacingLabel}: ${categorized.spacing.map(t => t.name).join(', ')}`)
  }

  if (categorized.radius.length > 0) {
    const radiusLabel = opts.language === 'de' ? 'Radien' : 'Radius'
    lines.push(`  ${radiusLabel}: ${categorized.radius.map(t => t.name).join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Formats definitions section
 */
function formatDefinitionsSection(
  context: CodeContext,
  opts: Required<FormatOptions>
): string {
  const lines: string[] = []
  const header = opts.language === 'de' ? 'Definierte Komponenten:' : 'Defined components:'
  lines.push(header)

  for (const def of context.components.definitions.slice(0, 10)) {
    lines.push(`  - ${def.name}`)
    // Add slot information for this definition
    if (def.slots.length > 0) {
      const slotsLabel = opts.language === 'de' ? 'Slots' : 'Slots'
      lines.push(`    ${slotsLabel}: ${def.slots.join(', ')}`)
    }
  }

  if (context.components.definitions.length > 10) {
    const moreLabel = opts.language === 'de' ? 'weitere' : 'more'
    lines.push(`  ... und ${context.components.definitions.length - 10} ${moreLabel}`)
  }

  return lines.join('\n')
}

/**
 * Formats layout section
 */
function formatLayoutSection(
  context: CodeContext,
  opts: Required<FormatOptions>
): string {
  const lines: string[] = []
  const header = opts.language === 'de' ? 'Layout-Struktur:' : 'Layout structure:'
  lines.push(header)

  const root = context.layout.analysis.root
  if (root) {
    lines.push(`  Root: ${root.name} (${root.layout || 'vertical'})`)

    if (root.children.length > 0) {
      const childNames = root.children.slice(0, 5).map(c => c.name).join(', ')
      lines.push(`  Kinder: ${childNames}`)
    }
  }

  return lines.join('\n')
}

/**
 * Builds constraints list
 */
function buildConstraints(
  context: CodeContext,
  validation: ValidationResult | undefined,
  opts: Required<FormatOptions>
): string[] {
  const constraints: string[] = []

  // Get prefix from naming conventions
  const prefix = context.naming?.componentPrefixes?.[0]

  if (opts.language === 'de') {
    // Token constraints
    if (context.tokens.all.length > 0) {
      constraints.push('Verwende vorhandene Tokens für Farben und Abstände')
    }

    // Naming constraints
    if (prefix) {
      constraints.push(`Verwende Präfix "${prefix}" für neue Komponenten`)
    }

    // Layout constraints
    if (context.layout.pattern && context.layout.pattern !== 'unknown') {
      constraints.push(`Halte das ${context.layout.pattern} Layout-Pattern ein`)
    }

    // Validation constraints
    if (validation && validation.diagnostics.filter(d => d.severity === 'error').length > 0) {
      constraints.push('Behebe keine bestehenden Fehler, außer explizit angefordert')
    }
  } else {
    if (context.tokens.all.length > 0) {
      constraints.push('Use existing tokens for colors and spacing')
    }

    if (prefix) {
      constraints.push(`Use prefix "${prefix}" for new components`)
    }

    if (context.layout.pattern && context.layout.pattern !== 'unknown') {
      constraints.push(`Maintain the ${context.layout.pattern} layout pattern`)
    }

    if (validation && validation.diagnostics.filter(d => d.severity === 'error').length > 0) {
      constraints.push('Do not fix existing errors unless explicitly requested')
    }
  }

  return constraints
}

/**
 * Builds suggestions list
 */
function buildSuggestions(
  context: CodeContext,
  patterns: PatternAnalysis | undefined,
  opts: Required<FormatOptions>
): string[] {
  const suggestions: string[] = []

  if (opts.language === 'de') {
    // Pattern-based suggestions
    if (patterns?.recommendations) {
      for (const rec of patterns.recommendations.slice(0, 3)) {
        suggestions.push(rec.reason)
      }
    }

    // Token suggestions
    if (!context.tokens.hasColors && context.components.definitions.length > 0) {
      suggestions.push('Erwäge Farb-Tokens zu definieren für konsistentes Design')
    }

    // Layout suggestions
    if (context.layout.maxDepth > 5) {
      suggestions.push('Tiefe Verschachtelung - erwäge Komponenten zu extrahieren')
    }
  } else {
    if (patterns?.recommendations) {
      for (const rec of patterns.recommendations.slice(0, 3)) {
        suggestions.push(rec.reason)
      }
    }

    if (!context.tokens.hasColors && context.components.definitions.length > 0) {
      suggestions.push('Consider defining color tokens for consistent design')
    }

    if (context.layout.maxDepth > 5) {
      suggestions.push('Deep nesting detected - consider extracting components')
    }
  }

  return suggestions
}

/**
 * Builds metadata
 */
function buildMetadata(
  context: CodeContext,
  patterns: PatternAnalysis | undefined,
  validation: ValidationResult | undefined
): ContextMetadata {
  return {
    tokenEstimate: estimateTokens(context),
    hasTokens: context.tokens.all.length > 0,
    hasDefinitions: context.components.definitions.length > 0,
    hasLayout: context.layout.analysis.root !== undefined,
    patternType: patterns?.primaryPattern ?? undefined,
    errorCount: validation?.diagnostics.filter(d => d.severity === 'error').length || 0
  }
}

/**
 * Estimates token count for context
 */
function estimateTokens(context: CodeContext): number {
  let estimate = 50 // Base overhead

  estimate += context.tokens.all.length * 5
  estimate += context.components.definitions.length * 15
  estimate += (context.layout.analysis.maxDepth || 0) * 10

  return estimate
}

/**
 * Formats context for generation prompt
 */
export function formatForGeneration(
  code: string,
  request: string,
  options?: FormatOptions
): string {
  const formatted = formatContextForLLM(code, options)
  const lang = options?.language || 'de'

  const lines: string[] = []

  // System context
  lines.push(formatted.systemContext)
  lines.push('')

  // Code context
  if (formatted.codeContext) {
    lines.push(formatted.codeContext)
    lines.push('')
  }

  // Constraints
  if (formatted.constraints.length > 0) {
    const header = lang === 'de' ? 'Einschränkungen:' : 'Constraints:'
    lines.push(header)
    for (const constraint of formatted.constraints) {
      lines.push(`- ${constraint}`)
    }
    lines.push('')
  }

  // Request
  const requestHeader = lang === 'de' ? 'Anfrage:' : 'Request:'
  lines.push(requestHeader)
  lines.push(request)

  return lines.join('\n')
}

/**
 * Formats context for modification prompt
 */
export function formatForModification(
  code: string,
  modification: string,
  targetComponent?: string,
  options?: FormatOptions
): string {
  const formatted = formatContextForLLM(code, options)
  const lang = options?.language || 'de'

  const lines: string[] = []

  // System context
  lines.push(formatted.systemContext)
  lines.push('')

  // Target component info
  if (targetComponent) {
    const targetHeader = lang === 'de' ? 'Ziel-Komponente:' : 'Target component:'
    lines.push(`${targetHeader} ${targetComponent}`)
    lines.push('')
  }

  // Code context (abbreviated for modification)
  if (formatted.codeContext) {
    lines.push(formatted.codeContext)
    lines.push('')
  }

  // Modification request
  const modHeader = lang === 'de' ? 'Änderung:' : 'Modification:'
  lines.push(modHeader)
  lines.push(modification)

  return lines.join('\n')
}

/**
 * Creates minimal context for simple requests
 */
export function formatMinimalContext(code: string): string {
  const context = analyzeContext(code)
  const lines: string[] = []

  // Just tokens and key components
  // Token names already include the $ prefix
  if (context.tokens.all.length > 0) {
    const tokenNames = context.tokens.all.slice(0, 5).map(t => t.name).join(', ')
    lines.push(`Tokens: ${tokenNames}`)
  }

  if (context.components.definitions.length > 0) {
    const compNames = context.components.definitions.slice(0, 5).map(d => d.name).join(', ')
    lines.push(`Komponenten: ${compNames}`)
  }

  return lines.join('\n')
}

/**
 * Formats validation errors for LLM
 */
export function formatValidationForLLM(code: string): string {
  const report = unifiedValidate(code, { mode: 'live' })

  if (report.valid) {
    return 'Code ist valide.'
  }

  const errors = report.diagnostics.filter(d => d.severity === 'error')
  const lines: string[] = []
  lines.push(`${errors.length} Fehler gefunden:`)

  for (const error of errors.slice(0, 5)) {
    lines.push(`- Zeile ${error.location.line}: ${error.message}`)
  }

  if (errors.length > 5) {
    lines.push(`... und ${errors.length - 5} weitere Fehler`)
  }

  return lines.join('\n')
}
