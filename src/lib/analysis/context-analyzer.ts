/**
 * Context Analyzer
 *
 * Unified interface combining all analysis modules for comprehensive
 * code context extraction before LLM generation.
 * Part of the Analysis Foundation (Increment 6).
 */

import { extractTokens, categorizeTokens } from './token-extractor'
import type { CategorizedTokens, ExtractedToken } from './token-extractor'
import { extractComponents, getDefinitions, getInstances } from './component-extractor'
import type { ExtractedComponent } from './component-extractor'
import { analyzeLayout, detectLayoutPattern } from './layout-analyzer'
import type { LayoutNode, LayoutAnalysis } from './layout-analyzer'
import { detectNamingConventions } from './naming-detector'
import type { NamingConventions } from './naming-detector'
import { findConnectionPoints, findBestConnectionPoint } from './connection-finder'
import type { ConnectionPoint } from './connection-finder'

/**
 * Comprehensive code context for LLM generation
 */
export interface CodeContext {
  // Token information
  tokens: {
    all: ExtractedToken[]
    categorized: CategorizedTokens
    hasColors: boolean
    hasSpacing: boolean
    colorPalette: string[]
  }

  // Component information
  components: {
    all: ExtractedComponent[]
    definitions: ExtractedComponent[]
    instances: ExtractedComponent[]
    definitionNames: string[]
    slotNames: string[]
  }

  // Layout information
  layout: {
    analysis: LayoutAnalysis
    pattern: LayoutAnalysis['layoutPattern']
    maxDepth: number
    sections: string[]
    rootLayout: LayoutNode['layout'] | null
  }

  // Naming conventions
  naming: NamingConventions

  // Connection points for insertion
  connections: {
    forComponent: (componentType: string) => ConnectionPoint[]
    bestFor: (componentType: string) => ConnectionPoint | null
  }

  // Summary for LLM prompt
  summary: string
}

/**
 * Options for context analysis
 */
export interface AnalyzeContextOptions {
  includeTokens?: boolean
  includeComponents?: boolean
  includeLayout?: boolean
  includeNaming?: boolean
  includeConnections?: boolean
}

const DEFAULT_OPTIONS: AnalyzeContextOptions = {
  includeTokens: true,
  includeComponents: true,
  includeLayout: true,
  includeNaming: true,
  includeConnections: true
}

/**
 * Analyzes Mirror DSL code and returns comprehensive context
 */
export function analyzeContext(
  code: string,
  options: AnalyzeContextOptions = {}
): CodeContext {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Token analysis
  const allTokens = opts.includeTokens ? extractTokens(code) : []
  const categorized = opts.includeTokens ? categorizeTokens(allTokens) : {
    colors: [], spacing: [], radius: [], shadow: [], other: [], all: []
  }

  // Component analysis
  const allComponents = opts.includeComponents ? extractComponents(code) : []
  const definitions = opts.includeComponents ? getDefinitions(allComponents) : []
  const instances = opts.includeComponents ? getInstances(allComponents) : []

  // Extract all slot names from definitions
  const slotNames = definitions.flatMap(d => d.slots)

  // Layout analysis
  const layoutAnalysis = opts.includeLayout ? analyzeLayout(code) : {
    root: null, sections: [], maxDepth: 0, layoutPattern: 'unknown' as const
  }

  // Naming conventions
  const naming = opts.includeNaming ? detectNamingConventions(code) : {
    componentStyle: 'PascalCase' as const,
    componentPrefixes: [],
    componentSuffixes: [],
    tokenPrefixes: [],
    tokenStyle: 'kebab-case' as const,
    examples: { components: [], tokens: [] }
  }

  // Build context object
  const context: CodeContext = {
    tokens: {
      all: allTokens,
      categorized,
      hasColors: categorized.colors.length > 0,
      hasSpacing: categorized.spacing.length > 0,
      colorPalette: categorized.colors.map(t => t.value)
    },

    components: {
      all: allComponents,
      definitions,
      instances,
      definitionNames: definitions.map(d => d.name),
      slotNames
    },

    layout: {
      analysis: layoutAnalysis,
      pattern: layoutAnalysis.layoutPattern,
      maxDepth: layoutAnalysis.maxDepth,
      sections: layoutAnalysis.sections,
      rootLayout: layoutAnalysis.root?.layout ?? null
    },

    naming,

    connections: {
      forComponent: (componentType: string) =>
        opts.includeConnections ? findConnectionPoints(code, componentType) : [],
      bestFor: (componentType: string) =>
        opts.includeConnections ? findBestConnectionPoint(code, componentType) : null
    },

    summary: '' // Will be generated below
  }

  // Generate summary
  context.summary = generateContextSummary(context)

  return context
}

/**
 * Generates a human-readable summary for LLM prompts
 */
function generateContextSummary(context: CodeContext): string {
  const parts: string[] = []

  // Token summary
  if (context.tokens.all.length > 0) {
    const colorCount = context.tokens.categorized.colors.length
    const spacingCount = context.tokens.categorized.spacing.length
    const tokenParts: string[] = []

    if (colorCount > 0) {
      tokenParts.push(`${colorCount} Farb-Token`)
    }
    if (spacingCount > 0) {
      tokenParts.push(`${spacingCount} Spacing-Token`)
    }
    if (context.tokens.categorized.radius.length > 0) {
      tokenParts.push(`${context.tokens.categorized.radius.length} Radius-Token`)
    }

    if (tokenParts.length > 0) {
      parts.push(`Design Tokens: ${tokenParts.join(', ')}`)
    }
  }

  // Component summary
  if (context.components.all.length > 0) {
    const defCount = context.components.definitions.length
    const instCount = context.components.instances.length

    if (defCount > 0) {
      parts.push(`Komponenten-Definitionen: ${context.components.definitionNames.join(', ')}`)
    }
    if (instCount > 0) {
      parts.push(`${instCount} Komponenten-Instanzen`)
    }
    if (context.components.slotNames.length > 0) {
      parts.push(`Slots: ${context.components.slotNames.join(', ')}`)
    }
  }

  // Layout summary
  if (context.layout.analysis.root) {
    parts.push(`Layout-Pattern: ${formatPattern(context.layout.pattern)}`)
    if (context.layout.rootLayout && context.layout.rootLayout !== 'unknown') {
      parts.push(`Root-Layout: ${context.layout.rootLayout}`)
    }
    if (context.layout.sections.length > 0) {
      parts.push(`Sektionen: ${context.layout.sections.join(', ')}`)
    }
    parts.push(`Maximale Tiefe: ${context.layout.maxDepth}`)
  }

  // Naming summary
  if (context.naming.componentPrefixes.length > 0) {
    parts.push(`Komponenten-Präfix: ${context.naming.componentPrefixes[0]}`)
  }
  if (context.naming.tokenPrefixes.length > 0) {
    parts.push(`Token-Präfix: ${context.naming.tokenPrefixes[0]}`)
  }
  if (context.naming.tokenStyle !== 'mixed') {
    parts.push(`Token-Style: ${context.naming.tokenStyle}`)
  }

  return parts.join('\n')
}

/**
 * Formats a layout pattern for display
 */
function formatPattern(pattern: LayoutAnalysis['layoutPattern']): string {
  switch (pattern) {
    case 'sidebar-main': return 'Sidebar-Main'
    case 'header-content-footer': return 'Header-Content-Footer'
    case 'grid': return 'Grid'
    case 'stack': return 'Stack'
    case 'dashboard': return 'Dashboard'
    default: return 'Unbekannt'
  }
}

/**
 * Quick analysis for checking if code has specific features
 */
export function hasFeature(
  code: string,
  feature: 'tokens' | 'definitions' | 'layout' | 'states' | 'events'
): boolean {
  switch (feature) {
    case 'tokens':
      return /^\s*\$[\w-]+\s*:/m.test(code)
    case 'definitions':
      return /^\s*[A-Z][A-Za-z0-9]*\s*:/m.test(code)
    case 'layout':
      return /\b(horizontal|vertical|grid|stacked)\b/.test(code)
    case 'states':
      return /\bstate\s+\w+\s*\{/.test(code) || /\b(hover|focus|active|disabled)\s*\{/.test(code)
    case 'events':
      return /\b(onclick|onhover|onchange|oninput|onkeydown|onkeyup)\b/.test(code)
    default:
      return false
  }
}

/**
 * Gets a minimal context for simple operations
 */
export function getMinimalContext(code: string): {
  hasTokens: boolean
  hasDefinitions: boolean
  rootComponent: string | null
  layoutType: LayoutNode['layout'] | null
} {
  const layoutAnalysis = analyzeLayout(code)

  return {
    hasTokens: hasFeature(code, 'tokens'),
    hasDefinitions: hasFeature(code, 'definitions'),
    rootComponent: layoutAnalysis.root?.name ?? null,
    layoutType: layoutAnalysis.root?.layout ?? null
  }
}

/**
 * Formats context for LLM prompt injection
 */
export function formatContextForLLM(context: CodeContext): string {
  const lines: string[] = ['## Code-Kontext\n']

  // Add summary
  if (context.summary) {
    lines.push(context.summary)
    lines.push('')
  }

  // Add color palette if available
  if (context.tokens.hasColors) {
    lines.push('### Farbpalette')
    lines.push(context.tokens.colorPalette.slice(0, 5).join(', '))
    lines.push('')
  }

  // Add available components
  if (context.components.definitionNames.length > 0) {
    lines.push('### Verfügbare Komponenten')
    lines.push(context.components.definitionNames.join(', '))
    lines.push('')
  }

  // Add naming hints
  if (context.naming.componentPrefixes.length > 0 || context.naming.tokenPrefixes.length > 0) {
    lines.push('### Namenskonventionen')
    if (context.naming.componentPrefixes.length > 0) {
      lines.push(`- Komponenten-Präfix: ${context.naming.componentPrefixes[0]}`)
    }
    if (context.naming.tokenPrefixes.length > 0) {
      lines.push(`- Token-Präfix: ${context.naming.tokenPrefixes[0]}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
