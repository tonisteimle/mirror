/**
 * Context Summarizer
 *
 * Creates concise summaries of code context for LLM prompts.
 * Part of Enhanced Context Provider (Increment 7).
 */

import type { CodeContext } from '../analysis/context-analyzer'

/**
 * Summary detail levels
 */
export type SummaryLevel = 'minimal' | 'standard' | 'detailed'

/**
 * Summary configuration
 */
export interface SummaryConfig {
  level: SummaryLevel
  maxTokens?: number         // Approximate max tokens (rough estimate)
  includeExamples?: boolean  // Include code examples
  language?: 'de' | 'en'     // Output language
}

/**
 * Structured summary output
 */
export interface ContextSummary {
  overview: string           // One-line overview
  sections: SummarySection[]
  recommendations: string[]  // Suggestions for generation
  tokenEstimate: number      // Rough token count
}

export interface SummarySection {
  title: string
  content: string
  priority: 'high' | 'medium' | 'low'
}

const DEFAULT_CONFIG: SummaryConfig = {
  level: 'standard',
  maxTokens: 500,
  includeExamples: false,
  language: 'de'
}

/**
 * Creates a summary of the code context
 */
export function summarizeContext(
  context: CodeContext,
  config: Partial<SummaryConfig> = {}
): ContextSummary {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const sections: SummarySection[] = []
  const recommendations: string[] = []

  // Generate overview
  const overview = generateOverview(context, cfg)

  // Add sections based on detail level
  if (cfg.level !== 'minimal') {
    // Token section
    if (context.tokens.all.length > 0) {
      sections.push(createTokenSection(context, cfg))
    }

    // Component section
    if (context.components.definitions.length > 0) {
      sections.push(createComponentSection(context, cfg))
    }

    // Layout section
    if (context.layout.analysis.root) {
      sections.push(createLayoutSection(context, cfg))
    }

    // Naming section (only for detailed)
    if (cfg.level === 'detailed' && hasNamingConventions(context)) {
      sections.push(createNamingSection(context, cfg))
    }
  }

  // Generate recommendations
  recommendations.push(...generateRecommendations(context, cfg))

  // Calculate token estimate
  const tokenEstimate = estimateTokens(overview, sections, recommendations)

  return {
    overview,
    sections,
    recommendations,
    tokenEstimate
  }
}

/**
 * Generates a one-line overview
 */
function generateOverview(context: CodeContext, cfg: SummaryConfig): string {
  const parts: string[] = []
  const isGerman = cfg.language === 'de'

  // Layout pattern
  if (context.layout.pattern !== 'unknown') {
    const patternNames = {
      'sidebar-main': isGerman ? 'Sidebar-Layout' : 'Sidebar layout',
      'header-content-footer': isGerman ? 'Seiten-Layout' : 'Page layout',
      'grid': isGerman ? 'Grid-Layout' : 'Grid layout',
      'stack': isGerman ? 'Stack-Layout' : 'Stack layout',
      'dashboard': isGerman ? 'Dashboard-Layout' : 'Dashboard layout'
    }
    parts.push(patternNames[context.layout.pattern])
  }

  // Component count
  const defCount = context.components.definitions.length
  if (defCount > 0) {
    parts.push(isGerman
      ? `${defCount} Komponenten`
      : `${defCount} components`)
  }

  // Token presence
  if (context.tokens.hasColors) {
    parts.push(isGerman ? 'Design-Tokens' : 'design tokens')
  }

  if (parts.length === 0) {
    return isGerman ? 'Einfache Struktur' : 'Simple structure'
  }

  return parts.join(isGerman ? ' mit ' : ' with ')
}

/**
 * Creates token summary section
 */
function createTokenSection(context: CodeContext, cfg: SummaryConfig): SummarySection {
  const isGerman = cfg.language === 'de'
  const lines: string[] = []

  const { colors, spacing, radius } = context.tokens.categorized

  if (colors.length > 0) {
    const colorList = colors.slice(0, cfg.level === 'detailed' ? 5 : 3)
      .map(t => `${t.name}: ${t.value}`)
      .join(', ')
    lines.push(isGerman
      ? `Farben: ${colorList}`
      : `Colors: ${colorList}`)
  }

  if (spacing.length > 0) {
    const spacingList = spacing.slice(0, 3)
      .map(t => `${t.name}: ${t.value}`)
      .join(', ')
    lines.push(isGerman
      ? `Abstände: ${spacingList}`
      : `Spacing: ${spacingList}`)
  }

  if (radius.length > 0 && cfg.level === 'detailed') {
    const radiusList = radius.slice(0, 2)
      .map(t => `${t.name}: ${t.value}`)
      .join(', ')
    lines.push(isGerman
      ? `Radien: ${radiusList}`
      : `Radii: ${radiusList}`)
  }

  return {
    title: isGerman ? 'Design Tokens' : 'Design Tokens',
    content: lines.join('\n'),
    priority: 'high'
  }
}

/**
 * Creates component summary section
 */
function createComponentSection(context: CodeContext, cfg: SummaryConfig): SummarySection {
  const isGerman = cfg.language === 'de'
  const lines: string[] = []

  // List definitions
  const defs = context.components.definitions
  const defNames = defs.slice(0, cfg.level === 'detailed' ? 10 : 5)
    .map(d => d.name)
    .join(', ')

  lines.push(isGerman
    ? `Definitionen: ${defNames}`
    : `Definitions: ${defNames}`)

  // List slots if available
  if (context.components.slotNames.length > 0 && cfg.level !== 'minimal') {
    const slots = context.components.slotNames.slice(0, 5).join(', ')
    lines.push(isGerman
      ? `Slots: ${slots}`
      : `Slots: ${slots}`)
  }

  // Show inheritance for detailed
  if (cfg.level === 'detailed') {
    const withInheritance = defs.filter(d => d.inheritsFrom)
    if (withInheritance.length > 0) {
      const inheritanceList = withInheritance.slice(0, 3)
        .map(d => `${d.name} → ${d.inheritsFrom}`)
        .join(', ')
      lines.push(isGerman
        ? `Vererbung: ${inheritanceList}`
        : `Inheritance: ${inheritanceList}`)
    }
  }

  return {
    title: isGerman ? 'Komponenten' : 'Components',
    content: lines.join('\n'),
    priority: 'high'
  }
}

/**
 * Creates layout summary section
 */
function createLayoutSection(context: CodeContext, cfg: SummaryConfig): SummarySection {
  const isGerman = cfg.language === 'de'
  const lines: string[] = []

  // Root layout
  if (context.layout.rootLayout && context.layout.rootLayout !== 'unknown') {
    lines.push(isGerman
      ? `Hauptlayout: ${context.layout.rootLayout}`
      : `Root layout: ${context.layout.rootLayout}`)
  }

  // Sections
  if (context.layout.sections.length > 0) {
    lines.push(isGerman
      ? `Sektionen: ${context.layout.sections.join(', ')}`
      : `Sections: ${context.layout.sections.join(', ')}`)
  }

  // Depth (for detailed)
  if (cfg.level === 'detailed' && context.layout.maxDepth > 1) {
    lines.push(isGerman
      ? `Verschachtelungstiefe: ${context.layout.maxDepth}`
      : `Nesting depth: ${context.layout.maxDepth}`)
  }

  return {
    title: isGerman ? 'Layout' : 'Layout',
    content: lines.join('\n'),
    priority: 'medium'
  }
}

/**
 * Creates naming conventions section
 */
function createNamingSection(context: CodeContext, cfg: SummaryConfig): SummarySection {
  const isGerman = cfg.language === 'de'
  const lines: string[] = []

  if (context.naming.componentPrefixes.length > 0) {
    lines.push(isGerman
      ? `Komponenten-Präfix: ${context.naming.componentPrefixes[0]}`
      : `Component prefix: ${context.naming.componentPrefixes[0]}`)
  }

  if (context.naming.tokenPrefixes.length > 0) {
    lines.push(isGerman
      ? `Token-Präfix: ${context.naming.tokenPrefixes[0]}`
      : `Token prefix: ${context.naming.tokenPrefixes[0]}`)
  }

  lines.push(isGerman
    ? `Token-Style: ${context.naming.tokenStyle}`
    : `Token style: ${context.naming.tokenStyle}`)

  return {
    title: isGerman ? 'Namenskonventionen' : 'Naming Conventions',
    content: lines.join('\n'),
    priority: 'low'
  }
}

/**
 * Checks if meaningful naming conventions exist
 */
function hasNamingConventions(context: CodeContext): boolean {
  return context.naming.componentPrefixes.length > 0 ||
         context.naming.tokenPrefixes.length > 0 ||
         context.naming.tokenStyle !== 'mixed'
}

/**
 * Generates recommendations based on context
 */
function generateRecommendations(context: CodeContext, cfg: SummaryConfig): string[] {
  const recommendations: string[] = []
  const isGerman = cfg.language === 'de'

  // Token recommendations
  if (context.tokens.hasColors) {
    recommendations.push(isGerman
      ? 'Verwende existierende Farb-Tokens für Konsistenz'
      : 'Use existing color tokens for consistency')
  }

  // Component recommendations
  if (context.components.definitions.length > 0) {
    recommendations.push(isGerman
      ? 'Nutze definierte Komponenten wo möglich'
      : 'Use defined components where possible')
  }

  // Naming recommendations
  if (context.naming.componentPrefixes.length > 0) {
    recommendations.push(isGerman
      ? `Verwende Präfix "${context.naming.componentPrefixes[0]}" für neue Komponenten`
      : `Use prefix "${context.naming.componentPrefixes[0]}" for new components`)
  }

  // Layout recommendations
  if (context.layout.pattern === 'sidebar-main') {
    recommendations.push(isGerman
      ? 'Füge neue Panels horizontal in Dashboard ein'
      : 'Add new panels horizontally in dashboard')
  }

  return recommendations.slice(0, cfg.level === 'detailed' ? 5 : 3)
}

/**
 * Estimates token count (rough approximation)
 */
function estimateTokens(
  overview: string,
  sections: SummarySection[],
  recommendations: string[]
): number {
  const text = [
    overview,
    ...sections.map(s => s.title + '\n' + s.content),
    ...recommendations
  ].join('\n')

  // Rough estimate: ~4 characters per token for German/English
  return Math.ceil(text.length / 4)
}

/**
 * Formats summary as plain text
 */
export function formatSummaryAsText(summary: ContextSummary): string {
  const lines: string[] = [summary.overview, '']

  for (const section of summary.sections) {
    lines.push(`### ${section.title}`)
    lines.push(section.content)
    lines.push('')
  }

  if (summary.recommendations.length > 0) {
    lines.push('### Empfehlungen')
    for (const rec of summary.recommendations) {
      lines.push(`- ${rec}`)
    }
  }

  return lines.join('\n')
}

/**
 * Formats summary for LLM prompt injection
 */
export function formatSummaryForLLM(
  summary: ContextSummary,
  maxTokens?: number
): string {
  const lines: string[] = []

  // Always include overview
  lines.push(summary.overview)
  lines.push('')

  // Add high priority sections first
  const highPriority = summary.sections.filter(s => s.priority === 'high')
  const mediumPriority = summary.sections.filter(s => s.priority === 'medium')

  for (const section of highPriority) {
    lines.push(`${section.title}: ${section.content.replace(/\n/g, ', ')}`)
  }

  // Add medium priority if we have room
  if (!maxTokens || estimateTokens(lines.join('\n'), [], []) < maxTokens * 0.7) {
    for (const section of mediumPriority) {
      lines.push(`${section.title}: ${section.content.replace(/\n/g, ', ')}`)
    }
  }

  // Add recommendations if we have room
  if (!maxTokens || estimateTokens(lines.join('\n'), [], []) < maxTokens * 0.9) {
    if (summary.recommendations.length > 0) {
      lines.push('')
      lines.push('Hinweise: ' + summary.recommendations.join('; '))
    }
  }

  return lines.join('\n')
}

/**
 * Creates a minimal context hint (single line)
 */
export function createContextHint(context: CodeContext): string {
  const parts: string[] = []

  if (context.tokens.hasColors) {
    parts.push(`${context.tokens.categorized.colors.length} Farben`)
  }

  if (context.components.definitions.length > 0) {
    parts.push(`${context.components.definitions.length} Komponenten`)
  }

  if (context.layout.pattern !== 'unknown') {
    parts.push(context.layout.pattern)
  }

  if (context.naming.componentPrefixes.length > 0) {
    parts.push(`Präfix: ${context.naming.componentPrefixes[0]}`)
  }

  return parts.length > 0 ? parts.join(' | ') : 'Kein Kontext'
}
